import { angleAt, distance, formatNumber } from "./math";
import type {
  CoordinateGridQuestionDiagram,
  LocalizedText,
  NumberLineHighlight,
  NumberLinePoint,
  NumberLineQuestionDiagram,
  PlaneFigureAngleMark,
  PlaneFigureCircle,
  PlaneFigurePoint,
  PlaneFigurePolygon,
  PlaneFigureQuestionDiagram,
  PlaneFigureSegment,
  QuestionDiagram,
  SolidFigureDimensionLabels,
  SolidFigureQuestionDiagram,
  SolidFigureShape
} from "../types";

export type SvgPoint = { x: number; y: number };
export type SvgRect = { left: number; top: number; right: number; bottom: number };
export type LabelPlacement = SvgPoint & { rect: SvgRect; clean: boolean };
export type FigureTextResolver = (value: LocalizedText | string) => string;

export type CoordinateGridDiagramLine = NonNullable<CoordinateGridQuestionDiagram["lines"]>[number];
export type CoordinateGridDiagramPoint = CoordinateGridDiagramLine["points"][number];

const labelCandidateOffsets = [
  { x: 12, y: -16 },
  { x: -12, y: -16 },
  { x: 12, y: 16 },
  { x: -12, y: 16 },
  { x: 19, y: 0 },
  { x: -19, y: 0 },
  { x: 0, y: -14 },
  { x: 0, y: 19 },
  { x: 12, y: 14 },
  { x: -12, y: 14 },
  { x: 12, y: -30 },
  { x: -12, y: -30 },
  { x: 12, y: 30 },
  { x: -12, y: 30 },
  { x: 26, y: -20 },
  { x: -26, y: -20 },
  { x: 26, y: 20 },
  { x: -26, y: 20 },
  { x: 30, y: 0 },
  { x: -30, y: 0 },
  { x: 0, y: -24 },
  { x: 0, y: 26 }
];

const pointMarkerRadius = 5;
const graphStrokePadding = 6;
const labelCollisionPadding = 1;
const labelFontHeight = 15;
const labelMinWidth = 9;
const labelWidthPerCharacter = 8.8;

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function integerTicks(min: number, max: number) {
  const start = Math.ceil(min);
  const end = Math.floor(max);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export function rectsOverlap(first: SvgRect, second: SvgRect) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
}

export function expandRect(rect: SvgRect, padding: number): SvgRect {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding
  };
}

export function rectContains(outer: SvgRect, inner: SvgRect) {
  return inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom;
}

export function pointInRect(point: SvgPoint, rect: SvgRect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

export function labelRectFor(label: string, center: SvgPoint): SvgRect {
  const width = Math.max(labelMinWidth, label.length * labelWidthPerCharacter + 2);
  const halfWidth = width / 2;
  const halfHeight = labelFontHeight / 2;

  return {
    left: center.x - halfWidth,
    top: center.y - halfHeight,
    right: center.x + halfWidth,
    bottom: center.y + halfHeight
  };
}

export function markerRectFor(center: SvgPoint) {
  return {
    left: center.x - pointMarkerRadius,
    top: center.y - pointMarkerRadius,
    right: center.x + pointMarkerRadius,
    bottom: center.y + pointMarkerRadius
  };
}

export function collisionSamplesForSegment(start: SvgPoint, end: SvgPoint) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const sampleCount = Math.max(2, Math.ceil(length / 2));

  return Array.from({ length: sampleCount + 1 }, (_, sampleIndex) => {
    const ratio = sampleIndex / sampleCount;
    return {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    };
  });
}

function collisionSamplesForCircle(center: SvgPoint, radius: number) {
  const sampleCount = Math.max(12, Math.ceil((2 * Math.PI * radius) / 4));

  return Array.from({ length: sampleCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / sampleCount;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    };
  });
}

export function chooseLabelPlacement({
  label,
  anchor,
  plotRect,
  plottedSamples,
  placedLabelRects
}: {
  label: string;
  anchor: SvgPoint;
  plotRect: SvgRect;
  plottedSamples: SvgPoint[];
  placedLabelRects: SvgRect[];
}): LabelPlacement {
  const markerRect = markerRectFor(anchor);
  const candidates = labelCandidateOffsets.map((offset, index) => {
    const center = { x: anchor.x + offset.x, y: anchor.y + offset.y };
    const rect = labelRectFor(label, center);
    const outsidePlot = !rectContains(plotRect, rect);
    const overlapsGraph = plottedSamples.some((sample) => pointInRect(sample, expandRect(rect, graphStrokePadding)));
    const overlapsMarker = rectsOverlap(rect, expandRect(markerRect, labelCollisionPadding));
    const overlapsLabel = placedLabelRects.some((placedRect) => rectsOverlap(rect, expandRect(placedRect, labelCollisionPadding)));

    return {
      ...center,
      rect,
      index,
      outsidePlot,
      overlapsGraph,
      overlapsMarker,
      overlapsLabel
    };
  });

  const perfectCandidate = candidates.find((candidate) =>
    !candidate.outsidePlot &&
    !candidate.overlapsGraph &&
    !candidate.overlapsMarker &&
    !candidate.overlapsLabel
  );

  if (perfectCandidate) return { x: perfectCandidate.x, y: perfectCandidate.y, rect: perfectCandidate.rect, clean: true };

  const fallbackCandidates = candidates.filter((candidate) => !candidate.outsidePlot);
  const fallback = (fallbackCandidates.length ? fallbackCandidates : candidates)
    .slice()
    .sort((first, second) => {
      const scoreFor = (candidate: (typeof candidates)[number]) =>
        (candidate.outsidePlot ? 1000 : 0) +
        (candidate.overlapsGraph ? 100 : 0) +
        (candidate.overlapsMarker ? 10 : 0) +
        (candidate.overlapsLabel ? 5 : 0) +
        candidate.index / 100;

      return scoreFor(first) - scoreFor(second);
    })[0];

  return { x: fallback.x, y: fallback.y, rect: fallback.rect, clean: false };
}

function resolveDiagramText(value: LocalizedText | string, language: "en" | "zh") {
  if (typeof value === "string") return value;
  if (language === "en") return value.en;
  return value.zhHans ?? value.zh;
}

export type FigureLabel = {
  key: string;
  x: number;
  y: number;
  text: string;
  variant: "point" | "measure";
  clean: boolean;
};

// --- Coordinate grid -------------------------------------------------------

export function isXAxisPoint(point: { x: number; y: number }) {
  return Math.abs(point.y) < 0.0001;
}

export function shouldDrawAsQuadratic(line: CoordinateGridDiagramLine) {
  const label = line.label?.toLowerCase() ?? "";
  return line.points.length >= 3 && (label.includes("parabola") || label === "curve");
}

export function shouldShowLineValueMarkers(line: CoordinateGridDiagramLine) {
  return line.points.length > 2 && !shouldDrawAsQuadratic(line);
}

function uniquePointsByX(points: CoordinateGridDiagramPoint[]) {
  return [...points]
    .sort((a, b) => a.x - b.x)
    .filter((point, index, sortedPoints) => index === 0 || Math.abs(point.x - sortedPoints[index - 1].x) > 0.0001);
}

function quadraticYAt(x: number, anchors: [CoordinateGridDiagramPoint, CoordinateGridDiagramPoint, CoordinateGridDiagramPoint]) {
  const [p0, p1, p2] = anchors;
  const term0 = p0.y * ((x - p1.x) * (x - p2.x)) / ((p0.x - p1.x) * (p0.x - p2.x));
  const term1 = p1.y * ((x - p0.x) * (x - p2.x)) / ((p1.x - p0.x) * (p1.x - p2.x));
  const term2 = p2.y * ((x - p0.x) * (x - p1.x)) / ((p2.x - p0.x) * (p2.x - p1.x));
  return term0 + term1 + term2;
}

function isYVisible(y: number, yMin: number, yMax: number) {
  const tolerance = 0.0001;
  return y >= yMin - tolerance && y <= yMax + tolerance;
}

function visibleQuadraticIntervals(
  anchors: [CoordinateGridDiagramPoint, CoordinateGridDiagramPoint, CoordinateGridDiagramPoint],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
) {
  if (xMax <= xMin) return [];

  const sampleCount = 240;
  const isVisibleAt = (x: number) => isYVisible(quadraticYAt(x, anchors), yMin, yMax);
  const refineBoundary = (visibleX: number, hiddenX: number) => {
    let visible = visibleX;
    let hidden = hiddenX;

    for (let step = 0; step < 24; step += 1) {
      const midpoint = (visible + hidden) / 2;
      if (isVisibleAt(midpoint)) {
        visible = midpoint;
      } else {
        hidden = midpoint;
      }
    }

    return visible;
  };

  const intervals: Array<{ startX: number; endX: number }> = [];
  let previousX = xMin;
  let previousVisible = isVisibleAt(previousX);
  let currentStart = previousVisible ? xMin : null;

  for (let index = 1; index <= sampleCount; index += 1) {
    const x = xMin + ((xMax - xMin) * index) / sampleCount;
    const visible = isVisibleAt(x);

    if (!previousVisible && visible) {
      currentStart = refineBoundary(x, previousX);
    }

    if (previousVisible && !visible && currentStart !== null) {
      intervals.push({ startX: currentStart, endX: refineBoundary(previousX, x) });
      currentStart = null;
    }

    previousX = x;
    previousVisible = visible;
  }

  if (currentStart !== null) {
    intervals.push({ startX: currentStart, endX: xMax });
  }

  return intervals.filter((interval) => interval.endX >= interval.startX);
}

