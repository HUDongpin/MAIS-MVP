import { createHash } from "node:crypto";
import {
  expect,
  test as base,
  type ElementHandle,
  type Locator,
  type Page,
  type TestInfo
} from "@playwright/test";
import sharp from "sharp";
import {
  collectCaliforniaCanvasTextFindings,
  installCaliforniaCanvasTextAudit
} from "./california-canvas-text-audit";
import {
  installCaliforniaCanvasGraphicsRuntime
} from "./california-canvas-graphics-runtime";
import {
  auditCaliforniaPremiumWebGlRetainedContrastEvidence,
  auditCaliforniaPremiumWebGlStateSequence,
  californiaPremiumWebGlPixelDifference,
  captureAndRegisterCaliforniaPremiumWebGlContrastEvidence,
  installCaliforniaPremiumWebGlContrastProvider,
} from "./california-premium-webgl-graphics-contract";
import {
  californiaSignatureContrastProvider,
  requireCaliforniaSignatureCanvasRuntimeRunId,
  runCaliforniaCanvasGraphicsOneShotGate
} from "./california-signature-exhaustive-qa";
import {
  buildCaliforniaVisualizationCoverageExpectedArtifactMatrix,
  buildCaliforniaVisualizationCoverageRunIdentity,
  persistCaliforniaVisualizationCoverageDiagnostic,
  persistCaliforniaVisualizationCoveragePassedArtifact,
  type CaliforniaVisualizationCoveragePassedPayload
} from "./california-visualization-artifact-lifecycle";
import {
  CaliforniaBrowserDiagnostics,
  CaliforniaVisitDeadline,
  CALIFORNIA_TERMINAL_DIAGNOSTIC_TIMEOUT_MS,
  appendCaliforniaDiagnosticFindings,
  appendUiFindings,
  assertCaliforniaFormalQaConfig,
  buildCaliforniaCoverageProvenance,
  buildCaliforniaQaWorkItems,
  californiaVisualizationQaInventory,
  californiaQaPackageTimeoutMs,
  captureCaliforniaFormalProjectEvidence,
  captureSignatureBenchDefaultState,
  disableQaMotion,
  enforceCaliforniaFormalReducedMotion,
  expectCaliforniaAuthHydrated,
  formatCaliforniaQaContext,
  installCaliforniaVisualizationUiAuditInit,
  installCaliforniaVisualizationUiAuditProtocolEpoch,
  openCaliforniaDirectoryLab,
  openCaliforniaPremiumDirectLab,
  openSignatureBench,
  readCaliforniaQaConfig,
  registerCaliforniaVisualizationStudent,
  resetSignatureBench,
  runCaliforniaQaAction,
  smokePremiumDirectControls,
  smokeSignatureBenchControl,
  viewportForPage,
  type CaliforniaDirectoryPackage,
  type CaliforniaCoverageProvenance,
  type CaliforniaPremiumPackage,
  type CaliforniaQaAxis,
  type CaliforniaQaContext,
  type CaliforniaPremiumFrameEvidence,
  type CaliforniaPremiumWebGlContrastEvidence,
  type CaliforniaQaStructuredRecordEvidence,
  type RegisteredCaliforniaStudent
} from "./california-visualization-qa-helpers";

const test = base.extend<{ californiaVisualizationUiAuditProtocolOwner: void }>({
  californiaVisualizationUiAuditProtocolOwner: [async ({ context }, use) => {
    expect(
      installCaliforniaVisualizationUiAuditProtocolEpoch(context),
      "California formal UI audit protocol owner must install before Page creation"
    ).toBe(true);
    await use();
  }, { auto: true }]
});

test.beforeEach(async ({ page }) => {
  await enforceCaliforniaFormalReducedMotion(page);
});

const config = readCaliforniaQaConfig();
const workItems = buildCaliforniaQaWorkItems(config);
const TERMINAL_DIAGNOSTIC_QUIET_WINDOW_MS = 250;

type CaliforniaQaCoverageRecord = {
  attempted: boolean;
  auditEvidence?: string[];
  axisId: string;
  benchId: string;
  detail?: string;
  durationMs?: number;
  evidence: CaliforniaQaStructuredRecordEvidence;
  labId: string;
  routeKind: CaliforniaQaContext["routeKind"];
  status: "failed" | "passed" | "pending";
};

function packageTimeoutMs(
  axes: CaliforniaQaAxis[],
  workItem: CaliforniaDirectoryPackage | CaliforniaPremiumPackage
) {
  return californiaQaPackageTimeoutMs({
    axisCount: Math.max(1, axes.length),
    config,
    visitCount: workItem.visitCount
  });
}

function plannedCoverageTargets(workItem: CaliforniaDirectoryPackage | CaliforniaPremiumPackage) {
  return workItem.labs.flatMap((lab) => workItem.kind === "directory"
    ? [lab.assignment.primary, ...(lab.assignment.related ?? [])].map((benchId) => ({ benchId, labId: lab.labId }))
    : [{ benchId: "premium-3d", labId: lab.labId }]
  );
}

function buildCoverageRecords(
  axes: CaliforniaQaAxis[],
  workItem: CaliforniaDirectoryPackage | CaliforniaPremiumPackage
) {
  return axes.flatMap((axis): CaliforniaQaCoverageRecord[] =>
    plannedCoverageTargets(workItem).map((target) => ({
      attempted: false,
      axisId: axis.id,
      benchId: target.benchId,
      evidence: {
        canvasGraphicsGates: [],
        canvasGates: [],
        contrastGates: [],
        uiGates: []
      },
      labId: target.labId,
      routeKind: workItem.kind,
      status: "pending"
    }))
  );
}

function coverageRecordFor(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  coverage: CaliforniaQaCoverageRecord[];
  labId: string;
  routeKind: CaliforniaQaContext["routeKind"];
}) {
  const record = options.coverage.find((candidate) =>
    candidate.axisId === options.axis.id &&
    candidate.benchId === options.benchId &&
    candidate.labId === options.labId &&
    candidate.routeKind === options.routeKind
  );
  expect(record, `Missing California QA coverage record for ${options.axis.id}/${options.labId}/${options.benchId}`).toBeTruthy();
  return record!;
}

function compactIssueDetail(issues: string[]) {
  return issues.slice(0, 3).join(" | ").slice(0, 1_200);
}

function errorDetail(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/\s+/g, " ").trim()
    : String(error).replace(/\s+/g, " ").trim();
}

function safeArtifactSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "unnamed";
}

const coverageProvenance: CaliforniaCoverageProvenance = buildCaliforniaCoverageProvenance(config, {
  requireRunIdentity: Boolean(process.env.CA_VIZ_COVERAGE_LEDGER_DIR?.trim())
});
const coverageLedgerRoot = process.env.CA_VIZ_COVERAGE_LEDGER_DIR?.trim() || null;
const coverageLifecycle = coverageLedgerRoot
  ? (() => {
      const requiredAxisIds = ["desktop", "mobile"].flatMap((viewport) =>
        ["en", "zhHK", "zhCN"].flatMap((language) =>
          ["light", "dark"].map((theme) => `${viewport}-${language}-${theme}`)
        )
      ).sort();
      const configuredAxisIds = config.axes.map((axis) => axis.id).sort();
      if (JSON.stringify(configuredAxisIds) !== JSON.stringify(requiredAxisIds)) {
        throw new Error(
          "Durable California coverage requires the exact 12-axis viewport/locale/theme matrix."
        );
      }
      assertCaliforniaFormalQaConfig(config);
      const requiredGrades = [...new Set(californiaVisualizationQaInventory.labs.map((lab) => lab.grade))].sort();
      if (JSON.stringify([...config.grades].sort()) !== JSON.stringify(requiredGrades)) {
        throw new Error("Durable California coverage forbids grade filters.");
      }
      if (config.labIds.size !== 0) {
        throw new Error("Durable California coverage forbids lab filters.");
      }
      if (!config.includePremiumDirect) {
        throw new Error("Durable California coverage requires every catalog-derived live premium route.");
      }
      if (config.shard !== null) {
        throw new Error("Durable California coverage forbids sharding.");
      }
      const provenance = buildCaliforniaVisualizationCoverageRunIdentity(coverageProvenance);
      return {
        expectedMatrix: buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
          packages: workItems.map((workItem) => workItem.id),
          provenance
        }),
        ledgerRoot: coverageLedgerRoot,
        provenance
      };
    })()
  : null;

async function runVisitCaliforniaQaAction(options: Parameters<typeof runCaliforniaQaAction>[0] & {
  deadline: CaliforniaVisitDeadline;
}) {
  return runCaliforniaQaAction({
    action: () => options.deadline.run(options.context.action, options.action),
    context: options.context,
    diagnostics: options.diagnostics,
    evidence: options.evidence,
    issues: options.issues,
    page: options.page,
    timeout: () => options.deadline.remainingTimeout(`pre-action-quiescence:${options.context.action}`)
  });
}

async function appendUiFindingsWithinDeadline(options: Parameters<typeof appendUiFindings>[0] & {
  deadline: CaliforniaVisitDeadline;
}) {
  return options.deadline.run(`ui-gate:${options.state}`, () => appendUiFindings({
    axis: options.axis,
    benchId: options.benchId,
    issues: options.issues,
    labId: options.labId,
    root: options.root,
    routeKind: options.routeKind,
    state: options.state
  }));
}

function appendUxReadyEvidence(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  issues: string[];
  labId: string;
  record: CaliforniaQaCoverageRecord;
  routeKind: CaliforniaQaContext["routeKind"];
  startedAt: number;
  visitKind: "premium" | "primary" | "related";
}) {
  const durationMs = Date.now() - options.startedAt;
  options.record.auditEvidence ??= [];
  options.record.auditEvidence.push(
    `ux-ready:${options.visitKind}:${durationMs}ms:budget=${config.uxBudgetMs}ms`
  );
  if (durationMs <= config.uxBudgetMs) return;
  options.issues.push(
    `[${formatCaliforniaQaContext({
      action: `${options.visitKind}-canvas-ready-budget`,
      axis: options.axis,
      benchId: options.benchId,
      labId: options.labId,
      routeKind: options.routeKind
    })}] ux-budget-exceeded: ${durationMs}ms from ${options.visitKind === "related"
      ? "tab selection/openSignatureBench"
      : "route navigation"} through nonzero canvas readiness > ${config.uxBudgetMs}ms`
  );
}

function appendUxNotReadyBudgetFinding(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  issues: string[];
  labId: string;
  record: CaliforniaQaCoverageRecord;
  routeKind: CaliforniaQaContext["routeKind"];
  startedAt: number;
  visitKind: "premium" | "primary" | "related";
}) {
  const durationMs = Date.now() - options.startedAt;
  if (durationMs <= config.uxBudgetMs) return;
  options.record.auditEvidence ??= [];
  options.record.auditEvidence.push(
    `ux-ready-missed:${options.visitKind}:${durationMs}ms:budget=${config.uxBudgetMs}ms`
  );
  options.issues.push(
    `[${formatCaliforniaQaContext({
      action: `${options.visitKind}-canvas-ready-budget`,
      axis: options.axis,
      benchId: options.benchId,
      labId: options.labId,
      routeKind: options.routeKind
    })}] ux-budget-exceeded: nonzero canvas readiness was not reached within ${config.uxBudgetMs}ms ` +
    `(elapsed ${durationMs}ms)`
  );
}

async function appendCanvasTextFindings(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  canvasSelector?: string;
  deadline: CaliforniaVisitDeadline;
  issues: string[];
  labId: string;
  root: Locator;
  routeKind: CaliforniaQaContext["routeKind"];
  state: string;
}) {
  let result: Awaited<ReturnType<typeof collectCaliforniaCanvasTextFindings>>;
  try {
    const action = `canvas-text-gate:${options.state}`;
    const stabilityTimeoutMs = options.deadline.remainingTimeout(action, 5_500);
    result = await options.deadline.run(action, () => collectCaliforniaCanvasTextFindings(
      options.root,
      {
        benchId: options.benchId,
        state: options.state,
        viewport: options.axis.viewport
      },
      {
        canvasSelector: options.canvasSelector,
        timeoutMs: stabilityTimeoutMs
      }
    ));
  } catch (error) {
    const detail = errorDetail(error);
    options.issues.push(
      `[${formatCaliforniaQaContext({
        action: `canvas-text-gate:${options.state}`,
        axis: options.axis,
        benchId: options.benchId,
        labId: options.labId,
        routeKind: options.routeKind
      })}] canvas-audit-error: ${detail}`
    );
    return {
      canvasCount: 0,
      clippedTextLayerCount: 0,
      completed: false,
      findingCount: 1,
      state: options.state,
      textLayerCount: 0
    };
  }
  for (const finding of result.findings) {
    const context: CaliforniaQaContext = {
      action: `canvas-text-gate:${options.state}`,
      axis: options.axis,
      benchId: options.benchId,
      labId: options.labId,
      routeKind: options.routeKind
    };
    const texts = [finding.text, finding.otherText].filter(Boolean).map((value) => JSON.stringify(value)).join(" <> ");
    options.issues.push(
      `[${formatCaliforniaQaContext(context)}] ${finding.kind}: ${finding.detail}${texts ? ` text=${texts}` : ""}`
    );
  }
  return {
    canvasCount: result.canvasCount,
    clippedTextLayerCount: result.clippedTextLayerCount,
    completed: true,
    findingCount: result.findings.length,
    state: options.state,
    textLayerCount: result.textLayerCount
  };
}

type CaliforniaContrastSegmentPlanEntry = {
  allowAbsent?: boolean;
  id: "shell-header" | "tabs" | "active-signature-header-stage" | "controls-lesson" | "footer-reset";
  roots: readonly Locator[];
};

type CaliforniaDirectoryStateSettleReceipt = {
  exploreGate: "awaiting-interaction" | "engaged";
  initialExploreGate: string;
  initialSaveState: string;
  interactionExpected: boolean;
  pendingRequestCount: number;
  quiescent: boolean;
  saveState: string;
  waitedMs: number;
};

type CaliforniaContrastSegmentReceipt = {
  auditedLabelCount: number;
  candidateLabelCount: number;
  findingCount: number;
  hardenedTextAuditedCount: number;
  hardenedTextCandidateCount: number;
  hardenedTextFindingCount: number;
  hardenedTextMinRatio: number | null;
  id: CaliforniaContrastSegmentPlanEntry["id"];
  minRatio: number | null;
  present: boolean;
  sliceCount: number;
};

type CaliforniaContrastSegmentRootReceipt = {
  domPath: string;
  segmentId: CaliforniaContrastSegmentPlanEntry["id"];
  sliceIndex: number;
};

