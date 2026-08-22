import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  expect,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
  type TestInfo
} from "@playwright/test";
import sharp from "sharp";
import {
  getSignatureLabAssignment,
  type SignatureLabAssignment,
  type SignatureLabId
} from "../../data/signatureLabAssignments";
import {
  visualizationLabCatalog,
  type FeaturedLabDefinition
} from "../../data/visualizationLabs";
import { gradeIds } from "../../data/grades";
import type { GradeId, Language, ThemeMode } from "../../types";
import type {
  CaliforniaPremiumWebGlProductionStateKey,
  CaliforniaPremiumWebGlRegisteredContrastEvidence
} from "./california-premium-webgl-graphics-contract";
import type {
  CaliforniaCanvasGraphicsOneShotGateResult
} from "./california-signature-exhaustive-qa";

const CALIFORNIA_ROUTE_COUNT = 76;
export const CALIFORNIA_FORMAL_MAX_VISITS_PER_PACKAGE = 10;
export const CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS = 60_000;
export const CALIFORNIA_FORMAL_UX_BUDGET_MS = 30_000;
export const CALIFORNIA_FORMAL_TEST_TIMEOUT_MS = 12 * 60_000;
export const CALIFORNIA_AUTH_ATTEMPT_BUDGET_MS = 3 * 60_000;
export const CALIFORNIA_AUTH_ATTEMPT_COUNT = 2;
export const CALIFORNIA_TERMINAL_DIAGNOSTIC_TIMEOUT_MS = 5_000;
export const CALIFORNIA_PER_AXIS_FINALIZATION_MARGIN_MS = 30_000;
export const CALIFORNIA_PACKAGE_ATTACHMENT_MARGIN_MS = 30_000;
const DEFAULT_MAX_VISITS_PER_PACKAGE = CALIFORNIA_FORMAL_MAX_VISITS_PER_PACKAGE;
const DEFAULT_EXPECT_TIMEOUT_MS = CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS;
const DEFAULT_UX_BUDGET_MS = CALIFORNIA_FORMAL_UX_BUDGET_MS;
export const CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO = 0.02;
export const CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO = 0.08;
export const CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO = 0.01;
const CALIFORNIA_SIGNATURE_RESET_CHANNEL_NOISE_THRESHOLD = 8;
export const CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX = 44;

const CALIFORNIA_ARIA_WIDGET_ROLES = [
  "button",
  "checkbox",
  "combobox",
  "gridcell",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "scrollbar",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
  "treeitem"
] as const;

export const CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  'input:not([type="hidden" i])',
  "select",
  "textarea",
  "summary",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false" i])',
  ...CALIFORNIA_ARIA_WIDGET_ROLES.map((role) => `[role~="${role}" i]`)
].join(",");

export const CALIFORNIA_LEARNER_INTERACTIVE_SELECTOR = [
  CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR,
  "[tabindex]"
].join(",");

export type CaliforniaTouchTargetMeasurement = {
  height: number;
  width: number;
};

export function isCaliforniaTouchTargetBelowMinimum(
  measurement: CaliforniaTouchTargetMeasurement
) {
  if (!Number.isFinite(measurement.width) || !Number.isFinite(measurement.height)) return true;
  return (
    measurement.width < CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX ||
    measurement.height < CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX
  );
}

export type CaliforniaQaViewport = "desktop" | "mobile";

export const CALIFORNIA_FORMAL_PROJECT_NAMES = [
  "desktop-chrome",
  "mobile-chrome"
] as const;

export type CaliforniaFormalProjectName = typeof CALIFORNIA_FORMAL_PROJECT_NAMES[number];

export type CaliforniaFormalProjectEvidence = {
  deviceScaleFactor: number;
  hasTouch: boolean;
  isMobile: boolean;
  screen: {
    height: number;
    width: number;
  };
  viewport: {
    height: number;
    width: number;
  };
  viewportClass: CaliforniaQaViewport;
};

function formalAxisIds(viewport: CaliforniaQaViewport) {
  return ["en", "zhHK", "zhCN"].flatMap((language) =>
    ["light", "dark"].map((theme) => `${viewport}-${language}-${theme}`)
  );
}

export const CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT = {
  "desktop-chrome": formalAxisIds("desktop"),
  "mobile-chrome": formalAxisIds("mobile")
} as const satisfies Record<CaliforniaFormalProjectName, readonly string[]>;

export const CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME = {
  "desktop-chrome": {
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    screen: { height: 1080, width: 1920 },
    viewport: { height: 1100, width: 1440 },
    viewportClass: "desktop"
  },
  "mobile-chrome": {
    deviceScaleFactor: 2.75,
    hasTouch: true,
    isMobile: true,
    screen: { height: 851, width: 393 },
    viewport: { height: 727, width: 393 },
    viewportClass: "mobile"
  }
} as const satisfies Record<CaliforniaFormalProjectName, CaliforniaFormalProjectEvidence>;

export type CaliforniaQaAxis = {
  id: string;
  language: Language;
  locale: string;
  theme: ThemeMode;
  viewport: CaliforniaQaViewport;
};

export type CaliforniaQaLab = FeaturedLabDefinition & {
  assignment: SignatureLabAssignment;
};

export type CaliforniaBenchVisit = {
  benchId: SignatureLabId;
  isPrimary: boolean;
  lab: CaliforniaQaLab;
};

export type CaliforniaDirectoryPackage = {
  grade: GradeId;
  id: string;
  kind: "directory";
  labs: CaliforniaQaLab[];
  visitCount: number;
};

export type CaliforniaPremiumPackage = {
  grade: GradeId;
  id: string;
  kind: "premium-direct";
  labs: CaliforniaQaLab[];
  visitCount: number;
};

export type CaliforniaQaWorkItem = CaliforniaDirectoryPackage | CaliforniaPremiumPackage;

export type CaliforniaQaConfig = {
  axes: CaliforniaQaAxis[];
  expectTimeoutMs: number;
  grades: Set<GradeId>;
  includePremiumDirect: boolean;
  labIds: Set<string>;
  maxVisitsPerPackage: number;
  shard: { index: number; total: number } | null;
  timeoutMs: number;
  uxBudgetMs: number;
};

export function californiaQaPackageTimeoutMs(options: {
  axisCount: number;
  config: Pick<CaliforniaQaConfig, "expectTimeoutMs" | "timeoutMs">;
  visitCount: number;
}) {
  assert.ok(Number.isSafeInteger(options.axisCount) && options.axisCount > 0,
    "California package timeout requires a positive axis count.");
  assert.ok(Number.isSafeInteger(options.visitCount) && options.visitCount > 0,
    "California package timeout requires a positive visit count.");
  const perAxisBudgetMs =
    options.visitCount * options.config.expectTimeoutMs +
    CALIFORNIA_AUTH_ATTEMPT_COUNT * CALIFORNIA_AUTH_ATTEMPT_BUDGET_MS +
    CALIFORNIA_TERMINAL_DIAGNOSTIC_TIMEOUT_MS +
    CALIFORNIA_PER_AXIS_FINALIZATION_MARGIN_MS;
  const computedBudgetMs =
    perAxisBudgetMs * options.axisCount + CALIFORNIA_PACKAGE_ATTACHMENT_MARGIN_MS;
  return Math.max(options.config.timeoutMs * options.axisCount, computedBudgetMs);
}

export function assertCaliforniaFormalQaConfig(config: CaliforniaQaConfig) {
  assert.deepEqual(
    config.axes.map((axis) => axis.id).sort(),
    Object.values(CALIFORNIA_FORMAL_AXIS_IDS_BY_PROJECT).flat().sort(),
    "Durable California coverage requires the exact project-bound 12-axis matrix."
  );
  assert.equal(
    config.maxVisitsPerPackage,
    CALIFORNIA_FORMAL_MAX_VISITS_PER_PACKAGE,
    `Durable California coverage requires maxVisitsPerPackage=${CALIFORNIA_FORMAL_MAX_VISITS_PER_PACKAGE}.`
  );
  assert.equal(
    config.expectTimeoutMs,
    CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS,
    `Durable California coverage requires expectTimeoutMs=${CALIFORNIA_FORMAL_EXPECT_TIMEOUT_MS}.`
  );
  assert.equal(
    config.uxBudgetMs,
    CALIFORNIA_FORMAL_UX_BUDGET_MS,
    `Durable California coverage requires uxBudgetMs=${CALIFORNIA_FORMAL_UX_BUDGET_MS}.`
  );
  assert.equal(
    config.timeoutMs,
    CALIFORNIA_FORMAL_TEST_TIMEOUT_MS,
    `Durable California coverage requires timeoutMs=${CALIFORNIA_FORMAL_TEST_TIMEOUT_MS}.`
  );
}

export type CaliforniaCoverageProvenance = {
  baselineSha: string;
  buildId: string;
  catalogHash: string;
  harnessHash: string;
  matrixConfigHash: string;
  matrixRunId: string;
  sourceHash: string;
  sourceSnapshotSha256: string;
};

export type CaliforniaQaContext = {
  action: string;
  axis: CaliforniaQaAxis;
  benchId: string;
  labId: string;
  routeKind: CaliforniaQaWorkItem["kind"];
};

export type RegisteredCaliforniaStudent = {
  name: string;
  password: string;
  username: string;
};

export type CaliforniaQaTimeout = number | (() => number);

export type CaliforniaTouchAuditEvidence = {
  algorithmSha256: string;
  auditDurationMs: number;
  auditedControlCount: number;
  coreHitTestCount: number;
  devicePixelFallbackControlCount: number;
  partitionLimitFallbackControlCount: number;
  pseudoFallbackControlCount: number;
  receiptSha256: string;
  unsupportedGeometryFallbackControlCount: number;
};

export type CaliforniaUiGateEvidence = {
  completed: boolean;
  findingCount: number;
  state: string;
  touchAudit?: CaliforniaTouchAuditEvidence | null;
};

export type CaliforniaTouchAuditSummary = {
  auditCount: number;
  durationMaxMs: number | null;
  durationP50Ms: number | null;
  durationP95Ms: number | null;
  fallbackAuditCount: number;
  fallbackControlCount: number;
  missingEvidenceCount: number;
  receiptSetSha256: string;
};

export type CaliforniaCanvasGateEvidence = {
  canvasCount: number;
  clippedTextLayerCount: number;
  completed: boolean;
  findingCount: number;
  state: string;
  textLayerCount: number;
};

export type CaliforniaContrastGateEvidence = {
  auditedLabelCount: number;
  canvasSurfaceCount: number;
  candidateLabelCount: number;
  completed: boolean;
  evidenceSha256: string;
  executableCanvasSurfaceCount: number;
  executableWebGlCanvasSurfaceCount: number;
  findingCount: number;
  geometryVisibilitySha256: string;
  hardenedTextAlgorithmSha256: string;
  hardenedTextAuditedCount: number;
  hardenedTextCandidateCount: number;
  hardenedTextCompleted: boolean;
  hardenedTextEvidenceSha256: string;
  hardenedTextFindingCount: number;
  hardenedTextMinRatio: number | null;
  hardenedTextWorstLabel: string | null;
  hardenedTextWorstRequiredRatio: number | null;
  minRatio: number | null;
  stableRafSnapshots: number;
  state: string;
  worstKind: string | null;
  worstLabel: string | null;
  webGlCanvasSurfaceCount: number;
};

export type CaliforniaSignatureControlEvidence = {
  afterValue?: string;
  beforeValue?: string;
  changedModelFingerprint: string;
  defaultModelFingerprint: string;
  defaultSemanticFingerprint: string;
  kind: "button" | "motion-button" | "motion-toggle" | "number" | "range" | "select" | "toggle";
  label: string;
  modelChanged: true;
  restoration: "reset" | "self";
  restored: boolean;
};

export type CaliforniaSignatureResetEvidence = {
  activeBenchRestored: true;
  canvasReady: true;
  canvasReplaced: true;
  defaultControlFingerprint: string;
  defaultModelFingerprint: string;
  defaultSurfaceFingerprint: string;
  defaultSurfaceStable: boolean;
  restoredControlFingerprint: string;
  restoredDefault: true;
  restoredModelFingerprint: string;
  restoredSurfaceFingerprint: string;
  restoredSurfaceStable: boolean;
  surfaceChangedPixelRatio: number | null;
  surfaceComparison: "dynamic-semantic" | "stable-pixel-tolerance";
  surfaceEdgeMismatchRatio: number | null;
  surfaceMeanAbsoluteDiffRatio: number | null;
};

export type CaliforniaSignatureBenchDefaultState = {
  controlFingerprint: string;
  modelFingerprint: string;
  semanticFingerprint: string;
  surfaceFingerprint: string;
  surfacePng: Buffer | null;
  surfaceStable: boolean;
};

export type CaliforniaSignatureResetVisualComparison = {
  changedPixelRatio: number;
  edgeMismatchRatio: number;
  meanAbsoluteDiffRatio: number;
  withinTolerance: boolean;
};

export type CaliforniaPremiumControlEvidence = {
  documentLanguage: string;
  endValue: 1000;
  finalState: "paused";
  homeValue: 0;
  initialState: "paused";
  labelsVerified: true;
  learnerPresentation: true;
  playbackAdvanced: true;
  playingStateObserved: true;
  playingValue: number;
  playStartValue: number;
  resetRewound: true;
  resetState: "paused";
  resetValue: number;
  visibleAuthoringControlCount: 0;
};

export type CaliforniaPremiumFrameEvidence = {
  attachmentName: string;
  changedPixelRatioFromDefault: number;
  contextKind: "webgl" | "webgl2";
  entropyBits: number;
  foregroundRatio: number;
  height: number;
  meanAbsoluteDiffRatioFromDefault: number;
  opaquePixelRatio: number;
  playbackStateAfterCapture: "paused" | "playing";
  playbackStateBeforeCapture: "paused" | "playing";
  pixelCount: number;
  recorderSignature: string;
  sha256: string;
  state: "default" | "playing" | "reset";
  width: number;
};

export type CaliforniaPremiumWebGlContrastEvidence = Omit<
  CaliforniaPremiumWebGlRegisteredContrastEvidence,
  "playbackState" | "stateKey"
> & {
  playbackState: "paused" | "playing";
  state: CaliforniaPremiumWebGlProductionStateKey;
  stateKey: CaliforniaPremiumWebGlProductionStateKey;
};

export type CaliforniaQaStructuredRecordEvidence = {
  canvasGraphicsGates: CaliforniaCanvasGraphicsOneShotGateResult[];
  canvasGates: CaliforniaCanvasGateEvidence[];
  contrastGates: CaliforniaContrastGateEvidence[];
  premium?: {
    control: CaliforniaPremiumControlEvidence;
    frames: CaliforniaPremiumFrameEvidence[];
    surfaceScreenshots: Array<{
      attachmentName: string;
      state: "default" | "playing" | "reset";
    }>;
    webGlContrast: CaliforniaPremiumWebGlContrastEvidence[];
  };
  reset?: CaliforniaSignatureResetEvidence;
  signatureControl?: CaliforniaSignatureControlEvidence;
  uiGates: CaliforniaUiGateEvidence[];
};

type CaliforniaDeadlinePage = Pick<Page, "close">;

/**
 * Hard per-visit deadline for browser work. A timed-out browser operation is
 * never abandoned: the page is closed first so Playwright can cancel its
 * protocol work, then the original promise is awaited before the deadline
 * error is surfaced to the package.
 */
export class CaliforniaVisitDeadline {
  private closePromise: Promise<string | null> | null = null;
  private readonly deadlineAt: number;

  constructor(
    private readonly page: CaliforniaDeadlinePage,
    readonly startedAt: number,
    readonly recoveryBudgetMs: number
  ) {
    this.deadlineAt = startedAt + recoveryBudgetMs;
  }

  get expired() {
    return this.remainingMs <= 0;
  }

  get remainingMs() {
    return Math.max(0, this.deadlineAt - Date.now());
  }

  remainingTimeout(action: string, capMs = Number.POSITIVE_INFINITY) {
    const remainingMs = this.remainingMs;
    if (remainingMs <= 0) {
      throw new Error(
        `visit-recovery-deadline-exceeded: ${action} started after the ${this.recoveryBudgetMs}ms absolute deadline`
      );
    }
    return Math.max(1, Math.min(remainingMs, capMs));
  }

  async run<T>(action: string, operation: () => Promise<T>): Promise<T> {
    const remainingMsAtStart = this.remainingTimeout(action);
    const operationPromise = Promise.resolve().then(operation);

    return new Promise<T>((resolve, reject) => {
      let completed = false;
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout>;

      const rejectAfterCancellation = async (operationError?: unknown) => {
        if (completed || timedOut) return;
        timedOut = true;
        clearTimeout(timer);
        this.closePromise ??= this.page.close({ runBeforeUnload: false })
          .then(() => null)
          .catch((error) => errorDetail(error));
        const closeError = await this.closePromise;
        const settled = await Promise.allSettled([operationPromise]);
        completed = true;
        const operationOutcome = operationError === undefined
          ? settled[0].status === "rejected" ? errorDetail(settled[0].reason) : "settled after page close"
          : errorDetail(operationError);
        reject(new Error(
          `visit-recovery-deadline-exceeded: ${action} exceeded the remaining ${remainingMsAtStart}ms ` +
          `of the ${this.recoveryBudgetMs}ms absolute deadline; operation=${operationOutcome}` +
          `${closeError ? `; page-close=${closeError}` : ""}`
        ));
      };

      timer = setTimeout(() => void rejectAfterCancellation(), remainingMsAtStart);
      operationPromise.then(
        (value) => {
          if (timedOut) return;
          if (this.expired) {
            void rejectAfterCancellation();
            return;
          }
          completed = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          if (timedOut) return;
          if (this.expired) {
            void rejectAfterCancellation(error);
            return;
          }
          completed = true;
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }
}

export type BrowserDiagnostic = {
  detail: string;
  kind: "console-error" | "http-error" | "page-error" | "request-failed";
};

export type CaliforniaDiagnosticDrainResult = {
  clean: boolean;
  reportedCount: number;
};

function timeoutRemaining(timeout: CaliforniaQaTimeout) {
  const value = typeof timeout === "function" ? timeout() : timeout;
  assert.ok(Number.isFinite(value), `California Visualization QA timeout must be finite; received ${String(value)}.`);
  return Math.max(0, Math.min(DEFAULT_EXPECT_TIMEOUT_MS, Math.floor(value)));
}

function stepTimeout(timeout: CaliforniaQaTimeout) {
  const value = timeoutRemaining(timeout);
  assert.ok(value > 0, "California Visualization QA deadline was exhausted before the next browser step.");
  return value;
}

const californiaLabs = visualizationLabCatalog
  .filter((lab) => lab.curriculumTrack === "US" && lab.publisher === "US_CA_MATH")
  .map((lab): CaliforniaQaLab => {
    const assignment = getSignatureLabAssignment(lab.topicId);
    assert.ok(assignment, `California Visualization Lab ${lab.labId} is missing a signature assignment for ${lab.topicId}.`);
    return { ...lab, assignment };
  });

const californiaBenchVisits = californiaLabs.flatMap((lab): CaliforniaBenchVisit[] => [
  { benchId: lab.assignment.primary, isPrimary: true, lab },
  ...(lab.assignment.related ?? []).map((benchId) => ({ benchId, isPrimary: false, lab }))
]);

const californiaPremiumLabs = californiaLabs.filter((lab) =>
  lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true
);
const californiaUniqueBenchIds = new Set(californiaBenchVisits.map((visit) => visit.benchId));

// These are intentionally module-load assertions. Catalog drift must stop test
// collection instead of silently shrinking the browser sweep.
assert.equal(californiaLabs.length, CALIFORNIA_ROUTE_COUNT, "California Visualization Lab route count drifted.");
assert.equal(new Set(californiaLabs.map((lab) => lab.labId)).size, CALIFORNIA_ROUTE_COUNT, "California Visualization Lab IDs must be unique.");

for (const lab of californiaLabs) {
  assert.equal(lab.moduleId, "signature-lab", `${lab.labId} must remain a catalog signature-lab.`);
  const benchIds = [lab.assignment.primary, ...(lab.assignment.related ?? [])];
  assert.equal(new Set(benchIds).size, benchIds.length, `${lab.labId} repeats a signature bench in its assignment.`);
}

export const californiaVisualizationQaInventory = {
  benchVisits: californiaBenchVisits,
  labs: californiaLabs,
  premiumLabs: californiaPremiumLabs,
  routeCount: californiaLabs.length,
  uniqueBenchCount: californiaUniqueBenchIds.size,
  visitCount: californiaBenchVisits.length
} as const;

function commaSeparatedEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value.split(",").map((entry) => entry.trim()).filter(Boolean);
    }
  }
  return [];
}

function positiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  assert.ok(Number.isSafeInteger(value) && value > 0, `${name} must be a positive integer; received ${JSON.stringify(raw)}.`);
  return value;
}

function normalizeGrade(value: string): GradeId {
  const upper = value.trim().toUpperCase();
  const aliases: Record<string, GradeId> = {
    G1: "P1",
    G2: "P2",
    G3: "P3",
    G4: "P4",
    G5: "P5",
    G6: "P6",
    G7: "S1",
    G8: "S2",
    G9: "S3",
    G10: "S4",
    G11: "S5",
    G12: "S6"
  };
  const normalized = aliases[upper] ?? upper;
  assert.ok(gradeIds.includes(normalized as GradeId), `Unknown CA_VIZ grade ${JSON.stringify(value)}.`);
  return normalized as GradeId;
}

function normalizeLanguage(value: string): Language {
  const normalized = value.trim().toLowerCase();
  if (normalized === "en" || normalized === "english") return "en";
  if (["zh", "zh-hk", "zh-hant", "zh-hant-hk", "traditional"].includes(normalized)) return "zh";
  if (["zh-hans", "zh-cn", "zh-hans-cn", "simplified"].includes(normalized)) return "zh-Hans";
  throw new Error(`Unknown CA_VIZ locale ${JSON.stringify(value)}.`);
}

function normalizeTheme(value: string): ThemeMode {
  const normalized = value.trim().toLowerCase();
  assert.ok(normalized === "light" || normalized === "dark", `Unknown CA_VIZ theme ${JSON.stringify(value)}.`);
  return normalized;
}

function normalizeViewport(value: string): CaliforniaQaViewport {
  const normalized = value.trim().toLowerCase();
  assert.ok(normalized === "desktop" || normalized === "mobile", `Unknown CA_VIZ viewport ${JSON.stringify(value)}.`);
  return normalized;
}

function localeForLanguage(language: Language) {
  if (language === "zh") return "zh-Hant-HK";
  if (language === "zh-Hans") return "zh-Hans-CN";
  return "en-HK";
}

function buildAxis(viewport: CaliforniaQaViewport, language: Language, theme: ThemeMode): CaliforniaQaAxis {
  const languageId = language === "zh-Hans" ? "zhCN" : language === "zh" ? "zhHK" : "en";
  return {
    id: `${viewport}-${languageId}-${theme}`,
    language,
    locale: localeForLanguage(language),
    theme,
    viewport
  };
}

function parseAxes() {
  const explicitAxes = commaSeparatedEnv("CA_VIZ_AXES");
  if (explicitAxes.length > 0) {
    return explicitAxes.map((entry) => {
      const parts = entry.split(":").map((part) => part.trim());
      assert.equal(parts.length, 3, `CA_VIZ_AXES entry must be viewport:locale:theme; received ${JSON.stringify(entry)}.`);
      return buildAxis(normalizeViewport(parts[0]), normalizeLanguage(parts[1]), normalizeTheme(parts[2]));
    });
  }

  const viewportValues = commaSeparatedEnv("CA_VIZ_VIEWPORTS", "CA_VIZ_VIEWPORT");
  const languageValues = commaSeparatedEnv("CA_VIZ_LOCALES", "CA_VIZ_LOCALE");
  const themeValues = commaSeparatedEnv("CA_VIZ_THEMES", "CA_VIZ_THEME");
  const viewports = (viewportValues.length > 0 ? viewportValues : ["desktop"]).flatMap((value) =>
    value.toLowerCase() === "all" ? ["desktop", "mobile"] as const : [normalizeViewport(value)]
  );
  const languages = (languageValues.length > 0 ? languageValues : ["en"]).flatMap((value) =>
    value.toLowerCase() === "all" ? ["en", "zh", "zh-Hans"] as const : [normalizeLanguage(value)]
  );
  const themes = (themeValues.length > 0 ? themeValues : ["light"]).flatMap((value) =>
    value.toLowerCase() === "all" ? ["light", "dark"] as const : [normalizeTheme(value)]
  );

  const axes = viewports.flatMap((viewport) =>
    languages.flatMap((language) => themes.map((theme) => buildAxis(viewport, language, theme)))
  );
  return Array.from(new Map(axes.map((axis) => [axis.id, axis])).values());
}

function parseShard() {
  const shorthand = process.env.CA_VIZ_SHARD?.trim();
  if (shorthand) {
    const match = /^(\d+)\s*\/\s*(\d+)$/.exec(shorthand);
    assert.ok(match, `CA_VIZ_SHARD must use one-based index/total syntax, for example 1/4; received ${JSON.stringify(shorthand)}.`);
    const index = Number(match[1]);
    const total = Number(match[2]);
    assert.ok(index >= 1 && total >= 1 && index <= total, `Invalid CA_VIZ_SHARD ${shorthand}.`);
    return { index, total };
  }

  const indexRaw = process.env.CA_VIZ_SHARD_INDEX?.trim();
  const totalRaw = process.env.CA_VIZ_SHARD_TOTAL?.trim();
  if (!indexRaw && !totalRaw) return null;
  assert.ok(indexRaw && totalRaw, "CA_VIZ_SHARD_INDEX and CA_VIZ_SHARD_TOTAL must be set together.");
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  assert.ok(Number.isSafeInteger(index) && Number.isSafeInteger(total) && index >= 1 && total >= 1 && index <= total,
    `Invalid CA_VIZ_SHARD_INDEX/CA_VIZ_SHARD_TOTAL ${indexRaw}/${totalRaw}.`);
  return { index, total };
}

