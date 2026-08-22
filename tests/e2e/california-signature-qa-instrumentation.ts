import { createHash } from "node:crypto";
import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  assertCaliforniaSignatureSourceManifestFrozen,
  buildCaliforniaSignatureSourceManifest,
  CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
  type CaliforniaSignatureBenchControlBlueprint,
  type CaliforniaSignatureControlSite
} from "./california-signature-control-manifest";

/**
 * QA-only JSX instrumentation.
 *
 * Runtime controls cannot be attributed to AST sites from DOM order or labels:
 * both change across conditional lesson states and mapped dynamic copy.  The
 * only exact mechanism that leaves product code untouched is to build an
 * isolated staging copy whose 186 signature sources receive deterministic data
 * attributes before Next compiles them.
 *
 * This module refuses to write the source project, symlinked staging files, or
 * a staging file whose bytes do not exactly match the reviewed product source.
 * The returned provenance and the DO-NOT-DEPLOY marker are QA evidence.  The
 * staging build is disposable and is never a release/deploy source.
 */

export const CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE = "data-ca-source-site-key";
export const CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE = "data-ca-source-instance-key";
export const CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE = "data-ca-source-endpoints";
export const CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE = "data-ca-source-endpoint-key";
export const CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE = "data-ca-source-endpoint-instance-key";
export const CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE = "data-ca-source-control-kind";
export const CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER = ".ca-signature-qa-do-not-deploy.json";

export type CaliforniaSignatureQaInstrumentationProvenance = {
  blueprintSha256: string;
  componentCount: number;
  controlsInstrumented: number;
  productBytesUnchanged: true;
  productSourceSha256: string;
  stagingSourceSha256: string;
};

type InstrumentedControl = {
  node: ts.JsxOpeningLikeElement;
  site: CaliforniaSignatureControlSite;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function aggregateSourceDigest(entries: Array<{ benchId: string; source: string }>) {
  return sha256(entries.map(({ benchId, source }) => `${benchId}\0${sha256(source)}`).join("\n"));
}

function jsxAttribute(
  node: ts.JsxOpeningLikeElement,
  name: string,
  sourceFile: ts.SourceFile
) {
  return node.attributes.properties.find((candidate): candidate is ts.JsxAttribute =>
    ts.isJsxAttribute(candidate) && candidate.name.getText(sourceFile) === name
  ) ?? null;
}

function controlNode(
  node: ts.Node,
  sourceFile: ts.SourceFile
): node is ts.JsxOpeningLikeElement {
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return false;
  const tag = node.tagName.getText(sourceFile);
  if (tag === "button" || tag === "select" || tag === "textarea") return true;
  if (tag !== "input") {
    if (!/^[a-z]/.test(tag)) return false;
    return [
      "onClick", "onContextMenu", "onDoubleClick", "onKeyDown", "onKeyUp",
      "onMouseDown", "onPointerDown", "onTouchStart", "onWheel"
    ].some((name) => jsxAttribute(node, name, sourceFile));
  }
  const type = jsxAttribute(node, "type", sourceFile);
  const value = type?.initializer && ts.isStringLiteral(type.initializer)
    ? type.initializer.text
    : null;
  if (["checkbox", "number", "radio", "range"].includes(value ?? "")) return true;
  throw new Error(`${sourceFile.fileName}: unsupported QA input type ${JSON.stringify(value)}`);
}

function parseSource(sourcePath: string, source: string) {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JSX
  );
  const diagnostics = (sourceFile as ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] })
    .parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    throw new Error(`${sourcePath}: JSX parse failed with ${diagnostics.length} diagnostic(s)`);
  }
  return sourceFile;
}

