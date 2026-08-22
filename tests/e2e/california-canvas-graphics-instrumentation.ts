import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256,
  CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256,
  analyzeCaliforniaCanvasGraphicsSource,
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  assertExactCaliforniaCanvasPaintSiteKeys,
  buildCaliforniaCanvasGraphicsSourceContract,
  type CaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";

export const CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_VERSION = 1;
export const CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER =
  "california-canvas-graphics-runtime-instrumented";
export const CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER =
  ".california-canvas-graphics-runtime-NO-DEPLOY.json";

export type CaliforniaCanvasGraphicsInstrumentedSource = {
  animationCancellations: number;
  animationSchedules: number;
  benchId: string;
  bindingKeys: readonly string[];
  contextRegistrations: number;
  paintInvocations: number;
  source: string;
  sourcePath: string;
  sourceSiteKeys: readonly string[];
};

export type CaliforniaCanvasGraphicsStagingResult = {
  animationCancellations: number;
  animationSchedules: number;
  benches: number;
  contextRegistrations: number;
  markerPath: string;
  paintInvocations: number;
  productSourceSha256: string;
  sourceContractSha256: string;
};

type InstrumentSourceOptions = {
  benchId: string;
  contract?: CaliforniaCanvasGraphicsSourceContract;
  source: string;
  sourcePath: string;
};

type Replacement = {
  end: number;
  start: number;
  text: string;
};

function pathIsInside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." &&
    !path.isAbsolute(relative));
}

function normalizeSourceText(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function parseSource(sourcePath: string, source: string) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX
  );
  const diagnostics = (sourceFile as ts.SourceFile & {
    parseDiagnostics?: readonly ts.Diagnostic[];
  }).parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    throw new Error(`${sourcePath}: JSX parse failed with ${diagnostics.length} diagnostic(s)`);
  }
  return sourceFile;
}

function applyReplacements(source: string, replacements: readonly Replacement[]) {
  let output = source;
  const ordered = replacements.slice().sort((left, right) => right.start - left.start);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].start < ordered[index].end) {
      throw new Error("California Canvas graphics instrumentation replacements overlap");
    }
  }
  for (const replacement of ordered) {
    output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end);
  }
  return output;
}

function isTwoDimensionalContextAcquisition(call: ts.CallExpression) {
  return ts.isPropertyAccessExpression(call.expression) &&
    call.expression.name.text === "getContext" &&
    call.arguments.length === 1 &&
    ts.isStringLiteralLike(call.arguments[0]) &&
    call.arguments[0].text === "2d";
}

function terminalPaintCandidate(call: ts.CallExpression) {
  if (!ts.isPropertyAccessExpression(call.expression)) return null;
  const operation = call.expression.name.text;
  if (operation !== "fill" && operation !== "stroke" &&
      operation !== "fillRect" && operation !== "strokeRect") return null;
  return { operation, receiver: call.expression.expression };
}

/**
 * Instrument one already-staged signature source. Existing JSX/control
 * instrumentation may be present; exact Canvas source-site identities must
 * still equal the canonical source contract before any rewrite is returned.
 */