export function readCaliforniaQaConfig(): CaliforniaQaConfig {
  const requestedGrades = commaSeparatedEnv("CA_VIZ_GRADES", "CA_VIZ_GRADE");
  const grades = new Set<GradeId>(
    requestedGrades.length === 0 || requestedGrades.some((grade) => grade.toLowerCase() === "all")
      ? gradeIds
      : requestedGrades.map(normalizeGrade)
  );
  const requestedLabIds = commaSeparatedEnv("CA_VIZ_LABS", "CA_VIZ_LAB");
  const labIds = new Set(requestedLabIds.filter((labId) => labId.toLowerCase() !== "all"));
  for (const labId of labIds) {
    assert.ok(californiaLabs.some((lab) => lab.labId === labId), `CA_VIZ_LABS includes unknown California lab ${labId}.`);
  }

  const expectTimeoutMs = positiveIntegerEnv("CA_VIZ_EXPECT_TIMEOUT_MS", DEFAULT_EXPECT_TIMEOUT_MS);
  const uxBudgetMs = positiveIntegerEnv("CA_VIZ_UX_BUDGET_MS", DEFAULT_UX_BUDGET_MS);
  assert.ok(
    expectTimeoutMs <= DEFAULT_EXPECT_TIMEOUT_MS,
    `CA_VIZ_EXPECT_TIMEOUT_MS must not exceed the hard ${DEFAULT_EXPECT_TIMEOUT_MS}ms browser-step ceiling.`
  );
  assert.ok(
    uxBudgetMs <= DEFAULT_UX_BUDGET_MS,
    `CA_VIZ_UX_BUDGET_MS must not exceed the hard ${DEFAULT_UX_BUDGET_MS}ms learner UX ceiling.`
  );

  return {
    axes: parseAxes(),
    expectTimeoutMs,
    grades,
    includePremiumDirect: process.env.CA_VIZ_INCLUDE_PREMIUM?.trim() !== "0",
    labIds,
    maxVisitsPerPackage: positiveIntegerEnv("CA_VIZ_MAX_VISITS_PER_PACKAGE", DEFAULT_MAX_VISITS_PER_PACKAGE),
    shard: parseShard(),
    timeoutMs: positiveIntegerEnv("CA_VIZ_TEST_TIMEOUT_MS", CALIFORNIA_FORMAL_TEST_TIMEOUT_MS),
    uxBudgetMs
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256Text(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceFilesBelow(targetPath: string): string[] {
  const stats = statSync(targetPath);
  if (stats.isFile()) return [targetPath];
  return readdirSync(targetPath)
    .flatMap((entry) => sourceFilesBelow(path.join(targetPath, entry)))
    .filter((filePath) => /\.(?:js|jsx|mjs|ts|tsx)$/.test(filePath))
    .filter((filePath) => !/\.(?:spec|test)\.[^.]+$/.test(filePath) && !/\/audit-[^/]+\.mjs$/.test(filePath));
}

function hashFiles(filePaths: string[]) {
  const hash = createHash("sha256");
  for (const filePath of [...new Set(filePaths)].sort((left, right) => left.localeCompare(right))) {
    hash.update(path.relative(process.cwd(), filePath));
    hash.update("\0");
    hash.update(readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function buildCaliforniaCoverageProvenance(
  config: CaliforniaQaConfig,
  options: { requireRunIdentity?: boolean } = {}
): CaliforniaCoverageProvenance {
  const requiredRunValue = (name: "CA_VIZ_BUILD_ID" | "CA_VIZ_MATRIX_RUN_ID") => {
    const value = process.env[name]?.trim();
    if (options.requireRunIdentity && !value) {
      throw new Error(`${name} is required when durable California Visualization ledger evidence is enabled.`);
    }
    return value;
  };
  const explicitSourceSnapshotSha256 = process.env.CA_VIZ_SOURCE_SNAPSHOT_SHA256?.trim();
  if (options.requireRunIdentity && !explicitSourceSnapshotSha256) {
    throw new Error(
      "CA_VIZ_SOURCE_SNAPSHOT_SHA256 is required when durable California Visualization ledger evidence is enabled."
    );
  }
  if (explicitSourceSnapshotSha256 && !/^[a-f0-9]{64}$/.test(explicitSourceSnapshotSha256)) {
    throw new Error("CA_VIZ_SOURCE_SNAPSHOT_SHA256 must be one exact lowercase SHA-256 digest.");
  }
  const baselineSha = process.env.CA_VIZ_BASELINE_SHA?.trim() || process.env.GITHUB_SHA?.trim() ||
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
  const productSourceRoots = [
    "app/visualization-lab",
    "app/student/tools/visualizations",
    "components/visualizations",
    "data/signatureLabAssignments.ts",
    "data/visualizationLabs.ts"
  ].map((relativePath) => path.join(process.cwd(), relativePath));
  const harnessFiles = [
    "tests/e2e/california-canvas-graphics-instrumentation.ts",
    "tests/e2e/california-canvas-graphics-runtime.ts",
    "tests/e2e/california-canvas-graphics-source-contract.ts",
    "tests/e2e/california-canvas-text-audit.ts",
    "tests/e2e/california-premium-webgl-graphics-contract.ts",
    "tests/e2e/california-signature-composed-staging.ts",
    "tests/e2e/california-signature-control-manifest.ts",
    "tests/e2e/california-signature-exhaustive-qa.ts",
    "tests/e2e/california-signature-qa-instrumentation.ts",
    "tests/e2e/california-signature-source-expected-provider.ts",
    "tests/e2e/california-visualization-artifact-lifecycle.ts",
    "tests/e2e/california-visualization-contrast-audit.ts",
    "tests/e2e/california-visualization-labs.spec.ts",
    "tests/e2e/california-visualization-qa-helpers.ts",
    "tests/e2e/california-visualization-coverage-ledger.test.ts",
    "tests/e2e/hk-visualization-contrast-microfixtures.spec.ts",
    "tests/e2e/hk-visualization-text-contrast-scanner.ts"
  ].map((relativePath) => path.join(process.cwd(), relativePath));
  const catalogHash = sha256Text(stableJson({
    labs: californiaVisualizationQaInventory.labs.map((lab) => ({
      assignment: lab.assignment,
      grade: lab.grade,
      labId: lab.labId,
      premiumLaunch: lab.threeD?.premiumLaunch,
      threeDEnabled: lab.threeD?.enabled,
      topicId: lab.topicId
    })),
    premiumLabIds: californiaVisualizationQaInventory.premiumLabs.map((lab) => lab.labId)
  }));
  const matrixConfigHash = sha256Text(stableJson({
    axes: config.axes,
    expectTimeoutMs: config.expectTimeoutMs,
    grades: Array.from(config.grades).sort(),
    includePremiumDirect: config.includePremiumDirect,
    labIds: Array.from(config.labIds).sort(),
    maxVisitsPerPackage: config.maxVisitsPerPackage,
    shardTotal: config.shard?.total ?? null,
    timeoutMs: config.timeoutMs,
    uxBudgetMs: config.uxBudgetMs
  }));
  const harnessHash = hashFiles(harnessFiles);
  const sourceHash = hashFiles(productSourceRoots.flatMap(sourceFilesBelow));
  return {
    baselineSha,
    buildId: requiredRunValue("CA_VIZ_BUILD_ID") ?? `local-${baselineSha.slice(0, 12)}`,
    catalogHash,
    harnessHash,
    matrixConfigHash,
    matrixRunId: requiredRunValue("CA_VIZ_MATRIX_RUN_ID") ?? `local-${process.pid}-${Date.now()}`,
    sourceHash,
    sourceSnapshotSha256: explicitSourceSnapshotSha256 ?? sha256Text(stableJson({
      catalogHash,
      harnessHash,
      matrixConfigHash,
      sourceHash
    }))
  };
}

function selectedLabs(config: CaliforniaQaConfig) {
  return californiaLabs.filter((lab) =>
    config.grades.has(lab.grade) && (config.labIds.size === 0 || config.labIds.has(lab.labId))
  );
}

function buildDirectoryPackages(config: CaliforniaQaConfig) {
  const packages: CaliforniaDirectoryPackage[] = [];
  for (const grade of gradeIds) {
    const labs = selectedLabs(config).filter((lab) => lab.grade === grade);
    let chunk: CaliforniaQaLab[] = [];
    let chunkVisits = 0;
    let chunkIndex = 1;

    function flush() {
      if (chunk.length === 0) return;
      packages.push({
        grade,
        id: `directory-${grade.toLowerCase()}-${chunkIndex}`,
        kind: "directory",
        labs: chunk,
        visitCount: chunkVisits
      });
      chunk = [];
      chunkVisits = 0;
      chunkIndex += 1;
    }

    for (const lab of labs) {
      const visits = 1 + (lab.assignment.related?.length ?? 0);
      if (chunk.length > 0 && chunkVisits + visits > config.maxVisitsPerPackage) flush();
      chunk.push(lab);
      chunkVisits += visits;
    }
    flush();
  }
  return packages;
}

function buildPremiumPackages(config: CaliforniaQaConfig) {
  if (!config.includePremiumDirect) return [];
  const packages: CaliforniaPremiumPackage[] = [];
  for (const grade of gradeIds) {
    const labs = selectedLabs(config).filter((lab) =>
      lab.grade === grade && lab.threeD?.enabled === true && lab.threeD.premiumLaunch === true
    );
    if (labs.length === 0) continue;
    packages.push({
      grade,
      id: `premium-direct-${grade.toLowerCase()}`,
      kind: "premium-direct",
      labs,
      visitCount: labs.length
    });
  }
  return packages;
}

export function buildCaliforniaQaWorkItems(config: CaliforniaQaConfig): CaliforniaQaWorkItem[] {
  const items: CaliforniaQaWorkItem[] = [...buildDirectoryPackages(config), ...buildPremiumPackages(config)];
  if (!config.shard) return items;
  return items.filter((_, itemIndex) => itemIndex % config.shard!.total === config.shard!.index - 1);
}

export function viewportForPage(page: Page): CaliforniaQaViewport {
  const viewportWidth = page.viewportSize()?.width ?? 1440;
  return viewportWidth <= 600 ? "mobile" : "desktop";
}

export async function captureCaliforniaFormalProjectEvidence(
  page: Page,
  testInfo: TestInfo
): Promise<CaliforniaFormalProjectEvidence> {
  assert.ok(
    CALIFORNIA_FORMAL_PROJECT_NAMES.includes(testInfo.project.name as CaliforniaFormalProjectName),
    `Durable California coverage forbids unknown Playwright project ${JSON.stringify(testInfo.project.name)}.`
  );
  const projectName = testInfo.project.name as CaliforniaFormalProjectName;
  const viewport = page.viewportSize();
  assert.ok(viewport, `${projectName}: formal coverage requires an explicit viewport`);
  const runtime = await page.evaluate(() => ({
    deviceScaleFactor: window.devicePixelRatio,
    hasTouch: navigator.maxTouchPoints > 0,
    screen: {
      height: window.screen.height,
      width: window.screen.width
    }
  }));
  const projectUse = testInfo.project.use as { isMobile?: boolean };
  const evidence: CaliforniaFormalProjectEvidence = {
    deviceScaleFactor: runtime.deviceScaleFactor,
    hasTouch: runtime.hasTouch,
    isMobile: projectUse.isMobile === true,
    screen: runtime.screen,
    viewport: { height: viewport.height, width: viewport.width },
    viewportClass: viewportForPage(page)
  };
  assert.deepEqual(
    evidence,
    CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName],
    `${projectName}: viewport/device evidence drifted from the frozen formal project contract`
  );
  return structuredClone(evidence);
}

export function projectMatchesAxis(page: Page, axis: CaliforniaQaAxis) {
  return viewportForPage(page) === axis.viewport;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42);
}

export async function registerCaliforniaVisualizationStudent(
  page: Page,
  testInfo: TestInfo,
  grade: GradeId,
  axis: CaliforniaQaAxis
): Promise<RegisteredCaliforniaStudent> {
  const suffix = safeSegment(`${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${testInfo.title}`);
  const student = {
    name: `CA Viz ${grade} ${suffix}`.slice(0, 78),
    password: "start12345",
    username: `ca-viz-${suffix}@example.test`
  };
  const preRegistrationLogout = await page.request.post("/api/auth/logout");
  expect([200, 401]).toContain(preRegistrationLogout.status());
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: student.name,
      username: student.username,
      email: student.username,
      password: student.password,
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: axis.language,
      theme: axis.theme
    }
  });
  const responseBody = await response.text();
  expect(response.status(), `California student registration failed: ${responseBody}`).toBe(200);

  const logoutResponse = await page.request.post("/api/auth/logout");
  expect(logoutResponse.status(), `California student logout after registration failed: ${await logoutResponse.text()}`).toBe(200);
  const loginResponse = await page.request.post("/api/auth/login", {
    data: {
      username: student.username,
      password: student.password,
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: axis.language,
      theme: axis.theme
    }
  });
  expect(loginResponse.status(), `California student login failed: ${await loginResponse.text()}`).toBe(200);

  await expect.poll(async () => (await page.request.get("/api/me?includeLessonEntry=false")).status(), {
    message: "California registration must create an authenticated session.",
    timeout: 20_000
  }).toBe(200);

  const meResponse = await page.request.get("/api/me?includeLessonEntry=false");
  const session = await meResponse.json() as {
    settings?: { language?: string; selectedGrade?: string; theme?: string };
    user?: {
      curriculumProfile?: { publisher?: string; region?: string };
      curriculumTrack?: string;
      name?: string;
      role?: string;
      username?: string;
    };
  };
  expect(session.user?.role).toBe("student");
  expect(session.user?.name).toBe(student.name);
  expect(session.user?.username).toBe(student.username);
  expect(session.user?.curriculumTrack).toBe("US_CA_MATH");
  expect(session.user?.curriculumProfile).toMatchObject({ region: "US", publisher: "US_CA_MATH" });
  expect(session.settings).toMatchObject({ language: axis.language, selectedGrade: grade, theme: axis.theme });
  return student;
}

export async function expectCaliforniaAuthHydrated(
  page: Page,
  student: RegisteredCaliforniaStudent,
  axis: CaliforniaQaAxis,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS
) {
  await expect(page.locator("html")).toHaveAttribute("lang", axis.locale, { timeout: stepTimeout(timeout) });
  if (axis.theme === "dark") {
    await expect(page.locator("html")).toHaveClass(/(?:^|\s)dark(?:\s|$)/, { timeout: stepTimeout(timeout) });
  } else {
    await expect(page.locator("html")).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/, { timeout: stepTimeout(timeout) });
  }

  const accountLink = page.getByRole("link", { name: new RegExp(escapeRegExp(student.name), "i") }).first();
  if (axis.viewport === "mobile") {
    const mobileMenu = page.getByRole("button", { name: /open mobile menu|開啟手機選單|开启手机菜单/i }).first();
    await expect(mobileMenu).toBeVisible({ timeout: stepTimeout(timeout) });
    if (await mobileMenu.getAttribute("aria-expanded", { timeout: stepTimeout(timeout) }) !== "true") {
      await mobileMenu.click({ timeout: stepTimeout(timeout) });
    }
    await expect(accountLink).toBeVisible({ timeout: stepTimeout(timeout) });
    await mobileMenu.click({ timeout: stepTimeout(timeout) });
    await expect(mobileMenu).toHaveAttribute("aria-expanded", "false", { timeout: stepTimeout(timeout) });
  } else {
    await expect(accountLink).toBeVisible({ timeout: stepTimeout(timeout) });
  }
}

export function directoryLabHref(lab: CaliforniaQaLab) {
  const params = new URLSearchParams({ grade: lab.grade, track: "all", lab: lab.labId });
  return `/student/tools/visualizations?${params.toString()}`;
}

export function premiumDirectLabHref(lab: CaliforniaQaLab) {
  const params = new URLSearchParams({ grade: lab.grade, track: "all" });
  return `/student/tools/visualizations/${encodeURIComponent(lab.labId)}?${params.toString()}`;
}

function labAttributeSelector(attribute: string, value: string) {
  return `[${attribute}=${JSON.stringify(value)}]`;
}

export async function openCaliforniaDirectoryLab(
  page: Page,
  lab: CaliforniaQaLab,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS
) {
  await page.goto(directoryLabHref(lab), { timeout: stepTimeout(timeout), waitUntil: "domcontentloaded" });
  const panel = page.locator(`#lab-example-${lab.labId}`).first();
  await expect(panel).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(panel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: stepTimeout(timeout) });
  await expect(panel).toHaveAttribute("data-viz-active-lab-id", lab.labId, { timeout: stepTimeout(timeout) });
  await expect(panel).toHaveAttribute("data-viz-link-status", "ok", { timeout: stepTimeout(timeout) });
  const switcher = panel.locator("[data-viz-signature-switcher]").first();
  await expect(switcher).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", lab.assignment.primary, {
    timeout: stepTimeout(timeout)
  });
  return { panel, switcher };
}

export async function openSignatureBench(
  panel: Locator,
  switcher: Locator,
  benchId: SignatureLabId,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS
) {
  const activeBenchId = await switcher.getAttribute("data-viz-active-signature-bench");
  if (activeBenchId !== benchId) {
    const tab = switcher.locator(labAttributeSelector("data-viz-signature-bench-id", benchId));
    await expect(tab).toBeVisible({ timeout: stepTimeout(timeout) });
    await tab.click({ timeout: stepTimeout(timeout) });
    await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: stepTimeout(timeout) });
  }
  await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", benchId, {
    timeout: stepTimeout(timeout)
  });
  const signatureLab = panel.locator("[data-viz-signature-lab]").first();
  const surface = signatureLab.locator("[data-viz-surface]").first();
  const canvas = surface.locator("canvas[data-viz-mark]").first();
  await expect(signatureLab).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(surface).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(canvas).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect.poll(async () => canvas.evaluate((element) => {
    const drawingCanvas = element as HTMLCanvasElement;
    return { height: drawingCanvas.height, width: drawingCanvas.width };
  }), {
    message: `${benchId} canvas must have a non-zero drawing buffer.`,
    timeout: stepTimeout(timeout)
  }).toMatchObject({ height: expect.any(Number), width: expect.any(Number) });
  const dimensions = await canvas.evaluate((element) => {
    const drawingCanvas = element as HTMLCanvasElement;
    return { height: drawingCanvas.height, width: drawingCanvas.width };
  });
  expect(dimensions.width, `${benchId} canvas buffer width`).toBeGreaterThan(0);
  expect(dimensions.height, `${benchId} canvas buffer height`).toBeGreaterThan(0);
  return { canvas, signatureLab, surface };
}

function visibleEnabled(locator: Locator, index: number) {
  const item = locator.nth(index);
  return Promise.all([
    item.isVisible().catch(() => false),
    item.isEnabled().catch(() => false)
  ]).then(([visible, enabled]) => visible && enabled);
}

async function firstVisibleEnabled(locator: Locator) {
  for (let index = 0; index < await locator.count(); index += 1) {
    if (await visibleEnabled(locator, index)) return locator.nth(index);
  }
  return null;
}

const MOTION_CONTROL_LABEL = /(?:\b(?:animate|animation|auto[- ]?spin|pause|play|spin)\b|動畫|动画|播放|暫停|暂停|自轉|自转|旋轉|旋转|自動|自动)/i;
const DANGEROUS_CONTROL_LABEL = /(?:\b(?:clear|delete|discard|download|erase|export|import|paste|remove|restart|reset|save|shot|submit|upload|video)\b|清除|刪除|删除|移除|下載|下载|匯出|导出|導出|上傳|上传|貼上|粘贴|重設|重置|重新開始|重新开始|儲存|保存|提交|快照|錄影|录像|視頻|视频|丟棄|舍棄|舍弃|放棄|放弃)/i;

async function modelResponseState(root: Locator) {
  return root.evaluate((element) => {
    const hash = (value: string | Uint8ClampedArray) => {
      let result = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        result ^= typeof value === "string" ? value.charCodeAt(index) : value[index];
        result = Math.imul(result, 16777619);
      }
      return (result >>> 0).toString(16).padStart(8, "0");
    };
    const semanticSelector = [
      "output:not([aria-live])",
      "[data-viz-math-state]",
      "[data-viz-model-state]",
      "[data-viz-result]:not([aria-live])",
      "[data-viz-value]:not([aria-live])"
    ].join(",");
    const semantic = Array.from(element.querySelectorAll<HTMLElement>(semanticSelector))
      .filter((target, index, all) => all.indexOf(target) === index)
      .filter((target) =>
        !target.matches("button,input,select,textarea,option,[role=button],[role=slider],[role=tab]") &&
        !target.closest("button,label,[aria-live],[role=button],[role=slider],[role=tab]")
      )
      .map((target, index) => {
        const attributes = Array.from(target.attributes)
          .filter((attribute) => [
            "data-viz-math-state",
            "data-viz-model-state",
            "data-viz-result",
            "data-viz-value"
          ].includes(attribute.name))
          .map((attribute) => [attribute.name, attribute.value] as const)
          .sort(([left], [right]) => left.localeCompare(right));
        return [
          index,
          target.tagName,
          attributes,
          (target.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 240)
        ];
      });
    type CanvasAuditApi = {
      contextKindFor(canvas: HTMLCanvasElement): "2d" | "webgl" | "webgl2" | "bitmaprenderer" | "unknown";
      version: number;
    };
    const audit = (window as Window & { __californiaCanvasTextAudit?: CanvasAuditApi })
      .__californiaCanvasTextAudit;
    const interactiveUiSelector = [
      "button",
      "input",
      "label",
      "select",
      "textarea",
      "[aria-live]",
      "[role=button]",
      "[role=slider]",
      "[role=tab]"
    ].join(",");
    const canvases = Array.from(element.querySelectorAll<HTMLCanvasElement>("canvas"))
      .filter((canvas) => !canvas.closest(interactiveUiSelector))
      .map((canvas, index) => [
        index,
        canvas.width,
        canvas.height,
        audit?.version === 4 ? audit.contextKindFor(canvas) : "registry-unavailable"
      ]);
    const svgs = Array.from(element.querySelectorAll<SVGSVGElement>("svg"))
      .filter((svg) => !svg.closest(interactiveUiSelector))
      .map((svg, index) => [
        index,
        hash(svg.outerHTML),
        svg.getAttribute("viewBox")
      ]);
    return JSON.stringify({ canvases, semantic, svgs });
  });
}

async function motionRestorationState(root: Locator) {
  return root.evaluate((element) => {
    const selector = [
      "button",
      "input",
      "select",
      "textarea",
      "output",
      "[aria-live]",
      "[data-state]",
      "[data-viz-active]",
      "[data-viz-value]"
    ].join(",");
    return JSON.stringify(Array.from(element.querySelectorAll<HTMLElement>(selector)).map((target, index) => {
      const formControl = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      return [
        index,
        target.tagName,
        target.getAttribute("type"),
        target.matches("input,select,textarea") ? formControl.value : null,
        target.matches("input[type=checkbox],input[type=radio]") ? (formControl as HTMLInputElement).checked : null,
        target.getAttribute("aria-checked"),
        target.getAttribute("aria-pressed"),
        target.getAttribute("data-state"),
        target.getAttribute("data-viz-active"),
        target.getAttribute("data-viz-value"),
        (target.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 160)
      ];
    }));
  });
}

async function visibleIntrinsicSignatureCanvas(root: Locator) {
  const canvases = root.locator("[data-viz-surface] canvas[data-viz-mark]");
  for (let index = 0; index < await canvases.count(); index += 1) {
    const canvas = canvases.nth(index);
    if (await canvas.isVisible().catch(() => false)) return canvas;
  }
  throw new Error(
    "Signature bench must expose a visible intrinsic learner Canvas inside [data-viz-surface] for visual/reset evidence."
  );
}

async function rawSignatureBenchState(
  root: Locator,
  timeout: CaliforniaQaTimeout
): Promise<CaliforniaSignatureBenchDefaultState> {
  const semanticState = await modelResponseState(root);
  const controlState = await motionRestorationState(root);
  const canvas = await visibleIntrinsicSignatureCanvas(root);
  const surfacePng = await canvas.screenshot({
    animations: "disabled",
    timeout: stepTimeout(timeout),
    type: "png"
  });
  const surfaceFingerprint = sha256Text(surfacePng);
  const semanticFingerprint = sha256Text(semanticState);
  return {
    controlFingerprint: sha256Text(controlState),
    modelFingerprint: sha256Text(`${semanticFingerprint}\0${surfaceFingerprint}`),
    semanticFingerprint,
    surfaceFingerprint,
    surfacePng,
    surfaceStable: false
  };
}

export async function captureSignatureBenchDefaultState(
  root: Locator,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS
): Promise<CaliforniaSignatureBenchDefaultState> {
  const startedAt = Date.now();
  const localBudget = Math.min(stepTimeout(timeout), 1_000);
  let previous = await rawSignatureBenchState(root, timeout);
  let stableSemanticState: CaliforniaSignatureBenchDefaultState | null = null;
  let identicalSurfaceFrames = 1;
  let stableSemanticFrames = 1;
  while (Date.now() - startedAt <= localBudget && timeoutRemaining(timeout) > 0) {
    const remaining = Math.min(localBudget - (Date.now() - startedAt), timeoutRemaining(timeout));
    if (remaining <= 0) break;
    await root.page().waitForTimeout(Math.min(50, remaining));
    const current = await rawSignatureBenchState(root, timeout);
    const semanticAndControlsStable =
      current.controlFingerprint === previous.controlFingerprint &&
      current.semanticFingerprint === previous.semanticFingerprint;
    if (semanticAndControlsStable) {
      stableSemanticFrames += 1;
      identicalSurfaceFrames = current.surfaceFingerprint === previous.surfaceFingerprint
        ? identicalSurfaceFrames + 1
        : 1;
      if (stableSemanticFrames >= 3) stableSemanticState = current;
      if (stableSemanticFrames >= 3 && identicalSurfaceFrames >= 3) {
        return {
          ...current,
          modelFingerprint: sha256Text(`${current.semanticFingerprint}\0${current.surfaceFingerprint}`),
          surfaceStable: true
        };
      }
    } else {
      stableSemanticFrames = 1;
      identicalSurfaceFrames = 1;
      stableSemanticState = null;
    }
    previous = current;
  }
  if (stableSemanticState) {
    return {
      ...stableSemanticState,
      modelFingerprint: sha256Text(`${stableSemanticState.semanticFingerprint}\0dynamic-surface`),
      surfaceStable: false
    };
  }
  throw new Error(
    "Signature bench did not reach stable controls and mathematical semantics; draw revision alone is not model-response evidence."
  );
}

function modelChangeFingerprints(
  before: CaliforniaSignatureBenchDefaultState,
  after: CaliforniaSignatureBenchDefaultState
) {
  if (after.semanticFingerprint !== before.semanticFingerprint) {
    return {
      changedModelFingerprint: sha256Text(`semantic\0${after.semanticFingerprint}`),
      defaultModelFingerprint: sha256Text(`semantic\0${before.semanticFingerprint}`)
    };
  }
  if (
    before.surfaceStable &&
    after.surfaceStable &&
    after.surfaceFingerprint !== before.surfaceFingerprint
  ) {
    return {
      changedModelFingerprint: sha256Text(`stable-surface\0${after.surfaceFingerprint}`),
      defaultModelFingerprint: sha256Text(`stable-surface\0${before.surfaceFingerprint}`)
    };
  }
  return null;
}

export async function compareSignatureResetVisuals(
  defaultPng: Buffer,
  restoredPng: Buffer
): Promise<CaliforniaSignatureResetVisualComparison> {
  const decode = (png: Buffer) => sharp(png)
    .flatten({ background: { alpha: 1, b: 255, g: 255, r: 255 } })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [defaultImage, restoredImage] = await Promise.all([
    decode(defaultPng),
    decode(restoredPng)
  ]);
  const defaultInfo = defaultImage.info;
  const restoredInfo = restoredImage.info;
  if (
    defaultInfo.width !== restoredInfo.width ||
    defaultInfo.height !== restoredInfo.height ||
    defaultInfo.channels !== restoredInfo.channels
  ) {
    throw new Error(
      "Signature reset visual dimensions changed: " +
      `${defaultInfo.width}x${defaultInfo.height}x${defaultInfo.channels} -> ` +
      `${restoredInfo.width}x${restoredInfo.height}x${restoredInfo.channels}`
    );
  }
  const channelCount = defaultInfo.channels;
  const pixelCount = defaultInfo.width * defaultInfo.height;
  let absoluteDifference = 0;
  let changedPixels = 0;
  for (let offset = 0; offset < defaultImage.data.length; offset += channelCount) {
    let changed = false;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const difference = Math.abs(defaultImage.data[offset + channel] - restoredImage.data[offset + channel]);
      absoluteDifference += difference;
      if (difference > CALIFORNIA_SIGNATURE_RESET_CHANNEL_NOISE_THRESHOLD) changed = true;
    }
    if (changed) {
      changedPixels += 1;
    }
  }
  const changedPixelRatio = changedPixels / pixelCount;
  const meanAbsoluteDiffRatio = absoluteDifference / (pixelCount * channelCount * 255);
  const gradientMap = (data: Buffer) => {
    const luminance = new Float32Array(pixelCount);
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const offset = pixel * channelCount;
      luminance[pixel] =
        data[offset] * 0.2126 +
        data[offset + 1] * 0.7152 +
        data[offset + 2] * 0.0722;
    }
    const magnitude = new Float32Array(pixelCount);
    const gradientX = new Float32Array(pixelCount);
    const gradientY = new Float32Array(pixelCount);
    for (let y = 1; y < defaultInfo.height - 1; y += 1) {
      for (let x = 1; x < defaultInfo.width - 1; x += 1) {
        const pixel = y * defaultInfo.width + x;
        gradientX[pixel] = luminance[pixel + 1] - luminance[pixel - 1];
        gradientY[pixel] = luminance[pixel + defaultInfo.width] - luminance[pixel - defaultInfo.width];
        magnitude[pixel] = Math.hypot(gradientX[pixel], gradientY[pixel]);
      }
    }
    return { gradientX, gradientY, magnitude };
  };
  const defaultEdges = gradientMap(defaultImage.data);
  const restoredEdges = gradientMap(restoredImage.data);
  const minimumEdgeMagnitude = 12;
  const edgeCount = (edges: ReturnType<typeof gradientMap>) => edges.magnitude.reduce(
    (sum, magnitude) => sum + (magnitude >= minimumEdgeMagnitude ? 1 : 0),
    0
  );
  const maskCount = (mask: Uint8Array) => mask.reduce((sum, value) => sum + value, 0);
  const unmatchedEdgeMask = (
    source: ReturnType<typeof gradientMap>,
    target: ReturnType<typeof gradientMap>
  ) => {
    const unmatched = new Uint8Array(pixelCount);
    for (let y = 1; y < defaultInfo.height - 1; y += 1) {
      for (let x = 1; x < defaultInfo.width - 1; x += 1) {
        const pixel = y * defaultInfo.width + x;
        const sourceMagnitude = source.magnitude[pixel];
        if (sourceMagnitude < minimumEdgeMagnitude) continue;
        let matched = false;
        for (let yOffset = -1; yOffset <= 1 && !matched; yOffset += 1) {
          for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
            const targetPixel = (y + yOffset) * defaultInfo.width + x + xOffset;
            const targetMagnitude = target.magnitude[targetPixel];
            const tolerantMagnitude = Math.max(6, Math.min(20, sourceMagnitude * 0.25));
            if (targetMagnitude < tolerantMagnitude) continue;
            const orientation = Math.abs(
              source.gradientX[pixel] * target.gradientX[targetPixel] +
              source.gradientY[pixel] * target.gradientY[targetPixel]
            ) / Math.max(1, sourceMagnitude * targetMagnitude);
            if (orientation < 0.7) continue;
            matched = true;
            break;
          }
        }
        if (!matched) unmatched[pixel] = 1;
      }
    }
    return unmatched;
  };
  const unmatchedDefaultEdges = unmatchedEdgeMask(defaultEdges, restoredEdges);
  const unmatchedRestoredEdges = unmatchedEdgeMask(restoredEdges, defaultEdges);
  const unmatchedStructureMask = new Uint8Array(pixelCount);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (unmatchedDefaultEdges[pixel] || unmatchedRestoredEdges[pixel]) unmatchedStructureMask[pixel] = 1;
  }
  const totalEdgeCount = edgeCount(defaultEdges) + edgeCount(restoredEdges);
  const globalEdgeMismatchRatio = totalEdgeCount === 0
    ? 0
    : (maskCount(unmatchedDefaultEdges) + maskCount(unmatchedRestoredEdges)) /
      totalEdgeCount;
  const changedStructureSpanRatio = (() => {
    const joinRadius = 12;
    const horizontallyDilated = new Uint8Array(pixelCount);
    for (let y = 0; y < defaultInfo.height; y += 1) {
      let active = 0;
      for (let x = 0; x <= Math.min(joinRadius, defaultInfo.width - 1); x += 1) {
        active += unmatchedStructureMask[y * defaultInfo.width + x];
      }
      for (let x = 0; x < defaultInfo.width; x += 1) {
        if (x > 0) {
          const addedX = x + joinRadius;
          if (addedX < defaultInfo.width) active += unmatchedStructureMask[y * defaultInfo.width + addedX];
          const removedX = x - joinRadius - 1;
          if (removedX >= 0) active -= unmatchedStructureMask[y * defaultInfo.width + removedX];
        }
        if (active > 0) horizontallyDilated[y * defaultInfo.width + x] = 1;
      }
    }
    const structurallyJoinedMask = new Uint8Array(pixelCount);
    for (let x = 0; x < defaultInfo.width; x += 1) {
      let active = 0;
      for (let y = 0; y <= Math.min(joinRadius, defaultInfo.height - 1); y += 1) {
        active += horizontallyDilated[y * defaultInfo.width + x];
      }
      for (let y = 0; y < defaultInfo.height; y += 1) {
        if (y > 0) {
          const addedY = y + joinRadius;
          if (addedY < defaultInfo.height) active += horizontallyDilated[addedY * defaultInfo.width + x];
          const removedY = y - joinRadius - 1;
          if (removedY >= 0) active -= horizontallyDilated[removedY * defaultInfo.width + x];
        }
        if (active > 0) structurallyJoinedMask[y * defaultInfo.width + x] = 1;
      }
    }
    const visited = new Uint8Array(pixelCount);
    const stack = new Int32Array(pixelCount);
    let largestSpanRatio = 0;
    for (let seed = 0; seed < pixelCount; seed += 1) {
      if (!structurallyJoinedMask[seed] || visited[seed]) continue;
      let stackSize = 0;
      stack[stackSize] = seed;
      stackSize += 1;
      visited[seed] = 1;
      let minX = seed % defaultInfo.width;
      let maxX = minX;
      let minY = Math.floor(seed / defaultInfo.width);
      let maxY = minY;
      while (stackSize > 0) {
        stackSize -= 1;
        const pixel = stack[stackSize];
        const x = pixel % defaultInfo.width;
        const y = Math.floor(pixel / defaultInfo.width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
          for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
            if (xOffset === 0 && yOffset === 0) continue;
            const neighborX = x + xOffset;
            const neighborY = y + yOffset;
            if (
              neighborX < 0 || neighborX >= defaultInfo.width ||
              neighborY < 0 || neighborY >= defaultInfo.height
            ) continue;
            const neighbor = neighborY * defaultInfo.width + neighborX;
            if (!structurallyJoinedMask[neighbor] || visited[neighbor]) continue;
            visited[neighbor] = 1;
            stack[stackSize] = neighbor;
            stackSize += 1;
          }
        }
      }
      largestSpanRatio = Math.max(
        largestSpanRatio,
        Math.max(1, maxX - minX + 1 - joinRadius * 2) / defaultInfo.width,
        Math.max(1, maxY - minY + 1 - joinRadius * 2) / defaultInfo.height
      );
    }
    let maximumRowDensity = 0;
    for (let y = 0; y < defaultInfo.height; y += 1) {
      let changedInRow = 0;
      for (let x = 0; x < defaultInfo.width; x += 1) {
        changedInRow += unmatchedStructureMask[y * defaultInfo.width + x];
      }
      maximumRowDensity = Math.max(maximumRowDensity, changedInRow / defaultInfo.width);
    }
    let maximumColumnDensity = 0;
    for (let x = 0; x < defaultInfo.width; x += 1) {
      let changedInColumn = 0;
      for (let y = 0; y < defaultInfo.height; y += 1) {
        changedInColumn += unmatchedStructureMask[y * defaultInfo.width + x];
      }
      maximumColumnDensity = Math.max(maximumColumnDensity, changedInColumn / defaultInfo.height);
    }
    let unmatchedCount = 0;
    let distributedMinX = defaultInfo.width;
    let distributedMaxX = -1;
    let distributedMinY = defaultInfo.height;
    let distributedMaxY = -1;
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      if (!unmatchedStructureMask[pixel]) continue;
      unmatchedCount += 1;
      const x = pixel % defaultInfo.width;
      const y = Math.floor(pixel / defaultInfo.width);
      distributedMinX = Math.min(distributedMinX, x);
      distributedMaxX = Math.max(distributedMaxX, x);
      distributedMinY = Math.min(distributedMinY, y);
      distributedMaxY = Math.max(distributedMaxY, y);
    }
    const minimumDistributedEvidence = Math.max(8, Math.floor(Math.sqrt(pixelCount) * 0.02));
    const distributedSpanRatio = unmatchedCount >= minimumDistributedEvidence
      ? Math.max(
        (distributedMaxX - distributedMinX + 1) / defaultInfo.width,
        (distributedMaxY - distributedMinY + 1) / defaultInfo.height
      )
      : 0;
    return Math.max(
      largestSpanRatio,
      maximumRowDensity,
      maximumColumnDensity,
      distributedSpanRatio
    );
  })();
  // A global edge ratio alone is diluted by unchanged axes and dense grids.
  // Preserve that signal while also joining nearby dashed/discrete components
  // and rejecting a coherent changed structure spanning a material viewport area.
  const edgeMismatchRatio = Math.max(globalEdgeMismatchRatio, changedStructureSpanRatio);
  return {
    changedPixelRatio,
    edgeMismatchRatio,
    meanAbsoluteDiffRatio,
    withinTolerance:
      changedPixelRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO &&
      edgeMismatchRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO &&
      meanAbsoluteDiffRatio <= CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO
  };
}

async function waitForModelResponse(
  root: Locator,
  before: CaliforniaSignatureBenchDefaultState,
  timeout: CaliforniaQaTimeout,
  label: string
) {
  const startedAt = Date.now();
  const localBudget = Math.min(stepTimeout(timeout), 2_000);
  while (Date.now() - startedAt <= localBudget && timeoutRemaining(timeout) > 0) {
    const after = await captureSignatureBenchDefaultState(root, timeout);
    const fingerprints = modelChangeFingerprints(before, after);
    if (fingerprints) return { after, ...fingerprints };
    const remaining = Math.min(localBudget - (Date.now() - startedAt), timeoutRemaining(timeout));
    if (remaining <= 0) break;
    await root.page().waitForTimeout(Math.min(50, remaining));
  }
  throw new Error(
    `${label} changed only its form value, draw revision, or accepted a click without deterministic model-response evidence; ` +
    "stable visual/mathematical state change is required."
  );
}

