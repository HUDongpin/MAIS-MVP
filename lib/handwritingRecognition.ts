export type HandwritingTool = "pen" | "eraser";

export type HandwritingPoint = {
  x: number;
  y: number;
};

export type HandwritingStroke = {
  tool?: HandwritingTool;
  points: HandwritingPoint[];
};

export type DrawingBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type HandwritingRecognitionProvider = "simpletex" | "mathpix" | "llm-vision" | "local" | "none";

export type HandwritingRecognitionAlternative = {
  text: string;
  latex?: string;
  confidence?: number | null;
  provider: HandwritingRecognitionProvider;
};

export type HandwritingRecognitionResult = {
  text: string;
  latex?: string;
  confidence: number | null;
  provider: HandwritingRecognitionProvider;
  alternatives: HandwritingRecognitionAlternative[];
  accepted: boolean;
  reason?: string;
};

export type MathpixStrokePayload = {
  strokes: {
    strokes: {
      x: number[][];
      y: number[][];
    };
  };
};

const recognizerSampleCount = 48;
const recognitionDistanceThreshold = 0.34;
const recognitionMarginThreshold = 0.025;
const relaxedGapThresholdScale = 0.055;
const relaxedGapThresholdMin = 12;
const relaxedGapThresholdMax = 32;
const maxStrokes = 60;
const maxPointsPerStroke = 600;
const localRecognitionAcceptanceConfidence = 0.7;
const localRecognitionReviewConfidence = 0.66;
const localRecognitionMaxConfidence = 0.92;

type DigitRecognitionCandidate = {
  digit: string;
  distance: number;
  margin: number;
  confidence: number;
};

type SegmentationCandidate = {
  groups: HandwritingStroke[][];
  digits: string[];
  score: number;
  confidence: number;
};

const digitTemplateDefinitions: Record<string, HandwritingPoint[][]> = {
  "0": [
    [
      { x: 50, y: 5 },
      { x: 82, y: 18 },
      { x: 94, y: 50 },
      { x: 82, y: 84 },
      { x: 50, y: 96 },
      { x: 18, y: 84 },
      { x: 6, y: 50 },
      { x: 18, y: 18 },
      { x: 50, y: 5 }
    ]
  ],
  "1": [
    [
      { x: 55, y: 8 },
      { x: 50, y: 35 },
      { x: 50, y: 95 }
    ],
    [
      { x: 38, y: 24 },
      { x: 55, y: 8 },
      { x: 55, y: 95 }
    ]
  ],
  "2": [
    [
      { x: 12, y: 18 },
      { x: 42, y: 5 },
      { x: 78, y: 16 },
      { x: 88, y: 38 },
      { x: 68, y: 58 },
      { x: 18, y: 90 },
      { x: 88, y: 92 }
    ],
    [
      { x: 14, y: 20 },
      { x: 78, y: 20 },
      { x: 86, y: 34 },
      { x: 22, y: 88 },
      { x: 86, y: 90 }
    ]
  ],
  "3": [
    [
      { x: 14, y: 16 },
      { x: 76, y: 12 },
      { x: 88, y: 36 },
      { x: 58, y: 50 },
      { x: 88, y: 66 },
      { x: 72, y: 90 },
      { x: 14, y: 84 }
    ],
    [
      { x: 10, y: 17 },
      { x: 48, y: 9 },
      { x: 86, y: 10 },
      { x: 88, y: 25 },
      { x: 68, y: 46 },
      { x: 46, y: 52 },
      { x: 74, y: 52 },
      { x: 92, y: 68 },
      { x: 88, y: 88 },
      { x: 60, y: 96 },
      { x: 16, y: 92 }
    ]
  ],
  "4": [
    [
      { x: 78, y: 8 },
      { x: 18, y: 62 },
      { x: 90, y: 62 },
      { x: 78, y: 8 },
      { x: 78, y: 94 }
    ],
    [
      { x: 72, y: 8 },
      { x: 72, y: 94 },
      { x: 18, y: 62 },
      { x: 90, y: 62 }
    ]
  ],
  "5": [
    [
      { x: 84, y: 12 },
      { x: 20, y: 14 },
      { x: 18, y: 48 },
      { x: 64, y: 48 },
      { x: 86, y: 62 },
      { x: 82, y: 86 },
      { x: 48, y: 96 },
      { x: 16, y: 88 }
    ],
    [
      { x: 84, y: 10 },
      { x: 25, y: 20 },
      { x: 16, y: 50 },
      { x: 56, y: 46 },
      { x: 86, y: 58 },
      { x: 86, y: 82 },
      { x: 54, y: 94 },
      { x: 18, y: 90 }
    ]
  ],
  "6": [
    [
      { x: 78, y: 10 },
      { x: 36, y: 30 },
      { x: 18, y: 66 },
      { x: 34, y: 92 },
      { x: 74, y: 88 },
      { x: 88, y: 62 },
      { x: 62, y: 48 },
      { x: 22, y: 56 }
    ]
  ],
  "7": [
    [
      { x: 12, y: 16 },
      { x: 88, y: 16 },
      { x: 50, y: 94 }
    ],
    [
      { x: 10, y: 16 },
      { x: 90, y: 16 },
      { x: 62, y: 44 },
      { x: 42, y: 94 }
    ]
  ],
  "8": [
    [
      { x: 50, y: 50 },
      { x: 24, y: 22 },
      { x: 50, y: 6 },
      { x: 78, y: 22 },
      { x: 50, y: 50 },
      { x: 20, y: 76 },
      { x: 50, y: 96 },
      { x: 82, y: 76 },
      { x: 50, y: 50 }
    ]
  ],
  "9": [
    [
      { x: 76, y: 46 },
      { x: 50, y: 58 },
      { x: 22, y: 44 },
      { x: 22, y: 18 },
      { x: 52, y: 6 },
      { x: 82, y: 22 },
      { x: 82, y: 56 },
      { x: 64, y: 86 },
      { x: 32, y: 96 }
    ]
  ]
};