function controlsInSource(
  sourceFile: ts.SourceFile,
  bench: CaliforniaSignatureBenchControlBlueprint
) {
  const controls: InstrumentedControl[] = [];
  const imperativeSites = bench.controlSites.filter((site) => site.imperativeBinding !== null);
  const matchedImperativeSites = new Set<string>();
  const imperativeSiteForNode = (node: ts.JsxOpeningLikeElement) => {
    const refExpression = jsxAttribute(node, "ref", sourceFile);
    if (!refExpression) return null;
    const expression = refExpression.initializer && ts.isJsxExpression(refExpression.initializer) &&
      refExpression.initializer.expression
      ? refExpression.initializer.expression.getText(sourceFile).replace(/\s+/g, " ").trim()
      : null;
    if (!expression) return null;
    const matches = imperativeSites.filter((site) => site.imperativeBinding?.refExpression === expression);
    if (matches.length > 1) {
      throw new Error(`${bench.sourcePath}: JSX ref ${expression} maps to duplicate imperative source sites`);
    }
    return matches[0] ?? null;
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const imperativeSite = imperativeSiteForNode(node);
      const ordinaryControl = controlNode(node, sourceFile);
      if (imperativeSite && ordinaryControl) {
        throw new Error(`${bench.sourcePath}/${imperativeSite.siteKey}: imperative ref also has a JSX interaction handler`);
      }
      if (!imperativeSite && !ordinaryControl) {
        ts.forEachChild(node, visit);
        return;
      }
      const site = bench.controlSites[controls.length];
      if (!site) {
        throw new Error(`${bench.sourcePath}: source has more controls than its reviewed blueprint`);
      }
      if (imperativeSite && imperativeSite.siteKey !== site.siteKey) {
        throw new Error(
          `${bench.sourcePath}: imperative ref ${imperativeSite.imperativeBinding?.refExpression} ` +
          `is out of source order; expected ${site.siteKey}, received ${imperativeSite.siteKey}`
        );
      }
      if (!imperativeSite && site.imperativeBinding) {
        throw new Error(
          `${bench.sourcePath}/${site.siteKey}: missing imperative JSX ref ${site.imperativeBinding.refExpression}`
        );
      }
      if (imperativeSite) {
        if (matchedImperativeSites.has(imperativeSite.siteKey)) {
          throw new Error(`${bench.sourcePath}/${imperativeSite.siteKey}: imperative JSX ref is duplicated`);
        }
        matchedImperativeSites.add(imperativeSite.siteKey);
      }
      controls.push({ node, site });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (controls.length !== bench.controlSites.length) {
    throw new Error(
      `${bench.sourcePath}: source/blueprint control count mismatch ` +
      `${controls.length}/${bench.controlSites.length}`
    );
  }
  if (matchedImperativeSites.size !== imperativeSites.length) {
    const missing = imperativeSites.filter((site) => !matchedImperativeSites.has(site.siteKey));
    throw new Error(
      `${bench.sourcePath}: missing imperative JSX ref sites: ${missing.map((site) =>
        `${site.siteKey}/${site.imperativeBinding?.refExpression}`).join(", ")}`
    );
  }
  return controls;
}

function keyExpression(attribute: ts.JsxAttribute, sourceFile: ts.SourceFile) {
  if (!attribute.initializer) {
    throw new Error(`${sourceFile.fileName}: mapped JSX key must have a value`);
  }
  if (ts.isStringLiteral(attribute.initializer)) return JSON.stringify(attribute.initializer.text);
  if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
    return attribute.initializer.expression.getText(sourceFile);
  }
  throw new Error(`${sourceFile.fileName}: unsupported mapped JSX key initializer`);
}