async function inspectCaliforniaContrastSegmentRootPartition(
  segmentPlan: readonly CaliforniaContrastSegmentPlanEntry[]
): Promise<CaliforniaContrastSegmentRootReceipt[]> {
  const materialized: Array<CaliforniaContrastSegmentRootReceipt & {
    handle: ElementHandle<HTMLElement | SVGElement>;
  }> = [];
  try {
    for (const segment of segmentPlan) {
      for (let sliceIndex = 0; sliceIndex < segment.roots.length; sliceIndex += 1) {
        const root = segment.roots[sliceIndex]!;
        if (await root.count() !== 1) continue;
        const handle = await root.elementHandle();
        if (!handle) continue;
        const domPath = await handle.evaluate((element) => {
          const parts: string[] = [];
          let current: Element | null = element;
          while (current) {
            const currentElement: Element = current;
            const parentElement: Element | null = currentElement.parentElement;
            const tag = currentElement.tagName.toLowerCase();
            const sameTagSiblings: Element[] = parentElement
              ? Array.from(parentElement.children).filter(
                  (sibling: Element) => sibling.tagName === currentElement.tagName
                )
              : [currentElement];
            const siblingIndex = sameTagSiblings.indexOf(currentElement) + 1;
            parts.push(`${tag}:nth-of-type(${siblingIndex})`);
            current = parentElement;
          }
          return parts.reverse().join(" > ");
        });
        materialized.push({ domPath, handle, segmentId: segment.id, sliceIndex });
      }
    }

    for (let leftIndex = 0; leftIndex < materialized.length; leftIndex += 1) {
      const left = materialized[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < materialized.length; rightIndex += 1) {
        const right = materialized[rightIndex]!;
        const overlaps = await left.handle.evaluate((leftElement, rightElement) =>
          leftElement === rightElement ||
          leftElement.contains(rightElement) ||
          rightElement.contains(leftElement), right.handle
        );
        if (overlaps) {
          throw new Error(
            `contrast-segment-root-overlap: ` +
            `${left.segmentId}[${left.sliceIndex + 1}]=${left.domPath} overlaps ` +
            `${right.segmentId}[${right.sliceIndex + 1}]=${right.domPath}`
          );
        }
      }
    }

    return materialized.map(({ domPath, segmentId, sliceIndex }) => ({
      domPath,
      segmentId,
      sliceIndex
    }));
  } finally {
    await Promise.all(materialized.map(({ handle }) => handle.dispose()));
  }
}

async function settleCaliforniaDirectoryAuditState(options: {
  card: Locator;
  deadline: CaliforniaVisitDeadline;
  diagnostics: CaliforniaBrowserDiagnostics;
  interactionExpected: boolean;
  page: Page;
  state: string;
}): Promise<CaliforniaDirectoryStateSettleReceipt> {
  const startedAt = Date.now();
  const initialExploreGate = await options.card.getAttribute("data-viz-explore-gate");
  const initialSaveState = await options.card.getAttribute("data-viz-save-state");
  if (!initialExploreGate || !initialSaveState) {
    throw new Error(
      `directory-state-settle:${options.state}: missing explore/save state ` +
      `(explore=${initialExploreGate ?? "missing"}, save=${initialSaveState ?? "missing"})`
    );
  }
  if (initialExploreGate === "awaiting-interaction" && options.interactionExpected) {
    throw new Error(
      `directory-state-settle:${options.state}: awaiting-interaction is allowed only before the first learner interaction`
    );
  }
  if (!["awaiting-interaction", "dwell", "engaged"].includes(initialExploreGate)) {
    throw new Error(
      `directory-state-settle:${options.state}: unsupported explore gate ${JSON.stringify(initialExploreGate)}`
    );
  }

  if (initialExploreGate !== "awaiting-interaction") {
    const terminalStateDeadline = Date.now() + options.deadline.remainingTimeout(
      `directory-state-settle:${options.state}`
    );
    while (Date.now() < terminalStateDeadline) {
      const [exploreGate, saveState] = await Promise.all([
        options.card.getAttribute("data-viz-explore-gate"),
        options.card.getAttribute("data-viz-save-state")
      ]);
      if (saveState === "error") {
        throw new Error(`directory-state-settle:${options.state}: visualization save entered error state`);
      }
      if (exploreGate === "awaiting-interaction") {
        throw new Error(
          `directory-state-settle:${options.state}: explore gate regressed to awaiting-interaction after interaction`
        );
      }
      if (exploreGate === "engaged" && saveState === "saved") break;
      await options.page.waitForTimeout(Math.min(25, Math.max(1, terminalStateDeadline - Date.now())));
    }
  }

  const [exploreGate, saveState] = await Promise.all([
    options.card.getAttribute("data-viz-explore-gate"),
    options.card.getAttribute("data-viz-save-state")
  ]);
  if (initialExploreGate === "awaiting-interaction") {
    if (exploreGate !== "awaiting-interaction") {
      throw new Error(
        `directory-state-settle:${options.state}: pre-interaction gate drifted from awaiting-interaction to ${exploreGate ?? "missing"}`
      );
    }
    if (!new Set(["idle", "saved"]).has(saveState ?? "")) {
      throw new Error(
        `directory-state-settle:${options.state}: pre-interaction save state is ${saveState ?? "missing"}`
      );
    }
  } else if (exploreGate !== "engaged" || saveState !== "saved") {
    throw new Error(
      `directory-state-settle:${options.state}: terminal explore/save state did not settle ` +
      `(explore=${exploreGate ?? "missing"}, save=${saveState ?? "missing"})`
    );
  }

  const terminal = await options.diagnostics.awaitTerminalQuiescence({
    quietWindowMs: 250,
    timeout: options.deadline.remainingTimeout(`directory-state-network-settle:${options.state}`)
  });
  if (
    !terminal.quiescent ||
    terminal.pendingRequests.length > 0 ||
    terminal.diagnostics.length > 0
  ) {
    const diagnosticDetail = terminal.diagnostics
      .map((diagnostic) => `${diagnostic.kind}:${diagnostic.detail}`)
      .join("|");
    throw new Error(
      `directory-state-settle:${options.state}: network/diagnostic state is not acknowledged and quiet; ` +
      `quiescent=${terminal.quiescent}; pending=${terminal.pendingRequests.join(",") || "none"}; ` +
      `diagnostics=${diagnosticDetail || "none"}`
    );
  }

  return {
    exploreGate: exploreGate as CaliforniaDirectoryStateSettleReceipt["exploreGate"],
    initialExploreGate,
    initialSaveState,
    interactionExpected: options.interactionExpected,
    pendingRequestCount: terminal.pendingRequests.length,
    quiescent: terminal.quiescent,
    saveState: saveState!,
    waitedMs: Date.now() - startedAt
  };
}

async function partitionCaliforniaContrastRoot(root: Locator): Promise<Locator[]> {
  if (await root.count() === 0) return [];
  const paths = await root.evaluate((rootElement) => {
    type SegmentPath = number[];
    const hasVisibleAuditCandidate = (element: Element) => {
      if (element.matches("canvas,[data-viz-essential],[data-viz-axis]")) return true;
      if (element.querySelector("canvas,[data-viz-essential],[data-viz-axis],svg text,svg tspan,svg textPath,svg use")) {
        return true;
      }
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          if (!parent || !text || parent.closest("script,style")) return NodeFilter.FILTER_REJECT;
          const style = getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT;
          const range = document.createRange();
          range.selectNodeContents(node);
          return Array.from(range.getClientRects()).some((rect) => rect.width > 1 && rect.height > 1)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      });
      return Boolean(walker.nextNode());
    };
    const hasVisibleDirectText = (element: Element) => Array.from(element.childNodes).some((node) => {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.replace(/\s+/g, " ").trim()) return false;
      const range = document.createRange();
      range.selectNodeContents(node);
      return Array.from(range.getClientRects()).some((rect) => rect.width > 1 && rect.height > 1);
    });
    const availableHeight = Math.max(120, innerHeight - 112);
    const availableWidth = Math.max(120, innerWidth - 16);
    const result: SegmentPath[] = [];
    const visit = (element: Element, path: SegmentPath) => {
      if (!hasVisibleAuditCandidate(element)) return;
      const rect = element.getBoundingClientRect();
      if (rect.height <= availableHeight && rect.width <= availableWidth) {
        result.push(path);
        return;
      }
      const candidateChildren = Array.from(element.children)
        .map((child, index) => ({ child, index }))
        .filter(({ child }) => hasVisibleAuditCandidate(child));
      if (candidateChildren.length === 0 || hasVisibleDirectText(element)) {
        // The viewport gate will reject this unsplittable oversized root. It is
        // never silently omitted or treated as an offscreen pass.
        result.push(path);
        return;
      }
      for (const { child, index } of candidateChildren) visit(child, [...path, index]);
    };
    visit(rootElement, []);
    return result;
  });
  return paths.map((path) => {
    let target = root;
    for (const childIndex of path) target = target.locator(":scope > *").nth(childIndex);
    return target;
  });
}

async function buildCaliforniaSignatureContrastSegmentPlan(options: {
  panel: Locator;
  signatureLab: Locator;
  switcher: Locator;
}): Promise<CaliforniaContrastSegmentPlanEntry[]> {
  const activeLabSection = options.panel.locator(":scope > section[data-lab-id]").first();
  const shellHeader = activeLabSection.locator(":scope > div").first();
  const card = activeLabSection.locator("[data-viz-card]").first();
  const cardHeader = card.locator(":scope > div").first();
  const tabList = options.switcher.locator(":scope > [role=tablist]").first();
  const surface = options.signatureLab.locator(":scope > [data-viz-surface]").first();
  const labRoot = surface.locator(":scope > :not(style)").first();
  const authoredHeader = labRoot.locator(":scope > header.head").first();
  const fallbackHeading = labRoot.locator(":scope > h1, :scope > p.lede");
  const stagePanel = labRoot.locator(".stage-panel").first();
  const tutorPanel = labRoot.locator(".tutor").first();
  const resetControl = options.signatureLab.locator("[data-viz-reset-model]").first();
  const resetFooter = resetControl.locator("xpath=..");

  const authoredHeaderRoots = await authoredHeader.count() > 0
    ? await partitionCaliforniaContrastRoot(authoredHeader)
    : await Promise.all(Array.from({ length: await fallbackHeading.count() }, async (_, index) =>
        partitionCaliforniaContrastRoot(fallbackHeading.nth(index))
      )).then((groups) => groups.flat());
  return [
    {
      id: "shell-header",
      roots: await partitionCaliforniaContrastRoot(shellHeader)
    },
    {
      allowAbsent: true,
      id: "tabs",
      roots: await partitionCaliforniaContrastRoot(tabList)
    },
    {
      id: "active-signature-header-stage",
      roots: [
        ...await partitionCaliforniaContrastRoot(cardHeader),
        ...authoredHeaderRoots,
        ...await partitionCaliforniaContrastRoot(stagePanel)
      ]
    },
    {
      id: "controls-lesson",
      roots: await partitionCaliforniaContrastRoot(tutorPanel)
    },
    {
      id: "footer-reset",
      roots: await partitionCaliforniaContrastRoot(resetFooter)
    }
  ];
}

async function scrollCaliforniaContrastRootIntoSafeViewport(page: Page, root: Locator) {
  return root.evaluate(async (element) => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const visibleTopOccluderBottom = () => {
      let bottom = 0;
      const candidates = document.querySelectorAll<HTMLElement>(
        "header,nav,[class*='sticky'],[class*='fixed'],[style*='position']"
      );
      for (const candidate of candidates) {
        if (candidate === element || element.contains(candidate) || candidate.contains(element)) continue;
        const style = getComputedStyle(candidate);
        if (style.position !== "fixed" && style.position !== "sticky") continue;
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) <= 0) continue;
        if (style.pointerEvents === "none") continue;
        const rect = candidate.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1 || rect.top > 1 || rect.bottom <= 0) continue;
        if (rect.right <= 0 || rect.left >= innerWidth) continue;
        bottom = Math.max(bottom, Math.min(innerHeight, rect.bottom));
      }
      return bottom;
    };
    const place = () => {
      const rect = element.getBoundingClientRect();
      const safeTop = visibleTopOccluderBottom() + 8;
      const safeBottom = innerHeight;
      const availableHeight = Math.max(0, safeBottom - safeTop);
      const desiredTop = safeTop + Math.max(0, (availableHeight - rect.height) / 2);
      window.scrollTo({ behavior: "auto", left: window.scrollX, top: window.scrollY + rect.top - desiredTop });
    };
    place();
    await frame();
    await frame();
    place();
    await frame();
    await frame();
    const rect = element.getBoundingClientRect();
    const stickyBottom = visibleTopOccluderBottom();
    const safeTop = stickyBottom + 8;
    const safeBottom = innerHeight;
    return {
      bottom: rect.bottom,
      fullyVisible:
        rect.width > 1 && rect.height > 1 &&
        rect.left >= -0.5 && rect.right <= innerWidth + 0.5 &&
        rect.top >= safeTop - 0.5 && rect.bottom <= safeBottom + 0.5,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      safeBottom,
      safeTop,
      stickyBottom,
      top: rect.top,
      width: rect.width
    };
  });
}

