import { expect, test, type APIResponse, type Browser, type Page, type TestInfo } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildVisualizationLabHref } from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import type { Language, TextbookPublisher, ThemeMode } from "../../types";
import { installMathCanvasPaintBoundaryProbe } from "./mathCanvasPaintBoundaryProbe";
import {
  auditMathDiagramPage,
  disableDiagramAuditMotion,
  setAllRangeInputs,
  waitForDiagramLayoutStable,
  type DiagramLayoutStabilityResult,
  type MathDiagramBoundaryIssue,
  type MathDiagramBoundaryResult
} from "./mathDiagramBoundaryAudit";

type AuditSurface = "lesson" | "practice" | "public-asset" | "visualization";
type AuditViewport = { name: string; width: number; height: number };
type MatrixState = {
  language: Language;
  theme: ThemeMode;
};
type Finding = {
  surfaceType: AuditSurface;
  surfaceId: string;
  route: string;
  language: Language | "language-invariant";
  theme: ThemeMode | "theme-invariant";
  viewport: string;
  state: string;
  issues: MathDiagramBoundaryIssue[];
};
type DiagramInventory = {
  lessonRoutes: Array<{
    topicId: string;
    publisher: TextbookPublisher;
    route: string;
    practiceQuestionCount: number;
    interactiveLessonIds: string[];
    visualizationIds: string[];
  }>;
  ccssLessons: Array<{
    lessonId: string;
    parentTopicIds: string[];
    inlineSvgCount: number;
    canvasCount: number;
    buttonControlJsxCount: number;
    rangeControlJsxCount: number;
    numberControlJsxCount: number;
    selectControlJsxCount: number;
    pointerControlJsxCount: number;
    contextMenuControlJsxCount: number;
    randomSourceCount: number;
    exceptionalStatePolicies: string[];
    stateProtocol: "finite-visible-button-state-graph-v2";
  }>;
  practiceFigures: Array<{
    questionId: string;
    topicId: string;
    grade: string;
    publisher: TextbookPublisher;
    difficulty: string;
    questionType: string;
    kind: "coordinate-grid" | "plane-figure" | "number-line" | "solid-figure" | "ten-frame";
  }>;
  liveAssetReferences: Array<{ assetPath: string; mediaType: "svg" | "raster" | "other" }>;
  publicSvgAssets: Array<{ publicPath: string }>;
  visualizationLabs: Array<{
    labId: string;
    route: string;
    moduleId: "configured-visualization-lab" | "signature-lab";
    templateId: string | null;
    signatureBenchIds: string[];
    declaresThreeD: boolean;
    effectiveRenderer: "configured-svg" | "signature-canvas" | "three-r3f";
    rendersThreeD: boolean;
    usesThreeD: boolean;
  }>;
  signatureBenches: Array<{
    benchId: string;
    assignedTopicIds: string[];
    liveStatus: "reachable" | "ported-unassigned";
  }>;
  standaloneDiagramRoutes: Array<{
    id: string;
    route: string;
    surfaceType: "lesson" | "practice" | "visualization";
    publisher: TextbookPublisher | null;
    interaction: "replacement-textbook-images" | "static-svg" | "stored-question-figure" | "drag-svg";
  }>;
};
type DiagramInventoryResult = { inventory: DiagramInventory; failures: string[] };

const allowedAuditSurfaces = new Set<AuditSurface>(["lesson", "practice", "public-asset", "visualization"]);
const fullAuditValue = process.env.MATH_DIAGRAM_AUDIT_FULL;
if (fullAuditValue !== undefined && fullAuditValue !== "0" && fullAuditValue !== "1") {
  throw new Error("MATH_DIAGRAM_AUDIT_FULL must be either 0 or 1");
}
const fullAudit = fullAuditValue === "1";
const fullAuditNarrowingVariables = [
  "MATH_DIAGRAM_AUDIT_SURFACES",
  "MATH_DIAGRAM_AUDIT_IDS",
  "MATH_DIAGRAM_AUDIT_CCSS_LESSON_IDS",
  "MATH_DIAGRAM_AUDIT_VIEWPORTS",
  "MATH_DIAGRAM_AUDIT_LANGUAGES",
  "MATH_DIAGRAM_AUDIT_THEMES"
].filter((name) => process.env[name] !== undefined);
if (fullAudit && fullAuditNarrowingVariables.length) {
  throw new Error(
    `MATH_DIAGRAM_AUDIT_FULL=1 cannot be combined with narrowing overrides: ${fullAuditNarrowingVariables.join(", ")}`
  );
}
const auditDebug = process.env.MATH_DIAGRAM_AUDIT_DEBUG === "1";
const requestedSurfaceValues =
  (process.env.MATH_DIAGRAM_AUDIT_SURFACES ?? "lesson,practice,public-asset,visualization")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
if (!requestedSurfaceValues.length || requestedSurfaceValues.some((value) => !allowedAuditSurfaces.has(value as AuditSurface))) {
  throw new Error(`MATH_DIAGRAM_AUDIT_SURFACES must contain only: ${Array.from(allowedAuditSurfaces).join(", ")}`);
}
const requestedSurfaces = new Set(requestedSurfaceValues as AuditSurface[]);
const shardCount = positiveInteger(process.env.MATH_DIAGRAM_AUDIT_SHARD_COUNT, 1, "MATH_DIAGRAM_AUDIT_SHARD_COUNT");
const shardIndex = nonNegativeInteger(process.env.MATH_DIAGRAM_AUDIT_SHARD_INDEX, 0, "MATH_DIAGRAM_AUDIT_SHARD_INDEX");
if (shardIndex >= shardCount) {
  throw new Error(`MATH_DIAGRAM_AUDIT_SHARD_INDEX=${shardIndex} must be lower than shard count ${shardCount}`);
}
if (fullAudit && (shardCount !== 1 || shardIndex !== 0)) {
  throw new Error(
    "MATH_DIAGRAM_AUDIT_FULL=1 requires one unsharded inventory pass; focused or modulo-sharded runs must not claim full coverage"
  );
}
const maxAttachedScreenshots = nonNegativeInteger(
  process.env.MATH_DIAGRAM_AUDIT_MAX_SCREENSHOTS,
  6,
  "MATH_DIAGRAM_AUDIT_MAX_SCREENSHOTS"
);
const requestedIds = new Set(
  (process.env.MATH_DIAGRAM_AUDIT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const requestedCcssLessonIds = new Set(
  (process.env.MATH_DIAGRAM_AUDIT_CCSS_LESSON_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const requestedViewportNames = new Set(
  (process.env.MATH_DIAGRAM_AUDIT_VIEWPORTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
const allAuditViewports: AuditViewport[] = [
  { name: "phone-320", width: 320, height: 800 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1100 }
];
const configuredAuditViewports = fullAudit
  ? allAuditViewports
  : allAuditViewports.filter((viewport) => viewport.name === "phone-320" || viewport.name === "desktop-1440");
const auditViewports = requestedViewportNames.size
  ? allAuditViewports.filter((viewport) => requestedViewportNames.has(viewport.name))
  : configuredAuditViewports;
const unknownRequestedViewportNames = Array.from(requestedViewportNames)
  .filter((name) => !allAuditViewports.some((viewport) => viewport.name === name));
if (unknownRequestedViewportNames.length) {
  throw new Error(`MATH_DIAGRAM_AUDIT_VIEWPORTS contains unknown values: ${unknownRequestedViewportNames.join(", ")}`);
}
if (auditViewports.length === 0) {
  throw new Error(`MATH_DIAGRAM_AUDIT_VIEWPORTS did not match: ${Array.from(requestedViewportNames).join(", ")}`);
}
const allAuditLanguages: Language[] = ["en", "zh", "zh-Hans"];
const allAuditThemes: ThemeMode[] = ["light", "dark"];
const requestedLanguageValues = (process.env.MATH_DIAGRAM_AUDIT_LANGUAGES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const requestedThemeValues = (process.env.MATH_DIAGRAM_AUDIT_THEMES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
if (requestedLanguageValues.some((value) => !allAuditLanguages.includes(value as Language))) {
  throw new Error(`MATH_DIAGRAM_AUDIT_LANGUAGES must contain only: ${allAuditLanguages.join(", ")}`);
}
if (requestedThemeValues.some((value) => !allAuditThemes.includes(value as ThemeMode))) {
  throw new Error(`MATH_DIAGRAM_AUDIT_THEMES must contain only: ${allAuditThemes.join(", ")}`);
}
const auditLanguages: Language[] = requestedLanguageValues.length
  ? requestedLanguageValues as Language[]
  : fullAudit ? allAuditLanguages : ["en"];
const auditThemes: ThemeMode[] = requestedThemeValues.length
  ? requestedThemeValues as ThemeMode[]
  : fullAudit ? allAuditThemes : ["light"];
const matrixStates: MatrixState[] = auditLanguages
  .flatMap((language) => auditThemes
    .map((theme) => ({ language, theme })));
const htmlLanguagePattern: Record<Language, RegExp> = {
  en: /^en/u,
  zh: /^zh-Hant/u,
  "zh-Hans": /^zh-Hans/u
};
const visualizationLabById = new Map(visualizationLabCatalog.map((lab) => [lab.labId, lab]));
let diagramInventoryCache: DiagramInventoryResult | undefined;
let requestedIdValidationComplete = false;

function buildMathDiagramInventory(): DiagramInventoryResult {
  if (diagramInventoryCache) return diagramInventoryCache;
  // Keep inventory discovery in its standalone process so its full data-module
  // imports do not become part of Playwright's browser-oriented transform.
  const serialized = execFileSync(
    process.execPath,
    ["--import", "tsx", "scripts/audit-math-diagram-inventory.ts", "--json"],
    { cwd: process.cwd(), encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
  );
  const parsed = JSON.parse(serialized) as DiagramInventory & { failures: string[] };
  const { failures, ...inventory } = parsed;
  diagramInventoryCache = { inventory, failures };
  return diagramInventoryCache;
}

function positiveInteger(value: string | undefined, fallback: number, label: string) {
  const parsed = Number(value);
  if (value === undefined || value === "") return fallback;
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function nonNegativeInteger(value: string | undefined, fallback: number, label: string) {
  const parsed = Number(value);
  if (value === undefined || value === "") return fallback;
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer`);
  return parsed;
}

function selectedShard<T>(values: T[]) {
  return values.filter((_, index) => index % shardCount === shardIndex);
}

function requested(surface: AuditSurface) {
  return requestedSurfaces.has(surface);
}

function selectedIds<T>(values: T[], idFor: (value: T) => string) {
  if (!requestedIds.size) return values;
  return values.filter((value) => requestedIds.has(idFor(value)));
}

function assertRequestedIdsSelected<T>(
  values: T[],
  idFor: (value: T) => string,
  suiteName: string,
  eligibleValues: T[]
) {
  if (!requestedIds.size) return;
  const eligible = new Set(eligibleValues.map(idFor));
  const expectedInSuite = Array.from(requestedIds).filter((id) => eligible.has(id));
  if (!expectedInSuite.length) return;
  const selected = new Set(values.map(idFor));
  const missing = expectedInSuite.filter((id) => !selected.has(id));
  if (missing.length) {
    throw new Error(
      `MATH_DIAGRAM_AUDIT_IDS did not select a candidate in ${suiteName}: ${missing.join(", ")}`
    );
  }
}

function validateRequestedIds(inventory: DiagramInventory) {
  if (requestedIdValidationComplete || (requestedIds.size === 0 && requestedCcssLessonIds.size === 0)) return;
  const knownIds = new Set<string>();
  if (requested("lesson")) inventory.lessonRoutes.forEach((route) => knownIds.add(route.topicId));
  if (requested("practice")) {
    inventory.practiceFigures.forEach((figure) => knownIds.add(figure.questionId));
    knownIds.add("us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q05");
  }
  if (requested("visualization")) inventory.visualizationLabs.forEach((lab) => knownIds.add(lab.labId));
  if (requested("public-asset")) {
    inventory.publicSvgAssets.forEach((asset) => knownIds.add(asset.publicPath));
    inventory.liveAssetReferences.forEach((asset) => knownIds.add(asset.assetPath));
  }
  inventory.standaloneDiagramRoutes
    .filter((route) => requested(route.surfaceType))
    .forEach((route) => knownIds.add(route.id));
  const missing = Array.from(requestedIds).filter((id) => !knownIds.has(id));
  if (missing.length) {
    throw new Error(`MATH_DIAGRAM_AUDIT_IDS did not match any requested surface inventory: ${missing.join(", ")}`);
  }
  const knownCcssLessonIds = new Set(inventory.ccssLessons.map((lesson) => lesson.lessonId));
  const missingCcssLessonIds = Array.from(requestedCcssLessonIds)
    .filter((id) => !knownCcssLessonIds.has(id));
  if (missingCcssLessonIds.length) {
    throw new Error(
      `MATH_DIAGRAM_AUDIT_CCSS_LESSON_IDS did not match the CCSS inventory: ${missingCcssLessonIds.join(", ")}`
    );
  }
  requestedIdValidationComplete = true;
}

function debugAudit(message: string) {
  if (auditDebug) process.stdout.write(`[math-diagram-audit] ${message}\n`);
}

function publisherProfile(publisher: TextbookPublisher) {
  if (publisher.startsWith("MAINLAND_")) {
    return { region: "MAINLAND" as const, curriculumTrack: "MAINLAND_PEP_HIGH" as const };
  }
  if (publisher.startsWith("US_")) {
    const curriculumTrack = publisher === "US_AR_MATH"
      ? "US_AR_MATH"
      : publisher === "US_FL_MATH"
        ? "US_FL_MATH"
        : "US_CA_MATH";
    return { region: "US" as const, curriculumTrack };
  }
  return { region: "HK" as const, curriculumTrack: "HK" as const };
}

function groupBy<T, K extends string>(values: T[], keyFor: (value: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    grouped.set(key, [...(grouped.get(key) ?? []), value]);
  }
  return grouped;
}

function sanitize(value: string) {
  return value.replace(/[^a-z0-9._-]+/giu, "-").replace(/^-+|-+$/gu, "").slice(0, 100) || "surface";
}

function routePath(url: string) {
  try {
    const parsed = new URL(url, "http://diagram-audit.local");
    return `${decodeURI(parsed.pathname).normalize("NFC")}${parsed.search}`;
  } catch {
    return url;
  }
}

async function attachFindings(testInfo: TestInfo, name: string, findings: Finding[], coverage: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify({ coverage, findings }, null, 2)),
    contentType: "application/json"
  });
}

async function captureFirstFailures(page: Page, testInfo: TestInfo, findings: Finding[], screenshotCount: { value: number }) {
  if (!findings.at(-1)?.issues.length || screenshotCount.value >= maxAttachedScreenshots) return;
  screenshotCount.value += 1;
  const finding = findings.at(-1)!;
  await testInfo.attach(
    `diagram-boundary-${screenshotCount.value}-${sanitize(finding.surfaceId)}-${sanitize(finding.viewport)}-${sanitize(finding.state)}`,
    { body: await page.screenshot({ fullPage: true }), contentType: "image/png" }
  );
}

type RuntimeAuditEvent = {
  kind: "console" | "http" | "pageerror" | "requestfailed";
  message: string;
};

function installRuntimeAuditCollector(page: Page, baseURL: string) {
  const events: RuntimeAuditEvent[] = [];
  page.on("pageerror", (error) => events.push({ kind: "pageerror", message: error.message }));
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText.includes("net::ERR_ABORTED")) return;
    events.push({
      kind: "requestfailed",
      message: `${request.method()} ${routePath(request.url())}: ${request.failure()?.errorText ?? "request failed"}`
    });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // Chromium emits this URL-free console line for every HTTP error. The
    // response listener below classifies rendering-critical resources with
    // their status, type, and exact URL; retaining the generic duplicate would
    // turn unrelated best-effort API 4xx responses (for example progress
    // persistence) into unactionable diagram findings.
    if (text.startsWith("Failed to load resource:")) return;
    events.push({ kind: "console", message: text });
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(baseURL)) return;
    const resourceType = response.request().resourceType();
    if (response.status() >= 500 || (response.status() >= 400 && ["document", "font", "image", "script", "stylesheet"].includes(resourceType))) {
      events.push({ kind: "http", message: `${response.status()} ${resourceType} ${routePath(response.url())}` });
    }
  });

  return {
    cursor: () => events.length,
    issuesSince: (cursor: number): MathDiagramBoundaryIssue[] => events.slice(cursor).map((event) => ({
      kind: "runtime-error",
      surface: "runtime",
      element: event.kind,
      overflowPx: 0,
      surfaceRect: { x: 0, y: 0, width: 0, height: 0 },
      elementRect: { x: 0, y: 0, width: 0, height: 0 },
      detail: event.message
    }))
  };
}

async function recordViewportStates({
  page,
  testInfo,
  findingBase,
  findings,
  state,
  screenshotCount
}: {
  page: Page;
  testInfo: TestInfo;
  findingBase: Omit<Finding, "viewport" | "state" | "issues">;
  findings: Finding[];
  state: string;
  screenshotCount: { value: number };
}) {
  const records: Array<{
    viewport: AuditViewport;
    result: MathDiagramBoundaryResult;
    stability: DiagramLayoutStabilityResult;
  }> = [];
  for (const viewport of auditViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // A viewport change can lazily mount or remount an embedded Manim scene.
    // Freeze it at the measurement boundary, not only immediately after the
    // route navigation, so an autoplaying label cannot prevent stabilization.
    await disableDiagramAuditMotion(page);
    const stability = await waitForDiagramLayoutStable(page, { timeoutMs: 30_000 });
    const result = await auditMathDiagramPage(page);
    if (process.env.MATH_DIAGRAM_AUDIT_DEBUG === "1" && result.issues.length > 0) {
      process.stdout.write(`[math-diagram-audit] issues ${JSON.stringify(result.issues)}\n`);
    }
    records.push({ viewport, result, stability });
    if (!result.issues.length) continue;
    findings.push({ ...findingBase, viewport: viewport.name, state, issues: result.issues });
    await captureFirstFailures(page, testInfo, findings, screenshotCount);
  }
  return records;
}

async function captureRangeInputValues(page: Page, rootSelector = "main") {
  return page.locator(rootSelector).last().locator('input[type="range"]').evaluateAll((controls) =>
    controls.map((control) => (control as HTMLInputElement).value)
  );
}

async function restoreRangeInputValues(page: Page, values: string[], rootSelector = "main") {
  const root = page.locator(rootSelector).last();
  const count = await root.locator('input[type="range"]').count();
  expect(count, "range controls must retain their cardinality while restoring defaults").toBe(values.length);
  await root.evaluate(async (rootElement, defaults) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter && defaults.length > 0) throw new Error("HTMLInputElement.value setter is unavailable");
    for (let index = 0; index < defaults.length; index += 1) {
      const input = Array.from(
        rootElement.querySelectorAll<HTMLInputElement>('input[type="range"]')
      )[index];
      if (!input) throw new Error(`Range control ${index + 1} disappeared while restoring defaults`);
      if (input.value !== defaults[index]) {
        setter?.call(input, defaults[index]);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      }
    }
  }, values);
  // Restoring a control can remount an embedded Manim scene and restart its
  // autoplay timeline. Re-freeze after the mutation so the stability gate
  // measures the restored layout instead of a moving presentation frame.
  await disableDiagramAuditMotion(page);
  await waitForDiagramLayoutStable(page, { timeoutMs: 30_000 });
  await expect.poll(async () => captureRangeInputValues(page, rootSelector)).toEqual(values);
}

type CcssButtonRosterEntry = {
  disabled: boolean;
  identity: string;
  name: string;
  ordinal: number;
  pressed: string;
};

type CcssButtonPathStep = Pick<CcssButtonRosterEntry, "identity" | "name">;

type CcssButtonGraphState = {
  digest: string;
  key: string;
  path: CcssButtonPathStep[];
  roster: CcssButtonRosterEntry[];
};

const ccssStateGraphLimits = { states: 24, transitions: 96 } as const;
const ccssExceptionalButtonPolicies = new Set([
  "seeded-random-extremes",
  "svg-pointer-inset-grid",
  "context-menu-and-shift-click",
  "metric-conversion-finite-number-and-unit-cross-product-v1"
]);

async function ccssButtonRoster(page: Page, lessonId: string): Promise<CcssButtonRosterEntry[]> {
  return page.locator(`[data-ccss-lesson="${lessonId}"]`).evaluate((root) => {
    const identityOccurrences = new Map<string, number>();
    return Array.from(root.querySelectorAll<HTMLButtonElement>('button[type="button"]'))
      .flatMap((button, ordinal) => {
        const style = getComputedStyle(button);
        const box = button.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || box.width <= 0 || box.height <= 0) return [];
        const name = (button.getAttribute("aria-label") ?? button.textContent ?? `button-${ordinal}`)
          .replace(/\s+/gu, " ")
          .trim()
          .slice(0, 100);
        const semanticIdentity = [
          button.getAttribute("data-ccss-diagram-state") ?? "",
          button.getAttribute("title") ?? "",
          button.getAttribute("aria-label") ?? "",
          name
        ].join("|");
        const occurrence = identityOccurrences.get(semanticIdentity) ?? 0;
        identityOccurrences.set(semanticIdentity, occurrence + 1);
        return [{
          disabled: button.disabled,
          identity: `${semanticIdentity}#${occurrence}`,
          name,
          ordinal,
          pressed: button.getAttribute("aria-pressed") ?? "unset"
        }];
      })
  });
}

async function ccssDiagramDigest(page: Page, lessonId: string) {
  const serialized = await page.locator(`[data-ccss-lesson="${lessonId}"]`).evaluate((root) => {
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && box.width > 0 && box.height > 0;
    };
    const surfaces = Array.from(root.querySelectorAll<HTMLElement>(
      "[data-figure-stage],[data-figure-scroll-region],svg,canvas"
    )).filter(visible);
    return surfaces.map((surface) => {
      const clone = surface.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("button,input,select,textarea,footer,script,style").forEach((element) => element.remove());
      // Figure overflow affordances are ResizeObserver-derived presentation
      // state, not mathematical state. They can settle one microtask before or
      // after an otherwise identical replay, so exclude only those volatile
      // attributes/classes while retaining the full diagram subtree.
      const normalizedNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>(
        "[data-figure-stage],[data-figure-scroll-region]"
      ))];
      for (const node of normalizedNodes) {
        node.removeAttribute("data-figure-overflowing");
        node.removeAttribute("data-figure-scroll-needed");
        node.removeAttribute("role");
        node.removeAttribute("tabindex");
        node.removeAttribute("aria-label");
        for (const className of Array.from(node.classList)) {
          if (className.startsWith("[mask-image:")) node.classList.remove(className);
        }
      }
      const box = surface.getBoundingClientRect();
      return {
        html: clone.outerHTML.replace(/\s+/gu, " "),
        rect: [box.width, box.height].map((value) => Math.round(value * 100) / 100),
        scroll: [surface.clientWidth, surface.scrollWidth, surface.clientHeight, surface.scrollHeight],
        canvas: surface instanceof HTMLCanvasElement
          ? [surface.width, surface.height, surface.toDataURL("image/png").slice(-256)]
          : null
      };
    });
  });
  return createHash("sha256").update(JSON.stringify(serialized)).digest("hex").slice(0, 12);
}

async function resetCcssLessonState({
  language,
  lessonId,
  page,
  route,
  theme
}: MatrixState & { lessonId: string; page: Page; route: string }) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  // State-graph replay can revisit the same rich lesson dozens of times. A
  // non-critical deferred resource must not hold the reset on the browser's
  // DOMContentLoaded event; the product-owned lesson-ready marker below is the
  // authoritative hydration/readiness contract for this audit.
  await page.goto(route, { waitUntil: "commit", timeout: 90_000 });
  expect(routePath(page.url()), `${lessonId} state replay must retain the lesson route`).toBe(routePath(route));
  await expect(page.locator('[data-lesson-ready="true"]')).toBeAttached({ timeout: 30_000 });
  await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[language], { timeout: 30_000 });
  if (theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
  else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });
  const root = page.locator(`[data-ccss-lesson="${lessonId}"]`);
  await expect(root).toHaveCount(1);
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-ccss-diagram-hydrated", "true", { timeout: 30_000 });
  await expect(root).toHaveAttribute("data-ccss-diagram-state-protocol", "finite-visible-button-state-graph-v2");
  await disableDiagramAuditMotion(page);
  await waitForDiagramLayoutStable(page, {
    minimumCandidateSurfaceCount: 1,
    rootSelector: `[data-ccss-lesson="${lessonId}"]`,
    timeoutMs: 30_000
  });
}

