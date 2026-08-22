import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import type { GradeId, Language, ThemeMode } from "../../types";
import {
  CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
  resolveCaliforniaSignatureNumericEndpoints,
  type CaliforniaSignatureBenchControlBlueprint,
  type CaliforniaSignatureControlKind,
  type CaliforniaSignatureControlSite,
  type CaliforniaSignatureResolvedNumericEndpoints,
  type CaliforniaSignatureRuntimeEndpoint,
  type CaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE
} from "./california-signature-qa-instrumentation";
import {
  CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
  californiaSignatureSourceEvidenceOracleRowKey,
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceEvidenceOracleCombinationActivation,
  type CaliforniaSignatureSourceEvidenceOracleCanvasSurface,
  type CaliforniaSignatureSourceEvidenceOraclePhase,
  type CaliforniaSignatureSourceEvidenceOracleRow,
  type CaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  collectCaliforniaCanvasTextFindings,
  installCaliforniaCanvasTextAudit
} from "./california-canvas-text-audit";
import {
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import { resolveCaliforniaSignatureFrozenSourceRoot } from
  "./california-signature-frozen-source-root";
import {
  assertCaliforniaCanvasGraphicsAggregateCoverage,
  assertCaliforniaCanvasGraphicsContrastConsumeAck,
  assertCaliforniaCanvasGraphicsStateEvidence,
  collectCaliforniaCanvasGraphicsStateEvidence,
  consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence,
  installCaliforniaCanvasGraphicsRuntime,
  registerCaliforniaCanvasGraphicsEvidenceForContrast,
  type CaliforniaCanvasGraphicsContrastConsumeAck,
  type CaliforniaCanvasGraphicsStateEvidence
} from "./california-canvas-graphics-runtime";
import {
  readAndAssertCaliforniaSignatureComposedMarkers
} from "./california-signature-composed-staging";
import {
  CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
  collectCaliforniaVisualizationContrastFindings,
  summarizeCaliforniaBaseContrastEvidence,
  summarizeCaliforniaHardenedTextContrastScan,
  type CaliforniaContrastAuditContext,
  type CaliforniaContrastEvidence,
  type CaliforniaContrastFinding,
  type CaliforniaContrastAuditOptions,
  type CaliforniaContrastAuditResult
} from "./california-visualization-contrast-audit";
import type { HkVisualizationContrastScanResult } from "./hk-visualization-text-contrast-scanner";
import {
  CaliforniaBrowserDiagnostics,
  CaliforniaVisitDeadline,
  captureSignatureBenchDefaultState,
  californiaVisualizationQaInventory,
  collectVisualizationUiFindings,
  disableQaMotion,
  expectCaliforniaAuthHydrated,
  installCaliforniaVisualizationUiAuditInit,
  openCaliforniaDirectoryLab,
  openSignatureBench,
  registerCaliforniaVisualizationStudent,
  resetSignatureBench,
  type CaliforniaBenchVisit,
  type CaliforniaQaAxis,
  type CaliforniaQaLab,
  type CaliforniaSignatureBenchDefaultState,
  type CaliforniaSignatureResetEvidence
} from "./california-visualization-qa-helpers";

/**
 * Exhaustive, source-attributed browser QA for the 186 California signature
 * benches. This is intentionally separate from the route/visit smoke suite:
 * a control missing from the DOM must not be allowed to shrink its own target.
 *
 * The test server must be an isolated copy instrumented by
 * the composed signature-control + Canvas-graphics QA staging pipeline.
 * Product/release builds are not
 * eligible inputs and the driver refuses to run without the DO-NOT-DEPLOY
 * provenance marker.
 */

export const CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION = 8;
export const CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS = 60_000;
export const CALIFORNIA_SIGNATURE_HARD_UX_BUDGET_MS = 30_000;
export const CALIFORNIA_SIGNATURE_MAX_BRANCH_STATES_PER_STEP = 2_048;

const CALIFORNIA_SIGNATURE_CONTRAST_ESSENTIAL_MARK_SELECTOR =
  "svg [data-viz-mark]:not(text):not(tspan), [data-viz-essential], [data-viz-axis]";

export const CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID = "desktop-en-light";
export const CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS = ["desktop", "mobile"].flatMap((viewport) =>
  ["en", "zhHK", "zhCN"].flatMap((locale) =>
    ["light", "dark"].map((theme) => `${viewport}-${locale}-${theme}`)
  )
);
export const CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS = [...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS];

/**
 * Deliberately unreviewed. Discovery artifacts report the candidate snapshot;
 * acceptance remains red until a reviewer pins its exact count and digest.
 */
export const CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT = {
  blueprintSha256: CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
  keyCount: 0,
  keysSha256: "UNREVIEWED",
  schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
} as const;

export type CaliforniaSignatureExhaustivePhase = "functional" | "layout" | "structural";

export type CaliforniaSignatureReplayStep = {
  endpoint: string;
  instanceKey: string;
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint;
  sourceSiteKey: string;
};

export type CaliforniaSignatureRuntimeControlKind = CaliforniaSignatureControlKind;

export type CaliforniaSignatureRuntimeControl = {
  checked: boolean | null;
  disabled: boolean;
  endpoints: string[];
  instanceKey: string;
  kind: CaliforniaSignatureRuntimeControlKind;
  max: string | null;
  maxLength: number;
  min: string | null;
  minLength: number;
  name: string;
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  optionValues: string[];
  pressed: boolean | null;
  step: string | null;
  sourceSiteKey: string;
  sourceConditionKeys: readonly string[];
  sourceEndpoints: readonly CaliforniaSignatureRuntimeEndpoint[];
  tagName: string;
  type: string;
  value: string;
  visible: boolean;
};

export type CaliforniaSignatureExactEvidenceRecord = {
  axisId: string;
  benchId: string;
  branchPath: CaliforniaSignatureReplayStep[];
  canvasGraphicsContrastAck: CaliforniaSignatureCanvasGraphicsContrastAck | null;
  canvasGraphicsEvidence: CaliforniaCanvasGraphicsStateEvidence | null;
  canvasGraphicsEvidenceSha256: string | null;
  canvasGraphicsNodeAck: CaliforniaSignatureCanvasGraphicsNodeAck | null;
  combinationActivations: readonly [
    CaliforniaSignatureSourceEvidenceOracleCombinationActivation,
    CaliforniaSignatureSourceEvidenceOracleCombinationActivation
  ] | null;
  endpoint: string | null;
  instanceKey: string | null;
  key: string;
  labId: string;
  layoutSettleEvidence: CaliforniaSignatureLayoutSettleEvidence | null;
  layoutSettleEvidenceSha256: string | null;
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  phase: CaliforniaSignatureExhaustivePhase;
  resetEvidence: CaliforniaSignatureResetEvidence | null;
  resetEvidenceSha256: string | null;
  sourceSiteKey: string | null;
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint | null;
  stepKey: string;
};

export type CaliforniaSignatureExpectedRouteOwnership = {
  benchId: string;
  labId: string;
  pathname: "/student/tools/visualizations";
  searchParams: readonly {
    name: "grade" | "lab" | "track";
    value: string;
  }[];
};

export type CaliforniaSignatureExternalEvidenceExpectations = {
  expectedOrigin: string;
  expectedRuntimeRunId: string;
  routes: readonly CaliforniaSignatureExpectedRouteOwnership[];
};

export type CaliforniaSignatureExpandedSourceEvidenceExpectation = {
  axisId: string;
  benchId: string;
  canvasSurface: CaliforniaSignatureSourceEvidenceOracleCanvasSurface | null;
  key: string;
  orderKey: string;
  oracleRowKey: string;
  phase: CaliforniaSignatureSourceEvidenceOraclePhase;
};

export type CaliforniaSignatureCanvasReceiptExpectation = {
  axisId: string;
  benchId: string;
  bindingKeys: readonly string[];
  canvasCount: number;
  key: string;
  oracleRowKey: string;
  phase: CaliforniaSignatureSourceEvidenceOraclePhase;
  stateKey: string;
  surfaceKey: "signature-canvas";
};

export type CaliforniaSignatureCanvasReceiptObservation =
  CaliforniaSignatureCanvasReceiptExpectation & {
    runtimeRunId: string;
  };

export type CaliforniaSignatureCanvasGraphicsContrastAck =
  CaliforniaCanvasGraphicsContrastConsumeAck;

export type CaliforniaSignatureCanvasGraphicsNodeAck = {
  consumed: true;
  evidenceSha256: string;
  receiptId: string;
  runtimeRunId: string;
};

export type CaliforniaSignatureExhaustivePackage = {
  benches: Array<{
    bench: CaliforniaSignatureBenchControlBlueprint;
    visit: CaliforniaBenchVisit;
  }>;
  grade: GradeId;
  id: string;
};

export type CaliforniaSignatureDurabilityContext = {
  axis: CaliforniaQaAxis;
  benchId: string;
  endpoint: string;
  instanceKey: string;
  labId: string;
  sourceSiteKey: string;
  stepKey: string;
};

export type CaliforniaSignatureDurabilityProvider = {
  assertReady(): Promise<void>;
  assertDurable(context: CaliforniaSignatureDurabilityContext): Promise<void>;
};

export type CaliforniaSignatureDomSvgSettleEvidence = {
  activeAnimationCount: 0;
  candidateTargetCount: number;
  controlStateSha256: string;
  deviceScaleFactor: number;
  documentLanguage: string;
  effectiveTheme: string;
  fontStatus: "loaded";
  geometryVisibilitySha256: string;
  rootStateSha256: string;
  stableRafSnapshots: number;
  svgTargetCount: number;
  url: string;
  viewportHeight: number;
  viewportWidth: number;
};

export type CaliforniaSignatureLayoutSettleEvidence = CaliforniaSignatureDomSvgSettleEvidence & {
  contrastContext: CaliforniaContrastAuditContext;
  contrastAuditedLabelCount: number;
  contrastCandidateLabelCount: number;
  contrastEvidence: readonly CaliforniaContrastEvidence[];
  contrastEvidenceSha256: string;
  contrastFindings: readonly CaliforniaContrastFinding[];
  contrastFindingCount: number;
  contrastMinRatio: number;
  contrastWorstRequiredRatio: number;
  contrastWorstKind: string;
  contrastWorstLabel: string;
  hardenedTextAlgorithmSha256: string;
  hardenedTextAuditedCount: number;
  hardenedTextCandidateCount: number;
  hardenedTextCompleted: boolean;
  hardenedTextEvidenceSha256: string;
  hardenedTextFindingCount: number;
  hardenedTextMinRatio: number;
  hardenedTextRawScan: HkVisualizationContrastScanResult;
  hardenedTextWorstLabel: string;
  hardenedTextWorstRequiredRatio: number;
  postControlStateSha256: string;
  postGeometryVisibilitySha256: string;
  postRootStateSha256: string;
};

export type CaliforniaSignatureContrastResult = CaliforniaContrastAuditResult & {
  layoutSettleEvidence: CaliforniaSignatureLayoutSettleEvidence;
};

export type CaliforniaSignatureContrastProviderAuditOptions = Pick<
  CaliforniaContrastAuditOptions,
  "auditCanvases"
>;

export type CaliforniaSignatureContrastProvider = {
  audit(
    root: Locator,
    context: CaliforniaContrastAuditContext,
    options?: CaliforniaSignatureContrastProviderAuditOptions
  ): Promise<CaliforniaSignatureContrastResult>;
};

export type CaliforniaSignatureDomSvgSettledProof = NonNullable<
  CaliforniaContrastAuditOptions["settledProof"]
>;

export type CaliforniaSignatureDomSvgSettleResult = {
  layoutSettleEvidence: CaliforniaSignatureDomSvgSettleEvidence;
  settledProof: CaliforniaSignatureDomSvgSettledProof;
};

export type CaliforniaSignatureSourceExpectedControl = {
  endpoints: readonly string[];
  instanceKey: string;
  kind: CaliforniaSignatureRuntimeControlKind;
  numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
  sourceConditionKeys: readonly string[];
  sourceEndpoints: readonly CaliforniaSignatureRuntimeEndpoint[];
  sourceSiteKey: string;
};

export type CaliforniaSignatureSourceExpectedContext = {
  bench: CaliforniaSignatureBenchControlBlueprint;
  branchPath: readonly CaliforniaSignatureReplayStep[];
  stepKey: string;
};

/**
 * Source IR is the expected side of the contract. Runtime DOM discovery is
 * only the actual side and can never approve its own option/branch set.
 * Pointer/custom surfaces also execute through this provider because guessing
 * coordinates from pixels or labels is forbidden.
 */
export type CaliforniaSignatureSourceExpectedProvider = {
  assertReady(manifest: CaliforniaSignatureSourceManifest): Promise<void>;
  activeEndpoints(options: {
    context: CaliforniaSignatureSourceExpectedContext;
    control: CaliforniaSignatureRuntimeControl;
  }): Promise<readonly string[]>;
  expectedControls(
    context: CaliforniaSignatureSourceExpectedContext
  ): Promise<readonly CaliforniaSignatureSourceExpectedControl[]>;
  branchEndpoints(options: {
    context: CaliforniaSignatureSourceExpectedContext;
    control: CaliforniaSignatureRuntimeControl;
  }): Promise<readonly string[]>;
  navigationContract(bench: CaliforniaSignatureBenchControlBlueprint): Promise<CaliforniaSignatureNavigationContract>;
  resolveRuntimeControls(options: {
    context: CaliforniaSignatureSourceExpectedContext;
    controls: readonly CaliforniaSignatureRuntimeControl[];
  }): Promise<readonly CaliforniaSignatureRuntimeControl[]>;
  settleEndpoint(options: {
    context: CaliforniaSignatureSourceExpectedContext;
    control: CaliforniaSignatureRuntimeControl;
    endpoint: string;
    root: Locator;
  }): Promise<void>;
  activateNonFormEndpoint(options: {
    context: CaliforniaSignatureSourceExpectedContext;
    control: CaliforniaSignatureRuntimeControl;
    endpoint: string;
    root: Locator;
  }): Promise<void>;
};

export const missingCaliforniaSignatureDurabilityProvider: CaliforniaSignatureDurabilityProvider = {
  async assertReady() {
    throw new Error("durability provider not installed");
  },
  async assertDurable() {
    throw new Error("durability provider not installed");
  }
};

export function requireCaliforniaSignatureCanvasRuntimeRunId(
  value = process.env.CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID
) {
  const runtimeRunId = value?.trim() ?? "";
  assert.match(
    runtimeRunId,
    /^[a-z0-9:_-]{24,128}$/i,
    "CA_SIGNATURE_CANVAS_RUNTIME_RUN_ID must be one externally generated high-entropy ID shared by every worker"
  );
  return runtimeRunId;
}

/**
 * Produce caller-owned, measured proof that the DOM/SVG surface is safe to
 * sample. Canvas terminal stability deliberately remains the contrast
 * scanner's independent recorder contract.
 */
export async function settleCaliforniaSignatureDomSvgForContrast(
  root: Locator
): Promise<CaliforniaSignatureDomSvgSettleResult> {
  await root.page().evaluate(
    "globalThis.__name = globalThis.__name || function(value) { return value; };"
  );
  const settled = await root.evaluate(async (element, essentialMarkSelector) => {
    const rootElement = element as HTMLElement;
    const fontSet = document.fonts;
    if (!fontSet) {
      throw new Error("DOM/SVG contrast settle gate: document.fonts is unavailable");
    }
    const fontsLoaded = await Promise.race([
      fontSet.ready.then(() => true),
      new Promise<false>((resolve) => window.setTimeout(() => resolve(false), 2_000))
    ]);
    if (!fontsLoaded || fontSet.status !== "loaded") {
      throw new Error(`DOM/SVG contrast settle gate: fonts did not load; status=${fontSet.status}`);
    }

    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const visualState = (target: Element) => {
      const style = getComputedStyle(target);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderBottomColor: style.borderBottomColor,
        borderBottomStyle: style.borderBottomStyle,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftColor: style.borderLeftColor,
        borderLeftStyle: style.borderLeftStyle,
        borderLeftWidth: style.borderLeftWidth,
        borderRightColor: style.borderRightColor,
        borderRightStyle: style.borderRightStyle,
        borderRightWidth: style.borderRightWidth,
        borderTopColor: style.borderTopColor,
        borderTopStyle: style.borderTopStyle,
        borderTopWidth: style.borderTopWidth,
        boxShadow: style.boxShadow,
        clipPath: style.clipPath,
        color: style.color,
        colorScheme: style.colorScheme,
        contentVisibility: style.contentVisibility,
        display: style.display,
        fill: style.fill,
        fillOpacity: style.fillOpacity,
        filter: style.filter,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontStretch: style.fontStretch,
        fontStyle: style.fontStyle,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        lineHeight: style.lineHeight,
        maskImage: style.getPropertyValue("mask-image") || style.getPropertyValue("-webkit-mask-image"),
        mixBlendMode: style.mixBlendMode,
        opacity: style.opacity,
        outlineColor: style.outlineColor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        stroke: style.stroke,
        strokeOpacity: style.strokeOpacity,
        textDecorationColor: style.textDecorationColor,
        textDecorationLine: style.textDecorationLine,
        textShadow: style.textShadow,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
        visibility: style.visibility,
        webkitTextFillColor: style.getPropertyValue("-webkit-text-fill-color"),
        webkitTextStrokeColor: style.getPropertyValue("-webkit-text-stroke-color"),
        webkitTextStrokeWidth: style.getPropertyValue("-webkit-text-stroke-width"),
        wordSpacing: style.wordSpacing,
        zoom: style.zoom
      };
    };
    const pseudoVisualState = (target: Element, pseudo: "::after" | "::before") => {
      const style = getComputedStyle(target, pseudo);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        boxShadow: style.boxShadow,
        color: style.color,
        content: style.content,
        display: style.display,
        filter: style.filter,
        maskImage: style.getPropertyValue("mask-image") || style.getPropertyValue("-webkit-mask-image"),
        mixBlendMode: style.mixBlendMode,
        opacity: style.opacity,
        visibility: style.visibility
      };
    };
    const controlState = (target: Element) => {
      if (target instanceof HTMLInputElement) {
        return {
          checked: target.checked,
          disabled: target.disabled,
          max: target.max,
          min: target.min,
          type: target.type,
          value: target.value
        };
      }
      if (target instanceof HTMLSelectElement) {
        return {
          disabled: target.disabled,
          selectedIndex: target.selectedIndex,
          selectedValues: Array.from(target.selectedOptions).map((option) => option.value),
          value: target.value
        };
      }
      if (target instanceof HTMLTextAreaElement) {
        return { disabled: target.disabled, value: target.value };
      }
      if (target instanceof HTMLButtonElement) {
        return {
          ariaPressed: target.getAttribute("aria-pressed"),
          disabled: target.disabled,
          value: target.value
        };
      }
      return null;
    };
    const isVisuallyPresent = (target: Element) => {
      for (let current: Element | null = target; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" ||
          Number.parseFloat(style.opacity) === 0 || current.hasAttribute("hidden")
        ) return false;
        if (current === rootElement) break;
      }
      return Array.from(target.getClientRects()).some((rect) =>
        rect.width > 0 && rect.height > 0 ||
        target instanceof SVGGeometryElement && (rect.width > 0 || rect.height > 0)
      );
    };
    const rects = (target: Element) => {
      const rounded = (value: number) => Math.round(value * 100) / 100;
      return Array.from(target.getClientRects()).map((rect) => ({
        bottom: rounded(rect.bottom),
        height: rounded(rect.height),
        left: rounded(rect.left),
        right: rounded(rect.right),
        top: rounded(rect.top),
        width: rounded(rect.width)
      }));
    };
    const geometry = (target: Element) => {
      const rect = target.getBoundingClientRect();
      const rounded = (value: number) => Math.round(value * 100) / 100;
      return {
        bounding: {
          bottom: rounded(rect.bottom),
          height: rounded(rect.height),
          left: rounded(rect.left),
          right: rounded(rect.right),
          top: rounded(rect.top),
          width: rounded(rect.width)
        },
        clientRects: rects(target)
      };
    };
    const parentOfContrastText = (node: Text) => {
      const parent = node.parentElement;
      const label = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (
        !parent || !label ||
        parent.closest("svg,canvas,script,style,template,noscript,.sr-only") ||
        !isVisuallyPresent(parent)
      ) return null;
      return parent;
    };
    const animationTargetElement = (animation: Animation) => {
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect)) return null;
      const target = effect.target;
      if (target instanceof Element) return target;
      const pseudoElement = target as unknown as { element?: Element } | null;
      return pseudoElement?.element instanceof Element ? pseudoElement.element : null;
    };
    const activeAnimationsUnderRoot = () => document.getAnimations().filter((animation) => {
      if (animation.playState !== "running" && !animation.pending) return false;
      const target = animationTargetElement(animation);
      // Unknown Web Animation effect targets cannot establish the required
      // under-root negative, so the settle gate conservatively remains red.
      return !target || target === rootElement || rootElement.contains(target);
    });
    const visibilityChain = (target: Element) => {
      const chain = [];
      for (let current: Element | null = target; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        chain.push({
          display: style.display,
          opacity: style.opacity,
          tag: current.tagName,
          transform: style.transform,
          visibility: style.visibility,
          zoom: style.zoom
        });
        if (current === rootElement) break;
      }
      return chain;
    };
    const contrastCandidateTargets = () => {
      const candidates = new Set<Element>([rootElement]);
      const svgTargets = Array.from(rootElement.querySelectorAll<SVGElement>("svg, svg *"))
        .filter(isVisuallyPresent);
      svgTargets.forEach((target) => candidates.add(target));

      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = parentOfContrastText(node as Text);
        if (parent) candidates.add(parent);
      }
      Array.from(rootElement.querySelectorAll<Element>(
        'input:not([type="range"]):not([type="color"]):not([type="checkbox"]):not([type="radio"]),' +
        "select,textarea,button"
      )).filter(isVisuallyPresent).forEach((target) => candidates.add(target));
      Array.from(rootElement.querySelectorAll<Element>(essentialMarkSelector))
        .filter(isVisuallyPresent).forEach((target) => candidates.add(target));

      const documentOrder = [rootElement, ...Array.from(rootElement.querySelectorAll<Element>("*"))];
      return {
        svgTargetCount: svgTargets.length,
        targets: documentOrder.filter((target) => candidates.has(target))
      };
    };
    const hash = (value: string) => {
      let result = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
      }
      return (result >>> 0).toString(16).padStart(8, "0");
    };
    const capture = () => {
      const { svgTargetCount, targets } = contrastCandidateTargets();
      const signature = JSON.stringify(targets.map((target, index) => ({
        childTextHash: hash(target.textContent ?? ""),
        geometry: geometry(target),
        index,
        markup: target instanceof SVGSVGElement ? hash(target.outerHTML) : null,
        tag: target.tagName,
        visibilityChain: visibilityChain(target),
        visual: visualState(target)
      })));
      const allElements = [rootElement, ...Array.from(rootElement.querySelectorAll<Element>("*"))];
      const controls = allElements.flatMap((target, index) => {
        const state = controlState(target);
        return state === null ? [] : [{
          attributes: Array.from(target.attributes).map((attribute) => [attribute.name, attribute.value]).sort(),
          index,
          state,
          tag: target.tagName
        }];
      });
      const rootStateSignature = JSON.stringify({
        document: {
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          deviceScaleFactor: devicePixelRatio,
          effectiveColorScheme: getComputedStyle(rootElement).colorScheme,
          height: innerHeight,
          htmlClass: document.documentElement.className,
          htmlDataTheme: document.documentElement.getAttribute("data-theme") ?? "",
          language: document.documentElement.lang,
          scrollX,
          scrollY,
          url: location.href,
          width: innerWidth
        },
        elements: allElements.map((target, index) => ({
          attributes: Array.from(target.attributes).map((attribute) => [attribute.name, attribute.value]).sort(),
          childTextHash: hash(target.textContent ?? ""),
          control: controlState(target),
          geometry: geometry(target),
          index,
          markup: target instanceof SVGSVGElement ? hash(target.outerHTML) : null,
          pseudoAfter: pseudoVisualState(target, "::after"),
          pseudoBefore: pseudoVisualState(target, "::before"),
          tag: target.tagName,
          visibilityChain: visibilityChain(target),
          visual: visualState(target)
        }))
      });
      const controlStateSignature = JSON.stringify(controls);
      const settleSignature = JSON.stringify({
        controlStateSignature,
        rootStateSignature,
        signature
      });
      return {
        activeAnimationCount: activeAnimationsUnderRoot().length,
        candidateTargetCount: targets.length,
        controlStateSignature,
        deviceScaleFactor: devicePixelRatio,
        effectiveTheme: [
          document.documentElement.getAttribute("data-theme") ?? "",
          document.documentElement.className,
          getComputedStyle(rootElement).colorScheme
        ].join("|"),
        language: document.documentElement.lang,
        rootStateSignature,
        settleSignature,
        signature,
        svgTargetCount,
        url: location.href,
        viewportHeight: innerHeight,
        viewportWidth: innerWidth
      };
    };

    const startedAt = performance.now();
    let framesObserved = 0;
    let previousSignature = "";
    let stableRafSnapshots = 0;
    let last = capture();
    while (performance.now() - startedAt <= 2_000) {
      await frame();
      framesObserved += 1;
      if (fontSet.status !== "loaded") {
        throw new Error(`DOM/SVG contrast settle gate: font status regressed to ${fontSet.status}`);
      }
      last = capture();
      stableRafSnapshots = last.activeAnimationCount === 0 && last.settleSignature === previousSignature
        ? stableRafSnapshots + 1
        : last.activeAnimationCount === 0 ? 1 : 0;
      previousSignature = last.settleSignature;
      if (stableRafSnapshots >= 3) {
        return {
          ...last,
          fontStatus: fontSet.status,
          framesObserved,
          stableRafSnapshots
        };
      }
    }
    throw new Error(
      "DOM/SVG contrast settle gate: root/SVG geometry and computed visibility did not remain identical " +
      `with zero active animations; frames=${framesObserved}; stable=${stableRafSnapshots}; ` +
      `activeAnimations=${last.activeAnimationCount}; svgTargets=${last.svgTargetCount}`
    );
  }, CALIFORNIA_SIGNATURE_CONTRAST_ESSENTIAL_MARK_SELECTOR);
  const layoutSettleEvidence: CaliforniaSignatureDomSvgSettleEvidence = {
    activeAnimationCount: 0,
    candidateTargetCount: settled.candidateTargetCount,
    controlStateSha256: sha256(settled.controlStateSignature),
    deviceScaleFactor: settled.deviceScaleFactor,
    documentLanguage: settled.language,
    effectiveTheme: settled.effectiveTheme,
    fontStatus: "loaded",
    geometryVisibilitySha256: sha256(settled.signature),
    rootStateSha256: sha256(settled.rootStateSignature),
    stableRafSnapshots: settled.stableRafSnapshots,
    svgTargetCount: settled.svgTargetCount,
    url: settled.url,
    viewportHeight: settled.viewportHeight,
    viewportWidth: settled.viewportWidth
  };
  return {
    layoutSettleEvidence,
    settledProof: {
      domSvg: "settled",
      evidence: [
        "california-signature-dom-svg-settle/v1",
        `fonts=${settled.fontStatus}`,
        `stableRafSnapshots=${settled.stableRafSnapshots}`,
        `framesObserved=${settled.framesObserved}`,
        `activeAnimations=${settled.activeAnimationCount}`,
        `targets=${settled.candidateTargetCount}`,
        `svgTargets=${settled.svgTargetCount}`,
        `geometryVisibilitySha256=${layoutSettleEvidence.geometryVisibilitySha256}`,
        `rootStateSha256=${layoutSettleEvidence.rootStateSha256}`,
        `controlStateSha256=${layoutSettleEvidence.controlStateSha256}`
      ].join(";")
    }
  };
}