function quadraticAnchorsForLine(line: CoordinateGridDiagramLine) {
  if (!shouldDrawAsQuadratic(line)) return null;

  const sortedPoints = uniquePointsByX(line.points);
  if (sortedPoints.length < 3) return null;

  const anchors: [CoordinateGridDiagramPoint, CoordinateGridDiagramPoint, CoordinateGridDiagramPoint] = [
    sortedPoints[0],
    sortedPoints[Math.floor(sortedPoints.length / 2)],
    sortedPoints[sortedPoints.length - 1]
  ];
  const hasDuplicateAnchorX = new Set(anchors.map((point) => point.x)).size < 3;
  return hasDuplicateAnchorX ? null : { anchors, sortedPoints };
}

function quadraticPathForLine(
  line: CoordinateGridDiagramLine,
  xFor: (value: number) => number,
  yFor: (value: number) => number,
  xRange: [number, number],
  yRange: [number, number]
) {
  const resolved = quadraticAnchorsForLine(line);
  if (!resolved) return null;

  const { anchors, sortedPoints } = resolved;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const visibleIntervals = visibleQuadraticIntervals(anchors, xMin, xMax, yMin, yMax);
  const intervals = visibleIntervals.length > 0
    ? visibleIntervals
    : [{ startX: sortedPoints[0].x, endX: sortedPoints[sortedPoints.length - 1].x }];

  return intervals.map(({ startX, endX }) => {
    const sampleCount = Math.min(160, Math.max(48, Math.ceil(Math.abs(endX - startX) * 28)));

    return Array.from({ length: sampleCount + 1 }, (_, index) => {
      const x = startX + ((endX - startX) * index) / sampleCount;
      const y = clampNumber(quadraticYAt(x, anchors), yMin, yMax);
      const command = index === 0 ? "M" : "L";
      return `${command} ${xFor(x)} ${yFor(y)}`;
    }).join(" ");
  }).join(" ");
}

function collisionSamplesForLine(
  line: CoordinateGridDiagramLine,
  xFor: (value: number) => number,
  yFor: (value: number) => number,
  xRange: [number, number],
  yRange: [number, number]
) {
  const resolved = quadraticAnchorsForLine(line);

  if (resolved) {
    const { anchors, sortedPoints } = resolved;
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const visibleIntervals = visibleQuadraticIntervals(anchors, xMin, xMax, yMin, yMax);
    const intervals = visibleIntervals.length > 0
      ? visibleIntervals
      : [{ startX: sortedPoints[0].x, endX: sortedPoints[sortedPoints.length - 1].x }];

    return intervals.flatMap(({ startX, endX }) => {
      const sampleCount = Math.min(180, Math.max(56, Math.ceil(Math.abs(endX - startX) * 36)));

      return Array.from({ length: sampleCount + 1 }, (_, index) => {
        const x = startX + ((endX - startX) * index) / sampleCount;
        return {
          x: xFor(x),
          y: yFor(clampNumber(quadraticYAt(x, anchors), yMin, yMax))
        };
      });
    });
  }

  return line.points.flatMap((point, index, points) => {
    if (index === points.length - 1) return [];
    const start = { x: xFor(point.x), y: yFor(point.y) };
    const end = { x: xFor(points[index + 1].x), y: yFor(points[index + 1].y) };
    return collisionSamplesForSegment(start, end);
  });
}

export type CoordinateGridLayout = {
  viewBox: { width: number; height: number };
  plot: { left: number; top: number; width: number; height: number };
  plotRect: SvgRect;
  xTicks: number[];
  yTicks: number[];
  xFor: (value: number) => number;
  yFor: (value: number) => number;
  showXAxis: boolean;
  showYAxis: boolean;
  renderedLines: {
    line: CoordinateGridDiagramLine;
    lineKey: string;
    quadraticPath: string | null;
    pointsAttr: string;
    showValueMarkers: boolean;
  }[];
  labeledPoints: {
    label: string;
    x: number;
    y: number;
    anchor: SvgPoint;
    placement: LabelPlacement;
    onXAxis: boolean;
  }[];
};

export function buildCoordinateGridLayout(diagram: CoordinateGridQuestionDiagram): CoordinateGridLayout {
  const [xMin, xMax] = diagram.xRange;
  const [yMin, yMax] = diagram.yRange;
  const plot = { left: 36, top: 18, width: 214, height: 164 };
  const xTicks = integerTicks(xMin, xMax);
  const yTicks = integerTicks(yMin, yMax);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const xFor = (x: number) => plot.left + ((x - xMin) / xSpan) * plot.width;
  const yFor = (y: number) => plot.top + plot.height - ((y - yMin) / ySpan) * plot.height;
  const plotRect = {
    left: plot.left,
    top: plot.top,
    right: plot.left + plot.width,
    bottom: plot.top + plot.height
  };
  const showYAxis = xMin <= 0 && xMax >= 0;
  const showXAxis = yMin <= 0 && yMax >= 0;
  const renderedLines = (diagram.lines ?? []).map((line, index) => ({
    line,
    lineKey: line.label ?? `line-${index}`,
    quadraticPath: quadraticPathForLine(line, xFor, yFor, [xMin, xMax], [yMin, yMax]),
    pointsAttr: line.points.map((point) => `${xFor(point.x)},${yFor(point.y)}`).join(" "),
    showValueMarkers: shouldShowLineValueMarkers(line),
    collisionSamples: collisionSamplesForLine(line, xFor, yFor, [xMin, xMax], [yMin, yMax])
  }));
  const axisSamples = [
    ...(showYAxis
      ? collisionSamplesForSegment({ x: xFor(0), y: plot.top }, { x: xFor(0), y: plot.top + plot.height })
      : []),
    ...(showXAxis
      ? collisionSamplesForSegment({ x: plot.left, y: yFor(0) }, { x: plot.left + plot.width, y: yFor(0) })
      : [])
  ];
  const plottedSamples = [
    ...renderedLines.flatMap((line) => line.collisionSamples),
    ...axisSamples
  ];
  const placedLabelRects: SvgRect[] = [];
  const labeledPoints = (diagram.points ?? []).map((point) => {
    const anchor = { x: xFor(point.x), y: yFor(point.y) };
    const placement = chooseLabelPlacement({
      label: point.label,
      anchor,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);

    return {
      ...point,
      anchor,
      placement,
      onXAxis: isXAxisPoint(point)
    };
  });

  return {
    viewBox: { width: 280, height: 210 },
    plot,
    plotRect,
    xTicks,
    yTicks,
    xFor,
    yFor,
    showXAxis,
    showYAxis,
    renderedLines: renderedLines.map(({ collisionSamples: _collisionSamples, ...line }) => line),
    labeledPoints
  };
}

// --- Plane figure -----------------------------------------------------------

export type PlaneFigureLayout = {
  viewBox: { width: number; height: number };
  polygons: { key: string; pointsAttr: string; shaded: boolean }[];
  segments: { key: string; x1: number; y1: number; x2: number; y2: number; dashed: boolean }[];
  decorationStrokes: { key: string; x1: number; y1: number; x2: number; y2: number }[];
  circles: { key: string; cx: number; cy: number; r: number }[];
  centerDots: { key: string; x: number; y: number }[];
  anglePaths: { key: string; d: string }[];
  markers: { key: string; x: number; y: number }[];
  labels: FigureLabel[];
  issues: string[];
};

type ResolvedPlanePoint = PlaneFigurePoint & { svg: SvgPoint };

function unitVector(from: SvgPoint, to: SvgPoint) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 0.0001) return null;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