const digitTemplates = Object.entries(digitTemplateDefinitions).flatMap(([digit, variants]) =>
  variants.map((points) => ({
    digit,
    points: normalizeRecognizerPoints(points)
  }))
);

export function sanitizeHandwritingStrokes(value: unknown): HandwritingStroke[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, maxStrokes)
    .map((stroke): HandwritingStroke | null => {
      if (!isRecord(stroke) || !Array.isArray(stroke.points)) return null;
      const tool = stroke.tool === "eraser" ? "eraser" : "pen";
      const points = stroke.points
        .slice(0, maxPointsPerStroke)
        .map((point): HandwritingPoint | null => {
          if (!isRecord(point) || typeof point.x !== "number" || typeof point.y !== "number") return null;
          if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
          return {
            x: roundCoordinate(point.x),
            y: roundCoordinate(point.y)
          };
        })
        .filter((point): point is HandwritingPoint => point !== null);

      return points.length ? { tool, points } : null;
    })
    .filter((stroke): stroke is HandwritingStroke => stroke !== null);
}

export function rescaleHandwritingStrokes(
  strokes: HandwritingStroke[],
  from: { width: number; height: number },
  to: { width: number; height: number }
): HandwritingStroke[] {
  if (
    !Number.isFinite(from.width) || from.width <= 0 ||
    !Number.isFinite(from.height) || from.height <= 0 ||
    !Number.isFinite(to.width) || to.width <= 0 ||
    !Number.isFinite(to.height) || to.height <= 0
  ) {
    return strokes;
  }

  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  if (scaleX === 1 && scaleY === 1) return strokes;

  return strokes.map((stroke) => ({
    ...stroke,
    points: stroke.points.map((point) => ({
      ...point,
      x: roundCoordinate(point.x * scaleX),
      y: roundCoordinate(point.y * scaleY)
    }))
  }));
}

export function buildMathpixStrokePayload(strokes: HandwritingStroke[]): MathpixStrokePayload {
  const penStrokes = strokes.filter((stroke) => (stroke.tool ?? "pen") === "pen" && stroke.points.length > 1);
  return {
    strokes: {
      strokes: {
        x: penStrokes.map((stroke) => stroke.points.map((point) => point.x)),
        y: penStrokes.map((stroke) => stroke.points.map((point) => point.y))
      }
    }
  };
}