async function waitForMotionRestoration(
  root: Locator,
  before: string,
  timeout: CaliforniaQaTimeout,
  label: string
) {
  const startedAt = Date.now();
  const localBudget = Math.min(stepTimeout(timeout), 2_000);
  while (Date.now() - startedAt <= localBudget && timeoutRemaining(timeout) > 0) {
    if (await motionRestorationState(root) === before) return;
    const remaining = Math.min(localBudget - (Date.now() - startedAt), timeoutRemaining(timeout));
    if (remaining <= 0) break;
    await root.page().waitForTimeout(Math.min(50, remaining));
  }
  throw new Error(`${label} did not restore its learner-visible motion state after the smoke action.`);
}

async function waitForMotionChange(
  root: Locator,
  before: string,
  timeout: CaliforniaQaTimeout,
  label: string
) {
  const startedAt = Date.now();
  const localBudget = Math.min(stepTimeout(timeout), 2_000);
  while (Date.now() - startedAt <= localBudget && timeoutRemaining(timeout) > 0) {
    const after = await motionRestorationState(root);
    if (after !== before) return after;
    const remaining = Math.min(localBudget - (Date.now() - startedAt), timeoutRemaining(timeout));
    if (remaining <= 0) break;
    await root.page().waitForTimeout(Math.min(50, remaining));
  }
  throw new Error(`${label} did not expose a learner-visible motion state change.`);
}

async function accessibleControlLabel(control: Locator) {
  return ((await control.getAttribute("aria-label")) ?? (await control.innerText()).trim()).trim();
}

function serializeSignatureControlEvidence(evidence: CaliforniaSignatureControlEvidence) {
  if (evidence.kind === "range" || evidence.kind === "number") {
    return `${evidence.kind}:${evidence.label}:${evidence.beforeValue}->${evidence.afterValue}:model-change`;
  }
  if (evidence.kind === "select") return `select:${evidence.label}:${evidence.afterValue}:model-change`;
  if (evidence.kind === "toggle") return `toggle:${evidence.label}:model-change`;
  if (evidence.kind === "button") return `button:${evidence.label.slice(0, 80) || "unnamed"}:semantic-change`;
  return `motion-toggle:${evidence.label.slice(0, 80) || "unnamed"}:semantic-change:restored`;
}

export function smokeSignatureBenchControl(
  signatureLab: Locator,
  timeout?: CaliforniaQaTimeout
): Promise<string>;
export function smokeSignatureBenchControl(
  signatureLab: Locator,
  timeout: CaliforniaQaTimeout | undefined,
  options: { defaultState?: CaliforniaSignatureBenchDefaultState; structured: true }
): Promise<CaliforniaSignatureControlEvidence>;
export async function smokeSignatureBenchControl(
  signatureLab: Locator,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS,
  options?: { defaultState?: CaliforniaSignatureBenchDefaultState; structured: true }
) {
  const finish = (evidence: CaliforniaSignatureControlEvidence) => options?.structured
    ? evidence
    : serializeSignatureControlEvidence(evidence);
  const defaultStateForControl = () => options?.defaultState
    ? Promise.resolve(options.defaultState)
    : captureSignatureBenchDefaultState(signatureLab, timeout);
  const ranges = signatureLab.locator('input[type="range"]:not([disabled])');
  const range = await firstVisibleEnabled(ranges);
  if (range) {
    const control = await range.evaluate((element) => {
      const input = element as HTMLInputElement;
      const current = Number(input.value);
      const min = input.min === "" ? 0 : Number(input.min);
      const max = input.max === "" ? 100 : Number(input.max);
      const target = Math.abs(current - max) > Number.EPSILON ? max : min;
      return { current, label: input.getAttribute("aria-label") ?? input.name ?? "range", target };
    });
    const before = await defaultStateForControl();
    await range.focus({ timeout: stepTimeout(timeout) });
    await range.press(control.target === control.current ? "ArrowRight" : control.target > control.current ? "End" : "Home", {
      timeout: stepTimeout(timeout)
    });
    await expect(range, `range ${control.label} should accept ${control.target}`).toHaveValue(String(control.target), {
      timeout: stepTimeout(timeout)
    });
    const after = await waitForModelResponse(signatureLab, before, timeout, `range ${control.label}`);
    return finish({
      afterValue: String(control.target),
      beforeValue: String(control.current),
      changedModelFingerprint: after.changedModelFingerprint,
      defaultModelFingerprint: after.defaultModelFingerprint,
      defaultSemanticFingerprint: before.semanticFingerprint,
      kind: "range",
      label: control.label,
      modelChanged: true,
      restoration: "reset",
      restored: false
    });
  }

  const numbers = signatureLab.locator('input[type="number"]:not([disabled])');
  const number = await firstVisibleEnabled(numbers);
  if (number) {
    const control = await number.evaluate((element) => {
      const input = element as HTMLInputElement;
      const current = Number(input.value);
      const min = input.min === "" ? current - 1 : Number(input.min);
      const max = input.max === "" ? current + 1 : Number(input.max);
      const target = Math.abs(current - max) > Number.EPSILON ? max : min;
      return { current, label: input.getAttribute("aria-label") ?? input.name ?? "number", target };
    });
    const before = await defaultStateForControl();
    await number.fill(String(control.target), { timeout: stepTimeout(timeout) });
    await expect(number, `number ${control.label} should accept ${control.target}`).toHaveValue(String(control.target), {
      timeout: stepTimeout(timeout)
    });
    const after = await waitForModelResponse(signatureLab, before, timeout, `number ${control.label}`);
    return finish({
      afterValue: String(control.target),
      beforeValue: String(control.current),
      changedModelFingerprint: after.changedModelFingerprint,
      defaultModelFingerprint: after.defaultModelFingerprint,
      defaultSemanticFingerprint: before.semanticFingerprint,
      kind: "number",
      label: control.label,
      modelChanged: true,
      restoration: "reset",
      restored: false
    });
  }

  const selects = signatureLab.locator("select:not([disabled])");
  for (let index = 0; index < await selects.count(); index += 1) {
    const select = selects.nth(index);
    if (!(await visibleEnabled(selects, index))) continue;
    const currentValue = await select.inputValue();
    const selectableOptions = await select.locator("option").evaluateAll((elements, selectedValue) =>
      elements.map((element) => (element as HTMLOptionElement).value).filter((value) => value !== selectedValue),
      currentValue
    );
    if (selectableOptions.length === 0) continue;
    const label = await select.getAttribute("aria-label") ?? await select.getAttribute("name") ?? "select";
    const before = await defaultStateForControl();
    await select.selectOption(selectableOptions[0], { timeout: stepTimeout(timeout) });
    await expect(select, `select ${label} should accept ${selectableOptions[0]}`).toHaveValue(selectableOptions[0], {
      timeout: stepTimeout(timeout)
    });
    const after = await waitForModelResponse(signatureLab, before, timeout, `select ${label}`);
    return finish({
      afterValue: selectableOptions[0],
      beforeValue: currentValue,
      changedModelFingerprint: after.changedModelFingerprint,
      defaultModelFingerprint: after.defaultModelFingerprint,
      defaultSemanticFingerprint: before.semanticFingerprint,
      kind: "select",
      label,
      modelChanged: true,
      restoration: "reset",
      restored: false
    });
  }

  const toggles = signatureLab.locator('input[type="checkbox"]:not([disabled]), input[type="radio"]:not([disabled])');
  const motionToggles: Array<{ control: Locator; label: string; restoreWith: Locator | null }> = [];
  for (let index = 0; index < await toggles.count(); index += 1) {
    if (!(await visibleEnabled(toggles, index))) continue;
    const toggle = toggles.nth(index);
    const before = await toggle.isChecked();
    const type = await toggle.getAttribute("type");
    if (before && type === "radio") continue;
    let restoreWith: Locator | null = null;
    if (type === "radio") {
      const name = await toggle.getAttribute("name");
      if (!name) continue;
      const checkedPeers = signatureLab.locator('input[type="radio"]:checked');
      for (let peerIndex = 0; peerIndex < await checkedPeers.count(); peerIndex += 1) {
        const peer = checkedPeers.nth(peerIndex);
        if (await peer.getAttribute("name") === name) {
          restoreWith = peer;
          break;
        }
      }
      if (!restoreWith) continue;
    }
    const label = await accessibleControlLabel(toggle) || await toggle.getAttribute("name") || "unnamed";
    if (MOTION_CONTROL_LABEL.test(label)) {
      motionToggles.push({ control: toggle, label, restoreWith });
      continue;
    }
    const responseBefore = await defaultStateForControl();
    await toggle.click({ timeout: stepTimeout(timeout) });
    expect(await toggle.isChecked(), "checkbox/radio should change after click").not.toBe(before);
    try {
      const responseAfter = await waitForModelResponse(signatureLab, responseBefore, timeout, `toggle ${label}`);
      return finish({
        afterValue: String(!before),
        beforeValue: String(before),
        changedModelFingerprint: responseAfter.changedModelFingerprint,
        defaultModelFingerprint: responseAfter.defaultModelFingerprint,
        defaultSemanticFingerprint: responseBefore.semanticFingerprint,
        kind: "toggle",
        label,
        modelChanged: true,
        restoration: "reset",
        restored: false
      });
    } catch (error) {
      if (restoreWith) await restoreWith.click({ timeout: stepTimeout(timeout) });
      else await toggle.click({ timeout: stepTimeout(timeout) });
      throw error;
    }
  }

  const buttons = signatureLab.locator('button:not([disabled]):not([data-viz-reset-model])');
  let motionToggle: { button: Locator; label: string } | null = null;
  for (let index = 0; index < await buttons.count(); index += 1) {
    if (!(await visibleEnabled(buttons, index))) continue;
    const button = buttons.nth(index);
    const label = await accessibleControlLabel(button);
    if (MOTION_CONTROL_LABEL.test(label)) {
      motionToggle ??= { button, label };
      continue;
    }
    if (DANGEROUS_CONTROL_LABEL.test(label)) continue;
    const before = await defaultStateForControl();
    await button.click({ timeout: stepTimeout(timeout) });
    const after = await waitForModelResponse(signatureLab, before, timeout, `button ${label || "unnamed"}`);
    return finish({
      changedModelFingerprint: after.changedModelFingerprint,
      defaultModelFingerprint: after.defaultModelFingerprint,
      defaultSemanticFingerprint: before.semanticFingerprint,
      kind: "button",
      label: label || "unnamed",
      modelChanged: true,
      restoration: "reset",
      restored: false
    });
  }
  const motionInput = motionToggles[0];
  if (motionInput) {
    const defaultState = await defaultStateForControl();
    const restorationBefore = await motionRestorationState(signatureLab);
    const checkedBefore = await motionInput.control.isChecked();
    await motionInput.control.click({ timeout: stepTimeout(timeout) });
    expect(await motionInput.control.isChecked(), "motion checkbox/radio should change after click").not.toBe(checkedBefore);
    const changedState = await waitForMotionChange(
      signatureLab,
      restorationBefore,
      timeout,
      `motion toggle ${motionInput.label}`
    );
    if (motionInput.restoreWith) await motionInput.restoreWith.click({ timeout: stepTimeout(timeout) });
    else await motionInput.control.click({ timeout: stepTimeout(timeout) });
    expect(await motionInput.control.isChecked(), "motion checkbox/radio must be restored after smoke").toBe(checkedBefore);
    await waitForMotionRestoration(signatureLab, restorationBefore, timeout, `motion toggle ${motionInput.label}`);
    const restoredState = await captureSignatureBenchDefaultState(signatureLab, timeout);
    expect(restoredState.controlFingerprint, "motion toggle must restore the default control state").toBe(
      defaultState.controlFingerprint
    );
    expect(restoredState.semanticFingerprint, "motion toggle must restore the default mathematical semantics").toBe(
      defaultState.semanticFingerprint
    );
    return finish({
      afterValue: String(checkedBefore),
      beforeValue: String(checkedBefore),
      changedModelFingerprint: sha256Text(`motion-control-state\0${changedState}`),
      defaultModelFingerprint: sha256Text(`motion-control-state\0${restorationBefore}`),
      defaultSemanticFingerprint: defaultState.semanticFingerprint,
      kind: "motion-toggle",
      label: motionInput.label || "unnamed",
      modelChanged: true,
      restoration: "self",
      restored: true
    });
  }
  if (motionToggle) {
    const defaultState = await defaultStateForControl();
    const restorationBefore = await motionRestorationState(signatureLab);
    await motionToggle.button.click({ timeout: stepTimeout(timeout) });
    const changedState = await waitForMotionChange(
      signatureLab,
      restorationBefore,
      timeout,
      `motion button ${motionToggle.label}`
    );
    if (await motionRestorationState(signatureLab) !== restorationBefore) {
      await motionToggle.button.click({ timeout: stepTimeout(timeout) });
    }
    await waitForMotionRestoration(signatureLab, restorationBefore, timeout, `motion button ${motionToggle.label}`);
    const restoredState = await captureSignatureBenchDefaultState(signatureLab, timeout);
    expect(restoredState.controlFingerprint, "motion button must restore the default control state").toBe(
      defaultState.controlFingerprint
    );
    expect(restoredState.semanticFingerprint, "motion button must restore the default mathematical semantics").toBe(
      defaultState.semanticFingerprint
    );
    return finish({
      changedModelFingerprint: sha256Text(`motion-control-state\0${changedState}`),
      defaultModelFingerprint: sha256Text(`motion-control-state\0${restorationBefore}`),
      defaultSemanticFingerprint: defaultState.semanticFingerprint,
      kind: "motion-button",
      label: motionToggle.label || "unnamed",
      modelChanged: true,
      restoration: "self",
      restored: true
    });
  }

  throw new Error("No visible enabled reversible control was found inside the signature bench.");
}

export async function resetSignatureBench(
  page: Page,
  signatureLab: Locator,
  switcher: Locator,
  benchId: SignatureLabId,
  timeout: CaliforniaQaTimeout,
  defaultState: CaliforniaSignatureBenchDefaultState
) {
  const oldCanvas = await signatureLab.locator("canvas[data-viz-mark]").first().elementHandle();
  if (!oldCanvas) throw new Error(`${benchId} should expose a canvas before reset`);
  try {
  const reset = signatureLab.locator("[data-viz-reset-model]").first();
  await expect(reset).toBeVisible({ timeout: stepTimeout(timeout) });
  await reset.click({ timeout: stepTimeout(timeout) });
  await page.waitForFunction((element) => !element?.isConnected, oldCanvas, { timeout: stepTimeout(timeout) });
  await expect(switcher).toHaveAttribute("data-viz-active-signature-bench", benchId, {
    timeout: stepTimeout(timeout)
  });
  const newCanvas = signatureLab.locator("canvas[data-viz-mark]").first();
  await expect(newCanvas).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect.poll(async () => newCanvas.evaluate((element) => {
    const drawingCanvas = element as HTMLCanvasElement;
    return drawingCanvas.width > 0 && drawingCanvas.height > 0;
  }), { timeout: stepTimeout(timeout) }).toBe(true);
  const restoredState = await captureSignatureBenchDefaultState(signatureLab, timeout);
  if (restoredState.controlFingerprint !== defaultState.controlFingerprint) {
    throw new Error(
      `${benchId} reset failed to restore the measured default control fingerprint: ` +
      `${defaultState.controlFingerprint} -> ${restoredState.controlFingerprint}`
    );
  }
  if (restoredState.semanticFingerprint !== defaultState.semanticFingerprint) {
    throw new Error(
      `${benchId} reset failed to restore the measured default mathematical semantics fingerprint: ` +
      `${defaultState.semanticFingerprint} -> ${restoredState.semanticFingerprint}`
    );
  }
  if (restoredState.surfaceStable !== defaultState.surfaceStable) {
    throw new Error(
      `${benchId} reset changed the measured surface stability class: ` +
      `${defaultState.surfaceStable ? "stable" : "dynamic"} -> ` +
      `${restoredState.surfaceStable ? "stable" : "dynamic"}`
    );
  }
  if (
    defaultState.surfaceStable &&
    (!defaultState.surfacePng || !restoredState.surfacePng)
  ) {
    throw new Error(
      `${benchId} reset cannot verify a stable visual model without both default and restored PNG evidence.`
    );
  }
  let surfaceComparison: CaliforniaSignatureResetEvidence["surfaceComparison"] = "dynamic-semantic";
  let surfaceChangedPixelRatio: number | null = null;
  let surfaceEdgeMismatchRatio: number | null = null;
  let surfaceMeanAbsoluteDiffRatio: number | null = null;
  if (
    defaultState.surfaceStable &&
    restoredState.surfaceStable &&
    defaultState.surfacePng &&
    restoredState.surfacePng
  ) {
    const visualComparison = await compareSignatureResetVisuals(
      defaultState.surfacePng,
      restoredState.surfacePng
    );
    if (!visualComparison.withinTolerance) {
      throw new Error(
        `${benchId} reset failed to restore the stable visual model within tolerance: ` +
        `changedPixelRatio=${visualComparison.changedPixelRatio.toFixed(6)} ` +
        `(max=${CALIFORNIA_SIGNATURE_RESET_MAX_CHANGED_PIXEL_RATIO}), ` +
        `edgeMismatchRatio=${visualComparison.edgeMismatchRatio.toFixed(6)} ` +
        `(max=${CALIFORNIA_SIGNATURE_RESET_MAX_EDGE_MISMATCH_RATIO}), ` +
        `meanAbsoluteDiffRatio=${visualComparison.meanAbsoluteDiffRatio.toFixed(6)} ` +
        `(max=${CALIFORNIA_SIGNATURE_RESET_MAX_MEAN_ABSOLUTE_DIFF_RATIO})`
      );
    }
    surfaceComparison = "stable-pixel-tolerance";
    surfaceChangedPixelRatio = visualComparison.changedPixelRatio;
    surfaceEdgeMismatchRatio = visualComparison.edgeMismatchRatio;
    surfaceMeanAbsoluteDiffRatio = visualComparison.meanAbsoluteDiffRatio;
  }
  return {
    activeBenchRestored: true,
    canvasReady: true,
    canvasReplaced: true,
    defaultControlFingerprint: defaultState.controlFingerprint,
    defaultModelFingerprint: defaultState.semanticFingerprint,
    defaultSurfaceFingerprint: defaultState.surfaceFingerprint,
    defaultSurfaceStable: defaultState.surfaceStable,
    restoredControlFingerprint: restoredState.controlFingerprint,
    restoredDefault: true,
    restoredModelFingerprint: restoredState.semanticFingerprint,
    restoredSurfaceFingerprint: restoredState.surfaceFingerprint,
    restoredSurfaceStable: restoredState.surfaceStable,
    surfaceChangedPixelRatio,
    surfaceComparison,
    surfaceEdgeMismatchRatio,
    surfaceMeanAbsoluteDiffRatio
  } satisfies CaliforniaSignatureResetEvidence;
  } finally {
    await Promise.allSettled([oldCanvas.dispose()]);
  }
}

export async function openCaliforniaPremiumDirectLab(
  page: Page,
  lab: CaliforniaQaLab,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS
) {
  await page.goto(premiumDirectLabHref(lab), { timeout: stepTimeout(timeout), waitUntil: "domcontentloaded" });
  const panel = page.locator(`#lab-example-${lab.labId}`).first();
  await expect(panel).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(panel).toHaveAttribute("data-viz-direct-optimized-route", /^(?:|true)$/, {
    timeout: stepTimeout(timeout)
  });
  await expect(panel).toHaveAttribute("data-viz-panel-mode", "lab", { timeout: stepTimeout(timeout) });
  await expect(panel).toHaveAttribute("data-viz-active-lab-id", lab.labId, { timeout: stepTimeout(timeout) });
  const surface = panel.locator("[data-viz-surface]").first();
  await expect(surface).toBeVisible({ timeout: stepTimeout(timeout) });
  const canvasReadySurface = panel.locator('[data-viz-canvas-ready="true"], [data-viz-three-canvas-ready="true"]').first();
  await expect(canvasReadySurface).toBeVisible({ timeout: stepTimeout(timeout) });
  return { panel, surface };
}

type CaliforniaPremiumControlHooks = {
  onPlaying?: () => Promise<void>;
  onReset?: () => Promise<void>;
  structured: true;
};