async function appendContrastFindings(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  deadline: CaliforniaVisitDeadline;
  issues: string[];
  labId: string;
  root: Locator;
  routeKind: CaliforniaQaContext["routeKind"];
  segmentPlan?: readonly CaliforniaContrastSegmentPlanEntry[];
  settle?: {
    card: Locator;
    diagnostics: CaliforniaBrowserDiagnostics;
    interactionExpected: boolean;
    page?: Page;
  };
  settledReceipt?: CaliforniaDirectoryStateSettleReceipt;
  state: string;
}) {
  const context: CaliforniaQaContext = {
    action: `numeric-contrast-gate:${options.state}`,
    axis: options.axis,
    benchId: options.benchId,
    labId: options.labId,
    routeKind: options.routeKind
  };
  try {
    if (options.settle && options.settledReceipt) {
      throw new Error(`directory-state-settle:${options.state}: duplicate live and pre-settled receipt inputs`);
    }
    const settleReceipt = options.settledReceipt ?? (options.settle
      ? await options.deadline.run(`directory-state-settle:${options.state}`, () =>
          settleCaliforniaDirectoryAuditState({
            card: options.settle!.card,
            deadline: options.deadline,
            diagnostics: options.settle!.diagnostics,
            interactionExpected: options.settle!.interactionExpected,
            page: options.settle!.page ?? options.root.page(),
            state: options.state
          })
        )
      : undefined);

    if (options.segmentPlan) {
      const originalScroll = await options.root.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
      const segmentRootPartition = await inspectCaliforniaContrastSegmentRootPartition(options.segmentPlan);
      const segmentRootPartitionSha256 = createHash("sha256")
        .update(JSON.stringify(segmentRootPartition))
        .digest("hex");
      const segmentReceipts: CaliforniaContrastSegmentReceipt[] = [];
      const auditedResults: Array<{
        result: Awaited<ReturnType<typeof californiaSignatureContrastProvider.audit>>;
        segmentId: CaliforniaContrastSegmentPlanEntry["id"];
      }> = [];
      let restorationFindingCount = 0;
      try {
        for (const segment of options.segmentPlan) {
          const roots = segment.roots.filter((root) => root);
          let segmentFindingCount = 0;
          let present = false;
          const segmentResults: Array<Awaited<ReturnType<typeof californiaSignatureContrastProvider.audit>>> = [];
          for (let sliceIndex = 0; sliceIndex < roots.length; sliceIndex += 1) {
            const root = roots[sliceIndex]!;
            const rootCount = await root.count();
            if (rootCount === 0) continue;
            if (rootCount !== 1) {
              segmentFindingCount += 1;
              options.issues.push(
                `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
                `contrast-segment-root-ambiguous: slice=${sliceIndex + 1} count=${rootCount}`
              );
              continue;
            }
            present = true;
            const geometry = await scrollCaliforniaContrastRootIntoSafeViewport(options.root.page(), root);
            if (!geometry.fullyVisible) {
              segmentFindingCount += 1;
              options.issues.push(
                `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
                `contrast-segment-not-fully-visible: slice=${sliceIndex + 1}/${roots.length} ` +
                `rect=${geometry.left.toFixed(1)},${geometry.top.toFixed(1)},${geometry.width.toFixed(1)}x${geometry.height.toFixed(1)} ` +
                `safe=${geometry.safeTop.toFixed(1)}..${geometry.safeBottom.toFixed(1)} ` +
                `stickyBottom=${geometry.stickyBottom.toFixed(1)}`
              );
              continue;
            }
            const result = await options.deadline.run(
              `${context.action}:${segment.id}:${sliceIndex + 1}`,
              () => californiaSignatureContrastProvider.audit(root, {
                benchId: options.benchId,
                state: `${options.state}:${segment.id}:${sliceIndex + 1}`,
                viewport: options.axis.viewport
              }, { auditCanvases: false })
            );
            segmentResults.push(result);
            auditedResults.push({ result, segmentId: segment.id });
            const unexpectedCanvasEvidence = result.evidence.filter((item) =>
              item.kind.startsWith("canvas-")
            );
            if (unexpectedCanvasEvidence.length > 0) {
              segmentFindingCount += unexpectedCanvasEvidence.length;
              options.issues.push(
                `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
                `contrast-segment-canvas-evidence-unexpected: slice=${sliceIndex + 1}/${roots.length} ` +
                `count=${unexpectedCanvasEvidence.length} ` +
                `kinds=${unexpectedCanvasEvidence.map((item) => item.kind).join(",")}`
              );
            }
            for (const finding of result.findings) {
              options.issues.push(
                `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
                `${finding.kind}: ${finding.detail} label=${JSON.stringify(finding.label)} ` +
                `ratio=${finding.ratio ?? "unsupported"} threshold=${finding.threshold ?? "unsupported"}`
              );
            }
            segmentFindingCount += result.findings.length;
            if (result.candidateLabelCount === 0 || result.auditedLabelCount === 0) {
              segmentFindingCount += 1;
              options.issues.push(
                `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
                `contrast-audit-no-labels: slice=${sliceIndex + 1}/${roots.length} ` +
                `candidate=${result.candidateLabelCount} audited=${result.auditedLabelCount}`
              );
            }
          }
          if (!present && !segment.allowAbsent) {
            segmentFindingCount += 1;
            options.issues.push(
              `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:${segment.id}` })}] ` +
              `contrast-segment-missing: required logical viewport segment has no auditable root`
            );
          }
          const segmentMinRatios = segmentResults
            .map((result) => result.minRatio)
            .filter((ratio): ratio is number => ratio !== null);
          const hardenedMinRatios = segmentResults
            .map((result) => result.hardenedText.minRatio)
            .filter((ratio): ratio is number => ratio !== null);
          segmentReceipts.push({
            auditedLabelCount: segmentResults.reduce((sum, result) => sum + result.auditedLabelCount, 0),
            candidateLabelCount: segmentResults.reduce((sum, result) => sum + result.candidateLabelCount, 0),
            findingCount: segmentFindingCount,
            hardenedTextAuditedCount: segmentResults.reduce(
              (sum, result) => sum + result.hardenedText.auditedTextCount,
              0
            ),
            hardenedTextCandidateCount: segmentResults.reduce(
              (sum, result) => sum + result.hardenedText.candidateTextCount,
              0
            ),
            hardenedTextFindingCount: segmentResults.reduce(
              (sum, result) => sum + result.hardenedText.findingCount,
              0
            ),
            hardenedTextMinRatio: hardenedMinRatios.length > 0 ? Math.min(...hardenedMinRatios) : null,
            id: segment.id,
            minRatio: segmentMinRatios.length > 0 ? Math.min(...segmentMinRatios) : null,
            present,
            sliceCount: segmentResults.length
          });
        }
      } finally {
        const restored = await options.root.evaluate(async (element, original) => {
          const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          window.scrollTo({ behavior: "auto", left: original.x, top: original.y });
          await frame();
          await frame();
          return {
            connected: element.isConnected,
            x: window.scrollX,
            y: window.scrollY
          };
        }, originalScroll);
        if (
          !restored.connected ||
          Math.abs(restored.x - originalScroll.x) > 1 ||
          Math.abs(restored.y - originalScroll.y) > 1
        ) {
          restorationFindingCount = 1;
          options.issues.push(
            `[${formatCaliforniaQaContext({ ...context, action: `${context.action}:scroll-restore` })}] ` +
            `contrast-segment-scroll-restore-failed: ` +
            `${originalScroll.x},${originalScroll.y}->${restored.x},${restored.y}; connected=${restored.connected}`
          );
          const footerReceipt = segmentReceipts.find((receipt) => receipt.id === "footer-reset");
          if (footerReceipt) footerReceipt.findingCount += 1;
        }
      }

      const allResults = auditedResults.map(({ result }) => result);
      const allEvidence = auditedResults.flatMap(({ result, segmentId }) =>
        result.evidence.map((evidence) => ({ evidence, segmentId }))
      );
      const canvasSurfaces = allEvidence.filter(({ evidence }) => evidence.kind === "canvas-surface");
      const webGlCanvasSurfaces = canvasSurfaces.filter(({ evidence }) =>
        evidence.contextKind === "canvas-webgl" || evidence.contextKind === "canvas-webgl2"
      );
      const worstResult = allResults
        .filter((result) => result.minRatio !== null)
        .sort((left, right) => left.minRatio! - right.minRatio!)[0] ?? null;
      const hardenedWorstResult = allResults
        .filter((result) =>
          result.hardenedText.minRatio !== null && result.hardenedText.worstRequiredRatio !== null
        )
        .sort((left, right) =>
          left.hardenedText.minRatio! / left.hardenedText.worstRequiredRatio! -
          right.hardenedText.minRatio! / right.hardenedText.worstRequiredRatio!
        )[0] ?? null;
      const requiredSegmentsPresent = options.segmentPlan.every((segment) =>
        segment.allowAbsent || segmentReceipts.some((receipt) => receipt.id === segment.id && receipt.present)
      );
      const findingCount = segmentReceipts.reduce((sum, receipt) => sum + receipt.findingCount, 0);
      return {
        auditedLabelCount: allResults.reduce((sum, result) => sum + result.auditedLabelCount, 0),
        canvasSurfaceCount: canvasSurfaces.length,
        candidateLabelCount: allResults.reduce((sum, result) => sum + result.candidateLabelCount, 0),
        completed: requiredSegmentsPresent && restorationFindingCount === 0,
        evidenceSha256: createHash("sha256").update(JSON.stringify(allEvidence)).digest("hex"),
        executableCanvasSurfaceCount: canvasSurfaces.filter(({ evidence }) =>
          evidence.hasExecutableContrastProvider === true
        ).length,
        executableWebGlCanvasSurfaceCount: webGlCanvasSurfaces.filter(({ evidence }) =>
          evidence.hasExecutableContrastProvider === true
        ).length,
        findingCount,
        geometryVisibilitySha256: createHash("sha256").update(JSON.stringify(
          auditedResults.map(({ result, segmentId }) => ({
            geometryVisibilitySha256: result.layoutSettleEvidence.geometryVisibilitySha256,
            segmentId
          }))
        )).digest("hex"),
        hardenedTextAlgorithmSha256: allResults[0]?.hardenedText.algorithmSha256 ?? "",
        hardenedTextAuditedCount: allResults.reduce(
          (sum, result) => sum + result.hardenedText.auditedTextCount,
          0
        ),
        hardenedTextCandidateCount: allResults.reduce(
          (sum, result) => sum + result.hardenedText.candidateTextCount,
          0
        ),
        hardenedTextCompleted: allResults.length > 0 && allResults.every((result) => result.hardenedText.completed),
        hardenedTextEvidenceSha256: createHash("sha256").update(JSON.stringify(
          auditedResults.map(({ result, segmentId }) => ({
            evidenceSha256: result.hardenedText.evidenceSha256,
            segmentId
          }))
        )).digest("hex"),
        hardenedTextFindingCount: allResults.reduce(
          (sum, result) => sum + result.hardenedText.findingCount,
          0
        ),
        hardenedTextMinRatio: hardenedWorstResult?.hardenedText.minRatio ?? null,
        hardenedTextWorstLabel: hardenedWorstResult?.hardenedText.worstLabel ?? null,
        hardenedTextWorstRequiredRatio: hardenedWorstResult?.hardenedText.worstRequiredRatio ?? null,
        minRatio: worstResult?.minRatio ?? null,
        segmentReceipts,
        segmentRootCount: segmentRootPartition.length,
        segmentRootPartitionSha256,
        settleReceipt,
        stableRafSnapshots: allResults.length > 0
          ? Math.min(...allResults.map((result) => result.layoutSettleEvidence.stableRafSnapshots))
          : 0,
        state: options.state,
        worstKind: worstResult?.worstKind ?? null,
        worstLabel: worstResult?.worstLabel ?? null,
        webGlCanvasSurfaceCount: webGlCanvasSurfaces.length
      };
    }

    const result = await options.deadline.run(context.action, () =>
      californiaSignatureContrastProvider.audit(options.root, {
        benchId: options.benchId,
        state: options.state,
        viewport: options.axis.viewport
      })
    );
    for (const finding of result.findings) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] ${finding.kind}: ${finding.detail} ` +
        `label=${JSON.stringify(finding.label)} ratio=${finding.ratio ?? "unsupported"} ` +
        `threshold=${finding.threshold ?? "unsupported"}`
      );
    }
    if (result.candidateLabelCount === 0 || result.auditedLabelCount === 0) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] contrast-audit-no-labels: ` +
        `candidate=${result.candidateLabelCount} audited=${result.auditedLabelCount}`
      );
    }
    const canvasSurfaces = result.evidence.filter((item) => item.kind === "canvas-surface");
    const webGlCanvasSurfaces = canvasSurfaces.filter((item) =>
      item.contextKind === "canvas-webgl" || item.contextKind === "canvas-webgl2"
    );
    return {
      auditedLabelCount: result.auditedLabelCount,
      canvasSurfaceCount: canvasSurfaces.length,
      candidateLabelCount: result.candidateLabelCount,
      completed: true,
      evidenceSha256: createHash("sha256").update(JSON.stringify(result.evidence)).digest("hex"),
      executableCanvasSurfaceCount: canvasSurfaces.filter((item) =>
        item.hasExecutableContrastProvider === true
      ).length,
      executableWebGlCanvasSurfaceCount: webGlCanvasSurfaces.filter((item) =>
        item.hasExecutableContrastProvider === true
      ).length,
      findingCount: result.findings.length,
      geometryVisibilitySha256: result.layoutSettleEvidence.geometryVisibilitySha256,
      hardenedTextAlgorithmSha256: result.hardenedText.algorithmSha256,
      hardenedTextAuditedCount: result.hardenedText.auditedTextCount,
      hardenedTextCandidateCount: result.hardenedText.candidateTextCount,
      hardenedTextCompleted: result.hardenedText.completed,
      hardenedTextEvidenceSha256: result.hardenedText.evidenceSha256,
      hardenedTextFindingCount: result.hardenedText.findingCount,
      hardenedTextMinRatio: result.hardenedText.minRatio,
      hardenedTextWorstLabel: result.hardenedText.worstLabel,
      hardenedTextWorstRequiredRatio: result.hardenedText.worstRequiredRatio,
      minRatio: result.minRatio,
      settleReceipt,
      stableRafSnapshots: result.layoutSettleEvidence.stableRafSnapshots,
      state: options.state,
      worstKind: result.worstKind,
      worstLabel: result.worstLabel,
      webGlCanvasSurfaceCount: webGlCanvasSurfaces.length
    };
  } catch (error) {
    const detail = errorDetail(error);
    options.issues.push(`[${formatCaliforniaQaContext(context)}] contrast-audit-error: ${detail}`);
    return {
      auditedLabelCount: 0,
      canvasSurfaceCount: 0,
      candidateLabelCount: 0,
      completed: false,
      evidenceSha256: "",
      executableCanvasSurfaceCount: 0,
      executableWebGlCanvasSurfaceCount: 0,
      findingCount: 1,
      geometryVisibilitySha256: "",
      hardenedTextAlgorithmSha256: "",
      hardenedTextAuditedCount: 0,
      hardenedTextCandidateCount: 0,
      hardenedTextCompleted: false,
      hardenedTextEvidenceSha256: "",
      hardenedTextFindingCount: 1,
      hardenedTextMinRatio: null,
      hardenedTextWorstLabel: null,
      hardenedTextWorstRequiredRatio: null,
      minRatio: null,
      segmentRootCount: 0,
      segmentRootPartitionSha256: "",
      stableRafSnapshots: 0,
      state: options.state,
      worstKind: null,
      worstLabel: null,
      webGlCanvasSurfaceCount: 0
    };
  }
}

type PremiumCanvasClassification = {
  backingHeight: number;
  backingWidth: number;
  cssHeight: number;
  cssWidth: number;
  domIndex: number;
  kind: "2d" | "bitmaprenderer" | "unknown" | "webgl" | "webgl2";
  recorderSignature: string;
  registryVersion: number;
};

type PremiumFrameCapture = {
  compositorHeight: number;
  compositorPixels: Buffer;
  compositorWidth: number;
  evidence: CaliforniaPremiumFrameEvidence;
  pixels: Buffer;
};

const MIN_PREMIUM_FRAME_ENTROPY_BITS = 0.02;
const MIN_PREMIUM_FRAME_FOREGROUND_RATIO = 0.001;
const MIN_PLAYING_MEAN_DIFF_RATIO = 0.001;
const MIN_PLAYING_CHANGED_PIXEL_RATIO = 0.005;
const MAX_RESET_MEAN_DIFF_RATIO = 0.08;
const MAX_RESET_CHANGED_PIXEL_RATIO = 0.4;
const CHANGED_PIXEL_CHANNEL_DELTA = 8;