/** Real WCAG evidence adapter; it never substitutes guessed color ratios. */
export const californiaSignatureContrastProvider: CaliforniaSignatureContrastProvider = {
  async audit(root, context, options = {}) {
    const settled = await settleCaliforniaSignatureDomSvgForContrast(root);
    const result = await collectCaliforniaVisualizationContrastFindings(root, context, {
      auditCanvases: options.auditCanvases,
      essentialMarkSelector: CALIFORNIA_SIGNATURE_CONTRAST_ESSENTIAL_MARK_SELECTOR,
      settledProof: settled.settledProof
    });
    const postAuditSettled = await settleCaliforniaSignatureDomSvgForContrast(root);
    assert.deepEqual(
      postAuditSettled.layoutSettleEvidence,
      settled.layoutSettleEvidence,
      `${context.benchId}/${context.state}: DOM/SVG/control/root state drifted across contrast audit`
    );
    const baseSummary = summarizeCaliforniaBaseContrastEvidence(result.evidence, context);
    const hardenedSummary = summarizeCaliforniaHardenedTextContrastScan(
      result.hardenedText.rawScan,
      context
    );
    assert.equal(result.auditedLabelCount, baseSummary.auditedLabelCount,
      `${context.benchId}/${context.state}: base contrast audited-count drift`);
    assert.equal(result.candidateLabelCount, baseSummary.candidateLabelCount,
      `${context.benchId}/${context.state}: base contrast candidate-count drift`);
    assert.deepEqual(
      result.findings,
      [...baseSummary.findings, ...hardenedSummary.findings],
      `${context.benchId}/${context.state}: raw contrast payload does not reconstruct findings`
    );
    assert.deepEqual(result.hardenedText, hardenedSummary.hardenedText,
      `${context.benchId}/${context.state}: hardened raw scan does not reconstruct its summary`);
    return {
      ...result,
      layoutSettleEvidence: {
        ...settled.layoutSettleEvidence,
        contrastContext: context,
        contrastAuditedLabelCount: baseSummary.auditedLabelCount,
        contrastCandidateLabelCount: baseSummary.candidateLabelCount,
        contrastEvidence: result.evidence,
        contrastEvidenceSha256: sha256(stableJson(result.evidence)),
        contrastFindings: baseSummary.findings,
        contrastFindingCount: baseSummary.findings.length,
        contrastMinRatio: baseSummary.minRatio ?? Number.NaN,
        contrastWorstKind: baseSummary.worstKind ?? "",
        contrastWorstLabel: baseSummary.worstLabel ?? "",
        contrastWorstRequiredRatio: baseSummary.worstRequiredRatio ?? Number.NaN,
        hardenedTextAlgorithmSha256: hardenedSummary.hardenedText.algorithmSha256,
        hardenedTextAuditedCount: hardenedSummary.hardenedText.auditedTextCount,
        hardenedTextCandidateCount: hardenedSummary.hardenedText.candidateTextCount,
        hardenedTextCompleted: hardenedSummary.hardenedText.completed,
        hardenedTextEvidenceSha256: hardenedSummary.hardenedText.evidenceSha256,
        hardenedTextFindingCount: hardenedSummary.hardenedText.findingCount,
        hardenedTextMinRatio: hardenedSummary.hardenedText.minRatio ?? Number.NaN,
        hardenedTextRawScan: hardenedSummary.hardenedText.rawScan,
        hardenedTextWorstLabel: hardenedSummary.hardenedText.worstLabel ?? "",
        hardenedTextWorstRequiredRatio: hardenedSummary.hardenedText.worstRequiredRatio ?? Number.NaN,
        postControlStateSha256: postAuditSettled.layoutSettleEvidence.controlStateSha256,
        postGeometryVisibilitySha256: postAuditSettled.layoutSettleEvidence.geometryVisibilitySha256,
        postRootStateSha256: postAuditSettled.layoutSettleEvidence.rootStateSha256
      }
    };
  }
};

export const missingCaliforniaSignatureSourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider = {
  async activeEndpoints() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async assertReady() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async expectedControls() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async branchEndpoints() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async navigationContract() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async resolveRuntimeControls() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async settleEndpoint() {
    throw new Error("source expected-vs-runtime IR provider not installed");
  },
  async activateNonFormEndpoint() {
    throw new Error("pointer endpoint provider not installed");
  }
};

export type CaliforniaSignatureNavigationContract = {
  answerSiteKey: string;
  backSiteKey: string;
  nextSiteKey: string;
};

type RuntimeMarkers = ReturnType<typeof readAndAssertCaliforniaSignatureComposedMarkers>;

type EndpointCase = {
  control: CaliforniaSignatureRuntimeControl;
  endpoint: string;
  path: CaliforniaSignatureReplayStep[];
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
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

function errorDetail(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/\s+/g, " ").trim()
    : String(error).replace(/\s+/g, " ").trim();
}

function languageId(language: Language) {
  return language === "zh-Hans" ? "zhCN" : language === "zh" ? "zhHK" : "en";
}

function localeForLanguage(language: Language) {
  return language === "zh-Hans" ? "zh-Hans-CN" : language === "zh" ? "zh-Hant-HK" : "en-HK";
}

export function buildCaliforniaSignatureAxis(
  viewport: "desktop" | "mobile",
  language: Language,
  theme: ThemeMode
): CaliforniaQaAxis {
  return {
    id: `${viewport}-${languageId(language)}-${theme}`,
    language,
    locale: localeForLanguage(language),
    theme,
    viewport
  };
}

export function californiaSignatureAxesForViewport(viewport: "desktop" | "mobile") {
  const structural = (["en", "zh", "zh-Hans"] as const).flatMap((language) =>
    (["light", "dark"] as const).map((theme) => buildCaliforniaSignatureAxis(viewport, language, theme))
  );
  return {
    functional: viewport === "desktop" ? [buildCaliforniaSignatureAxis("desktop", "en", "light")] : [],
    layout: structural,
    structural
  };
}

export function parseCaliforniaSignatureShard(raw = process.env.CA_SIGNATURE_EXHAUSTIVE_SHARD?.trim()) {
  if (!raw) return null;
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(raw);
  assert.ok(match, `CA_SIGNATURE_EXHAUSTIVE_SHARD must be one-based index/total; received ${JSON.stringify(raw)}`);
  const index = Number(match[1]);
  const total = Number(match[2]);
  assert.ok(Number.isSafeInteger(index) && Number.isSafeInteger(total) && index >= 1 && index <= total,
    `invalid CA_SIGNATURE_EXHAUSTIVE_SHARD ${raw}`);
  return { index, total };
}

function firstVisitByBenchId() {
  const visits = new Map<string, CaliforniaBenchVisit>();
  for (const visit of californiaVisualizationQaInventory.benchVisits) {
    if (!visits.has(visit.benchId)) visits.set(visit.benchId, visit);
  }
  return visits;
}

function normalizeCaliforniaSignatureExpectedOrigin(value: string) {
  const parsed = new URL(value);
  assert.equal(parsed.username, "", "California signature expected origin must not contain credentials");
  assert.equal(parsed.password, "", "California signature expected origin must not contain credentials");
  assert.equal(parsed.pathname, "/", "California signature expected origin must not contain a route path");
  assert.equal(parsed.search, "", "California signature expected origin must not contain query fields");
  assert.equal(parsed.hash, "", "California signature expected origin must not contain a fragment");
  return parsed.origin;
}

/**
 * Build externally owned run/origin/route expectations from the reviewed QA
 * inventory. Evidence records never participate in this ownership map.
 */
export function buildCaliforniaSignatureExternalEvidenceExpectations(options: {
  expectedOrigin: string;
  expectedRuntimeRunId: string;
  manifest: CaliforniaSignatureSourceManifest;
}): CaliforniaSignatureExternalEvidenceExpectations {
  const expectedOrigin = normalizeCaliforniaSignatureExpectedOrigin(options.expectedOrigin);
  const expectedRuntimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId(
    options.expectedRuntimeRunId
  );
  const visitByBench = firstVisitByBenchId();
  const routes = options.manifest.benches.map((bench): CaliforniaSignatureExpectedRouteOwnership => {
    const visit = visitByBench.get(bench.benchId);
    assert.ok(visit, `${bench.benchId}: no externally reviewed California route ownership`);
    return {
      benchId: bench.benchId,
      labId: visit.lab.labId,
      pathname: "/student/tools/visualizations",
      searchParams: [
        { name: "grade", value: visit.lab.grade },
        { name: "lab", value: visit.lab.labId },
        { name: "track", value: "all" }
      ]
    };
  }).sort((left, right) => left.benchId.localeCompare(right.benchId));
  assert.equal(new Set(routes.map((route) => route.benchId)).size, routes.length,
    "California signature external route ownership repeats a bench");
  return { expectedOrigin, expectedRuntimeRunId, routes };
}

export function buildCaliforniaSignatureExhaustivePackages(
  manifest: CaliforniaSignatureSourceManifest,
  benchesPerPackage = Number(process.env.CA_SIGNATURE_BENCHES_PER_PACKAGE?.trim() || 4)
) {
  assert.ok(Number.isSafeInteger(benchesPerPackage) && benchesPerPackage > 0 && benchesPerPackage <= 24,
    `CA_SIGNATURE_BENCHES_PER_PACKAGE must be 1..24; received ${benchesPerPackage}`);
  const visitByBench = firstVisitByBenchId();
  const byGrade = new Map<GradeId, CaliforniaSignatureExhaustivePackage["benches"]>();
  for (const bench of manifest.benches) {
    const visit = visitByBench.get(bench.benchId);
    assert.ok(visit, `${bench.benchId}: no California route reaches this reviewed signature bench`);
    const benches = byGrade.get(visit.lab.grade) ?? [];
    benches.push({ bench, visit });
    byGrade.set(visit.lab.grade, benches);
  }
  const packages: CaliforniaSignatureExhaustivePackage[] = [];
  for (const [grade, benches] of [...byGrade].sort(([left], [right]) => left.localeCompare(right))) {
    const ordered = [...benches].sort((left, right) => left.bench.benchId.localeCompare(right.bench.benchId));
    for (let offset = 0; offset < ordered.length; offset += benchesPerPackage) {
      const index = offset / benchesPerPackage + 1;
      packages.push({
        benches: ordered.slice(offset, offset + benchesPerPackage),
        grade,
        id: `signature-exhaustive-${grade.toLowerCase()}-${index}`
      });
    }
  }
  return packages;
}

export function selectCaliforniaSignaturePackages(
  packages: readonly CaliforniaSignatureExhaustivePackage[],
  shard = parseCaliforniaSignatureShard()
) {
  return shard
    ? packages.filter((_, index) => index % shard.total === shard.index - 1)
    : [...packages];
}

export async function assertCaliforniaSignatureQaRuntimeMarker(options: {
  manifest: CaliforniaSignatureSourceManifest;
  productProjectRoot?: string;
  stagingRoot?: string;
}) {
  const stagingRoot = options.stagingRoot ?? process.env.CA_SIGNATURE_QA_STAGING_ROOT?.trim();
  assert.ok(stagingRoot, "CA_SIGNATURE_QA_STAGING_ROOT is required; refusing an unmarked product/release server");
  const productProjectRoot = options.productProjectRoot ??
    resolveCaliforniaSignatureFrozenSourceRoot();
  let markers: RuntimeMarkers;
  try {
    markers = readAndAssertCaliforniaSignatureComposedMarkers({
      contract: californiaCanvasGraphicsSourceContract,
      manifest: options.manifest,
      productProjectRoot,
      stagingRoot
    });
  } catch (error) {
    throw new Error(`California signature composed QA markers missing or invalid: ${errorDetail(error)}`);
  }
  return markers;
}

function xpathLiteral(value: string) {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value.split("'").map((part, index) =>
    `${index === 0 ? "" : `,"'",`}'${part}'`
  ).join("")})`;
}

function exactControlLocator(root: Locator, sourceSiteKey: string, instanceKey: string) {
  return root.locator(
    `xpath=.//*[@${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${xpathLiteral(sourceSiteKey)} and ` +
    `@${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}=${xpathLiteral(instanceKey)}]`
  );
}

async function assertLessonStep(
  root: Locator,
  bench: CaliforniaSignatureBenchControlBlueprint,
  stepIndex: number
) {
  const expected = `Step ${stepIndex + 1} of ${bench.lessonSteps.length}`;
  await expect(root.locator("p").filter({ hasText: new RegExp(`^\\s*${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`) }))
    .toHaveCount(1, { timeout: CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS });
}

function sourceSitesByKey(bench: CaliforniaSignatureBenchControlBlueprint) {
  return new Map(bench.controlSites.map((site) => [site.siteKey, site]));
}

function endpointValues(
  bench: CaliforniaSignatureBenchControlBlueprint,
  control: Pick<CaliforniaSignatureRuntimeControl,
    "disabled" | "instanceKey" | "max" | "maxLength" | "min" | "minLength" | "name" | "step" |
    "optionValues" | "sourceSiteKey" | "value"
  >,
  site: CaliforniaSignatureControlSite,
  controls: Array<Pick<CaliforniaSignatureRuntimeControl,
    "disabled" | "instanceKey" | "max" | "maxLength" | "min" | "minLength" | "name" | "step" |
    "optionValues" | "sourceSiteKey" | "value"
  >>
) {
  switch (site.kind) {
    case "action-button": return ["activate"];
    case "press-button": return ["activate", "restore"];
    case "range":
    case "number": {
      const resolved = resolveCaliforniaSignatureNumericEndpoints(
        site.numericMidpoint,
        control.min,
        control.max,
        control.step,
        `${bench.benchId}/${site.siteKey}/${control.instanceKey}`
      );
      return resolved.status === "available"
        ? ["min", "mid", "max"]
        : resolved.reachableCardinality === 1 ? ["min"] : ["min", "max"];
    }
    case "checkbox": return ["false", "true"];
    case "select": {
      if (control.disabled && control.optionValues.length === 0) return [];
      if (control.optionValues.length < 2 || new Set(control.optionValues).size !== control.optionValues.length) {
        throw new Error(`${bench.benchId}/${site.siteKey}: select must expose at least two unique enabled option values`);
      }
      return control.optionValues.map((value) => `option:${value}`);
    }
    case "radio": {
      const peers = controls.filter((candidate) =>
        candidate.sourceSiteKey === control.sourceSiteKey && candidate.name === control.name
      );
      if (control.disabled && peers.every((peer) => peer.disabled)) return [];
      const values = peers.map((peer) => peer.value);
      if (!control.name || values.length < 2 || new Set(values).size !== values.length) {
        throw new Error(`${bench.benchId}/${site.siteKey}: radio group lacks a unique name and at least two attributed values`);
      }
      return values.map((value) => `option:${value}`);
    }
    case "textarea": {
      if (control.minLength < 0 || control.maxLength < control.minLength || control.maxLength < 1) {
        throw new Error(`${bench.benchId}/${site.siteKey}: textarea lacks finite minLength/maxLength endpoints`);
      }
      return ["minimum", "maximum"];
    }
    case "interaction-surface":
      return [];
  }
}