async function ccssButtonGraphState(
  page: Page,
  lessonId: string,
  path: CcssButtonPathStep[]
): Promise<CcssButtonGraphState> {
  const roster = await ccssButtonRoster(page, lessonId);
  const digest = await ccssDiagramDigest(page, lessonId);
  return { digest, key: ccssButtonStateKey(digest, roster), path, roster };
}

function ccssButtonStateKey(digest: string, roster: CcssButtonRosterEntry[]) {
  return createHash("sha256").update(JSON.stringify({
    digest,
    roster: roster.map(({ disabled, identity, pressed }) => ({ disabled, identity, pressed }))
  })).digest("hex").slice(0, 16);
}

async function clickCcssButtonIdentity(page: Page, lessonId: string, step: CcssButtonPathStep) {
  const roster = await ccssButtonRoster(page, lessonId);
  const control = roster.find((candidate) => candidate.identity === step.identity);
  if (!control || control.name !== step.name) {
    throw new Error(`${lessonId} could not replay CCSS button ${step.identity} (${step.name})`);
  }
  if (control.disabled) throw new Error(`${lessonId} replay path reached disabled CCSS button ${step.identity}`);
  await page.locator(`[data-ccss-lesson="${lessonId}"]`).locator('button[type="button"]').nth(control.ordinal).click();
  await disableDiagramAuditMotion(page);
  await waitForDiagramLayoutStable(page, {
    minimumCandidateSurfaceCount: 1,
    rootSelector: `[data-ccss-lesson="${lessonId}"]`,
    timeoutMs: 30_000
  });
}

async function replayCcssButtonPath({
  language,
  lessonId,
  page,
  path,
  route,
  theme
}: MatrixState & { lessonId: string; page: Page; path: CcssButtonPathStep[]; route: string }) {
  await resetCcssLessonState({ language, lessonId, page, route, theme });
  for (const step of path) await clickCcssButtonIdentity(page, lessonId, step);
  return ccssButtonGraphState(page, lessonId, path);
}

async function registerAuditStudent(
  browser: Browser,
  testInfo: TestInfo,
  publisher: TextbookPublisher,
  matrix: MatrixState,
  serial: number,
  grade = "S4"
) {
  const baseURL = String(testInfo.project.use.baseURL);
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1100 }
  });
  await installMathCanvasPaintBoundaryProbe(context);
  const page = await context.newPage();
  // The local registration store currently rejects US_FL_MATH profiles even
  // though the lesson catalog and direct Florida routes are live. Diagram QA
  // does not depend on the signed-in curriculum filter, so use a supported US
  // audit identity while still navigating and validating the exact US_FL route.
  const registrationPublisher = publisher === "US_FL_MATH" ? "US_CA_MATH" : publisher;
  const profile = publisherProfile(registrationPublisher);
  const suffix = sanitize(`${Date.now()}-${testInfo.project.name}-${publisher}-${matrix.language}-${matrix.theme}-${serial}`).toLowerCase();
  let response: APIResponse | undefined;
  let lastTransportError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const username = `diagram-${suffix}-${attempt}@example.test`;
    try {
      const candidate = await page.request.post("/api/auth/register", {
        data: {
          role: "student",
          name: `Diagram Audit ${suffix}`,
          username,
          email: username,
          password: "start12345",
          grade,
          curriculumTrack: profile.curriculumTrack,
          curriculumProfile: { region: profile.region, publisher: registrationPublisher },
          language: matrix.language,
          theme: matrix.theme
        }
      });
      response = candidate;
      if (candidate.status() < 500) break;
    } catch (error) {
      lastTransportError = error;
    }
    await page.waitForTimeout(400 * attempt);
  }
  if (!response) throw lastTransportError ?? new Error("student registration failed without a response");
  const responseBody = await response.json() as { user?: { id?: string }; error?: string };
  expect(response.status(), JSON.stringify(responseBody)).toBe(200);
  expect(responseBody.user?.id, "registered audit student must expose a stable user id").toBeTruthy();
  return { context, page, userId: responseBody.user!.id! };
}