function mappedInstanceExpression(
  control: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile,
  site: CaliforniaSignatureControlSite
) {
  const expressions: Array<{ position: number; source: string }> = [];
  const seenAttributes = new Set<number>();
  let current: ts.Node | undefined = control;
  while (current && !ts.isSourceFile(current)) {
    const opening = ts.isJsxElement(current)
      ? current.openingElement
      : ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)
        ? current
        : null;
    if (opening) {
      const key = jsxAttribute(opening, "key", sourceFile);
      if (key && !seenAttributes.has(key.pos)) {
        seenAttributes.add(key.pos);
        expressions.push({ position: key.pos, source: keyExpression(key, sourceFile) });
      }
    }
    current = current.parent;
  }
  const namespaceExpression = site.customComponentNamespace?.expression;
  if (expressions.length === 0 && !namespaceExpression) {
    throw new Error(
      `${sourceFile.fileName}: mapped control has no keyed JSX ancestor; ` +
      "DOM order is not an acceptable QA identity"
    );
  }
  expressions.sort((left, right) => left.position - right.position);
  return `JSON.stringify([${[
    ...(namespaceExpression ? [namespaceExpression] : []),
    ...expressions.map((expression) => expression.source)
  ].join(", ")}])`;
}

function instrumentationInsertion(
  control: InstrumentedControl,
  sourceFile: ts.SourceFile
) {
  const { node, site } = control;
  if (jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE, sourceFile)) {
    throw new Error(`${sourceFile.fileName}: product source is already QA-instrumented`);
  }
  if (jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE, sourceFile)) {
    throw new Error(`${sourceFile.fileName}: product source already has a QA instance identity`);
  }
  const siteAttribute = ` ${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}=${JSON.stringify(site.siteKey)}`;
  const instanceAttribute = site.renderCollections.length === 0 && !site.customComponentNamespace
    ? ` ${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}="direct"`
    : ` ${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}={${mappedInstanceExpression(node, sourceFile, site)}}`;
  const kindAttribute = ` ${CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE}=${JSON.stringify(site.kind)}`;
  const endpointsAttribute = ` ${CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE}={${JSON.stringify(
    site.endpointTargets.map((target) => target.name).join("\u001f")
  )}}`;
  return {
    position: node.tagName.end,
    value: siteAttribute + instanceAttribute + kindAttribute + endpointsAttribute
  };
}

function sourceOptionNodes(control: InstrumentedControl, sourceFile: ts.SourceFile) {
  if (control.site.kind !== "select" || !ts.isJsxOpeningElement(control.node) || !ts.isJsxElement(control.node.parent)) {
    return [];
  }
  const options: ts.JsxOpeningLikeElement[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(sourceFile) === "option"
    ) options.push(node);
    ts.forEachChild(node, visit);
  };
  for (const child of control.node.parent.children) visit(child);
  return options;
}

function optionInstrumentationInsertions(control: InstrumentedControl, sourceFile: ts.SourceFile) {
  return sourceOptionNodes(control, sourceFile).map((option, index) => {
    const target = control.site.endpointTargets[index];
    if (!target) throw new Error(`${sourceFile.fileName}/${control.site.siteKey}: option target mismatch`);
    if (
      jsxAttribute(option, CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE, sourceFile) ||
      jsxAttribute(option, CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE, sourceFile)
    ) throw new Error(`${sourceFile.fileName}: product option is already QA-instrumented`);
    let current: ts.Node | undefined = option;
    let mapped = false;
    while (current && current !== control.node.parent) {
      if (
        ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression) &&
        current.expression.name.text === "map"
      ) mapped = true;
      current = current.parent;
    }
    const instance = mapped || control.site.customComponentNamespace
      ? `{${mappedInstanceExpression(option, sourceFile, control.site)}}`
      : '"direct"';
    return {
      position: option.tagName.end,
      value:
        ` ${CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE}=${JSON.stringify(target.key)}` +
        ` ${CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE}=${instance}`
    };
  });
}

export function instrumentCaliforniaSignatureBenchSource(
  bench: CaliforniaSignatureBenchControlBlueprint,
  source: string
) {
  if (sha256(source) !== bench.sourceSha256) {
    throw new Error(`${bench.sourcePath}: source bytes do not match the reviewed component identity`);
  }
  const sourceFile = parseSource(bench.sourcePath, source);
  const insertions = controlsInSource(sourceFile, bench)
    .flatMap((control) => [
      instrumentationInsertion(control, sourceFile),
      ...optionInstrumentationInsertions(control, sourceFile)
    ])
    .sort((left, right) => right.position - left.position);
  let instrumented = source;
  for (const insertion of insertions) {
    instrumented = instrumented.slice(0, insertion.position) + insertion.value + instrumented.slice(insertion.position);
  }
  validateInstrumentedCaliforniaSignatureBenchSource(bench, instrumented);
  return instrumented;
}