async function pausePremiumPlaybackAtomically(
  panel: Locator,
  manimSurface: Locator,
  timeout: CaliforniaQaTimeout,
  label: string
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const outcome = await panel.evaluate((root) => {
      const surface = root.querySelector<HTMLElement>("[data-viz-manim-playback-state]");
      const toggle = root.querySelector<HTMLButtonElement>("[data-viz-manim-playback-toggle]");
      if (!surface || !toggle) return "missing-control";
      const state = surface.getAttribute("data-viz-manim-playback-state");
      if (state === "paused") return "already-paused";
      if (state !== "playing") return `invalid-state:${state ?? "missing"}`;
      // State comparison and the toggle dispatch share one browser task, so a
      // natural pause cannot interleave and turn this pause into a restart.
      toggle.click();
      return "pause-dispatched";
    });
    if (outcome === "already-paused") return;
    if (outcome.startsWith("invalid-state:") || outcome === "missing-control") {
      throw new Error(`Premium learner playback ${label} cannot pause atomically: ${outcome}.`);
    }
    try {
      await expect(manimSurface).toHaveAttribute("data-viz-manim-playback-state", "paused", {
        timeout: Math.min(stepTimeout(timeout), 1_000)
      });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  throw new Error(`Premium learner playback ${label} did not reach paused after bounded atomic retries.`);
}

export function smokePremiumDirectControls(
  panel: Locator,
  timeout?: CaliforniaQaTimeout
): Promise<string>;
export function smokePremiumDirectControls(
  panel: Locator,
  timeout: CaliforniaQaTimeout | undefined,
  options: CaliforniaPremiumControlHooks
): Promise<CaliforniaPremiumControlEvidence>;
export async function smokePremiumDirectControls(
  panel: Locator,
  timeout: CaliforniaQaTimeout = DEFAULT_EXPECT_TIMEOUT_MS,
  options?: CaliforniaPremiumControlHooks
) {
  const rawDocumentLanguage = await panel.page().locator("html").getAttribute("lang", {
    timeout: stepTimeout(timeout)
  }) ?? "en";
  const documentLanguage = rawDocumentLanguage.toLowerCase();
  const learnerLabels = documentLanguage.startsWith("zh-hans") || documentLanguage.startsWith("zh-cn")
    ? { playback: /^(?:播放|暂停)$/, reset: /^重置视角$/, timeline: /^动画时间轴$/ }
    : documentLanguage.startsWith("zh")
      ? { playback: /^(?:播放|暫停)$/, reset: /^重設視角$/, timeline: /^動畫時間軸$/ }
      : { playback: /^(?:Play|Pause)$/i, reset: /^Reset camera$/i, timeline: /^Animation timeline$/i };

  const learnerDock = panel.locator("[data-viz-manim-control-dock]").first();
  await expect(learnerDock).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(learnerDock).toHaveAttribute("data-viz-manim-presentation", "learner", {
    timeout: stepTimeout(timeout)
  });
  await expect(learnerDock).toHaveAttribute("data-viz-manim-authoring-controls-visible", "false", {
    timeout: stepTimeout(timeout)
  });
  const authoringControls = panel.locator([
    "[data-viz-manim-authoring-control]",
    "[data-viz-manim-capture-control]",
    '[data-viz-manim-control-row="capture"]',
    "[data-viz-manim-scene-selector-control]",
    "[data-viz-manim-run-from-beat]",
    "[data-viz-manim-capture-screenshot]",
    "[data-viz-manim-capture-video-plan]",
    "[data-viz-manim-debug-control]",
    "[data-viz-manim-history-control]",
    "[data-viz-manim-checkpoint-control]"
  ].join(","));
  const visibleAuthoringControls = await authoringControls.evaluateAll((elements) => elements.filter((element) => {
    const html = element as HTMLElement;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return !html.hidden && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 &&
      rect.width > 0 && rect.height > 0;
  }).length);
  expect(visibleAuthoringControls, "Premium learner presentation must not expose authoring/capture/debug controls.").toBe(0);

  const resetCamera = panel.locator("[data-viz-three-reset-camera]").first();
  await expect(resetCamera).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(resetCamera).toBeEnabled({ timeout: stepTimeout(timeout) });
  await expect(resetCamera).toHaveAccessibleName(learnerLabels.reset, { timeout: stepTimeout(timeout) });
  const playback = panel.locator("[data-viz-manim-playback-toggle]").first();
  const timeline = panel.locator('[data-viz-manim-timeline-scrubber][role="slider"]').first();
  const manimSurface = panel.locator("[data-viz-manim-playback-state]").first();
  await expect(playback).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(playback).toBeEnabled({ timeout: stepTimeout(timeout) });
  await expect(playback).toHaveAccessibleName(learnerLabels.playback, { timeout: stepTimeout(timeout) });
  await expect(timeline).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAccessibleName(learnerLabels.timeline, { timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAttribute("tabindex", /^(?:0|[1-9]\d*)$/, { timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAttribute("aria-valuemin", "0", { timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAttribute("aria-valuemax", "1000", { timeout: stepTimeout(timeout) });
  await expect(manimSurface).toBeVisible({ timeout: stepTimeout(timeout) });
  await expect(manimSurface).toHaveAttribute("data-viz-manim-playback-state", "paused", {
    timeout: stepTimeout(timeout)
  });

  await timeline.focus({ timeout: stepTimeout(timeout) });
  await timeline.press("Home", { timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAttribute("aria-valuenow", "0", { timeout: stepTimeout(timeout) });
  const homeValue = Number(await timeline.getAttribute("aria-valuenow"));
  await timeline.press("End", { timeout: stepTimeout(timeout) });
  await expect(timeline).toHaveAttribute("aria-valuenow", "1000", { timeout: stepTimeout(timeout) });
  const endValue = Number(await timeline.getAttribute("aria-valuenow"));

  await resetCamera.click({ timeout: stepTimeout(timeout) });
  await expect.poll(async () => Number(await timeline.getAttribute("aria-valuenow")), {
    message: "Reset camera must rewind the learner timeline from its completed state.",
    timeout: stepTimeout(timeout)
  }).toBeLessThan(1000);
  await expect(manimSurface).toHaveAttribute("data-viz-manim-playback-state", /^(?:paused|playing)$/, {
    timeout: stepTimeout(timeout)
  });
  await pausePremiumPlaybackAtomically(panel, manimSurface, timeout, "after initial reset");

  const beforePlay = Number(await timeline.getAttribute("aria-valuenow"));
  await playback.click({ timeout: stepTimeout(timeout) });
  await expect(manimSurface).toHaveAttribute("data-viz-manim-playback-state", "playing", {
    timeout: stepTimeout(timeout)
  });
  await expect.poll(async () => Number(await timeline.getAttribute("aria-valuenow")), {
    message: "Premium learner playback must advance the visible timeline.",
    timeout: Math.min(stepTimeout(timeout), 5_000)
  }).toBeGreaterThan(Math.min(999, beforePlay + 20));
  const playingValue = Number(await timeline.getAttribute("aria-valuenow"));
  await options?.onPlaying?.();
  await pausePremiumPlaybackAtomically(panel, manimSurface, timeout, "after playing evidence");

  await resetCamera.click({ timeout: stepTimeout(timeout) });
  await expect.poll(async () => Number(await timeline.getAttribute("aria-valuenow")), {
    message: "Reset camera must rewind the learner timeline after playback.",
    timeout: stepTimeout(timeout)
  }).toBeLessThan(playingValue);
  await expect(manimSurface).toHaveAttribute("data-viz-manim-playback-state", /^(?:paused|playing)$/, {
    timeout: stepTimeout(timeout)
  });
  await pausePremiumPlaybackAtomically(panel, manimSurface, timeout, "after final reset");
  const resetValue = Number(await timeline.getAttribute("aria-valuenow"));
  await options?.onReset?.();
  const finalState = await manimSurface.getAttribute("data-viz-manim-playback-state", {
    timeout: stepTimeout(timeout)
  });
  expect(finalState, "Premium learner smoke must finish in the exact paused state.").toBe("paused");
  const evidence = {
    documentLanguage: rawDocumentLanguage,
    endValue: 1000,
    finalState: "paused",
    homeValue: 0,
    initialState: "paused",
    labelsVerified: true,
    learnerPresentation: true,
    playbackAdvanced: true,
    playingStateObserved: true,
    playingValue,
    playStartValue: beforePlay,
    resetRewound: true,
    resetState: "paused",
    resetValue,
    visibleAuthoringControlCount: 0
  } satisfies CaliforniaPremiumControlEvidence;
  return options?.structured
    ? evidence
    : `premium-controls:timeline=${evidence.playStartValue}->${evidence.playingValue}:state=${evidence.finalState}`;
}

export async function disableQaMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `
  });
}

/**
 * Installs the UI-audit observation hooks before application code whenever the
 * caller invokes this helper before navigation. The immediate installation is
 * also useful for synthetic setContent fixtures. Retaining closed roots is the
 * only DOM-standard way to audit their learner controls after construction.
 */
const californiaVisualizationUiAuditInitPages = new WeakSet<Page>();
let californiaVisualizationViewportAuditSequence = 0;
export const CALIFORNIA_TOUCH_AUDIT_ALGORITHM_SHA256 = sha256Text(
  "california-touch-audit:v2:semantic-inventory:partition:device-pixel-fallback:deep-shadow:" +
  "text-glyph-ranges:structured-viewport-recheck:composed-environment-quiescent-journal"
);

export async function installCaliforniaVisualizationUiAuditInit(page: Page) {
  installCaliforniaVisualizationUiAuditProtocolEpoch(page.context());
  // Keep this browser payload as source text. Passing a nested function through
  // the tsx loader injects its Node-only `__name` helper into the serialized
  // function and makes the supposedly early hook fail in Chromium.
  const installSource = String.raw`(() => {
    const auditGlobal = globalThis;
    const existing = auditGlobal.__californiaVisualizationUiAuditRegistry;
    if (existing) {
      existing.earlyInstalled = true;
      if (!Number.isFinite(existing.environmentEpoch)) existing.environmentEpoch = 0;
      return;
    }
    const registry = {
      directPointerListeners: new WeakMap(),
      earlyInstalled: true,
      environmentEpoch: 0,
      shadowHosts: new Set(),
      shadowModes: new WeakMap(),
      shadowRoots: new WeakMap()
    };
    auditGlobal.__californiaVisualizationUiAuditRegistry = registry;

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      const root = originalAttachShadow.call(this, init);
      registry.environmentEpoch += 1;
      registry.shadowHosts.add(this);
      registry.shadowModes.set(this, init.mode);
      registry.shadowRoots.set(this, root);
      return root;
    };

    const pointerListenerTypes = new Set([
      "click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchend", "touchstart"
    ]);
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, callback, options) {
      const result = originalAddEventListener.call(this, type, callback, options);
      if (callback && pointerListenerTypes.has(String(type).toLowerCase())) {
        const capture = typeof options === "boolean" ? options : Boolean(options && options.capture);
        const key = String(type).toLowerCase() + ":" + (capture ? "capture" : "bubble");
        const listenersByKey = registry.directPointerListeners.get(this) || new Map();
        const listeners = listenersByKey.get(key) || new Set();
        listeners.add(callback);
        listenersByKey.set(key, listeners);
        registry.directPointerListeners.set(this, listenersByKey);
      }
      return result;
    };
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.removeEventListener = function (type, callback, options) {
      const result = originalRemoveEventListener.call(this, type, callback, options);
      if (callback && pointerListenerTypes.has(String(type).toLowerCase())) {
        const capture = typeof options === "boolean" ? options : Boolean(options && options.capture);
        const key = String(type).toLowerCase() + ":" + (capture ? "capture" : "bubble");
        const listenersByKey = registry.directPointerListeners.get(this);
        const listeners = listenersByKey && listenersByKey.get(key);
        if (listeners) {
          listeners.delete(callback);
          if (listeners.size === 0) listenersByKey.delete(key);
          if (listenersByKey.size === 0) registry.directPointerListeners.delete(this);
        }
      }
      return result;
    };
  })();`;

  if (!californiaVisualizationUiAuditInitPages.has(page)) {
    await page.addInitScript({ content: installSource });
    californiaVisualizationUiAuditInitPages.add(page);
  }
  await page.evaluate(installSource);
}

type CaliforniaViewportRecheckPreparation = {
  descriptor: string;
  layoutMutated: boolean;
  prepared: boolean;
  stable: boolean;
};

type CaliforniaViewportRecheckRestoration = {
  descriptor: string;
  environmentRestored: boolean;
  layoutMutated: boolean;
  restored: boolean;
  stable: boolean;
};

type CaliforniaViewportExternalEnvironmentEpochState = {
  activeKeys: Set<string>;
  emulateMediaEpochs: Map<string, number>;
  originalEmulateMediaDescriptor: PropertyDescriptor | undefined;
  originalEmulateMedia: Page["emulateMedia"];
  originalSetViewportSizeDescriptor: PropertyDescriptor | undefined;
  originalSetViewportSize: Page["setViewportSize"];
  protocolConnections: Map<string, CaliforniaViewportProtocolConnectionEpochState>;
  protocolEpochs: Map<string, number>;
  setViewportSizeEpochs: Map<string, number>;
};

type CaliforniaViewportPlaywrightChannelOwner = {
  _type?: string;
};

type CaliforniaViewportPlaywrightConnection = {
  sendMessageToServer: (
    object: CaliforniaViewportPlaywrightChannelOwner,
    method: string,
    params: unknown,
    options: unknown
  ) => Promise<unknown>;
};

type CaliforniaViewportProtocolConnectionEpochState = {
  connection: CaliforniaViewportPlaywrightConnection;
  originalSendMessageToServer: CaliforniaViewportPlaywrightConnection["sendMessageToServer"];
  registrations: Map<string, CaliforniaViewportExternalEnvironmentEpochState>;
  wrappedSendMessageToServer: CaliforniaViewportPlaywrightConnection["sendMessageToServer"];
};

type CaliforniaViewportProtocolContextEpochState = {
  connectionState: CaliforniaViewportProtocolConnectionEpochState;
  installedBeforePageCreation: boolean;
};

const californiaViewportExternalEnvironmentEpochStates =
  new WeakMap<Page, CaliforniaViewportExternalEnvironmentEpochState>();
const californiaViewportProtocolConnectionEpochStates =
  new WeakMap<CaliforniaViewportPlaywrightConnection, CaliforniaViewportProtocolConnectionEpochState>();
const californiaViewportProtocolContextEpochStates =
  new WeakMap<BrowserContext, CaliforniaViewportProtocolContextEpochState>();

const californiaViewportMutatingProtocolMethods = new Set([
  "Emulation.clearDeviceMetricsOverride",
  "Emulation.setAutoDarkModeOverride",
  "Emulation.setDeviceMetricsOverride",
  "Emulation.setDisabledImageTypes",
  "Emulation.setEmulatedMedia",
  "Emulation.setEmulatedVisionDeficiency",
  "Emulation.setFocusEmulationEnabled",
  "Emulation.setLocaleOverride",
  "Emulation.setPageScaleFactor",
  "Emulation.setScriptExecutionDisabled",
  "Emulation.setTimezoneOverride"
]);

export function installCaliforniaVisualizationUiAuditProtocolEpoch(context: BrowserContext) {
  const existing = californiaViewportProtocolContextEpochStates.get(context);
  if (existing) return existing.installedBeforePageCreation;
  const connection = (context as BrowserContext & {
    _connection?: CaliforniaViewportPlaywrightConnection;
  })._connection;
  if (!connection || typeof connection.sendMessageToServer !== "function") {
    throw new Error("California UI audit requires an observable Playwright protocol connection");
  }
  let connectionState = californiaViewportProtocolConnectionEpochStates.get(connection);
  if (!connectionState) {
    const originalSendMessageToServer = connection.sendMessageToServer;
    const registrations = new Map<string, CaliforniaViewportExternalEnvironmentEpochState>();
    const wrappedSendMessageToServer: CaliforniaViewportPlaywrightConnection["sendMessageToServer"] =
      function (this: CaliforniaViewportPlaywrightConnection, object, method, params, options) {
        const protocolMethod = object?._type === "CDPSession" && method === "send" &&
          typeof (params as { method?: unknown } | null)?.method === "string"
          ? (params as { method: string }).method
          : null;
        if (protocolMethod && californiaViewportMutatingProtocolMethods.has(protocolMethod)) {
          for (const [activeKey, activeState] of registrations) {
            activeState.protocolEpochs.set(
              activeKey,
              (activeState.protocolEpochs.get(activeKey) ?? 0) + 1
            );
          }
        }
        return Reflect.apply(originalSendMessageToServer, this, [object, method, params, options]);
      };
    Object.defineProperty(connection, "sendMessageToServer", {
      configurable: true,
      value: wrappedSendMessageToServer,
      writable: true
    });
    connectionState = {
      connection,
      originalSendMessageToServer,
      registrations,
      wrappedSendMessageToServer
    };
    californiaViewportProtocolConnectionEpochStates.set(connection, connectionState);
  }
  const installedBeforePageCreation = context.pages().length === 0;
  californiaViewportProtocolContextEpochStates.set(context, {
    connectionState,
    installedBeforePageCreation
  });
  return installedBeforePageCreation;
}

function installCaliforniaViewportExternalEnvironmentEpoch(page: Page, key: string) {
  installCaliforniaVisualizationUiAuditProtocolEpoch(page.context());
  let state = californiaViewportExternalEnvironmentEpochStates.get(page);
  if (!state) {
    const originalEmulateMediaDescriptor = Object.getOwnPropertyDescriptor(page, "emulateMedia");
    const originalSetViewportSizeDescriptor = Object.getOwnPropertyDescriptor(page, "setViewportSize");
    const originalEmulateMedia = page.emulateMedia;
    const originalSetViewportSize = page.setViewportSize;
    state = {
      activeKeys: new Set(),
      emulateMediaEpochs: new Map(),
      originalEmulateMediaDescriptor,
      originalEmulateMedia,
      originalSetViewportSizeDescriptor,
      originalSetViewportSize,
      protocolConnections: new Map(),
      protocolEpochs: new Map(),
      setViewportSizeEpochs: new Map()
    };
    const installedState = state;
    Object.defineProperty(page, "emulateMedia", {
      configurable: true,
      value: async function (
        this: Page,
        options: Parameters<Page["emulateMedia"]>[0]
      ) {
        for (const activeKey of installedState.activeKeys) {
          installedState.emulateMediaEpochs.set(
            activeKey,
            (installedState.emulateMediaEpochs.get(activeKey) ?? 0) + 1
          );
        }
        return Reflect.apply(installedState.originalEmulateMedia, this, [options]);
      },
      writable: true
    });
    Object.defineProperty(page, "setViewportSize", {
      configurable: true,
      value: async function (
        this: Page,
        viewportSize: Parameters<Page["setViewportSize"]>[0]
      ) {
        for (const activeKey of installedState.activeKeys) {
          installedState.setViewportSizeEpochs.set(
            activeKey,
            (installedState.setViewportSizeEpochs.get(activeKey) ?? 0) + 1
          );
        }
        return Reflect.apply(installedState.originalSetViewportSize, this, [viewportSize]);
      },
      writable: true
    });
    californiaViewportExternalEnvironmentEpochStates.set(page, state);
  }
  state.activeKeys.add(key);
  state.emulateMediaEpochs.set(key, 0);
  state.protocolEpochs.set(key, 0);
  state.setViewportSizeEpochs.set(key, 0);
  const protocolContextState = californiaViewportProtocolContextEpochStates.get(page.context());
  if (!protocolContextState) {
    throw new Error("California UI audit protocol epoch was not installed for the BrowserContext");
  }
  protocolContextState.connectionState.registrations.set(key, state);
  state.protocolConnections.set(key, protocolContextState.connectionState);
}

function readCaliforniaViewportExternalEnvironmentEpoch(page: Page, key: string) {
  const state = californiaViewportExternalEnvironmentEpochStates.get(page);
  return {
    emulateMediaEpoch: state?.emulateMediaEpochs.get(key) ?? 0,
    protocolEpoch: state?.protocolEpochs.get(key) ?? 0,
    setViewportSizeEpoch: state?.setViewportSizeEpochs.get(key) ?? 0
  };
}

function releaseCaliforniaViewportExternalEnvironmentEpoch(page: Page, key: string) {
  const state = californiaViewportExternalEnvironmentEpochStates.get(page);
  if (!state) return;
  state.protocolConnections.get(key)?.registrations.delete(key);
  state.activeKeys.delete(key);
  state.emulateMediaEpochs.delete(key);
  state.protocolConnections.delete(key);
  state.protocolEpochs.delete(key);
  state.setViewportSizeEpochs.delete(key);
  if (state.activeKeys.size > 0) return;
  if (state.originalEmulateMediaDescriptor) {
    Object.defineProperty(page, "emulateMedia", state.originalEmulateMediaDescriptor);
  } else {
    Reflect.deleteProperty(page, "emulateMedia");
  }
  if (state.originalSetViewportSizeDescriptor) {
    Object.defineProperty(page, "setViewportSize", state.originalSetViewportSizeDescriptor);
  } else {
    Reflect.deleteProperty(page, "setViewportSize");
  }
  californiaViewportExternalEnvironmentEpochStates.delete(page);
}

async function prepareCaliforniaViewportRecheck(
  root: Locator,
  viewportAuditToken: string,
  candidateIndex: number
): Promise<CaliforniaViewportRecheckPreparation> {
  const page = root.page();
  const externalEpochKey = `${viewportAuditToken}:${candidateIndex}`;
  installCaliforniaViewportExternalEnvironmentEpoch(page, externalEpochKey);
  let prepared: CaliforniaViewportRecheckPreparation;
  try {
    prepared = await root.evaluate(async (_element, options) => {

    type AuditRegistry = {
      environmentEpoch: number;
      shadowHosts: Set<Element>;
      shadowRoots: WeakMap<Element, ShadowRoot>;
    };
    type ViewportAuditCandidate = {
      activationTargets: HTMLElement[];
      control: HTMLElement;
      initialFingerprint?: string;
      initialRect?: DOMRect;
      target: HTMLElement;
      activePreparation?: {
        disconnect: () => void;
        restore: () => Promise<CaliforniaViewportRecheckRestoration>;
      };
    };
    type ViewportAuditSession = {
      candidates: ViewportAuditCandidate[];
      root: HTMLElement;
    };
    type AuditRoot = Document | ShadowRoot;
    type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

    const auditGlobal = globalThis as typeof globalThis & {
      __californiaVisualizationUiAuditRegistry?: AuditRegistry;
      __californiaVisualizationViewportAudits?: Map<string, ViewportAuditSession>;
    };
    const auditRegistry = auditGlobal.__californiaVisualizationUiAuditRegistry;
    const session = auditGlobal.__californiaVisualizationViewportAudits?.get(options.viewportAuditToken);
    const candidate = session?.candidates[options.candidateIndex];
    const describe = (target: Element | undefined) => {
      if (!target) return `candidate-${options.candidateIndex}`;
      const text = (target.getAttribute("aria-label") ?? target.textContent ?? "")
        .replace(/\s+/g, " ").trim().slice(0, 70);
      return `${target.tagName.toLowerCase()}${text ? `(${text})` : ""}`;
    };
    if (!session || !candidate || !candidate.control.isConnected || !candidate.target.isConnected) {
      return { descriptor: describe(candidate?.control), layoutMutated: false, prepared: false, stable: false };
    }

    const registryForDocument = (targetDocument: Document) =>
      (targetDocument.defaultView as (Window & typeof globalThis & {
        __californiaVisualizationUiAuditRegistry?: AuditRegistry;
      }) | null)?.__californiaVisualizationUiAuditRegistry;
    const retainedShadowRoot = (target: Element) =>
      target.shadowRoot ?? registryForDocument(target.ownerDocument)?.shadowRoots.get(target) ?? null;
    const collectAuditDocuments = () => {
      const documents: Document[] = [document];
      const seen = new Set<Document>(documents);
      for (let documentIndex = 0; documentIndex < documents.length; documentIndex += 1) {
        const currentDocument = documents[documentIndex];
        const currentRoots: AuditRoot[] = [currentDocument];
        const rootSet = new Set<AuditRoot>(currentRoots);
        const currentRegistry = registryForDocument(currentDocument);
        const addRoot = (rootToAdd: ShadowRoot | null | undefined) => {
          if (rootToAdd && !rootSet.has(rootToAdd)) {
            rootSet.add(rootToAdd);
            currentRoots.push(rootToAdd);
          }
        };
        for (const host of currentRegistry?.shadowHosts ?? []) addRoot(retainedShadowRoot(host));
        for (let rootIndex = 0; rootIndex < currentRoots.length; rootIndex += 1) {
          for (const element of Array.from(currentRoots[rootIndex].querySelectorAll("*"))) {
            addRoot(retainedShadowRoot(element));
            if (element.localName !== "iframe" && element.localName !== "frame") continue;
            try {
              const childDocument = (element as HTMLIFrameElement).contentDocument;
              if (childDocument?.defaultView && !seen.has(childDocument)) {
                void childDocument.defaultView.location.href;
                seen.add(childDocument);
                documents.push(childDocument);
              }
            } catch {
              // Cross-origin frames are outside the reversible same-origin environment contract.
            }
          }
        }
      }
      return documents;
    };
    const collectAuditRoots = () => {
      const roots: AuditRoot[] = [];
      const seen = new Set<AuditRoot>();
      const add = (rootToAdd: AuditRoot | null | undefined) => {
        if (rootToAdd && !seen.has(rootToAdd)) {
          seen.add(rootToAdd);
          roots.push(rootToAdd);
        }
      };
      for (const currentDocument of collectAuditDocuments()) {
        add(currentDocument);
        const currentRegistry = registryForDocument(currentDocument);
        for (const host of currentRegistry?.shadowHosts ?? []) add(retainedShadowRoot(host));
        for (let rootIndex = 0; rootIndex < roots.length; rootIndex += 1) {
          const auditRoot = roots[rootIndex];
          const rootDocument = isDocumentRoot(auditRoot) ? auditRoot : auditRoot.ownerDocument;
          if (rootDocument !== currentDocument) continue;
          for (const element of Array.from(auditRoot.querySelectorAll("*"))) {
            add(retainedShadowRoot(element));
          }
        }
      }
      return roots;
    };
    const allElements = (roots: AuditRoot[]) => {
      const elements = new Set<Element>();
      for (const auditRoot of roots) {
        for (const element of Array.from(auditRoot.querySelectorAll("*"))) elements.add(element);
      }
      return Array.from(elements);
    };
    const isDocumentRoot = (auditRoot: AuditRoot): auditRoot is Document =>
      auditRoot.nodeType === Node.DOCUMENT_NODE;
    const rootMarkup = (auditRoot: AuditRoot) => isDocumentRoot(auditRoot)
      ? auditRoot.documentElement?.outerHTML ?? ""
      : auditRoot.innerHTML;
    const rootStyleSheets = (auditRoot: AuditRoot) =>
      Array.from(auditRoot.styleSheets);
    const composedParentElement = (target: Element): Element | null => {
      if (target.parentElement) return target.parentElement;
      const treeRoot = target.getRootNode();
      return treeRoot.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in treeRoot
        ? (treeRoot as ShadowRoot).host
        : null;
    };
    const candidateFingerprint = () => {
      const style = getComputedStyle(candidate.target);
      return JSON.stringify({
        controlIdentity: candidate.control.isConnected,
        controlOffset: [
          candidate.control.offsetLeft,
          candidate.control.offsetTop,
          candidate.control.offsetWidth,
          candidate.control.offsetHeight
        ],
        targetIdentity: candidate.target.isConnected,
        targetOffset: [
          candidate.target.offsetLeft,
          candidate.target.offsetTop,
          candidate.target.offsetWidth,
          candidate.target.offsetHeight
        ],
        targetStyle: [
          style.display,
          style.position,
          style.transform,
          style.width,
          style.height,
          style.marginLeft,
          style.marginTop,
          style.font,
          style.fontFamily,
          style.fontSize,
          style.fontStretch,
          style.fontStyle,
          style.fontVariationSettings,
          style.fontWeight,
          style.letterSpacing,
          style.lineHeight,
          style.textIndent,
          style.writingMode,
          style.direction,
          style.getPropertyValue("zoom")
        ]
      });
    };
    const mediaQueries = new Set([
      "all",
      "print",
      "screen",
      "(prefers-color-scheme: dark)",
      "(prefers-color-scheme: light)",
      "(prefers-contrast: more)",
      "(prefers-reduced-motion: reduce)",
      "(forced-colors: active)",
      "(pointer: coarse)",
      "(hover: hover)"
    ]);
    const environmentFingerprint = () => JSON.stringify(collectAuditDocuments().map((currentDocument) => {
      const currentWindow = currentDocument.defaultView;
      return {
        characterSet: currentDocument.characterSet,
        compatMode: currentDocument.compatMode,
        contentType: currentDocument.contentType,
        devicePixelRatio: currentWindow?.devicePixelRatio ?? null,
        documentElement: currentDocument.documentElement?.tagName ?? null,
        fullscreenElement: currentDocument.fullscreenElement?.tagName ?? null,
        innerHeight: currentWindow?.innerHeight ?? null,
        innerWidth: currentWindow?.innerWidth ?? null,
        media: Array.from(mediaQueries).map((query) => [
          query,
          currentWindow?.matchMedia(query).matches ?? null
        ]),
        orientation: [
          currentWindow?.screen.orientation?.type ?? "",
          currentWindow?.screen.orientation?.angle ?? 0
        ],
        scrollingElement: currentDocument.scrollingElement?.tagName ?? null,
        url: currentDocument.location.href,
        visualViewport: currentWindow?.visualViewport ? [
          currentWindow.visualViewport.width,
          currentWindow.visualViewport.height,
          currentWindow.visualViewport.scale,
          currentWindow.visualViewport.offsetLeft,
          currentWindow.visualViewport.offsetTop
        ] : null
      };
    }));
    const deepActiveChainFor = (currentDocument: Document) => {
      const chain: Element[] = [];
      let active = currentDocument.activeElement;
      const visited = new Set<Element>();
      while (active && !visited.has(active) && visited.size < 256) {
        visited.add(active);
        chain.push(active);
        const nested = retainedShadowRoot(active)?.activeElement ?? null;
        if (!nested) break;
        active = nested;
      }
      return chain;
    };
    const deepActiveChains = () => collectAuditDocuments().map((currentDocument) => ({
      chain: deepActiveChainFor(currentDocument),
      document: currentDocument
    }));
    const deepStructuredEqual = (
      left: unknown,
      right: unknown,
      seenLeft = new Map<object, object>(),
      seenRight = new Map<object, object>()
    ): boolean => {
      if (Object.is(left, right)) return true;
      if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false;
      const mappedRight = seenLeft.get(left);
      const mappedLeft = seenRight.get(right);
      if (mappedRight || mappedLeft) return mappedRight === right && mappedLeft === left;
      seenLeft.set(left, right);
      seenRight.set(right, left);
      const leftTag = Object.prototype.toString.call(left);
      if (leftTag !== Object.prototype.toString.call(right)) return false;
      if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
      if (left instanceof RegExp && right instanceof RegExp) {
        return left.source === right.source && left.flags === right.flags && left.lastIndex === right.lastIndex;
      }
      if (left instanceof Map && right instanceof Map) {
        if (left.size !== right.size) return false;
        const leftEntries = Array.from(left.entries());
        const rightEntries = Array.from(right.entries());
        return leftEntries.every(([key, value], index) =>
          deepStructuredEqual(key, rightEntries[index][0], seenLeft, seenRight) &&
          deepStructuredEqual(value, rightEntries[index][1], seenLeft, seenRight)
        );
      }
      if (left instanceof Set && right instanceof Set) {
        if (left.size !== right.size) return false;
        const leftValues = Array.from(left.values());
        const rightValues = Array.from(right.values());
        return leftValues.every((value, index) =>
          deepStructuredEqual(value, rightValues[index], seenLeft, seenRight)
        );
      }
      if (left instanceof ArrayBuffer && right instanceof ArrayBuffer) {
        if (left.byteLength !== right.byteLength) return false;
        const leftBytes = new Uint8Array(left);
        const rightBytes = new Uint8Array(right);
        return leftBytes.every((value, index) => value === rightBytes[index]);
      }
      if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right)) {
        if (left.constructor !== right.constructor || left.byteLength !== right.byteLength) return false;
        const leftBytes = new Uint8Array(left.buffer, left.byteOffset, left.byteLength);
        const rightBytes = new Uint8Array(right.buffer, right.byteOffset, right.byteLength);
        return leftBytes.every((value, index) => value === rightBytes[index]);
      }
      if (left instanceof Blob && right instanceof Blob) {
        return left.size === right.size && left.type === right.type &&
          (!(left instanceof File) || (right instanceof File &&
            left.name === right.name && left.lastModified === right.lastModified));
      }
      if (left instanceof Error && right instanceof Error &&
          (left.name !== right.name || left.message !== right.message)) return false;
      if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;
      const leftKeys = Reflect.ownKeys(left);
      const rightKeys = Reflect.ownKeys(right);
      if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !rightKeys.includes(key))) return false;
      return leftKeys.every((key) => deepStructuredEqual(
        (left as Record<PropertyKey, unknown>)[key],
        (right as Record<PropertyKey, unknown>)[key],
        seenLeft,
        seenRight
      ));
    };

    const auditDocuments = collectAuditDocuments();
    const auditRoots = collectAuditRoots();
    const elements = allElements(auditRoots);
    const initialRect = candidate.initialRect ?? candidate.target.getBoundingClientRect();
    const initialCandidateFingerprint = candidate.initialFingerprint ?? candidateFingerprint();
    const intendedScrollElements = new Set<Element>();
    let intendedAncestor: Element | null = candidate.target;
    while (intendedAncestor && !intendedScrollElements.has(intendedAncestor) && intendedScrollElements.size < 256) {
      intendedScrollElements.add(intendedAncestor);
      intendedAncestor = composedParentElement(intendedAncestor);
    }
    if (document.documentElement) intendedScrollElements.add(document.documentElement);
    if (document.body) intendedScrollElements.add(document.body);
    if (document.scrollingElement) intendedScrollElements.add(document.scrollingElement);
    for (const currentDocument of auditDocuments) {
      if (currentDocument.documentElement) intendedScrollElements.add(currentDocument.documentElement);
      if (currentDocument.body) intendedScrollElements.add(currentDocument.body);
      if (currentDocument.scrollingElement) intendedScrollElements.add(currentDocument.scrollingElement);
    }

    const rootStates = auditRoots.map((auditRoot) => ({
      adoptedStyleSheets: Array.from(auditRoot.adoptedStyleSheets),
      markup: rootMarkup(auditRoot),
      root: auditRoot,
      styleSheets: rootStyleSheets(auditRoot)
    }));
    const styleElements = elements.filter((element): element is HTMLStyleElement =>
      element.localName === "style"
    ).map((element) => ({ element, text: element.textContent ?? "" }));
    const allSheets = new Set<CSSStyleSheet>();
    for (const rootState of rootStates) {
      for (const sheet of rootState.styleSheets) allSheets.add(sheet);
      for (const sheet of rootState.adoptedStyleSheets) allSheets.add(sheet);
    }
    const readRules = (sheet: CSSStyleSheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return null;
      }
    };
    const sheetStates = Array.from(allSheets).map((sheet) => ({
      disabled: sheet.disabled,
      mediaText: sheet.media.mediaText,
      rules: readRules(sheet),
      sheet
    }));
    const collectMediaQueries = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if ("conditionText" in rule && typeof rule.conditionText === "string" && rule.conditionText.trim()) {
          mediaQueries.add(rule.conditionText);
        }
        if ("media" in rule && rule.media instanceof MediaList && rule.media.mediaText.trim()) {
          mediaQueries.add(rule.media.mediaText);
        }
        if ("cssRules" in rule) {
          try {
            collectMediaQueries((rule as CSSGroupingRule).cssRules);
          } catch {
            // Cross-origin nested rules remain represented by their inaccessible sheet state.
          }
        }
      }
    };
    for (const sheetState of sheetStates) {
      try {
        collectMediaQueries(sheetState.sheet.cssRules);
        if (sheetState.sheet.media.mediaText.trim()) mediaQueries.add(sheetState.sheet.media.mediaText);
      } catch {
        // Cross-origin stylesheets cannot be reversibly inspected and are compared by identity.
      }
    }
    const scrollerStates = elements.filter((element) =>
      element === document.documentElement || element === document.body ||
      element === document.scrollingElement || element.scrollLeft !== 0 || element.scrollTop !== 0 ||
      element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
    ).map((element) => ({ element, left: element.scrollLeft, top: element.scrollTop }));
    const readSelection = (element: HTMLInputElement | HTMLTextAreaElement) => {
      try {
        return {
          direction: element.selectionDirection,
          end: element.selectionEnd,
          start: element.selectionStart
        };
      } catch {
        return { direction: null, end: null, start: null };
      }
    };
    const isInput = (element: Element): element is HTMLInputElement => element.localName === "input";
    const isSelect = (element: Element): element is HTMLSelectElement => element.localName === "select";
    const isTextarea = (element: Element): element is HTMLTextAreaElement => element.localName === "textarea";
    const formStates = elements.filter((element): element is FormControl =>
      isInput(element) || isSelect(element) || isTextarea(element)
    ).map((element) => ({
      checked: isInput(element) ? element.checked : null,
      defaultChecked: isInput(element) ? element.defaultChecked : null,
      defaultValue: isSelect(element) ? null : element.defaultValue,
      element,
      indeterminate: isInput(element) ? element.indeterminate : null,
      options: isSelect(element)
        ? Array.from(element.options).map((option) => ({
            defaultSelected: option.defaultSelected,
            option,
            selected: option.selected
          }))
        : [],
      selectedIndex: isSelect(element) ? element.selectedIndex : null,
      selection: isSelect(element) ? null : readSelection(element),
      value: element.value
    }));
    const dialogStates = elements.filter((element): element is HTMLDialogElement =>
      element.localName === "dialog"
    ).map((element) => ({
      element,
      modal: element.matches(":modal"),
      open: element.open,
      returnValue: element.returnValue
    }));
    const popoverStates = elements.filter((element): element is HTMLElement =>
      element.hasAttribute("popover")
    ).map((element) => ({
      element,
      open: element.matches(":popover-open")
    }));
    const fontDescriptorKeys = [
      "ascentOverride", "descentOverride", "display", "family", "featureSettings",
      "lineGapOverride", "sizeAdjust", "stretch", "style", "unicodeRange", "variant",
      "variationSettings", "weight"
    ] as const;
    const readFontDescriptors = (font: FontFace) => Object.fromEntries(
      fontDescriptorKeys.map((key) => [key, String(
        (font as unknown as Record<string, unknown>)[key] ?? ""
      )])
    ) as Record<(typeof fontDescriptorKeys)[number], string>;
    const fontSetStates = auditDocuments.map((currentDocument) => ({
      document: currentDocument,
      fonts: Array.from(currentDocument.fonts)
    }));
    const fontStates = fontSetStates.flatMap((setState) => setState.fonts.map((font) => ({
      descriptors: readFontDescriptors(font),
      font,
      set: setState.document.fonts
    })));
    const initialFocusChains = deepActiveChains();
    const readCanvasFingerprint = (canvas: HTMLCanvasElement) => {
      try {
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    const canvasStates = elements.filter((element): element is HTMLCanvasElement =>
      element.localName === "canvas"
    ).map((canvas) => {
      let bitmap: ImageData | null = null;
      try {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (context) bitmap = context.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        bitmap = null;
      }
      return {
        bitmap,
        canvas,
        fingerprint: readCanvasFingerprint(canvas),
        height: canvas.height,
        width: canvas.width
      };
    });
    const mediaStates = elements.filter((element): element is HTMLMediaElement =>
      element.localName === "audio" || element.localName === "video"
    ).map((media) => ({
      currentTime: Number.isFinite(media.currentTime) ? media.currentTime : null,
      defaultMuted: media.defaultMuted,
      defaultPlaybackRate: media.defaultPlaybackRate,
      loop: media.loop,
      media,
      muted: media.muted,
      paused: media.paused,
      playbackRate: media.playbackRate,
      preservesPitch: media.preservesPitch,
      volume: media.volume
    }));
    const animationSet = new Set<Animation>();
    for (const currentDocument of auditDocuments) {
      try {
        for (const animation of currentDocument.getAnimations()) animationSet.add(animation);
      } catch {
        // A detached document is rejected by the environment identity checks below.
      }
    }
    for (const auditRoot of auditRoots) {
      if (isDocumentRoot(auditRoot)) continue;
      try {
        for (const animation of auditRoot.getAnimations()) animationSet.add(animation);
      } catch {
        // Retained roots without animation enumeration fail through their DOM/style snapshots.
      }
    }
    const animationStates = Array.from(animationSet).map((animation) => ({
      animation,
      currentTime: animation.currentTime,
      pending: animation.pending,
      playbackRate: animation.playbackRate,
      playState: animation.playState,
      replaceState: animation.replaceState,
      startTime: animation.startTime,
      timelineTime: animation.timeline?.currentTime ?? null
    }));
    const documentWindowStates = auditDocuments.map((currentDocument) => ({
      document: currentDocument,
      window: currentDocument.defaultView,
      x: currentDocument.defaultView?.scrollX ?? 0,
      y: currentDocument.defaultView?.scrollY ?? 0
    }));
    const initialHistoryLength = history.length;
    const initialHistoryState = structuredClone(history.state);
    const initialUrl = location.href;
    const initialEnvironmentFingerprint = environmentFingerprint();
    const initialEnvironmentEpoch = auditDocuments.reduce((total, currentDocument) =>
      total + (registryForDocument(currentDocument)?.environmentEpoch ?? 0), 0
    );
    const initialWindowScroll = { x: window.scrollX, y: window.scrollY };
    const initialFullscreenElement = document.fullscreenElement;
    const initialRootIdentity = session.root;

    const journal = {
      asyncExecutionEpoch: 0,
      asyncScheduleEpoch: 0,
      auditActive: true,
      auditRecords: [] as MutationRecord[],
      externalRestoreRecords: [] as MutationRecord[],
      internalAsyncDepth: 0,
      internalMutationDepth: 0,
      lineageDepth: 0,
      mediaChangeEpoch: 0,
      mutationEpoch: 0,
      nextAsyncTaskId: 1,
      nonDomMutationEpoch: 0,
      ownedRestoreRecords: [] as MutationRecord[],
      pendingAsyncTasks: new Set<number>(),
      phase: "audit" as "audit" | "restore"
    };
    const instrumentationCleanups: Array<() => void> = [];
    const markNonDomMutation = () => {
      if (journal.internalMutationDepth === 0) journal.nonDomMutationEpoch += 1;
    };
    const withInternalMutation = <T,>(action: () => T): T => {
      journal.internalMutationDepth += 1;
      try {
        return action();
      } finally {
        journal.internalMutationDepth -= 1;
      }
    };
    const patchSetter = (prototype: object | null | undefined, property: PropertyKey) => {
      if (!prototype) return;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor?.configurable || typeof descriptor.set !== "function") return;
      const originalSet = descriptor.set;
      Object.defineProperty(prototype, property, {
        ...descriptor,
        set(this: unknown, value: unknown) {
          markNonDomMutation();
          return Reflect.apply(originalSet, this, [value]);
        }
      });
      instrumentationCleanups.push(() => Object.defineProperty(prototype, property, descriptor));
    };
    const patchMethod = (prototype: object | null | undefined, property: PropertyKey) => {
      if (!prototype) return;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
      if (!descriptor?.configurable || typeof descriptor.value !== "function") return;
      const original = descriptor.value as (...args: unknown[]) => unknown;
      Object.defineProperty(prototype, property, {
        ...descriptor,
        value: function (this: unknown, ...args: unknown[]) {
          markNonDomMutation();
          return Reflect.apply(original, this, args);
        }
      });
      instrumentationCleanups.push(() => Object.defineProperty(prototype, property, descriptor));
    };
    const installStyleDeclarationProxy = (realm: Window & typeof globalThis) => {
      const proxyCache = new WeakMap<object, object>();
      const styleRuleConstructors = [
        "CSSStyleRule", "CSSFontFaceRule", "CSSKeyframeRule", "CSSPageRule",
        "CSSPositionTryRule", "CSSPropertyRule", "CSSStartingStyleRule"
      ];
      for (const constructorName of styleRuleConstructors) {
        const constructorValue = (realm as unknown as Record<string, unknown>)[constructorName] as
          { prototype?: object } | undefined;
        const prototype = constructorValue?.prototype;
        if (!prototype) continue;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "style");
        if (!descriptor?.configurable || typeof descriptor.get !== "function") continue;
        const originalGet = descriptor.get;
        Object.defineProperty(prototype, "style", {
          ...descriptor,
          get(this: unknown) {
            const declaration = Reflect.apply(originalGet, this, []) as object;
            const cached = proxyCache.get(declaration);
            if (cached) return cached;
            const proxy = new Proxy(declaration, {
              get(target, property) {
                const value = Reflect.get(target, property, target);
                if (typeof value !== "function") return value;
                return (...args: unknown[]) => {
                  if (property === "setProperty" || property === "removeProperty") markNonDomMutation();
                  return Reflect.apply(value as (...methodArgs: unknown[]) => unknown, target, args);
                };
              },
              set(target, property, value) {
                markNonDomMutation();
                return Reflect.set(target, property, value, target);
              }
            });
            proxyCache.set(declaration, proxy);
            return proxy;
          }
        });
        instrumentationCleanups.push(() => Object.defineProperty(prototype, "style", descriptor));
      }
    };
    type NativeSchedulers = {
      requestFrame: (callback: FrameRequestCallback) => number;
      setTimer: (callback: TimerHandler, delay?: number, ...args: unknown[]) => number;
    };
    const installRealmInstrumentation = (realm: Window & typeof globalThis): NativeSchedulers => {
      const realmRecord = realm as unknown as Record<string, unknown>;
      const nativeSetTimeout = realm.setTimeout.bind(realm);
      const nativeSetInterval = realm.setInterval.bind(realm);
      const nativeClearTimeout = realm.clearTimeout.bind(realm);
      const nativeClearInterval = realm.clearInterval.bind(realm);
      const nativeRequestAnimationFrame = realm.requestAnimationFrame.bind(realm);
      const nativeCancelAnimationFrame = realm.cancelAnimationFrame.bind(realm);
      const nativeQueueMicrotask = realm.queueMicrotask.bind(realm);
      const taskByHandle = new Map<number, number>();
      const shouldTrackAsync = () => journal.auditActive &&
        (journal.internalAsyncDepth === 0 || journal.lineageDepth > 0);
      const wrapCallback = (
        callback: TimerHandler | FrameRequestCallback | VoidFunction,
        taskId: number,
        recurring: boolean
      ) => (...args: unknown[]) => {
        if (!recurring) journal.pendingAsyncTasks.delete(taskId);
        journal.lineageDepth += 1;
        journal.asyncExecutionEpoch += 1;
        try {
          if (typeof callback === "function") return Reflect.apply(callback, realm, args);
          return realm.eval(String(callback));
        } finally {
          journal.lineageDepth -= 1;
        }
      };
      const registerTask = () => {
        const taskId = journal.nextAsyncTaskId++;
        journal.asyncScheduleEpoch += 1;
        journal.pendingAsyncTasks.add(taskId);
        return taskId;
      };
      const patchedSetTimeout = (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (!shouldTrackAsync()) return nativeSetTimeout(callback, delay, ...args);
        const taskId = registerTask();
        const handle = nativeSetTimeout(wrapCallback(callback, taskId, false), delay, ...args);
        taskByHandle.set(handle, taskId);
        return handle;
      };
      const patchedSetInterval = (callback: TimerHandler, delay?: number, ...args: unknown[]) => {
        if (!shouldTrackAsync()) return nativeSetInterval(callback, delay, ...args);
        const taskId = registerTask();
        const handle = nativeSetInterval(wrapCallback(callback, taskId, true), delay, ...args);
        taskByHandle.set(handle, taskId);
        return handle;
      };
      const clearTrackedTask = (handle: number | undefined) => {
        if (handle === undefined) return;
        const taskId = taskByHandle.get(handle);
        if (taskId !== undefined) journal.pendingAsyncTasks.delete(taskId);
        taskByHandle.delete(handle);
      };
      const patchedRequestAnimationFrame = (callback: FrameRequestCallback) => {
        if (!shouldTrackAsync()) return nativeRequestAnimationFrame(callback);
        const taskId = registerTask();
        const handle = nativeRequestAnimationFrame(wrapCallback(callback, taskId, false) as FrameRequestCallback);
        taskByHandle.set(handle, taskId);
        return handle;
      };
      realm.setTimeout = patchedSetTimeout as typeof realm.setTimeout;
      realm.setInterval = patchedSetInterval as typeof realm.setInterval;
      realm.clearTimeout = ((handle?: number) => {
        clearTrackedTask(handle);
        return nativeClearTimeout(handle);
      }) as typeof realm.clearTimeout;
      realm.clearInterval = ((handle?: number) => {
        clearTrackedTask(handle);
        return nativeClearInterval(handle);
      }) as typeof realm.clearInterval;
      realm.requestAnimationFrame = patchedRequestAnimationFrame;
      realm.cancelAnimationFrame = ((handle: number) => {
        clearTrackedTask(handle);
        nativeCancelAnimationFrame(handle);
      });
      realm.queueMicrotask = ((callback: VoidFunction) => {
        if (!shouldTrackAsync()) return nativeQueueMicrotask(callback);
        const taskId = registerTask();
        nativeQueueMicrotask(wrapCallback(callback, taskId, false) as VoidFunction);
      });
      instrumentationCleanups.push(() => {
        realm.setTimeout = nativeSetTimeout;
        realm.setInterval = nativeSetInterval;
        realm.clearTimeout = nativeClearTimeout;
        realm.clearInterval = nativeClearInterval;
        realm.requestAnimationFrame = nativeRequestAnimationFrame;
        realm.cancelAnimationFrame = nativeCancelAnimationFrame;
        realm.queueMicrotask = nativeQueueMicrotask;
      });

      const animationPrototype = (realmRecord.Animation as { prototype?: object } | undefined)?.prototype;
      for (const property of ["currentTime", "playbackRate", "startTime"]) patchSetter(animationPrototype, property);
      for (const method of ["cancel", "finish", "pause", "persist", "play", "reverse", "updatePlaybackRate"] ) {
        patchMethod(animationPrototype, method);
      }
      const fontFacePrototype = (realmRecord.FontFace as { prototype?: object } | undefined)?.prototype;
      for (const property of fontDescriptorKeys) patchSetter(fontFacePrototype, property);
      const mediaPrototype = (realmRecord.HTMLMediaElement as { prototype?: object } | undefined)?.prototype;
      for (const property of [
        "currentTime", "defaultMuted", "defaultPlaybackRate", "loop", "muted", "playbackRate",
        "preservesPitch", "volume"
      ]) patchSetter(mediaPrototype, property);
      for (const method of ["load", "pause", "play"]) patchMethod(mediaPrototype, method);
      const styleSheetPrototype = (realmRecord.CSSStyleSheet as { prototype?: object } | undefined)?.prototype;
      for (const method of ["addRule", "deleteRule", "insertRule", "removeRule", "replace", "replaceSync"]) {
        patchMethod(styleSheetPrototype, method);
      }
      const declarationPrototype = (realmRecord.CSSStyleDeclaration as { prototype?: object } | undefined)?.prototype;
      patchSetter(declarationPrototype, "cssText");
      patchMethod(declarationPrototype, "removeProperty");
      patchMethod(declarationPrototype, "setProperty");
      installStyleDeclarationProxy(realm);
      const twoDPrototype = (realmRecord.CanvasRenderingContext2D as { prototype?: object } | undefined)?.prototype;
      for (const property of Object.getOwnPropertyNames(twoDPrototype ?? {})) {
        const descriptor = Object.getOwnPropertyDescriptor(twoDPrototype ?? {}, property);
        if (descriptor?.set) patchSetter(twoDPrototype, property);
      }
      for (const method of [
        "arc", "arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath",
        "drawFocusIfNeeded", "drawImage", "ellipse", "fill", "fillRect", "fillText", "lineTo",
        "moveTo", "putImageData", "quadraticCurveTo", "rect", "reset", "resetTransform", "restore",
        "rotate", "roundRect", "save", "scale", "setLineDash", "setTransform", "stroke", "strokeRect",
        "strokeText", "transform", "translate"
      ]) patchMethod(twoDPrototype, method);
      for (const constructorName of ["WebGLRenderingContext", "WebGL2RenderingContext"] ) {
        const prototype = (realmRecord[constructorName] as { prototype?: object } | undefined)?.prototype;
        for (const property of Object.getOwnPropertyNames(prototype ?? {})) {
          if (typeof Object.getOwnPropertyDescriptor(prototype ?? {}, property)?.value === "function" &&
              !property.startsWith("get") && !property.startsWith("is") && property !== "readPixels") {
            patchMethod(prototype, property);
          }
        }
      }
      return {
        requestFrame: nativeRequestAnimationFrame,
        setTimer: nativeSetTimeout
      };
    };
    let mainSchedulers: NativeSchedulers | null = null;
    for (const currentDocument of auditDocuments) {
      const currentWindow = currentDocument.defaultView as (Window & typeof globalThis) | null;
      if (!currentWindow) continue;
      const schedulers = installRealmInstrumentation(currentWindow);
      if (currentDocument === document) mainSchedulers = schedulers;
    }
    if (!mainSchedulers) throw new Error("viewport audit main realm schedulers unavailable");
    const mediaListenerCleanups: Array<() => void> = [];
    for (const currentDocument of auditDocuments) {
      const currentWindow = currentDocument.defaultView;
      if (!currentWindow) continue;
      for (const query of mediaQueries) {
        const mediaQueryList = currentWindow.matchMedia(query);
        const listener = (event: MediaQueryListEvent) => {
          journal.mediaChangeEpoch += 1;
        };
        mediaQueryList.addEventListener("change", listener);
        mediaListenerCleanups.push(() => mediaQueryList.removeEventListener("change", listener));
      }
    }
    const observerEntries = auditRoots.map((auditRoot) => {
      const rootDocument = isDocumentRoot(auditRoot) ? auditRoot : auditRoot.ownerDocument;
      const Observer = rootDocument.defaultView?.MutationObserver ?? MutationObserver;
      const observer = new Observer((records) => {
        journal.mutationEpoch += records.length;
        if (journal.phase === "audit") journal.auditRecords.push(...records);
        else journal.externalRestoreRecords.push(...records);
      });
      observer.observe(auditRoot, {
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true
      });
      return { observer, root: auditRoot };
    });
    const takeObserverRecords = () => observerEntries.flatMap(({ observer }) => observer.takeRecords());
    const internalAuditMutation = (record: MutationRecord) => {
      if (record.type !== "childList") return false;
      const changedNodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
      return changedNodes.length > 0 && changedNodes.every((node) =>
        node instanceof Element && node.hasAttribute("data-california-visualization-audit-mirror")
      );
    };
    const drainToCurrentPhase = () => {
      const records = takeObserverRecords();
      journal.mutationEpoch += records.length;
      if (journal.phase === "audit") journal.auditRecords.push(...records);
      else journal.externalRestoreRecords.push(...records);
    };
    const performOwnedMutation = (
      action: () => void,
      ownsRecord: (record: MutationRecord) => boolean = () => false
    ) => {
      drainToCurrentPhase();
      try {
        withInternalMutation(action);
      } finally {
        const records = takeObserverRecords();
        journal.mutationEpoch += records.length;
        for (const record of records) {
          if (ownsRecord(record)) journal.ownedRestoreRecords.push(record);
          else journal.externalRestoreRecords.push(record);
        }
      }
    };
    const restoreMutationRecords = (records: MutationRecord[]) => {
      let restored = true;
      for (const record of [...records].reverse()) {
        if (internalAuditMutation(record)) continue;
        try {
          if (record.type === "attributes" && record.target instanceof Element && record.attributeName) {
            const attributeTarget = record.target;
            performOwnedMutation(() => {
              if (record.oldValue === null) {
                attributeTarget.removeAttributeNS(record.attributeNamespace, record.attributeName!);
              } else {
                attributeTarget.setAttributeNS(record.attributeNamespace, record.attributeName!, record.oldValue);
              }
            }, (owned) => owned.type === "attributes" && owned.target === attributeTarget &&
              owned.attributeName === record.attributeName);
            continue;
          }
          if (record.type === "characterData") {
            performOwnedMutation(() => {
              record.target.nodeValue = record.oldValue;
            }, (owned) => owned.type === "characterData" && owned.target === record.target);
            continue;
          }
          if (record.type === "childList") {
            for (const added of Array.from(record.addedNodes).reverse()) {
              const parent = added.parentNode;
              if (parent) {
                performOwnedMutation(() => parent.removeChild(added), (owned) =>
                  owned.type === "childList" && owned.target === parent
                );
              }
            }
            let insertionPoint = record.nextSibling?.parentNode === record.target
              ? record.nextSibling
              : record.previousSibling?.parentNode === record.target
                ? record.previousSibling.nextSibling
                : null;
            for (const removed of Array.from(record.removedNodes)) {
              if (removed.parentNode && removed.parentNode !== record.target) {
                const currentParent = removed.parentNode;
                performOwnedMutation(() => currentParent.removeChild(removed), (owned) =>
                  owned.type === "childList" && owned.target === currentParent
                );
              }
              if (removed.parentNode !== record.target) {
                performOwnedMutation(() => record.target.insertBefore(removed, insertionPoint), (owned) =>
                  owned.type === "childList" && owned.target === record.target
                );
              }
              insertionPoint = removed.nextSibling;
            }
          }
        } catch {
          restored = false;
        }
      }
      return restored;
    };
    const arraysIdentical = <T,>(left: T[], right: T[]) =>
      left.length === right.length && left.every((value, index) => value === right[index]);
    const rulesIdentical = (left: string[] | null, right: string[] | null) =>
      left === null || right === null
        ? left === right
        : left.length === right.length && left.every((value, index) => value === right[index]);
    const selectionMatches = (
      element: HTMLInputElement | HTMLTextAreaElement,
      selection: { direction: string | null; end: number | null; start: number | null } | null
    ) => {
      if (!selection) return true;
      const current = readSelection(element);
      return current.start === selection.start && current.end === selection.end &&
        current.direction === selection.direction;
    };
    const rootsMatch = () => {
      const currentRoots = collectAuditRoots();
      return currentRoots.length === auditRoots.length &&
        currentRoots.every((auditRoot) => auditRoots.includes(auditRoot));
    };
    const snapshotMatches = (ignoreViewportScroll: boolean) => {
      const currentEnvironmentEpoch = collectAuditDocuments().reduce((total, currentDocument) =>
        total + (registryForDocument(currentDocument)?.environmentEpoch ?? 0), 0
      );
      if (!rootsMatch() || currentEnvironmentEpoch !== initialEnvironmentEpoch) return false;
      if (session.root !== initialRootIdentity || !candidate.control.isConnected || !candidate.target.isConnected) return false;
      if (rootStates.some((state) =>
        rootMarkup(state.root) !== state.markup ||
        !arraysIdentical(Array.from(state.root.adoptedStyleSheets), state.adoptedStyleSheets) ||
        !arraysIdentical(rootStyleSheets(state.root), state.styleSheets)
      )) return false;
      if (styleElements.some((state) => state.element.textContent !== state.text)) return false;
      if (sheetStates.some((state) =>
        state.sheet.disabled !== state.disabled ||
        state.sheet.media.mediaText !== state.mediaText ||
        !rulesIdentical(readRules(state.sheet), state.rules)
      )) return false;
      if (formStates.some((state) => {
        const element = state.element;
        if (!isSelect(element) && element.defaultValue !== state.defaultValue) return true;
        if (element.value !== state.value) return true;
        if (isInput(element) && (
          element.checked !== state.checked ||
          element.defaultChecked !== state.defaultChecked ||
          element.indeterminate !== state.indeterminate
        )) return true;
        if (isSelect(element) && (
          element.selectedIndex !== state.selectedIndex ||
          state.options.some((optionState) =>
            optionState.option.defaultSelected !== optionState.defaultSelected ||
            optionState.option.selected !== optionState.selected
          )
        )) return true;
        return !isSelect(element) && !selectionMatches(element, state.selection);
      })) return false;
      if (!ignoreViewportScroll && scrollerStates.some((state) =>
        state.element.scrollLeft !== state.left || state.element.scrollTop !== state.top
      )) return false;
      if (ignoreViewportScroll && scrollerStates.some((state) =>
        !intendedScrollElements.has(state.element) &&
        (state.element.scrollLeft !== state.left || state.element.scrollTop !== state.top)
      )) return false;
      if (dialogStates.some((state) =>
        state.element.open !== state.open ||
        state.element.returnValue !== state.returnValue ||
        state.element.matches(":modal") !== state.modal
      )) return false;
      if (popoverStates.some((state) => state.element.matches(":popover-open") !== state.open)) return false;
      const currentFocusChains = deepActiveChains();
      if (
        currentFocusChains.length !== initialFocusChains.length ||
        initialFocusChains.some((initial) => {
          const current = currentFocusChains.find((entry) => entry.document === initial.document);
          return !current || !arraysIdentical(current.chain, initial.chain);
        })
      ) return false;
      if (fontSetStates.some((state) =>
        !arraysIdentical(Array.from(state.document.fonts), state.fonts)
      ) || fontStates.some((state) =>
        fontDescriptorKeys.some((key) => readFontDescriptors(state.font)[key] !== state.descriptors[key])
      )) return false;
      if (canvasStates.some((state) =>
        state.canvas.width !== state.width || state.canvas.height !== state.height ||
        readCanvasFingerprint(state.canvas) !== state.fingerprint
      )) return false;
      if (mediaStates.some((state) => {
        const media = state.media;
        return media.defaultMuted !== state.defaultMuted ||
          media.defaultPlaybackRate !== state.defaultPlaybackRate ||
          media.loop !== state.loop ||
          media.muted !== state.muted ||
          media.paused !== state.paused ||
          media.playbackRate !== state.playbackRate ||
          media.preservesPitch !== state.preservesPitch ||
          media.volume !== state.volume ||
          (state.currentTime !== null && Math.abs(media.currentTime - state.currentTime) > 0.05);
      })) return false;
      const currentAnimations = new Set<Animation>();
      for (const currentDocument of auditDocuments) {
        try {
          for (const animation of currentDocument.getAnimations()) currentAnimations.add(animation);
        } catch {
          return false;
        }
      }
      for (const auditRoot of auditRoots) {
        if (isDocumentRoot(auditRoot)) continue;
        try {
          for (const animation of auditRoot.getAnimations()) currentAnimations.add(animation);
        } catch {
          return false;
        }
      }
      if (currentAnimations.size !== animationStates.length || animationStates.some((state) => {
        const animation = state.animation;
        if (!currentAnimations.has(animation) || animation.playbackRate !== state.playbackRate ||
            animation.playState !== state.playState || animation.replaceState !== state.replaceState) return true;
        if (state.playState === "paused" && state.currentTime !== null) {
          return Math.abs(Number(animation.currentTime) - Number(state.currentTime)) > 0.5;
        }
        return false;
      })) return false;
      if (history.length !== initialHistoryLength || location.href !== initialUrl ||
          !deepStructuredEqual(history.state, initialHistoryState)) return false;
      if (document.fullscreenElement !== initialFullscreenElement ||
          environmentFingerprint() !== initialEnvironmentFingerprint ||
          candidateFingerprint() !== initialCandidateFingerprint) return false;
      if (!ignoreViewportScroll &&
          (window.scrollX !== initialWindowScroll.x || window.scrollY !== initialWindowScroll.y)) return false;
      if (documentWindowStates.some((state) =>
        state.window && state.document !== document &&
        (state.window.scrollX !== state.x || state.window.scrollY !== state.y)
      )) return false;
      return true;
    };
    const restoreSnapshotProperties = () => withInternalMutation(() => {
      let restored = true;
      for (const styleState of styleElements) {
        try {
          if (styleState.element.textContent !== styleState.text) {
            performOwnedMutation(() => {
              styleState.element.textContent = styleState.text;
            }, (record) => record.type === "childList" && record.target === styleState.element);
          }
        } catch {
          restored = false;
        }
      }
      for (const sheetState of sheetStates) {
        try {
          if (sheetState.sheet.disabled !== sheetState.disabled) sheetState.sheet.disabled = sheetState.disabled;
          if (sheetState.sheet.media.mediaText !== sheetState.mediaText) {
            sheetState.sheet.media.mediaText = sheetState.mediaText;
          }
          const currentRules = readRules(sheetState.sheet);
          if (sheetState.rules !== null && !rulesIdentical(currentRules, sheetState.rules)) {
            let rulesRestored = false;
            try {
              for (let index = sheetState.sheet.cssRules.length - 1; index >= 0; index -= 1) {
                sheetState.sheet.deleteRule(index);
              }
              for (const rule of sheetState.rules) {
                sheetState.sheet.insertRule(rule, sheetState.sheet.cssRules.length);
              }
              rulesRestored = rulesIdentical(readRules(sheetState.sheet), sheetState.rules);
            } catch {
              try {
                sheetState.sheet.replaceSync(sheetState.rules.join("\n"));
                rulesRestored = rulesIdentical(readRules(sheetState.sheet), sheetState.rules);
              } catch {
                rulesRestored = false;
              }
            }
            if (!rulesRestored) restored = false;
          }
        } catch {
          restored = false;
        }
      }
      for (const rootState of rootStates) {
        try {
          if (!arraysIdentical(Array.from(rootState.root.adoptedStyleSheets), rootState.adoptedStyleSheets)) {
            rootState.root.adoptedStyleSheets = [...rootState.adoptedStyleSheets];
          }
        } catch {
          restored = false;
        }
      }
      for (const formState of formStates) {
        const element = formState.element;
        const selection = formState.selection;
        try {
          if (!isSelect(element) && element.defaultValue !== formState.defaultValue) {
            performOwnedMutation(() => {
              element.defaultValue = formState.defaultValue ?? "";
            }, (record) => record.target === element && (
              (record.type === "attributes" && record.attributeName === "value") ||
              record.type === "characterData" || record.type === "childList"
            ));
          }
          if (element.value !== formState.value) element.value = formState.value;
          if (isInput(element)) {
            if (element.defaultChecked !== formState.defaultChecked) {
              performOwnedMutation(() => {
                element.defaultChecked = formState.defaultChecked ?? false;
              }, (record) => record.type === "attributes" && record.target === element &&
                record.attributeName === "checked");
            }
            if (element.checked !== formState.checked) element.checked = formState.checked ?? false;
            if (element.indeterminate !== formState.indeterminate) {
              element.indeterminate = formState.indeterminate ?? false;
            }
          }
          if (isSelect(element)) {
            for (const optionState of formState.options) {
              if (optionState.option.defaultSelected !== optionState.defaultSelected) {
                performOwnedMutation(() => {
                  optionState.option.defaultSelected = optionState.defaultSelected;
                }, (record) => record.type === "attributes" && record.target === optionState.option &&
                  record.attributeName === "selected");
              }
              if (optionState.option.selected !== optionState.selected) {
                optionState.option.selected = optionState.selected;
              }
            }
          } else if (
            selection !== null &&
            selection.start !== null &&
            selection.end !== null &&
            !selectionMatches(element, selection)
          ) {
            element.setSelectionRange(
              selection.start,
              selection.end,
              selection.direction ?? "none"
            );
          }
        } catch {
          restored = false;
        }
      }
      for (const dialogState of dialogStates) {
        try {
          const modalNow = dialogState.element.matches(":modal");
          if (dialogState.element.open && (!dialogState.open || modalNow !== dialogState.modal)) {
            performOwnedMutation(() => dialogState.element.close(), (record) =>
              record.type === "attributes" && record.target === dialogState.element &&
              record.attributeName === "open"
            );
          }
          if (dialogState.open && !dialogState.element.open) {
            performOwnedMutation(() => {
              if (dialogState.modal) dialogState.element.showModal();
              else dialogState.element.show();
            }, (record) => record.type === "attributes" && record.target === dialogState.element &&
              record.attributeName === "open");
          }
          dialogState.element.returnValue = dialogState.returnValue;
        } catch {
          restored = false;
        }
      }
      for (const popoverState of popoverStates) {
        try {
          const open = popoverState.element.matches(":popover-open");
          if (popoverState.open && !open) performOwnedMutation(() => popoverState.element.showPopover());
          if (!popoverState.open && open) performOwnedMutation(() => popoverState.element.hidePopover());
        } catch {
          restored = false;
        }
      }
      for (const setState of fontSetStates) {
        const initialFontSet = new Set(setState.fonts);
        for (const font of Array.from(setState.document.fonts)) {
          if (!initialFontSet.has(font)) setState.document.fonts.delete(font);
        }
      }
      for (const fontState of fontStates) {
        try {
          for (const key of fontDescriptorKeys) {
            if (readFontDescriptors(fontState.font)[key] !== fontState.descriptors[key]) {
              Reflect.set(fontState.font, key, fontState.descriptors[key]);
            }
          }
          if (!fontState.set.has(fontState.font)) fontState.set.add(fontState.font);
        } catch {
          restored = false;
        }
      }
      for (const canvasState of canvasStates) {
        try {
          if (readCanvasFingerprint(canvasState.canvas) !== canvasState.fingerprint) {
            const context = canvasState.canvas.getContext("2d", { willReadFrequently: true });
            if (context && canvasState.bitmap &&
                canvasState.canvas.width === canvasState.width &&
                canvasState.canvas.height === canvasState.height) {
              context.putImageData(canvasState.bitmap, 0, 0);
            } else {
              restored = false;
            }
          }
        } catch {
          restored = false;
        }
      }
      for (const mediaState of mediaStates) {
        try {
          const media = mediaState.media;
          media.defaultMuted = mediaState.defaultMuted;
          media.defaultPlaybackRate = mediaState.defaultPlaybackRate;
          media.loop = mediaState.loop;
          media.muted = mediaState.muted;
          media.playbackRate = mediaState.playbackRate;
          media.preservesPitch = mediaState.preservesPitch;
          media.volume = mediaState.volume;
          if (mediaState.currentTime !== null && media.readyState > 0) media.currentTime = mediaState.currentTime;
          if (mediaState.paused && !media.paused) media.pause();
          if (!mediaState.paused && media.paused) void media.play().catch(() => undefined);
        } catch {
          restored = false;
        }
      }
      for (const animationState of animationStates) {
        try {
          const animation = animationState.animation;
          if (animationState.playState === "idle") {
            animation.cancel();
          } else if (animationState.playState === "paused") {
            animation.pause();
            animation.playbackRate = animationState.playbackRate;
            animation.currentTime = animationState.currentTime;
          } else if (animationState.playState === "finished") {
            animation.playbackRate = animationState.playbackRate;
            animation.finish();
          } else {
            animation.playbackRate = animationState.playbackRate;
            const elapsedTimeline = animation.timeline?.currentTime !== null &&
              animation.timeline?.currentTime !== undefined && animationState.timelineTime !== null
              ? Number(animation.timeline.currentTime) - Number(animationState.timelineTime)
              : 0;
            animation.currentTime = animationState.currentTime === null
              ? null
              : Number(animationState.currentTime) + elapsedTimeline * animationState.playbackRate;
            void animation.play();
          }
        } catch {
          restored = false;
        }
      }
      try {
        if (location.href !== initialUrl || !deepStructuredEqual(history.state, initialHistoryState)) {
          history.replaceState(structuredClone(initialHistoryState), "", initialUrl);
        }
      } catch {
        restored = false;
      }
      try {
        for (const initialFocus of initialFocusChains) {
          const focusTarget = initialFocus.chain.at(-1) as (Element & {
            blur?: () => void;
            focus?: (options?: FocusOptions) => void;
          }) | undefined;
          const currentChain = deepActiveChainFor(initialFocus.document);
          if (focusTarget?.focus && !arraysIdentical(currentChain, initialFocus.chain)) {
            const focus = focusTarget.focus;
            performOwnedMutation(() => {
              const currentFocus = deepActiveChainFor(initialFocus.document).at(-1) as (Element & {
                blur?: () => void;
              }) | undefined;
              if (currentFocus?.blur && currentFocus !== focusTarget) currentFocus.blur();
              focus.call(focusTarget, { preventScroll: true });
            });
          }
        }
      } catch {
        restored = false;
      }
      for (const windowState of documentWindowStates) {
        if (!windowState.window) {
          restored = false;
          continue;
        }
        try {
          performOwnedMutation(() => {
            windowState.window!.scrollTo({
              behavior: "instant" as ScrollBehavior,
              left: windowState.x,
              top: windowState.y
            });
          });
        } catch {
          restored = false;
        }
      }
      try {
        performOwnedMutation(() => {
          window.scrollTo({
            behavior: "instant" as ScrollBehavior,
            left: initialWindowScroll.x,
            top: initialWindowScroll.y
          });
        });
      } catch {
        restored = false;
      }
      for (const scrollState of scrollerStates) {
        try {
          performOwnedMutation(() => {
            scrollState.element.scrollTo({
              behavior: "instant" as ScrollBehavior,
              left: scrollState.left,
              top: scrollState.top
            });
          });
        } catch {
          restored = false;
        }
      }
      return restored;
    });
    const waitForQuiescentFence = async () => {
      let previous = candidate.target.getBoundingClientRect();
      let quietFrames = 0;
      let stableFrames = 0;
      const deadline = performance.now() + 1_000;
      for (let frame = 0; frame < 60 && performance.now() < deadline; frame += 1) {
        const externalBefore = journal.externalRestoreRecords.length;
        const mutationEpochBefore = journal.mutationEpoch;
        const nonDomEpochBefore = journal.nonDomMutationEpoch;
        const asyncEpochBefore = journal.asyncExecutionEpoch;
        const mediaEpochBefore = journal.mediaChangeEpoch;
        await Promise.resolve();
        await new Promise<void>((resolve) => mainSchedulers!.requestFrame(() => resolve()));
        await new Promise<void>((resolve) => mainSchedulers!.setTimer(resolve, 0));
        drainToCurrentPhase();
        const current = candidate.target.getBoundingClientRect();
        const stable =
          Math.abs(current.left - previous.left) <= 0.25 &&
          Math.abs(current.top - previous.top) <= 0.25 &&
          Math.abs(current.width - previous.width) <= 0.25 &&
          Math.abs(current.height - previous.height) <= 0.25;
        stableFrames = stable ? stableFrames + 1 : 0;
        const quiet =
          journal.externalRestoreRecords.length === externalBefore &&
          journal.mutationEpoch === mutationEpochBefore &&
          journal.nonDomMutationEpoch === nonDomEpochBefore &&
          journal.asyncExecutionEpoch === asyncEpochBefore &&
          journal.mediaChangeEpoch === mediaEpochBefore &&
          journal.pendingAsyncTasks.size === 0;
        quietFrames = quiet ? quietFrames + 1 : 0;
        previous = current;
        if (stableFrames >= 2 && quietFrames >= 2) break;
      }
      return { quiet: quietFrames >= 2, stableFrames };
    };

    let instrumentationCleaned = false;
    const cleanupInstrumentation = () => {
      if (instrumentationCleaned) return;
      instrumentationCleaned = true;
      journal.auditActive = false;
      for (const cleanup of mediaListenerCleanups.splice(0).reverse()) cleanup();
      for (const cleanup of instrumentationCleanups.splice(0).reverse()) cleanup();
    };

    candidate.activePreparation = {
      disconnect: () => {
        for (const { observer } of observerEntries) observer.disconnect();
        cleanupInstrumentation();
      },
      restore: async () => {
        drainToCurrentPhase();
        const auditRecords = [...journal.auditRecords];
        const auditMutationObserved = auditRecords.some((record) => !internalAuditMutation(record));
        const preRestoreSnapshotChanged = !snapshotMatches(true);
        let layoutMutated = auditMutationObserved || preRestoreSnapshotChanged ||
          journal.nonDomMutationEpoch > 0 || journal.asyncScheduleEpoch > 0 ||
          journal.asyncExecutionEpoch > 0 || journal.mediaChangeEpoch > 0 ||
          candidateFingerprint() !== initialCandidateFingerprint;
        let pageStateRestored = true;
        journal.phase = "restore";
        let handledExternalRecords = 0;
        pageStateRestored = restoreMutationRecords(auditRecords) && pageStateRestored;
        let lastFence = { quiet: false, stableFrames: 0 };
        let environmentRestored = false;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          drainToCurrentPhase();
          const externalRecords = journal.externalRestoreRecords.slice(handledExternalRecords);
          handledExternalRecords = journal.externalRestoreRecords.length;
          if (externalRecords.some((record) => !internalAuditMutation(record))) {
            layoutMutated = true;
            pageStateRestored = restoreMutationRecords(externalRecords) && pageStateRestored;
          }
          pageStateRestored = restoreSnapshotProperties() && pageStateRestored;
          lastFence = await waitForQuiescentFence();
          drainToCurrentPhase();
          if (journal.externalRestoreRecords.length > handledExternalRecords) layoutMutated = true;
          environmentRestored = pageStateRestored && snapshotMatches(false);
          if (environmentRestored && lastFence.quiet && lastFence.stableFrames >= 2) break;
          layoutMutated = true;
        }
        if (!environmentRestored) {
          drainToCurrentPhase();
          const finalExternalRecords = journal.externalRestoreRecords.slice(handledExternalRecords);
          if (finalExternalRecords.length > 0) {
            layoutMutated = true;
            pageStateRestored = restoreMutationRecords(finalExternalRecords) && pageStateRestored;
          }
          pageStateRestored = restoreSnapshotProperties() && pageStateRestored;
          lastFence = await waitForQuiescentFence();
          drainToCurrentPhase();
          environmentRestored = pageStateRestored && snapshotMatches(false);
        }
        const restoredRect = candidate.target.getBoundingClientRect();
        const restored = environmentRestored &&
          Math.abs(restoredRect.left - initialRect.left) <= 0.5 &&
          Math.abs(restoredRect.right - initialRect.right) <= 0.5 &&
          Math.abs(restoredRect.top - initialRect.top) <= 0.5 &&
          Math.abs(restoredRect.bottom - initialRect.bottom) <= 0.5;
        for (const { observer } of observerEntries) observer.disconnect();
        cleanupInstrumentation();
        delete candidate.activePreparation;
        return {
          descriptor: describe(candidate.control),
          environmentRestored,
          layoutMutated,
          restored,
          stable: lastFence.quiet && lastFence.stableFrames >= 2
        };
      }
    };

    candidate.target.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
    let previous = candidate.target.getBoundingClientRect();
    let stableFrames = 0;
    for (let frame = 0; frame < 12; frame += 1) {
      await new Promise<void>((resolve) => mainSchedulers!.requestFrame(() => resolve()));
      const current = candidate.target.getBoundingClientRect();
      const stable =
        Math.abs(current.left - previous.left) <= 0.25 &&
        Math.abs(current.top - previous.top) <= 0.25 &&
        Math.abs(current.width - previous.width) <= 0.25 &&
        Math.abs(current.height - previous.height) <= 0.25;
      stableFrames = stable ? stableFrames + 1 : 0;
      previous = current;
      if (stableFrames >= 2) break;
    }
    drainToCurrentPhase();
    const layoutMutated = journal.auditRecords.some((record) => !internalAuditMutation(record)) ||
      journal.nonDomMutationEpoch > 0 || journal.asyncScheduleEpoch > 0 ||
      journal.asyncExecutionEpoch > 0 || journal.mediaChangeEpoch > 0 ||
      candidateFingerprint() !== initialCandidateFingerprint;
    return {
      descriptor: describe(candidate.control),
      layoutMutated,
      prepared: true,
      stable: stableFrames >= 2
    };
    }, { candidateIndex, viewportAuditToken });
  } catch (error) {
    releaseCaliforniaViewportExternalEnvironmentEpoch(page, externalEpochKey);
    throw error;
  }
  return prepared;
}

async function restoreCaliforniaViewportRecheck(
  root: Locator,
  viewportAuditToken: string,
  candidateIndex: number
): Promise<CaliforniaViewportRecheckRestoration> {
  const page = root.page();
  const externalEpochKey = `${viewportAuditToken}:${candidateIndex}`;
  let restoration: CaliforniaViewportRecheckRestoration;
  try {
    restoration = await root.evaluate(async (_element, options) => {
    type ViewportAuditCandidate = {
      control: HTMLElement;
      activePreparation?: {
        disconnect: () => void;
        restore: () => Promise<CaliforniaViewportRecheckRestoration>;
      };
    };
    type ViewportAuditSession = { candidates: ViewportAuditCandidate[] };
    const session = (globalThis as typeof globalThis & {
      __californiaVisualizationViewportAudits?: Map<string, ViewportAuditSession>;
    }).__californiaVisualizationViewportAudits?.get(options.viewportAuditToken);
    const candidate = session?.candidates[options.candidateIndex];
    if (!candidate?.activePreparation) {
      const descriptor = candidate
        ? `${candidate.control.tagName.toLowerCase()}(${(
            candidate.control.getAttribute("aria-label") ?? candidate.control.textContent ?? ""
          ).replace(/\s+/g, " ").trim().slice(0, 70)})`
        : `candidate-${options.candidateIndex}`;
      return {
        descriptor,
        environmentRestored: false,
        layoutMutated: false,
        restored: false,
        stable: false
      };
    }
      return candidate.activePreparation.restore();
    }, { candidateIndex, viewportAuditToken });
    const externalEpoch = readCaliforniaViewportExternalEnvironmentEpoch(page, externalEpochKey);
    if (externalEpoch.emulateMediaEpoch > 0 || externalEpoch.protocolEpoch > 0 ||
        externalEpoch.setViewportSizeEpoch > 0) {
      restoration = { ...restoration, layoutMutated: true };
    }
  } finally {
    releaseCaliforniaViewportExternalEnvironmentEpoch(page, externalEpochKey);
  }
  return restoration!;
}

export async function collectVisualizationUiAuditEvidence(root: Locator, axis: CaliforniaQaAxis) {
  const viewportAuditToken =
    `california-viewport-audit-${Date.now()}-${californiaVisualizationViewportAuditSequence++}`;
  const viewportAuditCandidateCount = await root.evaluate((element, options) => {
    type AuditRegistry = {
      shadowRoots: WeakMap<Element, ShadowRoot>;
    };
    type ViewportAuditCandidate = {
      activationTargets: HTMLElement[];
      control: HTMLElement;
      initialFingerprint?: string;
      initialRect?: DOMRect;
      target: HTMLElement;
    };
    type ViewportAuditSession = {
      candidates: ViewportAuditCandidate[];
      root: HTMLElement;
    };
    type ViewportAuditGlobal = typeof globalThis & {
      __californiaVisualizationUiAuditRegistry?: AuditRegistry;
      __californiaVisualizationViewportAudits?: Map<string, ViewportAuditSession>;
    };
    const auditGlobal = globalThis as ViewportAuditGlobal;
    const auditRegistry = auditGlobal.__californiaVisualizationUiAuditRegistry;
    const rootElement = element as HTMLElement;
    const retainedShadowRoot = (target: Element) =>
      target.shadowRoot ?? auditRegistry?.shadowRoots.get(target) ?? null;
    const composedParentElement = (target: Element): Element | null => {
      if (target.parentElement) return target.parentElement;
      const treeRoot = target.getRootNode();
      return treeRoot instanceof ShadowRoot ? treeRoot.host : null;
    };
    const composedContains = (ancestor: Element, candidate: Element) => {
      let current: Element | null = candidate;
      while (current) {
        if (current === ancestor) return true;
        current = composedParentElement(current);
      }
      return false;
    };
    const deepElements = (auditRoot: Element) => {
      const output: Element[] = [auditRoot];
      const visited = new Set<Element>();
      const pending = [{ depth: 0, node: auditRoot }];
      while (pending.length > 0) {
        const entry = pending.pop();
        if (!entry || visited.has(entry.node) || visited.size >= 50_000) continue;
        visited.add(entry.node);
        if (entry.depth >= 256) continue;
        const children = Array.from(entry.node.children);
        const shadow = retainedShadowRoot(entry.node);
        if (shadow) children.push(...Array.from(shadow.children));
        for (let index = children.length - 1; index >= 0; index -= 1) {
          output.push(children[index]);
          pending.push({ depth: entry.depth + 1, node: children[index] });
        }
      }
      return [...new Set(output)];
    };
    const styleAllowsAudit = (target: Element) => {
      let current: Element | null = target;
      while (current) {
        const style = getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          Number(style.opacity) <= 0
        ) return false;
        current = composedParentElement(current);
      }
      return true;
    };
    const activationTargetsFor = (control: HTMLElement) => {
      const targets: HTMLElement[] = [control];
      const labelable = control as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null };
      for (const label of Array.from(labelable.labels ?? [])) {
        if (label.control === control && composedContains(rootElement, label)) targets.push(label);
      }
      return [...new Set(targets)];
    };
    const activationTargetFor = (control: HTMLElement) => activationTargetsFor(control)
      .reduce((best, candidate) => {
        const candidateRect = candidate.getBoundingClientRect();
        const bestRect = best.getBoundingClientRect();
        return Math.min(candidateRect.width, candidateRect.height) >=
          Math.min(bestRect.width, bestRect.height) ? candidate : best;
      });
    const rectIsClippedBy = (
      rect: DOMRect,
      clippingRect: DOMRect,
      clipX: boolean,
      clipY: boolean
    ) => (
      (clipX && (rect.left < clippingRect.left - 0.5 || rect.right > clippingRect.right + 0.5)) ||
      (clipY && (rect.top < clippingRect.top - 0.5 || rect.bottom > clippingRect.bottom + 0.5))
    );
    const candidates = deepElements(rootElement)
      .filter((target): target is HTMLElement => target instanceof HTMLElement)
      .filter((control) =>
        (control.matches(options.semanticInteractiveSelector) || control.tabIndex >= 0) &&
        !control.matches(":disabled") &&
        !control.closest("[inert]") &&
        styleAllowsAudit(control)
      )
      .map((control): ViewportAuditCandidate | null => {
        const target = activationTargetFor(control);
        const rawRect = target.getBoundingClientRect();
        if (rawRect.width <= 0 || rawRect.height <= 0) return null;
        const viewportClipped =
          rawRect.left < -0.5 || rawRect.right > window.innerWidth + 0.5 ||
          rawRect.top < -0.5 || rawRect.bottom > window.innerHeight + 0.5;
        let softAncestorClipped = false;
        let hardAncestorClipped = false;
        let ancestor = composedParentElement(target);
        while (ancestor) {
          const style = getComputedStyle(ancestor);
          const clipX = ["auto", "clip", "hidden", "scroll"].includes(style.overflowX);
          const clipY = ["auto", "clip", "hidden", "scroll"].includes(style.overflowY);
          if (clipX || clipY) {
            const clipped = rectIsClippedBy(rawRect, ancestor.getBoundingClientRect(), clipX, clipY);
            if (clipped) {
              const hardX = clipX && ["clip", "hidden"].includes(style.overflowX);
              const hardY = clipY && ["clip", "hidden"].includes(style.overflowY);
              hardAncestorClipped ||= hardX || hardY;
              softAncestorClipped ||= !hardX || !hardY;
            }
          }
          ancestor = composedParentElement(ancestor);
        }
        if (hardAncestorClipped || (!viewportClipped && !softAncestorClipped)) return null;
        return { activationTargets: activationTargetsFor(control), control, target };
      })
      .filter((candidate): candidate is ViewportAuditCandidate => Boolean(candidate));
    for (const candidate of candidates) {
      candidate.initialRect = candidate.target.getBoundingClientRect();
    }
    auditGlobal.__californiaVisualizationViewportAudits ??= new Map();
    auditGlobal.__californiaVisualizationViewportAudits.set(options.viewportAuditToken, {
      candidates,
      root: rootElement
    });
    return candidates.length;
  }, {
    semanticInteractiveSelector: CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR,
    viewportAuditToken
  });

  const evaluateCurrentGeometry = (viewportFocusIndex: number | null) => root.evaluate(async (element, options) => {
    const auditStartedAt = performance.now();
    const rootElement = element as HTMLElement;
    const findings: string[] = [];
    let auditedControlCount = 0;
    let coreHitTestCount = 0;
    let devicePixelFallbackControlCount = 0;
    let partitionLimitFallbackControlCount = 0;
    let pseudoFallbackControlCount = 0;
    let unsupportedGeometryFallbackControlCount = 0;
    type CandidateFindingCategory = "touch" | "viewport-text-clip";
    type CandidateFindingRecord = {
      candidateIndices: number[];
      category: CandidateFindingCategory;
      findingIndex: number;
    };
    const candidateFindingRecords: CandidateFindingRecord[] = [];
    const tolerance = 3;
    type AuditRegistry = {
      directPointerListeners: WeakMap<EventTarget, Map<string, Set<EventListenerOrEventListenerObject>>>;
      earlyInstalled: boolean;
      shadowHosts: Set<Element>;
      shadowModes: WeakMap<Element, ShadowRootMode>;
      shadowRoots: WeakMap<Element, ShadowRoot>;
    };
    const auditRegistry = (globalThis as typeof globalThis & {
      __californiaVisualizationUiAuditRegistry?: AuditRegistry;
    }).__californiaVisualizationUiAuditRegistry;
    type ViewportAuditCandidate = {
      activationTargets: HTMLElement[];
      control: HTMLElement;
      target: HTMLElement;
    };
    type ViewportAuditSession = {
      candidates: ViewportAuditCandidate[];
      root: HTMLElement;
    };
    const viewportAuditSession = (globalThis as typeof globalThis & {
      __californiaVisualizationViewportAudits?: Map<string, ViewportAuditSession>;
    }).__californiaVisualizationViewportAudits?.get(options.viewportAuditToken);
    const traversalLimitFindings = new Set<string>();
    const recordTraversalLimit = (kind: string, detail: string) => {
      traversalLimitFindings.add(`ui-audit-traversal-limit:${kind}:${detail}`);
    };
    const maximumDeepTraversalNodes = 50_000;
    const maximumDeepTraversalDepth = 256;
    type RectLike = {
      bottom: number;
      height: number;
      left: number;
      right: number;
      top: number;
      width: number;
    };
    const retainedShadowRoot = (target: Element) =>
      target.shadowRoot ?? auditRegistry?.shadowRoots.get(target) ?? null;
    const composedParentElement = (target: Element): Element | null => {
      if (target.parentElement) return target.parentElement;
      const root = target.getRootNode();
      return root instanceof ShadowRoot ? root.host : null;
    };
    const closestComposed = (target: Element, selector: string): Element | null => {
      let current: Element | null = target;
      while (current) {
        if (current.matches(selector)) return current;
        current = composedParentElement(current);
      }
      return null;
    };
    const composedContains = (ancestor: Element, candidate: Element) => {
      let current: Element | null = candidate;
      while (current) {
        if (current === ancestor) return true;
        current = composedParentElement(current);
      }
      return false;
    };
    const viewportCandidateIndicesFor = (target: Element) => {
      const indices: number[] = [];
      for (const [candidateIndex, candidate] of (viewportAuditSession?.candidates ?? []).entries()) {
        if (
          candidate.control === target ||
          candidate.target === target ||
          composedContains(candidate.control, target) ||
          candidate.activationTargets.some((activationTarget) =>
            activationTarget === target || composedContains(activationTarget, target)
          )
        ) {
          indices.push(candidateIndex);
        }
      }
      return indices;
    };
    const pushCandidateFinding = (
      category: CandidateFindingCategory,
      target: Element,
      message: string
    ) => {
      const findingIndex = findings.push(message) - 1;
      const candidateIndices = viewportCandidateIndicesFor(target);
      if (candidateIndices.length > 0) {
        candidateFindingRecords.push({ candidateIndices, category, findingIndex });
      }
    };
    const deepElements = (root: Element | Document | ShadowRoot) => {
      const output: Element[] = [];
      const visited = new Set<Element>();
      const initial = Array.from(root.children);
      if (root instanceof Element) {
        const shadow = retainedShadowRoot(root);
        if (shadow) initial.push(...Array.from(shadow.children));
      }
      const pending = initial.map((node) => ({ depth: 1, node }));
      while (pending.length > 0) {
        const entry = pending.pop();
        if (!entry || visited.has(entry.node)) continue;
        if (visited.size >= maximumDeepTraversalNodes) {
          recordTraversalLimit("elements", `node-cap-${maximumDeepTraversalNodes}`);
          break;
        }
        visited.add(entry.node);
        output.push(entry.node);
        if (entry.depth >= maximumDeepTraversalDepth) {
          if (entry.node.children.length > 0 || retainedShadowRoot(entry.node)?.children.length) {
            recordTraversalLimit("elements", `depth-cap-${maximumDeepTraversalDepth}`);
          }
          continue;
        }
        const next = Array.from(entry.node.children);
        const shadow = retainedShadowRoot(entry.node);
        if (shadow) next.push(...Array.from(shadow.children));
        for (let index = next.length - 1; index >= 0; index -= 1) {
          pending.push({ depth: entry.depth + 1, node: next[index] });
        }
      }
      return output;
    };
    const deepTextNodes = (root: Element | Document | ShadowRoot) => {
      const output: Text[] = [];
      const visited = new Set<Node>();
      const pending = [{ depth: 0, node: root as Node }];
      while (pending.length > 0) {
        const entry = pending.pop();
        if (!entry || visited.has(entry.node)) continue;
        if (visited.size >= maximumDeepTraversalNodes) {
          recordTraversalLimit("text", `node-cap-${maximumDeepTraversalNodes}`);
          break;
        }
        visited.add(entry.node);
        if (entry.node instanceof Text) {
          output.push(entry.node);
          continue;
        }
        if (entry.depth >= maximumDeepTraversalDepth) {
          if (entry.node.childNodes.length > 0) {
            recordTraversalLimit("text", `depth-cap-${maximumDeepTraversalDepth}`);
          }
          continue;
        }
        const next = Array.from(entry.node.childNodes);
        if (entry.node instanceof Element) {
          const shadow = retainedShadowRoot(entry.node);
          if (shadow) next.push(...Array.from(shadow.childNodes));
        }
        for (let index = next.length - 1; index >= 0; index -= 1) {
          pending.push({ depth: entry.depth + 1, node: next[index] });
        }
      }
      return output;
    };
    const deepElementFromPoint = (x: number, y: number) => {
      let hit = document.elementFromPoint(x, y);
      const visited = new Set<Element>();
      while (hit && !visited.has(hit)) {
        if (visited.size >= 64) {
          recordTraversalLimit("hit-test-shadow", "depth-cap-64");
          break;
        }
        visited.add(hit);
        const shadow = retainedShadowRoot(hit);
        const deeper = shadow?.elementFromPoint(x, y) ?? null;
        if (!deeper || deeper === hit) break;
        hit = deeper;
      }
      return hit;
    };
    const rootDeepElements = [rootElement, ...deepElements(rootElement)];
    const rectOf = (target: Element): RectLike => target.getBoundingClientRect();
    const viewportRect = (): RectLike => ({
      bottom: window.innerHeight,
      height: window.innerHeight,
      left: 0,
      right: window.innerWidth,
      top: 0,
      width: window.innerWidth
    });
    const rectFromEdges = (left: number, top: number, right: number, bottom: number): RectLike | null => {
      if (right - left <= 0 || bottom - top <= 0) return null;
      return { bottom, height: bottom - top, left, right, top, width: right - left };
    };
    const intersectRect = (left: RectLike, right: RectLike, clipX = true, clipY = true) => rectFromEdges(
      clipX ? Math.max(left.left, right.left) : left.left,
      clipY ? Math.max(left.top, right.top) : left.top,
      clipX ? Math.min(left.right, right.right) : left.right,
      clipY ? Math.min(left.bottom, right.bottom) : left.bottom
    );
    const clipsOverflow = (value: string) => ["auto", "clip", "hidden", "scroll"].includes(value);
    const hardClipsOverflow = (value: string) => ["clip", "hidden"].includes(value);
    const targetVisibilityBlocks = (target: Element) => {
      const visibility = getComputedStyle(target).visibility;
      return visibility === "hidden" || visibility === "collapse";
    };
    const operativeLegacyClip = (target: Element) => {
      const style = getComputedStyle(target);
      const clip = style.clip.trim().toLowerCase();
      return (
        ["absolute", "fixed"].includes(style.position) &&
        Boolean(clip) &&
        clip !== "auto"
      ) ? clip : null;
    };
    const effectivelyClippedRect = (
      target: Element,
      rawRect: RectLike,
      includeTargetOverflow: boolean,
      includeViewport = true,
      includeTransparentPaint = false
    ) => {
      let rect: RectLike | null = rawRect;
      let ancestorClippedX = false;
      let ancestorClippedY = false;
      let hardClippedX = false;
      let hardClippedY = false;
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = window.getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden" ||
          (current === target && targetVisibilityBlocks(current)) ||
          (!includeTransparentPaint && Number(style.opacity) <= 0)
        ) {
          return { hardClippedX, hardClippedY, rect: null };
        }
        if (rect && (current !== target || includeTargetOverflow)) {
          const clipX = clipsOverflow(style.overflowX);
          const clipY = clipsOverflow(style.overflowY);
          if (clipX || clipY) {
            const before = rect;
            const clipped = intersectRect(rect, rectOf(current), clipX, clipY);
            if (clipX && (!clipped || clipped.left > before.left + 0.5 || clipped.right < before.right - 0.5)) {
              ancestorClippedX = true;
            }
            if (clipY && (!clipped || clipped.top > before.top + 0.5 || clipped.bottom < before.bottom - 0.5)) {
              ancestorClippedY = true;
            }
            if (hardClipsOverflow(style.overflowX) && (!clipped || clipped.left > before.left + 0.5 || clipped.right < before.right - 0.5)) {
              hardClippedX = true;
            }
            if (hardClipsOverflow(style.overflowY) && (!clipped || clipped.top > before.top + 0.5 || clipped.bottom < before.bottom - 0.5)) {
              hardClippedY = true;
            }
            rect = clipped;
          }
        }
        current = composedParentElement(current);
      }
      const ancestorRect = rect;
      const clippedToViewport = ancestorRect ? intersectRect(ancestorRect, viewportRect()) : null;
      const viewportClippedX = Boolean(ancestorRect && (
        !clippedToViewport ||
        clippedToViewport.left > ancestorRect.left + 0.5 ||
        clippedToViewport.right < ancestorRect.right - 0.5
      ));
      const viewportClippedY = Boolean(ancestorRect && (
        !clippedToViewport ||
        clippedToViewport.top > ancestorRect.top + 0.5 ||
        clippedToViewport.bottom < ancestorRect.bottom - 0.5
      ));
      return {
        ancestorClippedX,
        ancestorClippedY,
        hardClippedX,
        hardClippedY,
        rect: includeViewport ? clippedToViewport : ancestorRect,
        viewportClippedX,
        viewportClippedY
      };
    };
    const visible = (target: Element) => {
      const rect = rectOf(target);
      if (rect.width <= 0 || rect.height <= 0) return false;
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = window.getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden" ||
          (current === target && targetVisibilityBlocks(current)) ||
          Number(style.opacity) <= 0
        ) return false;
        current = composedParentElement(current);
      }
      return true;
    };
    const pointerPresentationAncestorsAllow = (target: Element) => {
      if (closestComposed(target, "[inert]")) return false;
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = window.getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden" ||
          (current === target && targetVisibilityBlocks(current))
        ) return false;
        current = composedParentElement(current);
      }
      return true;
    };
    const pseudoPointerPresentationAncestorsAllow = (target: Element) => {
      if (closestComposed(target, "[inert]")) return false;
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = window.getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden"
        ) return false;
        current = composedParentElement(current);
      }
      return true;
    };
    const pointerOperableCandidate = (target: HTMLElement) => {
      const rect = rectOf(target);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        pointerPresentationAncestorsAllow(target) &&
        getComputedStyle(target).pointerEvents !== "none"
      );
    };
    const effectiveRect = (target: Element) => visible(target)
      ? effectivelyClippedRect(target, rectOf(target), false, false).rect
      : null;
    const describe = (target: Element) => {
      const text = (target.getAttribute("aria-label") ?? target.getAttribute("data-viz-name") ?? target.textContent ?? "")
        .replace(/\s+/g, " ").trim().slice(0, 70);
      return `${target.tagName.toLowerCase()}${text ? `(${text})` : ""}`;
    };
    const rootRect = rectOf(rootElement);

    for (const customHost of rootDeepElements.filter((target) => target.localName.includes("-"))) {
      const hostRect = rectOf(customHost);
      const intersectsWorkspace = Boolean(intersectRect(hostRect, rootRect));
      if (
        intersectsWorkspace &&
        !retainedShadowRoot(customHost) &&
        !auditRegistry?.earlyInstalled
      ) {
        findings.push(`shadow-observation-unavailable:${describe(customHost)}:early-registry-required`);
      }
    }

    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 4) {
      findings.push(`document-horizontal-overflow:${document.documentElement.scrollWidth}-${document.documentElement.clientWidth}px`);
    }
    if (rootElement.scrollWidth > rootElement.clientWidth + 4) {
      findings.push(`workspace-horizontal-overflow:${rootElement.scrollWidth}-${rootElement.clientWidth}px`);
    }
    if (rootElement.scrollHeight > rootElement.clientHeight + 4 && ["hidden", "clip"].includes(getComputedStyle(rootElement).overflowY)) {
      findings.push(`workspace-clipped-height:${rootElement.scrollHeight}-${rootElement.clientHeight}px`);
    }

    const surfaces = rootDeepElements.filter((target) => target.matches("[data-viz-surface]") && visible(target));
    if (surfaces.length === 0) findings.push("surface-missing");
    for (const surface of surfaces) {
      const rawRect = rectOf(surface);
      const clipped = effectivelyClippedRect(surface, rawRect, false, false);
      const rect = clipped.rect;
      if (!rect) {
        findings.push(`surface-clipped-by-ancestor:${describe(surface)}:fully-clipped`);
        continue;
      }
      if (clipped.ancestorClippedX || clipped.ancestorClippedY) {
        findings.push(
          `surface-clipped-by-ancestor:${describe(surface)}:` +
          `${rawRect.width.toFixed(1)}x${rawRect.height.toFixed(1)}->${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`
        );
      }
      if (rect.width < 120 || rect.height < 120) findings.push(`surface-too-small:${describe(surface)}:${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
      if (rect.left < rootRect.left - tolerance || rect.right > rootRect.right + tolerance || rect.top < rootRect.top - tolerance || rect.bottom > rootRect.bottom + tolerance) {
        findings.push(`surface-outside-workspace:${describe(surface)}`);
      }
      const html = surface as HTMLElement;
      if (html.scrollWidth > html.clientWidth + 4 && ["hidden", "clip"].includes(getComputedStyle(html).overflowX)) {
        findings.push(`surface-clipped-width:${describe(surface)}:${html.scrollWidth}-${html.clientWidth}px`);
      }
    }

    const excludedTextAncestor = (target: Element) => closestComposed(target,
      'script,style,template,noscript,select,option,textarea'
    );
    const nonZeroCssGeometryValue = (value: string) => value
      .split(/[\s/]+/)
      .some((token) => {
        const amount = Number.parseFloat(token);
        return Number.isFinite(amount) && Math.abs(amount) > 0.000001;
      });
    const hasRoundedCorners = (style: CSSStyleDeclaration) => [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius
    ].some(nonZeroCssGeometryValue);
    const hasPaintContainment = (style: CSSStyleDeclaration) => {
      const contain = style.contain.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return contain.some((token) => ["paint", "content", "strict"].includes(token));
    };
    const hasNonZeroOverflowClipMargin = (style: CSSStyleDeclaration) => {
      const value = style.getPropertyValue("overflow-clip-margin").trim().toLowerCase();
      if (!value || value === "0px" || value === "0") return false;
      return value
        .split(/\s+/)
        .filter((token) => !["border-box", "content-box", "padding-box"].includes(token))
        .some((token) => {
          const amount = Number.parseFloat(token);
          return !Number.isFinite(amount) || Math.abs(amount) > 0.000001;
        });
    };
    const hasNonUnitIndividualScale = (style: CSSStyleDeclaration) => {
      const value = style.scale.trim().toLowerCase();
      if (!value || value === "none") return false;
      const tokens = value.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) return false;
      return tokens.some((token) => {
        const amount = Number.parseFloat(token);
        return !Number.isFinite(amount) || Math.abs(amount - 1) > 0.000001;
      });
    };
    const hasNonUnitZoom = (style: CSSStyleDeclaration) => {
      const value = style.getPropertyValue("zoom").trim().toLowerCase();
      if (!value || value === "normal") return false;
      const amount = Number.parseFloat(value);
      return !Number.isFinite(amount) || Math.abs(amount - 1) > 0.000001;
    };
    const rectContainsRect = (outer: RectLike, inner: RectLike, insetX = 0, insetY = 0) =>
      inner.left >= outer.left + insetX - 0.5 &&
      inner.right <= outer.right - insetX + 0.5 &&
      inner.top >= outer.top + insetY - 0.5 &&
      inner.bottom <= outer.bottom - insetY + 0.5;
    const roundedSafeInteriorContains = (clipOwner: Element, paintTarget: Element) => {
      const ownerRect = rectOf(clipOwner);
      const targetRect = rectOf(paintTarget);
      const style = getComputedStyle(clipOwner);
      const radiusValues = [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius
      ].flatMap((value) => value.split(/\s+/).map((token) => Number.parseFloat(token)));
      if (radiusValues.some((value) => !Number.isFinite(value))) return false;
      const maximumRadius = Math.max(0, ...radiusValues);
      return rectContainsRect(ownerRect, targetRect, maximumRadius, maximumRadius);
    };
    const textPaintGeometryReasons = (target: Element) => {
      const reasons: string[] = [];
      let current: Element | null = target;
      while (current) {
        const style = getComputedStyle(current);
        const owner = current === target ? "target" : `ancestor(${describe(current)})`;
        if (style.transform && style.transform !== "none") {
          try {
            const matrix = new DOMMatrixReadOnly(style.transform);
            if (!matrix.is2D || Math.abs(matrix.b) > 0.000001 || Math.abs(matrix.c) > 0.000001) {
              reasons.push(`${owner}:non-axis-transform`);
            } else if (Math.abs(matrix.a - 1) > 0.000001 || Math.abs(matrix.d - 1) > 0.000001) {
              reasons.push(`${owner}:non-unit-transform`);
            }
          } catch {
            reasons.push(`${owner}:unparsed-transform`);
          }
        }
        if (hasNonUnitIndividualScale(style)) reasons.push(`${owner}:individual-scale`);
        if (hasNonUnitZoom(style)) reasons.push(`${owner}:non-unit-zoom`);
        const rotate = style.rotate.trim().toLowerCase();
        if (rotate && rotate !== "none" && !/^z?\s*0(?:deg|grad|rad|turn)?$/i.test(rotate)) {
          reasons.push(`${owner}:non-axis-rotate`);
        }
        if (style.perspective && style.perspective !== "none") reasons.push(`${owner}:perspective`);
        if (style.filter && style.filter !== "none") reasons.push(`${owner}:filter`);
        if (style.textShadow && style.textShadow !== "none") reasons.push(`${owner}:text-shadow`);
        const textStrokeWidth = Number.parseFloat(style.getPropertyValue("-webkit-text-stroke-width"));
        const svgStrokeWidth = Number.parseFloat(style.strokeWidth);
        if (
          (Number.isFinite(textStrokeWidth) && textStrokeWidth > 0.000001) ||
          (
            current instanceof SVGElement &&
            style.stroke !== "none" &&
            Number.isFinite(svgStrokeWidth) &&
            svgStrokeWidth > 0.000001
          )
        ) reasons.push(`${owner}:text-stroke`);
        if (style.clipPath && style.clipPath !== "none") reasons.push(`${owner}:clip-path`);
        if (operativeLegacyClip(current)) reasons.push(`${owner}:legacy-clip`);
        if ([
          style.getPropertyValue("mask-image"),
          style.getPropertyValue("-webkit-mask-image")
        ].some((value) => value.split(",").some((layer) => {
          const normalized = layer.trim().toLowerCase();
          return Boolean(normalized) && normalized !== "none";
        }))) reasons.push(`${owner}:mask-image`);
        if (
          hasPaintContainment(style) &&
          current !== target &&
          !rectContainsRect(rectOf(current), rectOf(target))
        ) reasons.push(`${owner}:paint-containment`);
        if (
          hasRoundedCorners(style) &&
          (clipsOverflow(style.overflowX) || clipsOverflow(style.overflowY)) &&
          current !== target &&
          !roundedSafeInteriorContains(current, target)
        ) reasons.push(`${owner}:rounded-overflow-clip`);
        if (
          hasNonZeroOverflowClipMargin(style) &&
          current !== target &&
          !rectContainsRect(rectOf(current), rectOf(target))
        ) reasons.push(`${owner}:overflow-clip-margin`);
        if (current === document.documentElement) break;
        current = composedParentElement(current);
      }
      return [...new Set(reasons)];
    };
    const generatedContentHasText = (content: string) => {
      const normalized = content.trim();
      if (!normalized || ["none", "normal", '""', "''"].includes(normalized.toLowerCase())) return false;
      if (/^(?:url\([^)]*\)\s*)+$/i.test(normalized)) return false;
      return true;
    };
    const pseudoTextAncestorsPaint = (target: Element) => {
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden" ||
          Number(style.opacity) <= 0
        ) return false;
        current = composedParentElement(current);
      }
      return true;
    };
    for (const origin of rootDeepElements) {
      if (!pseudoTextAncestorsPaint(origin)) continue;
      for (const pseudo of ["::before", "::after"] as const) {
        const style = getComputedStyle(origin, pseudo);
        if (
          !generatedContentHasText(style.content) ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          style.contentVisibility === "hidden" ||
          Number(style.opacity) <= 0
        ) continue;
        findings.push(
          `text-generated-content-unsupported:${describe(origin)}:${pseudo}:${style.content.slice(0, 48)}`
        );
      }
      const markerStyle = getComputedStyle(origin, "::marker");
      const browserGeneratedMarker =
        origin instanceof HTMLLIElement &&
        getComputedStyle(origin).display === "list-item" &&
        getComputedStyle(origin).listStyleType !== "none" &&
        markerStyle.content.trim().toLowerCase() === "normal";
      if (
        (generatedContentHasText(markerStyle.content) || browserGeneratedMarker) &&
        markerStyle.display !== "none" &&
        markerStyle.visibility !== "hidden" &&
        markerStyle.visibility !== "collapse" &&
        markerStyle.contentVisibility !== "hidden" &&
        Number(markerStyle.opacity) > 0
      ) {
        findings.push(
          `text-generated-content-unsupported:${describe(origin)}:::marker:` +
          `${browserGeneratedMarker ? `normal:${getComputedStyle(origin).listStyleType}` : markerStyle.content.slice(0, 48)}`
        );
      }
    }
    for (const image of rootDeepElements.filter((target): target is HTMLImageElement => target instanceof HTMLImageElement)) {
      if (!visible(image) || !image.complete || image.naturalWidth > 0) continue;
      findings.push(
        `broken-replaced-content:${describe(image)}:alt=${(image.getAttribute("alt") ?? "").slice(0, 48)}`
      );
    }
    for (const imageInput of rootDeepElements.filter(
      (target): target is HTMLInputElement => target instanceof HTMLInputElement && target.type.toLowerCase() === "image"
    )) {
      const state = imageInput as HTMLInputElement & { complete?: boolean; naturalWidth?: number };
      if (!visible(imageInput) || state.complete === false || (state.naturalWidth ?? 0) > 0) continue;
      findings.push(
        `broken-replaced-content:${describe(imageInput)}:alt=${(imageInput.alt ?? "").slice(0, 48)}`
      );
    }
    const visibleTextNodes: Text[] = [];
    for (const textNode of deepTextNodes(rootElement)) {
      const target = textNode.parentElement;
      const targetStyle = target ? getComputedStyle(target) : null;
      if (
        target &&
        textNode.data.trim() &&
        !excludedTextAncestor(target) &&
        targetStyle &&
        targetStyle.visibility !== "hidden" &&
        targetStyle.visibility !== "collapse" &&
        pseudoTextAncestorsPaint(target)
      ) {
        visibleTextNodes.push(textNode);
      }
    }
    const visibleTextElements = Array.from(new Set(visibleTextNodes.map((node) => node.parentElement).filter(
      (target): target is HTMLElement => Boolean(target)
    )));
    for (const target of visibleTextElements) {
      if (!visible(target) || excludedTextAncestor(target)) continue;
      if (!(target instanceof HTMLElement)) continue;
      const style = getComputedStyle(target);
      const clipsX = ["auto", "clip", "hidden", "scroll"].includes(style.overflowX);
      const clipsY = ["auto", "clip", "hidden", "scroll"].includes(style.overflowY);
      if (clipsX && target.scrollWidth > target.clientWidth + 2) {
        findings.push(`text-clipped-x:${describe(target)}:${target.scrollWidth}-${target.clientWidth}px`);
      }
      if (clipsY && target.scrollHeight > target.clientHeight + 2) {
        findings.push(`text-clipped-y:${describe(target)}:${target.scrollHeight}-${target.clientHeight}px`);
      }
    }

    const controlSelector = options.learnerInteractiveSelector;
    const ancestorClipFindings = new Set<string>();
    const textPaintStateByTarget = new Map<HTMLElement, {
      degeneratePaint: boolean;
      hardClippedX: boolean;
      hardClippedY: boolean;
      hasVisiblePaint: boolean;
      unsupportedReasons: string[];
    }>();
    const textRuns: Array<{
      rects: RectLike[];
      target: HTMLElement;
      text: string;
      tokenIndex: number;
    }> = [];
    for (const node of visibleTextNodes) {
      const target = node.parentElement;
      if (!target) continue;
      const paintState = textPaintStateByTarget.get(target) ?? {
        degeneratePaint: false,
        hardClippedX: false,
        hardClippedY: false,
        hasVisiblePaint: false,
        unsupportedReasons: textPaintGeometryReasons(target)
      };
      textPaintStateByTarget.set(target, paintState);
      const value = node.data;
      let tokenIndex = 0;
      for (const token of value.matchAll(/\S+/gu)) {
        const rects: RectLike[] = [];
        const start = token.index ?? 0;
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + token[0].length);
        const rawTokenRects = Array.from(range.getClientRects());
        if (
          rawTokenRects.length === 0 ||
          rawTokenRects.every((tokenRect) => tokenRect.width <= 1 || tokenRect.height <= 1)
        ) {
          paintState.degeneratePaint = true;
          findings.push(`text-paint-degenerate:${describe(target)}:${token[0].slice(0, 40)}`);
        }
        for (const tokenRect of rawTokenRects) {
          if (tokenRect.width <= 1 || tokenRect.height <= 1) continue;
          const workspaceIntersection = intersectRect(tokenRect, rootRect);
          if (
            !workspaceIntersection ||
            workspaceIntersection.left > tokenRect.left + 0.5 ||
            workspaceIntersection.right < tokenRect.right - 0.5 ||
            workspaceIntersection.top > tokenRect.top + 0.5 ||
            workspaceIntersection.bottom < tokenRect.bottom - 0.5
          ) {
            findings.push(`text-outside-workspace:${describe(target)}:${token[0].slice(0, 40)}`);
          }
          const viewportIntersection = intersectRect(tokenRect, viewportRect());
          if (
            !viewportIntersection ||
            viewportIntersection.left > tokenRect.left + 0.5 ||
            viewportIntersection.right < tokenRect.right - 0.5 ||
            viewportIntersection.top > tokenRect.top + 0.5 ||
            viewportIntersection.bottom < tokenRect.bottom - 0.5
          ) {
            pushCandidateFinding(
              "viewport-text-clip",
              target,
              `text-clipped-by-viewport:${describe(target)}:${token[0].slice(0, 40)}`
            );
          }
          const clipped = effectivelyClippedRect(target, tokenRect, true, false);
          paintState.hardClippedX ||= clipped.hardClippedX;
          paintState.hardClippedY ||= clipped.hardClippedY;
          if (clipped.rect && clipped.rect.width > 1 && clipped.rect.height > 1) {
            paintState.hasVisiblePaint = true;
            rects.push(clipped.rect);
          }
        }
        range.detach();
        if (rects.length > 0) {
          textRuns.push({ rects, target, text: token[0], tokenIndex });
        }
        tokenIndex += 1;
      }
    }
    for (const [target, paintState] of textPaintStateByTarget) {
      if (!paintState.hasVisiblePaint && !paintState.degeneratePaint) continue;
      if (paintState.hardClippedX) {
        ancestorClipFindings.add(`text-clipped-by-ancestor-x:${describe(target)}`);
      }
      if (paintState.hardClippedY) {
        ancestorClipFindings.add(`text-clipped-by-ancestor-y:${describe(target)}`);
      }
      for (const reason of paintState.unsupportedReasons) {
        findings.push(`text-paint-unsupported:${describe(target)}:${reason}`);
      }
    }
    const deterministicFormTextRun = (
      target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    ) => {
      if (!visible(target)) return [];
      let hasDisplayedText = false;
      let displayedText = "";
      let multiline = false;
      let source = "displayed-value";
      if (target instanceof HTMLInputElement) {
        const type = target.type.toLowerCase();
        if (["hidden", "range", "checkbox", "radio", "color", "image"].includes(type)) return [];
        if (["date", "datetime-local", "file", "month", "password", "time", "week"].includes(type)) {
          findings.push(`text-ua-shadow-unsupported:${describe(target)}:input-${type}`);
          return [];
        }
        if (["reset", "submit"].includes(type) && !target.hasAttribute("value")) {
          findings.push(`text-ua-shadow-unsupported:${describe(target)}:input-${type}-default-label`);
          return [];
        }
        hasDisplayedText = Boolean(target.value || target.placeholder);
        displayedText = target.value || target.placeholder;
        source = target.value ? "input-value" : "input-placeholder";
      } else if (target instanceof HTMLTextAreaElement) {
        hasDisplayedText = Boolean(target.value || target.placeholder);
        displayedText = target.value || target.placeholder;
        multiline = true;
        source = target.value ? "textarea-value" : "textarea-placeholder";
      } else {
        const visibleOptions = target.multiple || target.size > 1
          ? Array.from(target.options)
          : Array.from(target.selectedOptions);
        displayedText = visibleOptions
          .map((option) => option.label.trim())
          .filter(Boolean)
          .join("\n");
        hasDisplayedText = Boolean(displayedText);
        multiline = target.multiple || target.size > 1;
        source = multiline ? "select-visible-options" : "select-selected-option";
      }
      if (!hasDisplayedText) return [];
      const raw = rectOf(target);
      const style = getComputedStyle(target);
      const px = (value: string) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const contentRect = rectFromEdges(
        raw.left + px(style.borderLeftWidth) + px(style.paddingLeft),
        raw.top + px(style.borderTopWidth) + px(style.paddingTop),
        raw.right - px(style.borderRightWidth) - px(style.paddingRight),
        raw.bottom - px(style.borderBottomWidth) - px(style.paddingBottom)
      );
      if (!contentRect) {
        findings.push(`text-form-measurement-unsupported:${describe(target)}:content-box`);
        return [];
      }
      const ancestorClippedContent = effectivelyClippedRect(target, contentRect, true, false).rect;
      if (!ancestorClippedContent || ancestorClippedContent.width <= 1 || ancestorClippedContent.height <= 1) {
        findings.push(`text-form-measurement-unsupported:${describe(target)}:clipped-content-box`);
        return [];
      }
      const paintReasons = textPaintGeometryReasons(target);
      for (const reason of paintReasons) {
        findings.push(`text-paint-unsupported:${describe(target)}:${reason}`);
      }
      const appearance = style.appearance.trim().toLowerCase();
      const fontSizePx = Math.max(0, px(style.fontSize));
      let availableTextWidth = contentRect.width;
      let nativeInlineEndReserve = 0;
      if (target instanceof HTMLSelectElement && !multiline && appearance !== "none") {
        if (style.writingMode !== "horizontal-tb") {
          findings.push(`text-ua-shadow-unsupported:${describe(target)}:select-writing-mode`);
        } else {
          nativeInlineEndReserve = Math.max(24, fontSizePx * 1.5);
        }
      }
      if (
        target instanceof HTMLInputElement &&
        target.type.toLowerCase() === "search" &&
        appearance !== "none" &&
        Boolean(target.value)
      ) {
        nativeInlineEndReserve = Math.max(nativeInlineEndReserve, Math.max(20, fontSizePx * 1.25));
      }
      availableTextWidth = Math.max(0, contentRect.width - nativeInlineEndReserve);
      const rightToLeft = style.direction === "rtl";
      const usableTextRect = rectFromEdges(
        contentRect.left + (rightToLeft ? nativeInlineEndReserve : 0),
        contentRect.top,
        contentRect.right - (rightToLeft ? 0 : nativeInlineEndReserve),
        contentRect.bottom
      );
      if (!usableTextRect || availableTextWidth <= 0) {
        findings.push(`text-form-measurement-unsupported:${describe(target)}:native-inline-reserve`);
        return [];
      }

      const typography = source.endsWith("placeholder")
        ? getComputedStyle(target, "::placeholder")
        : style;
      const mirror = document.createElement("div");
      mirror.setAttribute("aria-hidden", "true");
      mirror.setAttribute("data-california-visualization-audit-mirror", "true");
      mirror.textContent = displayedText;
      Object.assign(mirror.style, {
        border: "0",
        boxSizing: "content-box",
        direction: typography.direction,
        display: "block",
        fontFamily: typography.fontFamily,
        fontFeatureSettings: typography.fontFeatureSettings,
        fontKerning: typography.fontKerning,
        fontOpticalSizing: typography.fontOpticalSizing,
        fontSize: typography.fontSize,
        fontStretch: typography.fontStretch,
        fontStyle: typography.fontStyle,
        fontVariant: typography.fontVariant,
        fontVariationSettings: typography.fontVariationSettings,
        fontWeight: typography.fontWeight,
        left: "-100000px",
        letterSpacing: typography.letterSpacing,
        lineHeight: typography.lineHeight,
        margin: "0",
        maxWidth: "none",
        padding: "0",
        pointerEvents: "none",
        position: "fixed",
        textAlign: typography.textAlign,
        textIndent: typography.textIndent,
        textTransform: typography.textTransform,
        top: "0",
        visibility: "hidden",
        whiteSpace: multiline ? "pre-wrap" : "pre",
        wordBreak: typography.wordBreak,
        overflowWrap: typography.overflowWrap,
        writingMode: typography.writingMode
      });
      mirror.style.width = `${availableTextWidth}px`;
      document.body.append(mirror);
      const mirrorRect = mirror.getBoundingClientRect();
      const singleLineVerticalOffset = multiline
        ? 0
        : Math.max(0, (usableTextRect.height - mirrorRect.height) / 2);
      const textMeasureTolerance = 0.5 / Math.max(1, window.devicePixelRatio || 1);
      const horizontalScroll = target instanceof HTMLSelectElement ? 0 : target.scrollLeft;
      const verticalScroll = target instanceof HTMLInputElement ? 0 : target.scrollTop;
      const runs: typeof textRuns = [];
      let clippedX = false;
      let clippedY = false;
      let tokenIndex = 0;
      const mirrorText = mirror.firstChild;
      if (mirrorText instanceof Text) {
        for (const token of displayedText.matchAll(/\S+/gu)) {
          const start = token.index ?? 0;
          const range = document.createRange();
          range.setStart(mirrorText, start);
          range.setEnd(mirrorText, start + token[0].length);
          const mappedRects = Array.from(range.getClientRects()).map((rect) => ({
            bottom: usableTextRect.top + singleLineVerticalOffset + (rect.bottom - mirrorRect.top) - verticalScroll,
            height: rect.height,
            left: usableTextRect.left + (rect.left - mirrorRect.left) - horizontalScroll,
            right: usableTextRect.left + (rect.right - mirrorRect.left) - horizontalScroll,
            top: usableTextRect.top + singleLineVerticalOffset + (rect.top - mirrorRect.top) - verticalScroll,
            width: rect.width
          }));
          range.detach();
          const visibleRects: RectLike[] = [];
          for (const mappedRect of mappedRects) {
            const workspaceIntersection = intersectRect(mappedRect, rootRect);
            if (
              !workspaceIntersection ||
              workspaceIntersection.left > mappedRect.left + textMeasureTolerance ||
              workspaceIntersection.right < mappedRect.right - textMeasureTolerance ||
              workspaceIntersection.top > mappedRect.top + textMeasureTolerance ||
              workspaceIntersection.bottom < mappedRect.bottom - textMeasureTolerance
            ) {
              findings.push(`text-outside-workspace:${describe(target)}:${token[0].slice(0, 40)}`);
            }
            const viewportIntersection = intersectRect(mappedRect, viewportRect());
            if (
              !viewportIntersection ||
              viewportIntersection.left > mappedRect.left + textMeasureTolerance ||
              viewportIntersection.right < mappedRect.right - textMeasureTolerance ||
              viewportIntersection.top > mappedRect.top + textMeasureTolerance ||
              viewportIntersection.bottom < mappedRect.bottom - textMeasureTolerance
            ) {
              pushCandidateFinding(
                "viewport-text-clip",
                target,
                `text-clipped-by-viewport:${describe(target)}:${token[0].slice(0, 40)}`
              );
            }
            const contentIntersection = intersectRect(mappedRect, usableTextRect);
            clippedX ||= !contentIntersection ||
              contentIntersection.left > mappedRect.left + textMeasureTolerance ||
              contentIntersection.right < mappedRect.right - textMeasureTolerance;
            clippedY ||= !contentIntersection ||
              contentIntersection.top > mappedRect.top + textMeasureTolerance ||
              contentIntersection.bottom < mappedRect.bottom - textMeasureTolerance;
            if (!contentIntersection) continue;
            const finalRect = intersectRect(contentIntersection, ancestorClippedContent);
            if (finalRect && finalRect.width > 1 && finalRect.height > 1) visibleRects.push(finalRect);
          }
          if (visibleRects.length > 0) {
            runs.push({ rects: visibleRects, target, text: `${source}:${token[0]}`, tokenIndex });
          }
          tokenIndex += 1;
        }
      }
      const measured = mirrorRect;
      mirror.remove();
      if (clippedX || (!multiline && measured.width > availableTextWidth + textMeasureTolerance)) {
        findings.push(
          `text-form-clipped-x:${describe(target)}:${Math.max(measured.width, availableTextWidth).toFixed(1)}-` +
          `${availableTextWidth.toFixed(1)}px`
        );
      }
      if (clippedY || measured.height > contentRect.height + textMeasureTolerance) {
        findings.push(
          `text-form-clipped-y:${describe(target)}:${measured.height.toFixed(1)}-${contentRect.height.toFixed(1)}px`
        );
      }
      return runs;
    };
    for (const formControl of rootDeepElements.filter(
      (target): target is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
        (target instanceof HTMLInputElement && target.type.toLowerCase() !== "hidden") ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
    )) {
      if (textRuns.some((run) => run.target === formControl)) continue;
      textRuns.push(...deterministicFormTextRun(formControl));
    }
    const describeTextRun = (run: typeof textRuns[number]) =>
      `${describe(run.target)}[${run.text.replace(/\s+/g, " ").slice(0, 40)}#${run.tokenIndex}]`;
    findings.push(...ancestorClipFindings);

    const textOverlapTolerance = 0.5 / Math.max(1, window.devicePixelRatio || 1);
    for (let leftIndex = 0; leftIndex < textRuns.length; leftIndex += 1) {
      const left = textRuns[leftIndex];
      for (let rightIndex = leftIndex + 1; rightIndex < textRuns.length; rightIndex += 1) {
        const right = textRuns[rightIndex];

        let overlap = false;
        for (const leftRect of left.rects) {
          for (const rightRect of right.rects) {
            const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
            const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
            if (overlapWidth <= textOverlapTolerance || overlapHeight <= textOverlapTolerance) continue;
            overlap = true;
            break;
          }
          if (overlap) break;
        }
        if (overlap) findings.push(`dom-text-overlap:${describeTextRun(left)}<>${describeTextRun(right)}`);
      }
    }

    const enabled = (target: Element) =>
      !target.matches(":disabled") &&
      !closestComposed(target, "[inert]");
    const explicitlyHiddenOrUnrendered = (target: Element) => {
      let current: Element | null = target;
      while (current) {
        const html = current as HTMLElement;
        const style = getComputedStyle(current);
        if (
          style.display === "none" ||
          style.contentVisibility === "hidden"
        ) return true;
        current = composedParentElement(current);
      }
      return false;
    };
    const hasTransparentPaintAncestor = (target: Element) => {
      let current: Element | null = target;
      while (current) {
        if (Number(getComputedStyle(current).opacity) <= 0) return true;
        current = composedParentElement(current);
      }
      return false;
    };
    const interactiveHitTargetsFor = (control: HTMLElement) => {
      const targets: HTMLElement[] = [control];
      const labelableControl = control as HTMLElement & {
        labels?: NodeListOf<HTMLLabelElement> | null;
      };
      for (const label of Array.from(labelableControl.labels ?? [])) {
        if (label.control === control && composedContains(rootElement, label)) targets.push(label);
      }
      return [...new Set(targets)];
    };
    const interactiveHitTargetFor = (control: HTMLElement) => {
      const candidates = interactiveHitTargetsFor(control);
      return candidates.reduce((best, candidate) => {
        const candidateRect = effectivelyClippedRect(candidate, rectOf(candidate), false, false).rect;
        const bestRect = effectivelyClippedRect(best, rectOf(best), false, false).rect;
        const candidateScore = candidateRect ? Math.min(candidateRect.width, candidateRect.height) : -1;
        const bestScore = bestRect ? Math.min(bestRect.width, bestRect.height) : -1;
        // A label is a complete native activation region of its own. Prefer it
        // on an exact tie so a semantic label and its control resolve to the
        // same hit target, while never unioning disjoint label rectangles.
        return candidateScore >= bestScore ? candidate : best;
      });
    };
    const legacyClipEliminatesPaint = (target: Element) => {
      let current: Element | null = target;
      while (current) {
        const clip = operativeLegacyClip(current);
        const match = clip?.match(/^rect\(([^)]+)\)$/);
        if (match) {
          const edges = match[1].split(/\s*,\s*|\s+/).filter(Boolean).map((value) => Number.parseFloat(value));
          if (
            edges.length === 4 &&
            edges.every(Number.isFinite) &&
            (edges[1] <= edges[3] || edges[2] <= edges[0])
          ) return true;
        }
        current = composedParentElement(current);
      }
      return false;
    };
    const controlIsPhysicallyExposed = (control: HTMLElement) => {
      const target = interactiveHitTargetFor(control);
      if (!visible(target) || legacyClipEliminatesPaint(target)) return false;
      const rect = effectivelyClippedRect(target, rectOf(target), false, false).rect;
      return Boolean(rect && rect.width > 0 && rect.height > 0);
    };
    const learnerControlCandidates = rootDeepElements.filter((target) =>
      target.matches(controlSelector) ||
      ("tabIndex" in target && Number((target as HTMLElement).tabIndex) >= 0)
    ) as HTMLElement[];
    const inventoriedControls = learnerControlCandidates.filter((target) => {
      const semanticControl = target.matches(options.semanticInteractiveSelector);
      const focusableCustomControl = Number(target.tabIndex) >= 0;
      return (
        (semanticControl || focusableCustomControl) &&
        enabled(target) &&
        !explicitlyHiddenOrUnrendered(target)
      );
    });
    for (const control of inventoriedControls) {
      const target = interactiveHitTargetFor(control);
      const targetStyle = getComputedStyle(target);
      const targetRect = rectOf(target);
      const pointerPresented =
        pointerPresentationAncestorsAllow(target) &&
        targetStyle.pointerEvents !== "none";
      if (pointerPresented && hasTransparentPaintAncestor(target)) {
        findings.push(`touch-target-invisible-pointer-operable:${describe(control)}:opacity-zero`);
      }
      if (
        Number(control.tabIndex) >= 0 &&
        (!visible(target) || hasTransparentPaintAncestor(target))
      ) {
        findings.push(`touch-target-invisible-focusable:${describe(control)}:keyboard-focus-trap`);
      }
      const hasOperableDescendant = deepElements(target)
        .some((descendant) => pointerOperableCandidate(descendant as HTMLElement));
      if (
        targetStyle.display === "contents" ||
        targetRect.width <= 0 ||
        targetRect.height <= 0
      ) {
        findings.push(
          `touch-target-unsupported-geometry:${describe(control)}:` +
          `${targetStyle.display === "contents" ? "display-contents:" : ""}` +
          `zero-principal-box${hasOperableDescendant ? ":operable-descendant" : ""}`
        );
      }
    }
    const controls = inventoriedControls.filter((target) => controlIsPhysicallyExposed(target));

    for (const equivalentRoot of rootDeepElements.filter(
      (target): target is HTMLElement => target instanceof HTMLElement && target.matches("[data-viz-keyboard-equivalent]")
    )) {
      const equivalentId = equivalentRoot.getAttribute("data-viz-keyboard-equivalent") ?? "unnamed";
      if (!visible(equivalentRoot)) {
        findings.push(`keyboard-equivalent-hidden:${equivalentId}`);
        continue;
      }
      const focusable = [equivalentRoot, ...Array.from(equivalentRoot.querySelectorAll<HTMLElement>(
        'button,input,select,textarea,a[href],[tabindex]'
      ))].some((target) => {
        const formControl = target as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        return visible(target) && !formControl.disabled && target.tabIndex >= 0;
      });
      if (!focusable) findings.push(`keyboard-equivalent-not-focusable:${equivalentId}`);
    }

    const resolvedTargets = new Map<HTMLElement, HTMLElement>();
    const controlsByResolvedTarget = new Map<HTMLElement, HTMLElement[]>();
    for (const control of controls) {
      const target = interactiveHitTargetFor(control);
      resolvedTargets.set(control, target);
      const sharingControls = controlsByResolvedTarget.get(target) ?? [];
      sharingControls.push(control);
      controlsByResolvedTarget.set(target, sharingControls);
    }
    for (const [target, sharingControls] of controlsByResolvedTarget) {
      if (sharingControls.length < 2) continue;
      findings.push(
        `controls-share-hit-target:${sharingControls.map(describe).join("<>")}:${describe(target)}`
      );
    }

    const parsedAngleInRadians = (value: string) => {
      const match = value.trim().match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))(deg|grad|rad|turn)$/i);
      if (!match) return null;
      const amount = Number(match[1]);
      if (!Number.isFinite(amount)) return null;
      if (match[2].toLowerCase() === "deg") return amount * Math.PI / 180;
      if (match[2].toLowerCase() === "grad") return amount * Math.PI / 200;
      if (match[2].toLowerCase() === "turn") return amount * Math.PI * 2;
      return amount;
    };
    const hasNonAxisIndividualRotation = (rotate: string) => {
      const normalized = rotate.trim().toLowerCase();
      if (!normalized || normalized === "none") return false;
      const tokens = normalized.split(/\s+/);
      const angleToken = tokens.at(-1) ?? "";
      if (tokens.length > 1 && tokens[0] !== "z") return true;
      const angle = parsedAngleInRadians(angleToken);
      return angle === null || Math.abs(Math.sin(angle)) > 0.000001;
    };
    const hasMaskImage = (style: CSSStyleDeclaration) => [
      style.getPropertyValue("mask-image"),
      style.getPropertyValue("-webkit-mask-image")
    ].some((value) => value.split(",").some((layer) => {
      const normalized = layer.trim().toLowerCase();
      return Boolean(normalized) && normalized !== "none";
    }));
    const unsupportedGeometryReasons = (target: Element) => {
      const reasons: string[] = [];
      let current: Element | null = target;
      while (current) {
        const style = getComputedStyle(current);
        const owner = current === target ? "target" : `ancestor(${describe(current)})`;
        if (current === target && style.pointerEvents === "none") {
          reasons.push(`${owner}:pointer-events-none`);
        }
        if (style.transform && style.transform !== "none") {
          try {
            const matrix = new DOMMatrixReadOnly(style.transform);
            if (!matrix.is2D || Math.abs(matrix.b) > 0.000001 || Math.abs(matrix.c) > 0.000001) {
              reasons.push(`${owner}:non-axis-transform`);
            }
          } catch {
            reasons.push(`${owner}:unparsed-transform`);
          }
        }
        if (hasNonAxisIndividualRotation(style.rotate)) {
          reasons.push(`${owner}:non-axis-rotate`);
        }
        if (style.perspective && style.perspective !== "none") {
          reasons.push(`${owner}:perspective`);
        }
        if (style.clipPath && style.clipPath !== "none") {
          reasons.push(`${owner}:clip-path`);
        }
        if (operativeLegacyClip(current)) {
          reasons.push(`${owner}:legacy-clip`);
        }
        if (hasMaskImage(style)) reasons.push(`${owner}:mask-image`);
        if (
          hasPaintContainment(style) &&
          current !== target &&
          !rectContainsRect(rectOf(current), rectOf(target))
        ) reasons.push(`${owner}:paint-containment`);
        if (
          hasRoundedCorners(style) &&
          (clipsOverflow(style.overflowX) || clipsOverflow(style.overflowY)) &&
          current !== target &&
          !roundedSafeInteriorContains(current, target)
        ) reasons.push(`${owner}:rounded-overflow-clip`);
        if (
          hasNonZeroOverflowClipMargin(style) &&
          current !== target &&
          !rectContainsRect(rectOf(current), rectOf(target))
        ) reasons.push(`${owner}:overflow-clip-margin`);
        if (current === document.documentElement) break;
        current = composedParentElement(current);
      }
      return [...new Set(reasons)];
    };
    const nonRectGeometryReasons = (target: Element) => {
      if (target instanceof SVGElement) return ["svg-geometry"];
      const style = getComputedStyle(target);
      const rounded = [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius
      ].some(nonZeroCssGeometryValue);
      const shaped = [
        style.getPropertyValue("shape-outside"),
        style.getPropertyValue("offset-path")
      ].some((value) => {
        const normalized = value.trim().toLowerCase();
        return Boolean(normalized) && normalized !== "none";
      });
      return rounded || shaped ? ["nonrect-geometry"] : [];
    };
    const targetTopologyReasons = (target: HTMLElement) => {
      const clientRects = Array.from(target.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const reasons: string[] = [];
      if (clientRects.length !== 1) reasons.push("fragmented-target-client-rects");
      if (!(target instanceof HTMLElement)) reasons.push("non-html-target-geometry");
      if (target instanceof SVGElement) reasons.push("svg-target-geometry");
      const style = getComputedStyle(target);
      for (const [property, value] of [
        ["shape-outside", style.getPropertyValue("shape-outside")],
        ["offset-path", style.getPropertyValue("offset-path")]
      ] as const) {
        const normalized = value.trim().toLowerCase();
        if (normalized && normalized !== "none") reasons.push(`target-${property}`);
      }
      return [...new Set(reasons)];
    };
    const documentHitTestCandidates: Element[] = [
      document.documentElement,
      document.body,
      ...deepElements(document.body)
    ];
    const pseudoPointerOrigins = documentHitTestCandidates.flatMap((origin) => {
      if (!pseudoPointerPresentationAncestorsAllow(origin)) return [];
      return (["::before", "::after"] as const).flatMap((pseudo) => {
        const style = getComputedStyle(origin, pseudo);
        const content = style.content.trim().toLowerCase();
        if (
          !content ||
          content === "none" ||
          content === "normal" ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.visibility === "collapse" ||
          style.contentVisibility === "hidden" ||
          style.pointerEvents === "none"
        ) return [];
        return [{ origin, pseudo }];
      });
    });
    const ownershipPartitionCoordinates = (
      start: number,
      end: number,
      boundaries: number[]
    ) => {
      const ordered = [...new Set(boundaries.filter((value) =>
        Number.isFinite(value) && value >= start && value <= end
      ))].sort((left, right) => left - right);
      if (ordered[0] !== start) ordered.unshift(start);
      if (ordered.at(-1) !== end) ordered.push(end);
      if (ordered.length > 128) return null;
      const coordinates = new Set<number>();
      const deviceHalfPixel = 0.5 / Math.max(1, window.devicePixelRatio || 1);
      for (let index = 0; index < ordered.length - 1; index += 1) {
        const left = ordered[index];
        const right = ordered[index + 1];
        if (right <= left) continue;
        coordinates.add(left + (right - left) / 2);
      }
      for (let index = 0; index < ordered.length; index += 1) {
        const boundary = ordered[index];
        if (boundary > start && boundary < end) coordinates.add(boundary);
        const left = ordered[index - 1];
        if (left !== undefined && boundary > left) {
          coordinates.add(boundary - Math.min(deviceHalfPixel, (boundary - left) / 2));
        }
        const right = ordered[index + 1];
        if (right !== undefined && right > boundary) {
          coordinates.add(boundary + Math.min(deviceHalfPixel, (right - boundary) / 2));
        }
      }
      return [...coordinates].filter((value) => value > start && value < end).sort((left, right) => left - right);
    };
    const cssRadiusComponent = (value: string, extent: number) => {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return 0;
      if (normalized.endsWith("%")) {
        const percentage = Number.parseFloat(normalized);
        return Number.isFinite(percentage) ? extent * percentage / 100 : null;
      }
      const amount = Number.parseFloat(normalized);
      return Number.isFinite(amount) ? amount : null;
    };
    const pointWithinRoundedTargetHitShape = (target: HTMLElement, x: number, y: number) => {
      const targetRect = rectOf(target);
      const style = getComputedStyle(target);
      const parseRadius = (value: string) => {
        const parts = value.trim().split(/\s+/).filter(Boolean);
        const radiusX = cssRadiusComponent(parts[0] ?? "0", targetRect.width);
        const radiusY = cssRadiusComponent(parts[1] ?? parts[0] ?? "0", targetRect.height);
        return radiusX === null || radiusY === null ? null : { x: radiusX, y: radiusY };
      };
      const topLeft = parseRadius(style.borderTopLeftRadius);
      const topRight = parseRadius(style.borderTopRightRadius);
      const bottomRight = parseRadius(style.borderBottomRightRadius);
      const bottomLeft = parseRadius(style.borderBottomLeftRadius);
      if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;
      const radii = [topLeft, topRight, bottomRight, bottomLeft];
      const scale = Math.min(
        1,
        targetRect.width / Math.max(0.000001, topLeft.x + topRight.x),
        targetRect.width / Math.max(0.000001, bottomLeft.x + bottomRight.x),
        targetRect.height / Math.max(0.000001, topLeft.y + bottomLeft.y),
        targetRect.height / Math.max(0.000001, topRight.y + bottomRight.y)
      );
      for (const radius of radii) {
        radius.x *= scale;
        radius.y *= scale;
      }
      const withinCorner = (
        radius: { x: number; y: number },
        centerX: number,
        centerY: number,
        cornerX: "left" | "right",
        cornerY: "top" | "bottom"
      ) => {
        if (radius.x <= 0 || radius.y <= 0) return true;
        const inCornerX = cornerX === "left" ? x < centerX : x > centerX;
        const inCornerY = cornerY === "top" ? y < centerY : y > centerY;
        if (!inCornerX || !inCornerY) return true;
        return (
          ((x - centerX) ** 2) / (radius.x ** 2) +
          ((y - centerY) ** 2) / (radius.y ** 2)
        ) <= 1.000001;
      };
      return (
        withinCorner(topLeft, targetRect.left + topLeft.x, targetRect.top + topLeft.y, "left", "top") &&
        withinCorner(topRight, targetRect.right - topRight.x, targetRect.top + topRight.y, "right", "top") &&
        withinCorner(bottomRight, targetRect.right - bottomRight.x, targetRect.bottom - bottomRight.y, "right", "bottom") &&
        withinCorner(bottomLeft, targetRect.left + bottomLeft.x, targetRect.bottom - bottomLeft.y, "left", "bottom")
      );
    };
    const exhaustiveCoreOwnershipFindings = (
      control: HTMLElement,
      target: HTMLElement,
      rect: RectLike
    ) => {
      if (
        rect.width < options.minimumTouchTargetSizePx ||
        rect.height < options.minimumTouchTargetSizePx
      ) return [];
      auditedControlCount += 1;
      const halfCore = options.minimumTouchTargetSizePx / 2;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const coreRect = rectFromEdges(
        centerX - halfCore,
        centerY - halfCore,
        centerX + halfCore,
        centerY + halfCore
      );
      if (!coreRect) return [`touch-target-core-missing:${describe(control)}`];

      const coreFindings = new Set<string>();

      const xBoundaries = [coreRect.left, coreRect.right];
      const yBoundaries = [coreRect.top, coreRect.bottom];
      const pseudoFallbackRequired = pseudoPointerOrigins.length > 0;
      let unsupportedGeometryFallbackRequired = false;
      let requiresDevicePixelFallback = pseudoFallbackRequired;
      for (const candidate of documentHitTestCandidates) {
        if (
          candidate === target ||
          composedContains(candidate, target) ||
          !pointerOperableCandidate(candidate as HTMLElement)
        ) continue;
        const rawCandidateRects = Array.from(candidate.getClientRects())
          .filter((candidateRect) => candidateRect.width > 0 && candidateRect.height > 0);
        const candidateRects = rawCandidateRects
          .map((candidateRect) => effectivelyClippedRect(candidate, candidateRect, false, true, true).rect)
          .filter((candidateRect): candidateRect is RectLike => Boolean(
            candidateRect && candidateRect.width > 0 && candidateRect.height > 0
          ));
        const intersections = candidateRects
          .map((candidateRect) => intersectRect(coreRect, candidateRect))
          .filter((intersection): intersection is RectLike => Boolean(intersection));
        if (intersections.length === 0) continue;
        for (const intersection of intersections) {
          xBoundaries.push(intersection.left, intersection.right);
          yBoundaries.push(intersection.top, intersection.bottom);
        }

        const unsupportedCandidateReasons = [
          ...unsupportedGeometryReasons(candidate),
          ...(rawCandidateRects.length > 1 ? ["fragmented-client-rects"] : []),
          ...nonRectGeometryReasons(candidate)
        ];
        unsupportedGeometryFallbackRequired ||= unsupportedCandidateReasons.length > 0;
        requiresDevicePixelFallback ||= unsupportedCandidateReasons.length > 0;
      }

      let xCoordinates = ownershipPartitionCoordinates(coreRect.left, coreRect.right, xBoundaries);
      let yCoordinates = ownershipPartitionCoordinates(coreRect.top, coreRect.bottom, yBoundaries);
      const boundaryLimitAxes = [!xCoordinates ? "x" : "", !yCoordinates ? "y" : ""]
        .filter(Boolean)
        .join("+");
      const cellProductLimit = Boolean(
        xCoordinates && yCoordinates && xCoordinates.length * yCoordinates.length > 32_768
      );
      requiresDevicePixelFallback ||= Boolean(boundaryLimitAxes) || cellProductLimit;
      const devicePixelCoordinates = (start: number, end: number) => {
        const scale = Math.max(1, window.devicePixelRatio || 1);
        const firstPixel = Math.floor(start * scale);
        const lastPixel = Math.ceil(end * scale);
        const values: number[] = [];
        for (let pixel = firstPixel; pixel < lastPixel; pixel += 1) {
          const center = (pixel + 0.5) / scale;
          if (center > start && center < end) values.push(center);
        }
        return values;
      };
      if (requiresDevicePixelFallback || !xCoordinates || !yCoordinates) {
        devicePixelFallbackControlCount += 1;
        if (pseudoFallbackRequired) pseudoFallbackControlCount += 1;
        if (boundaryLimitAxes || cellProductLimit) partitionLimitFallbackControlCount += 1;
        if (unsupportedGeometryFallbackRequired) unsupportedGeometryFallbackControlCount += 1;
        xCoordinates = devicePixelCoordinates(coreRect.left, coreRect.right);
        yCoordinates = devicePixelCoordinates(coreRect.top, coreRect.bottom);
      }
      const directlyActivates = (candidate: Element) => {
        const eventAttributes = [
          "onclick",
          "onmousedown",
          "onmouseup",
          "onpointerdown",
          "onpointerup",
          "ontouchend",
          "ontouchstart"
        ];
        const reactPointerHandler = Object.keys(candidate).some((key) => {
          if (!key.startsWith("__reactProps$")) return false;
          const props = (candidate as unknown as Record<string, unknown>)[key];
          if (!props || typeof props !== "object") return false;
          const record = props as Record<string, unknown>;
          return [
            "onClick",
            "onMouseDown",
            "onMouseUp",
            "onPointerDown",
            "onPointerUp",
            "onTouchEnd",
            "onTouchStart"
          ].some((property) => typeof record[property] === "function");
        });
        const nativePointerProperty = eventAttributes.some((attribute) =>
          typeof (candidate as unknown as Record<string, unknown>)[attribute] === "function"
        );
        const registeredPointerListener = Array.from(
          auditRegistry?.directPointerListeners.get(candidate)?.values() ?? []
        ).some((listeners) => listeners.size > 0);
        return (
          candidate.matches(options.semanticInteractiveSelector) ||
          ("tabIndex" in candidate && Number((candidate as HTMLElement).tabIndex) >= 0) ||
          getComputedStyle(candidate).cursor === "pointer" ||
          eventAttributes.some((attribute) => candidate.hasAttribute(attribute)) ||
          nativePointerProperty ||
          reactPointerHandler ||
          registeredPointerListener
        );
      };
      const activeOwnedDescendant = (hit: Element) => {
        let current: Element | null = hit;
        while (current && current !== target) {
          if (directlyActivates(current)) return current;
          current = composedParentElement(current);
        }
        return null;
      };
      let ownershipFailure = false;
      for (let xIndex = 0; xIndex < xCoordinates.length; xIndex += 1) {
        for (let yIndex = 0; yIndex < yCoordinates.length; yIndex += 1) {
          const x = xCoordinates[xIndex];
          const y = yCoordinates[yIndex];
          const cellId = `${xIndex}-${yIndex}`;
          const withinTargetHitShape = pointWithinRoundedTargetHitShape(target, x, y);
          if (withinTargetHitShape === null) {
            coreFindings.add(`touch-target-core-target-radius-unsupported:${describe(control)}:${cellId}`);
            continue;
          }
          if (!withinTargetHitShape) continue;
          coreHitTestCount += 1;
          const hit = deepElementFromPoint(x, y);
          if (!hit) {
            ownershipFailure = true;
            coreFindings.add(`touch-target-core-hit-test-miss:${describe(control)}`);
            continue;
          }
          const exactAssociatedNativeControlHit =
            target instanceof HTMLLabelElement &&
            target.control === control &&
            hit === control;
          const nativeSelectOptionHit =
            target instanceof HTMLSelectElement &&
            hit instanceof HTMLOptionElement &&
            hit.closest("select") === target;
          if (
            hit !== target &&
            !exactAssociatedNativeControlHit &&
            !nativeSelectOptionHit &&
            composedContains(target, hit)
          ) {
            const activeDescendant = activeOwnedDescendant(hit);
            if (activeDescendant) {
              ownershipFailure = true;
              coreFindings.add(
                `touch-target-core-owned-descendant-intercepts:${describe(control)}:${describe(activeDescendant)}`
              );
            }
          } else if (hit !== target && !exactAssociatedNativeControlHit) {
            if (nativeSelectOptionHit) continue;
            ownershipFailure = true;
            const hitReasons = [
              ...unsupportedGeometryReasons(hit),
              ...(Array.from(hit.getClientRects()).filter((hitRect) => hitRect.width > 0 && hitRect.height > 0).length > 1
                ? ["fragmented-client-rects"]
                : []),
              ...nonRectGeometryReasons(hit)
            ];
            for (const reason of new Set(hitReasons)) {
              coreFindings.add(
                `touch-target-core-overlay-unsupported:${describe(control)}:${describe(hit)}:${reason}`
              );
            }
            coreFindings.add(
              `touch-target-core-cell-blocked:${describe(control)}:${describe(hit)}`
            );
          }
        }
      }
      if (ownershipFailure && boundaryLimitAxes) {
        coreFindings.add(
          `touch-target-core-partition-limit:${describe(control)}:boundary-count:${boundaryLimitAxes}:` +
          `${xBoundaries.length}x${yBoundaries.length}`
        );
      }
      if (ownershipFailure && cellProductLimit) {
        coreFindings.add(
          `touch-target-core-partition-limit:${describe(control)}:cell-product:` +
          `${xCoordinates.length}x${yCoordinates.length}`
        );
      }
      return [...coreFindings];
    };

    for (const control of controls) {
      const target = resolvedTargets.get(control) ?? control;
      for (const reason of unsupportedGeometryReasons(target)) {
        const prefix = reason.endsWith(":pointer-events-none")
          ? "touch-target-pointer-events-none"
          : "touch-target-unsupported-geometry";
        pushCandidateFinding("touch", control, `${prefix}:${describe(control)}:${reason}`);
      }
      for (const reason of targetTopologyReasons(target)) {
        pushCandidateFinding(
          "touch",
          control,
          `touch-target-unsupported-geometry:${describe(control)}:${reason}`
        );
      }
      const rawRect = rectOf(target);
      const clippedMeasurement = effectivelyClippedRect(target, rawRect, false);
      const rect = clippedMeasurement.rect;
      const clipped =
        !rect ||
        rect.left > rawRect.left + 0.5 || rect.right < rawRect.right - 0.5 ||
        rect.top > rawRect.top + 0.5 || rect.bottom < rawRect.bottom - 0.5;
      if (!rect) {
        pushCandidateFinding(
          "touch",
          control,
          `touch-target-invisible:${describe(control)}:${options.viewport}`
        );
        continue;
      }
      for (const finding of exhaustiveCoreOwnershipFindings(control, target, rect)) {
        pushCandidateFinding("touch", control, finding);
      }
      if (clipped) {
        pushCandidateFinding(
          "touch",
          control,
          `touch-target-clipped:${describe(control)}:${rawRect.width.toFixed(1)}x${rawRect.height.toFixed(1)}` +
          `->${rect.width.toFixed(1)}x${rect.height.toFixed(1)}:${options.viewport}`
        );
      }
      if (
        !Number.isFinite(rect.width) ||
        !Number.isFinite(rect.height) ||
        rect.width < options.minimumTouchTargetSizePx ||
        rect.height < options.minimumTouchTargetSizePx
      ) {
        pushCandidateFinding(
          "touch",
          control,
          `touch-target-small:${describe(control)}:${rect.width.toFixed(1)}x${rect.height.toFixed(1)}:${options.viewport}`
        );
      }
    }

    for (let leftIndex = 0; leftIndex < controls.length; leftIndex += 1) {
      const left = controls[leftIndex];
      const leftTarget = resolvedTargets.get(left) ?? left;
      const leftRect = effectiveRect(leftTarget);
      if (!leftRect) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < controls.length; rightIndex += 1) {
        const right = controls[rightIndex];
        if (composedContains(left, right) || composedContains(right, left)) {
          findings.push(`controls-nested:${describe(left)}<>${describe(right)}`);
          continue;
        }
        const rightTarget = resolvedTargets.get(right) ?? right;
        if (leftTarget === rightTarget) continue;
        if (composedContains(leftTarget, rightTarget) || composedContains(rightTarget, leftTarget)) {
          findings.push(
            `controls-resolved-target-nested:${describe(left)}<>${describe(right)}:` +
            `${describe(leftTarget)}<>${describe(rightTarget)}`
          );
          continue;
        }
        const rightRect = effectiveRect(rightTarget);
        if (!rightRect) continue;
        const overlapWidth = Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left);
        const overlapHeight = Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top);
        if (overlapWidth > 3 && overlapHeight > 3) {
          findings.push(`controls-overlap:${describe(left)}<>${describe(right)}:${overlapWidth.toFixed(1)}x${overlapHeight.toFixed(1)}`);
        }
      }
    }

    for (const canvas of Array.from(rootElement.querySelectorAll<HTMLCanvasElement>("canvas"))) {
      if (!visible(canvas)) continue;
      const rawRect = rectOf(canvas);
      const clipped = effectivelyClippedRect(canvas, rawRect, false, false);
      const rect = clipped.rect;
      const surface = canvas.closest("[data-viz-surface]");
      if (canvas.width <= 0 || canvas.height <= 0) findings.push(`canvas-empty-buffer:${canvas.width}x${canvas.height}`);
      if (!rect) {
        findings.push(`canvas-clipped-by-ancestor:${canvas.width}x${canvas.height}:fully-clipped`);
        continue;
      }
      if (clipped.ancestorClippedX || clipped.ancestorClippedY) {
        findings.push(
          `canvas-clipped-by-ancestor:${rawRect.width.toFixed(1)}x${rawRect.height.toFixed(1)}` +
          `->${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`
        );
      }
      if (rect.width < 120 || rect.height < 100) findings.push(`canvas-css-size-small:${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
      if (surface) {
        const surfaceRect = effectiveRect(surface);
        if (surfaceRect && (rect.left < surfaceRect.left - tolerance || rect.right > surfaceRect.right + tolerance || rect.top < surfaceRect.top - tolerance || rect.bottom > surfaceRect.bottom + tolerance)) {
          findings.push(`canvas-outside-surface:${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
        }
      }
      if (canvas.width > 0 && canvas.height > 0 && rect.width > 0 && rect.height > 0) {
        const bufferAspect = canvas.width / canvas.height;
        const cssAspect = rect.width / rect.height;
        const aspectDrift = Math.abs(bufferAspect - cssAspect) / Math.max(bufferAspect, cssAspect);
        if (aspectDrift > 0.15) findings.push(`canvas-aspect-drift:${bufferAspect.toFixed(3)}<>${cssAspect.toFixed(3)}`);
      }
    }

    findings.push(...traversalLimitFindings);
    return {
      candidateFindingRecords,
      findings,
      touchAudit: {
        auditDurationMs: performance.now() - auditStartedAt,
        auditedControlCount,
        coreHitTestCount,
        devicePixelFallbackControlCount,
        partitionLimitFallbackControlCount,
        pseudoFallbackControlCount,
        unsupportedGeometryFallbackControlCount
      }
    };
  }, {
    learnerInteractiveSelector: CALIFORNIA_LEARNER_INTERACTIVE_SELECTOR,
    minimumTouchTargetSizePx: CALIFORNIA_MINIMUM_TOUCH_TARGET_SIZE_PX,
    semanticInteractiveSelector: CALIFORNIA_SEMANTIC_INTERACTIVE_SELECTOR,
    viewport: axis.viewport,
    viewportAuditToken,
    viewportFocusIndex
  });

  type CurrentGeometryAudit = Awaited<ReturnType<typeof evaluateCurrentGeometry>>;
  const geometryAudits: CurrentGeometryAudit[] = [];
  let mergedFindingEntries: Array<{ baselineIndex: number | null; finding: string }> = [];
  try {
    const baseline = await evaluateCurrentGeometry(null);
    geometryAudits.push(baseline);
    mergedFindingEntries = baseline.findings.map((finding, baselineIndex) => ({
      baselineIndex,
      finding
    }));

    for (let candidateIndex = 0; candidateIndex < viewportAuditCandidateCount; candidateIndex += 1) {
      const preparation = await prepareCaliforniaViewportRecheck(root, viewportAuditToken, candidateIndex);

      let focusedAudit: CurrentGeometryAudit | null = null;
      let restoration: {
        descriptor: string;
        environmentRestored: boolean;
        layoutMutated: boolean;
        restored: boolean;
        stable: boolean;
      } | null = null;
      try {
        if (preparation.prepared) {
          focusedAudit = await evaluateCurrentGeometry(candidateIndex);
          geometryAudits.push(focusedAudit);
        }
      } finally {
        restoration = await restoreCaliforniaViewportRecheck(root, viewportAuditToken, candidateIndex);
      }

      if (focusedAudit) {
        const baselineReplaceIndices = new Set(
          baseline.candidateFindingRecords
            .filter((record) =>
              (record.category === "viewport-text-clip" || record.category === "touch") &&
              record.candidateIndices.includes(candidateIndex)
            )
            .map((record) => record.findingIndex)
        );
        const focusedViewportIndices = new Set(
          focusedAudit.candidateFindingRecords
            .filter((record) =>
              (record.category === "viewport-text-clip" || record.category === "touch") &&
              record.candidateIndices.includes(candidateIndex)
            )
            .map((record) => record.findingIndex)
        );
        const focusedViewportFindings = focusedAudit.findings.filter((_finding, findingIndex) =>
          focusedViewportIndices.has(findingIndex)
        );
        mergedFindingEntries = mergedFindingEntries.filter((entry) =>
          entry.baselineIndex === null || !baselineReplaceIndices.has(entry.baselineIndex)
        );
        mergedFindingEntries.push(...focusedViewportFindings.map((finding) => ({
          baselineIndex: null,
          finding
        })));
      }
      const descriptor = preparation.descriptor || restoration?.descriptor || `candidate-${candidateIndex}`;
      if (!preparation.prepared) {
        mergedFindingEntries.push({
          baselineIndex: null,
          finding: `touch-target-viewport-recheck-failed:${descriptor}:candidate-unavailable`
        });
      } else {
        if (!preparation.stable) {
          mergedFindingEntries.push({
            baselineIndex: null,
            finding: `touch-target-layout-unstable:${descriptor}:viewport-recheck`
          });
        }
        if (preparation.layoutMutated || restoration?.layoutMutated) {
          mergedFindingEntries.push({
            baselineIndex: null,
            finding: `touch-target-layout-mutated:${descriptor}:viewport-recheck`
          });
        }
        if (!restoration?.stable) {
          mergedFindingEntries.push({
            baselineIndex: null,
            finding: `touch-target-layout-unstable:${descriptor}:restore`
          });
        }
        if (!restoration?.restored) {
          mergedFindingEntries.push({
            baselineIndex: null,
            finding: `touch-target-scroll-restore-failed:${descriptor}`
          });
        }
        if (!restoration?.environmentRestored) {
          mergedFindingEntries.push({
            baselineIndex: null,
            finding: `touch-target-environment-restore-failed:${descriptor}`
          });
        }
      }
    }
  } finally {
    await root.evaluate((element, token) => {
      type ViewportAuditSession = {
        candidates: Array<{ activePreparation?: { disconnect: () => void } }>;
      };
      const sessions = (globalThis as typeof globalThis & {
        __californiaVisualizationViewportAudits?: Map<string, ViewportAuditSession>;
      }).__californiaVisualizationViewportAudits;
      const session = sessions?.get(token);
      for (const candidate of session?.candidates ?? []) {
        candidate.activePreparation?.disconnect();
      }
      sessions?.delete(token);
    }, viewportAuditToken).catch(() => undefined);
  }

  const evaluated = {
    findings: mergedFindingEntries.map((entry) => entry.finding),
    touchAudit: geometryAudits.reduce((combined, audit) => ({
      auditDurationMs: combined.auditDurationMs + audit.touchAudit.auditDurationMs,
      auditedControlCount: combined.auditedControlCount + audit.touchAudit.auditedControlCount,
      coreHitTestCount: combined.coreHitTestCount + audit.touchAudit.coreHitTestCount,
      devicePixelFallbackControlCount:
        combined.devicePixelFallbackControlCount + audit.touchAudit.devicePixelFallbackControlCount,
      partitionLimitFallbackControlCount:
        combined.partitionLimitFallbackControlCount + audit.touchAudit.partitionLimitFallbackControlCount,
      pseudoFallbackControlCount:
        combined.pseudoFallbackControlCount + audit.touchAudit.pseudoFallbackControlCount,
      unsupportedGeometryFallbackControlCount:
        combined.unsupportedGeometryFallbackControlCount + audit.touchAudit.unsupportedGeometryFallbackControlCount
    }), {
      auditDurationMs: 0,
      auditedControlCount: 0,
      coreHitTestCount: 0,
      devicePixelFallbackControlCount: 0,
      partitionLimitFallbackControlCount: 0,
      pseudoFallbackControlCount: 0,
      unsupportedGeometryFallbackControlCount: 0
    })
  };

  const unsignedEvidence = {
    algorithmSha256: CALIFORNIA_TOUCH_AUDIT_ALGORITHM_SHA256,
    ...evaluated.touchAudit
  };
  return {
    findings: evaluated.findings,
    touchAudit: {
      ...unsignedEvidence,
      receiptSha256: sha256Text(stableJson(unsignedEvidence))
    } satisfies CaliforniaTouchAuditEvidence
  };
}

