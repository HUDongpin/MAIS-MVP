import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type Request,
  type TestInfo,
} from "@playwright/test";
import {
  buildVisualizationLabHref,
  buildVisualizationSessionModuleId,
  visualizationLabSectionSelector,
} from "../../components/visualizations/visualizationDiagnostics";
import {
  mainlandSemanticallyVerifiedThreeDLabIds,
  visualizationLabCatalog,
  type FeaturedLabDefinition,
  type VisualizationTemplateId,
} from "../../data/visualizationLabs";
import {
  isPremiumThreeDLaunchLab,
  isStandardThreeDLab,
} from "../../components/visualizations/three/threeDSceneMath";
import { resolveConfiguredVisualizationSemanticModel } from "../../components/visualizations/configuredVisualizationSemanticModel";
import {
  configuredVisualizationCompositeLabIds,
  resolveConfiguredVisualizationCompositeStrands,
} from "../../components/visualizations/configuredVisualizationCompositeStrands";
import {
  formatConfiguredSemanticSecondaryDisplayValue,
  supportsConfiguredSemanticSecondaryDisplayProjection,
  configuredSemanticSecondaryFamilies,
} from "../../components/visualizations/ConfiguredSemanticSecondaryMarks";
import {
  configuredVisualizationSemanticCanonicalDynamicStateVectors,
  configuredVisualizationSemanticControlExecutionOrder,
  getConfiguredVisualizationSemanticControlContract,
  projectConfiguredVisualizationSemanticControlState,
  type ConfiguredVisualizationSemanticControlContract,
  type ConfiguredVisualizationSemanticSliderInput,
} from "../../components/visualizations/configuredVisualizationSemanticControls";
import { configuredSemanticPrimaryFamilies } from "../../components/visualizations/ConfiguredSemanticPrimaryMarks";
import {
  learningAnalyticsFlushRequestedEventName,
  learningAnalyticsOutboxStorageKey,
  unconfirmedLearningAnalyticsOutboxStorageKey,
} from "../../lib/learningAnalytics";
import { visualizationSessionOutboxUserStoragePrefix } from "../../lib/visualizationSessionOutbox";
import { formatNumber } from "../../lib/math";
import type { Language, TextbookPublisher, ThemeMode } from "../../types";
import { closeLearnerStartSetupIfVisible, uniqueSuffix } from "./helpers";
import { scanHkVisualizationTextContrast } from "./hk-visualization-text-contrast-scanner";
import {
  installHkVisualizationEffectiveVisibilityInspector,
  scanHkVisualizationCollisions,
} from "./hk-visualization-collision-scanner";
import {
  chinaVisualizationCollisionReceipt,
  chinaVisualizationCollisionSnapshotIssues,
  type ChinaVisualizationCollisionReceipt,
} from "./china-visualization-collision-receipt";
import {
  chinaVisualizationRangeStateExecutionMismatch,
  type ChinaVisualizationRangeStateExecutionMismatch,
  type ChinaVisualizationRangeStateExecutionPlan,
  type ChinaVisualizationRangeStateSignatureEntry,
} from "./china-visualization-range-state-execution";
import {
  buildChinaVisualizationStateBudgetManifest,
  validateChinaVisualizationStateBudgetManifest,
} from "./china-visualization-state-budget.mjs";
import {
  aggregateChinaVisualizationStateChunkReceipts,
  buildChinaVisualizationStateChunkPlan,
  createChinaVisualizationStateChunkReceipt,
  validateChinaVisualizationStateChunkPlan,
  validateChinaVisualizationStateChunkReceipts,
} from "./china-visualization-state-chunks.mjs";
import {
  chinaVisualizationTargetStateEvidenceSha256,
  parseChinaVisualizationTargetStateId,
  type ChinaVisualizationTargetState,
} from "./china-visualization-target-state";
import { exactFractionOperationInvariantIssue } from "./china-visualization-fraction-invariants";
import { buildChinaVisualizationReleasePartition } from "./china-visualization-release-partition";

/**
 * Mainland China Visualization Lab release gate.
 *
 * Selection and sharding are intentionally resolved while Playwright loads the
 * file, so `playwright test --list` is also a cheap manifest validation step.
 *
 * Supported environment variables:
 * - CHINA_VIZ_LANGUAGE=en|zh-Hans (default: zh-Hans)
 * - CHINA_VIZ_THEME=light|dark (default: light)
 * - CHINA_VIZ_VIEWPORT=WIDTHxHEIGHT (optional; otherwise use project viewport)
 * - CHINA_VIZ_PUBLISHERS=MAINLAND_PEP,MAINLAND_HJB,MAINLAND_BNU
 * - CHINA_VIZ_TEMPLATES=number-line,array-area,...
 * - CHINA_VIZ_LABS=comma-separated lab ids
 * - CHINA_VIZ_SHARD_INDEX=zero-based shard index (default: 0)
 * - CHINA_VIZ_SHARD_TOTAL=positive shard count (default: 1)
 *
 * Viewports come from the Playwright project. Run both `desktop-chrome` and
 * `mobile-chrome`, and run the gate once per supported language, for the full
 * bilingual/responsive matrix.
 */

type MainlandPublisher = Extract<
  TextbookPublisher,
  "MAINLAND_PEP" | "MAINLAND_HJB" | "MAINLAND_BNU"
>;

type MainlandLab = FeaturedLabDefinition & { publisher: MainlandPublisher };

type LabPackage = {
  id: string;
  labs: MainlandLab[];
  part: number;
  partTotal: number;
  publisher: MainlandPublisher;
  templateId: VisualizationTemplateId;
};

type FailureRecord = {
  issue: string;
  labId: string;
  state: string;
};

type FailureRecorder = (labId: string, state: string, issue: string) => void;

type RangeControl = {
  disabled: boolean;
  id: string;
  index: number;
  label: string;
  max: number;
  min: number;
  original: number;
  step: number;
};

type ActiveSemanticControlExpectation = {
  contract: ConfiguredVisualizationSemanticControlContract;
  family: string;
  mode: number;
  strandIndex: number | null;
  variant: string;
};

type VisualizationSignatures = {
  machine: string;
  visible: string;
};

type OverlapCarrierEvidence = {
  declaresException: boolean;
  name: string;
  owner: string;
  reason: string;
};

type OverlapPairDecision = {
  approved: boolean;
  diagnostic: string;
};

const learnerContrastAuthoringSelector = [
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

function resolveOverlapPairDecision(
  labelCarrier: OverlapCarrierEvidence | null,
  markCarrier: OverlapCarrierEvidence | null,
): OverlapPairDecision {
  const incompleteFields = (carrier: OverlapCarrierEvidence | null) => {
    if (!carrier) return ["carrier"];
    return [
      ...(carrier.owner.trim() ? [] : ["owner"]),
      ...(carrier.reason.trim() ? [] : ["reason"]),
    ];
  };
  const describe = (
    side: "label" | "mark",
    carrier: OverlapCarrierEvidence | null,
  ) => {
    if (!carrier) return `${side} carrier missing`;
    const missing = incompleteFields(carrier);
    return missing.length > 0
      ? `${side} carrier ${JSON.stringify(carrier.name)} missing ${missing.join(" and ")}`
      : `${side} carrier ${JSON.stringify(carrier.name)} owner=${JSON.stringify(carrier.owner.trim())}`;
  };

  const labelMissing = incompleteFields(labelCarrier);
  const markMissing = incompleteFields(markCarrier);
  if (
    !labelCarrier ||
    !markCarrier ||
    labelMissing.length > 0 ||
    markMissing.length > 0
  ) {
    return {
      approved: false,
      diagnostic: `Overlap exception unpaired: ${describe("label", labelCarrier)}; ${describe("mark", markCarrier)}.`,
    };
  }

  if (!labelCarrier?.declaresException && !markCarrier?.declaresException) {
    return {
      approved: false,
      diagnostic:
        `Overlap exception unpaired: neither ${describe("label", labelCarrier)} nor ` +
        `${describe("mark", markCarrier)} declares data-viz-overlap-ok.`,
    };
  }

  const labelOwner = labelCarrier.owner.trim();
  const markOwner = markCarrier.owner.trim();
  if (labelOwner !== markOwner) {
    return {
      approved: false,
      diagnostic:
        `Overlap exception owner mismatch: label owner=${JSON.stringify(labelOwner)}; ` +
        `mark owner=${JSON.stringify(markOwner)}.`,
    };
  }

  return {
    approved: true,
    diagnostic: `Paired overlap owner=${JSON.stringify(labelOwner)}.`,
  };
}

function assertOverlapPairingHelperContract() {
  const formulaBackground: OverlapCarrierEvidence = {
    declaresException: true,
    name: "semantic formula background",
    owner: "semantic-formula-card",
    reason: "intentional containment",
  };
  const formulaLabel: OverlapCarrierEvidence = {
    declaresException: false,
    name: "semantic formula",
    owner: "semantic-formula-card",
    reason: "intentional containment",
  };
  const sameOwner = resolveOverlapPairDecision(formulaLabel, formulaBackground);
  if (!sameOwner.approved) {
    throw new Error(
      "Overlap pairing helper must approve a complete, same-owner two-sided contract.",
    );
  }

  const oneSided = resolveOverlapPairDecision(null, formulaBackground);
  if (oneSided.approved || !/unpaired/i.test(oneSided.diagnostic)) {
    throw new Error(
      "Overlap pairing helper must reject and identify a one-sided carrier as unpaired.",
    );
  }

  const mismatched = resolveOverlapPairDecision(
    { ...formulaLabel, owner: "unrelated-label" },
    formulaBackground,
  );
  if (mismatched.approved || !/owner mismatch/i.test(mismatched.diagnostic)) {
    throw new Error(
      "Overlap pairing helper must reject and identify different owners.",
    );
  }

  const incomplete = resolveOverlapPairDecision(
    { ...formulaLabel, reason: "" },
    formulaBackground,
  );
  if (
    incomplete.approved ||
    !/unpaired/i.test(incomplete.diagnostic) ||
    !/reason/i.test(incomplete.diagnostic)
  ) {
    throw new Error(
      "Overlap pairing helper must reject an incomplete carrier with a precise diagnostic.",
    );
  }

  const noDeclaration = resolveOverlapPairDecision(formulaLabel, {
    ...formulaLabel,
    name: "semantic formula peer",
  });
  if (noDeclaration.approved || !/unpaired/i.test(noDeclaration.diagnostic)) {
    throw new Error(
      "Overlap pairing helper must require a paired explicit overlap declaration.",
    );
  }
}

assertOverlapPairingHelperContract();

type PendingTelemetryEvidence = {
  labId: string;
  method: string;
  startedAt: number;
  url: string;
};

type CompletedTelemetryEvidence = PendingTelemetryEvidence & {
  durationMs: number;
  failure: string | null;
  outcome: "finished" | "failed";
  status: number | null;
};

function isTrackedTelemetryRequest(
  method: string,
  url: string,
  baseOrigin: string,
) {
  if (method.toUpperCase() !== "POST") return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === new URL(baseOrigin).origin &&
      (parsed.pathname === "/api/learning-events" ||
        parsed.pathname === "/api/visualization-sessions")
    );
  } catch {
    return false;
  }
}

function formatTelemetryDrainTimeout(
  context: string,
  timeoutMs: number,
  pending: PendingTelemetryEvidence[],
) {
  const now = Date.now();
  const details = pending.map((request) => {
    let path = request.url;
    try {
      path = new URL(request.url).pathname;
    } catch {
      // Keep the original value in the diagnostic when URL parsing fails.
    }
    return (
      `${request.labId}: ${request.method.toUpperCase()} ${path} ` +
      `(pending ${Math.max(0, now - request.startedAt)}ms)`
    );
  });
  return (
    `Telemetry drain timed out after ${timeoutMs}ms during ${context}; ` +
    `pending request${pending.length === 1 ? "" : "s"}: ${details.join("; ")}.`
  );
}

function assertTelemetryHelperContract() {
  const baseOrigin = "http://127.0.0.1:3147";
  if (
    !isTrackedTelemetryRequest(
      "POST",
      `${baseOrigin}/api/learning-events`,
      baseOrigin,
    ) ||
    !isTrackedTelemetryRequest(
      "POST",
      `${baseOrigin}/api/visualization-sessions?source=lab`,
      baseOrigin,
    )
  ) {
    throw new Error(
      "Telemetry helper must track both same-origin POST endpoints.",
    );
  }
  if (
    isTrackedTelemetryRequest(
      "GET",
      `${baseOrigin}/api/learning-events`,
      baseOrigin,
    ) ||
    isTrackedTelemetryRequest("POST", `${baseOrigin}/api/other`, baseOrigin) ||
    isTrackedTelemetryRequest(
      "POST",
      "https://unrelated.example/api/visualization-sessions",
      baseOrigin,
    )
  ) {
    throw new Error(
      "Telemetry helper must not track GET, unrelated paths, or cross-origin requests.",
    );
  }

  const timeout = formatTelemetryDrainTimeout(
    "before navigation to lab-b",
    4_000,
    [
      {
        labId: "lab-a",
        method: "POST",
        startedAt: 1_000,
        url: `${baseOrigin}/api/learning-events`,
      },
    ],
  );
  if (
    !timeout.includes("before navigation to lab-b") ||
    !timeout.includes("4000ms") ||
    !timeout.includes("lab-a") ||
    !timeout.includes("POST /api/learning-events")
  ) {
    throw new Error(
      "Telemetry timeout diagnostic must preserve context, bound, endpoint, and originating Lab.",
    );
  }
}

assertTelemetryHelperContract();