function attributeStringValue(attribute: ts.JsxAttribute | null) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    ts.isStringLiteral(attribute.initializer.expression)
  ) return attribute.initializer.expression.text;
  return null;
}

const SOURCE_INTERACTION_HANDLER_NAMES = [
  "onClick",
  "onContextMenu",
  "onDoubleClick",
  "onKeyDown",
  "onKeyUp",
  "onMouseDown",
  "onPointerDown",
  "onTouchStart",
  "onWheel",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerLeave"
] as const;

const IMPERATIVE_SOURCE_INTERACTION_EVENTS = new Set([
  "click", "contextmenu", "dblclick", "keydown", "keyup", "mousedown",
  "pointerdown", "pointermove", "pointerup", "touchstart", "wheel"
]);

function normalizedExpression(node: ts.Node, sourceFile: ts.SourceFile) {
  return node.getText(sourceFile).replace(/\s+/g, " ").trim();
}

function jsxSourceInteractionHandlers(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile
) {
  return SOURCE_INTERACTION_HANDLER_NAMES.flatMap((eventName) => {
    const attribute = jsxAttribute(node, eventName, sourceFile);
    if (!attribute?.initializer) return [];
    if (ts.isStringLiteral(attribute.initializer)) {
      return [{ eventName, handlerExpression: attribute.initializer.text }];
    }
    if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      return [{
        eventName,
        handlerExpression: normalizedExpression(attribute.initializer.expression, sourceFile)
      }];
    }
    return [{ eventName, handlerExpression: normalizedExpression(attribute.initializer, sourceFile) }];
  });
}

function imperativeSourceInteractionBinding(
  node: ts.JsxOpeningLikeElement,
  sourceFile: ts.SourceFile
) {
  const ref = jsxAttribute(node, "ref", sourceFile);
  const refExpression = ref?.initializer && ts.isJsxExpression(ref.initializer) &&
    ref.initializer.expression
    ? normalizedExpression(ref.initializer.expression, sourceFile)
    : null;
  if (!refExpression) return null;

  const receiverRefs = new Map<string, string>();
  const collectReceivers = (candidate: ts.Node) => {
    if (
      ts.isVariableDeclaration(candidate) && ts.isIdentifier(candidate.name) &&
      candidate.initializer && ts.isPropertyAccessExpression(candidate.initializer) &&
      candidate.initializer.name.text === "current"
    ) {
      receiverRefs.set(
        candidate.name.text,
        normalizedExpression(candidate.initializer.expression, sourceFile)
      );
    }
    ts.forEachChild(candidate, collectReceivers);
  };
  collectReceivers(sourceFile);

  const listeners: Array<{
    eventName: string;
    handlerExpression: string;
    position: number;
    receiverExpression: string;
  }> = [];
  const collectListeners = (candidate: ts.Node) => {
    if (
      ts.isCallExpression(candidate) && ts.isPropertyAccessExpression(candidate.expression) &&
      candidate.expression.name.text === "addEventListener" &&
      ts.isIdentifier(candidate.expression.expression) && candidate.arguments[0] &&
      ts.isStringLiteral(candidate.arguments[0]) && candidate.arguments[1] &&
      IMPERATIVE_SOURCE_INTERACTION_EVENTS.has(candidate.arguments[0].text)
    ) {
      const receiverExpression = candidate.expression.expression.text;
      if (receiverRefs.get(receiverExpression) === refExpression) {
        listeners.push({
          eventName: candidate.arguments[0].text,
          handlerExpression: normalizedExpression(candidate.arguments[1], sourceFile),
          position: candidate.pos,
          receiverExpression
        });
      }
    }
    ts.forEachChild(candidate, collectListeners);
  };
  collectListeners(sourceFile);
  if (listeners.length === 0) return null;
  listeners.sort((left, right) => left.position - right.position);
  const receivers = [...new Set(listeners.map((listener) => listener.receiverExpression))];
  if (receivers.length !== 1) {
    throw new Error(
      `${sourceFile.fileName}: imperative ref ${refExpression} resolves to ${receivers.length} listener receivers`
    );
  }
  return {
    eventTargets: listeners.map(({ eventName, handlerExpression }) => ({ eventName, handlerExpression })),
    receiverExpression: receivers[0]!,
    refExpression
  };
}