export async function collectVisualizationUiFindings(root: Locator, axis: CaliforniaQaAxis) {
  return (await collectVisualizationUiAuditEvidence(root, axis)).findings;
}

export function summarizeCaliforniaTouchAuditEvidence(
  gates: readonly CaliforniaUiGateEvidence[]
): CaliforniaTouchAuditSummary {
  const evidence = gates
    .map((gate) => gate.touchAudit)
    .filter((item): item is CaliforniaTouchAuditEvidence => Boolean(item));
  const durations = evidence
    .map((item) => item.auditDurationMs)
    .sort((left, right) => left - right);
  const percentile = (quantile: number) => durations.length === 0
    ? null
    : durations[Math.min(durations.length - 1, Math.ceil(durations.length * quantile) - 1)];
  return {
    auditCount: evidence.length,
    durationMaxMs: durations.length > 0 ? durations.at(-1)! : null,
    durationP50Ms: percentile(0.5),
    durationP95Ms: percentile(0.95),
    fallbackAuditCount: evidence.filter((item) => item.devicePixelFallbackControlCount > 0).length,
    fallbackControlCount: evidence.reduce(
      (sum, item) => sum + item.devicePixelFallbackControlCount,
      0
    ),
    missingEvidenceCount: gates.length - evidence.length,
    receiptSetSha256: sha256Text(stableJson(evidence.map((item) => item.receiptSha256)))
  };
}