export async function snapshotCaliforniaSignatureRuntimeControls(
  root: Locator,
  bench: CaliforniaSignatureBenchControlBlueprint
): Promise<CaliforniaSignatureRuntimeControl[]> {
  const raw = await root.locator(
    `button,input,select,textarea,[${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}][${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}]`
  ).evaluateAll((elements, attributes) =>
    elements.map((element) => {
      const html = element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" &&
        style.visibility !== "hidden" && Number(style.opacity) > 0 && !element.closest("[hidden],[aria-hidden=true]");
      const select = element instanceof HTMLSelectElement ? element : null;
      return {
        checked: element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type)
          ? element.checked : null,
        disabled: "disabled" in html ? html.disabled : false,
        instanceKey: element.getAttribute(attributes.instance),
        max: element instanceof HTMLInputElement ? element.getAttribute("max") : null,
        maxLength: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.maxLength : -1,
        min: element instanceof HTMLInputElement ? element.getAttribute("min") : null,
        minLength: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.minLength : -1,
        name: element instanceof HTMLInputElement ? element.name : "",
        optionValues: select ? Array.from(select.options).filter((option) => !option.disabled).map((option) => option.value) : [],
        pressed: element.hasAttribute("aria-pressed") ? element.getAttribute("aria-pressed") === "true" : null,
        runtimeEndpoints: (element.getAttribute(attributes.endpoints) ?? "")
          .split("\u001f").filter(Boolean),
        runtimeKind: element.getAttribute(attributes.kind),
        sourceSiteKey: element.getAttribute(attributes.site),
        step: element instanceof HTMLInputElement ? element.getAttribute("step") : null,
        tagName: element.tagName.toLowerCase(),
        type: element instanceof HTMLInputElement ? element.type : element.tagName.toLowerCase(),
        value: "value" in html ? html.value : "",
        visible
      };
    }), {
      endpoints: CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE,
      instance: CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
      kind: CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE,
      site: CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE
    }
  );
  const sites = sourceSitesByKey(bench);
  const identities = new Set<string>();
  const normalized = raw.map((control) => {
    if (!control.sourceSiteKey || !control.instanceKey) {
      throw new Error(
        `${bench.benchId}: live ${control.tagName}/${control.type} is missing exact ` +
        `${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}+${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}`
      );
    }
    const site = sites.get(control.sourceSiteKey);
    if (!site) {
      throw new Error(`${bench.benchId}: runtime control is misattributed to unknown source site ${control.sourceSiteKey}`);
    }
    const identity = `${control.sourceSiteKey}\0${control.instanceKey}`;
    if (identities.has(identity)) {
      throw new Error(`${bench.benchId}: duplicate live control identity ${control.sourceSiteKey}/${control.instanceKey}`);
    }
    identities.add(identity);
    if (control.runtimeKind !== site.kind) {
      throw new Error(
        `${bench.benchId}/${site.siteKey}: runtime kind ${JSON.stringify(control.runtimeKind)} != source kind ${site.kind}`
      );
    }
    const expectedTag = site.kind === "action-button" || site.kind === "press-button"
      ? "button"
      : site.kind === "select" || site.kind === "textarea" ? site.kind : "input";
    const isFormControl = ["button", "input", "select", "textarea"].includes(control.tagName);
    if (isFormControl && control.tagName !== expectedTag) {
      throw new Error(`${bench.benchId}/${site.siteKey}: ${control.tagName} does not match source kind ${site.kind}`);
    }
    if (expectedTag === "input" && control.type !== site.kind) {
      throw new Error(`${bench.benchId}/${site.siteKey}: input type ${control.type} does not match source kind ${site.kind}`);
    }
    return {
      ...control,
      instanceKey: control.instanceKey,
      sourceSiteKey: control.sourceSiteKey
    };
  });
  return normalized.map((control) => {
    const site = sites.get(control.sourceSiteKey!)!;
    const kind = site.kind;
    const nonFormInteraction = kind === "interaction-surface";
    const endpoints = nonFormInteraction
      ? control.runtimeEndpoints
      : endpointValues(bench, control, site, normalized) ?? [];
    if (nonFormInteraction && endpoints.length === 0) {
      throw new Error(`${bench.benchId}/${site.siteKey}: interaction surface has no source-attributed runtime endpoints`);
    }
    return {
      ...control,
      endpoints,
      instanceKey: control.instanceKey!,
      kind,
      numericMidpoint: null,
      sourceConditionKeys: [],
      sourceEndpoints: [],
      sourceSiteKey: control.sourceSiteKey!
    };
  });
}

export async function assertCaliforniaSignatureSourceExpectedRuntimeExact(options: {
  actual: readonly CaliforniaSignatureRuntimeControl[];
  context: CaliforniaSignatureSourceExpectedContext;
  provider: CaliforniaSignatureSourceExpectedProvider;
}) {
  const expected = await options.provider.expectedControls(options.context);
  const actual = await options.provider.resolveRuntimeControls({
    context: options.context,
    controls: options.actual
  });
  const validateAgainstSource = (control: {
    instanceKey: string;
    sourceConditionKeys: readonly string[];
    sourceEndpoints: readonly CaliforniaSignatureRuntimeEndpoint[];
    sourceSiteKey: string;
  }, side: "expected" | "runtime") => {
    const site = options.context.bench.controlSites.find((candidate) => candidate.siteKey === control.sourceSiteKey);
    if (!site) {
      throw new Error(`${options.context.bench.benchId}: ${side} control cites unknown source site ${control.sourceSiteKey}`);
    }
    assertExactStringSet(
      site.sourceConditionKeys,
      control.sourceConditionKeys,
      `${options.context.bench.benchId}/${site.siteKey}/${control.instanceKey} ${side} source conditions`
    );
    const targets = new Map(site.endpointTargets.map((target) => [target.key, target]));
    const counts = new Map<string, number>();
    const identities = new Set<string>();
    for (const endpoint of control.sourceEndpoints) {
      if (!targets.has(endpoint.sourceTargetKey)) {
        throw new Error(
          `${options.context.bench.benchId}/${site.siteKey}: ${side} endpoint cites unknown source target ` +
          endpoint.sourceTargetKey
        );
      }
      if (!endpoint.instanceKey || endpoint.value === "") {
        throw new Error(`${options.context.bench.benchId}/${site.siteKey}: ${side} endpoint identity/value is empty`);
      }
      const identity = stableJson(endpoint);
      if (identities.has(identity)) throw new Error(`${options.context.bench.benchId}/${site.siteKey}: duplicate ${side} endpoint`);
      identities.add(identity);
      counts.set(endpoint.sourceTargetKey, (counts.get(endpoint.sourceTargetKey) ?? 0) + 1);
    }
    for (const target of site.endpointTargets) {
      const count = counts.get(target.key) ?? 0;
      if (!target.multiplicityIsExact || count > target.expectedMultiplicity) {
        throw new Error(
          `${options.context.bench.benchId}/${site.siteKey}/${target.key}: ${side} endpoint count ` +
          `${count} exceeds the source-proven per-state ceiling ${target.expectedMultiplicity}`
        );
      }
    }
  };
  expected.forEach((control) => validateAgainstSource(control, "expected"));
  actual.forEach((control) => validateAgainstSource(control, "runtime"));
  for (const control of actual) {
    if (control.endpoints.length === 0) {
      if (control.kind !== "select" && control.kind !== "radio") {
        throw new Error(
          `${options.context.bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: ` +
          `${control.kind} cannot use an empty state-dependent endpoint set`
        );
      }
      if (!control.disabled) {
        throw new Error(
          `${options.context.bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: ` +
          "a source-inactive empty endpoint control must remain disabled in the learner surface"
        );
      }
    }
  }
  for (const [side, controls] of [["expected", expected], ["runtime", actual]] as const) {
    for (const control of controls) {
      if (control.endpoints.length !== control.sourceEndpoints.length) {
        throw new Error(
          `${options.context.bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: ${side} ` +
          `activation/source endpoint cardinality ${control.endpoints.length}/${control.sourceEndpoints.length}`
        );
      }
      if (new Set(control.endpoints).size !== control.endpoints.length) {
        throw new Error(
          `${options.context.bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: ${side} ` +
          "contains duplicate activation endpoints, so source-target attribution is ambiguous"
        );
      }
    }
  }
  const canonical = (control: {
    endpoints: readonly string[];
    instanceKey: string;
    kind: CaliforniaSignatureRuntimeControlKind;
    numericMidpoint: CaliforniaSignatureResolvedNumericEndpoints | null;
    sourceConditionKeys: readonly string[];
    sourceEndpoints: readonly CaliforniaSignatureRuntimeEndpoint[];
    sourceSiteKey: string;
  }) => stableJson({
    endpointPairs: control.endpoints.map((endpoint, index) => ({
      endpoint,
      sourceEndpoint: control.sourceEndpoints[index]
    })).sort((left, right) => stableJson(left).localeCompare(stableJson(right))),
    instanceKey: control.instanceKey,
    kind: control.kind,
    numericMidpoint: control.numericMidpoint,
    sourceConditionKeys: [...control.sourceConditionKeys].sort(),
    sourceSiteKey: control.sourceSiteKey
  });
  const expectedKeys = expected.map(canonical);
  const actualKeys = actual.map(canonical);
  if (new Set(expectedKeys).size !== expectedKeys.length) {
    throw new Error(`${options.context.bench.benchId}/${options.context.stepKey}: source IR contains duplicate expected controls`);
  }
  if (new Set(actualKeys).size !== actualKeys.length) {
    throw new Error(`${options.context.bench.benchId}/${options.context.stepKey}: runtime contains duplicate attributed controls`);
  }
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  const missing = expectedKeys.filter((key) => !actualSet.has(key));
  const extra = actualKeys.filter((key) => !expectedSet.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${options.context.bench.benchId}/${options.context.stepKey}: source expected vs runtime actual is not exact; ` +
      `missing=${JSON.stringify(missing.slice(0, 6))}; extra=${JSON.stringify(extra.slice(0, 6))}`
    );
  }
  return actual;
}

async function firstExactControlForSite(root: Locator, siteKey: string) {
  const instances = await root
    .locator(`button[${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}],input[${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}]`)
    .evaluateAll((elements, input) => elements
      .filter((element) => element.getAttribute(input.site) === input.siteKey)
      .map((element) => ({
        disabled: (element as HTMLButtonElement | HTMLInputElement).disabled,
        instanceKey: element.getAttribute(input.instance) ?? "",
        visible: element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0
      }))
      .filter((entry) => !entry.disabled && entry.visible && entry.instanceKey)
      .map((entry) => entry.instanceKey)
      .sort(), {
        instance: CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
        site: CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE,
        siteKey
      });
  if (instances.length === 0) {
    throw new Error(`generic traversal impossible; source site ${siteKey} has no visible enabled exact runtime instance`);
  }
  return exactControlLocator(root, siteKey, instances[0]);
}

async function answerCurrentQuestion(root: Locator, contract: CaliforniaSignatureNavigationContract) {
  const answer = await firstExactControlForSite(root, contract.answerSiteKey);
  await answer.click({ timeout: CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS });
}

async function openBenchAtStep(options: {
  axis: CaliforniaQaAxis;
  bench: CaliforniaSignatureBenchControlBlueprint;
  page: Page;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  visit: CaliforniaBenchVisit;
}) {
  const deadline = new CaliforniaVisitDeadline(
    options.page,
    Date.now(),
    CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS
  );
  const contract = await options.sourceExpectedProvider.navigationContract(options.bench);
  const sourceSiteKeys = new Set(options.bench.controlSites.map((site) => site.siteKey));
  for (const [role, siteKey] of Object.entries(contract)) {
    if (!sourceSiteKeys.has(siteKey)) {
      throw new Error(`${options.bench.benchId}: source IR ${role} is misattributed to ${siteKey}`);
    }
  }
  if (new Set(Object.values(contract)).size !== 3) {
    throw new Error(`${options.bench.benchId}: source IR lesson navigation roles must use three distinct source sites`);
  }
  const startedAt = Date.now();
  const opened = await deadline.run("open-directory-lab", () =>
    openCaliforniaDirectoryLab(options.page, options.visit.lab, () => deadline.remainingTimeout("open-directory-lab"))
  );
  const bench = await deadline.run("open-signature-bench", () =>
    openSignatureBench(opened.panel, opened.switcher, options.bench.benchId,
      () => deadline.remainingTimeout("open-signature-bench"))
  );
  await disableQaMotion(options.page);
  if (Date.now() - startedAt > CALIFORNIA_SIGNATURE_HARD_UX_BUDGET_MS) {
    throw new Error(
      `${options.bench.benchId}: learner surface exceeded the hard ${CALIFORNIA_SIGNATURE_HARD_UX_BUDGET_MS}ms UX budget`
    );
  }
  return { ...bench, contract, deadline, switcher: opened.switcher };
}

async function reachLessonStep(options: {
  axis: CaliforniaQaAxis;
  bench: CaliforniaSignatureBenchControlBlueprint;
  page: Page;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  stepIndex: number;
  visit: CaliforniaBenchVisit;
}) {
  const opened = await openBenchAtStep(options);
  for (let index = 0; index <= options.stepIndex; index += 1) {
    await assertLessonStep(opened.signatureLab, options.bench, index);
    const actual = await snapshotCaliforniaSignatureRuntimeControls(opened.signatureLab, options.bench);
    await assertCaliforniaSignatureSourceExpectedRuntimeExact({
      actual,
      context: {
        bench: options.bench,
        branchPath: [],
        stepKey: options.bench.lessonSteps[index].key
      },
      provider: options.sourceExpectedProvider
    });
    if (index === options.stepIndex) break;
    await answerCurrentQuestion(opened.signatureLab, opened.contract);
    const next = await firstExactControlForSite(opened.signatureLab, opened.contract.nextSiteKey);
    await next.click({ timeout: opened.deadline.remainingTimeout(`lesson-next:${index}`) });
  }
  return opened;
}

async function reachLessonStepOnMountedBench(options: {
  bench: CaliforniaSignatureBenchControlBlueprint;
  contract: CaliforniaSignatureNavigationContract;
  deadline: CaliforniaVisitDeadline;
  signatureLab: Locator;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  stepIndex: number;
}) {
  for (let index = 0; index <= options.stepIndex; index += 1) {
    await assertLessonStep(options.signatureLab, options.bench, index);
    await assertCaliforniaSignatureSourceExpectedRuntimeExact({
      actual: await snapshotCaliforniaSignatureRuntimeControls(options.signatureLab, options.bench),
      context: {
        bench: options.bench,
        branchPath: [],
        stepKey: options.bench.lessonSteps[index].key
      },
      provider: options.sourceExpectedProvider
    });
    if (index === options.stepIndex) return;
    await answerCurrentQuestion(options.signatureLab, options.contract);
    const next = await firstExactControlForSite(options.signatureLab, options.contract.nextSiteKey);
    await next.click({ timeout: options.deadline.remainingTimeout(`mounted-lesson-next:${index}`) });
  }
}

async function deterministicModelFingerprint(root: Locator) {
  const capture = () => root.evaluate((element) => {
    const hash = (value: string) => {
      let result = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
      }
      return (result >>> 0).toString(16).padStart(8, "0");
    };
    const visible = (target: Element) => {
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const controls = Array.from(element.querySelectorAll<HTMLElement>("button,input,select,textarea"))
      .filter(visible)
      .map((target) => {
        const control = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        return [
          target.getAttribute("data-ca-source-site-key"),
          target.getAttribute("data-ca-source-instance-key"),
          target.tagName,
          target.getAttribute("type"),
          "value" in control ? control.value : null,
          target instanceof HTMLInputElement && ["checkbox", "radio"].includes(target.type) ? target.checked : null,
          target.getAttribute("aria-pressed"),
          (target as HTMLButtonElement).disabled ?? false
        ];
      })
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    const semantics = Array.from(element.querySelectorAll<HTMLElement>(
      "[data-viz-math-state],[data-viz-model-state],[data-viz-result],[data-viz-value],output,[aria-live],h2,p"
    )).filter(visible).map((target) => [
      target.tagName,
      Array.from(target.attributes)
        .filter((attribute) => attribute.name.startsWith("data-viz-") || attribute.name === "aria-live")
        .map((attribute) => [attribute.name, attribute.value]).sort(),
      (target.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300)
    ]);
    type CanvasApi = { signature(root: HTMLElement): { canvasCount: number; signature: string }; version: number };
    const audit = (window as Window & { __californiaCanvasTextAudit?: CanvasApi }).__californiaCanvasTextAudit;
    const canvas = audit?.version === 4 ? audit.signature(element as HTMLElement) : { canvasCount: -1, signature: "missing" };
    const svgs = Array.from(element.querySelectorAll<SVGSVGElement>("svg")).filter(visible)
      .map((svg) => [svg.getAttribute("viewBox"), hash(svg.outerHTML)]);
    return JSON.stringify({ canvas, controls, semantics, svgs });
  });
  const startedAt = Date.now();
  let previous = "";
  let identical = 0;
  while (Date.now() - startedAt <= 2_000) {
    const current = await capture();
    identical = current === previous ? identical + 1 : 1;
    if (identical >= 3) return sha256(current);
    previous = current;
    await root.page().waitForTimeout(50);
  }
  throw new Error("deterministic model response did not settle to three identical fingerprints within 2s");
}

async function activateCaliforniaSignatureEndpoint(options: {
  bench: CaliforniaSignatureBenchControlBlueprint;
  control: CaliforniaSignatureRuntimeControl;
  endpoint: string;
  navigation: CaliforniaSignatureNavigationContract;
  root: Locator;
  sourceExpectedContext: CaliforniaSignatureSourceExpectedContext;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
}) {
  const { bench, control, endpoint, navigation, root } = options;
  let target = exactControlLocator(root, control.sourceSiteKey, control.instanceKey);
  await expect(target).toHaveCount(1, { timeout: CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS });
  if (control.sourceSiteKey === navigation.nextSiteKey && await target.isDisabled()) {
    await answerCurrentQuestion(root, navigation);
    target = exactControlLocator(root, control.sourceSiteKey, control.instanceKey);
  }
  if (control.sourceSiteKey === navigation.answerSiteKey && await target.isDisabled()) {
    throw new Error(`${bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: answer endpoint baseline is already answered`);
  }
  if (await target.isDisabled()) {
    throw new Error(`${bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}: endpoint ${endpoint} is disabled after exact replay`);
  }
  switch (control.kind) {
    case "action-button":
      await target.click();
      return;
    case "press-button":
      await target.click();
      if (endpoint === "restore") await target.click();
      return;
    case "range":
    case "number": {
      const site = sourceSitesByKey(bench).get(control.sourceSiteKey);
      const values = resolveCaliforniaSignatureNumericEndpoints(
        site?.numericMidpoint ?? null,
        control.min,
        control.max,
        control.step,
        `${bench.benchId}/${control.sourceSiteKey}/${control.instanceKey}`
      );
      const value = endpoint === "min" ? values.min : endpoint === "mid" ? values.mid :
        endpoint === "max" ? values.max : null;
      if (typeof value !== "string") {
        throw new Error(`${bench.benchId}: ${endpoint} endpoint has no value`);
      }
      await target.fill(value);
      await expect(target).toHaveValue(value);
      return;
    }
    case "checkbox": {
      const checked = endpoint === "true";
      await target.setChecked(checked);
      await expect(target).toBeChecked({ checked });
      return;
    }
    case "select": {
      const value = endpoint.slice("option:".length);
      await target.selectOption({ value });
      await expect(target).toHaveValue(value);
      return;
    }
    case "radio": {
      const value = endpoint.slice("option:".length);
      const peer = root.locator(
        `xpath=.//input[@type='radio' and @name=${xpathLiteral(control.name)} and @value=${xpathLiteral(value)} and ` +
        `@${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${xpathLiteral(control.sourceSiteKey)}]`
      );
      await expect(peer).toHaveCount(1);
      await peer.check();
      await expect(peer).toBeChecked();
      return;
    }
    case "textarea": {
      const length = endpoint === "minimum" ? control.minLength : control.maxLength;
      await target.fill("7".repeat(length));
      await expect(target).toHaveValue("7".repeat(length));
      return;
    }
    case "interaction-surface":
      await options.sourceExpectedProvider.activateNonFormEndpoint({
        context: options.sourceExpectedContext,
        control,
        endpoint,
        root
      });
      return;
  }
}