function expectedSourceExpressionForSemanticTarget(
  targetName: string,
  handlers: readonly { eventName: string; handlerExpression: string }[]
) {
  const names = targetName === "drag" || targetName === "pointer-pick"
    ? ["onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onPointerLeave",
        "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave"]
    : targetName === "click"
      ? ["onClick"]
      : targetName === "context-menu"
        ? ["onContextMenu"]
        : targetName === "double-click"
          ? ["onDoubleClick"]
          : targetName === "key-nudge"
            ? ["onKeyDown"]
            : [];
  return handlers.filter((handler) => names.includes(handler.eventName))
    .map((handler) => `${handler.eventName}=${handler.handlerExpression}`)
    .join(";");
}

function validateIndependentSourceInteractionContract(
  node: ts.JsxOpeningLikeElement,
  site: CaliforniaSignatureControlSite,
  sourceFile: ts.SourceFile
) {
  if (site.kind !== "interaction-surface") return;
  const imperative = imperativeSourceInteractionBinding(node, sourceFile);
  const handlers = imperative?.eventTargets ?? jsxSourceInteractionHandlers(node, sourceFile);
  if (JSON.stringify(handlers) !== JSON.stringify(site.interactionSourceHandlers)) {
    throw new Error(`${sourceFile.fileName}/${site.siteKey}: independent source interaction handler drift`);
  }
  if (JSON.stringify(imperative) !== JSON.stringify(site.imperativeBinding)) {
    throw new Error(`${sourceFile.fileName}/${site.siteKey}: independent imperative listener binding drift`);
  }
  for (const target of site.endpointTargets) {
    const sourceExpression = expectedSourceExpressionForSemanticTarget(target.name, handlers);
    if (!sourceExpression || sourceExpression !== target.sourceExpression) {
      throw new Error(
        `${sourceFile.fileName}/${site.siteKey}/${target.name}: independent semantic source target drift`
      );
    }
    if (target.key !== `${target.name}:${sha256(sourceExpression).slice(0, 16)}`) {
      throw new Error(`${sourceFile.fileName}/${site.siteKey}/${target.name}: semantic target hash drift`);
    }
    if (imperative && target.name === "drag") {
      const rawEvents = handlers.map((handler) => handler.eventName);
      if (JSON.stringify(rawEvents) !== JSON.stringify(["pointerdown", "pointermove", "pointerup"])) {
        throw new Error(
          `${sourceFile.fileName}/${site.siteKey}: imperative drag requires ordered pointerdown/pointermove/pointerup`
        );
      }
    }
  }
}