function sameOrigin(url: string, targetOrigin: string) {
  try {
    return new URL(url).origin === targetOrigin;
  } catch {
    return false;
  }
}

export class CaliforniaBrowserDiagnostics {
  private consumedCount = 0;
  private readonly diagnostics: BrowserDiagnostic[] = [];
  private readonly inFlightRequests = new Set<Request>();
  private lastNetworkActivityAt = Date.now();
  private networkActivityGeneration = 0;
  private readonly targetOrigin: string;

  constructor(private readonly page: Page, baseURL: string) {
    this.targetOrigin = new URL(baseURL).origin;
    page.on("pageerror", this.onPageError);
    page.on("console", this.onConsole);
    page.on("request", this.onRequest);
    page.on("requestfinished", this.onRequestFinished);
    page.on("requestfailed", this.onRequestFailed);
    page.on("response", this.onResponse);
  }

  drain() {
    const diagnostics = this.diagnostics.slice(this.consumedCount);
    this.consumedCount = this.diagnostics.length;
    return { diagnostics };
  }

  async awaitTerminalQuiescence(options: {
    quietWindowMs?: number;
    timeout?: CaliforniaQaTimeout;
  } = {}) {
    const timeout = options.timeout ?? DEFAULT_EXPECT_TIMEOUT_MS;
    const startedAt = Date.now();
    const absoluteDeadline = startedAt + stepTimeout(timeout);
    const quietWindowMs = Math.max(25, Math.min(1_000, Math.floor(options.quietWindowMs ?? 150)));
    let quiescent = false;
    let observedGeneration = this.networkActivityGeneration;

    while (Date.now() < absoluteDeadline && timeoutRemaining(timeout) > 0) {
      const now = Date.now();
      if (observedGeneration !== this.networkActivityGeneration) {
        observedGeneration = this.networkActivityGeneration;
      }
      if (
        this.inFlightRequests.size === 0 &&
        now - this.lastNetworkActivityAt >= quietWindowMs
      ) {
        quiescent = true;
        break;
      }
      const remaining = Math.min(absoluteDeadline - now, timeoutRemaining(timeout));
      if (remaining <= 0) break;
      await this.page.waitForTimeout(Math.min(25, remaining));
    }

    const pendingCounts = new Map<string, number>();
    for (const request of this.inFlightRequests) {
      let pathname = request.url();
      try {
        const url = new URL(request.url());
        pathname = `${url.pathname}${url.search}`;
      } catch {
        // Keep the raw URL for a malformed request so the terminal report remains actionable.
      }
      const key = `${request.method()} ${pathname}`;
      pendingCounts.set(key, (pendingCounts.get(key) ?? 0) + 1);
    }
    const pendingRequests = Array.from(pendingCounts)
      .map(([request, count]) => count === 1 ? request : `${request} x${count}`)
      .sort((left, right) => left.localeCompare(right));
    const drained = this.drain();
    return {
      diagnostics: drained.diagnostics,
      pendingRequests,
      quiescent,
      waitedMs: Date.now() - startedAt
    };
  }