export function buildPlaneFigureLayout(diagram: PlaneFigureQuestionDiagram, textFor: FigureTextResolver): PlaneFigureLayout {
  const viewBox = { width: 280, height: 210 };
  const margin = 30;
  const issues: string[] = [];
  const circles = diagram.circles ?? [];

  if (!diagram.points.length) {
    return {
      viewBox,
      polygons: [],
      segments: [],
      decorationStrokes: [],
      circles: [],
      centerDots: [],
      anglePaths: [],
      markers: [],
      labels: [],
      issues: ["plane-figure: no points"]
    };
  }
  const xValues = [
    ...diagram.points.map((point) => point.x),
    ...circles.flatMap((circle) => {
      const center = diagram.points.find((point) => point.id === circle.centerId);
      return center ? [center.x - circle.radius, center.x + circle.radius] : [];
    })
  ];
  const yValues = [
    ...diagram.points.map((point) => point.y),
    ...circles.flatMap((circle) => {
      const center = diagram.points.find((point) => point.id === circle.centerId);
      return center ? [center.y - circle.radius, center.y + circle.radius] : [];
    })
  ];
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const spanX = maxX - minX || 2;
  const spanY = maxY - minY || 2;
  const scale = Math.min((viewBox.width - 2 * margin) / spanX, (viewBox.height - 2 * margin) / spanY);
  const contentWidth = spanX * scale;
  const contentHeight = spanY * scale;
  const left = (viewBox.width - contentWidth) / 2;
  const top = (viewBox.height - contentHeight) / 2;
  const originX = maxX - minX ? minX : minX - 1;
  const topY = maxY - minY ? maxY : maxY + 1;
  const xFor = (x: number) => left + (x - originX) * scale;
  const yFor = (y: number) => top + (topY - y) * scale;
  const plotRect: SvgRect = { left: 2, top: 2, right: viewBox.width - 2, bottom: viewBox.height - 2 };

  const resolvedPoints: ResolvedPlanePoint[] = diagram.points.map((point) => ({
    ...point,
    svg: { x: xFor(point.x), y: yFor(point.y) }
  }));
  const pointById = new Map(resolvedPoints.map((point) => [point.id, point]));

  const polygons: PlaneFigureLayout["polygons"] = [];
  const segments: PlaneFigureLayout["segments"] = [];
  const decorationStrokes: PlaneFigureLayout["decorationStrokes"] = [];
  const layoutCircles: PlaneFigureLayout["circles"] = [];
  const centerDots: PlaneFigureLayout["centerDots"] = [];
  const anglePaths: PlaneFigureLayout["anglePaths"] = [];
  const markers: PlaneFigureLayout["markers"] = [];
  const labels: FigureLabel[] = [];
  const plottedSamples: SvgPoint[] = [];
  const placedLabelRects: SvgRect[] = [];
  const centroid = resolvedPoints.length
    ? {
        x: resolvedPoints.reduce((sum, point) => sum + point.svg.x, 0) / resolvedPoints.length,
        y: resolvedPoints.reduce((sum, point) => sum + point.svg.y, 0) / resolvedPoints.length
      }
    : { x: viewBox.width / 2, y: viewBox.height / 2 };

  type PendingLabel = { key: string; text: string; anchor: SvgPoint; variant: FigureLabel["variant"] };
  const pendingMeasureLabels: PendingLabel[] = [];

  (diagram.polygons ?? []).forEach((polygon, index) => {
    const vertices = polygon.vertexIds
      .map((id) => pointById.get(id))
      .filter((point): point is ResolvedPlanePoint => Boolean(point));
    if (vertices.length !== polygon.vertexIds.length || vertices.length < 3) {
      issues.push(`polygon-${index}: unresolved or insufficient vertices`);
      return;
    }

    polygons.push({
      key: `polygon-${index}`,
      pointsAttr: vertices.map((vertex) => `${vertex.svg.x},${vertex.svg.y}`).join(" "),
      shaded: Boolean(polygon.shaded)
    });
    vertices.forEach((vertex, vertexIndex) => {
      const next = vertices[(vertexIndex + 1) % vertices.length];
      plottedSamples.push(...collisionSamplesForSegment(vertex.svg, next.svg));
    });
  });

  const segmentSpecs: { from: string; to: string; style?: "solid" | "dashed"; tickMarks?: number; parallelMarks?: number; label?: LocalizedText; keyPrefix: string }[] =
    (diagram.segments ?? []).map((segment, index) => ({ ...segment, keyPrefix: `segment-${index}` }));

  circles.forEach((circle, index) => {
    const center = pointById.get(circle.centerId);
    if (!center) {
      issues.push(`circle-${index}: unknown centerId ${circle.centerId}`);
      return;
    }

    const radius = circle.radius * scale;
    layoutCircles.push({ key: `circle-${index}`, cx: center.svg.x, cy: center.svg.y, r: radius });
    plottedSamples.push(...collisionSamplesForCircle(center.svg, radius));

    if (circle.showCenter ?? true) {
      centerDots.push({ key: `circle-center-${index}`, x: center.svg.x, y: center.svg.y });
    }

    if (circle.radiusToId) {
      segmentSpecs.push({
        from: circle.centerId,
        to: circle.radiusToId,
        label: circle.label,
        keyPrefix: `circle-radius-${index}`
      });
    } else if (circle.label) {
      const anchorAngle = -Math.PI / 4;
      pendingMeasureLabels.push({
        key: `circle-label-${index}`,
        text: textFor(circle.label),
        anchor: {
          x: center.svg.x + (radius + 10) * Math.cos(anchorAngle),
          y: center.svg.y + (radius + 10) * Math.sin(anchorAngle)
        },
        variant: "measure"
      });
    }
  });

  segmentSpecs.forEach((segment) => {
    const from = pointById.get(segment.from);
    const to = pointById.get(segment.to);
    if (!from || !to) {
      issues.push(`${segment.keyPrefix}: unknown endpoint ${!from ? segment.from : segment.to}`);
      return;
    }

    const direction = unitVector(from.svg, to.svg);
    if (!direction) {
      issues.push(`${segment.keyPrefix}: degenerate segment ${segment.from}-${segment.to}`);
      return;
    }

    segments.push({
      key: segment.keyPrefix,
      x1: from.svg.x,
      y1: from.svg.y,
      x2: to.svg.x,
      y2: to.svg.y,
      dashed: segment.style === "dashed"
    });
    plottedSamples.push(...collisionSamplesForSegment(from.svg, to.svg));

    const mid = { x: (from.svg.x + to.svg.x) / 2, y: (from.svg.y + to.svg.y) / 2 };
    const normal = { x: -direction.y, y: direction.x };
    const tickCount = clampNumber(Math.round(segment.tickMarks ?? 0), 0, 3);

    for (let tick = 0; tick < tickCount; tick += 1) {
      const offset = (tick - (tickCount - 1) / 2) * 5;
      const center = { x: mid.x + offset * direction.x, y: mid.y + offset * direction.y };
      decorationStrokes.push({
        key: `${segment.keyPrefix}-tick-${tick}`,
        x1: center.x - 4.5 * normal.x,
        y1: center.y - 4.5 * normal.y,
        x2: center.x + 4.5 * normal.x,
        y2: center.y + 4.5 * normal.y
      });
    }

    const chevronCount = clampNumber(Math.round(segment.parallelMarks ?? 0), 0, 2);

    for (let chevron = 0; chevron < chevronCount; chevron += 1) {
      const offset = (chevron - (chevronCount - 1) / 2) * 7 + 2;
      const tip = { x: mid.x + offset * direction.x, y: mid.y + offset * direction.y };
      const tail = { x: tip.x - 6 * direction.x, y: tip.y - 6 * direction.y };
      decorationStrokes.push(
        {
          key: `${segment.keyPrefix}-chevron-${chevron}-a`,
          x1: tail.x + 4.5 * normal.x,
          y1: tail.y + 4.5 * normal.y,
          x2: tip.x,
          y2: tip.y
        },
        {
          key: `${segment.keyPrefix}-chevron-${chevron}-b`,
          x1: tail.x - 4.5 * normal.x,
          y1: tail.y - 4.5 * normal.y,
          x2: tip.x,
          y2: tip.y
        }
      );
    }

    if (segment.label) {
      const towardCentroid = unitVector(mid, centroid);
      const away = towardCentroid ? { x: -towardCentroid.x, y: -towardCentroid.y } : normal;
      pendingMeasureLabels.push({
        key: `${segment.keyPrefix}-label`,
        text: textFor(segment.label),
        anchor: { x: mid.x + 14 * away.x, y: mid.y + 14 * away.y },
        variant: "measure"
      });
    }
  });

  (diagram.angleMarks ?? []).forEach((mark, index) => {
    const vertex = pointById.get(mark.vertexId);
    const fromPoint = pointById.get(mark.fromId);
    const toPoint = pointById.get(mark.toId);
    if (!vertex || !fromPoint || !toPoint) {
      issues.push(`angle-${index}: unknown point reference`);
      return;
    }

    const rayFrom = unitVector(vertex.svg, fromPoint.svg);
    const rayTo = unitVector(vertex.svg, toPoint.svg);
    if (!rayFrom || !rayTo) {
      issues.push(`angle-${index}: degenerate ray`);
      return;
    }

    if (mark.rightAngle) {
      const size = 10;
      const cornerA = { x: vertex.svg.x + size * rayFrom.x, y: vertex.svg.y + size * rayFrom.y };
      const cornerB = {
        x: vertex.svg.x + size * (rayFrom.x + rayTo.x),
        y: vertex.svg.y + size * (rayFrom.y + rayTo.y)
      };
      const cornerC = { x: vertex.svg.x + size * rayTo.x, y: vertex.svg.y + size * rayTo.y };
      anglePaths.push({
        key: `angle-${index}`,
        d: `M ${cornerA.x} ${cornerA.y} L ${cornerB.x} ${cornerB.y} L ${cornerC.x} ${cornerC.y}`
      });
      plottedSamples.push(cornerA, cornerB, cornerC);
    } else {
      const startAngle = Math.atan2(rayFrom.y, rayFrom.x);
      const endAngle = Math.atan2(rayTo.y, rayTo.x);
      let delta = endAngle - startAngle;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      const sweepFlag = delta > 0 ? 1 : 0;
      const arcCount = clampNumber(Math.round(mark.arcs ?? 1), 1, 3);

      for (let arc = 0; arc < arcCount; arc += 1) {
        const radius = 15 + arc * 5;
        const start = {
          x: vertex.svg.x + radius * Math.cos(startAngle),
          y: vertex.svg.y + radius * Math.sin(startAngle)
        };
        const end = {
          x: vertex.svg.x + radius * Math.cos(endAngle),
          y: vertex.svg.y + radius * Math.sin(endAngle)
        };
        anglePaths.push({
          key: `angle-${index}-arc-${arc}`,
          d: `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
        });

        const sampleCount = 12;
        for (let sample = 0; sample <= sampleCount; sample += 1) {
          const angle = startAngle + (delta * sample) / sampleCount;
          plottedSamples.push({
            x: vertex.svg.x + radius * Math.cos(angle),
            y: vertex.svg.y + radius * Math.sin(angle)
          });
        }
      }
    }

    if (mark.label) {
      const bisector = { x: rayFrom.x + rayTo.x, y: rayFrom.y + rayTo.y };
      const bisectorLength = Math.hypot(bisector.x, bisector.y);
      const direction = bisectorLength > 0.0001
        ? { x: bisector.x / bisectorLength, y: bisector.y / bisectorLength }
        : { x: -rayFrom.y, y: rayFrom.x };
      const labelRadius = mark.rightAngle ? 24 : 30 + (clampNumber(Math.round(mark.arcs ?? 1), 1, 3) - 1) * 5;
      pendingMeasureLabels.push({
        key: `angle-${index}-label`,
        text: textFor(mark.label),
        anchor: {
          x: vertex.svg.x + labelRadius * direction.x,
          y: vertex.svg.y + labelRadius * direction.y
        },
        variant: "measure"
      });
    }
  });

  resolvedPoints.forEach((point) => {
    if (!point.label) return;

    markers.push({ key: `marker-${point.id}`, x: point.svg.x, y: point.svg.y });
    const placement = chooseLabelPlacement({
      label: point.label,
      anchor: point.svg,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);
    if (!placement.clean) issues.push(`label-collision: point ${point.label}`);
    labels.push({
      key: `point-label-${point.id}`,
      x: placement.x,
      y: placement.y,
      text: point.label,
      variant: "point",
      clean: placement.clean
    });
  });

  pendingMeasureLabels.forEach((pending) => {
    const placement = chooseLabelPlacement({
      label: pending.text,
      anchor: pending.anchor,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);
    if (!placement.clean) issues.push(`label-collision: ${pending.text}`);
    labels.push({
      key: pending.key,
      x: placement.x,
      y: placement.y,
      text: pending.text,
      variant: pending.variant,
      clean: placement.clean
    });
  });

  return {
    viewBox,
    polygons,
    segments,
    decorationStrokes,
    circles: layoutCircles,
    centerDots,
    anglePaths,
    markers,
    labels,
    issues
  };
}

// --- Number line ------------------------------------------------------------

export type NumberLineLayout = {
  viewBox: { width: number; height: number };
  axis: { x1: number; x2: number; y: number };
  arrowPaths: string[];
  ticks: { key: string; x: number; y1: number; y2: number; labelText: string | null; labelY: number }[];
  highlights: { key: string; x1: number; x2: number; y: number }[];
  highlightCaps: { key: string; x: number; y1: number; y2: number }[];
  points: { key: string; x: number; y: number; marker: "closed" | "open" }[];
  labels: FigureLabel[];
  issues: string[];
};

export function numberLineTickValues(diagram: NumberLineQuestionDiagram) {
  const [min, max] = diagram.range;
  const interval = diagram.tickInterval ?? 1;
  if (!(interval > 0) || max <= min) return [];

  const count = Math.round((max - min) / interval);
  if (!Number.isFinite(count) || count < 1 || count > 200) return [];

  return Array.from({ length: count + 1 }, (_, index) => min + index * interval);
}

export function buildNumberLineLayout(diagram: NumberLineQuestionDiagram, textFor: FigureTextResolver): NumberLineLayout {
  const viewBox = { width: 280, height: 96 };
  const axisY = 56;
  const issues: string[] = [];
  const [min, max] = diagram.range;
  const span = max - min || 1;
  const xFor = (value: number) => 20 + ((value - min) / span) * 240;
  const plotRect: SvgRect = { left: 2, top: 2, right: viewBox.width - 2, bottom: viewBox.height - 2 };
  const axis = { x1: 12, x2: 268, y: axisY };
  const arrowPaths = [
    `M ${axis.x1 + 7} ${axisY - 4.5} L ${axis.x1} ${axisY} L ${axis.x1 + 7} ${axisY + 4.5}`,
    `M ${axis.x2 - 7} ${axisY - 4.5} L ${axis.x2} ${axisY} L ${axis.x2 - 7} ${axisY + 4.5}`
  ];

  const tickValues = numberLineTickValues(diagram);
  if (!tickValues.length) issues.push("number-line: no usable ticks");
  const labelAllTicks = tickValues.length <= 9;
  const integerTickValues = tickValues.filter((value) => Math.abs(value - Math.round(value)) < 0.000001);
  const labeledValues = new Set(
    (labelAllTicks ? tickValues : integerTickValues.length >= 2 ? integerTickValues : [min, max]).map((value) =>
      formatNumber(value, 2)
    )
  );

  const plottedSamples: SvgPoint[] = collisionSamplesForSegment({ x: axis.x1, y: axisY }, { x: axis.x2, y: axisY });
  const placedLabelRects: SvgRect[] = [];
  const labels: FigureLabel[] = [];

  const ticks = tickValues.map((value, index) => {
    const x = xFor(value);
    const labelText = labeledValues.has(formatNumber(value, 2)) ? formatNumber(value, 2) : null;
    plottedSamples.push({ x, y: axisY - 6 }, { x, y: axisY }, { x, y: axisY + 6 });
    if (labelText) placedLabelRects.push(labelRectFor(labelText, { x, y: axisY + 18 }));

    return {
      key: `tick-${index}`,
      x,
      y1: axisY - 6,
      y2: axisY + 6,
      labelText,
      labelY: axisY + 22
    };
  });

  const highlights: NumberLineLayout["highlights"] = [];
  const highlightCaps: NumberLineLayout["highlightCaps"] = [];

  (diagram.highlights ?? []).forEach((highlight, index) => {
    const x1 = xFor(highlight.from);
    const x2 = xFor(highlight.to);
    const y = axisY - 20;
    highlights.push({ key: `highlight-${index}`, x1, x2, y });
    highlightCaps.push(
      { key: `highlight-cap-${index}-a`, x: x1, y1: y - 4, y2: y + 4 },
      { key: `highlight-cap-${index}-b`, x: x2, y1: y - 4, y2: y + 4 }
    );
    plottedSamples.push(...collisionSamplesForSegment({ x: x1, y }, { x: x2, y }));

    if (highlight.label) {
      const text = textFor(highlight.label);
      const placement = chooseLabelPlacement({
        label: text,
        anchor: { x: (x1 + x2) / 2, y: y - 2 },
        plotRect,
        plottedSamples,
        placedLabelRects
      });
      placedLabelRects.push(placement.rect);
      if (!placement.clean) issues.push(`label-collision: ${text}`);
      labels.push({
        key: `highlight-label-${index}`,
        x: placement.x,
        y: placement.y,
        text,
        variant: "measure",
        clean: placement.clean
      });
    }
  });

  const points = (diagram.points ?? []).map((point, index) => {
    const x = xFor(point.value);
    return {
      key: `point-${index}`,
      x,
      y: axisY,
      marker: point.marker ?? ("closed" as const)
    };
  });

  (diagram.points ?? []).forEach((point, index) => {
    if (!point.label) return;
    const anchor = { x: xFor(point.value), y: axisY };
    const placement = chooseLabelPlacement({
      label: point.label,
      anchor,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);
    if (!placement.clean) issues.push(`label-collision: point ${point.label}`);
    labels.push({
      key: `point-label-${index}`,
      x: placement.x,
      y: placement.y,
      text: point.label,
      variant: "point",
      clean: placement.clean
    });
  });

  return {
    viewBox,
    axis,
    arrowPaths,
    ticks,
    highlights,
    highlightCaps,
    points,
    labels,
    issues
  };
}

// --- Solid figure -----------------------------------------------------------

export type SolidFigureLayout = {
  viewBox: { width: number; height: number };
  strokes: { key: string; x1: number; y1: number; x2: number; y2: number; dashed: boolean; thin: boolean }[];
  paths: { key: string; d: string; dashed: boolean }[];
  circles: { key: string; cx: number; cy: number; r: number }[];
  centerDots: { key: string; x: number; y: number }[];
  labels: FigureLabel[];
  issues: string[];
};

const solidDepthFactor = 0.5 * Math.SQRT1_2;

function ellipseArcPath(cx: number, cy: number, rx: number, ry: number, half: "front" | "back") {
  const sweep = half === "front" ? 0 : 1;
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${sweep} ${cx + rx} ${cy}`;
}

function ellipseSamples(cx: number, cy: number, rx: number, ry: number) {
  const sampleCount = 40;
  return Array.from({ length: sampleCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / sampleCount;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
}

export function solidFigureDimensions(diagram: SolidFigureQuestionDiagram) {
  if (diagram.shape === "cuboid") {
    return { width: diagram.width ?? 0, depth: diagram.depth ?? 0, height: diagram.height ?? 0, radius: 0 };
  }
  if (diagram.shape === "cube") {
    const size = diagram.size ?? 0;
    return { width: size, depth: size, height: size, radius: 0 };
  }
  if (diagram.shape === "sphere") {
    return { width: 0, depth: 0, height: 0, radius: diagram.radius ?? 0 };
  }
  return { width: 0, depth: 0, height: diagram.height ?? 0, radius: diagram.radius ?? 0 };
}

export function buildSolidFigureLayout(diagram: SolidFigureQuestionDiagram, textFor: FigureTextResolver): SolidFigureLayout {
  const viewBox = { width: 280, height: 210 };
  const marginX = 52;
  const marginY = 34;
  const issues: string[] = [];
  const strokes: SolidFigureLayout["strokes"] = [];
  const paths: SolidFigureLayout["paths"] = [];
  const circles: SolidFigureLayout["circles"] = [];
  const centerDots: SolidFigureLayout["centerDots"] = [];
  const labels: FigureLabel[] = [];
  const plottedSamples: SvgPoint[] = [];
  const placedLabelRects: SvgRect[] = [];
  const plotRect: SvgRect = { left: 2, top: 2, right: viewBox.width - 2, bottom: viewBox.height - 2 };
  const dimensions = solidFigureDimensions(diagram);

  type PendingLabel = { key: string; text: LocalizedText; anchor: SvgPoint };
  const pendingLabels: PendingLabel[] = [];

  const addStroke = (key: string, from: SvgPoint, to: SvgPoint, dashed = false, thin = false) => {
    strokes.push({ key, x1: from.x, y1: from.y, x2: to.x, y2: to.y, dashed, thin });
    plottedSamples.push(...collisionSamplesForSegment(from, to));
  };

  if (diagram.shape === "cuboid" || diagram.shape === "cube") {
    const { width, depth, height } = dimensions;
    if (width <= 0 || depth <= 0 || height <= 0) {
      issues.push("solid-figure: missing cuboid dimensions");
      return { viewBox, strokes, paths, circles, centerDots, labels, issues };
    }

    const projectedWidth = width + depth * solidDepthFactor;
    const projectedHeight = height + depth * solidDepthFactor;
    const scale = Math.min((viewBox.width - 2 * marginX) / projectedWidth, (viewBox.height - 2 * marginY) / projectedHeight);
    const left = (viewBox.width - projectedWidth * scale) / 2;
    const bottom = viewBox.height - (viewBox.height - projectedHeight * scale) / 2;
    const project = (mx: number, my: number, mz: number): SvgPoint => ({
      x: left + (mx + mz * solidDepthFactor) * scale,
      y: bottom - (my + mz * solidDepthFactor) * scale
    });

    const frontBottomLeft = project(0, 0, 0);
    const frontBottomRight = project(width, 0, 0);
    const frontTopRight = project(width, height, 0);
    const frontTopLeft = project(0, height, 0);
    const backBottomLeft = project(0, 0, depth);
    const backBottomRight = project(width, 0, depth);
    const backTopRight = project(width, height, depth);
    const backTopLeft = project(0, height, depth);

    addStroke("front-bottom", frontBottomLeft, frontBottomRight);
    addStroke("front-right", frontBottomRight, frontTopRight);
    addStroke("front-top", frontTopRight, frontTopLeft);
    addStroke("front-left", frontTopLeft, frontBottomLeft);
    addStroke("top-left", frontTopLeft, backTopLeft);
    addStroke("top-back", backTopLeft, backTopRight);
    addStroke("top-right", frontTopRight, backTopRight);
    addStroke("right-bottom", frontBottomRight, backBottomRight);
    addStroke("right-back", backBottomRight, backTopRight);
    addStroke("hidden-left", frontBottomLeft, backBottomLeft, true);
    addStroke("hidden-back-bottom", backBottomLeft, backBottomRight, true);
    addStroke("hidden-back-left", backBottomLeft, backTopLeft, true);

    const dimensionLabels = diagram.labels ?? {};
    if (dimensionLabels.width) {
      pendingLabels.push({
        key: "label-width",
        text: dimensionLabels.width,
        anchor: {
          x: (frontBottomLeft.x + frontBottomRight.x) / 2,
          y: frontBottomLeft.y + 14
        }
      });
    }
    if (dimensionLabels.height) {
      pendingLabels.push({
        key: "label-height",
        text: dimensionLabels.height,
        anchor: {
          x: frontBottomLeft.x - 16,
          y: (frontBottomLeft.y + frontTopLeft.y) / 2
        }
      });
    }
    if (dimensionLabels.depth) {
      pendingLabels.push({
        key: "label-depth",
        text: dimensionLabels.depth,
        anchor: {
          x: (frontBottomRight.x + backBottomRight.x) / 2 + 14,
          y: (frontBottomRight.y + backBottomRight.y) / 2 + 6
        }
      });
    }
  } else if (diagram.shape === "cylinder" || diagram.shape === "cone") {
    const { radius, height } = dimensions;
    if (radius <= 0 || height <= 0) {
      issues.push("solid-figure: missing radius or height");
      return { viewBox, strokes, paths, circles, centerDots, labels, issues };
    }

    const ellipseRatio = 0.32;
    const projectedWidth = radius * 2;
    const projectedHeight = height + radius * ellipseRatio * 2;
    const scale = Math.min((viewBox.width - 2 * marginX) / projectedWidth, (viewBox.height - 2 * marginY) / projectedHeight);
    const rx = radius * scale;
    const ry = rx * ellipseRatio;
    const cx = viewBox.width / 2;
    const bottomY = viewBox.height - marginY - ry;
    const topY = bottomY - height * scale;

    paths.push({ key: "base-front", d: ellipseArcPath(cx, bottomY, rx, ry, "front"), dashed: false });
    paths.push({ key: "base-back", d: ellipseArcPath(cx, bottomY, rx, ry, "back"), dashed: true });
    plottedSamples.push(...ellipseSamples(cx, bottomY, rx, ry));

    if (diagram.shape === "cylinder") {
      paths.push({ key: "top-front", d: ellipseArcPath(cx, topY, rx, ry, "front"), dashed: false });
      paths.push({ key: "top-back", d: ellipseArcPath(cx, topY, rx, ry, "back"), dashed: false });
      plottedSamples.push(...ellipseSamples(cx, topY, rx, ry));
      addStroke("side-left", { x: cx - rx, y: topY }, { x: cx - rx, y: bottomY });
      addStroke("side-right", { x: cx + rx, y: topY }, { x: cx + rx, y: bottomY });

      if (diagram.labels?.radius) {
        addStroke("radius-line", { x: cx, y: topY }, { x: cx + rx, y: topY }, false, true);
        centerDots.push({ key: "top-center", x: cx, y: topY });
        pendingLabels.push({
          key: "label-radius",
          text: diagram.labels.radius,
          anchor: { x: cx + rx / 2, y: topY - 12 }
        });
      }
      if (diagram.labels?.height) {
        pendingLabels.push({
          key: "label-height",
          text: diagram.labels.height,
          anchor: { x: cx + rx + 16, y: (topY + bottomY) / 2 }
        });
      }
    } else {
      const apex = { x: cx, y: topY };
      addStroke("slant-left", apex, { x: cx - rx, y: bottomY });
      addStroke("slant-right", apex, { x: cx + rx, y: bottomY });

      if (diagram.labels?.height) {
        addStroke("height-line", apex, { x: cx, y: bottomY }, true, true);
        const dimensionX = cx + rx + 12;
        addStroke("height-dimension", { x: dimensionX, y: topY }, { x: dimensionX, y: bottomY }, false, true);
        addStroke("height-dimension-top", { x: dimensionX - 4, y: topY }, { x: dimensionX + 4, y: topY }, false, true);
        addStroke("height-dimension-bottom", { x: dimensionX - 4, y: bottomY }, { x: dimensionX + 4, y: bottomY }, false, true);
        pendingLabels.push({
          key: "label-height",
          text: diagram.labels.height,
          anchor: { x: dimensionX + 14, y: (topY + bottomY) / 2 }
        });
      }
      if (diagram.labels?.radius) {
        addStroke("radius-line", { x: cx, y: bottomY }, { x: cx + rx, y: bottomY }, false, true);
        centerDots.push({ key: "base-center", x: cx, y: bottomY });
        pendingLabels.push({
          key: "label-radius",
          text: diagram.labels.radius,
          anchor: { x: cx + rx / 2, y: bottomY + 14 }
        });
      }
    }
  } else {
    const { radius } = dimensions;
    if (radius <= 0) {
      issues.push("solid-figure: missing radius");
      return { viewBox, strokes, paths, circles, centerDots, labels, issues };
    }

    const scale = Math.min((viewBox.width - 2 * marginX) / (radius * 2), (viewBox.height - 2 * marginY) / (radius * 2.4));
    const r = radius * scale;
    const cx = viewBox.width / 2;
    const cy = viewBox.height / 2;
    const equatorRy = r * 0.3;

    circles.push({ key: "sphere", cx, cy, r });
    plottedSamples.push(...ellipseSamples(cx, cy, r, r));
    paths.push({ key: "equator-front", d: ellipseArcPath(cx, cy, r, equatorRy, "front"), dashed: false });
    paths.push({ key: "equator-back", d: ellipseArcPath(cx, cy, r, equatorRy, "back"), dashed: true });
    plottedSamples.push(...ellipseSamples(cx, cy, r, equatorRy));

    if (diagram.labels?.radius) {
      const angle = -Math.PI / 5;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const edge = { x: cx + r * direction.x, y: cy + r * direction.y };
      addStroke("radius-line", { x: cx, y: cy }, edge, false, true);
      centerDots.push({ key: "sphere-center", x: cx, y: cy });
      plottedSamples.push({ x: cx, y: cy });
      pendingLabels.push({
        key: "label-radius",
        text: diagram.labels.radius,
        anchor: { x: cx + (r + 16) * direction.x, y: cy + (r + 16) * direction.y }
      });
    }
  }

  pendingLabels.forEach((pending) => {
    const text = textFor(pending.text);
    const placement = chooseLabelPlacement({
      label: text,
      anchor: pending.anchor,
      plotRect,
      plottedSamples,
      placedLabelRects
    });
    placedLabelRects.push(placement.rect);
    if (!placement.clean) issues.push(`label-collision: ${text}`);
    labels.push({
      key: pending.key,
      x: placement.x,
      y: placement.y,
      text,
      variant: "measure",
      clean: placement.clean
    });
  });

  return { viewBox, strokes, paths, circles, centerDots, labels, issues };
}

// --- Alt text ---------------------------------------------------------------

const solidShapeNames: Record<SolidFigureShape, { en: string; zh: string; zhHans: string }> = {
  cuboid: { en: "Cuboid", zh: "長方體", zhHans: "长方体" },
  cube: { en: "Cube", zh: "正方體", zhHans: "正方体" },
  cylinder: { en: "Cylinder", zh: "圓柱體", zhHans: "圆柱体" },
  cone: { en: "Cone", zh: "圓錐體", zhHans: "圆锥体" },
  sphere: { en: "Sphere", zh: "球體", zhHans: "球体" }
};

export function questionDiagramAltText(diagram: QuestionDiagram): LocalizedText {
  if (diagram.kind === "coordinate-grid") {
    const pointLabels = (diagram.points ?? []).map((point) => point.label).filter(Boolean);
    const suffixEn = pointLabels.length ? ` with points ${pointLabels.join(", ")}` : "";
    const suffixZh = pointLabels.length ? `，標示點 ${pointLabels.join("、")}` : "";
    const suffixZhHans = pointLabels.length ? `，标示点 ${pointLabels.join("、")}` : "";
    return {
      en: `Coordinate grid diagram${suffixEn}.`,
      zh: `座標網格圖${suffixZh}。`,
      zhHans: `坐标网格图${suffixZhHans}。`
    };
  }

  if (diagram.kind === "plane-figure") {
    const pointLabels = diagram.points.map((point) => point.label).filter((label): label is string => Boolean(label));
    const angleTexts = (diagram.angleMarks ?? [])
      .map((mark) => mark.label)
      .filter((label): label is LocalizedText => Boolean(label));
    const measureTexts = (diagram.segments ?? [])
      .map((segment) => segment.label)
      .filter((label): label is LocalizedText => Boolean(label));
    const pointsEn = pointLabels.length ? ` with points ${pointLabels.join(", ")}` : "";
    const pointsZh = pointLabels.length ? `，標示點 ${pointLabels.join("、")}` : "";
    const pointsZhHans = pointLabels.length ? `，标示点 ${pointLabels.join("、")}` : "";
    const marksEn = [...angleTexts, ...measureTexts].map((label) => label.en).filter(Boolean).join(", ");
    const marksZh = [...angleTexts, ...measureTexts].map((label) => label.zh).filter(Boolean).join("、");
    const marksZhHans = [...angleTexts, ...measureTexts].map((label) => label.zhHans ?? label.zh).filter(Boolean).join("、");
    return {
      en: `Plane figure${pointsEn}.${marksEn ? ` Marked: ${marksEn}.` : ""}`,
      zh: `平面圖形${pointsZh}。${marksZh ? `標註：${marksZh}。` : ""}`,
      zhHans: `平面图形${pointsZhHans}。${marksZhHans ? `标注：${marksZhHans}。` : ""}`
    };
  }

  if (diagram.kind === "number-line") {
    const [min, max] = diagram.range;
    const pointTexts = (diagram.points ?? [])
      .filter((point) => point.label)
      .map((point) => `${point.label} = ${formatNumber(point.value, 4)}`);
    const suffixEn = pointTexts.length ? ` with ${pointTexts.join(", ")}` : "";
    const suffixZh = pointTexts.length ? `，其中 ${pointTexts.join("、")}` : "";
    return {
      en: `Number line from ${formatNumber(min, 4)} to ${formatNumber(max, 4)}${suffixEn}.`,
      zh: `數線由 ${formatNumber(min, 4)} 至 ${formatNumber(max, 4)}${suffixZh}。`,
      zhHans: `数轴从 ${formatNumber(min, 4)} 到 ${formatNumber(max, 4)}${suffixZh}。`
    };
  }

  const shapeName = solidShapeNames[diagram.shape];
  const labelValues = diagram.labels
    ? [diagram.labels.width, diagram.labels.depth, diagram.labels.height, diagram.labels.radius].filter(
        (label): label is LocalizedText => Boolean(label)
      )
    : [];
  const detailEn = labelValues.map((label) => label.en).filter(Boolean).join(", ");
  const detailZh = labelValues.map((label) => label.zh).filter(Boolean).join("、");
  const detailZhHans = labelValues.map((label) => label.zhHans ?? label.zh).filter(Boolean).join("、");
  return {
    en: `${shapeName.en}${detailEn ? ` (${detailEn})` : ""}.`,
    zh: `${shapeName.zh}${detailZh ? `（${detailZh}）` : ""}。`,
    zhHans: `${shapeName.zhHans}${detailZhHans ? `（${detailZhHans}）` : ""}。`
  };
}

// --- Normalization ----------------------------------------------------------

const maxAbsoluteCoordinate = 1000;
const maxPlaneFigurePoints = 16;
const maxPlaneFigureSegments = 24;
const maxPlaneFigurePolygons = 6;
const maxPlaneFigurePolygonVertices = 12;
const maxPlaneFigureCircles = 4;
const maxPlaneFigureAngleMarks = 8;
const maxNumberLinePoints = 12;
const maxNumberLineHighlights = 6;
const maxNumberLineTicks = 61;
const maxGridPoints = 12;
const maxGridLines = 8;
const maxGridLinePoints = 32;
const maxPlainLabelLength = 24;
const maxLocalizedLabelLength = 60;
const maxPointIdLength = 16;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readBoundedNumber(value: unknown, min: number, max: number) {
  if (!isFiniteNumber(value) || value < min || value > max) return null;
  return value;
}

function readPlainLabel(value: unknown, maxLength = maxPlainLabelLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function readLocalizedLabel(value: unknown): LocalizedText | null {
  if (typeof value === "string") {
    const text = readPlainLabel(value, maxLocalizedLabelLength);
    return text ? { en: text, zh: text, zhHans: text } : null;
  }

  if (!isRecord(value) || !hasOnlyKeys(value, ["en", "zh", "zhHans"])) return null;
  const en = typeof value.en === "string" ? value.en.trim() : "";
  const zh = typeof value.zh === "string" ? value.zh.trim() : "";
  const zhHans = typeof value.zhHans === "string" ? value.zhHans.trim() : "";
  const resolvedEn = en || zh || zhHans;
  const resolvedZh = zh || zhHans || resolvedEn;
  if (!resolvedEn || resolvedEn.length > maxLocalizedLabelLength || resolvedZh.length > maxLocalizedLabelLength) return null;
  const resolvedZhHans = zhHans || resolvedZh;
  if (resolvedZhHans.length > maxLocalizedLabelLength) return null;
  return { en: resolvedEn, zh: resolvedZh, zhHans: resolvedZhHans };
}

function readRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const min = readBoundedNumber(value[0], -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
  const max = readBoundedNumber(value[1], -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
  if (min === null || max === null || max <= min) return null;
  return [min, max];
}

function normalizeCoordinateGrid(value: Record<string, unknown>): CoordinateGridQuestionDiagram | undefined {
  if (!hasOnlyKeys(value, ["kind", "xRange", "yRange", "points", "lines"])) return undefined;
  const xRange = readRange(value.xRange);
  const yRange = readRange(value.yRange);
  if (!xRange || !yRange) return undefined;

  let points: CoordinateGridQuestionDiagram["points"];
  if (typeof value.points !== "undefined") {
    if (!Array.isArray(value.points) || value.points.length > maxGridPoints) return undefined;
    points = [];
    for (const entry of value.points) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["label", "x", "y"])) return undefined;
      const label = readPlainLabel(entry.label);
      const x = readBoundedNumber(entry.x, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
      const y = readBoundedNumber(entry.y, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
      if (!label || x === null || y === null) return undefined;
      points.push({ label, x, y });
    }
  }

  let lines: CoordinateGridQuestionDiagram["lines"];
  if (typeof value.lines !== "undefined") {
    if (!Array.isArray(value.lines) || value.lines.length > maxGridLines) return undefined;
    lines = [];
    for (const entry of value.lines) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["label", "points"])) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readPlainLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      if (!Array.isArray(entry.points) || entry.points.length < 2 || entry.points.length > maxGridLinePoints) return undefined;
      const linePoints: { x: number; y: number }[] = [];
      for (const pointEntry of entry.points) {
        if (!isRecord(pointEntry) || !hasOnlyKeys(pointEntry, ["x", "y"])) return undefined;
        const x = readBoundedNumber(pointEntry.x, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
        const y = readBoundedNumber(pointEntry.y, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
        if (x === null || y === null) return undefined;
        linePoints.push({ x, y });
      }
      lines.push(label ? { label, points: linePoints } : { points: linePoints });
    }
  }

  return { kind: "coordinate-grid", xRange, yRange, ...(points ? { points } : {}), ...(lines ? { lines } : {}) };
}

function normalizePlaneFigure(value: Record<string, unknown>): PlaneFigureQuestionDiagram | undefined {
  if (!hasOnlyKeys(value, ["kind", "points", "segments", "polygons", "circles", "angleMarks"])) return undefined;
  if (!Array.isArray(value.points) || value.points.length < 1 || value.points.length > maxPlaneFigurePoints) return undefined;

  const points: PlaneFigurePoint[] = [];
  const seenIds = new Set<string>();
  for (const entry of value.points) {
    if (!isRecord(entry) || !hasOnlyKeys(entry, ["id", "x", "y", "label"])) return undefined;
    const id = readPlainLabel(entry.id, maxPointIdLength);
    const x = readBoundedNumber(entry.x, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
    const y = readBoundedNumber(entry.y, -maxAbsoluteCoordinate, maxAbsoluteCoordinate);
    if (!id || seenIds.has(id) || x === null || y === null) return undefined;
    const label = typeof entry.label === "undefined" ? undefined : readPlainLabel(entry.label) ?? undefined;
    if (typeof entry.label !== "undefined" && !label) return undefined;
    seenIds.add(id);
    points.push({ id, x, y, ...(label ? { label } : {}) });
  }

  let segments: PlaneFigureSegment[] | undefined;
  if (typeof value.segments !== "undefined") {
    if (!Array.isArray(value.segments) || value.segments.length > maxPlaneFigureSegments) return undefined;
    segments = [];
    for (const entry of value.segments) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["from", "to", "style", "tickMarks", "parallelMarks", "label"])) return undefined;
      const from = readPlainLabel(entry.from, maxPointIdLength);
      const to = readPlainLabel(entry.to, maxPointIdLength);
      if (!from || !to || from === to || !seenIds.has(from) || !seenIds.has(to)) return undefined;
      if (typeof entry.style !== "undefined" && entry.style !== "solid" && entry.style !== "dashed") return undefined;
      const tickMarks = typeof entry.tickMarks === "undefined" ? undefined : readBoundedNumber(entry.tickMarks, 1, 3);
      if (typeof entry.tickMarks !== "undefined" && (tickMarks === null || !Number.isInteger(tickMarks))) return undefined;
      const parallelMarks = typeof entry.parallelMarks === "undefined" ? undefined : readBoundedNumber(entry.parallelMarks, 1, 2);
      if (typeof entry.parallelMarks !== "undefined" && (parallelMarks === null || !Number.isInteger(parallelMarks))) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readLocalizedLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      segments.push({
        from,
        to,
        ...(entry.style ? { style: entry.style as "solid" | "dashed" } : {}),
        ...(tickMarks ? { tickMarks } : {}),
        ...(parallelMarks ? { parallelMarks } : {}),
        ...(label ? { label } : {})
      });
    }
  }

  let polygons: PlaneFigurePolygon[] | undefined;
  if (typeof value.polygons !== "undefined") {
    if (!Array.isArray(value.polygons) || value.polygons.length > maxPlaneFigurePolygons) return undefined;
    polygons = [];
    for (const entry of value.polygons) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["vertexIds", "shaded"])) return undefined;
      if (!Array.isArray(entry.vertexIds) || entry.vertexIds.length < 3 || entry.vertexIds.length > maxPlaneFigurePolygonVertices) return undefined;
      const vertexIds: string[] = [];
      for (const vertexEntry of entry.vertexIds) {
        const vertexId = readPlainLabel(vertexEntry, maxPointIdLength);
        if (!vertexId || !seenIds.has(vertexId)) return undefined;
        vertexIds.push(vertexId);
      }
      if (typeof entry.shaded !== "undefined" && typeof entry.shaded !== "boolean") return undefined;
      polygons.push({ vertexIds, ...(typeof entry.shaded === "boolean" ? { shaded: entry.shaded } : {}) });
    }
  }

  let circleList: PlaneFigureCircle[] | undefined;
  if (typeof value.circles !== "undefined") {
    if (!Array.isArray(value.circles) || value.circles.length > maxPlaneFigureCircles) return undefined;
    circleList = [];
    for (const entry of value.circles) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["centerId", "radius", "showCenter", "radiusToId", "label"])) return undefined;
      const centerId = readPlainLabel(entry.centerId, maxPointIdLength);
      const radius = readBoundedNumber(entry.radius, 0.000001, maxAbsoluteCoordinate);
      if (!centerId || !seenIds.has(centerId) || radius === null) return undefined;
      if (typeof entry.showCenter !== "undefined" && typeof entry.showCenter !== "boolean") return undefined;
      const radiusToId = typeof entry.radiusToId === "undefined" ? undefined : readPlainLabel(entry.radiusToId, maxPointIdLength) ?? undefined;
      if (typeof entry.radiusToId !== "undefined" && (!radiusToId || !seenIds.has(radiusToId))) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readLocalizedLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      circleList.push({
        centerId,
        radius,
        ...(typeof entry.showCenter === "boolean" ? { showCenter: entry.showCenter } : {}),
        ...(radiusToId ? { radiusToId } : {}),
        ...(label ? { label } : {})
      });
    }
  }

  let angleMarks: PlaneFigureAngleMark[] | undefined;
  if (typeof value.angleMarks !== "undefined") {
    if (!Array.isArray(value.angleMarks) || value.angleMarks.length > maxPlaneFigureAngleMarks) return undefined;
    angleMarks = [];
    for (const entry of value.angleMarks) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["vertexId", "fromId", "toId", "rightAngle", "arcs", "label"])) return undefined;
      const vertexId = readPlainLabel(entry.vertexId, maxPointIdLength);
      const fromId = readPlainLabel(entry.fromId, maxPointIdLength);
      const toId = readPlainLabel(entry.toId, maxPointIdLength);
      if (!vertexId || !fromId || !toId || !seenIds.has(vertexId) || !seenIds.has(fromId) || !seenIds.has(toId)) return undefined;
      if (vertexId === fromId || vertexId === toId) return undefined;
      if (typeof entry.rightAngle !== "undefined" && typeof entry.rightAngle !== "boolean") return undefined;
      const arcs = typeof entry.arcs === "undefined" ? undefined : readBoundedNumber(entry.arcs, 1, 3);
      if (typeof entry.arcs !== "undefined" && (arcs === null || !Number.isInteger(arcs))) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readLocalizedLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      angleMarks.push({
        vertexId,
        fromId,
        toId,
        ...(typeof entry.rightAngle === "boolean" ? { rightAngle: entry.rightAngle } : {}),
        ...(arcs ? { arcs } : {}),
        ...(label ? { label } : {})
      });
    }
  }

  return {
    kind: "plane-figure",
    points,
    ...(segments ? { segments } : {}),
    ...(polygons ? { polygons } : {}),
    ...(circleList ? { circles: circleList } : {}),
    ...(angleMarks ? { angleMarks } : {})
  };
}