export function instrumentCaliforniaCanvasGraphicsSourceText({
  benchId,
  contract = buildCaliforniaCanvasGraphicsSourceContract(),
  source,
  sourcePath
}: InstrumentSourceOptions): CaliforniaCanvasGraphicsInstrumentedSource {
  if (source.includes(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER)) {
    throw new Error(`${sourcePath}: California Canvas graphics source is already instrumented`);
  }
  const expectedSites = contract.paintSites.filter((site) => site.benchId === benchId);
  const expectedBindings = contract.bindings.filter((binding) => binding.benchId === benchId);
  if (expectedSites.length === 0 || expectedBindings.length === 0) {
    throw new Error(`${sourcePath}: ${benchId} is not a canonical California Canvas bench`);
  }
  const stagedAnalysis = analyzeCaliforniaCanvasGraphicsSource({
    benchId,
    source,
    sourcePath
  });
  assertExactCaliforniaCanvasPaintSiteKeys(
    expectedSites.map((site) => site.sourceSiteKey),
    stagedAnalysis.paintSites.map((site) => site.sourceSiteKey)
  );
  const stagedBindingKeys = stagedAnalysis.bindings.map((binding) => binding.key);
  const expectedBindingKeys = expectedBindings.map((binding) => binding.key);
  if (JSON.stringify(stagedBindingKeys) !== JSON.stringify(expectedBindingKeys)) {
    throw new Error(
      `${sourcePath}: Canvas context binding identities drifted ` +
      `(expected=${expectedBindingKeys.join(",")}; actual=${stagedBindingKeys.join(",")})`
    );
  }

  const sourceFile = parseSource(sourcePath, source);
  const calls = collectNodes(sourceFile, ts.isCallExpression);
  const contextCalls = calls.filter(isTwoDimensionalContextAcquisition);
  if (contextCalls.length !== expectedBindings.length) {
    throw new Error(
      `${sourcePath}: expected ${expectedBindings.length} 2-D context acquisitions, found ${contextCalls.length}`
    );
  }

  const paintCandidates = calls.flatMap((call) => {
    const candidate = terminalPaintCandidate(call);
    return candidate ? [{ ...candidate, call }] : [];
  });
  const matchedPaintCalls: Array<{
    call: ts.CallExpression;
    operation: string;
    receiver: ts.Expression;
  }> = [];
  let candidateIndex = 0;
  for (const site of stagedAnalysis.paintSites) {
    let matched: typeof matchedPaintCalls[number] | null = null;
    while (candidateIndex < paintCandidates.length) {
      const candidate = paintCandidates[candidateIndex++];
      if (candidate.operation === site.operation &&
          normalizeSourceText(candidate.call.getText(sourceFile)) === site.sourceText) {
        matched = candidate;
        break;
      }
    }
    if (!matched) {
      throw new Error(`${sourcePath}: cannot locate exact terminal paint AST site ${site.sourceSiteKey}`);
    }
    matchedPaintCalls.push(matched);
  }
  if (matchedPaintCalls.length !== expectedSites.length) {
    throw new Error(
      `${sourcePath}: terminal paint instrumentation count ${matchedPaintCalls.length} ` +
      `does not equal expected ${expectedSites.length}`
    );
  }

  const replacements: Replacement[] = [];
  contextCalls.forEach((call, index) => {
    const original = call.getText(sourceFile);
    replacements.push({
      end: call.end,
      start: call.getStart(sourceFile),
      text:
        `globalThis.__californiaCanvasGraphicsRuntime.registerContext(` +
        `${JSON.stringify(expectedBindings[index].key)}, ${original})`
    });
  });
  matchedPaintCalls.forEach((matched, index) => {
    const site = stagedAnalysis.paintSites[index];
    const original = matched.call.getText(sourceFile);
    const receiver = matched.receiver.getText(sourceFile);
    replacements.push({
      end: matched.call.end,
      start: matched.call.getStart(sourceFile),
      text:
        `globalThis.__californiaCanvasGraphicsRuntime.invoke(` +
        `${JSON.stringify(site.sourceSiteKey)}, ${receiver}, ` +
        `${JSON.stringify(site.operation)}, () => ${original})`
    });
  });
  const animationCalls = calls.filter((call) =>
    ts.isIdentifier(call.expression) &&
    (call.expression.text === "requestAnimationFrame" ||
      call.expression.text === "cancelAnimationFrame")
  );
  for (const call of animationCalls) {
    const method = (call.expression as ts.Identifier).text;
    replacements.push({
      end: call.expression.end,
      start: call.expression.getStart(sourceFile),
      text: `globalThis.__californiaCanvasGraphicsRuntime.${method}`
    });
    replacements.push({
      end: call.arguments.pos,
      start: call.arguments.pos,
      text: `${JSON.stringify(benchId)}, `
    });
  }

  const marker =
    `/* ${CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER}; ` +
    `version=${CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_VERSION}; ` +
    `source=${CALIFORNIA_CANVAS_GRAPHICS_SOURCE_SHA256}; ` +
    `contract=${CALIFORNIA_CANVAS_GRAPHICS_CONTRACT_SHA256}; NO_DEPLOY */\n`;
  const instrumented = marker + applyReplacements(source, replacements);
  const instrumentedFile = parseSource(sourcePath, instrumented);
  const registrationCount = collectNodes(instrumentedFile, ts.isCallExpression).filter((call) =>
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.expression.getText(instrumentedFile) ===
      "globalThis.__californiaCanvasGraphicsRuntime" &&
    call.expression.name.text === "registerContext"
  ).length;
  const invocationCount = collectNodes(instrumentedFile, ts.isCallExpression).filter((call) =>
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.expression.getText(instrumentedFile) ===
      "globalThis.__californiaCanvasGraphicsRuntime" &&
    call.expression.name.text === "invoke"
  ).length;
  const instrumentedAnimationCalls = collectNodes(instrumentedFile, ts.isCallExpression).filter((call) =>
    ts.isPropertyAccessExpression(call.expression) &&
    call.expression.expression.getText(instrumentedFile) ===
      "globalThis.__californiaCanvasGraphicsRuntime" &&
    (call.expression.name.text === "requestAnimationFrame" ||
      call.expression.name.text === "cancelAnimationFrame")
  );
  if (registrationCount !== expectedBindings.length || invocationCount !== expectedSites.length) {
    throw new Error(
      `${sourcePath}: post-transform AST proof failed ` +
      `(contexts=${registrationCount}/${expectedBindings.length}; ` +
      `paints=${invocationCount}/${expectedSites.length})`
    );
  }
  if (instrumentedAnimationCalls.length !== animationCalls.length) {
    throw new Error(
      `${sourcePath}: animation instrumentation count ${instrumentedAnimationCalls.length} ` +
      `does not equal expected ${animationCalls.length}`
    );
  }
  return {
    animationCancellations: animationCalls.filter((call) =>
      (call.expression as ts.Identifier).text === "cancelAnimationFrame"
    ).length,
    animationSchedules: animationCalls.filter((call) =>
      (call.expression as ts.Identifier).text === "requestAnimationFrame"
    ).length,
    benchId,
    bindingKeys: expectedBindingKeys,
    contextRegistrations: registrationCount,
    paintInvocations: invocationCount,
    source: instrumented,
    sourcePath,
    sourceSiteKeys: expectedSites.map((site) => site.sourceSiteKey)
  };
}