  dispose() {
    this.page.off("pageerror", this.onPageError);
    this.page.off("console", this.onConsole);
    this.page.off("request", this.onRequest);
    this.page.off("requestfinished", this.onRequestFinished);
    this.page.off("requestfailed", this.onRequestFailed);
    this.page.off("response", this.onResponse);
  }

  private readonly onPageError = (error: Error) => {
    this.diagnostics.push({ kind: "page-error", detail: error.message });
  };

  private readonly onConsole = (message: { location(): { url: string }; text(): string; type(): string }) => {
    if (message.type() !== "error") return;
    const locationUrl = message.location().url;
    this.diagnostics.push({ kind: "console-error", detail: `${message.text()}${locationUrl ? ` @ ${locationUrl}` : ""}` });
  };

  private markNetworkActivity() {
    this.lastNetworkActivityAt = Date.now();
    this.networkActivityGeneration += 1;
  }

  private readonly onRequest = (request: Request) => {
    if (!sameOrigin(request.url(), this.targetOrigin)) return;
    this.inFlightRequests.add(request);
    this.markNetworkActivity();
  };

  private readonly onRequestFinished = (request: Request) => {
    if (this.inFlightRequests.delete(request)) this.markNetworkActivity();
  };

  private readonly onRequestFailed = (request: Request) => {
    if (!sameOrigin(request.url(), this.targetOrigin)) return;
    this.inFlightRequests.delete(request);
    this.markNetworkActivity();
    const failure = request.failure()?.errorText ?? "unknown failure";
    let pathname = request.url();
    try { pathname = new URL(request.url()).pathname; } catch { /* keep raw URL */ }
    this.diagnostics.push({
      kind: "request-failed",
      detail: `${request.resourceType()} ${pathname}: ${failure}`
    });
  };