export function recognizeLocalNumericDraft(strokes: HandwritingStroke[]): HandwritingRecognitionResult | null {
  const penStrokes = strokes.filter((stroke) => (stroke.tool ?? "pen") === "pen" && stroke.points.length > 1);
  if (!penStrokes.length) return null;

  const bestSegmentation = recognizeBestSegmentation(penStrokes);
  if (!bestSegmentation) return null;

  const text = bestSegmentation.digits.join("");
  const confidence = bestSegmentation.confidence;
  return {
    text,
    confidence,
    provider: "local",
    alternatives: [{ text, confidence, provider: "local" }],
    accepted: isConfidentHandwritingCandidate({ text, confidence }, localRecognitionAcceptanceConfidence)
  };
}

export function isConfidentHandwritingCandidate(
  candidate: { text: string; confidence: number | null } | null | undefined,
  confidenceThreshold = localRecognitionAcceptanceConfidence
) {
  return Boolean(candidate && candidate.text.trim() && candidate.confidence !== null && candidate.confidence >= confidenceThreshold);
}

const latexTextWrapperPattern = /\\(?:mathrm|mathbf|mathit|mathsf|mathtt)\{([^{}]*)\}/g;

function stripLatexTextWrappers(value: string) {
  let normalized = value;
  for (let index = 0; index < 6; index += 1) {
    const next = normalized.replace(latexTextWrapperPattern, "$1");
    if (next === normalized) return normalized;
    normalized = next;
  }
  return normalized;
}