function normalizeNumberLine(value: Record<string, unknown>): NumberLineQuestionDiagram | undefined {
  if (!hasOnlyKeys(value, ["kind", "range", "tickInterval", "points", "highlights"])) return undefined;
  const range = readRange(value.range);
  if (!range) return undefined;
  const [min, max] = range;

  let tickInterval: number | undefined;
  if (typeof value.tickInterval !== "undefined") {
    const interval = readBoundedNumber(value.tickInterval, 0.000001, maxAbsoluteCoordinate);
    if (interval === null) return undefined;
    tickInterval = interval;
  }
  const effectiveInterval = tickInterval ?? 1;
  const tickCount = Math.round((max - min) / effectiveInterval);
  if (!Number.isFinite(tickCount) || tickCount < 1 || tickCount + 1 > maxNumberLineTicks) return undefined;

  let points: NumberLinePoint[] | undefined;
  if (typeof value.points !== "undefined") {
    if (!Array.isArray(value.points) || value.points.length > maxNumberLinePoints) return undefined;
    points = [];
    for (const entry of value.points) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["value", "label", "marker"])) return undefined;
      const pointValue = readBoundedNumber(entry.value, min, max);
      if (pointValue === null) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readPlainLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      if (typeof entry.marker !== "undefined" && entry.marker !== "closed" && entry.marker !== "open") return undefined;
      points.push({
        value: pointValue,
        ...(label ? { label } : {}),
        ...(entry.marker ? { marker: entry.marker as "closed" | "open" } : {})
      });
    }
  }

  let highlights: NumberLineHighlight[] | undefined;
  if (typeof value.highlights !== "undefined") {
    if (!Array.isArray(value.highlights) || value.highlights.length > maxNumberLineHighlights) return undefined;
    highlights = [];
    for (const entry of value.highlights) {
      if (!isRecord(entry) || !hasOnlyKeys(entry, ["from", "to", "label"])) return undefined;
      const from = readBoundedNumber(entry.from, min, max);
      const to = readBoundedNumber(entry.to, min, max);
      if (from === null || to === null || to <= from) return undefined;
      const label = typeof entry.label === "undefined" ? undefined : readLocalizedLabel(entry.label) ?? undefined;
      if (typeof entry.label !== "undefined" && !label) return undefined;
      highlights.push({ from, to, ...(label ? { label } : {}) });
    }
  }

  return {
    kind: "number-line",
    range,
    ...(typeof tickInterval === "number" ? { tickInterval } : {}),
    ...(points ? { points } : {}),
    ...(highlights ? { highlights } : {})
  };
}

