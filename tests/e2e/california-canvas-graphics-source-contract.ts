import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  signatureLabAssignments,
  type SignatureLabId
} from "@/data/signatureLabAssignments";
import { resolveCaliforniaSignatureFrozenSourceRoot } from
  "./california-signature-frozen-source-root";

/**
 * Static source contract for the 2-D Canvas drawings reachable from the
 * California curriculum.  This is deliberately independent of the browser
 * recorder: deleting a middle paint call must make the expected set smaller
 * here and therefore fail before a DOM-derived set can approve the omission.
 */

export const CALIFORNIA_CANVAS_GRAPHICS_SCHEMA_VERSION = 1;

// Updated only after reviewing every changed Canvas source site.
export const CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256 =
  "7cac88382bbdcaee2a940615a79b2b308b800d816868d4f6029638a81cd3e351";
export const CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256 =
  "dd77f04df69deba79c675f5503039b934e63feb6de26731ff60f7c00da74f96b";

/**
 * Transparent Canvas pixels must be composited against this adapter paper in
 * the runtime stage. The signature sources do not paint or prove that external
 * surface, so this constant is a prerequisite, never source-level evidence.
 */
export const CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER = "#fbfbf8";

const PATH_METHODS = [
  "arc",
  "arcTo",
  "beginPath",
  "bezierCurveTo",
  "closePath",
  "ellipse",
  "lineTo",
  "moveTo",
  "quadraticCurveTo",
  "rect",
  "roundRect"
] as const;

const TERMINAL_GRAPHICS_METHODS = ["fill", "fillRect", "stroke", "strokeRect"] as const;
const TEXT_METHODS = ["fillText", "measureText", "strokeText"] as const;
const CLEAR_METHODS = ["clearRect"] as const;
const STATE_METHODS = [
  "getLineDash",
  "resetTransform",
  "restore",
  "rotate",
  "save",
  "scale",
  "setLineDash",
  "setTransform",
  "transform",
  "translate"
] as const;
const CLIP_METHODS = ["clip"] as const;
const GRADIENT_FACTORIES = [
  "createConicGradient",
  "createLinearGradient",
  "createRadialGradient"
] as const;

const CONTEXT_PROPERTY_WRITES = [
  "direction",
  "fillStyle",
  "font",
  "fontKerning",
  "fontStretch",
  "fontVariantCaps",
  "globalAlpha",
  "letterSpacing",
  "lineCap",
  "lineDashOffset",
  "lineJoin",
  "lineWidth",
  "miterLimit",
  "shadowBlur",
  "shadowColor",
  "shadowOffsetX",
  "shadowOffsetY",
  "strokeStyle",
  "textAlign",
  "textBaseline",
  "textRendering",
  "wordSpacing"
] as const;

const UNSUPPORTED_CONTEXT_METHODS = new Set([
  "createImageData",
  "createPattern",
  "drawFocusIfNeeded",
  "drawImage",
  "getImageData",
  "isPointInPath",
  "isPointInStroke",
  "putImageData",
  "scrollPathIntoView"
]);

const UNSUPPORTED_CONTEXT_PROPERTIES = new Set([
  "filter",
  "globalCompositeOperation",
  "imageSmoothingEnabled",
  "imageSmoothingQuality"
]);

type PathMethod = (typeof PATH_METHODS)[number];
export type CaliforniaCanvasTerminalOperation =
  (typeof TERMINAL_GRAPHICS_METHODS)[number];
export type CaliforniaCanvasGraphicsRole = "background" | "decorative" | "essential";
export type CaliforniaCanvasPaintClass =
  | "dynamic"
  | "gradient"
  | "inherited"
  | "static-opaque"
  | "static-translucent";
export type CaliforniaCanvasAlphaClass =
  | "dynamic"
  | "inherited-or-default"
  | "static-opaque"
  | "static-translucent";
export type CaliforniaCanvasShadowClass =
  | "dynamic"
  | "inherited-or-default"
  | "static-active"
  | "static-none";

export type CaliforniaCanvasRoleRegistryEntry = {
  claim: "full-canvas-background" | "non-semantic-decoration";
  expectedIdentitySha256: string;
  rationale: string;
  role: Exclude<CaliforniaCanvasGraphicsRole, "essential">;
};

export type CaliforniaCanvasBinding = {
  benchId: SignatureLabId | string;
  canvasAlias: string;
  canvasRef: string;
  contextName: string;
  contextOrdinal: number;
  key: string;
  sourceLine: number;
  sourcePath: string;
};

export type CaliforniaCanvasPaintSite = {
  alphaClass: CaliforniaCanvasAlphaClass;
  alphaExpression: string | null;
  argumentText: readonly string[];
  authoredPathGroupKey: string | null;
  benchId: SignatureLabId | string;
  canvasContextKeys: readonly string[];
  colorAlphaClass: CaliforniaCanvasPaintClass;
  controlFlowIdentity: string;
  expectedIdentitySha256: string;
  lexicalContextIdentity: string;
  operation: CaliforniaCanvasTerminalOperation;
  operationOrdinal: number;
  paintExpression: string | null;
  pathFamily: string;
  role: CaliforniaCanvasGraphicsRole;
  roleRationale: string;
  shadowClass: CaliforniaCanvasShadowClass;
  shadowExpression: string | null;
  sourceLine: number;
  sourcePath: string;
  sourceSiteKey: string;
  sourceText: string;
  terminalOrdinal: number;
};

export type CaliforniaCanvasClearEpochSite = {
  canvasContextKeys: readonly string[];
  lexicalContextIdentity: string;
  sourceLine: number;
  sourcePath: string;
  sourceSiteKey: string;
  sourceText: string;
};

export type CaliforniaCanvasClipSite = {
  canvasContextKeys: readonly string[];
  lexicalContextIdentity: string;
  pathFamily: string;
  sourceLine: number;
  sourcePath: string;
  sourceText: string;
};

export type CaliforniaCanvasApiCensus = {
  animationMethods: Readonly<Record<string, number>>;
  canvasPropertyWrites: Readonly<Record<string, number>>;
  clearMethods: Readonly<Record<string, number>>;
  clipMethods: Readonly<Record<string, number>>;
  contextPropertyWrites: Readonly<Record<string, number>>;
  gradientMethods: Readonly<Record<string, number>>;
  pathMethods: Readonly<Record<string, number>>;
  stateMethods: Readonly<Record<string, number>>;
  terminalGraphicsMethods: Readonly<Record<string, number>>;
  textMethods: Readonly<Record<string, number>>;
};

export type CaliforniaCanvasGraphicsSourceContract = {
  apiCensus: CaliforniaCanvasApiCensus;
  bindings: readonly CaliforniaCanvasBinding[];
  clearEpochSites: readonly CaliforniaCanvasClearEpochSite[];
  clipSites: readonly CaliforniaCanvasClipSite[];
  contractSha256: string;
  counts: {
    animatedSources: number;
    authoredPathGroups: number;
    benches: number;
    canvases: number;
    clearEpochs: number;
    clipSites: number;
    contextAcquisitions2d: number;
    dynamicAlphaSites: number;
    dynamicPaintSites: number;
    gradientPaintSites: number;
    paintSites: number;
    registrySites: number;
    shadowPaintSites: number;
    unresolvedPathFamilies: number;
  };
  paintSites: readonly CaliforniaCanvasPaintSite[];
  runtimePrerequisites: {
    externalCompositePaper: typeof CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER;
    externalCompositePaperSourceProven: false;
  };
  schemaVersion: number;
  sourceSha256: string;
  sources: readonly {
    benchId: SignatureLabId | string;
    sourcePath: string;
    sourceSha256: string;
  }[];
};

type MutableCensus = {
  animationMethods: Map<string, number>;
  canvasPropertyWrites: Map<string, number>;
  clearMethods: Map<string, number>;
  clipMethods: Map<string, number>;
  contextPropertyWrites: Map<string, number>;
  gradientMethods: Map<string, number>;
  pathMethods: Map<string, number>;
  stateMethods: Map<string, number>;
  terminalGraphicsMethods: Map<string, number>;
  textMethods: Map<string, number>;
};

type FunctionInfo = {
  key: string;
  name: string;
  node: ts.FunctionLikeDeclaration;
  parameters: readonly string[];
};

type ContextAcquisition = CaliforniaCanvasBinding & {
  declaration: ts.VariableDeclaration;
  scope: ts.FunctionLikeDeclaration;
};

type ResolvedReceiver = {
  contextKeys: readonly string[];
  lexicalIdentity: string;
};

type SourceAnalysis = {
  apiCensus: MutableCensus;
  bindings: CaliforniaCanvasBinding[];
  clearEpochSites: CaliforniaCanvasClearEpochSite[];
  clipSites: CaliforniaCanvasClipSite[];
  paintSites: CaliforniaCanvasPaintSite[];
};

type AnalyzeSourceOptions = {
  benchId: SignatureLabId | string;
  roleRegistry?: Readonly<Record<string, CaliforniaCanvasRoleRegistryEntry>>;
  source: string;
  sourcePath: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stableRecord(map: ReadonlyMap<string, number>) {
  return Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));
}

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function emptyCensus(): MutableCensus {
  return {
    animationMethods: new Map(),
    canvasPropertyWrites: new Map(),
    clearMethods: new Map(),
    clipMethods: new Map(),
    contextPropertyWrites: new Map(),
    gradientMethods: new Map(),
    pathMethods: new Map(),
    stateMethods: new Map(),
    terminalGraphicsMethods: new Map(),
    textMethods: new Map()
  };
}