const mainlandTracks = new Set<FeaturedLabDefinition["curriculumTrack"]>([
  "MAINLAND_PEP_PRIMARY",
  "MAINLAND_PEP_JUNIOR",
  "MAINLAND_PEP_HIGH",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
]);
const mainlandPublishers = [
  "MAINLAND_PEP",
  "MAINLAND_HJB",
  "MAINLAND_BNU",
] as const;
const packageSize = 8;
const configuredPort = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const configuredBaseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${configuredPort}`;
const configuredBaseOrigin = new URL(configuredBaseUrl).origin;
const telemetryDrainTimeoutMs = 4_000;
const throttledDeliveryQuietWindowMs = 1_250;
const language = parseLanguage(process.env.CHINA_VIZ_LANGUAGE);
const theme = parseTheme(process.env.CHINA_VIZ_THEME);
const viewportOverride = parseViewport(process.env.CHINA_VIZ_VIEWPORT);
const titleViewport = viewportOverride?.label ?? "project-configured";
const publisherFilter = envSet("CHINA_VIZ_PUBLISHERS");
const templateFilter = envSet("CHINA_VIZ_TEMPLATES");
const labFilter = envSet("CHINA_VIZ_LABS");
const shardTotal = positiveIntegerEnv("CHINA_VIZ_SHARD_TOTAL", 1);
const shardIndex = nonNegativeIntegerEnv("CHINA_VIZ_SHARD_INDEX", 0);

if (shardIndex >= shardTotal) {
  throw new Error(
    `CHINA_VIZ_SHARD_INDEX must be zero-based and smaller than CHINA_VIZ_SHARD_TOTAL; received ${shardIndex}/${shardTotal}.`,
  );
}

const mainlandCandidates = visualizationLabCatalog.filter((lab) =>
  mainlandTracks.has(lab.curriculumTrack),
);
const invalidPublisherLabs = mainlandCandidates.filter(
  (lab) => !isMainlandPublisher(lab.publisher),
);
if (invalidPublisherLabs.length > 0) {
  throw new Error(
    `Mainland visualization catalog entries need an explicit Mainland publisher: ${invalidPublisherLabs
      .map((lab) => lab.labId)
      .join(", ")}.`,
  );
}

const allMainlandLabs = mainlandCandidates as MainlandLab[];
if (allMainlandLabs.length !== 335) {
  throw new Error(
    `Expected the approved 335-lab Mainland catalog, found ${allMainlandLabs.length}.`,
  );
}
const releasePartition = buildChinaVisualizationReleasePartition({
  catalogLabIds: allMainlandLabs.map((lab) => lab.labId),
});
const genericMainlandLabIdSet = new Set(releasePartition.genericLabIds);
const genericMainlandLabs = allMainlandLabs.filter((lab) =>
  genericMainlandLabIdSet.has(lab.labId),
);
if (genericMainlandLabs.length !== 301) {
  throw new Error(
    `Expected the generic Mainland release partition to contain 301 labs, found ${genericMainlandLabs.length}.`,
  );
}

const implementedSemanticFamilies = new Set<string>([
  ...configuredSemanticPrimaryFamilies,
  ...configuredSemanticSecondaryFamilies,
]);
const resolvedSemanticFamilies = new Set(
  genericMainlandLabs.map(
    (lab) => resolveConfiguredVisualizationSemanticModel(lab).semanticFamily,
  ),
);
if (
  implementedSemanticFamilies.size !== 74 ||
  resolvedSemanticFamilies.size !== 73 ||
  [...resolvedSemanticFamilies].some(
    (family) => !implementedSemanticFamilies.has(family),
  )
) {
  throw new Error(
    `Generic Mainland semantic renderer coverage must resolve exactly 73 of the 74 implemented configured families; resolved=${resolvedSemanticFamilies.size}, implemented=${implementedSemanticFamilies.size}.`,
  );
}
if (configuredVisualizationCompositeLabIds.length !== 37) {
  throw new Error(
    `Expected exact strand plans for 32 composite and 5 catalog-scope labs, found ${configuredVisualizationCompositeLabIds.length}.`,
  );
}

for (const lab of genericMainlandLabs) {
  const semanticModel = resolveConfiguredVisualizationSemanticModel(lab);
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const expectsExternalPlan =
    semanticModel.semanticFamily === "composite-split" ||
    semanticModel.semanticFamily === "catalog-scope";

  if (expectsExternalPlan !== Boolean(strands)) {
    throw new Error(
      `${lab.labId}: semantic family ${semanticModel.semanticFamily} and its exact composite strand plan disagree.`,
    );
  }

  const activeTargets = strands ?? [
    { family: semanticModel.semanticFamily, variant: semanticModel.variant },
  ];
  for (const target of activeTargets) {
    const initialContract = getConfiguredVisualizationSemanticControlContract(
      target.family,
      target.variant,
      0,
    );
    if (!initialContract) {
      throw new Error(
        `${lab.labId}: no learner control contract for active family ${target.family}/${target.variant}.`,
      );
    }
    const activeModes =
      initialContract.modes.length > 0
        ? initialContract.modes.map(({ value }) => value)
        : [0];
    for (const activeMode of activeModes) {
      const contract = getConfiguredVisualizationSemanticControlContract(
        target.family,
        target.variant,
        activeMode,
      );
      if (
        !contract ||
        contract.family !== target.family ||
        contract.externalPlan
      ) {
        throw new Error(
          `${lab.labId}: active family ${target.family}/${target.variant}/mode=${activeMode} resolved to a non-operative learner control contract.`,
        );
      }
    }
  }
}

const registeredMainlandThreeDCandidates = genericMainlandLabs.filter(
  (lab) =>
    isPremiumThreeDLaunchLab(lab.labId) || isStandardThreeDLab(lab.labId),
);
const activeMainlandThreeD = registeredMainlandThreeDCandidates.filter(
  (lab) => lab.threeD?.enabled === true || lab.threeD?.premiumLaunch === true,
);
const downgradedMainlandThreeD = registeredMainlandThreeDCandidates.filter(
  (lab) => lab.threeD?.enabled === false && lab.threeD?.premiumLaunch === false,
);
if (registeredMainlandThreeDCandidates.length !== 52) {
  throw new Error(
    `Expected 52 registered Mainland 3D candidates, found ${registeredMainlandThreeDCandidates.length}.`,
  );
}
if (
  activeMainlandThreeD.length !== 0 ||
  activeMainlandThreeD
    .map((lab) => lab.labId)
    .sort()
    .join("\n") !==
    [...mainlandSemanticallyVerifiedThreeDLabIds].sort().join("\n")
) {
  throw new Error(
    `Mainland live 3D metadata must match the empty post-audit verified set; received ${activeMainlandThreeD
      .map((lab) => lab.labId)
      .join(", ")}.`,
  );
}
if (downgradedMainlandThreeD.length !== 52) {
  throw new Error(
    `Expected all 52 Mainland 3D candidates to remain semantically downgraded, found ${downgradedMainlandThreeD.length}.`,
  );
}

const duplicateLabIds = duplicateValues(
  allMainlandLabs.map((lab) => lab.labId),
);
if (duplicateLabIds.length > 0) {
  throw new Error(
    `Mainland visualization lab ids must be unique: ${duplicateLabIds.join(", ")}.`,
  );
}

assertKnownFilter(
  "CHINA_VIZ_PUBLISHERS",
  publisherFilter,
  new Set(mainlandPublishers),
);
assertKnownFilter(
  "CHINA_VIZ_TEMPLATES",
  templateFilter,
  new Set(genericMainlandLabs.map((lab) => lab.templateId)),
);
assertKnownFilter(
  "CHINA_VIZ_LABS",
  labFilter,
  new Set(genericMainlandLabs.map((lab) => lab.labId)),
);

const selectedLabs = genericMainlandLabs.filter(
  (lab) =>
    (publisherFilter.size === 0 || publisherFilter.has(lab.publisher)) &&
    (templateFilter.size === 0 || templateFilter.has(lab.templateId)) &&
    (labFilter.size === 0 || labFilter.has(lab.labId)),
);
const isFullGenericSelection =
  publisherFilter.size === 0 &&
  templateFilter.size === 0 &&
  labFilter.size === 0 &&
  selectedLabs.length === genericMainlandLabs.length;

if (selectedLabs.length === 0) {
  throw new Error(
    "No generic Mainland visualization labs match the configured CHINA_VIZ_* filters.",
  );
}

const allPackages = buildLabPackages(selectedLabs);
if (isFullGenericSelection && allPackages.length !== 66) {
  throw new Error(
    `Expected the exact generic301 release partition to produce 66 packages, found ${allPackages.length}.`,
  );
}
const packagedLabIds = allPackages.flatMap((entry) =>
  entry.labs.map((lab) => lab.labId),
);
if (
  packagedLabIds.length !== selectedLabs.length ||
  new Set(packagedLabIds).size !== selectedLabs.length ||
  allPackages.some(
    (entry) => entry.labs.length === 0 || entry.labs.length > packageSize,
  )
) {
  throw new Error(
    "China Visualization Lab package construction lost, duplicated, or oversized a selected lab.",
  );
}

const shardPackages = allPackages.filter(
  (_, packageIndex) => packageIndex % shardTotal === shardIndex,
);
if (shardPackages.length === 0) {
  throw new Error(
    `Shard ${shardIndex}/${shardTotal} has no packages after filtering ${selectedLabs.length} lab(s); reduce CHINA_VIZ_SHARD_TOTAL.`,
  );
}

const plannedShardPackageIds = shardPackages.map((entry) => entry.id);
const plannedShardLabIds = shardPackages.flatMap((entry) =>
  entry.labs.map((lab) => lab.labId),
);
const plannedShardStateIds = shardPackages.flatMap((entry) =>
  entry.labs.flatMap(plannedStateReceiptIdsForLab),
);
const stateBudgetManifest = buildChinaVisualizationStateBudgetManifest(
  shardPackages.map((entry) => ({
    id: entry.id,
    labIds: entry.labs.map((lab) => lab.labId),
    stateIds: entry.labs.flatMap(plannedStateReceiptIdsForLab),
  })),
);
const stateBudgetPreflightErrors =
  validateChinaVisualizationStateBudgetManifest({
    manifest: stateBudgetManifest,
    plannedLabIds: plannedShardLabIds,
    plannedPackageIds: plannedShardPackageIds,
    plannedStateIds: plannedShardStateIds,
  });
if (stateBudgetPreflightErrors.length > 0) {
  throw new Error(
    `China Visualization state-budget preflight rejected the plan: ${stateBudgetPreflightErrors.join("; ")}.`,
  );
}
const stateBudgetByPackageId = new Map(
  stateBudgetManifest.packagePlans.map((entry) => [entry.id, entry]),
);
const stateChunkAuditIds = [
  "collision-layout",
  "interaction-control",
  "range-before-after",
  "renderer-math",
  "semantic-contract",
  "text-contrast",
] as const;
const playwrightRunId = process.env.PLAYWRIGHT_RUN_ID?.trim();
if (!playwrightRunId) {
  throw new Error(
    "PLAYWRIGHT_RUN_ID must bind every physical China Visualization state-chunk plan.",
  );
}
const playwrightBuildId = [
  process.env.PLAYWRIGHT_NEXT_DIST_DIR?.trim() || "missing-next-dist",
  stateBudgetManifest.statePlanSha256,
].join("#");
const genericStateCount = genericMainlandLabs.reduce(
  (total, lab) => total + plannedStateReceiptIdsForLab(lab).length,
  0,
);
const labById = new Map(genericMainlandLabs.map((lab) => [lab.labId, lab]));
for (const stateId of plannedShardStateIds) {
  const target = parseChinaVisualizationTargetStateId(stateId);
  if (!labById.has(target.labId)) {
    throw new Error(
      `Target-state preflight resolved unknown Mainland Lab ${target.labId}.`,
    );
  }
}
function buildPackageStateChunkPlan(
  labPackage: LabPackage,
  projectName: string,
) {
  const stateIds = labPackage.labs.flatMap(plannedStateReceiptIdsForLab);
  const plan = buildChinaVisualizationStateChunkPlan({
    auditIds: [...stateChunkAuditIds],
    buildId: playwrightBuildId,
    cell: {
      id: `${language}:${theme}:${titleViewport}:${projectName}:shard-${shardIndex + 1}-of-${shardTotal}:${labPackage.id}`,
      language,
      packageId: labPackage.id,
      project: projectName,
      theme,
      viewport: titleViewport,
    },
    runId: playwrightRunId,
    scope: {
      catalogLabCount: genericMainlandLabs.length,
      catalogStateCount: genericStateCount,
      filters: [`package:${labPackage.id}`],
      selection: "partial",
      shardIndex,
      shardTotal,
    },
    stateIds,
  });
  const errors = validateChinaVisualizationStateChunkPlan(plan);
  if (errors.length > 0) {
    throw new Error(
      `${labPackage.id}: physical state-chunk preflight rejected: ${errors.join("; ")}.`,
    );
  }
  return plan;
}

const stateChunkPreflightByPackageId = new Map(
  shardPackages.map((labPackage) => [
    labPackage.id,
    buildPackageStateChunkPlan(labPackage, "discovery-preflight"),
  ]),
);
const executedShardPackageIds: string[] = [];
const executedShardLabIds: string[] = [];
const executedShardStateIds: string[] = [];
const rangeStateExecutionMismatches: ChinaVisualizationRangeStateExecutionMismatch[] =
  [];
const stateChunkPackageAggregates: Array<Record<string, unknown>> = [];

test.describe(`Mainland China Visualization Labs (${language}, ${theme}, viewport=${titleViewport}, shard ${shardIndex + 1}/${shardTotal}, states=${stateBudgetManifest.stateCount}, state-plan=${stateBudgetManifest.statePlanSha256})`, () => {
  test.afterAll(async ({}, testInfo) => {
    const executedStateIdSet = new Set(executedShardStateIds);
    const unobservedStateIds = plannedShardStateIds.filter(
      (stateId) => !executedStateIdSet.has(stateId),
    );
    await testInfo.attach(
      `china-viz-run-ledger-${language}-${theme}-${titleViewport}-shard-${shardIndex + 1}-of-${shardTotal}.json`,
      {
        body: Buffer.from(
          JSON.stringify(
            {
              catalogLabIds: releasePartition.catalogLabIds,
              catalogPartitionSha256: releasePartition.partitionSha256,
              dedicatedGroupManifests:
                releasePartition.dedicatedGroupManifests,
              dedicatedLabIds: releasePartition.dedicatedLabIds,
              dedicatedLabIdsSha256: releasePartition.dedicatedLabIdsSha256,
              executedLabIds: executedShardLabIds,
              executedPackageIds: executedShardPackageIds,
              executedStateIds: executedShardStateIds,
              language,
              plannedLabIds: plannedShardLabIds,
              plannedPackageIds: plannedShardPackageIds,
              plannedStateIds: plannedShardStateIds,
              rangeStateExecutionMismatches,
              rangeStateExecutionSchemaVersion: 1,
              genericLabIds: releasePartition.genericLabIds,
              genericLabIdsSha256: releasePartition.genericLabIdsSha256,
              releaseAcceptance: shardTotal === 1 && isFullGenericSelection,
              scope:
                shardTotal === 1 && isFullGenericSelection
                  ? "generic301"
                  : "partial",
              shardIndex,
              shardTotal,
              stateChunkPackageAggregates,
              stateChunkPolicyId: "china-visualization-state-chunks-v2",
              stateChunkSchemaVersion: 2,
              theme,
              unobservedStateIds,
              viewport: titleViewport,
              stateBudgetManifest,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      },
    );
    expect(
      executedShardPackageIds,
      "Every planned Mainland package must execute exactly once.",
    ).toEqual(plannedShardPackageIds);
    expect(
      executedShardLabIds,
      "Every planned Mainland lab must execute exactly once.",
    ).toEqual(plannedShardLabIds);
    expect(
      rangeStateExecutionMismatches,
      "Every requested range state must retain its exact full-control signature both before and after UI scanning.",
    ).toEqual([]);
    expect(
      unobservedStateIds,
      "Every planned state must earn a post-scan execution receipt; mismatched states remain explicitly unobserved.",
    ).toEqual([]);
    expect(
      executedShardStateIds,
      "Every declared strand, mode, slider min/mid/max, full endpoint combination, and reset state must execute exactly once.",
    ).toEqual(plannedShardStateIds);
    expect(
      stateChunkPackageAggregates.map((entry) => entry.packageId),
      "Every planned package must provide one complete physical state-chunk aggregate.",
    ).toEqual(plannedShardPackageIds);
    expect(
      stateChunkPackageAggregates.every(
        (entry) =>
          entry.status === "complete" &&
          Number(entry.maxStatesPerChunk) <= 32 &&
          Number(entry.pageInstanceCount) === Number(entry.chunkCount),
      ),
      "Every state-chunk aggregate must prove completion, <=32 states per chunk, and one unique fresh page per chunk.",
    ).toBe(true);
  });

  for (const labPackage of shardPackages) {
    test(`${labPackage.publisher} · ${labPackage.templateId} · part ${labPackage.part}/${labPackage.partTotal} · ${labPackage.labs.length} labs`, async ({
      context,
      page,
    }, testInfo) => {
      const stateBudget = stateBudgetByPackageId.get(labPackage.id);
      if (!stateBudget) {
        throw new Error(
          `${labPackage.id}: missing deterministic state-budget preflight entry.`,
        );
      }
      const stateChunkPreflight = stateChunkPreflightByPackageId.get(
        labPackage.id,
      );
      if (!stateChunkPreflight) {
        throw new Error(
          `${labPackage.id}: missing physical state-chunk preflight entry.`,
        );
      }
      const stateChunkPlan = buildPackageStateChunkPlan(
        labPackage,
        testInfo.project.name,
      );
      expect(
        stateChunkPlan.chunks.map(
          (chunk: { stateCount: number }) => chunk.stateCount,
        ),
        `${labPackage.id}: runtime physical chunk counts drifted from discovery preflight`,
      ).toEqual(
        stateChunkPreflight.chunks.map(
          (chunk: { stateCount: number }) => chunk.stateCount,
        ),
      );
      test.setTimeout(
        stateChunkPlan.chunks.reduce(
          (total: number, chunk: { timeoutMs: number }) =>
            total + chunk.timeoutMs,
          60_000,
        ),
      );
      await runPhysicalStateChunkPackage({
        context,
        fixturePage: page,
        labPackage,
        stateBudget,
        stateChunkPlan,
        testInfo,
      });
    });
  }
});

type PhysicalStateChunkPackageOptions = {
  context: BrowserContext;
  fixturePage: Page;
  labPackage: LabPackage;
  stateBudget: {
    stateCount: number;
    statePlanSha256: string;
    timeoutMs: number;
  };
  stateChunkPlan: any;
  testInfo: TestInfo;
};

type PreparedTargetState = {
  expectation: ActiveSemanticControlExpectation;
  executionPlan: ChinaVisualizationRangeStateExecutionPlan;
  resetEvidence: Record<string, unknown> | null;
};

async function runPhysicalStateChunkPackage({
  context,
  fixturePage,
  labPackage,
  stateBudget,
  stateChunkPlan,
  testInfo,
}: PhysicalStateChunkPackageOptions) {
  const failures: FailureRecord[] = [];
  const failureKeys = new Set<string>();
  const chunkReceipts: any[] = [];
  const telemetryEvidence: CompletedTelemetryEvidence[] = [];
  const signatureByStateId = new Map<string, VisualizationSignatures>();
  const interactedLabIds = new Set<string>();
  let omittedFailureCount = 0;
  let setupClosed = false;
  let attachedScreenshots = 0;
  let actualViewport = "unknown";
  let terminalPage: Page | null = null;

  const addFailure: FailureRecorder = (labId, state, issue) => {
    const key = `${labId}\u0000${issue}`;
    if (failureKeys.has(key)) return;
    failureKeys.add(key);
    if (failures.filter((failure) => failure.labId === labId).length >= 24) {
      omittedFailureCount += 1;
      return;
    }
    failures.push({ issue, labId, state });
  };

  const fixtureViewport = fixturePage.viewportSize();
  if (!fixtureViewport)
    throw new Error("Playwright page has no configured viewport.");
  const studentUserId = await registerMainlandStudent(
    fixturePage,
    testInfo,
    labPackage,
  );
  await fixturePage.close();

  try {
    for (const chunk of stateChunkPlan.chunks as Array<{
      id: string;
      index: number;
      labIds: string[];
      stateCount: number;
      stateIds: string[];
      timeoutMs: number;
    }>) {
      await test.step(`${labPackage.id} · physical ${chunk.id} · ${chunk.stateCount} states`, async () => {
        const page = await context.newPage();
        await installHkVisualizationEffectiveVisibilityInspector(page);
        terminalPage = page;
        const pageInstanceId = `${sanitizeName(playwrightRunId!)}-${sanitizeName(labPackage.id)}-chunk-${String(chunk.index).padStart(4, "0")}-${uniqueSuffix(testInfo)}`;
        const monitor = installRuntimeMonitor(page, configuredBaseOrigin);
        const requestedByStateId: Record<string, string> = {};
        const observedBeforeByStateId: Record<string, string> = {};
        const observedAfterByStateId: Record<string, string> = {};
        const auditEvidenceByStateId: Record<
          string,
          Record<string, string>
        > = {};
        const resetEvidenceByStateId: Record<string, string> = {};
        const mountEventsByLabId = new Map<
          string,
          Array<Record<string, unknown>>
        >();

        const flushRuntimeIssues = () => {
          monitor
            .issuesFor("setup")
            .forEach((issue) =>
              addFailure(labPackage.labs[0].labId, "runtime-setup", issue),
            );
          labPackage.labs.forEach((ownedLab) => {
            monitor
              .issuesFor(ownedLab.labId)
              .forEach((issue) => addFailure(ownedLab.labId, "runtime", issue));
          });
        };

        await page.emulateMedia({ reducedMotion: "reduce" });
        if (viewportOverride) {
          await page.setViewportSize({
            height: viewportOverride.height,
            width: viewportOverride.width,
          });
        }
        const viewport = page.viewportSize();
        if (!viewport)
          throw new Error(
            "Physical state-chunk page has no configured viewport.",
          );
        const chunkViewport = `${viewport.width}x${viewport.height}`;
        if (actualViewport === "unknown") actualViewport = chunkViewport;
        if (actualViewport !== chunkViewport) {
          throw new Error(
            `${labPackage.id}: state-chunk viewport drifted from ${actualViewport} to ${chunkViewport}.`,
          );
        }

        for (const stateId of chunk.stateIds) {
          const target = parseChinaVisualizationTargetStateId(stateId);
          const lab = labById.get(target.labId);
          if (
            !lab ||
            !labPackage.labs.some(
              (candidate) => candidate.labId === target.labId,
            )
          ) {
            throw new Error(
              `${labPackage.id}: state chunk contains unowned target ${stateId}.`,
            );
          }
          const failureCountBeforeState = failures.length;
          let section: Locator | null = null;

          await test.step(`${target.labId} · ${target.stateName}`, async () => {
            const telemetryIdleBeforeNavigation =
              await monitor.waitForTelemetryIdle(
                `before fresh mount for ${target.labId}/${target.stateName}`,
                telemetryDrainTimeoutMs,
                100,
              );
            flushRuntimeIssues();
            if (!telemetryIdleBeforeNavigation) {
              addFailure(
                target.labId,
                target.stateName,
                "Fresh target mount was not attempted because prior telemetry remained pending after the bounded drain.",
              );
              return;
            }

            monitor.setActiveLab(target.labId);
            try {
              const response = await page.goto(buildVisualizationLabHref(lab), {
                waitUntil: "domcontentloaded",
              });
              if (!response)
                throw new Error(
                  "Direct route returned no navigation response.",
                );
              if (response.status() >= 400) {
                throw new Error(
                  `Direct route returned HTTP ${response.status()}.`,
                );
              }
              if (!setupClosed) {
                await closeLearnerStartSetupIfVisible(page);
                setupClosed = true;
              }
              await disableMotion(page);
              await expect(page.locator("html")).toHaveAttribute(
                "lang",
                htmlLanguagePattern(language),
                { timeout: 20_000 },
              );
              if (theme === "dark") {
                await expect(page.locator("html")).toHaveClass(
                  /(?:^|\s)dark(?:\s|$)/,
                  {
                    timeout: 20_000,
                  },
                );
              } else {
                await expect(page.locator("html")).not.toHaveClass(
                  /(?:^|\s)dark(?:\s|$)/,
                  {
                    timeout: 20_000,
                  },
                );
              }
              await expect(
                page.locator('[data-viz-panel-mode="lab"]'),
              ).toBeVisible({
                timeout: lab.threeD?.premiumLaunch ? 35_000 : 20_000,
              });
              const activeRoot = page.locator(
                `[data-viz-active-lab-id=${JSON.stringify(lab.labId)}]`,
              );
              await expect(activeRoot).toHaveCount(1);
              await expect(activeRoot).toBeVisible({
                timeout: lab.threeD?.premiumLaunch ? 35_000 : 20_000,
              });
              section = page.locator(visualizationLabSectionSelector(lab));
              await expect(
                section,
                `${lab.labId} direct lab section`,
              ).toBeVisible({
                timeout: lab.threeD?.premiumLaunch ? 35_000 : 20_000,
              });
              await section.scrollIntoViewIfNeeded();
              await settleVisualization(section);

              const mountEvents = mountEventsByLabId.get(lab.labId) ?? [];
              mountEvents.push({
                activeLabId: await activeRoot.getAttribute(
                  "data-viz-active-lab-id",
                ),
                href: new URL(page.url()).pathname,
                pageInstanceId,
                stateId,
              });
              mountEventsByLabId.set(lab.labId, mountEvents);

              const prepared = await prepareTargetStateFromFreshMount(
                section,
                lab,
                target,
                addFailure,
              );
              await auditLearnerThreeDControls(page, section, lab, addFailure);
              if (
                target.kind === "range" ||
                target.kind === "range-endpoints"
              ) {
                await assertSemanticStrandPlan(
                  section,
                  lab,
                  prepared.expectation.strandIndex,
                  `${target.stateName}:target-strand-contract`,
                  addFailure,
                );
              } else {
                await assertSemanticControlContract(
                  section,
                  lab,
                  prepared.expectation,
                  `${target.stateName}:target-contract`,
                  true,
                  addFailure,
                );
              }

              const requestedSignature = expectedTargetStateSignature(
                lab,
                prepared.expectation,
                prepared.executionPlan,
              );
              const requestedSha =
                chinaVisualizationTargetStateEvidenceSha256(requestedSignature);
              const observedBefore = await observedTargetStateSignature(
                section,
                lab,
              );
              const observedBeforeSha =
                chinaVisualizationTargetStateEvidenceSha256(observedBefore);
              if (requestedSha !== observedBeforeSha) {
                addFailure(
                  lab.labId,
                  target.stateName,
                  `TARGET_STATE_EXECUTION before-scan requested=${JSON.stringify(requestedSignature)} observed=${JSON.stringify(observedBefore)}.`,
                );
                return;
              }

              const executed = await scanState(
                section,
                lab,
                target.stateName,
                target.kind === "default" ||
                  target.kind === "mode" ||
                  target.kind === "strand",
                addFailure,
                prepared.executionPlan,
                false,
              );
              if (!executed) return;
              const signatures = await visualizationSignatures(section);
              const observedAfter = await observedTargetStateSignature(
                section,
                lab,
              );
              const observedAfterSha =
                chinaVisualizationTargetStateEvidenceSha256(observedAfter);
              if (requestedSha !== observedAfterSha) {
                addFailure(
                  lab.labId,
                  target.stateName,
                  `TARGET_STATE_EXECUTION after-scan requested=${JSON.stringify(requestedSignature)} observed=${JSON.stringify(observedAfter)}.`,
                );
                return;
              }

              if (
                target.requiresInteraction &&
                !interactedLabIds.has(lab.labId)
              ) {
                await assertExactLearnerInteractionPersisted(section, lab);
                interactedLabIds.add(lab.labId);
              }

              if (failures.length === failureCountBeforeState) {
                requestedByStateId[stateId] = requestedSha;
                observedBeforeByStateId[stateId] = observedBeforeSha;
                observedAfterByStateId[stateId] = observedAfterSha;
                auditEvidenceByStateId[stateId] = Object.fromEntries(
                  stateChunkAuditIds.map((auditId) => [
                    auditId,
                    chinaVisualizationTargetStateEvidenceSha256({
                      auditEvidence:
                        auditId === "collision-layout"
                          ? executed.collisionReceipts
                          : {
                              observedAfter,
                              observedBefore,
                            },
                      auditId,
                      stateId,
                    }),
                  ]),
                );
                if (prepared.resetEvidence) {
                  resetEvidenceByStateId[stateId] =
                    chinaVisualizationTargetStateEvidenceSha256({
                      resetEvidence: prepared.resetEvidence,
                      stateId,
                    });
                }
                signatureByStateId.set(stateId, signatures);
                executedShardStateIds.push(stateId);
              }
            } catch (error) {
              addFailure(
                lab.labId,
                target.stateName,
                error instanceof Error ? error.message : String(error),
              );
            } finally {
              await requestTelemetryQuiescence(page, studentUserId).catch(
                (error) => {
                  addFailure(
                    lab.labId,
                    `${target.stateName}:telemetry-quiescence`,
                    error instanceof Error ? error.message : String(error),
                  );
                },
              );
              await monitor.waitForTelemetryIdle(
                `after target scan ${lab.labId}/${target.stateName}`,
                telemetryDrainTimeoutMs,
                throttledDeliveryQuietWindowMs,
              );
              flushRuntimeIssues();
            }

            if (
              failures.length > failureCountBeforeState &&
              section &&
              attachedScreenshots < 4
            ) {
              const visible = await section.isVisible().catch(() => false);
              if (visible) {
                attachedScreenshots += 1;
                await testInfo.attach(
                  `china-viz-${language}-${theme}-${actualViewport}-${sanitizeName(lab.labId)}-${sanitizeName(target.stateName)}.png`,
                  {
                    body: await section.screenshot(),
                    contentType: "image/png",
                  },
                );
              }
            }
          });
        }

        telemetryEvidence.push(...monitor.telemetryEvidence());
        if (failures.length === 0) {
          const mountEvidenceByLabId = Object.fromEntries(
            chunk.labIds.map((labId) => [
              labId,
              chinaVisualizationTargetStateEvidenceSha256({
                labId,
                mounts: mountEventsByLabId.get(labId) ?? [],
                pageInstanceId,
              }),
            ]),
          );
          chunkReceipts.push(
            createChinaVisualizationStateChunkReceipt({
              auditEvidenceByStateId,
              chunkIndex: chunk.index,
              mountEvidenceByLabId,
              observedAfterByStateId,
              observedBeforeByStateId,
              pageInstanceId,
              plan: stateChunkPlan,
              requestedByStateId,
              resetEvidenceByStateId,
            }),
          );
        }

        const isLastChunk = chunk.index === stateChunkPlan.chunks.length - 1;
        if (!isLastChunk || failures.length > 0) {
          await page.close();
          if (terminalPage === page) terminalPage = null;
        }
        if (failures.length > 0) {
          throw new Error(
            formatFailureSummary(
              failures,
              omittedFailureCount,
              testInfo.project.name,
              actualViewport,
            ),
          );
        }
      });
    }

    if (!terminalPage) {
      throw new Error(
        `${labPackage.id}: no terminal physical state-chunk page survived finalization.`,
      );
    }
    await assertPackageTelemetryDurability(
      terminalPage,
      studentUserId,
      labPackage,
    );
    auditTargetSignatureCoverage(labPackage, signatureByStateId, addFailure);

    const receiptErrors = validateChinaVisualizationStateChunkReceipts({
      plan: stateChunkPlan,
      receipts: chunkReceipts,
      requireReleaseAcceptance: false,
    });
    if (receiptErrors.length > 0) {
      addFailure(
        labPackage.labs[0].labId,
        "state-chunk-aggregate",
        `Physical state-chunk receipts rejected: ${receiptErrors.join("; ")}.`,
      );
    }
    if (failures.length > 0) {
      throw new Error(
        formatFailureSummary(
          failures,
          omittedFailureCount,
          testInfo.project.name,
          actualViewport,
        ),
      );
    }
    const aggregate = aggregateChinaVisualizationStateChunkReceipts({
      plan: stateChunkPlan,
      receipts: chunkReceipts,
      requireReleaseAcceptance: false,
    });
    const packageAggregate = {
      ...aggregate,
      maxStatesPerChunk: Math.max(
        ...stateChunkPlan.chunks.map(
          (chunk: { stateCount: number }) => chunk.stateCount,
        ),
      ),
      packageId: labPackage.id,
      packageStateBudget: stateBudget,
      scopedReleaseAcceptance: stateChunkPlan.releaseAcceptance,
    };
    stateChunkPackageAggregates.push(packageAggregate);
    executedShardPackageIds.push(labPackage.id);
    executedShardLabIds.push(...labPackage.labs.map((lab) => lab.labId));

    await testInfo.attach(
      `china-viz-state-chunks-${language}-${theme}-${actualViewport}-${sanitizeName(labPackage.id)}.json`,
      {
        body: Buffer.from(
          JSON.stringify(
            {
              aggregate: packageAggregate,
              chunks: chunkReceipts,
              plan: stateChunkPlan,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      },
    );
    await testInfo.attach(
      `china-viz-telemetry-${language}-${theme}-${actualViewport}-${sanitizeName(labPackage.id)}.json`,
      {
        body: Buffer.from(
          JSON.stringify(
            {
              language,
              packageId: labPackage.id,
              summary: summarizeTelemetryEvidence(telemetryEvidence),
              theme,
              timings: telemetryEvidence,
              viewport: actualViewport,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      },
    );
  } finally {
    const pageToClose = terminalPage as Page | null;
    if (pageToClose && !pageToClose.isClosed()) await pageToClose.close();
  }
}

async function prepareTargetStateFromFreshMount(
  section: Locator,
  lab: MainlandLab,
  target: ChinaVisualizationTargetState,
  addFailure: FailureRecorder,
): Promise<PreparedTargetState> {
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const requestedStrandIndex = target.strandIndex ?? 0;
  let expectation = resolveActiveSemanticControlExpectation(
    lab,
    requestedStrandIndex,
  );

  if (target.strandIndex !== null) {
    if (!strands?.[target.strandIndex]) {
      throw new Error(
        `${lab.labId}: target ${target.stateName} requests missing strand ${target.strandIndex}.`,
      );
    }
    const strandButton = section
      .locator("[data-viz-strand-button]")
      .nth(target.strandIndex);
    await expect(
      strandButton,
      `${lab.labId}: target strand ${target.strandIndex}`,
    ).toBeVisible();
    await strandButton.click();
    await expect(strandButton).toHaveAttribute(
      "data-viz-strand-active",
      "true",
    );
    expectation = resolveActiveSemanticControlExpectation(
      lab,
      target.strandIndex,
    );
  }

  if (target.kind === "strand") {
    if (
      expectation.family !== target.strandFamily ||
      expectation.variant !== target.strandVariant
    ) {
      throw new Error(
        `${lab.labId}: target strand identity ${target.strandFamily}/${target.strandVariant} resolved to ${expectation.family}/${expectation.variant}.`,
      );
    }
  }

  if (target.modeIndex !== null) {
    const expectedMode = expectation.contract.modes[target.modeIndex];
    if (!expectedMode || expectedMode.id !== target.modeId) {
      throw new Error(
        `${lab.labId}: target mode ${target.modeIndex}/${target.modeId} is outside ${expectation.family}/${expectation.variant}.`,
      );
    }
    const modeButton = section
      .locator("[data-viz-mode-button]")
      .nth(target.modeIndex);
    await expect(
      modeButton,
      `${lab.labId}: target mode ${target.modeIndex}`,
    ).toBeVisible();
    await modeButton.click();
    await expect(modeButton).toHaveAttribute("data-viz-mode-active", "true");
    expectation = resolveActiveSemanticControlExpectation(
      lab,
      requestedStrandIndex,
      expectedMode.value,
    );
  }

  if (target.kind === "reset") {
    const mutation = await mutateFreshMountBeforeReset(
      section,
      lab,
      addFailure,
    );
    const reset = section.locator("[data-viz-reset-model]").first();
    await expect(reset, `${lab.labId}: reset target control`).toBeVisible();
    await reset.click();
    await settleVisualization(section);
    expectation = resolveActiveSemanticControlExpectation(lab, 0);
    return {
      expectation,
      executionPlan: rangeStateExecutionPlanForExpectation(expectation),
      resetEvidence: mutation,
    };
  }

  const initialValues = Object.fromEntries(
    expectation.contract.sliders.map((slider) => [slider.id, slider.initial]),
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  let requestedValues = initialValues;
  if (target.kind === "range") {
    const slider = expectation.contract.sliders[target.rangeIndex ?? -1];
    const requestedIds = Object.keys(target.requestedValues);
    if (!slider || requestedIds.length !== 1 || requestedIds[0] !== slider.id) {
      throw new Error(
        `${lab.labId}: target range index/id ${target.rangeIndex}/${requestedIds.join(",")} does not match the live contract.`,
      );
    }
    requestedValues = { ...initialValues, ...target.requestedValues };
  } else if (target.kind === "range-endpoints") {
    const expectedIds = expectation.contract.sliders
      .map((slider) => slider.id)
      .sort();
    const requestedIds = Object.keys(target.requestedValues).sort();
    if (JSON.stringify(expectedIds) !== JSON.stringify(requestedIds)) {
      throw new Error(
        `${lab.labId}: endpoint target controls ${JSON.stringify(requestedIds)} do not match ${JSON.stringify(expectedIds)}.`,
      );
    }
    requestedValues = { ...target.requestedValues };
  }

  const executionPlan = rangeStateExecutionPlanForExpectation(
    expectation,
    requestedValues,
  );
  if (target.kind === "range" || target.kind === "range-endpoints") {
    const drove = await applyRangeStateExecutionPlan(
      section,
      expectation,
      executionPlan,
      lab,
      target.stateName,
      addFailure,
    );
    if (!drove)
      throw new Error(
        `${lab.labId}: target range plan could not be reproduced.`,
      );
  }
  return { expectation, executionPlan, resetEvidence: null };
}

async function mutateFreshMountBeforeReset(
  section: Locator,
  lab: MainlandLab,
  addFailure: FailureRecorder,
) {
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const strandIndex = strands ? strands.length - 1 : 0;
  if (strands) {
    const strandButton = section
      .locator("[data-viz-strand-button]")
      .nth(strandIndex);
    await expect(strandButton).toBeVisible();
    await strandButton.click();
  }
  let expectation = resolveActiveSemanticControlExpectation(lab, strandIndex);
  if (expectation.contract.modes.length > 1) {
    const modeIndex = expectation.contract.modes.length - 1;
    const mode = expectation.contract.modes[modeIndex];
    const modeButton = section.locator("[data-viz-mode-button]").nth(modeIndex);
    await expect(modeButton).toBeVisible();
    await modeButton.click();
    expectation = resolveActiveSemanticControlExpectation(
      lab,
      strandIndex,
      mode.value,
    );
  }

  const initial = Object.fromEntries(
    expectation.contract.sliders.map((slider) => [slider.id, slider.initial]),
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  const vectors = configuredVisualizationSemanticCanonicalDynamicStateVectors(
    expectation.contract,
    expectation.mode,
  );
  let requested = vectors.find((vector) =>
    expectation.contract.sliders.some(
      (slider) => vector[slider.id] !== initial[slider.id],
    ),
  );
  if (!requested && expectation.contract.sliders.length > 0) {
    const first = expectation.contract.sliders[0];
    requested = {
      ...initial,
      [first.id]: approximatelyEqual(first.initial, first.max, first.step)
        ? first.min
        : first.max,
    };
  }
  if (requested) {
    const executionPlan = rangeStateExecutionPlanForExpectation(
      expectation,
      requested,
    );
    const drove = await applyRangeStateExecutionPlan(
      section,
      expectation,
      executionPlan,
      lab,
      "reset-source",
      addFailure,
    );
    if (!drove)
      throw new Error(
        `${lab.labId}: reset source mutation could not be reproduced.`,
      );
  }
  return {
    activeMode: expectation.mode,
    activeStrand: expectation.strandIndex,
    requested: requested ?? initial,
  };
}

function expectedTargetStateSignature(
  lab: MainlandLab,
  expectation: ActiveSemanticControlExpectation,
  executionPlan: ChinaVisualizationRangeStateExecutionPlan,
) {
  const activeMode =
    expectation.contract.modes.length > 1
      ? (expectation.contract.modes.find(
          (mode) => mode.value === expectation.mode,
        )?.id ?? null)
      : null;
  return {
    activeModeIds: activeMode ? [activeMode] : [],
    activeStrandIndexes:
      expectation.strandIndex === null ? [] : [expectation.strandIndex],
    control: {
      family: expectation.family,
      mode: expectation.mode,
      variant: expectation.variant,
    },
    labId: lab.labId,
    ranges: executionPlan.expected,
  };
}

async function observedTargetStateSignature(
  section: Locator,
  lab: MainlandLab,
) {
  const controlRoot = section.locator("[data-viz-semantic-control-family]");
  await expect(
    controlRoot,
    `${lab.labId}: exact target control root`,
  ).toHaveCount(1);
  const control = await controlRoot.evaluate((root) => ({
    family: root.getAttribute("data-viz-semantic-control-family"),
    mode: Number(root.getAttribute("data-viz-semantic-control-mode")),
    variant: root.getAttribute("data-viz-semantic-control-variant"),
  }));
  return {
    activeModeIds: await section
      .locator('[data-viz-mode-button][data-viz-mode-active="true"]')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("data-viz-mode-id")),
      ),
    activeStrandIndexes: await section
      .locator('[data-viz-strand-button][data-viz-strand-active="true"]')
      .evaluateAll((buttons) =>
        buttons.map((button) =>
          Number(button.getAttribute("data-viz-strand-index")),
        ),
      ),
    control,
    labId: lab.labId,
    ranges: await observedRangeStateSignature(section),
  };
}

function auditTargetSignatureCoverage(
  labPackage: LabPackage,
  signatures: ReadonlyMap<string, VisualizationSignatures>,
  addFailure: FailureRecorder,
) {
  const targets = labPackage.labs.flatMap((lab) =>
    plannedStateReceiptIdsForLab(lab).map(parseChinaVisualizationTargetStateId),
  );
  for (const lab of labPackage.labs) {
    const labTargets = targets.filter((target) => target.labId === lab.labId);
    const strandTargets = labTargets.filter(
      (target) => target.kind === "strand",
    );
    if (strandTargets.length > 0) {
      assertDistinctTargetSignatures(
        lab,
        "strands",
        strandTargets,
        signatures,
        strandTargets.length,
        addFailure,
      );
    }

    const modeGroups = new Map<string, ChinaVisualizationTargetState[]>();
    for (const target of labTargets.filter(
      (candidate) => candidate.kind === "mode",
    )) {
      const key = target.stateName.replace(/\/mode=.*$/u, "");
      modeGroups.set(key, [...(modeGroups.get(key) ?? []), target]);
    }
    for (const [key, group] of modeGroups) {
      assertDistinctTargetSignatures(
        lab,
        `modes:${key}`,
        group,
        signatures,
        group.length,
        addFailure,
      );
    }

    const rangeGroups = new Map<string, ChinaVisualizationTargetState[]>();
    for (const target of labTargets.filter(
      (candidate) => candidate.kind === "range",
    )) {
      const key = target.stateName.replace(
        /=(-?(?:\d+(?:\.\d+)?|\.\d+))$/u,
        "",
      );
      rangeGroups.set(key, [...(rangeGroups.get(key) ?? []), target]);
    }
    for (const [key, group] of rangeGroups) {
      if (group.length < 2) continue;
      assertDistinctTargetSignatures(
        lab,
        `range:${key}`,
        group,
        signatures,
        2,
        addFailure,
      );
    }
  }
}

function assertDistinctTargetSignatures(
  lab: MainlandLab,
  state: string,
  targets: ChinaVisualizationTargetState[],
  signatures: ReadonlyMap<string, VisualizationSignatures>,
  minimumDistinct: number,
  addFailure: FailureRecorder,
) {
  const actual = targets
    .map((target) => signatures.get(target.stateId))
    .filter(Boolean) as VisualizationSignatures[];
  if (actual.length !== targets.length) {
    addFailure(
      lab.labId,
      state,
      `Target signature group has ${actual.length}/${targets.length} executed states.`,
    );
    return;
  }
  const machineCount = new Set(actual.map(({ machine }) => machine)).size;
  const visibleCount = new Set(actual.map(({ visible }) => visible)).size;
  if (machineCount < minimumDistinct) {
    addFailure(
      lab.labId,
      state,
      `${targets.length} target states produced only ${machineCount} machine signatures; expected at least ${minimumDistinct}.`,
    );
  }
  if (visibleCount < minimumDistinct) {
    addFailure(
      lab.labId,
      state,
      `${targets.length} target states produced only ${visibleCount} QA-attribute-free visible signatures; expected at least ${minimumDistinct}.`,
    );
  }
}

function parseLanguage(
  value: string | undefined,
): Extract<Language, "en" | "zh-Hans"> {
  const normalized = value?.trim() || "zh-Hans";
  if (normalized !== "en" && normalized !== "zh-Hans") {
    throw new Error(
      `CHINA_VIZ_LANGUAGE must be en or zh-Hans; received ${JSON.stringify(value)}.`,
    );
  }
  return normalized;
}

function parseTheme(value: string | undefined): ThemeMode {
  const normalized = value?.trim() || "light";
  if (normalized !== "light" && normalized !== "dark") {
    throw new Error(
      `CHINA_VIZ_THEME must be light or dark; received ${JSON.stringify(value)}.`,
    );
  }
  return normalized;
}

function parseViewport(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(normalized);
  if (!match) {
    throw new Error(
      `CHINA_VIZ_VIEWPORT must use the exact WIDTHxHEIGHT form (for example 390x844); received ${JSON.stringify(value)}.`,
    );
  }
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 240 || width > 4_096 || height < 320 || height > 4_096) {
    throw new Error(
      `CHINA_VIZ_VIEWPORT must stay within 240-4096px width and 320-4096px height; received ${normalized}.`,
    );
  }
  return { height, label: `${width}x${height}`, width };
}

function htmlLanguagePattern(
  selectedLanguage: Extract<Language, "en" | "zh-Hans">,
) {
  return selectedLanguage === "en" ? /^en(?:-|$)/ : /^zh-Hans(?:-|$)/;
}

function envSet(name: string) {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function positiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${name} must be a positive integer; received ${JSON.stringify(raw)}.`,
    );
  }
  return parsed;
}

function nonNegativeIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `${name} must be a non-negative integer; received ${JSON.stringify(raw)}.`,
    );
  }
  return parsed;
}

function assertKnownFilter(
  name: string,
  values: ReadonlySet<string>,
  allowedValues: ReadonlySet<string>,
) {
  const unknown = Array.from(values).filter(
    (value) => !allowedValues.has(value),
  );
  if (unknown.length > 0) {
    throw new Error(`${name} contains unknown values: ${unknown.join(", ")}.`);
  }
}

function isMainlandPublisher(
  value: TextbookPublisher | undefined,
): value is MainlandPublisher {
  return (
    value === "MAINLAND_PEP" ||
    value === "MAINLAND_HJB" ||
    value === "MAINLAND_BNU"
  );
}

function duplicateValues(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function buildLabPackages(labs: MainlandLab[]): LabPackage[] {
  const groups = new Map<string, MainlandLab[]>();
  const publisherOrder = new Map(
    mainlandPublishers.map((publisher, index) => [publisher, index]),
  );

  [...labs]
    .sort((left, right) => {
      const publisherDelta =
        (publisherOrder.get(left.publisher) ?? Number.MAX_SAFE_INTEGER) -
        (publisherOrder.get(right.publisher) ?? Number.MAX_SAFE_INTEGER);
      return (
        publisherDelta ||
        left.templateId.localeCompare(right.templateId) ||
        left.labId.localeCompare(right.labId)
      );
    })
    .forEach((lab) => {
      const key = `${lab.publisher}\u0000${lab.templateId}`;
      groups.set(key, [...(groups.get(key) ?? []), lab]);
    });

  return Array.from(groups.entries()).flatMap(([key, groupLabs]) => {
    const [publisher, templateId] = key.split("\u0000") as [
      MainlandPublisher,
      VisualizationTemplateId,
    ];
    const partTotal = Math.ceil(groupLabs.length / packageSize);
    return Array.from({ length: partTotal }, (_, partIndex) => {
      const part = partIndex + 1;
      return {
        id: `${publisher}:${templateId}:${part}/${partTotal}`,
        labs: groupLabs.slice(
          partIndex * packageSize,
          (partIndex + 1) * packageSize,
        ),
        part,
        partTotal,
        publisher,
        templateId,
      };
    });
  });
}

async function registerMainlandStudent(
  page: Page,
  testInfo: TestInfo,
  labPackage: LabPackage,
) {
  const suffix =
    `${uniqueSuffix(testInfo)}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`
      .replace(/[^a-z0-9-]+/gi, "-")
      .toLowerCase()
      .slice(0, 72);
  const username = `china-viz-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `China Visualization QA ${labPackage.publisher}`,
      username,
      email: username,
      password: "start12345",
      grade: labPackage.labs[0].grade,
      // Mainland publisher selection is the access boundary. The persisted
      // legacy track remains MAINLAND_PEP_HIGH for all Mainland profiles.
      curriculumTrack: "MAINLAND_PEP_HIGH",
      curriculumProfile: {
        region: "MAINLAND",
        publisher: labPackage.publisher,
      },
      language,
      theme,
    },
  });

  const failureBody = response.ok() ? "" : await response.text();
  expect(
    response.status(),
    `register ${labPackage.publisher} visualization student${failureBody ? `: ${failureBody.slice(0, 300)}` : ""}`,
  ).toBe(200);
  const payload = (await response.json()) as { user?: { id?: unknown } };
  expect(
    payload.user?.id,
    "registered Mainland visualization student id",
  ).toEqual(expect.any(String));
  return payload.user!.id as string;
}

async function requestTelemetryQuiescence(page: Page, userId: string) {
  if (!page.url().startsWith(configuredBaseOrigin)) return;
  const prefixes = [
    learningAnalyticsOutboxStorageKey(userId),
    unconfirmedLearningAnalyticsOutboxStorageKey(userId),
    visualizationSessionOutboxUserStoragePrefix(userId),
  ];
  await page.evaluate((eventName) => {
    window.dispatchEvent(new Event(eventName));
  }, learningAnalyticsFlushRequestedEventName);
  await page.waitForFunction(
    ({ expectedPrefixes }) => {
      const keys = Array.from(
        { length: window.localStorage.length },
        (_, index) => window.localStorage.key(index),
      ).filter((key): key is string => typeof key === "string");
      return expectedPrefixes.every((prefix) =>
        keys.every((key) => !key.startsWith(prefix)),
      );
    },
    { expectedPrefixes: prefixes },
    { timeout: telemetryDrainTimeoutMs },
  );
}

async function assertExactLearnerInteractionPersisted(
  section: Locator,
  lab: MainlandLab,
) {
  const expectedModuleId = buildVisualizationSessionModuleId(lab);
  const card = section.locator(
    `[data-viz-card][data-viz-module-id=${JSON.stringify(expectedModuleId)}][data-viz-topic-id=${JSON.stringify(lab.topicId)}]`,
  );
  await expect(card, `${lab.labId}: exact learner card identity`).toHaveCount(
    1,
  );
  // Every executable path above ends with a real Playwright click on a learner
  // control. Wait for the product's four-second engagement rule rather than
  // racing its effect and falsely treating an empty outbox as terminal.
  await expect(
    card,
    `${lab.labId}: real interaction plus dwell gate`,
  ).toHaveAttribute("data-viz-explore-gate", "engaged", { timeout: 10_000 });
  await expect(
    card,
    `${lab.labId}: exact session durable acknowledgement`,
  ).toHaveAttribute("data-viz-save-state", "saved", {
    timeout: telemetryDrainTimeoutMs,
  });
}

async function assertPackageTelemetryDurability(
  page: Page,
  userId: string,
  labPackage: LabPackage,
) {
  const sessionsResponse = await page.request.get(
    "/api/visualization-sessions",
  );
  expect(
    sessionsResponse.status(),
    "durable visualization-session reread",
  ).toBe(200);
  const sessionsPayload = (await sessionsResponse.json()) as {
    sessions?: Array<{ moduleId?: unknown; topicId?: unknown }>;
  };
  const exactScopes = new Set(
    (sessionsPayload.sessions ?? []).map(
      (session) =>
        `${String(session.moduleId)}\u001f${String(session.topicId)}`,
    ),
  );
  for (const lab of labPackage.labs) {
    expect(
      exactScopes.has(
        `${buildVisualizationSessionModuleId(lab)}\u001f${lab.topicId}`,
      ),
      `${lab.labId}: visualization session must survive a server reread for exact module/topic scope`,
    ).toBe(true);
  }

  const generationKey = `mais:learning-analytics-generation:v1:${encodeURIComponent(userId)}`;
  const generation = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    generationKey,
  );
  expect(
    generation,
    "exact-user analytics generation is locally durable",
  ).toMatch(/^\d+$/u);
  const summaryResponse = await page.request.get(
    `/api/analytics/summary?grade=${encodeURIComponent(labPackage.labs[0].grade)}&window=7d`,
  );
  expect(
    summaryResponse.status(),
    "durable learning-event summary reread",
  ).toBe(200);
  const summaryPayload = (await summaryResponse.json()) as {
    summary?: { eventCount?: unknown };
  };
  expect(
    summaryPayload.summary?.eventCount,
    "server summary includes delivered lab events",
  ).toEqual(expect.any(Number));
  expect(Number(summaryPayload.summary?.eventCount)).toBeGreaterThan(0);
}

function installRuntimeMonitor(page: Page, baseOrigin: string) {
  const issues = new Map<string, Set<string>>();
  const requestLabOwners = new WeakMap<Request, string>();
  const responseStatuses = new WeakMap<Request, number>();
  const pendingTelemetry = new Map<Request, PendingTelemetryEvidence>();
  const completedTelemetry: CompletedTelemetryEvidence[] = [];
  let activeLabId = "setup";
  let lastTelemetryActivityAt = 0;
  const recordFor = (labId: string, message: string) => {
    const labIssues = issues.get(labId) ?? new Set<string>();
    labIssues.add(message.replace(/\s+/g, " ").trim().slice(0, 500));
    issues.set(labId, labIssues);
  };
  const record = (message: string) => recordFor(activeLabId, message);
  const sameOrigin = (url: string) => {
    try {
      return new URL(url).origin === baseOrigin;
    } catch {
      return false;
    }
  };

  page.on("pageerror", (error) => record(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") record(`console.error: ${message.text()}`);
  });
  page.on("request", (request) => {
    if (!sameOrigin(request.url())) return;
    const ownerLabId = activeLabId;
    requestLabOwners.set(request, ownerLabId);
    if (
      isTrackedTelemetryRequest(request.method(), request.url(), baseOrigin)
    ) {
      lastTelemetryActivityAt = Date.now();
      pendingTelemetry.set(request, {
        labId: ownerLabId,
        method: request.method(),
        startedAt: lastTelemetryActivityAt,
        url: request.url(),
      });
    }
  });
  page.on("requestfinished", (request) => {
    const pending = pendingTelemetry.get(request);
    if (!pending) return;
    const completedAt = Date.now();
    pendingTelemetry.delete(request);
    lastTelemetryActivityAt = completedAt;
    completedTelemetry.push({
      ...pending,
      durationMs: Math.max(0, completedAt - pending.startedAt),
      failure: null,
      outcome: "finished",
      status: responseStatuses.get(request) ?? null,
    });
  });
  page.on("requestfailed", (request) => {
    if (!sameOrigin(request.url())) return;
    const requestOwner = requestLabOwners.get(request) ?? activeLabId;
    const reason = request.failure()?.errorText ?? "unknown transport failure";
    const pending = pendingTelemetry.get(request);
    if (pending) {
      const completedAt = Date.now();
      pendingTelemetry.delete(request);
      lastTelemetryActivityAt = completedAt;
      completedTelemetry.push({
        ...pending,
        durationMs: Math.max(0, completedAt - pending.startedAt),
        failure: reason,
        outcome: "failed",
        status: null,
      });
    }
    const headers = request.headers();
    const isNextPrefetch =
      request.resourceType() === "fetch" &&
      (new URL(request.url()).searchParams.has("_rsc") ||
        headers["next-router-prefetch"] === "1" ||
        /prefetch/i.test(headers.purpose ?? "") ||
        /prefetch/i.test(headers["sec-purpose"] ?? ""));
    const isExpectedNextRscCancellation =
      /ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason) &&
      isNextPrefetch;
    // Next may cancel a speculative/obsolete RSC request after the visible
    // route has already committed (for example while URL filters normalize),
    // so this cancellation is not confined to our explicit page.goto window.
    // The response-status and required-surface assertions still catch a real
    // route load failure.
    if (isExpectedNextRscCancellation) return;
    recordFor(
      requestOwner,
      `requestfailed: ${request.method()} ${request.url()} (${reason})`,
    );
  });
  page.on("response", (response) => {
    responseStatuses.set(response.request(), response.status());
    if (!sameOrigin(response.url()) || response.status() < 400) return;
    const requestOwner =
      requestLabOwners.get(response.request()) ?? activeLabId;
    recordFor(
      requestOwner,
      `HTTP ${response.status()}: ${response.request().method()} ${response.url()}`,
    );
  });

  return {
    issuesFor(labId: string) {
      return Array.from(issues.get(labId) ?? []);
    },
    setActiveLab(labId: string) {
      activeLabId = labId;
    },
    telemetryEvidence() {
      return completedTelemetry.map((entry) => ({ ...entry }));
    },
    async waitForTelemetryIdle(
      context: string,
      timeoutMs: number,
      quietWindowMs: number,
    ) {
      const deadline = Date.now() + timeoutMs;
      const quietDeadline = deadline + quietWindowMs;

      while (true) {
        const now = Date.now();
        if (pendingTelemetry.size === 0) {
          const quietForMs =
            lastTelemetryActivityAt === 0
              ? quietWindowMs
              : now - lastTelemetryActivityAt;
          if (quietForMs >= quietWindowMs) return true;
          // A request that finishes at the delivery deadline still receives
          // exactly one quiet-window grace period. This prevents an empty
          // "pending requests" timeout race without extending the request's
          // own bounded drain deadline.
          if (now >= quietDeadline) break;
        } else if (now >= deadline) {
          break;
        }

        const remainingMs =
          pendingTelemetry.size === 0 ? quietDeadline - now : deadline - now;
        await new Promise<void>((resolve) => {
          setTimeout(resolve, Math.max(1, Math.min(25, remainingMs)));
        });
      }

      const pending = Array.from(pendingTelemetry.values());
      const diagnostic = formatTelemetryDrainTimeout(
        context,
        timeoutMs,
        pending,
      );
      if (pending.length === 0) {
        recordFor(
          activeLabId,
          `${diagnostic} Last tracked request completed without the required ${quietWindowMs}ms quiet window.`,
        );
      } else {
        new Set(pending.map((request) => request.labId)).forEach((labId) =>
          recordFor(labId, diagnostic),
        );
      }
      return false;
    },
  };
}

function summarizeTelemetryEvidence(evidence: CompletedTelemetryEvidence[]) {
  return Array.from(
    evidence.reduce((groups, entry) => {
      let path = entry.url;
      try {
        path = new URL(entry.url).pathname;
      } catch {
        // Preserve the original URL if it cannot be parsed.
      }
      const group = groups.get(path) ?? [];
      group.push(entry);
      groups.set(path, group);
      return groups;
    }, new Map<string, CompletedTelemetryEvidence[]>()),
  )
    .map(([path, entries]) => {
      const durations = entries
        .map((entry) => entry.durationMs)
        .sort((left, right) => left - right);
      const p95Index = Math.max(0, Math.ceil(durations.length * 0.95) - 1);
      return {
        count: entries.length,
        failed: entries.filter((entry) => entry.outcome === "failed").length,
        maxMs: durations.at(-1) ?? 0,
        p95Ms: durations[p95Index] ?? 0,
        path,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function disableMotion(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
}

async function settleVisualization(section: Locator) {
  await section.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function ensureRendererReady(
  section: Locator,
  checkCanvasPixels: boolean,
) {
  await expect(
    section.locator("[data-viz-surface]").first(),
    "visualization surface",
  ).toBeVisible({
    timeout: 30_000,
  });

  const renderer = section
    .locator("[data-viz-surface][data-viz-renderer]")
    .first();
  if ((await renderer.count()) === 0) return;

  await expect(renderer, "3D renderer surface").toHaveAttribute(
    "data-viz-canvas-ready",
    "true",
    {
      timeout: 35_000,
    },
  );
  const canvas = renderer.locator("canvas").first();
  await expect(canvas, "3D renderer canvas").toBeVisible({ timeout: 35_000 });
  const canvasHealth = await canvas.evaluate((element, shouldReadPixels) => {
    const target = element as HTMLCanvasElement;
    return {
      dataUrlLength: shouldReadPixels
        ? target.toDataURL("image/png").length
        : null,
      height: target.height,
      width: target.width,
    };
  }, checkCanvasPixels);
  expect(canvasHealth.width, "3D canvas backing width").toBeGreaterThan(1);
  expect(canvasHealth.height, "3D canvas backing height").toBeGreaterThan(1);
  if (checkCanvasPixels) {
    expect(
      canvasHealth.dataUrlLength ?? 0,
      "3D canvas painted image",
    ).toBeGreaterThan(2_000);
  }
}

async function auditLearnerThreeDControls(
  page: Page,
  section: Locator,
  lab: MainlandLab,
  addFailure: (labId: string, state: string, issue: string) => void,
) {
  if (!lab.threeD?.enabled) return;

  const dock = section
    .locator(
      '[data-viz-manim-control-dock][data-viz-manim-presentation="learner"]',
    )
    .first();
  if ((await dock.count()) === 0) {
    addFailure(
      lab.labId,
      "learner-controls",
      "3D lab has no learner presentation control dock.",
    );
    return;
  }

  const issues = await dock.evaluate((root) => {
    const results: string[] = [];
    const forbiddenSelectors = [
      "[data-viz-manim-camera-mode-control]",
      "[data-viz-manim-capture-control]",
      "[data-viz-manim-parameter-panel-control]",
      "[data-viz-manim-checkpoint-control]",
      "[data-viz-manim-history-control]",
      "[data-viz-manim-authoring-control]",
    ];
    const interactiveSelector =
      'button, a[href], input, select, textarea, [role="button"], [role="slider"], [tabindex]';

    if (
      root.getAttribute("data-viz-manim-authoring-controls-visible") !== "false"
    ) {
      results.push(
        "Learner dock does not report authoring-controls-visible=false.",
      );
    }

    forbiddenSelectors.forEach((selector) => {
      const group = root.querySelector<HTMLElement>(selector);
      if (!group) {
        results.push(
          `QA selector ${selector} disappeared from the learner DOM.`,
        );
        return;
      }
      const style = window.getComputedStyle(group);
      const rect = group.getBoundingClientRect();
      if (
        style.display !== "none" ||
        rect.width > 0 ||
        rect.height > 0 ||
        group.getClientRects().length > 0
      ) {
        results.push(
          `${selector} occupies learner layout (display=${style.display}, rect=${Math.round(rect.width)}x${Math.round(rect.height)}).`,
        );
      }
      group
        .querySelectorAll<HTMLElement>(interactiveSelector)
        .forEach((control) => {
          const before = document.activeElement;
          control.focus();
          if (document.activeElement === control) {
            results.push(
              `${selector} descendant ${control.tagName.toLowerCase()} accepts focus in learner mode.`,
            );
          }
          if (before instanceof HTMLElement) before.focus();
          else if (document.activeElement instanceof HTMLElement)
            document.activeElement.blur();
        });
    });

    const allowed = new Set([
      root.querySelector("[data-viz-three-reset-camera]"),
      root.querySelector("[data-viz-manim-playback-toggle]"),
      root.querySelector("[data-viz-manim-timeline-scrubber]"),
    ]);
    Array.from(root.querySelectorAll<HTMLElement>(interactiveSelector)).forEach(
      (control) => {
        const rect = control.getBoundingClientRect();
        const style = window.getComputedStyle(control);
        const visible =
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          !control.closest('[hidden], [aria-hidden="true"]');
        if (visible && !allowed.has(control)) {
          results.push(
            `Unexpected learner dock control is visible: ${control.outerHTML.slice(0, 180)}.`,
          );
        }
      },
    );

    return results;
  });
  issues.forEach((issue) => addFailure(lab.labId, "learner-controls", issue));

  const reset = dock.locator("[data-viz-three-reset-camera]").first();
  const playback = dock.locator("[data-viz-manim-playback-toggle]").first();
  const timeline = dock.locator("[data-viz-manim-timeline-scrubber]").first();
  await expect(reset, "learner Reset camera control").toBeVisible();
  await expect(playback, "learner Play/Pause control").toBeVisible();
  await expect(timeline, "learner timeline control").toBeVisible();

  await reset.focus();
  await page.keyboard.press("Tab");
  if (
    !(await playback.evaluate((element) => document.activeElement === element))
  ) {
    addFailure(
      lab.labId,
      "learner-controls",
      "Tab order from Reset camera did not advance to Play/Pause.",
    );
  }
  await page.keyboard.press("Tab");
  if (
    !(await timeline.evaluate((element) => document.activeElement === element))
  ) {
    addFailure(
      lab.labId,
      "learner-controls",
      "Tab order from Play/Pause did not advance to the timeline.",
    );
  }
  await page.keyboard.press("Tab");
  const focusEnteredForbiddenGroup = await dock.evaluate((root) =>
    Boolean(
      document.activeElement?.closest(
        "[data-viz-manim-camera-mode-control], [data-viz-manim-capture-control], [data-viz-manim-parameter-panel-control], [data-viz-manim-checkpoint-control], [data-viz-manim-history-control], [data-viz-manim-authoring-control]",
      ),
    ),
  );
  if (focusEnteredForbiddenGroup) {
    addFailure(
      lab.labId,
      "learner-controls",
      "Tab order entered a hidden authoring/capture/debug group.",
    );
  }

  const playbackSurface = section
    .locator("[data-viz-surface][data-viz-manim-playback-state]")
    .first();
  if (
    (await playbackSurface.getAttribute("data-viz-manim-playback-state")) ===
    "playing"
  ) {
    await playback.click();
    await expect(
      playbackSurface,
      "paused 3D surface for deterministic parameter QA",
    ).toHaveAttribute("data-viz-manim-playback-state", "paused");
  }
}

async function auditTextContrast(
  section: Locator,
  lab: MainlandLab,
  state: string,
  addFailure: FailureRecorder,
) {
  try {
    const contrast = await section.evaluate(scanHkVisualizationTextContrast, {
      authoringSelector: learnerContrastAuthoringSelector,
    });
    if (contrast.checkedTextCount === 0 || !contrast.worst) {
      addFailure(
        lab.labId,
        state,
        "Contrast scanner found no visible learner HTML/SVG text to evaluate.",
      );
    }
    for (const issue of contrast.issues) {
      addFailure(
        lab.labId,
        state,
        `Text contrast ${issue.code}: ${issue.message}`,
      );
    }
  } catch (error) {
    addFailure(
      lab.labId,
      state,
      `Text contrast scan failed closed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function auditFractionValueLabels(
  scrollSurface: Locator,
  lab: MainlandLab,
  state: string,
  addFailure: FailureRecorder,
) {
  if (
    resolveConfiguredVisualizationSemanticModel(lab).semanticFamily !==
    "fraction-operations"
  ) {
    return;
  }
  const labels = scrollSurface.locator("[data-viz-fraction-value-label]");
  const labelCount = await labels.count();
  if (labelCount !== 2) {
    addFailure(
      lab.labId,
      state,
      `Expected two fraction operand labels, found ${labelCount}.`,
    );
    return;
  }
  for (let index = 0; index < labelCount; index += 1) {
    const contrast = await labels
      .nth(index)
      .evaluate(scanHkVisualizationTextContrast, {
        authoringSelector: learnerContrastAuthoringSelector,
      });
    if (contrast.checkedTextCount !== 1 || !contrast.worst) {
      addFailure(
        lab.labId,
        state,
        `Fraction operand label ${index + 1} produced ${contrast.checkedTextCount} contrast samples instead of one.`,
      );
    }
    contrast.issues.forEach((issue) => {
      addFailure(
        lab.labId,
        state,
        `Fraction operand label ${index + 1} contrast ${issue.code}: ${issue.message}`,
      );
    });
  }

  const geometry = await scrollSurface.evaluate((root) => {
    const rectsOverlap = (left: DOMRect, right: DOMRect) =>
      Math.min(left.right, right.right) - Math.max(left.left, right.left) >
        0.5 &&
      Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0.5;
    const viewport = root.getBoundingClientRect();
    const surface =
      root.querySelector<SVGGraphicsElement>("[data-viz-surface]");
    const surfaceRect = surface?.getBoundingClientRect() ?? null;
    const titleRect =
      root
        .querySelector<SVGGraphicsElement>("[data-viz-title-badge-background]")
        ?.getBoundingClientRect() ?? null;
    const formulaRect =
      root
        .querySelector<SVGGraphicsElement>(
          '[data-viz-name="semantic formula"] > rect',
        )
        ?.getBoundingClientRect() ?? null;
    const bars = Array.from(
      root.querySelectorAll<SVGGElement>(
        '[data-viz-name="exact fraction bar"]',
      ),
    ).map((bar) => {
      const labelRect =
        bar
          .querySelector<SVGGraphicsElement>("[data-viz-fraction-value-label]")
          ?.getBoundingClientRect() ?? null;
      const outlineRect =
        bar
          .querySelector<SVGGraphicsElement>("rect")
          ?.getBoundingClientRect() ?? null;
      const partitionRects = Array.from(
        bar.querySelectorAll<SVGGraphicsElement>("line"),
      ).map((line) => line.getBoundingClientRect());
      return {
        labelToBarGap:
          labelRect && outlineRect ? outlineRect.top - labelRect.bottom : null,
        labelWithinSurface: Boolean(
          labelRect &&
          surfaceRect &&
          labelRect.left >= surfaceRect.left - 1 &&
          labelRect.right <= surfaceRect.right + 1 &&
          labelRect.top >= surfaceRect.top - 1 &&
          labelRect.bottom <= surfaceRect.bottom + 1,
        ),
        labelWithinViewport: Boolean(
          labelRect &&
          labelRect.left >= viewport.left - 1 &&
          labelRect.right <= viewport.right + 1,
        ),
        outlineBottom: outlineRect?.bottom ?? null,
        partitionIntersection: Boolean(
          labelRect &&
          partitionRects.some((partitionRect) =>
            rectsOverlap(labelRect, partitionRect),
          ),
        ),
        titleGap:
          labelRect && titleRect ? labelRect.top - titleRect.bottom : null,
      };
    });
    const lastOutlineBottom = bars.at(-1)?.outlineBottom ?? null;
    return {
      bars,
      formulaGap:
        formulaRect && lastOutlineBottom !== null
          ? formulaRect.top - lastOutlineBottom
          : null,
      hasFormula: formulaRect !== null,
      hasSurface: surfaceRect !== null,
      hasTitle: titleRect !== null,
    };
  });
  if (
    !geometry.hasSurface ||
    !geometry.hasTitle ||
    !geometry.hasFormula ||
    geometry.bars.length !== 2
  ) {
    addFailure(
      lab.labId,
      state,
      `Fraction label geometry is incomplete: ${JSON.stringify(geometry)}.`,
    );
    return;
  }
  geometry.bars.forEach((bar, index) => {
    if (
      bar.labelToBarGap === null ||
      bar.labelToBarGap < 4 ||
      !bar.labelWithinSurface ||
      !bar.labelWithinViewport ||
      bar.partitionIntersection
    ) {
      addFailure(
        lab.labId,
        state,
        `Fraction operand label ${index + 1} geometry is unsafe: ${JSON.stringify(bar)}.`,
      );
    }
  });
  if ((geometry.bars[0]?.titleGap ?? -Infinity) < 8) {
    addFailure(
      lab.labId,
      state,
      `First fraction label is too close to the title badge: ${JSON.stringify(geometry)}.`,
    );
  }
  if ((geometry.formulaGap ?? -Infinity) < 8) {
    addFailure(
      lab.labId,
      state,
      `Second fraction bar is too close to the formula: ${JSON.stringify(geometry)}.`,
    );
  }
}

async function auditCollisionCoverage(
  section: Locator,
  lab: MainlandLab,
  state: string,
  addFailure: FailureRecorder,
): Promise<ChinaVisualizationCollisionReceipt | null> {
  try {
    const snapshot = await scanHkVisualizationCollisions(section, state);
    const receiptIssues = chinaVisualizationCollisionSnapshotIssues(snapshot);
    receiptIssues.forEach((issue) =>
      addFailure(lab.labId, state, `Collision coverage ${issue}`),
    );
    if (receiptIssues.length > 0) return null;
    return chinaVisualizationCollisionReceipt(snapshot);
  } catch (error) {
    addFailure(
      lab.labId,
      state,
      `Collision scan failed closed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function scanState(
  section: Locator,
  lab: MainlandLab,
  state: string,
  checkCanvasPixels: boolean,
  addFailure: (labId: string, state: string, issue: string) => void,
  rangeStateExecutionPlan: ChinaVisualizationRangeStateExecutionPlan | null = null,
  recordExecutionReceipt = true,
) {
  const collisionReceipts: ChinaVisualizationCollisionReceipt[] = [];
  const receiptId = stateReceiptId(lab.labId, state);
  const verifyRequestedRangeState = async (
    phase: ChinaVisualizationRangeStateExecutionMismatch["phase"],
  ) => {
    if (rangeStateExecutionPlan === null) return true;
    const observed = await observedRangeStateSignature(section);
    const mismatch = chinaVisualizationRangeStateExecutionMismatch(
      receiptId,
      phase,
      rangeStateExecutionPlan,
      observed,
    );
    if (!mismatch) return true;
    rangeStateExecutionMismatches.push(mismatch);
    addFailure(
      lab.labId,
      state,
      `RANGE_STATE_EXECUTION domain=${mismatch.domainId}@${mismatch.domainVersion} phase=${phase} requested=${JSON.stringify(mismatch.requested)} expected=${JSON.stringify(mismatch.expected)} observed=${JSON.stringify(mismatch.observed)}.`,
    );
    return false;
  };

  await settleVisualization(section);
  // A state is not auditable until every control still equals the complete
  // requested vector. In particular, setting slider B must not silently clamp
  // slider A and then let contrast/collision scans certify the wrong state.
  if (!(await verifyRequestedRangeState("before-scan"))) return false;
  await ensureRendererReady(section, checkCanvasPixels);
  const expectedSemanticModel =
    resolveConfiguredVisualizationSemanticModel(lab);
  const expectedCompositeStrands =
    resolveConfiguredVisualizationCompositeStrands(lab);
  const expectsSemanticSvg =
    lab.threeD?.enabled !== true || lab.threeD?.premiumLaunch !== true;
  const scrollSurfaces = section.locator("[data-viz-scroll-surface]");
  const scrollSurfaceCount = await scrollSurfaces.count();
  if (scrollSurfaceCount > 1) {
    addFailure(
      lab.labId,
      state,
      `Expected at most one local data-viz-scroll-surface, found ${scrollSurfaceCount}.`,
    );
  }

  if (scrollSurfaceCount === 0) {
    await auditTextContrast(section, lab, state, addFailure);
    if (expectsSemanticSvg) {
      addFailure(
        lab.labId,
        state,
        "The configured semantic SVG surface is missing for a non-3D learner lab.",
      );
    }
    const issues = await collectUiIssues(section);
    issues.forEach((issue) => addFailure(lab.labId, state, issue));
    const collisionReceipt = await auditCollisionCoverage(
      section,
      lab,
      state,
      addFailure,
    );
    if (collisionReceipt) collisionReceipts.push(collisionReceipt);
    if (!(await verifyRequestedRangeState("after-scan"))) return false;
    if (recordExecutionReceipt) executedShardStateIds.push(receiptId);
    return { collisionReceipts };
  }

  const scrollSurface = scrollSurfaces.first();
  const semanticSurface = scrollSurface.locator("[data-viz-surface]").first();
  const semanticSurfaceContract = await semanticSurface.evaluate((surface) => ({
    family: surface.getAttribute("data-viz-semantic-family"),
    renderer: surface.getAttribute("data-viz-semantic-renderer"),
    variant: surface.getAttribute("data-viz-semantic-variant"),
  }));
  if (semanticSurfaceContract.family !== expectedSemanticModel.semanticFamily) {
    addFailure(
      lab.labId,
      state,
      `Semantic surface family ${JSON.stringify(semanticSurfaceContract.family)} does not match ${JSON.stringify(expectedSemanticModel.semanticFamily)}.`,
    );
  }
  if (semanticSurfaceContract.variant !== expectedSemanticModel.variant) {
    addFailure(
      lab.labId,
      state,
      `Semantic surface variant ${JSON.stringify(semanticSurfaceContract.variant)} does not match ${JSON.stringify(expectedSemanticModel.variant)}.`,
    );
  }
  if (semanticSurfaceContract.renderer !== "implemented") {
    addFailure(
      lab.labId,
      state,
      `Semantic surface renderer is ${JSON.stringify(semanticSurfaceContract.renderer)}, expected "implemented".`,
    );
  }

  const semanticMarks = semanticSurface
    .locator("g[data-viz-semantic-family]")
    .first();
  if ((await semanticMarks.count()) === 0) {
    addFailure(
      lab.labId,
      state,
      "Semantic surface has no machine-observable family marks group.",
    );
  } else {
    const marksContract = await semanticMarks.evaluate((marks) => ({
      compositePlanSize: marks.getAttribute("data-viz-composite-plan-size"),
      compositeStrandIndex: marks.getAttribute(
        "data-viz-composite-strand-index",
      ),
      family: marks.getAttribute("data-viz-semantic-family"),
      invariantStatus: marks.getAttribute("data-viz-invariant-status"),
      kind: marks.getAttribute("data-viz-semantic-kind"),
      mathState: marks.getAttribute("data-viz-math-state"),
      stateJson: marks.getAttribute("data-viz-state-json"),
      semanticStrand: marks.getAttribute("data-viz-semantic-strand"),
      variant: marks.getAttribute("data-viz-semantic-variant"),
    }));
    if (marksContract.family !== expectedSemanticModel.semanticFamily) {
      addFailure(
        lab.labId,
        state,
        `Visible marks family ${JSON.stringify(marksContract.family)} does not match ${JSON.stringify(expectedSemanticModel.semanticFamily)}.`,
      );
    }
    if (marksContract.variant !== expectedSemanticModel.variant) {
      addFailure(
        lab.labId,
        state,
        `Visible marks variant ${JSON.stringify(marksContract.variant)} does not match ${JSON.stringify(expectedSemanticModel.variant)}.`,
      );
    }
    if (expectedCompositeStrands) {
      const activeIndex = Number(marksContract.compositeStrandIndex);
      const expectedStrand = expectedCompositeStrands[activeIndex];
      if (
        Number(marksContract.compositePlanSize) !==
        expectedCompositeStrands.length
      ) {
        addFailure(
          lab.labId,
          state,
          `Composite marks expose plan size ${JSON.stringify(marksContract.compositePlanSize)} instead of ${expectedCompositeStrands.length}.`,
        );
      }
      if (!Number.isInteger(activeIndex) || !expectedStrand) {
        addFailure(
          lab.labId,
          state,
          `Composite marks expose invalid strand index ${JSON.stringify(marksContract.compositeStrandIndex)}.`,
        );
      } else {
        if (marksContract.semanticStrand !== expectedStrand.family) {
          addFailure(
            lab.labId,
            state,
            `Composite parent strand ${JSON.stringify(marksContract.semanticStrand)} does not match ${JSON.stringify(expectedStrand.family)}.`,
          );
        }
        const childContract = await semanticMarks
          .locator(":scope > g[data-viz-semantic-family]")
          .first()
          .evaluate((child) => ({
            family: child.getAttribute("data-viz-semantic-family"),
            variant: child.getAttribute("data-viz-semantic-variant"),
          }));
        if (childContract.family !== expectedStrand.family) {
          addFailure(
            lab.labId,
            state,
            `Composite child family ${JSON.stringify(childContract.family)} does not match strand ${activeIndex} family ${JSON.stringify(expectedStrand.family)}.`,
          );
        }
        if (childContract.variant !== expectedStrand.variant) {
          addFailure(
            lab.labId,
            state,
            `Composite child variant ${JSON.stringify(childContract.variant)} does not match strand ${activeIndex} variant ${JSON.stringify(expectedStrand.variant)}.`,
          );
        }
        try {
          const machineState = JSON.parse(
            marksContract.mathState ?? "null",
          ) as {
            strandFamily?: string;
            strandVariant?: string;
          } | null;
          if (
            machineState?.strandFamily !== expectedStrand.family ||
            machineState?.strandVariant !== expectedStrand.variant
          ) {
            addFailure(
              lab.labId,
              state,
              `Composite machine state does not identify exact strand ${expectedStrand.family}/${expectedStrand.variant}.`,
            );
          }
        } catch {
          addFailure(
            lab.labId,
            state,
            "Composite machine state is not valid JSON.",
          );
        }
      }
    }
    if (
      marksContract.invariantStatus &&
      marksContract.invariantStatus !== "pass"
    ) {
      addFailure(
        lab.labId,
        state,
        `Primary semantic invariant status is ${JSON.stringify(marksContract.invariantStatus)}.`,
      );
    }
    if (marksContract.family === "fraction-operations") {
      try {
        const exactIssue = exactFractionOperationInvariantIssue(
          JSON.parse(marksContract.stateJson ?? "null") as unknown,
        );
        if (exactIssue) {
          addFailure(
            lab.labId,
            state,
            `Exact integer fraction invariant: ${exactIssue}.`,
          );
        }
      } catch {
        addFailure(
          lab.labId,
          state,
          "Exact integer fraction invariant state is not valid JSON.",
        );
      }
    }
    if (!marksContract.invariantStatus && !marksContract.mathState) {
      addFailure(
        lab.labId,
        state,
        "Semantic marks expose neither a checked primary invariant nor a secondary math state.",
      );
    }
    const failedChildInvariants = await semanticMarks
      .locator('[data-viz-invariant-status="fail"]')
      .count();
    if (failedChildInvariants > 0) {
      addFailure(
        lab.labId,
        state,
        `${failedChildInvariants} child semantic invariant(s) failed.`,
      );
    }
    if (expectedCompositeStrands) {
      const childEvidence = await semanticMarks
        .locator('[data-viz-invariant-status="pass"], [data-viz-math-state]')
        .count();
      if (childEvidence === 0) {
        addFailure(
          lab.labId,
          state,
          "Composite strand has no child invariant or machine-readable math state.",
        );
      }
    }
    if (marksContract.kind === "catalog") {
      addFailure(
        lab.labId,
        state,
        "Learner surface still renders the catalog-scope placeholder instead of a mathematical strand.",
      );
    }
  }
  const contract = await scrollSurface.evaluate((element) => {
    const target = element as HTMLElement;
    const style = window.getComputedStyle(target);
    const describedBy = (target.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .map((id) => id.trim())
      .filter(Boolean);
    const describedHint = describedBy
      .map((id) => document.getElementById(id))
      .find((candidate): candidate is HTMLElement => Boolean(candidate));
    const explicitHint =
      target.parentElement?.querySelector<HTMLElement>("[data-viz-pan-hint]") ??
      null;
    const hint = explicitHint ?? describedHint;
    const hintStyle = hint ? window.getComputedStyle(hint) : null;
    const hintRect = hint?.getBoundingClientRect();
    const hintVisible = Boolean(
      hint &&
      hintRect &&
      hintRect.width > 1 &&
      hintRect.height > 1 &&
      hintStyle?.display !== "none" &&
      hintStyle?.visibility !== "hidden",
    );
    const innerSurface = target.querySelector<HTMLElement | SVGElement>(
      "[data-viz-surface]",
    );
    return {
      clientHeight: target.clientHeight,
      clientWidth: target.clientWidth,
      focusable: target.tabIndex >= 0,
      hasAccessibleName: Boolean(
        target.getAttribute("aria-label")?.trim() ||
        target.getAttribute("aria-labelledby")?.trim(),
      ),
      hintVisible,
      horizontalOverflow: target.scrollWidth - target.clientWidth,
      innerSurfaceWidth: innerSurface?.getBoundingClientRect().width ?? 0,
      overflowX: style.overflowX,
      scrollHeight: target.scrollHeight,
      scrollWidth: target.scrollWidth,
      verticalOverflow: target.scrollHeight - target.clientHeight,
    };
  });

  if (!contract.focusable) {
    addFailure(
      lab.labId,
      state,
      "data-viz-scroll-surface is not keyboard focusable.",
    );
  }
  if (!contract.hasAccessibleName) {
    addFailure(
      lab.labId,
      state,
      "data-viz-scroll-surface has no accessible name.",
    );
  }
  if (!/^(?:auto|scroll)$/.test(contract.overflowX)) {
    addFailure(
      lab.labId,
      state,
      `data-viz-scroll-surface overflow-x is ${JSON.stringify(contract.overflowX)}, expected auto or scroll.`,
    );
  }
  if (contract.verticalOverflow > 2) {
    addFailure(
      lab.labId,
      state,
      `data-viz-scroll-surface has ${contract.verticalOverflow}px unintended vertical scrolling.`,
    );
  }
  if (contract.scrollWidth < 638 || contract.innerSurfaceWidth < 638) {
    addFailure(
      lab.labId,
      state,
      `data-viz-scroll-surface does not preserve the 640px model width (scroll=${contract.scrollWidth}, surface=${Math.round(contract.innerSurfaceWidth)}).`,
    );
  }
  if (contract.horizontalOverflow > 2 && !contract.hintVisible) {
    addFailure(
      lab.labId,
      state,
      "Scrollable visualization has no visible pan hint.",
    );
  }

  if (expectedSemanticModel.semanticFamily === "fraction-operations") {
    const fractionLabelVisibility = await scrollSurface.evaluate((root) => {
      const viewport = root.getBoundingClientRect();
      return Array.from(
        root.querySelectorAll<SVGGraphicsElement>(
          "[data-viz-fraction-value-label]",
        ),
      ).map((label) => {
        const rect = label.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          fullyVisible:
            rect.width > 0 &&
            rect.left >= viewport.left - 1 &&
            rect.right <= viewport.right + 1,
        };
      });
    });
    if (
      fractionLabelVisibility.length !== 2 ||
      fractionLabelVisibility.some((label) => !label.fullyVisible)
    ) {
      addFailure(
        lab.labId,
        state,
        `Both operand values must be visible in the default left view; observed=${JSON.stringify(fractionLabelVisibility)}.`,
      );
    }
  }

  const maxScrollLeft = Math.max(
    0,
    contract.scrollWidth - contract.clientWidth,
  );
  const scrollPositions = Array.from(
    new Map(
      [
        { label: "left", value: 0 },
        { label: "mid", value: maxScrollLeft / 2 },
        { label: "right", value: maxScrollLeft },
      ].map((position) => [Math.round(position.value), position]),
    ).values(),
  );

  for (const position of scrollPositions) {
    const actualScrollLeft = await scrollSurface.evaluate(
      (element, nextScrollLeft) => {
        const target = element as HTMLElement;
        target.scrollLeft = nextScrollLeft;
        return new Promise<number>((resolve) => {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve(target.scrollLeft)),
          );
        });
      },
      position.value,
    );
    if (Math.abs(actualScrollLeft - position.value) > 2) {
      addFailure(
        lab.labId,
        `${state};scroll=${position.label}`,
        `Scroll position requested ${Math.round(position.value)} but settled at ${Math.round(actualScrollLeft)}.`,
      );
    }
    await auditTextContrast(
      section,
      lab,
      `${state};scroll=${position.label}`,
      addFailure,
    );
    if (position.label === "left") {
      await auditFractionValueLabels(
        scrollSurface,
        lab,
        `${state};scroll=left`,
        addFailure,
      );
    }
    const issues = await collectUiIssues(section);
    issues.forEach((issue) =>
      addFailure(lab.labId, `${state};scroll=${position.label}`, issue),
    );
    const collisionReceipt = await auditCollisionCoverage(
      section,
      lab,
      `${state};scroll=${position.label}`,
      addFailure,
    );
    if (collisionReceipt) collisionReceipts.push(collisionReceipt);
  }

  await scrollSurface.evaluate((element) => {
    (element as HTMLElement).scrollLeft = 0;
  });
  // Re-read the same complete signature after every renderer/layout/collision/
  // contrast/control scan so asynchronous dependency drift cannot earn a
  // receipt merely because the pre-scan vector was momentarily correct.
  if (!(await verifyRequestedRangeState("after-scan"))) return false;
  if (recordExecutionReceipt) executedShardStateIds.push(receiptId);
  return { collisionReceipts };
}

function resolveActiveSemanticControlExpectation(
  lab: MainlandLab,
  requestedStrandIndex = 0,
  activeMode?: number,
): ActiveSemanticControlExpectation {
  const semanticModel = resolveConfiguredVisualizationSemanticModel(lab);
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const strand = strands?.[requestedStrandIndex];
  if (strands && !strand) {
    throw new RangeError(
      `${lab.labId}: strand index ${requestedStrandIndex} is outside its exact ${strands.length}-strand plan.`,
    );
  }

  const family = strand?.family ?? semanticModel.semanticFamily;
  const variant = strand?.variant ?? semanticModel.variant;
  const seedMode = activeMode ?? 0;
  const seedContract = getConfiguredVisualizationSemanticControlContract(
    family,
    variant,
    seedMode,
  );
  if (
    !seedContract ||
    seedContract.family !== family ||
    seedContract.externalPlan
  ) {
    throw new TypeError(
      `${lab.labId}: active semantic controls are not executable for ${family}/${variant}.`,
    );
  }
  const resolvedActiveMode = activeMode ?? seedContract.modes[0]?.value ?? 0;
  const contract =
    resolvedActiveMode === seedMode
      ? seedContract
      : getConfiguredVisualizationSemanticControlContract(
          family,
          variant,
          resolvedActiveMode,
        );
  if (!contract || contract.family !== family || contract.externalPlan) {
    throw new TypeError(
      `${lab.labId}: active semantic controls are not executable for ${family}/${variant}.`,
    );
  }

  return {
    contract,
    family,
    mode: resolvedActiveMode,
    strandIndex: strand ? requestedStrandIndex : null,
    variant,
  };
}

function stateReceiptId(labId: string, state: string) {
  return JSON.stringify([labId, state]);
}

function plannedRangeControls(
  expectation: ActiveSemanticControlExpectation,
): RangeControl[] {
  const initialValues = Object.fromEntries(
    expectation.contract.sliders.map(({ id, initial }) => [id, initial]),
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  const projected = projectConfiguredVisualizationSemanticControlState(
    expectation.contract,
    initialValues,
    expectation.mode,
  );
  return expectation.contract.sliders.map((slider, index) => ({
    disabled: projected.bounds[slider.id]?.disabled ?? Boolean(slider.disabled),
    id: slider.id,
    index,
    label: localizedContractLabel(slider.label),
    max: projected.bounds[slider.id]?.max ?? slider.max,
    min: projected.bounds[slider.id]?.min ?? slider.min,
    original: projected.values[slider.id] ?? slider.initial,
    step: slider.step,
  }));
}

function rangeStateExecutionPlanForExpectation(
  expectation: ActiveSemanticControlExpectation,
  requestedValues: Partial<
    Record<ConfiguredVisualizationSemanticSliderInput, number>
  > = {},
): ChinaVisualizationRangeStateExecutionPlan {
  const requested = Object.fromEntries(
    expectation.contract.sliders.map((slider) => [
      slider.id,
      requestedValues[slider.id] ?? slider.initial,
    ]),
  ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
  const projected = projectConfiguredVisualizationSemanticControlState(
    expectation.contract,
    requested,
    expectation.mode,
  );
  return {
    affectedControlIds: [...projected.domain.affectedControlIds],
    controllerInputs: [...projected.domain.controllerInputs],
    domainId: projected.domain.id,
    domainKind: projected.domain.kind,
    domainVersion: projected.domain.version,
    expected: expectation.contract.sliders.map((slider, index) => ({
      disabled:
        projected.bounds[slider.id]?.disabled ?? Boolean(slider.disabled),
      id: slider.id,
      index,
      max: projected.bounds[slider.id]?.max ?? slider.max,
      min: projected.bounds[slider.id]?.min ?? slider.min,
      value: projected.values[slider.id] ?? slider.initial,
    })),
    projection: projected.domain.projection,
    requested: expectation.contract.sliders.map((slider, index) => ({
      disabled: Boolean(slider.disabled),
      id: slider.id,
      index,
      max: slider.max,
      min: slider.min,
      value: requested[slider.id] ?? slider.initial,
    })),
  };
}

async function observedRangeStateSignature(
  section: Locator,
): Promise<ChinaVisualizationRangeStateSignatureEntry[]> {
  return await section
    .locator('[data-viz-semantic-slider] input[type="range"]')
    .evaluateAll((elements) =>
      elements.map((element, index) => {
        const input = element as HTMLInputElement;
        return {
          disabled: input.disabled,
          id:
            input
              .closest("[data-viz-semantic-slider]")
              ?.getAttribute("data-viz-parameter") ?? `range-${index}`,
          index,
          max: Number(input.max),
          min: Number(input.min),
          value: Number(input.value),
        };
      }),
    );
}

function plannedRangeStates(
  expectation: ActiveSemanticControlExpectation,
  statePrefix: string,
) {
  const ranges = plannedRangeControls(expectation);
  const states = ranges.flatMap((range) =>
    rangeValues(range).map(
      (value) => `${statePrefix}/range=${range.index}:${range.id}=${value}`,
    ),
  );
  if (ranges.length >= 2) {
    const endpointVectors =
      configuredVisualizationSemanticCanonicalDynamicStateVectors(
        expectation.contract,
        expectation.mode,
      );
    states.push(
      ...endpointVectors.map(
        (values) =>
          `${statePrefix}/range-endpoints=${ranges
            .map(
              (range) =>
                `${range.id}:${values[range.id as ConfiguredVisualizationSemanticSliderInput]}`,
            )
            .join(",")}`,
      ),
    );
  }
  return states;
}

function plannedModeStates(
  lab: MainlandLab,
  strandIndex: number,
  statePrefix: string,
) {
  const initialExpectation = resolveActiveSemanticControlExpectation(
    lab,
    strandIndex,
  );
  const modes =
    initialExpectation.contract.modes.length > 1
      ? initialExpectation.contract.modes
      : [];
  if (modes.length === 0) {
    return plannedRangeStates(initialExpectation, statePrefix);
  }
  return modes.flatMap((mode, modeIndex) => {
    const expectation = resolveActiveSemanticControlExpectation(
      lab,
      strandIndex,
      mode.value,
    );
    const modeStatePrefix = `${statePrefix}/mode=${modeIndex}:${mode.id}`;
    return [
      modeStatePrefix,
      ...plannedRangeStates(expectation, modeStatePrefix),
    ];
  });
}

function plannedStateReceiptIdsForLab(lab: MainlandLab) {
  const states = ["default"];
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  if (strands) {
    strands.forEach((strand, strandIndex) => {
      states.push(`strand=${strandIndex}:${strand.family}/${strand.variant}`);
      states.push(
        ...plannedModeStates(lab, strandIndex, `strand=${strandIndex}`),
      );
    });
  } else {
    states.push(...plannedModeStates(lab, 0, "direct"));
  }
  states.push("reset");
  return states.map((state) => stateReceiptId(lab.labId, state));
}

function localizedContractLabel(label: {
  en: string;
  zh: string;
  zhHans?: string;
}) {
  return language === "en" ? label.en : (label.zhHans ?? label.zh);
}

function normalizedUiText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function sameFiniteNumber(actual: number, expected: number) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9;
}

function expectedSemanticSliderDisplay(
  expectation: ActiveSemanticControlExpectation,
  control: ConfiguredVisualizationSemanticControlContract["sliders"][number],
) {
  const values = Object.fromEntries(
    expectation.contract.sliders.map((slider) => [slider.id, slider.initial]),
  ) as Partial<Record<"comparison" | "height" | "value", number>>;
  if (
    control.id !== "height" &&
    supportsConfiguredSemanticSecondaryDisplayProjection(expectation.family)
  ) {
    const projected = formatConfiguredSemanticSecondaryDisplayValue(
      {
        comparison: values.comparison ?? 0,
        family: expectation.family,
        mode: expectation.mode,
        value: values.value ?? 0,
        variant: expectation.variant,
      },
      control.id,
    );
    if (projected) return projected;
  }

  const digits =
    control.step < 1
      ? Math.min(4, Math.max(1, Math.ceil(-Math.log10(control.step))))
      : 0;
  return formatNumber(values[control.id] ?? control.initial, digits);
}

async function assertSemanticStrandPlan(
  section: Locator,
  lab: MainlandLab,
  expectedActiveIndex: number | null,
  state: string,
  addFailure: FailureRecorder,
) {
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const buttons = section.locator("[data-viz-strand-button]");
  const actualCount = await buttons.count();
  const expectedCount = strands?.length ?? 0;
  if (actualCount !== expectedCount) {
    addFailure(
      lab.labId,
      state,
      `Rendered ${actualCount} strand button(s), expected exact plan count ${expectedCount}.`,
    );
  }

  if (!strands) {
    if ((await section.locator("[data-viz-strand-grid]").count()) !== 0) {
      addFailure(
        lab.labId,
        state,
        "Direct semantic lab unexpectedly renders a strand grid.",
      );
    }
    return;
  }

  if ((await section.locator("[data-viz-strand-grid]").count()) !== 1) {
    addFailure(
      lab.labId,
      state,
      "Composite semantic lab must render exactly one strand grid.",
    );
  }

  for (
    let index = 0;
    index < Math.min(actualCount, strands.length);
    index += 1
  ) {
    const button = buttons.nth(index);
    const contract = await button.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        active: element.getAttribute("data-viz-strand-active"),
        index: element.getAttribute("data-viz-strand-index"),
        text: element.textContent,
        visible:
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden",
      };
    });
    const expectedLabel = localizedContractLabel(strands[index].label);
    if (!contract.visible) {
      addFailure(lab.labId, state, `Strand ${index} button is not visible.`);
    }
    if (contract.index !== String(index)) {
      addFailure(
        lab.labId,
        state,
        `Strand ${index} exposes data-viz-strand-index=${JSON.stringify(contract.index)}.`,
      );
    }
    if (normalizedUiText(contract.text) !== normalizedUiText(expectedLabel)) {
      addFailure(
        lab.labId,
        state,
        `Strand ${index} label ${JSON.stringify(normalizedUiText(contract.text))} does not match ${JSON.stringify(expectedLabel)}.`,
      );
    }
    const shouldBeActive = index === expectedActiveIndex;
    if (contract.active !== String(shouldBeActive)) {
      addFailure(
        lab.labId,
        state,
        `Strand ${index} active flag is ${JSON.stringify(contract.active)}, expected ${shouldBeActive}.`,
      );
    }
  }

  const activeIndexes = await section
    .locator('[data-viz-strand-button][data-viz-strand-active="true"]')
    .evaluateAll((elements) =>
      elements.map((element) =>
        Number(element.getAttribute("data-viz-strand-index")),
      ),
    );
  if (
    expectedActiveIndex === null ||
    activeIndexes.length !== 1 ||
    activeIndexes[0] !== expectedActiveIndex
  ) {
    addFailure(
      lab.labId,
      state,
      `Active strand indexes ${JSON.stringify(activeIndexes)} do not match [${expectedActiveIndex}].`,
    );
  }
}

async function assertSemanticControlContract(
  section: Locator,
  lab: MainlandLab,
  expectation: ActiveSemanticControlExpectation,
  state: string,
  expectInitials: boolean,
  addFailure: FailureRecorder,
) {
  await settleVisualization(section);
  await assertSemanticStrandPlan(
    section,
    lab,
    expectation.strandIndex,
    state,
    addFailure,
  );

  const controlRoots = section.locator("[data-viz-semantic-control-family]");
  const controlRootCount = await controlRoots.count();
  if (controlRootCount !== 1) {
    addFailure(
      lab.labId,
      state,
      `Expected one semantic control root, found ${controlRootCount}.`,
    );
  }
  if (controlRootCount > 0) {
    const rootContract = await controlRoots.first().evaluate((root) => ({
      count: root.getAttribute("data-viz-semantic-control-count"),
      family: root.getAttribute("data-viz-semantic-control-family"),
      mode: root.getAttribute("data-viz-semantic-control-mode"),
      variant: root.getAttribute("data-viz-semantic-control-variant"),
    }));
    if (rootContract.family !== expectation.family) {
      addFailure(
        lab.labId,
        state,
        `Semantic control family ${JSON.stringify(rootContract.family)} does not match ${JSON.stringify(expectation.family)}.`,
      );
    }
    if (rootContract.variant !== expectation.variant) {
      addFailure(
        lab.labId,
        state,
        `Semantic control variant ${JSON.stringify(rootContract.variant)} does not match ${JSON.stringify(expectation.variant)}.`,
      );
    }
    if (Number(rootContract.mode) !== expectation.mode) {
      addFailure(
        lab.labId,
        state,
        `Semantic control mode ${JSON.stringify(rootContract.mode)} does not match ${expectation.mode}.`,
      );
    }
    if (Number(rootContract.count) !== expectation.contract.sliders.length) {
      addFailure(
        lab.labId,
        state,
        `Semantic control root reports ${JSON.stringify(rootContract.count)} sliders instead of ${expectation.contract.sliders.length}.`,
      );
    }
  }

  const sliderWrappers = section.locator("[data-viz-semantic-slider]");
  const actualSliderCount = await sliderWrappers.count();
  if (actualSliderCount !== expectation.contract.sliders.length) {
    addFailure(
      lab.labId,
      state,
      `Rendered ${actualSliderCount} semantic slider(s), expected ${expectation.contract.sliders.length}.`,
    );
  }

  for (
    let index = 0;
    index < Math.min(actualSliderCount, expectation.contract.sliders.length);
    index += 1
  ) {
    const expectedSlider = expectation.contract.sliders[index];
    const expectedRangeState =
      rangeStateExecutionPlanForExpectation(expectation).expected[index];
    const wrapper = sliderWrappers.nth(index);
    const input = wrapper.locator('input[type="range"]').first();
    if ((await input.count()) === 0) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} has no range input.`,
      );
      continue;
    }
    const actual = await wrapper.evaluate((element) => {
      const range = element.querySelector<HTMLInputElement>(
        'input[type="range"]',
      );
      const label = element.querySelector<HTMLElement>(
        "[data-viz-slider-label]",
      );
      const display = element.querySelector<HTMLElement>(
        "[data-viz-slider-value]",
      );
      if (!range) return null;
      const inputStyle = window.getComputedStyle(range);
      const inputRect = range.getBoundingClientRect();
      const labelStyle = label ? window.getComputedStyle(label) : null;
      const labelRect = label?.getBoundingClientRect();
      return {
        ariaLabel: range.getAttribute("aria-label"),
        ariaValueText: range.getAttribute("aria-valuetext"),
        disabled: range.disabled,
        display: display?.textContent ?? null,
        input: element.getAttribute("data-viz-semantic-slider-input"),
        label: label?.textContent ?? null,
        labelVisible: Boolean(
          label &&
          labelRect &&
          labelRect.width > 1 &&
          labelRect.height > 1 &&
          labelStyle?.display !== "none" &&
          labelStyle?.visibility !== "hidden",
        ),
        max: Number(range.max),
        min: Number(range.min),
        role: element.getAttribute("data-viz-semantic-slider-role"),
        step: Number(range.step),
        value: Number(range.value),
        visible:
          inputRect.width > 1 &&
          inputRect.height > 1 &&
          inputStyle.display !== "none" &&
          inputStyle.visibility !== "hidden",
      };
    });
    if (!actual) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} could not be inspected.`,
      );
      continue;
    }
    const expectedLabel = localizedContractLabel(expectedSlider.label);
    const expectedDisplay = expectedSemanticSliderDisplay(
      expectation,
      expectedSlider,
    );
    if (!actual.visible || !actual.labelVisible) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} or its visible label is hidden.`,
      );
    }
    if (actual.disabled !== expectedRangeState.disabled) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} disabled=${actual.disabled} does not match projected contract ${expectedRangeState.disabled}.`,
      );
    }
    if (
      actual.input !== expectedSlider.id ||
      actual.role !== expectedSlider.role
    ) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} maps input/role ${JSON.stringify([actual.input, actual.role])} instead of ${JSON.stringify([expectedSlider.id, expectedSlider.role])}.`,
      );
    }
    if (
      normalizedUiText(actual.ariaLabel) !== normalizedUiText(expectedLabel) ||
      normalizedUiText(actual.label) !== normalizedUiText(expectedLabel)
    ) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} labels ${JSON.stringify([normalizedUiText(actual.ariaLabel), normalizedUiText(actual.label)])} do not both match ${JSON.stringify(expectedLabel)}.`,
      );
    }
    if (
      expectInitials &&
      (normalizedUiText(actual.display) !== normalizedUiText(expectedDisplay) ||
        normalizedUiText(actual.ariaValueText) !==
          normalizedUiText(expectedDisplay))
    ) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} badge/aria-valuetext ${JSON.stringify([normalizedUiText(actual.display), normalizedUiText(actual.ariaValueText)])} do not match mathematical display ${JSON.stringify(expectedDisplay)}.`,
      );
    }
    if (
      !sameFiniteNumber(actual.min, expectedRangeState.min) ||
      !sameFiniteNumber(actual.max, expectedRangeState.max) ||
      !sameFiniteNumber(actual.step, expectedSlider.step)
    ) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} min/max/step ${JSON.stringify([actual.min, actual.max, actual.step])} do not match projected ${JSON.stringify([expectedRangeState.min, expectedRangeState.max, expectedSlider.step])}.`,
      );
    }
    if (
      expectInitials &&
      !approximatelyEqual(
        actual.value,
        expectedRangeState.value,
        expectedSlider.step,
      )
    ) {
      addFailure(
        lab.labId,
        state,
        `Semantic slider ${index} initial value ${actual.value} does not match projected contract initial ${expectedRangeState.value}.`,
      );
    }
  }

  const expectedVisibleModes =
    expectation.contract.modes.length > 1 ? expectation.contract.modes : [];
  const modeGrid = section.locator("[data-viz-mode-grid]");
  const modeGridCount = await modeGrid.count();
  if (modeGridCount !== (expectedVisibleModes.length > 0 ? 1 : 0)) {
    addFailure(
      lab.labId,
      state,
      `Rendered ${modeGridCount} mode grid(s) for a contract requiring ${expectedVisibleModes.length} visible mode button(s).`,
    );
  }
  if (
    modeGridCount > 0 &&
    Number(await modeGrid.first().getAttribute("data-viz-mode-count")) !==
      expectedVisibleModes.length
  ) {
    addFailure(
      lab.labId,
      state,
      "Mode grid count metadata does not match the active control contract.",
    );
  }

  const modeButtons = section.locator("[data-viz-mode-button]");
  const actualModeCount = await modeButtons.count();
  if (actualModeCount !== expectedVisibleModes.length) {
    addFailure(
      lab.labId,
      state,
      `Rendered ${actualModeCount} mode button(s), expected ${expectedVisibleModes.length}.`,
    );
  }
  for (
    let index = 0;
    index < Math.min(actualModeCount, expectedVisibleModes.length);
    index += 1
  ) {
    const expectedMode = expectedVisibleModes[index];
    const actual = await modeButtons.nth(index).evaluate((button) => {
      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return {
        active: button.getAttribute("data-viz-mode-active"),
        id: button.getAttribute("data-viz-mode-id"),
        index: button.getAttribute("data-viz-mode-index"),
        label: button.textContent,
        value: button.getAttribute("data-viz-mode-value"),
        visible:
          rect.width > 1 &&
          rect.height > 1 &&
          style.display !== "none" &&
          style.visibility !== "hidden",
      };
    });
    const expectedLabel = localizedContractLabel(expectedMode.label);
    if (!actual.visible) {
      addFailure(lab.labId, state, `Mode ${index} button is hidden.`);
    }
    if (
      actual.id !== expectedMode.id ||
      actual.index !== String(index) ||
      Number(actual.value) !== expectedMode.value
    ) {
      addFailure(
        lab.labId,
        state,
        `Mode ${index} id/index/value ${JSON.stringify([actual.id, actual.index, actual.value])} do not match ${JSON.stringify([expectedMode.id, index, expectedMode.value])}.`,
      );
    }
    if (normalizedUiText(actual.label) !== normalizedUiText(expectedLabel)) {
      addFailure(
        lab.labId,
        state,
        `Mode ${index} label ${JSON.stringify(normalizedUiText(actual.label))} does not match ${JSON.stringify(expectedLabel)}.`,
      );
    }
    const expectedActive = expectedMode.value === expectation.mode;
    if (expectInitials && actual.active !== String(expectedActive)) {
      addFailure(
        lab.labId,
        state,
        `Mode ${index} active flag is ${JSON.stringify(actual.active)} instead of ${expectedActive} for active mode ${expectation.mode}.`,
      );
    }
  }
}

async function exerciseModes(
  section: Locator,
  lab: MainlandLab,
  expectation: ActiveSemanticControlExpectation,
  statePrefix: string,
  addFailure: FailureRecorder,
) {
  await assertSemanticControlContract(
    section,
    lab,
    expectation,
    `modes:${expectation.family}`,
    true,
    addFailure,
  );
  const expectedModes =
    expectation.contract.modes.length > 1 ? expectation.contract.modes : [];
  if (expectedModes.length === 0) {
    const ranges = await collectRangeControls(section);
    await exerciseRanges(
      section,
      lab,
      ranges,
      expectation,
      statePrefix,
      addFailure,
    );
    await exerciseRangeEndpointCombinations(
      section,
      lab,
      ranges,
      expectation,
      statePrefix,
      addFailure,
    );
    return;
  }

  const modeButtons = section.locator("[data-viz-mode-button]");
  const signatures: VisualizationSignatures[] = [];
  for (
    let modeIndex = 0;
    modeIndex < Math.min(await modeButtons.count(), expectedModes.length);
    modeIndex += 1
  ) {
    const expectedMode = expectedModes[modeIndex];
    const modeExpectation = resolveActiveSemanticControlExpectation(
      lab,
      expectation.strandIndex ?? 0,
      expectedMode.value,
    );
    const button = modeButtons.nth(modeIndex);
    await expect(button, `mode ${modeIndex} button`).toBeVisible();
    await button.click();
    await expect(button, `mode ${modeIndex} active state`).toHaveAttribute(
      "data-viz-mode-active",
      "true",
    );
    const activeModeIds = await section
      .locator('[data-viz-mode-button][data-viz-mode-active="true"]')
      .evaluateAll((buttons) =>
        buttons.map((candidate) => candidate.getAttribute("data-viz-mode-id")),
      );
    if (activeModeIds.length !== 1 || activeModeIds[0] !== expectedMode.id) {
      addFailure(
        lab.labId,
        `mode=${modeIndex}`,
        `Active mode ids ${JSON.stringify(activeModeIds)} do not match [${JSON.stringify(expectedMode.id)}].`,
      );
    }
    await assertSemanticControlContract(
      section,
      lab,
      modeExpectation,
      `mode=${modeIndex}:${expectedMode.id}:contract`,
      true,
      addFailure,
    );
    const modeStatePrefix = `${statePrefix}/mode=${modeIndex}:${expectedMode.id}`;
    const modeStateExecuted = await scanState(
      section,
      lab,
      modeStatePrefix,
      true,
      addFailure,
      rangeStateExecutionPlanForExpectation(modeExpectation),
    );
    if (modeStateExecuted)
      signatures.push(await visualizationSignatures(section));
    const ranges = await collectRangeControls(section);
    await exerciseRanges(
      section,
      lab,
      ranges,
      modeExpectation,
      modeStatePrefix,
      addFailure,
    );
    await exerciseRangeEndpointCombinations(
      section,
      lab,
      ranges,
      modeExpectation,
      modeStatePrefix,
      addFailure,
    );
  }

  const machineCount = new Set(signatures.map(({ machine }) => machine)).size;
  const visibleCount = new Set(signatures.map(({ visible }) => visible)).size;
  if (machineCount !== expectedModes.length) {
    addFailure(
      lab.labId,
      "modes",
      `${expectedModes.length} exact modes produced only ${machineCount} machine-state signatures.`,
    );
  }
  if (visibleCount !== expectedModes.length) {
    addFailure(
      lab.labId,
      "modes",
      `${expectedModes.length} exact modes produced only ${visibleCount} QA-attribute-free visible signatures.`,
    );
  }
}

async function exerciseCompositeStrands(
  section: Locator,
  lab: MainlandLab,
  addFailure: FailureRecorder,
) {
  const strands = resolveConfiguredVisualizationCompositeStrands(lab);
  const strandButtons = section.locator("[data-viz-strand-button]");
  const strandCount = await strandButtons.count();
  if (!strands) {
    if (strandCount > 0) {
      addFailure(
        lab.labId,
        "strands",
        `Direct lab unexpectedly renders ${strandCount} strand controls.`,
      );
    }
    return false;
  }

  if (strandCount !== strands.length) {
    addFailure(
      lab.labId,
      "strands",
      `Composite lab renders ${strandCount} strand controls instead of exact plan count ${strands.length}.`,
    );
  }

  const signatures: VisualizationSignatures[] = [];
  const exercisedStrandCount = Math.min(strandCount, strands.length);
  for (
    let strandIndex = 0;
    strandIndex < exercisedStrandCount;
    strandIndex += 1
  ) {
    const button = strandButtons.nth(strandIndex);
    const expectation = resolveActiveSemanticControlExpectation(
      lab,
      strandIndex,
    );
    await expect(button, `strand ${strandIndex} button`).toBeVisible();
    await button.click();
    await expect(button, `strand ${strandIndex} active state`).toHaveAttribute(
      "data-viz-strand-active",
      "true",
    );
    await assertSemanticControlContract(
      section,
      lab,
      expectation,
      `strand=${strandIndex}:contract`,
      true,
      addFailure,
    );
    const strandStateExecuted = await scanState(
      section,
      lab,
      `strand=${strandIndex}:${expectation.family}/${expectation.variant}`,
      true,
      addFailure,
      rangeStateExecutionPlanForExpectation(expectation),
    );
    if (strandStateExecuted)
      signatures.push(await visualizationSignatures(section));

    await exerciseModes(
      section,
      lab,
      expectation,
      `strand=${strandIndex}`,
      addFailure,
    );

    // Re-selecting the active strand is the strand-local reset contract: it
    // must restore that exact child's slider initials and first executable mode.
    await button.click();
    await assertSemanticControlContract(
      section,
      lab,
      expectation,
      `strand=${strandIndex}:reselect-reset`,
      true,
      addFailure,
    );
  }

  const machineCount = new Set(signatures.map(({ machine }) => machine)).size;
  const visibleCount = new Set(signatures.map(({ visible }) => visible)).size;
  if (machineCount !== strands.length) {
    addFailure(
      lab.labId,
      "strands",
      `${strands.length} exact strands produced only ${machineCount} machine-state signatures.`,
    );
  }
  if (visibleCount !== strands.length) {
    addFailure(
      lab.labId,
      "strands",
      `${strands.length} exact strands produced only ${visibleCount} QA-attribute-free visible signatures.`,
    );
  }

  if (exercisedStrandCount > 0) {
    const sourceExpectation = resolveActiveSemanticControlExpectation(
      lab,
      exercisedStrandCount - 1,
    );
    const resetExpectation = resolveActiveSemanticControlExpectation(lab, 0);
    await exerciseReset(
      section,
      lab,
      sourceExpectation,
      resetExpectation,
      addFailure,
    );
  }
  return true;
}

type LiveRangeStateDomainDescriptor = {
  affectedControlIds: string[];
  controllerInputs: string[];
  domainId: string;
  domainKind: "independent" | "projected" | string;
  domainVersion: number;
  projection: string;
};

async function readLiveRangeStateDomainDescriptor(
  section: Locator,
): Promise<LiveRangeStateDomainDescriptor | null> {
  const root = section.locator("[data-viz-semantic-control-family]");
  if ((await root.count()) !== 1) return null;
  return await root.evaluate((element) => ({
    affectedControlIds: (
      element.getAttribute("data-viz-range-domain-affected-controls") ?? ""
    )
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    controllerInputs: (
      element.getAttribute("data-viz-range-domain-controller-inputs") ?? ""
    )
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
    domainId: element.getAttribute("data-viz-range-domain-id") ?? "",
    domainKind: element.getAttribute("data-viz-range-domain-kind") ?? "",
    domainVersion: Number(
      element.getAttribute("data-viz-range-domain-version"),
    ),
    projection: element.getAttribute("data-viz-range-domain-projection") ?? "",
  }));
}

function liveRangeStateDomainMatchesPlan(
  descriptor: LiveRangeStateDomainDescriptor | null,
  plan: ChinaVisualizationRangeStateExecutionPlan,
) {
  return Boolean(
    descriptor &&
    descriptor.domainId === plan.domainId &&
    descriptor.domainKind === plan.domainKind &&
    descriptor.domainVersion === plan.domainVersion &&
    descriptor.projection === plan.projection &&
    JSON.stringify(descriptor.affectedControlIds) ===
      JSON.stringify(plan.affectedControlIds) &&
    JSON.stringify(descriptor.controllerInputs) ===
      JSON.stringify(plan.controllerInputs),
  );
}

async function applyRangeStateExecutionPlan(
  section: Locator,
  expectation: ActiveSemanticControlExpectation,
  plan: ChinaVisualizationRangeStateExecutionPlan,
  lab: MainlandLab,
  state: string,
  addFailure: FailureRecorder,
) {
  const requestedById = new Map(
    plan.requested.map((entry) => [entry.id, entry]),
  );
  const expectedById = new Map(plan.expected.map((entry) => [entry.id, entry]));
  const executionOrder = configuredVisualizationSemanticControlExecutionOrder(
    expectation.contract,
  );

  const recordExecutionMismatch = async (
    descriptor: LiveRangeStateDomainDescriptor | null,
  ) => {
    rangeStateExecutionMismatches.push({
      affectedControlIds: [...plan.affectedControlIds],
      controllerInputs: [...plan.controllerInputs],
      domainId: plan.domainId,
      domainKind: plan.domainKind,
      domainVersion: plan.domainVersion,
      expected: plan.expected.map((entry) => ({ ...entry })),
      observed: await observedRangeStateSignature(section),
      observedDomain: descriptor,
      phase: "before-scan",
      projection: plan.projection,
      requested: plan.requested.map((entry) => ({ ...entry })),
      stateId: stateReceiptId(lab.labId, state),
    });
  };

  const verifyLiveDescriptor = async (phase: string) => {
    const descriptor = await readLiveRangeStateDomainDescriptor(section);
    if (liveRangeStateDomainMatchesPlan(descriptor, plan)) return true;
    await recordExecutionMismatch(descriptor);
    addFailure(
      lab.labId,
      state,
      `RANGE_STATE_EXECUTION ${phase} live domain descriptor mismatch; expected=${JSON.stringify(
        {
          affectedControlIds: plan.affectedControlIds,
          controllerInputs: plan.controllerInputs,
          domainId: plan.domainId,
          domainKind: plan.domainKind,
          domainVersion: plan.domainVersion,
          projection: plan.projection,
        },
      )} observed=${JSON.stringify(descriptor)}.`,
    );
    return false;
  };

  if (!(await verifyLiveDescriptor("before-drive"))) return false;

  for (const controlId of executionOrder) {
    // Re-read the browser-owned descriptor before every mutation. A prior
    // controller can replace bounds or the active mode, and a stale static
    // contract must never be allowed to drive the next slider.
    if (!(await verifyLiveDescriptor(`before-${controlId}`))) return false;
    const range = section.locator(
      `input[type="range"][data-viz-parameter=${JSON.stringify(controlId)}]`,
    );
    if ((await range.count()) !== 1) {
      await recordExecutionMismatch(
        await readLiveRangeStateDomainDescriptor(section),
      );
      addFailure(
        lab.labId,
        state,
        `RANGE_STATE_EXECUTION expected exactly one ${controlId} range, found ${await range.count()}.`,
      );
      return false;
    }
    const requested = requestedById.get(controlId);
    const expected = expectedById.get(controlId);
    if (!requested || !expected) {
      await recordExecutionMismatch(
        await readLiveRangeStateDomainDescriptor(section),
      );
      addFailure(
        lab.labId,
        state,
        `RANGE_STATE_EXECUTION plan omitted ${controlId}.`,
      );
      return false;
    }

    const live = await range.evaluate((element) => {
      const input = element as HTMLInputElement;
      return {
        disabled: input.disabled,
        max: Number(input.max),
        min: Number(input.min),
        rangeAffects: input.getAttribute("data-viz-range-affects"),
        rangeProjection: input.getAttribute("data-viz-range-projection"),
        rangeProjectionReason: input.getAttribute(
          "data-viz-range-projection-reason",
        ),
        value: Number(input.value),
      };
    });
    const isController = plan.controllerInputs.includes(controlId);
    const expectedRangeAffects =
      isController && plan.affectedControlIds.length > 0
        ? plan.affectedControlIds.join(",")
        : null;
    const hasExactHongKongFractionProjection =
      plan.domainId === "fraction-bar-numerator-v1" && controlId === "value";
    if (
      live.rangeAffects !== expectedRangeAffects ||
      live.rangeProjection !==
        (hasExactHongKongFractionProjection ? "clamp-max" : null) ||
      live.rangeProjectionReason !==
        (hasExactHongKongFractionProjection
          ? "numerator-cannot-exceed-denominator"
          : null)
    ) {
      await recordExecutionMismatch(
        await readLiveRangeStateDomainDescriptor(section),
      );
      addFailure(
        lab.labId,
        state,
        `RANGE_STATE_EXECUTION ${controlId} projection metadata mismatch; expected affects=${JSON.stringify(expectedRangeAffects)} projection=${JSON.stringify(hasExactHongKongFractionProjection ? "clamp-max" : null)} reason=${JSON.stringify(hasExactHongKongFractionProjection ? "numerator-cannot-exceed-denominator" : null)} observed=${JSON.stringify(live)}.`,
      );
      return false;
    }
    if (
      live.disabled !== expected.disabled ||
      live.max !== expected.max ||
      live.min !== expected.min
    ) {
      await recordExecutionMismatch(
        await readLiveRangeStateDomainDescriptor(section),
      );
      addFailure(
        lab.labId,
        state,
        `RANGE_STATE_EXECUTION ${controlId} live bounds mismatch before drive; requested=${JSON.stringify(requested)} expected=${JSON.stringify(expected)} observed=${JSON.stringify(live)}.`,
      );
      return false;
    }
    if (live.disabled) {
      if (live.value !== expected.value) {
        await recordExecutionMismatch(
          await readLiveRangeStateDomainDescriptor(section),
        );
        addFailure(
          lab.labId,
          state,
          `RANGE_STATE_EXECUTION disabled ${controlId} settled at ${live.value}, expected ${expected.value}.`,
        );
        return false;
      }
      continue;
    }

    await setRangeValue(range, requested.value);
    await settleVisualization(section);
  }

  return await verifyLiveDescriptor("after-drive");
}

async function collectRangeControls(section: Locator): Promise<RangeControl[]> {
  return await section
    .locator('[data-viz-semantic-slider] input[type="range"]')
    .evaluateAll((elements) =>
      elements.map((element, index) => {
        const input = element as HTMLInputElement;
        const min = input.min ? Number(input.min) : 0;
        const max = input.max ? Number(input.max) : 100;
        const parsedStep =
          input.step && input.step !== "any" ? Number(input.step) : 1;
        return {
          disabled: input.disabled,
          id:
            input
              .closest("[data-viz-semantic-slider]")
              ?.getAttribute("data-viz-parameter") ?? `range-${index}`,
          index,
          label: input.getAttribute("aria-label") ?? `range ${index + 1}`,
          max: Number.isFinite(max) ? max : 100,
          min: Number.isFinite(min) ? min : 0,
          original: Number(input.value),
          step: Number.isFinite(parsedStep) && parsedStep > 0 ? parsedStep : 1,
        };
      }),
    );
}

async function exerciseRanges(
  section: Locator,
  lab: MainlandLab,
  ranges: RangeControl[],
  expectation: ActiveSemanticControlExpectation,
  statePrefix: string,
  addFailure: (labId: string, state: string, issue: string) => void,
) {
  if (ranges.length === 0) {
    addFailure(lab.labId, "ranges", "No range controls rendered.");
    return;
  }

  for (const range of ranges) {
    if (range.disabled) {
      addFailure(
        lab.labId,
        `range=${range.index}`,
        `Range "${range.label}" remains disabled after all visible modes were exercised.`,
      );
      continue;
    }

    const signatures: VisualizationSignatures[] = [];
    for (const value of rangeValues(range)) {
      const state = `${statePrefix}/range=${range.index}:${range.id}=${value}`;
      const requestedValues = Object.fromEntries(
        ranges.map((candidate) => [candidate.id, candidate.original]),
      ) as Partial<Record<ConfiguredVisualizationSemanticSliderInput, number>>;
      requestedValues[range.id as ConfiguredVisualizationSemanticSliderInput] =
        value;
      const executionPlan = rangeStateExecutionPlanForExpectation(
        expectation,
        requestedValues,
      );
      const droveRequestedState = await applyRangeStateExecutionPlan(
        section,
        expectation,
        executionPlan,
        lab,
        state,
        addFailure,
      );
      if (!droveRequestedState) continue;
      const stateExecuted = await scanState(
        section,
        lab,
        state,
        false,
        addFailure,
        executionPlan,
      );
      if (stateExecuted)
        signatures.push(await visualizationSignatures(section));
    }

    if (
      rangeValues(range).length > 1 &&
      new Set(signatures.map(({ machine }) => machine)).size < 2
    ) {
      addFailure(
        lab.labId,
        `range=${range.index}`,
        `Range "${range.label}" did not change the machine renderer state at min/mid/max.`,
      );
    }
    if (
      rangeValues(range).length > 1 &&
      new Set(signatures.map(({ visible }) => visible)).size < 2
    ) {
      addFailure(
        lab.labId,
        `range=${range.index}`,
        `Range "${range.label}" did not change QA-attribute-free visible geometry/style/text at min/mid/max.`,
      );
    }
  }

  await applyRangeStateExecutionPlan(
    section,
    expectation,
    rangeStateExecutionPlanForExpectation(expectation),
    lab,
    `${statePrefix}/restore`,
    addFailure,
  );
}

async function exerciseRangeEndpointCombinations(
  section: Locator,
  lab: MainlandLab,
  ranges: RangeControl[],
  expectation: ActiveSemanticControlExpectation,
  statePrefix: string,
  addFailure: (labId: string, state: string, issue: string) => void,
) {
  if (ranges.length < 2) return;

  // Controllers are evaluated before their affected controls. The canonical
  // planner therefore omits impossible static Cartesian corners while still
  // reaching every dynamic minimum/maximum (for example 1/2 and 11/12).
  const endpointVectors =
    configuredVisualizationSemanticCanonicalDynamicStateVectors(
      expectation.contract,
      expectation.mode,
    );

  for (const requestedValues of endpointVectors) {
    const state = `${statePrefix}/range-endpoints=${ranges
      .map(
        (range) =>
          `${range.id}:${requestedValues[range.id as ConfiguredVisualizationSemanticSliderInput]}`,
      )
      .join(",")}`;
    const executionPlan = rangeStateExecutionPlanForExpectation(
      expectation,
      requestedValues,
    );
    const droveRequestedState = await applyRangeStateExecutionPlan(
      section,
      expectation,
      executionPlan,
      lab,
      state,
      addFailure,
    );
    if (!droveRequestedState) continue;
    await scanState(section, lab, state, false, addFailure, executionPlan);
  }
  await applyRangeStateExecutionPlan(
    section,
    expectation,
    rangeStateExecutionPlanForExpectation(expectation),
    lab,
    `${statePrefix}/restore`,
    addFailure,
  );
}

async function exerciseReset(
  section: Locator,
  lab: MainlandLab,
  sourceExpectation: ActiveSemanticControlExpectation,
  resetExpectation: ActiveSemanticControlExpectation,
  addFailure: FailureRecorder,
) {
  let mutationExpectation = sourceExpectation;
  if (sourceExpectation.contract.modes.length > 1) {
    const lastModeDefinition = sourceExpectation.contract.modes.at(-1)!;
    const lastMode = section.locator("[data-viz-mode-button]").last();
    if ((await lastMode.count()) > 0) await lastMode.click();
    mutationExpectation = resolveActiveSemanticControlExpectation(
      lab,
      sourceExpectation.strandIndex ?? 0,
      lastModeDefinition.value,
    );
    await assertSemanticControlContract(
      section,
      lab,
      mutationExpectation,
      "reset-source-mode",
      false,
      addFailure,
    );
  }

  const sourceRanges = section.locator(
    '[data-viz-semantic-slider] input[type="range"]',
  );
  for (
    let index = 0;
    index <
    Math.min(
      await sourceRanges.count(),
      mutationExpectation.contract.sliders.length,
    );
    index += 1
  ) {
    const slider = mutationExpectation.contract.sliders[index];
    const nextValue = approximatelyEqual(
      slider.initial,
      slider.max,
      slider.step,
    )
      ? slider.min
      : slider.max;
    await setRangeValue(sourceRanges.nth(index), nextValue);
  }

  const reset = section.locator("[data-viz-reset-model]").first();
  await expect(reset, "reset control").toBeVisible();
  await reset.click();
  await settleVisualization(section);

  await assertSemanticControlContract(
    section,
    lab,
    resetExpectation,
    "reset-contract",
    true,
    addFailure,
  );
  const actualValues = await section
    .locator('[data-viz-semantic-slider] input[type="range"]')
    .evaluateAll((elements) =>
      elements.map((element) => Number((element as HTMLInputElement).value)),
    );
  if (actualValues.length !== resetExpectation.contract.sliders.length) {
    addFailure(
      lab.labId,
      "reset",
      `Reset rendered ${actualValues.length} sliders instead of ${resetExpectation.contract.sliders.length}.`,
    );
  }
  resetExpectation.contract.sliders.forEach((slider, index) => {
    if (!approximatelyEqual(actualValues[index], slider.initial, slider.step)) {
      addFailure(
        lab.labId,
        "reset",
        `Reset restored ${slider.id} to ${actualValues[index]} instead of contract initial ${slider.initial}.`,
      );
    }
  });

  const activeModeIds = await section
    .locator('[data-viz-mode-button][data-viz-mode-active="true"]')
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-viz-mode-id")),
    );
  const expectedActiveModeIds =
    resetExpectation.contract.modes.length > 1
      ? [resetExpectation.contract.modes[0].id]
      : [];
  if (JSON.stringify(activeModeIds) !== JSON.stringify(expectedActiveModeIds)) {
    addFailure(
      lab.labId,
      "reset",
      `Reset left active mode ids ${JSON.stringify(activeModeIds)} instead of ${JSON.stringify(expectedActiveModeIds)}.`,
    );
  }

  await scanState(
    section,
    lab,
    "reset",
    false,
    addFailure,
    rangeStateExecutionPlanForExpectation(resetExpectation),
  );
}

function rangeValues(range: RangeControl) {
  const midpoint = normalizeRangeValue(
    range,
    range.min + (range.max - range.min) / 2,
  );
  return Array.from(
    new Set(
      [range.min, midpoint, range.max].map((value) =>
        normalizeRangeValue(range, value),
      ),
    ),
  );
}

function normalizeRangeValue(range: RangeControl, value: number) {
  const stepped =
    range.min + Math.round((value - range.min) / range.step) * range.step;
  return Number(
    Math.min(range.max, Math.max(range.min, stepped)).toFixed(
      decimalPlaces(range.step),
    ),
  );
}

function decimalPlaces(value: number) {
  const [, decimal = ""] = String(value).split(".");
  return Math.min(6, decimal.length);
}

function approximatelyEqual(actual: number, expected: number, step: number) {
  return (
    Number.isFinite(actual) &&
    Math.abs(actual - expected) <= Math.max(1e-6, step / 1_000)
  );
}

async function setRangeValue(range: Locator, value: number) {
  await range.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input),
      "value",
    );
    descriptor?.set?.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await range.page().waitForTimeout(35);
}

async function visualizationSignatures(
  section: Locator,
): Promise<VisualizationSignatures> {
  await settleVisualization(section);
  return await section.evaluate((root) => {
    const renderedSurfaces = Array.from(
      root.querySelectorAll<Element>("[data-viz-surface]"),
    ).filter((surface) => {
      if (surface.closest('[aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(surface);
      const rect = surface.getBoundingClientRect();
      return (
        rect.width > 1 &&
        rect.height > 1 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    });
    const hash = (value: string) => {
      let result = 2_166_136_261;
      for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16_777_619);
      }
      return (result >>> 0).toString(16).padStart(8, "0");
    };

    const machine = renderedSurfaces
      .map((surface) => {
        const elements = [
          surface,
          ...Array.from(surface.querySelectorAll<Element>("*")),
        ];
        const attributes = elements.flatMap((element, elementIndex) =>
          Array.from(element.attributes)
            .filter((attribute) => attribute.name.startsWith("data-viz-"))
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(
              (attribute) =>
                `${elementIndex}:${element.tagName}:${attribute.name}=${attribute.value}`,
            ),
        );
        const metadata = Array.from(surface.querySelectorAll("metadata")).map(
          (element, index) => `${index}:${element.textContent ?? ""}`,
        );
        return [...attributes, ...metadata].join("\n");
      })
      .join("\n---surface---\n");

    const visible = renderedSurfaces
      .map((surface) => {
        const clone = surface.cloneNode(true) as Element;
        const originalElements = [
          surface,
          ...Array.from(surface.querySelectorAll<Element>("*")),
        ];
        const clonedElements = [
          clone,
          ...Array.from(clone.querySelectorAll<Element>("*")),
        ];
        originalElements.forEach((element, index) => {
          if (index === 0) return;
          const style = window.getComputedStyle(element);
          if (
            element.closest('[aria-hidden="true"], [hidden]') ||
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity || "1") === 0
          ) {
            clonedElements[index]?.remove();
          }
        });
        clone
          .querySelectorAll("metadata, title, desc")
          .forEach((element) => element.remove());
        [clone, ...Array.from(clone.querySelectorAll<Element>("*"))].forEach(
          (element) => {
            Array.from(element.attributes).forEach((attribute) => {
              if (
                attribute.name.startsWith("data-viz-") ||
                attribute.name.startsWith("aria-") ||
                attribute.name === "focusable" ||
                attribute.name === "role" ||
                attribute.name === "tabindex"
              ) {
                element.removeAttribute(attribute.name);
              }
            });
          },
        );
        const canvasHashes = Array.from(surface.querySelectorAll("canvas"))
          .filter((canvas) => {
            const style = window.getComputedStyle(canvas);
            return (
              !canvas.closest('[aria-hidden="true"], [hidden]') &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              Number(style.opacity || "1") !== 0
            );
          })
          .map((canvas) => {
            try {
              return hash((canvas as HTMLCanvasElement).toDataURL("image/png"));
            } catch {
              return "canvas-unreadable";
            }
          });
        return `${clone.outerHTML}\ncanvas-pixels:${canvasHashes.join(",")}`;
      })
      .join("\n---surface---\n");

    return { machine, visible };
  });
}

async function collectUiIssues(section: Locator): Promise<string[]> {
  const audit = await section.evaluate((root) => {
    type Rect = {
      bottom: number;
      height: number;
      left: number;
      right: number;
      top: number;
      width: number;
    };
    type TextFragment = { element: Element; rect: Rect; text: string };
    type LabelMarkOverlap = {
      height: number;
      labelCarrier: OverlapCarrierEvidence | null;
      labelName: string;
      markCarrier: OverlapCarrierEvidence | null;
      markName: string;
      surfaceIndex: number;
      width: number;
    };

    const issues: string[] = [];
    const labelMarkOverlaps: LabelMarkOverlap[] = [];
    const invalidNumberPattern =
      /(?:^|[^A-Za-z])(?:NaN|-?Infinity)(?:$|[^A-Za-z])/;
    const tolerance = 2;
    const maxIssues = 80;
    const add = (issue: string) => {
      if (issues.length < maxIssues) issues.push(issue);
    };
    const roundedRect = (rect: DOMRect): Rect => ({
      bottom: Math.round(rect.bottom * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      left: Math.round(rect.left * 10) / 10,
      right: Math.round(rect.right * 10) / 10,
      top: Math.round(rect.top * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
    });
    const elementName = (element: Element) => {
      const label =
        element.getAttribute("aria-label") ??
        element.getAttribute("data-viz-name") ??
        element.textContent ??
        element.tagName.toLowerCase();
      return (
        label.replace(/\s+/g, " ").trim().slice(0, 90) ||
        element.tagName.toLowerCase()
      );
    };
    const nearestOverlapCarrier = (
      element: Element,
    ): OverlapCarrierEvidence | null => {
      const carrier = element.closest<HTMLElement>(
        "[data-viz-overlap-ok], [data-viz-overlap-owner], [data-viz-overlap-reason]",
      );
      if (!carrier) return null;
      return {
        declaresException: carrier.hasAttribute("data-viz-overlap-ok"),
        name: elementName(carrier),
        owner: carrier.dataset.vizOverlapOwner?.trim() ?? "",
        reason: carrier.dataset.vizOverlapReason?.trim() ?? "",
      };
    };
    const visible = (element: Element) => {
      if (element.closest('[aria-hidden="true"], [hidden]')) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 1 &&
        rect.height > 1 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") !== 0
      );
    };
    const intersection = (
      leftRect: Rect | DOMRect,
      rightRect: Rect | DOMRect,
    ) => {
      const left = Math.max(leftRect.left, rightRect.left);
      const right = Math.min(leftRect.right, rightRect.right);
      const top = Math.max(leftRect.top, rightRect.top);
      const bottom = Math.min(leftRect.bottom, rightRect.bottom);
      return { height: bottom - top, left, top, width: right - left };
    };
    const effectiveRect = (
      element: Element,
      sourceRect: Rect | DOMRect,
    ): Rect | null => {
      let current: Rect = {
        bottom: sourceRect.bottom,
        height: sourceRect.height,
        left: sourceRect.left,
        right: sourceRect.right,
        top: sourceRect.top,
        width: sourceRect.width,
      };
      let scrollViewport = element.closest<Element>(
        "[data-viz-scroll-surface]",
      );
      while (scrollViewport && root.contains(scrollViewport)) {
        const viewportRect = scrollViewport.getBoundingClientRect();
        const clipped = intersection(current, viewportRect);
        if (clipped.width <= 1 || clipped.height <= 1) return null;
        current = {
          bottom: clipped.top + clipped.height,
          height: clipped.height,
          left: clipped.left,
          right: clipped.left + clipped.width,
          top: clipped.top,
          width: clipped.width,
        };
        scrollViewport =
          scrollViewport.parentElement?.closest<Element>(
            "[data-viz-scroll-surface]",
          ) ?? null;
      }
      return current;
    };
    const clips = (value: string) =>
      /^(?:auto|clip|hidden|scroll)$/.test(value);

    const documentOverflow =
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth;
    if (documentOverflow > 2)
      add(`Document has ${documentOverflow}px horizontal overflow.`);

    const rootRect = root.getBoundingClientRect();
    if (
      rootRect.left < -tolerance ||
      rootRect.right > window.innerWidth + tolerance
    ) {
      add(
        `Lab section leaves the viewport horizontally: ${JSON.stringify(roundedRect(rootRect))}.`,
      );
    }

    const rootText = (root.textContent ?? "").replace(/\s+/g, " ");
    if (invalidNumberPattern.test(rootText))
      add("Rendered text contains NaN or Infinity.");

    root
      .querySelectorAll<HTMLElement>("[data-viz-overlap-ok]")
      .forEach((carrier) => {
        const owner = carrier.dataset.vizOverlapOwner?.trim() ?? "";
        const reason = carrier.dataset.vizOverlapReason?.trim() ?? "";
        if (!owner || !reason) {
          const missing = [
            ...(!owner ? ["owner"] : []),
            ...(!reason ? ["reason"] : []),
          ];
          add(
            `${elementName(carrier)} declares data-viz-overlap-ok without a non-empty ${missing.join(" and ")}.`,
          );
        }
      });

    Array.from(root.querySelectorAll("*")).forEach((element) => {
      const invalidAttribute = Array.from(element.attributes).find(
        (attribute) => invalidNumberPattern.test(attribute.value),
      );
      if (invalidAttribute) {
        add(
          `${elementName(element)} has invalid ${invalidAttribute.name}=${JSON.stringify(invalidAttribute.value)}.`,
        );
      }
      if (element instanceof HTMLElement) {
        const style = window.getComputedStyle(element);
        if (
          clips(style.overflowX) &&
          element.scrollWidth > element.clientWidth + tolerance
        ) {
          const approvedScrollSurface =
            element.hasAttribute("data-viz-scroll-surface") &&
            /^(?:auto|scroll)$/.test(style.overflowX);
          if (!approvedScrollSurface) {
            add(
              `${elementName(element)} has ${element.scrollWidth - element.clientWidth}px unapproved horizontal clipping/scrolling.`,
            );
          }
        }
        if (
          clips(style.overflowY) &&
          element.scrollHeight > element.clientHeight + tolerance
        ) {
          add(
            `${elementName(element)} clips ${element.scrollHeight - element.clientHeight}px of vertical content.`,
          );
        }
      }
    });

    const surfaces = Array.from(
      root.querySelectorAll<Element>("[data-viz-surface]"),
    ).filter(visible);
    if (surfaces.length === 0) add("No visible data-viz-surface rendered.");
    surfaces.forEach((surface, index) => {
      const rect = surface.getBoundingClientRect();
      if (rect.width < 160 || rect.height < 100) {
        add(
          `Surface ${index + 1} is too small: ${Math.round(rect.width)}x${Math.round(rect.height)}.`,
        );
      }
      if (surface.querySelectorAll("[data-viz-mark]").length === 0) {
        add(`Surface ${index + 1} has no data-viz-mark renderer evidence.`);
      }
    });

    root
      .querySelectorAll<SVGGraphicsElement>("[data-viz-title-badge-label]")
      .forEach((label, badgeIndex) => {
        if (!visible(label)) return;
        const group = label.closest("[data-viz-title-badge]");
        const background = group?.querySelector<SVGGraphicsElement>(
          "[data-viz-title-badge-background]",
        );
        if (!group || !background || !visible(background)) {
          add(
            `Title badge ${badgeIndex + 1} has no visible sibling background.`,
          );
          return;
        }

        const labelClient = label.getBoundingClientRect();
        const backgroundClient = background.getBoundingClientRect();
        const labelSvg = label.getBBox();
        const backgroundSvg = background.getBBox();
        const widths =
          `label client=${labelClient.width.toFixed(1)}, SVG=${labelSvg.width.toFixed(1)}; ` +
          `background client=${backgroundClient.width.toFixed(1)}, SVG=${backgroundSvg.width.toFixed(1)}`;
        const containedWithin = (
          inner: { bottom: number; left: number; right: number; top: number },
          outer: { bottom: number; left: number; right: number; top: number },
        ) =>
          inner.left >= outer.left - 1 &&
          inner.right <= outer.right + 1 &&
          inner.top >= outer.top - 1 &&
          inner.bottom <= outer.bottom + 1;
        const svgRect = (box: {
          height: number;
          width: number;
          x: number;
          y: number;
        }): Rect => ({
          bottom: box.y + box.height,
          height: box.height,
          left: box.x,
          right: box.x + box.width,
          top: box.y,
          width: box.width,
        });

        if (!containedWithin(labelClient, backgroundClient)) {
          add(
            `Title badge ${badgeIndex + 1} label leaves its CSS background (${widths}).`,
          );
        }
        if (!containedWithin(svgRect(labelSvg), svgRect(backgroundSvg))) {
          add(
            `Title badge ${badgeIndex + 1} label leaves its SVG background (${widths}).`,
          );
        }

        group
          .querySelectorAll<SVGGraphicsElement>("circle")
          .forEach((circle, circleIndex) => {
            if (!visible(circle)) return;
            const clientOverlap = intersection(
              labelClient,
              circle.getBoundingClientRect(),
            );
            const svgOverlap = intersection(
              svgRect(labelSvg),
              svgRect(circle.getBBox()),
            );
            if (
              (clientOverlap.width > 1 && clientOverlap.height > 1) ||
              (svgOverlap.width > 1 && svgOverlap.height > 1)
            ) {
              add(
                `Title badge ${badgeIndex + 1} label intersects circle ${circleIndex + 1} ` +
                  `(client overlap=${Math.max(0, clientOverlap.width).toFixed(1)}x${Math.max(0, clientOverlap.height).toFixed(1)}, ` +
                  `SVG overlap=${Math.max(0, svgOverlap.width).toFixed(1)}x${Math.max(0, svgOverlap.height).toFixed(1)}; ${widths}).`,
              );
            }
          });
      });

    if (root.querySelector(".katex-error"))
      add("KaTeX reported a rendering error.");

    const actionTargets = new Set<Element>();
    root
      .querySelectorAll<Element>(
        'button, a[href], input:not([type="range"]), select, textarea, [role="button"]',
      )
      .forEach((target) => {
        if (visible(target)) actionTargets.add(target);
      });
    root
      .querySelectorAll<HTMLInputElement>('input[type="range"]')
      .forEach((range) => {
        const target = range.closest("label") ?? range;
        if (visible(target)) actionTargets.add(target);
      });
    actionTargets.forEach((target) => {
      const rect = target.getBoundingClientRect();
      if (rect.width < 44 - tolerance || rect.height < 44 - tolerance) {
        add(
          `${elementName(target)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}, below 44x44.`,
        );
      }
      if (
        rect.left < -tolerance ||
        rect.right > window.innerWidth + tolerance
      ) {
        add(
          `${elementName(target)} control is horizontally outside the viewport.`,
        );
      }
    });

    const textFragments: TextFragment[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (
        parent &&
        text &&
        !parent.closest('[aria-hidden="true"], [hidden]') &&
        !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName) &&
        visible(parent)
      ) {
        try {
          const range = document.createRange();
          range.selectNodeContents(node);
          Array.from(range.getClientRects()).forEach((rect) => {
            const clippedRect = effectiveRect(parent, rect);
            if (
              clippedRect &&
              clippedRect.width > 1 &&
              clippedRect.height > 1
            ) {
              textFragments.push({
                element: parent,
                rect: clippedRect,
                text: text.slice(0, 90),
              });
            }
          });
        } catch {
          // A browser may decline a Range for a transiently unmounted SVG text
          // node. The renderer health/mark checks still cover that surface.
        }
      }
      node = walker.nextNode();
    }

    textFragments.forEach((fragment) => {
      let ancestor = fragment.element.parentElement;
      while (ancestor && root.contains(ancestor)) {
        const style = window.getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        const approvedHorizontalScroll = ancestor.hasAttribute(
          "data-viz-scroll-surface",
        );
        if (
          (!approvedHorizontalScroll &&
            clips(style.overflowX) &&
            (fragment.rect.left < ancestorRect.left - tolerance ||
              fragment.rect.right > ancestorRect.right + tolerance)) ||
          (clips(style.overflowY) &&
            (fragment.rect.top < ancestorRect.top - tolerance ||
              fragment.rect.bottom > ancestorRect.bottom + tolerance))
        ) {
          add(
            `Visible text "${fragment.text}" is clipped by ${elementName(ancestor)}.`,
          );
          break;
        }
        if (ancestor === root) break;
        ancestor = ancestor.parentElement;
      }
    });

    for (let leftIndex = 0; leftIndex < textFragments.length; leftIndex += 1) {
      const left = textFragments[leftIndex];
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < textFragments.length;
        rightIndex += 1
      ) {
        const right = textFragments[rightIndex];
        if (
          left.element === right.element ||
          left.element.contains(right.element) ||
          right.element.contains(left.element)
        ) {
          continue;
        }
        const overlap = intersection(left.rect, right.rect);
        if (overlap.width > tolerance && overlap.height > tolerance) {
          add(
            `Visible text collision: "${left.text}" overlaps "${right.text}" by ${Math.round(overlap.width)}x${Math.round(overlap.height)}.`,
          );
        }
      }
    }

    surfaces
      .filter((surface) => !surface.hasAttribute("data-viz-renderer"))
      .forEach((surface, surfaceIndex) => {
        const labels = Array.from(
          surface.querySelectorAll<Element>("text, [data-viz-label]"),
        )
          .filter(
            (element) =>
              element.tagName.toLowerCase() === "text" ||
              Boolean(element.textContent?.trim()),
          )
          .filter(visible);
        const marks = Array.from(
          surface.querySelectorAll<Element>("[data-viz-mark]"),
        )
          // Only leaf marks represent drawable shapes. A semantic group has a
          // union bbox that would otherwise create false collisions with its
          // own or neighbouring children.
          .filter((element) => !element.querySelector("[data-viz-mark]"))
          .filter(visible);

        labels.forEach((label) => {
          const labelRect = effectiveRect(label, label.getBoundingClientRect());
          if (!labelRect) return;
          marks.forEach((mark) => {
            // Preserve semantic containment: a label inside a drawable group,
            // or a labelled mark that contains its text, is not a collision
            // between independent geometry.
            if (mark.contains(label) || label.contains(mark)) return;
            const markRect = effectiveRect(mark, mark.getBoundingClientRect());
            if (!markRect) return;
            const overlap = intersection(labelRect, markRect);
            if (overlap.width > 4 && overlap.height > 4) {
              labelMarkOverlaps.push({
                height: Math.round(overlap.height),
                labelCarrier: nearestOverlapCarrier(label),
                labelName: elementName(label),
                markCarrier: nearestOverlapCarrier(mark),
                markName: elementName(mark),
                surfaceIndex,
                width: Math.round(overlap.width),
              });
            }
          });
        });
      });

    return { issues, labelMarkOverlaps };
  });

  const labelMarkIssues = audit.labelMarkOverlaps.flatMap((overlap) => {
    const decision = resolveOverlapPairDecision(
      overlap.labelCarrier,
      overlap.markCarrier,
    );
    if (decision.approved) return [];
    return [
      `SVG label/mark collision on surface ${overlap.surfaceIndex + 1}: ` +
        `"${overlap.labelName}" overlaps "${overlap.markName}" by ${overlap.width}x${overlap.height}. ` +
        decision.diagnostic,
    ];
  });

  return [...audit.issues, ...labelMarkIssues].slice(0, 80);
}

function shortLabel(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 32);
}

function sanitizeName(value: string) {
  return value
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatFailureSummary(
  failures: FailureRecord[],
  omitted: number,
  projectName: string,
  actualViewport: string,
) {
  const lines = failures
    .slice(0, 60)
    .map(
      (failure, index) =>
        `${index + 1}. [${projectName}/${language}/${theme}/${actualViewport}] ${failure.labId} state=${JSON.stringify(failure.state)}: ${failure.issue}`,
    );
  const remaining = failures.length - lines.length + omitted;
  return [
    `China Visualization Lab gate found ${failures.length + omitted} issue(s) in ${language}/${theme}/${actualViewport}.`,
    ...lines,
    ...(remaining > 0
      ? [
          `...and ${remaining} additional issue(s) were omitted from this summary.`,
        ]
      : []),
  ].join("\n");
}