async function replayPath(options: {
  bench: CaliforniaSignatureBenchControlBlueprint;
  navigation: CaliforniaSignatureNavigationContract;
  path: readonly CaliforniaSignatureReplayStep[];
  root: Locator;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  stepKey: string;
}) {
  const replayed: CaliforniaSignatureReplayStep[] = [];
  for (const replay of options.path) {
    const rawControls = await snapshotCaliforniaSignatureRuntimeControls(options.root, options.bench);
    const controls = await assertCaliforniaSignatureSourceExpectedRuntimeExact({
      actual: rawControls,
      context: { bench: options.bench, branchPath: replayed, stepKey: options.stepKey },
      provider: options.sourceExpectedProvider
    });
    const control = controls.find((candidate) =>
      candidate.sourceSiteKey === replay.sourceSiteKey && candidate.instanceKey === replay.instanceKey
    );
    if (!control) {
      throw new Error(
        `${options.bench.benchId}: generic traversal impossible; exact branch replay lost ` +
        `${replay.sourceSiteKey}/${replay.instanceKey}/${replay.endpoint}`
      );
    }
    const replayEndpointIndex = control.endpoints.indexOf(replay.endpoint);
    const runtimeSourceEndpoint = replayEndpointIndex >= 0
      ? control.sourceEndpoints[replayEndpointIndex]
      : undefined;
    if (!runtimeSourceEndpoint || stableJson(runtimeSourceEndpoint) !== stableJson(replay.sourceEndpoint)) {
      throw new Error(
        `${options.bench.benchId}: generic traversal impossible; exact branch replay source endpoint drifted ` +
        `${replay.sourceSiteKey}/${replay.instanceKey}/${replay.endpoint}; ` +
        `expected=${stableJson(replay.sourceEndpoint)} actual=${stableJson(runtimeSourceEndpoint ?? null)}`
      );
    }
    await activateCaliforniaSignatureEndpoint({
      bench: options.bench,
      control,
      endpoint: replay.endpoint,
      navigation: options.navigation,
      root: options.root,
      sourceExpectedContext: { bench: options.bench, branchPath: replayed, stepKey: options.stepKey },
      sourceExpectedProvider: options.sourceExpectedProvider
    });
    await options.sourceExpectedProvider.settleEndpoint({
      context: { bench: options.bench, branchPath: replayed, stepKey: options.stepKey },
      control,
      endpoint: replay.endpoint,
      root: options.root
    });
    replayed.push(replay);
  }
}

export type CaliforniaSignatureActiveEndpointPair = {
  endpoint: string;
  sourceEndpoint: CaliforniaSignatureRuntimeEndpoint;
};

/**
 * Resolve authored activity without consulting runtime disabled state, labels,
 * DOM order, or geometry. Exact endpoints are unique, so an active endpoint
 * string identifies exactly one endpoint/source-target pair.
 */