function mergeCensus(into: MutableCensus, source: MutableCensus) {
  for (const key of Object.keys(into) as (keyof MutableCensus)[]) {
    for (const [name, count] of source[key]) {
      into[key].set(name, (into[key].get(name) ?? 0) + count);
    }
  }
}

function isFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return ts.isArrowFunction(node) || ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) || ts.isMethodDeclaration(node);
}

function nearestFunction(node: ts.Node): ts.FunctionLikeDeclaration | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isFunctionLike(current)) return current;
    current = current.parent;
  }
  return null;
}

function sourceLine(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function functionName(node: ts.FunctionLikeDeclaration, sourceFile: ts.SourceFile) {
  if ("name" in node && node.name) return node.name.getText(sourceFile);
  if (ts.isVariableDeclaration(node.parent)) return node.parent.name.getText(sourceFile);
  if (ts.isPropertyAssignment(node.parent)) return node.parent.name.getText(sourceFile);
  if (ts.isCallExpression(node.parent)) {
    return `${normalizeSourceText(node.parent.expression.getText(sourceFile))}-callback`;
  }
  return "anonymous";
}

function collectFunctions(sourceFile: ts.SourceFile) {
  const functions: FunctionInfo[] = [];
  const visit = (node: ts.Node) => {
    if (isFunctionLike(node)) {
      const name = functionName(node, sourceFile);
      const ordinal = functions.filter((item) => item.name === name).length;
      functions.push({
        key: `${name}@${ordinal}`,
        name,
        node,
        parameters: node.parameters.map((parameter) => parameter.name.getText(sourceFile))
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return functions;
}

function functionInfoFor(
  node: ts.FunctionLikeDeclaration,
  functions: readonly FunctionInfo[]
) {
  const found = functions.find((item) => item.node === node);
  if (!found) throw new Error("Canvas source analyzer lost a function identity");
  return found;
}

function collectNodes<T extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is T
) {
  const nodes: T[] = [];
  const visit = (node: ts.Node) => {
    if (predicate(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return nodes;
}

function findIdentifierDeclaration(
  identifier: string,
  before: number,
  root: ts.Node,
  sourceFile: ts.SourceFile
) {
  return collectNodes(root, ts.isVariableDeclaration)
    .filter((declaration) =>
      declaration.pos < before && declaration.name.getText(sourceFile) === identifier
    )
    .sort((a, b) => b.pos - a.pos)[0] ?? null;
}

function jsxCanvasRefs(sourceFile: ts.SourceFile) {
  return collectNodes(
    sourceFile,
    (node): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement =>
      ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)
  ).filter((node) => node.tagName.getText(sourceFile) === "canvas").map((node) => {
    const ref = node.attributes.properties.find((property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === "ref"
    );
    if (!ref || !ref.initializer || !ts.isJsxExpression(ref.initializer) ||
        !ref.initializer.expression) {
      throw new Error(
        `${sourceFile.fileName}:${sourceLine(sourceFile, node)} Canvas is missing an exact JSX ref`
      );
    }
    return {
      node,
      ref: normalizeSourceText(ref.initializer.expression.getText(sourceFile))
    };
  });
}

function collectContextAcquisitions(
  benchId: SignatureLabId | string,
  sourcePath: string,
  sourceFile: ts.SourceFile,
  canvases: ReturnType<typeof jsxCanvasRefs>
) {
  const declarations = collectNodes(sourceFile, ts.isVariableDeclaration).filter((declaration) => {
    const initializer = declaration.initializer;
    return !!initializer && ts.isCallExpression(initializer) &&
      ts.isPropertyAccessExpression(initializer.expression) &&
      initializer.expression.name.text === "getContext" &&
      initializer.arguments.length === 1 &&
      ts.isStringLiteralLike(initializer.arguments[0]) &&
      initializer.arguments[0].text === "2d";
  });
  const acquisitions = declarations.map((declaration, contextOrdinal): ContextAcquisition => {
    if (!ts.isIdentifier(declaration.name)) {
      throw new Error(`${sourcePath}: Canvas context binding must be an identifier`);
    }
    const initializer = declaration.initializer as ts.CallExpression;
    const receiver = (initializer.expression as ts.PropertyAccessExpression).expression;
    if (!ts.isIdentifier(receiver)) {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, declaration)} getContext receiver is not a lexical canvas alias`
      );
    }
    const scope = nearestFunction(declaration);
    if (!scope) throw new Error(`${sourcePath}: getContext is outside a function scope`);
    const aliasDeclaration = findIdentifierDeclaration(
      receiver.text,
      declaration.pos,
      scope,
      sourceFile
    );
    if (!aliasDeclaration?.initializer ||
        !ts.isPropertyAccessExpression(aliasDeclaration.initializer) ||
        aliasDeclaration.initializer.name.text !== "current") {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, declaration)} cannot resolve ${receiver.text} to a Canvas ref`
      );
    }
    const canvasRef = normalizeSourceText(aliasDeclaration.initializer.expression.getText(sourceFile));
    const matchingCanvases = canvases.filter((canvas) => canvas.ref === canvasRef);
    if (matchingCanvases.length !== 1) {
      throw new Error(
        `${sourcePath}: ${canvasRef} maps to ${matchingCanvases.length} JSX canvases; expected exactly one`
      );
    }
    const contextName = declaration.name.text;
    const key = `${benchId}/${canvasRef}/${contextName}@${contextOrdinal}`;
    return {
      benchId,
      canvasAlias: receiver.text,
      canvasRef,
      contextName,
      contextOrdinal,
      declaration,
      key,
      scope,
      sourceLine: sourceLine(sourceFile, declaration),
      sourcePath
    };
  });
  const acquiredRefs = acquisitions.map((item) => item.canvasRef).sort();
  const renderedRefs = canvases.map((item) => item.ref).sort();
  if (JSON.stringify(acquiredRefs) !== JSON.stringify(renderedRefs)) {
    throw new Error(
      `${sourcePath}: JSX Canvas refs and 2-D context acquisitions are not one-to-one ` +
      `(rendered=${renderedRefs.join(",")}; acquired=${acquiredRefs.join(",")})`
    );
  }
  return acquisitions;
}

function functionParameterIdentity(
  receiver: string,
  node: ts.Node,
  functions: readonly FunctionInfo[]
) {
  let fn = nearestFunction(node);
  while (fn) {
    const info = functionInfoFor(fn, functions);
    const parameterIndex = info.parameters.indexOf(receiver);
    if (parameterIndex >= 0) return { info, parameterIndex };
    fn = nearestFunction(fn);
  }
  return null;
}

function directContextFor(
  receiver: string,
  node: ts.Node,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[]
) {
  // A same-named helper parameter shadows an acquired context.
  let fn: ts.FunctionLikeDeclaration | null = nearestFunction(node);
  while (fn) {
    const info = functionInfoFor(fn, functions);
    if (info.parameters.includes(receiver)) return null;
    const candidate = acquisitions.find((acquisition) =>
      acquisition.scope === fn && acquisition.contextName === receiver &&
      acquisition.declaration.pos < node.pos
    );
    if (candidate) return candidate;
    fn = nearestFunction(fn);
  }
  return null;
}

function callExpressionsForFunction(
  info: FunctionInfo,
  sourceFile: ts.SourceFile
) {
  return collectNodes(sourceFile, ts.isCallExpression).filter((call) => {
    if (ts.isIdentifier(call.expression)) return call.expression.text === info.name;
    return false;
  });
}

function resolveExpressionContexts(
  expression: ts.Expression,
  callNode: ts.Node,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[],
  sourceFile: ts.SourceFile,
  seen: Set<string>
): readonly string[] {
  if (!ts.isIdentifier(expression)) return [];
  const direct = directContextFor(expression.text, callNode, acquisitions, functions);
  if (direct) return [direct.key];
  const parameter = functionParameterIdentity(expression.text, callNode, functions);
  if (!parameter) return [];
  return resolveParameterContexts(
    parameter.info,
    parameter.parameterIndex,
    acquisitions,
    functions,
    sourceFile,
    seen
  );
}

function resolveParameterContexts(
  info: FunctionInfo,
  parameterIndex: number,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[],
  sourceFile: ts.SourceFile,
  seen = new Set<string>()
): readonly string[] {
  const token = `${info.key}:${parameterIndex}`;
  if (seen.has(token)) return [];
  const nextSeen = new Set(seen).add(token);
  const keys = callExpressionsForFunction(info, sourceFile).flatMap((call) => {
    const argument = call.arguments[parameterIndex];
    return argument
      ? resolveExpressionContexts(
          argument,
          call,
          acquisitions,
          functions,
          sourceFile,
          nextSeen
        )
      : [];
  });
  return [...new Set(keys)].sort();
}

function resolveReceiver(
  receiver: ts.Expression,
  node: ts.Node,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[],
  sourceFile: ts.SourceFile
): ResolvedReceiver | null {
  if (!ts.isIdentifier(receiver)) return null;
  const direct = directContextFor(receiver.text, node, acquisitions, functions);
  if (direct) {
    return { contextKeys: [direct.key], lexicalIdentity: `context:${direct.key}` };
  }
  const parameter = functionParameterIdentity(receiver.text, node, functions);
  if (!parameter) return null;
  const contextKeys = resolveParameterContexts(
    parameter.info,
    parameter.parameterIndex,
    acquisitions,
    functions,
    sourceFile
  );
  if (contextKeys.length === 0) return null;
  return {
    contextKeys,
    lexicalIdentity: `parameter:${parameter.info.key}:${parameter.parameterIndex}:${receiver.text}`
  };
}

function controlFlowIdentity(node: ts.Node, sourceFile: ts.SourceFile) {
  const parts: string[] = [];
  let current: ts.Node | undefined = node.parent;
  const fn = nearestFunction(node);
  while (current && current !== fn) {
    if (ts.isIfStatement(current)) {
      const branch = current.thenStatement.pos <= node.pos && node.end <= current.thenStatement.end
        ? "then" : "else";
      parts.push(`if(${normalizeSourceText(current.expression.getText(sourceFile))}):${branch}`);
    } else if (ts.isForStatement(current) || ts.isForInStatement(current) ||
               ts.isForOfStatement(current) || ts.isWhileStatement(current) ||
               ts.isDoStatement(current)) {
      parts.push(`loop:${normalizeSourceText(current.getText(sourceFile).split("{")[0])}`);
    } else if (ts.isConditionalExpression(current)) {
      parts.push(`conditional:${normalizeSourceText(current.condition.getText(sourceFile))}`);
    } else if (ts.isCaseClause(current)) {
      parts.push(`case:${normalizeSourceText(current.expression.getText(sourceFile))}`);
    }
    current = current.parent;
  }
  return parts.reverse().join(" > ") || "unconditional";
}

function callsWithinFunction(
  fn: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile
) {
  return collectNodes(fn, ts.isCallExpression).filter((call) => nearestFunction(call) === fn);
}

function isNodeInside(node: ts.Node, possibleAncestor: ts.Node) {
  return possibleAncestor.pos <= node.pos && node.end <= possibleAncestor.end;
}

function visibleFunctionDefinitions(
  identifier: string,
  atNode: ts.Node,
  functions: readonly FunctionInfo[]
) {
  return functions.filter((info) => {
    if (info.name !== identifier) return false;
    const owner = nearestFunction(info.node);
    if (owner && !isNodeInside(atNode, owner)) return false;
    if (ts.isArrowFunction(info.node) || ts.isFunctionExpression(info.node)) {
      return info.node.pos < atNode.pos;
    }
    return true;
  }).sort((a, b) => b.node.pos - a.node.pos);
}

function resolveFunctionValues(
  identifier: string,
  atNode: ts.Node,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[],
  sourceFile: ts.SourceFile,
  seen = new Set<string>()
): readonly FunctionInfo[] {
  const token = `${identifier}@${atNode.pos}`;
  if (seen.has(token)) return [];
  const nextSeen = new Set(seen).add(token);
  const direct = visibleFunctionDefinitions(identifier, atNode, functions);
  if (direct.length > 0) return [direct[0]];
  const parameter = functionParameterIdentity(identifier, atNode, functions);
  if (!parameter) return [];
  const values = callExpressionsForFunction(parameter.info, sourceFile).flatMap((call) => {
    const argument = call.arguments[parameter.parameterIndex];
    return argument && ts.isIdentifier(argument)
      ? resolveFunctionValues(
          argument.text,
          call,
          acquisitions,
          functions,
          sourceFile,
          nextSeen
        )
      : [];
  });
  return [...new Map(values.map((value) => [value.key, value])).values()];
}

function resolvedPathOperationsForFunction(
  info: FunctionInfo,
  contextKeys: readonly string[],
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[],
  sourceFile: ts.SourceFile,
  seen = new Set<string>()
): readonly string[] {
  if (seen.has(info.key)) return [];
  const nextSeen = new Set(seen).add(info.key);
  const operations = collectNodes(info.node, ts.isCallExpression).flatMap((candidate) => {
    if (nearestFunction(candidate) !== info.node) return [];
    if (ts.isPropertyAccessExpression(candidate.expression) &&
        PATH_METHODS.includes(candidate.expression.name.text as PathMethod)) {
      const receiver = resolveReceiver(
        candidate.expression.expression,
        candidate,
        acquisitions,
        functions,
        sourceFile
      );
      return receiver && JSON.stringify(receiver.contextKeys) === JSON.stringify(contextKeys)
        ? [candidate.expression.name.text]
        : [];
    }
    if (!ts.isIdentifier(candidate.expression)) return [];
    return resolveFunctionValues(
      candidate.expression.text,
      candidate,
      acquisitions,
      functions,
      sourceFile
    ).flatMap((helper) => resolvedPathOperationsForFunction(
      helper,
      contextKeys,
      acquisitions,
      functions,
      sourceFile,
      nextSeen
    ));
  });
  return operations;
}

function pathInformation(
  call: ts.CallExpression,
  receiver: ResolvedReceiver,
  sourceFile: ts.SourceFile,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[]
) {
  const fn = nearestFunction(call);
  if (!fn) {
    return { anchor: null, family: "unresolved:no-function" };
  }
  const pathCalls = callsWithinFunction(fn, sourceFile).filter((candidate) => {
    if (candidate.pos >= call.pos || !ts.isPropertyAccessExpression(candidate.expression)) return false;
    if (!PATH_METHODS.includes(candidate.expression.name.text as PathMethod)) return false;
    const candidateReceiver = resolveReceiver(
      candidate.expression.expression,
      candidate,
      acquisitions,
      functions,
      sourceFile
    );
    return candidateReceiver?.lexicalIdentity === receiver.lexicalIdentity;
  });
  const begin = [...pathCalls].reverse().find((candidate) =>
    (candidate.expression as ts.PropertyAccessExpression).name.text === "beginPath"
  );
  if (begin) {
    const operations = pathCalls.filter((candidate) => candidate.pos >= begin.pos).map((candidate) =>
      (candidate.expression as ts.PropertyAccessExpression).name.text
    );
    const beginOrdinal = pathCalls.filter((candidate) =>
      candidate.pos <= begin.pos &&
      (candidate.expression as ts.PropertyAccessExpression).name.text === "beginPath"
    ).length - 1;
    const dynamicControlFlow = pathCalls.filter((candidate) => candidate.pos >= begin.pos)
      .some((candidate) => controlFlowIdentity(candidate, sourceFile) !== controlFlowIdentity(call, sourceFile));
    return {
      anchor: `inline:${functionName(fn, sourceFile)}:begin@${beginOrdinal}`,
      family: `current-path:${operations.join(">") || "empty"}` +
        (dynamicControlFlow ? ":control-flow-dependent" : "")
    };
  }

  // A reviewed source may author a path in a helper (for example rr(ctx,...))
  // and paint it at the callsite. Resolve only a direct named helper call whose
  // Canvas parameter and path operations are statically visible.
  const helpers = callsWithinFunction(fn, sourceFile).filter((candidate) =>
    candidate.pos < call.pos && ts.isIdentifier(candidate.expression)
  );
  for (const helperCall of helpers.reverse()) {
    const helperValues = resolveFunctionValues(
      helperCall.expression.getText(sourceFile),
      helperCall,
      acquisitions,
      functions,
      sourceFile
    );
    for (const helper of helperValues) {
      const helperOps = resolvedPathOperationsForFunction(
        helper,
        receiver.contextKeys,
        acquisitions,
        functions,
        sourceFile
      );
      if (helperOps.length === 0) continue;
      const helperOrdinal = helpers.filter((candidate) =>
        candidate.pos <= helperCall.pos && candidate.expression.getText(sourceFile) === helper.name
      ).length - 1;
      return {
        anchor: `helper:${helper.key}:call@${helperOrdinal}`,
        family: `helper-path:${helper.name}:${helperOps.join(">")}`
      };
    }
  }
  return { anchor: null, family: "unresolved:current-path-origin" };
}

function findNearestPropertyWrite(
  call: ts.CallExpression,
  property: string,
  receiver: ResolvedReceiver,
  sourceFile: ts.SourceFile,
  acquisitions: readonly ContextAcquisition[],
  functions: readonly FunctionInfo[]
) {
  const fn = nearestFunction(call);
  if (!fn) return null;
  const candidates = collectNodes(fn, ts.isBinaryExpression).flatMap((binary) => {
    if (binary.pos >= call.pos || binary.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
        !ts.isPropertyAccessExpression(binary.left) || binary.left.name.text !== property) {
      return [];
    }
    const resolved = resolveReceiver(
      binary.left.expression,
      binary,
      acquisitions,
      functions,
      sourceFile
    );
    if (nearestFunction(binary) !== fn || resolved?.lexicalIdentity !== receiver.lexicalIdentity) {
      return [];
    }
    let conditional = false;
    let current: ts.Node | undefined = binary.parent;
    while (current && current !== fn) {
      if (ts.isIfStatement(current)) {
        const writeInThen = isNodeInside(binary, current.thenStatement);
        const writeInElse = !!current.elseStatement && isNodeInside(binary, current.elseStatement);
        const callInThen = isNodeInside(call, current.thenStatement);
        const callInElse = !!current.elseStatement && isNodeInside(call, current.elseStatement);
        if ((writeInThen && callInElse) || (writeInElse && callInThen)) return [];
        if ((writeInThen && !callInThen) || (writeInElse && !callInElse)) conditional = true;
      } else if ((ts.isForStatement(current) || ts.isForInStatement(current) ||
                  ts.isForOfStatement(current) || ts.isWhileStatement(current) ||
                  ts.isDoStatement(current)) && !isNodeInside(call, current)) {
        conditional = true;
      }
      current = current.parent;
    }
    return [{ conditional, write: binary }];
  }).sort((a, b) => b.write.pos - a.write.pos);
  if (candidates.length === 0) return null;
  const first = candidates[0];
  return first;
}

function resolveConstInitializer(
  expression: ts.Expression,
  before: number,
  fn: ts.FunctionLikeDeclaration,
  sourceFile: ts.SourceFile
): ts.Expression {
  if (!ts.isIdentifier(expression)) return expression;
  const declaration = findIdentifierDeclaration(expression.text, before, fn, sourceFile) ??
    findIdentifierDeclaration(expression.text, before, sourceFile, sourceFile);
  return declaration?.initializer ?? expression;
}

function rgbaAlpha(text: string) {
  const rgba = text.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\s*\)$/i);
  if (rgba) return Number(rgba[1]);
  const hex = text.match(/^#[0-9a-f]{8}$/i);
  if (hex) return Number.parseInt(text.slice(7, 9), 16) / 255;
  return 1;
}

function paintClass(
  expression: ts.Expression | null,
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  conditional = false
): CaliforniaCanvasPaintClass {
  if (!expression) return "inherited";
  if (conditional) return "dynamic";
  const fn = nearestFunction(call);
  if (!fn) return "dynamic";
  const resolved = resolveConstInitializer(expression, call.pos, fn, sourceFile);
  if (ts.isStringLiteralLike(resolved) || ts.isNoSubstitutionTemplateLiteral(resolved)) {
    return rgbaAlpha(resolved.text) < 1 ? "static-translucent" : "static-opaque";
  }
  if (ts.isCallExpression(resolved) && ts.isPropertyAccessExpression(resolved.expression) &&
      GRADIENT_FACTORIES.includes(resolved.expression.name.text as never)) {
    return "gradient";
  }
  if (ts.isIdentifier(resolved)) {
    const declaration = findIdentifierDeclaration(resolved.text, call.pos, sourceFile, sourceFile);
    if (declaration?.initializer && ts.isCallExpression(declaration.initializer) &&
        ts.isPropertyAccessExpression(declaration.initializer.expression) &&
        GRADIENT_FACTORIES.includes(declaration.initializer.expression.name.text as never)) {
      return "gradient";
    }
  }
  return "dynamic";
}

function alphaClass(
  expression: ts.Expression | null,
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  conditional = false
): CaliforniaCanvasAlphaClass {
  if (!expression) return "inherited-or-default";
  if (conditional) return "dynamic";
  const fn = nearestFunction(call);
  if (!fn) return "dynamic";
  const resolved = resolveConstInitializer(expression, call.pos, fn, sourceFile);
  if (ts.isNumericLiteral(resolved)) {
    return Number(resolved.text) >= 1 ? "static-opaque" : "static-translucent";
  }
  return "dynamic";
}

function shadowClass(
  expression: ts.Expression | null,
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  conditional = false
): CaliforniaCanvasShadowClass {
  if (!expression) return "inherited-or-default";
  if (conditional) return "dynamic";
  const fn = nearestFunction(call);
  if (!fn) return "dynamic";
  const resolved = resolveConstInitializer(expression, call.pos, fn, sourceFile);
  if (ts.isNumericLiteral(resolved)) {
    return Number(resolved.text) > 0 ? "static-active" : "static-none";
  }
  return "dynamic";
}

function siteIdentity(site: Omit<CaliforniaCanvasPaintSite,
  "authoredPathGroupKey" | "expectedIdentitySha256" | "role" | "roleRationale" | "sourceSiteKey"
>) {
  return sha256(JSON.stringify({
    alphaClass: site.alphaClass,
    alphaExpression: site.alphaExpression,
    argumentText: site.argumentText,
    benchId: site.benchId,
    canvasContextKeys: site.canvasContextKeys,
    colorAlphaClass: site.colorAlphaClass,
    controlFlowIdentity: site.controlFlowIdentity,
    lexicalContextIdentity: site.lexicalContextIdentity,
    operation: site.operation,
    operationOrdinal: site.operationOrdinal,
    paintExpression: site.paintExpression,
    pathFamily: site.pathFamily,
    shadowClass: site.shadowClass,
    shadowExpression: site.shadowExpression,
    sourcePath: site.sourcePath,
    sourceText: site.sourceText,
    terminalOrdinal: site.terminalOrdinal
  }));
}

function validateRoleRegistry(
  paintSites: readonly CaliforniaCanvasPaintSite[],
  roleRegistry: Readonly<Record<string, CaliforniaCanvasRoleRegistryEntry>>
) {
  const sites = new Map(paintSites.map((site) => [site.sourceSiteKey, site]));
  for (const [key, entry] of Object.entries(roleRegistry)) {
    const site = sites.get(key);
    if (!site) throw new Error(`California Canvas graphics role registry has stale/unknown key: ${key}`);
    if (entry.expectedIdentitySha256 !== site.expectedIdentitySha256) {
      throw new Error(
        `California Canvas graphics role registry identity lie at ${key}: ` +
        `${entry.expectedIdentitySha256} != ${site.expectedIdentitySha256}`
      );
    }
    if (entry.claim === "full-canvas-background") {
      if (entry.role !== "background" || site.operation !== "fillRect" ||
          site.argumentText.join(",") !== "0,0,W,H") {
        throw new Error(`California Canvas background registry claim is not an exact full-canvas fillRect: ${key}`);
      }
    } else if (entry.role !== "decorative") {
      throw new Error(`California Canvas decoration registry claim has the wrong role: ${key}`);
    }
  }
}

/**
 * The only non-essential paint classifications. Each entry is keyed to the
 * exact generated source identity; a stale key or changed source is fatal.
 */
export const CALIFORNIA_CANVAS_GRAPHICS_ROLE_REGISTRY: Readonly<
  Record<string, CaliforniaCanvasRoleRegistryEntry>
> = {
  "ComparingLab/context:ComparingLab/canvasRef/g@0/terminal@0/stroke@0:c50eed5c517825fa": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "c50eed5c517825fae5156b94e8ed0525af7e6c31024552520623ecf316a4cbca",
    rationale: "ComparingLab explicitly presents this quadrille as faint paper decoration",
    role: "decorative"
  },
  "ComparingLab/context:ComparingLab/canvasRef/g@0/terminal@1/fill@0:df27e1e90d31aff2": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "df27e1e90d31aff2f2ed064b75e110114577edddfa9ecdf9856e540451a81568",
    rationale: "the track wash is a tint; the proportional bar fill and labels carry the shared scale",
    role: "decorative"
  },
  "ComposingShapesLab/context:ComposingShapesLab/canvasRef/ctx@0/terminal@0/stroke@0:a246395ccec895e0": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a246395ccec895e0becdd62e902d178f674a10c89d215797f38bd539354e22c6",
    rationale: "the isometric lattice is explicitly paper texture rather than a shape or seam",
    role: "decorative"
  },
  "ComposingShapesLab/context:ComposingShapesLab/canvasRef/ctx@0/terminal@1/fillRect@0:0b9bd43fc5bfd637": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "0b9bd43fc5bfd63703455630c7c6e090bd6002d9b9e63fc47765a46d91b84392",
    rationale: "the label paper backing only keeps terminal text legible over the lattice",
    role: "decorative"
  },
  "ComposingShapesLab/context:ComposingShapesLab/canvasRef/ctx@0/terminal@2/fill@0:3f433f177af8545a": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "3f433f177af8545adc3225ad8eab6d78f2ab523b2a1899b69ed8e3903a8b3ff1",
    rationale: "the challenge target tint is redundant to its independently essential dashed outline",
    role: "decorative"
  },
  "ComposingShapesLab/context:ComposingShapesLab/canvasRef/ctx@0/terminal@4/fill@1:075bb79abe8759bb": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "075bb79abe8759bb7c734a05fd2415dde217250cd954effa4cd5dedbd566f1ee",
    rationale: "piece tints are redundant to the essential piece seams and group outlines",
    role: "decorative"
  },
  "ComposingShapesLab/context:ComposingShapesLab/canvasRef/ctx@0/terminal@7/fill@2:a8d091326d7129ac": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a8d091326d7129ace2792c93dd9035236028325c0b149f26a8f73b6c67813154",
    rationale: "the translucent selection halo decorates the independently essential carmine handle",
    role: "decorative"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@0/fillRect@0:8e8331326583793b": {
    claim: "full-canvas-background",
    expectedIdentitySha256:
      "8e8331326583793bc24fbfdd7920bd843e9924dc811381fa8ca0aab94220af2e",
    rationale: "CountingLab explicitly labels this full-canvas K wash as non-semantic",
    role: "background"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@1/stroke@0:a6006a0dbf7f31f1": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a6006a0dbf7f31f1baa2dbe5becb4df15978016939f9e3d5f714cd112342149c",
    rationale: "CountingLab's faint quadrille is an explicitly non-semantic paper backdrop",
    role: "decorative"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@5/fill@2:f6f44dee497e2cfa": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "f6f44dee497e2cfa95298da6c9f69ea490834b1386155cfa2970a178c3fb1139",
    rationale: "the counter highlight is an explicitly subtle physical-object decoration",
    role: "decorative"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@6/stroke@2:e595f5834a4e45f9": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "e595f5834a4e45f9ffa9e239549f97b69ddfe8de1b3ab2ea474cbf5aee7f75bf",
    rationale: "the apple stem is a fruit detail; the filled disc remains the countable unit",
    role: "decorative"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@7/fill@3:af0cc6999e1983c2": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "af0cc6999e1983c2c6355c4ecee68e135810f709672e950f4cb1bbf571a3da4a",
    rationale: "the apple leaf is a fruit detail; the filled disc remains the countable unit",
    role: "decorative"
  },
  "CountingLab/context:CountingLab/canvasRef/ctx@0/terminal@8/fill@4:9f0b362fcc459dd7": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "9f0b362fcc459dd72fa6743aa0470e6423f8117a8625cd7e0805c53cf2d20ebf",
    rationale: "the berry calyx is a fruit detail; the filled disc remains the countable unit",
    role: "decorative"
  },
  "HundredChartLab/context:HundredChartLab/canvasRef/ctx@0/terminal@0/stroke@0:15a1b072270fe749": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "15a1b072270fe74958e6703e0d8fc9065f83496fe49401285bd6e128b58a9b0d",
    rationale: "HundredChartLab's outer quadrille is paper decoration, not the chart grid",
    role: "decorative"
  },
  "HundredChartLab/context:HundredChartLab/canvasRef/ctx@0/terminal@2/fill@1:7c6c91df09f6865f": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "7c6c91df09f6865f777cb84af52db23073954f4e4540eaad8817d7fe3c4e5a1c",
    rationale: "the said-cell wash is a tint; its new carmine edge carries the state",
    role: "decorative"
  },
  "LengthComparisonLab/context:LengthComparisonLab/canvasRef/ctx@0/terminal@0/stroke@0:0feb8487cd81a305": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "0feb8487cd81a305923a3e4a5a08c6469236ae6d519f8b817f781d9f451f464d",
    rationale: "LengthComparisonLab explicitly presents the quadrille as paper decoration",
    role: "decorative"
  },
  "LengthComparisonLab/context:LengthComparisonLab/canvasRef/ctx@0/terminal@2/stroke@2:38220df32e7ef29a": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "38220df32e7ef29aaa0e6f276c71cea64fde5d8352eb064e4f5d01923f84ea25",
    rationale: "the faint shelves only organize strips whose fills and shared start line carry the comparison",
    role: "decorative"
  },
  "LengthComparisonLab/context:LengthComparisonLab/canvasRef/ctx@0/terminal@4/fill@1:50101dc47ecefe2b": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "50101dc47ecefe2bebf0452a4b810e2c78ebe451c1764c202bd76e9945b1bc80",
    rationale: "the translucent rod highlight is a material cue redundant to the essential colored rod",
    role: "decorative"
  },
  "LengthComparisonLab/context:LengthComparisonLab/canvasRef/ctx@0/terminal@5/fill@2:a59f12853486d2d0": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a59f12853486d2d0072936d35d532c860f2ac86123b22d8277168a1fec555a4f",
    rationale: "the calibration badge paper backing is redundant to its dark outline and terminal text",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@0/stroke@0:a3a1fdf016f0acfd": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a3a1fdf016f0acfda4090a30600112cf4dbc0bd5f18e27bdb0c2a87dad7395c2",
    rationale: "NumberBondLab explicitly describes this quadrille as paper only",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@2/fill@0:585baa85e2425af2": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "585baa85e2425af2247ff5aeca506eb26e87c3191f3f1a076ae500821b2c1f19",
    rationale: "bubble tints are redundant to the exact edge colours, positions, and labels",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@4/fillRect@0:58083238c5e0933b": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "58083238c5e0933b5c84c2bc32959e70d892e1515988896fe6b5f58e9e4677f2",
    rationale: "the tray paper wash is a surface tint; the tray outline carries the whole",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@7/fill@1:c0d390cd02f93241": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "c0d390cd02f93241e3cf222382ff63ce80feaacf85463b14b19e31d9cf797579",
    rationale: "counter tints are redundant to the strengthened group-colour outlines",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@10/fillRect@1:0689e1258c31bfb8": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "0689e1258c31bfb82edf10bd341c8dab2935c5c3cd90b325e358b08189f1ca0d",
    rationale: "the paper gap only clears pixels behind the independently essential cut line",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@14/fillRect@2:acdb63bed26e4f7b": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "acdb63bed26e4f7b5bc69f0c7fa1c91624453aa5237d3f1300feac76eb5e0d4b",
    rationale: "the current-row wash is redundant to the cut mark and bold exact equation",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@16/fillRect@3:881794a298f93374": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "881794a298f93374ce9a8a329a5ec19b86ffe9dc41b7bfd63ff7e62b94a0d6fc",
    rationale: "the carmine bar tint is redundant to its dark outline, cut position, and exact equation",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@18/fillRect@4:a5897719a498b3c2": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a5897719a498b3c2bb998a52d83b128a85f565479eb40034b2e8232cbc7ed0af",
    rationale: "the blue bar tint is redundant to its dark outline, cut position, and exact equation",
    role: "decorative"
  },
  "NumberBondLab/context:NumberBondLab/canvasRef/ctx@0/terminal@20/stroke@8:b6ff3e15dab5536c": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "b6ff3e15dab5536c833de04003defaffeb072726bd8a096b73be6869fb75d666",
    rationale: "the paper separation halo only clears both bar outlines behind the independently essential cut line",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@0/stroke@0:9248abe710b6c635": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "9248abe710b6c6358eabfd68bd3876c248ef0a09017f75f1fa5ff6a399d218f5",
    rationale: "the vertical quadrille is house paper rather than a coordinate axis or position relation",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@1/stroke@1:bf80c4ff96b2de73": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "bf80c4ff96b2de73c237864a13888575f128c20ccaa5745c1ae817505f23e408",
    rationale: "the horizontal quadrille is house paper rather than a coordinate axis or position relation",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@2/fill@0:e04f520f037f3ecb": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "e04f520f037f3ecbc2853044b84f8839e82aae65e39cb6850ad4b885af02c552",
    rationale: "the shelf tint is redundant to its independently essential dark outline",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@4/fill@1:a986e3675e35d93f": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a986e3675e35d93f4b1324f877665d6d14579fbcb555020b8a8dfcd733f279d4",
    rationale: "the crate tint is redundant to its independently essential dark outline and occlusion",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@6/stroke@4:af0eb3ecdd464d5c": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "af0eb3ecdd464d5ca3f7d7e1811de69461b19c1c0a6f6df885663ccca636f81d",
    rationale: "the crate lid cue decorates a box already carried by its essential outer outline",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@7/fill@2:8735a44b183d6da6": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "8735a44b183d6da61a9b85b22fec80813fe5d2ac8240732c97f25a7f64136317",
    rationale: "the ball tint is redundant to its strengthened essential circular outline and exact position",
    role: "decorative"
  },
  "PositionLab/context:PositionLab/canvasRef/ctx@0/terminal@9/fill@3:b056c401066a8c66": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "b056c401066a8c6628984a678e82c1cad0964712ea60229517f6f4a73d2f0a60",
    rationale: "the ball highlight is a material cue redundant to its essential outline",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@0/stroke@0:6c7e782330e11dd5": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "6c7e782330e11dd583015cda2cb128005b4cc2bb49c654d725a9dbf80a8f738a",
    rationale: "the vertical quadrille is explicitly paper texture and not a coordinate plane",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@1/stroke@1:b445bd77c123cfb6": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "b445bd77c123cfb629635db9f629a483033c7928053ccb072c66e5d7c51d0893",
    rationale: "the horizontal quadrille is explicitly paper texture and not a coordinate plane",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@3/stroke@3:bfe1d5213dfc1f9e": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "bfe1d5213dfc1f9e87e93c260122a08f4fca5a1b9bb3fa8ef83b69b626651b93",
    rationale: "the legend swatch only keys terminal text to the independently essential ghost outline",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@4/fill@0:dd4c7cb7b0df0699": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "dd4c7cb7b0df0699ddf53441a7a21ce45d29381dc8ebbf7b8a1c9d2c11b1879f",
    rationale: "the challenge card backing only separates its essential target outline from the paper",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@5/stroke@4:a7cc6f29ce2ac9db": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "a7cc6f29ce2ac9db1417c378f813d7504e1f42d47c6b3afb01c6665c49707ad6",
    rationale: "the challenge card border is furniture around the independently essential target shape",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@7/fill@1:387dee69823a5432": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "387dee69823a5432bb012379f01f9cd3aa0e24b3716520d00632dc4e3164bce4",
    rationale: "the lab defines fill as a non-defining noise dial; the carmine outline carries the shape",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@12/fill@3:9bfcd4d6ab5e74a8": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "9bfcd4d6ab5e74a89b827453a2a5ab6f3a4ebce0035f501e25336a3d9f11f5c1",
    rationale: "the white point backing is redundant to its essential blue outline",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@15/fill@4:6f92a1b76cff7d32": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "6f92a1b76cff7d323f5dec6bb1e69492f64a6d8d0abe2b97a3c4cefdea807703",
    rationale: "the diamond callout backing only protects separately audited terminal text",
    role: "decorative"
  },
  "ShapesLab/context:ShapesLab/canvasRef/ctx@0/terminal@16/stroke@11:06e73837dd2a8912": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "06e73837dd2a8912875fc7b8fbb6dbd3cc9cf5536e5c6248a10810a887dddb10",
    rationale: "the diamond callout border is furniture around separately audited terminal text",
    role: "decorative"
  },
  "SortLab/context:SortLab/canvasRef/ctx@0/terminal@0/stroke@0:3b8f80882b1cf7a6": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "3b8f80882b1cf7a6235f4396d1d5c4f9de0f62a91ddab79f194694f6a1dfbf8a",
    rationale: "SortLab explicitly presents this quadrille as a faint paper backdrop",
    role: "decorative"
  },
  "SortLab/context:SortLab/canvasRef/ctx@0/terminal@1/fill@0:d1b12d62f4b81ae8": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "d1b12d62f4b81ae84401d2612a5b8699bc6be0eb1f202edd51c3ceeb3c1f076d",
    rationale: "the tray wash is redundant to its strengthened essential dashed boundary",
    role: "decorative"
  },
  "SortLab/context:SortLab/canvasRef/ctx@0/terminal@3/fill@1:9b9f373e09164bd9": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "9b9f373e09164bd91c2581539096c16632acedd3db48d44dab323ca94981d4dc",
    rationale: "the white bin backing is redundant to its essential boundary and header",
    role: "decorative"
  },
  "SortLab/context:SortLab/canvasRef/ctx@0/terminal@4/fill@2:3f14180976656849": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "3f141809766568494b5094208461ca5d128e5fb93fe892997088f5a74dffa3e6",
    rationale: "the focus wash is redundant to the strengthened carmine or ink-soft bin boundary",
    role: "decorative"
  },
  "SortLab/context:SortLab/canvasRef/ctx@0/terminal@6/stroke@3:df6e6ff4ffe44cf7": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "df6e6ff4ffe44cf748fb656ac0c626e5991e3f7ddbefa8540c7a373718a67e00",
    rationale: "the faint header divider is furniture inside an essential outlined bin",
    role: "decorative"
  },
  "SortLab/parameter:drawObject@0:0:ctx/terminal@0/fill@0:e410c863371544ce": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "e410c863371544ce56412c4e45438d06353cf78397b9a2e0a605ab44c7318a1a",
    rationale: "the object tint duplicates the same category color carried by its strengthened outline",
    role: "decorative"
  },
  "SortLab/parameter:drawObject@0:0:ctx/terminal@2/fill@1:3f3adc5e47a615ea": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "3f3adc5e47a615ea92298b4cdb0e972db5b71fb0565821a1cd5e7eed724eb63e",
    rationale: "the glossy object highlight is a material cue redundant to the essential outline",
    role: "decorative"
  },
  "SortLab/parameter:drawBinGlyph@0:0:ctx/terminal@0/fill@0:64793196ac0b6e72": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "64793196ac0b6e72d6dee12b2c2af5f4cbeb056cfec5c2934039db568124367d",
    rationale: "the bin glyph tint duplicates the same category color carried by its essential outline",
    role: "decorative"
  },
  "StoryProblemLab/context:StoryProblemLab/canvasRef/ctx@0/terminal@0/fill@0:d9faa4bfe1ccc125": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "d9faa4bfe1ccc12552a26411b032563890c95445e900c54fd35982d3625fe2f4",
    rationale: "the pond is scene-setting background; duck bodies are the countable objects",
    role: "decorative"
  },
  "StoryProblemLab/context:StoryProblemLab/canvasRef/ctx@0/terminal@1/stroke@0:eb8aeab799fb27c0": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "eb8aeab799fb27c048882a42b1a24aa157df7e6f497f41f547f924d72fe2b1bb",
    rationale: "water ripples only identify the decorative pond scene",
    role: "decorative"
  },
  "StoryProblemLab/context:StoryProblemLab/canvasRef/ctx@0/terminal@4/fill@3:025b68a89886f1e8": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "025b68a89886f1e874925d4b8b2a6d94561c1eb3d1ce1f84f3504a50799a4a0b",
    rationale: "the beak is a cartoon detail inside an already countable duck body",
    role: "decorative"
  },
  "StoryProblemLab/context:StoryProblemLab/canvasRef/ctx@0/terminal@5/fill@4:d78c50269731b87a": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "d78c50269731b87a012e3d112bee2c9413977b65b1c98717137368c985fa9fa0",
    rationale: "the eye is a cartoon detail inside an already countable duck body",
    role: "decorative"
  },
  "StoryProblemLab/context:StoryProblemLab/canvasRef/ctx@0/terminal@6/fill@5:ebfe65176672f580": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "ebfe65176672f5804fea33e4527d62fe5aaa871d8e67b7d26377e785d62c9778",
    rationale: "the eye highlight is a cartoon detail inside an already countable duck body",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@0/stroke@0:fdc6cb13a07e75d5": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "fdc6cb13a07e75d563b329f8ded74ba79b5c89885b5a54efe5f48bb43e56eaff",
    rationale: "SubtractionLab's quadrille is a faint graph-paper backdrop",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@3/stroke@2:c6ea6a11c0cb3c86": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "c6ea6a11c0cb3c86c3d54742b158b438efa6b2bf52ba6f21c8e92978bdf3ab02",
    rationale: "the kept-counter edge is redundant to the essential carmine counter fill",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@4/fill@1:f5b1fa2bbdbc3ff8": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "f5b1fa2bbdbc3ff84587f50e6185aa66ae5e0d37b5e0b0bdd0e62de626ab5eca",
    rationale: "the taken-away tint is redundant to its strengthened dashed edge and slash",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@13/fill@4:7d554421c7133e86": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "7d554421c7133e86509fda8a542bce2fb09a4beb3d4bed66bae55aecdb2b7261",
    rationale: "the ghost flag tint is redundant to its essential outline and landing stem",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@17/fill@5:8fe714651fa9add2": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "8fe714651fa9add2fc1b946c949c72c66f7a261387804b49826b57a6711ff6c1",
    rationale: "the start marker's paper interior is redundant to its essential ink ring",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@20/stroke@13:b54e6a169c12a847": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "b54e6a169c12a8472e0f75d0defffde42ee462181c860ae6bc8d15092e913d4c",
    rationale: "the landing marker's paper edge is redundant to its essential carmine fill",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@22/stroke@14:40e25b2e9c803de6": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "40e25b2e9c803de6365b71a025d2d4a5e7aab481dc92e705b06d4bec05beb6c8",
    rationale: "the animated token's paper edge is redundant to its essential carmine fill",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@24/fillRect@0:895fbb342821af29": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "895fbb342821af29eeaae04d967663b203165a4f4b222fc20f84a78a93f31ac2",
    rationale: "the paper rectangles are only backdrops for independently audited terminal number-line text",
    role: "decorative"
  },
  "SubtractionLab/context:SubtractionLab/canvasRef/ctx@0/terminal@25/fillRect@1:e0ce5bd90a74be33": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "e0ce5bd90a74be3385c713d510771f9c4624f8450421afc6daa1a9997d1997b0",
    rationale: "the queued paper chips are only backdrops for independently audited terminal labels",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@0/stroke@0:f0700728f52d1d45": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "f0700728f52d1d453589039741dd49ec041ba3b92135c2a31b44581929482562",
    rationale: "TeenNumbersLab's quadrille is a paper backdrop",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@1/fill@0:026b5cdc5ae346a4": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "026b5cdc5ae346a482d6799daa442dc7d9dcb5a311e4f09f59f5d2d968ca3de7",
    rationale: "word-chip tint is decoration behind independently audited text",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@2/stroke@1:02a40b542344c51c": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "02a40b542344c51cbd0c229537303c8b70230c3f01f1a1b8038700973b1ab3ad",
    rationale: "word-chip edging is decoration around independently audited text",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@3/fill@1:fb8b9010076d20ce": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "fb8b9010076d20ce1dc44b1db63476f684a1e82696db715a7f65da7c6ee14330",
    rationale: "digit-box tint is redundant to the essential border and numeral",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@5/stroke@3:ac09b34e5f7a2fb3": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "ac09b34e5f7a2fb33db515b5b1536c5e35380e05ae38400e6bf7b2f0c82349eb",
    rationale: "the white bridge only clears pixels beneath the essential crossing arrow",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@9/stroke@5:1136a62d2a049a06": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "1136a62d2a049a0600b53577f79febf666a9539744aae07cac7aba15feb7e422",
    rationale: "pill edging is redundant to the essential filled ten and its label",
    role: "decorative"
  },
  "TeenNumbersLab/context:TeenNumbersLab/canvasRef/ctx@0/terminal@10/fill@4:4fdbc6bb4ef926de": {
    claim: "non-semantic-decoration",
    expectedIdentitySha256:
      "4fdbc6bb4ef926dedd4319302e396c847d6066a264978b02e78f154898c61c5f",
    rationale: "dot fill colour is redundant to the strengthened essential one-unit outline",
    role: "decorative"
  }
};

