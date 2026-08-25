import { createHash } from "node:crypto";
import type { Locator, Page } from "@playwright/test";

export type HkVisualizationLearnerCertificationInput = Readonly<{
  auditable: boolean;
  disabled: boolean;
  excluded: boolean;
  explicitIssue: boolean;
  hiddenInput: boolean;
  semanticHidden: boolean;
}>;

export type HkVisualizationSoftWrapDecisionInput = Readonly<{
  contentWidth: number;
  isTextarea: boolean;
  lineWidths: readonly number[];
  wrap: string;
}>;

export type HkVisualizationDecisionContract = Readonly<{
  composedParentBehavior: (element: Element) => Element | null;
  learnerCertification: (
    input: HkVisualizationLearnerCertificationInput,
  ) => boolean;
  multiSelectCompleteness: (
    eligibleOptionCount: number,
    measurableOptionCount: number,
  ) => boolean;
  softWrapDecision: (
    input: HkVisualizationSoftWrapDecisionInput,
  ) => string | null;
}>;

export const hkVisualizationDecisionContractSource = String.raw`({
  composedParentBehavior: function hkVisualizationComposedParentBehavior(element) {
    if (element.assignedSlot) return element.assignedSlot;
    if (element.parentElement) return element.parentElement;
    const rootNode = element.getRootNode();
    if (
      rootNode &&
      typeof rootNode === "object" &&
      "host" in rootNode &&
      rootNode.host
    )
      return rootNode.host;
    return null;
  },
  learnerCertification: function hkVisualizationLearnerCertification(input) {
    return (
      !input.semanticHidden &&
      !input.hiddenInput &&
      !input.disabled &&
      !input.excluded &&
      (input.auditable || input.explicitIssue)
    );
  },
  multiSelectCompleteness: function hkVisualizationMultiSelectCompleteness(
    eligibleOptionCount,
    measurableOptionCount
  ) {
    return (
      Number.isSafeInteger(eligibleOptionCount) &&
      eligibleOptionCount >= 0 &&
      Number.isSafeInteger(measurableOptionCount) &&
      measurableOptionCount >= 0 &&
      measurableOptionCount === eligibleOptionCount
    );
  },
  softWrapDecision: function hkVisualizationSoftWrapDecision(input) {
    if (
      input.isTextarea &&
      input.wrap !== "off" &&
      input.lineWidths.some(
        (lineWidth) => lineWidth > input.contentWidth + 0.5
      )
    )
      return "textarea soft-wrapped glyph positions are not exposed by DOM geometry";
    return null;
  }
})`;

export const hkVisualizationDecisionContractSourceSha256 =
  "61e5ff8f74626fc3000ac4644c9678befc68f10de34c23ba993b49958d4e2b9d";

type HkVisualizationFunctionConstructor = (
  ...parameters: string[]
) => Function;

export function compileHkVisualizationDecisionContract(
  source = hkVisualizationDecisionContractSource,
  expectedSha256 = hkVisualizationDecisionContractSourceSha256,
  functionConstructor: HkVisualizationFunctionConstructor = Function,
): HkVisualizationDecisionContract {
  if (
    source !== hkVisualizationDecisionContractSource ||
    expectedSha256 !== hkVisualizationDecisionContractSourceSha256
  )
    throw new Error("HK scanner decision contract import pin mismatch.");
  const actualSha256 = createHash("sha256")
    .update(source, "utf8")
    .digest("hex");
  if (actualSha256 !== expectedSha256)
    throw new Error(
      `HK scanner decision contract source hash mismatch: ${actualSha256}.`,
    );
  let candidate: unknown;
  try {
    candidate = functionConstructor(
      `"use strict"; return (${source});`,
    )();
  } catch (cause) {
    throw new Error(
      "HK scanner decision contract construction failed closed.",
      { cause },
    );
  }
  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof (candidate as Partial<HkVisualizationDecisionContract>)
      .composedParentBehavior !== "function" ||
    typeof (candidate as Partial<HkVisualizationDecisionContract>)
      .learnerCertification !== "function" ||
    typeof (candidate as Partial<HkVisualizationDecisionContract>)
      .multiSelectCompleteness !== "function" ||
    typeof (candidate as Partial<HkVisualizationDecisionContract>)
      .softWrapDecision !== "function" ||
    Object.keys(candidate).join(",") !==
      "composedParentBehavior,learnerCertification,multiSelectCompleteness,softWrapDecision"
  )
    throw new Error("HK scanner decision contract has an invalid shape.");
  return Object.freeze(candidate) as HkVisualizationDecisionContract;
}

const hkVisualizationDecisionContract =
  compileHkVisualizationDecisionContract();

export const hkVisualizationLearnerCertification =
  hkVisualizationDecisionContract.learnerCertification;
export const hkVisualizationSoftWrapDecision =
  hkVisualizationDecisionContract.softWrapDecision;
export const hkVisualizationMultiSelectCompleteness =
  hkVisualizationDecisionContract.multiSelectCompleteness;
export const hkVisualizationComposedParentBehavior =
  hkVisualizationDecisionContract.composedParentBehavior;

export type HkVisualizationOverlapOwnerRisk =
  | "missing-reason"
  | "banned-owner"
  | "too-broad"
  | "dormant-narrow-owner"
  | "explicit-narrow-pair";

export type HkVisualizationOverlapOwnerMetrics = {
  areaRatio: number;
  banned: boolean;
  candidateCount: number;
  heightRatio: number;
  reason: string | null;
  scope: "self" | "svg-group" | "html-wrapper";
  widthRatio: number;
};

export type HkVisualizationEffectiveVisibilityEvidence = {
  ariaHiddenAncestor: boolean;
  displayNoneAncestor: boolean;
  effectiveOpacity: number;
  height: number;
  hiddenAncestor: boolean;
  inertAncestor: boolean;
  pointerEventsNone: boolean;
  visibilityHidden: boolean;
  visuallyVisible: boolean;
  width: number;
};

export type HkVisualizationRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type HkVisualizationCollisionPairKind =
  | "control-control"
  | "dom-text-text"
  | "svg-label-label"
  | "svg-label-mark"
  | "text-control"
  | "text-occlusion";

export type HkVisualizationCollisionIssueKind =
  | HkVisualizationCollisionPairKind
  | "control-hidden-focusable"
  | "control-touch-target"
  | "unsupported-form-value-geometry"
  | "unsupported-shadow-hit-test";

/**
 * Counts eligible pair attempts, not collisions. A pair is counted only after
 * learner-visibility and the applicable containment, same-fragment-parent,
 * and narrow-exemption filters have passed, immediately before its geometry
 * or paint comparison runs.
 */
export type HkVisualizationCollisionCandidatePairCounts = Record<
  HkVisualizationCollisionPairKind,
  number
>;

export type HkVisualizationCollisionIssue = {
  first: string;
  firstRect: HkVisualizationRect;
  intersection: HkVisualizationRect;
  kind: HkVisualizationCollisionIssueKind;
  second: string;
  secondRect: HkVisualizationRect;
  surface?: string;
};

export type HkVisualizationOverlapExemptionEvidence = {
  areaRatio: number;
  candidateCount: number;
  heightRatio: number;
  owner: string;
  pair: string[];
  reason: string | null;
  risk: HkVisualizationOverlapOwnerRisk;
  scope: HkVisualizationOverlapOwnerMetrics["scope"];
  widthRatio: number;
};

export type HkVisualizationCollisionSnapshot = {
  canvasSurfaceCount: number;
  candidatePairCounts: HkVisualizationCollisionCandidatePairCounts;
  htmlTextFragmentCount: number;
  /** Exact sum of the four learner-visible candidate counts in this snapshot. */
  inspectedCandidateCount: number;
  learnerControlCount: number;
  overlapExemptions: HkVisualizationOverlapExemptionEvidence[];
  issues: HkVisualizationCollisionIssue[];
  paintedMarkCount: number;
  phase: string;
  svgSurfaceCount: number;
  svgTextFragmentCount: number;
  /** Exact sum of the six eligible candidate-pair attempt counts. */
  totalCandidatePairCount: number;
  truncated: boolean;
};

