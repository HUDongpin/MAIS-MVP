import type { ProjectedLabelAnchor, ProjectionViewport } from "./mathProjectedLabels";
import { buildProjectedLabelPlacement } from "./mathProjectedLabelPlacement";

export const FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT =
  "Formula overlay collision: fixed-in-frame formula panel is checked against projected mobject labels for safe browser placement" as const;

export type FormulaOverlaySafeAreaStatus = "collision" | "overflow" | "safe";
export type FormulaOverlayPlacement = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export type FormulaOverlayBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type FormulaOverlayCollisionDiagnostics = {
  collisionCount: number;
  collisionLabelIds: string;
  formulaBox: FormulaOverlayBox;
  formulaId: string;
  mobileViewport: boolean;
  overflowEdges: string;
  placement: FormulaOverlayPlacement;
  safeAreaStatus: FormulaOverlaySafeAreaStatus;
  sourceContract: typeof FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT;
  summary: string;
  viewportHeight: number;
  viewportWidth: number;
};

export type FormulaOverlayCollisionInput = {
  formulaId: string;
  projectedLabels: Pick<ProjectedLabelAnchor, "id" | "screen" | "text" | "visible">[];
  tokenCount: number;
  viewport: ProjectionViewport;
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return finite(value, 0).toFixed(1);
}

function formatBox(box: FormulaOverlayBox) {
  return [
    `x=${formatNumber(box.x)}`,
    `y=${formatNumber(box.y)}`,
    `w=${formatNumber(box.width)}`,
    `h=${formatNumber(box.height)}`
  ].join(",");
}

function formulaOverlaySize(viewport: ProjectionViewport, tokenCount: number) {
  const viewportWidth = Math.max(1, finite(viewport.width, 800));
  const viewportHeight = Math.max(1, finite(viewport.height, 450));
  const margin = 12;
  const mobileViewport = viewportWidth <= 480;
  const maxCssWidth = Math.min(viewportWidth * (mobileViewport ? 0.5 : 0.78), 544);
  const width = clamp(168 + Math.max(0, tokenCount) * 64, 220, Math.max(1, maxCssWidth));
  const usableTokenWidth = Math.max(1, width - 32);
  const tokensPerRow = Math.max(1, Math.floor(usableTokenWidth / 72));
  const tokenRows = Math.max(1, Math.ceil(Math.max(1, tokenCount) / tokensPerRow));
  const maxCssHeight = mobileViewport
    ? viewportHeight * 0.42
    : viewportHeight - margin * 2;
  const height = Math.min(56 + tokenRows * 28, Math.max(1, maxCssHeight));

  return { height, width };
}

function formulaOverlayBox(
  viewport: ProjectionViewport,
  tokenCount: number,
  placement: FormulaOverlayPlacement
): FormulaOverlayBox {
  const viewportWidth = Math.max(1, finite(viewport.width, 800));
  const viewportHeight = Math.max(1, finite(viewport.height, 450));
  const margin = 12;
  const { height, width } = formulaOverlaySize(viewport, tokenCount);
  const rightAligned = placement.endsWith("right");
  const bottomAligned = placement.startsWith("bottom");

  return {
    height,
    width,
    x: rightAligned ? viewportWidth - margin - width : margin,
    y: bottomAligned ? viewportHeight - margin - height : margin
  };
}

function boxesIntersect(left: FormulaOverlayBox, right: FormulaOverlayBox) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function overflowEdges(box: FormulaOverlayBox, viewportWidth: number, viewportHeight: number) {
  const edges = [
    box.x < 0 ? "left" : "",
    box.y < 0 ? "top" : "",
    box.x + box.width > viewportWidth ? "right" : "",
    box.y + box.height > viewportHeight ? "bottom" : ""
  ].filter(Boolean);

  return edges.join(",") || "none";
}