function normalizeSolidFigure(value: Record<string, unknown>): SolidFigureQuestionDiagram | undefined {
  if (!hasOnlyKeys(value, ["kind", "shape", "width", "depth", "height", "radius", "size", "labels"])) return undefined;
  const shape = value.shape;
  if (shape !== "cuboid" && shape !== "cube" && shape !== "cylinder" && shape !== "cone" && shape !== "sphere") return undefined;

  const readDimension = (dimension: unknown) => {
    if (typeof dimension === "undefined") return undefined;
    const parsed = readBoundedNumber(dimension, 0.000001, maxAbsoluteCoordinate);
    return parsed === null ? null : parsed;
  };

  const width = readDimension(value.width);
  const depth = readDimension(value.depth);
  const height = readDimension(value.height);
  const radius = readDimension(value.radius);
  const size = readDimension(value.size);
  if (width === null || depth === null || height === null || radius === null || size === null) return undefined;

  if (shape === "cuboid" && (!width || !depth || !height)) return undefined;
  if (shape === "cube" && !size) return undefined;
  if ((shape === "cylinder" || shape === "cone") && (!radius || !height)) return undefined;
  if (shape === "sphere" && !radius) return undefined;

  let labels: SolidFigureDimensionLabels | undefined;
  if (typeof value.labels !== "undefined") {
    if (!isRecord(value.labels) || !hasOnlyKeys(value.labels, ["width", "depth", "height", "radius"])) return undefined;
    labels = {};
    for (const key of ["width", "depth", "height", "radius"] as const) {
      const rawLabel = value.labels[key];
      if (typeof rawLabel === "undefined") continue;
      const label = readLocalizedLabel(rawLabel);
      if (!label) return undefined;
      labels[key] = label;
    }
    if (!Object.keys(labels).length) labels = undefined;
  }

  return {
    kind: "solid-figure",
    shape,
    ...(typeof width === "number" ? { width } : {}),
    ...(typeof depth === "number" ? { depth } : {}),
    ...(typeof height === "number" ? { height } : {}),
    ...(typeof radius === "number" ? { radius } : {}),
    ...(typeof size === "number" ? { size } : {}),
    ...(labels ? { labels } : {})
  };
}