export async function resolveCaliforniaSignatureActiveEndpointPairs(options: {
  context: CaliforniaSignatureSourceExpectedContext;
  control: CaliforniaSignatureRuntimeControl;
  provider: CaliforniaSignatureSourceExpectedProvider;
}): Promise<CaliforniaSignatureActiveEndpointPair[]> {
  const { context, control } = options;
  const activeEndpoints = await options.provider.activeEndpoints({ context, control });
  if (new Set(activeEndpoints).size !== activeEndpoints.length) {
    throw new Error(
      `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
      "source IR repeats an active endpoint"
    );
  }
  if (new Set(control.endpoints).size !== control.endpoints.length) {
    throw new Error(
      `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
      "exact endpoint contract is ambiguous"
    );
  }
  if (control.endpoints.length !== control.sourceEndpoints.length) {
    throw new Error(
      `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
      `activation/source endpoint cardinality ${control.endpoints.length}/${control.sourceEndpoints.length}`
    );
  }
  return activeEndpoints.map((endpoint) => {
    const endpointIndex = control.endpoints.indexOf(endpoint);
    if (endpointIndex < 0) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
        `source IR declares unknown active endpoint ${endpoint}`
      );
    }
    const sourceEndpoint = control.sourceEndpoints[endpointIndex];
    if (!sourceEndpoint) {
      throw new Error(
        `${context.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}/${endpoint}: ` +
        "active endpoint lacks its exact source-target pair"
      );
    }
    return { endpoint, sourceEndpoint };
  });
}

/**
 * Enumerate a fixed point of every select/radio/aria-pressed branch. The path
 * itself uses exact source-site and keyed-instance identities; DOM index and
 * localized labels never participate.
 */
export async function discoverCaliforniaSignatureEndpointCases(options: {
  axis: CaliforniaQaAxis;
  bench: CaliforniaSignatureBenchControlBlueprint;
  page: Page;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  stepIndex: number;
  visit: CaliforniaBenchVisit;
}) {
  const queue: CaliforniaSignatureReplayStep[][] = [[]];
  const seenStates = new Set<string>();
  const endpointCases = new Map<string, EndpointCase>();
  while (queue.length > 0) {
    if (seenStates.size >= CALIFORNIA_SIGNATURE_MAX_BRANCH_STATES_PER_STEP) {
      throw new Error(
        `${options.bench.benchId}/${options.bench.lessonSteps[options.stepIndex].key}: generic traversal impossible; ` +
        `branch graph exceeds ${CALIFORNIA_SIGNATURE_MAX_BRANCH_STATES_PER_STEP} exact states`
      );
    }
    const pathToState = queue.shift()!;
    const opened = await reachLessonStep(options);
    const state = await opened.deadline.run("discover-exact-branch-state", async () => {
      await replayPath({
        bench: options.bench,
        navigation: opened.contract,
        path: pathToState,
        root: opened.signatureLab,
        sourceExpectedProvider: options.sourceExpectedProvider,
        stepKey: options.bench.lessonSteps[options.stepIndex].key
      });
      const fingerprint = await deterministicModelFingerprint(opened.signatureLab);
      const rawControls = await snapshotCaliforniaSignatureRuntimeControls(opened.signatureLab, options.bench);
      const controls = await assertCaliforniaSignatureSourceExpectedRuntimeExact({
        actual: rawControls,
        context: {
          bench: options.bench,
          branchPath: pathToState,
          stepKey: options.bench.lessonSteps[options.stepIndex].key
        },
        provider: options.sourceExpectedProvider
      });
      return { controls, fingerprint };
    });
    const { controls, fingerprint } = state;
    const context: CaliforniaSignatureSourceExpectedContext = {
      bench: options.bench,
      branchPath: pathToState,
      stepKey: options.bench.lessonSteps[options.stepIndex].key
    };
    const controlsWithActivity = await opened.deadline.run("resolve-source-active-endpoints", () =>
      Promise.all(controls.map(async (control) => ({
        activePairs: await resolveCaliforniaSignatureActiveEndpointPairs({
          context,
          control,
          provider: options.sourceExpectedProvider
        }),
        control
      })))
    );
    const authoredStateIdentity = stableJson({
      active: controlsWithActivity.map(({ activePairs, control }) => ({
        activePairs,
        instanceKey: control.instanceKey,
        sourceConditionKeys: control.sourceConditionKeys,
        sourceSiteKey: control.sourceSiteKey
      })),
      fingerprint
    });
    if (seenStates.has(authoredStateIdentity)) continue;
    seenStates.add(authoredStateIdentity);
    for (const { activePairs, control } of controlsWithActivity) {
      if (!control.visible && activePairs.length > 0) {
        throw new Error(
          `${options.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
          "source-active endpoints are not visible in the runtime learner surface"
        );
      }
      if (!control.visible) continue;
      const canPrepare = control.sourceSiteKey === opened.contract.nextSiteKey ||
        control.sourceSiteKey === opened.contract.answerSiteKey;
      if (control.disabled && !canPrepare && activePairs.length > 0) {
        throw new Error(
          `${options.bench.benchId}/${context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
          "source-active endpoints are disabled in the runtime learner surface"
        );
      }
      if (control.disabled && !canPrepare) continue;
      for (const { endpoint, sourceEndpoint } of activePairs) {
        const caseKey = stableJson({
          endpoint,
          instanceKey: control.instanceKey,
          path: pathToState,
          sourceEndpoint,
          sourceSiteKey: control.sourceSiteKey
        });
        endpointCases.set(caseKey, { control, endpoint, path: pathToState, sourceEndpoint });
      }
      if (control.disabled) continue;
      const exactBranchEndpoints = await options.sourceExpectedProvider.branchEndpoints({
        context,
        control
      });
      if (new Set(exactBranchEndpoints).size !== exactBranchEndpoints.length) {
        throw new Error(`${options.bench.benchId}/${control.sourceSiteKey}: source IR repeats a branch endpoint`);
      }
      const activeEndpointSet = new Set(activePairs.map((pair) => pair.endpoint));
      for (const endpoint of exactBranchEndpoints) {
        const endpointIndex = control.endpoints.indexOf(endpoint);
        if (endpointIndex < 0) {
          throw new Error(
            `${options.bench.benchId}/${control.sourceSiteKey}: source IR branch endpoint ${endpoint} ` +
            "is absent from the exact endpoint contract"
          );
        }
        if (!activeEndpointSet.has(endpoint)) {
          throw new Error(
            `${options.bench.benchId}/${control.sourceSiteKey}: source IR branch endpoint ${endpoint} ` +
            "is inactive in the authored lesson/branch state"
          );
        }
        queue.push([...pathToState, {
          endpoint,
          instanceKey: control.instanceKey,
          sourceEndpoint: control.sourceEndpoints[endpointIndex],
          sourceSiteKey: control.sourceSiteKey
        }]);
      }
    }
  }
  return [...endpointCases.values()].sort((left, right) => stableJson(left).localeCompare(stableJson(right)));
}

async function resolveCaliforniaSignatureCombinationActivation(options: {
  activation: CaliforniaSignatureSourceEvidenceOracleCombinationActivation;
  bench: CaliforniaSignatureBenchControlBlueprint;
  context: CaliforniaSignatureSourceExpectedContext;
  root: Locator;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
}) {
  const controls = await assertCaliforniaSignatureSourceExpectedRuntimeExact({
    actual: await snapshotCaliforniaSignatureRuntimeControls(options.root, options.bench),
    context: options.context,
    provider: options.sourceExpectedProvider
  });
  const matches = controls.filter((control) =>
    control.sourceSiteKey === options.activation.sourceSiteKey &&
    control.instanceKey === options.activation.instanceKey
  );
  if (matches.length !== 1) {
    throw new Error(
      `${options.bench.benchId}/${options.context.stepKey}: exact combination resolves ${matches.length} ` +
      `controls for ${options.activation.sourceSiteKey}/${options.activation.instanceKey}`
    );
  }
  const control = matches[0]!;
  assert.equal(control.kind, options.activation.controlKind,
    `${options.bench.benchId}/${options.context.stepKey}: combination control kind drifted`);
  assert.deepEqual(control.numericMidpoint, options.activation.numericMidpoint,
    `${options.bench.benchId}/${options.context.stepKey}: combination numeric reachability drifted`);
  assertExactStringSet(
    options.activation.sourceConditionKeys,
    control.sourceConditionKeys,
    `${options.bench.benchId}/${options.context.stepKey}: combination source conditions`
  );
  if (!control.visible || control.disabled) {
    throw new Error(
      `${options.bench.benchId}/${options.context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
      "combination activation is no longer a visible enabled learner control"
    );
  }
  const activePairs = await resolveCaliforniaSignatureActiveEndpointPairs({
    context: options.context,
    control,
    provider: options.sourceExpectedProvider
  });
  const exact = activePairs.find((pair) =>
    pair.endpoint === options.activation.activationEndpoint &&
    stableJson(pair.sourceEndpoint) === stableJson(options.activation.sourceEndpoint)
  );
  if (!exact) {
    throw new Error(
      `${options.bench.benchId}/${options.context.stepKey}/${control.sourceSiteKey}/${control.instanceKey}: ` +
      `combination endpoint ${options.activation.activationEndpoint} lost exact source identity ` +
      stableJson(options.activation.sourceEndpoint)
    );
  }
  return control;
}

type CaliforniaSignatureEvidenceIdentityInput = Omit<
  CaliforniaSignatureExactEvidenceRecord,
  "canvasGraphicsEvidenceSha256" | "combinationActivations" | "key" |
  "layoutSettleEvidenceSha256" | "numericMidpoint" | "resetEvidence" | "resetEvidenceSha256"
> & Partial<Pick<CaliforniaSignatureExactEvidenceRecord,
  "combinationActivations" | "numericMidpoint" | "resetEvidence"
>>;

function evidenceKey(record: CaliforniaSignatureEvidenceIdentityInput) {
  return sha256(stableJson({
    axisId: record.axisId,
    benchId: record.benchId,
    branchPath: record.branchPath,
    combinationActivations: record.combinationActivations ?? null,
    endpoint: record.endpoint,
    instanceKey: record.instanceKey,
    labId: record.labId,
    numericMidpoint: record.numericMidpoint ?? null,
    phase: record.phase,
    sourceSiteKey: record.sourceSiteKey,
    sourceEndpoint: record.sourceEndpoint,
    stepKey: record.stepKey
  }));
}

function californiaSignatureAxesForOraclePhase(
  phase: CaliforniaSignatureSourceEvidenceOraclePhase
) {
  return phase === "functional"
    ? [CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID]
    : phase === "layout"
      ? CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS
      : CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS;
}

/**
 * Project a runtime evidence record onto the independent source-oracle core.
 * Phase, axis, lab, receipt and route fields are deliberately excluded here;
 * the caller expands and verifies those independently.
 */
export function californiaSignaturePhaseIndependentOracleRowKeyFromRecord(options: {
  manifest: CaliforniaSignatureSourceManifest;
  record: Pick<CaliforniaSignatureExactEvidenceRecord,
    "benchId" | "branchPath" | "combinationActivations" | "endpoint" | "instanceKey" |
    "numericMidpoint" | "sourceEndpoint" | "sourceSiteKey" | "stepKey">;
}) {
  const bench = options.manifest.benches.find((candidate) =>
    candidate.benchId === options.record.benchId
  );
  assert.ok(bench, `source-oracle projection references unknown bench ${options.record.benchId}`);
  const site = options.record.sourceSiteKey === null
    ? null
    : bench.controlSites.find((candidate) => candidate.siteKey === options.record.sourceSiteKey) ?? null;
  if (options.record.sourceSiteKey !== null) {
    assert.ok(site,
      `${options.record.benchId}: source-oracle projection references unknown site ${options.record.sourceSiteKey}`);
  }
  const rowKind: CaliforniaSignatureSourceEvidenceOracleRow["rowKind"] =
    options.record.combinationActivations !== null
      ? "combination"
      : options.record.sourceSiteKey === null
      ? "authored-state"
      : options.record.endpoint === null ? "control" : "endpoint";
  if (rowKind === "combination") {
    assert.equal(options.record.combinationActivations?.length, 2,
      `${options.record.benchId}/${options.record.stepKey}: combination lacks two exact activations`);
    assert.equal(options.record.numericMidpoint, null,
      `${options.record.benchId}/${options.record.stepKey}: combination carries a singular midpoint audit`);
  } else {
    assert.equal(options.record.combinationActivations, null,
      `${options.record.benchId}/${options.record.stepKey}: non-combination row carries combination activations`);
  }
  if (rowKind === "authored-state" || rowKind === "combination") {
    assert.equal(options.record.instanceKey, null,
      `${options.record.benchId}/${options.record.stepKey}: ${rowKind} has a control instance`);
    assert.equal(options.record.sourceEndpoint, null,
      `${options.record.benchId}/${options.record.stepKey}: ${rowKind} has a singular source endpoint`);
    assert.equal(options.record.sourceSiteKey, null,
      `${options.record.benchId}/${options.record.stepKey}: ${rowKind} has a singular source site`);
  } else {
    assert.ok(options.record.instanceKey,
      `${options.record.benchId}/${options.record.stepKey}: source control has no instance`);
  }
  if (rowKind === "endpoint") {
    assert.ok(options.record.endpoint,
      `${options.record.benchId}/${options.record.stepKey}: source endpoint has no activation endpoint`);
    assert.ok(options.record.sourceEndpoint,
      `${options.record.benchId}/${options.record.stepKey}: source endpoint has no target identity`);
  } else {
    assert.equal(options.record.sourceEndpoint, null,
      `${options.record.benchId}/${options.record.stepKey}: non-endpoint row carries a source endpoint`);
  }
  return californiaSignatureSourceEvidenceOracleRowKey({
    activationEndpoint: options.record.endpoint,
    benchId: options.record.benchId,
    branchPath: options.record.branchPath,
    combinationActivations: options.record.combinationActivations,
    controlKind: site?.kind ?? null,
    instanceKey: options.record.instanceKey,
    numericMidpoint: options.record.numericMidpoint,
    rowKind,
    sourceConditionKeys: rowKind === "combination"
      ? [...new Set(options.record.combinationActivations!.flatMap(
          (activation) => activation.sourceConditionKeys
        ))].sort()
      : site?.sourceConditionKeys ?? [],
    sourceEndpoint: options.record.sourceEndpoint,
    sourceSiteKey: options.record.sourceSiteKey,
    stepKey: options.record.stepKey
  });
}

function californiaSignatureExpandedOracleKey(options: {
  axisId: string;
  oracleRowKey: string;
  phase: CaliforniaSignatureSourceEvidenceOraclePhase;
}) {
  return sha256(stableJson(options));
}

export function californiaSignatureExpandedOracleKeyFromRecord(options: {
  manifest: CaliforniaSignatureSourceManifest;
  record: Pick<CaliforniaSignatureExactEvidenceRecord,
    "axisId" | "benchId" | "branchPath" | "combinationActivations" | "endpoint" |
    "instanceKey" | "numericMidpoint" | "phase" | "sourceEndpoint" | "sourceSiteKey" | "stepKey">;
}) {
  return californiaSignatureExpandedOracleKey({
    axisId: options.record.axisId,
    oracleRowKey: californiaSignaturePhaseIndependentOracleRowKeyFromRecord({
      manifest: options.manifest,
      record: options.record
    }),
    phase: options.record.phase
  });
}

function californiaSignatureSourceRowOrderKey(options: {
  axisId: string;
  manifest: CaliforniaSignatureSourceManifest;
  oracleRowKey: string;
  phase: CaliforniaSignatureSourceEvidenceOraclePhase;
  rowKind: CaliforniaSignatureSourceEvidenceOracleRow["rowKind"];
  benchId: string;
  stepKey: string;
}) {
  const benchIndex = options.manifest.benches.findIndex((bench) => bench.benchId === options.benchId);
  assert.ok(benchIndex >= 0, `California signature evidence order lost bench ${options.benchId}`);
  const phaseOrder = { functional: "0", layout: "1", structural: "2" } as const;
  const rowKindOrder = {
    "authored-state": "0",
    control: "1",
    endpoint: "2",
    combination: "3"
  } as const;
  return [
    String(benchIndex).padStart(3, "0"),
    options.axisId,
    phaseOrder[options.phase],
    options.stepKey,
    rowKindOrder[options.rowKind],
    options.oracleRowKey
  ].join("\0");
}

export function californiaSignatureExactEvidenceOrderKey(options: {
  manifest: CaliforniaSignatureSourceManifest;
  record: Pick<CaliforniaSignatureExactEvidenceRecord,
    "axisId" | "benchId" | "branchPath" | "combinationActivations" | "endpoint" |
    "instanceKey" | "numericMidpoint" | "phase" | "sourceEndpoint" | "sourceSiteKey" | "stepKey">;
}) {
  const rowKind: CaliforniaSignatureSourceEvidenceOracleRow["rowKind"] =
    options.record.combinationActivations !== null ? "combination" :
      options.record.sourceSiteKey === null ? "authored-state" :
        options.record.endpoint === null ? "control" : "endpoint";
  const oracleRowKey = californiaSignaturePhaseIndependentOracleRowKeyFromRecord({
    manifest: options.manifest,
    record: options.record
  });
  return californiaSignatureSourceRowOrderKey({
    axisId: options.record.axisId,
    benchId: options.record.benchId,
    manifest: options.manifest,
    oracleRowKey,
    phase: options.record.phase,
    rowKind,
    stepKey: options.record.stepKey
  });
}

export function* iterateCaliforniaSignatureExpandedSourceEvidenceOracle(options: {
  axisIds?: readonly string[];
  benchIds?: readonly string[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}): Generator<CaliforniaSignatureExpandedSourceEvidenceExpectation> {
  assert.equal(options.oracle.schemaVersion,
    CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
    "California signature source evidence oracle schema drifted");
  assert.equal(options.oracle.blueprintSha256, options.manifest.blueprintSha256,
    "California signature source evidence oracle blueprint drifted");
  assert.equal(options.oracle.componentSourceSha256, options.manifest.componentSourceSha256,
    "California signature source evidence oracle component identity drifted");
  const knownAxisIds = new Set([
    CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID,
    ...CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS,
    ...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS
  ]);
  const axisIds = options.axisIds ? new Set(options.axisIds) : null;
  if (axisIds) {
    assert.equal(axisIds.size, options.axisIds!.length,
      "California signature expanded source iterator repeats an axis");
    for (const axisId of axisIds) {
      assert.ok(knownAxisIds.has(axisId),
        `California signature expanded source iterator cites unknown axis ${axisId}`);
    }
  }
  let currentBenchId: string | null = null;
  let pending: CaliforniaSignatureExpandedSourceEvidenceExpectation[] = [];
  let previousOrderKey: string | null = null;
  const flush = function* () {
    pending.sort((left, right) => left.orderKey < right.orderKey ? -1 : left.orderKey > right.orderKey ? 1 : 0);
    for (const entry of pending) {
      assert.ok(previousOrderKey === null || previousOrderKey < entry.orderKey,
        `California signature expanded source stream is duplicate or retrograde at ${entry.orderKey}`);
      previousOrderKey = entry.orderKey;
      yield entry;
    }
    pending = [];
  };
  for (const row of iterateCaliforniaSignatureSourceEvidenceOracleRows({
    benchIds: options.benchIds,
    manifest: options.manifest,
    oracle: options.oracle
  })) {
    if (currentBenchId !== null && row.benchId !== currentBenchId) yield* flush();
    currentBenchId = row.benchId;
    const recomputed = californiaSignatureSourceEvidenceOracleRowKey({
      activationEndpoint: row.activationEndpoint,
      benchId: row.benchId,
      branchPath: row.branchPath,
      combinationActivations: row.combinationActivations,
      controlKind: row.controlKind,
      instanceKey: row.instanceKey,
      numericMidpoint: row.numericMidpoint,
      rowKind: row.rowKind,
      sourceConditionKeys: row.sourceConditionKeys,
      sourceEndpoint: row.sourceEndpoint,
      sourceSiteKey: row.sourceSiteKey,
      stepKey: row.stepKey
    });
    assert.equal(row.key, recomputed,
      `${row.benchId}/${row.stepKey}: source evidence oracle row key drifted`);
    assert.equal(new Set(row.phases).size, row.phases.length,
      `${row.benchId}/${row.stepKey}: source evidence oracle repeats a phase`);
    for (const requiredPhase of row.canvasSurface?.requiredPhases ?? []) {
      assert.ok(row.phases.includes(requiredPhase),
        `${row.benchId}/${row.stepKey}: Canvas receipt requires an absent row phase ${requiredPhase}`);
    }
    if (row.canvasSurface) {
      assert.equal(row.canvasSurface.canvasCount, row.canvasSurface.bindingKeys.length,
        `${row.benchId}/${row.stepKey}: source oracle Canvas count/bindings drifted`);
      assert.equal(new Set(row.canvasSurface.bindingKeys).size, row.canvasSurface.bindingKeys.length,
        `${row.benchId}/${row.stepKey}: source oracle repeats a Canvas binding`);
    }
    for (const phase of row.phases) {
      for (const axisId of californiaSignatureAxesForOraclePhase(phase)) {
        if (axisIds && !axisIds.has(axisId)) continue;
        const oracleRowKey = row.key;
        pending.push({
          axisId,
          benchId: row.benchId,
          canvasSurface: row.canvasSurface,
          key: californiaSignatureExpandedOracleKey({ axisId, oracleRowKey, phase }),
          orderKey: californiaSignatureSourceRowOrderKey({
            axisId,
            benchId: row.benchId,
            manifest: options.manifest,
            oracleRowKey,
            phase,
            rowKind: row.rowKind,
            stepKey: row.stepKey
          }),
          oracleRowKey,
          phase
        });
      }
    }
  }
  yield* flush();
}

export function californiaSignatureAxisIdsForProject(
  projectName: "desktop-chrome" | "mobile-chrome"
) {
  const prefix = projectName === "desktop-chrome" ? "desktop-" : "mobile-";
  return [...new Set([
    ...(projectName === "desktop-chrome" ? [CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID] : []),
    ...CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS.filter((axisId) => axisId.startsWith(prefix)),
    ...CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS.filter((axisId) => axisId.startsWith(prefix))
  ])].sort();
}

export type CaliforniaSignatureSourceExecutionGroup = {
  axisId: string;
  benchId: string;
  expectedRecordCount: number;
  phase: CaliforniaSignatureSourceEvidenceOraclePhase;
};

/**
 * The browser scheduler consumes this exact source-derived order.  It never
 * discovers groups from runtime records, and every group remains bounded to
 * one authored bench/axis/phase flush.
 */
export function buildCaliforniaSignatureSourceExecutionGroups(options: {
  benchIds: readonly string[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  projectName: "desktop-chrome" | "mobile-chrome";
}): CaliforniaSignatureSourceExecutionGroup[] {
  assert.ok(options.benchIds.length > 0,
    "California signature source execution schedule has no benches");
  assert.equal(new Set(options.benchIds).size, options.benchIds.length,
    "California signature source execution schedule repeats a bench");
  const expectedBenchOrder = options.manifest.benches
    .filter((bench) => options.benchIds.includes(bench.benchId))
    .map((bench) => bench.benchId);
  assert.deepEqual(options.benchIds, expectedBenchOrder,
    "California signature source execution schedule benches are not in manifest order");
  const groups: CaliforniaSignatureSourceExecutionGroup[] = [];
  for (const expectation of iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    axisIds: californiaSignatureAxisIdsForProject(options.projectName),
    benchIds: options.benchIds,
    manifest: options.manifest,
    oracle: options.oracle
  })) {
    const current = groups.at(-1);
    if (current && current.benchId === expectation.benchId &&
        current.axisId === expectation.axisId && current.phase === expectation.phase) {
      current.expectedRecordCount += 1;
    } else {
      groups.push({
        axisId: expectation.axisId,
        benchId: expectation.benchId,
        expectedRecordCount: 1,
        phase: expectation.phase
      });
    }
  }
  assert.ok(groups.length > 0,
    "California signature source execution schedule is empty");
  const maximumGroups = options.benchIds.length * (
    californiaSignatureAxisIdsForProject(options.projectName).length * 3
  );
  assert.ok(groups.length <= maximumGroups,
    `California signature source execution schedule exceeds bounded group cap ${maximumGroups}`);
  return groups;
}

/** Test-only bounded materializer. Production validation must consume the lazy iterator. */
export function expandCaliforniaSignatureSourceEvidenceOracle(options: {
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}, maxRows = 100_000): CaliforniaSignatureExpandedSourceEvidenceExpectation[] {
  const expanded: CaliforniaSignatureExpandedSourceEvidenceExpectation[] = [];
  for (const row of iterateCaliforniaSignatureExpandedSourceEvidenceOracle(options)) {
    if (expanded.length >= maxRows) {
      throw new Error(
        `California signature expanded oracle exceeds bounded materialization cap ${maxRows}; ` +
        "consume iterateCaliforniaSignatureExpandedSourceEvidenceOracle instead"
      );
    }
    expanded.push(row);
  }
  return expanded;
}

export function assertCaliforniaSignatureSourceOracleEvidenceMatrixExact(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}) {
  const expected = [...iterateCaliforniaSignatureExpandedSourceEvidenceOracle(options)];
  const actualKeys = options.evidence.map((record) => {
    const oracleRowKey = californiaSignaturePhaseIndependentOracleRowKeyFromRecord({
      manifest: options.manifest,
      record
    });
    return californiaSignatureExpandedOracleKey({
      axisId: record.axisId,
      oracleRowKey,
      phase: record.phase
    });
  });
  assertExactStringSet(
    expected.map((entry) => entry.key),
    actualKeys,
    "California signature independent source-oracle phase/axis matrix"
  );
  return expected;
}

export function digestCaliforniaSignatureLayoutSettleEvidence(
  evidence: CaliforniaSignatureLayoutSettleEvidence | null
) {
  return evidence === null ? null : sha256(stableJson(evidence));
}

function evidenceRecord(
  record: CaliforniaSignatureEvidenceIdentityInput
): CaliforniaSignatureExactEvidenceRecord {
  const normalized = {
    ...record,
    combinationActivations: record.combinationActivations ?? null,
    numericMidpoint: record.numericMidpoint ?? null,
    resetEvidence: record.resetEvidence ?? null
  };
  return {
    ...normalized,
    canvasGraphicsEvidenceSha256: normalized.canvasGraphicsEvidence?.evidenceSha256 ?? null,
    key: evidenceKey(normalized),
    layoutSettleEvidenceSha256: digestCaliforniaSignatureLayoutSettleEvidence(normalized.layoutSettleEvidence),
    resetEvidenceSha256: normalized.resetEvidence === null
      ? null
      : sha256(stableJson(normalized.resetEvidence))
  };
}

const californiaCanvasGraphicsSourceContract: CaliforniaCanvasGraphicsSourceContract =
  buildCaliforniaCanvasGraphicsSourceContract();

function californiaCanvasGraphicsStateKey(record: Pick<
  CaliforniaSignatureExactEvidenceRecord,
  "axisId" | "benchId" | "branchPath" | "endpoint" | "instanceKey" | "phase" |
  "sourceEndpoint" | "sourceSiteKey" | "stepKey"
> & Partial<Pick<CaliforniaSignatureExactEvidenceRecord,
  "combinationActivations" | "numericMidpoint"
>>) {
  return `${record.phase}-${sha256(stableJson({
    axisId: record.axisId,
    benchId: record.benchId,
    branchPath: record.branchPath,
    combinationActivations: record.combinationActivations ?? null,
    endpoint: record.endpoint,
    instanceKey: record.instanceKey,
    numericMidpoint: record.numericMidpoint ?? null,
    sourceEndpoint: record.sourceEndpoint,
    sourceSiteKey: record.sourceSiteKey,
    stepKey: record.stepKey
  })).slice(0, 24)}`;
}

function californiaSignatureCanvasGraphicsRequired(record: Pick<
  CaliforniaSignatureExactEvidenceRecord,
  "endpoint" | "phase"
> & Partial<Pick<CaliforniaSignatureExactEvidenceRecord, "combinationActivations">>) {
  return record.phase === "structural" ||
    (record.phase === "layout" && (
      record.endpoint !== null || (record.combinationActivations ?? null) !== null
    ));
}

export function* iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix(options: {
  benchIds?: readonly string[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}): Generator<CaliforniaSignatureCanvasReceiptExpectation> {
  for (const row of iterateCaliforniaSignatureSourceEvidenceOracleRows(options)) {
    const canvasSurface = row.canvasSurface;
    if (!canvasSurface) continue;
    for (const phase of canvasSurface.requiredPhases) {
      for (const axisId of californiaSignatureAxesForOraclePhase(phase)) {
        const stateKey = californiaCanvasGraphicsStateKey({
          axisId,
          benchId: row.benchId,
          branchPath: [...row.branchPath],
          combinationActivations: row.combinationActivations,
          endpoint: row.activationEndpoint,
          instanceKey: row.instanceKey,
          numericMidpoint: row.numericMidpoint,
          phase,
          sourceEndpoint: row.sourceEndpoint,
          sourceSiteKey: row.sourceSiteKey,
          stepKey: row.stepKey
        });
        yield {
          axisId,
          benchId: row.benchId,
          bindingKeys: [...canvasSurface.bindingKeys].sort(),
          canvasCount: canvasSurface.canvasCount,
          key: californiaSignatureExpandedOracleKey({ axisId, oracleRowKey: row.key, phase }),
          oracleRowKey: row.key,
          phase,
          stateKey,
          surfaceKey: canvasSurface.surfaceKey
        };
      }
    }
  }
}

export function buildCaliforniaSignatureSourceOracleCanvasReceiptMatrix(options: {
  benchIds?: readonly string[];
  manifest: CaliforniaSignatureSourceManifest;
  oracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
}, maxRows = 100_000): CaliforniaSignatureCanvasReceiptExpectation[] {
  const expected: CaliforniaSignatureCanvasReceiptExpectation[] = [];
  for (const entry of iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix(options)) {
    if (expected.length >= maxRows) {
      throw new Error(
        `California signature Canvas receipt matrix exceeds bounded materialization cap ${maxRows}; ` +
        "consume iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix instead"
      );
    }
    expected.push(entry);
  }
  assert.equal(new Set(expected.map((entry) => entry.key)).size, expected.length,
    "California signature source-oracle Canvas matrix repeats a receipt row");
  return expected;
}

export function observeCaliforniaSignatureCanvasReceiptMatrix(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  manifest: CaliforniaSignatureSourceManifest;
}): CaliforniaSignatureCanvasReceiptObservation[] {
  return options.evidence.flatMap((record) => {
    const carriesCanvasReceipt = record.canvasGraphicsEvidence !== null ||
      record.canvasGraphicsContrastAck !== null || record.canvasGraphicsNodeAck !== null;
    if (!carriesCanvasReceipt) return [];
    assert.ok(record.canvasGraphicsEvidence,
      `${record.benchId}/${record.stepKey}: Canvas receipt observation has no source evidence`);
    const oracleRowKey = californiaSignaturePhaseIndependentOracleRowKeyFromRecord({
      manifest: options.manifest,
      record
    });
    return [{
      axisId: record.axisId,
      benchId: record.benchId,
      bindingKeys: record.canvasGraphicsEvidence.canvases.map((canvas) => canvas.bindingKey).sort(),
      canvasCount: record.canvasGraphicsEvidence.canvases.length,
      key: californiaSignatureExpandedOracleKey({
        axisId: record.axisId,
        oracleRowKey,
        phase: record.phase
      }),
      oracleRowKey,
      phase: record.phase,
      runtimeRunId: record.canvasGraphicsEvidence.runtimeRunId,
      stateKey: record.canvasGraphicsEvidence.stateKey,
      surfaceKey: record.canvasGraphicsEvidence.surfaceKey as "signature-canvas"
    }];
  });
}

export function assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact(options: {
  actual: readonly CaliforniaSignatureCanvasReceiptObservation[];
  expected: readonly CaliforniaSignatureCanvasReceiptExpectation[];
  expectedRuntimeRunId: string;
}) {
  const runtimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId(options.expectedRuntimeRunId);
  assertExactStringSet(
    options.expected.map((entry) => entry.key),
    options.actual.map((entry) => entry.key),
    "California signature source-oracle Canvas receipt row matrix"
  );
  const actualByKey = new Map(options.actual.map((entry) => [entry.key, entry]));
  for (const expected of options.expected) {
    const actual = actualByKey.get(expected.key);
    assert.ok(actual, `California signature Canvas receipt disappeared for ${expected.key}`);
    assert.equal(actual.runtimeRunId, runtimeRunId,
      `${expected.benchId}: Canvas receipt used a self-selected runtime run`);
    assert.deepEqual({
      axisId: actual.axisId,
      benchId: actual.benchId,
      bindingKeys: [...actual.bindingKeys].sort(),
      canvasCount: actual.canvasCount,
      key: actual.key,
      oracleRowKey: actual.oracleRowKey,
      phase: actual.phase,
      stateKey: actual.stateKey,
      surfaceKey: actual.surfaceKey
    }, expected, `${expected.benchId}: Canvas receipt count/binding/state expectation drifted`);
  }
  return { receiptRows: options.expected.length, runtimeRunId };
}

function assertCaliforniaCanvasGraphicsCapturedRoute(
  evidence: CaliforniaCanvasGraphicsStateEvidence,
  labId: string
) {
  const lab = californiaVisualizationQaInventory.labs.find((candidate) => candidate.labId === labId);
  assert.ok(lab, `Canvas graphics evidence references unknown California lab ${labId}`);
  const captured = new URL(evidence.capturedUrl);
  assert.equal(captured.pathname, "/student/tools/visualizations",
    `${labId}: Canvas graphics evidence used the wrong route`);
  assert.deepEqual([...captured.searchParams.keys()].sort(), ["grade", "lab", "track"],
    `${labId}: Canvas graphics evidence has missing, repeated, or extra query fields`);
  assert.equal(captured.searchParams.get("grade"), lab.grade);
  assert.equal(captured.searchParams.get("lab"), labId);
  assert.equal(captured.searchParams.get("track"), "all");
}

function assertCaliforniaSignatureOwnedUrl(options: {
  expectedOrigin: string;
  label: string;
  ownership: CaliforniaSignatureExpectedRouteOwnership;
  value: string;
}) {
  const captured = new URL(options.value);
  assert.equal(captured.origin, options.expectedOrigin,
    `${options.label}: evidence origin is not externally owned`);
  assert.equal(captured.pathname, options.ownership.pathname,
    `${options.label}: evidence route path is not externally owned`);
  assert.equal(captured.hash, "", `${options.label}: evidence route contains a fragment`);
  const actualParams = [...captured.searchParams.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const expectedParams = [...options.ownership.searchParams]
    .map((entry) => ({ ...entry }))
    .sort((left, right) => left.name.localeCompare(right.name));
  assert.deepEqual(actualParams, expectedParams,
    `${options.label}: evidence route query is not externally owned`);
}

/** Reject evidence that attempts to establish its own run, origin, or route. */
export function assertCaliforniaSignatureExternalEvidenceOwnership(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  expectations: CaliforniaSignatureExternalEvidenceExpectations;
  manifest: CaliforniaSignatureSourceManifest;
}) {
  const expectedOrigin = normalizeCaliforniaSignatureExpectedOrigin(
    options.expectations.expectedOrigin
  );
  assert.equal(expectedOrigin, options.expectations.expectedOrigin,
    "California signature external expected origin must already be canonical");
  const expectedRuntimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId(
    options.expectations.expectedRuntimeRunId
  );
  assertExactStringSet(
    options.manifest.benches.map((bench) => bench.benchId),
    options.expectations.routes.map((route) => route.benchId),
    "California signature external route ownership"
  );
  const routes = new Map(options.expectations.routes.map((route) => [route.benchId, route]));
  for (const route of options.expectations.routes) {
    assert.equal(route.pathname, "/student/tools/visualizations",
      `${route.benchId}: external route ownership cites an unsupported path`);
    assert.deepEqual(
      [...route.searchParams].map((entry) => entry.name).sort(),
      ["grade", "lab", "track"],
      `${route.benchId}: external route ownership fields are not exact`
    );
    assert.equal(route.searchParams.find((entry) => entry.name === "lab")?.value, route.labId,
      `${route.benchId}: external route ownership lab query drifted`);
    assert.equal(route.searchParams.find((entry) => entry.name === "track")?.value, "all",
      `${route.benchId}: external route ownership track drifted`);
  }
  for (const record of options.evidence) {
    const ownership = routes.get(record.benchId);
    assert.ok(ownership, `${record.benchId}: evidence has no external route owner`);
    assert.equal(record.labId, ownership.labId,
      `${record.benchId}: evidence selected its own lab ownership`);
    const urls = [
      record.canvasGraphicsEvidence?.capturedUrl,
      record.canvasGraphicsContrastAck?.capturedUrl,
      record.layoutSettleEvidence?.url
    ].filter((value): value is string => typeof value === "string");
    for (const [index, value] of urls.entries()) {
      assertCaliforniaSignatureOwnedUrl({
        expectedOrigin,
        label: `${record.benchId}/${record.stepKey}/url-${index}`,
        ownership,
        value
      });
    }
    const runtimeRunIds = [
      record.canvasGraphicsEvidence?.runtimeRunId,
      record.canvasGraphicsContrastAck?.runtimeRunId,
      record.canvasGraphicsNodeAck?.runtimeRunId
    ].filter((value): value is string => typeof value === "string");
    for (const runtimeRunId of runtimeRunIds) {
      assert.equal(runtimeRunId, expectedRuntimeRunId,
        `${record.benchId}/${record.stepKey}: evidence selected its own runtime run`);
    }
    if (record.canvasGraphicsEvidence) {
      assert.ok(record.canvasGraphicsEvidence.canvases.every((canvas) =>
        canvas.benchId === record.benchId
      ), `${record.benchId}/${record.stepKey}: Canvas evidence cites another bench owner`);
    }
    if (record.layoutSettleEvidence) {
      assert.equal(record.layoutSettleEvidence.contrastContext.benchId, record.benchId,
        `${record.benchId}/${record.stepKey}: contrast evidence cites another bench owner`);
    }
  }
  return {
    expectedOrigin,
    expectedRuntimeRunId,
    routeOwners: routes.size
  };
}

async function assertNoBrowserDiagnostics(diagnostics: CaliforniaBrowserDiagnostics, label: string) {
  const drained = (await diagnostics.drainAfterPending()).diagnostics;
  if (drained.length > 0) {
    throw new Error(`${label}: browser/network diagnostics: ${drained.map((item) => `${item.kind}:${item.detail}`).join(" | ")}`);
  }
}

export type CaliforniaCanvasGraphicsOneShotGateResult = {
  canvasGraphicsContrastAck: CaliforniaSignatureCanvasGraphicsContrastAck;
  canvasGraphicsEvidence: CaliforniaCanvasGraphicsStateEvidence;
  canvasGraphicsNodeAck: CaliforniaSignatureCanvasGraphicsNodeAck;
};

/**
 * Consume one Canvas graphics receipt on the exact root that produced it.
 *
 * Keep this sequence intentionally narrow. After exact Canvas contrast marks
 * every source receipt ready, the Canvas is first made fully viewport-visible;
 * `prepareFinalCompositor` then binds page and viewport geometry and authorizes
 * the screenshot pair around a terminal-raster identity check. Browser finalize rechecks all source,
 * URL, root, layout, and paint-mutation fences before issuing the ACK. Any
 * screenshot outside that prepare -> identity check -> finalize authorization,
 * or any unrelated I/O/control mutation within it, invalidates the one-shot gate.
 */
export async function runCaliforniaCanvasGraphicsOneShotGate(options: {
  benchId: string;
  contrastProvider: CaliforniaSignatureContrastProvider;
  graphicsSurface: Locator;
  runtimeRunId: string;
  state: string;
  viewport: CaliforniaQaAxis["viewport"];
}): Promise<CaliforniaCanvasGraphicsOneShotGateResult> {
  const page = options.graphicsSurface.page();
  const initialScroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  try {
  const canvases = options.graphicsSurface.locator("canvas");
  const canvasCount = await canvases.count();
  if (canvasCount !== 1) {
    throw new Error(
      `${options.benchId}/${options.state}: exact-root Canvas compositor requires one Canvas; ` +
      `received=${canvasCount}`
    );
  }
  const canvas = canvases.first();
  await canvas.evaluate((element) => element.scrollIntoView({
    block: "center",
    inline: "center"
  }));
  await canvas.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  ));
  const viewportGeometry = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      innerHeight,
      innerWidth,
      rect: {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
        x: rect.x,
        y: rect.y
      },
      scrollX,
      scrollY
    };
  });
  const viewportGeometryReady = Number.isSafeInteger(viewportGeometry.scrollX) &&
    Number.isSafeInteger(viewportGeometry.scrollY) && viewportGeometry.rect.x >= 0 &&
    viewportGeometry.rect.y >= 0 && viewportGeometry.rect.right <= viewportGeometry.innerWidth &&
    viewportGeometry.rect.bottom <= viewportGeometry.innerHeight;
  if (!viewportGeometryReady) {
    throw new Error(
      `${options.benchId}/${options.state}: Canvas could not be made fully viewport-visible; ` +
      `${stableJson(viewportGeometry)}`
    );
  }
  const canvasGraphicsEvidence = await collectCaliforniaCanvasGraphicsStateEvidence({
    benchId: options.benchId,
    root: options.graphicsSurface,
    stateKey: options.state,
    surfaceKey: "signature-canvas"
  });
  assertCaliforniaCanvasGraphicsStateEvidence(canvasGraphicsEvidence, {
    benchId: options.benchId,
    capturedUrl: options.graphicsSurface.page().url(),
    runtimeRunId: options.runtimeRunId,
    stateKey: options.state,
    surfaceKey: "signature-canvas"
  }, californiaCanvasGraphicsSourceContract);
  await registerCaliforniaCanvasGraphicsEvidenceForContrast({
    contract: californiaCanvasGraphicsSourceContract,
    evidence: canvasGraphicsEvidence,
    root: options.graphicsSurface
  });
  const contrast = await options.contrastProvider.audit(options.graphicsSurface, {
    benchId: options.benchId,
    state: options.state,
    viewport: options.viewport
  }, { auditCanvases: true });
  if (contrast.findings.length > 0) {
    throw new Error(
      `${options.benchId}/${options.state}: exact-root Canvas contrast findings: ` +
      contrast.findings.map((item) => `${item.label}: ${item.detail}`).join(" | ")
    );
  }
  const canvasSurfaceEvidence = contrast.evidence.filter((item) => item.kind === "canvas-surface");
  if (canvasSurfaceEvidence.length !== canvasGraphicsEvidence.canvases.length) {
    throw new Error(
      `${options.benchId}/${options.state}: exact-root Canvas contrast consume cardinality drifted; ` +
      `surfaces=${canvasSurfaceEvidence.length} receipts=${canvasGraphicsEvidence.canvases.length}`
    );
  }
  const invalidCanvasSurfaceEvidence = canvasSurfaceEvidence.filter((item) =>
    item.contextKind !== "canvas-2d" || item.hasExecutableNonTextEvidence !== true
  );
  if (invalidCanvasSurfaceEvidence.length > 0) {
    throw new Error(
      `${options.benchId}/${options.state}: exact-root Canvas contrast did not consume executable ` +
      `non-text evidence for every 2D Canvas; ${stableJson(invalidCanvasSurfaceEvidence)}`
    );
  }
  const consumedCanvasGraphics = await consumeCaliforniaCanvasGraphicsContrastAckedStateEvidence({
    benchId: options.benchId,
    contract: californiaCanvasGraphicsSourceContract,
    evidence: canvasGraphicsEvidence,
    root: options.graphicsSurface,
    runtimeRunId: options.runtimeRunId,
    stateKey: options.state,
    surfaceKey: "signature-canvas"
  });
  const canvasGraphicsContrastAck = consumedCanvasGraphics.contrastConsumeAck;
  const consumedCanvasGraphicsEvidence = consumedCanvasGraphics.evidence;
  const canvasGraphicsNodeAck: CaliforniaSignatureCanvasGraphicsNodeAck = {
    consumed: true,
    evidenceSha256: consumedCanvasGraphicsEvidence.evidenceSha256,
    receiptId: consumedCanvasGraphicsEvidence.receiptId,
    runtimeRunId: consumedCanvasGraphicsEvidence.runtimeRunId
  };
  return {
    canvasGraphicsContrastAck,
    canvasGraphicsEvidence,
    canvasGraphicsNodeAck
  };
  } finally {
    await page.evaluate(({ x, y }) => scrollTo(x, y), initialScroll).catch(() => undefined);
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )).catch(() => undefined);
  }
}