async function unlockPracticeFreeSelection(page: Page, userId: string, grade: string) {
  const response = await page.request.get(`/api/adaptive-learning/next?grade=${encodeURIComponent(grade)}`);
  expect(response.ok(), `adaptive skill lookup failed with ${response.status()}`).toBeTruthy();
  const body = await response.json() as { decision?: { skill?: { id?: string } } };
  const skillId = body.decision?.skill?.id;
  expect(skillId, "Practice free-selection storage must use the active adaptive skill id").toBeTruthy();
  await page.addInitScript(({ nextUserId, nextSkillId }) => {
    window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${nextUserId}:${nextSkillId}`, "true");
  }, { nextUserId: userId, nextSkillId: skillId! });
}

async function selectPracticeQuestion(
  page: Page,
  topicId: string,
  questionId: string,
  filters: { difficulty?: string; questionType?: string } = {}
) {
  const filterToggle = page.getByRole("button", { name: /^(?:Filters|篩選|筛选)$/u });
  await expect(filterToggle).toBeVisible({ timeout: 30_000 });
  if ((await filterToggle.getAttribute("aria-expanded")) !== "true") await filterToggle.click();

  const filterFields = page.locator("#mission-setup-filter-fields");
  if (filters.difficulty) {
    const difficultySelect = filterFields.locator("select").filter({
      has: page.locator(`option[value="${filters.difficulty}"]`)
    }).first();
    await expect(difficultySelect).toBeVisible({ timeout: 30_000 });
    await difficultySelect.selectOption(filters.difficulty);
  }
  if (filters.questionType) {
    const questionTypeSelect = filterFields.locator("select").filter({
      has: page.locator(`option[value="${filters.questionType}"]`)
    }).first();
    await expect(questionTypeSelect).toBeVisible({ timeout: 30_000 });
    await questionTypeSelect.selectOption(filters.questionType);
  }

  const topicSelect = filterFields.locator("select").filter({
    has: page.locator(`option[value="${topicId}"]`)
  });
  await expect(topicSelect).toBeVisible({ timeout: 30_000 });
  await topicSelect.selectOption(topicId);

  const round = page.locator("#free-selection");
  const target = round.locator(`article[data-question-id="${questionId}"]`);
  await expect(target).toBeAttached({ timeout: 30_000 });
  const questionIds = await round.locator("article[data-question-id]").evaluateAll((cards) =>
    cards.map((card) => card.getAttribute("data-question-id"))
  );
  const questionIndex = questionIds.indexOf(questionId);
  expect(questionIndex, `${questionId} must be in the active five-question round`).toBeGreaterThanOrEqual(0);
  await round.locator('[data-testid="mission-trail"] button').nth(questionIndex).click();
  await expect(target).toBeVisible();
  return target;
}

async function handwritingInkBounds(page: Page, canvasSelector: string) {
  return page.locator(canvasSelector).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new Error(`Expected handwriting canvas, received ${element.tagName.toLowerCase()}`);
    }
    const canvas = element;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { count: 0, minX: -1, maxX: -1, width: canvas.width };
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    let minX = canvas.width;
    let maxX = -1;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 12) continue;
      const x = ((index - 3) / 4) % canvas.width;
      count += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    return { count, minX: count ? minX : -1, maxX, width: canvas.width };
  });
}

function formatFailureSummary(findings: Finding[]) {
  const lines = findings.slice(0, 80).flatMap((finding) => [
    `${finding.surfaceType} ${finding.surfaceId} ${finding.language}/${finding.theme} ${finding.viewport} ${finding.state}`,
    `  ${finding.route}`,
    ...finding.issues.slice(0, 12).map((issue) =>
      `  - ${issue.kind}: ${issue.surface} / ${issue.element} (${issue.overflowPx}px) — ${issue.detail}`
    )
  ]);
  if (findings.length > 80) lines.push(`... ${findings.length - 80} more failing states in attached JSON evidence`);
  return `Mathematical diagram boundary audit found ${findings.length} failing state(s):\n${lines.join("\n")}`;
}

test.describe("mathematical diagram boundary integrity", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chrome",
      "this suite creates its own complete viewport matrix; a second device project would only duplicate it"
    );
  });

  test("the reported precise-definitions angle paints its exact defining rays above both arc endpoints", async ({ browser }, testInfo) => {
    test.skip(!requested("lesson"), "lesson surface not requested for this audit shard");
    test.setTimeout(180_000);

    const { context, page } = await registerAuditStudent(
      browser,
      testInfo,
      "US_CA_MATH",
      { language: "en", theme: "light" },
      0
    );
    await page.goto("/student/lessons/us-ca-math-s4-chapter-01", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-lesson-ready="true"]')).toHaveCount(1, { timeout: 90_000 });
    await expect.poll(() => routePath(page.url())).toBe("/student/lessons/us-ca-math-s4-chapter-01");

    const preciseDefinitions = page.locator('[data-ccss-lesson="precise-definitions"]');
    await preciseDefinitions.scrollIntoViewIfNeeded();
    const angleButton = preciseDefinitions.locator(
      '[data-ccss-diagram-state-button][data-ccss-diagram-state="angle"]'
    );
    await angleButton.click();
    await expect(angleButton).toHaveAttribute("aria-pressed", "true");
    const arc = preciseDefinitions.locator("[data-diagram-angle-arc]");
    await expect(arc).toBeVisible();

    const paintContract = await arc.evaluate((element) => {
      if (!(element instanceof SVGPathElement)) throw new Error("Expected the semantic angle arc to be an SVG path");
      const matrix = element.getScreenCTM();
      if (!matrix) throw new Error("Angle arc has no screen transform");
      const length = element.getTotalLength();
      const siblings = Array.from(element.parentElement?.children ?? []);
      const arcIndex = siblings.indexOf(element);
      const rayIndices = siblings
        .map((candidate, index) => candidate.hasAttribute("data-diagram-defining-ray") ? index : -1)
        .filter((index) => index >= 0);
      const endpoints = [0, length].map((offset) => {
        const localPoint = element.getPointAtLength(offset);
        const screenPoint = new DOMPoint(localPoint.x, localPoint.y).matrixTransform(matrix);
        const semanticStack = document.elementsFromPoint(screenPoint.x, screenPoint.y)
          .filter((candidate) => candidate.matches("[data-diagram-defining-ray], [data-diagram-angle-arc]"))
          .map((candidate) => candidate.hasAttribute("data-diagram-defining-ray") ? "ray" : "arc");
        return { semanticStack, x: screenPoint.x, y: screenPoint.y };
      });
      return { arcIndex, endpoints, rayIndices };
    });

    expect(await arc.evaluate((element) => getComputedStyle(element).strokeLinecap)).toBe("butt");
    expect(paintContract.rayIndices).toHaveLength(2);
    expect(paintContract.rayIndices.every((index) => index > paintContract.arcIndex)).toBe(true);
    expect(paintContract.endpoints).toHaveLength(2);
    for (const endpoint of paintContract.endpoints) {
      expect(endpoint.semanticStack[0], `defining ray must be the topmost painted geometry at ${endpoint.x},${endpoint.y}`).toBe("ray");
    }

    const boundary = await auditMathDiagramPage(page);
    expect(boundary.documentWidth.scroll).toBe(boundary.documentWidth.client);
    expect(boundary.issues).toEqual([]);
    await context.close();
  });

  test("every semantic angle contract rejects paint caps that extend beyond its geometric endpoints", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.setContent(`
      <main>
        <svg role="img" aria-label="synthetic semantic angle" viewBox="0 0 100 100" width="100" height="100">
          <path id="angle" data-diagram-angle-arc d="M 70 50 A 20 20 0 0 0 50 30"
            fill="none" stroke="black" stroke-width="8" stroke-linecap="round" />
        </svg>
      </main>
    `);
    await page.locator("#angle").evaluate((element) => {
      element.setAttribute("data-math-angle-contract", JSON.stringify({
        version: 1,
        id: "synthetic-quarter-turn",
        space: "svg",
        origin: { x: 50, y: 50 },
        radius: 20,
        start: { x: 70, y: 50 },
        end: { x: 50, y: 30 },
        startRay: { x: 1, y: 0 },
        endRay: { x: 0, y: -1 },
        sweepRadians: Math.PI / 2
      }));
    });

    const result = await auditMathDiagramPage(page);
    expect(result.coverage.candidateAngleContractCount).toBe(1);
    expect(result.coverage.angleContractCount).toBe(0);
    expect(result.issues).toContainEqual(expect.objectContaining({
      kind: "angle-contract-invalid",
      detail: expect.stringContaining("computed stroke-linecap must be butt")
    }));

    await page.locator("#angle").evaluate((element: SVGPathElement) => {
      element.style.strokeLinecap = "butt";
    });
    const buttCappedResult = await auditMathDiagramPage(page);
    expect(buttCappedResult.coverage.angleContractCount).toBe(1);
    expect(buttCappedResult.issues).not.toContainEqual(expect.objectContaining({
      kind: "angle-contract-invalid"
    }));
  });

  test("body clipping cannot mask a mathematical surface that crosses the viewport", async ({ page }) => {
    test.skip(!requested("lesson"), "lesson surface not requested for this audit shard");
    await page.setViewportSize({ width: 320, height: 720 });
    await page.setContent(`
      <style>html,body{margin:0}body{overflow-x:hidden}</style>
      <main>
        <figure data-viz-surface style="margin:0;width:400px">
          <svg role="img" aria-label="masked wide diagram" width="400" height="120" viewBox="0 0 400 120">
            <line x1="0" y1="60" x2="400" y2="60" stroke="black" stroke-width="2" />
          </svg>
        </figure>
      </main>
    `);

    const result = await auditMathDiagramPage(page);
    expect(result.issues).toContainEqual(expect.objectContaining({
      kind: "page-horizontal-overflow",
      detail: expect.stringContaining("body/html clipping cannot mask it")
    }));
  });

  test("the Canvas 2D paint probe distinguishes clipped bitmap paint from bounded drawing", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 480, height: 360 } });
    await installMathCanvasPaintBoundaryProbe(context);
    const page = await context.newPage();

    const runScenario = async (
      scenario: "edge-one-pixel" | "six-pixels-out" | "dpr-transform" | "explicit-clip" |
        "resize-reset" | "clear-reset" | "bezier-interior" | "quadratic-interior" | "text" | "path2d"
    ) => {
      const dpr = scenario === "dpr-transform";
      await page.setContent(`
        <style>html,body{margin:0}canvas{display:block;width:100px;height:100px}</style>
        <main><figure data-viz-surface style="margin:20px;width:100px;height:100px">
          <canvas id="subject" role="img" aria-label="synthetic mathematical canvas"
            ${scenario === "resize-reset" || scenario === "clear-reset"
              ? 'data-diagram-blank-policy="intentional-empty-v1"'
              : ""}
            width="${dpr ? 200 : 100}" height="${dpr ? 200 : 100}"></canvas>
        </figure></main>
      `);
      await page.evaluate((nextScenario) => {
        const canvas = document.querySelector<HTMLCanvasElement>("#subject");
        if (!canvas) throw new Error("synthetic canvas is missing");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("synthetic CanvasRenderingContext2D is missing");
        switch (nextScenario) {
          case "edge-one-pixel":
            ctx.fillRect(99, 10, 2, 10);
            break;
          case "six-pixels-out":
            ctx.fillRect(100, 10, 6, 10);
            break;
          case "dpr-transform":
            ctx.scale(2, 2);
            ctx.fillRect(100, 10, 6, 10);
            break;
          case "explicit-clip":
            ctx.beginPath();
            ctx.rect(0, 0, 20, 20);
            ctx.clip();
            ctx.fillRect(200, 0, 20, 20);
            break;
          case "resize-reset":
            ctx.fillRect(100, 10, 8, 10);
            canvas.width = 100;
            break;
          case "clear-reset":
            ctx.fillRect(100, 10, 8, 10);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            break;
          case "bezier-interior":
            ctx.beginPath();
            ctx.moveTo(10, 50);
            ctx.bezierCurveTo(10, -20, 90, -20, 90, 50);
            ctx.stroke();
            break;
          case "quadratic-interior":
            ctx.beginPath();
            ctx.moveTo(10, 20);
            ctx.quadraticCurveTo(50, -30, 90, 20);
            ctx.stroke();
            break;
          case "text":
            ctx.font = "20px sans-serif";
            ctx.fillText("X", 102, 50);
            break;
          case "path2d": {
            const path = new Path2D();
            path.rect(10, 10, 20, 20);
            ctx.fill(path);
            break;
          }
        }
      }, scenario);
      return auditMathDiagramPage(page);
    };

    for (const passingScenario of ["edge-one-pixel", "explicit-clip", "resize-reset", "clear-reset"] as const) {
      const result = await runScenario(passingScenario);
      expect(result.issues, `${passingScenario} must remain inside the 1 CSS px contract`).not.toContainEqual(
        expect.objectContaining({ kind: "canvas-2d-content-outside-bitmap" })
      );
      expect(result.issues, `${passingScenario} must be completely audited`).not.toContainEqual(
        expect.objectContaining({ kind: "canvas-2d-audit-incomplete" })
      );
      expect(result.coverage.candidateCanvas2dCount).toBe(1);
      expect(result.coverage.auditedCanvas2dCount).toBe(1);
    }

    for (const failingScenario of [
      "six-pixels-out",
      "dpr-transform",
      "bezier-interior",
      "quadratic-interior",
      "text"
    ] as const) {
      const result = await runScenario(failingScenario);
      expect(result.issues, `${failingScenario} must expose requested paint beyond the backing bitmap`).toContainEqual(
        expect.objectContaining({ kind: "canvas-2d-content-outside-bitmap" })
      );
      expect(result.coverage.auditedCanvas2dCount).toBe(1);
    }

    for (const exactSixPixelScenario of ["six-pixels-out", "dpr-transform"] as const) {
      const result = await runScenario(exactSixPixelScenario);
      const overflow = result.issues.find((issue) => issue.kind === "canvas-2d-content-outside-bitmap")?.overflowPx;
      expect(overflow, `${exactSixPixelScenario} must normalize backing pixels to CSS pixels`).toBeCloseTo(6, 2);
    }

    const unsupported = await runScenario("path2d");
    expect(unsupported.issues).toContainEqual(expect.objectContaining({
      kind: "canvas-2d-audit-incomplete",
      detail: expect.stringContaining("fill(Path2D)")
    }));
    expect(unsupported.coverage.auditedCanvas2dCount).toBe(0);
    expect(unsupported.coverage.incompleteCanvas2dCount).toBe(1);

    await context.close();
  });

  test("all live lesson diagram surfaces stay inside semantic, SVG, container, and page boundaries", async ({ browser }, testInfo) => {
    test.skip(!requested("lesson"), "lesson surface not requested for this audit shard");
    test.setTimeout(fullAudit ? 10_800_000 : 600_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const smokeTopicIds = new Set([
      "us-ca-math-s4-chapter-01",
      inventory.ccssLessons.find((lesson) => lesson.lessonId === "place-value-blocks")?.parentTopicIds[0]
    ].filter((value): value is string => Boolean(value)));
    const candidates = selectedIds(fullAudit || requestedIds.size > 0
      ? inventory.lessonRoutes
      : inventory.lessonRoutes.filter((route) => smokeTopicIds.has(route.topicId)), (route) => route.topicId);
    assertRequestedIdsSelected(candidates, (route) => route.topicId, "lesson route audit", inventory.lessonRoutes);
    const routes = selectedShard(candidates);
    test.skip(routes.length === 0, "lesson audit shard has no selected route");

    const findings: Finding[] = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };
    const coverageRecords: Array<Record<string, unknown>> = [];
    const ccssControlCoverage: Array<Record<string, unknown>> = [];
    const routesByPublisher = groupBy(routes, (route) => route.publisher);
    const ccssLessonById = new Map(inventory.ccssLessons.map((lesson) => [lesson.lessonId, lesson]));
    let registrationSerial = 0;

    for (const matrix of matrixStates) {
      for (const [publisher, publisherRoutes] of routesByPublisher) {
        const { context, page } = await registerAuditStudent(
          browser,
          testInfo,
          publisher,
          matrix,
          registrationSerial++
        );
        const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));

        for (const route of publisherRoutes) {
          const runtimeCursor = runtime.cursor();
          await page.goto(route.route, { waitUntil: "domcontentloaded", timeout: 90_000 });
          expect(routePath(page.url()), `${route.topicId} must not redirect to another lesson or login`)
            .toBe(routePath(route.route));
          await expect(page.locator("main")).toBeVisible({ timeout: 20_000 });
          await expect(page.locator('[data-lesson-ready="true"]')).toBeAttached({ timeout: 30_000 });
          await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[matrix.language], { timeout: 30_000 });
          if (matrix.theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
          else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });
          await disableDiagramAuditMotion(page);

          const expectedPracticeQuestions = Math.min(route.practiceQuestionCount, 5);
          if (expectedPracticeQuestions > 0) {
            await expect(page.locator("#lesson-practice article[data-question-id]"))
              .toHaveCount(expectedPracticeQuestions, { timeout: 30_000 });
          }
          for (const lessonId of new Set(route.interactiveLessonIds)) {
            const lessonRoot = page.locator(`[data-ccss-lesson="${lessonId}"]`);
            await expect(lessonRoot, `${route.topicId} must mount CCSS lesson ${lessonId}`).toHaveCount(1);
            await expect(lessonRoot).toBeVisible();
            const expectedLesson = ccssLessonById.get(lessonId);
            if ((expectedLesson?.inlineSvgCount ?? 0) > 0) {
              expect(
                await lessonRoot.locator("svg").count(),
                `${route.topicId}/${lessonId} must render its expected SVG surface`
              ).toBeGreaterThan(0);
            }
          }
          if (route.visualizationIds.length > 0) {
            const visualizationSection = page.locator("#visualization");
            await expect(visualizationSection).toBeAttached();
            await visualizationSection.scrollIntoViewIfNeeded();
            await expect(visualizationSection.locator("[data-viz-surface]").first())
              .toBeVisible({ timeout: 90_000 });
          }

          const findingBase = {
            surfaceType: "lesson" as const,
            surfaceId: route.topicId,
            route: route.route,
            language: matrix.language,
            theme: matrix.theme
          };
          const defaultRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "default", screenshotCount });
          coverageRecords.push(...defaultRecords.map(({ viewport, result }) => ({
            surfaceId: route.topicId,
            language: matrix.language,
            theme: matrix.theme,
            state: "default",
            viewport: viewport.name,
            coverage: result.coverage,
            documentWidth: result.documentWidth
          })));

          for (const lessonId of new Set(route.interactiveLessonIds)) {
            if (requestedCcssLessonIds.size > 0 && !requestedCcssLessonIds.has(lessonId)) continue;
            const expectedLesson = ccssLessonById.get(lessonId);
            if (!expectedLesson || expectedLesson.parentTopicIds[0] !== route.topicId) continue;
            const delegatedPolicies = expectedLesson.exceptionalStatePolicies.filter((policy) =>
              ccssExceptionalButtonPolicies.has(policy)
            );
            if (delegatedPolicies.length > 0) {
              ccssControlCoverage.push({
                lessonId,
                topicId: route.topicId,
                language: matrix.language,
                theme: matrix.theme,
                delegatedPolicies,
                executor: "exceptional-controls",
                stateProtocol: expectedLesson.stateProtocol
              });
              await resetCcssLessonState({ page, route: route.route, lessonId, ...matrix });
              continue;
            }

            const initialState = await replayCcssButtonPath({
              page,
              route: route.route,
              lessonId,
              path: [],
              ...matrix
            });
            const stateQueue: CcssButtonGraphState[] = [initialState];
            const discoveredStates = new Map([[initialState.key, initialState]]);
            const auditedDigests = new Set([initialState.digest]);
            let disabledTerminalCount = 0;
            let transitionCount = 0;

            while (stateQueue.length > 0) {
              const sourceState = stateQueue.shift()!;
              const replayedState = await replayCcssButtonPath({
                page,
                route: route.route,
                lessonId,
                path: sourceState.path,
                ...matrix
              });
              if (replayedState.key !== sourceState.key) {
                throw new Error(
                  `${lessonId} CCSS button path did not replay stable state ${sourceState.key}; `
                  + `path=${JSON.stringify(sourceState.path)} expectedDigest=${sourceState.digest} `
                  + `actualDigest=${replayedState.digest} expectedRoster=${JSON.stringify(sourceState.roster)} `
                  + `actualRoster=${JSON.stringify(replayedState.roster)}`
                );
              }

              for (const control of replayedState.roster) {
                if (control.disabled) {
                  disabledTerminalCount += 1;
                  continue;
                }
                if (transitionCount >= ccssStateGraphLimits.transitions) {
                  throw new Error(`${lessonId} CCSS button transition budget ${ccssStateGraphLimits.transitions} exceeded`);
                }
                transitionCount += 1;

                const sourceReplay = await replayCcssButtonPath({
                  page,
                  route: route.route,
                  lessonId,
                  path: sourceState.path,
                  ...matrix
                });
                if (sourceReplay.key !== sourceState.key) {
                  throw new Error(
                    `${lessonId} CCSS button source state ${sourceState.key} changed during replay; `
                    + `path=${JSON.stringify(sourceState.path)} control=${JSON.stringify(control)} `
                    + `expectedDigest=${sourceState.digest} actualDigest=${sourceReplay.digest} `
                    + `expectedRoster=${JSON.stringify(sourceState.roster)} actualRoster=${JSON.stringify(sourceReplay.roster)}`
                  );
                }
                await clickCcssButtonIdentity(page, lessonId, control);
                const nextRoster = await ccssButtonRoster(page, lessonId);
                const nextDigest = await ccssDiagramDigest(page, lessonId);
                const nextKey = ccssButtonStateKey(nextDigest, nextRoster);
                const nextPath = [...sourceState.path, { identity: control.identity, name: control.name }];
                const knownState = discoveredStates.get(nextKey);

                ccssControlCoverage.push({
                  lessonId,
                  topicId: route.topicId,
                  language: matrix.language,
                  theme: matrix.theme,
                  controlIdentity: control.identity,
                  controlName: control.name,
                  sourceState: sourceState.key,
                  targetState: nextKey,
                  transition: nextKey === sourceState.key ? "cycle-self" : knownState ? "cycle-known" : "discovered"
                });

                if (knownState) continue;
                if (discoveredStates.size >= ccssStateGraphLimits.states) {
                  throw new Error(`${lessonId} CCSS button state budget ${ccssStateGraphLimits.states} exceeded`);
                }
                const nextState = { digest: nextDigest, key: nextKey, path: nextPath, roster: nextRoster };
                discoveredStates.set(nextKey, nextState);
                stateQueue.push(nextState);

                if (!auditedDigests.has(nextDigest)) {
                  auditedDigests.add(nextDigest);
                  const state = `ccss=${lessonId};graph=${nextKey};digest=${nextDigest}`;
                  const stateRecords = await recordViewportStates({
                    page,
                    testInfo,
                    findingBase,
                    findings,
                    state,
                    screenshotCount
                  });
                  coverageRecords.push(...stateRecords.map(({ viewport, result }) => ({
                    surfaceId: route.topicId,
                    lessonId,
                    language: matrix.language,
                    theme: matrix.theme,
                    state,
                    viewport: viewport.name,
                    coverage: result.coverage,
                    documentWidth: result.documentWidth
                  })));
                }
              }
            }
            ccssControlCoverage.push({
              lessonId,
              topicId: route.topicId,
              language: matrix.language,
              theme: matrix.theme,
              sourceButtonJsxCount: expectedLesson.buttonControlJsxCount,
              runtimeButtonCount: initialState.roster.length,
              disabledTerminalCount,
              transitionCount,
              uniqueGraphStateCount: discoveredStates.size,
              uniqueAuditedStateCount: auditedDigests.size,
              executor: "generic-button-state-graph",
              stateProtocol: expectedLesson.stateProtocol
            });
            await resetCcssLessonState({ page, route: route.route, lessonId, ...matrix });
          }

          const defaultRangeValues = await captureRangeInputValues(page);
          const rangeCount = await setAllRangeInputs(page, "min");
          expect(rangeCount).toBe(defaultRangeValues.length);
          if (rangeCount > 0) {
            const minRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "all-ranges=min", screenshotCount });
            coverageRecords.push(...minRecords.map(({ viewport, result }) => ({
              surfaceId: route.topicId,
              language: matrix.language,
              theme: matrix.theme,
              state: "all-ranges=min",
              viewport: viewport.name,
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
            for (const target of ["q1", "mid", "q3"] as const) {
              await setAllRangeInputs(page, target);
              const state = `all-ranges=${target}`;
              const intermediateRecords = await recordViewportStates({
                page,
                testInfo,
                findingBase,
                findings,
                state,
                screenshotCount
              });
              coverageRecords.push(...intermediateRecords.map(({ viewport, result }) => ({
                surfaceId: route.topicId,
                language: matrix.language,
                theme: matrix.theme,
                state,
                viewport: viewport.name,
                coverage: result.coverage,
                documentWidth: result.documentWidth
              })));
            }
            await setAllRangeInputs(page, "max");
            const maxRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "all-ranges=max", screenshotCount });
            coverageRecords.push(...maxRecords.map(({ viewport, result }) => ({
              surfaceId: route.topicId,
              language: matrix.language,
              theme: matrix.theme,
              state: "all-ranges=max",
              viewport: viewport.name,
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
            await restoreRangeInputValues(page, defaultRangeValues);
          }

          const runtimeIssues = runtime.issuesSince(runtimeCursor);
          if (runtimeIssues.length) {
            findings.push({
              ...findingBase,
              viewport: "runtime",
              state: "navigation",
              issues: runtimeIssues
            });
          }
          visited.add(`${matrix.language}|${matrix.theme}|${route.topicId}`);
        }
        await context.close();
      }
    }

    const expectedVisits = routes.length * matrixStates.length;
    const expectedControlledLessonKeys = new Set(matrixStates.flatMap((matrix) => routes.flatMap((route) =>
      Array.from(new Set(route.interactiveLessonIds)).flatMap((lessonId) =>
        (requestedCcssLessonIds.size === 0 || requestedCcssLessonIds.has(lessonId))
          && ccssLessonById.get(lessonId)?.parentTopicIds[0] === route.topicId
          ? [`${matrix.language}|${matrix.theme}|${route.topicId}|${lessonId}`]
          : []
      )
    )));
    const coveredControlledLessonKeys = new Set(ccssControlCoverage.flatMap((record) =>
      record.stateProtocol === "finite-visible-button-state-graph-v2"
        ? [`${record.language}|${record.theme}|${record.topicId}|${record.lessonId}`]
        : []
    ));
    expect(Array.from(coveredControlledLessonKeys).sort()).toEqual(Array.from(expectedControlledLessonKeys).sort());
    await attachFindings(testInfo, "lesson-math-diagram-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      routeCount: routes.length,
      matrixStateCount: matrixStates.length,
      expectedVisits,
      actualVisits: visited.size,
      viewports: auditViewports,
      coverageRecords,
      ccssControlCoverage
    });
    expect(visited.size).toBe(expectedVisits);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("every Practice Arena figure plus counting cards and resized handwriting stays bounded", async ({ browser }, testInfo) => {
    test.skip(!requested("practice"), "practice surface not requested for this audit shard");
    test.setTimeout(fullAudit ? 3_600_000 : 600_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const structuredCases = inventory.practiceFigures.map((figure) => ({
      id: figure.questionId,
      topicId: figure.topicId,
      grade: figure.grade,
      publisher: figure.publisher,
      difficulty: figure.difficulty,
      questionType: figure.questionType,
      kind: figure.kind,
      inventoryKind: "structured" as const
    }));
    const specialCases = [{
      id: "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q05",
      topicId: "us-ca-math-p1-1-oa-add-subtract",
      grade: "P1",
      publisher: "US_CA_MATH" as TextbookPublisher,
      kind: "counting-and-handwriting" as const,
      inventoryKind: "special" as const
    }];
    const smokeIds = new Set([
      "graph-p6-speed-distance",
      "us-ca-k5-knowledge-point-practice-v1-us-ca-math-k-k-nbt-teen-numbers-q01",
      specialCases[0].id
    ]);
    const allPracticeCases = [...structuredCases, ...specialCases];
    const candidates = selectedIds(
      fullAudit || requestedIds.size > 0
        ? allPracticeCases
        : allPracticeCases.filter((item) => smokeIds.has(item.id)),
      (item) => item.id
    );
    assertRequestedIdsSelected(candidates, (item) => item.id, "Practice figure audit", allPracticeCases);
    const practiceCases = selectedShard(candidates);
    test.skip(practiceCases.length === 0, "practice audit shard has no selected case");

    const findings: Finding[] = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };
    const coverageRecords: Array<Record<string, unknown>> = [];
    let registrationSerial = 0;

    for (const matrix of matrixStates) {
      for (const practiceCase of practiceCases) {
        const { context, page, userId } = await registerAuditStudent(
          browser,
          testInfo,
          practiceCase.publisher,
          matrix,
          registrationSerial++,
          practiceCase.grade
        );
        await unlockPracticeFreeSelection(page, userId, practiceCase.grade);
        const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));
        const runtimeCursor = runtime.cursor();
        await page.goto("/practice", { waitUntil: "domcontentloaded", timeout: 90_000 });
        await disableDiagramAuditMotion(page);
        await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[matrix.language], { timeout: 30_000 });
        if (matrix.theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });

        const target = await selectPracticeQuestion(
          page,
          practiceCase.topicId,
          practiceCase.id,
          practiceCase.inventoryKind === "structured"
            ? { difficulty: practiceCase.difficulty, questionType: practiceCase.questionType }
            : {}
        );
        if (practiceCase.inventoryKind === "structured") {
          const figure = target.locator(`[data-question-figure][data-diagram-kind="${practiceCase.kind}"]`);
          await expect(figure, `${practiceCase.id} must render its ${practiceCase.kind} QuestionFigure`).toBeVisible();
        }
        if (practiceCase.kind === "coordinate-grid") {
          await expect(target.locator("[data-diagram-plot-series]")).toHaveAttribute("clip-path", /^url\(#.+\)$/u);
        } else if (practiceCase.kind === "ten-frame") {
          const frames = target.locator('[data-diagram-kind="ten-frame"] svg');
          expect(await frames.count(), "ten-frame diagram must render at least one responsive SVG frame").toBeGreaterThan(0);
          await expect(frames.first()).toBeVisible();
        } else if (practiceCase.kind === "counting-and-handwriting") {
          await expect(target.locator("[data-counting-dot-card]")).toBeVisible();
          const handwritingTab = target.getByRole("tab", { name: /Handwriting board|手寫板|手写板/u });
          await expect(handwritingTab).toBeVisible();
          await handwritingTab.click();
          const canvas = target.locator("canvas[role='img']");
          await expect(canvas).toBeVisible();
          await page.setViewportSize({ width: 1024, height: 900 });
          await canvas.scrollIntoViewIfNeeded();
          const canvasBox = await canvas.boundingBox();
          expect(canvasBox).toBeTruthy();
          await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.72, canvasBox!.y + canvasBox!.height * 0.52);
          await page.mouse.down();
          await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.9, canvasBox!.y + canvasBox!.height * 0.58, { steps: 12 });
          await page.mouse.up();
          const beforeResize = await handwritingInkBounds(page, "article[data-question-id='" + practiceCase.id + "'] canvas[role='img']");
          expect(beforeResize.count, "handwriting audit stroke must paint before resize").toBeGreaterThan(20);

          await page.setViewportSize({ width: 320, height: 800 });
          await expect.poll(async () => (await handwritingInkBounds(
            page,
            "article[data-question-id='" + practiceCase.id + "'] canvas[role='img']"
          )).width).toBeLessThan(beforeResize.width);
          const afterResize = await handwritingInkBounds(page, "article[data-question-id='" + practiceCase.id + "'] canvas[role='img']");
          expect(afterResize.count, "resized handwriting stroke must remain visible").toBeGreaterThan(20);
          expect(afterResize.minX / afterResize.width, "resized stroke must preserve its relative horizontal position").toBeGreaterThan(0.65);
          expect(afterResize.maxX / afterResize.width, "resized stroke must remain inside the canvas").toBeLessThanOrEqual(0.96);
        }

        const findingBase = {
          surfaceType: "practice" as const,
          surfaceId: practiceCase.id,
          route: `/practice?topicId=${encodeURIComponent(practiceCase.topicId)}`,
          language: matrix.language,
          theme: matrix.theme
        };
        const records = await recordViewportStates({ page, testInfo, findingBase, findings, state: practiceCase.kind, screenshotCount });
        coverageRecords.push(...records.map(({ viewport, result }) => ({
          surfaceId: practiceCase.id,
          inventoryKind: practiceCase.inventoryKind,
          diagramKind: practiceCase.kind,
          language: matrix.language,
          theme: matrix.theme,
          viewport: viewport.name,
          coverage: result.coverage,
          documentWidth: result.documentWidth
        })));
        const runtimeIssues = runtime.issuesSince(runtimeCursor);
        if (runtimeIssues.length) {
          findings.push({
            ...findingBase,
            viewport: "runtime",
            state: practiceCase.kind,
            issues: runtimeIssues
          });
        }
        visited.add(`${matrix.language}|${matrix.theme}|${practiceCase.id}`);
        await context.close();
      }
    }

    const expectedVisits = practiceCases.length * matrixStates.length;
    await attachFindings(testInfo, "practice-math-diagram-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      practiceCaseCount: practiceCases.length,
      expectedStructuredFigures: candidates.filter((item) => item.inventoryKind === "structured").length,
      visitedStructuredFigures: practiceCases.filter((item) => item.inventoryKind === "structured").length,
      specialCaseCount: practiceCases.filter((item) => item.inventoryKind === "special").length,
      matrixStateCount: matrixStates.length,
      expectedVisits,
      actualVisits: visited.size,
      viewports: auditViewports,
      coverageRecords
    });
    expect(visited.size).toBe(expectedVisits);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("public SVG and live raster illustration assets preserve their drawing and container boundaries", async ({ browser }, testInfo) => {
    test.skip(!requested("public-asset"), "public asset surface not requested for this audit shard");
    test.setTimeout(fullAudit ? 3_600_000 : 300_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const uniqueRasterPaths = Array.from(new Set(
      inventory.liveAssetReferences.filter((reference) => reference.mediaType === "raster").map((reference) => reference.assetPath)
    )).sort();
    const svgCandidates = fullAudit || requestedIds.size > 0 ? inventory.publicSvgAssets : inventory.publicSvgAssets.slice(0, 3);
    const rasterCandidates = fullAudit || requestedIds.size > 0 ? uniqueRasterPaths : uniqueRasterPaths.slice(0, 3);
    const eligibleAssets = [
      ...inventory.publicSvgAssets.map((asset) => ({ kind: "svg" as const, path: asset.publicPath })),
      ...uniqueRasterPaths.map((assetPath) => ({ kind: "raster" as const, path: assetPath }))
    ];
    const assetCandidates = selectedIds([
      ...svgCandidates.map((asset) => ({ kind: "svg" as const, path: asset.publicPath })),
      ...rasterCandidates.map((assetPath) => ({ kind: "raster" as const, path: assetPath }))
    ], (asset) => asset.path);
    assertRequestedIdsSelected(assetCandidates, (asset) => asset.path, "public asset audit", eligibleAssets);
    const assets = selectedShard(assetCandidates);
    test.skip(assets.length === 0, "public asset audit shard has no selected asset");

    const context = await browser.newContext({ baseURL: String(testInfo.project.use.baseURL), viewport: { width: 1440, height: 1100 } });
    await installMathCanvasPaintBoundaryProbe(context);
    const page = await context.newPage();
    const baseURL = String(testInfo.project.use.baseURL);
    const findings: Finding[] = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };

    for (const asset of assets) {
      if (asset.kind === "svg") {
        const source = readFileSync(path.join(process.cwd(), "public", asset.path.slice(1)), "utf8");
        await page.setContent(`<base href="${baseURL}/"><main style="width:100%;max-width:900px;margin:0 auto"><style>svg{display:block;max-width:100%;height:auto}</style>${source}</main>`);
      } else {
        const assetUrl = new URL(asset.path, baseURL).href;
        await page.setContent(`<main style="width:100%;max-width:900px;margin:0 auto"><figure style="max-width:100%;margin:0"><img alt="asset under audit" src="${assetUrl}" style="display:block;width:auto;max-width:100%;height:auto;margin:0 auto"></figure></main>`);
        await page.locator("img").evaluate((image: HTMLImageElement) => image.complete
          ? undefined
          : new Promise<void>((resolve, reject) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => reject(new Error(`failed to load ${image.src}`)), { once: true });
            }));
      }

      const findingBase = {
        surfaceType: "public-asset" as const,
        surfaceId: asset.path,
        route: asset.path,
        language: "language-invariant" as const,
        theme: "theme-invariant" as const
      };
      await recordViewportStates({ page, testInfo, findingBase, findings, state: asset.kind, screenshotCount });
      visited.add(asset.path);
    }

    await context.close();
    await attachFindings(testInfo, "public-math-diagram-asset-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      assetCount: assets.length,
      actualVisits: visited.size,
      viewports: auditViewports
    });
    expect(visited.size).toBe(assets.length);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("all Visualization Lab surfaces stay bounded at default, control extremes, and mode states", async ({ browser }, testInfo) => {
    test.skip(!requested("visualization"), "visualization surface not requested for this audit shard");
    test.setTimeout(fullAudit ? 10_800_000 : 900_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const smokeLabIds = new Set(["functions", "us-ca-math-s4-chapter-01"]);
    const candidates = selectedIds(fullAudit || requestedIds.size > 0
      ? inventory.visualizationLabs
      : inventory.visualizationLabs.filter((lab) => smokeLabIds.has(lab.labId)), (lab) => lab.labId);
    assertRequestedIdsSelected(
      candidates,
      (lab) => lab.labId,
      "Visualization Lab audit",
      inventory.visualizationLabs
    );
    const labs = selectedShard(candidates);
    test.skip(labs.length === 0, "visualization audit shard has no selected lab");

    const findings: Finding[] = [];
    const visited = new Set<string>();
    const visitedSignatureBenches = new Set<string>();
    const screenshotCount = { value: 0 };
    const coverageRecords: Array<Record<string, unknown>> = [];

    for (const matrix of matrixStates) {
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        viewport: { width: 1440, height: 1100 }
      });
      await installMathCanvasPaintBoundaryProbe(context);
      // This suite measures every DOM/SVG mathematical mark. Exercise the
      // product's supported SVG fallback deterministically instead of racing
      // an initializing WebGL renderer while getBoundingClientRect() walks the
      // surface. Dedicated Three.js contracts cover the canvas scene itself.
      await context.addInitScript({
        content: `
          const diagramAuditGetContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(contextId, ...args) {
            if (typeof contextId === "string" && contextId.toLowerCase().includes("webgl")) return null;
            return diagramAuditGetContext.call(this, contextId, ...args);
          };
        `
      });
      await context.addInitScript(({ language, theme }) => {
        window.localStorage.setItem("hk-math-language", language);
        window.localStorage.setItem("hk-math-theme", theme);
        for (const key of ["lesson", "practice", "personalized-learning", "visualization"]) {
          window.sessionStorage.setItem(`mais-guest-login-prompt-dismissed:${key}`, "true");
        }
      }, matrix);
      const page = await context.newPage();
      const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));
      const guestButton = page.getByRole("button", { name: /continue as guest|以訪客身份繼續|以访客身份继续/iu });
      await page.addLocatorHandler(guestButton, async (button) => button.click());

      for (const lab of labs) {
        const runtimeCursor = runtime.cursor();
        const labDefinition = visualizationLabById.get(lab.labId);
        expect(labDefinition, `catalog definition must exist for ${lab.labId}`).toBeDefined();
        debugAudit(`visualization ${lab.labId} ${matrix.language}/${matrix.theme}: navigate`);
        await page.goto(buildVisualizationLabHref(labDefinition!), { waitUntil: "domcontentloaded", timeout: 90_000 });
        await disableDiagramAuditMotion(page);
        await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[matrix.language], { timeout: 30_000 });
        if (matrix.theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });
        const activePanel = page.locator(
          `section[data-viz-panel-mode="lab"][data-viz-active-lab-id="${lab.labId}"]`
        );
        await expect(activePanel, `${lab.labId} must be the active Visualization Lab`).toBeVisible({ timeout: 90_000 });
        await expect(activePanel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: 90_000 });
        const activeLabSection = activePanel;
        await expect(activeLabSection.locator("[data-viz-surface]").first()).toBeVisible({ timeout: 90_000 });
        if (lab.rendersThreeD) {
          const progressive = activeLabSection.locator("[data-viz-three-progressive-surface]");
          await expect(progressive).toHaveCount(1);
          await expect(progressive).toHaveAttribute("data-viz-three-ready", "true");
          await expect(progressive).toHaveAttribute("data-viz-three-canvas-ready", "false");
          await expect(progressive.locator("[data-viz-three-progressive-fallback]")).toBeVisible();
          await expect(progressive.locator('[data-viz-three-webgl-status="fallback"]'))
            .toHaveCount(1, { timeout: 30_000 });
        }

        const findingBase = {
          surfaceType: "visualization" as const,
          surfaceId: lab.labId,
          route: lab.route,
          language: matrix.language,
          theme: matrix.theme
        };
        debugAudit(`visualization ${lab.labId}: audit default`);
        const defaultRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "default", screenshotCount });
        coverageRecords.push(...defaultRecords.map(({ viewport, result }) => ({
          surfaceId: lab.labId,
          language: matrix.language,
          theme: matrix.theme,
          state: "default",
          viewport: viewport.name,
          renderMode: "svg-fallback-or-2d",
          coverage: result.coverage,
          documentWidth: result.documentWidth
        })));
        const defaultRangeValues = await captureRangeInputValues(page);
        debugAudit(`visualization ${lab.labId}: set ranges min`);
        const rangeCount = await setAllRangeInputs(page, "min");
        expect(rangeCount).toBe(defaultRangeValues.length);
        if (rangeCount > 0) {
          debugAudit(`visualization ${lab.labId}: audit ranges min`);
          const minRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "all-ranges=min", screenshotCount });
          coverageRecords.push(...minRecords.map(({ viewport, result }) => ({
            surfaceId: lab.labId,
            language: matrix.language,
            theme: matrix.theme,
            state: "all-ranges=min",
            viewport: viewport.name,
            renderMode: "svg-fallback-or-2d",
            coverage: result.coverage,
            documentWidth: result.documentWidth
          })));
          for (const target of ["q1", "mid", "q3"] as const) {
            debugAudit(`visualization ${lab.labId}: set ranges ${target}`);
            await setAllRangeInputs(page, target);
            const state = `all-ranges=${target}`;
            const intermediateRecords = await recordViewportStates({
              page,
              testInfo,
              findingBase,
              findings,
              state,
              screenshotCount
            });
            coverageRecords.push(...intermediateRecords.map(({ viewport, result }) => ({
              surfaceId: lab.labId,
              language: matrix.language,
              theme: matrix.theme,
              state,
              viewport: viewport.name,
              renderMode: "svg-fallback-or-2d",
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
          }
          debugAudit(`visualization ${lab.labId}: set ranges max`);
          await setAllRangeInputs(page, "max");
          debugAudit(`visualization ${lab.labId}: audit ranges max`);
          const maxRecords = await recordViewportStates({ page, testInfo, findingBase, findings, state: "all-ranges=max", screenshotCount });
          coverageRecords.push(...maxRecords.map(({ viewport, result }) => ({
            surfaceId: lab.labId,
            language: matrix.language,
            theme: matrix.theme,
            state: "all-ranges=max",
            viewport: viewport.name,
            renderMode: "svg-fallback-or-2d",
            coverage: result.coverage,
            documentWidth: result.documentWidth
          })));
          await restoreRangeInputValues(page, defaultRangeValues);
        }

        const modeButtons = page.locator("main [data-viz-mode-button]");
        const modeCount = await modeButtons.count();
        for (let modeIndex = 1; modeIndex < modeCount; modeIndex += 1) {
          debugAudit(`visualization ${lab.labId}: select mode ${modeIndex}`);
          await modeButtons.nth(modeIndex).click();
          await expect(modeButtons.nth(modeIndex)).toHaveAttribute("data-viz-mode-active", "true");
          debugAudit(`visualization ${lab.labId}: audit mode ${modeIndex}`);
          const modeRecords = await recordViewportStates({
            page,
            testInfo,
            findingBase,
            findings,
            state: `mode=${modeIndex}`,
            screenshotCount
          });
          coverageRecords.push(...modeRecords.map(({ viewport, result }) => ({
            surfaceId: lab.labId,
            language: matrix.language,
            theme: matrix.theme,
            state: `mode=${modeIndex}`,
            viewport: viewport.name,
            renderMode: "svg-fallback-or-2d",
            coverage: result.coverage,
            documentWidth: result.documentWidth
          })));
        }

        if (lab.signatureBenchIds.length > 0) {
          const switcher = activeLabSection.locator("[data-viz-signature-switcher]");
          await expect(switcher).toHaveAttribute(
            "data-viz-active-signature-bench-id",
            lab.signatureBenchIds[0]
          );
          visitedSignatureBenches.add(`${matrix.language}|${matrix.theme}|${lab.signatureBenchIds[0]}`);
          for (const benchId of lab.signatureBenchIds.slice(1)) {
            const tab = switcher.locator(`[data-viz-signature-bench-id="${benchId}"]`);
            await expect(tab, `${lab.labId} must expose related signature bench ${benchId}`).toBeVisible();
            await tab.click();
            await expect(tab).toHaveAttribute("aria-selected", "true");
            await expect(switcher).toHaveAttribute("data-viz-active-signature-bench-id", benchId);
            await expect(activePanel).toHaveAttribute("data-viz-lab-runtime-status", "lab", { timeout: 30_000 });
            const benchRecords = await recordViewportStates({
              page,
              testInfo,
              findingBase,
              findings,
              state: `signature-bench=${benchId}`,
              screenshotCount
            });
            coverageRecords.push(...benchRecords.map(({ viewport, result }) => ({
              surfaceId: lab.labId,
              signatureBenchId: benchId,
              language: matrix.language,
              theme: matrix.theme,
              state: `signature-bench=${benchId}`,
              viewport: viewport.name,
              renderMode: "signature-canvas",
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
            const benchDefaultRangeValues = await captureRangeInputValues(page);
            const benchRangeCount = await setAllRangeInputs(page, "min");
            expect(benchRangeCount).toBe(benchDefaultRangeValues.length);
            if (benchRangeCount > 0) {
              const benchMinRecords = await recordViewportStates({
                page,
                testInfo,
                findingBase,
                findings,
                state: `signature-bench=${benchId};all-ranges=min`,
                screenshotCount
              });
              coverageRecords.push(...benchMinRecords.map(({ viewport, result }) => ({
                surfaceId: lab.labId,
                signatureBenchId: benchId,
                language: matrix.language,
                theme: matrix.theme,
                state: `signature-bench=${benchId};all-ranges=min`,
                viewport: viewport.name,
                renderMode: "signature-canvas",
                coverage: result.coverage,
                documentWidth: result.documentWidth
              })));
              await setAllRangeInputs(page, "max");
              const benchMaxRecords = await recordViewportStates({
                page,
                testInfo,
                findingBase,
                findings,
                state: `signature-bench=${benchId};all-ranges=max`,
                screenshotCount
              });
              coverageRecords.push(...benchMaxRecords.map(({ viewport, result }) => ({
                surfaceId: lab.labId,
                signatureBenchId: benchId,
                language: matrix.language,
                theme: matrix.theme,
                state: `signature-bench=${benchId};all-ranges=max`,
                viewport: viewport.name,
                renderMode: "signature-canvas",
                coverage: result.coverage,
                documentWidth: result.documentWidth
              })));
              await restoreRangeInputValues(page, benchDefaultRangeValues);
            }
            visitedSignatureBenches.add(`${matrix.language}|${matrix.theme}|${benchId}`);
          }
        }

        const runtimeIssues = runtime.issuesSince(runtimeCursor);
        if (runtimeIssues.length) {
          findings.push({
            ...findingBase,
            viewport: "runtime",
            state: "navigation-and-controls",
            issues: runtimeIssues
          });
        }
        debugAudit(`visualization ${lab.labId}: complete`);
        visited.add(`${matrix.language}|${matrix.theme}|${lab.labId}`);
      }
      await context.close();
    }

    const expectedVisits = labs.length * matrixStates.length;
    await attachFindings(testInfo, "visualization-math-diagram-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      labCount: labs.length,
      matrixStateCount: matrixStates.length,
      expectedVisits,
      actualVisits: visited.size,
      reachableSignatureBenchCount: inventory.signatureBenches.filter((bench) => bench.liveStatus === "reachable").length,
      visitedSignatureBenchStates: visitedSignatureBenches.size,
      portedUnassignedSignatureBenches: inventory.signatureBenches
        .filter((bench) => bench.liveStatus === "ported-unassigned")
        .map((bench) => bench.benchId),
      viewports: auditViewports,
      coverageRecords
    });
    expect(visited.size).toBe(expectedVisits);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("every effective 3D Visualization Lab keeps projected WebGL paint inside the canvas", async ({ browser }, testInfo) => {
    test.skip(!requested("visualization"), "visualization surface not requested for this audit shard");
    test.setTimeout(fullAudit ? 10_800_000 : 900_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const declaredThreeD = inventory.visualizationLabs.filter((lab) => lab.declaresThreeD);
    const effectiveThreeD = inventory.visualizationLabs.filter((lab) => lab.rendersThreeD);
    const signatureCanvasDeclarations = declaredThreeD.filter((lab) => lab.effectiveRenderer === "signature-canvas");
    expect(declaredThreeD.length, "the inventory must retain all declared 3D metadata rows").toBe(90);
    expect(effectiveThreeD.length, "configured routes that actually select ThreeDLabCanvas must stay explicit").toBe(78);
    expect(signatureCanvasDeclarations.length, "signature routes must not be mislabeled as WebGL executions").toBe(12);

    const smokeThreeDIds = new Set(["advanced-functions"]);
    const candidatePool = fullAudit || requestedIds.size > 0
      ? effectiveThreeD
      : effectiveThreeD.filter((lab) => smokeThreeDIds.has(lab.labId));
    const candidates = selectedIds(candidatePool, (lab) => lab.labId);
    assertRequestedIdsSelected(candidates, (lab) => lab.labId, "effective WebGL audit", effectiveThreeD);
    const labs = selectedShard(candidates);
    test.skip(labs.length === 0, "actual WebGL audit shard has no selected effective 3D lab");

    const findings: Finding[] = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };
    const coverageRecords: Array<Record<string, unknown>> = [];

    for (const matrix of matrixStates) {
      for (const lab of labs) {
      // A fresh context per lab prevents accumulated headless GL contexts from
      // silently evicting earlier React Three Fiber canvases.
      const context = await browser.newContext({
        baseURL: String(testInfo.project.use.baseURL),
        viewport: { width: allAuditViewports[0].width, height: allAuditViewports[0].height }
      });
      await installMathCanvasPaintBoundaryProbe(context);
      await context.addInitScript(({ language, theme }) => {
        window.localStorage.setItem("hk-math-language", language);
        window.localStorage.setItem("hk-math-theme", theme);
        window.sessionStorage.setItem("mais-guest-login-prompt-dismissed:visualization", "true");
      }, matrix);
      const page = await context.newPage();
      const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));
      const runtimeCursor = runtime.cursor();
      const guestButton = page.getByRole("button", { name: /continue as guest|以訪客身份繼續|以访客身份继续/iu });
      await page.addLocatorHandler(guestButton, async (button) => button.click());

      try {
        const labDefinition = visualizationLabById.get(lab.labId);
        expect(labDefinition, `catalog definition must exist for ${lab.labId}`).toBeDefined();
        await page.goto(buildVisualizationLabHref(labDefinition!), {
          waitUntil: "domcontentloaded",
          timeout: 90_000
        });
        await disableDiagramAuditMotion(page);
        await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[matrix.language], { timeout: 30_000 });
        if (matrix.theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
        else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });

        const activePanelSelector = `section[data-viz-panel-mode="lab"][data-viz-active-lab-id="${lab.labId}"]`;
        const activePanel = page.locator(activePanelSelector);
        await expect(activePanel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: 90_000 });
        const activeLabSection = activePanel;
        const progressive = activeLabSection.locator("[data-viz-three-progressive-surface]");
        await expect(progressive).toHaveAttribute("data-viz-three-ready", "true");
        await expect(progressive).toHaveAttribute("data-viz-three-canvas-ready", "true", { timeout: 60_000 });
        const actualSurface = progressive.locator(
          '[data-viz-surface][data-viz-renderer="three-r3f"][data-viz-three-webgl-status="ready"]'
        );
        await expect(actualSurface).toHaveAttribute("data-viz-canvas-ready", "true", { timeout: 60_000 });
        await expect(progressive.locator("[data-viz-three-progressive-fallback]")).toHaveCount(0);
        await expect(progressive.locator('[data-viz-three-webgl-status="fallback"]')).toHaveCount(0);
        const canvas = actualSurface.locator("canvas");
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute("data-viz-webgl-boundary-probe", "ready", { timeout: 30_000 });

        const findingBase = {
          surfaceType: "visualization" as const,
          surfaceId: lab.labId,
          route: lab.route,
          language: matrix.language,
          theme: matrix.theme
        };
        const auditedWebglStates = new Set<string>();
        const auditWebglState = async (state: string) => {
          auditedWebglStates.add(state);
          await disableDiagramAuditMotion(page);
          for (const viewport of auditViewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await expect(progressive).toHaveAttribute("data-viz-three-canvas-ready", "true");
            await expect(actualSurface).toHaveAttribute("data-viz-three-webgl-status", "ready");
            const stabilityStartedAt = Date.now();
            await page.evaluate(() => new Promise<void>((resolve) => {
              requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            }));
            const stability = {
              candidateSurfaceCount: 1,
              elapsedMs: Date.now() - stabilityStartedAt,
              sampleCount: 3
            };
            await expect.poll(
              () => canvas.evaluate((element) => typeof (element as HTMLCanvasElement & { [key: symbol]: unknown })[
                Symbol.for("mais.math.webgl-boundary.snapshot.v1")
              ] === "function"),
              { timeout: 15_000 }
            ).toBe(true);
            const canvasMetrics = await canvas.evaluate((element: HTMLCanvasElement) => {
              const box = element.getBoundingClientRect();
              const contextLost = element.getContext("webgl2")?.isContextLost() ??
                element.getContext("webgl")?.isContextLost() ??
                false;
              return {
                backingHeight: element.height,
                backingWidth: element.width,
                cssHeight: box.height,
                cssWidth: box.width,
                contextLost
              };
            });
            expect(canvasMetrics.cssWidth).toBeGreaterThan(0);
            expect(canvasMetrics.cssHeight).toBeGreaterThan(0);
            expect(canvasMetrics.backingWidth).toBeGreaterThan(0);
            expect(canvasMetrics.backingHeight).toBeGreaterThan(0);
            expect(canvasMetrics.contextLost).toBe(false);

            const projection = await canvas.evaluate((element) => {
              type Snapshot = {
                contentRootFound: boolean;
                issueCount: number;
                issues: Array<{
                  detail: string;
                  kind: string;
                  objectId: string;
                  overflowCssPixels: number;
                }>;
                maxOverflowCssPixels: number;
                projectedBoundsCss: { bottom: number; left: number; right: number; top: number } | null;
                renderableCount: number;
                status: "fail" | "pass";
                supportedRenderableCount: number;
                toleranceCssPixels: number;
                unsupportedRenderableCount: number;
                version: number;
              };
              const symbol = Symbol.for("mais.math.webgl-boundary.snapshot.v1");
              const hook = (element as HTMLCanvasElement & { [key: symbol]: (() => Snapshot) | undefined })[symbol];
              if (typeof hook !== "function") throw new Error("WebGL boundary snapshot hook is unavailable");
              return hook();
            });
            const [formulaSafeAreaStatus, formulaPlacement, formulaSafeAreaSummary, formulaViewportSource] = await Promise.all([
              actualSurface.getAttribute("data-viz-manim-formula-safe-area-status"),
              actualSurface.getAttribute("data-viz-manim-formula-placement"),
              actualSurface.getAttribute("data-viz-manim-formula-safe-area-summary"),
              actualSurface.getAttribute("data-viz-manim-formula-viewport-source")
            ]);
            const formulaDomGeometry = await actualSurface.evaluate((surface) => {
              const formula = surface.querySelector<HTMLElement>("[data-viz-manim-formula-overlay]");
              const labels = Array.from(surface.querySelectorAll<HTMLElement>(
                '[data-viz-manim-projected-label][data-viz-manim-projected-visible="true"]'
              ));
              const formulaRect = formula?.getBoundingClientRect() ?? null;
              const rect = (box: DOMRect) => ({
                bottom: box.bottom,
                height: box.height,
                left: box.left,
                right: box.right,
                top: box.top,
                width: box.width,
                x: box.x,
                y: box.y
              });
              const isRendered = (element: HTMLElement, box: DOMRect) => {
                const style = getComputedStyle(element);
                const checkVisibility = (element as HTMLElement & {
                  checkVisibility?: (options?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
                }).checkVisibility;
                return box.width > 0 && box.height > 0 && element.getClientRects().length > 0 &&
                  style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" &&
                  Number.parseFloat(style.opacity || "1") > 0 &&
                  (typeof checkVisibility !== "function" || checkVisibility.call(element, {
                    checkOpacity: true,
                    checkVisibilityCSS: true
                  }));
              };
              const collisions = formulaRect ? labels.flatMap((label) => {
                const labelRect = label.getBoundingClientRect();
                const overlapWidth = Math.min(formulaRect.right, labelRect.right) - Math.max(formulaRect.left, labelRect.left);
                const overlapHeight = Math.min(formulaRect.bottom, labelRect.bottom) - Math.max(formulaRect.top, labelRect.top);
                if (overlapWidth <= 0 || overlapHeight <= 0) return [];
                return [{
                  labelId: label.getAttribute("data-viz-manim-projected-label") ?? "unknown",
                  labelRect: rect(labelRect),
                  overlapHeight,
                  overlapWidth
                }];
              }) : [];

              return {
                collisions,
                formulaRect: formulaRect ? rect(formulaRect) : null,
                formulaId: formula?.getAttribute("data-viz-manim-formula-id") ?? null,
                formulaRendered: formula && formulaRect ? isRendered(formula, formulaRect) : false,
                formulaText: formula?.textContent?.trim() ?? "",
                formulaTokenCount: formula?.getAttribute("data-viz-manim-token-count") ?? null,
                visibleLabels: labels.map((label) => {
                  const labelRect = label.getBoundingClientRect();
                  return {
                    id: label.getAttribute("data-viz-manim-projected-label") ?? "unknown",
                    objectId: label.getAttribute("data-viz-manim-projected-object-id") ?? "unknown",
                    rect: rect(labelRect),
                    rendered: isRendered(label, labelRect),
                    text: label.getAttribute("data-viz-manim-projected-label-text") ?? label.textContent?.trim() ?? "",
                    visible: label.getAttribute("data-viz-manim-projected-visible")
                  };
                }),
                visibleLabelCount: labels.length
              };
            });
            const documentWidth = await page.evaluate(() => ({
              client: document.documentElement.clientWidth,
              scroll: document.documentElement.scrollWidth
            }));
            const domBoundary = await auditMathDiagramPage(page, { rootSelector: activePanelSelector });
            const canvasRect = {
              height: canvasMetrics.cssHeight,
              width: canvasMetrics.cssWidth,
              x: 0,
              y: 0
            };
            const projectedRect = projection.projectedBoundsCss
              ? {
                  height: Math.max(0, projection.projectedBoundsCss.bottom - projection.projectedBoundsCss.top),
                  width: Math.max(0, projection.projectedBoundsCss.right - projection.projectedBoundsCss.left),
                  x: projection.projectedBoundsCss.left,
                  y: projection.projectedBoundsCss.top
                }
              : { height: 0, width: 0, x: 0, y: 0 };
            const projectionIssues: MathDiagramBoundaryIssue[] = projection.issues.map((issue) => ({
              kind: "diagram-outside-container",
              surface: `${lab.labId}:webgl`,
              element: issue.objectId,
              overflowPx: issue.overflowCssPixels,
              surfaceRect: canvasRect,
              elementRect: projectedRect,
              detail: `WebGL ${issue.kind}: ${issue.detail}`
            }));
            if (formulaSafeAreaStatus !== "safe") {
              projectionIssues.push({
                kind: "label-mark-collision",
                surface: `${lab.labId}:formula-layer`,
                element: "data-viz-manim-formula-safe-area-status",
                overflowPx: 0,
                surfaceRect: canvasRect,
                elementRect: projectedRect,
                detail: `formula overlay safe-area status is ${formulaSafeAreaStatus ?? "missing"}, expected safe; placement=${formulaPlacement ?? "missing"}; ${formulaSafeAreaSummary ?? "summary missing"}`
              });
            }
            if (
              !formulaDomGeometry.formulaRect ||
              formulaDomGeometry.formulaRect.width <= 0 ||
              formulaDomGeometry.formulaRect.height <= 0 ||
              !formulaDomGeometry.formulaRendered
            ) {
              projectionIssues.push({
                kind: "surface-zero-size",
                surface: `${lab.labId}:formula-layer`,
                element: "data-viz-manim-formula-overlay",
                overflowPx: 0,
                surfaceRect: canvasRect,
                elementRect: formulaDomGeometry.formulaRect ?? { height: 0, width: 0, x: 0, y: 0 },
                detail: "formula overlay must remain rendered and non-zero while collision avoidance is active"
              });
            }
            for (const hiddenLabel of formulaDomGeometry.visibleLabels.filter((label) =>
              !label.rendered || label.rect.width <= 0 || label.rect.height <= 0
            )) {
              projectionIssues.push({
                kind: "surface-zero-size",
                surface: `${lab.labId}:projected-label-layer`,
                element: hiddenLabel.id,
                overflowPx: 0,
                surfaceRect: canvasRect,
                elementRect: hiddenLabel.rect,
                detail: "a projected label marked visible must remain computed-visible with a non-zero rendered rectangle"
              });
            }
            if (formulaViewportSource !== "measured") {
              projectionIssues.push({
                kind: "canvas-2d-audit-incomplete",
                surface: `${lab.labId}:formula-layer`,
                element: "data-viz-manim-formula-viewport-source",
                overflowPx: 0,
                surfaceRect: canvasRect,
                elementRect: formulaDomGeometry.formulaRect ?? canvasRect,
                detail: `formula collision layout used ${formulaViewportSource ?? "missing"} viewport dimensions instead of the measured canvas`
              });
            }
            const requiresRun31PrimaryLabel = lab.labId === "advanced-functions"
              && viewport.name === "phone-320"
              && [
                "actual-webgl/all-ranges=min;mode=default",
                "actual-webgl/all-ranges=default;mode=2",
                "actual-webgl/all-ranges=default;mode=3"
              ].includes(state);
            if (requiresRun31PrimaryLabel) {
              const primaryLabel = formulaDomGeometry.visibleLabels.find(
                (label) => label.id === "label:primary-family-curve"
              );
              if (
                formulaDomGeometry.formulaId !== "family-formula" ||
                !primaryLabel ||
                primaryLabel.objectId !== "primary-family-curve" ||
                primaryLabel.text !== "active f(x)" ||
                primaryLabel.visible !== "true" ||
                !primaryLabel.rendered ||
                primaryLabel.rect.width <= 0 ||
                primaryLabel.rect.height <= 0
              ) {
                projectionIssues.push({
                  kind: "label-mark-collision",
                  surface: `${lab.labId}:formula-layer`,
                  element: "label:primary-family-curve",
                  overflowPx: 0,
                  surfaceRect: formulaDomGeometry.formulaRect ?? canvasRect,
                  elementRect: projectedRect,
                  detail: "Run 31 regression must keep family-formula and its visible active f(x) projected label; hiding either cannot satisfy the boundary gate"
                });
              }
              if (Math.abs(canvasMetrics.cssWidth - 226) > 1 || Math.abs(canvasMetrics.cssHeight - 127.125) > 1) {
                projectionIssues.push({
                  kind: "canvas-2d-audit-incomplete",
                  surface: `${lab.labId}:run-31-viewport`,
                  element: "canvas",
                  overflowPx: 0,
                  surfaceRect: canvasRect,
                  elementRect: projectedRect,
                  detail: `Run 31 phone regression expected the captured 226×127.125 CSS-pixel canvas, received ${canvasMetrics.cssWidth.toFixed(3)}×${canvasMetrics.cssHeight.toFixed(3)}`
                });
              }
              const formulaRect = formulaDomGeometry.formulaRect;
              const allowedWidths = [113, 101.7, 90.4, 79.1];
              const summaryBox = formulaSafeAreaSummary?.match(
                /box=x=[^,;]+,y=[^,;]+,w=([0-9.]+),h=([0-9.]+)/u
              );
              const summaryWidth = Number(summaryBox?.[1]);
              const summaryHeight = Number(summaryBox?.[2]);
              const formulaShapeIsValid = Boolean(formulaRect) &&
                allowedWidths.some((width) => Math.abs(formulaRect!.width - width) <= 1) &&
                Math.abs(formulaRect!.height - 53.34) <= 1 &&
                Number.isFinite(summaryWidth) && Number.isFinite(summaryHeight) &&
                Math.abs(formulaRect!.width - summaryWidth) <= 1 &&
                Math.abs(formulaRect!.height - summaryHeight) <= 1 &&
                formulaDomGeometry.formulaTokenCount === "3" &&
                formulaDomGeometry.formulaText.length > 0;
              if (!formulaShapeIsValid) {
                projectionIssues.push({
                  kind: "canvas-2d-audit-incomplete",
                  surface: `${lab.labId}:run-31-formula-shape`,
                  element: "family-formula",
                  overflowPx: 0,
                  surfaceRect: canvasRect,
                  elementRect: formulaRect ?? projectedRect,
                  detail: `Run 31 formula must retain 3 rendered tokens and a measured 113/101.7/90.4/79.1×53.34 panel matching diagnostics; rect=${JSON.stringify(formulaRect)}, tokens=${formulaDomGeometry.formulaTokenCount ?? "missing"}, summary=${formulaSafeAreaSummary ?? "missing"}`
                });
              }
            }
            for (const collision of formulaDomGeometry.collisions) {
              projectionIssues.push({
                kind: "label-mark-collision",
                surface: `${lab.labId}:formula-layer`,
                element: collision.labelId,
                overflowPx: Math.min(collision.overlapWidth, collision.overlapHeight),
                surfaceRect: formulaDomGeometry.formulaRect ?? canvasRect,
                elementRect: collision.labelRect,
                detail: `rendered projected label overlaps the formula panel by ${collision.overlapWidth.toFixed(2)}px × ${collision.overlapHeight.toFixed(2)}px`
              });
            }
            if (documentWidth.scroll !== documentWidth.client) {
              projectionIssues.push({
                kind: "page-horizontal-overflow",
                surface: `${lab.labId}:document`,
                element: "documentElement",
                overflowPx: documentWidth.scroll - documentWidth.client,
                surfaceRect: canvasRect,
                elementRect: projectedRect,
                detail: `document scrollWidth ${documentWidth.scroll}px exceeds clientWidth ${documentWidth.client}px`
              });
            }
            const issues = [...projectionIssues, ...domBoundary.issues];
            coverageRecords.push({
              surfaceId: lab.labId,
              language: matrix.language,
              theme: matrix.theme,
              viewport: viewport.name,
              state,
              renderMode: "actual-webgl-projected-content",
              stability,
              canvasMetrics,
              formulaSafeAreaStatus,
              formulaPlacement,
              formulaSafeAreaSummary,
              formulaViewportSource,
              formulaDomGeometry,
              domBoundaryCoverage: domBoundary.coverage,
              projection,
              documentWidth
            });
            if (!issues.length) continue;
            findings.push({ ...findingBase, viewport: viewport.name, state, issues });
            await captureFirstFailures(page, testInfo, findings, screenshotCount);
          }
        };

        await auditWebglState("actual-webgl/default");
        const exercisesControlStates = fullAudit || (matrix.language === "en" && matrix.theme === "light");
        if (exercisesControlStates) {
          const defaultRangeValues = await captureRangeInputValues(page, activePanelSelector);
          const requiresRun31StateRoster = lab.labId === "advanced-functions" &&
            matrix.language === "en" && matrix.theme === "light";
          if (requiresRun31StateRoster) {
            expect(defaultRangeValues.length, "Run 31 regression requires the Advanced Functions range controls").toBeGreaterThan(0);
          }
          const rangeTargets = ["min", "q1", "mid", "q3", "max"] as const;
          let rangeCount = defaultRangeValues.length;
          for (const target of rangeTargets) {
            rangeCount = await setAllRangeInputs(page, target, activePanelSelector);
            expect(rangeCount).toBe(defaultRangeValues.length);
            if (rangeCount > 0) await auditWebglState(`actual-webgl/all-ranges=${target};mode=default`);
          }
          await restoreRangeInputValues(page, defaultRangeValues, activePanelSelector);

          const modeButtons = activePanel.locator("[data-viz-mode-button]");
          const modeCount = await modeButtons.count();
          if (requiresRun31StateRoster) {
            expect(modeCount, "Run 31 regression requires default plus modes 1, 2, and 3").toBeGreaterThanOrEqual(4);
          }
          for (let modeIndex = 1; modeIndex < modeCount; modeIndex += 1) {
            await restoreRangeInputValues(page, defaultRangeValues, activePanelSelector);
            await modeButtons.nth(modeIndex).evaluate((button: HTMLButtonElement) => button.click());
            await expect(modeButtons.nth(modeIndex)).toHaveAttribute("data-viz-mode-active", "true");
            await auditWebglState(`actual-webgl/all-ranges=default;mode=${modeIndex}`);
          }
          if (requiresRun31StateRoster) {
            for (const requiredState of [
              "actual-webgl/all-ranges=min;mode=default",
              "actual-webgl/all-ranges=default;mode=2",
              "actual-webgl/all-ranges=default;mode=3"
            ]) {
              expect(
                auditedWebglStates.has(requiredState),
                `Run 31 regression state was not audited: ${requiredState}`
              ).toBe(true);
            }
          }
        }

        const runtimeIssues = runtime.issuesSince(runtimeCursor);
        if (runtimeIssues.length) {
          findings.push({
            ...findingBase,
            viewport: "runtime",
            state: "actual-webgl",
            issues: runtimeIssues
          });
        }
        visited.add(`${lab.labId}|${matrix.language}|${matrix.theme}`);
      } finally {
        await context.close();
      }
      }
    }

    await attachFindings(testInfo, "visualization-actual-webgl-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      declaredThreeDCount: declaredThreeD.length,
      effectiveThreeDCount: effectiveThreeD.length,
      declaredSignatureCanvasCount: signatureCanvasDeclarations.length,
      declaredSignatureCanvasIds: signatureCanvasDeclarations.map((lab) => lab.labId),
      selectedLabIds: labs.map((lab) => lab.labId),
      actualVisits: visited.size,
      expectedVisits: labs.length * matrixStates.length,
      matrixStateCount: matrixStates.length,
      viewports: auditViewports,
      coverageRecords
    });
    expect(visited.size).toBe(labs.length * matrixStates.length);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("standalone mathematical routes keep every live image, stored figure, static SVG, and dragged construction bounded", async ({ browser }, testInfo) => {
    test.skip(
      !requested("lesson") && !requested("practice") && !requested("visualization"),
      "no standalone diagram surface was requested for this audit shard"
    );
    test.setTimeout(fullAudit ? 3_600_000 : 600_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const eligibleStandaloneRoutes = inventory.standaloneDiagramRoutes
      .filter((route) => requested(route.surfaceType));
    const candidates = selectedIds(
      eligibleStandaloneRoutes,
      (route) => route.id
    );
    assertRequestedIdsSelected(candidates, (route) => route.id, "standalone route audit", eligibleStandaloneRoutes);
    const routes = selectedShard(candidates);
    test.skip(routes.length === 0, "standalone diagram audit shard has no selected route");

    const findings: Finding[] = [];
    const coverageRecords: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };
    let registrationSerial = 40_000;

    for (const matrix of matrixStates) {
      for (const standalone of routes) {
        const grade = standalone.interaction === "replacement-textbook-images"
          ? "S2"
          : standalone.interaction === "stored-question-figure"
            ? "P4"
            : "S4";
        const { context, page } = await registerAuditStudent(
          browser,
          testInfo,
          standalone.publisher ?? "US_CA_MATH",
          matrix,
          registrationSerial,
          grade
        );
        registrationSerial += 1;
        const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));
        const runtimeCursor = runtime.cursor();
        const findingBase = {
          surfaceType: standalone.surfaceType,
          surfaceId: standalone.id,
          route: standalone.route,
          language: matrix.language,
          theme: matrix.theme
        };

        try {
          if (standalone.interaction === "stored-question-figure") {
            const attempt = await page.request.post("/api/attempts", {
              data: {
                questionId: "graph-p4-angles-straight-line",
                selectedAnswer: "__diagram_audit_intentionally_wrong__",
                durationSeconds: 17
              }
            });
            const attemptBody = await attempt.json() as { correct?: boolean; error?: string };
            expect(attempt.status(), JSON.stringify(attemptBody)).toBe(200);
            expect(attemptBody.correct).toBe(false);
            const mistakes = await page.request.get("/api/mistakes");
            const mistakesBody = await mistakes.json() as {
              mistakes?: Array<{ questionId?: string }>;
              error?: string;
            };
            expect(mistakes.status(), JSON.stringify(mistakesBody)).toBe(200);
            expect(
              mistakesBody.mistakes?.some((mistake) => mistake.questionId === "graph-p4-angles-straight-line"),
              "the seeded wrong attempt must be durable before the Mistake Book route is audited"
            ).toBe(true);
          }

          await page.goto(standalone.route, { waitUntil: "domcontentloaded", timeout: 90_000 });
          expect(routePath(page.url()), `${standalone.id} must retain its standalone route`).toBe(routePath(standalone.route));
          await expect(page.locator("html")).toHaveAttribute("lang", htmlLanguagePattern[matrix.language], { timeout: 30_000 });
          if (matrix.theme === "dark") await expect(page.locator("html")).toHaveClass(/\bdark\b/u, { timeout: 30_000 });
          else await expect(page.locator("html")).not.toHaveClass(/\bdark\b/u, { timeout: 30_000 });

          if (standalone.interaction === "replacement-textbook-images") {
            const livePack = JSON.parse(readFileSync(
              path.join(process.cwd(), "data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json"),
              "utf8"
            )) as { lessons?: unknown[] };
            expect(livePack.lessons?.length, "the browser audit must follow the exact live replacement-textbook record count").toBe(15);
            const lessons = page.locator('[data-testid^="california-replacement-lesson-"]');
            await expect(lessons).toHaveCount(livePack.lessons!.length);
            const conceptImages = lessons.locator("figure img");
            await expect(conceptImages).toHaveCount(livePack.lessons!.length);
            for (let imageIndex = 0; imageIndex < livePack.lessons!.length; imageIndex += 1) {
              const image = conceptImages.nth(imageIndex);
              await image.scrollIntoViewIfNeeded();
              await expect.poll(async () => image.evaluate((element: HTMLImageElement) =>
                element.complete && element.naturalHeight > 0 && element.naturalWidth > 0
              ), {
                message: `California replacement concept image ${imageIndex + 1} must decode successfully`,
                timeout: 30_000
              }).toBe(true);
              const dimensions = await image.evaluate((element: HTMLImageElement) => ({
                naturalHeight: element.naturalHeight,
                naturalWidth: element.naturalWidth,
                src: element.currentSrc || element.src
              }));
              expect(dimensions.naturalWidth, `replacement image ${imageIndex + 1}: ${dimensions.src}`).toBeGreaterThan(0);
              expect(dimensions.naturalHeight, `replacement image ${imageIndex + 1}: ${dimensions.src}`).toBeGreaterThan(0);
            }
            coverageRecords.push({
              surfaceId: standalone.id,
              language: matrix.language,
              theme: matrix.theme,
              state: "all-live-lessons-and-concept-images-loaded",
              liveLessonCount: livePack.lessons!.length,
              renderedLessonCount: await lessons.count(),
              decodedConceptImageCount: await conceptImages.count()
            });
          } else if (standalone.interaction === "static-svg") {
            await expect(page.locator("[data-practice-adventure-ui-preview]")).toBeVisible();
            await expect(page.getByRole("img", { name: "Parallelogram diagram" })).toBeVisible();
            const islandImages = page.getByRole("img", { name: "Adventure island map with math mission landmarks" });
            await expect(islandImages).toHaveCount(1);
            await expect.poll(async () => islandImages.evaluate((element: HTMLImageElement) => element.naturalWidth), {
              message: "adventure preview map must decode",
              timeout: 30_000
            }).toBeGreaterThan(0);
          } else if (standalone.interaction === "stored-question-figure") {
            const storedQuestion = page.locator('article[data-question-id="graph-p4-angles-straight-line"]');
            await expect(storedQuestion).toBeVisible({ timeout: 30_000 });
            await expect(storedQuestion.locator('[data-question-figure][data-diagram-kind="plane-figure"]')).toBeVisible();
            // One arc identifies the 130° angle and the adjacent unknown uses
            // a double-arc convention, so the exact stored figure has three
            // independently auditable arc paths.
            await expect(storedQuestion.locator("[data-diagram-angle-arc]")).toHaveCount(3);
          } else {
            await expect(page.locator('[data-stembench-svg-demo="euler-line-nine-point-circle"]')).toBeVisible();
            await expect(page.locator('svg[data-stembench-svg="advanced-geometry-euler-line"]')).toBeVisible();
          }

          const defaultRecords = await recordViewportStates({
            page,
            testInfo,
            findingBase,
            findings,
            state: "standalone/default",
            screenshotCount
          });
          coverageRecords.push(...defaultRecords.map(({ viewport, result }) => ({
            surfaceId: standalone.id,
            language: matrix.language,
            theme: matrix.theme,
            state: "standalone/default",
            viewport: viewport.name,
            interaction: standalone.interaction,
            coverage: result.coverage,
            documentWidth: result.documentWidth
          })));

          if (standalone.interaction === "drag-svg") {
            const demo = page.locator('[data-stembench-svg-demo="euler-line-nine-point-circle"]');
            const svg = demo.locator('svg[data-stembench-svg="advanced-geometry-euler-line"]');
            const vertex = svg.getByRole("button", { name: "Drag vertex C" });
            await vertex.scrollIntoViewIfNeeded();
            const beforeMetrics = await demo.evaluate((element) => [
              element.getAttribute("data-report-og"),
              element.getAttribute("data-report-gh"),
              element.getAttribute("data-report-ratio-gh-og"),
              element.getAttribute("data-report-nine-point-radius")
            ].join("|"));
            const start = await vertex.boundingBox();
            const target = await svg.evaluate((element: SVGSVGElement) => {
              const point = element.createSVGPoint();
              point.x = 480;
              point.y = 150;
              const transformed = point.matrixTransform(element.getScreenCTM()!);
              return { x: transformed.x, y: transformed.y };
            });
            expect(start, "Euler vertex C must expose a draggable screen box").not.toBeNull();
            await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(50);
            await page.mouse.move(target.x, target.y, { steps: 12 });
            await page.mouse.up();
            await expect.poll(async () => demo.evaluate((element) => [
              element.getAttribute("data-report-og"),
              element.getAttribute("data-report-gh"),
              element.getAttribute("data-report-ratio-gh-og"),
              element.getAttribute("data-report-nine-point-radius")
            ].join("|")), {
              message: "dragging Euler vertex C must change the computed construction",
              timeout: 10_000
            }).not.toBe(beforeMetrics);
            const draggedRecords = await recordViewportStates({
              page,
              testInfo,
              findingBase,
              findings,
              state: "standalone/vertex-C-dragged-to-inset-grid",
              screenshotCount
            });
            coverageRecords.push(...draggedRecords.map(({ viewport, result }) => ({
              surfaceId: standalone.id,
              language: matrix.language,
              theme: matrix.theme,
              state: "standalone/vertex-C-dragged-to-inset-grid",
              viewport: viewport.name,
              interaction: standalone.interaction,
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
          }

          const runtimeIssues = runtime.issuesSince(runtimeCursor);
          if (runtimeIssues.length) {
            findings.push({ ...findingBase, viewport: "runtime", state: "standalone/navigation-and-interaction", issues: runtimeIssues });
          }
          visited.add(`${standalone.id}|${matrix.language}|${matrix.theme}`);
        } finally {
          await context.close();
        }
      }
    }

    await attachFindings(testInfo, "standalone-math-diagram-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      selectedRouteIds: routes.map((route) => route.id),
      matrixStateCount: matrixStates.length,
      expectedVisits: routes.length * matrixStates.length,
      actualVisits: visited.size,
      viewports: auditViewports,
      coverageRecords
    });
    expect(visited.size).toBe(routes.length * matrixStates.length);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });

  test("CCSS random, metric cross-product, context-menu, modifier, click-grid, and drag-grid exceptions stay bounded", async ({ browser }, testInfo) => {
    test.skip(!requested("lesson"), "lesson surface not requested for exceptional-state audit");
    test.setTimeout(fullAudit ? 7_200_000 : 900_000);

    const { inventory, failures: inventoryFailures } = await buildMathDiagramInventory();
    expect(inventoryFailures).toEqual([]);
    validateRequestedIds(inventory);
    const exceptionIds = [
      "sampling",
      "probability-basics",
      "sampling-inference",
      "matrices",
      "metric-conversion",
      "coordinate-plane",
      "four-quadrant-plane",
      "slope-explorer"
    ] as const;
    const allExceptions = exceptionIds.map((lessonId) => {
      const sourceRow = inventory.ccssLessons.find((lesson) => lesson.lessonId === lessonId);
      expect(sourceRow, `exceptional CCSS inventory row must exist for ${lessonId}`).toBeDefined();
      const topicId = sourceRow!.parentTopicIds[0];
      const route = inventory.lessonRoutes.find((candidate) => candidate.topicId === topicId);
      expect(route, `parent lesson route must exist for exceptional CCSS lesson ${lessonId}`).toBeDefined();
      return { lessonId, sourceRow: sourceRow!, topicId, route: route!.route };
    });
    const requestedExceptions = requestedIds.size || requestedCcssLessonIds.size
      ? allExceptions.filter((entry) =>
          (requestedIds.size === 0 || requestedIds.has(entry.topicId)) &&
          (requestedCcssLessonIds.size === 0 || requestedCcssLessonIds.has(entry.lessonId))
        )
      : allExceptions;
    assertRequestedIdsSelected(
      requestedExceptions,
      (entry) => entry.topicId,
      "exceptional CCSS audit",
      allExceptions
    );
    if (requestedCcssLessonIds.size) {
      const selectedLessonIds = new Set<string>(requestedExceptions.map((entry) => entry.lessonId));
      const missingLessonIds = Array.from(requestedCcssLessonIds)
        .filter((lessonId) => !selectedLessonIds.has(lessonId));
      if (missingLessonIds.length) {
        throw new Error(
          `MATH_DIAGRAM_AUDIT_CCSS_LESSON_IDS did not select an exceptional CCSS candidate: ${missingLessonIds.join(", ")}`
        );
      }
    }
    const exceptions = selectedShard(requestedExceptions);
    test.skip(exceptions.length === 0, "exceptional CCSS audit shard has no selected lesson");

    const findings: Finding[] = [];
    const coverageRecords: Array<Record<string, unknown>> = [];
    const visited = new Set<string>();
    const screenshotCount = { value: 0 };
    let registrationSerial = 50_000;

    for (const matrix of matrixStates) {
      const { context, page } = await registerAuditStudent(
        browser,
        testInfo,
        "US_CA_MATH",
        matrix,
        registrationSerial,
        "S6"
      );
      registrationSerial += 1;
      await page.addInitScript(() => {
        const auditWindow = window as Window & { __mathDiagramRandomQueue?: number[] };
        const originalRandom = Math.random.bind(Math);
        auditWindow.__mathDiagramRandomQueue = [];
        Math.random = () => auditWindow.__mathDiagramRandomQueue?.shift() ?? originalRandom();
      });
      const runtime = installRuntimeAuditCollector(page, String(testInfo.project.use.baseURL));

      try {
        for (const exceptional of exceptions) {
          const runtimeCursor = runtime.cursor();
          const findingBase = {
            surfaceType: "lesson" as const,
            surfaceId: exceptional.topicId,
            route: exceptional.route,
            language: matrix.language,
            theme: matrix.theme
          };
          const root = page.locator(`[data-ccss-lesson="${exceptional.lessonId}"]`);
          const seedRandom = async (values: number[]) => page.evaluate((nextValues) => {
            const auditWindow = window as Window & { __mathDiagramRandomQueue?: number[] };
            auditWindow.__mathDiagramRandomQueue = [...nextValues];
          }, values);
          const auditState = async (state: string) => {
            const digest = await ccssDiagramDigest(page, exceptional.lessonId);
            const records = await recordViewportStates({ page, testInfo, findingBase, findings, state, screenshotCount });
            coverageRecords.push(...records.map(({ viewport, result }) => ({
              surfaceId: exceptional.topicId,
              lessonId: exceptional.lessonId,
              language: matrix.language,
              theme: matrix.theme,
              state,
              digest,
              viewport: viewport.name,
              coverage: result.coverage,
              documentWidth: result.documentWidth
            })));
          };

          if (exceptional.lessonId === "sampling") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            await seedRandom(Array(50).fill(0));
            await root.getByRole("button", { name: /Take a new sample/iu }).click();
            await expect(root.getByText("20 of 20 = 100%", { exact: true })).toBeVisible();
            await auditState("exception/random-all-successes");

            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            await seedRandom(Array(50).fill(0.999999));
            await root.getByRole("button", { name: /Take a new sample/iu }).click();
            await expect(root.getByText("0 of 20 = 0%", { exact: true })).toBeVisible();
            await auditState("exception/random-all-failures");
          } else if (exceptional.lessonId === "probability-basics") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            await seedRandom(Array(50).fill(0));
            await root.getByRole("button", { name: /Flip 50/iu }).click();
            await expect(root.getByText("50 / 50 = 1.000", { exact: true })).toBeVisible();
            await auditState("exception/random-50-heads");

            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            await seedRandom(Array(50).fill(0.999999));
            await root.getByRole("button", { name: /Flip 50/iu }).click();
            await expect(root.getByText("0 / 50 = 0.000", { exact: true })).toBeVisible();
            await auditState("exception/random-0-heads");
          } else if (exceptional.lessonId === "sampling-inference") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            await seedRandom(Array.from({ length: 32 * 20 }, (_, index) => index % 20 < 12 ? 0.1 : 0.9));
            const draw = root.getByRole("button", { name: /Draw a sample of 20/iu });
            const bars = root.locator('div[title$="%"]');
            await draw.click();
            await expect(bars).toHaveCount(1);
            await auditState("exception/seeded-sample-draws=1");
            for (let drawIndex = 1; drawIndex < 32; drawIndex += 1) await draw.click();
            await expect(bars).toHaveCount(32);
            await auditState("exception/seeded-sample-draws=32");
          } else if (exceptional.lessonId === "matrices") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            let firstCell = root.locator('button[title="click +1, right-click −1"]').first();
            expect(Number(await firstCell.textContent())).toBe(1);
            await firstCell.click({ modifiers: ["Shift"] });
            await expect(firstCell).toHaveText("0");
            await auditState("exception/matrix-cell-shift-click-minus-one");

            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            firstCell = root.locator('button[title="click +1, right-click −1"]').first();
            expect(Number(await firstCell.textContent())).toBe(1);
            await firstCell.click({ button: "right" });
            await expect(firstCell).toHaveText("0");
            await auditState("exception/matrix-cell-contextmenu-minus-one");
          } else if (exceptional.lessonId === "metric-conversion") {
            expect(exceptional.sourceRow.exceptionalStatePolicies).toContain(
              "metric-conversion-finite-number-and-unit-cross-product-v1"
            );
            for (const value of ["0", "999999999999999"] as const) {
              await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
              const valueInput = root.locator('[data-diagram-exception-control="metric-value"]');
              const fromUnit = root.locator('[data-diagram-exception-control="metric-from-unit"]');
              const toUnit = root.locator('[data-diagram-exception-control="metric-to-unit"]');
              const resultCard = root.locator("[data-metric-conversion-result-card]");
              await valueInput.fill(value);
              await expect(valueInput).toHaveValue(value);
              for (let fromIndex = 0; fromIndex < 4; fromIndex += 1) {
                await fromUnit.selectOption(String(fromIndex));
                for (let toIndex = 0; toIndex < 4; toIndex += 1) {
                  await toUnit.selectOption(String(toIndex));
                  await expect(resultCard).toHaveAttribute("data-metric-conversion-result-finite", "true");
                  await auditState(
                    `exception/metric-value=${value};from=${fromIndex};to=${toIndex}`
                  );
                }
              }
            }
          } else if (exceptional.lessonId === "coordinate-plane") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            const svg = root.locator("svg[role='img']").first();
            const points = [{ x: 64, y: 64 }, { x: 304, y: 304 }];
            for (const [pointIndex, point] of points.entries()) {
              await svg.scrollIntoViewIfNeeded();
              const beforeLabel = await svg.getAttribute("aria-label");
              const screenPoint = await svg.evaluate((element: SVGSVGElement, target) => {
                const svgPoint = element.createSVGPoint();
                svgPoint.x = target.x;
                svgPoint.y = target.y;
                const transformed = svgPoint.matrixTransform(element.getScreenCTM()!);
                return { x: transformed.x, y: transformed.y };
              }, point);
              await page.mouse.click(screenPoint.x, screenPoint.y);
              await expect.poll(() => svg.getAttribute("aria-label")).not.toBe(beforeLabel);
              await auditState(`exception/click-grid-inset=${pointIndex + 1}`);
            }
          } else if (exceptional.lessonId === "four-quadrant-plane") {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            const svg = root.locator("svg[role='img']").first();
            const reflectedPoint = svg.locator("[data-diagram-reflected-point]");
            const clickSvgPoint = async ({
              expectedCoordinate,
              expectedSelfReflection,
              point,
              state,
            }: {
              expectedCoordinate: { x: number; y: number };
              expectedSelfReflection: boolean;
              point: { x: number; y: number };
              state: string;
            }) => {
              await svg.scrollIntoViewIfNeeded();
              const beforeLabel = await svg.getAttribute("aria-label");
              const screenPoint = await svg.evaluate((element: SVGSVGElement, target) => {
                const svgPoint = element.createSVGPoint();
                svgPoint.x = target.x;
                svgPoint.y = target.y;
                const transformed = svgPoint.matrixTransform(element.getScreenCTM()!);
                return { x: transformed.x, y: transformed.y };
              }, point);
              await page.mouse.click(screenPoint.x, screenPoint.y);
              await expect.poll(() => svg.getAttribute("aria-label")).not.toBe(beforeLabel);
              const coordinateText = `(${expectedCoordinate.x}, ${expectedCoordinate.y})`;
              await expect(svg.locator("[data-diagram-main-point-label]")).toHaveText(coordinateText);
              await expect(svg).toHaveAttribute("aria-label", new RegExp(`^Point at \\(${expectedCoordinate.x}, ${expectedCoordinate.y}\\)`));
              await expect(svg).toHaveAttribute(
                "data-diagram-self-reflection",
                expectedSelfReflection ? "true" : "false",
              );
              await expect(reflectedPoint).toHaveCount(expectedSelfReflection ? 0 : 1);
              await auditState(state);
            };

            // Exact grid endpoints exercise inward anchors/baselines rather than
            // only the previously tested one-cell-inset corner states.
            await clickSvgPoint({
              expectedCoordinate: { x: -6, y: 6 },
              expectedSelfReflection: false,
              point: { x: 26, y: 26 },
              state: "exception/four-quadrant-endpoint=(-6,6)",
            });
            await clickSvgPoint({
              expectedCoordinate: { x: 6, y: -6 },
              expectedSelfReflection: false,
              point: { x: 314, y: 314 },
              state: "exception/four-quadrant-endpoint=(6,-6)",
            });
            await clickSvgPoint({
              expectedCoordinate: { x: 0, y: 6 },
              expectedSelfReflection: true,
              point: { x: 170, y: 26 },
              state: "exception/four-quadrant-y-axis-self-reflection=(0,6)",
            });

            await root.getByRole("button", { name: "x-axis", exact: true }).click();
            await expect(svg).toHaveAttribute("data-diagram-self-reflection", "false");
            await expect(reflectedPoint).toHaveCount(1);
            await auditState("exception/four-quadrant-axis-switch=(0,6)-across-x");

            await clickSvgPoint({
              expectedCoordinate: { x: 6, y: 0 },
              expectedSelfReflection: true,
              point: { x: 314, y: 170 },
              state: "exception/four-quadrant-x-axis-self-reflection=(6,0)",
            });
            const decreaseX = root.getByRole("button", { name: "Decrease x", exact: true });
            for (let step = 0; step < 6; step += 1) await decreaseX.click();
            await expect(svg).toHaveAttribute("aria-label", /Point at \(0, 0\) at the origin/iu);
            await expect(svg).toHaveAttribute("data-diagram-self-reflection", "true");
            await expect(reflectedPoint).toHaveCount(0);
            await auditState("exception/four-quadrant-origin-self-reflection=(0,0)");
          } else {
            await resetCcssLessonState({ page, route: exceptional.route, lessonId: exceptional.lessonId, ...matrix });
            const svg = root.locator("svg[role='img']").first();
            const draggablePoints = svg.locator("circle.cursor-grab");
            const targets = [{ x: 48, y: 48 }, { x: 308, y: 308 }];
            for (const [pointIndex, target] of targets.entries()) {
              const draggable = draggablePoints.nth(pointIndex);
              await draggable.scrollIntoViewIfNeeded();
              const start = await draggable.boundingBox();
              const screenPoint = await svg.evaluate((element: SVGSVGElement, next) => {
                const svgPoint = element.createSVGPoint();
                svgPoint.x = next.x;
                svgPoint.y = next.y;
                const transformed = svgPoint.matrixTransform(element.getScreenCTM()!);
                return { x: transformed.x, y: transformed.y };
              }, target);
              const beforeLabel = await svg.getAttribute("aria-label");
              expect(start, `slope point ${pointIndex + 1} must expose a draggable screen box`).not.toBeNull();
              await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
              await page.mouse.down();
              await page.waitForTimeout(50);
              await page.mouse.move(screenPoint.x, screenPoint.y, { steps: 12 });
              await page.mouse.up();
              await expect.poll(() => svg.getAttribute("aria-label")).not.toBe(beforeLabel);
              await auditState(`exception/drag-grid-inset=${pointIndex + 1}`);
            }
          }

          const runtimeIssues = runtime.issuesSince(runtimeCursor);
          if (runtimeIssues.length) {
            findings.push({ ...findingBase, viewport: "runtime", state: "exceptional-controls", issues: runtimeIssues });
          }
          visited.add(`${exceptional.lessonId}|${matrix.language}|${matrix.theme}`);
        }
      } finally {
        await context.close();
      }
    }

    await attachFindings(testInfo, "lesson-exceptional-state-boundary-results", findings, {
      fullAudit,
      shard: `${shardIndex}/${shardCount}`,
      selectedLessonIds: exceptions.map((entry) => entry.lessonId),
      matrixStateCount: matrixStates.length,
      expectedVisits: exceptions.length * matrixStates.length,
      actualVisits: visited.size,
      viewports: auditViewports,
      sourceInventory: exceptions.map((entry) => ({
        lessonId: entry.lessonId,
        randomSourceCount: entry.sourceRow.randomSourceCount,
        numberControlJsxCount: entry.sourceRow.numberControlJsxCount,
        selectControlJsxCount: entry.sourceRow.selectControlJsxCount,
        exceptionalStatePolicies: entry.sourceRow.exceptionalStatePolicies,
        contextMenuControlJsxCount: entry.sourceRow.contextMenuControlJsxCount,
        pointerControlJsxCount: entry.sourceRow.pointerControlJsxCount
      })),
      coverageRecords
    });
    expect(visited.size).toBe(exceptions.length * matrixStates.length);
    if (findings.length) throw new Error(formatFailureSummary(findings));
  });
});