const PREMIUM_AUTHORING_CONTROL_SELECTOR = [
  "[data-viz-manim-authoring-control]",
  "[data-viz-manim-camera-mode-control]",
  "[data-viz-manim-camera-shot-control]",
  "[data-viz-manim-capture-control]",
  "[data-viz-manim-scene-selector-control]",
  "[data-viz-manim-render-quality-control]",
  "[data-viz-manim-render-quality-transparent-control]",
  "[data-viz-manim-capture-screenshot]",
  "[data-viz-manim-capture-video-plan]",
  "[data-viz-manim-parameter-panel-control]",
  "[data-viz-manim-checkpoint-control]",
  "[data-viz-manim-history-control]",
  "[data-viz-manim-run-from-beat]",
  "[data-viz-manim-show-final]"
].join(",");

async function appendPremiumLearnerPresentationFindings(options: {
  axis: CaliforniaQaAxis;
  deadline: CaliforniaVisitDeadline;
  issues: string[];
  labId: string;
  panel: Locator;
  record: CaliforniaQaCoverageRecord;
  routeKind: CaliforniaQaContext["routeKind"];
}) {
  const context: CaliforniaQaContext = {
    action: "premium-learner-presentation-gate",
    axis: options.axis,
    benchId: "premium-3d",
    labId: options.labId,
    routeKind: options.routeKind
  };
  const presentationRoot = options.panel.locator('[data-viz-manim-presentation="learner"]').first();
  await options.deadline.run(context.action, async () => {
    await expect(presentationRoot).toBeVisible({
      timeout: options.deadline.remainingTimeout("premium-learner-presentation-root")
    });
    const visibleAuthoringControls = await options.panel.locator(PREMIUM_AUTHORING_CONTROL_SELECTOR).evaluateAll(
      (elements) => elements.flatMap((element) => {
        const target = element as HTMLElement;
        const style = getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        const visible = !target.hidden && target.getAttribute("aria-hidden") !== "true" &&
          style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 &&
          rect.width > 0 && rect.height > 0;
        if (!visible) return [];
        return [Array.from(target.attributes)
          .find((attribute) => attribute.name.startsWith("data-viz-manim-"))?.name ?? target.tagName.toLowerCase()];
      })
    );
    if (visibleAuthoringControls.length > 0) {
      throw new Error(`student-visible-authoring-controls: ${visibleAuthoringControls.join(", ")}`);
    }
  });
  options.record.auditEvidence ??= [];
  options.record.auditEvidence.push("premium-presentation:learner:visible-authoring-controls=0");
}