export function normalizeQuestionDiagram(value: unknown): QuestionDiagram | undefined {
  if (!isRecord(value)) return undefined;

  if (value.kind === "coordinate-grid") return normalizeCoordinateGrid(value);
  if (value.kind === "plane-figure") return normalizePlaneFigure(value);
  if (value.kind === "number-line") return normalizeNumberLine(value);
  if (value.kind === "solid-figure") return normalizeSolidFigure(value);
  return undefined;
}

// --- Validation -------------------------------------------------------------

const rightAngleToleranceDegrees = 2;
const degenerateAngleToleranceDegrees = 1;

function planeFigureSemanticIssues(diagram: PlaneFigureQuestionDiagram) {
  const issues: string[] = [];
  const pointById = new Map(diagram.points.map((point) => [point.id, point]));

  (diagram.segments ?? []).forEach((segment, index) => {
    const from = pointById.get(segment.from);
    const to = pointById.get(segment.to);
    if (!from || !to) {
      issues.push(`segment-${index}: unknown endpoint`);
      return;
    }
    if (distance(from, to) < 0.000001) issues.push(`segment-${index}: zero length`);
  });

  (diagram.polygons ?? []).forEach((polygon, index) => {
    const resolved = polygon.vertexIds.map((id) => pointById.get(id));
    if (resolved.some((point) => !point)) {
      issues.push(`polygon-${index}: unknown vertex`);
      return;
    }
    for (let vertex = 0; vertex < polygon.vertexIds.length; vertex += 1) {
      const next = (vertex + 1) % polygon.vertexIds.length;
      if (polygon.vertexIds[vertex] === polygon.vertexIds[next]) {
        issues.push(`polygon-${index}: repeated consecutive vertex`);
        break;
      }
    }
  });

  (diagram.circles ?? []).forEach((circle, index) => {
    const center = pointById.get(circle.centerId);
    if (!center) {
      issues.push(`circle-${index}: unknown center`);
      return;
    }
    if (circle.radiusToId) {
      const edge = pointById.get(circle.radiusToId);
      if (!edge) {
        issues.push(`circle-${index}: unknown radius point`);
        return;
      }
      const measured = distance(center, edge);
      if (Math.abs(measured - circle.radius) > Math.max(0.02 * circle.radius, 0.000001)) {
        issues.push(`circle-${index}: radius point is not on the circle`);
      }
    }
  });

  (diagram.angleMarks ?? []).forEach((mark, index) => {
    const vertex = pointById.get(mark.vertexId);
    const from = pointById.get(mark.fromId);
    const to = pointById.get(mark.toId);
    if (!vertex || !from || !to) {
      issues.push(`angle-${index}: unknown point`);
      return;
    }
    if (distance(vertex, from) < 0.000001 || distance(vertex, to) < 0.000001) {
      issues.push(`angle-${index}: degenerate ray`);
      return;
    }
    const measured = angleAt(vertex, from, to);
    if (measured < degenerateAngleToleranceDegrees || measured > 180 - degenerateAngleToleranceDegrees) {
      issues.push(`angle-${index}: rays are collinear`);
    }
    if (mark.rightAngle && Math.abs(measured - 90) > rightAngleToleranceDegrees) {
      issues.push(`angle-${index}: right-angle mark but measured angle is ${formatNumber(measured, 1)}°`);
    }
  });

  return issues;
}