export function validateInstrumentedCaliforniaSignatureBenchSource(
  bench: CaliforniaSignatureBenchControlBlueprint,
  instrumentedSource: string
) {
  const sourceFile = parseSource(bench.sourcePath, instrumentedSource);
  const controls = controlsInSource(sourceFile, bench);
  for (const { node, site } of controls) {
    const actualSite = attributeStringValue(
      jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE, sourceFile)
    );
    if (actualSite !== site.siteKey) {
      throw new Error(
        `${bench.sourcePath}: missing or mis-attributed QA site; ` +
        `expected ${site.siteKey}, received ${JSON.stringify(actualSite)}`
      );
    }
    const instance = jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE, sourceFile);
    if (!instance?.initializer) {
      throw new Error(`${bench.sourcePath}/${site.siteKey}: missing QA instance identity`);
    }
    if (site.renderCollections.length === 0 && !site.customComponentNamespace) {
      if (attributeStringValue(instance) !== "direct") {
        throw new Error(`${bench.sourcePath}/${site.siteKey}: direct control has a dynamic QA identity`);
      }
    } else if (
      !ts.isJsxExpression(instance.initializer) ||
      !instance.initializer.expression ||
      !instance.initializer.expression.getText(sourceFile).startsWith("JSON.stringify(")
    ) {
      throw new Error(`${bench.sourcePath}/${site.siteKey}: mapped control lacks a keyed QA identity`);
    }
    if (attributeStringValue(jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE, sourceFile)) !== site.kind) {
      throw new Error(`${bench.sourcePath}/${site.siteKey}: missing source control kind`);
    }
    const expectedEndpoints = site.endpointTargets.map((target) => target.name).join("\u001f");
    if (
      attributeStringValue(jsxAttribute(node, CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE, sourceFile)) !==
      expectedEndpoints
    ) {
      throw new Error(`${bench.sourcePath}/${site.siteKey}: missing source endpoint target names`);
    }
    validateIndependentSourceInteractionContract(node, site, sourceFile);
    if (site.kind === "select") {
      const control = { node, site };
      const options = sourceOptionNodes(control, sourceFile);
      if (options.length !== site.endpointTargets.length) {
        throw new Error(`${bench.sourcePath}/${site.siteKey}: instrumented option/target count mismatch`);
      }
      for (const [index, option] of options.entries()) {
        const target = site.endpointTargets[index]!;
        if (
          attributeStringValue(jsxAttribute(option, CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE, sourceFile)) !==
          target.key
        ) throw new Error(`${bench.sourcePath}/${site.siteKey}: option lacks exact source endpoint key`);
        if (!jsxAttribute(option, CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE, sourceFile)?.initializer) {
          throw new Error(`${bench.sourcePath}/${site.siteKey}: option lacks exact source endpoint instance`);
        }
      }
    }
  }
  return controls.length;
}

export function assertCaliforniaSignatureProductSourcesUninstrumented(projectRoot = process.cwd()) {
  const manifest = buildCaliforniaSignatureSourceManifest(projectRoot);
  assertCaliforniaSignatureSourceManifestFrozen(manifest);
  for (const bench of manifest.benches) {
    const source = readFileSync(path.join(projectRoot, bench.sourcePath), "utf8");
    if (
      source.includes(CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE) ||
      source.includes(CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE) ||
      source.includes(CALIFORNIA_SIGNATURE_QA_KIND_ATTRIBUTE) ||
      source.includes(CALIFORNIA_SIGNATURE_QA_ENDPOINTS_ATTRIBUTE)
      || source.includes(CALIFORNIA_SIGNATURE_QA_ENDPOINT_KEY_ATTRIBUTE)
      || source.includes(CALIFORNIA_SIGNATURE_QA_ENDPOINT_INSTANCE_ATTRIBUTE)
    ) {
      throw new Error(`${bench.sourcePath}: QA instrumentation must never exist in product source`);
    }
  }
  return manifest;
}

