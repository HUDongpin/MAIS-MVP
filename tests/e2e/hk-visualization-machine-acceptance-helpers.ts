import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  aggregateHkVisualizationDependentVisibleMathActualProjections,
  HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS,
  projectHkVisualizationDependentVisibleMathRawProjection,
} from "./hk-visualization-dependent-visible-math-contract";
import {
  buildVisualizationLabHref,
  visualizationLabSectionSelector,
} from "../../components/visualizations/visualizationDiagnostics";
import { studentVisualizationToolsPath } from "../../lib/visualizationRoutes";
import { HK_VISUALIZATION_LAB_IDS } from "../../components/visualizations/hk/hkVisualizationLabRegistry";
import {
  hkVisualizationLessonContract,
  type HKVisualizationRangeDomainId,
  type HKVisualizationLessonContract,
} from "../../components/visualizations/hk/hkVisualizationLessonContracts";
import type { FeaturedLabDefinition } from "../../data/visualizationLabs";
import { textForLanguage } from "../../lib/i18n";
import { registerStudentApi } from "./helpers";
import {
  HK_VISUALIZATION_MATH_ORACLE_CONTRACTS,
  type HKVisualizationMathOracleModeReference,
} from "./hk-visualization-math-oracle-contract";
import {
  auditHkVisualizationPassThroughRawRendererState,
  auditHkVisualizationPassThroughVisibleMathObservation,
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS,
  type HKVisualizationPassThroughRawRendererStateObservation,
  type HKVisualizationPassThroughVisibleMathMarkObservation,
  type HKVisualizationPassThroughMathOracleContract,
} from "./hk-visualization-pass-through-math-oracle-contract";
import {
  auditHkVisualizationDependentTransitionSequenceReceipt,
  auditHkP6BudgetBoundaryObservation,
  auditHkP6AveragesLineGraphObservation,
  bindHkP6BudgetBoundaryStates,
  bindHkP6AveragesLineGraphBoundaryStates,
  auditHkVisualizationPassThroughResetObservation,
  auditHkVisualizationPassThroughResetPrecondition,
  buildHkVisualizationDependentTransitionSequencePlans,
  buildHkVisualizationPassThroughResetActionPlan,
  planHkVisualizationPassThroughResetPrecondition,
  buildHkVisualizationRangeStatePlan,
  constructHkVisualizationDiagnostic,
  fingerprintHkVisualizationDependentTransitionDiagnostic,
  HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS,
  hashHkVisualizationDependentTransitionSequenceObservation,
  hashHkVisualizationDependentTransitionCanonicalVisibleBaseline,
  hkVisualizationDependentTransitionDeadlineBudgetMs,
  hkVisualizationDependentTransitionSequenceIdsForLab,
  projectExactHkDependentTransitionLiveRangeDescriptors,
  sanitizeHkVisualizationDiagnosticText,
  sanitizeHkVisualizationDiagnosticUrl,
  signatureForHkVisualizationRangeValues,
  type HkVisualizationDependentTransitionControlObservation,
  type HkVisualizationDependentTransitionCanonicalVisibleBaseline,
  type HkVisualizationDependentTransitionPhaseObservation,
  type HkVisualizationDependentTransitionSequenceObservation,
  type HkVisualizationDependentTransitionSequencePlan,
  type HkVisualizationDurableDiagnostic,
  type HkP6BudgetBoundaryKind,
  type HkP6BudgetBoundaryObservation,
  type HkP6AveragesLineGraphObservation,
  type HkVisualizationPassThroughResetObservation,
  type HkVisualizationPassThroughResetPerturbation,
  type HkVisualizationPassThroughResetState,
  type HkExecutableDynamicRangeDomainId,
  type HkVisualizationRangeDescriptor,
  type HkVisualizationRangeStateValue,
  type HkVisualizationRangeStatePlanEntry,
} from "./hk-visualization-range-state-ledger";
import {
  aggregateHkVisualizationBrowserChunkReceipts,
  buildHkVisualizationBrowserPassThroughResetEndpointReceipt,
  canonicalHkVisualizationBrowserRuntimePaths,
  type HkVisualizationBrowserChunkAggregate,
  type HkVisualizationBrowserChunkReceipt,
  type HkVisualizationBrowserRuntimePaths,
} from "./hk-visualization-browser-chunk-adapter";
import {
  buildHkVisualizationScrollObservationSet,
  HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
  HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
  buildHkVisualizationStateCellPlan,
  hashHkVisualizationAuditEvidence,
  hashHkVisualizationDescriptor,
  type HkVisualizationCanonicalEvidence,
  type HkVisualizationMandatoryAuditReceipt,
  type HkVisualizationScrollContainerEvidence,
  type HkVisualizationScrollObservation,
  type HkVisualizationScrollObservationSet,
  type HkVisualizationScrollPositionAuditId,
  type HkVisualizationStateCellPlan,
} from "./hk-visualization-state-chunk-contract";
import {
  getHkDedicatedDynamicRangeDomain,
  getHkDedicatedDynamicRangeDomainForLab,
  type HkVisualizationDynamicRangeDomainContract,
} from "./hk-visualization-range-domains";
import {
  getHkFractionBarRangeDomain,
  HK_FRACTION_BAR_RANGE_DOMAIN_ID,
  type HkFractionBarRangeDomainContract,
} from "./hk-visualization-fraction-range-domain";
import {
  controlSelector,
  effectiveVisibilityGlobalName,
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
  type HkVisualizationCollisionIssue,
  type HkVisualizationCollisionSnapshot,
  type HkVisualizationEffectiveVisibilityEvidence,
  type HkVisualizationOverlapExemptionEvidence,
  type HkVisualizationOverlapOwnerMetrics,
  type HkVisualizationOverlapOwnerRisk,
  type HkVisualizationRect,
} from "./hk-visualization-collision-scanner";
import {
  hkVisualizationContrastRatio,
  scanHkVisualizationTextContrast,
  type HkVisualizationContrastEvidence,
  type HkVisualizationContrastIssue,
  type HkVisualizationContrastIssueCode,
  type HkVisualizationContrastScanResult,
  type HkVisualizationRgb,
} from "./hk-visualization-text-contrast-scanner";

export {
  hkVisualizationContrastRatio,
  scanHkVisualizationTextContrast,
  type HkVisualizationContrastEvidence,
  type HkVisualizationContrastIssue,
  type HkVisualizationContrastIssueCode,
  type HkVisualizationContrastScanResult,
  type HkVisualizationRgb,
};

export {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
  type HkVisualizationCollisionIssue,
  type HkVisualizationCollisionSnapshot,
  type HkVisualizationEffectiveVisibilityEvidence,
  type HkVisualizationOverlapExemptionEvidence,
  type HkVisualizationOverlapOwnerMetrics,
  type HkVisualizationOverlapOwnerRisk,
  type HkVisualizationRect,
};

export const HK_VISUALIZATION_ACCEPTANCE_SCHEMA_VERSION =
  "hk-viz-machine-acceptance.v3" as const;
export const HK_VISUALIZATION_CANONICAL_PROJECT = "desktop-chrome" as const;
export const HK_VISUALIZATION_EXPECTED_LAB_COUNT = 51 as const;
export const HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT = 918 as const;
export const HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT = 216 as const;

export const HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE = Object.freeze({
  inputStateKeys: Object.freeze([
    "comparison",
    "height",
    "mode",
    "model",
    "strand",
    "topic",
    "value",
    "variant",
  ] as const),
  presentationStateKeys: Object.freeze([
    "activeMode",
    "check",
    "formula",
    "kind",
    "selectedCurveOnly",
    "semanticFamily",
  ] as const),
});

export type HkVisualizationPassThroughOracleSelectorEvidence = Readonly<{
  count: number;
  learnerVisibleCount: number;
}>;

export type HkVisualizationPassThroughOracleObservation = Readonly<{
  activeModeIds: readonly string[];
  formulaText: string;
  labId: string;
  modelIdentity: Readonly<{
    moduleId: string | null;
    templateId: string | null;
    topicId: string | null;
  }>;
  modeSelectorEvidence: Readonly<
    Record<string, HkVisualizationPassThroughOracleSelectorEvidence>
  >;
  phase: string;
  rawRendererState: HKVisualizationPassThroughRawRendererStateObservation;
  selectorEvidence: Readonly<
    Record<
      "formula" | "model" | "reset" | "root" | "state",
      HkVisualizationPassThroughOracleSelectorEvidence
    >
  >;
  state: Readonly<Record<string, unknown>>;
  visibleEvidenceText: string;
  visibleMathMarks: Readonly<
    Record<string, readonly HKVisualizationPassThroughVisibleMathMarkObservation[]>
  >;
  visibleNamedMarks: readonly string[];
}>;

export type HkVisualizationPassThroughOracleIssueCode =
  | "active-mode"
  | "compatibility-alias"
  | "exact-selector"
  | "forbidden-claim"
  | "math-invariant"
  | "named-visible-mark"
  | "required-math-key"
  | "reset-state"
  | "topic-model-identity"
  | "unexpected-math-key"
  | "visible-formula";

export type HkVisualizationPassThroughOracleIssue = Readonly<{
  code: HkVisualizationPassThroughOracleIssueCode;
  message: string;
}>;

export const hkVisualizationViewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

export const hkVisualizationLanguages = ["en", "zh", "zh-Hans"] as const;
export const hkVisualizationThemes = ["light", "dark"] as const;
export const hkVisualizationInteractionDepths = ["layout", "full"] as const;

export type HkVisualizationViewportId = keyof typeof hkVisualizationViewports;
export type HkVisualizationLanguage = (typeof hkVisualizationLanguages)[number];
export type HkVisualizationTheme = (typeof hkVisualizationThemes)[number];
export type HkVisualizationInteractionDepth =
  (typeof hkVisualizationInteractionDepths)[number];
export type HkVisualizationMatrixScope = "full" | "partial";

export type HkVisualizationLocalizedTargetKind =
  "formula" | "state" | "mode" | "control" | "reset";

export type HkVisualizationPointerTargetMetrics = {
  areaRatio: number;
  associatedLabel: boolean;
  banned: boolean;
  controlCount: number;
  explicit: boolean;
  heightRatio: number;
  self: boolean;
  widthRatio: number;
};

export type HkVisualizationVisibilityRequirement =
  "visual" | "learner" | "interactive";

type Environment = Record<string, string | undefined>;

export type HkVisualizationAcceptanceOptions = {
  allowPartial: boolean;
  allHkLabs: FeaturedLabDefinition[];
  expectedCellCount: number;
  expectedPackageCount: number;
  explicitFilters: string[];
  fullMatrixRequested: boolean;
  interactionDepth: HkVisualizationInteractionDepth;
  languages: HkVisualizationLanguage[];
  matrixScope: HkVisualizationMatrixScope;
  selectedLabs: FeaturedLabDefinition[];
  themes: HkVisualizationTheme[];
  viewports: HkVisualizationViewportId[];
};

export type HkVisualizationPackage = {
  grade: string;
  id: string;
  labs: FeaturedLabDefinition[];
  language: HkVisualizationLanguage;
  theme: HkVisualizationTheme;
  viewportId: HkVisualizationViewportId;
};

export function authenticationGradeForHkVisualizationPackage(
  regressionPackage: Pick<HkVisualizationPackage, "grade" | "id" | "labs">,
) {
  if (
    !/^(?:P[1-6]|S[1-6])$/u.test(regressionPackage.grade) ||
    regressionPackage.labs.length === 0 ||
    regressionPackage.labs.some(({ grade }) => grade !== regressionPackage.grade)
  ) {
    throw new Error(
      `HK visualization package authentication grade drifted for ${regressionPackage.id}.`,
    );
  }
  return regressionPackage.grade;
}

export type HkVisualizationFailure = {
  code: string;
  details?: unknown;
  message: string;
  phase?: string;
  selector?: string;
};

export type HkVisualizationDiagnostic = HkVisualizationDurableDiagnostic;

export type HkVisualizationLayoutIssue = {
  ancestor?: string;
  element?: string;
  kind:
    | "clipped-element"
    | "document-horizontal-overflow"
    | "scroll-container-not-focusable"
    | "scroll-container-pan-hint-missing"
    | "scroll-container-unreachable"
    | "section-horizontal-overflow";
  message: string;
  rect?: HkVisualizationRect;
};

export type HkVisualizationLayoutSnapshot = {
  documentClientWidth: number;
  documentScrollWidth: number;
  educationalScrollContainerCount: number;
  inspectedCandidateCount: number;
  issues: HkVisualizationLayoutIssue[];
  learnerVisibleCandidateCount: number;
  phase: string;
  sectionClientWidth: number;
  sectionScrollWidth: number;
};

export type HkVisualizationScrollObservationReceipt = Readonly<{
  observationSet: HkVisualizationScrollObservationSet;
  phase: string;
}>;

export function hkVisualizationSurfaceEvidenceIssues(
  snapshot: Pick<
    HkVisualizationCollisionSnapshot,
    "canvasSurfaceCount" | "svgSurfaceCount"
  >,
) {
  const issues: Array<
    "HK_CANVAS_SURFACE_UNSUPPORTED" | "HK_SVG_SURFACE_MISSING"
  > = [];
  if (snapshot.canvasSurfaceCount !== 0)
    issues.push("HK_CANVAS_SURFACE_UNSUPPORTED");
  if (snapshot.svgSurfaceCount === 0) issues.push("HK_SVG_SURFACE_MISSING");
  return issues;
}

export type HkVisualizationControlEvidence = {
  actionable: boolean | null;
  descriptor: string;
  enabled: boolean;
  hitTarget: boolean | null;
  index: number;
  minimumTarget44: boolean | null;
  rect: HkVisualizationRect | null;
  targetRect: HkVisualizationRect | null;
};

export type HkVisualizationInteractionEvidence = {
  action: string;
  activationKey?: "Enter" | "Space";
  after?: string;
  before?: string;
  contractStateChanged?: boolean | null;
  control: string;
  groupId?: string;
  meaningfulEvidenceChanged?: boolean | null;
  stateChanged: boolean | null;
  status: "failed" | "passed" | "skipped";
  tabFocused?: boolean;
};

export type HkVisualizationStateScanLedgerEntry = {
  actionSignature: string;
  domainId: HkExecutableDynamicRangeDomainId | null;
  expectedSignature: string;
  id: string;
  modeId: string;
  observedSignature: string | null;
  phase: string;
  reasons: string[];
  requestedSignature: string;
  startingObservedSignature: string | null;
  startingSignature: string;
};

export type HkVisualizationStateScanLedger = {
  entries: HkVisualizationStateScanLedgerEntry[];
  executedStateIds: string[];
  plannedStateIds: string[];
};

export type HkVisualizationInteractionMicrofixtureResult = {
  collisions: HkVisualizationCollisionSnapshot[];
  dependentTransitionSequenceObservations: HkVisualizationDependentTransitionSequenceObservation[];
  failures: HkVisualizationFailure[];
  groups: Record<string, string>;
  interactions: HkVisualizationInteractionEvidence[];
  layout: HkVisualizationLayoutSnapshot[];
  p6BudgetBoundaryObservations: HkP6BudgetBoundaryObservation[];
  p6AveragesLineGraphObservations: HkP6AveragesLineGraphObservation[];
  passThroughOracleObservations: HkVisualizationPassThroughOracleObservation[];
  passThroughResetObservations: HkVisualizationPassThroughResetObservation[];
  scrollObservationPhasePlan: string[];
  scrollObservationSets: HkVisualizationScrollObservationReceipt[];
  stateScanLedger: HkVisualizationStateScanLedger;
};

export type HkVisualizationScrollPositionMicrofixtureResult = Readonly<{
  collisions: readonly HkVisualizationCollisionSnapshot[];
  failures: readonly HkVisualizationFailure[];
  layout: readonly HkVisualizationLayoutSnapshot[];
  scrollObservationPhasePlan: readonly string[];
  scrollObservationSets: readonly HkVisualizationScrollObservationReceipt[];
}>;

export type HkVisualizationChunkedInteractionMicrofixtureResult =
  HkVisualizationInteractionMicrofixtureResult & {
    browserChunkAggregate: HkVisualizationBrowserChunkAggregate;
    browserChunkReceipts: readonly HkVisualizationBrowserChunkReceipt[];
    planBudgetMs: number;
    runtimePaths: HkVisualizationBrowserRuntimePaths;
  };

export type HkVisualizationCellResult = {
  actualFinalUrl: string | null;
  cellId: string;
  collisions: HkVisualizationCollisionSnapshot[];
  contract: {
    activeLabExact: boolean;
    htmlLanguage: string | null;
    localizedText: null | {
      modelSample: string;
      stateSample: string;
    };
    manifest: {
      controlSelectorCount: number;
      modeSelectorCount: number;
      modelReady: boolean;
      resetReady: boolean;
      stateReady: boolean;
      stateSummaryReady: boolean;
    };
    panelReady: boolean;
    renderer: "svg" | "three-r3f" | "unknown";
    surfaceCount: number;
    threeDLearner: null | {
      authoringDomCount: number;
      authoringTabbableCount: number;
      authoringVisibleCount: number;
      canvasPixelSample: {
        nonTransparentPixels: number;
        variance: number;
      } | null;
      playbackVisible: boolean;
      resetCameraVisible: boolean;
      timelineVisible: boolean;
    };
    themeClassApplied: boolean;
    themeEvidence: null | {
      backgroundLuminance: number;
      checkedTextCount: number;
      contrastRatio: number;
      effectiveOpacity: number;
      foreground: string;
      background: string;
      requiredRatio: number;
      target: string;
    };
    visibleMarkCount: number;
    workspaceReady: boolean;
  };
  deadlineMs: number;
  controls: HkVisualizationControlEvidence[];
  dependentTransitionSequenceObservations: HkVisualizationDependentTransitionSequenceObservation[];
  diagnostics: HkVisualizationDiagnostic[];
  failures: HkVisualizationFailure[];
  grade: string;
  interactions: HkVisualizationInteractionEvidence[];
  labId: string;
  language: HkVisualizationLanguage;
  layout: HkVisualizationLayoutSnapshot[];
  p6BudgetBoundaryObservations: HkP6BudgetBoundaryObservation[];
  p6AveragesLineGraphObservations: HkP6AveragesLineGraphObservation[];
  passThroughOracleObservations: HkVisualizationPassThroughOracleObservation[];
  passThroughResetObservations: HkVisualizationPassThroughResetObservation[];
  qaProfile: FeaturedLabDefinition["qaProfile"];
  readyMs: number | null;
  route: string;
  routeKind: "premium-direct" | "query";
  scrollObservationPhasePlan: string[];
  scrollObservationSets: HkVisualizationScrollObservationReceipt[];
  status: "failed" | "passed";
  stateScanLedger: HkVisualizationStateScanLedger;
  templateId: FeaturedLabDefinition["templateId"];
  theme: HkVisualizationTheme;
  viewport: { height: number; id: HkVisualizationViewportId; width: number };
};

export type HkVisualizationPackageResult = {
  cells: HkVisualizationCellResult[];
  failures: HkVisualizationFailure[];
  matrix: {
    allowPartial: boolean;
    expectedCellCount: number;
    expectedPackageCount: number;
    explicitFilters: string[];
    fullMatrixRequested: boolean;
    interactionDepth: HkVisualizationInteractionDepth;
    languages: HkVisualizationLanguage[];
    scope: HkVisualizationMatrixScope;
    themes: HkVisualizationTheme[];
    viewports: Array<{
      height: number;
      id: HkVisualizationViewportId;
      width: number;
    }>;
  };
  package: {
    duplicateCellIds: string[];
    executedCellIds: string[];
    expectedLabIds: string[];
    grade: string;
    id: string;
    language: HkVisualizationLanguage;
    missingCellIds: string[];
    plannedCellIds: string[];
    theme: HkVisualizationTheme;
    viewportId: HkVisualizationViewportId;
  };
  run: {
    baseURL: string;
    endedAt: string;
    runId: string;
    startedAt: string;
  };
  schemaVersion: typeof HK_VISUALIZATION_ACCEPTANCE_SCHEMA_VERSION;
  status: "failed" | "passed";
  summary: {
    executedCellCount: number;
    failedCellCount: number;
    missingCellCount: number;
    passedCellCount: number;
    plannedCellCount: number;
  };
};

const viewportIds = Object.keys(
  hkVisualizationViewports,
) as HkVisualizationViewportId[];
const filterEnvironmentNames = [
  "HK_VIZ_GRADES",
  "HK_VIZ_LABS",
  "HK_VIZ_LANGUAGES",
  "HK_VIZ_THEMES",
  "HK_VIZ_VIEWPORTS",
] as const;

const threeDAuthoringSelector = [
  "[data-viz-manim-authoring-dock]",
  "[data-viz-manim-authoring-selector]",
  "[data-viz-manim-camera-mode-control]",
  "[data-viz-manim-capture-control]",
  "[data-viz-manim-parameter-panel-control]",
  "[data-viz-manim-checkpoint-control]",
  "[data-viz-manim-history-control]",
  "[data-viz-manim-authoring-control]",
  "[data-viz-manim-scene-selector-control]",
  "[data-viz-manim-render-quality-control]",
  "[data-viz-manim-render-quality-transparent-control]",
  "[data-viz-manim-capture-screenshot]",
  "[data-viz-manim-capture-video-plan]",
  "[data-viz-manim-run-from-beat]",
].join(",");

const expectedHtmlLanguage = {
  en: /^en(?:-|$)/,
  zh: /^zh-Hant(?:-|$)/,
  "zh-Hans": /^zh-Hans(?:-|$)/,
} as const;

// A cell receives one bounded deadline. Every readiness wait consumes the same
// budget, so a missing mount cannot cascade through six independent 60s waits.
const cellDeadlineByDepth: Record<HkVisualizationInteractionDepth, number> = {
  layout: 70_000,
  full: 105_000,
};
const packageSetupTimeout = 30_000;
const diagnosticSettleMs = 300;

const languageMenuOption = {
  en: /Use English|使用英文/i,
  zh: /Use Traditional Chinese|使用繁體中文|使用繁体中文/i,
  "zh-Hans": /Use Simplified Chinese|使用簡體中文|使用简体中文/i,
} as const;

const threeDLearnerControlPatterns = {
  en: {
    playback: /\b(?:play|pause)\b/i,
    reset: /reset.*camera|camera.*reset/i,
    timeline: /timeline|progress/i,
  },
  zh: {
    playback: /播放|暫停/,
    reset: /重設|重置|復位/,
    timeline: /時間軸|時間線|進度/,
  },
  "zh-Hans": {
    playback: /播放|暂停/,
    reset: /重设|重置|复位/,
    timeline: /时间轴|时间线|进度/,
  },
} as const;

const traditionalOnlyGlyphs = new Set(
  Array.from(
    "體圖圓與總變為線點實專課確數個邊長積離間驗頻據關係學習顯這擇啟動復歸輯劃條測應當雙單開閉輸錯對稱軸極優級類華萬億",
  ),
);
const simplifiedOnlyGlyphs = new Set(
  Array.from(
    "体图圆与总变为线点实专课确数个边长积离间验频据关系学习显这择启动复归辑划条测应当双单开闭输错对称轴极优级类华万亿",
  ),
);
const allowedChineseMathLatinTokens = new Set([
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "ab",
  "ac",
  "ad",
  "ax",
  "bc",
  "bd",
  "bx",
  "cd",
  "cx",
  "dx",
  "dy",
  "mn",
  "pq",
  "qr",
  "rs",
  "xy",
  "xz",
  "yz",
  "abs",
  "cos",
  "cov",
  "exp",
  "gcd",
  "lcm",
  "ln",
  "log",
  "max",
  "min",
  "mod",
  "sin",
  "sqrt",
  "tan",
  "var",
  "mm",
  "cm",
  "km",
  "mg",
  "kg",
  "ml",
  "ms",
  "sec",
  "hr",
  "rad",
  "deg",
  "hkd",
  "hk",
  "abc",
  "pqr",
  "xyz",
  "oab",
  "oac",
  "lhs",
  "rhs",
  "soh",
  "cah",
  "toa",
  "hcf",
  "sd",
]);

export function hkVisualizationLocalizationIssues(args: {
  language: HkVisualizationLanguage;
  target: HkVisualizationLocalizedTargetKind;
  text: string;
}) {
  const text = args.text.replace(/\s+/g, " ").trim();
  const issues: string[] = [];
  if (!text) return [`${args.target} has no accessible localized text.`];
  if (args.language === "en") return issues;

  const oppositeGlyphs =
    args.language === "zh" ? simplifiedOnlyGlyphs : traditionalOnlyGlyphs;
  const reverseGlyphs = unique(
    Array.from(text).filter((character) => oppositeGlyphs.has(character)),
  );
  if (reverseGlyphs.length > 0) {
    issues.push(
      `${args.target} contains ${args.language === "zh" ? "Simplified" : "Traditional"} Chinese glyph(s): ${reverseGlyphs.join("")}.`,
    );
  }

  const latinTokens = text.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) ?? [];
  const proseTokens = unique(
    latinTokens.filter(
      (token) => !allowedChineseMathLatinTokens.has(token.toLowerCase()),
    ),
  );
  if (proseTokens.length > 0) {
    issues.push(
      `${args.target} contains non-mathematical English prose token(s): ${proseTokens.join(", ")}.`,
    );
  }

  if (args.target !== "formula" && !/\p{Script=Han}/u.test(text)) {
    issues.push(`${args.target} has no Han-script accessible name/state text.`);
  }
  return issues;
}

export function hkVisualizationRequiredContrastRatio(
  fontSizePx: number,
  fontWeight: number,
) {
  return fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700)
    ? 3
    : 4.5;
}

export function hkVisualizationEffectiveOpacity(opacities: readonly number[]) {
  return opacities.reduce(
    (product, opacity) =>
      product *
      Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : 1)),
    1,
  );
}

export function hkVisualizationVisibilityPasses(
  evidence: HkVisualizationEffectiveVisibilityEvidence,
  requirement: HkVisualizationVisibilityRequirement,
) {
  if (!evidence.visuallyVisible) return false;
  if (requirement === "visual") return true;
  if (
    evidence.hiddenAncestor ||
    evidence.inertAncestor ||
    evidence.ariaHiddenAncestor
  )
    return false;
  return requirement !== "interactive" || !evidence.pointerEventsNone;
}

export function hkVisualizationPotentiallyTabbable(
  evidence: HkVisualizationEffectiveVisibilityEvidence,
  tabIndex: number,
  disabled: boolean,
) {
  // opacity:0 and aria-hidden do not remove native keyboard focusability.
  return (
    !disabled &&
    tabIndex >= 0 &&
    evidence.width > 0 &&
    evidence.height > 0 &&
    !evidence.displayNoneAncestor &&
    !evidence.visibilityHidden &&
    !evidence.inertAncestor
  );
}

export function hkVisualizationOverlapOwnerRisk(
  metrics: HkVisualizationOverlapOwnerMetrics,
): HkVisualizationOverlapOwnerRisk {
  if (!metrics.reason?.trim()) return "missing-reason";
  if (metrics.banned) return "banned-owner";
  if (
    metrics.candidateCount !== 2 ||
    metrics.areaRatio > 0.3 ||
    metrics.widthRatio > 0.9 ||
    metrics.heightRatio > 0.8
  ) {
    return "too-broad";
  }
  return "explicit-narrow-pair";
}

export function hkVisualizationPointerTargetIssues(
  metrics: HkVisualizationPointerTargetMetrics,
) {
  if (!metrics.explicit) return [];
  const issues: string[] = [];
  if (metrics.banned) issues.push("banned-owner");
  if (metrics.controlCount !== 1) issues.push("shared-controls");
  if (metrics.self) return issues;
  if (!metrics.associatedLabel) issues.push("unassociated-ancestor");
  if (
    metrics.areaRatio > 0.3 ||
    metrics.widthRatio > 0.9 ||
    metrics.heightRatio > 0.8
  ) {
    issues.push("too-broad");
  }
  return issues;
}

export function buildHkVisualizationModeExerciseOrder(
  modeIds: readonly string[],
) {
  const seen = new Set<string>();
  return modeIds.map((rawModeId) => {
    const modeId = rawModeId.trim();
    if (!modeId)
      throw new Error("Mode exercise plan contains an empty mode ID.");
    if (seen.has(modeId))
      throw new Error(
        `Mode exercise plan contains duplicate mode ID ${modeId}.`,
      );
    seen.add(modeId);
    return modeId;
  });
}

export type HkVisualizationModeExerciseTopologyGroup = Readonly<{
  dependsOnGroupId?: string;
  groupId: string;
  modeIds: readonly string[];
  parentMode?: HKVisualizationMathOracleModeReference;
}>;

type HkVisualizationModeExerciseTarget = Readonly<{
  group: HkVisualizationModeExerciseTopologyGroup | null;
  modeId: string;
  modeIndex: number;
}>;

const hkVisualizationModeTopologyByLabId = new Map(
  HK_VISUALIZATION_MATH_ORACLE_CONTRACTS.map((contract) => [
    contract.labId,
    contract.modeTopology,
  ]),
);

const hkVisualizationPassThroughOracleByLabId = new Map(
  HK_VISUALIZATION_PASS_THROUGH_MATH_ORACLE_CONTRACTS.map((contract) => [
    contract.labId,
    contract,
  ]),
);

const configuredOracleEnvelopeKeys = new Set<string>([
  ...HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE.inputStateKeys,
  ...HK_VISUALIZATION_CONFIGURED_ORACLE_ENVELOPE.presentationStateKeys,
]);

const passThroughForbiddenVisibleEvidence: Readonly<
  Record<string, readonly RegExp[]>
> = Object.freeze({
  "advanced-functions": [
    /comparison curve/i,
    /cross[- ]family/i,
    /(?:sine|cosine|wave) family/i,
    /synchroni[sz]ed parameters?/i,
  ],
  calculus: [
    /secant/i,
    /accumulated area/i,
    /area strip/i,
    /(?:lower|upper) bound/i,
    /(?:exact integral|midpoint approximation)/i,
  ],
  "data-handling": [
    /raw[- ]data operations?/i,
    /raw observation/i,
  ],
  "differentiation-intro": [
    /secant/i,
    /accumulated area/i,
    /area strip/i,
    /(?:lower|upper) bound/i,
    /(?:exact integral|midpoint approximation)/i,
  ],
  "p2-multiplication-foundations": [
    /formal area/i,
    /square units?/i,
    /repeated addition/i,
    /division with remainder/i,
  ],
  "p3-fractions-intro": [
    /unlike[- ]denominator/i,
    /(?:add|subtract)(?:ing)? fractions?/i,
  ],
  "statistics-s1": [
    /z[- ]?score/i,
    /observed[- ]value/i,
  ],
});

function oracleIssue(
  code: HkVisualizationPassThroughOracleIssueCode,
  message: string,
): HkVisualizationPassThroughOracleIssue {
  return { code, message };
}

function finiteOracleNumber(state: Readonly<Record<string, unknown>>, key: string) {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function oracleNumbersClose(left: number, right: number) {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function passThroughMathInvariantIssue(
  contract: HKVisualizationPassThroughMathOracleContract,
  state: Readonly<Record<string, unknown>>,
): HkVisualizationPassThroughOracleIssue | null {
  if (contract.invariant.family === "equal-groups-object-total") {
    const rows = finiteOracleNumber(state, "rows");
    const columns = finiteOracleNumber(state, "columns");
    const total = finiteOracleNumber(state, "total");
    if (
      rows === null ||
      columns === null ||
      total === null ||
      !Number.isInteger(rows) ||
      !Number.isInteger(columns) ||
      rows < 1 ||
      columns < 1 ||
      !Object.is(total, rows * columns)
    ) {
      return oracleIssue(
        "math-invariant",
        `${contract.labId} requires positive integer rows × columns = total; observed ${JSON.stringify({ columns, rows, total })}.`,
      );
    }
    return null;
  }

  if (contract.invariant.family === "fraction-equivalence-inclusive-unit") {
    const denominator = finiteOracleNumber(state, "denominator");
    const numerator = finiteOracleNumber(state, "numerator");
    const equivalentDenominator = finiteOracleNumber(
      state,
      "equivalentDenominator",
    );
    const equivalentNumerator = finiteOracleNumber(
      state,
      "equivalentNumerator",
    );
    if (
      denominator === null ||
      numerator === null ||
      equivalentDenominator === null ||
      equivalentNumerator === null ||
      !Number.isInteger(denominator) ||
      !Number.isInteger(numerator) ||
      denominator < 2 ||
      denominator > 10 ||
      numerator < 0 ||
      numerator > denominator ||
      equivalentNumerator !== numerator * 2 ||
      equivalentDenominator !== denominator * 2
    ) {
      return oracleIssue(
        "math-invariant",
        `${contract.labId} requires 0 ≤ n ≤ d and n/d ≡ 2n/2d; observed ${JSON.stringify({ denominator, equivalentDenominator, equivalentNumerator, numerator })}.`,
      );
    }
    return null;
  }

  if (contract.invariant.family === "displayed-distribution-summary") {
    const mean = finiteOracleNumber(state, "mean");
    const spread = finiteOracleNumber(state, "spread");
    if (mean === null || spread === null || spread <= 0) {
      return oracleIssue(
        "math-invariant",
        `${contract.labId} requires a finite mean and positive finite spread; observed ${JSON.stringify({ mean, spread })}.`,
      );
    }
    return null;
  }

  if (contract.invariant.family === "selected-function-curve") {
    const scale = finiteOracleNumber(state, "scale");
    const verticalShift = finiteOracleNumber(state, "verticalShift");
    if (
      typeof state.family !== "string" ||
      !state.family.trim() ||
      scale === null ||
      verticalShift === null ||
      state.selectedCurveOnly !== true
    ) {
      return oracleIssue(
        "math-invariant",
        `${contract.labId} requires one named selected curve with finite scale/shift and selectedCurveOnly=true.`,
      );
    }
    return null;
  }

  if (contract.invariant.family === "tangent-local-gradient") {
    const curvature = finiteOracleNumber(state, "curvature");
    const probeX = finiteOracleNumber(state, "probeX");
    const slope = finiteOracleNumber(state, "slope");
    if (
      curvature === null ||
      probeX === null ||
      slope === null ||
      !oracleNumbersClose(slope, curvature * probeX) ||
      state.activeMode !== "tangent"
    ) {
      return oracleIssue(
        "math-invariant",
        `${contract.labId} requires tangent mode and slope = curvature × probeX; observed ${JSON.stringify({ activeMode: state.activeMode, curvature, probeX, slope })}.`,
      );
    }
  }

  return null;
}

/**
 * Pure fail-closed validation used by every browser state of the seven HK
 * configured pass-through topics. The configured envelope is deliberately
 * separate from each topic's allowed mathematical payload so renderer-private
 * compatibility fields cannot become accidental learner contracts.
 */
export function auditHkVisualizationPassThroughOracleObservation(
  contract: HKVisualizationPassThroughMathOracleContract,
  observation: HkVisualizationPassThroughOracleObservation,
): HkVisualizationPassThroughOracleIssue[] {
  const issues: HkVisualizationPassThroughOracleIssue[] = [];
  if (observation.labId !== contract.labId) {
    issues.push(
      oracleIssue(
        "topic-model-identity",
        `Oracle ${contract.labId} received observation ${observation.labId}.`,
      ),
    );
  }

  for (const [name, evidence] of Object.entries(observation.selectorEvidence)) {
    if (evidence.count !== 1 || evidence.learnerVisibleCount !== 1) {
      issues.push(
        oracleIssue(
          "exact-selector",
          `${contract.labId} ${name} selector must match exactly one learner-visible node; observed ${evidence.count}/${evidence.learnerVisibleCount}.`,
        ),
      );
    }
  }

  if (
    observation.modelIdentity.moduleId !== contract.moduleId ||
    observation.modelIdentity.templateId !== contract.templateId ||
    observation.modelIdentity.topicId !== contract.topicId ||
    observation.state.topic !== contract.topicId ||
    observation.state.variant !== contract.catalogVariant ||
    observation.state.model !== contract.modelId
  ) {
    issues.push(
      oracleIssue(
        "topic-model-identity",
        `${contract.labId} model/state identity drifted: ${JSON.stringify({ modelIdentity: observation.modelIdentity, model: observation.state.model, topic: observation.state.topic, variant: observation.state.variant })}.`,
      ),
    );
  }

  const expectedModes = contract.modeSelectors.map(({ modeId }) => modeId);
  const activeModes = [...observation.activeModeIds];
  const modeEvidenceKeys = Object.keys(observation.modeSelectorEvidence);
  const declaredModeEvidenceInvalid = contract.modeSelectors.some(({ modeId }) => {
    const evidence = observation.modeSelectorEvidence[modeId];
    return !evidence || evidence.count !== 1 || evidence.learnerVisibleCount !== 1;
  });
  const extraModeEvidence = modeEvidenceKeys.some(
    (modeId) => !expectedModes.includes(modeId),
  );
  if (
    declaredModeEvidenceInvalid ||
    extraModeEvidence ||
    (expectedModes.length === 0
      ? activeModes.length !== 0 || modeEvidenceKeys.length !== 0
      : activeModes.length !== 1 || !expectedModes.includes(activeModes[0]))
  ) {
    issues.push(
      oracleIssue(
        "active-mode",
        `${contract.labId} declared modes ${JSON.stringify(expectedModes)} but observed evidence ${JSON.stringify(modeEvidenceKeys)} and active ${JSON.stringify(activeModes)}.`,
      ),
    );
  }

  if (!observation.formulaText.trim()) {
    issues.push(
      oracleIssue(
        "visible-formula",
        `${contract.labId} exact formula selector exposed no nonblank learner-visible formula.`,
      ),
    );
  }

  const activeMode = activeModes[0] ?? null;
  const visibleNames = new Set(observation.visibleNamedMarks);
  for (const mark of contract.namedVisibleMarks) {
    const requiredInState =
      mark.visibleInModes.length === 0 ||
      (activeMode !== null && mark.visibleInModes.includes(activeMode));
    if (requiredInState && !visibleNames.has(mark.name)) {
      issues.push(
        oracleIssue(
          "named-visible-mark",
          `${contract.labId} is missing learner-visible named mark ${mark.name}${activeMode ? ` in ${activeMode}` : ""}.`,
        ),
      );
    }
  }

  for (const pattern of passThroughForbiddenVisibleEvidence[contract.labId] ?? []) {
    if (pattern.test(observation.visibleEvidenceText)) {
      issues.push(
        oracleIssue(
          "forbidden-claim",
          `${contract.labId} exposed forbidden learner evidence matching ${pattern}.`,
        ),
      );
    }
  }

  const allowedKeys = new Set<string>([
    ...configuredOracleEnvelopeKeys,
    ...contract.allowedStateKeys,
  ]);
  const unexpectedKeys = Object.keys(observation.state).filter(
    (key) => !allowedKeys.has(key),
  );
  if (unexpectedKeys.length > 0) {
    issues.push(
      oracleIssue(
        "unexpected-math-key",
        `${contract.labId} exposed uncontracted math payload keys: ${unexpectedKeys.sort().join(", ")}.`,
      ),
    );
  }
  const missingRequired = contract.requiredStateKeys.filter(
    (key) => observation.state[key] === undefined,
  );
  if (missingRequired.length > 0) {
    issues.push(
      oracleIssue(
        "required-math-key",
        `${contract.labId} omitted required math payload keys: ${missingRequired.join(", ")}.`,
      ),
    );
  }

  for (const alias of contract.compatibilityAliases) {
    if (observation.state[alias.aliasKey] === undefined) continue;
    if (
      alias.aliasKey === "value" &&
      alias.canonicalKeys.length === 2 &&
      alias.canonicalKeys[0] === "numerator" &&
      alias.canonicalKeys[1] === "denominator"
    ) {
      const numerator = finiteOracleNumber(observation.state, "numerator");
      const denominator = finiteOracleNumber(observation.state, "denominator");
      const aliasValue = finiteOracleNumber(observation.state, alias.aliasKey);
      if (
        numerator === null ||
        denominator === null ||
        aliasValue === null ||
        denominator === 0 ||
        !oracleNumbersClose(aliasValue, numerator / denominator)
      ) {
        issues.push(
          oracleIssue(
            "compatibility-alias",
            `${contract.labId} alias ${alias.aliasKey} disagrees with formal numerator/denominator fields.`,
          ),
        );
      }
    }
  }

  const invariantIssue = passThroughMathInvariantIssue(contract, observation.state);
  if (invariantIssue) issues.push(invariantIssue);

  if (/reset/i.test(observation.phase)) {
    const resetMismatches = Object.entries(contract.reset.state).filter(
      ([key, expected]) => {
        const actual = observation.state[key];
        return typeof expected === "number" && typeof actual === "number"
          ? !oracleNumbersClose(actual, expected)
          : !Object.is(actual, expected);
      },
    );
    if (resetMismatches.length > 0) {
      issues.push(
        oracleIssue(
          "reset-state",
          `${contract.labId} reset state drifted for ${resetMismatches.map(([key]) => key).join(", ")}.`,
        ),
      );
    }
  }

  return issues;
}

function buildHkVisualizationModeExerciseTargets(
  modeIds: readonly string[],
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[],
): readonly HkVisualizationModeExerciseTarget[] {
  const modeOrder = buildHkVisualizationModeExerciseOrder(modeIds);
  if (modeTopology.length === 0) {
    return modeOrder.map((modeId, modeIndex) => ({
      group: null,
      modeId,
      modeIndex,
    }));
  }

  const groupsById = new Map<string, HkVisualizationModeExerciseTopologyGroup>();
  const groupsByModeId = new Map<string, HkVisualizationModeExerciseTopologyGroup>();
  for (const group of modeTopology) {
    if (!group.groupId.trim())
      throw new Error("Mode exercise topology contains an empty group ID.");
    if (groupsById.has(group.groupId))
      throw new Error(
        `Mode exercise topology contains duplicate group ${group.groupId}.`,
      );
    groupsById.set(group.groupId, group);
    for (const modeId of group.modeIds) {
      // The mathematical oracle also names a small number of non-manifest
      // reference/representation subgroups. They remain covered by their
      // dedicated control contracts, not by this exact declared-mode ledger.
      if (!modeIds.includes(modeId)) continue;
      if (groupsByModeId.has(modeId))
        throw new Error(
          `Mode exercise topology assigns mode ${modeId} to multiple groups.`,
        );
      groupsByModeId.set(modeId, group);
    }
  }
  for (const group of modeTopology) {
    const dependencyGroupId =
      group.parentMode?.groupId ?? group.dependsOnGroupId;
    if (dependencyGroupId && !groupsById.has(dependencyGroupId))
      throw new Error(
        `Mode exercise topology group ${group.groupId} names missing parent group ${dependencyGroupId}.`,
      );
    if (
      group.parentMode &&
      !groupsById
        .get(group.parentMode.groupId)
        ?.modeIds.includes(group.parentMode.modeId)
    ) {
      throw new Error(
        `Mode exercise topology group ${group.groupId} names unknown parent mode ${group.parentMode.groupId}=${group.parentMode.modeId}.`,
      );
    }
  }

  return modeOrder.map((modeId, modeIndex) => {
    const group = groupsByModeId.get(modeId);
    if (!group)
      throw new Error(
        `Mode exercise topology does not assign declared mode ${modeId} to a group.`,
      );
    return { group, modeId, modeIndex };
  });
}

function emptyStateScanLedger(): HkVisualizationStateScanLedger {
  return { entries: [], executedStateIds: [], plannedStateIds: [] };
}

/**
 * Records the runtime audit-entry schedule before any deadline check or browser
 * observation. This is intentionally not the independent canonical expected
 * plan; consumers must derive that separately from state/interaction contracts.
 * Duplicate calls remain in this raw list so downstream validation can reject
 * them instead of a local de-duplication step hiding the defect.
 */
export function recordHkVisualizationScrollObservationPhase(
  phasePlan: string[],
  phase: string,
) {
  if (!phase.trim() || phase !== phase.trim()) {
    throw new Error("Scroll observation phase must be non-empty and canonical.");
  }
  phasePlan.push(phase);
}

type CellDeadline = {
  expiresAt: number;
  totalMs: number;
};

/** Browser microfixture seam for the exact nested scroll-position schedule. */
export async function exerciseHkVisualizationScrollPositionMicrofixture(
  workspace: Locator,
): Promise<HkVisualizationScrollPositionMicrofixtureResult> {
  const deadlineMs = 90_000;
  const result = {
    cellId: "microfixture:scroll-position:en",
    collisions: [],
    contract: { renderer: "svg" },
    controls: [],
    failures: [],
    interactions: [],
    labId: "scroll-position-microfixture",
    language: "en",
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    stateScanLedger: emptyStateScanLedger(),
  } as unknown as HkVisualizationCellResult;
  await auditInteractiveState(
    workspace,
    result,
    { expiresAt: Date.now() + deadlineMs, totalMs: deadlineMs },
    "scroll-position-microfixture",
  );
  return Object.freeze({
    collisions: Object.freeze(result.collisions),
    failures: Object.freeze(result.failures),
    layout: Object.freeze(result.layout),
    scrollObservationPhasePlan: Object.freeze(
      result.scrollObservationPhasePlan,
    ),
    scrollObservationSets: Object.freeze(result.scrollObservationSets),
  });
}

/**
 * Runs the same grouped-mode and Reset interaction path as the 918-cell gate
 * against an isolated DOM fixture. This deliberately small public seam keeps
 * adversarial Playwright fixtures independent from the application router.
 */
export async function exerciseHkVisualizationInteractionMicrofixture(args: {
  controlIds?: readonly string[];
  controlSelectors?: readonly string[];
  language: HkVisualizationLanguage;
  modeIds: readonly string[];
  modeSelectors: readonly string[];
  modeTopology?: readonly HkVisualizationModeExerciseTopologyGroup[];
  resetSelector: string;
  workspace: Locator;
}): Promise<HkVisualizationInteractionMicrofixtureResult> {
  if (args.modeIds.length !== args.modeSelectors.length) {
    throw new Error(
      `Microfixture declared ${args.modeIds.length} mode IDs but ${args.modeSelectors.length} selectors.`,
    );
  }
  if ((args.controlIds?.length ?? 0) !== (args.controlSelectors?.length ?? 0)) {
    throw new Error(
      `Microfixture declared ${args.controlIds?.length ?? 0} control IDs but ${args.controlSelectors?.length ?? 0} selectors.`,
    );
  }
  const contract = {
    controlIds: args.controlIds ?? [],
    labId: "interaction-microfixture",
    modeIds: args.modeIds,
    rangeDomainId: null,
    selectors: {
      controls: args.controlSelectors ?? [],
      modes: args.modeSelectors,
      reset: args.resetSelector,
    },
  } as unknown as HKVisualizationLessonContract;
  const deadlineMs = 45_000;
  const deadline: CellDeadline = {
    expiresAt: Date.now() + deadlineMs,
    totalMs: deadlineMs,
  };
  const result = {
    cellId: `microfixture:interaction:${args.language}:light`,
    collisions: [],
    contract: { renderer: "svg" },
    controls: [],
    failures: [],
    interactions: [],
    labId: "interaction-microfixture",
    language: args.language,
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    stateScanLedger: emptyStateScanLedger(),
    theme: "light",
  } as unknown as HkVisualizationCellResult;
  await exerciseFullInteractions(
    args.workspace,
    contract,
    result,
    deadline,
    args.modeTopology,
  );

  let groups: Record<string, string> = {};
  try {
    groups = Object.fromEntries(
      (await assertVisibleDeclaredModeGroups(args.workspace, contract)).map(
        (group) => [group.groupId, group.activeModeId],
      ),
    );
  } catch (error) {
    addFailure(
      result,
      "MANIFEST_MODE_GROUP",
      errorMessage(error),
      "manifest-mode-groups",
    );
  }
  return {
    collisions: result.collisions,
    dependentTransitionSequenceObservations:
      result.dependentTransitionSequenceObservations,
    failures: result.failures,
    groups,
    interactions: result.interactions,
    layout: result.layout,
    p6BudgetBoundaryObservations: result.p6BudgetBoundaryObservations,
    p6AveragesLineGraphObservations: result.p6AveragesLineGraphObservations,
    passThroughOracleObservations: result.passThroughOracleObservations,
    passThroughResetObservations: result.passThroughResetObservations,
    scrollObservationPhasePlan: result.scrollObservationPhasePlan,
    scrollObservationSets: result.scrollObservationSets,
    stateScanLedger: result.stateScanLedger,
  };
}

/**
 * Focused browser seam for the dynamic range-domain state machine. It uses the
 * exact production planner/executor and every per-state UI audit, while keeping
 * unrelated navigation, telemetry, and final dual-keyboard Reset checks out of
 * adversarial microfixtures.
 */
type HkVisualizationFreshPageDynamicRangeMicrofixtureArgs = Readonly<{
  browser: Browser;
  controlIds: readonly string[];
  controlSelectors: readonly string[];
  expectedStateCount: number;
  labId: string;
  language?: HkVisualizationLanguage;
  modeIds?: readonly string[];
  modeSelectors?: readonly string[];
  modelSelector: string;
  mountWorkspace: (page: Page) => Promise<Locator>;
  rangeDomainId: HKVisualizationRangeDomainId;
  resetSelector: string;
  runtimePaths: HkVisualizationBrowserRuntimePaths;
  setTestTimeout?: (timeoutMs: number) => void;
}>;

/**
 * Browser-only chunk seam for the adversarial dynamic microfixture. This is
 * not the 918-cell release runner: it freezes one exact preflight plan, opens
 * one fresh browser context/page per v2 chunk, recomputes that same full plan
 * before executing any state, and then executes only the original plan slice.
 */
export async function exerciseHkVisualizationDynamicRangeMicrofixtureInFreshPageChunks(
  args: HkVisualizationFreshPageDynamicRangeMicrofixtureArgs,
): Promise<HkVisualizationChunkedInteractionMicrofixtureResult> {
  const runtimePaths = canonicalHkVisualizationBrowserRuntimePaths(
    args.runtimePaths,
  );
  const modeIds = args.modeIds ?? [];
  const modeSelectors = args.modeSelectors ?? [];
  if (modeIds.length !== modeSelectors.length) {
    throw new Error(
      `Fresh-page dynamic microfixture declared ${modeIds.length} mode IDs but ${modeSelectors.length} selectors.`,
    );
  }
  if (args.controlIds.length !== args.controlSelectors.length) {
    throw new Error(
      `Fresh-page dynamic microfixture declared ${args.controlIds.length} control IDs but ${args.controlSelectors.length} selectors.`,
    );
  }
  if (
    !Number.isInteger(args.expectedStateCount) ||
    args.expectedStateCount < 1 ||
    args.expectedStateCount > 150
  ) {
    throw new Error(
      `Fresh-page dynamic microfixture expectedStateCount must be an integer from 1 through 150; received ${String(args.expectedStateCount)}.`,
    );
  }
  const contract = {
    controlIds: args.controlIds,
    labId: args.labId,
    modeIds,
    rangeDomainId: args.rangeDomainId,
    selectors: {
      controls: args.controlSelectors,
      model: args.modelSelector,
      modes: modeSelectors,
      reset: args.resetSelector,
    },
  } as unknown as HKVisualizationLessonContract;
  const preflightDeadline: CellDeadline = {
    expiresAt: Date.now() + HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
    totalMs: HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
  };
  const primary = await withFreshDynamicMicrofixturePage(
    args.browser,
    args.mountWorkspace,
    preflightDeadline,
    async ({ workspace }) =>
      preflightFreshPageDynamicRangePlan(
        workspace,
        contract,
        args.language ?? "en",
        preflightDeadline,
      ),
  );
  if (primary.plan.states.length !== args.expectedStateCount) {
    throw new Error(
      `Fresh-page dynamic microfixture declared ${args.expectedStateCount} states but the exact preflight plan produced ${primary.plan.states.length}.`,
    );
  }
  args.setTestTimeout?.(primary.plan.budget.totalMs);

  const chunkReceipts: HkVisualizationBrowserChunkReceipt[] = [];
  const chunkResults: HkVisualizationCellResult[] = [];
  for (const chunk of primary.plan.chunks) {
    const deadline: CellDeadline = {
      expiresAt: Date.now() + chunk.budget.totalMs,
      totalMs: chunk.budget.totalMs,
    };
    const executed = await withFreshDynamicMicrofixturePage(
      args.browser,
      args.mountWorkspace,
      deadline,
      async ({ pageInstanceId, workspace }) => {
        const recomputed = await preflightFreshPageDynamicRangePlan(
          workspace,
          contract,
          args.language ?? "en",
          deadline,
        );
        assertSameFreshPageDynamicPlan(primary.plan, recomputed.plan, chunk);
        const localResult = dynamicMicrofixtureCellResult(
          args.labId,
          args.language ?? "en",
        );
        const localEntries = primary.ledgerEntries
          .slice(chunk.start, chunk.end)
          .map(cloneStateScanLedgerEntry);
        localResult.stateScanLedger = {
          entries: localEntries,
          executedStateIds: [],
          plannedStateIds: localEntries.map(({ id }) => id),
        };
        for (
          let globalStateIndex = chunk.start;
          globalStateIndex < chunk.end;
          globalStateIndex += 1
        ) {
          await executeRangeStateScan(
            workspace,
            contract,
            recomputed.ranges,
            primary.rangePlan[globalStateIndex],
            localEntries[globalStateIndex - chunk.start],
            localResult,
            deadline,
            primary.canonicalFingerprint,
            recomputed.modeContext,
            recomputed.activeDomain,
          );
        }
        assertStateScanLedger(localResult);
        if (
          localResult.scrollObservationPhasePlan.length !== localEntries.length
          || localResult.scrollObservationSets.length !== localEntries.length
        ) {
          throw new Error(
            `Fresh-page chunk ${chunk.chunkId} must produce exactly one independently planned scroll observation receipt per state.`,
          );
        }
        const stateReceipts = localEntries.map((entry, localStateIndex) => {
          if (
            entry.observedSignature === null ||
            entry.startingObservedSignature === null
          ) {
            throw new Error(
              `Fresh-page chunk ${chunk.chunkId} omitted exact observations for ${entry.id}.`,
            );
          }
          const plannedPhase = localResult.scrollObservationPhasePlan[localStateIndex];
          const scrollReceipt = localResult.scrollObservationSets[localStateIndex];
          if (
            plannedPhase !== entry.phase
            || scrollReceipt?.phase !== entry.phase
          ) {
            throw new Error(
              `Fresh-page chunk ${chunk.chunkId} scroll receipt ${localStateIndex} does not match exact state phase ${entry.phase}.`,
            );
          }
          return Object.freeze({
            expectedSignature: entry.expectedSignature,
            observedSignature: entry.observedSignature,
            phase: entry.phase,
            scrollObservationSet: scrollReceipt.observationSet,
            startingObservedSignature: entry.startingObservedSignature,
            startingSignature: entry.startingSignature,
            stateId: entry.id,
            stateIndex: chunk.start + localStateIndex,
          });
        });
        return {
          receipt: Object.freeze({
            budgetTotalMs: chunk.budget.totalMs,
            cellExecutionHash: primary.plan.cellExecutionHash,
            chunkId: chunk.chunkId,
            end: chunk.end,
            pageInstanceId,
            planHash: primary.plan.planHash,
            recomputedCellExecutionHash: recomputed.plan.cellExecutionHash,
            recomputedPlanHash: recomputed.plan.planHash,
            start: chunk.start,
            stateReceipts: Object.freeze(stateReceipts),
          }) satisfies HkVisualizationBrowserChunkReceipt,
          result: localResult,
        };
      },
    );
    chunkReceipts.push(executed.receipt);
    chunkResults.push(executed.result);
  }

  const browserChunkReceipts = Object.freeze(chunkReceipts);
  const browserChunkAggregate =
    aggregateHkVisualizationBrowserChunkReceipts(
      primary.plan,
      browserChunkReceipts,
    );
  const result = dynamicMicrofixtureCellResult(
    args.labId,
    args.language ?? "en",
  );
  result.collisions = chunkResults.flatMap(({ collisions }) => collisions);
  for (const failure of chunkResults.flatMap(({ failures }) => failures)) {
    appendBoundedHkVisualizationFailureReceipt(
      result.failures,
      failure.code,
      failure.message,
      failure.phase,
      failure.selector,
      failure.details,
    );
  }
  result.interactions = chunkResults.flatMap(({ interactions }) => interactions);
  result.layout = chunkResults.flatMap(({ layout }) => layout);
  result.dependentTransitionSequenceObservations = chunkResults.flatMap(
    ({ dependentTransitionSequenceObservations }) =>
      dependentTransitionSequenceObservations,
  );
  result.p6BudgetBoundaryObservations = chunkResults.flatMap(
    ({ p6BudgetBoundaryObservations }) => p6BudgetBoundaryObservations,
  );
  result.p6AveragesLineGraphObservations = chunkResults.flatMap(
    ({ p6AveragesLineGraphObservations }) => p6AveragesLineGraphObservations,
  );
  result.passThroughOracleObservations = chunkResults.flatMap(
    ({ passThroughOracleObservations }) => passThroughOracleObservations,
  );
  result.passThroughResetObservations = chunkResults.flatMap(
    ({ passThroughResetObservations }) => passThroughResetObservations,
  );
  result.scrollObservationPhasePlan = chunkResults.flatMap(
    ({ scrollObservationPhasePlan }) => scrollObservationPhasePlan,
  );
  result.scrollObservationSets = chunkResults.flatMap(
    ({ scrollObservationSets }) => scrollObservationSets,
  );
  result.stateScanLedger = {
    entries: chunkResults.flatMap(({ stateScanLedger }) =>
      stateScanLedger.entries.map(cloneStateScanLedgerEntry),
    ),
    executedStateIds: [...browserChunkAggregate.executedStateIds],
    plannedStateIds: [...browserChunkAggregate.plannedStateIds],
  };
  assertStateScanLedger(result);
  return {
    browserChunkAggregate,
    browserChunkReceipts,
    collisions: result.collisions,
    dependentTransitionSequenceObservations:
      result.dependentTransitionSequenceObservations,
    failures: result.failures,
    groups: Object.fromEntries(
      primary.modeContext.map(({ activeModeId, groupId }) => [
        groupId,
        activeModeId,
      ]),
    ),
    interactions: result.interactions,
    layout: result.layout,
    p6BudgetBoundaryObservations: result.p6BudgetBoundaryObservations,
    p6AveragesLineGraphObservations: result.p6AveragesLineGraphObservations,
    passThroughOracleObservations: result.passThroughOracleObservations,
    passThroughResetObservations: result.passThroughResetObservations,
    planBudgetMs: primary.plan.budget.totalMs,
    runtimePaths,
    scrollObservationPhasePlan: result.scrollObservationPhasePlan,
    scrollObservationSets: result.scrollObservationSets,
    stateScanLedger: result.stateScanLedger,
  };
}

export async function exerciseHkVisualizationDynamicRangeMicrofixture(args: {
  controlIds: readonly string[];
  controlSelectors: readonly string[];
  expectedStateCount?: number;
  labId: string;
  language?: HkVisualizationLanguage;
  modeIds?: readonly string[];
  modeSelectors?: readonly string[];
  modelSelector: string;
  rangeDomainId: HKVisualizationRangeDomainId | null;
  resetSelector: string;
  stateSelector?: string;
  workspace: Locator;
}): Promise<HkVisualizationInteractionMicrofixtureResult> {
  const modeIds = args.modeIds ?? [];
  const modeSelectors = args.modeSelectors ?? [];
  if (modeIds.length !== modeSelectors.length) {
    throw new Error(
      `Dynamic microfixture declared ${modeIds.length} mode IDs but ${modeSelectors.length} selectors.`,
    );
  }
  if (args.controlIds.length !== args.controlSelectors.length) {
    throw new Error(
      `Dynamic microfixture declared ${args.controlIds.length} control IDs but ${args.controlSelectors.length} selectors.`,
    );
  }
  if (
    args.rangeDomainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID &&
    !args.stateSelector?.trim()
  ) {
    throw new Error(
      `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} microfixture requires one exact configured state selector.`,
    );
  }
  if (
    args.expectedStateCount !== undefined &&
    (!Number.isInteger(args.expectedStateCount) ||
      args.expectedStateCount < 1 ||
      args.expectedStateCount > 150)
  ) {
    throw new Error(
      `Dynamic microfixture expectedStateCount must be an integer from 1 through 150; received ${String(args.expectedStateCount)}.`,
    );
  }
  const contract = {
    controlIds: args.controlIds,
    labId: args.labId,
    modeIds,
    rangeDomainId: args.rangeDomainId,
    selectors: {
      controls: args.controlSelectors,
      model: args.modelSelector,
      modes: modeSelectors,
      reset: args.resetSelector,
      state: args.stateSelector,
    },
  } as unknown as HKVisualizationLessonContract;
  const deadlineMs =
    args.expectedStateCount === undefined
      ? 240_000
      : 60_000 + 4_000 * args.expectedStateCount;
  const deadline: CellDeadline = {
    expiresAt: Date.now() + deadlineMs,
    totalMs: deadlineMs,
  };
  const result = {
    cellId: `microfixture:${args.labId}:${args.language ?? "en"}:light`,
    collisions: [],
    contract: { renderer: "svg" },
    controls: [],
    failures: [],
    interactions: [],
    labId: args.labId,
    language: args.language ?? "en",
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    stateScanLedger: emptyStateScanLedger(),
    theme: "light",
  } as unknown as HkVisualizationCellResult;
  const canonicalFingerprint = await visualizationFingerprint(args.workspace);
  await exerciseModeAndRangeStateMatrix(
    args.workspace,
    contract,
    result,
    deadline,
    new Set<number>(),
    canonicalFingerprint,
  );
  if (
    args.expectedStateCount !== undefined &&
    result.stateScanLedger.plannedStateIds.length !== args.expectedStateCount
  ) {
    throw new Error(
      `Dynamic microfixture declared ${args.expectedStateCount} states but the exact planner produced ${result.stateScanLedger.plannedStateIds.length}; failures=${JSON.stringify(result.failures)}.`,
    );
  }
  assertStateScanLedger(result);
  let groups: Record<string, string> = {};
  try {
    groups = Object.fromEntries(
      (await assertVisibleDeclaredModeGroups(args.workspace, contract)).map(
        (group) => [group.groupId, group.activeModeId],
      ),
    );
  } catch (error) {
    addFailure(
      result,
      "MANIFEST_MODE_GROUP",
      errorMessage(error),
      "manifest-mode-groups",
    );
  }
  return {
    collisions: result.collisions,
    dependentTransitionSequenceObservations:
      result.dependentTransitionSequenceObservations,
    failures: result.failures,
    groups,
    interactions: result.interactions,
    layout: result.layout,
    p6BudgetBoundaryObservations: result.p6BudgetBoundaryObservations,
    p6AveragesLineGraphObservations: result.p6AveragesLineGraphObservations,
    passThroughOracleObservations: result.passThroughOracleObservations,
    passThroughResetObservations: result.passThroughResetObservations,
    scrollObservationPhasePlan: result.scrollObservationPhasePlan,
    scrollObservationSets: result.scrollObservationSets,
    stateScanLedger: result.stateScanLedger,
  };
}

async function effectiveVisibility(locator: Locator) {
  return await locator.evaluate((element, globalName) => {
    type Inspector = (
      target: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const inspector = (
      globalThis as unknown as Record<string, Inspector | undefined>
    )[globalName];
    if (!inspector)
      throw new Error(
        `Missing HK effective-visibility inspector ${globalName}.`,
      );
    return inspector(element);
  }, effectiveVisibilityGlobalName);
}

async function locatorPassesVisibility(
  locator: Locator,
  requirement: HkVisualizationVisibilityRequirement,
) {
  if ((await locator.count()) !== 1) return false;
  const evidence = await effectiveVisibility(locator).catch(() => null);
  return evidence
    ? hkVisualizationVisibilityPasses(evidence, requirement)
    : false;
}

async function expectLocatorVisibility(
  locator: Locator,
  requirement: HkVisualizationVisibilityRequirement,
  deadline: CellDeadline,
  label: string,
  capMs = 5_000,
) {
  let latest: HkVisualizationEffectiveVisibilityEvidence | null = null;
  await expect
    .poll(
      async () => {
        if ((await locator.count()) !== 1) return false;
        latest = await effectiveVisibility(locator).catch(() => null);
        return latest
          ? hkVisualizationVisibilityPasses(latest, requirement)
          : false;
      },
      {
        timeout: deadlineTimeout(
          deadline,
          capMs,
          `${label} effective visibility`,
        ),
      },
    )
    .toBe(true);
  if (!latest)
    throw new Error(`${label} produced no effective-visibility evidence.`);
  return latest;
}

export function resolveHkVisualizationAcceptanceOptions(
  catalog: readonly FeaturedLabDefinition[],
  environment: Environment = process.env,
): HkVisualizationAcceptanceOptions {
  const allHkLabs = [...catalog]
    .filter((lab) => lab.curriculumTrack === "HK")
    .sort(compareLabs);

  if (allHkLabs.length !== HK_VISUALIZATION_EXPECTED_LAB_COUNT) {
    throw new Error(
      `HK Visualization catalog contract drifted: expected exactly ${HK_VISUALIZATION_EXPECTED_LAB_COUNT} labs, received ${allHkLabs.length}.`,
    );
  }

  const catalogLabIds = allHkLabs.map((lab) => lab.labId);
  const duplicateLabIds = catalogLabIds.filter(
    (labId, index) => catalogLabIds.indexOf(labId) !== index,
  );
  if (duplicateLabIds.length > 0) {
    throw new Error(
      `HK Visualization catalog contains duplicate lab IDs: ${unique(duplicateLabIds).join(", ")}.`,
    );
  }

  const expectedLabIdSet = new Set<string>(HK_VISUALIZATION_LAB_IDS);
  const catalogLabIdSet = new Set(catalogLabIds);
  const missingLabIds = HK_VISUALIZATION_LAB_IDS.filter(
    (labId) => !catalogLabIdSet.has(labId),
  );
  const unexpectedLabIds = catalogLabIds.filter(
    (labId) => !expectedLabIdSet.has(labId),
  );
  if (missingLabIds.length > 0 || unexpectedLabIds.length > 0) {
    throw new Error(
      `HK Visualization catalog IDs drifted from the A06 registry; missing=[${missingLabIds.join(", ")}], unexpected=[${unexpectedLabIds.join(", ")}].`,
    );
  }

  const allowPartial = parseBinaryFlag(
    "HK_VIZ_ALLOW_PARTIAL",
    environment.HK_VIZ_ALLOW_PARTIAL,
    false,
  );
  const fullMatrixRequested = parseBinaryFlag(
    "HK_VIZ_FULL_MATRIX",
    environment.HK_VIZ_FULL_MATRIX,
    true,
  );
  const explicitFilters = filterEnvironmentNames.filter(
    (name) => environment[name] !== undefined,
  );
  const partialReasons = [
    ...explicitFilters,
    ...(fullMatrixRequested ? [] : ["HK_VIZ_FULL_MATRIX=0"]),
    ...(environment.HK_VIZ_INTERACTION_DEPTH === "layout"
      ? ["HK_VIZ_INTERACTION_DEPTH=layout"]
      : []),
  ];
  if (partialReasons.length > 0 && !allowPartial) {
    throw new Error(
      `Partial HK Visualization acceptance is blocked by default (${partialReasons.join(", ")}). ` +
        "Set HK_VIZ_ALLOW_PARTIAL=1 only for an explicitly targeted developer run; release acceptance must use the default 918-cell/216-package matrix.",
    );
  }
  const allGrades = unique(allHkLabs.map((lab) => lab.grade)).sort(
    compareGrades,
  );
  const allLabIds = catalogLabIds;
  const selectedGrades = parseCsvFilter(
    "HK_VIZ_GRADES",
    environment.HK_VIZ_GRADES,
    allGrades,
    allGrades,
  );
  const selectedLabIds = parseCsvFilter(
    "HK_VIZ_LABS",
    environment.HK_VIZ_LABS,
    allLabIds,
    allLabIds,
  );
  const languages = parseCsvFilter(
    "HK_VIZ_LANGUAGES",
    environment.HK_VIZ_LANGUAGES,
    hkVisualizationLanguages,
    partialReasons.length === 0 ? hkVisualizationLanguages : ["en"],
  );
  const themes = parseCsvFilter(
    "HK_VIZ_THEMES",
    environment.HK_VIZ_THEMES,
    hkVisualizationThemes,
    partialReasons.length === 0 ? hkVisualizationThemes : ["dark"],
  );
  const viewports = parseCsvFilter(
    "HK_VIZ_VIEWPORTS",
    environment.HK_VIZ_VIEWPORTS,
    viewportIds,
    partialReasons.length === 0 ? viewportIds : ["desktop"],
  );
  const interactionDepth = parseSingleValue(
    "HK_VIZ_INTERACTION_DEPTH",
    environment.HK_VIZ_INTERACTION_DEPTH,
    hkVisualizationInteractionDepths,
    "full",
  );

  const selectedGradeSet = new Set<string>(selectedGrades);
  const selectedLabIdSet = new Set<string>(selectedLabIds);

  if (
    environment.HK_VIZ_GRADES !== undefined &&
    environment.HK_VIZ_LABS !== undefined
  ) {
    const excludedRequestedLabs = allHkLabs
      .filter(
        (lab) =>
          selectedLabIdSet.has(lab.labId) && !selectedGradeSet.has(lab.grade),
      )
      .map((lab) => `${lab.labId} (${lab.grade})`);
    if (excludedRequestedLabs.length > 0) {
      throw new Error(
        `HK_VIZ_GRADES and HK_VIZ_LABS disagree; the grade filter would silently discard requested lab(s): ${excludedRequestedLabs.join(", ")}.`,
      );
    }
  }

  const selectedLabs = allHkLabs.filter(
    (lab) => selectedGradeSet.has(lab.grade) && selectedLabIdSet.has(lab.labId),
  );

  if (selectedLabs.length === 0) {
    throw new Error(
      "HK Visualization acceptance filters produced an empty lab set. Check HK_VIZ_GRADES and HK_VIZ_LABS.",
    );
  }

  const gradeCount = unique(selectedLabs.map((lab) => lab.grade)).length;
  const matrixScope: HkVisualizationMatrixScope =
    fullMatrixRequested &&
    explicitFilters.length === 0 &&
    interactionDepth === "full" &&
    selectedLabs.length === allHkLabs.length
      ? "full"
      : "partial";

  if (matrixScope === "full") {
    const fullCellCount =
      selectedLabs.length * languages.length * themes.length * viewports.length;
    const fullPackageCount =
      gradeCount * languages.length * themes.length * viewports.length;
    if (
      fullCellCount !== HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT ||
      fullPackageCount !== HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT
    ) {
      throw new Error(
        `HK full-matrix contract drifted: expected ${HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT} cells/${HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT} packages, received ${fullCellCount}/${fullPackageCount}.`,
      );
    }
  }

  return {
    allowPartial,
    allHkLabs,
    expectedCellCount:
      selectedLabs.length * languages.length * themes.length * viewports.length,
    expectedPackageCount:
      gradeCount * languages.length * themes.length * viewports.length,
    explicitFilters,
    fullMatrixRequested,
    interactionDepth,
    languages,
    matrixScope,
    selectedLabs,
    themes,
    viewports,
  };
}

export function buildHkVisualizationPackages(
  options: HkVisualizationAcceptanceOptions,
): HkVisualizationPackage[] {
  const labsByGrade = new Map<string, FeaturedLabDefinition[]>();
  for (const lab of options.selectedLabs) {
    const gradeLabs = labsByGrade.get(lab.grade) ?? [];
    gradeLabs.push(lab);
    labsByGrade.set(lab.grade, gradeLabs);
  }

  const grades = [...labsByGrade.keys()].sort(compareGrades);
  const packages: HkVisualizationPackage[] = [];

  for (const viewportId of options.viewports) {
    for (const language of options.languages) {
      for (const theme of options.themes) {
        for (const grade of grades) {
          const labs = [...(labsByGrade.get(grade) ?? [])].sort(compareLabs);
          packages.push({
            grade,
            id: `hk-viz-${grade}-${viewportId}-${language}-${theme}`,
            labs,
            language,
            theme,
            viewportId,
          });
        }
      }
    }
  }

  if (packages.length !== options.expectedPackageCount) {
    throw new Error(
      `HK Visualization package planning drifted: expected ${options.expectedPackageCount}, generated ${packages.length}.`,
    );
  }

  const plannedCellCount = packages.reduce(
    (total, regressionPackage) => total + regressionPackage.labs.length,
    0,
  );
  if (plannedCellCount !== options.expectedCellCount) {
    throw new Error(
      `HK Visualization cell planning drifted: expected ${options.expectedCellCount}, generated ${plannedCellCount}.`,
    );
  }

  return packages;
}

export function buildHkVisualizationMatrixManifest(
  options: HkVisualizationAcceptanceOptions,
) {
  const packages = buildHkVisualizationPackages(options);
  const plannedCellIds = packages.flatMap((regressionPackage) =>
    regressionPackage.labs.map((lab) => cellIdFor(lab, regressionPackage)),
  );
  return {
    schemaVersion: HK_VISUALIZATION_ACCEPTANCE_SCHEMA_VERSION,
    catalog: {
      allHkLabCount: options.allHkLabs.length,
      expectedHkLabCount: HK_VISUALIZATION_EXPECTED_LAB_COUNT,
      allHkLabIds: options.allHkLabs.map((lab) => lab.labId),
      selectedLabCount: options.selectedLabs.length,
      selectedLabIds: options.selectedLabs.map((lab) => lab.labId),
    },
    matrix: {
      allowPartial: options.allowPartial,
      canonicalProject: HK_VISUALIZATION_CANONICAL_PROJECT,
      expectedFullCellCount: HK_VISUALIZATION_EXPECTED_FULL_CELL_COUNT,
      expectedFullPackageCount: HK_VISUALIZATION_EXPECTED_FULL_PACKAGE_COUNT,
      expectedCellCount: options.expectedCellCount,
      expectedPackageCount: options.expectedPackageCount,
      explicitFilters: options.explicitFilters,
      fullMatrixRequested: options.fullMatrixRequested,
      interactionDepth: options.interactionDepth,
      languages: options.languages,
      scope: options.matrixScope,
      themes: options.themes,
      viewports: options.viewports.map((id) => ({
        id,
        ...hkVisualizationViewports[id],
      })),
    },
    plan: {
      packageIds: packages.map((regressionPackage) => regressionPackage.id),
      plannedCellIds,
    },
  };
}

export function hkVisualizationCellDeadlineMs(
  depth: HkVisualizationInteractionDepth,
  labId?: string,
) {
  return cellDeadlineByDepth[depth] +
    (depth === "full"
      ? hkVisualizationDependentTransitionDeadlineBudgetMs(labId)
      : 0);
}

export async function runHkVisualizationPackage(args: {
  baseURL: string;
  browser: Browser;
  options: HkVisualizationAcceptanceOptions;
  regressionPackage: HkVisualizationPackage;
  runId: string;
  testInfo: TestInfo;
}): Promise<HkVisualizationPackageResult> {
  const { baseURL, browser, options, regressionPackage, runId, testInfo } =
    args;
  const startedAt = new Date().toISOString();
  const packageFailures: HkVisualizationFailure[] = [];
  const cells: HkVisualizationCellResult[] = [];
  const plannedCellIds = regressionPackage.labs.map((lab) =>
    cellIdFor(lab, regressionPackage),
  );
  const executedCellIds: string[] = [];
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      baseURL,
      colorScheme: regressionPackage.theme,
      locale: browserLocale(regressionPackage.language),
      reducedMotion: "reduce",
      viewport: hkVisualizationViewports[regressionPackage.viewportId],
    });

    const authPage = await context.newPage();
    try {
      const authenticationGrade =
        authenticationGradeForHkVisualizationPackage(regressionPackage);
      await registerStudentApi(authPage, testInfo, authenticationGrade);
      await verifyAuthenticatedHkStudent(authPage, baseURL);
    } finally {
      await authPage.close().catch(() => undefined);
    }

    for (const lab of regressionPackage.labs) {
      let page: Page | null = null;
      const cellId = cellIdFor(lab, regressionPackage);
      executedCellIds.push(cellId);
      try {
        page = await context.newPage();
        const result = await runHkVisualizationCell({
          baseURL,
          interactionDepth: options.interactionDepth,
          lab,
          language: regressionPackage.language,
          page,
          testInfo,
          theme: regressionPackage.theme,
          viewportId: regressionPackage.viewportId,
        });
        cells.push(result);
      } catch (error) {
        const failure = sanitizeHkVisualizationFailureReceipt(
          "CELL_UNCAUGHT",
          errorMessage(error),
          "cell",
          undefined,
          { labId: lab.labId },
        );
        cells.push(
          fatalCellResult(
            lab,
            regressionPackage,
            failure,
            options.interactionDepth,
          ),
        );
      } finally {
        await page?.close().catch(() => undefined);
      }
    }
  } catch (error) {
    const failure = failureFromError("PACKAGE_SETUP", error, "package-setup");
    packageFailures.push(failure);
  } finally {
    await context?.close().catch(() => undefined);
  }

  const executedCellIdSet = new Set(executedCellIds);
  const duplicateCellIds = unique(
    executedCellIds.filter(
      (cellId, index) => executedCellIds.indexOf(cellId) !== index,
    ),
  );
  const missingCellIds = plannedCellIds.filter(
    (cellId) => !executedCellIdSet.has(cellId),
  );
  if (missingCellIds.length > 0) {
    packageFailures.push(sanitizeHkVisualizationFailureReceipt(
      "PACKAGE_CELLS_MISSING",
      `${missingCellIds.length} planned cell(s) were not executed.`,
      "package-ledger",
      undefined,
      { missingCellIds },
    ));
  }
  if (duplicateCellIds.length > 0) {
    packageFailures.push(sanitizeHkVisualizationFailureReceipt(
      "PACKAGE_CELLS_DUPLICATE",
      `${duplicateCellIds.length} cell ID(s) were executed more than once.`,
      "package-ledger",
      undefined,
      { duplicateCellIds },
    ));
  }

  const failedCellCount = cells.filter(
    (cell) => cell.status === "failed",
  ).length;
  const allFailures = [
    ...packageFailures,
    ...cells.flatMap((cell) => cell.failures),
  ];
  const result: HkVisualizationPackageResult = {
    cells,
    failures: allFailures,
    matrix: {
      allowPartial: options.allowPartial,
      expectedCellCount: options.expectedCellCount,
      expectedPackageCount: options.expectedPackageCount,
      explicitFilters: options.explicitFilters,
      fullMatrixRequested: options.fullMatrixRequested,
      interactionDepth: options.interactionDepth,
      languages: options.languages,
      scope: options.matrixScope,
      themes: options.themes,
      viewports: options.viewports.map((id) => ({
        id,
        ...hkVisualizationViewports[id],
      })),
    },
    package: {
      duplicateCellIds,
      executedCellIds,
      expectedLabIds: regressionPackage.labs.map((lab) => lab.labId),
      grade: regressionPackage.grade,
      id: regressionPackage.id,
      language: regressionPackage.language,
      missingCellIds,
      plannedCellIds,
      theme: regressionPackage.theme,
      viewportId: regressionPackage.viewportId,
    },
    run: {
      baseURL,
      endedAt: new Date().toISOString(),
      runId,
      startedAt,
    },
    schemaVersion: HK_VISUALIZATION_ACCEPTANCE_SCHEMA_VERSION,
    status: allFailures.length === 0 ? "passed" : "failed",
    summary: {
      executedCellCount: executedCellIds.length,
      failedCellCount,
      missingCellCount: missingCellIds.length,
      passedCellCount: cells.length - failedCellCount,
      plannedCellCount: plannedCellIds.length,
    },
  };

  return result;
}

export function formatHkVisualizationPackageFailure(
  result: HkVisualizationPackageResult,
) {
  const lines = result.failures.slice(0, 20).map((failure) => {
    const phase = failure.phase ? ` [${failure.phase}]` : "";
    return `- ${failure.code}${phase}: ${failure.message}`;
  });
  const omitted = result.failures.length - lines.length;
  if (omitted > 0)
    lines.push(
      `- ... ${omitted} additional failure(s) are in the attached JSON evidence.`,
    );
  return `${result.package.id} failed with ${result.failures.length} issue(s):\n${lines.join("\n")}`;
}

async function runHkVisualizationCell(args: {
  baseURL: string;
  interactionDepth: HkVisualizationInteractionDepth;
  lab: FeaturedLabDefinition;
  language: HkVisualizationLanguage;
  page: Page;
  testInfo: TestInfo;
  theme: HkVisualizationTheme;
  viewportId: HkVisualizationViewportId;
}): Promise<HkVisualizationCellResult> {
  const { baseURL, interactionDepth, lab, language, page, theme, viewportId } =
    args;
  const viewport = hkVisualizationViewports[viewportId];
  const route = buildVisualizationLabHref(lab, "HK");
  const routeKind =
    lab.threeD?.premiumLaunch === true ? "premium-direct" : "query";
  const deadlineMs = hkVisualizationCellDeadlineMs(
    interactionDepth,
    lab.labId,
  );
  const deadline: CellDeadline = {
    expiresAt: Date.now() + deadlineMs,
    totalMs: deadlineMs,
  };
  const failures: HkVisualizationFailure[] = [];
  const result: HkVisualizationCellResult = {
    actualFinalUrl: null,
    cellId: `${lab.grade}/${lab.labId}/${viewportId}/${language}/${theme}`,
    collisions: [],
    contract: {
      activeLabExact: false,
      htmlLanguage: null,
      localizedText: null,
      manifest: {
        controlSelectorCount: 0,
        modeSelectorCount: 0,
        modelReady: false,
        resetReady: false,
        stateReady: false,
        stateSummaryReady: false,
      },
      panelReady: false,
      renderer: "unknown",
      surfaceCount: 0,
      threeDLearner: null,
      themeClassApplied: false,
      themeEvidence: null,
      visibleMarkCount: 0,
      workspaceReady: false,
    },
    controls: [],
    deadlineMs,
    diagnostics: [],
    failures,
    grade: lab.grade,
    interactions: [],
    labId: lab.labId,
    language,
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    qaProfile: lab.qaProfile,
    readyMs: null,
    route,
    routeKind,
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    status: "failed",
    stateScanLedger: emptyStateScanLedger(),
    templateId: lab.templateId,
    theme,
    viewport: { id: viewportId, ...viewport },
  };
  const diagnostics = installDiagnostics(page, baseURL);
  const startedAt = Date.now();
  const lessonContract = hkVisualizationLessonContract(lab.labId);

  const finish = async (phase: string) => {
    diagnostics.setPhase(`${phase}:settle`);
    await page.waitForTimeout(diagnosticSettleMs).catch(() => undefined);
    result.diagnostics = diagnostics.issues();
    for (const diagnostic of result.diagnostics) {
      addFailure(
        result,
        diagnosticCode(diagnostic.kind),
        diagnostic.message,
        diagnostic.phase,
        undefined,
        diagnostic,
      );
    }
    result.status = result.failures.length === 0 ? "passed" : "failed";
    return result;
  };

  diagnostics.setPhase("navigation");
  const navigated = await guardedCheck(
    result,
    "DIRECT_ROUTE",
    "navigation",
    async () => {
      await installHkVisualizationEffectiveVisibilityInspector(page);
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
        timeout: deadlineTimeout(deadline, 45_000, "navigation"),
      });
      if (!response)
        throw new Error(
          `Navigation to ${route} returned no main-resource response.`,
        );
      if (response.status() >= 400)
        throw new Error(
          `Navigation to ${route} returned HTTP ${response.status()}.`,
        );
    },
  );

  if (!navigated) {
    addFailure(
      result,
      "READINESS_SHORT_CIRCUIT",
      "Navigation failed; panel, active-lab, and workspace readiness checks were skipped to preserve the cell deadline.",
      "navigation",
    );
    return finish("navigation-failed");
  }

  diagnostics.setPhase("preferences:language");
  await guardedCheck(result, "LANGUAGE_SELECTION", "preferences", async () => {
    await ensureLanguage(page, language, deadline);
  });
  diagnostics.setPhase("preferences:theme");
  await guardedCheck(result, "THEME_SELECTION", "preferences", async () => {
    await ensureTheme(page, theme, deadline);
  });

  const panel = page.locator('[data-viz-panel-mode="lab"]');
  diagnostics.setPhase("readiness:panel");
  result.contract.panelReady = await guardedCheck(
    result,
    "PANEL_READY",
    "contract",
    async () => {
      await expectLocatorVisibility(
        panel,
        "learner",
        deadline,
        "panel readiness",
        25_000,
      );
    },
  );
  if (!result.contract.panelReady) {
    addFailure(
      result,
      "READINESS_SHORT_CIRCUIT",
      "The lab panel did not become ready; dependent active-lab and workspace checks were skipped.",
      "contract",
    );
    return finish("panel-not-ready");
  }

  result.actualFinalUrl = sanitizeHkVisualizationDiagnosticUrl(page.url());
  diagnostics.setPhase("route-contract");
  await guardedCheck(
    result,
    "FINAL_ROUTE_CONTRACT",
    "route-contract",
    async () => {
      assertFinalVisualizationRoute(page.url(), baseURL, lab, routeKind);
    },
  );

  const activeLab = page.locator(
    `[data-viz-active-lab-id=${JSON.stringify(lab.labId)}]`,
  );
  const activeLabRouteState = page.locator(
    `[data-lab-id=${JSON.stringify(lab.labId)}]`,
  );
  diagnostics.setPhase("readiness:active-lab");
  result.contract.activeLabExact = await guardedCheck(
    result,
    "ACTIVE_LAB_EXACT",
    "contract",
    async () => {
      await expect(activeLabRouteState).toHaveCount(1, {
        timeout: deadlineTimeout(
          deadline,
          4_000,
          "unique active lab route-state contract",
        ),
      });
      await expectLocatorVisibility(
        activeLabRouteState,
        "learner",
        deadline,
        "active lab route-state readiness",
        12_000,
      );
      await expectLocatorVisibility(
        activeLab,
        "learner",
        deadline,
        "active lab readiness",
        12_000,
      );
      await expect(activeLabRouteState).toHaveAttribute(
        "data-viz-current-track",
        "HK",
        {
          timeout: deadlineTimeout(deadline, 4_000, "active HK track contract"),
        },
      );
      await expect(activeLabRouteState).toHaveAttribute(
        "data-viz-current-grade",
        lab.grade,
        {
          timeout: deadlineTimeout(deadline, 4_000, "active HK grade contract"),
        },
      );
    },
  );
  if (!result.contract.activeLabExact) {
    addFailure(
      result,
      "READINESS_SHORT_CIRCUIT",
      "The requested lab never became the exact active lab; workspace checks were skipped.",
      "contract",
    );
    return finish("active-lab-mismatch");
  }

  const workspace = page.locator(visualizationLabSectionSelector(lab));
  diagnostics.setPhase("readiness:workspace");
  result.contract.workspaceReady = await guardedCheck(
    result,
    "WORKSPACE_READY",
    "contract",
    async () => {
      await expectLocatorVisibility(
        workspace,
        "learner",
        deadline,
        "workspace readiness",
        12_000,
      );
    },
  );
  if (!result.contract.workspaceReady) {
    addFailure(
      result,
      "READINESS_SHORT_CIRCUIT",
      "The exact lab was active but its workspace did not mount; surface and interaction checks were skipped.",
      "contract",
    );
    return finish("workspace-not-ready");
  }

  if (!lessonContract) {
    addFailure(
      result,
      "MANIFEST_CONTRACT_MISSING",
      `${lab.labId} has no 51-topic lesson contract.`,
      "manifest",
    );
    return finish("manifest-missing");
  }

  diagnostics.setPhase("manifest-contract");
  await verifyManifestContract(
    workspace,
    lab,
    lessonContract,
    result,
    deadline,
  );

  diagnostics.setPhase("contract:language-theme");
  result.contract.htmlLanguage = await page
    .locator("html")
    .getAttribute("lang")
    .catch(() => null);
  await guardedCheck(result, "HTML_LANGUAGE", "contract", async () => {
    const htmlLanguage = result.contract.htmlLanguage ?? "";
    if (!expectedHtmlLanguage[language].test(htmlLanguage)) {
      throw new Error(
        `Expected html lang for ${language}, received ${JSON.stringify(htmlLanguage)}.`,
      );
    }
  });

  result.contract.themeClassApplied = await page
    .locator("html")
    .evaluate((element) => element.classList.contains("dark"))
    .catch(() => false);
  await guardedCheck(result, "HTML_THEME", "contract", async () => {
    const expectedDark = theme === "dark";
    if (result.contract.themeClassApplied !== expectedDark) {
      throw new Error(
        `Expected theme ${theme}; html dark class was ${result.contract.themeClassApplied}.`,
      );
    }
  });

  await verifyLocalizedTextAndTheme(
    workspace,
    lab,
    lessonContract,
    result,
    deadline,
  );

  diagnostics.setPhase("surface-contract");
  const surfaceFailureCountBefore = result.failures.length;
  await verifySurfaceContract(workspace, lab, lessonContract, result, deadline);
  const surfaceContractPassed =
    result.failures.length === surfaceFailureCountBefore;
  result.readyMs = Date.now() - startedAt;
  await auditLayout(workspace, result, "initial");
  await auditCollisions(workspace, result, "initial");
  await inspectControlActionability(workspace, result, deadline);

  if (
    interactionDepth === "full" &&
    surfaceContractPassed &&
    hasCellTime(deadline, 2_000)
  ) {
    diagnostics.setPhase("interactions");
    await exerciseFullInteractions(workspace, lessonContract, result, deadline);
    await verifySurfaceContract(
      workspace,
      lab,
      lessonContract,
      result,
      deadline,
      "post-interaction",
    );
    await auditLayout(workspace, result, "post-interaction");
    await auditCollisions(workspace, result, "post-interaction");
  } else if (interactionDepth === "full" && !surfaceContractPassed) {
    addFailure(
      result,
      "INTERACTION_SHORT_CIRCUIT",
      "Surface contract failed; dependent interactions were skipped.",
      "interactions",
    );
  } else if (interactionDepth === "full") {
    addFailure(
      result,
      "CELL_DEADLINE",
      `The ${deadline.totalMs}ms cell deadline was exhausted before full interactions.`,
      "interactions",
    );
  }

  return finish("complete");
}

async function ensureLanguage(
  page: Page,
  language: HkVisualizationLanguage,
  deadline: CellDeadline,
) {
  const html = page.locator("html");
  const current = (await html.getAttribute("lang")) ?? "";
  if (expectedHtmlLanguage[language].test(current)) return;

  const selector = page
    .getByRole("button", { name: /Language selector|語言選擇|语言选择/i })
    .first();
  const option = page
    .getByRole("menuitemradio", { name: languageMenuOption[language] })
    .first();
  await expectLocatorVisibility(
    selector,
    "interactive",
    deadline,
    "language selector",
    10_000,
  );
  const expanded = (await selector.getAttribute("aria-expanded")) === "true";
  if (!(await locatorPassesVisibility(option, "interactive")) && !expanded) {
    await selector.click({
      timeout: deadlineTimeout(deadline, 5_000, "open language menu"),
    });
  }
  await expectLocatorVisibility(
    option,
    "interactive",
    deadline,
    "language option",
    5_000,
  );
  await option.click({
    timeout: deadlineTimeout(deadline, 5_000, "select language"),
  });
  await expect(html).toHaveAttribute("lang", expectedHtmlLanguage[language], {
    timeout: deadlineTimeout(deadline, 10_000, "language application"),
  });
}

async function ensureTheme(
  page: Page,
  theme: HkVisualizationTheme,
  deadline: CellDeadline,
) {
  const html = page.locator("html");
  const isDark = await html.evaluate((element) =>
    element.classList.contains("dark"),
  );
  if (isDark === (theme === "dark")) return;

  const actionPattern =
    theme === "dark"
      ? /Switch to dark mode|切換至深色模式|切换至深色模式/i
      : /Switch to light mode|切換至淺色模式|切换至浅色模式/i;
  await page.getByRole("button", { name: actionPattern }).click({
    timeout: deadlineTimeout(deadline, 5_000, "theme selection"),
  });
  await expect
    .poll(
      () => html.evaluate((element) => element.classList.contains("dark")),
      { timeout: deadlineTimeout(deadline, 10_000, "theme application") },
    )
    .toBe(theme === "dark");
}

function contractLocator(workspace: Locator, selector: string) {
  return workspace.page().locator(selector);
}

async function assertExactScopedSelector(
  workspace: Locator,
  selector: string,
  label: string,
  deadline: CellDeadline,
) {
  const locator = contractLocator(workspace, selector);
  const count = await locator.count();
  if (count !== 1)
    throw new Error(
      `${label} selector ${JSON.stringify(selector)} matched ${count} elements; exactly one is required.`,
    );
  const root = await workspace.elementHandle();
  if (!root)
    throw new Error(
      "The current topic workspace detached during manifest verification.",
    );
  const scoped = await locator.evaluate(
    (element, workspaceRoot) =>
      workspaceRoot === element || workspaceRoot.contains(element),
    root,
  );
  if (!scoped)
    throw new Error(
      `${label} selector escaped the current topic workspace: ${selector}.`,
    );
  await expectLocatorVisibility(locator, "learner", deadline, label, 4_000);
  return locator;
}

async function verifyManifestContract(
  workspace: Locator,
  lab: FeaturedLabDefinition,
  contract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  await guardedCheck(result, "MANIFEST_IDENTITY", "manifest", async () => {
    if (
      contract.labId !== lab.labId ||
      contract.topicId !== lab.topicId ||
      contract.grade !== lab.grade
    ) {
      throw new Error(
        `Manifest identity mismatch for ${lab.labId}: lab=${contract.labId}, topic=${contract.topicId}, grade=${contract.grade}; catalog topic=${lab.topicId}, grade=${lab.grade}.`,
      );
    }
    if (contract.moduleId !== "configured-visualization-lab") {
      throw new Error(
        `${lab.labId} manifest moduleId must be configured-visualization-lab.`,
      );
    }
  });
  await guardedCheck(result, "MANIFEST_WORKSPACE", "manifest", async () => {
    await assertExactScopedSelector(
      workspace,
      contract.selectors.workspace,
      "manifest topic workspace",
      deadline,
    );
  });

  result.contract.manifest.modeSelectorCount = contract.selectors.modes.length;
  result.contract.manifest.controlSelectorCount =
    contract.selectors.controls.length;
  const checks = [
    ["modelReady", contract.selectors.model, "manifest model"],
    ["stateReady", contract.selectors.state, "manifest state"],
    [
      "stateSummaryReady",
      contract.selectors.stateSummary,
      "manifest state summary",
    ],
    ["resetReady", contract.selectors.reset, "manifest reset"],
  ] as const;
  for (const [field, selector, label] of checks) {
    result.contract.manifest[field] = await guardedCheck(
      result,
      `MANIFEST_${field.toUpperCase()}`,
      "manifest",
      async () => {
        await assertExactScopedSelector(workspace, selector, label, deadline);
      },
    );
  }
}

async function verifyLocalizedTextAndTheme(
  workspace: Locator,
  lab: FeaturedLabDefinition,
  contract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  await guardedCheck(result, "LOCALIZED_LAB_TEXT", "localization", async () => {
    const model = await assertExactScopedSelector(
      workspace,
      contract.selectors.model,
      "localized model",
      deadline,
    );
    const state = await assertExactScopedSelector(
      workspace,
      contract.selectors.stateSummary,
      "localized state",
      deadline,
    );
    const reset = await assertExactScopedSelector(
      workspace,
      contract.selectors.reset,
      "localized reset",
      deadline,
    );
    const modelText = (await model.innerText()).replace(/\s+/g, " ").trim();
    const stateText = (await state.innerText()).replace(/\s+/g, " ").trim();
    if (result.language !== "en") {
      const han = /\p{Script=Han}/u;
      if (!han.test(modelText) || !han.test(stateText)) {
        throw new Error(
          `${result.labId} lacks visible Han-script model/state evidence for ${result.language}.`,
        );
      }
    }
    assertNoLocalizationIssues(
      result.language,
      "state",
      stateText,
      `${result.labId} state summary`,
    );
    await assertLocalizedAccessibleName(
      reset,
      result.language,
      "reset",
      `${result.labId} reset`,
    );

    const formulaSamples = await renderedFormulaSamples(
      workspace,
      lab,
      result.language,
    );
    if (formulaSamples.length === 0) {
      throw new Error(
        `${result.labId} has no visible rendered formula evidence for ${result.language}.`,
      );
    }
    for (const formulaText of formulaSamples) {
      assertNoLocalizationIssues(
        result.language,
        "formula",
        formulaText,
        `${result.labId} formula`,
      );
    }
    result.contract.localizedText = {
      modelSample: modelText.slice(0, 160),
      stateSample: stateText.slice(0, 160),
    };
  });

  await guardedCheck(result, "EFFECTIVE_THEME_CONTRAST", "theme", async () => {
    const scan = await workspace.evaluate(scanHkVisualizationTextContrast, {
      authoringSelector: threeDAuthoringSelector,
    });
    if (scan.checkedTextCount === 0 || !scan.worst) {
      throw new Error(
        "No visible learner HTML/SVG text could be evaluated for contrast.",
      );
    }
    result.contract.themeEvidence = {
      ...scan.worst,
      checkedTextCount: scan.checkedTextCount,
    };
    if (scan.issues.length > 0) {
      throw new Error(
        `Visible learner text contrast failed (${scan.issues.length}): ${scan.issues
          .slice(0, 8)
          .map((issue) => issue.message)
          .join(" | ")}`,
      );
    }
  });
}

function assertNoLocalizationIssues(
  language: HkVisualizationLanguage,
  target: HkVisualizationLocalizedTargetKind,
  text: string,
  label: string,
) {
  const issues = hkVisualizationLocalizationIssues({ language, target, text });
  if (issues.length > 0) throw new Error(`${label}: ${issues.join(" ")}`);
}

async function assertLocalizedAccessibleName(
  locator: Locator,
  language: HkVisualizationLanguage,
  target: Extract<
    HkVisualizationLocalizedTargetKind,
    "mode" | "control" | "reset"
  >,
  label: string,
) {
  const accessibleName = await accessibleControlText(locator);
  assertNoLocalizationIssues(language, target, accessibleName, label);
  return accessibleName;
}

async function renderedFormulaSamples(
  workspace: Locator,
  lab: FeaturedLabDefinition,
  language: HkVisualizationLanguage,
) {
  const samples = await workspace
    .locator(
      [
        "[data-hk-viz-formula]",
        '[data-hk-viz-model="secondary-dedicated-v1"] p[aria-label]',
        "[data-viz-formula-text]",
        "[data-viz-formula]",
      ].join(","),
    )
    .evaluateAll(
      (elements, globalName) =>
        elements.flatMap((element) => {
          type Inspector = (
            target: Element,
          ) => HkVisualizationEffectiveVisibilityEvidence;
          const inspector = (
            globalThis as unknown as Record<string, Inspector | undefined>
          )[globalName];
          if (!inspector)
            throw new Error(
              `Missing HK effective-visibility inspector ${globalName}.`,
            );
          const visibility = inspector(element);
          if (
            !visibility.visuallyVisible ||
            visibility.hiddenAncestor ||
            visibility.inertAncestor ||
            visibility.ariaHiddenAncestor
          ) {
            return [];
          }
          const text = (
            element.getAttribute("aria-label") ??
            element.textContent ??
            ""
          )
            .replace(/\s+/g, " ")
            .trim();
          return text ? [text] : [];
        }),
      effectiveVisibilityGlobalName,
    );

  if (lab.templateConfig.formula) {
    const expectedFormula = textForLanguage(
      lab.templateConfig.formula,
      language,
    );
    const exactMatches = workspace.getByText(expectedFormula, { exact: true });
    const count = await exactMatches.count();
    for (let index = 0; index < count; index += 1) {
      const match = exactMatches.nth(index);
      if (!(await locatorPassesVisibility(match, "learner"))) continue;
      const text = ((await match.textContent()) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (text) samples.push(text);
    }
  }
  return unique(samples);
}

async function verifySurfaceContract(
  workspace: Locator,
  lab: FeaturedLabDefinition,
  lessonContract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  phase = "contract",
) {
  const surfaces = contractLocator(workspace, lessonContract.selectors.surface);
  const surfaceCount = await surfaces.count();
  result.contract.surfaceCount = Math.max(
    result.contract.surfaceCount,
    surfaceCount,
  );
  await guardedCheck(result, "SURFACE_PRESENT", phase, async () => {
    if (surfaceCount === 0)
      throw new Error(`${lab.labId} rendered no data-viz-surface.`);
    const root = await workspace.elementHandle();
    if (
      !root ||
      !(await surfaces.evaluateAll(
        (elements, workspaceRoot) =>
          elements.every((element) => workspaceRoot.contains(element)),
        root,
      ))
    ) {
      throw new Error(
        `${lab.labId} manifest surface selector escaped the current topic workspace.`,
      );
    }
    await expectLocatorVisibility(
      surfaces.first(),
      "learner",
      deadline,
      "surface presence",
      5_000,
    );
  });
  const marks = contractLocator(workspace, lessonContract.selectors.marks);
  const visibleMarkCount = await countEffectivelyVisible(marks, "learner");
  result.contract.visibleMarkCount = Math.max(
    result.contract.visibleMarkCount,
    visibleMarkCount,
  );
  await guardedCheck(result, "MANIFEST_MARK_PRESENT", phase, async () => {
    if (visibleMarkCount === 0)
      throw new Error(
        `${lab.labId} rendered no visible manifest-declared mark.`,
      );
    const root = await workspace.elementHandle();
    if (
      !root ||
      !(await marks.evaluateAll(
        (elements, workspaceRoot) =>
          elements.every((element) => workspaceRoot.contains(element)),
        root,
      ))
    ) {
      throw new Error(
        `${lab.labId} manifest mark selector escaped the current topic workspace.`,
      );
    }
  });

  if (lab.threeD?.enabled) {
    result.contract.renderer = "three-r3f";
    await guardedCheck(result, "THREE_D_READY", phase, async () => {
      const surface = workspace
        .locator('[data-viz-surface][data-viz-renderer="three-r3f"]')
        .first();
      await expectLocatorVisibility(
        surface,
        "learner",
        deadline,
        "3D surface",
        12_000,
      );
      await expect(surface).toHaveAttribute("data-viz-canvas-ready", "true", {
        timeout: deadlineTimeout(deadline, 15_000, "3D canvas ready"),
      });
      const canvas = surface.locator("canvas").first();
      await expectLocatorVisibility(
        canvas,
        "learner",
        deadline,
        "3D canvas",
        10_000,
      );
      let canvasPixelSample = { nonTransparentPixels: 0, variance: 0 };
      await expect
        .poll(
          async () => {
            canvasPixelSample = await sampleCanvasPixels(canvas);
            return (
              canvasPixelSample.nonTransparentPixels >= 24 &&
              canvasPixelSample.variance >= 2
            );
          },
          { timeout: deadlineTimeout(deadline, 12_000, "3D pixel variance") },
        )
        .toBe(true);
      if (
        canvasPixelSample.nonTransparentPixels < 24 ||
        canvasPixelSample.variance < 2
      ) {
        throw new Error(
          `${lab.labId} 3D canvas pixel sample is visually empty (nonTransparent=${canvasPixelSample.nonTransparentPixels}, variance=${canvasPixelSample.variance.toFixed(2)}).`,
        );
      }

      const playback = surface
        .locator("[data-viz-manim-playback-toggle]")
        .first();
      const timeline = surface
        .locator("[data-viz-manim-timeline-scrubber]")
        .first();
      const resetCamera = surface
        .locator("[data-viz-three-reset-camera]")
        .first();
      await expectLocatorVisibility(
        playback,
        "interactive",
        deadline,
        "3D learner playback",
        8_000,
      );
      await expectLocatorVisibility(
        timeline,
        "interactive",
        deadline,
        "3D learner timeline",
        8_000,
      );
      await expectLocatorVisibility(
        resetCamera,
        "interactive",
        deadline,
        "3D learner reset camera",
        8_000,
      );
      const playbackLabel = await accessibleControlText(playback);
      const timelineLabel = await accessibleControlText(timeline);
      const resetLabel = await accessibleControlText(resetCamera);
      const localizedPatterns = threeDLearnerControlPatterns[result.language];
      if (!localizedPatterns.playback.test(playbackLabel)) {
        throw new Error(
          `${lab.labId} playback control is not localized for ${result.language}: ${JSON.stringify(playbackLabel)}.`,
        );
      }
      if (!localizedPatterns.timeline.test(timelineLabel)) {
        throw new Error(
          `${lab.labId} timeline control is not localized for ${result.language}: ${JSON.stringify(timelineLabel)}.`,
        );
      }
      if (!localizedPatterns.reset.test(resetLabel)) {
        throw new Error(
          `${lab.labId} reset-camera control is not localized for ${result.language}: ${JSON.stringify(resetLabel)}.`,
        );
      }

      const authoring = surface.locator(threeDAuthoringSelector);
      const authoringDomCount = await authoring.count();
      if (authoringDomCount === 0) {
        throw new Error(
          `${lab.labId} did not preserve any authoring selector in the DOM for QA evidence.`,
        );
      }
      const authoringVisibility = await authoring.evaluateAll(
        (elements, globalName) => {
          type Inspector = (
            target: Element,
          ) => HkVisualizationEffectiveVisibilityEvidence;
          const inspector = (
            globalThis as unknown as Record<string, Inspector | undefined>
          )[globalName];
          if (!inspector)
            throw new Error(
              `Missing HK effective-visibility inspector ${globalName}.`,
            );
          const isTabbable = (element: Element) => {
            const html = element as HTMLElement;
            const disabled =
              "disabled" in element &&
              Boolean((element as HTMLButtonElement).disabled);
            const visibility = inspector(element);
            // opacity:0 and aria-hidden do not remove an element from keyboard
            // tab order. inert/display/visibility do, so test actual tabbability.
            return (
              !disabled &&
              html.tabIndex >= 0 &&
              visibility.width > 0 &&
              visibility.height > 0 &&
              !visibility.displayNoneAncestor &&
              !visibility.visibilityHidden &&
              !visibility.inertAncestor
            );
          };
          return {
            tabbableCount: elements.filter(isTabbable).length,
            visibleCount: elements.filter(
              (element) => inspector(element).visuallyVisible,
            ).length,
          };
        },
        effectiveVisibilityGlobalName,
      );
      if (
        authoringVisibility.visibleCount !== 0 ||
        authoringVisibility.tabbableCount !== 0
      ) {
        throw new Error(
          `${lab.labId} exposes authoring/debug UI to learners (visible=${authoringVisibility.visibleCount}, tabbable=${authoringVisibility.tabbableCount}).`,
        );
      }

      result.contract.threeDLearner = {
        authoringDomCount,
        authoringTabbableCount: authoringVisibility.tabbableCount,
        authoringVisibleCount: authoringVisibility.visibleCount,
        canvasPixelSample,
        playbackVisible: true,
        resetCameraVisible: true,
        timelineVisible: true,
      };
    });
  } else {
    result.contract.renderer = "svg";
    await guardedCheck(result, "SVG_SURFACE_PRESENT", phase, async () => {
      const svgSurfaces = workspace.locator(
        "svg[data-viz-surface], [data-viz-surface] svg",
      );
      const visibleSvgSurfaceCount = await countEffectivelyVisible(
        svgSurfaces,
        "learner",
      );
      if (visibleSvgSurfaceCount === 0) {
        throw new Error(
          `${lab.labId} rendered no learner-visible SVG surface.`,
        );
      }
    });
  }
}

async function inspectControlActionability(
  workspace: Locator,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const controls = workspace.locator(controlSelector);
  const count = await controls.count();
  const workspaceRoot = await workspace.elementHandle();
  if (!workspaceRoot) {
    addFailure(
      result,
      "CONTROL_WORKSPACE_DETACHED",
      "The workspace detached before control inspection.",
      "controls",
    );
    return;
  }

  for (let index = 0; index < count; index += 1) {
    if (!hasCellTime(deadline, 750)) {
      addFailure(
        result,
        "CELL_DEADLINE",
        "Control inspection exhausted the cell deadline.",
        "controls",
      );
      break;
    }
    const control = controls.nth(index);
    const visibility = await effectiveVisibility(control).catch(() => null);
    if (!visibility) continue;
    const authoringControl = await control
      .evaluate(
        (element, selector) => Boolean(element.closest(selector)),
        threeDAuthoringSelector,
      )
      .catch(() => false);
    if (!visibility.visuallyVisible) {
      const tabState = await control
        .evaluate((element) => ({
          disabled:
            "disabled" in element &&
            Boolean((element as HTMLButtonElement).disabled),
          tabIndex: (element as HTMLElement).tabIndex,
        }))
        .catch(() => ({ disabled: true, tabIndex: -1 }));
      const invisiblyTabbable = hkVisualizationPotentiallyTabbable(
        visibility,
        tabState.tabIndex,
        tabState.disabled,
      );
      if (!authoringControl && invisiblyTabbable) {
        addFailure(
          result,
          "CONTROL_INVISIBLE_TABBABLE",
          `${await describeLocator(control, index)} is not visually visible but remains keyboard-tabbable.`,
          "controls",
        );
      }
      continue;
    }
    const descriptor = await describeLocator(control, index);
    if (!hkVisualizationVisibilityPasses(visibility, "interactive")) {
      addFailure(
        result,
        "CONTROL_NOT_LEARNER_EXPOSED",
        `${descriptor} is visually present but hidden/inert/aria-hidden/pointer-blocked for learners.`,
        "controls",
        descriptor,
        visibility,
      );
    }
    const enabled = await control.isEnabled().catch(() => false);
    const box = await control.boundingBox();
    await guardedCheck(
      result,
      "CONTROL_LOCALIZED_NAME",
      "localization",
      async () => {
        await assertLocalizedAccessibleName(
          control,
          result.language,
          "control",
          descriptor,
        );
      },
    );
    const pointer = await control
      .evaluate(
        (element, options) => {
          type Inspector = (
            target: Element,
          ) => HkVisualizationEffectiveVisibilityEvidence;
          const inspector = (
            globalThis as unknown as Record<string, Inspector | undefined>
          )[options.visibilityGlobalName];
          if (!inspector)
            throw new Error(
              `Missing HK effective-visibility inspector ${options.visibilityGlobalName}.`,
            );
          const explicitTarget = element.closest("[data-viz-pointer-target]");
          const target = explicitTarget ?? element;
          const rect = target.getBoundingClientRect();
          const rootRect = options.root.getBoundingClientRect();
          const visibleEnabledControls = Array.from(
            target.querySelectorAll(options.controlSelector),
          ).filter((candidate) => {
            const disabled =
              "disabled" in candidate &&
              Boolean((candidate as HTMLButtonElement).disabled);
            const candidateVisibility = inspector(candidate);
            return (
              !disabled &&
              candidateVisibility.visuallyVisible &&
              !candidateVisibility.hiddenAncestor &&
              !candidateVisibility.inertAncestor &&
              !candidateVisibility.ariaHiddenAncestor &&
              !candidateVisibility.pointerEventsNone
            );
          });
          const associatedLabel =
            target instanceof HTMLLabelElement &&
            (target.control === element || target.contains(element));
          return {
            metrics: {
              areaRatio:
                (rect.width * rect.height) /
                Math.max(1, rootRect.width * rootRect.height),
              associatedLabel,
              banned:
                target === options.root ||
                target.matches(
                  [
                    "[data-viz-active-lab-id]",
                    "[data-hk-viz-model]",
                    "[data-viz-configured-model]",
                    "[data-viz-surface]",
                    "[data-viz-panel-mode]",
                    "[data-viz-card]",
                    "[data-viz-card-body]",
                  ].join(","),
                ),
              controlCount:
                visibleEnabledControls.length +
                (target === element && element.matches(options.controlSelector)
                  ? 1
                  : 0),
              explicit: Boolean(explicitTarget),
              heightRatio: rect.height / Math.max(1, rootRect.height),
              self: target === element,
              widthRatio: rect.width / Math.max(1, rootRect.width),
            },
            targetBox: {
              height: rect.height,
              width: rect.width,
              x: rect.x,
              y: rect.y,
            },
          };
        },
        {
          controlSelector,
          root: workspaceRoot,
          visibilityGlobalName: effectiveVisibilityGlobalName,
        },
      )
      .catch(() => null);
    const pointerIssues = pointer
      ? hkVisualizationPointerTargetIssues(pointer.metrics)
      : ["unavailable"];
    const targetBox = pointer?.targetBox ?? null;
    if (pointerIssues.length > 0) {
      addFailure(
        result,
        "POINTER_TARGET_SCOPE",
        `${descriptor} uses an invalid data-viz-pointer-target (${pointerIssues.join(", ")}).`,
        "controls",
        descriptor,
        pointer?.metrics,
      );
    }
    const evidence: HkVisualizationControlEvidence = {
      actionable: null,
      descriptor,
      enabled,
      hitTarget: null,
      index,
      minimumTarget44: null,
      rect: box ? roundedRect(box) : null,
      targetRect: null,
    };
    result.controls.push(evidence);

    if (!box || box.width <= 1 || box.height <= 1) {
      addFailure(
        result,
        "CONTROL_BBOX",
        `${descriptor} has no usable bounding box.`,
        "controls",
        descriptor,
        evidence,
      );
      continue;
    }
    if (!enabled) continue;

    const effectiveTargetBox = pointerIssues.length === 0 ? targetBox : box;
    evidence.targetRect = effectiveTargetBox
      ? roundedRect(effectiveTargetBox)
      : null;
    evidence.minimumTarget44 = Boolean(
      effectiveTargetBox &&
      effectiveTargetBox.width >= 44 &&
      effectiveTargetBox.height >= 44,
    );
    if (!evidence.minimumTarget44) {
      addFailure(
        result,
        "CONTROL_TARGET_44",
        `${descriptor} has a ${effectiveTargetBox?.width.toFixed(1) ?? "0"}×${effectiveTargetBox?.height.toFixed(1) ?? "0"} valid pointer target; 44×44 is required.`,
        "controls",
        descriptor,
        evidence,
      );
    }

    try {
      await control.click({
        trial: true,
        timeout: deadlineTimeout(deadline, 2_000, "control actionability"),
      });
      evidence.actionable = true;
    } catch (error) {
      evidence.actionable = false;
      addFailure(
        result,
        "CONTROL_ACTIONABILITY",
        errorMessage(error),
        "controls",
        descriptor,
      );
    }

    evidence.hitTarget = await control
      .evaluate((element, allowExplicitTarget) => {
        const rect = element.getBoundingClientRect();
        const explicitTarget = allowExplicitTarget
          ? element.closest("[data-viz-pointer-target]")
          : null;
        const points = [
          [rect.left + rect.width / 2, rect.top + rect.height / 2],
          [
            rect.left + Math.min(6, rect.width / 4),
            rect.top + Math.min(6, rect.height / 4),
          ],
          [
            rect.right - Math.min(6, rect.width / 4),
            rect.bottom - Math.min(6, rect.height / 4),
          ],
        ];
        return points.some(([x, y]) => {
          if (
            x < 0 ||
            y < 0 ||
            x >= window.innerWidth ||
            y >= window.innerHeight
          )
            return false;
          const top = document.elementFromPoint(x, y);
          return (
            top === element ||
            (top !== null &&
              (element.contains(top) || Boolean(explicitTarget?.contains(top))))
          );
        });
      }, pointerIssues.length === 0)
      .catch(() => false);
    if (!evidence.hitTarget) {
      addFailure(
        result,
        "CONTROL_HIT_TARGET",
        `${descriptor} is covered at all sampled hit points.`,
        "controls",
        descriptor,
      );
    }
  }
}

async function exerciseFullInteractions(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[] =
    hkVisualizationModeTopologyByLabId.get(contract.labId) ?? [],
) {
  const canonicalFingerprint = await visualizationFingerprint(workspace);
  const exercisedControls = new Set<number>();
  const rangeStateMatrixComplete = await exerciseModeAndRangeStateMatrix(
    workspace,
    contract,
    result,
    deadline,
    exercisedControls,
    canonicalFingerprint,
    modeTopology,
  );
  if (!rangeStateMatrixComplete) {
    assertStateScanLedger(result);
    return;
  }
  for (let index = 0; index < contract.selectors.controls.length; index += 1) {
    if (!exercisedControls.has(index))
      await exerciseDeclaredControl(
        workspace,
        contract,
        index,
        result,
        deadline,
      );
  }
  if (result.contract.renderer === "three-r3f") {
    await exerciseThreeDLearnerInteractions(workspace, result, deadline);
  }
  await exerciseCoordinatePoint(workspace, result, deadline);
  const resetEntry = appendStateScanPlanEntry(result.stateScanLedger, {
    modeId: "reset",
    reasons: ["reset"],
    requestedSignature: canonicalFingerprint,
  });
  await exerciseReset(
    workspace,
    contract,
    result,
    canonicalFingerprint,
    deadline,
    resetEntry,
  );
  assertStateScanLedger(result);
}

type VisibleDeclaredRange = HkVisualizationRangeDescriptor & {
  contractIndex: number;
  selector: string;
};

type HkExecutableRangeDescriptorExpectation =
  HkVisualizationRangeStatePlanEntry["expectedDescriptors"][number];
type HkExecutableRangeProjectionEvidence =
  HkVisualizationRangeStatePlanEntry["projectionEvidence"][number];
type HkExecutableDynamicRangeDomainContract = Readonly<{
  affectedBy: Readonly<Record<string, readonly string[]>>;
  applicationOrder: readonly string[];
  canonicalize: (
    args: Readonly<{
      currentState: Readonly<Record<string, number>>;
      descriptors: readonly HkVisualizationRangeDescriptor[];
      modeId: string;
      requestedState: Readonly<Record<string, number>>;
    }>,
  ) => Readonly<{
    canonicalState: Readonly<Record<string, number>>;
    projections: readonly HkExecutableRangeProjectionEvidence[];
    valid: boolean;
  }>;
  descriptorFor: (
    state: Readonly<Record<string, number>>,
    modeId: string,
    descriptor: HkVisualizationRangeDescriptor,
  ) => HkExecutableRangeDescriptorExpectation;
  domainId: HkExecutableDynamicRangeDomainId;
  edges: readonly Readonly<{
    affectedControlIds: readonly string[];
    projection: string;
    reason: string;
    sourceControlId: string;
  }>[];
  isApplicable: (modeId: string, controlIds: ReadonlySet<string>) => boolean;
  isValid: (state: Readonly<Record<string, number>>, modeId: string) => boolean;
  labId: string;
  requiredControlIds: readonly string[];
}>;

type ActiveDynamicRangeDomain = Readonly<{
  contract: HkExecutableDynamicRangeDomainContract;
  domainId: HkExecutableDynamicRangeDomainId;
}>;

type FreshPageDynamicRangePreflight = Readonly<{
  activeDomain: ActiveDynamicRangeDomain;
  canonicalFingerprint: string;
  ledgerEntries: readonly HkVisualizationStateScanLedgerEntry[];
  modeContext: readonly HkVisualizationModeGroupState[];
  plan: HkVisualizationStateCellPlan;
  rangePlan: readonly HkVisualizationRangeStatePlanEntry[];
  ranges: readonly VisibleDeclaredRange[];
}>;

function dynamicMicrofixtureCellResult(
  labId: string,
  language: HkVisualizationLanguage,
) {
  return {
    cellId: `fresh-microfixture:${labId}:${language}:light`,
    collisions: [],
    contract: { renderer: "svg" },
    controls: [],
    failures: [],
    interactions: [],
    labId,
    language,
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    stateScanLedger: emptyStateScanLedger(),
    theme: "light",
  } as unknown as HkVisualizationCellResult;
}

function cloneStateScanLedgerEntry(
  entry: HkVisualizationStateScanLedgerEntry,
): HkVisualizationStateScanLedgerEntry {
  return {
    ...entry,
    reasons: [...entry.reasons],
  };
}

async function withFreshDynamicMicrofixturePage<T>(
  browser: Browser,
  mountWorkspace: (page: Page) => Promise<Locator>,
  deadline: CellDeadline,
  run: (args: Readonly<{
    pageInstanceId: string;
    workspace: Locator;
  }>) => Promise<T>,
) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await installHkVisualizationEffectiveVisibilityInspector(page);
    await page.goto("data:text/html,<html><body></body></html>", {
      timeout: deadlineTimeout(deadline, 10_000, "fresh-page bootstrap"),
      waitUntil: "load",
    });
    const workspace = await mountWorkspace(page);
    if (workspace.page() !== page) {
      throw new Error(
        "Fresh-page dynamic mount returned a workspace owned by another page.",
      );
    }
    const pageInstanceId = await page.evaluate((candidateId) => {
      const key = "__hkVisualizationFreshChunkPageV1";
      const scope = globalThis as unknown as Record<string, string | undefined>;
      if (scope[key])
        throw new Error("Fresh-page chunk page identity was already assigned.");
      scope[key] = candidateId;
      return candidateId;
    }, randomUUID());
    return await run({ pageInstanceId, workspace });
  } finally {
    await context.close();
  }
}

async function preflightFreshPageDynamicRangePlan(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  language: HkVisualizationLanguage,
  deadline: CellDeadline,
): Promise<FreshPageDynamicRangePreflight> {
  const result = dynamicMicrofixtureCellResult(contract.labId, language);
  const canonicalFingerprint = await visualizationFingerprint(workspace);
  const activeDomain = await resolveActiveDynamicRangeDomain(
    workspace,
    contract,
  );
  if (!activeDomain) {
    throw new Error(
      "Fresh-page dynamic chunking requires one executable range-domain contract.",
    );
  }
  const modeOrder = buildHkVisualizationModeExerciseOrder(contract.modeIds);
  if (modeOrder.length !== 1) {
    throw new Error(
      `Fresh-page dynamic chunking requires exactly one deterministic mode; observed ${JSON.stringify(modeOrder)}.`,
    );
  }
  const modeId = modeOrder[0];
  const modeIndex = contract.modeIds.indexOf(modeId);
  const modeResult = await exerciseDeclaredMode(
    workspace,
    contract,
    modeIndex,
    result,
    deadline,
    false,
    0,
  );
  if (modeResult === false) {
    throw new Error(
      `Fresh-page dynamic mode preflight failed: ${JSON.stringify(result.failures)}.`,
    );
  }
  const rangeRoot = await exactDynamicModelRoot(
    workspace,
    contract,
    activeDomain,
  );
  const ranges = await visibleDeclaredRanges(rangeRoot, contract, true);
  await assertActiveRangeDomainEdgeMetadata(
    workspace,
    contract,
    modeId,
    ranges,
    activeDomain,
  );
  const rangePlan = buildHkVisualizationRangeStatePlan(modeId, ranges, {
    domainId: activeDomain.domainId,
    labId: contract.labId,
  });
  if (rangePlan.length === 0) {
    throw new Error("Fresh-page dynamic chunk preflight produced no states.");
  }
  for (const range of ranges) {
    const slider = dynamicDescendantLocator(
      rangeRoot,
      contract.selectors.model,
      range.selector,
    );
    await assertLocalizedAccessibleName(
      slider,
      language,
      "control",
      `declared range ${range.controlId}`,
    );
    await focusLocatorWithTab(
      slider,
      deadline,
      `${range.controlId} range in ${modeId}`,
    );
  }
  const modeContext = await assertVisibleDeclaredModeGroups(
    await exactDynamicModelRoot(workspace, contract, activeDomain),
    contract,
    true,
  );
  const ledger = emptyStateScanLedger();
  const ledgerEntries = rangePlan.map((entry, entryIndex) =>
    appendStateScanPlanEntry(ledger, {
      actionSignature: entry.actionSignature,
      domainId: entry.domainId,
      expectedSignature: entry.expectedSignature,
      modeId,
      reasons: [
        ...(entryIndex === 0 ? ["default"] : []),
        ...entry.reasons,
      ],
      requestedSignature: entry.requestedSignature,
      startingSignature: entry.startingSignature,
    }),
  );
  const modeReplay = modeContext.map((group) => {
    const replayIndex = contract.modeIds.indexOf(group.activeModeId);
    if (replayIndex < 0 || !contract.selectors.modes[replayIndex]) {
      throw new Error(
        `Fresh-page plan cannot bind mode ${group.activeModeId} to its selector.`,
      );
    }
    return {
      actionId: `mode:${group.groupId}:${group.activeModeId}`,
      activeModeId: group.activeModeId,
      dependsOnGroupId: group.dependsOnGroupId,
      groupId: group.groupId,
      selector: contract.selectors.modes[replayIndex],
    };
  });
  const plan = buildHkVisualizationStateCellPlan({
    cellId: `${contract.labId}:dynamic-browser-microfixture`,
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: [],
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({
      canonicalFingerprint,
      domainId: activeDomain.domainId,
      ranges,
    }),
    resetExpectedSignature: canonicalFingerprint,
    states: rangePlan.map((state, stateIndex) => {
      const startingValues = new Map(
        state.startingValues.map(({ controlId, value }) => [controlId, value]),
      );
      return {
        actionSignature: state.actionSignature,
        descriptorHash: hashHkVisualizationDescriptor({
          expectedDescriptors: state.expectedDescriptors,
          expectedValues: state.expectedValues,
          projectionEvidence: state.projectionEvidence,
        }),
        domainId: state.domainId,
        expectedSignature: state.expectedSignature,
        id: ledgerEntries[stateIndex].id,
        modeContext: modeReplay.map((mode) => ({
          activeModeId: mode.activeModeId,
          dependsOnGroupId: mode.dependsOnGroupId,
          groupId: mode.groupId,
          replayActionId: mode.actionId,
          replaySelector: mode.selector,
        })),
        modeId,
        orderedControlIds: ranges.map(({ controlId }) => controlId),
        reasons: ledgerEntries[stateIndex].reasons,
        rehydrationActions: [
          ...modeReplay.map((mode) => ({
            actionId: mode.actionId,
            actionKind: "activate-mode" as const,
            controlId: null,
            expectedValue: mode.activeModeId,
            projectedAbsence: null,
            requestedValue: mode.activeModeId,
            selector: mode.selector,
            targetPolicy: "required-interactive" as const,
          })),
          ...ranges.map((range) => {
            const value = startingValues.get(range.controlId);
            if (value === undefined) {
              throw new Error(
                `Fresh-page state ${state.id} omitted starting value ${range.controlId}.`,
              );
            }
            return {
              actionId: `range:${range.controlId}`,
              actionKind: "set-range-value" as const,
              controlId: range.controlId,
              expectedValue: value,
              projectedAbsence: null,
              requestedValue: value,
              selector: range.selector,
              targetPolicy: "required-interactive" as const,
            };
          }),
        ],
        requestedSignature: state.requestedSignature,
        startingSignature: state.startingSignature,
      };
    }),
  });
  return {
    activeDomain,
    canonicalFingerprint,
    ledgerEntries,
    modeContext,
    plan,
    rangePlan,
    ranges,
  };
}

function assertSameFreshPageDynamicPlan(
  expected: HkVisualizationStateCellPlan,
  recomputed: HkVisualizationStateCellPlan,
  chunk: HkVisualizationStateCellPlan["chunks"][number],
) {
  if (recomputed.planHash !== expected.planHash) {
    throw new Error(
      `Fresh-page chunk ${chunk.chunkId} recomputed a different full plan identity before execution.`,
    );
  }
  if (recomputed.cellExecutionHash !== expected.cellExecutionHash) {
    throw new Error(
      `Fresh-page chunk ${chunk.chunkId} recomputed a different cell execution identity before execution.`,
    );
  }
  const recomputedChunk = recomputed.chunks.find(
    ({ start }) => start === chunk.start,
  );
  if (
    !recomputedChunk ||
    recomputedChunk.chunkId !== chunk.chunkId ||
    recomputedChunk.end !== chunk.end ||
    recomputedChunk.budget.totalMs !== chunk.budget.totalMs
  ) {
    throw new Error(
      `Fresh-page chunk ${chunk.chunkId} recomputed different boundaries or v2 budget before execution.`,
    );
  }
}

function executableDynamicRangeDomainContract(
  contract:
    | HkVisualizationDynamicRangeDomainContract
    | HkFractionBarRangeDomainContract,
) {
  return contract as unknown as HkExecutableDynamicRangeDomainContract;
}

async function exactDynamicModelRoot(
  workspace: Locator,
  lessonContract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
) {
  const modelSelector = lessonContract.selectors.model;
  if (!modelSelector)
    throw new Error(
      `Dynamic domain ${activeDomain.domainId} has no exact model selector.`,
    );
  const model = contractLocator(workspace, modelSelector);
  const count = await model.count();
  if (count !== 1) {
    throw new Error(
      `Dynamic exact model selector ${modelSelector} matched ${count} roots.`,
    );
  }
  const observedDomainId = await model.getAttribute("data-viz-range-domain-id");
  if (observedDomainId !== activeDomain.domainId) {
    throw new Error(
      `Dynamic exact model root owns ${String(observedDomainId)}, expected ${activeDomain.domainId}.`,
    );
  }
  const workspaceHandle = await workspace.elementHandle();
  const contained = workspaceHandle
    ? await model.evaluate(
        (element, root) => root === element || root.contains(element),
        workspaceHandle,
      )
    : false;
  if (!contained)
    throw new Error("Dynamic exact model root escaped its active workspace.");
  return model;
}

export function relativeHkVisualizationDynamicDescendantSelector(
  ownerSelector: string,
  descendantSelector: string,
) {
  if (
    !ownerSelector ||
    ownerSelector.trim() !== ownerSelector ||
    /[\r\n,]/u.test(ownerSelector)
  ) {
    throw new Error("Invalid dynamic descendant selector owner.");
  }
  const prefix = `${ownerSelector} `;
  if (!descendantSelector.startsWith(prefix)) {
    throw new Error(
      "Dynamic descendant selector must begin with its exact owner selector.",
    );
  }
  const relativeSelector = descendantSelector.slice(prefix.length);
  if (
    !relativeSelector ||
    relativeSelector.trim() !== relativeSelector ||
    /[\r\n,]/u.test(relativeSelector) ||
    relativeSelector.startsWith(":scope") ||
    /^[>+~]/u.test(relativeSelector)
  ) {
    throw new Error("Invalid dynamic descendant selector suffix.");
  }
  return relativeSelector;
}

function dynamicDescendantLocator(
  modelRoot: Locator,
  ownerSelector: string,
  selector: string,
) {
  // contractLocator is intentionally page-global for legacy manifest selectors.
  // Dynamic-domain evidence must instead be resolved inside the exact model
  // owner so a sibling/decoy node cannot satisfy a missing real control.
  return modelRoot.locator(
    relativeHkVisualizationDynamicDescendantSelector(ownerSelector, selector),
  );
}

async function resolveActiveDynamicRangeDomain(
  workspace: Locator,
  lessonContract: HKVisualizationLessonContract,
): Promise<ActiveDynamicRangeDomain | null> {
  const manifestDomainId = lessonContract.rangeDomainId ?? null;
  const registered = getHkDedicatedDynamicRangeDomainForLab(
    lessonContract.labId,
  );
  const modelSelector = lessonContract.selectors.model;
  const model = modelSelector
    ? contractLocator(workspace, modelSelector)
    : null;
  const modelCount = model ? await model.count() : 0;
  const modelDomainId =
    modelCount === 1
      ? await model?.getAttribute("data-viz-range-domain-id")
      : null;
  const dom = await workspace.evaluate((root) => {
    const includingRoot = (selector: string) => [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll(selector)),
    ];
    return {
      domainIds: includingRoot("[data-viz-range-domain-id]").map(
        (element) => element.getAttribute("data-viz-range-domain-id") ?? "",
      ),
      edgeMetadataCount: includingRoot(
        [
          "[data-viz-range-affects]",
          "[data-viz-range-projection]",
          "[data-viz-range-projection-reason]",
        ].join(","),
      ).length,
    };
  });

  if (manifestDomainId === null) {
    if (registered) {
      throw new Error(
        `Range-domain manifest omitted ${registered.domainId} for registered lab ${lessonContract.labId}.`,
      );
    }
    if (dom.domainIds.length !== 0 || dom.edgeMetadataCount !== 0) {
      throw new Error(
        `Independent null-domain lab ${lessonContract.labId} exposed range-domain metadata (${JSON.stringify(dom)}).`,
      );
    }
    return null;
  }
  let executableContract: HkExecutableDynamicRangeDomainContract;
  if (manifestDomainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID) {
    if (registered) {
      throw new Error(
        `${HK_FRACTION_BAR_RANGE_DOMAIN_ID} is a shared pass-through domain and must remain outside the dedicated registry; observed ${registered.domainId}.`,
      );
    }
    executableContract = executableDynamicRangeDomainContract(
      getHkFractionBarRangeDomain(manifestDomainId, lessonContract.labId),
    );
  } else {
    if (!registered) {
      throw new Error(
        `Range-domain manifest ${manifestDomainId} has no dedicated registry contract for ${lessonContract.labId}.`,
      );
    }
    if (registered.domainId !== manifestDomainId) {
      throw new Error(
        `Range-domain manifest ${manifestDomainId} does not match registry ${registered.domainId} for ${lessonContract.labId}.`,
      );
    }
    executableContract = executableDynamicRangeDomainContract(
      getHkDedicatedDynamicRangeDomain(manifestDomainId, lessonContract.labId),
    );
  }
  if (!modelSelector || modelCount !== 1) {
    throw new Error(
      `Range-domain ${manifestDomainId} requires one exact manifest model owner; selector ${JSON.stringify(modelSelector)} matched ${modelCount}.`,
    );
  }
  const workspaceHandle = await workspace.elementHandle();
  const modelScoped = workspaceHandle
    ? await model?.evaluate(
        (element, root) => root === element || root.contains(element),
        workspaceHandle,
      )
    : false;
  if (!modelScoped) {
    throw new Error(
      `Range-domain exact model owner escaped the active ${lessonContract.labId} workspace.`,
    );
  }
  if (modelDomainId !== manifestDomainId) {
    throw new Error(
      `Range-domain exact model root must own ${manifestDomainId}; observed ${String(modelDomainId)}.`,
    );
  }
  if (dom.domainIds.length !== 1 || dom.domainIds[0] !== manifestDomainId) {
    throw new Error(
      `Range-domain DOM root must be exactly [${manifestDomainId}] for ${lessonContract.labId}; observed ${JSON.stringify(dom.domainIds)}.`,
    );
  }
  return {
    contract: executableContract,
    domainId: manifestDomainId,
  };
}

async function assertActiveRangeDomainEdgeMetadata(
  workspace: Locator,
  lessonContract: HKVisualizationLessonContract,
  modeId: string,
  ranges: readonly VisibleDeclaredRange[],
  activeDomain: ActiveDynamicRangeDomain | null,
) {
  if (!activeDomain) return;
  const model = await exactDynamicModelRoot(
    workspace,
    lessonContract,
    activeDomain,
  );
  const activeControlIds = new Set(ranges.map(({ controlId }) => controlId));
  const applicable = activeDomain.contract.isApplicable(
    modeId,
    activeControlIds,
  );
  for (const range of ranges) {
    const control = dynamicDescendantLocator(
      model,
      lessonContract.selectors.model,
      range.selector,
    );
    const expected = applicable
      ? activeDomain.contract.edges.find(
          ({ sourceControlId }) => sourceControlId === range.controlId,
        )
      : undefined;
    const controlCount = await control.count();
    if (controlCount === 0) {
      if (expected)
        throw new Error(
          `Range-domain controller ${range.controlId} disappeared in active mode ${modeId}.`,
        );
      continue;
    }
    if (controlCount !== 1) {
      throw new Error(
        `Range-domain metadata check matched ${controlCount} controls for ${range.controlId}.`,
      );
    }
    const observed = await control.evaluate((element) => ({
      affects: element.getAttribute("data-viz-range-affects"),
      projection: element.getAttribute("data-viz-range-projection"),
      reason: element.getAttribute("data-viz-range-projection-reason"),
    }));
    if (!expected) {
      if (
        observed.affects !== null ||
        observed.projection !== null ||
        observed.reason !== null
      ) {
        throw new Error(
          `Range ${range.controlId} exposed undeclared active-mode projection metadata ${JSON.stringify(observed)}.`,
        );
      }
      continue;
    }
    const expectedAffects = expected.affectedControlIds.join(",");
    if (
      observed.affects !== expectedAffects ||
      observed.projection !== expected.projection ||
      observed.reason !== expected.reason ||
      !observed.reason.trim()
    ) {
      throw new Error(
        `Range ${range.controlId} metadata mismatch: expected ${JSON.stringify({
          affects: expectedAffects,
          projection: expected.projection,
          reason: expected.reason,
        })}, observed ${JSON.stringify(observed)}.`,
      );
    }
  }

  const visibleMetadata = await model.evaluate((root, globalName) => {
    type Inspector = (
      target: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const inspector = (
      globalThis as unknown as Record<string, Inspector | undefined>
    )[globalName];
    if (!inspector)
      throw new Error(
        `Missing HK effective-visibility inspector ${globalName}.`,
      );
    const selector = [
      "[data-viz-range-affects]",
      "[data-viz-range-projection]",
      "[data-viz-range-projection-reason]",
    ].join(",");
    const elements = [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll(selector)),
    ];
    return elements.flatMap((element) => {
      const visibility = inspector(element);
      if (
        !visibility.visuallyVisible ||
        visibility.hiddenAncestor ||
        visibility.ariaHiddenAncestor
      )
        return [];
      return [{ parameter: element.getAttribute("data-viz-parameter") }];
    });
  }, effectiveVisibilityGlobalName);
  const expectedSourceIds = applicable
    ? activeDomain.contract.edges
        .map(({ sourceControlId }) => sourceControlId)
        .filter((controlId) => activeControlIds.has(controlId))
    : [];
  if (
    visibleMetadata.length !== expectedSourceIds.length ||
    visibleMetadata.some(
      ({ parameter }) => !parameter || !expectedSourceIds.includes(parameter),
    )
  ) {
    throw new Error(
      `Active range-domain edge owners drifted: expected ${JSON.stringify(expectedSourceIds)}, observed ${JSON.stringify(visibleMetadata)}.`,
    );
  }
}

async function exerciseModeAndRangeStateMatrix(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  exercisedControls: Set<number>,
  canonicalFingerprint: string,
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[] =
    hkVisualizationModeTopologyByLabId.get(contract.labId) ?? [],
) {
  let activeDomain: ActiveDynamicRangeDomain | null;
  try {
    activeDomain = await resolveActiveDynamicRangeDomain(workspace, contract);
  } catch (error) {
    addFailure(
      result,
      "RANGE_STATE_PLAN",
      errorMessage(error),
      "range-domain-contract",
    );
    return false;
  }
  let modeTargets: readonly HkVisualizationModeExerciseTarget[];
  try {
    modeTargets = buildHkVisualizationModeExerciseTargets(
      contract.modeIds,
      modeTopology,
    );
  } catch (error) {
    addFailure(
      result,
      "RANGE_STATE_PLAN",
      errorMessage(error),
      "range-state-plan",
    );
    return false;
  }
  const modeScanContexts =
    modeTargets.length > 0
      ? modeTargets
      : [{ group: null, modeId: "__default__", modeIndex: null }];

  let defaultPending = true;
  let modeTransitionIndex = 0;
  const dependentTransitionSequencePlans: HkVisualizationDependentTransitionSequencePlan[] = [];
  for (const target of modeScanContexts) {
    const { modeId, modeIndex } = target;
    if (modeIndex !== null) {
      if (modeIndex < 0) {
        addFailure(
          result,
          "RANGE_STATE_PLAN",
          `Mode exercise planner returned unknown mode ${modeId}.`,
          "range-state-plan",
        );
        return false;
      }
      try {
        modeTransitionIndex += await activateDeclaredModeParentContext(
          workspace,
          contract,
          target,
          modeTopology,
          result,
          deadline,
          modeTransitionIndex,
        );
      } catch (error) {
        addFailure(
          result,
          "MANIFEST_MODE_INTERACTION",
          errorMessage(error),
          `manifest-mode-parent-${modeId}`,
          contract.selectors.modes[modeIndex],
        );
        return false;
      }
      const modeResult = await exerciseDeclaredMode(
        workspace,
        contract,
        modeIndex,
        result,
        deadline,
        false,
        modeTransitionIndex,
      );
      if (modeResult === false) return false;
      if (modeResult === "transitioned") modeTransitionIndex += 1;
    }

    let ranges: VisibleDeclaredRange[];
    let rangePlan: readonly HkVisualizationRangeStatePlanEntry[];
    let dependentPlans: readonly HkVisualizationDependentTransitionSequencePlan[] = [];
    let rangeRoot = workspace;
    try {
      rangeRoot = activeDomain
        ? await exactDynamicModelRoot(workspace, contract, activeDomain)
        : workspace;
      ranges = await visibleDeclaredRanges(
        rangeRoot,
        contract,
        activeDomain !== null,
      );
      await assertActiveRangeDomainEdgeMetadata(
        workspace,
        contract,
        modeId,
        ranges,
        activeDomain,
      );
      const baseRangePlan = buildHkVisualizationRangeStatePlan(
        modeId,
        ranges,
        activeDomain
          ? { domainId: activeDomain.domainId, labId: contract.labId }
          : undefined,
      );
      rangePlan = bindHkP6AveragesLineGraphBoundaryStates(
        contract.labId,
        modeId,
        ranges,
        baseRangePlan,
      );
      rangePlan = bindHkP6BudgetBoundaryStates(
        contract.labId,
        modeId,
        ranges,
        rangePlan,
      );
      dependentPlans = activeDomain
        ? buildHkVisualizationDependentTransitionSequencePlans({
            descriptors: projectExactHkDependentTransitionLiveRangeDescriptors({
              contractControlIds: contract.controlIds,
              contractSelectors: contract.selectors.controls,
              liveRanges: ranges,
            }),
            domainId: activeDomain.domainId,
            labId: contract.labId,
            modeId,
          })
        : [];
      dependentTransitionSequencePlans.push(...dependentPlans);
    } catch (error) {
      addFailure(
        result,
        "RANGE_STATE_PLAN",
        errorMessage(error),
        `range-state-plan:${modeId}`,
      );
      return false;
    }
    try {
      for (const range of ranges) {
        exercisedControls.add(range.contractIndex);
        const slider = activeDomain
          ? dynamicDescendantLocator(
              rangeRoot,
              contract.selectors.model,
              range.selector,
            )
          : contractLocator(rangeRoot, range.selector);
        await assertLocalizedAccessibleName(
          slider,
          result.language,
          "control",
          `declared range ${range.controlId}`,
        );
        await focusLocatorWithTab(
          slider,
          deadline,
          `${range.controlId} range in ${modeId}`,
        );
      }
    } catch (error) {
      addFailure(
        result,
        "RANGE_STATE_EXECUTION",
        errorMessage(error),
        `range-state-controls:${modeId}`,
      );
      return false;
    }

    const plannedEntries =
      rangePlan.length > 0
        ? rangePlan.map((entry, entryIndex) =>
            appendStateScanPlanEntry(result.stateScanLedger, {
              modeId,
              reasons: [
                ...(defaultPending && entryIndex === 0 ? ["default"] : []),
                ...entry.reasons,
              ],
              actionSignature: entry.actionSignature,
              domainId: entry.domainId,
              expectedSignature: entry.expectedSignature,
              requestedSignature: entry.requestedSignature,
              startingSignature: entry.startingSignature,
            }),
          )
        : [
            appendStateScanPlanEntry(result.stateScanLedger, {
              modeId,
              reasons: [
                ...(defaultPending ? ["default"] : []),
                `mode:${modeId}:base`,
              ],
              requestedSignature: "no-visible-ranges",
            }),
          ];
    defaultPending = false;

    for (
      let entryIndex = 0;
      entryIndex < plannedEntries.length;
      entryIndex += 1
    ) {
      try {
        await executeRangeStateScan(
          workspace,
          contract,
          ranges,
          rangePlan[entryIndex] ?? null,
          plannedEntries[entryIndex],
          result,
          deadline,
          canonicalFingerprint,
          await assertVisibleDeclaredModeGroups(
            activeDomain
              ? await exactDynamicModelRoot(workspace, contract, activeDomain)
              : workspace,
            contract,
            activeDomain !== null,
          ),
          activeDomain,
        );
      } catch (error) {
        addFailure(
          result,
          "RANGE_STATE_EXECUTION",
          errorMessage(error),
          plannedEntries[entryIndex].phase,
          undefined,
          plannedEntries[entryIndex],
        );
        return false;
      }
    }

    if (dependentPlans.length > 0 && activeDomain) {
      try {
        await executeHkVisualizationDependentTransitionSequences(
          workspace,
          contract,
          dependentPlans,
          activeDomain,
          result,
          deadline,
          canonicalFingerprint,
        );
      } catch (error) {
        addFailure(
          result,
          "DEPENDENT_TRANSITION_SEQUENCE",
          `Dependent-transition execution failed (${fingerprintHkVisualizationDependentTransitionDiagnostic(errorMessage(error))}).`,
          `dependent-transition-mode{${fingerprintHkVisualizationDependentTransitionDiagnostic(modeId)}}`,
          undefined,
          {
            sequenceFingerprints: dependentPlans.map(({ sequenceId }) =>
              fingerprintHkVisualizationDependentTransitionDiagnostic(sequenceId)
            ),
          },
        );
        return false;
      }
    }

    const rangeIndexes = new Set(ranges.map((range) => range.contractIndex));
    for (
      let controlIndex = 0;
      controlIndex < contract.selectors.controls.length;
      controlIndex += 1
    ) {
      if (rangeIndexes.has(controlIndex)) continue;
      const control = contractLocator(
        workspace,
        contract.selectors.controls[controlIndex],
      );
      if (
        (await control.count()) !== 1 ||
        !(await locatorPassesVisibility(control, "interactive"))
      )
        continue;
      exercisedControls.add(controlIndex);
      await exerciseDeclaredControl(
        workspace,
        contract,
        controlIndex,
        result,
        deadline,
      );
    }
  }
  const requiredSequenceIds = hkVisualizationDependentTransitionSequenceIdsForLab(
    contract.labId,
  );
  const plannedSequenceIds = dependentTransitionSequencePlans.map(
    ({ sequenceId }) => sequenceId,
  );
  const receiptIssues = auditHkVisualizationDependentTransitionSequenceReceipt({
    canonicalFingerprint,
    cellId: result.cellId,
    expectedPlans: dependentTransitionSequencePlans,
    language: result.language,
    observations: result.dependentTransitionSequenceObservations,
    theme: result.theme,
  });
  if (
    requiredSequenceIds.length !== plannedSequenceIds.length ||
    requiredSequenceIds.some((id, index) => plannedSequenceIds[index] !== id) ||
    receiptIssues.length > 0
  ) {
    addFailure(
      result,
      "DEPENDENT_TRANSITION_SEQUENCE_RECEIPT",
      "Dependent transition plans and observations must match the independent per-lab exact order with one hashed pre/clamp/expand receipt per sequence.",
      "dependent-transition-receipt",
      undefined,
      {
        plannedSequenceFingerprints: plannedSequenceIds.map((sequenceId) =>
          fingerprintHkVisualizationDependentTransitionDiagnostic(sequenceId)
        ),
        receiptIssues,
        requiredSequenceFingerprints: requiredSequenceIds.map((sequenceId) =>
          fingerprintHkVisualizationDependentTransitionDiagnostic(sequenceId)
        ),
      },
    );
  }
  return true;
}

async function waitForExactHkDependentTransitionFonts(
  workspace: Locator,
  deadline: CellDeadline,
  label: string,
) {
  const safeLabel =
    `font-settlement{${fingerprintHkVisualizationDependentTransitionDiagnostic(label)}}`;
  await expect
    .poll(
      () => workspace.page().evaluate(() => document.fonts.status),
      {
        timeout: deadlineTimeout(deadline, 4_000, safeLabel),
      },
    )
    .toBe("loaded");
  const readyTimeoutMs = deadlineTimeout(
    deadline,
    4_000,
    `${safeLabel}:ready`,
  );
  const settledFontStatus = await workspace.page().evaluate(
    async (timeoutMs) => {
      let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
      try {
        return await Promise.race([
          document.fonts.ready.then(() => document.fonts.status),
          new Promise<"timeout">((resolve) => {
            timeoutId = globalThis.setTimeout(
              () => resolve("timeout"),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      }
    },
    readyTimeoutMs,
  );
  if (settledFontStatus !== "loaded") {
    throw new Error(`${safeLabel} did not settle before its bounded deadline.`);
  }
}

async function resetAndPrepareHkDependentTransitionMode(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plan: HkVisualizationDependentTransitionSequencePlan,
  activeDomain: ActiveDynamicRangeDomain,
  canonicalFingerprint: string,
  cellId: string,
  deadline: CellDeadline,
  language: HkVisualizationLanguage,
  theme: HkVisualizationTheme,
) {
  const sequenceLabel =
    `sequence{${fingerprintHkVisualizationDependentTransitionDiagnostic(plan.sequenceId)}}`;
  let observedResetClickCount = 0;
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const reset = dynamicDescendantLocator(
    model,
    contract.selectors.model,
    contract.selectors.reset,
  );
  if (
    (await reset.count()) !== 1 ||
    !(await locatorPassesVisibility(reset, "interactive"))
  ) {
    throw new Error(
      `${sequenceLabel} initialization requires exactly one interactive Reset.`,
    );
  }
  await reset.click({
    timeout: deadlineTimeout(
      deadline,
      4_000,
      `${sequenceLabel} initialization Reset`,
    ),
  });
  observedResetClickCount += 1;
  await expect
    .poll(() => visualizationFingerprint(workspace), {
      timeout: deadlineTimeout(
        deadline,
        5_000,
        `${sequenceLabel} canonical Reset`,
      ),
    })
    .toBe(canonicalFingerprint);

  // Geometry/text baselines are only stable after the exact page font set has
  // settled within the existing cell deadline.
  await waitForExactHkDependentTransitionFonts(
    workspace,
    deadline,
    `${sequenceLabel} canonical font settlement`,
  );

  // Capture the canonical learner-visible baseline immediately after Reset,
  // before any sequence-specific mode preparation. This is the exact surface
  // that the post-sequence Reset must restore, including add-mode restoration
  // for subtract/proper-fraction sequences.
  const canonicalSnapshot = await observeHkDependentTransitionVisibleElements(
    workspace,
    contract,
    plan,
    plan.postSequenceRestoration,
    activeDomain,
  );
  const unhashedCanonicalVisibleBaseline = {
    baselineHash: "",
    canonicalFingerprint,
    cellId,
    language,
    planHash: plan.planHash,
    sequenceId: plan.sequenceId,
    surface: canonicalSnapshot.surface,
    theme,
    visibleElements: canonicalSnapshot.visibleElements,
    visibleMathProjection: canonicalSnapshot.visibleMathProjection,
  } satisfies HkVisualizationDependentTransitionCanonicalVisibleBaseline;
  const canonicalVisibleBaseline = Object.freeze({
    ...unhashedCanonicalVisibleBaseline,
    baselineHash:
      hashHkVisualizationDependentTransitionCanonicalVisibleBaseline(
        unhashedCanonicalVisibleBaseline,
      ),
  });

  for (const preparation of plan.modePreparation) {
    const modeIndex = contract.modeIds.indexOf(preparation.modeId);
    if (modeIndex < 0) {
      throw new Error(
        `${sequenceLabel} mode preparation cannot find group{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.groupId)}}=mode{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.modeId)}}.`,
      );
    }
    const button = dynamicDescendantLocator(
      await exactDynamicModelRoot(workspace, contract, activeDomain),
      contract.selectors.model,
      contract.selectors.modes[modeIndex],
    );
    if (
      (await button.count()) !== 1 ||
      !(await locatorPassesVisibility(button, "interactive"))
    ) {
      throw new Error(
        `${sequenceLabel} mode preparation group/mode fingerprint is not exactly one interactive button.`,
      );
    }
    const observedGroupId = await button.getAttribute("data-viz-mode-group");
    if (observedGroupId !== preparation.groupId) {
      throw new Error(
        `${sequenceLabel} mode preparation group drifted: expected{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.groupId)}}, observed{${fingerprintHkVisualizationDependentTransitionDiagnostic(String(observedGroupId))}}.`,
      );
    }
    if (!(await isModeActive(button))) {
      await button.click({
        timeout: deadlineTimeout(
          deadline,
          4_000,
          `${sequenceLabel} prepare mode{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.modeId)}}`,
        ),
      });
      await expect
        .poll(
          async () => isModeActive(dynamicDescendantLocator(
            await exactDynamicModelRoot(workspace, contract, activeDomain),
            contract.selectors.model,
            contract.selectors.modes[modeIndex],
          )),
          {
            timeout: deadlineTimeout(
              deadline,
              4_000,
              `${sequenceLabel} prepared mode{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.modeId)}}`,
            ),
          },
        )
        .toBe(true);
    }
  }

  const preparedGroups = await assertVisibleDeclaredModeGroups(
    await exactDynamicModelRoot(workspace, contract, activeDomain),
    contract,
    true,
  );
  for (const preparation of plan.modePreparation) {
    const observed = preparedGroups.find(
      ({ groupId }) => groupId === preparation.groupId,
    );
    if (observed?.activeModeId !== preparation.modeId) {
      throw new Error(
        `${sequenceLabel} prepared mode drifted: group{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.groupId)}}, observed{${fingerprintHkVisualizationDependentTransitionDiagnostic(String(observed?.activeModeId))}}, expected{${fingerprintHkVisualizationDependentTransitionDiagnostic(preparation.modeId)}}.`,
      );
    }
  }
  return Object.freeze({
    canonicalVisibleBaseline,
    observedResetClickCount,
  });
}

async function observeHkDependentTransitionControls(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plan: HkVisualizationDependentTransitionSequencePlan,
  activeDomain: ActiveDynamicRangeDomain,
  exactExpectedDescriptors?: HkVisualizationDependentTransitionSequencePlan["phases"][number]["expectedDescriptors"],
  modeId = plan.modeId,
): Promise<readonly HkVisualizationDependentTransitionControlObservation[]> {
  const sequenceLabel =
    `sequence{${fingerprintHkVisualizationDependentTransitionDiagnostic(plan.sequenceId)}}`;
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const rawValues: Record<string, number> = {};
  for (const descriptor of plan.descriptorEnvelope) {
    const control = dynamicDescendantLocator(
      model,
      contract.selectors.model,
      selectorForRangeControl(contract, descriptor.controlId),
    );
    const fixed = model.locator(
      `[data-viz-fixed-parameter="${descriptor.controlId}"]`,
    );
    const controlCount = await control.count();
    if (
      controlCount === 1 &&
      (await locatorPassesVisibility(control, "interactive"))
    ) {
      const value = Number(await control.inputValue());
      if (!Number.isFinite(value)) {
        throw new Error(
          `${sequenceLabel} live range control{${fingerprintHkVisualizationDependentTransitionDiagnostic(descriptor.controlId)}} is non-finite.`,
        );
      }
      rawValues[descriptor.controlId] = value;
      continue;
    }
    if (controlCount > 1) {
      throw new Error(
        `${sequenceLabel} range control{${fingerprintHkVisualizationDependentTransitionDiagnostic(descriptor.controlId)}} matched ${controlCount} nodes.`,
      );
    }
    if (
      (await fixed.count()) === 1 &&
      (await locatorPassesVisibility(fixed, "learner"))
    ) {
      rawValues[descriptor.controlId] = await strictFiniteLocatorAttribute(
        fixed,
        "data-viz-fixed-parameter-value",
        `${sequenceLabel} fixed control{${fingerprintHkVisualizationDependentTransitionDiagnostic(descriptor.controlId)}}`,
      );
      continue;
    }
    throw new Error(
      `${sequenceLabel} control{${fingerprintHkVisualizationDependentTransitionDiagnostic(descriptor.controlId)}} has neither one interactive range nor one learner-visible fixed value.`,
    );
  }
  if (!activeDomain.contract.isValid(rawValues, modeId)) {
    throw new Error(
      `${sequenceLabel} live controls violate domain{${fingerprintHkVisualizationDependentTransitionDiagnostic(plan.domainId)}}; state{${fingerprintHkVisualizationDependentTransitionDiagnostic(JSON.stringify(rawValues))}}.`,
    );
  }
  return Object.freeze(await Promise.all(plan.descriptorEnvelope.map(
    async (descriptor, index) => {
      const expected = activeDomain.contract.descriptorFor(
        rawValues,
        modeId,
        descriptor,
      );
      const exact = exactExpectedDescriptors?.[index];
      if (
        exact &&
        (exact.controlId !== descriptor.controlId ||
          JSON.stringify(exact) !== JSON.stringify(expected))
      ) {
        throw new Error(
          `${sequenceLabel} descriptor control{${fingerprintHkVisualizationDependentTransitionDiagnostic(descriptor.controlId)}} drifted: expected{${fingerprintHkVisualizationDependentTransitionDiagnostic(JSON.stringify(exact))}}, domain{${fingerprintHkVisualizationDependentTransitionDiagnostic(JSON.stringify(expected))}}.`,
        );
      }
      await assertDynamicDescriptorInDom(
        model,
        contract,
        expected,
        rawValues[descriptor.controlId],
      );
      return Object.freeze({
        controlId: descriptor.controlId,
        descriptor: expected,
        value: rawValues[descriptor.controlId],
      });
    },
  )));
}

async function waitForExactHkDependentTransitionControls(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plan: HkVisualizationDependentTransitionSequencePlan,
  activeDomain: ActiveDynamicRangeDomain,
  expectedValues: readonly HkVisualizationRangeStateValue[],
  expectedDescriptors: HkVisualizationDependentTransitionSequencePlan["phases"][number]["expectedDescriptors"],
  deadline: CellDeadline,
  label: string,
  modeId = plan.modeId,
): Promise<readonly HkVisualizationDependentTransitionControlObservation[]> {
  const safeLabel =
    `dependent-transition-wait{${fingerprintHkVisualizationDependentTransitionDiagnostic(label)}}`;
  const expectedSignature = signatureForHkVisualizationRangeValues(expectedValues);
  let latest: readonly HkVisualizationDependentTransitionControlObservation[] | null = null;
  let latestError: string | null = null;
  await expect
    .poll(async () => {
      try {
        latest = await observeHkDependentTransitionControls(
          workspace,
          contract,
          plan,
          activeDomain,
          expectedDescriptors,
          modeId,
        );
        latestError = null;
        return signatureForHkVisualizationRangeValues(latest.map(
          ({ controlId, value }) => ({ controlId, value }),
        ));
      } catch (error) {
        latest = null;
        latestError = fingerprintHkVisualizationDependentTransitionDiagnostic(
          errorMessage(error),
        );
        return `__pending__:${latestError}`;
      }
    }, {
      timeout: deadlineTimeout(deadline, 5_000, safeLabel),
    })
    .toBe(expectedSignature);
  const exactLatest = latest as
    | readonly HkVisualizationDependentTransitionControlObservation[]
    | null;
  if (!exactLatest) {
    throw new Error(
      `${safeLabel} produced no exact dependent-transition controls; latest{${latestError ?? "unavailable"}}.`,
    );
  }
  return exactLatest;
}

async function restoreHkDependentTransitionSequenceToCanonical(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plan: HkVisualizationDependentTransitionSequencePlan,
  activeDomain: ActiveDynamicRangeDomain,
  canonicalFingerprint: string,
  canonicalVisibleBaseline: HkVisualizationDependentTransitionCanonicalVisibleBaseline,
  deadline: CellDeadline,
) {
  const sequenceLabel =
    `sequence{${fingerprintHkVisualizationDependentTransitionDiagnostic(plan.sequenceId)}}`;
  const beforeFingerprint = await visualizationFingerprint(workspace);
  if (beforeFingerprint === canonicalFingerprint) {
    throw new Error(
      `${sequenceLabel} post-sequence restoration precondition was already canonical.`,
    );
  }
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const reset = dynamicDescendantLocator(
    model,
    contract.selectors.model,
    contract.selectors.reset,
  );
  if (
    (await reset.count()) !== 1 ||
    !(await locatorPassesVisibility(reset, "interactive"))
  ) {
    throw new Error(
      `${sequenceLabel} post-sequence restoration requires exactly one interactive Reset.`,
    );
  }
  let resetClickCount = 0;
  await reset.click({
    timeout: deadlineTimeout(
      deadline,
      4_000,
      `${sequenceLabel} post-sequence restoration Reset`,
    ),
  });
  resetClickCount += 1;
  await expect
    .poll(() => visualizationFingerprint(workspace), {
      timeout: deadlineTimeout(
        deadline,
        5_000,
        `${sequenceLabel} post-sequence canonical fingerprint`,
      ),
    })
    .toBe(canonicalFingerprint);
  const controls = await waitForExactHkDependentTransitionControls(
    workspace,
    contract,
    plan,
    activeDomain,
    plan.postSequenceRestoration.expectedValues,
    plan.postSequenceRestoration.expectedDescriptors,
    deadline,
    `${sequenceLabel}:post-sequence-restoration`,
    plan.postSequenceRestoration.modeId,
  );
  await waitForExactHkDependentTransitionFonts(
    workspace,
    deadline,
    `${sequenceLabel} restoration font settlement`,
  );
  const visibleSnapshot = await observeHkDependentTransitionVisibleElements(
    workspace,
    contract,
    plan,
    plan.postSequenceRestoration,
    activeDomain,
  );
  return Object.freeze({
    afterFingerprint: await visualizationFingerprint(workspace),
    beforeFingerprint,
    canonicalFingerprint,
    controls: Object.freeze([...controls]),
    rawSerializedPublicState: await readExactDynamicSerializedStateText(
      workspace,
      contract,
      activeDomain,
    ),
    resetClickCount,
    stateSignature: signatureForHkVisualizationRangeValues(
      controls.map(({ controlId, value }) => ({ controlId, value })),
    ),
    canonicalVisibleBaselineHash: canonicalVisibleBaseline.baselineHash,
    surface: visibleSnapshot.surface,
    visibleElements: visibleSnapshot.visibleElements,
    visibleMathProjection: visibleSnapshot.visibleMathProjection,
  });
}

async function observeHkDependentTransitionVisibleElements(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plan: HkVisualizationDependentTransitionSequencePlan,
  phase: Readonly<{
    visibleBindings: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleBindings"];
    visibleMathProjectionContract: HkVisualizationDependentTransitionSequencePlan["phases"][number]["visibleMathProjectionContract"];
    visibleSelector: string;
  }>,
  activeDomain: ActiveDynamicRangeDomain,
) {
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const surface = model.locator("[data-viz-surface]");
  if ((await surface.count()) !== 1) {
    throw new Error(
      "Dependent-transition evidence requires exactly one owned SVG surface.",
    );
  }
  const surfaceObservation = Object.freeze(await surface.evaluate((element) => {
    if (!(element instanceof SVGSVGElement)) {
      throw new Error("Dependent-transition owned surface must be SVG.");
    }
    const scrollport = element.parentElement;
    if (
      !scrollport ||
      (!scrollport.hasAttribute("data-viz-scroll-container") &&
        !scrollport.hasAttribute("data-viz-pan-container"))
    ) {
      throw new Error(
        "Dependent-transition SVG must belong to its exact learner scrollport.",
      );
    }
    const rect = element.getBoundingClientRect();
    const viewBox = element.viewBox.baseVal;
    return {
      renderedSize: { height: rect.height, width: rect.width },
      scrollport: {
        clientHeight: scrollport.clientHeight,
        clientWidth: scrollport.clientWidth,
        maxScrollLeft: Math.max(
          0,
          scrollport.scrollWidth - scrollport.clientWidth,
        ),
        scrollHeight: scrollport.scrollHeight,
        scrollWidth: scrollport.scrollWidth,
      },
      tagName: "svg" as const,
      viewBox: {
        height: viewBox.height,
        width: viewBox.width,
        x: viewBox.x,
        y: viewBox.y,
      },
    };
  }));
  const allowedAttributeNames = Object.freeze([
    ...new Set([
      "data-viz-name",
      ...phase.visibleBindings
        .map(({ attribute }) => attribute)
        .filter((attribute) => !attribute.startsWith("__")),
    ]),
  ].sort((left, right) => left < right ? -1 : left > right ? 1 : 0));
  if (
    allowedAttributeNames.length >
    HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributes
  ) {
    throw new Error(
      "Dependent-transition producer attribute whitelist exceeded the cap.",
    );
  }
  const visibleElements = Object.freeze(await model.locator(phase.visibleSelector).evaluateAll(
    async (elements, context) => {
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[context.globalName];
      if (!inspector) {
        throw new Error("Missing HK effective-visibility inspector.");
      }
      if (elements.length > context.visibleElementLimit) {
        throw new Error("Dependent-transition visible element count exceeded the cap.");
      }
      return Promise.all(elements.map(async (element) => {
        const owner = element instanceof SVGElement
          ? element.ownerSVGElement
          : null;
        if (!owner?.matches("[data-viz-surface]")) {
          throw new Error(
            "Dependent-transition selected evidence escaped its owned SVG surface.",
          );
        }
        const visibility = inspector(element);
        const rect = element.getBoundingClientRect();
        const surfaceRect = owner.getBoundingClientRect();
        const utf8Bytes = (value: string) =>
          new TextEncoder().encode(value).byteLength;
        const textParts: string[] = [];
        let textCharacters = 0;
        let textBytes = 0;
        const textWalker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
        );
        for (
          let textNode = textWalker.nextNode();
          textNode;
          textNode = textWalker.nextNode()
        ) {
          const part = textNode.nodeValue ?? "";
          textCharacters += part.length;
          if (textCharacters > context.visibleTextBytes) {
            throw new Error("Dependent-transition visible text exceeded the cap.");
          }
          textBytes += utf8Bytes(part);
          if (textBytes > context.visibleTextBytes) {
            throw new Error("Dependent-transition visible text exceeded the cap.");
          }
          textParts.push(part);
        }
        const rawText = textParts.join("");
        for (const attributeName of context.allowedAttributeNames) {
          const attributeValue = element.getAttribute(attributeName);
          if (attributeValue === null) continue;
          if (
            attributeName.length > context.visibleAttributeBytes ||
            attributeValue.length > context.visibleAttributeBytes ||
            utf8Bytes(attributeName) > context.visibleAttributeBytes ||
            utf8Bytes(attributeValue) > context.visibleAttributeBytes
          ) {
            throw new Error("Dependent-transition visible attribute bytes exceeded the cap.");
          }
        }
        if (!(element instanceof SVGGraphicsElement)) {
          throw new Error(
            "Dependent-transition selected evidence must expose SVG geometry.",
          );
        }
        const box = element.getBBox();
        const elementScreenMatrix = element.getScreenCTM();
        const ownerScreenMatrix = owner.getScreenCTM();
        if (!elementScreenMatrix || !ownerScreenMatrix) {
          throw new Error(
            "Dependent-transition selected evidence has no owner-SVG transform.",
          );
        }
        const matrix = ownerScreenMatrix.inverse().multiply(elementScreenMatrix);
        const corners = [
          new DOMPoint(box.x, box.y),
          new DOMPoint(box.x + box.width, box.y),
          new DOMPoint(box.x, box.y + box.height),
          new DOMPoint(box.x + box.width, box.y + box.height),
        ].map((point) => point.matrixTransform(matrix));
        const xValues = corners.map(({ x }) => x);
        const yValues = corners.map(({ y }) => y);
        const userLeft = Math.min(...xValues);
        const userRight = Math.max(...xValues);
        const userTop = Math.min(...yValues);
        const userBottom = Math.max(...yValues);
        const normalizedText = rawText
          .normalize("NFC")
          .replace(/\s+/g, " ")
          .trim();
        const textDigest = await globalThis.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(normalizedText),
        );
        const textHash = Array.from(new Uint8Array(textDigest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        const paintedRecords: Array<Readonly<{
          geometryAttributes: readonly (readonly [string, string])[];
          learnerVisible: boolean;
          parentIndex: number;
          semanticAttributes: readonly (readonly [string, string])[];
          tagName: string;
          textHash: string;
        }>> = [];
        const paintedIndexes = new Map<Element, number>();
        const paintedWalker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_ELEMENT,
        );
        const ignoredPresentationDataVizAttributes = new Set([
          "data-viz-mark",
          "data-viz-overlap-member",
          "data-viz-overlap-ok",
          "data-viz-overlap-reason",
        ]);
        const geometryAttributeNames = new Set([
          "cx", "cy", "d", "height", "points", "r",
          "text-anchor", "transform", "width", "x", "x1", "x2", "y",
          "y1", "y2",
        ]);
        const primitiveTagNames = new Set([
          "circle", "ellipse", "line", "path", "polygon", "polyline",
          "rect", "text",
        ]);
        let paintedTextBytes = 0;
        let paintedTextNodes = 0;
        let walkedElementCount = 0;
        let paintedElement: Element | null = element;
        while (paintedElement) {
          walkedElementCount += 1;
          if (
            walkedElementCount >
            context.visiblePaintedSubtreeElementLimit * 2
          ) {
            throw new Error(
              "Dependent-transition painted subtree traversal exceeded the cap.",
            );
          }
          const tagName = paintedElement.tagName.toLowerCase();
          const semanticAttributes: Array<readonly [string, string]> = [];
          const geometryAttributes: Array<readonly [string, string]> = [];
          for (
            let attributeIndex = 0;
            attributeIndex < paintedElement.attributes.length;
            attributeIndex += 1
          ) {
            const attribute = paintedElement.attributes.item(attributeIndex);
            if (!attribute) {
              throw new Error(
                "Dependent-transition painted subtree attribute topology drifted.",
              );
            }
            const semantic = attribute.name.startsWith("data-viz-") &&
              !ignoredPresentationDataVizAttributes.has(attribute.name);
            const geometric = geometryAttributeNames.has(attribute.name);
            if (!semantic && !geometric) continue;
            if (
              attribute.name.length > context.visibleAttributeBytes ||
              attribute.value.length > context.visibleAttributeBytes ||
              utf8Bytes(attribute.name) > context.visibleAttributeBytes ||
              utf8Bytes(attribute.value) > context.visibleAttributeBytes
            ) {
              throw new Error(
                "Dependent-transition painted subtree contract attribute exceeded the cap.",
              );
            }
            (semantic ? semanticAttributes : geometryAttributes).push([
              attribute.name,
              attribute.value,
            ]);
          }
          semanticAttributes.sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          );
          geometryAttributes.sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          );
          const include = paintedElement === element ||
            primitiveTagNames.has(tagName) ||
            semanticAttributes.length > 0;
          if (!include) {
            paintedElement = paintedWalker.nextNode() as Element | null;
            continue;
          }
          if (
            paintedRecords.length >=
            context.visiblePaintedSubtreeElementLimit
          ) {
            throw new Error(
              "Dependent-transition painted subtree element count exceeded the cap.",
            );
          }
          if (
            semanticAttributes.length + geometryAttributes.length >
            context.visiblePaintedSubtreeAttributeLimit
          ) {
            throw new Error(
              "Dependent-transition painted subtree contract attribute count exceeded the cap.",
            );
          }
          const directTextParts: string[] = [];
          for (
            let childIndex = 0;
            childIndex < paintedElement.childNodes.length;
            childIndex += 1
          ) {
            const child = paintedElement.childNodes.item(childIndex);
            if (child?.nodeType !== Node.TEXT_NODE) continue;
            paintedTextNodes += 1;
            if (
              paintedTextNodes > context.visiblePaintedSubtreeTextNodeLimit
            ) {
              throw new Error(
                "Dependent-transition painted subtree text-node count exceeded the cap.",
              );
            }
            const part = child.nodeValue ?? "";
            if (part.length > context.visiblePaintedSubtreeTextBytes) {
              throw new Error(
                "Dependent-transition painted subtree text exceeded the cap.",
              );
            }
            paintedTextBytes += utf8Bytes(part);
            if (
              paintedTextBytes > context.visiblePaintedSubtreeTextBytes
            ) {
              throw new Error(
                "Dependent-transition painted subtree text exceeded the cap.",
              );
            }
            directTextParts.push(part);
          }
          const directText = directTextParts.join("")
            .normalize("NFC")
            .replace(/\s+/g, " ")
            .trim();
          const directTextDigest = await globalThis.crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(directText),
          );
          const directTextHash = Array.from(new Uint8Array(directTextDigest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          let parent = paintedElement.parentElement;
          while (parent && !paintedIndexes.has(parent)) {
            parent = parent.parentElement;
          }
          const parentIndex = paintedElement === element
            ? -1
            : parent ? paintedIndexes.get(parent) ?? -2 : -2;
          if (parentIndex < -1) {
            throw new Error(
              "Dependent-transition painted subtree parent topology drifted.",
            );
          }
          const descendantVisibility = inspector(paintedElement);
          paintedIndexes.set(paintedElement, paintedRecords.length);
          paintedRecords.push({
            geometryAttributes,
            learnerVisible:
              descendantVisibility.visuallyVisible &&
              !descendantVisibility.hiddenAncestor &&
              !descendantVisibility.inertAncestor &&
              !descendantVisibility.ariaHiddenAncestor,
            parentIndex,
            semanticAttributes,
            tagName,
            textHash: directTextHash,
          });
          paintedElement = paintedWalker.nextNode() as Element | null;
        }
        const paintedPayload = JSON.stringify(paintedRecords);
        if (
          utf8Bytes(paintedPayload) >
          context.visiblePaintedSubtreePayloadBytes
        ) {
          throw new Error(
            "Dependent-transition painted subtree canonical payload exceeded the cap.",
          );
        }
        const paintedDigest = await globalThis.crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(paintedPayload),
        );
        const paintedSubtreeHash = Array.from(new Uint8Array(paintedDigest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
        return {
          attributes: context.allowedAttributeNames.flatMap((attributeName) => {
            const attributeValue = element.getAttribute(attributeName);
            return attributeValue === null
              ? []
              : [[attributeName, attributeValue] as const];
          }),
          learnerVisible:
            visibility.visuallyVisible &&
            !visibility.hiddenAncestor &&
            !visibility.inertAncestor &&
            !visibility.ariaHiddenAncestor,
          paintedSubtree: {
            elementCount: paintedRecords.length,
            hash: paintedSubtreeHash,
          },
          renderedGeometry: {
            height: rect.height,
            width: rect.width,
            x: rect.x - surfaceRect.x,
            y: rect.y - surfaceRect.y,
          },
          tagName: element.tagName.toLowerCase(),
          textHash,
          userGeometry: {
            height: userBottom - userTop,
            width: userRight - userLeft,
            x: userLeft,
            y: userTop,
          },
        };
      }));
    },
    {
      allowedAttributeNames,
      globalName: effectiveVisibilityGlobalName,
      visibleAttributeBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
      visibleElementLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleElements,
      visiblePaintedSubtreeAttributeLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeAttributes,
      visiblePaintedSubtreeElementLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeElements,
      visiblePaintedSubtreePayloadBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreePayloadBytes,
      visiblePaintedSubtreeTextBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeTextBytes,
      visiblePaintedSubtreeTextNodeLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeTextNodes,
      visibleTextBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleTextBytes,
    },
  ));
  const rawVisibleMathProjections = await model.evaluate(
    async (modelElement, context) => {
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[context.globalName];
      if (!inspector) {
        throw new Error("Missing HK effective-visibility inspector for visible math.");
      }
      const utf8Bytes = (value: string) =>
        new TextEncoder().encode(value).byteLength;
      const boundedString = (label: string, value: string) => {
        if (
          value.length > context.visibleAttributeBytes ||
          utf8Bytes(value) > context.visibleAttributeBytes
        ) {
          throw new Error(`${label} exceeded the visible-math byte cap.`);
        }
        return value;
      };
      if (
        context.rawTransportStringBytes !== context.visibleAttributeBytes
      ) {
        throw new Error(
          "Dependent visible-math browser transport string limits drifted.",
        );
      }
      const auditRawTransportProjections = (projections: readonly unknown[]) => {
        if (
          !Array.isArray(projections) ||
          projections.length > context.rawTransportProjectionCount
        ) {
          throw new Error(
            "Dependent visible-math browser transport projection count exceeded its bound.",
          );
        }
        let aggregatePayloadBytes = 2 + Math.max(0, projections.length - 1);
        const auditProjection = (projection: unknown) => {
          let nodeCount = 0;
          let payloadBytes = 0;
          const activeObjects = new WeakSet<object>();
          const stringMetricsCache = new Map<
            string,
            readonly [byteLength: number, jsonByteLength: number]
          >();
          const accountPayloadBytes = (byteLength: number) => {
            payloadBytes += byteLength;
            if (
              payloadBytes > context.rawTransportProjectionPayloadBytes
            ) {
              throw new Error(
                "Dependent visible-math browser transport projection payload exceeded its budget.",
              );
            }
          };
          const accountString = (candidate: string) => {
            if (candidate.length > context.rawTransportStringBytes) {
              throw new Error(
                "Dependent visible-math browser transport string exceeded its bound.",
              );
            }
            const cachedMetrics = stringMetricsCache.get(candidate);
            const byteLength = cachedMetrics?.[0] ?? utf8Bytes(candidate);
            if (byteLength > context.rawTransportStringBytes) {
              throw new Error(
                "Dependent visible-math browser transport string exceeded its bound.",
              );
            }
            const jsonByteLength = cachedMetrics?.[1] ?? (() => {
              const serializedString = JSON.stringify(candidate);
              return byteLength + serializedString.length - candidate.length;
            })();
            if (!cachedMetrics && stringMetricsCache.size < 2_048) {
              stringMetricsCache.set(candidate, [byteLength, jsonByteLength]);
            }
            accountPayloadBytes(jsonByteLength);
          };
          const visit = (candidate: unknown): void => {
            nodeCount += 1;
            if (nodeCount > context.rawTransportProjectionNodes) {
              throw new Error(
                "Dependent visible-math browser transport projection node budget was exceeded.",
              );
            }
            if (candidate === null) {
              accountPayloadBytes(4);
              return;
            }
            if (typeof candidate === "string") {
              accountString(candidate);
              return;
            }
            if (typeof candidate === "number") {
              if (!Number.isFinite(candidate)) {
                throw new Error(
                  "Dependent visible-math browser transport requires finite numbers.",
                );
              }
              accountPayloadBytes(String(candidate).length);
              return;
            }
            if (typeof candidate === "boolean") {
              accountPayloadBytes(candidate ? 4 : 5);
              return;
            }
            if (typeof candidate !== "object") {
              throw new Error(
                "Dependent visible-math browser transport requires plain data.",
              );
            }
            if (activeObjects.has(candidate)) {
              throw new Error(
                "Dependent visible-math browser transport forbids cycles.",
              );
            }
            activeObjects.add(candidate);
            try {
              if (Array.isArray(candidate)) {
                if (candidate.length > context.rawTransportArrayItems) {
                  throw new Error(
                    "Dependent visible-math browser transport array exceeded its bound.",
                  );
                }
                accountPayloadBytes(2 + Math.max(0, candidate.length - 1));
                for (let index = 0; index < candidate.length; index += 1) {
                  if (!Object.prototype.hasOwnProperty.call(candidate, index)) {
                    throw new Error(
                      "Dependent visible-math browser transport requires dense arrays.",
                    );
                  }
                  visit(candidate[index]);
                }
                return;
              }
              if (Object.getPrototypeOf(candidate) !== Object.prototype) {
                throw new Error(
                  "Dependent visible-math browser transport requires plain objects.",
                );
              }
              let enumerableOwnKeyCount = 0;
              for (const key in candidate) {
                if (!Object.prototype.hasOwnProperty.call(candidate, key)) {
                  throw new Error(
                    "Dependent visible-math browser transport forbids inherited keys.",
                  );
                }
                enumerableOwnKeyCount += 1;
                if (
                  enumerableOwnKeyCount > context.rawTransportObjectKeys
                ) {
                  throw new Error(
                    "Dependent visible-math browser transport object-key budget was exceeded.",
                  );
                }
              }
              const keys = Reflect.ownKeys(candidate);
              if (
                keys.length !== enumerableOwnKeyCount ||
                keys.some((key) => typeof key !== "string")
              ) {
                throw new Error(
                  "Dependent visible-math browser transport requires exact enumerable string keys.",
                );
              }
              accountPayloadBytes(2 + Math.max(0, keys.length - 1));
              for (const key of keys as string[]) {
                const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
                if (
                  !descriptor ||
                  !("value" in descriptor) ||
                  !descriptor.enumerable
                ) {
                  throw new Error(
                    "Dependent visible-math browser transport requires enumerable data properties.",
                  );
                }
                accountString(key);
                accountPayloadBytes(1);
                visit(descriptor.value);
              }
            } finally {
              activeObjects.delete(candidate);
            }
          };
          visit(projection);
          return payloadBytes;
        };
        for (const projection of projections) {
          aggregatePayloadBytes += auditProjection(projection);
          if (
            aggregatePayloadBytes > context.rawTransportAggregatePayloadBytes
          ) {
            throw new Error(
              "Dependent visible-math browser transport aggregate payload exceeded its budget.",
            );
          }
        }
      };
      const cssNumber = (label: string, value: string) => {
        const trimmed = value.trim();
        const percent = trimmed.endsWith("%");
        const numeric = Number.parseFloat(trimmed);
        if (!Number.isFinite(numeric)) {
          throw new Error(`${label} is not finite.`);
        }
        return boundedString(
          `${label} canonical value`,
          String(percent ? numeric / 100 : numeric),
        );
      };
      const ignoredPresentationDataVizAttributes = new Set([
        "data-viz-mark",
        "data-viz-overlap-member",
        "data-viz-overlap-ok",
        "data-viz-overlap-reason",
      ]);
      const accessibilityTagNames = new Set(["desc", "title"]);
      const geometryAttributeNames = new Set([
        "cx", "cy", "d", "font-size", "font-weight", "height", "points",
        "r", "rx", "ry", "stroke-dasharray", "stroke-linecap",
        "stroke-linejoin", "text-anchor", "transform", "width", "x", "x1",
        "x2", "y", "y1", "y2",
      ]);
      const normalizedPresentationAttributeNames = new Set([
        "clip-path", "fill", "fill-opacity", "filter", "mask", "mask-image",
        "opacity", "stroke", "stroke-opacity", "stroke-width",
      ]);
      const allowedNonRenderingAttributeNames = new Set(["aria-hidden", "role"]);
      const maximumRawAttributeCount =
        context.visiblePaintedSubtreeAttributeLimit +
        ignoredPresentationDataVizAttributes.size +
        normalizedPresentationAttributeNames.size +
        allowedNonRenderingAttributeNames.size;
      const forbiddenRenderAttributeNames = new Set([
        "alignment-baseline", "baseline-shift", "class", "clip-rule",
        "dominant-baseline", "dx", "dy", "fill-rule", "font-family",
        "font-stretch", "font-style", "lengthAdjust", "letter-spacing",
        "marker-end", "marker-mid", "marker-start", "paint-order",
        "pathLength", "rotate", "stroke-dashoffset", "stroke-miterlimit",
        "style", "textLength", "vector-effect", "word-spacing",
      ]);
      const primitiveTagNames = new Set([
        "circle", "ellipse", "line", "path", "polygon", "polyline", "rect",
        "text",
      ]);
      const expectedCountBySelector = new Map<string, number>();
      for (const selection of context.selections) {
        expectedCountBySelector.set(
          selection.selector,
          Math.max(
            expectedCountBySelector.get(selection.selector) ?? 0,
            selection.occurrence + 1,
          ),
        );
      }
      const matchesBySelector = new Map<string, Element[]>();
      for (const [selector, expectedCount] of expectedCountBySelector) {
        const selectorMatches = modelElement.querySelectorAll(selector);
        if (
          selectorMatches.length > context.visiblePaintedSubtreeElementLimit ||
          selectorMatches.length !== expectedCount
        ) {
          throw new Error(
            "Dependent visible-math selector topology count drifted.",
          );
        }
        const matches = Array.from(selectorMatches);
        matchesBySelector.set(selector, matches);
      }
      const rawTransportProjections = await Promise.all(
        context.selections.map(async (selection) => {
        const selected = matchesBySelector.get(selection.selector)?.[
          selection.occurrence
        ];
        if (!selected) {
          throw new Error("Dependent visible-math independent selection is missing.");
        }
        const root = selection.captureRoot === "parent"
          ? selected.parentElement
          : selected;
        if (!(root instanceof SVGElement)) {
          throw new Error("Dependent visible-math capture root must be SVG.");
        }
        if (
          selection.captureRoot === "parent" &&
          root.tagName.toLowerCase() !== "g"
        ) {
          throw new Error("Dependent visible-math parent capture must be an exact SVG g.");
        }
        const owner = root.ownerSVGElement;
        if (!owner?.matches("[data-viz-surface]")) {
          throw new Error("Dependent visible-math capture escaped its owned SVG.");
        }
        const scrollport = owner.parentElement;
        if (
          !scrollport ||
          (!scrollport.hasAttribute("data-viz-scroll-container") &&
            !scrollport.hasAttribute("data-viz-pan-container"))
        ) {
          throw new Error("Dependent visible-math owner has no exact scrollport.");
        }
        const ownerRect = owner.getBoundingClientRect();
        const viewBox = owner.viewBox.baseVal;
        const ownerScreenMatrix = owner.getScreenCTM();
        if (!ownerScreenMatrix) {
          throw new Error("Dependent visible-math owner has no screen CTM.");
        }
        const wrapperElements: Element[] = [];
        let wrapper: Element | null = scrollport;
        while (wrapper) {
          if (wrapperElements.length >= 6) {
            throw new Error(
              "Dependent visible-math wrapper topology exceeded its exact bound.",
            );
          }
          wrapperElements.push(wrapper);
          if (wrapper === modelElement) break;
          wrapper = wrapper.parentElement;
        }
        if (wrapper !== modelElement || wrapperElements.length < 5 || wrapperElements.length > 6) {
          throw new Error("Dependent visible-math wrapper topology escaped its exact model.");
        }
        const modelKind = modelElement.getAttribute("data-hk-viz-model");
        const topicId = boundedString(
          "Dependent visible-math topic identity",
          modelElement.getAttribute("data-hk-viz-topic") ?? "",
        );
        if (
          (modelKind !== "primary-dedicated-v1" && modelKind !== "secondary-dedicated-v1") ||
          !topicId
        ) {
          throw new Error("Dependent visible-math model endpoint identity is missing.");
        }
        const surfaceEffectAudit = (candidate: Element) => {
          const style = globalThis.getComputedStyle(candidate);
          const value = (name: string, fallback: string) => {
            const source = boundedString(
              `Dependent visible-math surface effect ${name}`,
              style.getPropertyValue(name),
            );
            return source.trim() || fallback;
          };
          return {
            animationDuration: value("animation-duration", "0s"),
            animationName: value("animation-name", "none"),
            backdropFilter: value("backdrop-filter", "none"),
            clip: value("clip", "auto"),
            clipPath: value("clip-path", "none"),
            contain: value("contain", "none"),
            contentVisibility: value("content-visibility", "visible"),
            cssTransform: value("transform", "none"),
            display: value("display", "block"),
            filter: value("filter", "none"),
            isolation: value("isolation", "auto"),
            mask: value("mask", "none"),
            maskImage: value("mask-image", "none"),
            mixBlendMode: value("mix-blend-mode", "normal"),
            opacity: cssNumber(
              "Dependent visible-math surface effect opacity",
              value("opacity", "1"),
            ),
            overflowX: value("overflow-x", "visible"),
            overflowY: value("overflow-y", "visible"),
            perspective: value("perspective", "none"),
            rotate: value("rotate", "none"),
            scale: value("scale", "none"),
            transitionDuration: value("transition-duration", "0s"),
            transitionProperty: value("transition-property", "all"),
            translate: value("translate", "none"),
            visibility: value("visibility", "visible"),
            webkitBackdropFilter: value("-webkit-backdrop-filter", "none"),
            zoom: cssNumber(
              "Dependent visible-math surface effect zoom",
              value("zoom", "1"),
            ),
          };
        };
        const exactAttributes = (candidate: Element) => {
          if (candidate.attributes.length > 64) {
            throw new Error(
              "Dependent visible-math owner/ancestor attribute count exceeded its per-entry cap.",
            );
          }
          return Array.from(candidate.attributes, (attribute) => [
            boundedString(
              "Dependent visible-math owner/ancestor attribute name",
              attribute.name,
            ),
            boundedString(
              "Dependent visible-math owner/ancestor attribute value",
              attribute.value,
            ),
          ]).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
        };
        const documentAncestorElements: Element[] = [];
        let documentAncestor = modelElement.parentElement;
        while (documentAncestor) {
          if (documentAncestorElements.length >= 24) {
            throw new Error(
              "Dependent visible-math document ancestor topology exceeded its exact bound.",
            );
          }
          documentAncestorElements.push(documentAncestor);
          if (documentAncestor === globalThis.document.documentElement) break;
          documentAncestor = documentAncestor.parentElement;
        }
        if (
          documentAncestor !== globalThis.document.documentElement ||
          documentAncestorElements.length < 2 ||
          documentAncestorElements.length > 24
        ) {
          throw new Error(
            "Dependent visible-math document ancestor topology did not reach documentElement within its bound.",
          );
        }
        let documentAncestorAttributeCount = 0;
        let documentAncestorAttributeBytes = 0;
        const documentAncestors = documentAncestorElements.map((candidate, index) => {
          const attributes = exactAttributes(candidate);
          documentAncestorAttributeCount += attributes.length;
          documentAncestorAttributeBytes += attributes.reduce(
            (total, [name, attributeValue]) =>
              total + utf8Bytes(name) + utf8Bytes(attributeValue),
            0,
          );
          if (
            documentAncestorAttributeCount > 192 ||
            documentAncestorAttributeBytes > 16_384
          ) {
            throw new Error(
              "Dependent visible-math document ancestor cumulative attribute budget was exceeded.",
            );
          }
          return {
          ...surfaceEffectAudit(candidate),
          attributes,
          role: index === 0
            ? "model-parent"
            : candidate === globalThis.document.body
              ? "body"
              : candidate === globalThis.document.documentElement
                ? "document-element"
                : "ancestor",
          tagName: boundedString(
            "Dependent visible-math document ancestor tag name",
            candidate.tagName,
          ).toLowerCase(),
          };
        });
        if (owner.children.length > 64) {
          throw new Error(
            "Dependent visible-math owner child topology exceeded its materialization bound.",
          );
        }
        const ownerTitleDescElements = Array.from(owner.children).filter(
          (candidate) => accessibilityTagNames.has(candidate.tagName.toLowerCase()),
        );
        if (ownerTitleDescElements.length > 8) {
          throw new Error("Dependent visible-math owner title/desc topology exceeded its bound.");
        }
        const ownerTitleDescTopology = await Promise.all(
          ownerTitleDescElements.map(async (candidate) => {
            if (
              candidate.childNodes.length >
              context.visiblePaintedSubtreeTextNodeLimit
            ) {
              throw new Error(
                "Dependent visible-math owner title/desc child topology exceeded its bound.",
              );
            }
            const textParts: string[] = [];
            let rawTextBytes = 0;
            for (
              let childIndex = 0;
              childIndex < candidate.childNodes.length;
              childIndex += 1
            ) {
              const child = candidate.childNodes.item(childIndex);
              if (child?.nodeType !== Node.TEXT_NODE) {
                throw new Error(
                  "Dependent visible-math owner title/desc must contain only direct text.",
                );
              }
              const part = child.nodeValue ?? "";
              const remaining = context.visibleAttributeBytes - rawTextBytes;
              if (part.length > remaining) {
                throw new Error(
                  "Dependent visible-math owner title/desc text exceeded its byte cap.",
                );
              }
              const partBytes = utf8Bytes(part);
              if (partBytes > remaining) {
                throw new Error(
                  "Dependent visible-math owner title/desc text exceeded its byte cap.",
                );
              }
              rawTextBytes += partBytes;
              textParts.push(part);
            }
            const text = boundedString(
              "Dependent visible-math owner title/desc text",
              textParts.join("").normalize("NFC").replace(/\s+/g, " ").trim(),
            );
            const digest = await globalThis.crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(text),
            );
            return {
              tagName: boundedString(
                "Dependent visible-math owner title/desc tag name",
                candidate.tagName,
              ).toLowerCase(),
              textHash: Array.from(new Uint8Array(digest))
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join(""),
            };
          }),
        );
        const direct = (parent: Element, selector: string) =>
          parent.querySelector(`:scope > ${selector}`);
        const roleForWrapper = (candidate: Element, child: Element | null) => {
          if (candidate === scrollport) {
            return modelKind === "primary-dedicated-v1"
              ? "primary-scrollport" : "secondary-panport";
          }
          if (candidate === modelElement) {
            return modelKind === "primary-dedicated-v1"
              ? "primary-model" : "secondary-model";
          }
          if (modelKind === "primary-dedicated-v1") {
            if (
              direct(candidate, "[data-viz-scroll-container]") === child &&
              direct(candidate, "[data-viz-pan-hint]")
            ) return "primary-svg-frame";
            if (direct(candidate, "aside") && candidate.firstElementChild === child) {
              return "primary-model-grid";
            }
            if (candidate.children.length === 1 && candidate.firstElementChild === child) {
              return "primary-surface-column";
            }
          } else {
            if (
              direct(candidate, "[data-viz-pan-container]") === child &&
              direct(candidate, "[data-viz-pan-hint]")
            ) return "secondary-surface";
            if (direct(candidate, "aside") && candidate.firstElementChild === child) {
              return "secondary-model-grid";
            }
            if (
              direct(candidate, "[data-viz-state-summary]") &&
              candidate.firstElementChild === child
            ) return "secondary-surface-column";
            if (candidate.children.length === 1 && candidate.firstElementChild === child) {
              return "secondary-compact-frame";
            }
          }
          throw new Error("Dependent visible-math stable wrapper structural predicate is ambiguous.");
        };
        const wrapperTopology = wrapperElements.map((candidate, index) => {
          const style = globalThis.getComputedStyle(candidate);
          const value = (name: string, fallback: string) => {
            const source = boundedString(
              `Dependent visible-math wrapper ${name}`,
              style.getPropertyValue(name),
            );
            return source.trim() || fallback;
          };
          const role = roleForWrapper(candidate, index === 0 ? null : wrapperElements[index - 1]);
          return {
            animationName: value("animation-name", "none"),
            clipPath: value("clip-path", "none"),
            contentVisibility: value("content-visibility", "visible"),
            cssTransform: value("transform", "none"),
            display: value("display", "block"),
            filter: value("filter", "none"),
            isolation: value("isolation", "auto"),
            mask: value("mask-image", value("mask", "none")),
            mixBlendMode: value("mix-blend-mode", "normal"),
            opacity: cssNumber("Dependent visible-math wrapper opacity", value("opacity", "1")),
            overflowX: value("overflow-x", "visible"),
            overflowY: value("overflow-y", "visible"),
            perspective: value("perspective", "none"),
            role,
            rotate: value("rotate", "none"),
            scale: value("scale", "none"),
            tagName: boundedString(
              "Dependent visible-math wrapper tag name",
              candidate.tagName,
            ).toLowerCase(),
            topicId: candidate === modelElement ? topicId : "",
            transitionDuration: value("transition-duration", "0s"),
            translate: value("translate", "none"),
            visibility: value("visibility", "visible"),
            zoom: cssNumber("Dependent visible-math wrapper zoom", value("zoom", "1")),
          };
        });
        const wrapperRoles = wrapperTopology.map(({ role }) => role);
        const expectedRoles = modelKind === "primary-dedicated-v1"
          ? ["primary-scrollport", "primary-svg-frame", "primary-surface-column", "primary-model-grid", "primary-model"]
          : ["secondary-panport", "secondary-surface", "secondary-compact-frame", "secondary-surface-column", "secondary-model-grid", "secondary-model"];
        if (JSON.stringify(wrapperRoles) !== JSON.stringify(expectedRoles)) {
          throw new Error("Dependent visible-math stable wrapper role adjacency drifted.");
        }
        const descendantNodes = root.querySelectorAll("*");
        if (
          descendantNodes.length + 1 >
            context.visiblePaintedSubtreeElementLimit
        ) {
          throw new Error("Dependent visible-math complete subtree exceeded its node cap.");
        }
        const descendants = [root, ...Array.from(descendantNodes)];
        const nodeIndexes = new Map<Element, number>();
        let textNodeCount = 0;
        let textBytes = 0;
        const nodes = await Promise.all(descendants.map(async (
          element,
          index,
        ) => {
          if (!(element instanceof SVGElement)) {
            throw new Error("Dependent visible-math descendant must be an SVG element.");
          }
          const tagName = boundedString(
            "Dependent visible-math descendant tag name",
            element.tagName,
          ).toLowerCase();
          const accessibilityNode = accessibilityTagNames.has(tagName);
          if (!accessibilityNode && !(element instanceof SVGGraphicsElement)) {
            throw new Error("Dependent visible-math non-accessibility descendant must be SVG graphics.");
          }
          if (element.attributes.length > maximumRawAttributeCount) {
            throw new Error(
              "Dependent visible-math raw attribute topology exceeded its bound.",
            );
          }
          const semanticAttributes: Array<[string, string]> = [];
          const geometryAttributes: Array<[string, string]> = [];
          for (let attributeIndex = 0; attributeIndex < element.attributes.length; attributeIndex += 1) {
            const attribute = element.attributes.item(attributeIndex);
            if (!attribute) {
              throw new Error("Dependent visible-math attribute traversal drifted.");
            }
            const semantic = attribute.name.startsWith("data-viz-") &&
              !ignoredPresentationDataVizAttributes.has(attribute.name);
            const geometry = geometryAttributeNames.has(attribute.name);
            if (
              !semantic && !geometry &&
              (ignoredPresentationDataVizAttributes.has(attribute.name) ||
                normalizedPresentationAttributeNames.has(attribute.name) ||
                allowedNonRenderingAttributeNames.has(attribute.name))
            ) continue;
            if (!semantic && !geometry) {
              const family = forbiddenRenderAttributeNames.has(attribute.name)
                ? "known forbidden"
                : "unclassified";
              throw new Error(
                `Dependent visible-math unrecognized render-affecting attribute (${family}) is forbidden.`,
              );
            }
            if (
              semanticAttributes.length + geometryAttributes.length >=
              context.visiblePaintedSubtreeAttributeLimit
            ) {
              throw new Error("Dependent visible-math node attribute cap was exceeded.");
            }
            boundedString("Dependent visible-math attribute name", attribute.name);
            boundedString("Dependent visible-math attribute value", attribute.value);
            (semantic ? semanticAttributes : geometryAttributes).push([
              attribute.name,
              attribute.value,
            ]);
          }
          semanticAttributes.sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          );
          geometryAttributes.sort(([left], [right]) =>
            left < right ? -1 : left > right ? 1 : 0
          );
          if (
            semanticAttributes.length + geometryAttributes.length >
            context.visiblePaintedSubtreeAttributeLimit
          ) {
            throw new Error("Dependent visible-math node attribute cap was exceeded.");
          }
          const directTextParts: string[] = [];
          if (
            element.childNodes.length >
            context.visiblePaintedSubtreeElementLimit +
              context.visiblePaintedSubtreeTextNodeLimit
          ) {
            throw new Error(
              "Dependent visible-math direct child topology exceeded its bound.",
            );
          }
          for (let childIndex = 0; childIndex < element.childNodes.length; childIndex += 1) {
            const child = element.childNodes.item(childIndex);
            if (child?.nodeType !== Node.TEXT_NODE) continue;
            textNodeCount += 1;
            if (textNodeCount > context.visiblePaintedSubtreeTextNodeLimit) {
              throw new Error("Dependent visible-math text-node cap was exceeded.");
            }
            const part = child.nodeValue ?? "";
            const remaining = context.visiblePaintedSubtreeTextBytes - textBytes;
            if (part.length > remaining) {
              throw new Error("Dependent visible-math text byte cap was exceeded.");
            }
            const partBytes = utf8Bytes(part);
            if (partBytes > remaining) {
              throw new Error("Dependent visible-math text byte cap was exceeded.");
            }
            textBytes += partBytes;
            directTextParts.push(part);
          }
          const directText = directTextParts.join("")
            .normalize("NFC")
            .replace(/\s+/g, " ")
            .trim();
          const directTextDigest = await globalThis.crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(directText),
          );
          const directTextHash = Array.from(new Uint8Array(directTextDigest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          const parentIndex = index === 0
            ? -1
            : nodeIndexes.get(element.parentElement as Element) ?? -2;
          if (parentIndex < -1) {
            throw new Error("Dependent visible-math exact parent topology drifted.");
          }
          const graphicsElement = element instanceof SVGGraphicsElement
            ? element
            : element.parentElement instanceof SVGGraphicsElement
              ? element.parentElement
              : null;
          const screenMatrix = graphicsElement?.getScreenCTM();
          if (!screenMatrix) {
            throw new Error("Dependent visible-math node has no screen CTM.");
          }
          const coordinateMatrix = ownerScreenMatrix.inverse().multiply(screenMatrix);
          const visibility = accessibilityNode ? null : inspector(element);
          const computed = globalThis.getComputedStyle(element);
          const computedValue = (name: string, fallback: string) => {
            const source = boundedString(
              `Dependent visible-math computed render ${name}`,
              computed.getPropertyValue(name),
            );
            return source.trim() || fallback;
          };
          const computedGeometryNames = tagName === "circle"
            ? ["cx", "cy", "r"] as const
            : tagName === "path"
              ? ["d"] as const
              : tagName === "rect"
                ? ["height", "rx", "ry", "width", "x", "y"] as const
                : tagName === "text"
                  ? ["x", "y"] as const
                  : [] as const;
          const computedGeometry = computedGeometryNames.map((name) => {
            const computedGeometryValue = boundedString(
              `Dependent visible-math computed geometry ${name}`,
              computed.getPropertyValue(name),
            ).trim();
            if (!computedGeometryValue) {
              throw new Error(
                "Dependent visible-math required computed geometry is blank.",
              );
            }
            return [
              name,
              computedGeometryValue,
            ] as const;
          });
          const computedRender = {
            alignmentBaseline: computedValue("alignment-baseline", "auto"),
            baselineShift: computedValue("baseline-shift", "0px"),
            dominantBaseline: computedValue("dominant-baseline", "auto"),
            fontFamily: computedValue(
              "font-family",
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            ),
            fontSize: cssNumber(
              "Dependent visible-math computed font size",
              computedValue("font-size", "16px"),
            ),
            fontStretch: computedValue("font-stretch", "100%"),
            fontStyle: computedValue("font-style", "normal"),
            fontWeight: cssNumber(
              "Dependent visible-math computed font weight",
              computedValue("font-weight", "400"),
            ),
            isolation: computedValue("isolation", "auto"),
            letterSpacing: computedValue("letter-spacing", "normal"),
            markerEnd: computedValue("marker-end", "none"),
            markerMid: computedValue("marker-mid", "none"),
            markerStart: computedValue("marker-start", "none"),
            mixBlendMode: computedValue("mix-blend-mode", "normal"),
            paintOrder: computedValue("paint-order", "normal"),
            shapeRendering: computedValue("shape-rendering", "auto"),
            strokeDasharray: computedValue("stroke-dasharray", "none"),
            strokeDashoffset: computedValue("stroke-dashoffset", "0px"),
            strokeLinecap: computedValue("stroke-linecap", "butt"),
            strokeLinejoin: computedValue("stroke-linejoin", "miter"),
            strokeMiterlimit: computedValue("stroke-miterlimit", "4"),
            textAnchor: computedValue("text-anchor", "start"),
            textRendering: computedValue("text-rendering", "auto"),
            vectorEffect: computedValue("vector-effect", "none"),
            wordSpacing: computedValue("word-spacing", "0px"),
          };
          const presentationTransform = boundedString(
            "Dependent visible-math presentation transform",
            element.getAttribute("transform") ?? "",
          );
          const inlineCssTransform = boundedString(
            "Dependent visible-math inline CSS transform",
            element.style.transform,
          ).trim();
          const cssTransform = boundedString(
            "Dependent visible-math effective CSS transform",
            inlineCssTransform
              ? computed.transform || inlineCssTransform
              : presentationTransform
                ? "none"
                : computed.transform || "none",
          );
          let cumulativeOpacity = 1;
          let clipPath = "none";
          let filter = "none";
          let mask = "none";
          let paintAncestor: Element | null = element;
          while (paintAncestor) {
            const style = globalThis.getComputedStyle(paintAncestor);
            const opacity = Number.parseFloat(style.opacity || "1");
            if (!Number.isFinite(opacity)) {
              throw new Error("Dependent visible-math inherited opacity is not finite.");
            }
            cumulativeOpacity *= opacity;
            const candidateClip = boundedString(
              "Dependent visible-math inherited clip path",
              style.getPropertyValue("clip-path"),
            ).trim();
            const candidateFilter = boundedString(
              "Dependent visible-math inherited filter",
              style.getPropertyValue("filter"),
            ).trim();
            const candidateMask = boundedString(
              "Dependent visible-math inherited mask",
              style.getPropertyValue("mask-image") ||
                style.getPropertyValue("mask"),
            ).trim();
            if (clipPath === "none" && candidateClip && candidateClip !== "none") {
              clipPath = candidateClip;
            }
            if (filter === "none" && candidateFilter && candidateFilter !== "none") {
              filter = candidateFilter;
            }
            if (mask === "none" && candidateMask && candidateMask !== "none") {
              mask = candidateMask;
            }
            if (paintAncestor === globalThis.document.documentElement) break;
            paintAncestor = paintAncestor.parentElement;
          }
          const localOpacity = Number.parseFloat(computed.opacity || "1");
          if (!Number.isFinite(localOpacity)) {
            throw new Error("Dependent visible-math local opacity is not finite.");
          }
          let svgAncestorOpacityProduct = 1;
          let svgAncestor: Element | null = element.parentElement;
          while (svgAncestor && svgAncestor !== owner) {
            const opacity = Number.parseFloat(
              globalThis.getComputedStyle(svgAncestor).opacity || "1",
            );
            if (!Number.isFinite(opacity)) {
              throw new Error(
                "Dependent visible-math SVG ancestor opacity is not finite.",
              );
            }
            svgAncestorOpacityProduct *= opacity;
            svgAncestor = svgAncestor.parentElement;
          }
          if (svgAncestor !== owner) {
            throw new Error(
              "Dependent visible-math SVG opacity ancestry escaped its owner.",
            );
          }
          const wrapperOpacityProduct = wrapperTopology.reduce(
            (product, entry) => product * Number(entry.opacity),
            1,
          );
          if (!Number.isFinite(wrapperOpacityProduct)) {
            throw new Error(
              "Dependent visible-math wrapper opacity product is not finite.",
            );
          }
          const effectivePaint = primitiveTagNames.has(tagName)
            ? {
                clipPath,
                fill: boundedString(
                  "Dependent visible-math computed fill",
                  computed.fill || "none",
                ),
                fillOpacity: cssNumber(
                  "Dependent visible-math fill opacity",
                  computed.fillOpacity || "1",
                ),
                filter,
                mask,
                opacity: boundedString(
                  "Dependent visible-math cumulative opacity",
                  String(cumulativeOpacity),
                ),
                stroke: boundedString(
                  "Dependent visible-math computed stroke",
                  computed.stroke || "none",
                ),
                strokeOpacity: cssNumber(
                  "Dependent visible-math stroke opacity",
                  computed.strokeOpacity || "1",
                ),
                strokeWidth: cssNumber(
                  "Dependent visible-math stroke width",
                  computed.strokeWidth || "0",
                ),
              }
            : null;
          nodeIndexes.set(element, index);
          return {
            computedGeometry,
            computedRender,
            coordinateMatrix: [
              coordinateMatrix.a,
              coordinateMatrix.b,
              coordinateMatrix.c,
              coordinateMatrix.d,
              coordinateMatrix.e,
              coordinateMatrix.f,
            ].map((value) => boundedString(
              "Dependent visible-math coordinate matrix entry",
              String(value),
            )),
            cssTransform,
            effectivePaint,
            geometryAttributes,
            learnerVisible: accessibilityNode ? false : Boolean(
              visibility?.visuallyVisible &&
              !visibility.hiddenAncestor &&
              !visibility.inertAncestor &&
              !visibility.ariaHiddenAncestor
            ),
            opacityFactors: {
              localOpacity: boundedString(
                "Dependent visible-math local opacity factor",
                String(localOpacity),
              ),
              svgAncestorOpacityProduct: boundedString(
                "Dependent visible-math SVG ancestor opacity factor",
                String(svgAncestorOpacityProduct),
              ),
              wrapperOpacityProduct: boundedString(
                "Dependent visible-math wrapper opacity factor",
                String(wrapperOpacityProduct),
              ),
            },
            parentIndex,
            semanticAttributes,
            tagName,
            textHash: directTextHash,
            unsupportedIntermediateTransform: false,
          };
        }));
        const preserveAspectRatio = boundedString(
          "Dependent visible-math preserveAspectRatio",
          owner.getAttribute("preserveAspectRatio") ?? "",
        ).trim() || "xMidYMid meet";
        return {
          contractId: boundedString(
            "Dependent visible-math contract identity",
            selection.contractId,
          ),
          raw: {
            nodes,
            surface: {
              documentAncestors,
              layoutSize: {
                height: owner.clientHeight,
                width: owner.clientWidth,
              },
              ownerProjection: {
                attributes: exactAttributes(owner),
                computedEffects: surfaceEffectAudit(owner),
                surfaceIdentity: boundedString(
                  "Dependent visible-math surface identity",
                  modelKind === "primary-dedicated-v1"
                    ? topicId
                    : owner.getAttribute("data-hk-viz-surface") ?? "",
                ),
                titleDescTopology: ownerTitleDescTopology,
              },
              preserveAspectRatio,
              renderedSize: {
                height: ownerRect.height,
                width: ownerRect.width,
              },
              scrollportCssTransform: boundedString(
                "Dependent visible-math scrollport CSS transform",
                globalThis.getComputedStyle(scrollport).transform || "none",
              ),
              svgCssTransform: boundedString(
                "Dependent visible-math SVG CSS transform",
                globalThis.getComputedStyle(owner).transform || "none",
              ),
              viewBox: {
                height: viewBox.height,
                width: viewBox.width,
                x: viewBox.x,
                y: viewBox.y,
              },
              viewportMatrix: [
                ownerScreenMatrix.a,
                ownerScreenMatrix.b,
                ownerScreenMatrix.c,
                ownerScreenMatrix.d,
                ownerScreenMatrix.e - ownerRect.left,
                ownerScreenMatrix.f - ownerRect.top,
              ].map((value) => boundedString(
                "Dependent visible-math viewport matrix entry",
                String(value),
              )),
              wrapperTopology,
            },
          },
        };
        }),
      );
      auditRawTransportProjections(rawTransportProjections);
      return rawTransportProjections;
    },
    {
      globalName: effectiveVisibilityGlobalName,
      rawTransportArrayItems:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .arrayItems,
      rawTransportObjectKeys:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .objectKeys,
      rawTransportProjectionCount:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .projectionCount,
      rawTransportProjectionNodes:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .projectionNodes,
      rawTransportProjectionPayloadBytes:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .projectionPayloadBytes,
      rawTransportAggregatePayloadBytes:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .aggregatePayloadBytes,
      rawTransportStringBytes:
        HK_VISUALIZATION_DEPENDENT_VISIBLE_MATH_BROWSER_TRANSPORT_LIMITS
          .stringBytes,
      selections: phase.visibleMathProjectionContract.selectors,
      visibleAttributeBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS.visibleAttributeBytes,
      visiblePaintedSubtreeAttributeLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeAttributes,
      visiblePaintedSubtreeElementLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeElements,
      visiblePaintedSubtreeTextBytes:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeTextBytes,
      visiblePaintedSubtreeTextNodeLimit:
        HK_VISUALIZATION_DEPENDENT_TRANSITION_SCHEMA_LIMITS
          .visiblePaintedSubtreeTextNodes,
    },
  );
  const visibleMathProjection =
    aggregateHkVisualizationDependentVisibleMathActualProjections(
      rawVisibleMathProjections.map(({ contractId, raw }) => Object.freeze({
        contractId,
        projection:
          projectHkVisualizationDependentVisibleMathRawProjection(raw).projection,
      })),
    );
  return Object.freeze({
    surface: surfaceObservation,
    visibleElements,
    visibleMathProjection,
  });
}

async function executeHkVisualizationDependentTransitionSequences(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  plans: readonly HkVisualizationDependentTransitionSequencePlan[],
  activeDomain: ActiveDynamicRangeDomain,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  canonicalFingerprint: string,
) {
  for (const plan of plans) {
    const sequenceLabel =
      `sequence{${fingerprintHkVisualizationDependentTransitionDiagnostic(plan.sequenceId)}}`;
    if (
      plan.labId !== contract.labId ||
      plan.domainId !== activeDomain.domainId
    ) {
      throw new Error(
        `Dependent-transition plan ${sequenceLabel} escaped its lab/domain owner.`,
      );
    }
    let resetCountSincePreviousPhase = 0;
    const sequenceStart = await resetAndPrepareHkDependentTransitionMode(
      workspace,
      contract,
      plan,
      activeDomain,
      canonicalFingerprint,
      result.cellId,
      deadline,
      result.language,
      result.theme,
    );
    resetCountSincePreviousPhase = sequenceStart.observedResetClickCount;
    let controls = await observeHkDependentTransitionControls(
      workspace,
      contract,
      plan,
      activeDomain,
    );
    let predictedState: Readonly<Record<string, number>> = Object.freeze(
      Object.fromEntries(controls.map(({ controlId, value }) => [controlId, value])),
    );
    const phaseObservations: HkVisualizationDependentTransitionPhaseObservation[] = [];
    for (const phase of plan.phases) {
      for (const action of phase.actions) {
        const projected = activeDomain.contract.canonicalize({
          currentState: predictedState,
          descriptors: plan.descriptorEnvelope,
          modeId: plan.modeId,
          requestedState: { [action.controlId]: action.requestedValue },
        });
        if (
          !projected.valid ||
          !activeDomain.contract.isValid(projected.canonicalState, plan.modeId)
        ) {
          throw new Error(
            `${sequenceLabel}:phase{${fingerprintHkVisualizationDependentTransitionDiagnostic(phase.phase)}} predicted invalid control{${fingerprintHkVisualizationDependentTransitionDiagnostic(action.controlId)}} state.`,
          );
        }
        const slider = dynamicDescendantLocator(
          await exactDynamicModelRoot(workspace, contract, activeDomain),
          contract.selectors.model,
          selectorForRangeControl(contract, action.controlId),
        );
        if (
          (await slider.count()) !== 1 ||
          !(await locatorPassesVisibility(slider, "interactive"))
        ) {
          throw new Error(
            `${sequenceLabel}:phase{${fingerprintHkVisualizationDependentTransitionDiagnostic(phase.phase)}} action control{${fingerprintHkVisualizationDependentTransitionDiagnostic(action.controlId)}} is not exactly one interactive range.`,
          );
        }
        await slider.evaluate((element, value) => {
          const input = element as HTMLInputElement;
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          if (!setter) throw new Error("HTML range value setter is unavailable.");
          setter.call(input, String(value));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, action.requestedValue);
        predictedState = projected.canonicalState;
        const intermediateValues = plan.descriptorEnvelope.map(
          ({ controlId }) => ({ controlId, value: predictedState[controlId] }),
        );
        const intermediateDescriptors = plan.descriptorEnvelope.map(
          (descriptor) => activeDomain.contract.descriptorFor(
            predictedState,
            plan.modeId,
            descriptor,
          ),
        );
        controls = await waitForExactHkDependentTransitionControls(
          workspace,
          contract,
          plan,
          activeDomain,
          intermediateValues,
          intermediateDescriptors,
          deadline,
          `${sequenceLabel}:phase{${fingerprintHkVisualizationDependentTransitionDiagnostic(phase.phase)}}:control{${fingerprintHkVisualizationDependentTransitionDiagnostic(action.controlId)}}`,
        );
      }
      controls = await waitForExactHkDependentTransitionControls(
        workspace,
        contract,
        plan,
        activeDomain,
        phase.expectedValues,
        phase.expectedDescriptors,
        deadline,
        `${sequenceLabel}:phase{${fingerprintHkVisualizationDependentTransitionDiagnostic(phase.phase)}}:final`,
      );
      const visibleSnapshot = await observeHkDependentTransitionVisibleElements(
        workspace,
        contract,
        plan,
        phase,
        activeDomain,
      );
      phaseObservations.push(Object.freeze({
        controls: Object.freeze([...controls]),
        id: phase.id,
        phase: phase.phase,
        rawSerializedPublicState: await readExactDynamicSerializedStateText(
          workspace,
          contract,
          activeDomain,
        ),
        resetCountSincePreviousPhase,
        stateSignature: signatureForHkVisualizationRangeValues(
          controls.map(({ controlId, value }) => ({ controlId, value })),
        ),
        surface: visibleSnapshot.surface,
        visibleElements: visibleSnapshot.visibleElements,
        visibleMathProjection: visibleSnapshot.visibleMathProjection,
      }));
      resetCountSincePreviousPhase = 0;
    }
    const postSequenceRestoration =
      await restoreHkDependentTransitionSequenceToCanonical(
        workspace,
        contract,
        plan,
        activeDomain,
        canonicalFingerprint,
        sequenceStart.canonicalVisibleBaseline,
        deadline,
      );
    const unhashed = {
      cellId: result.cellId,
      canonicalVisibleBaseline: sequenceStart.canonicalVisibleBaseline,
      domainId: plan.domainId,
      labId: plan.labId,
      language: result.language,
      modePreparation: plan.modePreparation,
      modeId: plan.modeId,
      observationHash: "",
      phases: Object.freeze(phaseObservations),
      planHash: plan.planHash,
      postSequenceRestoration,
      schemaVersion: plan.schemaVersion,
      sequenceId: plan.sequenceId,
      theme: result.theme,
    } satisfies HkVisualizationDependentTransitionSequenceObservation;
    const observation = Object.freeze({
      ...unhashed,
      observationHash:
        hashHkVisualizationDependentTransitionSequenceObservation(unhashed),
    });
    const issues = auditHkVisualizationDependentTransitionSequenceReceipt({
      canonicalFingerprint,
      cellId: result.cellId,
      expectedPlans: [plan],
      language: result.language,
      observations: [observation],
      theme: result.theme,
    });
    if (issues.length > 0) {
      throw new Error(
        `${sequenceLabel} dependent-transition receipt failed: count=${issues.length}, aggregate{${fingerprintHkVisualizationDependentTransitionDiagnostic(JSON.stringify(issues))}}.`,
      );
    }
    result.dependentTransitionSequenceObservations.push(observation);
  }
}

async function visibleDeclaredRanges(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  dynamicModelScoped = false,
): Promise<VisibleDeclaredRange[]> {
  if (contract.selectors.controls.length > 512) {
    throw new Error("Declared range-control selector count exceeded the cap.");
  }
  for (const selector of contract.selectors.controls) {
    if (Buffer.byteLength(selector, "utf8") > 8_192) {
      throw new Error("Declared range-control selector bytes exceeded the cap.");
    }
  }
  const ranges: VisibleDeclaredRange[] = [];
  for (let index = 0; index < contract.selectors.controls.length; index += 1) {
    const selector = contract.selectors.controls[index];
    const control = dynamicModelScoped
      ? dynamicDescendantLocator(
          workspace,
          contract.selectors.model,
          selector,
        )
      : contractLocator(workspace, selector);
    const count = await control.count();
    if (count > 1)
      throw new Error(
        `Declared control selector{${fingerprintHkVisualizationDependentTransitionDiagnostic(selector)}} matched ${count} elements while planning ranges.`,
      );
    if (count !== 1 || !(await locatorPassesVisibility(control, "interactive")))
      continue;
    const kind = await control.evaluate((element) => ({
      tag: element.tagName.toLowerCase(),
      type: element instanceof HTMLInputElement ? element.type : null,
    }));
    if (kind.tag !== "input" || kind.type !== "range") continue;
    const descriptor = await control.evaluate((element) => {
      const input = element as HTMLInputElement;
      return {
        initial: input.valueAsNumber,
        maximum: Number(input.max),
        minimum: Number(input.min),
        step: Number(input.step),
      };
    });
    ranges.push({
      ...descriptor,
      contractIndex: index,
      controlId: contract.controlIds[index],
      selector,
    });
  }

  const undeclaredVisibleRanges = await workspace.evaluate(
    (root, options) => {
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[options.visibilityGlobalName];
      if (!inspector)
        throw new Error("Missing HK effective-visibility inspector.");
      const declaredElements = new Set<Element>();
      for (const selector of options.selectors) {
        if (root.matches(selector)) declaredElements.add(root);
        root
          .querySelectorAll(selector)
          .forEach((element) => declaredElements.add(element));
      }
      const candidates = root.querySelectorAll<HTMLInputElement>(
        'input[type="range"]:enabled',
      );
      if (candidates.length > 512) {
        throw new Error("Visible range candidate count exceeded the cap.");
      }
      return Array.from(candidates).flatMap((input, index) => {
        const visibility = inspector(input);
        const interactive =
          visibility.visuallyVisible &&
          !visibility.hiddenAncestor &&
          !visibility.inertAncestor &&
          !visibility.ariaHiddenAncestor &&
          !visibility.pointerEventsNone;
        if (!interactive || declaredElements.has(input)) return [];
        const label = input.getAttribute("aria-label");
        const name = input.name;
        const parameter = input.dataset.vizParameter ?? null;
        const utf8Bytes = (value: string) =>
          new TextEncoder().encode(value).byteLength;
        if ([label, name, parameter].some((value) =>
          value !== null &&
          (value.length > 8_192 || utf8Bytes(value) > 8_192)
        )) {
          throw new Error("Undeclared visible range label bytes exceeded the cap.");
        }
        return [
          {
            index,
            label,
            name,
            parameter,
          },
        ];
      });
    },
    {
      selectors: contract.selectors.controls,
      visibilityGlobalName: effectiveVisibilityGlobalName,
    },
  );
  if (undeclaredVisibleRanges.length > 0) {
    throw new Error(
      `Visible range controls escaped the lesson contract and cannot be silently skipped: ${JSON.stringify(undeclaredVisibleRanges.map((entry) => ({
        index: entry.index,
        label: entry.label === null
          ? null
          : fingerprintHkVisualizationDependentTransitionDiagnostic(entry.label),
        name: fingerprintHkVisualizationDependentTransitionDiagnostic(entry.name),
        parameter: entry.parameter === null
          ? null
          : fingerprintHkVisualizationDependentTransitionDiagnostic(entry.parameter),
      })))}.`,
    );
  }
  return ranges;
}

function appendStateScanPlanEntry(
  ledger: HkVisualizationStateScanLedger,
  entry: Pick<
    HkVisualizationStateScanLedgerEntry,
    "modeId" | "reasons" | "requestedSignature"
  > &
    Partial<
      Pick<
        HkVisualizationStateScanLedgerEntry,
        | "actionSignature"
        | "domainId"
        | "expectedSignature"
        | "startingSignature"
      >
    >,
) {
  const actionSignature = entry.actionSignature ?? entry.requestedSignature;
  const domainId = entry.domainId ?? null;
  const expectedSignature = entry.expectedSignature ?? entry.requestedSignature;
  const startingSignature = entry.startingSignature ?? entry.requestedSignature;
  const duplicate = ledger.entries.find(
    (candidate) =>
      candidate.modeId === entry.modeId &&
      candidate.startingSignature === startingSignature &&
      candidate.actionSignature === actionSignature &&
      candidate.expectedSignature === expectedSignature,
  );
  if (duplicate) {
    throw new Error(
      `State scan plan duplicated ${entry.modeId} executable transition ${startingSignature}>>${actionSignature}>>${expectedSignature} as ${duplicate.id}.`,
    );
  }
  const id = `hk-state:${String(ledger.entries.length).padStart(5, "0")}`;
  if (ledger.plannedStateIds.includes(id))
    throw new Error(`State scan plan duplicated ledger ID ${id}.`);
  const planned: HkVisualizationStateScanLedgerEntry = {
    actionSignature,
    domainId,
    expectedSignature,
    id,
    modeId: entry.modeId,
    observedSignature: null,
    phase: `range-state:${entry.modeId}:${id}`,
    reasons: [...entry.reasons],
    requestedSignature: entry.requestedSignature,
    startingObservedSignature: null,
    startingSignature,
  };
  ledger.entries.push(planned);
  ledger.plannedStateIds.push(id);
  return planned;
}

async function executeRangeStateScan(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  ranges: readonly VisibleDeclaredRange[],
  rangeState: HkVisualizationRangeStatePlanEntry | null,
  planned: HkVisualizationStateScanLedgerEntry,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  canonicalFingerprint: string,
  modeContext: readonly HkVisualizationModeGroupState[],
  activeDomain: ActiveDynamicRangeDomain | null,
) {
  if (rangeState?.domainId) {
    if (!activeDomain || activeDomain.domainId !== rangeState.domainId) {
      throw new Error(
        `Dynamic plan ${rangeState.domainId} has no matching active browser domain.`,
      );
    }
    return executeDynamicRangeStateScan(
      workspace,
      contract,
      ranges,
      rangeState,
      planned,
      result,
      deadline,
      canonicalFingerprint,
      modeContext,
      activeDomain,
    );
  }
  return executeStaticRangeStateScan(
    workspace,
    ranges,
    rangeState,
    planned,
    result,
    deadline,
  );
}

async function executeStaticRangeStateScan(
  workspace: Locator,
  ranges: readonly VisibleDeclaredRange[],
  rangeState: HkVisualizationRangeStatePlanEntry | null,
  planned: HkVisualizationStateScanLedgerEntry,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const nextPlannedId =
    result.stateScanLedger.plannedStateIds[
      result.stateScanLedger.executedStateIds.length
    ];
  if (nextPlannedId !== planned.id) {
    throw new Error(
      `State scan execution drift: expected ${nextPlannedId ?? "none"}, received ${planned.id}.`,
    );
  }
  if (result.stateScanLedger.executedStateIds.includes(planned.id)) {
    throw new Error(`State scan execution duplicated ${planned.id}.`);
  }

  const before = await interactionContractSnapshot(workspace);
  let changedRange = false;
  if (rangeState) {
    for (const requested of rangeState.values) {
      const range = ranges.find(
        (candidate) => candidate.controlId === requested.controlId,
      );
      if (!range)
        throw new Error(
          `Planned range ${requested.controlId} is no longer visible in ${planned.modeId}.`,
        );
      const slider = contractLocator(workspace, range.selector);
      if (
        (await slider.count()) !== 1 ||
        !(await locatorPassesVisibility(slider, "interactive"))
      ) {
        throw new Error(
          `Planned range ${requested.controlId} disappeared before ${planned.id}.`,
        );
      }
      const current = Number(await slider.inputValue());
      if (Object.is(current, requested.value) || current === requested.value)
        continue;
      await slider.evaluate((element, value) => {
        const input = element as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        if (!setter) throw new Error("HTML range value setter is unavailable.");
        setter.call(input, String(value));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }, requested.value);
      await expect
        .poll(async () => Number(await slider.inputValue()), {
          timeout: deadlineTimeout(
            deadline,
            4_000,
            `${requested.controlId} range-state value`,
          ),
        })
        .toBe(requested.value);
      changedRange = true;
    }
  }
  const reachedSignature = await visibleRangeSignature(workspace, ranges);
  planned.observedSignature = reachedSignature;
  if (planned.observedSignature !== planned.requestedSignature) {
    throw new Error(
      `Range state ${planned.id} requested signature ${planned.requestedSignature} but observed ${planned.observedSignature}.`,
    );
  }
  const after = await interactionContractSnapshot(workspace);
  const evidence: HkVisualizationInteractionEvidence = {
    action: `range-state:${planned.id}`,
    before: JSON.stringify(before),
    control: ranges.map((range) => range.controlId).join(",") || "mode-only",
    contractStateChanged: null,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
  };
  result.interactions.push(evidence);
  if (changedRange) {
    const changes = applyInteractionSnapshotEvidence(evidence, before, after);
    assertContractAndMeaningfulEvidenceChanged(planned.id, changes);
  }
  await auditInteractiveState(workspace, result, deadline, planned.phase);
  planned.observedSignature = await visibleRangeSignature(workspace, ranges);
  if (planned.observedSignature !== planned.requestedSignature) {
    throw new Error(
      `Range state ${planned.id} drifted during its UI audit: requested signature ${planned.requestedSignature} but observed ${planned.observedSignature}.`,
    );
  }
  result.stateScanLedger.executedStateIds.push(planned.id);
}

type DynamicControlObservation = Readonly<{
  descriptor: HkExecutableRangeDescriptorExpectation;
  value: number;
}>;

async function executeDynamicRangeStateScan(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  initialRanges: readonly VisibleDeclaredRange[],
  rangeState: HkVisualizationRangeStatePlanEntry,
  planned: HkVisualizationStateScanLedgerEntry,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  canonicalFingerprint: string,
  modeContext: readonly HkVisualizationModeGroupState[],
  activeDomain: ActiveDynamicRangeDomain,
) {
  if (
    planned.domainId !== rangeState.domainId ||
    planned.startingSignature !== rangeState.startingSignature ||
    planned.actionSignature !== rangeState.actionSignature ||
    planned.requestedSignature !== rangeState.requestedSignature ||
    planned.expectedSignature !== rangeState.expectedSignature
  ) {
    throw new Error(
      `Dynamic ledger/plan contract drift for ${planned.id}: ${JSON.stringify({
        ledger: {
          action: planned.actionSignature,
          domain: planned.domainId,
          expected: planned.expectedSignature,
          requested: planned.requestedSignature,
          starting: planned.startingSignature,
        },
        plan: {
          action: rangeState.actionSignature,
          domain: rangeState.domainId,
          expected: rangeState.expectedSignature,
          requested: rangeState.requestedSignature,
          starting: rangeState.startingSignature,
        },
      })}.`,
    );
  }
  const nextPlannedId =
    result.stateScanLedger.plannedStateIds[
      result.stateScanLedger.executedStateIds.length
    ];
  if (nextPlannedId !== planned.id) {
    throw new Error(
      `Dynamic state execution drift: expected ${nextPlannedId ?? "none"}, received ${planned.id}.`,
    );
  }
  if (result.stateScanLedger.executedStateIds.includes(planned.id)) {
    throw new Error(`Dynamic state execution duplicated ${planned.id}.`);
  }

  await resetAndRestoreDynamicModeContext(
    workspace,
    contract,
    activeDomain,
    canonicalFingerprint,
    modeContext,
    deadline,
  );
  await replayDynamicStartingState(
    workspace,
    contract,
    initialRanges,
    rangeState,
    activeDomain,
    planned.modeId,
    deadline,
  );
  const starting = await waitForExactDynamicState(
    workspace,
    contract,
    initialRanges,
    activeDomain,
    planned.modeId,
    rangeState.startingValues,
    initialRanges.map((range) =>
      activeDomain.contract.descriptorFor(
        Object.fromEntries(
          rangeState.startingValues.map(({ controlId, value }) => [
            controlId,
            value,
          ]),
        ),
        planned.modeId,
        range,
      ),
    ),
    deadline,
    `${planned.id} starting state`,
  );
  const observedStartingSignature = signatureForExpectedOrder(
    rangeState.startingValues,
    starting,
  );
  planned.startingObservedSignature = observedStartingSignature;
  if (observedStartingSignature !== rangeState.startingSignature) {
    throw new Error(
      `Dynamic state ${planned.id} replayed start ${observedStartingSignature}, expected ${rangeState.startingSignature}.`,
    );
  }
  const rebound = await resolveActiveDynamicRangeDomain(workspace, contract);
  if (!rebound || rebound.domainId !== activeDomain.domainId) {
    throw new Error(
      `Dynamic domain root detached or drifted after reset/replay for ${planned.id}.`,
    );
  }
  await assertActiveRangeDomainEdgeMetadata(
    workspace,
    contract,
    planned.modeId,
    initialRanges,
    activeDomain,
  );

  const before = await interactionContractSnapshot(workspace);
  const executedControllerIds = new Set<string>();
  const observedProjectionEvidence: HkExecutableRangeProjectionEvidence[] = [];
  let predictedState = Object.fromEntries(
    rangeState.startingValues.map(({ controlId, value }) => [controlId, value]),
  );
  let changedRange = false;
  for (const action of rangeState.actions) {
    const beforeAction = await waitForExactDynamicState(
      workspace,
      contract,
      initialRanges,
      activeDomain,
      planned.modeId,
      stateValuesForInitialOrder(initialRanges, predictedState),
      initialRanges.map((range) =>
        activeDomain.contract.descriptorFor(
          predictedState,
          planned.modeId,
          range,
        ),
      ),
      deadline,
      `${planned.id} before ${action.controlId}`,
    );
    const beforeActionSnapshot = await interactionContractSnapshot(workspace);
    const canonical = activeDomain.contract.canonicalize({
      currentState: predictedState,
      descriptors: liveDynamicRangeDescriptors(initialRanges, beforeAction),
      modeId: planned.modeId,
      requestedState: { [action.controlId]: action.requestedValue },
    });
    if (
      !canonical.valid ||
      !activeDomain.contract.isValid(canonical.canonicalState, planned.modeId)
    ) {
      throw new Error(
        `Dynamic action ${action.controlId} predicted an invalid intermediate state.`,
      );
    }
    const expectedIntermediateValues = stateValuesForInitialOrder(
      initialRanges,
      canonical.canonicalState,
    );
    const expectedIntermediateDescriptors = initialRanges.map((range) =>
      activeDomain.contract.descriptorFor(
        canonical.canonicalState,
        planned.modeId,
        range,
      ),
    );
    const selector = selectorForRangeControl(contract, action.controlId);
    const slider = dynamicDescendantLocator(
      await exactDynamicModelRoot(workspace, contract, activeDomain),
      contract.selectors.model,
      selector,
    );
    const sliderCount = await slider.count();
    if (sliderCount === 0) {
      await assertProjectedFixedAbsence(
        workspace,
        contract,
        action,
        rangeState,
        activeDomain,
        executedControllerIds,
        beforeAction,
        observedProjectionEvidence,
      );
      predictedState = { ...canonical.canonicalState };
      const fixedAfterAction = await waitForExactDynamicState(
        workspace,
        contract,
        initialRanges,
        activeDomain,
        planned.modeId,
        expectedIntermediateValues,
        expectedIntermediateDescriptors,
        deadline,
        `${planned.id} projected fixed ${action.controlId}`,
      );
      await assertExactProjectionStepEvidence(
        action,
        beforeAction,
        fixedAfterAction,
        canonical.projections,
        activeDomain,
      );
      observedProjectionEvidence.push(...canonical.projections);
      const fixedChangedControlIds = changedDynamicControlIds(
        initialRanges,
        beforeAction,
        fixedAfterAction,
      );
      if (fixedChangedControlIds.length !== 0) {
        throw new Error(
          `Projected fixed no-op ${action.controlId} mutated ${JSON.stringify(fixedChangedControlIds)}.`,
        );
      }
      await assertNoOpSnapshotUnchanged(
        `${planned.id} projected fixed ${action.controlId}`,
        beforeActionSnapshot,
        await interactionContractSnapshot(workspace),
      );
      continue;
    }
    if (
      sliderCount !== 1 ||
      !(await locatorPassesVisibility(slider, "interactive"))
    ) {
      throw new Error(
        `Dynamic action ${action.controlId} matched ${sliderCount} controls or was not freshly interactive.`,
      );
    }
    await assertDynamicControllerMetadata(slider, action, activeDomain);
    const current = Number(await slider.inputValue());
    await slider.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!setter) throw new Error("HTML range value setter is unavailable.");
      setter.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, action.requestedValue);
    if (action.affectedControlIds.length > 0)
      executedControllerIds.add(action.controlId);

    const afterAction = await waitForExactDynamicState(
      workspace,
      contract,
      initialRanges,
      activeDomain,
      planned.modeId,
      expectedIntermediateValues,
      expectedIntermediateDescriptors,
      deadline,
      `${planned.id} after ${action.controlId}`,
    );
    await assertExactProjectionStepEvidence(
      action,
      beforeAction,
      afterAction,
      canonical.projections,
      activeDomain,
    );
    observedProjectionEvidence.push(...canonical.projections);
    predictedState = { ...canonical.canonicalState };
    const changedControlIds = changedDynamicControlIds(
      initialRanges,
      beforeAction,
      afterAction,
    );
    const allowed = new Set([action.controlId, ...action.affectedControlIds]);
    const unrelated = changedControlIds.filter(
      (controlId) => !allowed.has(controlId),
    );
    if (unrelated.length > 0) {
      throw new Error(
        `Dynamic action ${action.controlId} mutated unrelated controls ${JSON.stringify(unrelated)}; allowed ${JSON.stringify([...allowed])}.`,
      );
    }
    if (
      changedControlIds.length === 0 &&
      Object.is(current, afterAction[action.controlId]?.value)
    ) {
      await assertNoOpSnapshotUnchanged(
        `${planned.id} no-op ${action.controlId}`,
        beforeActionSnapshot,
        await interactionContractSnapshot(workspace),
      );
    } else {
      changedRange = true;
    }
  }

  assertExactProjectionEvidence(
    rangeState.projectionEvidence,
    observedProjectionEvidence,
    planned.id,
  );

  const reached = await waitForExactDynamicState(
    workspace,
    contract,
    initialRanges,
    activeDomain,
    planned.modeId,
    rangeState.expectedValues,
    rangeState.expectedDescriptors,
    deadline,
    `${planned.id} final expected state`,
  );
  const reachedSignature = signatureForExpectedOrder(
    rangeState.expectedValues,
    reached,
  );
  planned.observedSignature = reachedSignature;
  if (reachedSignature !== rangeState.expectedSignature) {
    throw new Error(
      `Dynamic state ${planned.id} requested ${rangeState.requestedSignature}, expected ${rangeState.expectedSignature}, observed ${reachedSignature}.`,
    );
  }
  await assertActiveRangeDomainEdgeMetadata(
    workspace,
    contract,
    planned.modeId,
    initialRanges,
    activeDomain,
  );
  const after = await interactionContractSnapshot(workspace);
  const evidence: HkVisualizationInteractionEvidence = {
    action: `range-state:${planned.id}`,
    before: JSON.stringify(before),
    control: rangeState.applicationOrder.join(",") || "mode-only",
    contractStateChanged: null,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
  };
  result.interactions.push(evidence);
  if (changedRange) {
    const changes = applyInteractionSnapshotEvidence(evidence, before, after);
    assertContractAndMeaningfulEvidenceChanged(planned.id, changes);
  } else {
    const changes = applyInteractionSnapshotEvidence(evidence, before, after);
    await assertNoOpSnapshotUnchanged(planned.id, before, after);
    if (
      changes.contractStateChanged ||
      changes.meaningfulEvidenceChanged ||
      evidence.stateChanged !== false
    ) {
      throw new Error(
        `${planned.id} no-op evidence was not recorded as explicit false/false/false.`,
      );
    }
  }
  await auditInteractiveState(workspace, result, deadline, planned.phase);
  const afterAudit = await waitForExactDynamicState(
    workspace,
    contract,
    initialRanges,
    activeDomain,
    planned.modeId,
    rangeState.expectedValues,
    rangeState.expectedDescriptors,
    deadline,
    `${planned.id} post-audit state`,
  );
  planned.observedSignature = signatureForExpectedOrder(
    rangeState.expectedValues,
    afterAudit,
  );
  if (planned.observedSignature !== rangeState.expectedSignature) {
    throw new Error(
      `Dynamic state ${planned.id} drifted during UI audit: expected ${rangeState.expectedSignature}, observed ${planned.observedSignature}.`,
    );
  }
  const finalRoot = await resolveActiveDynamicRangeDomain(workspace, contract);
  if (!finalRoot || finalRoot.domainId !== activeDomain.domainId) {
    throw new Error(
      `Dynamic domain root drifted during UI audit for ${planned.id}.`,
    );
  }
  await assertActiveRangeDomainEdgeMetadata(
    workspace,
    contract,
    planned.modeId,
    initialRanges,
    activeDomain,
  );
  result.stateScanLedger.executedStateIds.push(planned.id);
}

function selectorForRangeControl(
  contract: HKVisualizationLessonContract,
  controlId: string,
) {
  const index = contract.controlIds.indexOf(controlId);
  if (index < 0 || !contract.selectors.controls[index]) {
    throw new Error(
      `Dynamic range control ${controlId} is absent from the lesson manifest.`,
    );
  }
  return contract.selectors.controls[index];
}

async function resetAndRestoreDynamicModeContext(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
  canonicalFingerprint: string,
  targetContext: readonly HkVisualizationModeGroupState[],
  deadline: CellDeadline,
) {
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const reset = dynamicDescendantLocator(
    model,
    contract.selectors.model,
    contract.selectors.reset,
  );
  if (
    (await reset.count()) !== 1 ||
    !(await locatorPassesVisibility(reset, "interactive"))
  ) {
    throw new Error(
      "Dynamic transition requires exactly one freshly interactive Reset control.",
    );
  }
  await reset.click({
    timeout: deadlineTimeout(deadline, 4_000, "dynamic transition Reset"),
  });
  try {
    await expect
      .poll(() => visualizationFingerprint(workspace), {
        timeout: deadlineTimeout(
          deadline,
          5_000,
          "dynamic transition Reset replay",
        ),
      })
      .toBe(canonicalFingerprint);
  } catch (error) {
    throw new Error(
      `Dynamic Reset did not restore the canonical fingerprint before replay: ${errorMessage(error)}`,
    );
  }

  const orderedTargets: HkVisualizationModeGroupState[] = [];
  const pending = [...targetContext];
  while (pending.length > 0) {
    const nextIndex = pending.findIndex(
      ({ dependsOnGroupId }) =>
        !dependsOnGroupId ||
        orderedTargets.some(({ groupId }) => groupId === dependsOnGroupId),
    );
    if (nextIndex < 0)
      throw new Error("Dynamic mode context contains a dependency cycle.");
    orderedTargets.push(pending.splice(nextIndex, 1)[0]);
  }
  for (const target of orderedTargets) {
    const modeIndex = contract.modeIds.indexOf(target.activeModeId);
    if (modeIndex < 0)
      throw new Error(
        `Dynamic replay cannot find mode ${target.activeModeId}.`,
      );
    const button = dynamicDescendantLocator(
      await exactDynamicModelRoot(workspace, contract, activeDomain),
      contract.selectors.model,
      contract.selectors.modes[modeIndex],
    );
    if (
      (await button.count()) !== 1 ||
      !(await locatorPassesVisibility(button, "interactive"))
    ) {
      throw new Error(
        `Dynamic replay mode ${target.activeModeId} is not freshly interactive.`,
      );
    }
    if (!(await isModeActive(button))) {
      await button.click({
        timeout: deadlineTimeout(
          deadline,
          4_000,
          `dynamic mode ${target.activeModeId}`,
        ),
      });
      await expect
        .poll(
          async () =>
            isModeActive(
              dynamicDescendantLocator(
                await exactDynamicModelRoot(workspace, contract, activeDomain),
                contract.selectors.model,
                contract.selectors.modes[modeIndex],
              ),
            ),
          {
            timeout: deadlineTimeout(
              deadline,
              4_000,
              `dynamic mode ${target.activeModeId} active state`,
            ),
          },
        )
        .toBe(true);
    }
  }
  const observed = await assertVisibleDeclaredModeGroups(
    await exactDynamicModelRoot(workspace, contract, activeDomain),
    contract,
    true,
  );
  const expectedSignature = JSON.stringify(
    targetContext
      .map(({ groupId, activeModeId }) => ({ groupId, activeModeId }))
      .sort((left, right) => left.groupId.localeCompare(right.groupId)),
  );
  const observedSignature = JSON.stringify(
    observed
      .map(({ groupId, activeModeId }) => ({ groupId, activeModeId }))
      .sort((left, right) => left.groupId.localeCompare(right.groupId)),
  );
  if (observedSignature !== expectedSignature) {
    throw new Error(
      `Dynamic mode replay expected ${expectedSignature}, observed ${observedSignature}.`,
    );
  }
}

async function replayDynamicStartingState(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  initialRanges: readonly VisibleDeclaredRange[],
  rangeState: HkVisualizationRangeStatePlanEntry,
  activeDomain: ActiveDynamicRangeDomain,
  modeId: string,
  deadline: CellDeadline,
) {
  let observed = await waitForReadableDynamicState(
    workspace,
    contract,
    initialRanges,
    activeDomain,
    modeId,
    deadline,
    "dynamic starting-state replay",
  );
  if (
    signatureForExpectedOrder(rangeState.startingValues, observed) ===
    rangeState.startingSignature
  )
    return;
  const startingById = new Map(
    rangeState.startingValues.map(({ controlId, value }) => [controlId, value]),
  );
  let predictedState = Object.fromEntries(
    initialRanges.map(({ controlId }) => [
      controlId,
      observed[controlId].value,
    ]),
  );
  const order = [
    ...activeDomain.contract.applicationOrder.filter((controlId) =>
      startingById.has(controlId),
    ),
    ...rangeState.startingValues
      .map(({ controlId }) => controlId)
      .filter(
        (controlId) =>
          !activeDomain.contract.applicationOrder.includes(controlId),
      ),
  ];
  for (const controlId of order) {
    const requestedValue = startingById.get(controlId);
    if (
      requestedValue === undefined ||
      Object.is(observed[controlId]?.value, requestedValue)
    )
      continue;
    const canonical = activeDomain.contract.canonicalize({
      currentState: predictedState,
      descriptors: liveDynamicRangeDescriptors(initialRanges, observed),
      modeId,
      requestedState: { [controlId]: requestedValue },
    });
    if (
      !canonical.valid ||
      !activeDomain.contract.isValid(canonical.canonicalState, modeId)
    ) {
      throw new Error(
        `Dynamic starting-state replay produced an invalid ${controlId} projection.`,
      );
    }
    const slider = dynamicDescendantLocator(
      await exactDynamicModelRoot(workspace, contract, activeDomain),
      contract.selectors.model,
      selectorForRangeControl(contract, controlId),
    );
    if (
      (await slider.count()) !== 1 ||
      !(await locatorPassesVisibility(slider, "interactive"))
    ) {
      throw new Error(`Dynamic starting-state replay lost range ${controlId}.`);
    }
    await slider.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!setter) throw new Error("HTML range value setter is unavailable.");
      setter.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, requestedValue);
    predictedState = { ...canonical.canonicalState };
    observed = await waitForExactDynamicState(
      workspace,
      contract,
      initialRanges,
      activeDomain,
      modeId,
      stateValuesForInitialOrder(initialRanges, predictedState),
      initialRanges.map((range) =>
        activeDomain.contract.descriptorFor(predictedState, modeId, range),
      ),
      deadline,
      `starting-state replay ${controlId}`,
    );
  }
  observed = await waitForExactDynamicState(
    workspace,
    contract,
    initialRanges,
    activeDomain,
    modeId,
    rangeState.startingValues,
    initialRanges.map((range) =>
      activeDomain.contract.descriptorFor(
        Object.fromEntries(
          rangeState.startingValues.map(({ controlId, value }) => [
            controlId,
            value,
          ]),
        ),
        modeId,
        range,
      ),
    ),
    deadline,
    "starting-state replay final",
  );
  const replayed = signatureForExpectedOrder(
    rangeState.startingValues,
    observed,
  );
  if (replayed !== rangeState.startingSignature) {
    throw new Error(
      `Dynamic starting-state replay expected ${rangeState.startingSignature}, observed ${replayed}.`,
    );
  }
}

async function observeAndAssertDynamicState(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  initialRanges: readonly VisibleDeclaredRange[],
  activeDomain: ActiveDynamicRangeDomain,
  modeId: string,
  exactExpectedDescriptors?: HkVisualizationRangeStatePlanEntry["expectedDescriptors"],
): Promise<Record<string, DynamicControlObservation>> {
  if (exactExpectedDescriptors) {
    const expectedIds = exactExpectedDescriptors.map(
      ({ controlId }) => controlId,
    );
    const initialIds = initialRanges.map(({ controlId }) => controlId);
    if (
      expectedIds.length !== initialIds.length ||
      new Set(expectedIds).size !== expectedIds.length ||
      expectedIds.some((controlId) => !initialIds.includes(controlId))
    ) {
      throw new Error(
        `Dynamic exact descriptors must cover the initial controls one-to-one; initial=${JSON.stringify(initialIds)}, expected=${JSON.stringify(expectedIds)}.`,
      );
    }
  }
  const serializedState = await readExactDynamicSerializedState(
    workspace,
    contract,
    activeDomain,
  );
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const rawValues: Record<string, number> = {};
  for (const range of initialRanges) {
    const control = dynamicDescendantLocator(
      model,
      contract.selectors.model,
      selectorForRangeControl(contract, range.controlId),
    );
    const fixed = model.locator(
      `[data-viz-fixed-parameter="${range.controlId}"]`,
    );
    const controlCount = await control.count();
    if (
      controlCount === 1 &&
      (await locatorPassesVisibility(control, "interactive"))
    ) {
      const value = Number(await control.inputValue());
      if (!Number.isFinite(value))
        throw new Error(
          `Dynamic range ${range.controlId} has a non-finite live value.`,
        );
      rawValues[range.controlId] = value;
      continue;
    }
    if (controlCount > 1) {
      throw new Error(
        `Dynamic range ${range.controlId} matched ${controlCount} controls inside the exact model root.`,
      );
    }
    const fixedCount = await fixed.count();
    if (fixedCount === 1 && (await locatorPassesVisibility(fixed, "learner"))) {
      rawValues[range.controlId] = await strictFiniteLocatorAttribute(
        fixed,
        "data-viz-fixed-parameter-value",
        `Dynamic fixed ${range.controlId}`,
      );
      continue;
    }
    throw new Error(
      `Dynamic state ${range.controlId} has no interactive range and requires exactly one learner-visible fixed node; observed fixed count ${fixedCount}.`,
    );
  }
  if (!activeDomain.contract.isValid(rawValues, modeId)) {
    throw new Error(
      `Dynamic DOM state is outside ${activeDomain.domainId} in ${modeId}: ${JSON.stringify(rawValues)}.`,
    );
  }
  const observations: Record<string, DynamicControlObservation> = {};
  for (const range of initialRanges) {
    const expectation = activeDomain.contract.descriptorFor(
      rawValues,
      modeId,
      range,
    );
    const exact = exactExpectedDescriptors?.find(
      ({ controlId }) => controlId === range.controlId,
    );
    if (
      exact &&
      (exact.domainId !== activeDomain.domainId ||
        JSON.stringify(expectation) !== JSON.stringify(exact))
    ) {
      throw new Error(
        `Dynamic descriptor expectation drift for ${range.controlId}: planner ${JSON.stringify(exact)}, live-domain ${JSON.stringify(expectation)}.`,
      );
    }
    const serializedValue = serializedState[range.controlId];
    if (
      typeof serializedValue !== "number" ||
      !Number.isFinite(serializedValue) ||
      !Object.is(serializedValue, rawValues[range.controlId])
    ) {
      throw new Error(
        `Dynamic serialized state ${range.controlId}=${String(serializedValue)} does not match live ${rawValues[range.controlId]}.`,
      );
    }
    await assertDynamicDescriptorInDom(
      model,
      contract,
      expectation,
      rawValues[range.controlId],
    );
    observations[range.controlId] = Object.freeze({
      descriptor: expectation,
      value: rawValues[range.controlId],
    });
  }
  return observations;
}

async function waitForExactDynamicState(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  initialRanges: readonly VisibleDeclaredRange[],
  activeDomain: ActiveDynamicRangeDomain,
  modeId: string,
  expectedValues: readonly Readonly<{ controlId: string; value: number }>[],
  expectedDescriptors: HkVisualizationRangeStatePlanEntry["expectedDescriptors"],
  deadline: CellDeadline,
  label: string,
): Promise<Record<string, DynamicControlObservation>> {
  const expectedSignature = expectedValues
    .map(
      ({ controlId, value }) =>
        `${controlId}=${Object.is(value, -0) ? 0 : value}`,
    )
    .join("|");
  let latest: Record<string, DynamicControlObservation> | null = null;
  let latestError: string | null = null;
  try {
    await expect
      .poll(
        async () => {
          try {
            const observed = await observeAndAssertDynamicState(
              workspace,
              contract,
              initialRanges,
              activeDomain,
              modeId,
              expectedDescriptors,
            );
            latest = observed;
            latestError = null;
            return signatureForExpectedOrder(expectedValues, observed);
          } catch (error) {
            latest = null;
            latestError = errorMessage(error);
            return `__pending__:${latestError}`;
          }
        },
        {
          timeout: deadlineTimeout(
            deadline,
            5_000,
            `${label} exact dynamic state`,
          ),
        },
      )
      .toBe(expectedSignature);
  } catch (error) {
    throw new Error(
      `${label} did not reach exact ${expectedSignature}; latest=${latestError ?? "signature mismatch"}; ${errorMessage(error)}`,
    );
  }
  if (!latest)
    throw new Error(`${label} reached no readable exact dynamic state.`);
  return latest as Record<string, DynamicControlObservation>;
}

async function waitForReadableDynamicState(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  initialRanges: readonly VisibleDeclaredRange[],
  activeDomain: ActiveDynamicRangeDomain,
  modeId: string,
  deadline: CellDeadline,
  label: string,
): Promise<Record<string, DynamicControlObservation>> {
  let latest: Record<string, DynamicControlObservation> | null = null;
  let latestError: string | null = null;
  try {
    await expect
      .poll(
        async () => {
          try {
            latest = await observeAndAssertDynamicState(
              workspace,
              contract,
              initialRanges,
              activeDomain,
              modeId,
            );
            latestError = null;
            return true;
          } catch (error) {
            latest = null;
            latestError = errorMessage(error);
            return false;
          }
        },
        {
          timeout: deadlineTimeout(
            deadline,
            5_000,
            `${label} readable dynamic state`,
          ),
        },
      )
      .toBe(true);
  } catch (error) {
    throw new Error(
      `${label} produced no readable dynamic state; latest=${latestError ?? "unavailable"}; ${errorMessage(error)}`,
    );
  }
  if (!latest) throw new Error(`${label} produced no readable dynamic state.`);
  return latest as Record<string, DynamicControlObservation>;
}

function stateValuesForInitialOrder(
  initialRanges: readonly VisibleDeclaredRange[],
  state: Readonly<Record<string, number>>,
) {
  return initialRanges.map(({ controlId }) => {
    const value = state[controlId];
    if (!Number.isFinite(value))
      throw new Error(`Dynamic predicted state omitted finite ${controlId}.`);
    return Object.freeze({ controlId, value });
  });
}

async function readExactDynamicSerializedState(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
) {
  const { configuredFraction, serialized } =
    await readExactDynamicSerializedStateSource(
      workspace,
      contract,
      activeDomain,
    );
  let state: unknown;
  try {
    state = JSON.parse(serialized);
  } catch {
    throw new Error(
      "Dynamic exact model-root serialized state is malformed JSON.",
    );
  }
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error(
      "Dynamic exact model-root serialized state must be an object.",
    );
  }
  const record = state as Record<string, unknown>;
  return configuredFraction
    ? rawFractionBarStateFromConfiguredState(record)
    : record;
}

async function readExactDynamicSerializedStateText(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
) {
  return (
    await readExactDynamicSerializedStateSource(
      workspace,
      contract,
      activeDomain,
    )
  ).serialized;
}

async function readExactDynamicSerializedStateSource(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
) {
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  const configuredFraction =
    activeDomain.domainId === HK_FRACTION_BAR_RANGE_DOMAIN_ID;
  const stateSelector = configuredFraction
    ? contract.selectors.state
    : contract.selectors.model;
  if (!stateSelector) {
    throw new Error(
      `Dynamic serialized state requires an exact ${configuredFraction ? "configured state" : "model"} selector.`,
    );
  }
  const stateOwner = contractLocator(workspace, stateSelector);
  const stateOwnerCount = await stateOwner.count();
  if (stateOwnerCount !== 1) {
    throw new Error(
      `Dynamic serialized state selector ${stateSelector} matched ${stateOwnerCount} roots.`,
    );
  }
  const modelHandle = await model.elementHandle();
  const stateOwnerScoped = modelHandle
    ? await stateOwner.evaluate(
        (element, root) => root === element || root.contains(element),
        modelHandle,
      )
    : false;
  if (!stateOwnerScoped) {
    throw new Error(
      "Dynamic serialized state owner escaped the exact model root.",
    );
  }
  const serialized = await stateOwner.getAttribute(
    configuredFraction ? "data-viz-configured-state" : "data-hk-viz-state",
  );
  if (!serialized?.trim())
    throw new Error(
      "Dynamic exact model root has no readable serialized state.",
    );
  return Object.freeze({ configuredFraction, serialized });
}

function rawFractionBarStateFromConfiguredState(
  state: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const finite = (key: string) => {
    const value = state[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `Configured fraction state ${key} must be finite; observed ${JSON.stringify(value)}.`,
      );
    }
    return value;
  };
  const denominator = finite("denominator");
  const numerator = finite("numerator");
  const equivalentNumerator = finite("equivalentNumerator");
  const equivalentDenominator = finite("equivalentDenominator");
  const fractionValue = finite("value");
  if (
    !Number.isInteger(denominator) ||
    denominator < 2 ||
    denominator > 10 ||
    !Number.isInteger(numerator) ||
    numerator < 0 ||
    numerator > denominator ||
    !Object.is(equivalentNumerator, numerator * 2) ||
    !Object.is(equivalentDenominator, denominator * 2) ||
    !Object.is(fractionValue, numerator / denominator)
  ) {
    throw new Error(
      `Configured fraction state is mathematically incoherent: ${JSON.stringify({ denominator, equivalentDenominator, equivalentNumerator, fractionValue, numerator })}.`,
    );
  }
  return {
    comparison: numerator,
    value: denominator - 1,
  };
}

function liveDynamicRangeDescriptors(
  initialRanges: readonly VisibleDeclaredRange[],
  observations: Readonly<Record<string, DynamicControlObservation>>,
): readonly HkVisualizationRangeDescriptor[] {
  return initialRanges.map(({ controlId }) => {
    const observed = observations[controlId];
    if (!observed) {
      throw new Error(`Dynamic live descriptor re-read omitted ${controlId}.`);
    }
    return Object.freeze({
      controlId,
      initial: observed.value,
      maximum: observed.descriptor.maximum,
      minimum: observed.descriptor.minimum,
      step: observed.descriptor.step,
    });
  });
}

async function strictFiniteLocatorAttribute(
  locator: Locator,
  attribute: string,
  label: string,
) {
  const raw = await locator.getAttribute(attribute);
  if (raw === null || !raw.trim())
    throw new Error(`${label} is missing nonblank ${attribute}.`);
  const value = Number(raw);
  if (!Number.isFinite(value))
    throw new Error(
      `${label} has non-finite ${attribute}=${JSON.stringify(raw)}.`,
    );
  return value;
}

async function assertDynamicDescriptorInDom(
  modelRoot: Locator,
  contract: HKVisualizationLessonContract,
  expectation: HkExecutableRangeDescriptorExpectation,
  value: number,
) {
  const control = dynamicDescendantLocator(
    modelRoot,
    contract.selectors.model,
    selectorForRangeControl(contract, expectation.controlId),
  );
  const fixed = modelRoot.locator(
    `[data-viz-fixed-parameter="${expectation.controlId}"]`,
  );
  if (expectation.visibility === "fixed") {
    if (expectation.enabled || (await control.count()) !== 0) {
      throw new Error(
        `Dynamic descriptor ${expectation.controlId} expected disabled fixed visibility but range count was ${await control.count()}.`,
      );
    }
    if (
      (await fixed.count()) !== 1 ||
      !(await locatorPassesVisibility(fixed, "learner"))
    ) {
      throw new Error(
        `Dynamic descriptor ${expectation.controlId} requires exactly one learner-visible fixed node.`,
      );
    }
    const fixedValue = await strictFiniteLocatorAttribute(
      fixed,
      "data-viz-fixed-parameter-value",
      `Dynamic fixed ${expectation.controlId}`,
    );
    if (!Object.is(fixedValue, value)) {
      throw new Error(
        `Dynamic fixed ${expectation.controlId} value ${fixedValue} does not match ${value}.`,
      );
    }
    const interactivity = await fixed.evaluate((element, selector) => {
      const html = element as HTMLElement;
      const disabled =
        "disabled" in html &&
        Boolean((html as HTMLElement & { disabled?: boolean }).disabled);
      const enabledDescendants = Array.from(
        element.querySelectorAll<HTMLElement>(selector),
      ).filter(
        (candidate) =>
          !("disabled" in candidate) ||
          !(candidate as HTMLElement & { disabled?: boolean }).disabled,
      );
      return {
        contentEditable: html.isContentEditable,
        controlLike: element.matches(selector),
        disabled,
        enabledDescendantCount: enabledDescendants.length,
        tabIndex: html.tabIndex,
      };
    }, controlSelector);
    if (
      interactivity.contentEditable ||
      (interactivity.controlLike && !interactivity.disabled) ||
      interactivity.enabledDescendantCount !== 0 ||
      interactivity.tabIndex >= 0
    ) {
      throw new Error(
        `Dynamic fixed ${expectation.controlId} must be noninteractive and non-tabbable; observed ${JSON.stringify(interactivity)}.`,
      );
    }
    return;
  }
  if (!expectation.enabled || (await fixed.count()) !== 0) {
    throw new Error(
      `Dynamic descriptor ${expectation.controlId} expected enabled range visibility without a fixed node.`,
    );
  }
  if (
    (await control.count()) !== 1 ||
    !(await locatorPassesVisibility(control, "interactive"))
  ) {
    throw new Error(
      `Dynamic descriptor ${expectation.controlId} is not exactly one interactive range.`,
    );
  }
  const observed = await control.evaluate((element) => {
    const input = element as HTMLInputElement;
    return {
      enabled: !input.disabled,
      maximum: input.getAttribute("max"),
      minimum: input.getAttribute("min"),
      step: input.getAttribute("step"),
      value: input.valueAsNumber,
    };
  });
  const numericObserved = {
    enabled: observed.enabled,
    maximum: strictFiniteRawAttribute(
      observed.maximum,
      "max",
      expectation.controlId,
    ),
    minimum: strictFiniteRawAttribute(
      observed.minimum,
      "min",
      expectation.controlId,
    ),
    step: strictFiniteRawAttribute(
      observed.step,
      "step",
      expectation.controlId,
    ),
    value: observed.value,
  };
  if (
    numericObserved.enabled !== expectation.enabled ||
    !Object.is(numericObserved.maximum, expectation.maximum) ||
    !Object.is(numericObserved.minimum, expectation.minimum) ||
    !Object.is(numericObserved.step, expectation.step) ||
    !Number.isFinite(numericObserved.value) ||
    !Object.is(numericObserved.value, value)
  ) {
    throw new Error(
      `Dynamic descriptor ${expectation.controlId} expected ${JSON.stringify(expectation)} at value ${value}, observed ${JSON.stringify(numericObserved)}.`,
    );
  }
  if (
    expectation.excludedValues.some((excluded) =>
      Object.is(excluded, numericObserved.value),
    )
  ) {
    throw new Error(
      `Dynamic descriptor ${expectation.controlId} observed excluded value ${numericObserved.value}.`,
    );
  }
}

function strictFiniteRawAttribute(
  raw: string | null,
  attribute: string,
  controlId: string,
) {
  if (raw === null || !raw.trim()) {
    throw new Error(
      `Dynamic range ${controlId} is missing nonblank ${attribute}.`,
    );
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(
      `Dynamic range ${controlId} has non-finite ${attribute}=${JSON.stringify(raw)}.`,
    );
  }
  return value;
}

function changedDynamicControlIds(
  initialRanges: readonly VisibleDeclaredRange[],
  before: Readonly<Record<string, DynamicControlObservation>>,
  after: Readonly<Record<string, DynamicControlObservation>>,
) {
  return initialRanges.flatMap(({ controlId }) =>
    Object.is(before[controlId]?.value, after[controlId]?.value)
      ? []
      : [controlId],
  );
}

async function assertNoOpSnapshotUnchanged(
  label: string,
  before: HkVisualizationInteractionSnapshot,
  after: HkVisualizationInteractionSnapshot,
) {
  if (
    before.serializedState !== after.serializedState ||
    before.meaningfulEvidence !== after.meaningfulEvidence
  ) {
    throw new Error(
      `${label} was a numeric no-op but mutated serialized or meaningful evidence: ${JSON.stringify({ before, after })}.`,
    );
  }
}

async function assertExactProjectionStepEvidence(
  action: HkVisualizationRangeStatePlanEntry["actions"][number],
  before: Readonly<Record<string, DynamicControlObservation>>,
  after: Readonly<Record<string, DynamicControlObservation>>,
  evidence: readonly HkExecutableRangeProjectionEvidence[],
  activeDomain: ActiveDynamicRangeDomain,
) {
  for (const item of evidence) {
    const edge = activeDomain.contract.edges.find(
      ({ sourceControlId }) => sourceControlId === item.declaredControllerId,
    );
    if (
      item.domainId !== activeDomain.domainId ||
      item.triggerControlId !== action.controlId ||
      !Object.is(item.triggerRequestedValue, action.requestedValue) ||
      !edge ||
      !edge.affectedControlIds.includes(item.affectedControlId) ||
      item.projection !== edge.projection ||
      item.reason !== edge.reason ||
      !item.reason.trim() ||
      !Object.is(
        before[item.affectedControlId]?.value,
        item.affectedValueBefore,
      ) ||
      !Object.is(after[item.affectedControlId]?.value, item.affectedValueAfter)
    ) {
      throw new Error(
        `Dynamic projection evidence for ${action.controlId} does not match live before/after and registry edge: ${JSON.stringify(item)}.`,
      );
    }
  }
}

function assertExactProjectionEvidence(
  planned: readonly HkExecutableRangeProjectionEvidence[],
  observed: readonly HkExecutableRangeProjectionEvidence[],
  label: string,
) {
  if (JSON.stringify(planned) !== JSON.stringify(observed)) {
    throw new Error(
      `Dynamic ${label} projection ledger drifted: planned=${JSON.stringify(planned)}, observed=${JSON.stringify(observed)}.`,
    );
  }
}

async function assertProjectedFixedAbsence(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  action: HkVisualizationRangeStatePlanEntry["actions"][number],
  rangeState: HkVisualizationRangeStatePlanEntry,
  activeDomain: ActiveDynamicRangeDomain,
  executedControllerIds: ReadonlySet<string>,
  observations: Readonly<Record<string, DynamicControlObservation>>,
  observedProjectionEvidence: readonly HkExecutableRangeProjectionEvidence[],
) {
  const requirements = action.projectedAbsenceRequirements;
  const expectedDescriptor = rangeState.expectedDescriptors.find(
    ({ controlId }) => controlId === action.controlId,
  );
  if (
    !action.allowProjectedAbsence ||
    !requirements ||
    requirements.expectedVisibility !== "fixed" ||
    requirements.projection !== "clamp-and-visibility" ||
    !requirements.controllerMustPrecede ||
    !requirements.requireExactControllerMetadata ||
    !requirements.requireExactlyOneFixedParameterNode ||
    !requirements.requireSerializedStateMatch ||
    expectedDescriptor?.visibility !== "fixed" ||
    expectedDescriptor.enabled !== false
  ) {
    throw new Error(
      `Missing dynamic range ${action.controlId} has no complete projected-absence contract.`,
    );
  }
  const earlierControllers = action.projectedByControllerIds.filter(
    (controlId) => executedControllerIds.has(controlId),
  );
  if (earlierControllers.length === 0) {
    throw new Error(
      `Projected absence ${action.controlId} has no earlier executed owning controller.`,
    );
  }
  const model = await exactDynamicModelRoot(workspace, contract, activeDomain);
  for (const controllerId of earlierControllers) {
    const edge = activeDomain.contract.edges.find(
      ({ sourceControlId }) => sourceControlId === controllerId,
    );
    if (
      !edge ||
      edge.projection !== "clamp-and-visibility" ||
      !edge.affectedControlIds.includes(action.controlId)
    ) {
      throw new Error(
        `Projected absence ${action.controlId} lacks exact registry edge from ${controllerId}.`,
      );
    }
    const controller = dynamicDescendantLocator(
      model,
      contract.selectors.model,
      selectorForRangeControl(contract, controllerId),
    );
    if ((await controller.count()) !== 1)
      throw new Error(`Projected absence owner ${controllerId} disappeared.`);
    const metadata = await controller.evaluate((element) => ({
      affects: element.getAttribute("data-viz-range-affects"),
      projection: element.getAttribute("data-viz-range-projection"),
      reason: element.getAttribute("data-viz-range-projection-reason"),
    }));
    if (
      metadata.affects !== edge.affectedControlIds.join(",") ||
      metadata.projection !== edge.projection ||
      metadata.reason !== edge.reason ||
      !metadata.reason.trim()
    ) {
      throw new Error(
        `Projected absence owner ${controllerId} DOM edge mismatch ${JSON.stringify(metadata)}.`,
      );
    }
  }
  const matchingProjectionEvidence = rangeState.projectionEvidence.filter(
    (evidence) =>
      evidence.domainId === activeDomain.domainId &&
      evidence.affectedControlId === action.controlId &&
      evidence.projection === requirements.projection &&
      earlierControllers.includes(evidence.declaredControllerId) &&
      earlierControllers.includes(evidence.triggerControlId) &&
      Object.is(evidence.affectedValueAfter, requirements.expectedFixedValue),
  );
  if (
    matchingProjectionEvidence.length !== 1 ||
    !observedProjectionEvidence.some(
      (observed) =>
        JSON.stringify(observed) ===
        JSON.stringify(matchingProjectionEvidence[0]),
    )
  ) {
    throw new Error(
      `Projected absence ${action.controlId} requires one exact earlier planner/live projection record; observed ${JSON.stringify(matchingProjectionEvidence)}.`,
    );
  }
  const fixed = model.locator(
    `[data-viz-fixed-parameter="${action.controlId}"]`,
  );
  if (
    (await fixed.count()) !== 1 ||
    !(await locatorPassesVisibility(fixed, "learner"))
  ) {
    throw new Error(
      `Projected absence ${action.controlId} requires exactly one learner-visible fixed node.`,
    );
  }
  const fixedValue = await strictFiniteLocatorAttribute(
    fixed,
    "data-viz-fixed-parameter-value",
    `Projected fixed ${action.controlId}`,
  );
  if (
    !Object.is(fixedValue, requirements.expectedFixedValue) ||
    !Object.is(
      observations[action.controlId]?.value,
      requirements.expectedFixedValue,
    )
  ) {
    throw new Error(
      `Projected absence ${action.controlId} fixed value ${fixedValue} does not match expected ${requirements.expectedFixedValue}.`,
    );
  }
  await assertSerializedDynamicValue(
    workspace,
    contract,
    activeDomain,
    action.controlId,
    requirements.expectedFixedValue,
  );
}

async function assertDynamicControllerMetadata(
  slider: Locator,
  action: HkVisualizationRangeStatePlanEntry["actions"][number],
  activeDomain: ActiveDynamicRangeDomain,
) {
  const edge = activeDomain.contract.edges.find(
    ({ sourceControlId }) => sourceControlId === action.controlId,
  );
  const observed = await slider.evaluate((element) => ({
    affects: element.getAttribute("data-viz-range-affects"),
    projection: element.getAttribute("data-viz-range-projection"),
    reason: element.getAttribute("data-viz-range-projection-reason"),
  }));
  if (!edge) {
    if (
      observed.affects !== null ||
      observed.projection !== null ||
      observed.reason !== null
    ) {
      throw new Error(
        `Non-controller ${action.controlId} exposed projection metadata.`,
      );
    }
    return;
  }
  if (
    observed.affects !== edge.affectedControlIds.join(",") ||
    observed.projection !== edge.projection ||
    observed.reason !== edge.reason ||
    !observed.reason.trim()
  ) {
    throw new Error(
      `Controller ${action.controlId} projection metadata drifted ${JSON.stringify(observed)}.`,
    );
  }
}

async function assertSerializedDynamicValue(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  activeDomain: ActiveDynamicRangeDomain,
  controlId: string,
  expectedValue: number,
) {
  const state = await readExactDynamicSerializedState(
    workspace,
    contract,
    activeDomain,
  );
  const value = state[controlId];
  if (typeof value !== "number" || !Object.is(value, expectedValue)) {
    throw new Error(
      `Dynamic serialized state ${controlId}=${String(value)} does not match expected ${expectedValue}.`,
    );
  }
}

function signatureForExpectedOrder(
  orderedValues: readonly Readonly<{ controlId: string; value: number }>[],
  observations: Readonly<Record<string, DynamicControlObservation>>,
) {
  return orderedValues
    .map(({ controlId }) => {
      const value = observations[controlId]?.value;
      if (!Number.isFinite(value))
        throw new Error(`Dynamic observation omitted finite ${controlId}.`);
      return `${controlId}=${Object.is(value, -0) ? 0 : value}`;
    })
    .join("|");
}

async function visibleRangeSignature(
  workspace: Locator,
  ranges: readonly VisibleDeclaredRange[],
) {
  const values: string[] = [];
  for (const range of ranges) {
    const slider = contractLocator(workspace, range.selector);
    values.push(`${range.controlId}=${Number(await slider.inputValue())}`);
  }
  return values.join("|") || "no-visible-ranges";
}

function assertStateScanLedger(result: HkVisualizationCellResult) {
  const ledger = result.stateScanLedger;
  const duplicatePlanned = ledger.plannedStateIds.filter(
    (id, index) => ledger.plannedStateIds.indexOf(id) !== index,
  );
  const duplicateExecuted = ledger.executedStateIds.filter(
    (id, index) => ledger.executedStateIds.indexOf(id) !== index,
  );
  const signatureMismatches = ledger.entries
    .filter(
      (entry) =>
        entry.observedSignature !== null &&
        entry.observedSignature !== entry.expectedSignature,
    )
    .map((entry) => ({
      expectedSignature: entry.expectedSignature,
      id: entry.id,
      observedSignature: entry.observedSignature,
      requestedSignature: entry.requestedSignature,
    }));
  const missingObservedSignatures = ledger.entries
    .filter((entry) => entry.observedSignature === null)
    .map((entry) => entry.id);
  const startingSignatureMismatches = ledger.entries
    .filter(
      (entry) =>
        entry.domainId !== null &&
        entry.startingObservedSignature !== entry.startingSignature,
    )
    .map((entry) => ({
      id: entry.id,
      startingObservedSignature: entry.startingObservedSignature,
      startingSignature: entry.startingSignature,
    }));
  const exactOrder =
    ledger.plannedStateIds.length === ledger.executedStateIds.length &&
    ledger.plannedStateIds.every(
      (id, index) => ledger.executedStateIds[index] === id,
    );
  if (
    duplicatePlanned.length ||
    duplicateExecuted.length ||
    !exactOrder ||
    signatureMismatches.length > 0 ||
    missingObservedSignatures.length > 0 ||
    startingSignatureMismatches.length > 0
  ) {
    addFailure(
      result,
      "STATE_SCAN_LEDGER",
      "State scan plan and execution must have identical transition IDs/order and expected/observed signatures with no duplicates.",
      "state-scan-ledger",
      undefined,
      {
        duplicateExecuted,
        duplicatePlanned,
        executedStateIds: ledger.executedStateIds,
        missingObservedSignatures,
        plannedStateIds: ledger.plannedStateIds,
        startingSignatureMismatches,
        signatureMismatches,
      },
    );
  }
  if (result.labId === "p6-ratio-proportion") {
    for (const boundary of [
      {
        reason: "semantic-boundary:p6-series-shift-zero",
        validShift: (shift: number) => shift === 0,
      },
      {
        reason: "semantic-boundary:p6-series-shift-positive",
        validShift: (shift: number) => shift > 0 && shift <= 2,
      },
    ] as const) {
      const entries = ledger.entries.filter(({ reasons }) =>
        reasons.includes(boundary.reason),
      );
      const observations = entries.length === 1
        ? result.p6AveragesLineGraphObservations.filter(
            ({ phase }) => phase === entries[0].phase,
          )
        : [];
      if (
        entries.length !== 1
        || !ledger.executedStateIds.includes(entries[0].id)
        || observations.length !== 1
        || !boundary.validShift(observations[0].seriesBShift)
      ) {
        addFailure(
          result,
          "P6_AVERAGES_BOUNDARY_RECEIPT",
          `${boundary.reason} must have exactly one executed ledger entry and one matching successful visible-math observation.`,
          "state-scan-ledger",
          undefined,
          {
            entries,
            observations,
          },
        );
      }
    }
  }
  if (result.labId === "p6-pre-secondary-problem-solving") {
    const boundaryContract = [
      {
        boundary: "positive-remaining" as const,
        reason: "semantic-boundary:p6-budget-positive-remaining",
      },
      {
        boundary: "exact-zero" as const,
        reason: "semantic-boundary:p6-budget-exact-zero",
      },
      {
        boundary: "positive-overspend" as const,
        reason: "semantic-boundary:p6-budget-positive-overspend",
      },
    ] as const;
    const expectedModes = ["represent", "solve", "check"] as const;
    const semanticEntries = ledger.entries.filter(({ reasons }) =>
      reasons.some((reason) => reason.startsWith("semantic-boundary:p6-budget-")),
    );
    const expectedOrder = expectedModes.flatMap((modeId) =>
      boundaryContract.map(({ reason }) => `${modeId}:${reason}`),
    );
    const observedOrder = semanticEntries.map(({ modeId, reasons }) => {
      const reason = reasons.find((candidate) =>
        candidate.startsWith("semantic-boundary:p6-budget-"),
      );
      return `${modeId}:${reason ?? "missing"}`;
    });
    const expectedObservationPhases = semanticEntries.map(({ phase }) => phase);
    const observedObservationPhases = result.p6BudgetBoundaryObservations.map(
      ({ phase }) => phase,
    );
    if (
      observedOrder.length !== expectedOrder.length
      || observedOrder.some((value, index) => value !== expectedOrder[index])
      || observedObservationPhases.length !== expectedObservationPhases.length
      || observedObservationPhases.some(
        (phase, index) => phase !== expectedObservationPhases[index],
      )
    ) {
      addFailure(
        result,
        "P6_BUDGET_BOUNDARY_RECEIPT",
        "P6 budget must durably record exactly nine semantic observations in positive remaining, exact zero, then positive overspend order for represent, solve, and check, with no non-semantic phase.",
        "state-scan-ledger",
        undefined,
        {
          expectedObservationPhases,
          expectedOrder,
          observedObservationPhases,
          observedOrder,
        },
      );
    }
    for (const { boundary, reason } of boundaryContract) {
      const entries = ledger.entries.filter(({ reasons }) =>
        reasons.includes(reason),
      );
      const observations = entries.flatMap((entry) =>
        result.p6BudgetBoundaryObservations.filter(
          ({ phase }) => phase === entry.phase,
        ),
      );
      if (
        entries.length !== expectedModes.length
        || entries.some(
          (entry, index) =>
            entry.modeId !== expectedModes[index]
            || !ledger.executedStateIds.includes(entry.id),
        )
        || observations.length !== expectedModes.length
        || observations.some(
          (observation, index) =>
            observation.boundary !== boundary
            || observation.dedicatedState.workflowStep !== expectedModes[index],
        )
      ) {
        addFailure(
          result,
          "P6_BUDGET_BOUNDARY_RECEIPT",
          `${reason} must have exactly one executed ledger entry and one successful visible-math observation in represent, solve, and check.`,
          "state-scan-ledger",
          undefined,
          { entries, observations },
        );
      }
    }
  }
}

type HkVisualizationInteractionSnapshot = {
  meaningfulEvidence: string;
  serializedState: string;
};

type HkVisualizationModeGroupState = {
  activeModeId: string;
  dependsOnGroupId: string | null;
  groupId: string;
  modeIds: string[];
};

async function interactionContractSnapshot(
  workspace: Locator,
): Promise<HkVisualizationInteractionSnapshot> {
  return workspace.evaluate((root, globalName) => {
    type Inspector = (
      target: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const inspector = (
      globalThis as unknown as Record<string, Inspector | undefined>
    )[globalName];
    if (!inspector)
      throw new Error(
        `Missing HK effective-visibility inspector ${globalName}.`,
      );
    const includingRoot = (selector: string) => [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll(selector)),
    ];
    const stableAttributes = (element: Element, includeAll = false) =>
      Array.from(element.attributes)
        .filter(
          (attribute) =>
            !attribute.name.startsWith("aria-") &&
            !["class", "style"].includes(attribute.name),
        )
        .filter(
          (attribute) =>
            includeAll ||
            attribute.name === "data-hk-viz-state" ||
            attribute.name === "data-viz-configured-state" ||
            attribute.name === "data-viz-configured-mode" ||
            attribute.name.startsWith("data-viz-state-") ||
            attribute.name.startsWith("data-viz-configured-state-") ||
            attribute.name === "data-viz-parameter-value" ||
            attribute.name === "data-viz-parameter-comparison",
        )
        .map((attribute) => [attribute.name, attribute.value] as const)
        .sort(([left], [right]) => left.localeCompare(right));

    const stateElements = includingRoot(
      "[data-hk-viz-state], [data-viz-configured-state]",
    );
    const serializedState = JSON.stringify(
      stateElements.map((element) => ({
        attributes: stableAttributes(element),
        tag: element.tagName,
      })),
    );

    const formulaEvidence = includingRoot(
      [
        "[data-hk-viz-formula]",
        "[data-viz-formula]",
        "[data-viz-formula-text]",
      ].join(","),
    ).map((element) => ({
      tag: element.tagName,
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
    }));
    const rendered = (element: Element) =>
      inspector(element).visuallyVisible;
    const presentationAttributes = (element: Element) =>
      Array.from(element.attributes)
        .filter(
          (attribute) =>
            !attribute.name.startsWith("data-") &&
            !attribute.name.startsWith("aria-"),
        )
        .filter(
          (attribute) =>
            !["class", "id", "role", "style", "tabindex"].includes(
              attribute.name,
            ),
        )
        .map((attribute) => [attribute.name, attribute.value] as const)
        .sort(([left], [right]) => left.localeCompare(right));
    const roundedRect = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height].map(
        (value) => Math.round(value * 100) / 100,
      );
    };
    const canvasDigest = (element: Element) => {
      if (!(element instanceof HTMLCanvasElement)) return null;
      try {
        const data = element.toDataURL("image/png");
        let hash = 2166136261;
        for (
          let index = 0;
          index < data.length;
          index += Math.max(1, Math.floor(data.length / 4096))
        ) {
          hash ^= data.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return `${data.length}:${hash >>> 0}`;
      } catch {
        return "unreadable-canvas";
      }
    };
    const renderedPresentation = (element: Element) => {
      const style = getComputedStyle(element);
      return {
        attributes: presentationAttributes(element),
        canvas: canvasDigest(element),
        paint: [
          style.backgroundColor,
          style.borderColor,
          style.color,
          style.fill,
          style.opacity,
          style.stroke,
          style.transform,
        ],
        rect: roundedRect(element),
        tag: element.tagName,
        text:
          element.matches("text, tspan, textPath") || !element.children.length
            ? (element.textContent ?? "").replace(/\s+/g, " ").trim()
            : "",
      };
    };
    const visualMarks = includingRoot("[data-viz-mark]")
      .filter(rendered)
      .map((element) => ({
        paintedSubtree: [
          element,
          ...Array.from(element.querySelectorAll("*")),
        ]
          .filter(rendered)
          .map(renderedPresentation),
      }));

    return {
      meaningfulEvidence: JSON.stringify({ formulaEvidence, visualMarks }),
      serializedState,
    };
  }, effectiveVisibilityGlobalName);
}

function interactionSnapshotChanged(
  before: HkVisualizationInteractionSnapshot,
  after: HkVisualizationInteractionSnapshot,
) {
  return {
    contractStateChanged: before.serializedState !== after.serializedState,
    meaningfulEvidenceChanged:
      before.meaningfulEvidence !== after.meaningfulEvidence,
  };
}

function applyInteractionSnapshotEvidence(
  evidence: HkVisualizationInteractionEvidence,
  before: HkVisualizationInteractionSnapshot,
  after: HkVisualizationInteractionSnapshot,
) {
  const changes = interactionSnapshotChanged(before, after);
  evidence.before = JSON.stringify(before);
  evidence.after = JSON.stringify(after);
  evidence.contractStateChanged = changes.contractStateChanged;
  evidence.meaningfulEvidenceChanged = changes.meaningfulEvidenceChanged;
  evidence.stateChanged =
    changes.contractStateChanged && changes.meaningfulEvidenceChanged;
  return changes;
}

function assertContractAndMeaningfulEvidenceChanged(
  label: string,
  changes: ReturnType<typeof interactionSnapshotChanged>,
) {
  if (!changes.contractStateChanged) {
    throw new Error(`${label} changed no serialized contract state.`);
  }
  if (!changes.meaningfulEvidenceChanged) {
    throw new Error(
      `${label} changed no meaningful formula/summary or visual-mark evidence.`,
    );
  }
}

async function modeGroupId(button: Locator, label: string) {
  const groupId = await button.evaluate((element) =>
    (
      element.getAttribute("data-viz-mode-group") ??
      element
        .closest("[data-viz-mode-group]")
        ?.getAttribute("data-viz-mode-group") ??
      ""
    ).trim(),
  );
  if (!groupId)
    throw new Error(`${label} has no non-empty data-viz-mode-group.`);
  return groupId;
}

async function visibleDeclaredModeGroups(
  workspace: Locator,
  contract: Pick<HKVisualizationLessonContract, "modeIds" | "selectors">,
  dynamicModelScoped = false,
) {
  const groups = new Map<
    string,
    {
      activeModeIds: string[];
      dependsOnGroupId: string | null;
      modeIds: string[];
    }
  >();
  for (let index = 0; index < contract.selectors.modes.length; index += 1) {
    const mode = dynamicModelScoped
      ? dynamicDescendantLocator(
          workspace,
          contract.selectors.model,
          contract.selectors.modes[index],
        )
      : contractLocator(workspace, contract.selectors.modes[index]);
    if (
      (await mode.count()) !== 1 ||
      !(await locatorPassesVisibility(mode, "interactive"))
    )
      continue;
    const groupId = await modeGroupId(
      mode,
      `Declared mode ${contract.modeIds[index]}`,
    );
    const dependsOnGroupId =
      (await mode.getAttribute("data-viz-mode-depends-on"))?.trim() || null;
    const group = groups.get(groupId) ?? {
      activeModeIds: [],
      dependsOnGroupId,
      modeIds: [],
    };
    if (group.dependsOnGroupId !== dependsOnGroupId) {
      throw new Error(
        `Visible mode group ${groupId} has inconsistent data-viz-mode-depends-on values.`,
      );
    }
    group.modeIds.push(contract.modeIds[index]);
    if (await isModeActive(mode))
      group.activeModeIds.push(contract.modeIds[index]);
    groups.set(groupId, group);
  }
  return groups;
}

async function assertVisibleDeclaredModeGroups(
  workspace: Locator,
  contract: Pick<HKVisualizationLessonContract, "modeIds" | "selectors">,
  dynamicModelScoped = false,
): Promise<HkVisualizationModeGroupState[]> {
  const groups = await visibleDeclaredModeGroups(
    workspace,
    contract,
    dynamicModelScoped,
  );
  const result: HkVisualizationModeGroupState[] = [];
  for (const [groupId, group] of groups) {
    if (group.activeModeIds.length !== 1) {
      throw new Error(
        `Visible mode group ${groupId} has ${group.activeModeIds.length} active modes (${group.activeModeIds.join(", ") || "none"}); exactly one of ${group.modeIds.join(", ")} is required.`,
      );
    }
    if (group.dependsOnGroupId === groupId) {
      throw new Error(`Visible mode group ${groupId} cannot depend on itself.`);
    }
    if (group.dependsOnGroupId && !groups.has(group.dependsOnGroupId)) {
      throw new Error(
        `Visible dependent mode group ${groupId} names missing owner ${group.dependsOnGroupId}.`,
      );
    }
    result.push({
      activeModeId: group.activeModeIds[0],
      dependsOnGroupId: group.dependsOnGroupId,
      groupId,
      modeIds: group.modeIds,
    });
  }
  return result.sort((left, right) =>
    left.groupId.localeCompare(right.groupId),
  );
}

function assertUnchangedIndependentModeGroups(
  before: readonly HkVisualizationModeGroupState[],
  after: readonly HkVisualizationModeGroupState[],
  changedGroupId: string,
) {
  const afterById = new Map(after.map((group) => [group.groupId, group]));
  for (const group of before) {
    if (group.groupId === changedGroupId) continue;
    const later = afterById.get(group.groupId);
    // Conditional groups may legitimately mount or unmount when their owning
    // model group changes. A group that remains visible must preserve its own
    // active selection.
    if (
      later &&
      later.activeModeId !== group.activeModeId &&
      later.dependsOnGroupId !== changedGroupId
    ) {
      throw new Error(
        `Activating ${changedGroupId} unexpectedly changed independent mode group ${group.groupId} from ${group.activeModeId} to ${later.activeModeId}.`,
      );
    }
  }
}

async function focusLocatorWithTab(
  locator: Locator,
  deadline: CellDeadline,
  label: string,
) {
  await locator.scrollIntoViewIfNeeded({
    timeout: deadlineTimeout(deadline, 3_000, `${label} scroll`),
  });
  const page = locator.page();
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
  const maximumTabs = Math.max(
    8,
    (await page.locator(controlSelector).count()) + 4,
  );
  for (let step = 0; step < maximumTabs; step += 1) {
    await page.keyboard.press("Tab");
    if (
      await locator
        .evaluate((element) => document.activeElement === element)
        .catch(() => false)
    )
      return;
  }
  throw new Error(
    `${label} could not be reached with Tab after ${maximumTabs} keyboard steps.`,
  );
}

function modeActivationKey(index: number): "Enter" | "Space" {
  return index % 2 === 0 ? "Enter" : "Space";
}

async function visibleDeclaredLocator(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  selector: string,
  label: string,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  for (let round = 0; round <= contract.selectors.modes.length; round += 1) {
    const target = contractLocator(workspace, selector);
    const count = await target.count();
    if (count > 1)
      throw new Error(
        `${label} selector matched ${count} elements: ${selector}.`,
      );
    if (count === 1 && (await locatorPassesVisibility(target, "interactive"))) {
      const root = await workspace.elementHandle();
      if (
        !root ||
        !(await target.evaluate(
          (element, workspaceRoot) => workspaceRoot.contains(element),
          root,
        ))
      ) {
        throw new Error(`${label} escaped the current topic workspace.`);
      }
      if (!(await target.isEnabled().catch(() => false)))
        throw new Error(`${label} is disabled.`);
      return target;
    }
    let changedMode = false;
    for (
      let modeIndex = 0;
      modeIndex < contract.selectors.modes.length;
      modeIndex += 1
    ) {
      const candidate = contractLocator(
        workspace,
        contract.selectors.modes[modeIndex],
      );
      if (
        (await candidate.count()) !== 1 ||
        !(await locatorPassesVisibility(candidate, "interactive"))
      )
        continue;
      if (
        !(await candidate.isEnabled().catch(() => false)) ||
        (await isModeActive(candidate))
      )
        continue;
      await clickDeclaredMode(
        workspace,
        contract,
        candidate,
        contract.modeIds[modeIndex],
        modeIndex,
        result,
        deadline,
        `reveal-${label}`,
        true,
      );
      changedMode = true;
      if (
        (await target.count()) === 1 &&
        (await locatorPassesVisibility(target, "interactive"))
      )
        break;
    }
    if (!changedMode) break;
  }
  throw new Error(
    `${label} is missing or remained hidden after traversing every declared mode: ${selector}.`,
  );
}

async function clickDeclaredMode(
  workspace: Locator,
  contract: Pick<HKVisualizationLessonContract, "modeIds" | "selectors">,
  button: Locator,
  modeId: string,
  modeIndex: number,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  phase: string,
  requireTransition: boolean,
  auditState = true,
  activationIndex = modeIndex,
) {
  const before = await interactionContractSnapshot(workspace);
  const wasActive = await isModeActive(button);
  const groupId = await modeGroupId(button, `Declared mode ${modeId}`);
  const groupsBefore = await assertVisibleDeclaredModeGroups(
    workspace,
    contract,
  );
  await assertLocalizedAccessibleName(
    button,
    result.language,
    "mode",
    `declared mode ${modeId}`,
  );
  if (requireTransition && wasActive) {
    throw new Error(
      `Declared mode ${modeId} was already active; the transition did not start in another mode.`,
    );
  }
  const activationKey = modeActivationKey(activationIndex);
  const evidence: HkVisualizationInteractionEvidence = {
    action: `keyboard-mode-${modeId}`,
    activationKey,
    before: JSON.stringify(before),
    control: await describeLocator(button, 0),
    contractStateChanged: null,
    groupId,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
    tabFocused: false,
  };
  result.interactions.push(evidence);
  await focusLocatorWithTab(button, deadline, `${modeId} mode`);
  evidence.tabFocused = true;
  await button.press(activationKey, {
    timeout: deadlineTimeout(
      deadline,
      4_000,
      `${modeId} mode keyboard activation`,
    ),
  });
  await expect
    .poll(() => isModeActive(button), {
      timeout: deadlineTimeout(deadline, 4_000, `${modeId} mode activation`),
    })
    .toBe(true);
  const groupsAfter = await assertVisibleDeclaredModeGroups(
    workspace,
    contract,
  );
  assertUnchangedIndependentModeGroups(groupsBefore, groupsAfter, groupId);
  const after = await interactionContractSnapshot(workspace);
  const changes = applyInteractionSnapshotEvidence(evidence, before, after);
  if (wasActive) {
    evidence.contractStateChanged = null;
    evidence.meaningfulEvidenceChanged = null;
    evidence.stateChanged = null;
  } else if (requireTransition) {
    assertContractAndMeaningfulEvidenceChanged(
      `Declared inactive mode ${modeId}`,
      changes,
    );
  }
  if (auditState)
    await auditInteractiveState(workspace, result, deadline, phase);
}

function modeTargetForReference(
  contract: HKVisualizationLessonContract,
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[],
  reference: HKVisualizationMathOracleModeReference,
): HkVisualizationModeExerciseTarget {
  const group = modeTopology.find(
    (candidate) => candidate.groupId === reference.groupId,
  );
  if (!group || !group.modeIds.includes(reference.modeId)) {
    throw new Error(
      `Mode parent context cannot resolve ${reference.groupId}=${reference.modeId}.`,
    );
  }
  const modeIndex = contract.modeIds.indexOf(reference.modeId);
  if (modeIndex < 0) {
    throw new Error(
      `Mode parent context ${reference.groupId}=${reference.modeId} is absent from the lesson manifest.`,
    );
  }
  return { group, modeId: reference.modeId, modeIndex };
}

async function declaredModeIsInteractive(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  modeIndex: number,
) {
  const mode = contractLocator(workspace, contract.selectors.modes[modeIndex]);
  return (
    (await mode.count()) === 1 &&
    (await locatorPassesVisibility(mode, "interactive"))
  );
}

async function activateDeclaredModeTarget(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  target: HkVisualizationModeExerciseTarget,
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[],
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  activationIndex: number,
  trail: ReadonlySet<string>,
): Promise<number> {
  const key = `${target.group?.groupId ?? "unscoped"}=${target.modeId}`;
  if (trail.has(key))
    throw new Error(`Mode parent context contains a dependency cycle at ${key}.`);
  const nextTrail = new Set(trail).add(key);
  let transitions = await activateDeclaredModeParentContext(
    workspace,
    contract,
    target,
    modeTopology,
    result,
    deadline,
    activationIndex,
    nextTrail,
  );
  const mode = contractLocator(
    workspace,
    contract.selectors.modes[target.modeIndex],
  );
  if (
    (await mode.count()) !== 1 ||
    !(await locatorPassesVisibility(mode, "interactive"))
  ) {
    throw new Error(
      `Mode parent context ${key} did not become visibly interactive.`,
    );
  }
  if (!(await isModeActive(mode))) {
    await clickDeclaredMode(
      workspace,
      contract,
      mode,
      target.modeId,
      target.modeIndex,
      result,
      deadline,
      `manifest-mode-parent-${target.modeId}`,
      true,
      false,
      activationIndex + transitions,
    );
    transitions += 1;
  }
  return transitions;
}

async function activateDeclaredModeParentContext(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  target: HkVisualizationModeExerciseTarget,
  modeTopology: readonly HkVisualizationModeExerciseTopologyGroup[],
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  activationIndex: number,
  trail: ReadonlySet<string> = new Set(),
): Promise<number> {
  const group = target.group;
  if (!group) return 0;

  if (group.parentMode) {
    const parent = modeTargetForReference(
      contract,
      modeTopology,
      group.parentMode,
    );
    const transitions = await activateDeclaredModeTarget(
      workspace,
      contract,
      parent,
      modeTopology,
      result,
      deadline,
      activationIndex,
      trail,
    );
    if (
      !(await declaredModeIsInteractive(
        workspace,
        contract,
        target.modeIndex,
      ))
    ) {
      throw new Error(
        `Exact parent mode ${group.parentMode.groupId}=${group.parentMode.modeId} did not reveal ${group.groupId}=${target.modeId}.`,
      );
    }
    return transitions;
  }

  if (group.dependsOnGroupId) {
    if (
      await declaredModeIsInteractive(
        workspace,
        contract,
        target.modeIndex,
      )
    )
      return 0;
    const parentGroup = modeTopology.find(
      (candidate) => candidate.groupId === group.dependsOnGroupId,
    );
    if (!parentGroup)
      throw new Error(
        `Dependent mode group ${group.groupId} names missing parent group ${group.dependsOnGroupId}.`,
      );
    let transitions = 0;
    for (const parentModeId of parentGroup.modeIds) {
      const parent = modeTargetForReference(contract, modeTopology, {
        groupId: parentGroup.groupId,
        modeId: parentModeId,
      });
      transitions += await activateDeclaredModeTarget(
        workspace,
        contract,
        parent,
        modeTopology,
        result,
        deadline,
        activationIndex + transitions,
        trail,
      );
      if (
        await declaredModeIsInteractive(
          workspace,
          contract,
          target.modeIndex,
        )
      )
        return transitions;
    }
    throw new Error(
      `No declared ${parentGroup.groupId} mode revealed ${group.groupId}=${target.modeId}.`,
    );
  }

  return 0;
}

async function exerciseDeclaredMode(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  index: number,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  auditState = true,
  activationIndex = index,
) {
  const modeId = contract.modeIds[index];
  const phase = `manifest-mode-${modeId}`;
  try {
    const button = contractLocator(workspace, contract.selectors.modes[index]);
    if (
      (await button.count()) !== 1 ||
      !(await locatorPassesVisibility(button, "interactive"))
    ) {
      throw new Error(
        `Declared mode ${modeId} is not visibly interactive in deterministic manifest order.`,
      );
    }
    await assertLocalizedAccessibleName(
      button,
      result.language,
      "mode",
      `declared mode ${modeId}`,
    );
    await modeGroupId(button, `Declared mode ${modeId}`);
    await assertVisibleDeclaredModeGroups(workspace, contract);
    await focusLocatorWithTab(button, deadline, `${modeId} mode`);
    if (!(await isModeActive(button))) {
      await clickDeclaredMode(
        workspace,
        contract,
        button,
        modeId,
        index,
        result,
        deadline,
        phase,
        true,
        auditState,
        activationIndex,
      );
      return "transitioned";
    } else if (auditState) {
      await auditInteractiveState(workspace, result, deadline, phase);
    }
    return "active";
  } catch (error) {
    const latest = result.interactions[result.interactions.length - 1];
    if (latest?.action.includes(modeId)) {
      latest.status = "failed";
      latest.stateChanged = false;
    }
    addFailure(
      result,
      "MANIFEST_MODE_INTERACTION",
      errorMessage(error),
      phase,
      contract.selectors.modes[index],
    );
    return false;
  }
}

async function exerciseDeclaredControl(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  index: number,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const controlId = contract.controlIds[index];
  const selector = contract.selectors.controls[index];
  const phase = `manifest-control-${controlId}`;
  try {
    const control = await visibleDeclaredLocator(
      workspace,
      contract,
      selector,
      `declared control ${controlId}`,
      result,
      deadline,
    );
    await assertLocalizedAccessibleName(
      control,
      result.language,
      "control",
      `declared control ${controlId}`,
    );
    const tag = await control.evaluate((element) =>
      element.tagName.toLowerCase(),
    );
    const type = await control.getAttribute("type");
    const isTriangleVertex =
      (await control.getAttribute("data-viz-name"))?.startsWith(
        "angle-vertex-",
      ) === true;
    if (tag === "input" && type === "range") {
      throw new Error(
        `Declared range ${controlId} was not covered by any visible mode-scoped range-state plan.`,
      );
    }
    if (isTriangleVertex && (await control.getAttribute("role")) === "button") {
      for (const key of ["ArrowRight", "ArrowUp"] as const) {
        await exerciseStateChangingKey(
          workspace,
          control,
          controlId,
          key,
          result,
          deadline,
        );
      }
      return;
    }
    if (tag === "button" || (await control.getAttribute("role")) === "button") {
      if (await isModeActive(control)) {
        const activeGroupId = await control.getAttribute("data-viz-mode-group");
        for (
          let alternativeIndex = 0;
          alternativeIndex < contract.selectors.controls.length;
          alternativeIndex += 1
        ) {
          const alternativeSelector =
            contract.selectors.controls[alternativeIndex];
          if (alternativeSelector === selector) continue;
          const alternative = contractLocator(workspace, alternativeSelector);
          if (
            (await alternative.count()) !== 1 ||
            !(await locatorPassesVisibility(alternative, "interactive"))
          )
            continue;
          const alternativeTag = await alternative.evaluate((element) =>
            element.tagName.toLowerCase(),
          );
          const alternativeGroupId = await alternative.getAttribute(
            "data-viz-mode-group",
          );
          if (
            alternativeTag === "button" &&
            activeGroupId &&
            alternativeGroupId === activeGroupId &&
            !(await isModeActive(alternative))
          ) {
            await exerciseStateChangingClick(
              workspace,
              alternative,
              `${controlId}-precondition`,
              result,
              deadline,
              alternativeIndex,
            );
            break;
          }
        }
      }
      await exerciseStateChangingClick(
        workspace,
        control,
        controlId,
        result,
        deadline,
        index,
      );
      return;
    }
    throw new Error(
      `Declared control ${controlId} has unsupported element kind ${tag}${type ? `[type=${type}]` : ""}.`,
    );
  } catch (error) {
    const latest = result.interactions[result.interactions.length - 1];
    if (latest?.action.includes(controlId)) {
      latest.status = "failed";
      latest.stateChanged = false;
    }
    addFailure(
      result,
      "MANIFEST_CONTROL_INTERACTION",
      errorMessage(error),
      phase,
      selector,
    );
  }
}

async function exerciseStateChangingClick(
  workspace: Locator,
  control: Locator,
  controlId: string,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  controlIndex = 0,
) {
  const before = await interactionContractSnapshot(workspace);
  const activationKey = modeActivationKey(controlIndex);
  const evidence: HkVisualizationInteractionEvidence = {
    action: `keyboard-${controlId}`,
    activationKey,
    before: JSON.stringify(before),
    control: await describeLocator(control, 0),
    contractStateChanged: null,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
    tabFocused: false,
  };
  result.interactions.push(evidence);
  await focusLocatorWithTab(control, deadline, `${controlId} button`);
  evidence.tabFocused = true;
  await control.press(activationKey, {
    timeout: deadlineTimeout(
      deadline,
      4_000,
      `${controlId} keyboard activation`,
    ),
  });
  const after = await interactionContractSnapshot(workspace);
  const changes = applyInteractionSnapshotEvidence(evidence, before, after);
  assertContractAndMeaningfulEvidenceChanged(`${controlId} button`, changes);
  await auditInteractiveState(
    workspace,
    result,
    deadline,
    `control-${controlId}`,
  );
}

async function exerciseStateChangingKey(
  workspace: Locator,
  control: Locator,
  controlId: string,
  key: "ArrowRight" | "ArrowUp",
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const before = await interactionContractSnapshot(workspace);
  const evidence: HkVisualizationInteractionEvidence = {
    action: `${controlId}-${key}`,
    before: JSON.stringify(before),
    control: await describeLocator(control, 0),
    contractStateChanged: null,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
    tabFocused: false,
  };
  result.interactions.push(evidence);
  await focusLocatorWithTab(control, deadline, `${controlId} triangle vertex`);
  evidence.tabFocused = true;
  await control.press(key);
  const after = await interactionContractSnapshot(workspace);
  const changes = applyInteractionSnapshotEvidence(evidence, before, after);
  assertContractAndMeaningfulEvidenceChanged(`${controlId} ${key}`, changes);
  await auditInteractiveState(
    workspace,
    result,
    deadline,
    `${controlId}-${key.toLowerCase()}`,
  );
}

async function exerciseThreeDLearnerInteractions(
  workspace: Locator,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const surface = workspace
    .locator('[data-viz-surface][data-viz-renderer="three-r3f"]')
    .first();
  const playback = surface.locator("[data-viz-manim-playback-toggle]").first();
  const timeline = surface
    .locator("[data-viz-manim-timeline-scrubber]")
    .first();
  const resetCamera = surface.locator("[data-viz-three-reset-camera]").first();

  try {
    if (
      (await surface.getAttribute("data-viz-manim-playback-state")) ===
      "playing"
    ) {
      await playback.click({
        timeout: deadlineTimeout(deadline, 4_000, "pause 3D timeline"),
      });
      await expect(surface).toHaveAttribute(
        "data-viz-manim-playback-state",
        "paused",
        {
          timeout: deadlineTimeout(deadline, 5_000, "3D paused state"),
        },
      );
    }

    const before = await visualizationFingerprint(workspace);
    const beforeProgress = Number(
      (await timeline.getAttribute("aria-valuenow")) ?? "0",
    );
    const playbackEvidence: HkVisualizationInteractionEvidence = {
      action: "3d-play-pause",
      before,
      control: await describeLocator(playback, 0),
      stateChanged: null,
      status: "passed",
    };
    result.interactions.push(playbackEvidence);

    await playback.click({
      timeout: deadlineTimeout(deadline, 4_000, "play 3D timeline"),
    });
    await expect
      .poll(
        async () => {
          const state = await surface.getAttribute(
            "data-viz-manim-playback-state",
          );
          const progress = Number(
            (await timeline.getAttribute("aria-valuenow")) ?? "0",
          );
          return state === "playing" || progress !== beforeProgress;
        },
        { timeout: deadlineTimeout(deadline, 6_000, "3D playback progress") },
      )
      .toBe(true);

    if (
      (await surface.getAttribute("data-viz-manim-playback-state")) ===
      "playing"
    ) {
      await playback.click({
        timeout: deadlineTimeout(deadline, 4_000, "pause 3D timeline"),
      });
    }
    await expect(surface).toHaveAttribute(
      "data-viz-manim-playback-state",
      "paused",
      {
        timeout: deadlineTimeout(deadline, 5_000, "3D final paused state"),
      },
    );
    const after = await visualizationFingerprint(workspace);
    playbackEvidence.after = after;
    playbackEvidence.stateChanged =
      after !== before ||
      Number((await timeline.getAttribute("aria-valuenow")) ?? "0") !==
        beforeProgress;
    if (!playbackEvidence.stateChanged)
      throw new Error(
        "3D Play/Pause produced no stable playback or timeline evidence.",
      );
    await auditInteractiveState(workspace, result, deadline, "3d-playback");

    const timelineEvidence: HkVisualizationInteractionEvidence = {
      action: "3d-timeline-keyboard",
      before: String(await timeline.getAttribute("aria-valuenow")),
      control: await describeLocator(timeline, 0),
      stateChanged: null,
      status: "passed",
    };
    result.interactions.push(timelineEvidence);
    await timeline.focus();
    await timeline.press("Home");
    await expect(timeline).toHaveAttribute("aria-valuenow", "0", {
      timeout: deadlineTimeout(deadline, 4_000, "3D timeline Home"),
    });
    timelineEvidence.after = String(
      await timeline.getAttribute("aria-valuenow"),
    );
    timelineEvidence.stateChanged =
      timelineEvidence.after !== timelineEvidence.before;
    await auditInteractiveState(
      workspace,
      result,
      deadline,
      "3d-timeline-home",
    );

    const resetEvidence: HkVisualizationInteractionEvidence = {
      action: "3d-reset-camera",
      control: await describeLocator(resetCamera, 0),
      stateChanged: null,
      status: "passed",
    };
    result.interactions.push(resetEvidence);
    await resetCamera.click({
      timeout: deadlineTimeout(deadline, 4_000, "3D reset camera"),
    });
    resetEvidence.stateChanged = null;
    await auditInteractiveState(workspace, result, deadline, "3d-reset-camera");
  } catch (error) {
    addFailure(
      result,
      "THREE_D_LEARNER_INTERACTION",
      errorMessage(error),
      "3d-interactions",
    );
    const latest = result.interactions[result.interactions.length - 1];
    if (latest) latest.status = "failed";
  }
}

async function exerciseCoordinatePoint(
  workspace: Locator,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
) {
  const addButton = workspace.locator("[data-viz-add-point]").first();
  if (!(await locatorPassesVisibility(addButton, "interactive"))) return;
  const inputs = workspace.locator('input[type="number"]');
  if ((await inputs.count()) < 2) {
    addFailure(
      result,
      "COORDINATE_INPUTS",
      "Coordinate add-point control has fewer than two number inputs.",
      "coordinate",
    );
    return;
  }

  const before = await interactionContractSnapshot(workspace);
  const evidence: HkVisualizationInteractionEvidence = {
    action: "fill-and-add-point",
    activationKey: "Enter",
    before: JSON.stringify(before),
    control: await describeLocator(addButton, 0),
    contractStateChanged: null,
    meaningfulEvidenceChanged: null,
    stateChanged: null,
    status: "passed",
    tabFocused: false,
  };
  result.interactions.push(evidence);
  try {
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("3");
    await focusLocatorWithTab(
      addButton,
      deadline,
      "coordinate add-point button",
    );
    evidence.tabFocused = true;
    await addButton.press("Enter", {
      timeout: deadlineTimeout(deadline, 4_000, "coordinate add"),
    });
    const after = await interactionContractSnapshot(workspace);
    const changes = applyInteractionSnapshotEvidence(evidence, before, after);
    assertContractAndMeaningfulEvidenceChanged(
      "Adding a valid coordinate point",
      changes,
    );
    await auditInteractiveState(
      workspace,
      result,
      deadline,
      "coordinate-add-point",
    );
  } catch (error) {
    evidence.status = "failed";
    evidence.stateChanged = false;
    addFailure(
      result,
      "COORDINATE_ADD",
      errorMessage(error),
      "coordinate",
      evidence.control,
    );
  }
}

async function exerciseReset(
  workspace: Locator,
  contract: HKVisualizationLessonContract,
  result: HkVisualizationCellResult,
  canonicalFingerprint: string,
  deadline: CellDeadline,
  resetStateEntry: HkVisualizationStateScanLedgerEntry,
) {
  const reset = contractLocator(workspace, contract.selectors.reset);
  if (!(await locatorPassesVisibility(reset, "interactive"))) {
    addFailure(
      result,
      "RESET_MISSING",
      "Visible configured lab has no visible data-viz-reset-model control.",
      "reset",
    );
    return;
  }
  try {
    await assertLocalizedAccessibleName(
      reset,
      result.language,
      "reset",
      `${result.labId} reset`,
    );
  } catch (error) {
    addFailure(
      result,
      "RESET_LOCALIZED_NAME",
      errorMessage(error),
      "reset",
      contract.selectors.reset,
    );
  }

  const usesDedicatedHkModel = await workspace.evaluate(
    (root) =>
      root.matches("[data-hk-viz-model]") ||
      Boolean(root.querySelector("[data-hk-viz-model]")),
  );
  const passThroughResetPlan = hkVisualizationPassThroughOracleByLabId.has(
    result.labId,
  )
    ? buildHkVisualizationPassThroughResetActionPlan(result.labId)
    : null;
  const resetActions = passThroughResetPlan ?? Object.freeze([
    Object.freeze({
      activationKey: "Enter" as const,
      actionKind: "restoring" as const,
      phase: resetStateEntry.phase,
    }),
    Object.freeze({
      activationKey: "Space" as const,
      actionKind: "restoring" as const,
      phase: "reset-space",
    }),
  ]);
  for (const resetAction of resetActions) {
    const { activationKey, actionKind } = resetAction;
    const phase = "actionIndex" in resetAction && resetAction.actionIndex === 0
      ? resetStateEntry.phase
      : resetAction.phase;
    let beforeFingerprint: string | null = null;
    let beforeOracleObservation: HkVisualizationPassThroughOracleObservation | null = null;
    let beforeResetState: HkVisualizationPassThroughResetState | null = null;
    try {
      if (actionKind === "restoring") {
        await ensureNonCanonicalResetState(
          workspace,
          reset,
          canonicalFingerprint,
          usesDedicatedHkModel,
          deadline,
          "expectedState" in resetAction ? resetAction.expectedState : null,
          result.labId,
        );
      }
      beforeFingerprint = await visualizationFingerprint(workspace);
      beforeResetState = passThroughResetPlan
        ? await readPassThroughResetState(reset)
        : null;
      if (passThroughResetPlan) {
        const oracleContract = hkVisualizationPassThroughOracleByLabId.get(
          result.labId,
        );
        if (!oracleContract) {
          throw new Error(`${result.labId} omitted its pass-through oracle contract.`);
        }
        beforeOracleObservation =
          await observeHkVisualizationPassThroughOracleState(
            workspace,
            oracleContract,
            phase,
          );
        assertHkVisualizationPassThroughResetOracleEndpoint(
          oracleContract,
          beforeOracleObservation,
          "before",
        );
      }
    } catch (error) {
      addFailure(
        result,
        "RESET_PRECONDITION",
        errorMessage(error),
        "reset",
        await describeLocator(reset, 0),
      );
      return;
    }
    const before = await interactionContractSnapshot(workspace);
    const evidence: HkVisualizationInteractionEvidence = {
      action: actionKind === "canonical-noop"
        ? `keyboard-reset-${activationKey}-idempotent`
        : `keyboard-reset-${activationKey}`,
      activationKey,
      before: JSON.stringify(before),
      control: await describeLocator(reset, 0),
      contractStateChanged: null,
      meaningfulEvidenceChanged: null,
      stateChanged: null,
      status: "passed",
      tabFocused: false,
    };
    result.interactions.push(evidence);
    try {
      await focusLocatorWithTab(
        reset,
        deadline,
        `model reset (${activationKey})`,
      );
      evidence.tabFocused = true;
      await reset.press(activationKey, {
        timeout: deadlineTimeout(deadline, 4_000, "model reset"),
      });
      await expect
        .poll(() => visualizationFingerprint(workspace), {
          timeout: deadlineTimeout(
            deadline,
            5_000,
            "canonical Reset fingerprint",
          ),
        })
        .toBe(canonicalFingerprint);
      if ("expectedState" in resetAction) {
        const resetTimeout = deadlineTimeout(
          deadline,
          4_000,
          "pass-through topic-aware reset contract",
        );
        await expect(reset).toHaveAttribute(
          "data-viz-reset-value",
          String(resetAction.expectedState.value),
          { timeout: resetTimeout },
        );
        await expect(reset).toHaveAttribute(
          "data-viz-reset-comparison",
          String(resetAction.expectedState.comparison),
          { timeout: resetTimeout },
        );
        await expect(reset).toHaveAttribute(
          "data-viz-reset-height",
          String(resetAction.expectedState.height),
          { timeout: resetTimeout },
        );
        await expect(reset).toHaveAttribute(
          "data-viz-reset-mode",
          String(resetAction.expectedState.mode),
          { timeout: resetTimeout },
        );
      }
      const afterFingerprint = await visualizationFingerprint(workspace);
      const after = await interactionContractSnapshot(workspace);
      const changes = applyInteractionSnapshotEvidence(evidence, before, after);
      if (actionKind === "canonical-noop") {
        if (changes.contractStateChanged || changes.meaningfulEvidenceChanged) {
          throw new Error(
            `Reset (${activationKey}) canonical no-op changed serialized or visible evidence.`,
          );
        }
      } else {
        assertContractAndMeaningfulEvidenceChanged(
          `Reset (${activationKey})`,
          changes,
        );
      }
      const addPoint = workspace.locator("[data-viz-add-point]").first();
      if (await locatorPassesVisibility(addPoint, "interactive")) {
        const coordinateInputs = workspace.locator('input[type="number"]');
        for (
          let index = 0;
          index < (await coordinateInputs.count());
          index += 1
        ) {
          await expect(coordinateInputs.nth(index)).toHaveValue("", {
            timeout: deadlineTimeout(deadline, 3_000, "coordinate reset"),
          });
        }
        await expect(workspace.locator("[data-viz-point-error]")).toHaveCount(
          0,
          {
            timeout: deadlineTimeout(deadline, 3_000, "coordinate error reset"),
          },
        );
      }
      const afterOracleObservation = await auditInteractiveState(
        workspace,
        result,
        deadline,
        phase,
      );
      if (passThroughResetPlan && "expectedState" in resetAction) {
        const oracleContract = hkVisualizationPassThroughOracleByLabId.get(
          result.labId,
        );
        if (
          !beforeResetState
          || !beforeFingerprint
          || !beforeOracleObservation
          || !afterOracleObservation
          || !oracleContract
        ) {
          throw new Error(
            "Pass-through Reset omitted its full before/after oracle endpoint.",
          );
        }
        assertHkVisualizationPassThroughResetOracleEndpoint(
          oracleContract,
          afterOracleObservation,
          "after",
        );
        const endpointReceipt =
          buildHkVisualizationBrowserPassThroughResetEndpointReceipt({
            afterOracleObservation,
            beforeOracleObservation,
            cellId: result.cellId,
            labId: result.labId,
            phase,
          });
        const observation: HkVisualizationPassThroughResetObservation = {
          activationKey,
          actionKind,
          afterEndpoint: endpointReceipt.afterEndpoint,
          afterFingerprint,
          afterState: await readPassThroughResetState(reset),
          beforeEndpoint: endpointReceipt.beforeEndpoint,
          beforeFingerprint,
          beforeState: beforeResetState,
          canonicalFingerprint,
          expectedState: resetAction.expectedState,
          labId: result.labId,
          layerEndpointHashCount: endpointReceipt.layerEndpointHashCount,
          layerPairs: endpointReceipt.layerPairs,
          layerReceiptCount: endpointReceipt.layerReceiptCount,
          phase,
        };
        const issues = auditHkVisualizationPassThroughResetObservation(
          observation,
        );
        if (issues.length > 0) {
          throw new Error(
            `Pass-through Reset v3 failed closed: ${issues.join(" | ")}.`,
          );
        }
        result.passThroughResetObservations.push(observation);
      }
      if (activationKey === "Enter" && actionKind === "restoring") {
        const nextPlannedId =
          result.stateScanLedger.plannedStateIds[
            result.stateScanLedger.executedStateIds.length
          ];
        if (nextPlannedId !== resetStateEntry.id) {
          throw new Error(
            `Reset state execution drift: expected ${nextPlannedId ?? "none"}, received ${resetStateEntry.id}.`,
          );
        }
        resetStateEntry.observedSignature =
          await visualizationFingerprint(workspace);
        result.stateScanLedger.executedStateIds.push(resetStateEntry.id);
      }
    } catch (error) {
      evidence.status = "failed";
      evidence.stateChanged = false;
      addFailure(
        result,
        "RESET_INTERACTION",
        errorMessage(error),
        "reset",
        evidence.control,
      );
    }
  }
}

async function ensureNonCanonicalResetState(
  workspace: Locator,
  reset: Locator,
  canonicalFingerprint: string,
  usesDedicatedHkModel: boolean,
  deadline: CellDeadline,
  expectedPassThroughState: HkVisualizationPassThroughResetState | null,
  labId: string,
) {
  const currentFingerprint = await visualizationFingerprint(workspace);
  if (currentFingerprint !== canonicalFingerprint) {
    await focusLocatorWithTab(
      reset,
      deadline,
      "controlled canonical Reset precondition",
    );
    await reset.press("Enter", {
      timeout: deadlineTimeout(
        deadline,
        4_000,
        "controlled canonical Reset precondition",
      ),
    });
    await expect
      .poll(() => visualizationFingerprint(workspace), {
        timeout: deadlineTimeout(
          deadline,
          5_000,
          "controlled canonical fingerprint restoration",
        ),
      })
      .toBe(canonicalFingerprint);
  }

  const canonicalInteractionSnapshot =
    await interactionContractSnapshot(workspace);
  let plannedPassThroughPerturbation:
    | HkVisualizationPassThroughResetPerturbation
    | null = null;

  if (expectedPassThroughState) {
    const canonicalState = await readPassThroughResetState(reset);
    if (!samePassThroughResetState(canonicalState, expectedPassThroughState)) {
      throw new Error(
        `${labId} controlled Reset did not restore the exact canonical tuple.`,
      );
    }
    const preconditionPlan = planHkVisualizationPassThroughResetPrecondition({
      canonicalFingerprint,
      currentFingerprint,
      labId,
    });
    const { perturbation } = preconditionPlan;
    plannedPassThroughPerturbation = perturbation;
    const exactSlider = dynamicDescendantLocator(
      workspace,
      `[data-viz-active-lab-id="${labId}"]`,
      perturbation.selector,
    );
    if ((await exactSlider.count()) !== 1) {
      throw new Error(
        `${labId} exact Reset perturb selector must resolve to one comparison control.`,
      );
    }
    if (!(await locatorPassesVisibility(exactSlider, "interactive"))) {
      throw new Error(`${labId} exact Reset perturb comparison is not interactive.`);
    }
    const minimum = Number(await exactSlider.getAttribute("min"));
    const maximum = Number(await exactSlider.getAttribute("max"));
    const step = Number(await exactSlider.getAttribute("step") ?? "1");
    const delta = (perturbation.targetValue - minimum) / step;
    if (
      !Number.isFinite(minimum)
      || !Number.isFinite(maximum)
      || !Number.isFinite(step)
      || step <= 0
      || perturbation.targetValue < minimum
      || perturbation.targetValue > maximum
      || !Number.isSafeInteger(delta)
    ) {
      throw new Error(`${labId} exact Reset perturb target is outside its range.`);
    }
    await focusLocatorWithTab(
      exactSlider,
      deadline,
      "exact comparison Reset precondition",
    );
    await exactSlider.press("Home", {
      timeout: deadlineTimeout(deadline, 4_000, "exact comparison Home"),
    });
    for (let stepIndex = 0; stepIndex < delta; stepIndex += 1) {
      await exactSlider.press("ArrowRight", {
        timeout: deadlineTimeout(
          deadline,
          4_000,
          "exact comparison perturb step",
        ),
      });
    }
    await expect(exactSlider).toHaveValue(String(perturbation.targetValue), {
      timeout: deadlineTimeout(deadline, 4_000, "exact comparison target"),
    });
  } else {
    const genericSliders = workspace.locator('input[type="range"]:enabled:visible');
    if (await genericSliders.count()) {
      const genericSlider = genericSliders.first();
      const current = Number(await genericSlider.inputValue());
      const minimum = Number(await genericSlider.getAttribute("min"));
      await focusLocatorWithTab(
        genericSlider,
        deadline,
        "generic Reset precondition range",
      );
      await genericSlider.press(current === minimum ? "End" : "Home", {
        timeout: deadlineTimeout(deadline, 4_000, "generic Reset perturbation"),
      });
    } else {
      const genericModes = workspace.locator(
        '[data-viz-mode-button][data-viz-mode-active="false"]:visible:not(:disabled)',
      );
      if (!(await genericModes.count())) {
        throw new Error(
          `${usesDedicatedHkModel ? "Dedicated" : "Generic"} Reset has no visible enabled perturbation control.`,
        );
      }
      const genericMode = genericModes.first();
      await focusLocatorWithTab(
        genericMode,
        deadline,
        "generic Reset precondition mode",
      );
      await genericMode.press("Space", {
        timeout: deadlineTimeout(deadline, 4_000, "generic Reset perturbation"),
      });
    }
  }

  await expect
    .poll(async () => {
      const changes = interactionSnapshotChanged(
        canonicalInteractionSnapshot,
        await interactionContractSnapshot(workspace),
      );
      return changes.contractStateChanged && changes.meaningfulEvidenceChanged;
    }, {
      timeout: deadlineTimeout(
        deadline,
        5_000,
        "controlled Reset perturbation settlement",
      ),
    })
    .toBe(true);

  if (plannedPassThroughPerturbation) {
    const observedPerturbation: HkVisualizationPassThroughResetPerturbation = {
      ...plannedPassThroughPerturbation,
      beforeState: await readPassThroughResetState(reset),
    };
    const perturbationIssues = auditHkVisualizationPassThroughResetPrecondition(
      labId,
      observedPerturbation,
    );
    if (perturbationIssues.length > 0) {
      throw new Error(
        `${labId} exact Reset perturbation failed: ${perturbationIssues.join(" | ")}.`,
      );
    }
  }

  if ((await visualizationFingerprint(workspace)) === canonicalFingerprint) {
    throw new Error(
      `${labId} could not establish a deliberate noncanonical Reset precondition.`,
    );
  }
}

function samePassThroughResetState(
  left: HkVisualizationPassThroughResetState,
  right: HkVisualizationPassThroughResetState,
) {
  return left.comparison === right.comparison
    && left.height === right.height
    && left.mode === right.mode
    && left.value === right.value;
}

async function readPassThroughResetState(
  reset: Locator,
): Promise<HkVisualizationPassThroughResetState> {
  const raw = await reset.evaluate((element) => ({
    comparison: element.getAttribute("data-viz-reset-comparison"),
    height: element.getAttribute("data-viz-reset-height"),
    mode: element.getAttribute("data-viz-reset-mode"),
    value: element.getAttribute("data-viz-reset-value"),
  }));
  const parsed = {
    comparison: Number(raw.comparison),
    height: Number(raw.height),
    mode: Number(raw.mode),
    value: Number(raw.value),
  };
  if (
    Object.values(raw).some((value) => value === null || value === "")
    || Object.values(parsed).some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      "Pass-through Reset must expose finite value/comparison/height/mode readonly attributes.",
    );
  }
  return Object.freeze(parsed);
}

async function passThroughOracleSelectorEvidence(
  locator: Locator,
): Promise<HkVisualizationPassThroughOracleSelectorEvidence> {
  const count = await locator.count();
  let learnerVisibleCount = 0;
  for (let index = 0; index < count; index += 1) {
    if (await locatorPassesVisibility(locator.nth(index), "learner")) {
      learnerVisibleCount += 1;
    }
  }
  return { count, learnerVisibleCount };
}

export function assertHkVisualizationPassThroughRawRendererOwnerIdentity(
  labId: string,
  broadEvidence: HkVisualizationPassThroughOracleSelectorEvidence,
  identityEvidence: HkVisualizationPassThroughOracleSelectorEvidence,
  sameDomNode: boolean,
): void {
  if (broadEvidence.count !== 1 || broadEvidence.learnerVisibleCount !== 1) {
    throw new Error(
      `${labId} raw renderer broad owner must match exactly one learner-visible node; observed ${broadEvidence.count}/${broadEvidence.learnerVisibleCount}.`,
    );
  }
  if (identityEvidence.count !== 1 || identityEvidence.learnerVisibleCount !== 1) {
    throw new Error(
      `${labId} raw renderer identity owner must match exactly one learner-visible node; observed ${identityEvidence.count}/${identityEvidence.learnerVisibleCount}.`,
    );
  }
  if (!sameDomNode) {
    throw new Error(
      `${labId} raw renderer selectors must resolve to the same DOM node.`,
    );
  }
}

async function observeHkVisualizationPassThroughOracleState(
  workspace: Locator,
  contract: HKVisualizationPassThroughMathOracleContract,
  phase: string,
): Promise<HkVisualizationPassThroughOracleObservation> {
  const root = contractLocator(workspace, contract.rootSelector);
  const model = contractLocator(workspace, contract.modelSelector);
  const stateOwner = contractLocator(workspace, contract.stateSelector);
  const formula = contractLocator(workspace, contract.formulaSelector);
  const rawRendererStateBroadOwner = contractLocator(
    workspace,
    contract.rawRendererState.broadOwnerSelector,
  );
  const rawRendererStateIdentityOwner = contractLocator(
    workspace,
    contract.rawRendererState.identitySelector,
  );
  const reset = contractLocator(workspace, contract.reset.selector);
  const selectorEvidence = {
    formula: await passThroughOracleSelectorEvidence(formula),
    model: await passThroughOracleSelectorEvidence(model),
    reset: await passThroughOracleSelectorEvidence(reset),
    root: await passThroughOracleSelectorEvidence(root),
    state: await passThroughOracleSelectorEvidence(stateOwner),
  };
  const rawRendererStateBroadEvidence =
    await passThroughOracleSelectorEvidence(rawRendererStateBroadOwner);
  const rawRendererStateIdentityEvidence =
    await passThroughOracleSelectorEvidence(rawRendererStateIdentityOwner);
  const rawRendererStateOwnersMatch =
    rawRendererStateBroadEvidence.count === 1 &&
    rawRendererStateIdentityEvidence.count === 1
      ? await rawRendererStateBroadOwner.evaluate(
          (element, identitySelector) => element.matches(identitySelector),
          contract.rawRendererState.identitySelector,
        )
      : false;
  assertHkVisualizationPassThroughRawRendererOwnerIdentity(
    contract.labId,
    rawRendererStateBroadEvidence,
    rawRendererStateIdentityEvidence,
    rawRendererStateOwnersMatch,
  );
  const rawRendererState = {
    attribute: contract.rawRendererState.attribute,
    selectorEvidence: rawRendererStateBroadEvidence,
    serializedState: await rawRendererStateIdentityOwner.getAttribute(
      contract.rawRendererState.attribute,
    ),
  } satisfies HKVisualizationPassThroughRawRendererStateObservation;

  const serializedState =
    selectorEvidence.state.count === 1
      ? await stateOwner.getAttribute("data-viz-configured-state")
      : null;
  if (!serializedState?.trim()) {
    throw new Error(
      `${contract.labId} exact state owner has no nonblank data-viz-configured-state.`,
    );
  }
  let parsedState: unknown;
  try {
    parsedState = JSON.parse(serializedState);
  } catch {
    throw new Error(
      `${contract.labId} exact configured state is malformed JSON.`,
    );
  }
  if (!parsedState || typeof parsedState !== "object" || Array.isArray(parsedState)) {
    throw new Error(
      `${contract.labId} exact configured state must be a JSON object.`,
    );
  }

  const modeSelectorEvidence: Record<
    string,
    HkVisualizationPassThroughOracleSelectorEvidence
  > = {};
  const activeModeIds: string[] = [];
  const visibleModeButtons = root.locator("[data-viz-mode-button]");
  for (let index = 0; index < (await visibleModeButtons.count()); index += 1) {
    const button = visibleModeButtons.nth(index);
    if (!(await locatorPassesVisibility(button, "learner"))) continue;
    const modeId =
      (await button.getAttribute("data-viz-mode-id"))?.trim() ||
      `__missing-mode-id:${index}`;
    const current = modeSelectorEvidence[modeId] ?? {
      count: 0,
      learnerVisibleCount: 0,
    };
    modeSelectorEvidence[modeId] = {
      count: current.count + 1,
      learnerVisibleCount: current.learnerVisibleCount + 1,
    };
    if (await isModeActive(button)) activeModeIds.push(modeId);
  }
  for (const declared of contract.modeSelectors) {
    if (modeSelectorEvidence[declared.modeId]) continue;
    modeSelectorEvidence[declared.modeId] =
      await passThroughOracleSelectorEvidence(
        contractLocator(workspace, declared.selector),
      );
  }

  const visibleNamedMarks: string[] = [];
  const visibleEvidenceParts: string[] = [];
  const namedEvidence = root.locator("[data-viz-name]");
  for (let index = 0; index < (await namedEvidence.count()); index += 1) {
    const evidence = namedEvidence.nth(index);
    if (!(await locatorPassesVisibility(evidence, "learner"))) continue;
    const name = (await evidence.getAttribute("data-viz-name"))?.trim();
    if (name) {
      visibleNamedMarks.push(name);
      visibleEvidenceParts.push(name);
    }
    const text = (await evidence.textContent())?.replace(/\s+/g, " ").trim();
    if (text) visibleEvidenceParts.push(text);
    for (const attribute of [
      "data-viz-formula",
      "data-viz-formula-text",
      "data-viz-visible-formula",
    ]) {
      const value = (await evidence.getAttribute(attribute))?.trim();
      if (value) visibleEvidenceParts.push(value);
    }
  }

  const formulaText =
    selectorEvidence.formula.count === 1
      ? await formula.evaluate((element) =>
          [
            element.getAttribute("data-viz-formula"),
            element.getAttribute("data-viz-formula-text"),
            element.getAttribute("data-viz-visible-formula"),
            element.textContent,
          ]
            .filter((value): value is string => Boolean(value?.trim()))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
      : "";
  if (formulaText) visibleEvidenceParts.push(formulaText);

  const visibleMathMarks: Record<
    string,
    HKVisualizationPassThroughVisibleMathMarkObservation[]
  > = {};
  const p3FractionNumerator = contract.labId === "p3-fractions-intro"
    ? finiteOracleNumber(parsedState as Record<string, unknown>, "numerator")
    : null;
  const p3ZeroFillNames = p3FractionNumerator === 0
    ? new Set(["whole bar fill", "equivalent bar fill"])
    : null;
  for (const markContract of contract.visibleMathMarks) {
    const matches = contractLocator(workspace, markContract.selector);
    const observations: HKVisualizationPassThroughVisibleMathMarkObservation[] = [];
    for (let index = 0; index < (await matches.count()); index += 1) {
      const match = matches.nth(index);
      const zeroFill = p3ZeroFillNames?.has(markContract.name) === true;
      if (!zeroFill && !(await locatorPassesVisibility(match, "learner"))) continue;
      const observation = await match.evaluate(
        (element, options) => {
          if (options.zeroFill) {
            if (!(element instanceof SVGRectElement)) {
              throw new Error(`${options.name} zero fraction fill must be an SVG rect.`);
            }
            const width = Number(element.getAttribute("width"));
            if (!Object.is(width, 0)) {
              throw new Error(`${options.name} zero fraction fill must have exact width=0.`);
            }
          }
          return {
            attributes: Object.fromEntries(options.requiredAttributes.map((attribute) => [
              attribute,
              element.getAttribute(attribute),
            ])),
            tagName: element.tagName.toLowerCase(),
            text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
          };
        },
        {
          name: markContract.name,
          requiredAttributes: markContract.requiredAttributes,
          zeroFill,
        },
      );
      observations.push(observation);
    }
    visibleMathMarks[markContract.name] = observations;
  }
  if (p3FractionNumerator === 0) {
    for (const barName of ["whole bar", "equivalent bar"] as const) {
      const group = contractLocator(
        workspace,
        `${contract.rootSelector} [data-viz-name="${barName}"]`,
      );
      const background = contractLocator(
        workspace,
        `${contract.rootSelector} [data-viz-name="${barName} background"]`,
      );
      const label = contractLocator(
        workspace,
        `${contract.rootSelector} [data-viz-name="${barName}"] [data-viz-fraction-value-label="true"]`,
      );
      if (
        !(await locatorPassesVisibility(group, "learner"))
        || !(await locatorPassesVisibility(background, "learner"))
        || !(await locatorPassesVisibility(label, "learner"))
      ) {
        throw new Error(
          `${contract.labId} zero fraction ${barName} requires one learner-visible group, background, and value label around its exact zero-width fill.`,
        );
      }
      const denominatorKey = barName === "whole bar"
        ? "denominator"
        : "equivalentDenominator";
      const denominator = finiteOracleNumber(
        parsedState as Record<string, unknown>,
        denominatorKey,
      );
      const partitions = contractLocator(
        workspace,
        `${contract.rootSelector} [data-viz-name="${barName} partition"]`,
      );
      if (
        denominator === null
        || (await partitions.count()) !== denominator - 1
      ) {
        throw new Error(
          `${contract.labId} zero fraction ${barName} must retain every visible partition.`,
        );
      }
      for (let index = 0; index < (await partitions.count()); index += 1) {
        const paintedPartition = await partitions.nth(index).evaluate(
          (element) => {
            if (!(element instanceof SVGLineElement)) return false;
            const style = getComputedStyle(element);
            let current: Element | null = element;
            while (current) {
              const currentStyle = getComputedStyle(current);
              if (
                current.hasAttribute("hidden")
                || current.hasAttribute("inert")
                || current.getAttribute("aria-hidden")?.trim().toLowerCase() === "true"
                || currentStyle.display === "none"
                || currentStyle.contentVisibility === "hidden"
                || currentStyle.visibility === "hidden"
                || currentStyle.visibility === "collapse"
              ) return false;
              current = current.parentElement;
            }
            return element.isConnected
              && element.getTotalLength() > 1
              && Number.parseFloat(style.strokeWidth) > 0
              && style.stroke !== "none"
              && Number.parseFloat(style.strokeOpacity || "1") > 0;
          },
        );
        if (!paintedPartition) {
          throw new Error(
            `${contract.labId} zero fraction ${barName} partition ${index} is not learner-visible.`,
          );
        }
      }
    }
  }

  return {
    activeModeIds,
    formulaText,
    labId: contract.labId,
    modelIdentity: {
      moduleId:
        selectorEvidence.root.count === 1
          ? await root.getAttribute("data-viz-module-id")
          : null,
      templateId:
        selectorEvidence.model.count === 1
          ? await model.getAttribute("data-viz-configured-model")
          : null,
      topicId:
        selectorEvidence.model.count === 1
          ? await model.getAttribute("data-viz-configured-topic")
          : null,
    },
    modeSelectorEvidence,
    phase,
    rawRendererState,
    selectorEvidence,
    state: parsedState as Record<string, unknown>,
    visibleEvidenceText: visibleEvidenceParts.join(" | "),
    visibleMathMarks,
    visibleNamedMarks,
  };
}

function assertHkVisualizationPassThroughResetOracleEndpoint(
  contract: HKVisualizationPassThroughMathOracleContract,
  observation: HkVisualizationPassThroughOracleObservation,
  endpoint: "before" | "after",
) {
  const publicIssues = auditHkVisualizationPassThroughOracleObservation(
    contract,
    observation,
  ).map((issue) => `public:${issue.code}:${issue.message}`);
  const rawIssues = auditHkVisualizationPassThroughRawRendererState(
    contract,
    observation.state,
    observation.rawRendererState,
  ).map((issue) => `raw:${issue.code}:${issue.message}`);
  const visibleIssues = auditHkVisualizationPassThroughVisibleMathObservation(
    contract,
    {
      formulaText: observation.formulaText,
      labId: observation.labId,
      marks: observation.visibleMathMarks,
      rawRendererState: observation.rawRendererState,
      state: observation.state,
    },
  ).map((issue) => `visible:${issue.code}:${issue.message}`);
  const issues = [...publicIssues, ...rawIssues, ...visibleIssues];
  if (issues.length > 0) {
    throw new Error(
      `${contract.labId} Reset ${endpoint} endpoint failed three-layer oracle audit: ${issues.join(" | ")}.`,
    );
  }
}

async function auditHkVisualizationPassThroughOracleState(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  const contract = hkVisualizationPassThroughOracleByLabId.get(result.labId);
  if (!contract) return null;
  try {
    const observation = await observeHkVisualizationPassThroughOracleState(
      workspace,
      contract,
      phase,
    );
    // Persist the three independently auditable layers for successful and
    // failed states alike; a green receipt must not discard the raw renderer
    // JSON that linked projected state to the visible SVG geometry.
    result.passThroughOracleObservations.push(observation);
    for (const issue of auditHkVisualizationPassThroughOracleObservation(
      contract,
      observation,
    )) {
      addFailure(
        result,
        `PASS_THROUGH_MATH_${issue.code.replace(/-/g, "_").toUpperCase()}`,
        issue.message,
        phase,
        contract.rootSelector,
        { observation },
      );
    }
    for (const issue of auditHkVisualizationPassThroughRawRendererState(
      contract,
      observation.state,
      observation.rawRendererState,
    )) {
      addFailure(
        result,
        `PASS_THROUGH_RAW_STATE_${issue.code.replace(/-/g, "_").toUpperCase()}`,
        issue.message,
        phase,
        contract.rawRendererState.selector,
        { observation },
      );
    }
    for (const issue of auditHkVisualizationPassThroughVisibleMathObservation(
      contract,
      {
        formulaText: observation.formulaText,
        labId: observation.labId,
        marks: observation.visibleMathMarks,
        rawRendererState: observation.rawRendererState,
        state: observation.state,
      },
    )) {
      addFailure(
        result,
        `PASS_THROUGH_VISIBLE_MATH_${issue.code.replace(/-/g, "_").toUpperCase()}`,
        issue.message,
        phase,
        contract.rootSelector,
        { observation },
      );
    }
    return observation;
  } catch (error) {
    addFailure(
      result,
      "PASS_THROUGH_MATH_AUDIT",
      `${contract.labId} pass-through oracle failed closed: ${errorMessage(error)}`,
      phase,
      contract.rootSelector,
    );
    return null;
  }
}

type HkVisualizationBrowserScrollContainer =
  HkVisualizationScrollContainerEvidence;

type HkVisualizationBrowserScrollPosition = Readonly<{
  containerKey: string;
  maximumScrollLeft: number;
  reachedScrollLeft: number;
  requestedScrollLeft: number;
}>;

type HkVisualizationScrollAuditOutcome = Readonly<{
  audits: HkVisualizationScrollObservation["audits"];
  positiveEvidenceCounts: HkVisualizationScrollObservation["positiveEvidenceCounts"];
}>;

/**
 * Finds every learner-visible horizontal educational scrollport in stable DOM
 * order. Formula-only scrollports are deliberately first-class: requiring an
 * SVG or data-viz-surface descendant recreated the mobile blind spot this
 * audit is intended to close.
 */
export async function discoverHkVisualizationEducationalScrollContainers(
  workspace: Locator,
): Promise<readonly HkVisualizationBrowserScrollContainer[]> {
  return await workspace.evaluate(
    (root, options) => {
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[options.visibilityGlobalName];
      if (!inspector)
        throw new Error(
          `Missing HK effective-visibility inspector ${options.visibilityGlobalName}.`,
        );
      const learnerVisible = (element: Element) => {
        const visibility = inspector(element);
        return (
          visibility.visuallyVisible &&
          !visibility.hiddenAncestor &&
          !visibility.inertAncestor &&
          !visibility.ariaHiddenAncestor
        );
      };
      const stableKey = (element: HTMLElement) => {
        if (element === root) return "workspace-root";
        const segments: string[] = [];
        let current: Element | null = element;
        while (current && current !== root) {
          let ordinal = 1;
          let sibling = current.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === current.tagName) ordinal += 1;
            sibling = sibling.previousElementSibling;
          }
          segments.unshift(
            `${current.tagName.toLowerCase()}:nth-of-type(${ordinal})`,
          );
          current = current.parentElement;
        }
        if (current !== root)
          throw new Error("Educational scroll container escaped its workspace.");
        return `workspace-root>${segments.join(">")}`;
      };
      const classify = (element: HTMLElement) => {
        const formula =
          element.matches(
            "[data-viz-formula-scroll-container], [data-viz-formula-scroll]",
          ) ||
          Boolean(
            element.querySelector(
              "[data-viz-formula], [data-viz-formula-value], math, .katex",
            ),
          );
        const surface =
          element.matches("[data-viz-surface]") ||
          Boolean(element.querySelector("[data-viz-surface], svg"));
        if (formula && surface) return "formula-and-surface" as const;
        if (formula) return "formula" as const;
        if (surface) return "surface" as const;
        return "educational" as const;
      };
      const explicitEducationalSelector = [
        "[data-viz-scroll-container]",
        "[data-viz-pan-container]",
        "[data-viz-scroll-surface]",
        "[data-viz-formula-scroll-container]",
        "[data-viz-formula-scroll]",
      ].join(",");
      const candidates = [root, ...Array.from(root.querySelectorAll("*"))]
        .filter((element): element is HTMLElement => {
          if (!(element instanceof HTMLElement) || !learnerVisible(element))
            return false;
          const style = getComputedStyle(element);
          if (
            !/auto|scroll/.test(style.overflowX) ||
            element.scrollWidth <= element.clientWidth + 2
          )
            return false;
          return (
            element.matches(explicitEducationalSelector) ||
            classify(element) !== "educational"
          );
        })
        .map((element) => ({
          clientWidth: element.clientWidth,
          containerKey: stableKey(element),
          contentKind: classify(element),
          maximumScrollLeft: element.scrollWidth - element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
      if (new Set(candidates.map(({ containerKey }) => containerKey)).size !== candidates.length)
        throw new Error("Educational scroll container stable keys are duplicated.");
      return candidates;
    },
    { visibilityGlobalName: effectiveVisibilityGlobalName },
  );
}

async function positionHkVisualizationEducationalScrollContainers(
  workspace: Locator,
  containers: readonly HkVisualizationBrowserScrollContainer[],
  targetContainerKey: string | null,
  position: "all-start" | "end" | "mid",
): Promise<readonly HkVisualizationBrowserScrollPosition[]> {
  return await workspace.evaluate(
    (root, options) => {
      const stableKey = (element: HTMLElement) => {
        if (element === root) return "workspace-root";
        const segments: string[] = [];
        let current: Element | null = element;
        while (current && current !== root) {
          let ordinal = 1;
          let sibling = current.previousElementSibling;
          while (sibling) {
            if (sibling.tagName === current.tagName) ordinal += 1;
            sibling = sibling.previousElementSibling;
          }
          segments.unshift(
            `${current.tagName.toLowerCase()}:nth-of-type(${ordinal})`,
          );
          current = current.parentElement;
        }
        return current === root
          ? `workspace-root>${segments.join(">")}`
          : "outside-workspace";
      };
      const byKey = new Map(
        [root, ...Array.from(root.querySelectorAll("*"))]
          .filter((element): element is HTMLElement =>
            element instanceof HTMLElement,
          )
          .map((element) => [stableKey(element), element]),
      );
      return options.containers.map((container) => {
        const element = byKey.get(container.containerKey);
        if (!element)
          throw new Error(
            `Educational scroll container ${container.containerKey} disappeared.`,
          );
        const liveMaximum = element.scrollWidth - element.clientWidth;
        if (Math.abs(liveMaximum - container.maximumScrollLeft) > 2)
          throw new Error(
            `Educational scroll container ${container.containerKey} dimensions drifted.`,
          );
        const isTarget = container.containerKey === options.targetContainerKey;
        const requestedScrollLeft =
          options.position === "all-start" || !isTarget
            ? 0
            : options.position === "mid"
              ? Math.round(container.maximumScrollLeft / 2)
              : container.maximumScrollLeft;
        element.scrollLeft = requestedScrollLeft;
        return {
          containerKey: container.containerKey,
          maximumScrollLeft: liveMaximum,
          reachedScrollLeft: element.scrollLeft,
          requestedScrollLeft,
        };
      });
    },
    { containers, position, targetContainerKey },
  );
}

async function restoreHkVisualizationEducationalScrollContainers(
  workspace: Locator,
  containers: readonly HkVisualizationBrowserScrollContainer[],
) {
  return await positionHkVisualizationEducationalScrollContainers(
    workspace,
    containers,
    null,
    "all-start",
  );
}

function passedScrollAuditReceipt(
  auditId: HkVisualizationScrollPositionAuditId,
  evidence: HkVisualizationCanonicalEvidence,
): HkVisualizationMandatoryAuditReceipt {
  return Object.freeze({
    auditId,
    evidence,
    evidenceHash: hashHkVisualizationAuditEvidence(auditId, evidence),
    failure: null,
    issues: Object.freeze([]),
    retryCount: 0,
    status: "passed" as const,
  });
}

async function auditHkP6AveragesLineGraphState(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  if (result.labId !== "p6-ratio-proportion") return;
  const root = contractLocator(
    workspace,
    '[data-hk-viz-model="primary-dedicated-v1"][data-hk-viz-topic="p6-ratio-proportion"]',
  );
  try {
    if ((await root.count()) !== 1) {
      throw new Error("p6-ratio-proportion must expose exactly one dedicated primary state owner.");
    }
    const observation = await root.evaluate((element, options) => {
      const serializedState = element.getAttribute("data-hk-viz-state");
      if (!serializedState?.trim()) {
        throw new Error("P6 averages state owner omitted data-hk-viz-state.");
      }
      const state = JSON.parse(serializedState) as Record<string, unknown>;
      if (state.mode !== "broken-line" || state.seriesCount !== 2) return null;
      const seriesBShift = state.seriesBShift;
      if (typeof seriesBShift !== "number" || !Number.isFinite(seriesBShift)) {
        throw new Error("P6 two-series state omitted a finite seriesBShift.");
      }
      const dedicatedValues = [
        state.value1,
        state.value2,
        state.value3,
        state.value4,
      ];
      if (
        dedicatedValues.some(
          (value) => typeof value !== "number" || !Number.isFinite(value),
        )
      ) {
        throw new Error("P6 two-series state omitted one or more finite value1..value4 readings.");
      }
      const exactOne = (selector: string) => {
        const matches = element.querySelectorAll(selector);
        if (matches.length !== 1) {
          throw new Error(`${selector} expected exactly one element; observed ${matches.length}.`);
        }
        return matches[0];
      };
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[options.visibilityGlobalName];
      if (!inspector) {
        throw new Error(
          `Missing HK effective-visibility inspector ${options.visibilityGlobalName}.`,
        );
      }
      const visibilityEvidence = (target: Element) => {
        const evidence = inspector(target);
        const style = getComputedStyle(target);
        const paintedLineVisible =
          target instanceof SVGLineElement
          && target.isConnected
          && target.getTotalLength() > 1
          && Number.parseFloat(style.strokeWidth) > 0
          && style.stroke !== "none"
          && Number.parseFloat(style.strokeOpacity || "1") > 0
          && !evidence.displayNoneAncestor
          && !evidence.visibilityHidden
          && evidence.effectiveOpacity > 0
          && !evidence.hiddenAncestor
          && !evidence.inertAncestor
          && !evidence.ariaHiddenAncestor;
        return {
          ariaHiddenAncestor: evidence.ariaHiddenAncestor,
          hiddenAncestor: evidence.hiddenAncestor,
          inertAncestor: evidence.inertAncestor,
          visuallyVisible: evidence.visuallyVisible || paintedLineVisible,
        };
      };
      const visibilityFor = (selector: string) => Array.from(
        element.querySelectorAll(selector),
        visibilityEvidence,
      );
      const finiteAttribute = (target: Element, attribute: string) => {
        const raw = target.getAttribute(attribute);
        const value = raw === null ? Number.NaN : Number(raw);
        if (!Number.isFinite(value)) {
          throw new Error(`${attribute} must be finite; observed ${String(raw)}.`);
        }
        return value;
      };
      const graph = exactOne('[data-viz-name="broken-line-graph"]');
      const table = exactOne('[data-viz-name="data-table"]');
      const meanReadout = exactOne('[data-viz-name="series-mean-readout"]');
      const tableRows = Array.from(
        graph.querySelectorAll('[data-viz-name="data-table-row"]'),
      ).map((row) => ({
        hour: finiteAttribute(row, "data-viz-hour"),
        seriesA: finiteAttribute(row, "data-viz-series-a"),
        seriesB: finiteAttribute(row, "data-viz-series-b"),
      }));
      const pointsFor = (series: "A" | "B") => Array.from(
        graph.querySelectorAll(
          `[data-viz-name="broken-line-series"][data-viz-series="${series}"] [data-viz-name="series-point"][data-viz-series="${series}"]`,
        ),
      ).map((point) => ({
        hour: finiteAttribute(point, "data-viz-hour"),
        value: finiteAttribute(point, "data-viz-value"),
        x: finiteAttribute(point, "cx"),
        y: finiteAttribute(point, "cy"),
      }));
      const segmentsFor = (series: "A" | "B") => Array.from(
        graph.querySelectorAll(
          `[data-viz-name="broken-line-series"][data-viz-series="${series}"] [data-viz-name="adjacent-line-segment"][data-viz-series="${series}"]`,
        ),
      ).map((segment) => ({
        fromHour: finiteAttribute(segment, "data-viz-from-hour"),
        fromValue: finiteAttribute(segment, "data-viz-from-value"),
        toHour: finiteAttribute(segment, "data-viz-to-hour"),
        toValue: finiteAttribute(segment, "data-viz-to-value"),
        x1: finiteAttribute(segment, "x1"),
        x2: finiteAttribute(segment, "x2"),
        y1: finiteAttribute(segment, "y1"),
        y2: finiteAttribute(segment, "y2"),
      }));
      const meanLineFor = (series: "A" | "B") => {
        const line = exactOne(
          `[data-viz-name="series-mean"][data-viz-series="${series}"]`,
        );
        const y1 = finiteAttribute(line, "y1");
        const y2 = finiteAttribute(line, "y2");
        if (y1 !== y2) {
          throw new Error(`Series ${series} mean line must be horizontal.`);
        }
        return {
          value: finiteAttribute(line, "data-viz-value"),
          y: y1,
        };
      };
      return {
        dedicatedState: {
          mode: "broken-line" as const,
          seriesBShift,
          seriesCount: 2 as const,
          values: dedicatedValues as [number, number, number, number],
        },
        flags: {
          seriesCoincident: graph.getAttribute("data-viz-series-coincident"),
          seriesMeansEqual: meanReadout.getAttribute("data-viz-series-means-equal"),
        },
        meanLines: { A: meanLineFor("A"), B: meanLineFor("B") },
        phase: options.phase,
        points: { A: pointsFor("A"), B: pointsFor("B") },
        seriesBShift,
        serializedDedicatedState: serializedState,
        segments: { A: segmentsFor("A"), B: segmentsFor("B") },
        tableRows,
        visibility: {
          graph: visibilityEvidence(graph),
          meanLines: {
            A: visibilityFor('[data-viz-name="series-mean"][data-viz-series="A"]'),
            B: visibilityFor('[data-viz-name="series-mean"][data-viz-series="B"]'),
          },
          meanReadout: visibilityEvidence(meanReadout),
          points: {
            A: visibilityFor('[data-viz-name="broken-line-series"][data-viz-series="A"] [data-viz-name="series-point"][data-viz-series="A"]'),
            B: visibilityFor('[data-viz-name="broken-line-series"][data-viz-series="B"] [data-viz-name="series-point"][data-viz-series="B"]'),
          },
          segments: {
            A: visibilityFor('[data-viz-name="broken-line-series"][data-viz-series="A"] [data-viz-name="adjacent-line-segment"][data-viz-series="A"]'),
            B: visibilityFor('[data-viz-name="broken-line-series"][data-viz-series="B"] [data-viz-name="adjacent-line-segment"][data-viz-series="B"]'),
          },
          table: visibilityEvidence(table),
          tableRows: visibilityFor('[data-viz-name="data-table-row"]'),
        },
      };
    }, { phase, visibilityGlobalName: effectiveVisibilityGlobalName });
    if (!observation) return;
    result.p6AveragesLineGraphObservations.push(observation);
    for (const issue of auditHkP6AveragesLineGraphObservation(observation)) {
      addFailure(
        result,
        "P6_AVERAGES_VISIBLE_MATH",
        `${phase}: ${issue}`,
        phase,
        '[data-viz-name="broken-line-graph"]',
        { observation },
      );
    }
  } catch (error) {
    addFailure(
      result,
      "P6_AVERAGES_VISIBLE_MATH",
      `${phase}: P6 two-series graph audit failed closed: ${errorMessage(error)}`,
      phase,
      '[data-viz-name="broken-line-graph"]',
    );
  }
}

function p6BudgetBoundaryForPhase(
  result: HkVisualizationCellResult,
  phase: string,
): HkP6BudgetBoundaryKind | null {
  const entry = result.stateScanLedger.entries.find(
    (candidate) => candidate.phase === phase,
  );
  if (!entry) return null;
  if (entry.reasons.includes("semantic-boundary:p6-budget-positive-remaining")) {
    return "positive-remaining";
  }
  if (entry.reasons.includes("semantic-boundary:p6-budget-exact-zero")) {
    return "exact-zero";
  }
  if (entry.reasons.includes("semantic-boundary:p6-budget-positive-overspend")) {
    return "positive-overspend";
  }
  return null;
}

async function auditHkP6BudgetBoundaryState(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  if (result.labId !== "p6-pre-secondary-problem-solving") return;
  const root = contractLocator(
    workspace,
    '[data-hk-viz-model="primary-dedicated-v1"][data-hk-viz-topic="p6-pre-secondary-problem-solving"]',
  );
  const boundary = p6BudgetBoundaryForPhase(result, phase);
  if (!boundary) return;
  try {
    if ((await root.count()) !== 1) {
      throw new Error("P6 budget lab must expose exactly one dedicated primary state owner.");
    }
    const observation = await root.evaluate((element, options) => {
      const serializedState = element.getAttribute("data-hk-viz-state");
      if (!serializedState?.trim()) {
        throw new Error("P6 budget state owner omitted data-hk-viz-state.");
      }
      const state = JSON.parse(serializedState) as Record<string, unknown>;
      if (
        state.workflowStep !== "represent"
        && state.workflowStep !== "solve"
        && state.workflowStep !== "check"
      ) {
        return null;
      }
      const numericState = {
        budget: state.budget,
        count: state.count,
        extraCost: state.extraCost,
        unitPrice: state.unitPrice,
      };
      if (Object.values(numericState).some(
        (value) => typeof value !== "number" || !Number.isFinite(value),
      )) {
        throw new Error("P6 budget dedicated state omitted one or more finite controls.");
      }
      const budget = numericState.budget as number;
      const count = numericState.count as number;
      const extraCost = numericState.extraCost as number;
      const unitPrice = numericState.unitPrice as number;
      const itemCost = count * unitPrice;
      const totalSpending = itemCost + extraCost;
      const remaining = budget - totalSpending;
      const withinBudget = remaining >= 0;
      const overspend = Math.max(0, -remaining);
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[options.visibilityGlobalName];
      if (!inspector) {
        throw new Error(
          `Missing HK effective-visibility inspector ${options.visibilityGlobalName}.`,
        );
      }
      const visibilityEvidence = (target: Element) => {
        const evidence = inspector(target);
        const style = getComputedStyle(target);
        const paintedLineVisible =
          target instanceof SVGLineElement
          && target.isConnected
          && target.getTotalLength() > 1
          && Number.parseFloat(style.strokeWidth) > 0
          && style.stroke !== "none"
          && Number.parseFloat(style.strokeOpacity || "1") > 0
          && !evidence.displayNoneAncestor
          && !evidence.visibilityHidden
          && evidence.effectiveOpacity > 0
          && !evidence.hiddenAncestor
          && !evidence.inertAncestor
          && !evidence.ariaHiddenAncestor;
        return {
          ariaHiddenAncestor: evidence.ariaHiddenAncestor,
          hiddenAncestor: evidence.hiddenAncestor,
          inertAncestor: evidence.inertAncestor,
          visuallyVisible: evidence.visuallyVisible || paintedLineVisible,
        };
      };
      const exactOne = (selector: string) => {
        const matches = element.querySelectorAll(selector);
        if (matches.length !== 1) {
          throw new Error(`${selector} expected exactly one element; observed ${matches.length}.`);
        }
        return matches[0];
      };
      const optionalOne = (selector: string) => {
        const matches = element.querySelectorAll(selector);
        if (matches.length > 1) {
          throw new Error(`${selector} expected at most one element; observed ${matches.length}.`);
        }
        return matches[0] ?? null;
      };
      const exactDescendant = (owner: Element, selector: string) => {
        const matches = owner.querySelectorAll(selector);
        if (matches.length !== 1) {
          throw new Error(`${selector} expected exactly one descendant; observed ${matches.length}.`);
        }
        return matches[0];
      };
      const finiteAttribute = (target: Element, attribute: string) => {
        const raw = target.getAttribute(attribute);
        const value = raw === null ? Number.NaN : Number(raw);
        if (!Number.isFinite(value)) {
          throw new Error(`${attribute} must be finite; observed ${String(raw)}.`);
        }
        return value;
      };
      const rectGeometry = (target: Element) => ({
        height: finiteAttribute(target, "height"),
        width: finiteAttribute(target, "width"),
        x: finiteAttribute(target, "x"),
        y: finiteAttribute(target, "y"),
      });
      const common = {
        boundary: options.boundary,
        dedicatedState: {
          budget,
          count,
          extraCost,
          unitPrice,
          workflowStep: state.workflowStep,
        },
        derived: { itemCost, overspend, remaining, totalSpending, withinBudget },
        phase: options.phase,
        serializedDedicatedState: serializedState,
      } as const;
      if (state.workflowStep === "represent") {
        const surface = exactOne('[data-viz-name="bar-model"]');
        const comparisonScale = exactOne('[data-viz-name="comparison-scale"]');
        const item = exactOne('[data-viz-name="bar-items-segment"]');
        const extra = exactOne('[data-viz-name="bar-extra-segment"]');
        const marker = exactOne('[data-viz-name="budget-marker"]');
        const remainderOwner = optionalOne('[data-viz-name="bar-remainder"]');
        const remainder = remainderOwner
          ? exactDescendant(remainderOwner, '[data-viz-name="bar-remainder-segment"]')
          : null;
        const overBudget = optionalOne('[data-viz-name="bar-over-budget"]');
        return {
          ...common,
          surface: {
            attributes: {
              budget: finiteAttribute(surface, "data-viz-budget"),
              extraCost: finiteAttribute(surface, "data-viz-extra-cost"),
              itemCost: finiteAttribute(surface, "data-viz-item-cost"),
              overspend: finiteAttribute(surface, "data-viz-overspend"),
              remaining: finiteAttribute(surface, "data-viz-remaining"),
              scaleTotal: finiteAttribute(surface, "data-viz-scale-total"),
              totalSpending: finiteAttribute(surface, "data-viz-total-spending"),
              withinBudget: surface.getAttribute("data-viz-within-budget"),
            },
            geometry: {
              comparisonScale: rectGeometry(comparisonScale),
              extra: rectGeometry(extra),
              item: rectGeometry(item),
              marker: {
                budget: finiteAttribute(marker, "data-viz-budget"),
                x1: finiteAttribute(marker, "x1"),
                x2: finiteAttribute(marker, "x2"),
                y1: finiteAttribute(marker, "y1"),
                y2: finiteAttribute(marker, "y2"),
              },
              overspend: overBudget ? {
                ...rectGeometry(overBudget),
                overspend: finiteAttribute(overBudget, "data-viz-overspend"),
              } : null,
              remainder: remainder && remainderOwner ? {
                ...rectGeometry(remainder),
                remaining: finiteAttribute(remainderOwner, "data-viz-remaining"),
              } : null,
            },
            kind: "represent" as const,
            visibility: {
              comparisonScale: visibilityEvidence(comparisonScale),
              extra: visibilityEvidence(extra),
              item: visibilityEvidence(item),
              marker: visibilityEvidence(marker),
              overspend: overBudget ? visibilityEvidence(overBudget) : null,
              remainder: remainder ? visibilityEvidence(remainder) : null,
              surface: visibilityEvidence(surface),
            },
          },
        };
      }
      if (state.workflowStep === "solve") {
        const surface = exactOne('[data-viz-name="calculation-chain"]');
        const result = exactOne('[data-viz-name="calculation-result"]');
        const resultCard = exactDescendant(result, '[data-viz-overlap-member="mark"]');
        return {
          ...common,
          surface: {
            kind: "solve" as const,
            result: {
              ...rectGeometry(resultCard),
              kind: result.getAttribute("data-viz-result-kind"),
              overspend: finiteAttribute(result, "data-viz-overspend"),
              remaining: finiteAttribute(result, "data-viz-remaining"),
              totalSpending: finiteAttribute(result, "data-viz-total-spending"),
              value: finiteAttribute(result, "data-viz-result-value"),
              withinBudget: result.getAttribute("data-viz-within-budget"),
            },
            visibility: {
              result: visibilityEvidence(resultCard),
              surface: visibilityEvidence(surface),
            },
          },
        };
      }
      const surface = exactOne('[data-viz-name="check-balance"]');
      const beam = exactOne('[data-viz-name="check-balance-beam"]');
      const leftOwner = exactOne('[data-viz-name="check-left-card"]');
      const rightOwner = exactOne('[data-viz-name="check-right-card"]');
      const leftCard = exactDescendant(leftOwner, '[data-viz-overlap-member="mark"]');
      const rightCard = exactDescendant(rightOwner, '[data-viz-overlap-member="mark"]');
      return {
        ...common,
        surface: {
          balance: {
            left: finiteAttribute(surface, "data-viz-left"),
            overspend: finiteAttribute(surface, "data-viz-overspend"),
            remaining: finiteAttribute(surface, "data-viz-remaining"),
            right: finiteAttribute(surface, "data-viz-right"),
            status: surface.getAttribute("data-viz-status"),
            totalSpending: finiteAttribute(surface, "data-viz-total-spending"),
            withinBudget: surface.getAttribute("data-viz-within-budget"),
          },
          geometry: {
            beam: {
              x1: finiteAttribute(beam, "x1"),
              x2: finiteAttribute(beam, "x2"),
              y1: finiteAttribute(beam, "y1"),
              y2: finiteAttribute(beam, "y2"),
            },
            leftCard: rectGeometry(leftCard),
            rightCard: rectGeometry(rightCard),
          },
          kind: "check" as const,
          visibility: {
            beam: visibilityEvidence(beam),
            leftCard: visibilityEvidence(leftCard),
            rightCard: visibilityEvidence(rightCard),
            surface: visibilityEvidence(surface),
          },
        },
      };
    }, {
      boundary,
      phase,
      visibilityGlobalName: effectiveVisibilityGlobalName,
    });
    if (!observation) return;
    result.p6BudgetBoundaryObservations.push(observation);
    for (const issue of auditHkP6BudgetBoundaryObservation(observation)) {
      addFailure(
        result,
        "P6_BUDGET_VISIBLE_MATH",
        `${phase}: ${issue}`,
        phase,
        '[data-hk-viz-topic="p6-pre-secondary-problem-solving"]',
        { observation },
      );
    }
  } catch (error) {
    addFailure(
      result,
      "P6_BUDGET_VISIBLE_MATH",
      `${phase}: P6 budget audit failed closed: ${errorMessage(error)}`,
      phase,
      '[data-hk-viz-topic="p6-pre-secondary-problem-solving"]',
    );
  }
}

async function auditInteractiveState(
  workspace: Locator,
  result: HkVisualizationCellResult,
  deadline: CellDeadline,
  phase: string,
) {
  recordHkVisualizationScrollObservationPhase(
    result.scrollObservationPhasePlan,
    phase,
  );
  if (!hasCellTime(deadline, 750)) {
    addFailure(
      result,
      "CELL_DEADLINE",
      `State audit ${phase} exhausted the cell deadline.`,
      phase,
    );
    return null;
  }
  const oracleObservation =
    await auditHkVisualizationPassThroughOracleState(workspace, result, phase);
  await auditHkP6AveragesLineGraphState(workspace, result, phase);
  await auditHkP6BudgetBoundaryState(workspace, result, phase);
  try {
    const containers =
      await discoverHkVisualizationEducationalScrollContainers(workspace);
    const schedule = [
      {
        observationId: "all-start",
        position: "all-start" as const,
        targetContainerKey: null,
      },
      ...containers.flatMap(({ containerKey }) => [
        {
          observationId: `${containerKey}:mid`,
          position: "mid" as const,
          targetContainerKey: containerKey,
        },
        {
          observationId: `${containerKey}:end`,
          position: "end" as const,
          targetContainerKey: containerKey,
        },
      ]),
    ];
    const observations: HkVisualizationScrollObservation[] = [];
    for (const planned of schedule) {
      if (!hasCellTime(deadline, 750))
        throw new Error(
          `Scroll observation ${planned.observationId} exhausted the cell deadline.`,
        );
      const positioned =
        await positionHkVisualizationEducationalScrollContainers(
          workspace,
          containers,
          planned.targetContainerKey,
          planned.position,
        );
      const observationPhase =
        planned.position === "all-start"
          ? phase
          : `${phase}:scroll:${planned.observationId}`;
      let audited: HkVisualizationScrollAuditOutcome;
      try {
        audited = await auditOneScrollObservation(
          workspace,
          result,
          observationPhase,
        );
      } finally {
        // Every observation restores every known scrollport to the deterministic
        // start before the next observation, even when an audit fails.
      }
      const restored =
        await restoreHkVisualizationEducationalScrollContainers(
          workspace,
          containers,
        );
      observations.push(
        Object.freeze({
          audits: audited.audits,
          observationId: planned.observationId,
          position: planned.position,
          positions: Object.freeze(
            positioned.map((positionEvidence, index) => ({
              ...positionEvidence,
              restoreReachedScrollLeft: restored[index]?.reachedScrollLeft ?? -1,
              restoreSucceeded:
                restored[index]?.containerKey === positionEvidence.containerKey &&
                Math.abs(restored[index]?.reachedScrollLeft ?? Infinity) <= 2,
            })) as HkVisualizationScrollObservation["positions"],
          ),
          positiveEvidenceCounts: audited.positiveEvidenceCounts,
          targetContainerKey: planned.targetContainerKey,
        }),
      );
    }
    const observationSet = buildHkVisualizationScrollObservationSet({
      containers,
      observations,
    });
    result.scrollObservationSets.push(Object.freeze({ observationSet, phase }));
  } catch (error) {
    await discoverHkVisualizationEducationalScrollContainers(workspace)
      .then((containers) =>
        restoreHkVisualizationEducationalScrollContainers(workspace, containers),
      )
      .catch(() => undefined);
    addFailure(
      result,
      "SCROLL_POSITION_AUDIT",
      `State ${phase} scroll-position audit failed closed: ${errorMessage(error)}`,
      phase,
    );
  }
  return oracleObservation;
}

async function auditOneScrollObservation(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  const failureStart = result.failures.length;
  const layout = await auditLayout(workspace, result, phase);
  const collision = await auditCollisions(workspace, result, phase);
  let contrast: HkVisualizationContrastScanResult | null = null;
  try {
    contrast = await workspace.evaluate(scanHkVisualizationTextContrast, {
      authoringSelector: threeDAuthoringSelector,
    });
    if (contrast.checkedTextCount === 0 || !contrast.worst) {
      addFailure(
        result,
        "STATE_THEME_CONTRAST",
        `State ${phase} exposed no visible learner text for contrast evaluation.`,
        phase,
      );
    } else if (contrast.issues.length > 0) {
      addFailure(
        result,
        "STATE_THEME_CONTRAST",
        `State ${phase} text contrast failed (${contrast.issues.length}): ${contrast.issues
          .slice(0, 8)
          .map((issue) => issue.message)
          .join(" | ")}`,
        phase,
        undefined,
        {
          checkedTextCount: contrast.checkedTextCount,
          issues: contrast.issues,
          worst: contrast.worst,
        },
      );
    }
  } catch (error) {
    addFailure(
      result,
      "STATE_THEME_CONTRAST",
      `State ${phase} contrast scan failed closed: ${errorMessage(error)}`,
      phase,
    );
  }
  const controls = await workspace.evaluate(
    (root, options) => {
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[options.visibilityGlobalName];
      if (!inspector)
        throw new Error(
          `Missing HK effective-visibility inspector ${options.visibilityGlobalName}.`,
        );
      const learnerInteractive = (element: Element) => {
        const visibility = inspector(element);
        return (
          visibility.visuallyVisible &&
          !visibility.hiddenAncestor &&
          !visibility.inertAncestor &&
          !visibility.ariaHiddenAncestor &&
          !visibility.pointerEventsNone
        );
      };
      const rootRect = root.getBoundingClientRect();
      return Array.from(root.querySelectorAll(options.controlSelector)).flatMap(
        (element, index) => {
          const html = element as HTMLElement;
          const disabled =
            "disabled" in element &&
            Boolean((element as HTMLButtonElement).disabled);
          const visibility = inspector(element);
          const invisiblyTabbable =
            !disabled &&
            html.tabIndex >= 0 &&
            visibility.width > 0 &&
            visibility.height > 0 &&
            !visibility.displayNoneAncestor &&
            !visibility.visibilityHidden &&
            !visibility.inertAncestor;
          if (!visibility.visuallyVisible && !invisiblyTabbable) return [];
          const explicitTarget = element.closest("[data-viz-pointer-target]");
          const target = explicitTarget ?? element;
          const targetRect = target.getBoundingClientRect();
          const ownRect = element.getBoundingClientRect();
          const x = ownRect.left + ownRect.width / 2;
          const y = ownRect.top + ownRect.height / 2;
          const top =
            x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight
              ? document.elementFromPoint(x, y)
              : null;
          const description = `${element.tagName.toLowerCase()}[${index}] ${(element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 60)}`;
          const visibleEnabledControls = Array.from(
            target.querySelectorAll(options.controlSelector),
          ).filter((candidate) => {
            const candidateDisabled =
              "disabled" in candidate &&
              Boolean((candidate as HTMLButtonElement).disabled);
            return !candidateDisabled && learnerInteractive(candidate);
          });
          return [
            {
              ariaDisabled: html.getAttribute("aria-disabled") === "true",
              description,
              disabled,
              invisiblyTabbable,
              metrics: {
                areaRatio:
                  (targetRect.width * targetRect.height) /
                  Math.max(1, rootRect.width * rootRect.height),
                associatedLabel:
                  target instanceof HTMLLabelElement &&
                  (target.control === element || target.contains(element)),
                banned:
                  target === root ||
                  target.matches(
                    [
                      "[data-viz-active-lab-id]",
                      "[data-hk-viz-model]",
                      "[data-viz-configured-model]",
                      "[data-viz-surface]",
                      "[data-viz-panel-mode]",
                      "[data-viz-card]",
                      "[data-viz-card-body]",
                    ].join(","),
                  ),
                controlCount:
                  visibleEnabledControls.length +
                  (target === element &&
                  element.matches(options.controlSelector) &&
                  learnerInteractive(element)
                    ? 1
                    : 0),
                explicit: Boolean(explicitTarget),
                heightRatio: targetRect.height / Math.max(1, rootRect.height),
                self: target === element,
                widthRatio: targetRect.width / Math.max(1, rootRect.width),
              },
              ownHit: top === element || Boolean(top && element.contains(top)),
              ownRect: { height: ownRect.height, width: ownRect.width },
              targetHit: Boolean(top && target.contains(top)),
              targetRect: {
                height: targetRect.height,
                width: targetRect.width,
              },
              visibility,
            },
          ];
        },
      );
    },
    { controlSelector, visibilityGlobalName: effectiveVisibilityGlobalName },
  );
  if (controls.length === 0) {
    addFailure(
      result,
      "STATE_CONTROL_EVIDENCE_EMPTY",
      `State ${phase} exposed no visible or keyboard-reachable learner controls.`,
      phase,
    );
  }
  for (const control of controls) {
    if (!control.visibility.visuallyVisible) {
      if (control.invisiblyTabbable) {
        addFailure(
          result,
          "CONTROL_INVISIBLE_TABBABLE",
          `${control.description} is not visually visible but remains keyboard-tabbable.`,
          phase,
          control.description,
          control.visibility,
        );
      }
      continue;
    }
    if (!hkVisualizationVisibilityPasses(control.visibility, "interactive")) {
      addFailure(
        result,
        "CONTROL_NOT_LEARNER_EXPOSED",
        `${control.description} is visually present but hidden/inert/aria-hidden/pointer-blocked for learners.`,
        phase,
        control.description,
        control.visibility,
      );
    }
    const pointerIssues = hkVisualizationPointerTargetIssues(control.metrics);
    const effectiveRect =
      pointerIssues.length === 0 ? control.targetRect : control.ownRect;
    if (control.disabled || control.ariaDisabled) {
      addFailure(
        result,
        "CONTROL_DISABLED_STATE",
        `${control.description} is disabled in an exercised state.`,
        phase,
        control.description,
      );
    }
    if (pointerIssues.length > 0) {
      addFailure(
        result,
        "POINTER_TARGET_SCOPE",
        `${control.description} uses an invalid data-viz-pointer-target (${pointerIssues.join(", ")}).`,
        phase,
        control.description,
        control.metrics,
      );
    }
    if (effectiveRect.width < 44 || effectiveRect.height < 44) {
      addFailure(
        result,
        "CONTROL_TARGET_44",
        `${control.description} has a ${effectiveRect.width.toFixed(1)}×${effectiveRect.height.toFixed(1)} valid pointer target.`,
        phase,
        control.description,
      );
    }
    if (!(
      control.ownHit ||
      (pointerIssues.length === 0 && control.targetHit)
    )) {
      addFailure(
        result,
        "CONTROL_HIT_TARGET",
        `${control.description} is covered at its centre point.`,
        phase,
        control.description,
      );
    }
  }
  if (!layout || !collision || !contrast) {
    throw new Error(`${phase} omitted one or more visual audit snapshots.`);
  }
  if (result.failures.length !== failureStart) {
    throw new Error(
      `${phase} produced ${result.failures.length - failureStart} visual audit failure(s).`,
    );
  }
  const visibleControls = controls.filter(
    ({ visibility }) => visibility.visuallyVisible,
  );
  const layoutEvidence = Object.freeze({
    documentClientWidth: layout.documentClientWidth,
    documentScrollWidth: layout.documentScrollWidth,
    educationalScrollContainerCount:
      layout.educationalScrollContainerCount,
    inspectedCandidateCount: layout.inspectedCandidateCount,
    issueCount: layout.issues.length,
    learnerVisibleCandidateCount: layout.learnerVisibleCandidateCount,
    sectionClientWidth: layout.sectionClientWidth,
    sectionScrollWidth: layout.sectionScrollWidth,
  });
  const collisionEvidence = Object.freeze({
    candidatePairCounts: Object.freeze({ ...collision.candidatePairCounts }),
    canvasSurfaceCount: collision.canvasSurfaceCount,
    htmlTextFragmentCount: collision.htmlTextFragmentCount,
    inspectedCandidateCount: collision.inspectedCandidateCount,
    issueCount: collision.issues.length,
    learnerControlCount: collision.learnerControlCount,
    paintedMarkCount: collision.paintedMarkCount,
    svgSurfaceCount: collision.svgSurfaceCount,
    svgTextFragmentCount: collision.svgTextFragmentCount,
    totalCandidatePairCount: collision.totalCandidatePairCount,
    truncated: collision.truncated,
  });
  const contrastEvidence = Object.freeze({
    checkedTextCount: contrast.checkedTextCount,
    issueCount: contrast.issues.length,
    worstContrastRatio: contrast.worst?.contrastRatio ?? 0,
    worstRequiredRatio: contrast.worst?.requiredRatio ?? 0,
  });
  const controlVisibilityEvidence = Object.freeze({
    candidateCount: visibleControls.length,
    invisiblyTabbableCount: controls.filter(
      ({ invisiblyTabbable, visibility }) =>
        invisiblyTabbable && !visibility.visuallyVisible,
    ).length,
    issueCount: 0,
    learnerExposedCount: visibleControls.filter(({ visibility }) =>
      hkVisualizationVisibilityPasses(visibility, "interactive"),
    ).length,
  });
  const target44Evidence = Object.freeze({
    candidateCount: visibleControls.length,
    issueCount: 0,
    passingCount: visibleControls.filter((control) => {
      const pointerIssues = hkVisualizationPointerTargetIssues(control.metrics);
      const effectiveRect =
        pointerIssues.length === 0 ? control.targetRect : control.ownRect;
      return effectiveRect.width >= 44 && effectiveRect.height >= 44;
    }).length,
  });
  const hitTargetEvidence = Object.freeze({
    candidateCount: visibleControls.length,
    issueCount: 0,
    passingCount: visibleControls.filter((control) => {
      const pointerIssues = hkVisualizationPointerTargetIssues(control.metrics);
      return (
        control.ownHit ||
        (pointerIssues.length === 0 && control.targetHit)
      );
    }).length,
  });
  return Object.freeze({
    audits: Object.freeze({
      collision: passedScrollAuditReceipt("collision", collisionEvidence),
      contrast: passedScrollAuditReceipt("contrast", contrastEvidence),
      controlVisibility: passedScrollAuditReceipt(
        "controlVisibility",
        controlVisibilityEvidence,
      ),
      hitTarget: passedScrollAuditReceipt("hitTarget", hitTargetEvidence),
      layout: passedScrollAuditReceipt("layout", layoutEvidence),
      target44: passedScrollAuditReceipt("target44", target44Evidence),
    }),
    positiveEvidenceCounts: Object.freeze({
      collisionCandidates: collision.inspectedCandidateCount,
      contrastText: contrast.checkedTextCount,
      controlVisibilityCandidates: visibleControls.length,
      hitTargetCandidates: visibleControls.length,
      layoutCandidates: layout.inspectedCandidateCount,
      target44Candidates: visibleControls.length,
    }),
  });
}

async function auditLayout(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  try {
    const snapshot = await scanHkVisualizationLayout(workspace, phase);
    result.layout.push(snapshot);
    for (const issue of snapshot.issues) {
      addFailure(
        result,
        layoutFailureCode(issue.kind),
        issue.message,
        phase,
        issue.element,
        issue,
      );
    }
    return snapshot;
  } catch (error) {
    addFailure(result, "LAYOUT_AUDIT", errorMessage(error), phase);
    return null;
  }
}

async function auditCollisions(
  workspace: Locator,
  result: HkVisualizationCellResult,
  phase: string,
) {
  try {
    const snapshot = await scanHkVisualizationCollisions(workspace, phase);
    result.collisions.push(snapshot);
    for (const surfaceIssue of hkVisualizationSurfaceEvidenceIssues(snapshot)) {
      addFailure(
        result,
        surfaceIssue,
        surfaceIssue === "HK_CANVAS_SURFACE_UNSUPPORTED"
          ? `HK learner surface includes ${snapshot.canvasSurfaceCount} canvas renderer(s); the collision gate requires inspectable SVG geometry.`
          : "HK learner surface rendered no actual SVG surface.",
        phase,
        "[data-viz-surface]",
        {
          canvasSurfaceCount: snapshot.canvasSurfaceCount,
          svgSurfaceCount: snapshot.svgSurfaceCount,
        },
      );
    }
    for (const exemption of snapshot.overlapExemptions) {
      if (exemption.risk !== "explicit-narrow-pair") {
        const code =
          exemption.risk === "missing-reason"
            ? "OVERLAP_EXEMPTION_REASON_MISSING"
            : exemption.risk === "banned-owner"
              ? "OVERLAP_EXEMPTION_BANNED_OWNER"
              : "OVERLAP_EXEMPTION_TOO_BROAD";
        addFailure(
          result,
          code,
          `${exemption.owner} declares an invalid overlap exemption (${exemption.risk}; candidates=${exemption.candidateCount}, area=${exemption.areaRatio.toFixed(3)}).`,
          phase,
          exemption.owner,
          exemption,
        );
      }
    }
    if (snapshot.truncated) {
      addFailure(
        result,
        "COLLISION_AUDIT_TRUNCATED",
        "Collision evidence exceeded the 100-issue bound.",
        phase,
      );
    }
    for (const issue of snapshot.issues) {
      addFailure(
        result,
        collisionFailureCode(issue.kind),
        `${issue.first} overlaps ${issue.second}.`,
        phase,
        undefined,
        issue,
      );
    }
    return snapshot;
  } catch (error) {
    addFailure(result, "COLLISION_AUDIT", errorMessage(error), phase);
    return null;
  }
}

export async function scanHkVisualizationLayout(
  workspace: Locator,
  phase = "microfixture",
): Promise<HkVisualizationLayoutSnapshot> {
  return await workspace.evaluate(
    (root, scanOptions) => {
      const tolerance = 2;
      const svgTextLeafSelector =
        "svg text:not(:has(tspan, textPath)), svg tspan, svg textPath";
      const documentClientWidth = document.documentElement.clientWidth;
      const documentScrollWidth = document.documentElement.scrollWidth;
      const rootElement = root as HTMLElement;
      const sectionClientWidth = rootElement.clientWidth;
      const sectionScrollWidth = rootElement.scrollWidth;
      const issues: HkVisualizationLayoutIssue[] = [];

      const rounded = (rect: DOMRect): HkVisualizationRect => ({
        height: Math.round(rect.height * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
      });
      const describe = (element: Element) => {
        const text = (
          element.getAttribute("aria-label") ??
          element.textContent ??
          ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);
        const id = element.id ? `#${element.id}` : "";
        return `${element.tagName.toLowerCase()}${id}${text ? ` \"${text}\"` : ""}`;
      };
      type Inspector = (
        target: Element,
      ) => HkVisualizationEffectiveVisibilityEvidence;
      const inspector = (
        globalThis as unknown as Record<string, Inspector | undefined>
      )[scanOptions.visibilityGlobalName];
      if (!inspector)
        throw new Error(
          `Missing HK effective-visibility inspector ${scanOptions.visibilityGlobalName}.`,
        );
      const visible = (element: Element) => inspector(element).visuallyVisible;
      const learnerVisible = (element: Element) => {
        const visibility = inspector(element);
        return (
          visibility.visuallyVisible &&
          !visibility.hiddenAncestor &&
          !visibility.inertAncestor &&
          !visibility.ariaHiddenAncestor
        );
      };
      const explicitEducationalScrollSelector = [
        "[data-viz-scroll-container]",
        "[data-viz-pan-container]",
        "[data-viz-scroll-surface]",
        "[data-viz-formula-scroll-container]",
        "[data-viz-formula-scroll]",
      ].join(",");
      const containsEducationalScrollableContent = (element: Element) =>
        element.matches(explicitEducationalScrollSelector) ||
        element.matches("[data-viz-surface]") ||
        Boolean(
          element.querySelector(
            "[data-viz-surface], svg, [data-viz-formula], [data-viz-formula-value], math, .katex",
          ),
        );
      if (documentScrollWidth > documentClientWidth + tolerance) {
        issues.push({
          kind: "document-horizontal-overflow",
          message: `Document scrollWidth ${documentScrollWidth} exceeds clientWidth ${documentClientWidth}.`,
        });
      }
      const rootOverflowX = getComputedStyle(rootElement).overflowX;
      if (
        sectionScrollWidth > sectionClientWidth + tolerance &&
        !/auto|scroll/.test(rootOverflowX)
      ) {
        issues.push({
          element: describe(rootElement),
          kind: "section-horizontal-overflow",
          message: `Workspace scrollWidth ${sectionScrollWidth} exceeds clientWidth ${sectionClientWidth} with overflow-x ${rootOverflowX}.`,
        });
      }

      const educationalScrollContainers = [
        root,
        ...Array.from(root.querySelectorAll("*")),
      ].filter((element): element is HTMLElement => {
        if (!(element instanceof HTMLElement) || !learnerVisible(element))
          return false;
        const style = getComputedStyle(element);
        return (
          /auto|scroll/.test(style.overflowX) &&
          element.scrollWidth > element.clientWidth + tolerance &&
          containsEducationalScrollableContent(element)
        );
      });
      for (const container of educationalScrollContainers) {
        const containerVisibility = inspector(container);
        if (
          container.tabIndex < 0 ||
          containerVisibility.inertAncestor ||
          containerVisibility.hiddenAncestor ||
          containerVisibility.ariaHiddenAncestor
        ) {
          issues.push({
            element: describe(container),
            kind: "scroll-container-not-focusable",
            message: `${describe(container)} is an overflowing educational canvas but is not keyboard-focusable.`,
          });
        }

        const hintCandidates = [
          ...Array.from(
            container.querySelectorAll(
              "[data-viz-pan-hint], [data-viz-scroll-hint], [data-viz-overflow-hint]",
            ),
          ),
          ...Array.from(
            container.parentElement?.querySelectorAll(
              "[data-viz-pan-hint], [data-viz-scroll-hint], [data-viz-overflow-hint]",
            ) ?? [],
          ),
        ];
        const explicitHint = hintCandidates.find(learnerVisible);
        const nearbyTextHint = Array.from(
          container.parentElement?.querySelectorAll(
            "p, span, [role=note], [role=status]",
          ) ?? [],
        ).find(
          (element) =>
            learnerVisible(element) &&
            /swipe horizontally|scroll horizontally|pan (?:the )?(?:diagram|graph)|drag (?:the )?(?:diagram|graph) (?:left|right)|左右(?:滑動|滑动|捲動|滚动|拖動|拖动)|橫向捲動|横向滚动|拖動圖表|拖动图表/i.test(
              element.textContent ?? "",
            ),
        );
        if (!explicitHint && !nearbyTextHint) {
          issues.push({
            element: describe(container),
            kind: "scroll-container-pan-hint-missing",
            message: `${describe(container)} has horizontal educational content but no visible pan/scroll hint.`,
          });
        }

        const originalScrollLeft = container.scrollLeft;
        const maximumScrollLeft = container.scrollWidth - container.clientWidth;
        container.scrollLeft = maximumScrollLeft;
        const reachedScrollLeft = container.scrollLeft;
        const reachedEnd =
          Math.abs(reachedScrollLeft) >= maximumScrollLeft - tolerance;
        container.scrollLeft = originalScrollLeft;
        if (!reachedEnd) {
          issues.push({
            element: describe(container),
            kind: "scroll-container-unreachable",
            message: `${describe(container)} cannot reach its horizontal end (max=${maximumScrollLeft}, actual=${reachedScrollLeft}).`,
          });
        }
      }

      const intersectsViewport = (rect: {
        bottom: number;
        left: number;
        right: number;
        top: number;
      }) =>
        rect.right > tolerance &&
        rect.bottom > tolerance &&
        rect.left < innerWidth - tolerance &&
        rect.top < innerHeight - tolerance;
      const reachableViewport = (element: Element, rect: DOMRect) => {
        if (intersectsViewport(rect)) return true;
        const scrollTargets = new Set<Element>();
        let current = element.parentElement;
        while (current) {
          scrollTargets.add(current);
          current = current.parentElement;
        }
        if (document.scrollingElement)
          scrollTargets.add(document.scrollingElement);
        const originalScroll = Array.from(scrollTargets).map((target) => ({
          left: target.scrollLeft,
          target,
          top: target.scrollTop,
        }));
        const originalElementRect = element.getBoundingClientRect();
        // `scrollIntoView()` on an oversized text parent is insufficient: the
        // parent can intersect the current scrollport while the exact text
        // fragment being audited remains offscreen. Align the fragment itself
        // through every containing scroll target, nearest first.
        for (const target of scrollTargets) {
          const reachedElementRect = element.getBoundingClientRect();
          const deltaX = reachedElementRect.left - originalElementRect.left;
          const deltaY = reachedElementRect.top - originalElementRect.top;
          const candidate = {
            bottom: rect.bottom + deltaY,
            left: rect.left + deltaX,
            right: rect.right + deltaX,
            top: rect.top + deltaY,
          };
          const targetRect =
            target === document.scrollingElement
              ? { bottom: innerHeight, left: 0, right: innerWidth, top: 0 }
              : target.getBoundingClientRect();
          const horizontalAdjustment =
            candidate.left < targetRect.left + tolerance
              ? candidate.left - targetRect.left - tolerance
              : candidate.right > targetRect.right - tolerance
                ? candidate.right - targetRect.right + tolerance
                : 0;
          const verticalAdjustment =
            candidate.top < targetRect.top + tolerance
              ? candidate.top - targetRect.top - tolerance
              : candidate.bottom > targetRect.bottom - tolerance
                ? candidate.bottom - targetRect.bottom + tolerance
                : 0;
          target.scrollLeft += horizontalAdjustment;
          target.scrollTop += verticalAdjustment;
        }
        const reachedElementRect = element.getBoundingClientRect();
        const deltaX = reachedElementRect.left - originalElementRect.left;
        const deltaY = reachedElementRect.top - originalElementRect.top;
        const reachable = intersectsViewport({
          bottom: rect.bottom + deltaY,
          left: rect.left + deltaX,
          right: rect.right + deltaX,
          top: rect.top + deltaY,
        });
        for (const saved of originalScroll.reverse()) {
          saved.target.scrollLeft = saved.left;
          saved.target.scrollTop = saved.top;
        }
        return reachable;
      };
      const cssLength = (token: string, reference: number) => {
        const value = token.trim().toLowerCase();
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return null;
        if (value.endsWith("%")) return (parsed * reference) / 100;
        if (value === "0" || value.endsWith("px")) return parsed;
        return null;
      };
      const clipPathContainment = (
        element: Element,
        clipPath: string,
        candidateRect: DOMRect,
      ) => {
        const elementRect = element.getBoundingClientRect();
        const position = (
          token: string | undefined,
          reference: number,
          axis: "x" | "y",
        ) => {
          if (!token || token === "center") return reference / 2;
          if (token === (axis === "x" ? "left" : "top")) return 0;
          if (token === (axis === "x" ? "right" : "bottom")) return reference;
          return cssLength(token, reference);
        };
        const candidateCorners = [
          { x: candidateRect.left, y: candidateRect.top },
          { x: candidateRect.right, y: candidateRect.top },
          { x: candidateRect.right, y: candidateRect.bottom },
          { x: candidateRect.left, y: candidateRect.bottom },
        ];

        const insetMatch = /^inset\((.*)\)$/i.exec(clipPath.trim());
        if (insetMatch) {
          const insetBody = insetMatch[1].split(/\s+round\s+/i)[0].trim();
          const tokens = insetBody.split(/\s+/).filter(Boolean);
          if (tokens.length < 1 || tokens.length > 4)
            return { outside: true, supported: false };
          const expanded =
            tokens.length === 1
              ? [tokens[0], tokens[0], tokens[0], tokens[0]]
              : tokens.length === 2
                ? [tokens[0], tokens[1], tokens[0], tokens[1]]
                : tokens.length === 3
                  ? [tokens[0], tokens[1], tokens[2], tokens[1]]
                  : tokens;
          const top = cssLength(expanded[0], elementRect.height);
          const right = cssLength(expanded[1], elementRect.width);
          const bottom = cssLength(expanded[2], elementRect.height);
          const left = cssLength(expanded[3], elementRect.width);
          if (
            top === null ||
            right === null ||
            bottom === null ||
            left === null
          ) {
            return { outside: true, supported: false };
          }
          const clipRect = {
            bottom: elementRect.bottom - bottom,
            left: elementRect.left + left,
            right: elementRect.right - right,
            top: elementRect.top + top,
          };
          return {
            outside:
              candidateRect.left < clipRect.left - tolerance ||
              candidateRect.right > clipRect.right + tolerance ||
              candidateRect.top < clipRect.top - tolerance ||
              candidateRect.bottom > clipRect.bottom + tolerance,
            supported: true,
          };
        }

        const circleMatch = /^circle\((.*)\)$/i.exec(clipPath.trim());
        if (circleMatch) {
          const [rawRadius = "closest-side", rawPosition = "center"] =
            circleMatch[1].trim().split(/\s+at\s+/i);
          const positionTokens = rawPosition
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          const centerX = position(positionTokens[0], elementRect.width, "x");
          const centerY = position(
            positionTokens[1] ?? positionTokens[0],
            elementRect.height,
            "y",
          );
          if (centerX === null || centerY === null)
            return { outside: true, supported: false };
          const radiusToken = rawRadius.trim().toLowerCase();
          const radius =
            radiusToken === "closest-side"
              ? Math.min(
                  centerX,
                  elementRect.width - centerX,
                  centerY,
                  elementRect.height - centerY,
                )
              : radiusToken === "farthest-side"
                ? Math.max(
                    centerX,
                    elementRect.width - centerX,
                    centerY,
                    elementRect.height - centerY,
                  )
                : cssLength(
                    radiusToken,
                    radiusToken.endsWith("%")
                      ? Math.hypot(elementRect.width, elementRect.height) /
                          Math.SQRT2
                      : 1,
                  );
          if (radius === null || radius < 0)
            return { outside: true, supported: false };
          const absoluteCenter = {
            x: elementRect.left + centerX,
            y: elementRect.top + centerY,
          };
          return {
            outside: candidateCorners.some(
              (point) =>
                Math.hypot(
                  point.x - absoluteCenter.x,
                  point.y - absoluteCenter.y,
                ) >
                radius + tolerance,
            ),
            supported: true,
          };
        }

        const ellipseMatch = /^ellipse\((.*)\)$/i.exec(clipPath.trim());
        if (ellipseMatch) {
          const [rawRadii, rawPosition = "center"] = ellipseMatch[1]
            .trim()
            .split(/\s+at\s+/i);
          const radiusTokens = rawRadii.trim().split(/\s+/).filter(Boolean);
          const positionTokens = rawPosition
            .trim()
            .split(/\s+/)
            .filter(Boolean);
          const centerX = position(positionTokens[0], elementRect.width, "x");
          const centerY = position(
            positionTokens[1] ?? positionTokens[0],
            elementRect.height,
            "y",
          );
          const radiusX = cssLength(radiusTokens[0], elementRect.width);
          const radiusY = cssLength(
            radiusTokens[1] ?? radiusTokens[0],
            elementRect.height,
          );
          if (
            centerX === null ||
            centerY === null ||
            radiusX === null ||
            radiusY === null ||
            radiusX <= 0 ||
            radiusY <= 0
          ) {
            return { outside: true, supported: false };
          }
          const absoluteCenter = {
            x: elementRect.left + centerX,
            y: elementRect.top + centerY,
          };
          return {
            outside: candidateCorners.some(
              (point) =>
                ((point.x - absoluteCenter.x) / (radiusX + tolerance)) ** 2 +
                  ((point.y - absoluteCenter.y) / (radiusY + tolerance)) ** 2 >
                1,
            ),
            supported: true,
          };
        }

        const polygonMatch = /^polygon\((.*)\)$/i.exec(clipPath.trim());
        if (polygonMatch) {
          const entries = polygonMatch[1]
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
          if (
            entries[0]?.toLowerCase() === "evenodd" ||
            entries[0]?.toLowerCase() === "nonzero"
          )
            entries.shift();
          const points = entries.map((entry) => {
            const tokens = entry.split(/\s+/).filter(Boolean);
            const x = cssLength(tokens[0] ?? "", elementRect.width);
            const y = cssLength(tokens[1] ?? "", elementRect.height);
            return x === null || y === null
              ? null
              : { x: elementRect.left + x, y: elementRect.top + y };
          });
          if (points.length < 3 || points.some((point) => point === null))
            return { outside: true, supported: false };
          const polygon = points as Array<{ x: number; y: number }>;
          const crossSigns = polygon
            .map((point, index) => {
              const next = polygon[(index + 1) % polygon.length];
              const after = polygon[(index + 2) % polygon.length];
              return (
                (next.x - point.x) * (after.y - next.y) -
                (next.y - point.y) * (after.x - next.x)
              );
            })
            .filter((cross) => Math.abs(cross) > tolerance);
          const convex =
            crossSigns.every((cross) => cross > 0) ||
            crossSigns.every((cross) => cross < 0);
          if (!convex) return { outside: true, supported: false };
          const onSegment = (
            point: { x: number; y: number },
            start: { x: number; y: number },
            end: { x: number; y: number },
          ) => {
            const cross =
              (point.x - start.x) * (end.y - start.y) -
              (point.y - start.y) * (end.x - start.x);
            if (
              Math.abs(cross) >
              tolerance *
                Math.max(1, Math.hypot(end.x - start.x, end.y - start.y))
            )
              return false;
            return (
              point.x >= Math.min(start.x, end.x) - tolerance &&
              point.x <= Math.max(start.x, end.x) + tolerance &&
              point.y >= Math.min(start.y, end.y) - tolerance &&
              point.y <= Math.max(start.y, end.y) + tolerance
            );
          };
          const insidePolygon = (point: { x: number; y: number }) => {
            for (let index = 0; index < polygon.length; index += 1) {
              if (
                onSegment(
                  point,
                  polygon[index],
                  polygon[(index + 1) % polygon.length],
                )
              )
                return true;
            }
            let inside = false;
            for (
              let index = 0, previous = polygon.length - 1;
              index < polygon.length;
              previous = index, index += 1
            ) {
              const currentPoint = polygon[index];
              const previousPoint = polygon[previous];
              if (
                currentPoint.y > point.y !== previousPoint.y > point.y &&
                point.x <
                  ((previousPoint.x - currentPoint.x) *
                    (point.y - currentPoint.y)) /
                    (previousPoint.y - currentPoint.y) +
                    currentPoint.x
              )
                inside = !inside;
            }
            return inside;
          };
          return {
            outside: candidateCorners.some((point) => !insidePolygon(point)),
            supported: true,
          };
        }

        // DOM exposes no rendered path geometry for arbitrary path()/url()
        // clip paths. Fail closed instead of certifying text whose clipped paint
        // cannot be reduced to a supported basic shape.
        return { outside: true, supported: false };
      };

      const clipCandidates: Array<{
        description: string;
        element: Element;
        rect: DOMRect;
      }> = Array.from(
        root.querySelectorAll(
          `${scanOptions.controlSelector}, [data-viz-label], ${svgTextLeafSelector}`,
        ),
      )
        .filter(learnerVisible)
        .map((element) => ({
          description: describe(element),
          element,
          rect: element.getBoundingClientRect(),
        }));
      const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          return parent &&
            !parent.closest("svg") &&
            text &&
            learnerVisible(parent)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      });
      let clipTextIndex = 0;
      while (textWalker.nextNode()) {
        const node = textWalker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = (node.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60);
        for (const rect of Array.from(range.getClientRects())) {
          if (rect.width <= 1 || rect.height <= 1) continue;
          clipCandidates.push({
            description: `text[${clipTextIndex}] \"${text}\"`,
            element: parent,
            rect,
          });
        }
        clipTextIndex += 1;
      }
      for (const candidate of clipCandidates) {
        const { element, rect } = candidate;
        if (!reachableViewport(element, rect)) {
          issues.push({
            element: candidate.description,
            kind: "clipped-element",
            message: `${candidate.description} is wholly outside every reachable viewport.`,
            rect: rounded(rect),
          });
          continue;
        }
        let ancestor: Element | null = element;
        while (ancestor && root.contains(ancestor)) {
          const style = getComputedStyle(ancestor);
          const ancestorRect = ancestor.getBoundingClientRect();
          const clipsX = /hidden|clip/.test(style.overflowX);
          const clipsY = /hidden|clip/.test(style.overflowY);
          const outsideX =
            rect.left < ancestorRect.left - tolerance ||
            rect.right > ancestorRect.right + tolerance;
          const outsideY =
            rect.top < ancestorRect.top - tolerance ||
            rect.bottom > ancestorRect.bottom + tolerance;
          const clipContainment =
            style.clipPath !== "none"
              ? clipPathContainment(ancestor, style.clipPath, rect)
              : null;
          const outsideClipPath = clipContainment?.outside === true;
          if ((clipsX && outsideX) || (clipsY && outsideY) || outsideClipPath) {
            issues.push({
              ancestor: describe(ancestor),
              element: candidate.description,
              kind: "clipped-element",
              message: `${candidate.description} escapes clipping ancestor ${describe(ancestor)}${outsideClipPath ? ` with ${clipContainment?.supported ? "clip-path" : "unsupported clip-path"} ${JSON.stringify(style.clipPath)}` : ""}.`,
              rect: rounded(rect),
            });
            break;
          }
          ancestor = ancestor.parentElement;
        }
      }

      return {
        documentClientWidth,
        documentScrollWidth,
        educationalScrollContainerCount: educationalScrollContainers.length,
        inspectedCandidateCount: clipCandidates.length,
        issues: issues.slice(0, 100),
        learnerVisibleCandidateCount: clipCandidates.length,
        phase: scanOptions.phase,
        sectionClientWidth,
        sectionScrollWidth,
      };
    },
    {
      controlSelector,
      phase,
      visibilityGlobalName: effectiveVisibilityGlobalName,
    },
  );
}

async function visualizationFingerprint(workspace: Locator) {
  return await workspace.evaluate((root, globalName) => {
    type Inspector = (
      target: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const inspector = (
      globalThis as unknown as Record<string, Inspector | undefined>
    )[globalName];
    if (!inspector)
      throw new Error(
        `Missing HK effective-visibility inspector ${globalName}.`,
      );
    const learnerVisible = (element: Element) => {
      const visibility = inspector(element);
      return (
        visibility.visuallyVisible &&
        !visibility.hiddenAncestor &&
        !visibility.inertAncestor &&
        !visibility.ariaHiddenAncestor
      );
    };
    const dedicated =
      Array.from(root.querySelectorAll("[data-hk-viz-model]")).find(
        learnerVisible,
      ) ?? null;
    const threeD =
      Array.from(
        root.querySelectorAll(
          '[data-viz-surface][data-viz-renderer="three-r3f"]',
        ),
      ).find(learnerVisible) ?? null;
    const modelType = dedicated
      ? "dedicated-hk"
      : threeD
        ? "three-r3f"
        : "generic-configured";
    const selectors = dedicated
      ? [
          "[data-hk-viz-model]",
          "[data-viz-state-summary]",
          "[data-viz-mode-button]",
          "[data-viz-reset-model]",
          "input",
          "select",
        ].join(",")
      : threeD
        ? [
            '[data-viz-surface][data-viz-renderer="three-r3f"]',
            "[data-viz-manim-playback-toggle]",
            "[data-viz-manim-timeline-scrubber]",
            "[data-viz-three-reset-camera]",
          ].join(",")
        : [
            "[data-viz-state-summary]",
            "[data-viz-mode-button]",
            "[data-viz-reset-model]",
            "button",
            "input",
            "select",
            "textarea",
            "[role=slider]",
          ].join(",");
    const elements = Array.from(
      new Set([root, ...Array.from(root.querySelectorAll(selectors))]),
    ).filter(learnerVisible);
    return JSON.stringify(
      elements
        .map((element) => {
          const attributes = Array.from(element.attributes)
            .filter((attribute) => {
              if (
                [
                  "aria-pressed",
                  "aria-selected",
                  "aria-valuenow",
                  "max",
                  "min",
                  "name",
                  "step",
                  "type",
                ].includes(attribute.name)
              ) {
                return true;
              }
              if (modelType === "dedicated-hk") {
                return (
                  attribute.name.startsWith("data-hk-viz-") ||
                  attribute.name.startsWith("data-viz-mode-") ||
                  attribute.name.startsWith("data-viz-reset-")
                );
              }
              if (modelType === "three-r3f") {
                return [
                  "data-viz-canvas-ready",
                  "data-viz-manim-authoring-mode",
                  "data-viz-manim-camera-mode",
                  "data-viz-manim-playback-state",
                  "data-viz-manim-selected-scene-family",
                  "data-viz-renderer",
                ].includes(attribute.name);
              }
              return (
                attribute.name.startsWith("data-viz-mode-") ||
                attribute.name.startsWith("data-viz-reset-") ||
                attribute.name === "data-viz-state-summary"
              );
            })
            .filter(
              (attribute) =>
                attribute.name !== "data-viz-manim-timeline-elapsed-seconds",
            )
            .map((attribute) => [attribute.name, attribute.value])
            .sort(([left], [right]) => left.localeCompare(right));
          const includeText = element.matches(
            "[data-viz-state-summary], [data-viz-mode-button], [data-viz-reset-model]",
          );
          return {
            attributes,
            tag: element.tagName,
            text: includeText
              ? (element.textContent ?? "").replace(/\s+/g, " ").trim()
              : undefined,
            value:
              element instanceof HTMLInputElement ||
              element instanceof HTMLSelectElement ||
              element instanceof HTMLTextAreaElement
                ? element.value
                : undefined,
          };
        })
        .filter(
          (entry) =>
            entry.attributes.length > 0 ||
            entry.text !== undefined ||
            entry.value !== undefined,
        ),
    );
  }, effectiveVisibilityGlobalName);
}

async function sampleCanvasPixels(canvas: Locator) {
  return await canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 48;
    sample.height = 48;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context || source.width <= 0 || source.height <= 0) {
      return { nonTransparentPixels: 0, variance: 0 };
    }
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    const luminances: number[] = [];
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] <= 4) continue;
      luminances.push(
        0.2126 * pixels[index] +
          0.7152 * pixels[index + 1] +
          0.0722 * pixels[index + 2],
      );
    }
    if (luminances.length === 0)
      return { nonTransparentPixels: 0, variance: 0 };
    const mean =
      luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
    const variance =
      luminances.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      luminances.length;
    return {
      nonTransparentPixels: luminances.length,
      variance: Math.round(variance * 100) / 100,
    };
  });
}

async function verifyAuthenticatedHkStudent(page: Page, baseURL: string) {
  const response = await page.request.get(
    new URL(
      "/api/auth/session-state?includeLessonEntry=false",
      baseURL,
    ).toString(),
    { timeout: packageSetupTimeout },
  );
  if (!response.ok()) {
    throw new Error(
      `Session-state verification returned HTTP ${response.status()}.`,
    );
  }
  const payload = (await response.json()) as {
    user?: {
      curriculumProfile?: { region?: unknown };
      curriculumTrack?: unknown;
      role?: unknown;
    } | null;
  };
  if (payload.user?.role !== "student") {
    throw new Error(
      `Session-state role contract failed: expected student, received ${JSON.stringify(payload.user?.role)}.`,
    );
  }
  if (payload.user.curriculumTrack !== "HK") {
    throw new Error(
      `Session-state curriculumTrack contract failed: expected HK, received ${JSON.stringify(payload.user.curriculumTrack)}.`,
    );
  }
  if (payload.user.curriculumProfile?.region !== "HK") {
    throw new Error(
      `Session-state curriculum profile contract failed: expected region HK, received ${JSON.stringify(payload.user.curriculumProfile?.region)}.`,
    );
  }
}

export function buildAuthenticatedHkStudentVisualizationRoute(
  lab: FeaturedLabDefinition,
  routeKind: HkVisualizationCellResult["routeKind"],
) {
  if (routeKind === "premium-direct") {
    const route = buildVisualizationLabHref(lab, "HK");
    if (!route.startsWith(`${studentVisualizationToolsPath}/`)) {
      throw new Error(
        `Premium-direct lab ${lab.labId} did not resolve to a student topic path.`,
      );
    }
    return route;
  }
  const legacyRoute = buildVisualizationLabHref(lab, "HK");
  if (legacyRoute.startsWith(`${studentVisualizationToolsPath}/`)) {
    throw new Error(
      `Query lab ${lab.labId} unexpectedly resolved to a premium-direct path.`,
    );
  }
  const params = new URLSearchParams();
  params.set("grade", lab.grade);
  params.set("lab", lab.labId);
  return `${studentVisualizationToolsPath}?${params.toString()}`;
}

function assertFinalVisualizationRoute(
  actualUrl: string,
  baseURL: string,
  lab: FeaturedLabDefinition,
  routeKind: HkVisualizationCellResult["routeKind"],
) {
  const expected = new URL(
    buildAuthenticatedHkStudentVisualizationRoute(lab, routeKind),
    baseURL,
  );
  const actual = new URL(actualUrl);
  if (actual.origin !== new URL(baseURL).origin) {
    throw new Error(
      `Final route changed origin: expected ${new URL(baseURL).origin}, received ${actual.origin}.`,
    );
  }
  if (actual.pathname !== expected.pathname) {
    throw new Error(
      `Final ${routeKind} path mismatch: expected ${expected.pathname}, received ${actual.pathname}.`,
    );
  }
  if (actual.hash !== expected.hash) {
    throw new Error(
      `Final ${routeKind} hash mismatch: expected ${JSON.stringify(expected.hash)}, received ${JSON.stringify(actual.hash)}.`,
    );
  }
  const expectedParams = [...expected.searchParams.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  );
  const actualParams = [...actual.searchParams.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  );
  if (JSON.stringify(actualParams) !== JSON.stringify(expectedParams)) {
    throw new Error(
      `Final ${routeKind} params mismatch: expected ${JSON.stringify(expectedParams)}, received ${JSON.stringify(actualParams)}.`,
    );
  }
  if (actual.searchParams.get("grade") !== lab.grade) {
    throw new Error(
      `Final ${routeKind} route did not preserve grade=${lab.grade}.`,
    );
  }
  if (routeKind === "query") {
    if (actual.searchParams.has("track")) {
      throw new Error(
        "Final authenticated query route retained a redundant track parameter.",
      );
    }
    if (actual.searchParams.get("lab") !== lab.labId) {
      throw new Error(`Final query route did not preserve lab=${lab.labId}.`);
    }
  }
  if (routeKind === "premium-direct") {
    if (actual.searchParams.get("track") !== "HK") {
      throw new Error("Final premium-direct route did not preserve track=HK.");
    }
    if (actual.searchParams.has("lab")) {
      throw new Error(
        "Final premium-direct route duplicated its path lab ID in a lab query parameter.",
      );
    }
  }
}

function deadlineTimeout(deadline: CellDeadline, capMs: number, phase: string) {
  const remaining = deadline.expiresAt - Date.now();
  if (remaining <= 250) {
    throw new Error(
      `Cell deadline exhausted before ${phase} (${deadline.totalMs}ms total budget).`,
    );
  }
  return Math.max(250, Math.min(capMs, remaining));
}

function hasCellTime(deadline: CellDeadline, minimumMs: number) {
  return deadline.expiresAt - Date.now() >= minimumMs;
}

export function isExpectedHkVisualizationCancelledNextRscPrefetch(input: {
  expectedOrigin?: unknown;
  failureText?: unknown;
  headers?: unknown;
  method?: unknown;
  resourceType?: unknown;
  url?: unknown;
}) {
  if (
    typeof input.expectedOrigin !== "string" ||
    typeof input.failureText !== "string" ||
    typeof input.method !== "string" ||
    typeof input.resourceType !== "string" ||
    typeof input.url !== "string" ||
    !input.headers ||
    typeof input.headers !== "object" ||
    Array.isArray(input.headers)
  ) {
    return false;
  }
  if (
    !/^(?:net::ERR_ABORTED|NS_BINDING_ABORTED)$/iu.test(input.failureText) ||
    input.method !== "GET" ||
    input.resourceType !== "fetch"
  ) {
    return false;
  }
  const headers = input.headers as Record<string, unknown>;
  if (
    headers.rsc !== "1" ||
    headers["next-url"] !== studentVisualizationToolsPath
  ) {
    return false;
  }
  const browserOwnedFetchHeaderNames = [
    "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site",
  ] as const;
  const browserOwnedFetchHeaderCount = browserOwnedFetchHeaderNames.filter(
    (name) => headers[name] !== undefined,
  ).length;
  if (
    browserOwnedFetchHeaderCount !== 0 &&
    (
      browserOwnedFetchHeaderCount !== browserOwnedFetchHeaderNames.length ||
      headers["sec-fetch-dest"] !== "empty" ||
      headers["sec-fetch-mode"] !== "cors" ||
      headers["sec-fetch-site"] !== "same-origin"
    )
  ) {
    return false;
  }
  try {
    const url = new URL(input.url);
    return (
      url.origin === input.expectedOrigin &&
      /^\/student\/lessons\/[^/]+$/u.test(url.pathname) &&
      url.searchParams.getAll("_rsc").length === 1 &&
      Boolean(url.searchParams.get("_rsc")) &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

function installDiagnostics(page: Page, baseURL: string) {
  const diagnostics: HkVisualizationDiagnostic[] = [];
  const diagnosticLimit = 64;
  const expectedOrigin = new URL(baseURL).origin;
  let phase = "bootstrap";
  const requestPhases = new WeakMap<object, string>();
  const pushDiagnostic = (
    input: Parameters<typeof constructHkVisualizationDiagnostic>[0],
  ) => {
    const diagnostic = constructHkVisualizationDiagnostic(input);
    if (diagnostics.length < diagnosticLimit - 1) {
      diagnostics.push(diagnostic);
      return;
    }
    if (diagnostics.length === diagnosticLimit - 1) {
      diagnostics.push(constructHkVisualizationDiagnostic({
        kind: "console-error",
        message: "Diagnostic cardinality exceeded the bounded receipt limit.",
        phase: "diagnostics:cardinality",
        resourceType: "diagnostic-limit",
      }));
    }
  };
  const isSameOrigin = (url: string) => {
    try {
      return new URL(url).origin === expectedOrigin;
    } catch {
      return false;
    }
  };

  page.on("request", (request) => {
    requestPhases.set(request, phase);
  });
  page.on("response", (response) => {
    if (response.status() < 400 || !isSameOrigin(response.url())) return;
    const requestPhase = requestPhases.get(response.request()) ?? phase;
    pushDiagnostic({
      kind: "bad-response",
      message: `${response.status()} ${response.request().method()} ${safeUrl(response.url())}`,
      method: response.request().method(),
      phase: requestPhase,
      resourceType: response.request().resourceType(),
      status: response.status(),
      url: safeUrl(response.url()),
    });
  });
  page.on("requestfailed", (request) => {
    if (!isSameOrigin(request.url())) return;
    const failureText = request.failure()?.errorText ?? "unknown failure";
    const headers = request.headers();
    const isBrowserCancelledPrefetch =
      /(?:ERR_ABORTED|NS_BINDING_ABORTED)/i.test(failureText) &&
      (/prefetch/i.test(headers.purpose ?? "") ||
        /prefetch/i.test(headers["sec-purpose"] ?? "") ||
        headers["next-router-prefetch"] === "1" ||
        isExpectedHkVisualizationCancelledNextRscPrefetch({
          expectedOrigin,
          failureText,
          headers,
          method: request.method(),
          resourceType: request.resourceType(),
          url: request.url(),
        }));
    if (isBrowserCancelledPrefetch) return;
    const requestPhase = requestPhases.get(request) ?? phase;
    pushDiagnostic({
      kind: "request-failed",
      message: `${request.method()} ${safeUrl(request.url())} failure{${sanitizeHkVisualizationDiagnosticText(failureText)}}`,
      method: request.method(),
      phase: requestPhase,
      resourceType: request.resourceType(),
      url: safeUrl(request.url()),
    });
  });
  page.on("pageerror", (error) => {
    pushDiagnostic({
      kind: "page-error",
      message: `page-error{${sanitizeHkVisualizationDiagnosticText(error.message)}}`,
      phase,
    });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    pushDiagnostic({
      kind: "console-error",
      message: `console-error{${sanitizeHkVisualizationDiagnosticText(message.text())}}${message.location().url ? ` (${safeUrl(message.location().url)})` : ""}`,
      phase,
      resourceType: "console",
    });
  });

  return {
    issues: () => deduplicateDiagnostics(diagnostics).slice(0, diagnosticLimit),
    setPhase(nextPhase: string) {
      phase = Buffer.byteLength(nextPhase, "utf8") <= 768
        ? nextPhase
        : `phase{${sanitizeHkVisualizationDiagnosticText(nextPhase)}}`;
    },
  };
}

async function guardedCheck(
  result: HkVisualizationCellResult,
  code: string,
  phase: string,
  check: () => Promise<void>,
) {
  try {
    await check();
    return true;
  } catch (error) {
    addFailure(result, code, errorMessage(error), phase);
    return false;
  }
}

export const HK_VISUALIZATION_FAILURE_RECEIPT_LIMIT = 64 as const;

const HK_VISUALIZATION_TRUSTED_FAILURE_CODES = new Set<string>([
  "ACTIVE_LAB_EXACT",
  "CELL_DEADLINE",
  "CELL_UNCAUGHT",
  "CLIPPING_OVERFLOW",
  "COLLISION_AUDIT",
  "COLLISION_AUDIT_TRUNCATED",
  "CONSOLE_ERROR",
  "CONTROL_ACTIONABILITY",
  "CONTROL_BBOX",
  "CONTROL_COLLISION",
  "CONTROL_DISABLED_STATE",
  "CONTROL_HIT_TARGET",
  "CONTROL_INVISIBLE_TABBABLE",
  "CONTROL_LOCALIZED_NAME",
  "CONTROL_NOT_LEARNER_EXPOSED",
  "CONTROL_TARGET_44",
  "CONTROL_WORKSPACE_DETACHED",
  "COORDINATE_ADD",
  "COORDINATE_INPUTS",
  "DEPENDENT_TRANSITION_SEQUENCE",
  "DEPENDENT_TRANSITION_SEQUENCE_RECEIPT",
  "DIRECT_ROUTE",
  "DOCUMENT_HORIZONTAL_OVERFLOW",
  "DOM_TEXT_COLLISION",
  "EFFECTIVE_THEME_CONTRAST",
  "FINAL_ROUTE_CONTRACT",
  "HK_CANVAS_SURFACE_UNSUPPORTED",
  "HK_SVG_SURFACE_MISSING",
  "HTML_LANGUAGE",
  "HTML_THEME",
  "HTTP_ERROR_RESPONSE",
  "INTERACTION_SHORT_CIRCUIT",
  "LANGUAGE_SELECTION",
  "LAYOUT_AUDIT",
  "LOCALIZED_LAB_TEXT",
  "MANIFEST_CONTRACT_MISSING",
  "MANIFEST_CONTROL_INTERACTION",
  "MANIFEST_IDENTITY",
  "MANIFEST_MARK_PRESENT",
  "MANIFEST_MODE_GROUP",
  "MANIFEST_MODE_INTERACTION",
  "MANIFEST_MODELREADY",
  "MANIFEST_RESETREADY",
  "MANIFEST_STATEREADY",
  "MANIFEST_STATESUMMARYREADY",
  "MANIFEST_WORKSPACE",
  "OVERLAP_EXEMPTION_BANNED_OWNER",
  "OVERLAP_EXEMPTION_REASON_MISSING",
  "OVERLAP_EXEMPTION_TOO_BROAD",
  "P6_AVERAGES_BOUNDARY_RECEIPT",
  "P6_AVERAGES_VISIBLE_MATH",
  "P6_BUDGET_BOUNDARY_RECEIPT",
  "P6_BUDGET_VISIBLE_MATH",
  "PACKAGE_CELLS_DUPLICATE",
  "PACKAGE_CELLS_MISSING",
  "PACKAGE_SETUP",
  "PAGE_ERROR",
  "PANEL_READY",
  "PASS_THROUGH_MATH_ACTIVE_MODE",
  "PASS_THROUGH_MATH_AUDIT",
  "PASS_THROUGH_MATH_COMPATIBILITY_ALIAS",
  "PASS_THROUGH_MATH_EXACT_SELECTOR",
  "PASS_THROUGH_MATH_FORBIDDEN_CLAIM",
  "PASS_THROUGH_MATH_MATH_INVARIANT",
  "PASS_THROUGH_MATH_NAMED_VISIBLE_MARK",
  "PASS_THROUGH_MATH_REQUIRED_MATH_KEY",
  "PASS_THROUGH_MATH_RESET_STATE",
  "PASS_THROUGH_MATH_TOPIC_MODEL_IDENTITY",
  "PASS_THROUGH_MATH_UNEXPECTED_MATH_KEY",
  "PASS_THROUGH_MATH_VISIBLE_FORMULA",
  "PASS_THROUGH_RAW_STATE_RAW_IDENTITY",
  "PASS_THROUGH_RAW_STATE_RAW_JSON",
  "PASS_THROUGH_RAW_STATE_RAW_SELECTOR",
  "PASS_THROUGH_RAW_STATE_RAW_STATE_MISMATCH",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_ATTRIBUTE",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_FORMULA",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_GEOMETRY",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_MARK_COUNT",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_RAW_MISMATCH",
  "PASS_THROUGH_VISIBLE_MATH_VISIBLE_STATE_MISMATCH",
  "POINTER_TARGET_SCOPE",
  "RANGE_STATE_EXECUTION",
  "RANGE_STATE_PLAN",
  "READINESS_SHORT_CIRCUIT",
  "REQUEST_FAILED",
  "RESET_INTERACTION",
  "RESET_LOCALIZED_NAME",
  "RESET_MISSING",
  "RESET_PRECONDITION",
  "SCROLLER_CONTENT_UNREACHABLE",
  "SCROLLER_NOT_FOCUSABLE",
  "SCROLLER_PAN_HINT_MISSING",
  "SCROLL_POSITION_AUDIT",
  "SECTION_HORIZONTAL_OVERFLOW",
  "STATE_CONTROL_EVIDENCE_EMPTY",
  "STATE_SCAN_LEDGER",
  "STATE_THEME_CONTRAST",
  "SURFACE_PRESENT",
  "SVG_LABEL_COLLISION",
  "SVG_LABEL_MARK_COLLISION",
  "SVG_SURFACE_PRESENT",
  "TEXT_CONTROL_COLLISION",
  "TEXT_OCCLUSION",
  "THEME_SELECTION",
  "THREE_D_LEARNER_INTERACTION",
  "THREE_D_READY",
  "UNTRUSTED_FAILURE_CODE",
  "WORKSPACE_READY",
]);

export function sanitizeHkVisualizationFailureReceipt(
  code: string,
  message: string,
  phase?: string,
  selector?: string,
  details?: unknown,
) : HkVisualizationFailure {
  const safeCode = HK_VISUALIZATION_TRUSTED_FAILURE_CODES.has(code)
    ? code
    : "UNTRUSTED_FAILURE_CODE";
  return Object.freeze({
    code: safeCode,
    ...(details === undefined
      ? {}
      : { details: Object.freeze({ reason: "details-redacted" as const }) }),
    message: `failure-message{${sanitizeHkVisualizationDiagnosticText(message)}}`,
    ...(phase === undefined
      ? {}
      : { phase: `phase{${sanitizeHkVisualizationDiagnosticText(phase)}}` }),
    ...(selector === undefined
      ? {}
      : { selector: `selector{${sanitizeHkVisualizationDiagnosticText(selector)}}` }),
  });
}

export function appendBoundedHkVisualizationFailureReceipt(
  failures: HkVisualizationFailure[],
  code: string,
  message: string,
  phase?: string,
  selector?: string,
  details?: unknown,
) {
  if (failures.length >= HK_VISUALIZATION_FAILURE_RECEIPT_LIMIT) {
    failures.length = HK_VISUALIZATION_FAILURE_RECEIPT_LIMIT;
    failures[HK_VISUALIZATION_FAILURE_RECEIPT_LIMIT - 1] = Object.freeze({
      code: "FAILURE_RECEIPT_LIMIT",
      message: "Failure receipt cardinality exceeded the bounded 64-entry limit.",
      phase: "failure-receipt",
    });
    return;
  }
  const failure = sanitizeHkVisualizationFailureReceipt(
    code,
    message,
    phase,
    selector,
    details,
  );
  const key = `${failure.code}|${failure.phase ?? ""}|${failure.selector ?? ""}|${failure.message}`;
  if (
    failures.some(
      (candidate) =>
        `${candidate.code}|${candidate.phase ?? ""}|${candidate.selector ?? ""}|${candidate.message}` ===
        key,
    )
  )
    return;
  failures.push(failure);
}

function addFailure(
  result: HkVisualizationCellResult,
  code: string,
  message: string,
  phase?: string,
  selector?: string,
  details?: unknown,
) {
  appendBoundedHkVisualizationFailureReceipt(
    result.failures,
    code,
    message,
    phase,
    selector,
    details,
  );
}

function fatalCellResult(
  lab: FeaturedLabDefinition,
  regressionPackage: HkVisualizationPackage,
  failure: HkVisualizationFailure,
  interactionDepth: HkVisualizationInteractionDepth,
): HkVisualizationCellResult {
  const viewport = hkVisualizationViewports[regressionPackage.viewportId];
  const route = buildVisualizationLabHref(lab, "HK");
  return {
    actualFinalUrl: null,
    cellId: `${lab.grade}/${lab.labId}/${regressionPackage.viewportId}/${regressionPackage.language}/${regressionPackage.theme}`,
    collisions: [],
    contract: {
      activeLabExact: false,
      htmlLanguage: null,
      localizedText: null,
      manifest: {
        controlSelectorCount: 0,
        modeSelectorCount: 0,
        modelReady: false,
        resetReady: false,
        stateReady: false,
        stateSummaryReady: false,
      },
      panelReady: false,
      renderer: "unknown",
      surfaceCount: 0,
      threeDLearner: null,
      themeClassApplied: false,
      themeEvidence: null,
      visibleMarkCount: 0,
      workspaceReady: false,
    },
    controls: [],
    deadlineMs: hkVisualizationCellDeadlineMs(interactionDepth, lab.labId),
    diagnostics: [],
    failures: [failure],
    grade: lab.grade,
    interactions: [],
    labId: lab.labId,
    language: regressionPackage.language,
    layout: [],
    dependentTransitionSequenceObservations: [],
    p6BudgetBoundaryObservations: [],
    p6AveragesLineGraphObservations: [],
    passThroughOracleObservations: [],
    passThroughResetObservations: [],
    qaProfile: lab.qaProfile,
    readyMs: null,
    route,
    routeKind: lab.threeD?.premiumLaunch === true ? "premium-direct" : "query",
    scrollObservationPhasePlan: [],
    scrollObservationSets: [],
    status: "failed",
    stateScanLedger: emptyStateScanLedger(),
    templateId: lab.templateId,
    theme: regressionPackage.theme,
    viewport: { id: regressionPackage.viewportId, ...viewport },
  };
}

function parseBinaryFlag(
  name: string,
  value: string | undefined,
  defaultValue: boolean,
) {
  if (value === undefined) return defaultValue;
  if (value === "0") return false;
  if (value === "1") return true;
  throw new Error(`${name} must be 0 or 1; received ${JSON.stringify(value)}.`);
}

function parseCsvFilter<const T extends string>(
  name: string,
  rawValue: string | undefined,
  allowedValues: readonly T[],
  defaultValues: readonly T[],
): T[] {
  if (rawValue === undefined) return [...defaultValues];
  if (rawValue.trim() === "")
    throw new Error(`${name} was provided but is empty.`);
  const values = rawValue.split(",").map((value) => value.trim());
  if (values.some((value) => value === ""))
    throw new Error(`${name} contains an empty comma-separated value.`);
  const duplicates = values.filter(
    (value, index) => values.indexOf(value) !== index,
  );
  if (duplicates.length > 0)
    throw new Error(
      `${name} contains duplicate value(s): ${unique(duplicates).join(", ")}.`,
    );
  const allowed = new Set<string>(allowedValues);
  const unknown = values.filter((value) => !allowed.has(value));
  if (unknown.length > 0) {
    throw new Error(
      `${name} contains unknown value(s): ${unknown.join(", ")}. Allowed: ${allowedValues.join(", ")}.`,
    );
  }
  return values as T[];
}

function parseSingleValue<const T extends string>(
  name: string,
  rawValue: string | undefined,
  allowedValues: readonly T[],
  defaultValue: T,
): T {
  if (rawValue === undefined) return defaultValue;
  if (rawValue.trim() === "")
    throw new Error(`${name} was provided but is empty.`);
  if (!allowedValues.includes(rawValue as T)) {
    throw new Error(
      `${name} must be one of ${allowedValues.join(", ")}; received ${JSON.stringify(rawValue)}.`,
    );
  }
  return rawValue as T;
}

function cellIdFor(
  lab: FeaturedLabDefinition,
  regressionPackage: HkVisualizationPackage,
) {
  return `${lab.grade}/${lab.labId}/${regressionPackage.viewportId}/${regressionPackage.language}/${regressionPackage.theme}`;
}

function compareLabs(
  left: FeaturedLabDefinition,
  right: FeaturedLabDefinition,
) {
  return (
    compareGrades(left.grade, right.grade) ||
    left.labId.localeCompare(right.labId)
  );
}

function compareGrades(left: string, right: string) {
  return gradeRank(left) - gradeRank(right) || left.localeCompare(right);
}

function gradeRank(grade: string) {
  const match = /^(P|S)(\d+)$/.exec(grade);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return (match[1] === "P" ? 0 : 100) + Number(match[2]);
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function browserLocale(language: HkVisualizationLanguage) {
  if (language === "en") return "en-HK";
  if (language === "zh-Hans") return "zh-CN";
  return "zh-HK";
}

async function countEffectivelyVisible(
  locator: Locator,
  requirement: HkVisualizationVisibilityRequirement,
) {
  const count = await locator.count();
  let visible = 0;
  for (let index = 0; index < count; index += 1) {
    const evidence = await effectiveVisibility(locator.nth(index)).catch(
      () => null,
    );
    if (evidence && hkVisualizationVisibilityPasses(evidence, requirement))
      visible += 1;
  }
  return visible;
}

async function isModeActive(button: Locator) {
  const explicit = await button.getAttribute("data-viz-mode-active");
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return (await button.getAttribute("aria-pressed")) === "true";
}

async function describeLocator(locator: Locator, index: number) {
  return await locator
    .evaluate((element, itemIndex) => {
      const text = (
        element.getAttribute("aria-label") ??
        element.textContent ??
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const id = element.id ? `#${element.id}` : "";
      return `${element.tagName.toLowerCase()}${id}[${itemIndex}]${text ? ` \"${text}\"` : ""}`;
    }, index)
    .catch(() => `control[${index}]`);
}

async function accessibleControlText(locator: Locator) {
  return await locator.evaluate((element) =>
    (
      element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.textContent ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function roundedRect(rect: {
  height: number;
  width: number;
  x: number;
  y: number;
}): HkVisualizationRect {
  return {
    height: Math.round(rect.height * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    x: Math.round(rect.x * 10) / 10,
    y: Math.round(rect.y * 10) / 10,
  };
}

function failureFromError(
  code: string,
  error: unknown,
  phase: string,
): HkVisualizationFailure {
  return sanitizeHkVisualizationFailureReceipt(
    code,
    errorMessage(error),
    phase,
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function layoutFailureCode(kind: HkVisualizationLayoutIssue["kind"]) {
  if (kind === "document-horizontal-overflow")
    return "DOCUMENT_HORIZONTAL_OVERFLOW";
  if (kind === "section-horizontal-overflow")
    return "SECTION_HORIZONTAL_OVERFLOW";
  if (kind === "scroll-container-not-focusable")
    return "SCROLLER_NOT_FOCUSABLE";
  if (kind === "scroll-container-pan-hint-missing")
    return "SCROLLER_PAN_HINT_MISSING";
  if (kind === "scroll-container-unreachable")
    return "SCROLLER_CONTENT_UNREACHABLE";
  return "CLIPPING_OVERFLOW";
}

function collisionFailureCode(kind: HkVisualizationCollisionIssue["kind"]) {
  if (kind === "control-control") return "CONTROL_COLLISION";
  if (kind === "dom-text-text") return "DOM_TEXT_COLLISION";
  if (kind === "svg-label-label") return "SVG_LABEL_COLLISION";
  if (kind === "text-control") return "TEXT_CONTROL_COLLISION";
  if (kind === "text-occlusion") return "TEXT_OCCLUSION";
  return "SVG_LABEL_MARK_COLLISION";
}

function diagnosticCode(kind: HkVisualizationDiagnostic["kind"]) {
  if (kind === "bad-response") return "HTTP_ERROR_RESPONSE";
  if (kind === "request-failed") return "REQUEST_FAILED";
  if (kind === "page-error") return "PAGE_ERROR";
  return "CONSOLE_ERROR";
}

function safeUrl(value: string) {
  return sanitizeHkVisualizationDiagnosticUrl(value);
}

function deduplicateDiagnostics(diagnostics: HkVisualizationDiagnostic[]) {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = JSON.stringify(diagnostic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
