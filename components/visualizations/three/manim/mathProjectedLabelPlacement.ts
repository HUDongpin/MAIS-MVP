import type { ProjectionViewport } from "./mathProjectedLabels";

export type ProjectedLabelEdgeAnchor = "center" | "end" | "start";

export type ProjectedLabelPlacement = {
  bounds: ProjectedLabelBounds;
  horizontalAnchor: ProjectedLabelEdgeAnchor;
  left: string;
  maxHeight: string;
  maxWidth: string;
  top: string;
  transform: string;
  verticalAnchor: ProjectedLabelEdgeAnchor;
};

export type ProjectedLabelBounds = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

const maximumProjectedLabelHeightPx = 80;
const maximumProjectedLabelWidthPx = 192;
const viewportPaddingPx = 8;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Keeps a projected HTML label inside the measured canvas overlay. A centered
 * transform is correct in the middle of the scene, but near an edge it would
 * place half of the label outside an overflow-hidden Three.js surface.
 */
export function buildProjectedLabelPlacement(
  screen: readonly [number, number],
  viewport: ProjectionViewport
): ProjectedLabelPlacement {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const horizontalPadding = Math.min(viewportPaddingPx, width / 2);
  const verticalPadding = Math.min(viewportPaddingPx, height / 2);
  const maxWidth = Math.max(0, Math.min(maximumProjectedLabelWidthPx, width - horizontalPadding * 2));
  const maxHeight = Math.max(0, Math.min(maximumProjectedLabelHeightPx, height - verticalPadding * 2));
  const horizontalGuard = Math.min(maxWidth / 2 + horizontalPadding, width / 2);
  const verticalGuard = Math.min(maxHeight / 2 + verticalPadding, height / 2);
  const x = clamp(screen[0], horizontalPadding, width - horizontalPadding);
  const y = clamp(screen[1], verticalPadding, height - verticalPadding);
  const horizontalAnchor: ProjectedLabelEdgeAnchor = screen[0] <= horizontalGuard
    ? "start"
    : screen[0] >= width - horizontalGuard
      ? "end"
      : "center";
  const verticalAnchor: ProjectedLabelEdgeAnchor = screen[1] <= verticalGuard
    ? "start"
    : screen[1] >= height - verticalGuard
      ? "end"
      : "center";
  const placedX = horizontalAnchor === "start"
    ? horizontalPadding
    : horizontalAnchor === "end"
      ? width - horizontalPadding
      : x;
  const placedY = verticalAnchor === "start"
    ? verticalPadding
    : verticalAnchor === "end"
      ? height - verticalPadding
      : y;
  const translateX = horizontalAnchor === "start" ? "0%" : horizontalAnchor === "end" ? "-100%" : "-50%";
  const translateY = verticalAnchor === "start" ? "0%" : verticalAnchor === "end" ? "-100%" : "-50%";
  const boundsLeft = horizontalAnchor === "start"
    ? placedX
    : horizontalAnchor === "end"
      ? placedX - maxWidth
      : placedX - maxWidth / 2;
  const boundsTop = verticalAnchor === "start"
    ? placedY
    : verticalAnchor === "end"
      ? placedY - maxHeight
      : placedY - maxHeight / 2;

  return {
    bounds: {
      bottom: boundsTop + maxHeight,
      height: maxHeight,
      left: boundsLeft,
      right: boundsLeft + maxWidth,
      top: boundsTop,
      width: maxWidth
    },
    horizontalAnchor,
    left: `${placedX.toFixed(2)}px`,
    maxHeight: `${maxHeight.toFixed(2)}px`,
    maxWidth: `${maxWidth.toFixed(2)}px`,
    top: `${placedY.toFixed(2)}px`,
    transform: `translate(${translateX}, ${translateY})`,
    verticalAnchor
  };
}