export function validateQuestionDiagram(diagram: QuestionDiagram): string[] {
  const issues: string[] = [];

  if (diagram.kind === "coordinate-grid") {
    const layout = buildCoordinateGridLayout(diagram);
    layout.labeledPoints.forEach((point) => {
      if (!point.placement.clean) issues.push(`label-collision: point ${point.label}`);
    });
    return issues;
  }

  const resolvers: FigureTextResolver[] = [
    (value) => resolveDiagramText(value, "en"),
    (value) => resolveDiagramText(value, "zh")
  ];

  if (diagram.kind === "plane-figure") {
    issues.push(...planeFigureSemanticIssues(diagram));
    if (issues.length) return issues;
    resolvers.forEach((textFor, index) => {
      const layout = buildPlaneFigureLayout(diagram, textFor);
      layout.issues.forEach((issue) => issues.push(index === 0 ? issue : `${issue} (zh)`));
    });
    return Array.from(new Set(issues));
  }

  if (diagram.kind === "number-line") {
    resolvers.forEach((textFor, index) => {
      const layout = buildNumberLineLayout(diagram, textFor);
      layout.issues.forEach((issue) => issues.push(index === 0 ? issue : `${issue} (zh)`));
    });
    return Array.from(new Set(issues));
  }

  resolvers.forEach((textFor, index) => {
    const layout = buildSolidFigureLayout(diagram, textFor);
    layout.issues.forEach((issue) => issues.push(index === 0 ? issue : `${issue} (zh)`));
  });
  return Array.from(new Set(issues));
}

