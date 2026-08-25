import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const collisionScannerUrl = new URL(
  "./hk-visualization-collision-scanner.ts",
  import.meta.url,
);
const contrastScannerUrl = new URL(
  "./hk-visualization-text-contrast-scanner.ts",
  import.meta.url,
);

const collisionSource = await readFile(collisionScannerUrl, "utf8");
const contrastSource = await readFile(contrastScannerUrl, "utf8");
const collisionScannerModule = await import(
  `${collisionScannerUrl.href}?scanner-contract-c5`
);

// Source-contract fixture only: real Chrome/browser behavior remains HOLD.
const closedShadowContrastSourceFixture = String.raw`
  const host = document.createElement("div");
  root.append(host);
  const closedRoot = host.attachShadow({ mode: "closed" });
  globalThis.__hkVisualizationShadowRootsV1.push(closedRoot);
  closedRoot.innerHTML = [
    '<span style="color:#777;background:#777">closed text</span>',
    '<input value="closed form" style="color:#777;background:#777">',
    '<svg><text style="fill:#777">closed svg</text></svg>',
  ].join("");
`;

function assertContrastComposedTraversal(source) {
  assert.match(
    closedShadowContrastSourceFixture,
    /__hkVisualizationShadowRootsV1[\s\S]*closed text[\s\S]*closed form[\s\S]*closed svg/u,
  );
  assert.match(
    source,
    /const shadowRootsGlobalName = "__hkVisualizationShadowRootsV1"/u,
  );
  assert.match(
    source,
    /hkVisualizationDecisionContractSource[\s\S]*type HkVisualizationDecisionContract[\s\S]*from "\.\/hk-visualization-collision-scanner"/u,
  );
  assert.match(source, /const composedParent = composedParentBehavior;/u);
  assert.match(
    source,
    /const composedContains = \(container: Element, candidate: Element\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    source,
    /const composedClosest = \(candidate: Element, selector: string\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    source,
    /const recordedShadowRoots =[\s\S]*shadowRootsGlobalName[\s\S]*for \(const shadowRoot of recordedShadowRoots\)[\s\S]*composedContains\(root, shadowRoot\.host\)/u,
  );
  assert.match(
    source,
    /const composedScopes: Array<Element \| ShadowRoot> = \[\s*root,[\s\S]*composedShadowRoots/u,
  );
  assert.match(
    source,
    /const queryAllComposed = \(selector: string\)[\s\S]*new Set<Element>[\s\S]*for \(const scope of composedScopes\)/u,
  );
  assert.match(
    source,
    /if \([\s\S]*!composedContains\(root, element\)[\s\S]*composedClosest\(element, scanOptions\.authoringSelector\)[\s\S]*return false/u,
  );
  assert.match(
    source,
    /while \(current\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    source,
    /for \(const textScope of composedScopes\)[\s\S]*document\.createTreeWalker\([\s\S]*textScope,[\s\S]*NodeFilter\.SHOW_TEXT/u,
  );
  assert.match(
    source,
    /for \(const control of queryAllComposed\("input,select,textarea"\)\)/u,
  );
  assert.match(
    source,
    /for \(const use of queryAllComposed\("svg use"\)/u,
  );
  assert.match(
    source,
    /const positionedPaintLayers = queryAllComposed\("\*"\)/u,
  );
  assert.doesNotMatch(source, /\.contains\(|\.closest\(/u);
}

function compiledComposedHitTestFactory(source) {
  const factorySource = sourceSection(
    source,
    "const createComposedElementsFromPoint = (",
    "const composedElementsFromPoint = createComposedElementsFromPoint(",
  );
  const compiled = ts.transpileModule(factorySource, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiled.diagnostics ?? [], []);
  return Function(
    `"use strict";\n${compiled.outputText}\nreturn createComposedElementsFromPoint;`,
  )();
}

function compiledContrastScannerCompiler(source) {
  const runtimeSource = sourceSection(
    source,
    "function scanHkVisualizationTextContrastRuntime(",
    "type HkVisualizationTextContrastEvaluator =",
  );
  const compilerSource = sourceSection(
    source,
    "export function compileHkVisualizationTextContrastScanner(",
    "export const scanHkVisualizationTextContrast =",
  ).replace(
    "export function compileHkVisualizationTextContrastScanner(",
    "function compileHkVisualizationTextContrastScanner(",
  );
  const compiled = ts.transpileModule(`${runtimeSource}\n${compilerSource}`, {
    compilerOptions: {
      module: ts.ModuleKind.None,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(compiled.diagnostics ?? [], []);
  return Function(
    "compileHkVisualizationDecisionContract",
    "hkVisualizationDecisionContractSource",
    `"use strict";\n${compiled.outputText}\nreturn compileHkVisualizationTextContrastScanner;`,
  )(
    collisionScannerModule.compileHkVisualizationDecisionContract,
    collisionScannerModule.hkVisualizationDecisionContractSource,
  );
}

function exerciseComposedHitTestFactory(
  source,
  {
    missingNestedHitTest = false,
    throwingNestedHitTest = false,
    unanchoredShadowHit = false,
  } = {},
) {
  const createComposedElementsFromPoint = compiledComposedHitTestFactory(source);
  const documentScope = { name: "document" };
  const scanRoot = { name: "scan-root", getRootNode: () => documentScope };
  const host = { name: "closed-host", getRootNode: () => documentScope };
  const emptyHost = { name: "empty-host", getRootNode: () => documentScope };
  const unanchoredHost = {
    name: "unanchored-host",
    getRootNode: () => documentScope,
  };
  const outsideHost = { name: "outside-host", getRootNode: () => documentScope };
  const closedShadow = { host, name: "closed-shadow" };
  const emptyShadow = { host: emptyHost, name: "empty-shadow" };
  const unanchoredShadow = {
    host: unanchoredHost,
    name: "unanchored-shadow",
  };
  const outsideShadow = { host: outsideHost, name: "outside-shadow" };
  const blackSibling = {
    paint: "black",
    name: "black-sibling",
    getRootNode: () => closedShadow,
  };
  const blackText = {
    foreground: "black",
    name: "black-text",
    getRootNode: () => closedShadow,
  };
  const nestedHost = { name: "nested-host", getRootNode: () => closedShadow };
  const nestedShadow = { host: nestedHost, name: "nested-shadow" };
  const nestedInner = {
    name: "nested-inner",
    getRootNode: () => nestedShadow,
  };
  const outsideInner = {
    name: "outside-inner",
    getRootNode: () => outsideShadow,
  };
  const unanchoredInner = {
    name: "unanchored-inner",
    getRootNode: () => unanchoredShadow,
  };
  const parent = new Map([
    [scanRoot, null],
    [host, scanRoot],
    [emptyHost, scanRoot],
    [unanchoredHost, scanRoot],
    [blackSibling, host],
    [blackText, host],
    [nestedHost, host],
    [nestedInner, nestedHost],
    [outsideHost, null],
    [outsideInner, outsideHost],
    [unanchoredInner, unanchoredHost],
  ]);
  const composedParent = (element) => parent.get(element) ?? null;
  const composedContains = (container, candidate) => {
    let current = candidate;
    while (current) {
      if (current === container) return true;
      current = composedParent(current);
    }
    return false;
  };
  const retargetedDocumentLayers = [
    host,
    host,
    emptyHost,
    scanRoot,
    outsideHost,
  ];
  documentScope.elementsFromPoint = () => retargetedDocumentLayers;
  closedShadow.elementsFromPoint = () => [
    blackSibling,
    nestedHost,
    blackText,
    blackSibling,
  ];
  nestedShadow.elementsFromPoint = missingNestedHitTest
    ? undefined
    : throwingNestedHitTest
      ? () => {
          throw new Error("synthetic nested shadow hit-test failure");
        }
      : () => [nestedInner, nestedInner];
  emptyShadow.elementsFromPoint = () => [];
  unanchoredShadow.elementsFromPoint = () =>
    unanchoredShadowHit ? [unanchoredInner] : [];
  outsideShadow.elementsFromPoint = () => [outsideInner];
  const unsupported = [];
  const composedElementsFromPoint = createComposedElementsFromPoint({
    composedContains,
    composedParent,
    documentScope,
    onUnsupported: (scope) => unsupported.push(scope.name),
    root: scanRoot,
    shadowRoots: [
      closedShadow,
      nestedShadow,
      emptyShadow,
      unanchoredShadow,
      outsideShadow,
    ],
  });
  return {
    blackSibling,
    blackText,
    layers: composedElementsFromPoint(12, 18),
    retargetedDocumentLayers,
    unsupported,
  };
}

function detectsBlackSiblingAboveBlackText(layers, blackSibling, blackText) {
  const siblingIndex = layers.indexOf(blackSibling);
  const textIndex = layers.indexOf(blackText);
  return siblingIndex >= 0 && textIndex >= 0 && siblingIndex < textIndex;
}

function replaceExactlyOnce(source, original, replacement) {
  const first = source.indexOf(original);
  assert.notEqual(first, -1, `missing mutation preimage: ${original.slice(0, 80)}`);
  assert.equal(
    source.indexOf(original, first + original.length),
    -1,
    `mutation preimage is not unique: ${original.slice(0, 80)}`,
  );
  return `${source.slice(0, first)}${replacement}${source.slice(first + original.length)}`;
}

function sourceSection(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section start: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

function parseTypeScriptSource(source, fileName = "scanner.ts") {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function astNodes(root, predicate) {
  const matches = [];
  const visit = (node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
}

function directPropertyValue(property, sourceFile) {
  if (ts.isPropertyAssignment(property)) return property.initializer.getText(sourceFile);
  if (ts.isShorthandPropertyAssignment(property)) return property.name.text;
  assert.fail(`unsupported contract property: ${property.getText(sourceFile)}`);
}

function assertLearnerCountContract(source) {
  const sourceFile = parseTypeScriptSource(source, "collision-scanner.ts");
  const auditedReferences = astNodes(
    sourceFile,
    (node) => ts.isIdentifier(node) && node.text === "auditedControls",
  );
  const declarations = auditedReferences.filter(
    (identifier) =>
      ts.isVariableDeclaration(identifier.parent) &&
      identifier.parent.name === identifier,
  );
  assert.equal(declarations.length, 1, "auditedControls declaration must be unique");
  const declaration = declarations[0].parent;
  assert.ok(ts.isNewExpression(declaration.initializer));
  assert.equal(declaration.initializer.expression.getText(sourceFile), "Set");

  const addCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "auditedControls" &&
      node.expression.name.text === "add",
  );
  assert.equal(addCalls.length, 1, "auditedControls must have one mutation globally");
  assert.equal(addCalls[0].arguments.length, 1);
  assert.equal(addCalls[0].arguments[0].getText(sourceFile), "control");

  const sizeAccesses = astNodes(
    sourceFile,
    (node) =>
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "auditedControls" &&
      node.name.text === "size",
  );
  assert.equal(sizeAccesses.length, 1, "auditedControls.size must be read once");
  assert.equal(
    auditedReferences.length,
    3,
    "auditedControls may only be declared, guarded-add one control, and read for size",
  );

  const addStatement = addCalls[0].parent;
  assert.ok(ts.isExpressionStatement(addStatement));
  const guard = addStatement.parent;
  assert.ok(ts.isIfStatement(guard));
  assert.equal(guard.thenStatement, addStatement);
  assert.ok(ts.isCallExpression(guard.expression));
  assert.equal(guard.expression.expression.getText(sourceFile), "learnerCertification");
  assert.equal(guard.expression.arguments.length, 1);
  const input = guard.expression.arguments[0];
  assert.ok(ts.isObjectLiteralExpression(input));
  const actualInput = Object.fromEntries(
    input.properties.map((property) => [
      property.name?.getText(sourceFile),
      directPropertyValue(property, sourceFile),
    ]),
  );
  assert.deepEqual(actualInput, {
    auditable: "auditableTouchControl",
    disabled: "disabled",
    excluded: "excludedFromLearnerCount",
    explicitIssue: "controlIssueReported",
    hiddenInput: "hiddenInput",
    semanticHidden: "excludedFromLearnerCount",
  });
  const certificationCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "learnerCertification",
  );
  assert.equal(certificationCalls.length, 1, "learner certification call must be unique");
  const sourceInstallPins = astNodes(
    sourceFile,
    (node) =>
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === "decisionContractSource" &&
      node.initializer.getText(sourceFile) ===
        "hkVisualizationDecisionContractSource",
  );
  assert.equal(
    sourceInstallPins.length,
    2,
    "visibility and collision runtimes must each receive the canonical pinned source",
  );
}

function findUniqueVariableDeclaration(sourceFile, name) {
  const declarations = astNodes(
    sourceFile,
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name,
  );
  assert.equal(declarations.length, 1, `${name} declaration must be unique`);
  return declarations[0];
}

function formValueGlyphFunction(sourceFile) {
  const declaration = findUniqueVariableDeclaration(
    sourceFile,
    "formValueGlyphRects",
  );
  assert.ok(ts.isArrowFunction(declaration.initializer));
  assert.ok(ts.isBlock(declaration.initializer.body));
  return declaration.initializer;
}

function nodesInFunction(functionNode, predicate) {
  const matches = [];
  const visit = (node) => {
    if (node !== functionNode && ts.isFunctionLike(node)) return;
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(functionNode.body);
  return matches;
}

function objectPropertyMap(objectLiteral, sourceFile) {
  assert.ok(ts.isObjectLiteralExpression(objectLiteral));
  return Object.fromEntries(
    objectLiteral.properties.map((property) => [
      property.name?.getText(sourceFile),
      directPropertyValue(property, sourceFile),
    ]),
  );
}

function normalized(node, sourceFile) {
  return node.getText(sourceFile).replace(/\s+/gu, "");
}

function ancestor(node, predicate, stop) {
  let current = node.parent;
  while (current && current !== stop) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

function returnUnsupportedReason(returnNode, sourceFile) {
  if (!returnNode.expression || !ts.isObjectLiteralExpression(returnNode.expression))
    return undefined;
  const property = returnNode.expression.properties.find(
    (candidate) => candidate.name?.getText(sourceFile) === "unsupportedReason",
  );
  return property ? directPropertyValue(property, sourceFile) : undefined;
}

function multiSelectBranchFor(node, functionNode, sourceFile) {
  return ancestor(
    node,
    (candidate) =>
      ts.isIfStatement(candidate) &&
      normalized(candidate.expression, sourceFile) ===
        "controlinstanceofHTMLSelectElement&&(control.multiple||control.size>1)",
    functionNode.body,
  );
}

function assertSoftWrapContract(source) {
  const sourceFile = parseTypeScriptSource(source);
  const functionNode = formValueGlyphFunction(sourceFile);
  const calls = nodesInFunction(
    functionNode,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "softWrapDecision",
  );
  assert.equal(calls.length, 1, "softWrapDecision call must be unique in form geometry");
  const globalCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "softWrapDecision",
  );
  assert.equal(globalCalls.length, 1, "softWrapDecision call must be unique globally");
  const call = calls[0];
  assert.equal(call.arguments.length, 1);
  assert.deepEqual(objectPropertyMap(call.arguments[0], sourceFile), {
    contentWidth: "contentWidth",
    isTextarea: "control instanceof HTMLTextAreaElement",
    lineWidths: "measuredLines.map(({ measured }) => measured.width)",
    wrap: 'control instanceof HTMLTextAreaElement ? control.wrap : "off"',
  });

  const resultDeclaration = call.parent;
  assert.ok(ts.isVariableDeclaration(resultDeclaration));
  assert.equal(resultDeclaration.initializer, call);
  assert.equal(
    resultDeclaration.name.getText(sourceFile),
    "softWrapUnsupportedReason",
  );
  const resultStatement = resultDeclaration.parent.parent;
  assert.ok(ts.isVariableStatement(resultStatement));
  assert.equal(resultStatement.parent, functionNode.body);
  const resultIndex = functionNode.body.statements.indexOf(resultStatement);
  assert.ok(resultIndex >= 0);
  const failClosedGuard = functionNode.body.statements[resultIndex + 1];
  assert.ok(ts.isIfStatement(failClosedGuard));
  assert.equal(
    failClosedGuard.expression.getText(sourceFile),
    "softWrapUnsupportedReason",
  );
  const failClosedReturn = ts.isReturnStatement(failClosedGuard.thenStatement)
    ? failClosedGuard.thenStatement
    : null;
  assert.ok(failClosedReturn);
  assert.equal(
    returnUnsupportedReason(failClosedReturn, sourceFile),
    "softWrapUnsupportedReason",
  );

  const earlyCleanReturns = nodesInFunction(
    functionNode,
    (node) =>
      ts.isReturnStatement(node) &&
      node.pos < resultStatement.pos &&
      returnUnsupportedReason(node, sourceFile) === "null",
  );
  assert.ok(earlyCleanReturns.length >= 1, "multi-select success must remain explicit");
  for (const returnNode of earlyCleanReturns)
    assert.ok(
      multiSelectBranchFor(returnNode, functionNode, sourceFile),
      "no clean form-geometry return may bypass the textarea soft-wrap decision",
    );

  const alternateWidthDecisions = astNodes(
    sourceFile,
    (node) =>
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken &&
      normalized(node, sourceFile).includes("contentWidth+0.5"),
  );
  assert.equal(
    alternateWidthDecisions.length,
    0,
    "runtime must not duplicate the pinned soft-wrap width decision",
  );
}

function assertPartialMultiSelectContract(source) {
  const sourceFile = parseTypeScriptSource(source);
  const functionNode = formValueGlyphFunction(sourceFile);
  const calls = nodesInFunction(
    functionNode,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "multiSelectCompleteness",
  );
  assert.equal(
    calls.length,
    1,
    "multiSelectCompleteness call must be unique in form geometry",
  );
  const globalCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "multiSelectCompleteness",
  );
  assert.equal(
    globalCalls.length,
    1,
    "multiSelectCompleteness call must be unique globally",
  );
  const call = calls[0];
  assert.deepEqual(
    call.arguments.map((argument) => argument.getText(sourceFile)),
    ["eligibleOptionCount", "measurableOptionCount"],
  );
  const completenessGuard = ancestor(
    call,
    ts.isIfStatement,
    functionNode.body,
  );
  assert.ok(completenessGuard);
  assert.equal(
    normalized(completenessGuard.expression, sourceFile),
    "!multiSelectCompleteness(eligibleOptionCount,measurableOptionCount)",
  );
  const multiSelectBranch = multiSelectBranchFor(
    call,
    functionNode,
    sourceFile,
  );
  assert.ok(multiSelectBranch);
  assert.ok(ts.isBlock(multiSelectBranch.thenStatement));
  const selectStatements = multiSelectBranch.thenStatement.statements;
  assert.equal(selectStatements.at(-2), completenessGuard);
  const successReturn = selectStatements.at(-1);
  assert.ok(ts.isReturnStatement(successReturn));
  assert.equal(returnUnsupportedReason(successReturn, sourceFile), "null");
  const unsupportedReturn = ts.isReturnStatement(completenessGuard.thenStatement)
    ? completenessGuard.thenStatement
    : null;
  assert.ok(unsupportedReturn);
  assert.equal(
    returnUnsupportedReason(unsupportedReturn, sourceFile),
    '"multi-row select option geometry is unavailable"',
  );

  for (const counter of ["eligibleOptionCount", "measurableOptionCount"]) {
    const declarations = nodesInFunction(
      functionNode,
      (node) =>
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === counter,
    );
    assert.equal(declarations.length, 1, `${counter} declaration must be unique`);
    assert.equal(declarations[0].initializer?.getText(sourceFile), "0");
    assert.ok(
      (declarations[0].parent.flags & ts.NodeFlags.Let) !== 0,
      `${counter} must be a local let counter`,
    );
    const writes = nodesInFunction(
      functionNode,
      (node) =>
        ts.isBinaryExpression(node) &&
        ts.isIdentifier(node.left) &&
        node.left.text === counter &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment,
    );
    assert.equal(writes.length, 1, `${counter} may only be incremented once syntactically`);
    assert.equal(
      normalized(writes[0], sourceFile),
      `${counter}+=1`,
      `${counter} cannot be normalized or forged before completeness`,
    );
    const updates = nodesInFunction(
      functionNode,
      (node) =>
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        ts.isIdentifier(node.operand) &&
        node.operand.text === counter,
    );
    assert.equal(updates.length, 0, `${counter} cannot use alternate updates`);
    const references = nodesInFunction(
      functionNode,
      (node) => ts.isIdentifier(node) && node.text === counter,
    );
    assert.equal(
      references.length,
      3,
      `${counter} may only be declared, incremented, and passed to the decision`,
    );
  }
}

function assertExactComposedContains(sourceFile, declaration) {
  assert.ok(ts.isArrowFunction(declaration.initializer));
  assert.ok(ts.isBlock(declaration.initializer.body));
  const statements = declaration.initializer.body.statements;
  assert.equal(statements.length, 3, "composedContains cannot have surplus bypasses");
  assert.ok(ts.isVariableStatement(statements[0]));
  assert.equal(normalized(statements[0], sourceFile), "letcurrent:Element|null=candidate;");
  assert.ok(ts.isWhileStatement(statements[1]));
  assert.equal(statements[1].expression.getText(sourceFile), "current");
  assert.ok(ts.isBlock(statements[1].statement));
  assert.equal(statements[1].statement.statements.length, 2);
  assert.equal(
    normalized(statements[1].statement.statements[0], sourceFile),
    "if(current===container)returntrue;",
  );
  assert.equal(
    normalized(statements[1].statement.statements[1], sourceFile),
    "current=composedParent(current);",
  );
  assert.ok(ts.isReturnStatement(statements[2]));
  assert.equal(statements[2].expression?.kind, ts.SyntaxKind.FalseKeyword);
}

function assertSiblingPairAncestryContract(source, expectedAliasCount = 1) {
  const sourceFile = parseTypeScriptSource(source);
  const aliases = astNodes(
    sourceFile,
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "composedParent",
  );
  assert.equal(
    aliases.length,
    expectedAliasCount,
    "every composed runtime scope must have one canonical parent alias",
  );
  for (const alias of aliases) {
    assert.equal(alias.initializer?.getText(sourceFile), "composedParentBehavior");
    assert.ok((alias.parent.flags & ts.NodeFlags.Const) !== 0);
  }
  const directBehaviorCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "composedParentBehavior",
  );
  assert.equal(
    directBehaviorCalls.length,
    0,
    "composed ancestry consumers must share the exact canonical alias",
  );

  const containsDeclarations = astNodes(
    sourceFile,
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "composedContains",
  );
  assert.equal(containsDeclarations.length, 1);
  assertExactComposedContains(sourceFile, containsDeclarations[0]);

  const parentCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "composedParent",
  );
  assert.ok(parentCalls.length >= 3, "composed parent must drive ancestry and paint walks");

  if (source.includes("const controls = semanticControls.filter")) {
    const firstSecond = astNodes(
      sourceFile,
      (node) =>
        ts.isIfStatement(node) &&
        normalized(node.expression, sourceFile) ===
          "composedContains(first,second)||composedContains(second,first)",
    );
    assert.equal(firstSecond.length, 1, "control-pair ancestry skip must be unique");
    assert.ok(ts.isContinueStatement(firstSecond[0].thenStatement));
    const pairBody = firstSecond[0].parent;
    assert.ok(ts.isBlock(pairBody));
    const pairLoop = pairBody.parent;
    assert.ok(ts.isForStatement(pairLoop));
    assert.equal(
      normalized(pairLoop.condition, sourceFile),
      "secondIndex<controls.length",
    );
    assert.equal(pairBody.statements[2], firstSecond[0]);
    assert.equal(
      normalized(pairBody.statements[3], sourceFile),
      "if(pairIsNarrowlyExempt(first,second))continue;",
    );
  }
}

test("imported learner certification rejects every hidden or unaudited control", () => {
  const learnerCertification =
    collisionScannerModule.hkVisualizationLearnerCertification;
  assert.equal(typeof learnerCertification, "function");
  const base = {
    auditable: true,
    disabled: false,
    excluded: false,
    explicitIssue: false,
    hiddenInput: false,
    semanticHidden: false,
  };
  assert.equal(learnerCertification(base), true);
  assert.equal(
    learnerCertification({ ...base, auditable: false, explicitIssue: true }),
    true,
  );
  assert.equal(learnerCertification({ ...base, auditable: false }), false);
  for (const blockingFlag of [
    "disabled",
    "excluded",
    "hiddenInput",
    "semanticHidden",
  ]) {
    assert.equal(
      learnerCertification({ ...base, [blockingFlag]: true }),
      false,
      blockingFlag,
    );
    assert.equal(
      learnerCertification({
        ...base,
        auditable: false,
        explicitIssue: true,
        [blockingFlag]: true,
      }),
      false,
      `${blockingFlag} cannot be bypassed by an explicit issue`,
    );
  }
});

test("imported soft-wrap decision fails closed only beyond the measured tolerance", () => {
  const softWrapDecision =
    collisionScannerModule.hkVisualizationSoftWrapDecision;
  assert.equal(typeof softWrapDecision, "function");
  const reason =
    "textarea soft-wrapped glyph positions are not exposed by DOM geometry";
  const base = {
    contentWidth: 100,
    isTextarea: true,
    lineWidths: [40, 100.5001],
    wrap: "soft",
  };
  assert.equal(softWrapDecision(base), reason);
  assert.equal(softWrapDecision({ ...base, lineWidths: [100.5] }), null);
  assert.equal(softWrapDecision({ ...base, wrap: "off" }), null);
  assert.equal(softWrapDecision({ ...base, isTextarea: false }), null);
  assert.equal(softWrapDecision({ ...base, lineWidths: [] }), null);
  assert.equal(softWrapDecision({ ...base, wrap: "hard" }), reason);
});

test("imported multi-select completeness accepts only equal nonnegative safe integers", () => {
  const multiSelectCompleteness =
    collisionScannerModule.hkVisualizationMultiSelectCompleteness;
  assert.equal(typeof multiSelectCompleteness, "function");
  assert.equal(multiSelectCompleteness(0, 0), true);
  assert.equal(multiSelectCompleteness(4, 4), true);
  assert.equal(multiSelectCompleteness(4, 3), false);
  assert.equal(multiSelectCompleteness(0, 1), false);
  for (const invalid of [
    -1,
    0.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.equal(multiSelectCompleteness(invalid, 0), false);
    assert.equal(multiSelectCompleteness(0, invalid), false);
  }
});

test("imported composed-parent behavior executes slot, light, shadow, and null precedence", () => {
  const composedParentBehavior =
    collisionScannerModule.hkVisualizationComposedParentBehavior;
  assert.equal(typeof composedParentBehavior, "function");
  const slot = { name: "slot" };
  const lightParent = { name: "light-parent" };
  const shadowHost = { name: "shadow-host" };
  const slotted = {
    assignedSlot: slot,
    parentElement: lightParent,
    getRootNode: () => ({ host: shadowHost }),
  };
  const light = {
    assignedSlot: null,
    parentElement: lightParent,
    getRootNode: () => ({ host: shadowHost }),
  };
  const shadowed = {
    assignedSlot: null,
    parentElement: null,
    getRootNode: () => ({ host: shadowHost }),
  };
  const detached = {
    assignedSlot: null,
    parentElement: null,
    getRootNode: () => ({ nodeType: 9 }),
  };
  assert.equal(composedParentBehavior(slotted), slot);
  assert.equal(composedParentBehavior(light), lightParent);
  assert.equal(composedParentBehavior(shadowed), shadowHost);
  assert.equal(composedParentBehavior(detached), null);
});

test("decision contract source is statically pinned, exact-shaped, and executable", () => {
  const source =
    collisionScannerModule.hkVisualizationDecisionContractSource;
  const expectedSha256 =
    collisionScannerModule.hkVisualizationDecisionContractSourceSha256;
  assert.equal(
    createHash("sha256").update(source, "utf8").digest("hex"),
    expectedSha256,
  );
  const compiled =
    collisionScannerModule.compileHkVisualizationDecisionContract();
  assert.equal(Object.isFrozen(compiled), true);
  assert.deepEqual(Object.keys(compiled), [
    "composedParentBehavior",
    "learnerCertification",
    "multiSelectCompleteness",
    "softWrapDecision",
  ]);
  for (const decision of Object.values(compiled))
    assert.equal(typeof decision, "function");

  const contractFile = parseTypeScriptSource(
    `const decisionContract = ${source};`,
    "pinned-decision-contract.ts",
  );
  const declaration = findUniqueVariableDeclaration(
    contractFile,
    "decisionContract",
  );
  let initializer = declaration.initializer;
  while (initializer && ts.isParenthesizedExpression(initializer))
    initializer = initializer.expression;
  assert.ok(ts.isObjectLiteralExpression(initializer));
  const properties = initializer.properties;
  assert.deepEqual(
    properties.map((property) => property.name?.getText(contractFile)),
    [
      "composedParentBehavior",
      "learnerCertification",
      "multiSelectCompleteness",
      "softWrapDecision",
    ],
  );
  assert.deepEqual(
    properties.map((property) =>
      ts.isPropertyAssignment(property) &&
      ts.isFunctionExpression(property.initializer)
        ? property.initializer.name?.text
        : null
    ),
    [
      "hkVisualizationComposedParentBehavior",
      "hkVisualizationLearnerCertification",
      "hkVisualizationMultiSelectCompleteness",
      "hkVisualizationSoftWrapDecision",
    ],
  );
});

test("decision compilers fail closed for tampering, invalid shape, and CSP-style Function rejection", () => {
  const source =
    collisionScannerModule.hkVisualizationDecisionContractSource;
  const expectedSha256 =
    collisionScannerModule.hkVisualizationDecisionContractSourceSha256;
  const compile =
    collisionScannerModule.compileHkVisualizationDecisionContract;
  assert.throws(
    () => compile(`${source}\n`, expectedSha256),
    /import pin mismatch/u,
  );
  assert.throws(
    () => compile(source, "0".repeat(64)),
    /import pin mismatch/u,
  );
  assert.throws(
    () =>
      compile(source, expectedSha256, () => {
        throw new EvalError("synthetic CSP unsafe-eval rejection");
      }),
    /construction failed closed/u,
  );
  assert.throws(
    () => compile(source, expectedSha256, () => () => ({})),
    /invalid shape/u,
  );
  const earlyNullParent = source.replace(
    "composedParentBehavior: function hkVisualizationComposedParentBehavior(element) {",
    "composedParentBehavior: function hkVisualizationComposedParentBehavior(element) {\n    return null;",
  );
  assert.notEqual(earlyNullParent, source);
  assert.throws(
    () => compile(earlyNullParent, expectedSha256),
    /import pin mismatch/u,
  );
  assert.throws(
    () =>
      compiledContrastScannerCompiler(contrastSource)(() => {
        throw new EvalError("synthetic scanner serialization rejection");
      }),
    /serialization failed closed/u,
  );
});

test("contrast serialization embeds the one collision-owned decision source with no import cycle", () => {
  const source =
    collisionScannerModule.hkVisualizationDecisionContractSource;
  const serialized = compiledContrastScannerCompiler(contrastSource)()
    .toString();
  assert.equal(serialized.split(source).length - 1, 1);
  assert.match(serialized, /scanHkVisualizationTextContrastRuntime/u);
  assert.doesNotMatch(collisionSource, /hk-visualization-text-contrast-scanner/u);

  const sourceFile = parseTypeScriptSource(contrastSource, "contrast-scanner.ts");
  const collisionImports = astNodes(
    sourceFile,
    (node) =>
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.getText(sourceFile) ===
        '"./hk-visualization-collision-scanner"',
  );
  assert.equal(collisionImports.length, 1);
  const importedNames = collisionImports[0].importClause?.namedBindings;
  assert.ok(importedNames && ts.isNamedImports(importedNames));
  assert.deepEqual(
    importedNames.elements.map((element) => element.name.text),
    [
      "compileHkVisualizationDecisionContract",
      "hkVisualizationDecisionContractSource",
      "HkVisualizationDecisionContract",
    ],
  );

  const runtimeDeclarations = astNodes(
    sourceFile,
    (node) =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "scanHkVisualizationTextContrastRuntime",
  );
  assert.equal(runtimeDeclarations.length, 1);
  const runtimeSourceDeclarations = astNodes(
    sourceFile,
    (node) =>
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "runtimeSource",
  );
  assert.equal(runtimeSourceDeclarations.length, 1);
  assert.equal(
    runtimeSourceDeclarations[0].initializer?.getText(sourceFile),
    "scanHkVisualizationTextContrastRuntime.toString()",
  );
  const compilerDeclarations = astNodes(
    sourceFile,
    (node) =>
      ts.isFunctionDeclaration(node) &&
      node.name?.text === "compileHkVisualizationTextContrastScanner",
  );
  assert.equal(compilerDeclarations.length, 1);
  assert.equal(compilerDeclarations[0].parameters.length, 1);
  assert.equal(compilerDeclarations[0].parameters[0].name.getText(sourceFile), "functionConstructor");
});

test("browser Function reconstruction is internal-only and throws explicitly on failure", () => {
  const sourceFile = parseTypeScriptSource(collisionSource, "collision-scanner.ts");
  const browserFunctionCalls = astNodes(
    sourceFile,
    (node) =>
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === "Function",
  );
  assert.equal(browserFunctionCalls.length, 2);
  const allowedInterpolations = new Set([
    "decisionContractSource",
    "scanOptions.decisionContractSource",
  ]);
  for (const call of browserFunctionCalls) {
    const enclosingTry = ancestor(call, ts.isTryStatement, sourceFile);
    assert.ok(enclosingTry?.catchClause);
    assert.ok(
      astNodes(enclosingTry.catchClause.block, ts.isThrowStatement).length >= 1,
      "a CSP/constructor failure must throw instead of falling back",
    );
    assert.equal(call.arguments.length, 1);
    assert.ok(ts.isTemplateExpression(call.arguments[0]));
    assert.deepEqual(
      call.arguments[0].templateSpans.map((span) =>
        span.expression.getText(sourceFile)
      ),
      [
        call.arguments[0].templateSpans[0].expression.getText(sourceFile),
      ],
    );
    assert.ok(
      allowedInterpolations.has(
        call.arguments[0].templateSpans[0].expression.getText(sourceFile),
      ),
    );
  }
});

test("contrast source contract declares recorded closed-shadow text, form, and SVG traversal", () => {
  assertContrastComposedTraversal(contrastSource);
});

test("collision composed hit-test executes inner closed and nested layers before retargeted hosts", () => {
  const complete = exerciseComposedHitTestFactory(collisionSource);
  assert.deepEqual(complete.layers.map(({ name }) => name), [
    "black-sibling",
    "nested-inner",
    "nested-host",
    "black-text",
    "closed-host",
    "empty-host",
    "scan-root",
  ]);
  assert.equal(new Set(complete.layers).size, complete.layers.length);
  assert.equal(
    detectsBlackSiblingAboveBlackText(
      complete.retargetedDocumentLayers,
      complete.blackSibling,
      complete.blackText,
    ),
    false,
    "document host-retarget evidence alone would silently miss the inner black occluder",
  );
  assert.ok(
    detectsBlackSiblingAboveBlackText(
      complete.layers,
      complete.blackSibling,
      complete.blackText,
    ),
    "black sibling paint must remain above black text instead of false-green host retargeting",
  );
  assert.deepEqual(complete.unsupported, []);

  const missingNested = exerciseComposedHitTestFactory(collisionSource, {
    missingNestedHitTest: true,
  });
  assert.deepEqual(missingNested.unsupported, ["nested-shadow"]);
  assert.doesNotMatch(
    missingNested.layers.map(({ name }) => name).join("|"),
    /outside/u,
  );
  const throwingNested = exerciseComposedHitTestFactory(collisionSource, {
    throwingNestedHitTest: true,
  });
  assert.deepEqual(throwingNested.unsupported, ["nested-shadow"]);
});

test("contrast composed hit-test exposes a black shadow sibling above black text", () => {
  const complete = exerciseComposedHitTestFactory(contrastSource);
  assert.deepEqual(complete.layers.map(({ name }) => name), [
    "black-sibling",
    "nested-inner",
    "nested-host",
    "black-text",
    "closed-host",
    "empty-host",
    "scan-root",
  ]);
  assert.equal(
    detectsBlackSiblingAboveBlackText(
      complete.retargetedDocumentLayers,
      complete.blackSibling,
      complete.blackText,
    ),
    false,
  );
  assert.ok(
    detectsBlackSiblingAboveBlackText(
      complete.layers,
      complete.blackSibling,
      complete.blackText,
    ),
  );
  assert.equal(new Set(complete.layers).size, complete.layers.length);
  assert.deepEqual(complete.unsupported, []);

  const missingNested = exerciseComposedHitTestFactory(contrastSource, {
    missingNestedHitTest: true,
  });
  assert.deepEqual(missingNested.unsupported, ["nested-shadow"]);
  assert.doesNotMatch(
    missingNested.layers.map(({ name }) => name).join("|"),
    /outside/u,
  );
  const throwingNested = exerciseComposedHitTestFactory(contrastSource, {
    throwingNestedHitTest: true,
  });
  assert.deepEqual(throwingNested.unsupported, ["nested-shadow"]);
});

test("unanchored in-scope shadow hits fail closed when parent paint order is unavailable", () => {
  for (const source of [collisionSource, contrastSource]) {
    const result = exerciseComposedHitTestFactory(source, {
      unanchoredShadowHit: true,
    });
    assert.deepEqual(result.unsupported, ["unanchored-shadow"]);
    assert.doesNotMatch(
      result.layers.map(({ name }) => name).join("|"),
      /unanchored-inner/u,
    );
  }
});

test("narrow overlap owners enumerate only their in-scope composed descendants", () => {
  const overlapAudit = sourceSection(
    collisionSource,
    "const overlapRisks = new Map<Element, HkVisualizationOverlapOwnerRisk>();",
    "const semanticControls = queryAllComposed(scanOptions.controlSelector);",
  );
  assert.match(
    overlapAudit,
    /queryAllComposed\("\[data-viz-overlap-ok\]"\)\s*\.filter\(learnerVisible\)/u,
  );
  assert.match(
    overlapAudit,
    /queryAllComposed\(candidateSelector\)[\s\S]*composedContains\(owner, candidate\)[\s\S]*candidateVisible\(candidate\)/u,
  );
  assert.match(
    overlapAudit,
    /for \(const textScope of composedScopes\)[\s\S]*document\.createTreeWalker\(\s*textScope,[\s\S]*composedContains\(owner, parent\)/u,
  );
  assert.doesNotMatch(
    overlapAudit,
    /(?:root|owner)\.querySelectorAll\(/u,
  );
});

test("all shadow-sensitive paint consumers use the composed hit-test registry", () => {
  for (const source of [collisionSource, contrastSource]) {
    assert.doesNotMatch(source, /document\.elementsFromPoint\(/u);
    assert.match(
      source,
      /const shadowRootByHost = new Map<Element, ShadowRoot>[\s\S]*hitTestContains\(hitTestRoot, shadowRoot\.host\)[\s\S]*shadowRootByHost\.set/u,
    );
    assert.match(
      source,
      /if \(!belongsToScope\(scope, layer\) \|\| seenElements\.has\(layer\)\)[\s\S]*seenElements\.add\(layer\)[\s\S]*if \(shadowRoot\) visitScope\(shadowRoot\)[\s\S]*orderedLayers\.push\(layer\)/u,
    );
    assert.match(
      source,
      /if \(scope === documentScope\) return true;\s*if \(!\("host" in scope\)\) \{\s*onUnsupported\(scope\);\s*return false;\s*\}/u,
    );
    assert.match(
      source,
      /shadowRoots: composedShadowRoots/u,
    );
    assert.match(
      source,
      /required composed scope cannot supply elementsFromPoint evidence/u,
    );
  }
  assert.match(collisionSource, /kind: "unsupported-shadow-hit-test"/u);
  assert.match(
    contrastSource,
    /"unsupported-shadow-hit-test"[\s\S]*composedElementsFromPoint\(point\.x, point\.y\)/u,
  );
});

test("learner-count contract kills removal of the semantic-hidden count gate", () => {
  assertLearnerCountContract(collisionSource);
  const mutant = replaceExactlyOnce(
    collisionSource,
    "            semanticHidden: excludedFromLearnerCount,",
    "            semanticHidden: false,",
  );
  assert.throws(() => assertLearnerCountContract(mutant));
});

test("learner-count contract kills an unconditional post-gate certification bypass", () => {
  assertLearnerCountContract(collisionSource);
  const mutant = replaceExactlyOnce(
    collisionSource,
    "      const learnerControlCount = auditedControls.size;",
    `      for (const candidate of semanticControls)
        auditedControls.add(candidate);
      const learnerControlCount = auditedControls.size;`,
  );
  assert.throws(() => assertLearnerCountContract(mutant));
});

test("soft-wrap contract kills bypass of the fail-closed geometry branch", () => {
  for (const [source, indentation] of [
    [collisionSource, "        "],
    [contrastSource, "    "],
  ]) {
    assertSoftWrapContract(source);
    const mutant = replaceExactlyOnce(
      source,
      `${indentation}const softWrapUnsupportedReason = softWrapDecision({`,
      `${indentation}const softWrapUnsupportedReason = false && softWrapDecision({`,
    );
    assert.throws(() => assertSoftWrapContract(mutant));
  }
});

test("soft-wrap contract kills an early clean return before fail-close", () => {
  for (const [source, indentation] of [
    [collisionSource, "        "],
    [contrastSource, "    "],
  ]) {
    assertSoftWrapContract(source);
    const hardLines = `${indentation}const hardLines = rawText.split(/\\r\\n?|\\n/u);`;
    const mutant = replaceExactlyOnce(
      source,
      hardLines,
      `${indentation}if (control instanceof HTMLTextAreaElement)\n${indentation}  return { fragments: [], unsupportedReason: null };\n${hardLines}`,
    );
    assert.throws(() => assertSoftWrapContract(mutant));
  }
});

test("multi-select contract kills partial-measurability omission", () => {
  for (const [source, indentation] of [
    [collisionSource, "            "],
    [contrastSource, "        "],
  ]) {
    assertPartialMultiSelectContract(source);
    const mutant = replaceExactlyOnce(
      source,
      `${indentation}!multiSelectCompleteness(`,
      `${indentation}false && !multiSelectCompleteness(`,
    );
    assert.throws(() => assertPartialMultiSelectContract(mutant));
  }
});

test("multi-select contract kills forced equality before completeness check", () => {
  for (const [source, indentation] of [
    [collisionSource, "          "],
    [contrastSource, "      "],
  ]) {
    assertPartialMultiSelectContract(source);
    const completenessCheck = `${indentation}if (\n${indentation}  !multiSelectCompleteness(`;
    const mutant = replaceExactlyOnce(
      source,
      completenessCheck,
      `${indentation}eligibleOptionCount -=\n${indentation}  eligibleOptionCount - measurableOptionCount;\n${completenessCheck}`,
    );
    assert.throws(() => assertPartialMultiSelectContract(mutant));
  }
});

test("control-pair contract kills bypass of the full composed-ancestry skip", () => {
  assertSiblingPairAncestryContract(collisionSource, 2);
  const mutant = replaceExactlyOnce(
    collisionSource,
    `          if (
            composedContains(first, second) || composedContains(second, first)
          )
            continue;`,
    `          if (false) {
            if (
              composedContains(first, second) || composedContains(second, first)
            )
              continue;
          }`,
  );
  assert.throws(() => assertSiblingPairAncestryContract(mutant, 2));
});

test("control-pair contract kills an early-false composed ancestry helper", () => {
  assertSiblingPairAncestryContract(collisionSource, 2);
  const helperStart =
    "      const composedContains = (container: Element, candidate: Element) => {";
  const mutant = replaceExactlyOnce(
    collisionSource,
    helperStart,
    `${helperStart}\n        return false;`,
  );
  assert.throws(() => assertSiblingPairAncestryContract(mutant, 2));
});

test("composed-parent contract kills an early-null runtime bypass", () => {
  assertSiblingPairAncestryContract(collisionSource, 2);
  const mutant = replaceExactlyOnce(
    collisionSource,
    "      const composedParent = composedParentBehavior;",
    `      const composedParent = (element: Element) => {
        return null;
        return composedParentBehavior(element);
      };`,
  );
  assert.throws(() => assertSiblingPairAncestryContract(mutant, 2));
});

test("keyboard-focusable opacity-zero controls are audited instead of disappearing with visual candidates", () => {
  assert.match(collisionSource, /const semanticControls = queryAllComposed\(/u);
  assert.match(
    collisionSource,
    /const controls = semanticControls\.filter\([\s\S]*learnerVisible\(control\)[\s\S]*!disabledControl\(control\)/u,
  );
  assert.match(
    collisionSource,
    /keyboardFocusable[\s\S]*!learnerVisible\(control\)[\s\S]*"control-hidden-focusable"/u,
  );
});

test("zero-area semantic controls emit an explicit touch-target violation", () => {
  assert.match(
    collisionSource,
    /const zeroArea = visibility\.width <= 1 \|\| visibility\.height <= 1/u,
  );
  assert.match(
    collisionSource,
    /if \(zeroArea && auditableTouchControl\)[\s\S]*kind: "control-touch-target"[\s\S]*zero-area semantic control/u,
  );
  assert.match(
    collisionSource,
    /if \(zeroArea && auditableTouchControl\)[\s\S]*else if \([\s\S]*keyboardFocusable\(control\)[\s\S]*!learnerVisible\(control\)/u,
  );
});

test("a separate 44 by 44 label-for region honestly satisfies a checkbox target", () => {
  assert.match(
    collisionSource,
    /const associatedLabels =[\s\S]*Array\.from\(control\.labels \?\? \[\]\)/u,
  );
  assert.match(
    collisionSource,
    /const activationRects:[\s\S]*associatedLabels[\s\S]*activationRects\.push\(label\.getBoundingClientRect\(\)\)/u,
  );
  assert.match(
    collisionSource,
    /const hasMinimumTouchTarget = activationRects\.some\([\s\S]*width >= 44 && height >= 44/u,
  );
  assert.match(
    collisionSource,
    /if \([\s\S]*!excludedFromLearnerCount[\s\S]*auditedControls\.add\(control\)/u,
  );
  assert.match(
    collisionSource,
    /const learnerControlCount = auditedControls\.size/u,
  );
  assert.doesNotMatch(collisionSource, /unionActivationRect/u);
});

test("semantically hidden controls cannot certify learner coverage but focusability conflicts stay explicit", () => {
  assert.match(
    collisionSource,
    /const excludedFromLearnerCount =\s*visibility\.displayNoneAncestor \|\|[\s\S]*visibility\.ariaHiddenAncestor/u,
  );
  assert.match(
    collisionSource,
    /if \(auditableTouchControl\)[\s\S]*for \(const label of associatedLabels\)/u,
  );
  assert.match(
    collisionSource,
    /keyboardFocusable\(control\) &&[\s\S]*!learnerVisible\(control\)[\s\S]*"control-hidden-focusable"/u,
  );
  assert.match(
    collisionSource,
    /learnerCertification\(\{[\s\S]*excluded: excludedFromLearnerCount,[\s\S]*explicitIssue: controlIssueReported,[\s\S]*semanticHidden: excludedFromLearnerCount,[\s\S]*\}\)[\s\S]*auditedControls\.add\(control\)/u,
  );
  assert.doesNotMatch(
    collisionSource,
    /if \(visibility\.visuallyVisible \|\| hasMinimumTouchTarget\)\s*auditedControls\.add/u,
  );
  assert.match(
    collisionSource,
    /const disabledControl =[\s\S]*control\.disabled[\s\S]*const disabled = disabledControl\(control\)[\s\S]*if \(disabled \|\| hiddenInput\) return/u,
  );
});

test("zero-area disjoint pseudo paint and a rounded sibling beneath text do not false-red", () => {
  assert.match(
    contrastSource,
    /const pseudoPaintIntersects = \([\s\S]*boxWidth <= 0 \|\| boxHeight <= 0[\s\S]*return false/u,
  );
  assert.match(
    contrastSource,
    /if \(!pseudoPaintIntersects\(element, style, textRects\)\) continue/u,
  );
  assert.match(
    contrastSource,
    /composedElementsFromPoint\(point\.x, point\.y\)[\s\S]*layerIndex < candidateIndex/u,
  );
});

test("form values use measured glyph fragments rather than the whole content box", () => {
  for (const source of [collisionSource, contrastSource]) {
    assert.match(
      source,
      /const displayedFormValue = \(control:[\s\S]*selectedOptions[\s\S]*control\.value/u,
    );
    assert.match(
      source,
      /const formValueGlyphRects = \([\s\S]*measureText\(line\)[\s\S]*metrics\.width/u,
    );
    assert.match(
      source,
      /const rawRight = rawLeft \+ glyphWidth[\s\S]*Math\.max\(clip\.left, rawLeft\)[\s\S]*Math\.min\(clip\.right, rawRight\)/u,
    );
    assert.doesNotMatch(
      source,
      /form-value[\s\S]{0,240}getBoundingClientRect\(\)[\s\S]{0,80}rects:/u,
    );
  }
  assert.match(collisionSource, /description: `form-value\[/u);
  assert.match(
    contrastSource,
    /element: fragment\.element,[\s\S]*rects: \[fragment\.rect\],[\s\S]*text: fragment\.text/u,
  );
});

test("textarea hard newlines and both scroll axes are preserved before clipping glyphs", () => {
  for (const source of [collisionSource, contrastSource]) {
    assert.ok(source.includes("const hardLines = rawText.split(/\\r\\n?|\\n/u);"));
    assert.match(
      source,
      /const horizontalScroll = control\.scrollLeft \* scaleX/u,
    );
    assert.match(
      source,
      /const verticalScroll = control instanceof HTMLTextAreaElement[\s\S]*control\.scrollTop \* scaleY/u,
    );
    assert.match(
      source,
      /contentTop \+ lineIndex \* lineHeight - verticalScroll/u,
    );
    assert.match(
      source,
      /Math\.max\(clip\.left, rawLeft\)[\s\S]*Math\.min\(clip\.right, rawRight\)/u,
    );
    assert.doesNotMatch(
      source,
      /formValueGlyphGeometry\(control,\s*displayedFormValue\(control\)\.replace/u,
    );
  }
});

test("single-line horizontal scroll keeps resolved alignment and explicit line height", () => {
  for (const source of [collisionSource, contrastSource]) {
    assert.match(
      source,
      /const resolvedTextAlign = \([\s\S]*style\.direction === "rtl"/u,
    );
    assert.match(
      source,
      /const lineHeight = Math\.max\([\s\S]*rawLineHeight/u,
    );
    assert.match(
      source,
      /resolvedTextAlign\(style\)[\s\S]*- horizontalScroll/u,
    );
  }
});

test("textarea soft wrapping fails closed instead of inventing a full-width glyph rectangle", () => {
  assert.match(
    collisionSource,
    /"unsupported-form-value-geometry"/u,
  );
  assert.match(
    contrastSource,
    /"unsupported-form-value-geometry"/u,
  );
  for (const source of [collisionSource, contrastSource]) {
    assertSoftWrapContract(source);
    assert.match(
      source,
      /softWrapUnsupportedReason[\s\S]*fragments: \[\][\s\S]*unsupportedReason: softWrapUnsupportedReason/u,
    );
    assert.doesNotMatch(
      source,
      /const glyphWidth = Math\.min\(\s*contentWidth/u,
    );
  }
});

test("multi-row selects inspect visible unselected option labels or explicitly fail closed", () => {
  for (const source of [collisionSource, contrastSource]) {
    assertPartialMultiSelectContract(source);
    assert.match(
      source,
      /control instanceof HTMLSelectElement &&\s*\(control\.multiple \|\| control\.size > 1\)/u,
    );
    assert.match(
      source,
      /for \(const option of Array\.from\(control\.options\)\)/u,
    );
    assert.match(
      source,
      /option\.getBoundingClientRect\(\)[\s\S]*option\.label \|\| option\.text/u,
    );
    assert.match(source, /!multiSelectCompleteness\(/u);
  }
});

test("closed shadow-root controls are retained and traversed by the semantic audit", () => {
  assert.match(
    collisionSource,
    /export const shadowRootsGlobalName =\s*"__hkVisualizationShadowRootsV1"/u,
  );
  assert.match(
    collisionSource,
    /const nativeAttachShadow = Element\.prototype\.attachShadow[\s\S]*shadowRoots\.push\(shadowRoot\)/u,
  );
  assert.match(
    collisionSource,
    /const recordedShadowRoots =[\s\S]*scanOptions\.shadowRootsGlobalName/u,
  );
  assert.match(
    collisionSource,
    /for \(const shadowRoot of recordedShadowRoots\)[\s\S]*pendingShadowRoots\.push\(shadowRoot\)/u,
  );
  assert.match(
    collisionSource,
    /const composedParent = composedParentBehavior;/u,
  );
  assert.match(
    collisionSource,
    /semanticControls = queryAllComposed[\s\S]*hasMinimumTouchTarget[\s\S]*"control-touch-target"/u,
  );
});

test("a role-button host and closed-shadow nested control text remain one composed ancestry", () => {
  assert.match(collisionSource, /"\[role=button\]"/u);
  assert.match(
    collisionSource,
    /const composedContains = \(container: Element, candidate: Element\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    collisionSource,
    /const composedClosest = \(candidate: Element, selector: string\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    collisionSource,
    /const exemptionOwner = \(element: Element\) =>\s*composedClosest\(element, "\[data-viz-overlap-ok\]"\)/u,
  );
  assert.match(
    collisionSource,
    /if \(\s*composedContains\(first, second\) \|\| composedContains\(second, first\)\s*\)\s*continue/u,
  );
  assert.match(
    collisionSource,
    /if \(composedContains\(control, parent\)\) continue/u,
  );
  assert.match(
    collisionSource,
    /composedContains\(candidate, textFragment\.parent\) \|\|[\s\S]*composedContains\(textFragment\.parent, candidate\)/u,
  );
  assert.match(
    collisionSource,
    /if \(!composedContains\(owner, textFragment\.parent\)\) continue/u,
  );
  assert.match(
    collisionSource,
    /while \(current && composedContains\(root, current\)\)[\s\S]*current = composedParent\(current\)/u,
  );
  assert.match(
    collisionSource,
    /const composedScopes: Array<Element \| ShadowRoot> = \[\s*root,[\s\S]*composedShadowRoots/u,
  );
  assert.match(
    collisionSource,
    /for \(const textScope of composedScopes\)[\s\S]*document\.createTreeWalker\(\s*textScope,[\s\S]*NodeFilter\.SHOW_TEXT/u,
  );
  assert.doesNotMatch(
    collisionSource,
    /\.contains\(|\.closest\(/u,
  );
});

test("all scanner runtimes consume the executed slot-first composed-parent decision", () => {
  const composedParentBehavior =
    collisionScannerModule.hkVisualizationComposedParentBehavior;
  const slot = { name: "slot" };
  const parentElement = { name: "light-parent" };
  assert.equal(
    composedParentBehavior({
      assignedSlot: slot,
      parentElement,
      getRootNode: () => ({ host: { name: "shadow-host" } }),
    }),
    slot,
  );
  assertSiblingPairAncestryContract(collisionSource, 2);
  assertSiblingPairAncestryContract(contrastSource, 1);
});