function assertInside(root: string, target: string, label: string) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} escapes its staging root: ${target}`);
  }
}

/**
 * Mutates only a pre-existing isolated staging copy.  The caller copies/builds
 * the repository; this function verifies byte parity and instruments the 186
 * reviewed signature files in place.  Never point release or deployment tools
 * at the returned staging root.
 */
export function instrumentCaliforniaSignatureQaStagingCopy(options: {
  productProjectRoot?: string;
  stagingProjectRoot: string;
}): CaliforniaSignatureQaInstrumentationProvenance {
  const productRoot = realpathSync(options.productProjectRoot ?? process.cwd());
  const stagingRoot = realpathSync(options.stagingProjectRoot);
  if (productRoot === stagingRoot) {
    throw new Error("QA instrumentation refuses to write the product project root");
  }

  const manifest = assertCaliforniaSignatureProductSourcesUninstrumented(productRoot);
  const originalEntries: Array<{ benchId: string; source: string }> = [];
  const stagedEntries: Array<{ benchId: string; source: string }> = [];
  const prepared: Array<{
    bench: CaliforniaSignatureBenchControlBlueprint;
    instrumentedSource: string;
    stagingPath: string;
  }> = [];
  let controlsInstrumented = 0;

  // Full preflight first. A late mismatch/symlink/parse error must leave zero
  // staged component files changed and must not create a misleading marker.
  for (const bench of manifest.benches) {
    const productPath = path.join(productRoot, bench.sourcePath);
    const stagingPath = path.join(stagingRoot, bench.sourcePath);
    assertInside(stagingRoot, stagingPath, bench.sourcePath);
    if (lstatSync(stagingPath).isSymbolicLink()) {
      throw new Error(`${bench.sourcePath}: staging source must not be a symlink`);
    }
    assertInside(stagingRoot, realpathSync(stagingPath), bench.sourcePath);
    const productSource = readFileSync(productPath, "utf8");
    const stagingSource = readFileSync(stagingPath, "utf8");
    if (stagingSource !== productSource) {
      throw new Error(`${bench.sourcePath}: staging copy differs before QA instrumentation`);
    }
    const instrumentedSource = instrumentCaliforniaSignatureBenchSource(bench, productSource);
    originalEntries.push({ benchId: bench.benchId, source: productSource });
    stagedEntries.push({ benchId: bench.benchId, source: instrumentedSource });
    prepared.push({ bench, instrumentedSource, stagingPath });
    controlsInstrumented += bench.controlSites.length;
  }

  const productSourceSha256 = aggregateSourceDigest(originalEntries);
  if (productSourceSha256 !== manifest.componentSourceSha256) {
    throw new Error("product source digest changed while preparing the QA staging copy");
  }
  for (const bench of manifest.benches) {
    if (sha256(readFileSync(path.join(productRoot, bench.sourcePath), "utf8")) !== bench.sourceSha256) {
      throw new Error(`${bench.sourcePath}: product source bytes changed during staging instrumentation`);
    }
  }

  const provenance: CaliforniaSignatureQaInstrumentationProvenance = {
    blueprintSha256: CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
    componentCount: manifest.benches.length,
    controlsInstrumented,
    productBytesUnchanged: true,
    productSourceSha256,
    stagingSourceSha256: aggregateSourceDigest(stagedEntries)
  };
  const markerPath = path.join(stagingRoot, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  assertInside(stagingRoot, markerPath, CALIFORNIA_SIGNATURE_QA_DO_NOT_DEPLOY_MARKER);
  const markerPayload = `${JSON.stringify({
      ...provenance,
      purpose: "California signature browser QA only",
      releaseEligible: false
    }, null, 2)}\n`;

  // `wx` is both exclusive and symlink-safe for an existing marker: a regular
  // file or symlink makes the call fail rather than being followed/overwritten.
  const markerFd = openSync(markerPath, "wx", 0o600);
  try {
    writeFileSync(markerFd, markerPayload, "utf8");
  } finally {
    closeSync(markerFd);
  }

  const temporaryPaths: string[] = [];
  try {
    for (const [index, entry] of prepared.entries()) {
      const temporaryPath = `${entry.stagingPath}.ca-signature-qa-${process.pid}-${index}.tmp`;
      const fd = openSync(temporaryPath, "wx", 0o600);
      temporaryPaths.push(temporaryPath);
      try {
        writeFileSync(fd, entry.instrumentedSource, "utf8");
      } finally {
        closeSync(fd);
      }
      // Same-directory rename publishes one fully written source atomically.
      renameSync(temporaryPath, entry.stagingPath);
      temporaryPaths.pop();
    }
  } catch (error) {
    for (const temporaryPath of temporaryPaths) rmSync(temporaryPath, { force: true });
    throw error;
  }
  return provenance;
}
