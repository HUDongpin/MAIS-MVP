import type { FormulaSpec } from "./mathSceneTypes";

export const SVG_PATH_MORPH_SOURCE_CONTRACT =
  "Tex/SVGMobject SVG path pipeline|SVGMobject path commands|interpolate SVG path morph" as const;

export type SvgPathCommandType = "M" | "L" | "C" | "Z";

export type SvgPathCommand = {
  type: SvgPathCommandType;
  values: number[];
};

type SvgPathParseResult = {
  commands: SvgPathCommand[];
  issues: string[];
};

type Vec2 = [number, number];

type InternalSvgPathCommandType = SvgPathCommandType | "A" | "H" | "Q" | "S" | "T" | "V";

export type FormulaSvgPathMorphSpec = {
  formulaId: string;
  id: string;
  sourcePath: string;
  sourceTokenId: string;
  targetPath: string;
  targetTokenId: string;
};

export type SvgPathMorphPlan = FormulaSvgPathMorphSpec & {
  commandCount: number;
  compatible: boolean;
  issues: string[];
  sourceCommands: SvgPathCommand[];
  targetCommands: SvgPathCommand[];
};

export type SvgPathMorphFrame = {
  path: string;
  progress: number;
};

export type FormulaSvgMorphPlan = {
  cacheKeys: Record<string, string>;
  formulaId: string;
  issues: string[];
  morphs: SvgPathMorphPlan[];
};

export type FormulaSvgMorphPlanSummary = {
  compatibleMorphCount: number;
  formulaId: string;
  issueCount: number;
  morphCount: number;
};

function expectedValueCount(type: InternalSvgPathCommandType) {
  if (type === "A") return 7;
  if (type === "C") return 6;
  if (type === "Q" || type === "S") return 4;
  if (type === "H" || type === "V") return 1;
  if (type === "Z") return 0;
  return 2;
}

function commandType(value: string): InternalSvgPathCommandType | null {
  const normalized = value.toUpperCase();
  return normalized === "M" || normalized === "L" || normalized === "C" || normalized === "Z" || normalized === "A" || normalized === "H" || normalized === "Q" || normalized === "S" || normalized === "T" || normalized === "V"
    ? normalized
    : null;
}

function commandToken(value: string | undefined): { relative: boolean; type: InternalSvgPathCommandType } | null {
  if (value === undefined) return null;

  const type = commandType(value);
  if (!type) return null;

  return {
    relative: value !== value.toUpperCase(),
    type
  };
}