export function normalizeHandwritingText(value: string) {
  const normalized = value
    .replace(/^\\\(/, "")
    .replace(/\\\)$/, "")
    .replace(/^\\\[/, "")
    .replace(/\\\]$/, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\left|\\right/g, "")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)")
    .replace(/\\(sin|cos|tan|log|ln)(?=[A-Za-z0-9({\s]|$)/g, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\^\{(?:\\(?:Lambda|wedge)|Л)\}(\d+)/g, "^$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\^\\(?:Lambda|wedge)(?=\d)/g, "^")
    .replace(/\^Л(?=\d)/g, "^")
    .replace(/\{([=+\-*/])\}/g, "$1")
    .replace(/\s+/g, "")
    .trim();
  return stripLatexTextWrappers(normalized)
    .replace(/\^\{(?:\\(?:Lambda|wedge)|Л)\}(\d+)/g, "^$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/\^\\(?:Lambda|wedge)(?=\d)/g, "^")
    .replace(/\^Л(?=\d)/g, "^")
    .replace(/\s+/g, "")
    .trim();
}

export function isEmptyHandwritingRecognitionText(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized === "[EMPTY]" || normalized === "[DOCIMG]";
}

function recognizeBestSegmentation(strokes: HandwritingStroke[]): SegmentationCandidate | null {
  return buildSegmentationCandidates(strokes)
    .map((groups): SegmentationCandidate | null => {
      const recognizedGroups = groups.map(recognizeDigitGroupCandidate);
      if (recognizedGroups.some((candidate) => candidate === null)) return null;

      const digitCandidates = recognizedGroups as DigitRecognitionCandidate[];
      return {
        groups,
        digits: digitCandidates.map((candidate) => candidate.digit),
        score: scoreSegmentation(groups, digitCandidates),
        confidence: Math.min(...digitCandidates.map((candidate) => candidate.confidence))
      };
    })
    .filter((candidate): candidate is SegmentationCandidate => candidate !== null)
    .sort((a, b) => a.score - b.score)[0] ?? null;
}

function buildSegmentationCandidates(strokes: HandwritingStroke[]): HandwritingStroke[][][] {
  const candidates = [
    groupStrokesIntoCharacters(strokes),
    groupStrokesIntoCharacters(strokes, {
      gapThresholdScale: relaxedGapThresholdScale,
      minGapThreshold: relaxedGapThresholdMin,
      maxGapThreshold: relaxedGapThresholdMax
    })
  ].filter((groups) => groups.length > 0);

  const seen = new Set<string>();
  return candidates.filter((groups) => {
    const key = groups.map((group) => group.map((stroke) => strokes.indexOf(stroke)).join(",")).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreSegmentation(groups: HandwritingStroke[][], digitCandidates: DigitRecognitionCandidate[]) {
  const averageDistance = digitCandidates.reduce((total, candidate) => total + candidate.distance, 0) / digitCandidates.length;
  const averageMargin = digitCandidates.reduce((total, candidate) => total + candidate.margin, 0) / digitCandidates.length;
  const allBounds = getBounds(groups.flatMap((group) => group.flatMap((stroke) => stroke.points)));
  const aspectRatio = allBounds ? allBounds.width / Math.max(allBounds.height, 1) : 1;
  const wideMergedPenalty = groups.length === 1 && groups[0].length > 1 && aspectRatio > 1.25 ? 0.2 : 0;
  const separatedDigitBonus = groups.length > 1 && hasSeparatedCharacterGaps(groups) ? 0.08 : 0;
  const groupCountPenalty = groups.length * 0.006;

  return averageDistance - Math.min(averageMargin, 0.08) + wideMergedPenalty + groupCountPenalty - separatedDigitBonus;
}

function hasSeparatedCharacterGaps(groups: HandwritingStroke[][]) {
  return groups.every((group, index) => {
    if (index === 0) return true;
    const previousBounds = getBounds(groups[index - 1].flatMap((stroke) => stroke.points));
    const currentBounds = getBounds(group.flatMap((stroke) => stroke.points));
    return Boolean(previousBounds && currentBounds && currentBounds.minX - previousBounds.maxX >= 8);
  });
}

function groupStrokesIntoCharacters(
  strokes: HandwritingStroke[],
  options: {
    gapThresholdScale?: number;
    minGapThreshold?: number;
    maxGapThreshold?: number;
  } = {}
): HandwritingStroke[][] {
  const strokeEntries = strokes
    .map((stroke) => ({
      stroke,
      bounds: getBounds(stroke.points)
    }))
    .filter((entry): entry is { stroke: HandwritingStroke; bounds: DrawingBounds } => entry.bounds !== null)
    .sort((a, b) => a.bounds.minX - b.bounds.minX);

  const fullBounds = getBounds(strokeEntries.flatMap((entry) => entry.stroke.points));
  if (!strokeEntries.length || !fullBounds) return [];

  const gapThreshold = Math.max(
    options.minGapThreshold ?? 18,
    Math.min(options.maxGapThreshold ?? 58, fullBounds.width * (options.gapThresholdScale ?? 0.14))
  );
  const groups: Array<{ strokes: HandwritingStroke[]; bounds: DrawingBounds }> = [];

  strokeEntries.forEach((entry) => {
    const previousGroup = groups.at(-1);
    if (!previousGroup) {
      groups.push({ strokes: [entry.stroke], bounds: entry.bounds });
      return;
    }

    const gap = entry.bounds.minX - previousGroup.bounds.maxX;
    if (gap > gapThreshold) {
      groups.push({ strokes: [entry.stroke], bounds: entry.bounds });
      return;
    }

    previousGroup.strokes.push(entry.stroke);
    previousGroup.bounds = mergeBounds(previousGroup.bounds, entry.bounds);
  });

  return groups.map((group) => group.strokes);
}

function recognizeDigitGroup(strokes: HandwritingStroke[]): string | null {
  return recognizeDigitGroupCandidate(strokes)?.digit ?? null;
}

function recognizeDigitGroupCandidate(strokes: HandwritingStroke[]): DigitRecognitionCandidate | null {
  const points = strokes.flatMap((stroke) => stroke.points);
  const bounds = getBounds(points);
  if (!bounds || Math.max(bounds.width, bounds.height) < 12) return null;

  const normalizedPoints = normalizeRecognizerPoints(points);
  const reversedPoints = [...normalizedPoints].reverse();
  const ranked = digitTemplates
    .map((template) => {
      const forwardDistance = averagePointDistance(normalizedPoints, template.points);
      const reverseDistance = averagePointDistance(reversedPoints, template.points);
      const direction = forwardDistance <= reverseDistance ? "forward" : "reverse";
      return {
        digit: template.digit,
        distance: Math.min(forwardDistance, reverseDistance),
        direction
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const [best, secondBest] = ranked;
  if (!best) return null;

  const secondDistance = secondBest?.distance ?? Number.POSITIVE_INFINITY;
  const margin = secondDistance - best.distance;
  const isConfident = best.distance <= recognitionDistanceThreshold && margin >= recognitionMarginThreshold;

  if (isConfident) {
    const orderedPoints = best.direction === "reverse" ? [...points].reverse() : points;
    const confidence = adjustDigitConfidenceForShape({
      bounds,
      confidence: digitRecognitionConfidence(best.distance, margin),
      digit: best.digit,
      orderedPoints,
      strokes
    });

    return {
      digit: best.digit,
      distance: best.distance,
      margin,
      confidence
    };
  }

  const directionalDigit = recognizeDirectionalDigit(points, bounds);
  if (!directionalDigit) return null;

  return {
    digit: directionalDigit,
    distance: recognitionDistanceThreshold * 0.96,
    margin: recognitionMarginThreshold,
    confidence: localRecognitionAcceptanceConfidence
  };
}

function digitRecognitionConfidence(distance: number, margin: number) {
  const distanceHeadroom = clampNumber((recognitionDistanceThreshold - distance) / recognitionDistanceThreshold, 0, 1);
  const marginStrength = clampNumber((margin - recognitionMarginThreshold) / 0.16, 0, 1);
  return roundConfidence(0.68 + distanceHeadroom * 0.14 + marginStrength * 0.1);
}

function adjustDigitConfidenceForShape({
  bounds,
  confidence,
  digit,
  orderedPoints,
  strokes
}: {
  bounds: DrawingBounds;
  confidence: number;
  digit: string;
  orderedPoints: HandwritingPoint[];
  strokes: HandwritingStroke[];
}) {
  if (digit !== "6") return confidence;

  if (hasFiveLikeTopCap(strokes, bounds) || isOpenBottomSixCandidate(orderedPoints, bounds)) {
    return Math.min(confidence, localRecognitionReviewConfidence);
  }

  return confidence;
}

function hasFiveLikeTopCap(strokes: HandwritingStroke[], bounds: DrawingBounds) {
  if (strokes.length < 2) return false;

  return strokes.some((stroke) => {
    const strokeBounds = getBounds(stroke.points);
    if (!strokeBounds) return false;

    const normalizedWidth = strokeBounds.width / Math.max(bounds.width, 1);
    const normalizedHeight = strokeBounds.height / Math.max(bounds.height, 1);
    const normalizedMiddleY = (strokeBounds.minY + strokeBounds.height / 2 - bounds.minY) / Math.max(bounds.height, 1);
    return normalizedWidth >= 0.34 && normalizedHeight <= 0.22 && normalizedMiddleY <= 0.36;
  });
}

function isOpenBottomSixCandidate(points: HandwritingPoint[], bounds: DrawingBounds) {
  const normalizedPoints = points.map((point) => normalizePointToBounds(point, bounds));
  const firstPoint = normalizedPoints[0];
  const lastPoint = normalizedPoints.at(-1);
  if (!firstPoint || !lastPoint) return false;

  const startsNearUpperRight = firstPoint.y <= 0.32 && firstPoint.x >= 0.52;
  const endsLowOnLeft = lastPoint.y >= 0.78 && lastPoint.x <= 0.58;
  if (!startsNearUpperRight || !endsLowOnLeft) return false;

  const lowerRightAfterHalfway = normalizedPoints
    .slice(Math.floor(normalizedPoints.length / 2))
    .some((point) => point.x >= 0.64 && point.y >= 0.48);
  const returnsToMiddle = normalizedPoints
    .slice(Math.floor(normalizedPoints.length * 0.65))
    .some((point) => point.x <= 0.5 && point.y >= 0.35 && point.y <= 0.74);

  return lowerRightAfterHalfway && !returnsToMiddle;
}

function recognizeDirectionalDigit(points: HandwritingPoint[], bounds: DrawingBounds): string | null {
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const normalizedStart = normalizePointToBounds(firstPoint, bounds);
  const normalizedEnd = normalizePointToBounds(lastPoint, bounds);
  const aspectRatio = bounds.width / Math.max(bounds.height, 1);
  const normalizedPoints = points.map((point) => normalizePointToBounds(point, bounds));

  if (aspectRatio < 0.45 && Math.abs(normalizedStart.x - normalizedEnd.x) < 0.28) return "1";

  const startsNearTop = normalizedStart.y < 0.35;
  const endsNearBottom = normalizedEnd.y > 0.58;
  const broadEnoughForCurvedDigit = aspectRatio > 0.7;

  if (startsNearTop && endsNearBottom && broadEnoughForCurvedDigit) {
    if (normalizedStart.x < 0.45 && normalizedEnd.x > 0.55) return "2";
    if (normalizedStart.x > 0.55 && normalizedEnd.x < 0.45) return "5";
  }

  if (startsNearTop && endsNearBottom && aspectRatio > 0.55) {
    const reachesUpperRight = normalizedPoints.some((point) => point.y < 0.38 && point.x > 0.62);
    const returnsThroughMiddle = normalizedPoints.some((point) => point.y > 0.36 && point.y < 0.66 && point.x < 0.48);
    const reachesLowerRight = normalizedPoints.some((point) => point.y > 0.58 && point.x > 0.64);
    const finishesLeftOfRightEdge = normalizedEnd.x < 0.62;
    if (reachesUpperRight && returnsThroughMiddle && reachesLowerRight && finishesLeftOfRightEdge) return "3";
  }

  return null;
}

function normalizePointToBounds(point: HandwritingPoint, bounds: DrawingBounds): HandwritingPoint {
  return {
    x: (point.x - bounds.minX) / Math.max(bounds.width, 1),
    y: (point.y - bounds.minY) / Math.max(bounds.height, 1)
  };
}

function normalizeRecognizerPoints(points: HandwritingPoint[]): HandwritingPoint[] {
  const sampledPoints = resamplePoints(points, recognizerSampleCount);
  const bounds = getBounds(sampledPoints);
  if (!bounds) return sampledPoints;

  const scale = Math.max(bounds.width, bounds.height, 1);
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;

  return sampledPoints.map((point) => ({
    x: (point.x - centerX) / scale,
    y: (point.y - centerY) / scale
  }));
}

function resamplePoints(points: HandwritingPoint[], targetCount: number): HandwritingPoint[] {
  if (points.length <= 1) return points;

  const interval = pathLength(points) / Math.max(1, targetCount - 1);
  const sampledPoints = [points[0]];
  let distanceSinceLastSample = 0;
  let previousPoint = points[0];

  for (let index = 1; index < points.length; index += 1) {
    let currentPoint = points[index];
    let segmentLength = distanceBetween(previousPoint, currentPoint);

    while (distanceSinceLastSample + segmentLength >= interval && segmentLength > 0) {
      const ratio = (interval - distanceSinceLastSample) / segmentLength;
      const interpolatedPoint = {
        x: previousPoint.x + ratio * (currentPoint.x - previousPoint.x),
        y: previousPoint.y + ratio * (currentPoint.y - previousPoint.y)
      };
      sampledPoints.push(interpolatedPoint);
      previousPoint = interpolatedPoint;
      segmentLength = distanceBetween(previousPoint, currentPoint);
      distanceSinceLastSample = 0;
    }

    distanceSinceLastSample += segmentLength;
    previousPoint = currentPoint;
  }

  while (sampledPoints.length < targetCount) {
    sampledPoints.push(points.at(-1) ?? points[0]);
  }

  return sampledPoints.slice(0, targetCount);
}

function pathLength(points: HandwritingPoint[]) {
  return points.reduce((total, point, index) => {
    if (index === 0) return total;
    return total + distanceBetween(points[index - 1], point);
  }, 0);
}

function averagePointDistance(points: HandwritingPoint[], templatePoints: HandwritingPoint[]) {
  const count = Math.min(points.length, templatePoints.length);
  if (!count) return Number.POSITIVE_INFINITY;

  let totalDistance = 0;
  for (let index = 0; index < count; index += 1) {
    totalDistance += distanceBetween(points[index], templatePoints[index]);
  }

  return totalDistance / count;
}

function distanceBetween(pointA: HandwritingPoint, pointB: HandwritingPoint) {
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

export function getBounds(points: HandwritingPoint[]): DrawingBounds | null {
  if (!points.length) return null;

  const bounds = points.reduce(
    (currentBounds, point) => ({
      minX: Math.min(currentBounds.minX, point.x),
      minY: Math.min(currentBounds.minY, point.y),
      maxX: Math.max(currentBounds.maxX, point.x),
      maxY: Math.max(currentBounds.maxY, point.y)
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY
    }
  );

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };
}

function mergeBounds(boundsA: DrawingBounds, boundsB: DrawingBounds): DrawingBounds {
  const minX = Math.min(boundsA.minX, boundsB.minX);
  const minY = Math.min(boundsA.minY, boundsB.minY);
  const maxX = Math.max(boundsA.maxX, boundsB.maxX);
  const maxY = Math.max(boundsA.maxY, boundsB.maxY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function roundCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function roundConfidence(value: number) {
  return Math.round(clampNumber(value, 0, localRecognitionMaxConfidence) * 100) / 100;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