export function analyzeCaliforniaCanvasGraphicsSource({
  benchId,
  roleRegistry = {},
  source,
  sourcePath
}: AnalyzeSourceOptions): SourceAnalysis {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX
  );
  const parseDiagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  if (parseDiagnostics.length > 0) {
    throw new Error(`${sourcePath}: JSX parse failed with ${parseDiagnostics.length} diagnostic(s)`);
  }
  if (/\b(?:new\s+)?Path2D\b/.test(source)) {
    throw new Error(`${sourcePath}: unsupported Path2D source detected`);
  }

  const functions = collectFunctions(sourceFile);
  const canvases = jsxCanvasRefs(sourceFile);
  const acquisitions = collectContextAcquisitions(
    benchId,
    sourcePath,
    sourceFile,
    canvases
  );
  const census = emptyCensus();
  const gradientBindings = new Map<string, { contextKeys: readonly string[]; lexicalIdentity: string }>();

  for (const declaration of collectNodes(sourceFile, ts.isVariableDeclaration)) {
    const initializer = declaration.initializer;
    if (!initializer || !ts.isCallExpression(initializer) ||
        !ts.isPropertyAccessExpression(initializer.expression) ||
        !GRADIENT_FACTORIES.includes(initializer.expression.name.text as never)) continue;
    const receiver = resolveReceiver(
      initializer.expression.expression,
      initializer,
      acquisitions,
      functions,
      sourceFile
    );
    if (!receiver || !ts.isIdentifier(declaration.name)) continue;
    gradientBindings.set(declaration.name.text, receiver);
  }

  const canvasAliases = new Map(acquisitions.map((item) => [item.canvasAlias, item]));
  for (const binary of collectNodes(sourceFile, ts.isBinaryExpression)) {
    if (binary.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
        !ts.isPropertyAccessExpression(binary.left)) continue;
    const property = binary.left.name.text;
    if (ts.isIdentifier(binary.left.expression)) {
      const canvas = canvasAliases.get(binary.left.expression.text);
      if (canvas && (property === "width" || property === "height")) {
        bump(census.canvasPropertyWrites, property);
        continue;
      }
    }
    const receiver = resolveReceiver(
      binary.left.expression,
      binary,
      acquisitions,
      functions,
      sourceFile
    );
    if (!receiver) continue;
    if (UNSUPPORTED_CONTEXT_PROPERTIES.has(property)) {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, binary)} unsupported Canvas state property ${property}`
      );
    }
    if (!CONTEXT_PROPERTY_WRITES.includes(property as never)) {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, binary)} uncensused Canvas state property ${property}`
      );
    }
    bump(census.contextPropertyWrites, property);
  }

  const animationCalls = collectNodes(sourceFile, ts.isCallExpression).filter((call) =>
    ts.isIdentifier(call.expression) &&
    (call.expression.text === "requestAnimationFrame" || call.expression.text === "cancelAnimationFrame")
  );
  for (const call of animationCalls) bump(census.animationMethods, (call.expression as ts.Identifier).text);

  const rawPaintSites: Array<CaliforniaCanvasPaintSite & { pathAnchor: string | null }> = [];
  const clearEpochSites: CaliforniaCanvasClearEpochSite[] = [];
  const clipSites: CaliforniaCanvasClipSite[] = [];
  const operationOrdinals = new Map<string, number>();
  const terminalOrdinals = new Map<string, number>();

  for (const call of collectNodes(sourceFile, ts.isCallExpression)) {
    if (!ts.isPropertyAccessExpression(call.expression)) continue;
    const method = call.expression.name.text;
    if (method === "addColorStop" && ts.isIdentifier(call.expression.expression) &&
        gradientBindings.has(call.expression.expression.text)) {
      bump(census.gradientMethods, method);
      continue;
    }
    const receiver = resolveReceiver(
      call.expression.expression,
      call,
      acquisitions,
      functions,
      sourceFile
    );
    if (!receiver) continue;
    if (UNSUPPORTED_CONTEXT_METHODS.has(method)) {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, call)} unsupported Canvas API ${method}`
      );
    }
    if (PATH_METHODS.includes(method as never)) {
      bump(census.pathMethods, method);
      continue;
    }
    if (TEXT_METHODS.includes(method as never)) {
      bump(census.textMethods, method);
      continue;
    }
    if (CLEAR_METHODS.includes(method as never)) {
      bump(census.clearMethods, method);
      const clearOrdinal = clearEpochSites.filter((site) =>
        site.lexicalContextIdentity === receiver.lexicalIdentity
      ).length;
      const clearIdentity = sha256(JSON.stringify({
        canvasContextKeys: receiver.contextKeys,
        lexicalContextIdentity: receiver.lexicalIdentity,
        method,
        ordinal: clearOrdinal,
        sourceText: normalizeSourceText(call.getText(sourceFile))
      }));
      clearEpochSites.push({
        canvasContextKeys: receiver.contextKeys,
        lexicalContextIdentity: receiver.lexicalIdentity,
        sourceLine: sourceLine(sourceFile, call),
        sourcePath,
        sourceSiteKey: `${benchId}/${receiver.lexicalIdentity}/clearRect@${clearOrdinal}:` +
          clearIdentity.slice(0, 16),
        sourceText: normalizeSourceText(call.getText(sourceFile))
      });
      continue;
    }
    if (STATE_METHODS.includes(method as never)) {
      bump(census.stateMethods, method);
      continue;
    }
    if (GRADIENT_FACTORIES.includes(method as never)) {
      bump(census.gradientMethods, method);
      continue;
    }
    if (CLIP_METHODS.includes(method as never)) {
      if (call.arguments.length > 1 || (call.arguments.length === 1 &&
          !(ts.isStringLiteralLike(call.arguments[0]) &&
            (call.arguments[0].text === "evenodd" || call.arguments[0].text === "nonzero")))) {
        throw new Error(
          `${sourcePath}:${sourceLine(sourceFile, call)} unsupported arbitrary clip argument family`
        );
      }
      bump(census.clipMethods, method);
      const path = pathInformation(call, receiver, sourceFile, acquisitions, functions);
      clipSites.push({
        canvasContextKeys: receiver.contextKeys,
        lexicalContextIdentity: receiver.lexicalIdentity,
        pathFamily: path.family,
        sourceLine: sourceLine(sourceFile, call),
        sourcePath,
        sourceText: normalizeSourceText(call.getText(sourceFile))
      });
      continue;
    }
    if (!TERMINAL_GRAPHICS_METHODS.includes(method as never)) {
      throw new Error(
        `${sourcePath}:${sourceLine(sourceFile, call)} uncensused Canvas context method ${method}`
      );
    }
    if ((method === "fill" || method === "stroke") && call.arguments.length > 0) {
      const acceptedFillRule = method === "fill" && call.arguments.length === 1 &&
        ts.isStringLiteralLike(call.arguments[0]) &&
        (call.arguments[0].text === "evenodd" || call.arguments[0].text === "nonzero");
      if (!acceptedFillRule) {
        throw new Error(
          `${sourcePath}:${sourceLine(sourceFile, call)} unsupported ${method} argument (Path2D/object paint is forbidden)`
        );
      }
    }
    bump(census.terminalGraphicsMethods, method);
    const operation = method as CaliforniaCanvasTerminalOperation;
    const ordinalKey = `${receiver.lexicalIdentity}:${operation}`;
    const operationOrdinal = operationOrdinals.get(ordinalKey) ?? 0;
    operationOrdinals.set(ordinalKey, operationOrdinal + 1);
    const terminalOrdinal = terminalOrdinals.get(receiver.lexicalIdentity) ?? 0;
    terminalOrdinals.set(receiver.lexicalIdentity, terminalOrdinal + 1);
    const styleProperty = operation.startsWith("fill") ? "fillStyle" : "strokeStyle";
    const paintWrite = findNearestPropertyWrite(
      call,
      styleProperty,
      receiver,
      sourceFile,
      acquisitions,
      functions
    );
    const alphaWrite = findNearestPropertyWrite(
      call,
      "globalAlpha",
      receiver,
      sourceFile,
      acquisitions,
      functions
    );
    const shadowWrite = findNearestPropertyWrite(
      call,
      "shadowBlur",
      receiver,
      sourceFile,
      acquisitions,
      functions
    );
    const pathInfo = operation === "fillRect" || operation === "strokeRect"
      ? { anchor: null, family: "direct-rect" }
      : pathInformation(call, receiver, sourceFile, acquisitions, functions);
    const base = {
      alphaClass: alphaClass(
        alphaWrite?.write.right ?? null,
        call,
        sourceFile,
        alphaWrite?.conditional
      ),
      alphaExpression: alphaWrite
        ? normalizeSourceText(alphaWrite.write.right.getText(sourceFile))
        : null,
      argumentText: call.arguments.map((argument) => normalizeSourceText(argument.getText(sourceFile))),
      authoredPathGroupKey: null,
      benchId,
      canvasContextKeys: receiver.contextKeys,
      colorAlphaClass: paintClass(
        paintWrite?.write.right ?? null,
        call,
        sourceFile,
        paintWrite?.conditional
      ),
      controlFlowIdentity: controlFlowIdentity(call, sourceFile),
      expectedIdentitySha256: "",
      lexicalContextIdentity: receiver.lexicalIdentity,
      operation,
      operationOrdinal,
      paintExpression: paintWrite
        ? normalizeSourceText(paintWrite.write.right.getText(sourceFile))
        : null,
      pathAnchor: pathInfo.anchor,
      pathFamily: pathInfo.family,
      role: "essential" as const,
      roleRationale: "default: learner-visible mathematical graphics require runtime evidence",
      shadowClass: shadowClass(
        shadowWrite?.write.right ?? null,
        call,
        sourceFile,
        shadowWrite?.conditional
      ),
      shadowExpression: shadowWrite
        ? normalizeSourceText(shadowWrite.write.right.getText(sourceFile))
        : null,
      sourceLine: sourceLine(sourceFile, call),
      sourcePath,
      sourceSiteKey: "",
      sourceText: normalizeSourceText(call.getText(sourceFile)),
      terminalOrdinal
    };
    const identity = siteIdentity(base);
    rawPaintSites.push({
      ...base,
      expectedIdentitySha256: identity,
      sourceSiteKey:
        `${benchId}/${receiver.lexicalIdentity}/terminal@${terminalOrdinal}/${operation}@${operationOrdinal}:` +
        identity.slice(0, 16)
    });
  }

  // Group only fill+stroke calls which share a statically identical path
  // anchor, family, and control-flow identity. Rect APIs are never inferred as
  // one object merely because their coordinates happen to look alike.
  const groupCandidates = new Map<string, typeof rawPaintSites>();
  for (const site of rawPaintSites) {
    if (!site.pathAnchor || (site.operation !== "fill" && site.operation !== "stroke")) continue;
    const key = [
      site.lexicalContextIdentity,
      site.pathAnchor,
      site.pathFamily,
      site.controlFlowIdentity
    ].join("\0");
    const group = groupCandidates.get(key) ?? [];
    group.push(site);
    groupCandidates.set(key, group);
  }
  for (const [identity, sites] of groupCandidates) {
    const operations = new Set(sites.map((site) => site.operation));
    if (operations.has("fill") && operations.has("stroke")) {
      const groupKey = `authored-path:${sha256(identity).slice(0, 20)}`;
      for (const site of sites) site.authoredPathGroupKey = groupKey;
    }
  }

  validateRoleRegistry(rawPaintSites, roleRegistry);
  const paintSites = rawPaintSites.map(({ pathAnchor: _pathAnchor, ...site }) => {
    const entry = roleRegistry[site.sourceSiteKey];
    return entry ? {
      ...site,
      role: entry.role,
      roleRationale: entry.rationale
    } : site;
  });

  const unresolvedFamilies = [
    ...paintSites.filter((site) => site.pathFamily.startsWith("unresolved:")).map((site) =>
      `${site.sourcePath}:${site.sourceLine}:${site.sourceSiteKey}`
    ),
    ...clipSites.filter((site) => site.pathFamily.startsWith("unresolved:")).map((site) =>
      `${site.sourcePath}:${site.sourceLine}:clip`
    )
  ];
  if (unresolvedFamilies.length > 0) {
    throw new Error(
      "California Canvas current-path origin is unresolved: " + unresolvedFamilies.join(", ")
    );
  }
  for (const acquisition of acquisitions) {
    const epochs = clearEpochSites.filter((site) => site.canvasContextKeys.includes(acquisition.key));
    if (epochs.length !== 1) {
      throw new Error(
        `${sourcePath}: Canvas context ${acquisition.key} has ${epochs.length} clearRect epochs; ` +
        "expected exactly one full-redraw epoch"
      );
    }
  }

  return {
    apiCensus: census,
    bindings: acquisitions.map(({ declaration: _declaration, scope: _scope, ...binding }) => binding),
    clearEpochSites,
    clipSites,
    paintSites
  };
}

function reachableBenchIds() {
  return [...new Set(Object.values(signatureLabAssignments).flatMap((assignment) => [
    assignment.primary,
    ...(assignment.related ?? [])
  ]))].sort() as SignatureLabId[];
}

function canonicalContract(contract: Omit<CaliforniaCanvasGraphicsSourceContract, "contractSha256">) {
  return {
    apiCensus: contract.apiCensus,
    bindings: contract.bindings,
    clearEpochSites: contract.clearEpochSites,
    clipSites: contract.clipSites,
    counts: contract.counts,
    paintSites: contract.paintSites,
    runtimePrerequisites: contract.runtimePrerequisites,
    schemaVersion: contract.schemaVersion,
    sourceSha256: contract.sourceSha256,
    sources: contract.sources
  };
}

function deepFreezeContractValue<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreezeContractValue(child);
  }
  return Object.freeze(value);
}

export function buildCaliforniaCanvasGraphicsSourceContract(
  projectRoot = resolveCaliforniaSignatureFrozenSourceRoot(),
  roleRegistry: Readonly<Record<string, CaliforniaCanvasRoleRegistryEntry>> =
    CALIFORNIA_CANVAS_GRAPHICS_ROLE_REGISTRY
): CaliforniaCanvasGraphicsSourceContract {
  const sources = reachableBenchIds().map((benchId) => {
    const sourcePath = path.posix.join(
      "components/visualizations/signature",
      `${benchId}.jsx`
    );
    const source = readFileSync(path.join(projectRoot, sourcePath), "utf8");
    return { benchId, source, sourcePath, sourceSha256: sha256(source) };
  });
  const sourceSha256 = sha256(sources.map((source) =>
    `${source.benchId}\0${source.sourceSha256}`
  ).join("\n"));
  const census = emptyCensus();
  const bindings: CaliforniaCanvasBinding[] = [];
  const clearEpochSites: CaliforniaCanvasClearEpochSite[] = [];
  const clipSites: CaliforniaCanvasClipSite[] = [];
  const paintSites: CaliforniaCanvasPaintSite[] = [];
  for (const source of sources) {
    const sourceRoleRegistry = Object.fromEntries(Object.entries(roleRegistry).filter(([key]) =>
      key.startsWith(`${source.benchId}/`)
    ));
    const analysis = analyzeCaliforniaCanvasGraphicsSource({
      benchId: source.benchId,
      roleRegistry: sourceRoleRegistry,
      source: source.source,
      sourcePath: source.sourcePath
    });
    mergeCensus(census, analysis.apiCensus);
    bindings.push(...analysis.bindings);
    clearEpochSites.push(...analysis.clearEpochSites);
    clipSites.push(...analysis.clipSites);
    paintSites.push(...analysis.paintSites);
  }
  validateRoleRegistry(paintSites, roleRegistry);
  const apiCensus: CaliforniaCanvasApiCensus = {
    animationMethods: stableRecord(census.animationMethods),
    canvasPropertyWrites: stableRecord(census.canvasPropertyWrites),
    clearMethods: stableRecord(census.clearMethods),
    clipMethods: stableRecord(census.clipMethods),
    contextPropertyWrites: stableRecord(census.contextPropertyWrites),
    gradientMethods: stableRecord(census.gradientMethods),
    pathMethods: stableRecord(census.pathMethods),
    stateMethods: stableRecord(census.stateMethods),
    terminalGraphicsMethods: stableRecord(census.terminalGraphicsMethods),
    textMethods: stableRecord(census.textMethods)
  };
  const pathGroups = new Set(paintSites.flatMap((site) =>
    site.authoredPathGroupKey ? [site.authoredPathGroupKey] : []
  ));
  const base: Omit<CaliforniaCanvasGraphicsSourceContract, "contractSha256"> = {
    apiCensus,
    bindings,
    clearEpochSites,
    clipSites,
    counts: {
      animatedSources: sources.filter((source) =>
        /\brequestAnimationFrame\s*\(/.test(source.source)
      ).length,
      authoredPathGroups: pathGroups.size,
      benches: sources.length,
      canvases: bindings.length,
      clearEpochs: clearEpochSites.length,
      clipSites: clipSites.length,
      contextAcquisitions2d: bindings.length,
      dynamicAlphaSites: paintSites.filter((site) => site.alphaClass === "dynamic").length,
      dynamicPaintSites: paintSites.filter((site) => site.colorAlphaClass === "dynamic" ||
        site.colorAlphaClass === "inherited").length,
      gradientPaintSites: paintSites.filter((site) => site.colorAlphaClass === "gradient").length,
      paintSites: paintSites.length,
      registrySites: Object.keys(roleRegistry).length,
      shadowPaintSites: paintSites.filter((site) =>
        site.shadowClass === "dynamic" || site.shadowClass === "static-active"
      ).length,
      unresolvedPathFamilies: paintSites.filter((site) =>
        site.pathFamily.startsWith("unresolved:")
      ).length
    },
    paintSites,
    runtimePrerequisites: {
      externalCompositePaper: CALIFORNIA_CANVAS_EXTERNAL_COMPOSITE_PAPER,
      externalCompositePaperSourceProven: false
    },
    schemaVersion: CALIFORNIA_CANVAS_GRAPHICS_SCHEMA_VERSION,
    sourceSha256,
    sources: sources.map(({ source: _source, ...item }) => item)
  };
  const contractSha256 = sha256(JSON.stringify(canonicalContract(base)));
  return deepFreezeContractValue({ ...base, contractSha256 });
}

export function assertCaliforniaCanvasGraphicsSourceContractFrozen(
  contract: CaliforniaCanvasGraphicsSourceContract
) {
  if (contract.sourceSha256 !== CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256) {
    throw new Error(
      "California Canvas source identity drifted: " +
      `${contract.sourceSha256} != ${CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256}`
    );
  }
  if (contract.contractSha256 !== CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256) {
    throw new Error(
      "California Canvas graphics contract drifted: " +
      `${contract.contractSha256} != ${CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256}`
    );
  }
}

export function assertExactCaliforniaCanvasPaintSiteKeys(
  expected: readonly string[],
  actual: readonly string[]
) {
  const duplicateExpected = expected.filter((key, index) => expected.indexOf(key) !== index);
  const duplicateActual = actual.filter((key, index) => actual.indexOf(key) !== index);
  if (duplicateExpected.length || duplicateActual.length) {
    throw new Error(
      `California Canvas paint-site keys are not unique ` +
      `(expected duplicates=${[...new Set(duplicateExpected)].join(",") || "none"}; ` +
      `actual duplicates=${[...new Set(duplicateActual)].join(",") || "none"})`
    );
  }
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((key) => !actualSet.has(key));
  const extra = actual.filter((key) => !expectedSet.has(key));
  if (missing.length || extra.length) {
    throw new Error(
      `California Canvas paint-site coverage is not exact ` +
      `(missing=${missing.join(",") || "none"}; extra=${extra.join(",") || "none"})`
    );
  }
}

export function californiaCanvasRuntimeEvidenceRequiredSites(
  contract: CaliforniaCanvasGraphicsSourceContract
) {
  return contract.paintSites.filter((site) => site.role === "essential");
}