// --- Derived facts (deterministic audit helpers) ----------------------------

export function planeFigurePointById(diagram: PlaneFigureQuestionDiagram, pointId: string) {
  return diagram.points.find((point) => point.id === pointId) ?? null;
}

export function planeFigureAngleDegrees(diagram: PlaneFigureQuestionDiagram, vertexId: string, fromId: string, toId: string) {
  const vertex = planeFigurePointById(diagram, vertexId);
  const from = planeFigurePointById(diagram, fromId);
  const to = planeFigurePointById(diagram, toId);
  if (!vertex || !from || !to) return null;
  if (distance(vertex, from) < 0.000001 || distance(vertex, to) < 0.000001) return null;
  return angleAt(vertex, from, to);
}

export function planeFigureSegmentLength(diagram: PlaneFigureQuestionDiagram, fromId: string, toId: string) {
  const from = planeFigurePointById(diagram, fromId);
  const to = planeFigurePointById(diagram, toId);
  if (!from || !to) return null;
  return distance(from, to);
}

export function numberLinePointValue(diagram: NumberLineQuestionDiagram, label: string) {
  const point = (diagram.points ?? []).find((entry) => entry.label === label);
  return point ? point.value : null;
}

export function solidFigureCuboidVolume(diagram: SolidFigureQuestionDiagram) {
  if (diagram.shape === "cuboid") {
    const { width, depth, height } = diagram;
    if (!width || !depth || !height) return null;
    return width * depth * height;
  }
  if (diagram.shape === "cube") {
    return diagram.size ? diagram.size ** 3 : null;
  }
  return null;
}

export function solidFigureUnitText(diagram: SolidFigureQuestionDiagram) {
  const labels = diagram.labels;
  if (!labels) return null;
  const candidates = [labels.width, labels.depth, labels.height, labels.radius];
  for (const label of candidates) {
    const match = label?.en.match(/([a-zA-Z]+)\s*$/);
    if (match) return match[1];
  }
  return null;
}