  private readonly onResponse = (response: {
    request(): { method(): string };
    status(): number;
    url(): string;
  }) => {
    const status = response.status();
    if (!sameOrigin(response.url(), this.targetOrigin)) return;
    this.markNetworkActivity();
    if (status < 400) return;
    let pathname = response.url();
    try { pathname = new URL(response.url()).pathname; } catch { /* keep raw URL */ }
    this.diagnostics.push({ kind: "http-error", detail: `${response.request().method()} ${pathname}: ${status}` });
  };
}

export function formatCaliforniaQaContext(context: CaliforniaQaContext) {
  return `lab=${context.labId} bench=${context.benchId} axis=${context.axis.id} route=${context.routeKind} action=${context.action}`;
}

function errorDetail(error: unknown) {
  if (error instanceof Error) return error.message.replace(/\s+/g, " ").trim();
  return String(error).replace(/\s+/g, " ").trim();
}

export function appendCaliforniaDiagnosticFindings(options: {
  context: CaliforniaQaContext;
  diagnostics: CaliforniaBrowserDiagnostics;
  issues: string[];
}): CaliforniaDiagnosticDrainResult {
  const drained = options.diagnostics.drain();
  for (const diagnostic of drained.diagnostics) {
    options.issues.push(`[${formatCaliforniaQaContext(options.context)}] ${diagnostic.kind}: ${diagnostic.detail}`);
  }
  return {
    clean: drained.diagnostics.length === 0,
    reportedCount: drained.diagnostics.length
  };
}

export async function runCaliforniaQaAction(options: {
  action: () => Promise<void>;
  context: CaliforniaQaContext;
  diagnostics: CaliforniaBrowserDiagnostics;
  evidence?: string[];
  issues: string[];
  page: Page;
  timeout?: CaliforniaQaTimeout;
}) {
  let passed = true;
  const destructiveNavigation =
    options.context.action === "open-directory-lab" || options.context.action === "open-premium-direct";
  if (destructiveNavigation) {
    const terminal = await options.diagnostics.awaitTerminalQuiescence({
      quietWindowMs: 150,
      timeout: options.timeout ?? DEFAULT_EXPECT_TIMEOUT_MS
    });
    options.evidence?.push(
      `pre-navigation-quiescence:quiescent=${terminal.quiescent}:waited=${terminal.waitedMs}ms:` +
      `pending=${terminal.pendingRequests.length}:diagnostics=${terminal.diagnostics.length}`
    );
    for (const diagnostic of terminal.diagnostics) {
      options.issues.push(
        `[${formatCaliforniaQaContext({ ...options.context, action: `diagnostic-before:${options.context.action}` })}] ` +
        `${diagnostic.kind}: ${diagnostic.detail}`
      );
    }
    if (!terminal.quiescent || terminal.pendingRequests.length > 0) {
      options.issues.push(
        `[${formatCaliforniaQaContext({ ...options.context, action: `pre-navigation-quiescence:${options.context.action}` })}] ` +
        `network-not-quiescent: ${terminal.pendingRequests.join(", ") || "quiet window was not reached"}`
      );
    }
    passed = terminal.quiescent && terminal.pendingRequests.length === 0 && terminal.diagnostics.length === 0;
    if (!passed) return false;
  } else {
    const preActionDrain = appendCaliforniaDiagnosticFindings({
      context: { ...options.context, action: `diagnostic-before:${options.context.action}` },
      diagnostics: options.diagnostics,
      issues: options.issues
    });
    passed = preActionDrain.clean;
  }
  try {
    await options.action();
  } catch (error) {
    passed = false;
    options.issues.push(`[${formatCaliforniaQaContext(options.context)}] action-error: ${errorDetail(error)}`);
  }
  await options.page.waitForTimeout(75).catch(() => undefined);
  const postActionDrain = appendCaliforniaDiagnosticFindings({
    context: options.context,
    diagnostics: options.diagnostics,
    issues: options.issues
  });
  passed = postActionDrain.clean && passed;
  return passed;
}

export async function appendUiFindings(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  issues: string[];
  labId: string;
  root: Locator;
  routeKind: CaliforniaQaWorkItem["kind"];
  state: string;
}) {
  const context: CaliforniaQaContext = {
    action: `ui-gate:${options.state}`,
    axis: options.axis,
    benchId: options.benchId,
    labId: options.labId,
    routeKind: options.routeKind
  };
  let audit: Awaited<ReturnType<typeof collectVisualizationUiAuditEvidence>>;
  try {
    audit = await collectVisualizationUiAuditEvidence(options.root, options.axis);
  } catch (error) {
    options.issues.push(`[${formatCaliforniaQaContext(context)}] ui-gate-error: ${errorDetail(error)}`);
    return {
      completed: false,
      findingCount: 1,
      state: options.state,
      touchAudit: null
    } satisfies CaliforniaUiGateEvidence;
  }
  for (const finding of audit.findings) {
    options.issues.push(`[${formatCaliforniaQaContext(context)}] ui-finding: ${finding}`);
  }
  return {
    completed: true,
    findingCount: audit.findings.length,
    state: options.state,
    touchAudit: audit.touchAudit
  } satisfies CaliforniaUiGateEvidence;
}