export const controlSelector = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  "[role=button]",
  "[role=slider]",
  "[role=menuitemradio]",
].join(",");

export const effectiveVisibilityGlobalName =
  "__hkVisualizationEffectiveVisibilityV1";
export const shadowRootsGlobalName = "__hkVisualizationShadowRootsV1";

export async function installHkVisualizationEffectiveVisibilityInspector(
  page: Page,
) {
  await page.addInitScript(({
    decisionContractSource,
    globalName,
    shadowRootsName,
  }) => {
    type Inspector = (
      element: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const inspectorScope = globalThis as unknown as Record<string, Inspector>;
    const shadowScope = globalThis as unknown as Record<string, unknown>;
    const existingShadowRoots = shadowScope[shadowRootsName];
    const shadowRoots = Array.isArray(existingShadowRoots)
      ? (existingShadowRoots as ShadowRoot[])
      : [];
    shadowScope[shadowRootsName] = shadowRoots;
    const patchMarker = `${shadowRootsName}:attach-shadow-patched`;
    if (shadowScope[patchMarker] !== true) {
      const nativeAttachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function hkVisualizationAttachShadow(
        init: ShadowRootInit,
      ) {
        const shadowRoot = nativeAttachShadow.call(this, init);
        shadowRoots.push(shadowRoot);
        return shadowRoot;
      };
      shadowScope[patchMarker] = true;
    }
    let browserDecisionContract: unknown;
    try {
      browserDecisionContract = Function(
        `"use strict"; return (${decisionContractSource});`,
      )();
    } catch (cause) {
      throw new Error(
        "HK visibility inspector decision contract construction failed closed.",
        { cause },
      );
    }
    if (
      !browserDecisionContract ||
      typeof browserDecisionContract !== "object" ||
      typeof (
        browserDecisionContract as Partial<HkVisualizationDecisionContract>
      ).composedParentBehavior !== "function" ||
      typeof (
        browserDecisionContract as Partial<HkVisualizationDecisionContract>
      ).learnerCertification !== "function" ||
      typeof (
        browserDecisionContract as Partial<HkVisualizationDecisionContract>
      ).multiSelectCompleteness !== "function" ||
      typeof (
        browserDecisionContract as Partial<HkVisualizationDecisionContract>
      ).softWrapDecision !== "function" ||
      Object.keys(browserDecisionContract).join(",") !==
        "composedParentBehavior,learnerCertification,multiSelectCompleteness,softWrapDecision"
    )
      throw new Error(
        "HK visibility inspector decision contract has an invalid shape.",
      );
    const { composedParentBehavior } =
      browserDecisionContract as HkVisualizationDecisionContract;
    const composedParent = composedParentBehavior;
    inspectorScope[globalName] = (element) => {
      const rect = element.getBoundingClientRect();
      const elementStyle = getComputedStyle(element);
      let effectiveOpacity = 1;
      let displayNoneAncestor = false;
      let hiddenAncestor = false;
      let inertAncestor = false;
      let ariaHiddenAncestor = false;
      let current: Element | null = element;
      while (current) {
        const style = getComputedStyle(current);
        const parsedOpacity = style.opacity.trim() ? Number(style.opacity) : 1;
        effectiveOpacity *= Number.isFinite(parsedOpacity)
          ? Math.min(1, Math.max(0, parsedOpacity))
          : 1;
        displayNoneAncestor ||=
          style.display === "none" || style.contentVisibility === "hidden";
        hiddenAncestor ||= current.hasAttribute("hidden");
        inertAncestor ||=
          current.hasAttribute("inert") ||
          (current instanceof HTMLElement && current.inert);
        ariaHiddenAncestor ||=
          current.getAttribute("aria-hidden")?.trim().toLowerCase() === "true";
        current = composedParent(current);
      }
      const visibilityHidden =
        elementStyle.visibility === "hidden" ||
        elementStyle.visibility === "collapse";
      return {
        ariaHiddenAncestor,
        displayNoneAncestor,
        effectiveOpacity,
        height: rect.height,
        hiddenAncestor,
        inertAncestor,
        pointerEventsNone: elementStyle.pointerEvents === "none",
        visibilityHidden,
        visuallyVisible:
          element.isConnected &&
          rect.width > 1 &&
          rect.height > 1 &&
          !displayNoneAncestor &&
          !visibilityHidden &&
          effectiveOpacity > 0,
        width: rect.width,
      };
    };
  }, {
    decisionContractSource: hkVisualizationDecisionContractSource,
    globalName: effectiveVisibilityGlobalName,
    shadowRootsName: shadowRootsGlobalName,
  });
}

export async function scanHkVisualizationCollisions(
  workspace: Locator,
  phase = "microfixture",
): Promise<HkVisualizationCollisionSnapshot> {
  return await workspace.evaluate(
    (root, scanOptions) => {
      const tolerance = 4;
      const maxIssues = 100;
      const issues: HkVisualizationCollisionIssue[] = [];
      const overlapExemptions: HkVisualizationOverlapExemptionEvidence[] = [];
      const candidatePairCounts: HkVisualizationCollisionCandidatePairCounts = {
        "control-control": 0,
        "dom-text-text": 0,
        "svg-label-label": 0,
        "svg-label-mark": 0,
        "text-control": 0,
        "text-occlusion": 0,
      };
      let canvasSurfaceCount = 0;
      let svgSurfaceCount = 0;
      let truncated = false;

      let browserDecisionContract: unknown;
      try {
        browserDecisionContract = Function(
          `"use strict"; return (${scanOptions.decisionContractSource});`,
        )();
      } catch (cause) {
        throw new Error(
          "HK collision scanner decision contract construction failed closed.",
          { cause },
        );
      }
      if (
        !browserDecisionContract ||
        typeof browserDecisionContract !== "object" ||
        typeof (
          browserDecisionContract as Partial<HkVisualizationDecisionContract>
        ).composedParentBehavior !== "function" ||
        typeof (
          browserDecisionContract as Partial<HkVisualizationDecisionContract>
        ).learnerCertification !== "function" ||
        typeof (
          browserDecisionContract as Partial<HkVisualizationDecisionContract>
        ).multiSelectCompleteness !== "function" ||
        typeof (
          browserDecisionContract as Partial<HkVisualizationDecisionContract>
        ).softWrapDecision !== "function" ||
        Object.keys(browserDecisionContract).join(",") !==
          "composedParentBehavior,learnerCertification,multiSelectCompleteness,softWrapDecision"
      )
        throw new Error(
          "HK collision scanner decision contract has an invalid shape.",
        );
      const {
        composedParentBehavior,
        learnerCertification,
        multiSelectCompleteness,
        softWrapDecision,
      } =
        browserDecisionContract as HkVisualizationDecisionContract;

      const countCandidatePair = (kind: HkVisualizationCollisionPairKind) => {
        candidatePairCounts[kind] += 1;
      };

      const rounded = (
        rect:
          | DOMRect
          | { left: number; right: number; top: number; bottom: number },
      ): HkVisualizationRect => ({
        height: Math.round((rect.bottom - rect.top) * 10) / 10,
        width: Math.round((rect.right - rect.left) * 10) / 10,
        x: Math.round(rect.left * 10) / 10,
        y: Math.round(rect.top * 10) / 10,
      });
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
      const recordedShadowRoots = (
        globalThis as unknown as Record<string, ShadowRoot[] | undefined>
      )[scanOptions.shadowRootsGlobalName] ?? [];
      const composedParent = composedParentBehavior;
      const composedContains = (container: Element, candidate: Element) => {
        let current: Element | null = candidate;
        while (current) {
          if (current === container) return true;
          current = composedParent(current);
        }
        return false;
      };
      const composedClosest = (candidate: Element, selector: string) => {
        let current: Element | null = candidate;
        while (current) {
          if (current.matches(selector)) return current;
          current = composedParent(current);
        }
        return null;
      };
      const collectComposedShadowRoots = () => {
        const pendingShadowRoots: ShadowRoot[] = [];
        const seenShadowRoots = new Set<ShadowRoot>();
        const enqueueOpenShadowRoots = (scope: Element | ShadowRoot) => {
          const elements = scope instanceof Element
            ? [scope, ...Array.from(scope.querySelectorAll("*"))]
            : Array.from(scope.querySelectorAll("*"));
          for (const element of elements) {
            if (element.shadowRoot)
              pendingShadowRoots.push(element.shadowRoot);
          }
        };
        enqueueOpenShadowRoots(root);
        for (const shadowRoot of recordedShadowRoots) {
          if (composedContains(root, shadowRoot.host))
            pendingShadowRoots.push(shadowRoot);
        }
        while (pendingShadowRoots.length > 0) {
          const shadowRoot = pendingShadowRoots.shift();
          if (!shadowRoot || seenShadowRoots.has(shadowRoot)) continue;
          seenShadowRoots.add(shadowRoot);
          enqueueOpenShadowRoots(shadowRoot);
        }
        return Array.from(seenShadowRoots);
      };
      const composedShadowRoots = collectComposedShadowRoots();
      const composedScopes: Array<Element | ShadowRoot> = [
        root,
        ...composedShadowRoots,
      ];
      const queryAllComposed = (selector: string) => {
        const matches = new Set<Element>();
        for (const scope of composedScopes) {
          for (const match of Array.from(scope.querySelectorAll(selector)))
            matches.add(match);
        }
        return Array.from(matches);
      };
      const keyboardFocusable = (element: Element) => {
        if (!(element instanceof HTMLElement) || element.tabIndex < 0)
          return false;
        if (
          element instanceof HTMLInputElement &&
          element.type.toLowerCase() === "hidden"
        )
          return false;
        if (
          ((element instanceof HTMLButtonElement ||
            element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement) &&
            element.disabled) ||
          element.getAttribute("aria-disabled")?.trim().toLowerCase() === "true"
        )
          return false;
        // This is intentional keyboard-focus intent, not a claim that the
        // browser can currently focus the element. A tabindex/native-control
        // intent under hidden/inert/aria-hidden semantics is itself an explicit
        // scanner inconsistency and must not disappear with visual candidates.
        return true;
      };
      const describe = (element: Element, index = 0) => {
        const text = (
          element.getAttribute("aria-label") ??
          element.textContent ??
          ""
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 70);
        const id = element.id ? `#${element.id}` : "";
        return `${element.tagName.toLowerCase()}${id}[${index}]${text ? ` \"${text}\"` : ""}`;
      };
      type RectLike = {
        bottom: number;
        left: number;
        right: number;
        top: number;
      };
      const intersection = (
        first: RectLike,
        second: RectLike,
        pairTolerance = tolerance,
      ) => {
        const left = Math.max(first.left, second.left);
        const right = Math.min(first.right, second.right);
        const top = Math.max(first.top, second.top);
        const bottom = Math.min(first.bottom, second.bottom);
        if (right - left <= pairTolerance || bottom - top <= pairTolerance)
          return null;
        return { left, right, top, bottom };
      };
      const svgTextLeafSelector =
        "svg text:not(:has(tspan, textPath)), svg tspan, svg textPath";
      const paintedSvgSelector =
        "line, path, rect, circle, ellipse, polygon, polyline, use, image";
      const screenRectForMark = (element: Element): RectLike => {
        const rect = element.getBoundingClientRect();
        if (!(element instanceof SVGGraphicsElement)) return rect;
        const style = getComputedStyle(element);
        const strokeWidth =
          style.stroke === "none" ? 0 : Number.parseFloat(style.strokeWidth);
        if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) return rect;
        const matrix = element.getScreenCTM();
        const scaleX = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
        const scaleY = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
        const expandX = Math.max(0.5, (strokeWidth * scaleX) / 2);
        const expandY = Math.max(0.5, (strokeWidth * scaleY) / 2);
        return {
          bottom: rect.bottom + expandY,
          left: rect.left - expandX,
          right: rect.right + expandX,
          top: rect.top - expandY,
        };
      };
      const paintedVisible = (element: Element) => {
        const visibility = inspector(element);
        const rect = screenRectForMark(element);
        return (
          element.isConnected &&
          rect.right - rect.left > 1 &&
          rect.bottom - rect.top > 1 &&
          visibility.effectiveOpacity > 0.01 &&
          !visibility.displayNoneAncestor &&
          !visibility.visibilityHidden &&
          !visibility.hiddenAncestor &&
          !visibility.inertAncestor &&
          !visibility.ariaHiddenAncestor
        );
      };
      const expandedPaintedMarks = (scope: Element) => {
        const marks = new Set<Element>();
        for (const semanticMark of Array.from(
          scope.querySelectorAll("[data-viz-mark]"),
        )) {
          if (
            semanticMark instanceof SVGElement &&
            semanticMark.matches("g, svg")
          ) {
            for (const leaf of Array.from(
              semanticMark.querySelectorAll(paintedSvgSelector),
            ))
              marks.add(leaf);
          } else {
            marks.add(semanticMark);
          }
        }
        return Array.from(marks).filter(paintedVisible);
      };
      const push = (issue: HkVisualizationCollisionIssue) => {
        if (issues.length < maxIssues) issues.push(issue);
        else truncated = true;
      };
      const createComposedElementsFromPoint = (
        {
          composedContains: hitTestContains,
          composedParent: hitTestParent,
          documentScope,
          onUnsupported,
          root: hitTestRoot,
          shadowRoots,
        }: {
          composedContains: (container: Element, candidate: Element) => boolean;
          composedParent: (element: Element) => Element | null;
          documentScope: Document;
          onUnsupported: (scope: Document | ShadowRoot) => void;
          root: Element;
          shadowRoots: readonly ShadowRoot[];
        },
      ) => {
        const shadowRootByHost = new Map<Element, ShadowRoot>();
        for (const shadowRoot of shadowRoots) {
          if (hitTestContains(hitTestRoot, shadowRoot.host))
            shadowRootByHost.set(shadowRoot.host, shadowRoot);
        }
        const belongsToScope = (
          scope: Document | ShadowRoot,
          candidate: Element,
        ) => {
          if (!hitTestContains(hitTestRoot, candidate)) return false;
          if (scope === documentScope) return true;
          if (!("host" in scope)) {
            onUnsupported(scope);
            return false;
          }
          let current: Element | null = candidate;
          while (current && current !== scope.host) {
            if (current.getRootNode() === scope) return true;
            current = hitTestParent(current);
          }
          return false;
        };
        return (x: number, y: number) => {
          const orderedLayers: Element[] = [];
          const seenElements = new Set<Element>();
          const activeScopes = new Set<Document | ShadowRoot>();
          const visitedScopes = new Set<Document | ShadowRoot>();
          const visitScope = (scope: Document | ShadowRoot) => {
            if (activeScopes.has(scope)) {
              onUnsupported(scope);
              return;
            }
            activeScopes.add(scope);
            visitedScopes.add(scope);
            try {
              if (typeof scope.elementsFromPoint !== "function") {
                onUnsupported(scope);
                return;
              }
              const scopeLayers = Array.from(scope.elementsFromPoint(x, y));
              for (const layer of scopeLayers) {
                if (!belongsToScope(scope, layer) || seenElements.has(layer))
                  continue;
                seenElements.add(layer);
                const shadowRoot = shadowRootByHost.get(layer);
                if (shadowRoot) visitScope(shadowRoot);
                orderedLayers.push(layer);
              }
            } catch {
              onUnsupported(scope);
              return;
            } finally {
              activeScopes.delete(scope);
            }
          };
          visitScope(documentScope);
          for (const shadowRoot of shadowRootByHost.values()) {
            if (visitedScopes.has(shadowRoot)) continue;
            try {
              if (typeof shadowRoot.elementsFromPoint !== "function") {
                onUnsupported(shadowRoot);
                continue;
              }
              if (
                Array.from(shadowRoot.elementsFromPoint(x, y)).some((layer) =>
                  belongsToScope(shadowRoot, layer)
                )
              )
                onUnsupported(shadowRoot);
            } catch {
              onUnsupported(shadowRoot);
            }
          }
          return orderedLayers;
        };
      };
      const composedElementsFromPoint = createComposedElementsFromPoint(
        {
          composedContains,
          composedParent,
          documentScope: document,
          onUnsupported: (() => {
            const reportedScopes = new Set<Document | ShadowRoot>();
            return (scope: Document | ShadowRoot) => {
              if (reportedScopes.has(scope)) return;
              reportedScopes.add(scope);
              const owner = scope instanceof ShadowRoot ? scope.host : root;
              const rect = owner.getBoundingClientRect();
              push({
                first: describe(owner),
                firstRect: rounded(rect),
                intersection: rounded(rect),
                kind: "unsupported-shadow-hit-test",
                second:
                  "required composed scope cannot supply elementsFromPoint evidence",
                secondRect: rounded(rect),
              });
            };
          })(),
          root,
          shadowRoots: composedShadowRoots,
        },
      );
      const overlapRisks = new Map<Element, HkVisualizationOverlapOwnerRisk>();
      const exemptionOwner = (element: Element) =>
        composedClosest(element, "[data-viz-overlap-ok]");
      const pairIsNarrowlyExempt = (first: Element, second: Element) => {
        const firstOwner = exemptionOwner(first);
        const secondOwner = exemptionOwner(second);
        if (!firstOwner || firstOwner !== secondOwner) return false;
        return overlapRisks.get(firstOwner) === "explicit-narrow-pair";
      };

      queryAllComposed("[data-viz-overlap-ok]")
        .filter(learnerVisible)
        .forEach((owner, index) => {
          const reason =
            owner.getAttribute("data-viz-overlap-reason")?.trim() || null;
          const scope: HkVisualizationOverlapOwnerMetrics["scope"] =
            owner.namespaceURI === "http://www.w3.org/2000/svg" &&
            owner.tagName.toLowerCase() === "g"
              ? "svg-group"
              : owner.matches(
                    "[data-viz-label], [data-viz-mark], svg text, " +
                      scanOptions.controlSelector,
                  )
                ? "self"
                : "html-wrapper";
          const candidateSelector = `[data-viz-label], [data-viz-mark], ${scanOptions.controlSelector}`;
          const candidates = new Set<Element>();
          const candidateVisible = (candidate: Element) =>
            candidate.matches("[data-viz-mark]")
              ? paintedVisible(candidate)
              : learnerVisible(candidate);
          if (owner.matches(candidateSelector) && candidateVisible(owner))
            candidates.add(owner);
          for (const candidate of queryAllComposed(candidateSelector)) {
            if (
              composedContains(owner, candidate) &&
              candidateVisible(candidate)
            )
              candidates.add(candidate);
          }
          if (
            owner.matches("text:not(:has(tspan, textPath)), tspan, textPath") &&
            learnerVisible(owner)
          )
            candidates.add(owner);
          for (const candidate of queryAllComposed(
            "text:not(:has(tspan, textPath)), tspan, textPath",
          )) {
            if (
              composedContains(owner, candidate) && learnerVisible(candidate)
            )
              candidates.add(candidate);
          }
          for (const textScope of composedScopes) {
            const textWalker = document.createTreeWalker(
              textScope,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode(node) {
                  const parent = node.parentElement;
                  const text = node.textContent?.replace(/\s+/g, " ").trim();
                  return parent &&
                    composedContains(owner, parent) &&
                    !composedClosest(parent, "svg") &&
                    text &&
                    learnerVisible(parent)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
                },
              },
            );
            while (textWalker.nextNode()) {
              const parent = textWalker.currentNode.parentElement;
              if (parent) candidates.add(parent);
            }
          }
          const candidateEntries = Array.from(candidates).map((candidate) => ({
            candidate,
            rect: candidate.matches("[data-viz-mark]")
              ? screenRectForMark(candidate)
              : candidate.getBoundingClientRect(),
            role: candidate.matches(scanOptions.controlSelector)
              ? "control"
              : candidate.matches("[data-viz-mark]")
                ? "mark"
                : "label",
          }));
          const unionRect =
            candidateEntries.length > 0
              ? {
                  bottom: Math.max(
                    ...candidateEntries.map((entry) => entry.rect.bottom),
                  ),
                  left: Math.min(
                    ...candidateEntries.map((entry) => entry.rect.left),
                  ),
                  right: Math.max(
                    ...candidateEntries.map((entry) => entry.rect.right),
                  ),
                  top: Math.min(
                    ...candidateEntries.map((entry) => entry.rect.top),
                  ),
                }
              : owner.getBoundingClientRect();
          const unionWidth = Math.max(0, unionRect.right - unionRect.left);
          const unionHeight = Math.max(0, unionRect.bottom - unionRect.top);
          const reference =
            composedClosest(owner, "[data-viz-surface]") ?? root;
          const referenceRect = reference.getBoundingClientRect();
          const ownerId =
            owner.getAttribute("data-viz-overlap-ok")?.trim() ?? "";
          const memberRoles = candidateEntries
            .map((entry) => entry.role)
            .sort();
          const explicitMembers = candidateEntries.map(
            (entry) =>
              entry.candidate.getAttribute("data-viz-overlap-member")?.trim() ||
              null,
          );
          const explicitMemberContract =
            explicitMembers.every((member) => member === null) ||
            (explicitMembers.filter(Boolean).length === 2 &&
              new Set(explicitMembers).size === 2 &&
              explicitMembers.includes("label") &&
              explicitMembers.includes("mark"));
          const exactRolePair =
            ownerId.length > 0 &&
            candidateEntries.length === 2 &&
            memberRoles[0] === "label" &&
            memberRoles[1] === "mark" &&
            explicitMemberContract;
          const metrics: HkVisualizationOverlapOwnerMetrics = {
            areaRatio:
              (unionWidth * unionHeight) /
              Math.max(1, referenceRect.width * referenceRect.height),
            banned:
              owner === root ||
              owner.matches(
                [
                  "[data-viz-active-lab-id]",
                  "[data-hk-viz-model]",
                  "[data-viz-configured-model]",
                  "[data-viz-configured-state]",
                  "[data-viz-surface]",
                  "[data-viz-panel-mode]",
                  "[data-viz-card]",
                  "[data-viz-card-body]",
                ].join(","),
              ),
            candidateCount: candidates.size,
            heightRatio: unionHeight / Math.max(1, referenceRect.height),
            reason,
            scope,
            widthRatio: unionWidth / Math.max(1, referenceRect.width),
          };
          const risk: HkVisualizationOverlapOwnerRisk = !metrics.reason?.trim()
            ? "missing-reason"
            : metrics.banned
              ? "banned-owner"
              : !exactRolePair
                ? "too-broad"
                : metrics.candidateCount > 2 ||
                    metrics.areaRatio > 0.3 ||
                    metrics.widthRatio > 0.9 ||
                    metrics.heightRatio > 0.8
                  ? "too-broad"
                  : metrics.candidateCount === 2
                    ? "explicit-narrow-pair"
                    : "dormant-narrow-owner";
          overlapRisks.set(owner, risk);
          overlapExemptions.push({
            areaRatio: Math.round(metrics.areaRatio * 1000) / 1000,
            candidateCount: candidates.size,
            heightRatio: Math.round(metrics.heightRatio * 1000) / 1000,
            owner: `${describe(owner, index)} overlap-id=${JSON.stringify(ownerId)}`,
            pair: candidateEntries
              .slice(0, 2)
              .map(
                (entry, candidateIndex) =>
                  `[${entry.role}] ${describe(entry.candidate, candidateIndex)}`,
              ),
            reason,
            risk,
            scope,
            widthRatio: Math.round(metrics.widthRatio * 1000) / 1000,
          });
        });

      const semanticControls = queryAllComposed(scanOptions.controlSelector);
      const disabledControl = (control: Element) =>
        ((control instanceof HTMLButtonElement ||
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement) &&
          control.disabled) ||
        control.getAttribute("aria-disabled")?.trim().toLowerCase() === "true";
      const hiddenInputControl = (control: Element) =>
        control instanceof HTMLInputElement &&
        control.type.toLowerCase() === "hidden";
      const controls = semanticControls.filter(
        (control) =>
          learnerVisible(control) &&
          !disabledControl(control) &&
          !hiddenInputControl(control),
      );
      const auditedControls = new Set<Element>();
      semanticControls.forEach((control, controlIndex) => {
        const visibility = inspector(control);
        const disabled = disabledControl(control);
        const hiddenInput = hiddenInputControl(control);
        if (disabled || hiddenInput) return;
        const excludedFromLearnerCount =
          visibility.displayNoneAncestor ||
          visibility.visibilityHidden ||
          visibility.hiddenAncestor ||
          visibility.inertAncestor ||
          visibility.ariaHiddenAncestor;
        const auditableTouchControl =
          !excludedFromLearnerCount;
        const associatedLabels =
          control instanceof HTMLButtonElement ||
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement
            ? Array.from(control.labels ?? [])
            : [];
        const activationRects: RectLike[] = [];
        if (auditableTouchControl) {
          if (learnerVisible(control) && !visibility.pointerEventsNone)
            activationRects.push(control.getBoundingClientRect());
          for (const label of associatedLabels) {
            const labelVisibility = inspector(label);
            if (learnerVisible(label) && !labelVisibility.pointerEventsNone)
              activationRects.push(label.getBoundingClientRect());
          }
        }
        const hasMinimumTouchTarget = activationRects.some((rect) => {
          const width = rect.right - rect.left;
          const height = rect.bottom - rect.top;
          return width >= 44 && height >= 44;
        });
        let controlIssueReported = false;
        const reportControlIssue = (issue: HkVisualizationCollisionIssue) => {
          controlIssueReported = true;
          push(issue);
        };
        const zeroArea = visibility.width <= 1 || visibility.height <= 1;
        if (zeroArea && auditableTouchControl) {
          if (!hasMinimumTouchTarget) {
            const rect = control.getBoundingClientRect();
            const emptyIntersection = {
              bottom: rect.top,
              left: rect.left,
              right: rect.left,
              top: rect.top,
            };
            reportControlIssue({
              first: describe(control, controlIndex),
              firstRect: rounded(rect),
              intersection: rounded(emptyIntersection),
              kind: "control-touch-target",
              second: "zero-area semantic control has no usable touch target",
              secondRect: rounded(emptyIntersection),
            });
          }
        } else if (
          keyboardFocusable(control) &&
          !learnerVisible(control) &&
          !hasMinimumTouchTarget
        ) {
          const rect = control.getBoundingClientRect();
          const emptyIntersection = {
            bottom: rect.top,
            left: rect.left,
            right: rect.left,
            top: rect.top,
          };
          reportControlIssue({
            first: describe(control, controlIndex),
            firstRect: rounded(rect),
            intersection: rounded(emptyIntersection),
            kind: "control-hidden-focusable",
            second:
              "keyboard-focusable semantic control has no visible learner target",
            secondRect: rounded(emptyIntersection),
          });
        } else if (auditableTouchControl && !hasMinimumTouchTarget) {
          const rect = control.getBoundingClientRect();
          const emptyIntersection = {
            bottom: rect.top,
            left: rect.left,
            right: rect.left,
            top: rect.top,
          };
          reportControlIssue({
            first: describe(control, controlIndex),
            firstRect: rounded(rect),
            intersection: rounded(emptyIntersection),
            kind: "control-touch-target",
            second: "semantic control has no 44 by 44 activation region",
            secondRect: rounded(emptyIntersection),
          });
        }
        if (
          learnerCertification({
            auditable: auditableTouchControl,
            disabled,
            excluded: excludedFromLearnerCount,
            explicitIssue: controlIssueReported,
            hiddenInput,
            semanticHidden: excludedFromLearnerCount,
          })
        )
          auditedControls.add(control);
      });
      for (let firstIndex = 0; firstIndex < controls.length; firstIndex += 1) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < controls.length;
          secondIndex += 1
        ) {
          const first = controls[firstIndex];
          const second = controls[secondIndex];
          if (
            composedContains(first, second) || composedContains(second, first)
          )
            continue;
          if (pairIsNarrowlyExempt(first, second)) continue;
          countCandidatePair("control-control");
          const overlap = intersection(
            first.getBoundingClientRect(),
            second.getBoundingClientRect(),
          );
          if (!overlap) continue;
          push({
            first: describe(first, firstIndex),
            firstRect: rounded(first.getBoundingClientRect()),
            intersection: rounded(overlap),
            kind: "control-control",
            second: describe(second, secondIndex),
            secondRect: rounded(second.getBoundingClientRect()),
          });
        }
      }

      type FormTextControl =
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;
      const displayedFormValue = (control: FormTextControl) => {
        if (control instanceof HTMLSelectElement) {
          if (control.multiple || control.size > 1)
            return Array.from(control.options)
              .map((option) => option.label || option.text)
              .join("\n");
          return Array.from(control.selectedOptions)
            .map((option) => option.label || option.text)
            .join(" ");
        }
        return control.value || control.placeholder;
      };
      const formTextCanvas = document.createElement("canvas");
      const formTextContext = formTextCanvas.getContext("2d");
      type FormValueFragment = {
        element: FormTextControl | HTMLOptionElement;
        rect: RectLike & { height: number; width: number };
        text: string;
      };
      type FormValueGeometry = {
        fragments: FormValueFragment[];
        unsupportedReason: string | null;
      };
      const resolvedTextAlign = (style: CSSStyleDeclaration) => {
        if (style.textAlign === "start")
          return style.direction === "rtl" ? "right" : "left";
        if (style.textAlign === "end")
          return style.direction === "rtl" ? "left" : "right";
        return style.textAlign === "right" || style.textAlign === "center"
          ? style.textAlign
          : "left";
      };
      const formValueGlyphRects = (
        control: FormTextControl,
        rawText: string,
      ): FormValueGeometry => {
        if (!formTextContext)
          return {
            fragments: [],
            unsupportedReason: "2D text metrics are unavailable",
          };
        const controlRect = control.getBoundingClientRect();
        const style = getComputedStyle(control);
        const number = (value: string) => Number.parseFloat(value) || 0;
        const scaleX = control.offsetWidth > 0
          ? controlRect.width / control.offsetWidth
          : 1;
        const scaleY = control.offsetHeight > 0
          ? controlRect.height / control.offsetHeight
          : 1;
        const contentLeft =
          controlRect.left +
          (number(style.borderLeftWidth) + number(style.paddingLeft)) * scaleX;
        const contentRight =
          controlRect.right -
          (number(style.borderRightWidth) + number(style.paddingRight)) * scaleX;
        const contentTop =
          controlRect.top +
          (number(style.borderTopWidth) + number(style.paddingTop)) * scaleY;
        const contentBottom =
          controlRect.bottom -
          (number(style.borderBottomWidth) + number(style.paddingBottom)) * scaleY;
        const contentWidth = Math.max(0, contentRight - contentLeft);
        const contentHeight = Math.max(0, contentBottom - contentTop);
        if (contentWidth <= 1 || contentHeight <= 1)
          return {
            fragments: [],
            unsupportedReason: "form control has no measurable content box",
          };
        const fontSize = Math.max(1, number(style.fontSize) * scaleY);
        const rawLineHeight = number(style.lineHeight);
        const lineHeight = Math.max(
          fontSize,
          (rawLineHeight > 0 ? rawLineHeight : number(style.fontSize) * 1.2) *
            scaleY,
        );
        const horizontalScroll = control.scrollLeft * scaleX;
        const verticalScroll = control instanceof HTMLTextAreaElement
          ? control.scrollTop * scaleY
          : 0;
        const fragments: FormValueFragment[] = [];
        const measureLine = (
          line: string,
          textStyle: CSSStyleDeclaration,
        ) => {
          formTextContext.font =
            textStyle.font ||
            `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
          const metrics = formTextContext.measureText(line);
          const letterSpacing = number(textStyle.letterSpacing);
          const wordSpacing = number(textStyle.wordSpacing);
          const codePointGaps = Math.max(0, Array.from(line).length - 1);
          const wordGaps = (line.match(/\s+/gu) ?? []).length;
          const measuredLineWidth = Math.max(
            0,
            (metrics.width +
              codePointGaps * letterSpacing +
              wordGaps * wordSpacing) *
              scaleX,
          );
          const measuredHeight =
            (metrics.actualBoundingBoxAscent +
              metrics.actualBoundingBoxDescent) *
            scaleY;
          return {
            height: Math.max(1, measuredHeight || fontSize),
            width: measuredLineWidth,
          };
        };
        const appendClippedFragment = (
          element: FormTextControl | HTMLOptionElement,
          line: string,
          rawLeft: number,
          rawTop: number,
          glyphWidth: number,
          glyphHeight: number,
          clip: RectLike,
        ) => {
          if (!line || glyphWidth <= 0 || glyphHeight <= 0) return;
          const rawRight = rawLeft + glyphWidth;
          const rawBottom = rawTop + glyphHeight;
          const left = Math.max(clip.left, rawLeft);
          const right = Math.min(clip.right, rawRight);
          const top = Math.max(clip.top, rawTop);
          const bottom = Math.min(clip.bottom, rawBottom);
          if (right - left <= 1 || bottom - top <= 1) return;
          fragments.push({
            element,
            rect: {
              bottom,
              height: bottom - top,
              left,
              right,
              top,
              width: right - left,
            },
            text: line,
          });
        };

        if (
          control instanceof HTMLSelectElement &&
          (control.multiple || control.size > 1)
        ) {
          let eligibleOptionCount = 0;
          let measurableOptionCount = 0;
          for (const option of Array.from(control.options)) {
            const optionStyle = getComputedStyle(option);
            if (
              option.hidden ||
              optionStyle.display === "none" ||
              optionStyle.visibility === "hidden" ||
              optionStyle.visibility === "collapse"
            )
              continue;
            eligibleOptionCount += 1;
            const optionRect = option.getBoundingClientRect();
            if (optionRect.width <= 1 || optionRect.height <= 1) continue;
            const clip = {
              bottom: Math.min(contentBottom, optionRect.bottom),
              left: Math.max(contentLeft, optionRect.left),
              right: Math.min(contentRight, optionRect.right),
              top: Math.max(contentTop, optionRect.top),
            };
            if (clip.right - clip.left <= 1 || clip.bottom - clip.top <= 1)
              continue;
            measurableOptionCount += 1;
            const line = option.label || option.text;
            const measured = measureLine(line, optionStyle);
            const optionContentLeft =
              optionRect.left + number(optionStyle.paddingLeft) * scaleX;
            const optionContentRight =
              optionRect.right - number(optionStyle.paddingRight) * scaleX;
            const optionContentWidth = Math.max(
              0,
              optionContentRight - optionContentLeft,
            );
            const align = resolvedTextAlign(optionStyle);
            const alignedLeft = align === "right"
              ? optionContentRight - measured.width
              : align === "center"
                ? optionContentLeft +
                  (optionContentWidth - measured.width) / 2
                : optionContentLeft;
            const rawTop =
              optionRect.top + (optionRect.height - measured.height) / 2;
            appendClippedFragment(
              option,
              line,
              alignedLeft,
              rawTop,
              measured.width,
              measured.height,
              clip,
            );
          }
          if (
            !multiSelectCompleteness(
              eligibleOptionCount,
              measurableOptionCount
            )
          )
            return {
              fragments: [],
              unsupportedReason:
                "multi-row select option geometry is unavailable",
            };
          return { fragments, unsupportedReason: null };
        }

        const hardLines = rawText.split(/\r\n?|\n/u);
        const measuredLines = hardLines.map((line) => ({
          line,
          measured: measureLine(line, style),
        }));
        const softWrapUnsupportedReason = softWrapDecision({
          contentWidth,
          isTextarea: control instanceof HTMLTextAreaElement,
          lineWidths: measuredLines.map(({ measured }) => measured.width),
          wrap: control instanceof HTMLTextAreaElement ? control.wrap : "off",
        });
        if (softWrapUnsupportedReason)
          return {
            fragments: [],
            unsupportedReason: softWrapUnsupportedReason,
          };
        for (const [lineIndex, { line, measured }] of measuredLines.entries()) {
          if (!line) continue;
          const align = resolvedTextAlign(style);
          const alignedLeft = align === "right"
            ? contentRight - measured.width
            : align === "center"
              ? contentLeft + (contentWidth - measured.width) / 2
              : contentLeft;
          const rawLeft = alignedLeft - horizontalScroll;
          const lineBoxTop = control instanceof HTMLTextAreaElement
            ? contentTop + lineIndex * lineHeight - verticalScroll
            : contentTop;
          const rawTop = control instanceof HTMLTextAreaElement
            ? lineBoxTop + Math.max(0, (lineHeight - measured.height) / 2)
            : contentTop + (contentHeight - measured.height) / 2;
          appendClippedFragment(
            control,
            line,
            rawLeft,
            rawTop,
            measured.width,
            measured.height,
            {
              bottom: contentBottom,
              left: contentLeft,
              right: contentRight,
              top: contentTop,
            },
          );
        }
        return { fragments, unsupportedReason: null };
      };

      const textFragments: Array<{
        description: string;
        index: number;
        parent: Element;
        rect: RectLike;
        svg: boolean;
      }> = [];
      let textIndex = 0;
      for (const textScope of composedScopes) {
        const walker = document.createTreeWalker(
          textScope,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const text = node.textContent?.replace(/\s+/g, " ").trim();
              if (
                !text ||
                !node.parentElement ||
                !learnerVisible(node.parentElement)
              )
                return NodeFilter.FILTER_REJECT;
              if (
                composedClosest(
                  node.parentElement,
                  "input,select,textarea,option",
                )
              )
                return NodeFilter.FILTER_REJECT;
              if (composedClosest(node.parentElement, "svg"))
                return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          },
        );
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          const parent = node.parentElement;
          if (!parent) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width <= 1 || rect.height <= 1) continue;
            textFragments.push({
              description: `text[${textIndex}] \"${text}\"`,
              index: textIndex,
              parent,
              rect,
              svg: false,
            });
          }
          textIndex += 1;
        }
      }
      for (const control of semanticControls) {
        if (
          !(
            control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement
          ) ||
          !learnerVisible(control)
        )
          continue;
        if (
          control instanceof HTMLInputElement &&
          [
            "button",
            "checkbox",
            "color",
            "file",
            "hidden",
            "image",
            "password",
            "radio",
            "range",
            "reset",
            "submit",
          ].includes(control.type.toLowerCase())
        )
          continue;
        const rawText = displayedFormValue(control);
        const geometry = formValueGlyphRects(control, rawText);
        if (geometry.unsupportedReason) {
          const rect = control.getBoundingClientRect();
          const emptyIntersection = {
            bottom: rect.top,
            left: rect.left,
            right: rect.left,
            top: rect.top,
          };
          push({
            first: describe(control, textIndex),
            firstRect: rounded(rect),
            intersection: rounded(emptyIntersection),
            kind: "unsupported-form-value-geometry",
            second: geometry.unsupportedReason,
            secondRect: rounded(emptyIntersection),
          });
          continue;
        }
        for (const fragment of geometry.fragments) {
          const text = fragment.text.replace(/\s+/g, " ").trim();
          textFragments.push({
            description: `form-value[${textIndex}] \"${text}\"`,
            index: textIndex,
            parent: fragment.element,
            rect: fragment.rect,
            svg: false,
          });
          textIndex += 1;
        }
      }
      for (const element of queryAllComposed(svgTextLeafSelector).filter(
        learnerVisible,
      )) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) continue;
        textFragments.push({
          description: describe(element, textIndex),
          index: textIndex,
          parent: element,
          rect,
          svg: true,
        });
        textIndex += 1;
      }

      type PaintPoint = { x: number; y: number };
      const colorAlpha = (color: string) => {
        const normalized = color.trim().toLowerCase();
        if (!normalized || normalized === "transparent") return 0;
        const channels = normalized.match(/[\d.]+/g)?.map(Number) ?? [];
        return normalized.startsWith("rgba") || normalized.includes("/")
          ? (channels[3] ?? 0)
          : 1;
      };
      const visuallyPainted = (element: Element) => {
        const visibility = inspector(element);
        return (
          visibility.visuallyVisible &&
          visibility.effectiveOpacity >= 0.999 &&
          !visibility.displayNoneAncestor &&
          !visibility.visibilityHidden
        );
      };
      const potentialOpaqueElement = (element: Element) => {
        if (!(element instanceof HTMLElement) || !visuallyPainted(element))
          return false;
        if (element instanceof HTMLCanvasElement) return true;
        if (element instanceof HTMLVideoElement) {
          return Boolean(
            element.poster || element.currentSrc || element.getAttribute("src"),
          );
        }
        if (element instanceof HTMLImageElement) {
          return Boolean(element.currentSrc || element.getAttribute("src"));
        }
        const style = getComputedStyle(element);
        return (
          style.backgroundImage !== "none" ||
          colorAlpha(style.backgroundColor) >= 0.999
        );
      };
      const canvasOpaqueAtPoint = (
        canvas: HTMLCanvasElement,
        point: PaintPoint,
      ) => {
        const rect = canvas.getBoundingClientRect();
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          canvas.width <= 0 ||
          canvas.height <= 0
        )
          return false;
        const x = Math.min(
          canvas.width - 1,
          Math.max(
            0,
            Math.floor(((point.x - rect.left) / rect.width) * canvas.width),
          ),
        );
        const y = Math.min(
          canvas.height - 1,
          Math.max(
            0,
            Math.floor(((point.y - rect.top) / rect.height) * canvas.height),
          ),
        );
        try {
          const context = canvas.getContext("2d", { willReadFrequently: true });
          // A WebGL or cross-origin canvas cannot be certified from DOM paint;
          // fail closed when pixel alpha is unavailable.
          if (!context) return true;
          return context.getImageData(x, y, 1, 1).data[3] >= 250;
        } catch {
          return true;
        }
      };
      const opaqueAtPoint = (element: Element, point: PaintPoint) => {
        if (!potentialOpaqueElement(element)) return false;
        if (element instanceof HTMLCanvasElement)
          return canvasOpaqueAtPoint(element, point);
        if (
          element instanceof HTMLVideoElement ||
          element instanceof HTMLImageElement
        )
          return true;
        const style = getComputedStyle(element);
        // CSS images may contain transparency, but browser DOM APIs expose no
        // reliable per-pixel alpha for arbitrary gradients/URLs. Treat an image
        // painted above text as uncertifiable and therefore occluding.
        return (
          style.backgroundImage !== "none" ||
          colorAlpha(style.backgroundColor) >= 0.999
        );
      };
      const withPointerHitTesting = <T>(
        elements: Element[],
        callback: () => T,
      ): T => {
        const styled = new Set<HTMLElement | SVGElement>();
        for (const element of elements) {
          let current: Element | null = element;
          while (current && composedContains(root, current)) {
            if (current instanceof HTMLElement || current instanceof SVGElement)
              styled.add(current);
            if (current === root) break;
            current = composedParent(current);
          }
        }
        const saved = Array.from(styled).map((element) => ({
          element,
          priority: element.style.getPropertyPriority("pointer-events"),
          value: element.style.getPropertyValue("pointer-events"),
        }));
        try {
          for (const entry of saved)
            entry.element.style.setProperty(
              "pointer-events",
              "auto",
              "important",
            );
          return callback();
        } finally {
          for (const entry of saved) {
            if (entry.value)
              entry.element.style.setProperty(
                "pointer-events",
                entry.value,
                entry.priority,
              );
            else entry.element.style.removeProperty("pointer-events");
          }
        }
      };
      const candidatePaintedAboveText = (
        candidate: Element,
        textParent: Element,
        point: PaintPoint,
      ) =>
        withPointerHitTesting([candidate, textParent], () => {
          const paintLayers = composedElementsFromPoint(point.x, point.y);
          const candidateIndex = paintLayers.findIndex(
            (layer) =>
              layer === candidate || composedContains(candidate, layer),
          );
          const textLayerIndex = paintLayers.findIndex(
            (layer) =>
              layer === textParent ||
              composedContains(layer, textParent) ||
              composedContains(textParent, layer),
          );
          return (
            candidateIndex >= 0 &&
            textLayerIndex >= 0 &&
            candidateIndex < textLayerIndex
          );
        });
      const overlapSamplePoints = (overlap: RectLike) => {
        const width = overlap.right - overlap.left;
        const height = overlap.bottom - overlap.top;
        const xInset = Math.min(0.5, width / 4);
        const yInset = Math.min(0.5, height / 4);
        const xs = [
          overlap.left + xInset,
          (overlap.left + overlap.right) / 2,
          overlap.right - xInset,
        ];
        const ys = [
          overlap.top + yInset,
          (overlap.top + overlap.bottom) / 2,
          overlap.bottom - yInset,
        ];
        return xs
          .flatMap((x) => ys.map((y) => ({ x, y })))
          .filter(
            (point) =>
              point.x >= 0 &&
              point.y >= 0 &&
              point.x < innerWidth &&
              point.y < innerHeight,
          );
      };
      const opaqueCandidates = queryAllComposed("*").filter(
        potentialOpaqueElement,
      );
      for (const textFragment of textFragments) {
        const rect = textFragment.rect;
        let occlusion: { element: Element; overlap: RectLike } | null = null;
        for (const candidate of opaqueCandidates) {
          if (candidate === textFragment.parent) continue;
          if (
            composedContains(candidate, textFragment.parent) ||
            composedContains(textFragment.parent, candidate)
          )
            continue;
          countCandidatePair("text-occlusion");
          const overlap = intersection(
            rect,
            candidate.getBoundingClientRect(),
            0.5,
          );
          if (!overlap) continue;
          const paintsAbove = overlapSamplePoints(overlap).some(
            (point) =>
              opaqueAtPoint(candidate, point) &&
              candidatePaintedAboveText(candidate, textFragment.parent, point),
          );
          if (!paintsAbove) continue;
          occlusion = { element: candidate, overlap };
          break;
        }
        if (!occlusion) continue;
        const occluderRect = occlusion.element.getBoundingClientRect();
        push({
          first: textFragment.description,
          firstRect: rounded(rect),
          intersection: rounded(occlusion.overlap),
          kind: "text-occlusion",
          second: describe(occlusion.element),
          secondRect: rounded(occluderRect),
        });
      }

      const pseudoBox = (
        owner: HTMLElement,
        pseudo: "::before" | "::after",
      ) => {
        const style = getComputedStyle(owner, pseudo);
        const content = style.content.trim().toLowerCase();
        const zIndex = Number(style.zIndex);
        if (
          !content ||
          content === "none" ||
          content === "normal" ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity || "1") < 0.999 ||
          style.position !== "absolute" ||
          style.transform !== "none" ||
          !Number.isFinite(zIndex) ||
          (style.backgroundImage === "none" &&
            colorAlpha(style.backgroundColor) < 0.999) ||
          getComputedStyle(owner).position === "static"
        )
          return null;
        const parsePixels = (value: string) =>
          value.endsWith("px") && Number.isFinite(Number.parseFloat(value))
            ? Number.parseFloat(value)
            : null;
        const ownerRect = owner.getBoundingClientRect();
        const ownerStyle = getComputedStyle(owner);
        const referenceLeft =
          ownerRect.left + (parsePixels(ownerStyle.borderLeftWidth) ?? 0);
        const referenceTop =
          ownerRect.top + (parsePixels(ownerStyle.borderTopWidth) ?? 0);
        const referenceWidth = owner.clientWidth;
        const referenceHeight = owner.clientHeight;
        const width = parsePixels(style.width);
        const height = parsePixels(style.height);
        const leftOffset = parsePixels(style.left);
        const rightOffset = parsePixels(style.right);
        const topOffset = parsePixels(style.top);
        const bottomOffset = parsePixels(style.bottom);
        if (width === null || height === null) return null;
        const horizontalExtras =
          style.boxSizing === "border-box"
            ? 0
            : [
                style.paddingLeft,
                style.paddingRight,
                style.borderLeftWidth,
                style.borderRightWidth,
              ].reduce((sum, value) => sum + (parsePixels(value) ?? 0), 0);
        const verticalExtras =
          style.boxSizing === "border-box"
            ? 0
            : [
                style.paddingTop,
                style.paddingBottom,
                style.borderTopWidth,
                style.borderBottomWidth,
              ].reduce((sum, value) => sum + (parsePixels(value) ?? 0), 0);
        const boxWidth = width + horizontalExtras;
        const boxHeight = height + verticalExtras;
        const left =
          leftOffset !== null
            ? referenceLeft + leftOffset
            : rightOffset !== null
              ? referenceLeft + referenceWidth - rightOffset - boxWidth
              : null;
        const top =
          topOffset !== null
            ? referenceTop + topOffset
            : bottomOffset !== null
              ? referenceTop + referenceHeight - bottomOffset - boxHeight
              : null;
        if (left === null || top === null) return null;
        return {
          rect: { bottom: top + boxHeight, left, right: left + boxWidth, top },
          style,
          zIndex,
        };
      };
      const textStackingLevelWithin = (textParent: Element, owner: Element) => {
        let current: Element | null = textParent;
        while (current && current !== owner) {
          const style = getComputedStyle(current);
          const zIndex = Number(style.zIndex);
          if (style.position !== "static" && Number.isFinite(zIndex))
            return zIndex;
          current = composedParent(current);
        }
        return 0;
      };
      for (const owner of [root, ...queryAllComposed("*")]) {
        if (!(owner instanceof HTMLElement) || !visuallyPainted(owner))
          continue;
        for (const pseudo of ["::before", "::after"] as const) {
          const box = pseudoBox(owner, pseudo);
          if (!box) continue;
          for (const textFragment of textFragments) {
            // Exact pseudo paint geometry is reconstructable here only for a
            // positioned pseudo owned by the text's containing block. Arbitrary
            // inline/transform/url() pseudo layout remains outside this DOM gate.
            if (!composedContains(owner, textFragment.parent)) continue;
            const textZIndex = textStackingLevelWithin(
              textFragment.parent,
              owner,
            );
            if (
              box.zIndex < textZIndex ||
              (box.zIndex === textZIndex && pseudo === "::before")
            )
              continue;
            countCandidatePair("text-occlusion");
            const overlap = intersection(textFragment.rect, box.rect, 0.5);
            if (!overlap) continue;
            push({
              first: textFragment.description,
              firstRect: rounded(textFragment.rect),
              intersection: rounded(overlap),
              kind: "text-occlusion",
              second: `${describe(owner)}${pseudo}`,
              secondRect: rounded(box.rect),
            });
          }
        }
      }

      for (
        let firstIndex = 0;
        firstIndex < textFragments.length;
        firstIndex += 1
      ) {
        const first = textFragments[firstIndex];
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < textFragments.length;
          secondIndex += 1
        ) {
          const second = textFragments[secondIndex];
          if (first.parent === second.parent) continue;
          if (pairIsNarrowlyExempt(first.parent, second.parent)) continue;
          const pairKind =
            first.svg && second.svg ? "svg-label-label" : "dom-text-text";
          countCandidatePair(pairKind);
          const overlap = intersection(first.rect, second.rect);
          if (!overlap) continue;
          push({
            first: first.description,
            firstRect: rounded(first.rect),
            intersection: rounded(overlap),
            kind: pairKind,
            second: second.description,
            secondRect: rounded(second.rect),
          });
        }
      }

      for (const textFragment of textFragments) {
        const parent = textFragment.parent;
        for (
          let controlIndex = 0;
          controlIndex < controls.length;
          controlIndex += 1
        ) {
          const control = controls[controlIndex];
          if (composedContains(control, parent)) continue;
          if (pairIsNarrowlyExempt(parent, control)) continue;
          countCandidatePair("text-control");
          const overlap = intersection(
            textFragment.rect,
            control.getBoundingClientRect(),
          );
          if (!overlap) continue;
          push({
            first: textFragment.description,
            firstRect: rounded(textFragment.rect),
            intersection: rounded(overlap),
            kind: "text-control",
            second: describe(control, controlIndex),
            secondRect: rounded(control.getBoundingClientRect()),
          });
        }
      }

      const surfaces = queryAllComposed("[data-viz-surface]");
      const paintedMarks = new Set<Element>();
      surfaces.forEach((surface, surfaceIndex) => {
        if (surface.hasAttribute("data-viz-renderer")) {
          canvasSurfaceCount += 1;
          return;
        }
        if (surface instanceof SVGElement || surface.querySelector("svg")) {
          svgSurfaceCount += 1;
        }
        const marks = expandedPaintedMarks(surface);
        for (const mark of marks) paintedMarks.add(mark);
        textFragments.forEach((labelEntry, labelIndex) => {
          const label = labelEntry.parent;
          marks.forEach((mark, markIndex) => {
            if (label === mark) return;
            if (pairIsNarrowlyExempt(label, mark)) return;
            countCandidatePair("svg-label-mark");
            const markRect = screenRectForMark(mark);
            const overlap = intersection(labelEntry.rect, markRect);
            if (!overlap) return;
            push({
              first: labelEntry.description,
              firstRect: rounded(labelEntry.rect),
              intersection: rounded(overlap),
              kind: "svg-label-mark",
              second: describe(mark, markIndex),
              secondRect: rounded(markRect),
              surface: describe(surface, surfaceIndex),
            });
          });
        });
      });

      const htmlTextFragmentCount = textFragments.filter(
        (fragment) => !fragment.svg,
      ).length;
      const svgTextFragmentCount = textFragments.length - htmlTextFragmentCount;
      const learnerControlCount = auditedControls.size;
      const paintedMarkCount = paintedMarks.size;
      const inspectedCandidateCount =
        learnerControlCount +
        htmlTextFragmentCount +
        svgTextFragmentCount +
        paintedMarkCount;
      const totalCandidatePairCount = Object.values(candidatePairCounts).reduce(
        (total, count) => total + count,
        0,
      );

      return {
        canvasSurfaceCount,
        candidatePairCounts,
        htmlTextFragmentCount,
        inspectedCandidateCount,
        issues,
        learnerControlCount,
        overlapExemptions,
        paintedMarkCount,
        phase: scanOptions.phase,
        svgSurfaceCount,
        svgTextFragmentCount,
        totalCandidatePairCount,
        truncated,
      };
    },
    {
      controlSelector,
      decisionContractSource: hkVisualizationDecisionContractSource,
      phase,
      visibilityGlobalName: effectiveVisibilityGlobalName,
      shadowRootsGlobalName,
    },
  );
}