export function buildFormulaOverlayCollisionDiagnostics(
  input: FormulaOverlayCollisionInput
): FormulaOverlayCollisionDiagnostics {
  const viewportWidth = Math.max(1, finite(input.viewport.width, 800));
  const viewportHeight = Math.max(1, finite(input.viewport.height, 450));
  const viewport = { height: viewportHeight, width: viewportWidth };
  const placements: FormulaOverlayPlacement[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
  const candidates = placements.map((placement) => {
    const box = formulaOverlayBox(viewport, input.tokenCount, placement);
    const collisionLabels = input.projectedLabels.filter((label) => {
      if (!label.visible) return false;
      const placement = buildProjectedLabelPlacement(
        [finite(label.screen[0], -1), finite(label.screen[1], -1)],
        viewport,
        { text: label.text }
      );
      const labelBox = {
        height: placement.bounds.height,
        width: placement.bounds.width,
        x: placement.bounds.left,
        y: placement.bounds.top
      };
      return boxesIntersect(labelBox, box);
    });
    const overflow = overflowEdges(box, viewportWidth, viewportHeight);
    return { box, collisionLabels, overflow, placement };
  });
  // Preserve the familiar top-left placement when it is safe. Otherwise move
  // the fixed-in-frame formula panel to the first corner with the fewest label
  // collisions. Every candidate is deterministic, viewport-bounded, and uses
  // the same geometry that MathFormulaOverlay applies in CSS.
  const selected = candidates.reduce((best, candidate) => {
    if (candidate.collisionLabels.length !== best.collisionLabels.length) {
      return candidate.collisionLabels.length < best.collisionLabels.length ? candidate : best;
    }
    const candidateOverflowCount = candidate.overflow === "none" ? 0 : candidate.overflow.split(",").length;
    const bestOverflowCount = best.overflow === "none" ? 0 : best.overflow.split(",").length;
    return candidateOverflowCount < bestOverflowCount ? candidate : best;
  });
  const formulaBox = selected.box;
  const collisionLabels = selected.collisionLabels;
  const collisionLabelIds = collisionLabels.map((label) => label.id).join(",") || "none";
  const overflow = selected.overflow;
  const safeAreaStatus: FormulaOverlaySafeAreaStatus = collisionLabels.length > 0
    ? "collision"
    : overflow !== "none" ? "overflow" : "safe";
  const mobileViewport = viewportWidth <= 480;
  const summary = [
    `formula=${input.formulaId}`,
    `viewport=${formatNumber(viewportWidth)}x${formatNumber(viewportHeight)}`,
    `mobile=${mobileViewport ? "true" : "false"}`,
    `placement=${selected.placement}`,
    `box=${formatBox(formulaBox)}`,
    `status=${safeAreaStatus}`,
    `collisions=${collisionLabelIds}`,
    `overflow=${overflow}`
  ].join(";");

  return {
    collisionCount: collisionLabels.length,
    collisionLabelIds,
    formulaBox,
    formulaId: input.formulaId,
    mobileViewport,
    overflowEdges: overflow,
    placement: selected.placement,
    safeAreaStatus,
    sourceContract: FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT,
    summary,
    viewportHeight,
    viewportWidth
  };
}

export function formulaOverlayCollisionDataAttributes(diagnostics: FormulaOverlayCollisionDiagnostics) {
  return {
    "data-viz-manim-formula-collision-count": String(diagnostics.collisionCount),
    "data-viz-manim-formula-collision-label-ids": diagnostics.collisionLabelIds,
    "data-viz-manim-formula-collision-source-contract": diagnostics.sourceContract,
    "data-viz-manim-formula-mobile-viewport": diagnostics.mobileViewport ? "true" : "false",
    "data-viz-manim-formula-placement": diagnostics.placement,
    "data-viz-manim-formula-safe-area-status": diagnostics.safeAreaStatus,
    "data-viz-manim-formula-safe-area-summary": diagnostics.summary
  } as const;
}

export function serializeFormulaOverlayCollisionDiagnostics(diagnostics: FormulaOverlayCollisionDiagnostics) {
  return stableSerialize(diagnostics);
}