async function runLayoutGates(options: {
  axis: CaliforniaQaAxis;
  benchId: string;
  contrastProvider: CaliforniaSignatureContrastProvider;
  root: Locator;
  state: string;
}) {
  const runtimeRunId = requireCaliforniaSignatureCanvasRuntimeRunId();
  const initialRootState = await settleCaliforniaSignatureDomSvgForContrast(options.root);
  const graphicsSurface = options.root.locator('[data-viz-surface-kind="signature-canvas"]');
  await expect(graphicsSurface).toHaveCount(1);
  const canvasGraphicsGate = await runCaliforniaCanvasGraphicsOneShotGate({
    benchId: options.benchId,
    contrastProvider: options.contrastProvider,
    graphicsSurface,
    runtimeRunId,
    state: options.state,
    viewport: options.axis.viewport
  });
  const uiFindings = await collectVisualizationUiFindings(options.root, options.axis);
  if (uiFindings.length > 0) {
    throw new Error(`${options.benchId}/${options.state}: UI/collision/touch findings: ${uiFindings.join(" | ")}`);
  }
  const canvas = await collectCaliforniaCanvasTextFindings(options.root, {
    benchId: options.benchId,
    state: options.state,
    viewport: options.axis.viewport
  });
  if (canvas.findings.length > 0) {
    throw new Error(`${options.benchId}/${options.state}: canvas-text findings: ${canvas.findings.map((item) => item.detail).join(" | ")}`);
  }
  const contrast = await options.contrastProvider.audit(options.root, {
    benchId: options.benchId,
    state: options.state,
    viewport: options.axis.viewport
  }, { auditCanvases: false });
  if (contrast.candidateLabelCount === 0 || contrast.auditedLabelCount === 0) {
    throw new Error(`${options.benchId}/${options.state}: contrast audit produced no measured labels`);
  }
  if (contrast.findings.length > 0) {
    throw new Error(`${options.benchId}/${options.state}: contrast findings: ${contrast.findings.map((item) => item.detail).join(" | ")}`);
  }
  const parentCanvasEvidence = contrast.evidence.filter((item) => item.kind.startsWith("canvas-"));
  if (parentCanvasEvidence.length !== 0) {
    throw new Error(
      `${options.benchId}/${options.state}: parent DOM/SVG contrast unexpectedly rescanned ` +
      `${parentCanvasEvidence.length} Canvas evidence item(s)`
    );
  }
  const contrastPreRootState: CaliforniaSignatureDomSvgSettleEvidence = {
    activeAnimationCount: contrast.layoutSettleEvidence.activeAnimationCount,
    candidateTargetCount: contrast.layoutSettleEvidence.candidateTargetCount,
    controlStateSha256: contrast.layoutSettleEvidence.controlStateSha256,
    deviceScaleFactor: contrast.layoutSettleEvidence.deviceScaleFactor,
    documentLanguage: contrast.layoutSettleEvidence.documentLanguage,
    effectiveTheme: contrast.layoutSettleEvidence.effectiveTheme,
    fontStatus: contrast.layoutSettleEvidence.fontStatus,
    geometryVisibilitySha256: contrast.layoutSettleEvidence.geometryVisibilitySha256,
    rootStateSha256: contrast.layoutSettleEvidence.rootStateSha256,
    stableRafSnapshots: contrast.layoutSettleEvidence.stableRafSnapshots,
    svgTargetCount: contrast.layoutSettleEvidence.svgTargetCount,
    url: contrast.layoutSettleEvidence.url,
    viewportHeight: contrast.layoutSettleEvidence.viewportHeight,
    viewportWidth: contrast.layoutSettleEvidence.viewportWidth
  };
  assert.deepEqual(
    contrastPreRootState,
    initialRootState.layoutSettleEvidence,
    `${options.benchId}/${options.state}: root/control/DOM/SVG state drifted between the first layout gate and contrast`
  );
  const finalRootState = await settleCaliforniaSignatureDomSvgForContrast(options.root);
  assert.deepEqual(
    finalRootState.layoutSettleEvidence,
    initialRootState.layoutSettleEvidence,
    `${options.benchId}/${options.state}: root/control/DOM/SVG state drifted after exact-root Canvas consume`
  );
  return {
    ...canvasGraphicsGate,
    layoutSettleEvidence: contrast.layoutSettleEvidence
  };
}

export async function runCaliforniaSignatureStructuralBench(options: {
  axis: CaliforniaQaAxis;
  bench: CaliforniaSignatureBenchControlBlueprint;
  contrastProvider: CaliforniaSignatureContrastProvider;
  diagnostics: CaliforniaBrowserDiagnostics;
  page: Page;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  visit: CaliforniaBenchVisit;
}) {
  const records: CaliforniaSignatureExactEvidenceRecord[] = [];
  for (const step of options.bench.lessonSteps) {
    const opened = await reachLessonStep({ ...options, stepIndex: step.index });
    const identity = {
      axisId: options.axis.id,
      benchId: options.bench.benchId,
      branchPath: [],
      endpoint: null,
      instanceKey: null,
      phase: "structural" as const,
      sourceEndpoint: null,
      sourceSiteKey: null,
      stepKey: step.key
    };
    const layoutGate = await opened.deadline.run("structural-state", async () => {
      await deterministicModelFingerprint(opened.signatureLab);
      const settled = await runLayoutGates({
        axis: options.axis,
        benchId: options.bench.benchId,
        contrastProvider: options.contrastProvider,
        root: opened.signatureLab,
        state: californiaCanvasGraphicsStateKey(identity)
      });
      await assertNoBrowserDiagnostics(options.diagnostics, `${options.bench.benchId}/${step.key}/structural`);
      return settled;
    });
    records.push(evidenceRecord({
      ...identity,
      canvasGraphicsContrastAck: layoutGate.canvasGraphicsContrastAck,
      canvasGraphicsEvidence: layoutGate.canvasGraphicsEvidence,
      canvasGraphicsNodeAck: layoutGate.canvasGraphicsNodeAck,
      labId: options.visit.lab.labId,
      layoutSettleEvidence: layoutGate.layoutSettleEvidence
    }));
  }
  return records;
}

export async function runCaliforniaSignatureEndpointBench(options: {
  axis: CaliforniaQaAxis;
  bench: CaliforniaSignatureBenchControlBlueprint;
  contrastProvider: CaliforniaSignatureContrastProvider;
  diagnostics: CaliforniaBrowserDiagnostics;
  durabilityProvider: CaliforniaSignatureDurabilityProvider;
  page: Page;
  phase: "functional" | "layout";
  sourceEvidenceOracle: CaliforniaSignatureSourceExpectedEvidenceOracle;
  sourceExpectedProvider: CaliforniaSignatureSourceExpectedProvider;
  sourceManifest: CaliforniaSignatureSourceManifest;
  visit: CaliforniaBenchVisit;
}) {
  const records: CaliforniaSignatureExactEvidenceRecord[] = [];
  assert.equal(options.sourceEvidenceOracle.blueprintSha256,
    CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
    `${options.bench.benchId}: endpoint runner source-oracle blueprint drifted`);
  const exercised = new Set<string>();
  const recordedControls = new Set<string>();
  const combinationRowsByStep = new Map<string, CaliforniaSignatureSourceEvidenceOracleRow[]>();
  for (const row of iterateCaliforniaSignatureSourceEvidenceOracleRows({
    benchIds: [options.bench.benchId],
    manifest: options.sourceManifest,
    oracle: options.sourceEvidenceOracle
  })) {
    if (row.rowKind !== "combination" || !row.phases.includes(options.phase)) continue;
    const rows = combinationRowsByStep.get(row.stepKey) ?? [];
    rows.push(row);
    combinationRowsByStep.set(row.stepKey, rows);
  }
  const freshDefault = await reachLessonStep({ ...options, stepIndex: 0 });
  const globalFreshDefault: CaliforniaSignatureBenchDefaultState = await freshDefault.deadline.run(
    "capture-global-fresh-default",
    () => captureSignatureBenchDefaultState(
      freshDefault.signatureLab,
      () => freshDefault.deadline.remainingTimeout("capture-global-fresh-default")
    )
  );
  for (const step of options.bench.lessonSteps) {
    const cases = await discoverCaliforniaSignatureEndpointCases({ ...options, stepIndex: step.index });
    records.push(evidenceRecord({
      axisId: options.axis.id,
      benchId: options.bench.benchId,
      branchPath: [],
      canvasGraphicsContrastAck: null,
      canvasGraphicsEvidence: null,
      canvasGraphicsNodeAck: null,
      endpoint: null,
      instanceKey: null,
      labId: options.visit.lab.labId,
      layoutSettleEvidence: null,
      phase: options.phase,
      sourceEndpoint: null,
      sourceSiteKey: null,
      stepKey: step.key
    }));
    for (const endpointCase of cases) {
      const lessonChoiceSite = options.bench.controlSites.find((site) =>
        site.siteKey === endpointCase.control.sourceSiteKey
      )?.lessonChoiceMultiplicity;
      const exerciseIdentity = stableJson({
        endpoint: endpointCase.endpoint,
        instanceKey: endpointCase.control.instanceKey,
        path: endpointCase.path,
        sourceConditionKeys: endpointCase.control.sourceConditionKeys,
        sourceEndpoints: endpointCase.control.sourceEndpoints,
        sourceSiteKey: endpointCase.control.sourceSiteKey,
        step: lessonChoiceSite ? step.key : null
      });
      if (exercised.has(exerciseIdentity)) continue;
      exercised.add(exerciseIdentity);

      const controlIdentity = stableJson({
        instanceKey: endpointCase.control.instanceKey,
        path: endpointCase.path,
        sourceConditionKeys: endpointCase.control.sourceConditionKeys,
        sourceEndpoints: endpointCase.control.sourceEndpoints,
        sourceSiteKey: endpointCase.control.sourceSiteKey,
        step: lessonChoiceSite ? step.key : null
      });
      if (!recordedControls.has(controlIdentity)) {
        recordedControls.add(controlIdentity);
        records.push(evidenceRecord({
          axisId: options.axis.id,
          benchId: options.bench.benchId,
          branchPath: endpointCase.path,
          canvasGraphicsContrastAck: null,
          canvasGraphicsEvidence: null,
          canvasGraphicsNodeAck: null,
          endpoint: null,
          instanceKey: endpointCase.control.instanceKey,
          labId: options.visit.lab.labId,
          layoutSettleEvidence: null,
          numericMidpoint: endpointCase.control.numericMidpoint,
          phase: options.phase,
          sourceEndpoint: null,
          sourceSiteKey: endpointCase.control.sourceSiteKey,
          stepKey: step.key
        }));
      }

      const opened = await reachLessonStep({ ...options, stepIndex: step.index });
      const execution = await opened.deadline.run("functional-endpoint-and-gates", async () => {
        await replayPath({
          bench: options.bench,
          navigation: opened.contract,
          path: endpointCase.path,
          root: opened.signatureLab,
          sourceExpectedProvider: options.sourceExpectedProvider,
          stepKey: step.key
        });
        const runtimeControls = await assertCaliforniaSignatureSourceExpectedRuntimeExact({
          actual: await snapshotCaliforniaSignatureRuntimeControls(opened.signatureLab, options.bench),
          context: {
            bench: options.bench,
            branchPath: endpointCase.path,
            stepKey: step.key
          },
          provider: options.sourceExpectedProvider
        });
        const currentControl = runtimeControls.find((control) =>
          control.sourceSiteKey === endpointCase.control.sourceSiteKey &&
          control.instanceKey === endpointCase.control.instanceKey
        );
        if (!currentControl) {
          throw new Error(
            `${options.bench.benchId}/${step.key}: exact endpoint activation lost runtime control ` +
            `${endpointCase.control.sourceSiteKey}/${endpointCase.control.instanceKey}`
          );
        }
        const currentEndpointIndex = currentControl.endpoints.indexOf(endpointCase.endpoint);
        const currentSourceEndpoint = currentEndpointIndex >= 0
          ? currentControl.sourceEndpoints[currentEndpointIndex]
          : undefined;
        if (!currentSourceEndpoint || stableJson(currentSourceEndpoint) !== stableJson(endpointCase.sourceEndpoint)) {
          throw new Error(
            `${options.bench.benchId}/${step.key}: exact endpoint activation source identity drifted for ` +
            `${endpointCase.control.sourceSiteKey}/${endpointCase.control.instanceKey}/${endpointCase.endpoint}; ` +
            `expected=${stableJson(endpointCase.sourceEndpoint)} actual=${stableJson(currentSourceEndpoint ?? null)}`
          );
        }
        const baseline = await deterministicModelFingerprint(opened.signatureLab);
        await activateCaliforniaSignatureEndpoint({
          bench: options.bench,
          control: currentControl,
          endpoint: endpointCase.endpoint,
          navigation: opened.contract,
          root: opened.signatureLab,
          sourceExpectedContext: {
            bench: options.bench,
            branchPath: endpointCase.path,
            stepKey: step.key
          },
          sourceExpectedProvider: options.sourceExpectedProvider
        });
        await options.sourceExpectedProvider.settleEndpoint({
          context: {
            bench: options.bench,
            branchPath: endpointCase.path,
            stepKey: step.key
          },
          control: currentControl,
          endpoint: endpointCase.endpoint,
          root: opened.signatureLab
        });
        const activeRoot = options.page.locator("[data-viz-signature-lab]");
        await expect(activeRoot).toHaveCount(1);
        const after = await deterministicModelFingerprint(activeRoot);
        if (baseline === after && !["min", "max", "false", "true", "restore"].includes(endpointCase.endpoint)) {
          throw new Error(
            `${options.bench.benchId}/${step.key}/${endpointCase.control.sourceSiteKey}/` +
            `${endpointCase.control.instanceKey}/${endpointCase.endpoint}: deterministic model response did not change`
          );
        }
        const evidenceIdentity = {
          axisId: options.axis.id,
          benchId: options.bench.benchId,
          branchPath: endpointCase.path,
          endpoint: endpointCase.endpoint,
          instanceKey: endpointCase.control.instanceKey,
          phase: options.phase,
          sourceEndpoint: endpointCase.sourceEndpoint,
          sourceSiteKey: endpointCase.control.sourceSiteKey,
          stepKey: step.key
        };
        const state = californiaCanvasGraphicsStateKey(evidenceIdentity);
        let canvasGraphicsContrastAck: CaliforniaSignatureCanvasGraphicsContrastAck | null = null;
        let canvasGraphicsEvidence: CaliforniaCanvasGraphicsStateEvidence | null = null;
        let canvasGraphicsNodeAck: CaliforniaSignatureCanvasGraphicsNodeAck | null = null;
        let layoutSettleEvidence: CaliforniaSignatureLayoutSettleEvidence | null = null;
        if (options.phase === "layout") {
          const layoutGate = await runLayoutGates({
            axis: options.axis,
            benchId: options.bench.benchId,
            contrastProvider: options.contrastProvider,
            root: activeRoot,
            state
          });
          canvasGraphicsContrastAck = layoutGate.canvasGraphicsContrastAck;
          canvasGraphicsEvidence = layoutGate.canvasGraphicsEvidence;
          canvasGraphicsNodeAck = layoutGate.canvasGraphicsNodeAck;
          layoutSettleEvidence = layoutGate.layoutSettleEvidence;
        } else {
          await options.durabilityProvider.assertDurable({
            axis: options.axis,
            benchId: options.bench.benchId,
            endpoint: endpointCase.endpoint,
            instanceKey: endpointCase.control.instanceKey,
            labId: options.visit.lab.labId,
            sourceSiteKey: endpointCase.control.sourceSiteKey,
            stepKey: step.key
          });
        }
        await assertNoBrowserDiagnostics(options.diagnostics,
          `${options.bench.benchId}/${step.key}/${endpointCase.control.sourceSiteKey}/${endpointCase.endpoint}`);
        const resetEvidence = await resetSignatureBench(
          options.page,
          opened.signatureLab,
          opened.switcher,
          options.bench.benchId,
          () => opened.deadline.remainingTimeout("real-learner-endpoint-reset"),
          globalFreshDefault
        );
        return {
          baseline,
          canvasGraphicsContrastAck,
          canvasGraphicsEvidence,
          canvasGraphicsNodeAck,
          layoutSettleEvidence,
          numericMidpoint: currentControl.numericMidpoint,
          resetEvidence
        };
      });
      records.push(evidenceRecord({
        axisId: options.axis.id,
        benchId: options.bench.benchId,
        branchPath: endpointCase.path,
        canvasGraphicsContrastAck: execution.canvasGraphicsContrastAck,
        canvasGraphicsEvidence: execution.canvasGraphicsEvidence,
        canvasGraphicsNodeAck: execution.canvasGraphicsNodeAck,
        endpoint: endpointCase.endpoint,
        instanceKey: endpointCase.control.instanceKey,
        labId: options.visit.lab.labId,
        layoutSettleEvidence: execution.layoutSettleEvidence,
        numericMidpoint: execution.numericMidpoint,
        phase: options.phase,
        resetEvidence: execution.resetEvidence,
        sourceEndpoint: endpointCase.sourceEndpoint,
        sourceSiteKey: endpointCase.control.sourceSiteKey,
        stepKey: step.key
      }));
    }
    const combinationRows = combinationRowsByStep.get(step.key) ?? [];
    const combinationOpened = combinationRows.length > 0
      ? await reachLessonStep({ ...options, stepIndex: 0 })
      : null;
    for (const combinationRow of combinationRows) {
      const combinationActivations = combinationRow.combinationActivations;
      assert.ok(combinationActivations,
        `${options.bench.benchId}/${step.key}: source combination row lost its activations`);
      const branchPath = combinationRow.branchPath.map((replay) => ({
        ...replay,
        sourceEndpoint: { ...replay.sourceEndpoint }
      }));
      const opened = combinationOpened!;
      const combinationDeadline = new CaliforniaVisitDeadline(
        options.page,
        Date.now(),
        CALIFORNIA_SIGNATURE_HARD_RECOVERY_BUDGET_MS
      );
      await combinationDeadline.run("restore-mounted-combination-step", () =>
        reachLessonStepOnMountedBench({
          bench: options.bench,
          contract: opened.contract,
          deadline: combinationDeadline,
          signatureLab: opened.signatureLab,
          sourceExpectedProvider: options.sourceExpectedProvider,
          stepIndex: step.index
        })
      );
      const execution = await combinationDeadline.run("pairwise-combination-and-gates", async () => {
        await replayPath({
          bench: options.bench,
          navigation: opened.contract,
          path: branchPath,
          root: opened.signatureLab,
          sourceExpectedProvider: options.sourceExpectedProvider,
          stepKey: step.key
        });
        const firstContext: CaliforniaSignatureSourceExpectedContext = {
          bench: options.bench,
          branchPath,
          stepKey: step.key
        };
        const first = combinationActivations[0];
        const firstControl = await resolveCaliforniaSignatureCombinationActivation({
          activation: first,
          bench: options.bench,
          context: firstContext,
          root: opened.signatureLab,
          sourceExpectedProvider: options.sourceExpectedProvider
        });
        await activateCaliforniaSignatureEndpoint({
          bench: options.bench,
          control: firstControl,
          endpoint: first.activationEndpoint,
          navigation: opened.contract,
          root: opened.signatureLab,
          sourceExpectedContext: firstContext,
          sourceExpectedProvider: options.sourceExpectedProvider
        });
        await options.sourceExpectedProvider.settleEndpoint({
          context: firstContext,
          control: firstControl,
          endpoint: first.activationEndpoint,
          root: opened.signatureLab
        });

        const firstReplay: CaliforniaSignatureReplayStep = {
          endpoint: first.activationEndpoint,
          instanceKey: first.instanceKey,
          sourceEndpoint: { ...first.sourceEndpoint },
          sourceSiteKey: first.sourceSiteKey
        };
        const secondContext: CaliforniaSignatureSourceExpectedContext = {
          bench: options.bench,
          branchPath: [...branchPath, firstReplay],
          stepKey: step.key
        };
        const second = combinationActivations[1];
        const secondControl = await resolveCaliforniaSignatureCombinationActivation({
          activation: second,
          bench: options.bench,
          context: secondContext,
          root: opened.signatureLab,
          sourceExpectedProvider: options.sourceExpectedProvider
        });
        await activateCaliforniaSignatureEndpoint({
          bench: options.bench,
          control: secondControl,
          endpoint: second.activationEndpoint,
          navigation: opened.contract,
          root: opened.signatureLab,
          sourceExpectedContext: secondContext,
          sourceExpectedProvider: options.sourceExpectedProvider
        });
        await options.sourceExpectedProvider.settleEndpoint({
          context: secondContext,
          control: secondControl,
          endpoint: second.activationEndpoint,
          root: opened.signatureLab
        });
        const activeRoot = options.page.locator("[data-viz-signature-lab]");
        await expect(activeRoot).toHaveCount(1);
        await deterministicModelFingerprint(activeRoot);
        const evidenceIdentity = {
          axisId: options.axis.id,
          benchId: options.bench.benchId,
          branchPath,
          combinationActivations,
          endpoint: null,
          instanceKey: null,
          numericMidpoint: null,
          phase: options.phase,
          sourceEndpoint: null,
          sourceSiteKey: null,
          stepKey: step.key
        };
        const state = californiaCanvasGraphicsStateKey(evidenceIdentity);
        let canvasGraphicsContrastAck: CaliforniaSignatureCanvasGraphicsContrastAck | null = null;
        let canvasGraphicsEvidence: CaliforniaCanvasGraphicsStateEvidence | null = null;
        let canvasGraphicsNodeAck: CaliforniaSignatureCanvasGraphicsNodeAck | null = null;
        let layoutSettleEvidence: CaliforniaSignatureLayoutSettleEvidence | null = null;
        if (options.phase === "layout") {
          const layoutGate = await runLayoutGates({
            axis: options.axis,
            benchId: options.bench.benchId,
            contrastProvider: options.contrastProvider,
            root: activeRoot,
            state
          });
          canvasGraphicsContrastAck = layoutGate.canvasGraphicsContrastAck;
          canvasGraphicsEvidence = layoutGate.canvasGraphicsEvidence;
          canvasGraphicsNodeAck = layoutGate.canvasGraphicsNodeAck;
          layoutSettleEvidence = layoutGate.layoutSettleEvidence;
        } else {
          for (const activation of combinationActivations) {
            await options.durabilityProvider.assertDurable({
              axis: options.axis,
              benchId: options.bench.benchId,
              endpoint: activation.activationEndpoint,
              instanceKey: activation.instanceKey,
              labId: options.visit.lab.labId,
              sourceSiteKey: activation.sourceSiteKey,
              stepKey: step.key
            });
          }
        }
        await assertNoBrowserDiagnostics(options.diagnostics,
          `${options.bench.benchId}/${step.key}/combination/${sha256(stableJson(combinationActivations)).slice(0, 16)}`);
        const resetEvidence = await resetSignatureBench(
          options.page,
          opened.signatureLab,
          opened.switcher,
          options.bench.benchId,
          () => combinationDeadline.remainingTimeout("real-learner-combination-reset"),
          globalFreshDefault
        );
        return {
          canvasGraphicsContrastAck,
          canvasGraphicsEvidence,
          canvasGraphicsNodeAck,
          layoutSettleEvidence,
          resetEvidence
        };
      });
      records.push(evidenceRecord({
        axisId: options.axis.id,
        benchId: options.bench.benchId,
        branchPath,
        canvasGraphicsContrastAck: execution.canvasGraphicsContrastAck,
        canvasGraphicsEvidence: execution.canvasGraphicsEvidence,
        canvasGraphicsNodeAck: execution.canvasGraphicsNodeAck,
        combinationActivations,
        endpoint: null,
        instanceKey: null,
        labId: options.visit.lab.labId,
        layoutSettleEvidence: execution.layoutSettleEvidence,
        numericMidpoint: null,
        phase: options.phase,
        resetEvidence: execution.resetEvidence,
        sourceEndpoint: null,
        sourceSiteKey: null,
        stepKey: step.key
      }));
    }
  }
  return records;
}