/**
 * Compose after other staging-only source transforms. All 186 files are
 * transformed in memory first; only a completely verified set is atomically
 * renamed over the staging copies. The marker makes release use fail closed.
 */
export function instrumentCaliforniaCanvasGraphicsStagingTree(options: {
  projectRoot?: string;
  stagingRoot: string;
}): CaliforniaCanvasGraphicsStagingResult {
  const requestedProjectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const requestedStagingRoot = path.resolve(options.stagingRoot);
  if (!existsSync(requestedProjectRoot)) {
    throw new Error(`California Canvas graphics project root is missing: ${requestedProjectRoot}`);
  }
  if (!existsSync(requestedStagingRoot) || lstatSync(requestedStagingRoot).isSymbolicLink()) {
    throw new Error(
      `California Canvas graphics staging root is missing or symlinked: ${requestedStagingRoot}`
    );
  }
  const projectRoot = realpathSync(requestedProjectRoot);
  const stagingRoot = realpathSync(requestedStagingRoot);
  if (pathIsInside(projectRoot, stagingRoot) || pathIsInside(stagingRoot, projectRoot)) {
    throw new Error(
      `California Canvas graphics project and staging roots overlap: ${projectRoot} <-> ${stagingRoot}`
    );
  }
  const markerPath = path.join(stagingRoot, CALIFORNIA_CANVAS_GRAPHICS_NO_DEPLOY_MARKER);
  if (existsSync(markerPath)) {
    throw new Error(`California Canvas graphics staging marker already exists: ${markerPath}`);
  }
  const contract = buildCaliforniaCanvasGraphicsSourceContract(projectRoot);
  assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
  const transformed = contract.sources.map((sourceIdentity) => {
    const target = path.join(stagingRoot, sourceIdentity.sourcePath);
    if (!pathIsInside(stagingRoot, path.resolve(target)) || !existsSync(target) ||
        lstatSync(target).isSymbolicLink()) {
      throw new Error(`California Canvas graphics staging source is missing or symlinked: ${target}`);
    }
    const realTarget = realpathSync(target);
    if (!pathIsInside(stagingRoot, realTarget)) {
      throw new Error(`California Canvas graphics staging source escapes its root: ${target}`);
    }
    const originalSource = readFileSync(target, "utf8");
    return {
      result: instrumentCaliforniaCanvasGraphicsSourceText({
        benchId: String(sourceIdentity.benchId),
        contract,
        source: originalSource,
        sourcePath: sourceIdentity.sourcePath
      }),
      originalSource,
      realTarget,
      target,
      temporary: `${target}.ca-canvas-graphics-${process.pid}.tmp`
    };
  });
  const temporaryPaths: string[] = [];
  try {
    for (const item of transformed) {
      if (existsSync(item.temporary)) {
        throw new Error(`California Canvas graphics temporary path already exists: ${item.temporary}`);
      }
      writeFileSync(item.temporary, item.result.source, { encoding: "utf8", flag: "wx" });
      temporaryPaths.push(item.temporary);
    }
    for (const item of transformed) {
      if (!existsSync(item.target) || lstatSync(item.target).isSymbolicLink() ||
          realpathSync(item.target) !== item.realTarget ||
          !pathIsInside(stagingRoot, item.realTarget) ||
          readFileSync(item.target, "utf8") !== item.originalSource) {
        throw new Error(
          `California Canvas graphics staged source changed during instrumentation: ${item.target}`
        );
      }
    }
    for (const item of transformed) renameSync(item.temporary, item.target);
    writeFileSync(markerPath, JSON.stringify({
      animationCancellations: transformed.reduce(
        (sum, item) => sum + item.result.animationCancellations,
        0
      ),
      animationSchedules: transformed.reduce(
        (sum, item) => sum + item.result.animationSchedules,
        0
      ),
      benches: transformed.length,
      contextRegistrations: transformed.reduce(
        (sum, item) => sum + item.result.contextRegistrations,
        0
      ),
      instrumentationVersion: CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_VERSION,
      noDeploy: true,
      paintInvocations: transformed.reduce((sum, item) => sum + item.result.paintInvocations, 0),
      productSourceSha256: contract.sourceSha256,
      sourceContractSha256: contract.contractSha256
    }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    for (const temporary of temporaryPaths) {
      if (existsSync(temporary)) rmSync(temporary, { force: true });
    }
    throw error;
  }
  return {
    animationCancellations: transformed.reduce(
      (sum, item) => sum + item.result.animationCancellations,
      0
    ),
    animationSchedules: transformed.reduce(
      (sum, item) => sum + item.result.animationSchedules,
      0
    ),
    benches: transformed.length,
    contextRegistrations: transformed.reduce(
      (sum, item) => sum + item.result.contextRegistrations,
      0
    ),
    markerPath,
    paintInvocations: transformed.reduce((sum, item) => sum + item.result.paintInvocations, 0),
    productSourceSha256: contract.sourceSha256,
    sourceContractSha256: contract.contractSha256
  };
}