async function appendPremiumCanvasEvidence(options: {
  axis: CaliforniaQaAxis;
  contrastRoot: Locator;
  deadline: CaliforniaVisitDeadline;
  issues: string[];
  labId: string;
  playbackState: Locator;
  record: CaliforniaQaCoverageRecord;
  reference?: PremiumFrameCapture;
  root: Locator;
  routeKind: CaliforniaQaContext["routeKind"];
  state: "default" | "playing" | "reset";
  testInfo: TestInfo;
}) {
  const context: CaliforniaQaContext = {
    action: `premium-canvas-gate:${options.state}`,
    axis: options.axis,
    benchId: "premium-3d",
    labId: options.labId,
    routeKind: options.routeKind
  };
  const expectedPlaybackState = options.state === "playing" ? "playing" : "paused";
  const playbackStateBeforeCapture = await options.deadline.run(
    `premium-${options.state}-state-before-capture`,
    async () => {
      await expect(options.playbackState).toHaveAttribute(
        "data-viz-manim-playback-state",
        expectedPlaybackState,
        { timeout: options.deadline.remainingTimeout(`premium-${options.state}-state-before-capture`) }
      );
      return expectedPlaybackState;
    }
  );
  const overlayAuditValue = options.state;
  type PremiumCanvasSnapshot = PremiumCanvasClassification & {
    handle: ElementHandle<HTMLCanvasElement>;
  };
  const snapshots = await options.deadline.run(context.action, async () => {
    const handles = await options.root.locator("canvas").elementHandles();
    const classified: PremiumCanvasSnapshot[] = [];
    try {
      for (let domIndex = 0; domIndex < handles.length; domIndex += 1) {
        const untypedHandle = handles[domIndex];
        const isCanvas = await untypedHandle.evaluate((element) => element instanceof HTMLCanvasElement);
        if (!isCanvas) throw new Error(`premium-canvas-handle-type-drift:dom-index=${domIndex}`);
        const handle = untypedHandle as ElementHandle<HTMLCanvasElement>;
        const snapshot = await handle.evaluate((canvas, auditValue): Omit<PremiumCanvasClassification, "domIndex"> | null => {
          type ContextKind = PremiumCanvasClassification["kind"];
          type AuditApi = {
            contextKindFor(target: HTMLCanvasElement): ContextKind;
            signature(root: HTMLElement): { signature: string };
            version: number;
          };
          const audit = (window as Window & { __californiaCanvasTextAudit?: AuditApi }).__californiaCanvasTextAudit;
          canvas.removeAttribute("data-ca-viz-premium-2d-audit");
          const rect = canvas.getBoundingClientRect();
          let current: Element | null = canvas;
          let visible = canvas.isConnected && rect.width > 0 && rect.height > 0;
          while (visible && current) {
            const style = getComputedStyle(current);
            visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
            current = current.parentElement;
          }
          if (!visible) return null;
          const kind = audit?.version === 4 ? audit.contextKindFor(canvas) : "unknown";
          if (kind === "2d") canvas.setAttribute("data-ca-viz-premium-2d-audit", auditValue);
          return {
            backingHeight: canvas.height,
            backingWidth: canvas.width,
            cssHeight: rect.height,
            cssWidth: rect.width,
            kind,
            recorderSignature: audit?.version === 4 ? audit.signature(canvas).signature : "recorder-unavailable",
            registryVersion: audit?.version ?? 0
          };
        }, overlayAuditValue);
        if (snapshot) classified.push({ ...snapshot, domIndex, handle });
        else await handle.dispose();
      }
    } catch (error) {
      await Promise.allSettled(handles.map((handle) => handle.dispose()));
      throw error;
    }
    return classified;
  });

  try {
  type PremiumWebGlCanvasSnapshot = PremiumCanvasSnapshot & { kind: "webgl" | "webgl2" };
  const webglCanvases = snapshots.filter(
    (snapshot): snapshot is PremiumWebGlCanvasSnapshot =>
      snapshot.kind === "webgl" || snapshot.kind === "webgl2"
  );
  const overlayCanvases = snapshots.filter((snapshot) => snapshot.kind === "2d");
  const unsupportedCanvases = snapshots.filter((snapshot) =>
    snapshot.kind === "unknown" || snapshot.kind === "bitmaprenderer"
  );
  options.record.auditEvidence ??= [];
  options.record.auditEvidence.push(
    `premium-canvas:${options.state}:visible=${snapshots.length}:webgl=${webglCanvases.length}:` +
    `2d-overlay=${overlayCanvases.length}:unsupported=${unsupportedCanvases.length}:registry-v4=` +
    `${snapshots.every((snapshot) => snapshot.registryVersion === 4)}`
  );

  if (snapshots.length === 0) {
    options.issues.push(`[${formatCaliforniaQaContext(context)}] premium-canvas-missing: no visible canvas`);
  }
  if (webglCanvases.length === 0) {
    options.issues.push(
      `[${formatCaliforniaQaContext(context)}] premium-webgl-canvas-missing: ` +
      `${overlayCanvases.length} visible 2D overlay canvas(es), ${unsupportedCanvases.length} unsupported canvas(es)`
    );
  }
  if (webglCanvases.length > 1) {
    options.issues.push(
      `[${formatCaliforniaQaContext(context)}] premium-webgl-canvas-ambiguous: ` +
      `${webglCanvases.map((canvas) => `dom-index=${canvas.domIndex}:${canvas.kind}`).join(", ")}`
    );
  }
  if (unsupportedCanvases.length > 0) {
    options.issues.push(
      `[${formatCaliforniaQaContext(context)}] premium-canvas-unclassified: ` +
      `${unsupportedCanvases.map((canvas) => `dom-index=${canvas.domIndex}:${canvas.kind}`).join(", ")}`
    );
  }

  const screenshotAction = `premium-surface-screenshot:${options.state}`;
  const screenshot = await options.deadline.run(screenshotAction, () => options.root.screenshot({
    animations: "disabled",
    timeout: options.deadline.remainingTimeout(screenshotAction),
    type: "png"
  }));
  const screenshotName = [
    "california-premium-surface",
    safeArtifactSegment(options.axis.id),
    safeArtifactSegment(options.labId),
    options.state
  ].join("-");

  const primaryCanvas = webglCanvases[0];
  let frameCapture: PremiumFrameCapture | null = null;
  let webGlContrastEvidence: CaliforniaPremiumWebGlContrastEvidence | null = null;
  if (primaryCanvas) {
    if (
      primaryCanvas.backingWidth <= 0 || primaryCanvas.backingHeight <= 0 ||
      primaryCanvas.cssWidth <= 0 || primaryCanvas.cssHeight <= 0
    ) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] premium-webgl-buffer-empty: ` +
        `backing=${primaryCanvas.backingWidth}x${primaryCanvas.backingHeight} ` +
        `css=${primaryCanvas.cssWidth.toFixed(1)}x${primaryCanvas.cssHeight.toFixed(1)}`
      );
    }

    const registration = await options.deadline.run(
      `premium-webgl-fixed-handle-capture:${options.state}`,
      () => captureAndRegisterCaliforniaPremiumWebGlContrastEvidence({
        canvas: primaryCanvas.handle,
        labId: options.labId,
        stateKey: options.state
      })
    );
    const contrastGate = await appendContrastFindings({
      axis: options.axis,
      benchId: "premium-3d",
      deadline: options.deadline,
      issues: options.issues,
      labId: options.labId,
      root: options.contrastRoot,
      routeKind: options.routeKind,
      state: options.state
    });
    options.record.evidence.contrastGates.push(contrastGate);
    if (
      !contrastGate.completed ||
      contrastGate.webGlCanvasSurfaceCount !== 1 ||
      contrastGate.executableWebGlCanvasSurfaceCount !== 1
    ) {
      throw new Error(
        `premium-webgl-one-shot-consumption:${options.state}:` +
        `completed=${contrastGate.completed}:webgl=${contrastGate.webGlCanvasSurfaceCount}:` +
        `executable=${contrastGate.executableWebGlCanvasSurfaceCount}`
      );
    }
    const retainedWebGlIssues = auditCaliforniaPremiumWebGlRetainedContrastEvidence(
      registration.evidence,
      {
        enforceFreshness: true,
        expectedStateKey: options.state,
        nowMs: Date.now()
      }
    );
    if (retainedWebGlIssues.length > 0) {
      throw new Error(
        `premium-webgl-retained-evidence:${options.state}:${retainedWebGlIssues.join("|")}`
      );
    }
    const framePng = registration.bitmapPng;
    const compositorPng = registration.compositorPng;
    const playbackStateAfterCapture = await options.deadline.run(
      `premium-${options.state}-state-after-capture`,
      async () => {
        await expect(options.playbackState).toHaveAttribute(
          "data-viz-manim-playback-state",
          expectedPlaybackState,
          { timeout: options.deadline.remainingTimeout(`premium-${options.state}-state-after-capture`) }
        );
        return expectedPlaybackState;
      }
    );
    const frameAttachmentName = [
      "california-premium-webgl",
      safeArtifactSegment(options.axis.id),
      safeArtifactSegment(options.labId),
      options.state
    ].join("-");
    await options.deadline.run(`premium-webgl-attachment:${options.state}`, () => options.testInfo.attach(frameAttachmentName, {
      body: framePng,
      contentType: "image/png"
    }));
    const compositorAttachmentName = `${frameAttachmentName}-page-compositor`;
    await options.deadline.run(
      `premium-webgl-compositor-attachment:${options.state}`,
      () => options.testInfo.attach(compositorAttachmentName, {
        body: compositorPng,
        contentType: "image/png"
      })
    );

    const analyzed = await options.deadline.run(`premium-webgl-sharp:${options.state}`, async () => {
      const { data, info } = await sharp(framePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (info.channels !== 4) {
        throw new Error(`premium-webgl-sharp-channels:${options.state}:${info.channels}!=4`);
      }
      const pixelCount = info.width * info.height;
      const expectedRgbaByteLength = pixelCount * 4;
      if (data.length !== expectedRgbaByteLength) {
        throw new Error(
          `premium-webgl-sharp-byte-length:${options.state}:${data.length}!=${expectedRgbaByteLength}`
        );
      }
      const histogram = new Map<number, number>();
      let opaquePixelCount = 0;
      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const alpha = data[index + 3];
        const bucket = (red >> 4) << 8 | (green >> 4) << 4 | (blue >> 4);
        histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
        if (alpha > 8) opaquePixelCount += 1;
      }
      let entropyBits = 0;
      let dominantPixelCount = 0;
      for (const count of histogram.values()) {
        const probability = count / pixelCount;
        entropyBits -= probability * Math.log2(probability);
        dominantPixelCount = Math.max(dominantPixelCount, count);
      }
      return {
        entropyBits,
        foregroundRatio: pixelCount > 0 ? 1 - dominantPixelCount / pixelCount : 0,
        height: info.height,
        opaquePixelRatio: pixelCount > 0 ? opaquePixelCount / pixelCount : 0,
        pixelCount,
        pixels: Buffer.from(data),
        sha256: createHash("sha256").update(data).digest("hex"),
        width: info.width
      };
    });
    const bitmapPngSha256 = createHash("sha256").update(framePng).digest("hex");
    if (
      framePng.length !== registration.evidence.bitmapPngByteLength ||
      bitmapPngSha256 !== registration.evidence.bitmapPngSha256
    ) {
      throw new Error(
        `premium-webgl-bitmap-png-identity:${options.state}:` +
        `${framePng.length}/${bitmapPngSha256}!=` +
        `${registration.evidence.bitmapPngByteLength}/${registration.evidence.bitmapPngSha256}`
      );
    }
    if (
      analyzed.width !== registration.evidence.bitmapWidth ||
      analyzed.height !== registration.evidence.bitmapHeight ||
      analyzed.sha256 !== registration.evidence.bitmapRgbaSha256
    ) {
      throw new Error(
        `premium-webgl-bitmap-rgba-identity:${options.state}:` +
        `${analyzed.width}x${analyzed.height}/${analyzed.sha256}!=` +
        `${registration.evidence.bitmapWidth}x${registration.evidence.bitmapHeight}/` +
        registration.evidence.bitmapRgbaSha256
      );
    }
    const screenshotRgbaSha256 = createHash("sha256")
      .update(registration.screenshot.data)
      .digest("hex");
    if (
      registration.screenshot.width !== analyzed.width ||
      registration.screenshot.height !== analyzed.height ||
      registration.screenshot.data.length !== analyzed.pixels.length ||
      screenshotRgbaSha256 !== analyzed.sha256
    ) {
      throw new Error(
        `premium-webgl-decoded-rgba-chain:${options.state}:` +
        `${registration.screenshot.width}x${registration.screenshot.height}/` +
        `${registration.screenshot.data.length}/${screenshotRgbaSha256}!=` +
        `${analyzed.width}x${analyzed.height}/${analyzed.pixels.length}/${analyzed.sha256}`
      );
    }
    const compositorAnalyzed = await options.deadline.run(
      `premium-webgl-compositor-sharp:${options.state}`,
      async () => {
        const { data, info } = await sharp(compositorPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (info.channels !== 4) {
          throw new Error(`premium-webgl-compositor-sharp-channels:${options.state}:${info.channels}!=4`);
        }
        const expectedRgbaByteLength = info.width * info.height * 4;
        if (data.length !== expectedRgbaByteLength) {
          throw new Error(
            `premium-webgl-compositor-sharp-byte-length:${options.state}:` +
            `${data.length}!=${expectedRgbaByteLength}`
          );
        }
        return {
          height: info.height,
          pixels: Buffer.from(data),
          rgbaSha256: createHash("sha256").update(data).digest("hex"),
          width: info.width
        };
      }
    );
    const compositorPngSha256 = createHash("sha256").update(compositorPng).digest("hex");
    if (
      compositorPng.length !== registration.evidence.compositorPngByteLength ||
      compositorPngSha256 !== registration.evidence.compositorPngSha256
    ) {
      throw new Error(
        `premium-webgl-compositor-png-identity:${options.state}:` +
        `${compositorPng.length}/${compositorPngSha256}!=` +
        `${registration.evidence.compositorPngByteLength}/${registration.evidence.compositorPngSha256}`
      );
    }
    if (
      compositorAnalyzed.width !== registration.evidence.compositorWidth ||
      compositorAnalyzed.height !== registration.evidence.compositorHeight ||
      compositorAnalyzed.rgbaSha256 !== registration.evidence.compositorRgbaSha256
    ) {
      throw new Error(
        `premium-webgl-compositor-rgba-identity:${options.state}:` +
        `${compositorAnalyzed.width}x${compositorAnalyzed.height}/${compositorAnalyzed.rgbaSha256}!=` +
        `${registration.evidence.compositorWidth}x${registration.evidence.compositorHeight}/` +
        registration.evidence.compositorRgbaSha256
      );
    }
    const compositorScreenshotRgbaSha256 = createHash("sha256")
      .update(registration.compositorScreenshot.data)
      .digest("hex");
    if (
      registration.compositorScreenshot.width !== compositorAnalyzed.width ||
      registration.compositorScreenshot.height !== compositorAnalyzed.height ||
      registration.compositorScreenshot.data.length !== compositorAnalyzed.pixels.length ||
      compositorScreenshotRgbaSha256 !== compositorAnalyzed.rgbaSha256
    ) {
      throw new Error(
        `premium-webgl-compositor-decoded-rgba-chain:${options.state}:` +
        `${registration.compositorScreenshot.width}x${registration.compositorScreenshot.height}/` +
        `${registration.compositorScreenshot.data.length}/${compositorScreenshotRgbaSha256}!=` +
        `${compositorAnalyzed.width}x${compositorAnalyzed.height}/` +
        `${compositorAnalyzed.pixels.length}/${compositorAnalyzed.rgbaSha256}`
      );
    }
    if (
      registration.compositorTerminal.issues.length > 0 ||
      registration.compositorTerminal.targetEvidence.length === 0 ||
      registration.compositorTerminal.targetEvidence.some((target) => !target.passed) ||
      registration.compositorTerminal.targetEvidence !== registration.evidence.compositorTargetEvidence
    ) {
      throw new Error(
        `premium-webgl-compositor-terminal:${options.state}: executable compositor evidence is incomplete`
      );
    }
    let compositorDifferenceFromDefault = { changedPixelRatio: 0, meanAbsoluteDiffRatio: 0 };
    if (options.reference) {
      if (options.reference.compositorWidth !== compositorAnalyzed.width ||
          options.reference.compositorHeight !== compositorAnalyzed.height ||
          options.reference.compositorPixels.length !== compositorAnalyzed.pixels.length) {
        throw new Error(`premium-webgl-compositor-reference-size-drift:${options.state}`);
      }
      compositorDifferenceFromDefault = californiaPremiumWebGlPixelDifference(
        options.reference.compositorPixels,
        compositorAnalyzed.pixels,
        compositorAnalyzed.width,
        compositorAnalyzed.height
      );
    }
    if (options.state === "playing") {
      if (registration.playingCompositorPngs.length !== 2 ||
          registration.evidence.playingCompositorSamples.length !== 2) {
        throw new Error("premium-webgl-playing-compositor-two-samples-required");
      }
      const firstSample = registration.evidence.playingCompositorSamples[0];
      firstSample.compositorChangedPixelRatioFromPrevious =
        compositorDifferenceFromDefault.changedPixelRatio;
      firstSample.compositorMeanAbsoluteDiffRatioFromPrevious =
        compositorDifferenceFromDefault.meanAbsoluteDiffRatio;
      for (let index = 0; index < registration.playingCompositorPngs.length; index += 1) {
        const samplePng = registration.playingCompositorPngs[index];
        const sample = registration.evidence.playingCompositorSamples[index];
        const decodedSample = await sharp(samplePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const sampleRgbaSha256 = createHash("sha256").update(decodedSample.data).digest("hex");
        const samplePngSha256 = createHash("sha256").update(samplePng).digest("hex");
        if (decodedSample.info.width !== sample.width || decodedSample.info.height !== sample.height ||
            sampleRgbaSha256 !== sample.compositorRgbaSha256 ||
            samplePngSha256 !== sample.compositorPngSha256 || samplePng.length !== sample.compositorPngByteLength) {
          throw new Error(`premium-webgl-playing-compositor-sample-chain:${index}`);
        }
        await options.deadline.run(
          `premium-webgl-playing-compositor-sample-attachment:${index}`,
          () => options.testInfo.attach(`${compositorAttachmentName}-playing-sample-${index + 1}`, {
            body: samplePng,
            contentType: "image/png"
          })
        );
      }
    } else if (registration.playingCompositorPngs.length !== 0 ||
        registration.evidence.playingCompositorSamples.length !== 0) {
      throw new Error(`premium-webgl-playing-compositor-samples-on-${options.state}`);
    }
    if (options.state === "reset") {
      registration.evidence.compositorResetDifference = compositorDifferenceFromDefault;
    }
    options.record.auditEvidence.push(
      `premium-webgl-compositor:${options.state}:attachment=${compositorAttachmentName}:` +
      `clip=${registration.evidence.compositorClip.x},${registration.evidence.compositorClip.y},` +
      `${registration.evidence.compositorClip.width}x${registration.evidence.compositorClip.height}:` +
      `png=${registration.evidence.compositorPngSha256}:rgba=${registration.evidence.compositorRgbaSha256}:` +
      `binding=${registration.evidence.compositorBindingSha256}:` +
      `objects=${registration.evidence.compositorRenderedObjectCount}/` +
      `${registration.evidence.compositorSceneObjectCount}:` +
      `targets=${registration.evidence.compositorTargetEvidence.length}:` +
      `topology=${registration.evidence.compositorSceneTopologyDigest}`
    );

    let changedPixelRatioFromDefault = 0;
    let meanAbsoluteDiffRatioFromDefault = 0;
    if (options.reference) {
      if (
        options.reference.evidence.width !== analyzed.width ||
        options.reference.evidence.height !== analyzed.height ||
        options.reference.pixels.length !== analyzed.pixels.length
      ) {
        options.issues.push(
          `[${formatCaliforniaQaContext(context)}] premium-webgl-frame-size-drift: ` +
          `default=${options.reference.evidence.width}x${options.reference.evidence.height} ` +
          `${options.state}=${analyzed.width}x${analyzed.height}`
        );
      } else {
        let absoluteDelta = 0;
        let changedPixels = 0;
        for (let index = 0; index < analyzed.pixels.length; index += 4) {
          const redDelta = Math.abs(analyzed.pixels[index] - options.reference.pixels[index]);
          const greenDelta = Math.abs(analyzed.pixels[index + 1] - options.reference.pixels[index + 1]);
          const blueDelta = Math.abs(analyzed.pixels[index + 2] - options.reference.pixels[index + 2]);
          absoluteDelta += redDelta + greenDelta + blueDelta;
          if (Math.max(redDelta, greenDelta, blueDelta) >= CHANGED_PIXEL_CHANNEL_DELTA) changedPixels += 1;
        }
        meanAbsoluteDiffRatioFromDefault = absoluteDelta / (analyzed.pixelCount * 3 * 255);
        changedPixelRatioFromDefault = changedPixels / analyzed.pixelCount;
      }
    }

    const evidence = {
      attachmentName: frameAttachmentName,
      changedPixelRatioFromDefault,
      contextKind: primaryCanvas.kind,
      entropyBits: analyzed.entropyBits,
      foregroundRatio: analyzed.foregroundRatio,
      height: analyzed.height,
      meanAbsoluteDiffRatioFromDefault,
      opaquePixelRatio: analyzed.opaquePixelRatio,
      playbackStateAfterCapture,
      playbackStateBeforeCapture,
      pixelCount: analyzed.pixelCount,
      recorderSignature: primaryCanvas.recorderSignature,
      sha256: analyzed.sha256,
      state: options.state,
      width: analyzed.width
    } satisfies CaliforniaPremiumFrameEvidence;
    frameCapture = {
      compositorHeight: compositorAnalyzed.height,
      compositorPixels: compositorAnalyzed.pixels,
      compositorWidth: compositorAnalyzed.width,
      evidence,
      pixels: analyzed.pixels
    };
    options.record.auditEvidence.push(
      `premium-webgl-frame:${options.state}:context=${evidence.contextKind}:size=${evidence.width}x${evidence.height}:` +
      `sha256=${evidence.sha256}:entropy=${evidence.entropyBits.toFixed(4)}:` +
      `foreground=${evidence.foregroundRatio.toFixed(6)}:opaque=${evidence.opaquePixelRatio.toFixed(6)}:` +
      `mean-diff=${evidence.meanAbsoluteDiffRatioFromDefault.toFixed(6)}:` +
      `changed-pixels=${evidence.changedPixelRatioFromDefault.toFixed(6)}`
    );
    if (
      evidence.entropyBits <= MIN_PREMIUM_FRAME_ENTROPY_BITS ||
      evidence.foregroundRatio <= MIN_PREMIUM_FRAME_FOREGROUND_RATIO ||
      evidence.opaquePixelRatio <= 0
    ) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] premium-webgl-frame-empty-or-uniform: ` +
        `entropy=${evidence.entropyBits.toFixed(4)} foreground=${evidence.foregroundRatio.toFixed(6)} ` +
        `opaque=${evidence.opaquePixelRatio.toFixed(6)}`
      );
    }
    if (
      options.state === "playing" &&
      evidence.meanAbsoluteDiffRatioFromDefault < MIN_PLAYING_MEAN_DIFF_RATIO &&
      evidence.changedPixelRatioFromDefault < MIN_PLAYING_CHANGED_PIXEL_RATIO
    ) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] premium-webgl-playing-frame-static: ` +
        `mean-diff=${evidence.meanAbsoluteDiffRatioFromDefault.toFixed(6)} ` +
        `changed-pixels=${evidence.changedPixelRatioFromDefault.toFixed(6)}`
      );
    }
    if (
      options.state === "reset" &&
      (evidence.meanAbsoluteDiffRatioFromDefault > MAX_RESET_MEAN_DIFF_RATIO ||
        evidence.changedPixelRatioFromDefault > MAX_RESET_CHANGED_PIXEL_RATIO)
    ) {
      options.issues.push(
        `[${formatCaliforniaQaContext(context)}] premium-webgl-reset-frame-drift: ` +
        `mean-diff=${evidence.meanAbsoluteDiffRatioFromDefault.toFixed(6)} ` +
        `changed-pixels=${evidence.changedPixelRatioFromDefault.toFixed(6)}`
      );
    }

    if (
      registration.evidence.terminalIssues.length > 0 ||
      registration.evidence.targetEvidence.length === 0 ||
      registration.evidence.targetEvidence.some((target) => !target.passed) ||
      registration.evidence.compositorIssues.length > 0 ||
      registration.evidence.compositorTargetContract.length === 0 ||
      registration.evidence.compositorTargetEvidence.length === 0 ||
      registration.evidence.compositorTargetEvidence.some((target) => !target.passed) ||
      registration.evidence.sceneObjectCount <= 0 ||
      registration.evidence.renderedObjectCount <= 0 ||
      registration.evidence.compositorSceneObjectCount <= 0 ||
      registration.evidence.compositorRenderedObjectCount <= 0 ||
      !/^[a-f0-9]{64}$/.test(registration.evidence.cameraProjectionDigest) ||
      !/^[a-f0-9]{64}$/.test(registration.evidence.sceneTopologyDigest) ||
      !/^[a-f0-9]{64}$/.test(registration.evidence.compositorCameraProjectionDigest) ||
      !/^[a-f0-9]{64}$/.test(registration.evidence.compositorSceneTopologyDigest) ||
      !/^[a-f0-9]{64}$/.test(registration.evidence.compositorBindingSha256)
    ) {
      throw new Error(`premium-webgl-contrast-provider:${options.state}: executable evidence is incomplete`);
    }
    const providerStateKey = registration.evidence.stateKey;
    if (providerStateKey !== options.state) {
      throw new Error(
        `premium-webgl-contrast-provider:${options.state}: provider state key drifted to ` +
        `${providerStateKey || "missing"}`
      );
    }
    const providerPlaybackState = registration.evidence.playbackState;
    if (providerPlaybackState !== expectedPlaybackState) {
      throw new Error(
        `premium-webgl-contrast-provider:${options.state}: provider playback state drifted to ` +
        `${providerPlaybackState ?? "missing"}`
      );
    }
    webGlContrastEvidence = {
      ...registration.evidence,
      playbackState: providerPlaybackState,
      state: options.state,
      stateKey: providerStateKey
    };
  }

  for (const canvas of overlayCanvases) {
    options.record.auditEvidence.push(
      `premium-2d-overlay:${options.state}:dom-index=${canvas.domIndex}:canvas-text-audit`
    );
  }
  if (overlayCanvases.length > 0) {
    await appendCanvasTextFindings({
      axis: options.axis,
      benchId: "premium-3d",
      canvasSelector: `canvas[data-ca-viz-premium-2d-audit="${overlayAuditValue}"]`,
      deadline: options.deadline,
      issues: options.issues,
      labId: options.labId,
      root: options.root,
      routeKind: options.routeKind,
      state: `premium-overlay-${options.state}`
    });
  }

  await options.deadline.run(`premium-surface-attachment:${options.state}`, () => options.testInfo.attach(screenshotName, {
    body: screenshot,
    contentType: "image/png"
  }));
  options.record.auditEvidence.push(`premium-surface-screenshot:${options.state}:${screenshotName}`);
  return {
    frameCapture,
    surfaceScreenshot: {
      attachmentName: screenshotName,
      state: options.state
    },
    webGlContrastEvidence
  };
  } finally {
    await Promise.allSettled(snapshots.map((snapshot) => snapshot.handle.dispose()));
  }
}

async function runDirectoryPackage(options: {
  axis: CaliforniaQaAxis;
  canvasGraphicsRuntimeRunId: string;
  coverage: CaliforniaQaCoverageRecord[];
  diagnostics: CaliforniaBrowserDiagnostics;
  issues: string[];
  page: Page;
  student: RegisteredCaliforniaStudent;
  workItem: CaliforniaDirectoryPackage;
}) {
  const {
    axis,
    canvasGraphicsRuntimeRunId,
    coverage,
    diagnostics,
    issues,
    page,
    student,
    workItem
  } = options;
  let hydrationVerified = false;

  for (const lab of workItem.labs) {
    const benchIds = [lab.assignment.primary, ...(lab.assignment.related ?? [])];
    let routeSession: Awaited<ReturnType<typeof openCaliforniaDirectoryLab>> | null = null;
    for (const benchId of benchIds) {
      const record = coverageRecordFor({ axis, benchId, coverage, labId: lab.labId, routeKind: workItem.kind });
      record.attempted = true;
      record.auditEvidence ??= [];
      const visitStartedAt = Date.now();
      const deadline = new CaliforniaVisitDeadline(page, visitStartedAt, config.expectTimeoutMs);
      const visitKind = benchId === lab.assignment.primary ? "primary" : "related";
      let uxReadyRecorded = false;
      let uxStartedAt: number | null = null;
      const issueMark = issues.length;
      try {
        if (!routeSession) {
          const routeContext: CaliforniaQaContext = {
            action: "open-directory-lab",
            axis,
            benchId,
            labId: lab.labId,
            routeKind: workItem.kind
          };
          const activePanel: { current: Awaited<ReturnType<typeof openCaliforniaDirectoryLab>> | null } = { current: null };
          if (visitKind === "primary") uxStartedAt = Date.now();
          await runVisitCaliforniaQaAction({
            context: routeContext,
            deadline,
            diagnostics,
            evidence: record.auditEvidence,
            issues,
            page,
            action: async () => {
              activePanel.current = await openCaliforniaDirectoryLab(
                page,
                lab,
                () => deadline.remainingTimeout("open-directory-lab")
              );
              await deadline.run("disable-qa-motion", () => disableQaMotion(page));
              if (!hydrationVerified) {
                await expectCaliforniaAuthHydrated(
                  page,
                  student,
                  axis,
                  () => deadline.remainingTimeout("verify-auth-hydration")
                );
                hydrationVerified = true;
              }
            }
          });
          routeSession = activePanel.current;
        }

        if (!routeSession) {
          if (issues.length === issueMark) {
            issues.push(
              `[${formatCaliforniaQaContext({
                action: "open-directory-lab",
                axis,
                benchId,
                labId: lab.labId,
                routeKind: workItem.kind
              })}] route-unavailable: no interactive workspace was returned`
            );
          }
          continue;
        }

        const { panel, switcher } = routeSession;
        const benchContext: CaliforniaQaContext = {
          action: "open-signature-bench",
          axis,
          benchId,
          labId: lab.labId,
          routeKind: workItem.kind
        };
        const activeBench: { current: Awaited<ReturnType<typeof openSignatureBench>> | null } = { current: null };
        if (uxStartedAt === null) uxStartedAt = Date.now();
        await runVisitCaliforniaQaAction({
          context: benchContext,
          deadline,
          diagnostics,
          evidence: record.auditEvidence,
          issues,
          page,
          action: async () => {
            activeBench.current = await openSignatureBench(
              panel,
              switcher,
              benchId,
              () => deadline.remainingTimeout("open-signature-bench")
            );
          }
        });
        if (!activeBench.current) {
          if (issues.length === issueMark) {
            issues.push(`[${formatCaliforniaQaContext(benchContext)}] bench-unavailable: no interactive canvas was returned`);
          }
          continue;
        }

        appendUxReadyEvidence({
          axis,
          benchId,
          issues,
          labId: lab.labId,
          record,
          routeKind: workItem.kind,
          startedAt: uxStartedAt,
          visitKind
        });
        uxReadyRecorded = true;

        const { signatureLab } = activeBench.current;
        const signatureGraphicsSurface = signatureLab.locator(
          '[data-viz-surface-kind="signature-canvas"]'
        );
        await expect(
          signatureGraphicsSurface,
          `${benchId} must expose exactly one exact-root signature Canvas surface`
        ).toHaveCount(1, { timeout: deadline.remainingTimeout("signature-canvas-exact-root") });
        const visualizationCard = panel.locator("[data-viz-card]").first();
        const defaultSettleReceipt = await deadline.run(
          "directory-state-settle:default",
          () => settleCaliforniaDirectoryAuditState({
            card: visualizationCard,
            deadline,
            diagnostics,
            interactionExpected: visitKind === "related",
            page,
            state: "default"
          })
        );
        record.evidence.canvasGraphicsGates.push(await deadline.run(
          "canvas-graphics-one-shot:default",
          () => runCaliforniaCanvasGraphicsOneShotGate({
            benchId,
            contrastProvider: californiaSignatureContrastProvider,
            graphicsSurface: signatureGraphicsSurface,
            runtimeRunId: canvasGraphicsRuntimeRunId,
            state: "default",
            viewport: axis.viewport
          })
        ));
        record.evidence.uiGates.push(await appendUiFindingsWithinDeadline({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          state: "default"
        }));
        record.evidence.canvasGates.push(await appendCanvasTextFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: signatureLab,
          routeKind: workItem.kind,
          state: "default"
        }));
        const defaultContrastSegmentPlan = await deadline.run(
          "contrast-segment-plan:default",
          () => buildCaliforniaSignatureContrastSegmentPlan({ panel, signatureLab, switcher })
        );
        record.evidence.contrastGates.push(await appendContrastFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          segmentPlan: defaultContrastSegmentPlan,
          settledReceipt: defaultSettleReceipt,
          state: "default"
        }));

        const defaultSignatureState = await deadline.run(
          "capture-signature-default-state",
          () => captureSignatureBenchDefaultState(
            signatureLab,
            () => deadline.remainingTimeout("capture-signature-default-state")
          )
        );

        await runVisitCaliforniaQaAction({
          context: { ...benchContext, action: "control-smoke" },
          deadline,
          diagnostics,
          evidence: record.auditEvidence,
          issues,
          page,
          action: async () => {
            record.evidence.signatureControl = await smokeSignatureBenchControl(
              signatureLab,
              () => deadline.remainingTimeout("control-smoke"),
              { defaultState: defaultSignatureState, structured: true }
            );
          }
        });
        const afterControlSettleReceipt = await deadline.run(
          "directory-state-settle:after-control",
          () => settleCaliforniaDirectoryAuditState({
            card: visualizationCard,
            deadline,
            diagnostics,
            interactionExpected: true,
            page,
            state: "after-control"
          })
        );
        record.evidence.canvasGraphicsGates.push(await deadline.run(
          "canvas-graphics-one-shot:after-control",
          () => runCaliforniaCanvasGraphicsOneShotGate({
            benchId,
            contrastProvider: californiaSignatureContrastProvider,
            graphicsSurface: signatureGraphicsSurface,
            runtimeRunId: canvasGraphicsRuntimeRunId,
            state: "after-control",
            viewport: axis.viewport
          })
        ));
        record.evidence.uiGates.push(await appendUiFindingsWithinDeadline({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          state: "after-control"
        }));
        record.evidence.canvasGates.push(await appendCanvasTextFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: signatureLab,
          routeKind: workItem.kind,
          state: "after-control"
        }));
        const afterControlContrastSegmentPlan = await deadline.run(
          "contrast-segment-plan:after-control",
          () => buildCaliforniaSignatureContrastSegmentPlan({ panel, signatureLab, switcher })
        );
        record.evidence.contrastGates.push(await appendContrastFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          segmentPlan: afterControlContrastSegmentPlan,
          settledReceipt: afterControlSettleReceipt,
          state: "after-control"
        }));

        await runVisitCaliforniaQaAction({
          context: { ...benchContext, action: "reset-model" },
          deadline,
          diagnostics,
          evidence: record.auditEvidence,
          issues,
          page,
          action: async () => {
            const resetEvidence = await resetSignatureBench(
              page,
              signatureLab,
              switcher,
              benchId,
              () => deadline.remainingTimeout("reset-model"),
              defaultSignatureState
            );
            record.evidence.reset = resetEvidence;
            if (record.evidence.signatureControl && !record.evidence.signatureControl.restored) {
              expect(
                resetEvidence.defaultModelFingerprint === resetEvidence.restoredModelFingerprint &&
                resetEvidence.defaultControlFingerprint === resetEvidence.restoredControlFingerprint,
                "reset-backed control restoration requires measured default model and control equality"
              ).toBe(true);
              record.evidence.signatureControl.restored = resetEvidence.restoredDefault;
              record.evidence.signatureControl.restoration = "reset";
            }
          }
        });
        const afterResetSettleReceipt = await deadline.run(
          "directory-state-settle:after-reset",
          () => settleCaliforniaDirectoryAuditState({
            card: visualizationCard,
            deadline,
            diagnostics,
            interactionExpected: true,
            page,
            state: "after-reset"
          })
        );
        record.evidence.canvasGraphicsGates.push(await deadline.run(
          "canvas-graphics-one-shot:after-reset",
          () => runCaliforniaCanvasGraphicsOneShotGate({
            benchId,
            contrastProvider: californiaSignatureContrastProvider,
            graphicsSurface: signatureGraphicsSurface,
            runtimeRunId: canvasGraphicsRuntimeRunId,
            state: "after-reset",
            viewport: axis.viewport
          })
        ));
        record.evidence.uiGates.push(await appendUiFindingsWithinDeadline({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          state: "after-reset"
        }));
        record.evidence.canvasGates.push(await appendCanvasTextFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: signatureLab,
          routeKind: workItem.kind,
          state: "after-reset"
        }));
        const afterResetContrastSegmentPlan = await deadline.run(
          "contrast-segment-plan:after-reset",
          () => buildCaliforniaSignatureContrastSegmentPlan({ panel, signatureLab, switcher })
        );
        record.evidence.contrastGates.push(await appendContrastFindings({
          axis,
          benchId,
          deadline,
          issues,
          labId: lab.labId,
          root: panel,
          routeKind: workItem.kind,
          segmentPlan: afterResetContrastSegmentPlan,
          settledReceipt: afterResetSettleReceipt,
          state: "after-reset"
        }));
      } catch (error) {
        issues.push(
          `[${formatCaliforniaQaContext({
            action: "unexpected-visit-error",
            axis,
            benchId,
            labId: lab.labId,
            routeKind: workItem.kind
          })}] action-error: ${errorDetail(error)}`
        );
      } finally {
        if (uxStartedAt !== null && !uxReadyRecorded) {
          appendUxNotReadyBudgetFinding({
            axis,
            benchId,
            issues,
            labId: lab.labId,
            record,
            routeKind: workItem.kind,
            startedAt: uxStartedAt,
            visitKind
          });
        }
        await appendCaliforniaDiagnosticFindings({
          context: {
            action: "visit-final-diagnostic-drain",
            axis,
            benchId,
            labId: lab.labId,
            routeKind: workItem.kind
          },
          diagnostics,
          issues
        });
        record.durationMs = Date.now() - visitStartedAt;
        if (record.durationMs > config.expectTimeoutMs) {
          issues.push(
            `[${formatCaliforniaQaContext({
              action: "visit-recovery-window",
              axis,
              benchId,
              labId: lab.labId,
              routeKind: workItem.kind
            })}] visit-recovery-deadline-exceeded: ${record.durationMs}ms > ${config.expectTimeoutMs}ms`
          );
        }
        const visitIssues = issues.slice(issueMark);
        record.auditEvidence ??= [];
        record.auditEvidence.push(
          `recovery-window:${record.durationMs}ms:deadline=${config.expectTimeoutMs}ms`
        );
        record.status = visitIssues.length === 0 ? "passed" : "failed";
        if (visitIssues.length > 0) {
          record.detail = compactIssueDetail(visitIssues);
          routeSession = null;
        }
      }
    }
  }
}

async function runPremiumPackage(options: {
  axis: CaliforniaQaAxis;
  coverage: CaliforniaQaCoverageRecord[];
  diagnostics: CaliforniaBrowserDiagnostics;
  issues: string[];
  page: Page;
  student: RegisteredCaliforniaStudent;
  testInfo: TestInfo;
  workItem: CaliforniaPremiumPackage;
}) {
  const { axis, coverage, diagnostics, issues, page, student, testInfo, workItem } = options;
  let hydrationVerified = false;

  for (const lab of workItem.labs) {
    const record = coverageRecordFor({
      axis,
      benchId: "premium-3d",
      coverage,
      labId: lab.labId,
      routeKind: workItem.kind
    });
    record.attempted = true;
    record.auditEvidence ??= [];
    const visitStartedAt = Date.now();
    const deadline = new CaliforniaVisitDeadline(page, visitStartedAt, config.expectTimeoutMs);
    const uxStartedAt = Date.now();
    let uxReadyRecorded = false;
    const issueMark = issues.length;
    const context: CaliforniaQaContext = {
      action: "open-premium-direct",
      axis,
      benchId: "premium-3d",
      labId: lab.labId,
      routeKind: workItem.kind
    };
    try {
      const activePanel: { current: Awaited<ReturnType<typeof openCaliforniaPremiumDirectLab>> | null } = { current: null };
      await runVisitCaliforniaQaAction({
        context,
        deadline,
        diagnostics,
        evidence: record.auditEvidence,
        issues,
        page,
        action: async () => {
          activePanel.current = await openCaliforniaPremiumDirectLab(
            page,
            lab,
            () => deadline.remainingTimeout("open-premium-direct")
          );
          await deadline.run("disable-qa-motion", () => disableQaMotion(page));
          if (!hydrationVerified) {
            await expectCaliforniaAuthHydrated(
              page,
              student,
              axis,
              () => deadline.remainingTimeout("verify-auth-hydration")
            );
            hydrationVerified = true;
          }
        }
      });
      if (!activePanel.current) {
        if (issues.length === issueMark) {
          issues.push(`[${formatCaliforniaQaContext(context)}] route-unavailable: no interactive premium canvas was returned`);
        }
        continue;
      }

      const { panel, surface } = activePanel.current;
      const premiumPlaybackState = panel.locator("[data-viz-manim-playback-state]").first();
      await appendPremiumLearnerPresentationFindings({
        axis,
        deadline,
        issues,
        labId: lab.labId,
        panel,
        record,
        routeKind: workItem.kind
      });
      const defaultVisualEvidence = await appendPremiumCanvasEvidence({
        axis,
        contrastRoot: panel,
        deadline,
        issues,
        labId: lab.labId,
        playbackState: premiumPlaybackState,
        record,
        root: surface,
        routeKind: workItem.kind,
        state: "default",
        testInfo
      });
      if (!defaultVisualEvidence.frameCapture || !defaultVisualEvidence.webGlContrastEvidence) {
        throw new Error("premium-default-webgl-frame-or-contrast-evidence-unavailable");
      }
      appendUxReadyEvidence({
        axis,
        benchId: "premium-3d",
        issues,
        labId: lab.labId,
        record,
        routeKind: workItem.kind,
        startedAt: uxStartedAt,
        visitKind: "premium"
      });
      uxReadyRecorded = true;

      record.evidence.uiGates.push(await appendUiFindingsWithinDeadline({
        axis,
        benchId: "premium-3d",
        deadline,
        issues,
        labId: lab.labId,
        root: panel,
        routeKind: workItem.kind,
        state: "default"
      }));
      const premiumAudit: {
        control?: Awaited<ReturnType<typeof smokePremiumDirectControls>>;
        playing?: Awaited<ReturnType<typeof appendPremiumCanvasEvidence>>;
        reset?: Awaited<ReturnType<typeof appendPremiumCanvasEvidence>>;
      } = {};
      await runVisitCaliforniaQaAction({
        context: { ...context, action: "premium-control-smoke-reset" },
        deadline,
        diagnostics,
        evidence: record.auditEvidence,
        issues,
        page,
        action: async () => {
          premiumAudit.control = await smokePremiumDirectControls(
            panel,
            () => deadline.remainingTimeout("premium-control-smoke-reset"),
            {
              structured: true,
              onPlaying: async () => {
                premiumAudit.playing = await appendPremiumCanvasEvidence({
                  axis,
                  contrastRoot: panel,
                  deadline,
                  issues,
                  labId: lab.labId,
                  playbackState: premiumPlaybackState,
                  record,
                  reference: defaultVisualEvidence.frameCapture!,
                  root: surface,
                  routeKind: workItem.kind,
                  state: "playing",
                  testInfo
                });
              },
              onReset: async () => {
                premiumAudit.reset = await appendPremiumCanvasEvidence({
                  axis,
                  contrastRoot: panel,
                  deadline,
                  issues,
                  labId: lab.labId,
                  playbackState: premiumPlaybackState,
                  record,
                  reference: defaultVisualEvidence.frameCapture!,
                  root: surface,
                  routeKind: workItem.kind,
                  state: "reset",
                  testInfo
                });
              }
            }
          );
        }
      });
      if (
        !premiumAudit.control ||
        !premiumAudit.playing?.frameCapture ||
        !premiumAudit.playing.webGlContrastEvidence ||
        !premiumAudit.reset?.frameCapture ||
        !premiumAudit.reset.webGlContrastEvidence
      ) {
        throw new Error("premium-structured-control-frame-or-contrast-evidence-unavailable");
      }
      const webGlStateSequence = [
        defaultVisualEvidence.webGlContrastEvidence,
        premiumAudit.playing.webGlContrastEvidence,
        premiumAudit.reset.webGlContrastEvidence
      ];
      const playingCompositorSamples = premiumAudit.playing.webGlContrastEvidence.playingCompositorSamples;
      if (playingCompositorSamples.length !== 2 || playingCompositorSamples.some((sample) =>
        sample.compositorChangedPixelRatioFromPrevious === null ||
        sample.compositorMeanAbsoluteDiffRatioFromPrevious === null ||
        (sample.compositorChangedPixelRatioFromPrevious < MIN_PLAYING_CHANGED_PIXEL_RATIO &&
          sample.compositorMeanAbsoluteDiffRatioFromPrevious < MIN_PLAYING_MEAN_DIFF_RATIO)
      )) {
        throw new Error("premium-playing-final-compositor-sequence-static-or-incomplete");
      }
      const compositorResetDifference = premiumAudit.reset.webGlContrastEvidence.compositorResetDifference;
      if (!compositorResetDifference || compositorResetDifference.changedPixelRatio !== 0 ||
          compositorResetDifference.meanAbsoluteDiffRatio !== 0) {
        throw new Error("premium-reset-final-compositor-did-not-canonically-restore-default");
      }
      const webGlStateSequenceIssues = auditCaliforniaPremiumWebGlStateSequence(webGlStateSequence);
      if (webGlStateSequenceIssues.length > 0) {
        throw new Error(`premium-webgl-state-sequence:${webGlStateSequenceIssues.join("|")}`);
      }
      record.evidence.premium = {
        control: premiumAudit.control,
        frames: [
          defaultVisualEvidence.frameCapture.evidence,
          premiumAudit.playing.frameCapture.evidence,
          premiumAudit.reset.frameCapture.evidence
        ],
        surfaceScreenshots: [
          defaultVisualEvidence.surfaceScreenshot,
          premiumAudit.playing.surfaceScreenshot,
          premiumAudit.reset.surfaceScreenshot
        ],
        webGlContrast: [
          defaultVisualEvidence.webGlContrastEvidence,
          premiumAudit.playing.webGlContrastEvidence,
          premiumAudit.reset.webGlContrastEvidence
        ]
      };
      record.evidence.uiGates.push(await appendUiFindingsWithinDeadline({
        axis,
        benchId: "premium-3d",
        deadline,
        issues,
        labId: lab.labId,
        root: panel,
        routeKind: workItem.kind,
        state: "after-control-reset"
      }));
    } catch (error) {
      issues.push(
        `[${formatCaliforniaQaContext({ ...context, action: "unexpected-visit-error" })}] ` +
        `action-error: ${errorDetail(error)}`
      );
    } finally {
      if (!uxReadyRecorded) {
        appendUxNotReadyBudgetFinding({
          axis,
          benchId: "premium-3d",
          issues,
          labId: lab.labId,
          record,
          routeKind: workItem.kind,
          startedAt: uxStartedAt,
          visitKind: "premium"
        });
      }
      await appendCaliforniaDiagnosticFindings({
        context: { ...context, action: "visit-final-diagnostic-drain" },
        diagnostics,
        issues
      });
      record.durationMs = Date.now() - visitStartedAt;
      if (record.durationMs > config.expectTimeoutMs) {
        issues.push(
          `[${formatCaliforniaQaContext({ ...context, action: "visit-recovery-window" })}] ` +
          `visit-recovery-deadline-exceeded: ${record.durationMs}ms > ${config.expectTimeoutMs}ms`
        );
      }
      const visitIssues = issues.slice(issueMark);
      record.auditEvidence ??= [];
      record.auditEvidence.push(
        `recovery-window:${record.durationMs}ms:deadline=${config.expectTimeoutMs}ms`
      );
      record.status = visitIssues.length === 0 ? "passed" : "failed";
      if (visitIssues.length > 0) record.detail = compactIssueDetail(visitIssues);
    }
  }
}

function appendCoverageContractIssues(options: {
  axes: CaliforniaQaAxis[];
  coverage: CaliforniaQaCoverageRecord[];
  issues: string[];
  workItem: CaliforniaDirectoryPackage | CaliforniaPremiumPackage;
}) {
  const expectedCoverageCount = options.workItem.visitCount * options.axes.length;
  const coverageKeys = options.coverage.map((record) =>
    `${record.axisId}:${record.routeKind}:${record.labId}:${record.benchId}`
  );
  if (options.coverage.length !== expectedCoverageCount) {
    options.issues.push(
      `[coverage package=${options.workItem.id}] expected ${expectedCoverageCount} records, ` +
      `received ${options.coverage.length}`
    );
  }
  if (new Set(coverageKeys).size !== coverageKeys.length) {
    options.issues.push(`[coverage package=${options.workItem.id}] duplicate axis/route/lab/bench records detected`);
  }
  const unattempted = options.coverage.filter((record) => !record.attempted || record.status === "pending");
  if (unattempted.length > 0) {
    options.issues.push(
      `[coverage package=${options.workItem.id}] ${unattempted.length}/${expectedCoverageCount} planned visits were not attempted`
    );
  }
  const failedCoverage = options.coverage.filter((record) => record.status === "failed");
  if (failedCoverage.length > 0 && options.issues.length === 0) {
    options.issues.push(
      `[coverage package=${options.workItem.id}] ${failedCoverage.length} attempted visits failed without issue detail`
    );
  }
  return { expectedCoverageCount, unattempted };
}

test.describe("California Visualization Labs durable QA", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  test.beforeEach(async ({ page }) => {
    await installCaliforniaVisualizationUiAuditInit(page);
  });

  test("viewport-segment contrast and explored-state settle contract canary", async ({ page }) => {
    const canaryOrigin = "http://california-viz-segment-canary.test";
    await page.route(`${canaryOrigin}/canary`, async (route) => route.fulfill({
      body: `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <style>
              * { box-sizing: border-box; }
              html, body { margin: 0; background: #fff; color: #111; font: 16px Arial, sans-serif; }
              #sticky { position: fixed; inset: 0 0 auto; z-index: 50; height: 64px; background: #fff; color: #111; }
              #panel { padding-top: 72px; }
              .segment { width: min(520px, calc(100vw - 24px)); min-height: 120px; margin: 0 auto; padding: 20px; background: #fff; color: #111; }
              .spacer { height: 920px; }
            </style>
          </head>
          <body>
            <header id="sticky">Persistent navigation</header>
            <main id="panel">
              <section id="shell-header" class="segment"><h1>Lab shell</h1></section>
              <div class="spacer" aria-hidden="true"></div>
              <nav id="tabs" class="segment"><button type="button">Active lab tab</button></nav>
              <div class="spacer" aria-hidden="true"></div>
              <section id="signature-header-stage" class="segment"><h2>Signature stage</h2><p>Exact visual model</p></section>
              <div class="spacer" aria-hidden="true"></div>
              <section id="controls-lesson" class="segment"><h2>Controls and lesson</h2><button id="engage" type="button">Change model</button></section>
              <div class="spacer" aria-hidden="true"></div>
              <footer id="footer-reset" class="segment"><button type="button">Reset model</button></footer>
            </main>
            <section data-viz-card data-viz-explore-gate="awaiting-interaction" data-viz-save-state="idle" hidden></section>
            <script>
              document.querySelector('#engage').addEventListener('click', () => {
                const card = document.querySelector('[data-viz-card]');
                card.dataset.vizExploreGate = 'dwell';
                card.dataset.vizSaveState = 'saving';
                setTimeout(() => { card.dataset.vizExploreGate = 'engaged'; }, 900);
                fetch('/api/visualization-sessions', { method: 'POST', body: '{}' })
                  .then(() => { card.dataset.vizSaveState = 'saved'; });
              });
            </script>
          </body>
        </html>`,
      contentType: "text/html",
      status: 200
    }));
    await page.route(`${canaryOrigin}/api/visualization-sessions`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({ body: "{}", contentType: "application/json", status: 200 });
    });
    const diagnostics = new CaliforniaBrowserDiagnostics(page, canaryOrigin);
    test.info().annotations.push({ type: "browser", description: "real Chrome viewport-segment canary" });
    try {
      await page.goto(`${canaryOrigin}/canary`, { waitUntil: "domcontentloaded" });
      await page.locator("#engage").click();
      const originalScrollY = await page.evaluate(() => window.scrollY);
      const issues: string[] = [];
      const deadline = new CaliforniaVisitDeadline(page, Date.now(), config.expectTimeoutMs);
      const panel = page.locator("#panel");
      const canaryViewport = viewportForPage(page);
      const gate = await appendContrastFindings({
        axis: {
          id: `${canaryViewport}-en-light`,
          language: "en",
          locale: "en",
          theme: "light",
          viewport: canaryViewport
        },
        benchId: "segment-canary",
        deadline,
        issues,
        labId: "segment-canary",
        root: panel,
        routeKind: "directory",
        segmentPlan: [
          { id: "shell-header", roots: [page.locator("#shell-header")] },
          { id: "tabs", roots: [page.locator("#tabs")] },
          { id: "active-signature-header-stage", roots: [page.locator("#signature-header-stage")] },
          { id: "controls-lesson", roots: [page.locator("#controls-lesson")] },
          { id: "footer-reset", roots: [page.locator("#footer-reset")] }
        ],
        settle: {
          card: page.locator("[data-viz-card]"),
          diagnostics,
          interactionExpected: true
        },
        state: "after-control"
      } as Parameters<typeof appendContrastFindings>[0]);
      const structured = gate as typeof gate & {
        segmentReceipts: Array<{
          auditedLabelCount: number;
          candidateLabelCount: number;
          findingCount: number;
          id: string;
          minRatio: number | null;
          present: boolean;
        }>;
        settleReceipt: {
          exploreGate: string;
          initialExploreGate: string;
          initialSaveState: string;
          interactionExpected: boolean;
          pendingRequestCount: number;
          quiescent: boolean;
          saveState: string;
          waitedMs: number;
        };
        segmentRootCount: number;
        segmentRootPartitionSha256: string;
      };

      expect(issues).toEqual([]);
      expect(structured.segmentReceipts.map((receipt) => receipt.id)).toEqual([
        "shell-header",
        "tabs",
        "active-signature-header-stage",
        "controls-lesson",
        "footer-reset"
      ]);
      for (const receipt of structured.segmentReceipts) {
        expect(receipt.present, `${receipt.id} must be present`).toBe(true);
        expect(receipt.candidateLabelCount, `${receipt.id} must discover candidates`).toBeGreaterThan(0);
        expect(receipt.auditedLabelCount, `${receipt.id} must audit candidates`).toBeGreaterThan(0);
        expect(receipt.minRatio, `${receipt.id} must retain an exact ratio`).not.toBeNull();
        expect(receipt.findingCount, `${receipt.id} must retain zero findings`).toBe(0);
      }
      expect(structured.settleReceipt).toMatchObject({
        exploreGate: "engaged",
        initialExploreGate: "dwell",
        initialSaveState: "saving",
        interactionExpected: true,
        pendingRequestCount: 0,
        quiescent: true,
        saveState: "saved"
      });
      expect(structured.settleReceipt.waitedMs).toBeGreaterThanOrEqual(700);
      expect(structured.segmentRootCount).toBe(5);
      expect(structured.segmentRootPartitionSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(structured.segmentReceipts.reduce(
        (sum, receipt) => sum + receipt.candidateLabelCount,
        0
      )).toBe(structured.candidateLabelCount);
      expect(structured.segmentReceipts.reduce(
        (sum, receipt) => sum + receipt.auditedLabelCount,
        0
      )).toBe(structured.auditedLabelCount);
      expect(
        await page.evaluate(() => window.scrollY),
        "segment audit must restore the exact pre-audit page scroll"
      ).toBe(originalScrollY);
    } finally {
      diagnostics.dispose();
    }
  });

  test("viewport-segment contrast scope fails closed for missing, oversized, unknown, and nested roots", async ({ page }) => {
    await page.setContent(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <style>
            html, body { margin: 0; background: #fff; color: #111; font: 16px Arial, sans-serif; }
            #panel { padding: 12px; }
            #oversized { width: min(320px, calc(100vw - 24px)); height: calc(100vh + 200px); background:#fff; color:#111; }
            #unknown { width: min(320px, calc(100vw - 24px)); min-height: 100px; background-image:linear-gradient(90deg,#fff,#000); color:#111; }
            #parent, #child { background:#fff; color:#111; padding:16px; }
          </style>
        </head>
        <body>
          <main id="panel">
            <section id="oversized">Oversized learner text</section>
            <section id="unknown">Unknown gradient backdrop</section>
            <section id="parent">Parent learner text<div id="child">Nested learner text</div></section>
          </main>
        </body>
      </html>`);
    const viewport = viewportForPage(page);
    const axis: CaliforniaQaAxis = {
      id: `${viewport}-en-light`,
      language: "en",
      locale: "en",
      theme: "light",
      viewport
    };
    const panel = page.locator("#panel");
    const runCase = async (segmentPlan: readonly CaliforniaContrastSegmentPlanEntry[]) => {
      const issues: string[] = [];
      const gate = await appendContrastFindings({
        axis,
        benchId: "segment-fail-closed-canary",
        deadline: new CaliforniaVisitDeadline(page, Date.now(), config.expectTimeoutMs),
        issues,
        labId: "segment-fail-closed-canary",
        root: panel,
        routeKind: "directory",
        segmentPlan,
        state: "canary"
      });
      return { gate, issues };
    };

    const missing = await runCase([{ id: "shell-header", roots: [] }]);
    expect(missing.gate.completed).toBe(false);
    expect(missing.gate.findingCount).toBeGreaterThan(0);
    expect(missing.issues.join("\n")).toContain("contrast-segment-missing");

    const oversized = await runCase([{ id: "active-signature-header-stage", roots: [page.locator("#oversized")] }]);
    expect(oversized.gate.completed).toBe(true);
    expect(oversized.gate.findingCount).toBeGreaterThan(0);
    expect(oversized.issues.join("\n")).toContain("contrast-segment-not-fully-visible");

    const unknown = await runCase([{ id: "controls-lesson", roots: [page.locator("#unknown")] }]);
    expect(unknown.gate.findingCount).toBeGreaterThan(0);
    expect(unknown.issues.join("\n")).toMatch(/contrast-unsupported|background image\/gradient/);

    const nested = await runCase([
      { id: "active-signature-header-stage", roots: [page.locator("#parent")] },
      { id: "controls-lesson", roots: [page.locator("#child")] }
    ]);
    expect(nested.gate.completed).toBe(false);
    expect(nested.gate.findingCount).toBeGreaterThan(0);
    expect(nested.issues.join("\n")).toContain("contrast-segment-root-overlap");
  });

  test("inventory contract: 76 routes and data-derived visits, benches, and premium direct routes", () => {
    const dataDerivedBenchIds = californiaVisualizationQaInventory.labs.flatMap((lab) => [
      lab.assignment.primary,
      ...(lab.assignment.related ?? [])
    ]);
    expect(californiaVisualizationQaInventory.routeCount).toBe(76);
    expect(californiaVisualizationQaInventory.visitCount).toBe(dataDerivedBenchIds.length);
    expect(californiaVisualizationQaInventory.uniqueBenchCount).toBe(new Set(dataDerivedBenchIds).size);
    expect(californiaVisualizationQaInventory.premiumLabs.length).toBeGreaterThan(0);
    expect(new Set(californiaVisualizationQaInventory.premiumLabs.map((lab) => lab.labId)).size)
      .toBe(californiaVisualizationQaInventory.premiumLabs.length);
  });

  for (const workItem of workItems) {
    test(`${workItem.id} (${workItem.labs.length} labs / ${workItem.visitCount} visits)`, async ({ page, baseURL }, testInfo) => {
      const projectEvidence = await captureCaliforniaFormalProjectEvidence(page, testInfo);
      const projectViewport = projectEvidence.viewportClass;
      const axes = config.axes.filter((axis) => axis.viewport === projectViewport);
      expect(
        axes.length,
        `No configured California Visualization QA axis targets the ${projectViewport} project; ` +
        "run the matching Playwright project instead of skipping coverage."
      ).toBeGreaterThan(0);
      const packageTimeout = packageTimeoutMs(axes, workItem);
      test.setTimeout(packageTimeout);
      const issues: string[] = [];
      const coverage = buildCoverageRecords(axes, workItem);
      let canvasGraphicsRuntimeRunId: string | null = null;
      const terminalQuiescenceByAxis: Array<{
        axisId: string;
        diagnosticCount: number;
        pendingRequestCount: number;
        quiescent: boolean;
        waitedMs: number;
      }> = [];
      let runError: unknown;
      let coverageSummary: ReturnType<typeof appendCoverageContractIssues> | null = null;

      try {
        await installCaliforniaCanvasTextAudit(page);
        if (workItem.kind === "directory") {
          canvasGraphicsRuntimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId();
          await installCaliforniaCanvasGraphicsRuntime(page, {
            benchIds: Array.from(new Set(workItem.labs.flatMap((lab) => [
              lab.assignment.primary,
              ...(lab.assignment.related ?? [])
            ]))),
            runtimeRunId: canvasGraphicsRuntimeRunId!
          });
        }
        await installCaliforniaPremiumWebGlContrastProvider(page);
        for (const axis of axes) {
          const firstLab = workItem.labs[0];
          const authContext: CaliforniaQaContext = {
            action: "register-login-verify-session",
            axis,
            benchId: "auth",
            labId: firstLab?.labId ?? "inventory",
            routeKind: workItem.kind
          };
          let student: RegisteredCaliforniaStudent;
          let recoveredAuthFailure: string | null = null;
          try {
            student = await registerCaliforniaVisualizationStudent(page, testInfo, workItem.grade, axis);
          } catch (error) {
            const detail = errorDetail(error);
            issues.push(`[${formatCaliforniaQaContext(authContext)}] action-error: ${detail}`);
            recoveredAuthFailure = detail;
            try {
              student = await registerCaliforniaVisualizationStudent(page, testInfo, workItem.grade, axis);
            } catch (recoveryError) {
              issues.push(
                `[${formatCaliforniaQaContext({ ...authContext, action: "register-login-recovery" })}] ` +
                `action-error: ${errorDetail(recoveryError)}`
              );
              for (const record of coverage.filter((candidate) => candidate.axisId === axis.id)) {
                record.detail = "authentication/session setup failed before this planned visit";
              }
              continue;
            }
          }

          const diagnostics = new CaliforniaBrowserDiagnostics(
            page,
            baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3020"
          );
          try {
            if (workItem.kind === "directory") {
              await runDirectoryPackage({
                axis,
                canvasGraphicsRuntimeRunId: canvasGraphicsRuntimeRunId!,
                coverage,
                diagnostics,
                issues,
                page,
                student,
                workItem
              });
            } else {
              await runPremiumPackage({ axis, coverage, diagnostics, issues, page, student, testInfo, workItem });
            }
          } finally {
            const diagnosticIssueMark = issues.length;
            let terminalEvidence: string[] = [];
            try {
              const terminal = await diagnostics.awaitTerminalQuiescence({
                quietWindowMs: TERMINAL_DIAGNOSTIC_QUIET_WINDOW_MS,
                timeout: CALIFORNIA_TERMINAL_DIAGNOSTIC_TIMEOUT_MS
              });
              terminalEvidence = [
                `terminal-quiescence:quiescent=${terminal.quiescent}:waited=${terminal.waitedMs}ms:` +
                `pending=${terminal.pendingRequests.length}`
              ];
              for (const diagnostic of terminal.diagnostics) {
                issues.push(
                  `[${formatCaliforniaQaContext({ ...authContext, action: "axis-terminal-quiescence" })}] ` +
                  `${diagnostic.kind}: ${diagnostic.detail}`
                );
              }
              if (!terminal.quiescent) {
                issues.push(
                  `[${formatCaliforniaQaContext({ ...authContext, action: "axis-terminal-quiescence" })}] ` +
                  `terminal-network-not-quiescent: ${terminal.pendingRequests.join(", ") || "unknown pending request"}`
                );
              }
              const finalDrain = await appendCaliforniaDiagnosticFindings({
                context: { ...authContext, action: "axis-final-diagnostic-drain" },
                diagnostics,
                issues
              });
              terminalQuiescenceByAxis.push({
                axisId: axis.id,
                diagnosticCount: terminal.diagnostics.length + finalDrain.reportedCount,
                pendingRequestCount: terminal.pendingRequests.length,
                quiescent: terminal.quiescent,
                waitedMs: terminal.waitedMs
              });
            } catch (error) {
              issues.push(
                `[${formatCaliforniaQaContext({ ...authContext, action: "axis-terminal-quiescence" })}] ` +
                `terminal-diagnostic-error: ${errorDetail(error)}`
              );
              terminalQuiescenceByAxis.push({
                axisId: axis.id,
                diagnosticCount: 1,
                pendingRequestCount: 1,
                quiescent: false,
                waitedMs: 0
              });
            } finally {
              diagnostics.dispose();
            }
            if (issues.length > diagnosticIssueMark) {
              const lastAttempted = [...coverage].reverse().find((record) =>
                record.axisId === axis.id && record.attempted
              );
              if (lastAttempted) {
                lastAttempted.status = "failed";
                lastAttempted.detail = compactIssueDetail([
                  lastAttempted.detail ?? "",
                  ...issues.slice(diagnosticIssueMark)
                ].filter(Boolean));
              }
            }
            const lastAttempted = [...coverage].reverse().find((record) =>
              record.axisId === axis.id && record.attempted
            );
            lastAttempted?.auditEvidence?.push(...terminalEvidence);
          }
          if (recoveredAuthFailure) {
            for (const record of coverage.filter((candidate) => candidate.axisId === axis.id && candidate.attempted)) {
              record.status = "failed";
              record.detail = (
                `authentication recovered after a first-attempt failure: ${recoveredAuthFailure}` +
                `${record.detail ? ` | ${record.detail}` : ""}`
              ).slice(0, 1_200);
            }
          }
        }
      } catch (error) {
        runError = error;
        issues.push(`[package=${workItem.id}] unhandled-package-error: ${errorDetail(error)}`);
      } finally {
        const finalizedCoverageSummary = appendCoverageContractIssues({ axes, coverage, issues, workItem });
        coverageSummary = finalizedCoverageSummary;
        const coverageArtifact = {
          axes: axes.map((axis) => axis.id),
          budgets: {
            packageTimeoutMs: packageTimeout,
            recoveryDeadlineMs: config.expectTimeoutMs,
            uxReadyMs: config.uxBudgetMs
          },
          createdAt: new Date().toISOString(),
          expected: finalizedCoverageSummary.expectedCoverageCount,
          execution: {
            repeatEachIndex: testInfo.repeatEachIndex,
            retry: testInfo.retry
          },
          project: testInfo.project.name,
          projectEvidence,
          provenance: coverageProvenance,
          records: coverage,
          schemaVersion: 5,
          selection: {
            grades: Array.from(config.grades).sort(),
            includePremiumDirect: config.includePremiumDirect,
            labIds: Array.from(config.labIds).sort(),
            shard: config.shard
          },
          summary: {
            attempted: coverage.filter((record) => record.attempted).length,
            failed: coverage.filter((record) => record.status === "failed").length,
            passed: coverage.filter((record) => record.status === "passed").length,
            pending: coverage.filter((record) => record.status === "pending").length,
            unattempted: finalizedCoverageSummary.unattempted.length
          },
          terminalQuiescenceByAxis,
          workItem: {
            id: workItem.id,
            kind: workItem.kind,
            visitCount: workItem.visitCount
          }
        };
        const coverageBody = Buffer.from(JSON.stringify(coverageArtifact, null, 2), "utf8");
        const attachments = [testInfo.attach("california-visualization-qa-coverage", {
          body: coverageBody,
          contentType: "application/json"
        })];
        if (issues.length > 0) {
          attachments.push(testInfo.attach("california-visualization-qa-failures", {
            body: Buffer.from(issues.join("\n"), "utf8"),
            contentType: "text/plain"
          }));
        }
        let attachmentsDurable = true;
        try {
          await Promise.all(attachments);
        } catch (error) {
          attachmentsDurable = false;
          issues.push(`[package=${workItem.id}] coverage-attachment-error: ${errorDetail(error)}`);
        }
        const finalCoveragePayload: CaliforniaVisualizationCoveragePassedPayload = {
          ...coverageArtifact,
          attachmentsDurable,
          packageIssues: [...issues]
        };
        if (coverageLifecycle) {
          try {
            if (runError || issues.length > 0) {
              await persistCaliforniaVisualizationCoverageDiagnostic({
                error: runError ?? new Error(issues.join(" | ") || "California coverage package failed"),
                expectedMatrix: coverageLifecycle.expectedMatrix,
                ledgerRoot: coverageLifecycle.ledgerRoot,
                packageId: workItem.id,
                partialPayload: finalCoveragePayload,
                projectName: testInfo.project.name,
                provenance: coverageLifecycle.provenance,
                repeatEachIndex: testInfo.repeatEachIndex,
                retry: testInfo.retry
              });
            } else {
              await persistCaliforniaVisualizationCoveragePassedArtifact({
                errors: [],
                expectedMatrix: coverageLifecycle.expectedMatrix,
                ledgerRoot: coverageLifecycle.ledgerRoot,
                packageId: workItem.id,
                payload: finalCoveragePayload,
                projectName: testInfo.project.name,
                provenance: coverageLifecycle.provenance,
                repeatEachIndex: testInfo.repeatEachIndex,
                retry: testInfo.retry,
                validatePayload(payload) {
                  if (payload.records.length !== finalizedCoverageSummary.expectedCoverageCount) {
                    throw new Error(
                      `${workItem.id}: lifecycle payload record count drifted from the planned package`
                    );
                  }
                }
              });
            }
          } catch (error) {
            issues.push(`[package=${workItem.id}] coverage-lifecycle-write-error: ${errorDetail(error)}`);
            try {
              await persistCaliforniaVisualizationCoverageDiagnostic({
                error,
                expectedMatrix: coverageLifecycle.expectedMatrix,
                ledgerRoot: coverageLifecycle.ledgerRoot,
                packageId: workItem.id,
                partialPayload: {
                  ...finalCoveragePayload,
                  packageIssues: [...issues]
                },
                projectName: testInfo.project.name,
                provenance: coverageLifecycle.provenance,
                repeatEachIndex: testInfo.repeatEachIndex,
                retry: testInfo.retry
              });
            } catch (diagnosticError) {
              issues.push(
                `[package=${workItem.id}] coverage-lifecycle-diagnostic-write-error: ` +
                errorDetail(diagnosticError)
              );
            }
          }
        }
      }

      if (runError) throw runError;
      expect(issues, `California Visualization QA failures:\n${issues.join("\n")}`).toEqual([]);
    });
  }
});