export async function prepareCaliforniaSignatureExhaustivePage(
  page: Page,
  options: { benchIds: readonly string[]; runtimeRunId: string }
) {
  await installCaliforniaVisualizationUiAuditInit(page);
  await page.addInitScript(() => {
    // A fixed PRNG makes every authored random target replayable across reloads.
    let state = 0x6d2b79f5;
    Math.random = () => {
      state |= 0;
      state = state + 0x6d2b79f5 | 0;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  });
  await installCaliforniaCanvasTextAudit(page);
  await installCaliforniaCanvasGraphicsRuntime(page, {
    benchIds: options.benchIds,
    contract: californiaCanvasGraphicsSourceContract,
    runtimeRunId: requireCaliforniaSignatureCanvasRuntimeRunId(options.runtimeRunId)
  });
}

export async function registerCaliforniaSignatureAxisStudent(options: {
  axis: CaliforniaQaAxis;
  grade: GradeId;
  page: Page;
  testInfo: TestInfo;
}) {
  const student = await registerCaliforniaVisualizationStudent(
    options.page,
    options.testInfo,
    options.grade,
    options.axis
  );
  return async (lab: CaliforniaQaLab) => {
    await options.page.goto(`/student/tools/visualizations?grade=${lab.grade}&track=all`);
    await expectCaliforniaAuthHydrated(options.page, student, options.axis);
  };
}

export function snapshotCaliforniaSignatureExhaustiveEvidence(
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[]
) {
  const keys = evidence.map((record) => record.key);
  if (new Set(keys).size !== keys.length) {
    throw new Error("California signature exhaustive evidence contains duplicate exact keys");
  }
  const sorted = [...keys].sort();
  return {
    blueprintSha256: CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
    keyCount: sorted.length,
    keysSha256: sha256(sorted.join("\n")),
    schemaVersion: CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION
  };
}

const CALIFORNIA_SIGNATURE_EXACT_EVIDENCE_RECORD_KEYS = [
  "axisId",
  "benchId",
  "branchPath",
  "canvasGraphicsContrastAck",
  "canvasGraphicsEvidence",
  "canvasGraphicsEvidenceSha256",
  "canvasGraphicsNodeAck",
  "combinationActivations",
  "endpoint",
  "instanceKey",
  "key",
  "labId",
  "layoutSettleEvidence",
  "layoutSettleEvidenceSha256",
  "numericMidpoint",
  "phase",
  "resetEvidence",
  "resetEvidenceSha256",
  "sourceEndpoint",
  "sourceSiteKey",
  "stepKey"
] as const;

export function assertCaliforniaSignatureExactEvidenceRecordSchema(
  value: unknown,
  label = "California signature exact evidence record"
): asserts value is CaliforniaSignatureExactEvidenceRecord {
  assert.ok(value && typeof value === "object" && !Array.isArray(value),
    `${label}: expected one object`);
  assert.deepEqual(
    Object.keys(value as Record<string, unknown>).sort(),
    [...CALIFORNIA_SIGNATURE_EXACT_EVIDENCE_RECORD_KEYS].sort(),
    `${label}: exact record schema drifted`
  );
}

export function assertCaliforniaSignatureExhaustiveArtifactSchema(
  artifact: { schemaVersion?: unknown },
  label = "California signature exhaustive artifact"
) {
  assert.equal(
    artifact.schemaVersion,
    CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
    `${label}: schema version must be ${CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION}; ` +
    "v1-v7 evidence lacks the current numeric reachability, pairwise combination, real learner Reset, raw contrast reconstruction, whole-root state fence, browser-issued Canvas ACK, exact source oracle, run-scoped artifact lifecycle, and framed-stream byte identity and cannot be mixed"
  );
}

export function assertCaliforniaSignatureLayoutSettleEvidence(
  evidence: CaliforniaSignatureLayoutSettleEvidence,
  label = "California signature layout settle evidence"
) {
  assert.equal(evidence.activeAnimationCount, 0, `${label}: active animation remained`);
  assert.equal(evidence.fontStatus, "loaded", `${label}: fonts were not loaded`);
  assert.ok(evidence.stableRafSnapshots >= 3,
    `${label}: fewer than three stable rAF snapshots`);
  assert.ok(evidence.candidateTargetCount > 0,
    `${label}: settle evidence has no contrast candidates`);
  assert.ok(Number.isFinite(evidence.deviceScaleFactor) && evidence.deviceScaleFactor > 0,
    `${label}: device scale factor is missing`);
  assert.ok(Number.isInteger(evidence.viewportWidth) && evidence.viewportWidth > 0 &&
    Number.isInteger(evidence.viewportHeight) && evidence.viewportHeight > 0,
    `${label}: measured viewport is missing`);
  assert.ok(evidence.documentLanguage.trim(), `${label}: document language is missing`);
  assert.ok(evidence.effectiveTheme.trim(), `${label}: effective theme is missing`);
  assert.doesNotThrow(() => new URL(evidence.url), `${label}: captured URL is malformed`);
  assert.match(evidence.controlStateSha256, /^[a-f0-9]{64}$/,
    `${label}: control-state digest is malformed`);
  assert.match(evidence.rootStateSha256, /^[a-f0-9]{64}$/,
    `${label}: root-state digest is malformed`);
  assert.match(evidence.geometryVisibilitySha256, /^[a-f0-9]{64}$/,
    `${label}: settle evidence digest is malformed`);
  assert.equal(evidence.postControlStateSha256, evidence.controlStateSha256,
    `${label}: controls drifted during the audit`);
  assert.equal(evidence.postGeometryVisibilitySha256, evidence.geometryVisibilitySha256,
    `${label}: DOM/SVG geometry drifted during the audit`);
  assert.equal(evidence.postRootStateSha256, evidence.rootStateSha256,
    `${label}: root state drifted during the audit`);
  assert.ok(evidence.contrastContext.benchId.trim() && evidence.contrastContext.state.trim(),
    `${label}: raw contrast context is missing`);
  assert.ok(evidence.contrastContext.viewport === "desktop" || evidence.contrastContext.viewport === "mobile",
    `${label}: raw contrast viewport is invalid`);
  assert.ok(Array.isArray(evidence.contrastEvidence) && evidence.contrastEvidence.length > 0,
    `${label}: complete base contrast evidence is missing`);
  assert.ok(Array.isArray(evidence.contrastFindings),
    `${label}: complete base contrast findings are missing`);
  const evidenceIdentities = new Set<string>();
  for (const item of evidence.contrastEvidence) {
    assert.ok(item.groupId.trim() && item.label.trim(), `${label}: base contrast identity is missing`);
    const identity = stableJson([item.groupId, item.kind, item.label]);
    assert.equal(evidenceIdentities.has(identity), false,
      `${label}: duplicate base contrast evidence ${identity}`);
    evidenceIdentities.add(identity);
    assert.ok(item.threshold === 3 || item.threshold === 4.5,
      `${label}: base contrast threshold is not an exact supported ratio`);
    assert.ok(item.ratios.every((ratio: number) => Number.isFinite(ratio) && ratio > 0),
      `${label}: base contrast contains an invalid numeric sample`);
    assert.ok(item.reasons.every((reason: string) => reason.trim()),
      `${label}: base contrast contains an empty unsupported reason`);
    const expectedRatio = item.ratios.length > 0 ? Math.min(...item.ratios) : null;
    assert.equal(item.ratio, expectedRatio,
      `${label}: base contrast summary ratio does not match raw samples`);
    const accountedByCanvasAck = item.kind === "canvas-surface" &&
      item.contextKind === "canvas-2d" && item.hasExecutableNonTextEvidence === true;
    assert.ok(item.ratios.length > 0 || item.reasons.length > 0 || accountedByCanvasAck,
      `${label}: base contrast candidate is unaccounted`);
    if (item.ratios.length > 0) {
      assert.ok(expectedRatio !== null && expectedRatio >= item.threshold,
        `${label}: base contrast sample is below its own threshold`);
    }
  }
  const baseSummary = summarizeCaliforniaBaseContrastEvidence(
    evidence.contrastEvidence,
    evidence.contrastContext
  );
  assert.deepEqual(evidence.contrastFindings, baseSummary.findings,
    `${label}: base contrast findings do not recompute from raw evidence`);
  assert.equal(evidence.contrastEvidenceSha256, sha256(stableJson(evidence.contrastEvidence)),
    `${label}: base contrast raw-evidence digest drifted`);
  assert.equal(evidence.contrastCandidateLabelCount, baseSummary.candidateLabelCount,
    `${label}: base contrast candidate count does not recompute`);
  assert.equal(evidence.contrastAuditedLabelCount, baseSummary.auditedLabelCount,
    `${label}: base contrast audited count does not recompute`);
  assert.equal(evidence.contrastFindingCount, baseSummary.findings.length,
    `${label}: base contrast finding count does not recompute`);
  assert.equal(evidence.contrastMinRatio, baseSummary.minRatio,
    `${label}: base contrast minimum does not recompute`);
  assert.equal(evidence.contrastWorstKind, baseSummary.worstKind,
    `${label}: base contrast worst kind does not recompute`);
  assert.equal(evidence.contrastWorstLabel, baseSummary.worstLabel,
    `${label}: base contrast worst label does not recompute`);
  assert.equal(evidence.contrastWorstRequiredRatio, baseSummary.worstRequiredRatio,
    `${label}: base contrast required ratio does not recompute`);
  assert.ok(evidence.contrastCandidateLabelCount > 0,
    `${label}: durable contrast evidence has no candidates`);
  assert.ok(evidence.contrastAuditedLabelCount > 0,
    `${label}: durable contrast evidence measured no candidates`);
  assert.ok(evidence.contrastAuditedLabelCount <= evidence.contrastCandidateLabelCount,
    `${label}: durable contrast evidence audited more labels than it discovered`);
  assert.equal(evidence.contrastFindingCount, 0,
    `${label}: durable contrast evidence recorded findings`);
  assert.ok(Number.isFinite(evidence.contrastMinRatio) && evidence.contrastMinRatio >= 3,
    `${label}: durable contrast evidence lacks a passing measured ratio`);
  assert.match(evidence.contrastEvidenceSha256, /^[a-f0-9]{64}$/,
    `${label}: durable contrast evidence digest is malformed`);
  assert.ok(evidence.contrastWorstKind.trim(),
    `${label}: durable contrast evidence lacks worst-kind attribution`);
  assert.ok(evidence.contrastWorstLabel.trim(),
    `${label}: durable contrast evidence lacks worst-label attribution`);
  assert.ok(
    evidence.contrastWorstRequiredRatio === 3 || evidence.contrastWorstRequiredRatio === 4.5,
    `${label}: base contrast lacks an exact required ratio`
  );
  assert.ok(evidence.contrastMinRatio >= evidence.contrastWorstRequiredRatio,
    `${label}: base contrast minimum is below its required ratio`);
  assert.equal(evidence.hardenedTextCompleted, true,
    `${label}: hardened text contrast audit did not complete`);
  assert.equal(evidence.hardenedTextAlgorithmSha256,
    CALIFORNIA_HARDENED_TEXT_CONTRAST_SCANNER_SHA256,
    `${label}: hardened text contrast algorithm is stale or unreviewed`);
  assert.ok(evidence.hardenedTextCandidateCount > 0,
    `${label}: hardened text contrast evidence has no candidates`);
  assert.ok(evidence.hardenedTextAuditedCount > 0,
    `${label}: hardened text contrast evidence measured no candidates`);
  assert.ok(evidence.hardenedTextAuditedCount <= evidence.hardenedTextCandidateCount,
    `${label}: hardened text audit measured more labels than it discovered`);
  assert.equal(evidence.hardenedTextRawScan.checkedTextCount,
    evidence.hardenedTextRawScan.evidence.length,
    `${label}: hardened scanner checked-count does not match raw evidence`);
  assert.equal(new Set(evidence.hardenedTextRawScan.evidence.map((item) => item.target)).size,
    evidence.hardenedTextRawScan.evidence.length,
    `${label}: hardened scanner contains duplicate targets`);
  const recomputedHardenedWorst = [...evidence.hardenedTextRawScan.evidence].sort(
    (left, right) => left.contrastRatio / left.requiredRatio - right.contrastRatio / right.requiredRatio
  )[0] ?? null;
  assert.deepEqual(evidence.hardenedTextRawScan.worst, recomputedHardenedWorst,
    `${label}: hardened scanner worst record does not recompute`);
  const hardenedSummary = summarizeCaliforniaHardenedTextContrastScan(
    evidence.hardenedTextRawScan,
    evidence.contrastContext
  ).hardenedText;
  assert.equal(evidence.hardenedTextAlgorithmSha256, hardenedSummary.algorithmSha256,
    `${label}: hardened algorithm summary does not recompute`);
  assert.equal(evidence.hardenedTextAuditedCount, hardenedSummary.auditedTextCount,
    `${label}: hardened audited count does not recompute`);
  assert.equal(evidence.hardenedTextCandidateCount, hardenedSummary.candidateTextCount,
    `${label}: hardened candidate count does not recompute`);
  assert.equal(evidence.hardenedTextCompleted, hardenedSummary.completed,
    `${label}: hardened completion state does not recompute`);
  assert.equal(evidence.hardenedTextEvidenceSha256, hardenedSummary.evidenceSha256,
    `${label}: hardened raw-evidence digest does not recompute`);
  assert.equal(evidence.hardenedTextFindingCount, hardenedSummary.findingCount,
    `${label}: hardened finding count does not recompute`);
  assert.equal(evidence.hardenedTextMinRatio, hardenedSummary.minRatio,
    `${label}: hardened minimum does not recompute`);
  assert.equal(evidence.hardenedTextWorstLabel, hardenedSummary.worstLabel,
    `${label}: hardened worst label does not recompute`);
  assert.equal(evidence.hardenedTextWorstRequiredRatio, hardenedSummary.worstRequiredRatio,
    `${label}: hardened required ratio does not recompute`);
  assert.equal(evidence.hardenedTextFindingCount, 0,
    `${label}: hardened text contrast evidence recorded findings`);
  assert.match(evidence.hardenedTextEvidenceSha256, /^[a-f0-9]{64}$/,
    `${label}: hardened text evidence digest is malformed`);
  assert.ok(Number.isFinite(evidence.hardenedTextMinRatio) && evidence.hardenedTextMinRatio >= 3,
    `${label}: hardened text contrast lacks a passing measured ratio`);
  assert.ok(evidence.hardenedTextWorstLabel.trim(),
    `${label}: hardened text contrast lacks worst-label attribution`);
  assert.ok(
    evidence.hardenedTextWorstRequiredRatio === 3 ||
      evidence.hardenedTextWorstRequiredRatio === 4.5,
    `${label}: hardened text contrast lacks an exact required ratio`
  );
  assert.ok(evidence.hardenedTextMinRatio >= evidence.hardenedTextWorstRequiredRatio,
    `${label}: hardened text minimum is below its required ratio`);
  return evidence;
}

export function assertReviewedCaliforniaSignatureExhaustiveSnapshot(
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[]
) {
  const candidate = snapshotCaliforniaSignatureExhaustiveEvidence(evidence);
  return assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate(candidate);
}

/**
 * Streaming terminal consumers produce this same reviewed shape without ever
 * materializing the full evidence matrix.  Keeping the review decision here
 * prevents the streaming lifecycle from growing a second acceptance constant.
 */
export function assertReviewedCaliforniaSignatureExhaustiveSnapshotCandidate(
  candidate: {
    blueprintSha256: string;
    keyCount: number;
    keysSha256: string;
    schemaVersion: number;
  }
) {
  if (CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT.keysSha256 === "UNREVIEWED") {
    throw new Error(
      `California signature exhaustive runtime snapshot is UNREVIEWED; discovery candidate=${JSON.stringify(candidate)}`
    );
  }
  assert.deepEqual(candidate, CALIFORNIA_SIGNATURE_REVIEWED_RUNTIME_SNAPSHOT,
    "California signature exhaustive reviewed runtime snapshot drifted");
  return candidate;
}

export function validateCaliforniaSignatureEvidenceRecords(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  externalExpectations?: CaliforniaSignatureExternalEvidenceExpectations;
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle?: CaliforniaSignatureSourceExpectedEvidenceOracle;
}) {
  if (options.sourceEvidenceOracle) {
    assertCaliforniaSignatureSourceOracleEvidenceMatrixExact({
      evidence: options.evidence,
      manifest: options.manifest,
      oracle: options.sourceEvidenceOracle
    });
  }
  if (options.externalExpectations) {
    assertCaliforniaSignatureExternalEvidenceOwnership({
      evidence: options.evidence,
      expectations: options.externalExpectations,
      manifest: options.manifest
    });
  }
  const benches = new Map(options.manifest.benches.map((bench) => [bench.benchId, bench]));
  const keys = new Set<string>();
  for (const record of options.evidence) {
    if (record.key !== evidenceKey(record)) {
      throw new Error(`misattributed/tampered evidence key for ${record.benchId}/${record.stepKey}`);
    }
    if (keys.has(record.key)) throw new Error(`duplicate evidence key ${record.key}`);
    keys.add(record.key);
    const bench = benches.get(record.benchId as CaliforniaSignatureBenchControlBlueprint["benchId"]);
    if (!bench) throw new Error(`evidence references unknown bench ${record.benchId}`);
    if (!bench.lessonSteps.some((step) => step.key === record.stepKey)) {
      throw new Error(`${record.benchId}: evidence references unknown step ${record.stepKey}`);
    }
    const sourceSite = record.sourceSiteKey === null
      ? null
      : bench.controlSites.find((site) => site.siteKey === record.sourceSiteKey) ?? null;
    if (record.sourceSiteKey !== null && !sourceSite) {
      throw new Error(`${record.benchId}: evidence is misattributed to source site ${record.sourceSiteKey}`);
    }
    if (record.endpoint === null) {
      assert.equal(record.sourceEndpoint, null,
        `${record.benchId}/${record.stepKey}: non-endpoint evidence must normalize sourceEndpoint to null`);
    } else {
      assert.ok(sourceSite, `${record.benchId}/${record.stepKey}: endpoint evidence has no source site`);
      assert.ok(record.sourceEndpoint, `${record.benchId}/${record.stepKey}: endpoint evidence has no source target identity`);
      assert.ok(record.sourceEndpoint.instanceKey,
        `${record.benchId}/${record.stepKey}: endpoint evidence has an empty source target instance`);
      assert.ok(record.sourceEndpoint.value,
        `${record.benchId}/${record.stepKey}: endpoint evidence has an empty source target value`);
      assert.ok(sourceSite.endpointTargets.some((target) => target.key === record.sourceEndpoint!.sourceTargetKey),
        `${record.benchId}/${record.stepKey}: endpoint evidence cites unknown source target ` +
        record.sourceEndpoint.sourceTargetKey);
    }
    if (record.combinationActivations !== null) {
      assert.equal(record.combinationActivations.length, 2,
        `${record.benchId}/${record.stepKey}: combination evidence lacks exactly two activations`);
      assert.equal(record.sourceSiteKey, null,
        `${record.benchId}/${record.stepKey}: combination evidence carries a singular source site`);
      assert.equal(record.instanceKey, null,
        `${record.benchId}/${record.stepKey}: combination evidence carries a singular instance`);
      assert.equal(record.endpoint, null,
        `${record.benchId}/${record.stepKey}: combination evidence carries a singular endpoint`);
      const identities = record.combinationActivations.map((activation) =>
        `${activation.sourceSiteKey}\0${activation.instanceKey}`
      );
      assert.equal(new Set(identities).size, 2,
        `${record.benchId}/${record.stepKey}: combination must use two distinct controls`);
      assert.deepEqual(identities, [...identities].sort(),
        `${record.benchId}/${record.stepKey}: combination control order is not canonical`);
      for (const activation of record.combinationActivations) {
        const activationSite: CaliforniaSignatureControlSite | undefined = bench.controlSites.find(
          (site) => site.siteKey === activation.sourceSiteKey
        );
        assert.ok(activationSite,
          `${record.benchId}/${record.stepKey}: combination cites unknown site ${activation.sourceSiteKey}`);
        assert.equal(activationSite.kind, activation.controlKind,
          `${record.benchId}/${record.stepKey}: combination control kind drifted`);
        assert.ok(activation.instanceKey && activation.activationEndpoint,
          `${record.benchId}/${record.stepKey}: combination activation identity is empty`);
        assert.ok(activation.sourceEndpoint.instanceKey && activation.sourceEndpoint.value,
          `${record.benchId}/${record.stepKey}: combination source endpoint identity is empty`);
        assert.ok(activationSite.endpointTargets.some((target) =>
          target.key === activation.sourceEndpoint.sourceTargetKey
        ), `${record.benchId}/${record.stepKey}: combination cites unknown source endpoint target`);
        assertExactStringSet(
          activationSite.sourceConditionKeys,
          activation.sourceConditionKeys,
          `${record.benchId}/${record.stepKey}: combination source conditions`
        );
      }
    }
    if (sourceSite?.kind === "range" || sourceSite?.kind === "number") {
      assert.ok(record.numericMidpoint,
        `${record.benchId}/${record.stepKey}: numeric evidence lost reachable-cardinality metadata`);
      assert.ok([1, 2, 3].includes(record.numericMidpoint.reachableCardinality),
        `${record.benchId}/${record.stepKey}: numeric reachable cardinality is invalid`);
    } else {
      assert.equal(record.numericMidpoint, null,
        `${record.benchId}/${record.stepKey}: non-numeric evidence carries midpoint metadata`);
    }
    const requiresResetEvidence = record.endpoint !== null || record.combinationActivations !== null;
    assert.equal(
      record.resetEvidenceSha256,
      record.resetEvidence === null ? null : sha256(stableJson(record.resetEvidence)),
      `${record.benchId}/${record.stepKey}: Reset evidence integrity digest drifted`
    );
    if (requiresResetEvidence) {
      assert.ok(record.resetEvidence,
        `${record.benchId}/${record.stepKey}: endpoint/combination evidence has no real learner Reset evidence`);
      assert.equal(record.resetEvidence.restoredDefault, true,
        `${record.benchId}/${record.stepKey}: learner Reset did not restore the global fresh default`);
      assert.equal(record.resetEvidence.defaultControlFingerprint,
        record.resetEvidence.restoredControlFingerprint,
        `${record.benchId}/${record.stepKey}: learner Reset control fingerprint drifted`);
      assert.equal(record.resetEvidence.defaultModelFingerprint,
        record.resetEvidence.restoredModelFingerprint,
        `${record.benchId}/${record.stepKey}: learner Reset model fingerprint drifted`);
      assert.equal(record.resetEvidence.defaultSurfaceFingerprint,
        record.resetEvidence.restoredSurfaceFingerprint,
        `${record.benchId}/${record.stepKey}: learner Reset surface fingerprint drifted`);
      assert.equal(record.resetEvidence.activeBenchRestored, true,
        `${record.benchId}/${record.stepKey}: learner Reset changed the active bench`);
      assert.equal(record.resetEvidence.canvasReady, true,
        `${record.benchId}/${record.stepKey}: learner Reset canvas is not ready`);
      assert.equal(record.resetEvidence.canvasReplaced, true,
        `${record.benchId}/${record.stepKey}: learner Reset did not remount the canvas`);
    } else {
      assert.equal(record.resetEvidence, null,
        `${record.benchId}/${record.stepKey}: non-endpoint evidence carries a learner Reset receipt`);
    }
    for (const replay of record.branchPath) {
      const replaySite = bench.controlSites.find((site) => site.siteKey === replay.sourceSiteKey);
      assert.ok(replaySite, `${record.benchId}/${record.stepKey}: branch path cites unknown source site ${replay.sourceSiteKey}`);
      assert.ok(replay.instanceKey && replay.endpoint,
        `${record.benchId}/${record.stepKey}: branch path contains an empty runtime identity`);
      assert.ok(replay.sourceEndpoint.instanceKey && replay.sourceEndpoint.value,
        `${record.benchId}/${record.stepKey}: branch path contains an empty source endpoint identity`);
      assert.ok(replaySite.endpointTargets.some((target) => target.key === replay.sourceEndpoint.sourceTargetKey),
        `${record.benchId}/${record.stepKey}: branch path cites unknown source target ` +
        replay.sourceEndpoint.sourceTargetKey);
    }
    assert.equal(
      record.layoutSettleEvidenceSha256,
      digestCaliforniaSignatureLayoutSettleEvidence(record.layoutSettleEvidence),
      `${record.benchId}/${record.stepKey}: layout settle evidence integrity digest drifted`
    );
    const requiresLayoutSettleEvidence = californiaSignatureCanvasGraphicsRequired(record);
    assert.equal(
      record.canvasGraphicsEvidenceSha256,
      record.canvasGraphicsEvidence?.evidenceSha256 ?? null,
      `${record.benchId}/${record.stepKey}: Canvas graphics evidence digest attribution drifted`
    );
    if (requiresLayoutSettleEvidence) {
      assert.ok(record.canvasGraphicsEvidence,
        `${record.benchId}/${record.stepKey}: ${record.phase} evidence has no Canvas graphics receipt`);
      const expectedCanvasStateKey = californiaCanvasGraphicsStateKey(record);
      assertCaliforniaCanvasGraphicsCapturedRoute(record.canvasGraphicsEvidence, record.labId);
      assertCaliforniaCanvasGraphicsStateEvidence(record.canvasGraphicsEvidence, {
        benchId: record.benchId,
        capturedUrl: record.canvasGraphicsEvidence.capturedUrl,
        maxAgeMs: 0,
        nowEpochMs: record.canvasGraphicsEvidence.capturedAtEpochMs,
        runtimeRunId: options.externalExpectations?.expectedRuntimeRunId ??
          record.canvasGraphicsEvidence.runtimeRunId,
        stateKey: expectedCanvasStateKey,
        surfaceKey: "signature-canvas"
      }, californiaCanvasGraphicsSourceContract);
      assert.ok(record.canvasGraphicsContrastAck,
        `${record.benchId}/${record.stepKey}: Canvas graphics receipt has no browser contrast-consume acknowledgement`);
      assert.ok(record.canvasGraphicsNodeAck,
        `${record.benchId}/${record.stepKey}: Canvas graphics receipt has no Node one-shot consume acknowledgement`);
      assertCaliforniaCanvasGraphicsContrastConsumeAck(
        record.canvasGraphicsContrastAck,
        record.canvasGraphicsEvidence,
        {
          benchId: record.benchId,
          capturedUrl: record.canvasGraphicsEvidence.capturedUrl,
          maxAgeMs: 0,
          nowEpochMs: record.canvasGraphicsContrastAck.acknowledgedAtEpochMs,
          runtimeRunId: options.externalExpectations?.expectedRuntimeRunId ??
            record.canvasGraphicsEvidence.runtimeRunId,
          stateKey: expectedCanvasStateKey,
          surfaceKey: "signature-canvas"
        },
        californiaCanvasGraphicsSourceContract
      );
      assert.equal(record.canvasGraphicsNodeAck.consumed, true,
        `${record.benchId}/${record.stepKey}: Node one-shot acknowledgement is not consumed`);
      assert.equal(record.canvasGraphicsNodeAck.receiptId, record.canvasGraphicsEvidence.receiptId,
        `${record.benchId}/${record.stepKey}: Node one-shot acknowledgement receipt drifted`);
      assert.equal(record.canvasGraphicsNodeAck.evidenceSha256,
        record.canvasGraphicsEvidence.evidenceSha256,
        `${record.benchId}/${record.stepKey}: Node one-shot acknowledgement evidence digest drifted`);
      assert.equal(record.canvasGraphicsNodeAck.runtimeRunId,
        options.externalExpectations?.expectedRuntimeRunId ?? record.canvasGraphicsEvidence.runtimeRunId,
        `${record.benchId}/${record.stepKey}: Node one-shot acknowledgement run identity drifted`);
      assert.ok(record.layoutSettleEvidence,
        `${record.benchId}/${record.stepKey}: ${record.phase} evidence has no durable DOM/SVG settle evidence`);
      assertCaliforniaSignatureLayoutSettleEvidence(
        record.layoutSettleEvidence,
        `${record.benchId}/${record.stepKey}`
      );
    } else {
      assert.equal(record.canvasGraphicsContrastAck, null,
        `${record.benchId}/${record.stepKey}: non-render ledger row carries a browser contrast acknowledgement`);
      assert.equal(record.canvasGraphicsEvidence, null,
        `${record.benchId}/${record.stepKey}: only structural states and layout endpoints may carry Canvas graphics evidence`);
      assert.equal(record.canvasGraphicsNodeAck, null,
        `${record.benchId}/${record.stepKey}: non-render ledger row carries a Node consume acknowledgement`);
      assert.equal(record.layoutSettleEvidence, null,
        `${record.benchId}/${record.stepKey}: only structural states and layout endpoints may carry settle evidence`);
    }
    if (record.phase === "structural") {
      assert.ok(CALIFORNIA_SIGNATURE_STRUCTURAL_AXIS_IDS.includes(record.axisId),
        `structural record has invalid axis ${record.axisId}`);
      assert.equal(record.sourceSiteKey, null);
      assert.equal(record.endpoint, null);
    } else if (record.phase === "layout") {
      assert.ok(CALIFORNIA_SIGNATURE_LAYOUT_AXIS_IDS.includes(record.axisId),
        `layout record has invalid axis ${record.axisId}`);
      if (record.sourceSiteKey === null) {
        assert.equal(record.instanceKey, null);
        assert.equal(record.endpoint, null);
      } else {
        assert.ok(record.instanceKey);
      }
    } else {
      assert.equal(record.axisId, CALIFORNIA_SIGNATURE_FUNCTIONAL_AXIS_ID);
      if (record.sourceSiteKey === null) {
        assert.equal(record.instanceKey, null);
        assert.equal(record.endpoint, null);
      } else {
        assert.ok(record.instanceKey);
      }
    }
  }
  if (options.sourceEvidenceOracle && options.externalExpectations) {
    assertCaliforniaSignatureSourceOracleCanvasReceiptMatrixExact({
      actual: observeCaliforniaSignatureCanvasReceiptMatrix({
        evidence: options.evidence,
        manifest: options.manifest
      }),
      expected: buildCaliforniaSignatureSourceOracleCanvasReceiptMatrix({
        manifest: options.manifest,
        oracle: options.sourceEvidenceOracle
      }),
      expectedRuntimeRunId: options.externalExpectations.expectedRuntimeRunId
    });
  }
}