function finiteNumber(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function round(value: number) {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatNumber(value: number) {
  return String(round(value));
}

function commandTokenize(path: string) {
  return path.match(/[MLCZAHQVSTmlczahqvst]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

function isCommandToken(value: string | undefined) {
  return commandToken(value) !== null;
}

function readCommandValues(tokens: string[], startIndex: number, valueCount: number) {
  const values = Array.from({ length: valueCount }, (_, offset) => finiteNumber(tokens[startIndex + offset]));

  return {
    nextIndex: startIndex + valueCount,
    values
  };
}

function pendingNumericTokenCount(tokens: string[], startIndex: number) {
  let count = 0;

  while (startIndex + count < tokens.length && !isCommandToken(tokens[startIndex + count])) {
    count += 1;
  }

  return count;
}

function nearlyZero(value: number) {
  return Math.abs(value) < 1e-9;
}

function arcEndpointForCommand(
  values: number[],
  relative: boolean,
  currentPoint: Vec2
): Vec2 {
  const endpointX = values[5] ?? currentPoint[0];
  const endpointY = values[6] ?? currentPoint[1];

  return [
    relative ? currentPoint[0] + endpointX : endpointX,
    relative ? currentPoint[1] + endpointY : endpointY
  ];
}

function reflectedControlPoint(
  currentPoint: Vec2,
  previousControlPoint: Vec2 | null
): Vec2 {
  if (!previousControlPoint) return [currentPoint[0], currentPoint[1]];

  return [
    2 * currentPoint[0] - previousControlPoint[0],
    2 * currentPoint[1] - previousControlPoint[1]
  ];
}

function vectorAngle(from: Vec2, to: Vec2) {
  const cross = from[0] * to[1] - from[1] * to[0];
  const dot = from[0] * to[0] + from[1] * to[1];
  return Math.atan2(cross, dot);
}

function transformArcUnitPoint(point: Vec2, radiusX: number, radiusY: number, cosPhi: number, sinPhi: number, center: Vec2): Vec2 {
  const [x, y] = point;

  return [
    center[0] + radiusX * cosPhi * x - radiusY * sinPhi * y,
    center[1] + radiusX * sinPhi * x + radiusY * cosPhi * y
  ];
}

function arcSegmentToCubicValues(
  center: Vec2,
  radiusX: number,
  radiusY: number,
  cosPhi: number,
  sinPhi: number,
  startAngle: number,
  endAngle: number
) {
  const alpha = (4 / 3) * Math.tan((endAngle - startAngle) / 4);
  const start: Vec2 = [Math.cos(startAngle), Math.sin(startAngle)];
  const end: Vec2 = [Math.cos(endAngle), Math.sin(endAngle)];
  const firstControl: Vec2 = [
    start[0] - alpha * start[1],
    start[1] + alpha * start[0]
  ];
  const secondControl: Vec2 = [
    end[0] + alpha * end[1],
    end[1] - alpha * end[0]
  ];
  const [control1X, control1Y] = transformArcUnitPoint(firstControl, radiusX, radiusY, cosPhi, sinPhi, center);
  const [control2X, control2Y] = transformArcUnitPoint(secondControl, radiusX, radiusY, cosPhi, sinPhi, center);
  const [endX, endY] = transformArcUnitPoint(end, radiusX, radiusY, cosPhi, sinPhi, center);

  return [control1X, control1Y, control2X, control2Y, endX, endY];
}

function arcToCubicCommands(
  values: number[],
  relative: boolean,
  currentPoint: Vec2
): SvgPathCommand[] {
  const endpoint = arcEndpointForCommand(values, relative, currentPoint);
  let radiusX = Math.abs(values[0] ?? 0);
  let radiusY = Math.abs(values[1] ?? 0);

  if ((nearlyZero(radiusX) || nearlyZero(radiusY)) && (currentPoint[0] !== endpoint[0] || currentPoint[1] !== endpoint[1])) {
    return [{ type: "L", values: endpoint }];
  }

  if ((currentPoint[0] === endpoint[0] && currentPoint[1] === endpoint[1]) || nearlyZero(radiusX) || nearlyZero(radiusY)) {
    return [];
  }

  const rotation = ((values[2] ?? 0) * Math.PI) / 180;
  const largeArc = Boolean(values[3]);
  const sweep = Boolean(values[4]);
  const cosPhi = Math.cos(rotation);
  const sinPhi = Math.sin(rotation);
  const halfDeltaX = (currentPoint[0] - endpoint[0]) / 2;
  const halfDeltaY = (currentPoint[1] - endpoint[1]) / 2;
  const x1Prime = cosPhi * halfDeltaX + sinPhi * halfDeltaY;
  const y1Prime = -sinPhi * halfDeltaX + cosPhi * halfDeltaY;
  const radiusScale = (x1Prime ** 2) / (radiusX ** 2) + (y1Prime ** 2) / (radiusY ** 2);

  if (radiusScale > 1) {
    const scale = Math.sqrt(radiusScale);
    radiusX *= scale;
    radiusY *= scale;
  }

  const radiusXSquared = radiusX ** 2;
  const radiusYSquared = radiusY ** 2;
  const x1PrimeSquared = x1Prime ** 2;
  const y1PrimeSquared = y1Prime ** 2;
  const centerDenominator = radiusXSquared * y1PrimeSquared + radiusYSquared * x1PrimeSquared;
  const centerNumerator = radiusXSquared * radiusYSquared - radiusXSquared * y1PrimeSquared - radiusYSquared * x1PrimeSquared;
  const centerScale = centerDenominator === 0
    ? 0
    : (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, centerNumerator / centerDenominator));
  const centerPrime: Vec2 = [
    centerScale * (radiusX * y1Prime) / radiusY,
    centerScale * -(radiusY * x1Prime) / radiusX
  ];
  const center: Vec2 = [
    cosPhi * centerPrime[0] - sinPhi * centerPrime[1] + (currentPoint[0] + endpoint[0]) / 2,
    sinPhi * centerPrime[0] + cosPhi * centerPrime[1] + (currentPoint[1] + endpoint[1]) / 2
  ];
  const startVector: Vec2 = [
    (x1Prime - centerPrime[0]) / radiusX,
    (y1Prime - centerPrime[1]) / radiusY
  ];
  const endVector: Vec2 = [
    (-x1Prime - centerPrime[0]) / radiusX,
    (-y1Prime - centerPrime[1]) / radiusY
  ];
  const startAngle = vectorAngle([1, 0], startVector);
  let deltaAngle = vectorAngle(startVector, endVector);

  if (!sweep && deltaAngle > 0) deltaAngle -= Math.PI * 2;
  if (sweep && deltaAngle < 0) deltaAngle += Math.PI * 2;

  const segmentCount = Math.max(1, Math.ceil(Math.abs(deltaAngle) / (Math.PI / 2)));
  const segmentAngle = deltaAngle / segmentCount;

  return Array.from({ length: segmentCount }, (_, segmentIndex) => {
    const segmentStart = startAngle + segmentAngle * segmentIndex;
    const segmentEnd = segmentStart + segmentAngle;

    return {
      type: "C" as const,
      values: arcSegmentToCubicValues(center, radiusX, radiusY, cosPhi, sinPhi, segmentStart, segmentEnd)
    };
  });
}

function quadraticToCubicValues(values: number[], currentPoint: Vec2) {
  const [controlX, controlY, endX, endY] = values;

  return [
    currentPoint[0] + (2 / 3) * (controlX - currentPoint[0]),
    currentPoint[1] + (2 / 3) * (controlY - currentPoint[1]),
    endX + (2 / 3) * (controlX - endX),
    endY + (2 / 3) * (controlY - endY),
    endX,
    endY
  ];
}

function smoothCubicToCubicValues(
  values: number[],
  currentPoint: Vec2,
  previousCubicControlPoint: Vec2 | null
) {
  const [secondControlX, secondControlY, endX, endY] = values;
  const firstControlPoint = reflectedControlPoint(currentPoint, previousCubicControlPoint);

  return [
    firstControlPoint[0],
    firstControlPoint[1],
    secondControlX,
    secondControlY,
    endX,
    endY
  ];
}

function smoothQuadraticToCubicValues(
  values: number[],
  currentPoint: Vec2,
  previousQuadraticControlPoint: Vec2 | null
) {
  const [endX, endY] = values;
  const controlPoint = reflectedControlPoint(currentPoint, previousQuadraticControlPoint);

  return quadraticToCubicValues([
    controlPoint[0],
    controlPoint[1],
    endX,
    endY
  ], currentPoint);
}

function quadraticControlPointForCommand(
  type: InternalSvgPathCommandType,
  values: number[],
  relative: boolean,
  currentPoint: Vec2,
  previousQuadraticControlPoint: Vec2 | null
): Vec2 | null {
  if (type === "Q") {
    return [
      relative ? currentPoint[0] + values[0] : values[0],
      relative ? currentPoint[1] + values[1] : values[1]
    ];
  }

  if (type === "T") {
    return reflectedControlPoint(currentPoint, previousQuadraticControlPoint);
  }

  return null;
}

function absoluteCommandValues(
  type: InternalSvgPathCommandType,
  values: number[],
  relative: boolean,
  currentPoint: Vec2,
  previousCubicControlPoint: Vec2 | null,
  previousQuadraticControlPoint: Vec2 | null
) {
  if (type === "H") {
    return [
      relative ? currentPoint[0] + values[0] : values[0],
      currentPoint[1]
    ];
  }

  if (type === "V") {
    return [
      currentPoint[0],
      relative ? currentPoint[1] + values[0] : values[0]
    ];
  }

  if (type === "Q") {
    const absoluteQuadraticValues = relative
      ? values.map((value, index) => value + currentPoint[index % 2])
      : values;

    return quadraticToCubicValues(absoluteQuadraticValues, currentPoint);
  }

  if (type === "S") {
    const absoluteSmoothValues = relative
      ? values.map((value, index) => value + currentPoint[index % 2])
      : values;

    return smoothCubicToCubicValues(absoluteSmoothValues, currentPoint, previousCubicControlPoint);
  }

  if (type === "T") {
    const absoluteSmoothQuadraticEnd = relative
      ? values.map((value, index) => value + currentPoint[index % 2])
      : values;

    return smoothQuadraticToCubicValues(absoluteSmoothQuadraticEnd, currentPoint, previousQuadraticControlPoint);
  }

  if (!relative || type === "Z") return values;

  if (type === "C") {
    return values.map((value, index) => value + currentPoint[index % 2]);
  }

  return [
    values[0] + currentPoint[0],
    values[1] + currentPoint[1]
  ];
}

function endpointForCommand(
  type: SvgPathCommandType,
  values: number[],
  currentPoint: Vec2
): Vec2 {
  if (type === "C") return [values[4], values[5]];
  if (type === "M" || type === "L") return [values[0], values[1]];
  return currentPoint;
}

function interpolateNumber(source: number, target: number, progress: number) {
  return source + (target - source) * progress;
}

function interpolateVec2(source: Vec2, target: Vec2, progress: number): Vec2 {
  return [
    interpolateNumber(source[0], target[0], progress),
    interpolateNumber(source[1], target[1], progress)
  ];
}

function splitCubicSegment(start: Vec2, command: SvgPathCommand, progress: number) {
  const control1: Vec2 = [command.values[0], command.values[1]];
  const control2: Vec2 = [command.values[2], command.values[3]];
  const end: Vec2 = [command.values[4], command.values[5]];
  const p01 = interpolateVec2(start, control1, progress);
  const p12 = interpolateVec2(control1, control2, progress);
  const p23 = interpolateVec2(control2, end, progress);
  const p012 = interpolateVec2(p01, p12, progress);
  const p123 = interpolateVec2(p12, p23, progress);
  const p0123 = interpolateVec2(p012, p123, progress);

  return [
    {
      type: "C" as const,
      values: [p01[0], p01[1], p012[0], p012[1], p0123[0], p0123[1]]
    },
    {
      type: "C" as const,
      values: [p123[0], p123[1], p23[0], p23[1], end[0], end[1]]
    }
  ];
}

function splitCubicCommandAt(command: SvgPathCommand, start: Vec2, segmentCount: number) {
  if (segmentCount <= 1) return [command];

  const segments: SvgPathCommand[] = [];
  let remainingStart = start;
  let remainingCommand = command;

  for (let splitIndex = segmentCount; splitIndex > 1; splitIndex -= 1) {
    const [left, right] = splitCubicSegment(remainingStart, remainingCommand, 1 / splitIndex);
    segments.push(left);
    remainingStart = [left.values[4], left.values[5]];
    remainingCommand = right;
  }

  segments.push(remainingCommand);
  return segments;
}

function lineCommandToCubic(start: Vec2, command: SvgPathCommand): SvgPathCommand {
  const end: Vec2 = [command.values[0], command.values[1]];

  return {
    type: "C",
    values: [
      start[0] + (end[0] - start[0]) / 3,
      start[1] + (end[1] - start[1]) / 3,
      start[0] + (2 * (end[0] - start[0])) / 3,
      start[1] + (2 * (end[1] - start[1])) / 3,
      end[0],
      end[1]
    ]
  };
}

function normalizeSubpathLinesToCubics(commands: SvgPathCommand[]) {
  if (commands.length < 2) return null;
  if (commands[0].type !== "M") return null;

  const closed = commands.at(-1)?.type === "Z";
  const drawableCommands = commands.slice(1, closed ? -1 : undefined);
  if (drawableCommands.length === 0) return null;
  if (!drawableCommands.every((command) => command.type === "C" || command.type === "L")) return null;

  const normalized: SvgPathCommand[] = [commands[0]];
  const startPoint: Vec2 = [commands[0].values[0], commands[0].values[1]];
  let currentPoint: Vec2 = [...startPoint];

  for (const command of drawableCommands) {
    if (command.type === "C") {
      normalized.push(command);
      currentPoint = [command.values[4], command.values[5]];
      continue;
    }

    const cubicCommand = lineCommandToCubic(currentPoint, command);
    normalized.push(cubicCommand);
    currentPoint = [cubicCommand.values[4], cubicCommand.values[5]];
  }

  if (closed) {
    if (!nearlyZero(currentPoint[0] - startPoint[0]) || !nearlyZero(currentPoint[1] - startPoint[1])) {
      normalized.push(lineCommandToCubic(currentPoint, { type: "L", values: startPoint }));
    }

    normalized.push(commands[commands.length - 1]);
  }
  return normalized;
}

function cubicPathShape(commands: SvgPathCommand[]) {
  const normalized = normalizeSubpathLinesToCubics(commands);
  if (!normalized) return null;

  const closed = normalized.at(-1)?.type === "Z";
  const cubicCommands = normalized.slice(1, closed ? -1 : undefined);

  return {
    closed,
    cubicCount: cubicCommands.length,
    normalized
  };
}

function splitCubicPathToCount(commands: SvgPathCommand[], targetCubicCount: number) {
  const firstCommand = commands[0];
  const closed = commands.at(-1)?.type === "Z";
  const cubicCommands = commands.slice(1, closed ? -1 : undefined);
  if (cubicCommands.length === targetCubicCount) return commands;

  const expanded: SvgPathCommand[] = [firstCommand];
  let currentPoint: Vec2 = [firstCommand.values[0], firstCommand.values[1]];

  for (let index = 0; index < cubicCommands.length; index += 1) {
    const command = cubicCommands[index];
    const remainingCommands = cubicCommands.length - index;
    const remainingNeeded = targetCubicCount - (expanded.length - 1);
    const splitCount = Math.max(1, Math.ceil(remainingNeeded / remainingCommands));
    const splitCommands = splitCubicCommandAt(command, currentPoint, splitCount);
    expanded.push(...splitCommands);
    const lastCommand = splitCommands.at(-1) ?? command;
    currentPoint = [lastCommand.values[4], lastCommand.values[5]];
  }

  if (closed) expanded.push(commands[commands.length - 1]);
  return expanded;
}

function splitCommandsIntoSubpaths(commands: SvgPathCommand[]) {
  const subpaths: SvgPathCommand[][] = [];
  let currentSubpath: SvgPathCommand[] = [];

  for (const command of commands) {
    if (command.type === "M") {
      if (currentSubpath.length > 0) subpaths.push(currentSubpath);
      currentSubpath = [command];
      continue;
    }

    if (currentSubpath.length === 0) return [commands];
    currentSubpath.push(command);
  }

  if (currentSubpath.length > 0) subpaths.push(currentSubpath);
  return subpaths.length > 0 ? subpaths : [commands];
}

function alignSvgPathCommandsForMorph(sourceCommands: SvgPathCommand[], targetCommands: SvgPathCommand[]) {
  const sourceSubpaths = splitCommandsIntoSubpaths(sourceCommands);
  const targetSubpaths = splitCommandsIntoSubpaths(targetCommands);

  if (sourceSubpaths.length !== targetSubpaths.length) {
    return { sourceCommands, targetCommands };
  }

  const alignedSourceSubpaths: SvgPathCommand[][] = [];
  const alignedTargetSubpaths: SvgPathCommand[][] = [];

  for (let index = 0; index < sourceSubpaths.length; index += 1) {
    const sourceSubpath = sourceSubpaths[index];
    const targetSubpath = targetSubpaths[index];
    const sourceShape = cubicPathShape(sourceSubpath);
    const targetShape = cubicPathShape(targetSubpath);

    if (!sourceShape || !targetShape || sourceShape.closed !== targetShape.closed) {
      return { sourceCommands, targetCommands };
    }

    const alignedCubicCount = Math.max(sourceShape.cubicCount, targetShape.cubicCount);
    alignedSourceSubpaths.push(splitCubicPathToCount(sourceShape.normalized, alignedCubicCount));
    alignedTargetSubpaths.push(splitCubicPathToCount(targetShape.normalized, alignedCubicCount));
  }

  return {
    sourceCommands: alignedSourceSubpaths.flat(),
    targetCommands: alignedTargetSubpaths.flat()
  };
}

function outputCommandType(type: InternalSvgPathCommandType): SvgPathCommandType {
  if (type === "A") throw new Error("unsupported SVG arc command has no direct morph output");
  if (type === "S") return "C";
  if (type === "T") return "C";
  if (type === "Q") return "C";
  return type === "H" || type === "V" ? "L" : type;
}

function parseSvgPathCommandStream(path: string): SvgPathParseResult {
  const tokens = commandTokenize(path);
  const commands: SvgPathCommand[] = [];
  const issues: string[] = [];
  let index = 0;
  let currentPoint: [number, number] = [0, 0];
  let previousCubicControlPoint: [number, number] | null = null;
  let previousQuadraticControlPoint: [number, number] | null = null;
  let subpathStart: [number, number] = [0, 0];

  while (index < tokens.length) {
    const token = commandToken(tokens[index]);
    index += 1;
    if (!token) continue;

    const { type } = token;
    const valueCount = expectedValueCount(type);
    if (valueCount === 0) {
      const outputType = outputCommandType(type);
      commands.push({ type: outputType, values: [] });
      if (outputType === "Z") currentPoint = [...subpathStart];
      previousCubicControlPoint = null;
      previousQuadraticControlPoint = null;
      continue;
    }

    let repeatType = type;
    let consumedGroupCount = 0;
    while (index + valueCount <= tokens.length && !isCommandToken(tokens[index])) {
      const { nextIndex, values } = readCommandValues(tokens, index, valueCount);
      consumedGroupCount += 1;
      if (repeatType === "A") {
        const arcCommands = arcToCubicCommands(values, token.relative, currentPoint);
        commands.push(...arcCommands);
        currentPoint = arcEndpointForCommand(values, token.relative, currentPoint);
        previousCubicControlPoint = null;
        previousQuadraticControlPoint = null;
        index = nextIndex;
        if (isCommandToken(tokens[index])) break;
        continue;
      }

      const nextQuadraticControlPoint = quadraticControlPointForCommand(
        repeatType,
        values,
        token.relative,
        currentPoint,
        previousQuadraticControlPoint
      );
      const absoluteValues = absoluteCommandValues(
        repeatType,
        values,
        token.relative,
        currentPoint,
        previousCubicControlPoint,
        previousQuadraticControlPoint
      );
      const outputType = outputCommandType(repeatType);
      commands.push({ type: outputType, values: absoluteValues });
      currentPoint = endpointForCommand(outputType, absoluteValues, currentPoint);
      previousCubicControlPoint = repeatType === "C" || repeatType === "S"
        ? [absoluteValues[2], absoluteValues[3]]
        : null;
      previousQuadraticControlPoint = nextQuadraticControlPoint;
      if (type === "M" && outputType === "M") subpathStart = [...currentPoint];
      index = nextIndex;

      if (type === "M") repeatType = "L";
      if (isCommandToken(tokens[index])) break;
    }

    const remainingValueCount = pendingNumericTokenCount(tokens, index);
    if (consumedGroupCount === 0 || remainingValueCount > 0) {
      issues.push(`incomplete-command:${repeatType}@${index}:expected=${valueCount}:remaining=${remainingValueCount}`);
      index += remainingValueCount;
    }
  }

  if (commands.length === 0) {
    issues.unshift("path-empty");
  } else if (commands[0].type !== "M") {
    issues.unshift(`path-start:not-move:${commands[0].type}`);
  }

  return { commands, issues };
}

export function parseSvgPathCommands(path: string): SvgPathCommand[] {
  return parseSvgPathCommandStream(path).commands;
}

function commandIssues(sourceCommands: SvgPathCommand[], targetCommands: SvgPathCommand[]) {
  const issues: string[] = [];
  const commandCount = Math.max(sourceCommands.length, targetCommands.length);

  for (let index = 0; index < commandCount; index += 1) {
    const source = sourceCommands[index];
    const target = targetCommands[index];
    const sourceType = source?.type ?? "missing";
    const targetType = target?.type ?? "missing";

    if (sourceType !== targetType) {
      issues.push(`command-type@${index}:${sourceType}->${targetType}`);
    }

    if (!source || !target) continue;

    if (source.values.length !== target.values.length) {
      issues.push(`command-value-count@${index}:${source.values.length}->${target.values.length}`);
    }
  }

  if (sourceCommands.length !== targetCommands.length) {
    issues.unshift(`command-count:${sourceCommands.length}->${targetCommands.length}`);
  }

  return issues;
}

export function normalizeSvgPathForMorph(spec: FormulaSvgPathMorphSpec): SvgPathMorphPlan {
  const sourceParse = parseSvgPathCommandStream(spec.sourcePath);
  const targetParse = parseSvgPathCommandStream(spec.targetPath);
  const alignedCommands = alignSvgPathCommandsForMorph(sourceParse.commands, targetParse.commands);
  const { sourceCommands, targetCommands } = alignedCommands;
  const issues = [
    ...sourceParse.issues.map((issue) => `source-${issue}`),
    ...targetParse.issues.map((issue) => `target-${issue}`),
    ...commandIssues(sourceCommands, targetCommands)
  ];

  return {
    ...spec,
    commandCount: sourceCommands.length,
    compatible: issues.length === 0,
    issues,
    sourceCommands,
    targetCommands
  };
}

function interpolateValue(source: number, target: number, progress: number) {
  return interpolateNumber(source, target, progress);
}

function commandToPath(command: SvgPathCommand) {
  return [command.type, ...command.values.map(formatNumber)].join(" ");
}

export function interpolateSvgPathMorph(plan: SvgPathMorphPlan, progress: number): SvgPathMorphFrame {
  if (!plan.compatible) {
    return {
      path: plan.sourcePath,
      progress: 0
    };
  }

  const alpha = clamp01(progress);
  const commands = plan.sourceCommands.map((sourceCommand, index) => {
    const targetCommand = plan.targetCommands[index];

    return {
      type: sourceCommand.type,
      values: sourceCommand.values.map((sourceValue, valueIndex) =>
        interpolateValue(sourceValue, targetCommand.values[valueIndex], alpha)
      )
    };
  });

  return {
    path: commands.map(commandToPath).join(" "),
    progress: alpha
  };
}

export function svgPathMorphCacheKey(spec: FormulaSvgPathMorphSpec) {
  return [
    spec.formulaId,
    spec.id,
    spec.sourceTokenId,
    spec.targetTokenId,
    spec.sourcePath,
    spec.targetPath
  ].join("::");
}

function tokenIds(formula: FormulaSpec) {
  return new Set(formula.tokens.map((token) => token.id));
}

export function buildFormulaSvgMorphPlan(
  formula: FormulaSpec,
  morphs: FormulaSvgPathMorphSpec[] = []
): FormulaSvgMorphPlan {
  const tokenIdSet = tokenIds(formula);
  const formulaMorphs = morphs.filter((morph) => morph.formulaId === formula.id);
  const issues: string[] = [];
  const normalizedMorphs = formulaMorphs.map((morph) => {
    if (!tokenIdSet.has(morph.sourceTokenId)) issues.push(`${morph.id}:missing-source-token:${morph.sourceTokenId}`);
    if (!tokenIdSet.has(morph.targetTokenId)) issues.push(`${morph.id}:missing-target-token:${morph.targetTokenId}`);

    const plan = normalizeSvgPathForMorph(morph);
    issues.push(...plan.issues.map((issue) => `${morph.id}:${issue}`));
    return plan;
  });

  return {
    cacheKeys: Object.fromEntries(normalizedMorphs.map((morph) => [morph.id, svgPathMorphCacheKey(morph)])),
    formulaId: formula.id,
    issues,
    morphs: normalizedMorphs
  };
}

export function summarizeSvgPathMorphPlan(plan: FormulaSvgMorphPlan): FormulaSvgMorphPlanSummary {
  return {
    compatibleMorphCount: plan.morphs.filter((morph) => morph.compatible).length,
    formulaId: plan.formulaId,
    issueCount: plan.issues.length,
    morphCount: plan.morphs.length
  };
}
