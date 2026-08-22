import type { Locator, Page } from "@playwright/test";

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
  kind: HkVisualizationCollisionPairKind;
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

export async function installHkVisualizationEffectiveVisibilityInspector(
  page: Page,
) {
  await page.addInitScript((globalName) => {
    type Inspector = (
      element: Element,
    ) => HkVisualizationEffectiveVisibilityEvidence;
    const scope = globalThis as unknown as Record<string, Inspector>;
    scope[globalName] = (element) => {
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
        current = current.parentElement;
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
  }, effectiveVisibilityGlobalName);
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
      const overflowClipsAxis = (value: string) =>
        value === "auto" ||
        value === "scroll" ||
        value === "hidden" ||
        value === "clip";
      const overflowClipRect = (element: Element): RectLike => {
        const rect = element.getBoundingClientRect();
        if (!(element instanceof HTMLElement)) return rect;
        const left = rect.left + element.clientLeft;
        const top = rect.top + element.clientTop;
        return {
          bottom: top + element.clientHeight,
          left,
          right: left + element.clientWidth,
          top,
        };
      };
      const visibleRectThroughOverflowAncestors = (
        element: Element,
        sourceRect: RectLike,
        includeElement = false,
      ): RectLike | null => {
        const clipped = {
          bottom: sourceRect.bottom,
          left: sourceRect.left,
          right: sourceRect.right,
          top: sourceRect.top,
        };
        let ancestor: Element | null = includeElement
          ? element
          : element.parentElement;
        while (ancestor && root.contains(ancestor)) {
          const style = getComputedStyle(ancestor);
          const clipX = overflowClipsAxis(style.overflowX);
          const clipY = overflowClipsAxis(style.overflowY);
          if (clipX || clipY) {
            const clipRect = overflowClipRect(ancestor);
            if (clipX) {
              clipped.left = Math.max(clipped.left, clipRect.left);
              clipped.right = Math.min(clipped.right, clipRect.right);
            }
            if (clipY) {
              clipped.top = Math.max(clipped.top, clipRect.top);
              clipped.bottom = Math.min(clipped.bottom, clipRect.bottom);
            }
            if (
              clipped.right - clipped.left <= 1 ||
              clipped.bottom - clipped.top <= 1
            )
              return null;
          }
          if (ancestor === root) break;
          ancestor = ancestor.parentElement;
        }
        return clipped.right - clipped.left > 1 &&
          clipped.bottom - clipped.top > 1
          ? clipped
          : null;
      };
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
      const paintedRectCache = new Map<Element, RectLike | null>();
      const visibleScreenRectForMark = (element: Element) => {
        if (paintedRectCache.has(element))
          return paintedRectCache.get(element) ?? null;
        const rect = visibleRectThroughOverflowAncestors(
          element,
          screenRectForMark(element),
        );
        paintedRectCache.set(element, rect);
        return rect;
      };
      const paintedVisible = (element: Element) => {
        const visibility = inspector(element);
        const rect = visibleScreenRectForMark(element);
        return (
          element.isConnected &&
          rect !== null &&
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
      const overlapRisks = new Map<Element, HkVisualizationOverlapOwnerRisk>();
      const exemptionOwner = (element: Element) =>
        element.closest("[data-viz-overlap-ok]");
      const pairIsNarrowlyExempt = (first: Element, second: Element) => {
        const firstOwner = exemptionOwner(first);
        const secondOwner = exemptionOwner(second);
        if (!firstOwner || firstOwner !== secondOwner) return false;
        return overlapRisks.get(firstOwner) === "explicit-narrow-pair";
      };

      Array.from(root.querySelectorAll("[data-viz-overlap-ok]"))
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
          const candidateRole = (
            candidate: Element,
          ): "control" | "label" | "mark" =>
            candidate.matches(scanOptions.controlSelector)
              ? "control"
              : candidate.matches("[data-viz-mark]")
                ? "mark"
                : "label";
          const structuralCandidates = new Set<Element>();
          if (owner.matches(candidateSelector)) structuralCandidates.add(owner);
          for (const candidate of Array.from(
            owner.querySelectorAll(candidateSelector),
          ))
            structuralCandidates.add(candidate);
          if (
            owner.matches("text:not(:has(tspan, textPath)), tspan, textPath")
          )
            structuralCandidates.add(owner);
          for (const candidate of Array.from(
            owner.querySelectorAll(
              "text:not(:has(tspan, textPath)), tspan, textPath",
            ),
          ))
            structuralCandidates.add(candidate);
          const structuralTextWalker = document.createTreeWalker(
            owner,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(node) {
                const parent = node.parentElement;
                const text = node.textContent?.replace(/\s+/g, " ").trim();
                return parent && !parent.closest("svg") && text
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT;
              },
            },
          );
          while (structuralTextWalker.nextNode()) {
            const parent = structuralTextWalker.currentNode.parentElement;
            if (parent) structuralCandidates.add(parent);
          }
          const structuralExplicitMembers = new Set<Element>();
          if (owner.matches("[data-viz-overlap-member]"))
            structuralExplicitMembers.add(owner);
          for (const member of Array.from(
            owner.querySelectorAll("[data-viz-overlap-member]"),
          ))
            structuralExplicitMembers.add(member);
          const hasExplicitMemberContract =
            structuralExplicitMembers.size > 0;
          const structuralMemberEntries = Array.from(
            structuralExplicitMembers,
          ).map((member) => ({
            member,
            role:
              member.getAttribute("data-viz-overlap-member")?.trim() ?? "",
          }));
          const exactStructuralMemberPair =
            structuralCandidates.size === 2 &&
            structuralMemberEntries.length === 2 &&
            structuralMemberEntries.every(({ member }) =>
              structuralCandidates.has(member),
            ) &&
            new Set(structuralMemberEntries.map(({ role }) => role)).size ===
              2 &&
            structuralMemberEntries.some(
              ({ member, role }) =>
                role === "mark" && member.matches("[data-viz-mark]"),
            ) &&
            structuralMemberEntries.some(
              ({ member, role }) =>
                role === "label" &&
                (member.matches("[data-viz-label]") ||
                  (member instanceof SVGElement &&
                    member.matches(
                      "text:not(:has(tspan, textPath)), tspan, textPath",
                    ))),
            );
          const candidates = new Set<Element>();
          const candidateVisible = (candidate: Element) =>
            candidate.matches("[data-viz-mark]")
              ? paintedVisible(candidate)
              : learnerVisible(candidate) &&
                visibleRectThroughOverflowAncestors(
                  candidate,
                  candidate.getBoundingClientRect(),
                  true,
                ) !== null;
          if (owner.matches(candidateSelector) && candidateVisible(owner))
            candidates.add(owner);
          for (const candidate of Array.from(
            owner.querySelectorAll(candidateSelector),
          ).filter(candidateVisible))
            candidates.add(candidate);
          if (
            owner.matches("text:not(:has(tspan, textPath)), tspan, textPath") &&
            candidateVisible(owner)
          )
            candidates.add(owner);
          for (const candidate of Array.from(
            owner.querySelectorAll(
              "text:not(:has(tspan, textPath)), tspan, textPath",
            ),
          ).filter(candidateVisible)) {
            candidates.add(candidate);
          }
          const textWalker = document.createTreeWalker(
            owner,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode(node) {
                const parent = node.parentElement;
                const text = node.textContent?.replace(/\s+/g, " ").trim();
                return parent &&
                  !parent.closest("svg") &&
                  text &&
                  candidateVisible(parent)
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_REJECT;
              },
            },
          );
          while (textWalker.nextNode()) {
            const parent = textWalker.currentNode.parentElement;
            if (parent) candidates.add(parent);
          }
          const candidateEntries = Array.from(candidates).flatMap(
            (candidate) => {
              const rect = candidate.matches("[data-viz-mark]")
                ? visibleScreenRectForMark(candidate)
                : visibleRectThroughOverflowAncestors(
                    candidate,
                    candidate.getBoundingClientRect(),
                    true,
                  );
              return rect
                ? [
                    {
                      candidate,
                      rect,
                      role: candidateRole(candidate),
                    },
                  ]
                : [];
            },
          );
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
          const reference = owner.closest("[data-viz-surface]") ?? root;
          const referenceRect = reference.getBoundingClientRect();
          const ownerId =
            owner.getAttribute("data-viz-overlap-ok")?.trim() ?? "";
          const memberRoles = candidateEntries
            .map((entry) => entry.role)
            .sort();
          const exactVisibleLegacyRolePair =
            ownerId.length > 0 &&
            candidateEntries.length === 2 &&
            memberRoles[0] === "label" &&
            memberRoles[1] === "mark" &&
            candidateEntries.every(
              (entry) =>
                !entry.candidate
                  .getAttribute("data-viz-overlap-member")
                  ?.trim(),
            );
          const exactRolePair = hasExplicitMemberContract
            ? ownerId.length > 0 && exactStructuralMemberPair
            : exactVisibleLegacyRolePair;
          const ownerCandidateCount = hasExplicitMemberContract
            ? structuralCandidates.size
            : candidates.size;
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
            candidateCount: ownerCandidateCount,
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
                  : hasExplicitMemberContract || candidateEntries.length === 2
                    ? "explicit-narrow-pair"
                    : "dormant-narrow-owner";
          overlapRisks.set(owner, risk);
          overlapExemptions.push({
            areaRatio: Math.round(metrics.areaRatio * 1000) / 1000,
            candidateCount: metrics.candidateCount,
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

      const controls = Array.from(
        root.querySelectorAll(scanOptions.controlSelector),
      )
        .filter(learnerVisible)
        .flatMap((element) => {
          const rect = visibleRectThroughOverflowAncestors(
            element,
            element.getBoundingClientRect(),
          );
          return rect ? [{ element, rect }] : [];
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
            first.element.contains(second.element) ||
            second.element.contains(first.element)
          )
            continue;
          if (pairIsNarrowlyExempt(first.element, second.element)) continue;
          countCandidatePair("control-control");
          const overlap = intersection(first.rect, second.rect);
          if (!overlap) continue;
          push({
            first: describe(first.element, firstIndex),
            firstRect: rounded(first.rect),
            intersection: rounded(overlap),
            kind: "control-control",
            second: describe(second.element, secondIndex),
            secondRect: rounded(second.rect),
          });
        }
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const text = node.textContent?.replace(/\s+/g, " ").trim();
          if (
            !text ||
            !node.parentElement ||
            !learnerVisible(node.parentElement)
          )
            return NodeFilter.FILTER_REJECT;
          if (node.parentElement.closest("svg"))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const textFragments: Array<{
        description: string;
        index: number;
        parent: Element;
        rect: RectLike;
        svg: boolean;
      }> = [];
      let textIndex = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
        for (const rawRect of Array.from(range.getClientRects())) {
          const rect = visibleRectThroughOverflowAncestors(
            parent,
            rawRect,
            true,
          );
          if (!rect) continue;
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
      for (const element of Array.from(
        root.querySelectorAll(svgTextLeafSelector),
      ).filter(learnerVisible)) {
        const rect = visibleRectThroughOverflowAncestors(
          element,
          element.getBoundingClientRect(),
          true,
        );
        if (!rect) continue;
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
          while (current && root.contains(current)) {
            if (current instanceof HTMLElement || current instanceof SVGElement)
              styled.add(current);
            if (current === root) break;
            current = current.parentElement;
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
          const paintLayers = document.elementsFromPoint(point.x, point.y);
          const candidateIndex = paintLayers.findIndex(
            (layer) => layer === candidate || candidate.contains(layer),
          );
          const textLayerIndex = paintLayers.findIndex(
            (layer) =>
              layer === textParent ||
              layer.contains(textParent) ||
              textParent.contains(layer),
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
      const opaqueCandidates = Array.from(root.querySelectorAll("*"))
        .filter(potentialOpaqueElement)
        .flatMap((element) => {
          const rect = visibleRectThroughOverflowAncestors(
            element,
            element.getBoundingClientRect(),
          );
          return rect ? [{ element, rect }] : [];
        });
      for (const textFragment of textFragments) {
        const rect = textFragment.rect;
        let occlusion: {
          element: Element;
          overlap: RectLike;
          rect: RectLike;
        } | null = null;
        for (const candidate of opaqueCandidates) {
          if (candidate.element === textFragment.parent) continue;
          if (
            candidate.element.contains(textFragment.parent) ||
            textFragment.parent.contains(candidate.element)
          )
            continue;
          countCandidatePair("text-occlusion");
          const overlap = intersection(rect, candidate.rect, 0.5);
          if (!overlap) continue;
          const paintsAbove = overlapSamplePoints(overlap).some(
            (point) =>
              opaqueAtPoint(candidate.element, point) &&
              candidatePaintedAboveText(
                candidate.element,
                textFragment.parent,
                point,
              ),
          );
          if (!paintsAbove) continue;
          occlusion = {
            element: candidate.element,
            overlap,
            rect: candidate.rect,
          };
          break;
        }
        if (!occlusion) continue;
        push({
          first: textFragment.description,
          firstRect: rounded(rect),
          intersection: rounded(occlusion.overlap),
          kind: "text-occlusion",
          second: describe(occlusion.element),
          secondRect: rounded(occlusion.rect),
        });
      }

      const pseudoBox = (
        owner: HTMLElement,
        pseudo: "::before" | "::after",
      ) => {
        const style = getComputedStyle(owner, pseudo);
        const content = style.content.trim().toLowerCase();
        const zIndex = Number(style.zIndex);
        const parsedOpacity = style.opacity.trim() ? Number(style.opacity) : 1;
        const effectiveOpacity = Number.isFinite(parsedOpacity)
          ? Math.min(1, Math.max(0, parsedOpacity))
          : 1;
        if (
          !content ||
          content === "none" ||
          content === "normal" ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          effectiveOpacity < 0.999 ||
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
        const rect = visibleRectThroughOverflowAncestors(
          owner,
          { bottom: top + boxHeight, left, right: left + boxWidth, top },
          true,
        );
        if (!rect) return null;
        return {
          rect,
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
          current = current.parentElement;
        }
        return 0;
      };
      for (const owner of [root, ...Array.from(root.querySelectorAll("*"))]) {
        if (!(owner instanceof HTMLElement) || !visuallyPainted(owner))
          continue;
        for (const pseudo of ["::before", "::after"] as const) {
          const box = pseudoBox(owner, pseudo);
          if (!box) continue;
          for (const textFragment of textFragments) {
            // Exact pseudo paint geometry is reconstructable here only for a
            // positioned pseudo owned by the text's containing block. Arbitrary
            // inline/transform/url() pseudo layout remains outside this DOM gate.
            if (!owner.contains(textFragment.parent)) continue;
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
          if (control.element.contains(parent)) continue;
          if (pairIsNarrowlyExempt(parent, control.element)) continue;
          countCandidatePair("text-control");
          const overlap = intersection(textFragment.rect, control.rect);
          if (!overlap) continue;
          push({
            first: textFragment.description,
            firstRect: rounded(textFragment.rect),
            intersection: rounded(overlap),
            kind: "text-control",
            second: describe(control.element, controlIndex),
            secondRect: rounded(control.rect),
          });
        }
      }

      type SvgGeometryPaintEvidence = {
        fillPainted: boolean;
        inverseScreenMatrix: DOMMatrix;
        pathSamples: PaintPoint[];
        strokePainted: boolean;
        supported: boolean;
      };
      const unsupportedGeometryPaintEvidence = (): SvgGeometryPaintEvidence => ({
        fillPainted: false,
        inverseScreenMatrix: new DOMMatrix(),
        pathSamples: [],
        strokePainted: false,
        supported: false,
      });
      const parsedPaintOpacity = (value: string) => {
        const parsed = value.trim() ? Number(value) : 1;
        return Number.isFinite(parsed)
          ? Math.min(1, Math.max(0, parsed))
          : null;
      };
      const visibleSvgPaintChannel = (paint: string, opacity: string) => {
        const normalized = paint.trim().toLowerCase();
        const parsedOpacity = parsedPaintOpacity(opacity);
        if (!normalized || parsedOpacity === null) return null;
        if (
          normalized === "none" ||
          normalized === "transparent" ||
          parsedOpacity <= 0.01
        )
          return false;
        return normalized.startsWith("url(") || colorAlpha(normalized) > 0.01;
      };
      const finiteMatrix = (matrix: DOMMatrix) =>
        [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].every(
          Number.isFinite,
        );
      const geometryPaintCache = new Map<Element, SvgGeometryPaintEvidence>();
      const geometryPaintEvidence = (element: Element) => {
        const cached = geometryPaintCache.get(element);
        if (cached) return cached;
        let evidence = unsupportedGeometryPaintEvidence();
        if (!(element instanceof SVGGeometryElement)) {
          geometryPaintCache.set(element, evidence);
          return evidence;
        }
        const style = getComputedStyle(element);
        const fillPainted = visibleSvgPaintChannel(
          style.fill,
          style.fillOpacity,
        );
        const strokeChannelPainted = visibleSvgPaintChannel(
          style.stroke,
          style.strokeOpacity,
        );
        const strokeWidth = Number.parseFloat(style.strokeWidth);
        const strokePainted =
          strokeChannelPainted === true &&
          Number.isFinite(strokeWidth) &&
          strokeWidth > 0;
        const hasUnsupportedAuxiliaryPaint = [
          style.markerStart,
          style.markerMid,
          style.markerEnd,
          style.filter,
        ].some((value) => value.trim() && value.trim().toLowerCase() !== "none");
        if (
          fillPainted === null ||
          strokeChannelPainted === null ||
          hasUnsupportedAuxiliaryPaint
        ) {
          geometryPaintCache.set(element, evidence);
          return evidence;
        }
        try {
          const screenMatrix = (element as SVGGraphicsElement).getScreenCTM();
          if (!screenMatrix || !finiteMatrix(screenMatrix)) {
            geometryPaintCache.set(element, evidence);
            return evidence;
          }
          const inverseScreenMatrix = screenMatrix.inverse();
          if (!finiteMatrix(inverseScreenMatrix)) {
            geometryPaintCache.set(element, evidence);
            return evidence;
          }
          const totalLength = element.getTotalLength();
          if (!Number.isFinite(totalLength) || totalLength < 0) {
            geometryPaintCache.set(element, evidence);
            return evidence;
          }
          const screenScale = Math.max(
            Math.hypot(screenMatrix.a, screenMatrix.b),
            Math.hypot(screenMatrix.c, screenMatrix.d),
          );
          if (!Number.isFinite(screenScale) || screenScale <= 0) {
            geometryPaintCache.set(element, evidence);
            return evidence;
          }
          const sampleCount =
            totalLength > 0
              ? Math.max(
                  8,
                  Math.min(2048, Math.ceil((totalLength * screenScale) / 1.5)),
                )
              : 0;
          const pathSamples: PaintPoint[] = [];
          for (let index = 0; index <= sampleCount; index += 1) {
            const localPoint = element.getPointAtLength(
              sampleCount === 0 ? 0 : (totalLength * index) / sampleCount,
            );
            const screenPoint = new DOMPoint(
              localPoint.x,
              localPoint.y,
            ).matrixTransform(screenMatrix);
            if (!Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) {
              geometryPaintCache.set(element, evidence);
              return evidence;
            }
            pathSamples.push({ x: screenPoint.x, y: screenPoint.y });
          }
          evidence = {
            fillPainted,
            inverseScreenMatrix,
            pathSamples,
            strokePainted,
            supported: true,
          };
        } catch {
          evidence = unsupportedGeometryPaintEvidence();
        }
        geometryPaintCache.set(element, evidence);
        return evidence;
      };
      type SvgTextPaintEvidence = {
        alpha: Uint8ClampedArray;
        height: number;
        inverseScreenMatrix: DOMMatrix;
        originX: number;
        originY: number;
        paintedScreenPoints: PaintPoint[];
        pixelScale: number;
        supported: boolean;
        width: number;
      };
      const unsupportedTextPaintEvidence = (): SvgTextPaintEvidence => ({
        alpha: new Uint8ClampedArray(),
        height: 0,
        inverseScreenMatrix: new DOMMatrix(),
        originX: 0,
        originY: 0,
        paintedScreenPoints: [],
        pixelScale: 1,
        supported: false,
        width: 0,
      });
      const textPaintCache = new Map<Element, SvgTextPaintEvidence>();
      const textPaintEvidence = (element: Element) => {
        const cached = textPaintCache.get(element);
        if (cached) return cached;
        let evidence = unsupportedTextPaintEvidence();
        const textContent = element as SVGTextContentElement;
        if (
          !(element instanceof SVGElement) ||
          typeof textContent.getCharNumAtPosition !== "function" ||
          typeof textContent.getNumberOfChars !== "function"
        ) {
          textPaintCache.set(element, evidence);
          return evidence;
        }
        try {
          const screenMatrix = (element as SVGGraphicsElement).getScreenCTM();
          const charCount = textContent.getNumberOfChars();
          const characters = Array.from(element.textContent ?? "");
          if (
            !screenMatrix ||
            !finiteMatrix(screenMatrix) ||
            !Number.isInteger(charCount) ||
            charCount <= 0 ||
            characters.length !== charCount
          ) {
            textPaintCache.set(element, evidence);
            return evidence;
          }
          const inverseScreenMatrix = screenMatrix.inverse();
          if (!finiteMatrix(inverseScreenMatrix)) {
            textPaintCache.set(element, evidence);
            return evidence;
          }
          const style = getComputedStyle(element);
          const fillPainted = visibleSvgPaintChannel(
            style.fill,
            style.fillOpacity,
          );
          const strokeChannelPainted = visibleSvgPaintChannel(
            style.stroke,
            style.strokeOpacity,
          );
          const strokeWidth = Number.parseFloat(style.strokeWidth);
          const strokePainted =
            strokeChannelPainted === true &&
            Number.isFinite(strokeWidth) &&
            strokeWidth > 0;
          const rect = element.getBoundingClientRect();
          const pixelScale = 2;
          const padding = 2;
          const originX = Math.floor(rect.left) - padding;
          const originY = Math.floor(rect.top) - padding;
          const width = Math.ceil((rect.right - originX + padding) * pixelScale);
          const height = Math.ceil((rect.bottom - originY + padding) * pixelScale);
          if (
            fillPainted === null ||
            strokeChannelPainted === null ||
            (!fillPainted && !strokePainted) ||
            style.writingMode !== "horizontal-tb" ||
            element.hasAttribute("textLength") ||
            width <= 0 ||
            height <= 0 ||
            width > 4096 ||
            height > 4096 ||
            width * height > 16_777_216
          ) {
            textPaintCache.set(element, evidence);
            return evidence;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d", {
            willReadFrequently: true,
          });
          if (!context) {
            textPaintCache.set(element, evidence);
            return evidence;
          }
          context.setTransform(
            pixelScale * screenMatrix.a,
            pixelScale * screenMatrix.b,
            pixelScale * screenMatrix.c,
            pixelScale * screenMatrix.d,
            pixelScale * (screenMatrix.e - originX),
            pixelScale * (screenMatrix.f - originY),
          );
          context.font = style.font;
          context.textAlign = "left";
          context.textBaseline = "alphabetic";
          context.direction = style.direction as CanvasDirection;
          context.fillStyle = "#000";
          context.strokeStyle = "#000";
          context.lineWidth = strokePainted ? strokeWidth : 0;
          for (let index = 0; index < charCount; index += 1) {
            const start = textContent.getStartPositionOfChar(index);
            const rotation = textContent.getRotationOfChar(index);
            if (
              !Number.isFinite(start.x) ||
              !Number.isFinite(start.y) ||
              !Number.isFinite(rotation)
            ) {
              textPaintCache.set(element, evidence);
              return evidence;
            }
            context.save();
            context.translate(start.x, start.y);
            if (rotation !== 0) context.rotate((rotation * Math.PI) / 180);
            if (fillPainted) context.fillText(characters[index], 0, 0);
            if (strokePainted) context.strokeText(characters[index], 0, 0);
            context.restore();
          }
          const alpha = context.getImageData(0, 0, width, height).data;
          const paintedScreenPoints: PaintPoint[] = [];
          for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
              if (alpha[(y * width + x) * 4 + 3] <= 8) continue;
              paintedScreenPoints.push({
                x: originX + (x + 0.5) / pixelScale,
                y: originY + (y + 0.5) / pixelScale,
              });
            }
          }
          if (paintedScreenPoints.length === 0) {
            textPaintCache.set(element, evidence);
            return evidence;
          }
          evidence = {
            alpha,
            height,
            inverseScreenMatrix,
            originX,
            originY,
            paintedScreenPoints,
            pixelScale,
            supported: true,
            width,
          };
        } catch {
          evidence = unsupportedTextPaintEvidence();
        }
        textPaintCache.set(element, evidence);
        return evidence;
      };
      const paintedSvgGeometryIntersectsRect = (
        element: Element,
        targetRect: RectLike,
        svgLabel: Element | null,
      ) => {
        if (!(element instanceof SVGGeometryElement)) return true;
        const geometry = element;
        const evidence = geometryPaintEvidence(element);
        // Images, <use>, auxiliary marker/filter paint, singular transforms,
        // and browser geometry API failures retain the coarse fail-closed hit.
        if (!evidence.supported) return true;
        if (!evidence.fillPainted && !evidence.strokePainted) return false;
        const labelEvidence = svgLabel
          ? textPaintEvidence(svgLabel)
          : null;
        // HTML labels retain their existing rectangle contract. An SVG label
        // must expose transform-aware character hit testing; otherwise keep
        // the coarse hit fail-closed rather than silently certifying it.
        if (labelEvidence && !labelEvidence.supported) return true;
        let geometryApiFailed = false;
        let labelApiFailed = false;
        const paintedAtScreenPoint = (point: PaintPoint) => {
          try {
            const localPoint = new DOMPoint(point.x, point.y).matrixTransform(
              evidence.inverseScreenMatrix,
            );
            return (
              (evidence.fillPainted && geometry.isPointInFill(localPoint)) ||
              (evidence.strokePainted && geometry.isPointInStroke(localPoint))
            );
          } catch {
            geometryApiFailed = true;
            return false;
          }
        };
        const labelOccupiesScreenPoint = (point: PaintPoint) => {
          if (!svgLabel || !labelEvidence) return true;
          try {
            const localPoint = new DOMPoint(point.x, point.y).matrixTransform(
              labelEvidence.inverseScreenMatrix,
            );
            if (
              (svgLabel as SVGTextContentElement).getCharNumAtPosition(
                localPoint,
              ) < 0
            )
              return false;
            const pixelX = Math.floor(
              (point.x - labelEvidence.originX) * labelEvidence.pixelScale,
            );
            const pixelY = Math.floor(
              (point.y - labelEvidence.originY) * labelEvidence.pixelScale,
            );
            if (
              pixelX < 0 ||
              pixelY < 0 ||
              pixelX >= labelEvidence.width ||
              pixelY >= labelEvidence.height
            )
              return false;
            return (
              labelEvidence.alpha[
                (pixelY * labelEvidence.width + pixelX) * 4 + 3
              ] > 8
            );
          } catch {
            labelApiFailed = true;
            return false;
          }
        };
        const sharedPaintAtScreenPoint = (point: PaintPoint) =>
          paintedAtScreenPoint(point) && labelOccupiesScreenPoint(point);
        const pointInsideTarget = (point: PaintPoint) =>
          point.x >= targetRect.left + 0.25 &&
          point.x <= targetRect.right - 0.25 &&
          point.y >= targetRect.top + 0.25 &&
          point.y <= targetRect.bottom - 0.25;

        // A dense cached text-alpha mask closes the remaining character-cell
        // gap: SVG hit testing deliberately treats the whole advance cell as
        // occupied, while a learner only sees the actual glyph paint.
        if (labelEvidence) {
          for (const point of labelEvidence.paintedScreenPoints) {
            if (pointInsideTarget(point) && paintedAtScreenPoint(point))
              return true;
          }
        }

        // Path-length samples provide transform-aware evidence for narrow,
        // diagonal, dashed, and multi-segment strokes that a screen grid can
        // otherwise step over. isPointInStroke keeps dash/cap semantics exact.
        for (const point of evidence.pathSamples) {
          if (pointInsideTarget(point) && sharedPaintAtScreenPoint(point))
            return true;
        }

        const width = targetRect.right - targetRect.left;
        const height = targetRect.bottom - targetRect.top;
        const xSteps = Math.max(2, Math.min(12, Math.ceil(width / 2)));
        const ySteps = Math.max(2, Math.min(12, Math.ceil(height / 2)));
        for (let xIndex = 0; xIndex <= xSteps; xIndex += 1) {
          for (let yIndex = 0; yIndex <= ySteps; yIndex += 1) {
            if (
              sharedPaintAtScreenPoint({
                x: targetRect.left + (width * xIndex) / xSteps,
                y: targetRect.top + (height * yIndex) / ySteps,
              })
            )
              return true;
          }
        }

        // Fine perimeter probes catch thick strokes whose centreline remains
        // just outside the label while painted stroke enters its rectangle.
        const horizontalSteps = Math.max(
          2,
          Math.min(512, Math.ceil(width / 1.5)),
        );
        const verticalSteps = Math.max(
          2,
          Math.min(512, Math.ceil(height / 1.5)),
        );
        for (let index = 0; index <= horizontalSteps; index += 1) {
          const x = targetRect.left + (width * index) / horizontalSteps;
          if (
            sharedPaintAtScreenPoint({ x, y: targetRect.top + 0.25 }) ||
            sharedPaintAtScreenPoint({ x, y: targetRect.bottom - 0.25 })
          )
            return true;
        }
        for (let index = 0; index <= verticalSteps; index += 1) {
          const y = targetRect.top + (height * index) / verticalSteps;
          if (
            sharedPaintAtScreenPoint({ x: targetRect.left + 0.25, y }) ||
            sharedPaintAtScreenPoint({ x: targetRect.right - 0.25, y })
          )
            return true;
        }
        return geometryApiFailed || labelApiFailed;
      };

      const surfaces = Array.from(
        new Set<Element>([
          ...(root.matches("[data-viz-surface]") ? [root] : []),
          ...Array.from(root.querySelectorAll("[data-viz-surface]")),
        ]),
      );
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
            const markRect = visibleScreenRectForMark(mark);
            if (!markRect) return;
            const overlap = intersection(labelEntry.rect, markRect);
            if (!overlap) return;
            if (
              !paintedSvgGeometryIntersectsRect(
                mark,
                overlap,
                labelEntry.svg ? label : null,
              )
            )
              return;
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
      const learnerControlCount = controls.length;
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
      phase,
      visibilityGlobalName: effectiveVisibilityGlobalName,
    },
  );
}