function assertExactStringSet(expectedInput: readonly string[], actualInput: readonly string[], label: string) {
  if (new Set(expectedInput).size !== expectedInput.length) throw new Error(`${label}: duplicate expected keys`);
  if (new Set(actualInput).size !== actualInput.length) throw new Error(`${label}: duplicate actual keys`);
  const expected = new Set(expectedInput);
  const actual = new Set(actualInput);
  const missing = expectedInput.filter((key) => !actual.has(key));
  const extra = actualInput.filter((key) => !expected.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} is not exact; missing=${JSON.stringify(missing.slice(0, 8))}; ` +
      `extra=${JSON.stringify(extra.slice(0, 8))}`
    );
  }
}

/** Structural and source-site cardinality checks that remain independent of the reviewed digest. */
export function assertCaliforniaSignatureExhaustiveMatrixComplete(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  externalExpectations?: CaliforniaSignatureExternalEvidenceExpectations;
  manifest: CaliforniaSignatureSourceManifest;
  sourceEvidenceOracle?: CaliforniaSignatureSourceExpectedEvidenceOracle;
}) {
  const sourceEvidenceOracle = options.sourceEvidenceOracle;
  const externalExpectations = options.externalExpectations;
  assert.ok(sourceEvidenceOracle,
    "official California signature aggregate requires the independent source evidence oracle");
  assert.ok(externalExpectations,
    "official California signature aggregate requires external runtime/origin/route ownership");
  snapshotCaliforniaSignatureExhaustiveEvidence(options.evidence);
  validateCaliforniaSignatureEvidenceRecords({
    evidence: options.evidence,
    externalExpectations,
    manifest: options.manifest,
    sourceEvidenceOracle
  });
  const canvasRenderRecords = options.evidence.filter((record) =>
    record.canvasGraphicsEvidence !== null
  );
  const receiptIds = canvasRenderRecords.map((record) => record.canvasGraphicsEvidence!.receiptId);
  assert.equal(new Set(receiptIds).size, receiptIds.length,
    "California signature Canvas receipt matrix repeats a one-shot receipt");
  assertCaliforniaCanvasGraphicsAggregateCoverage(
    canvasRenderRecords.map((record) => {
      assert.ok(record.canvasGraphicsContrastAck,
        `${record.benchId}/${record.stepKey}: aggregate receipt lost its browser consume ACK`);
      return {
        contrastConsumeAck: record.canvasGraphicsContrastAck,
        evidence: record.canvasGraphicsEvidence!
      };
    }),
    californiaCanvasGraphicsSourceContract
  );
  return {
    canvasReceiptRows: canvasRenderRecords.length,
    evidenceRows: options.evidence.length,
    runtimeRunId: externalExpectations.expectedRuntimeRunId,
    sourceOracleRows: sourceEvidenceOracle.counts.evidenceRows
  };
}
