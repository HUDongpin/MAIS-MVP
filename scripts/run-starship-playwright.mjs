#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  unlinkSync,
  writeSync,
  writeFileSync
} from "node:fs";
import { createRequire } from "node:module";
import path, { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertStarshipPath,
  buildStarshipE2ePathManifest,
  monitorStarshipBrowserProcesses,
  validateStarshipE2ePathManifest
} from "./starship-e2e-path-gate.mjs";

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");

const rejectedInheritedPathNames = Object.freeze([
  "HK_MATH_DB_PATH",
  "MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON",
  "NODE_COMPILE_CACHE",
  "npm_config_cache",
  "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
  "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
  "PLAYWRIGHT_BROWSER_TEMP_DIR",
  "PLAYWRIGHT_CRASH_DUMP_DIR",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_BLOB_OUTPUT_DIR",
  "PLAYWRIGHT_BLOB_OUTPUT_FILE",
  "PLAYWRIGHT_HTML_OUTPUT_DIR",
  "PLAYWRIGHT_HTML_REPORT",
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_JUNIT_OUTPUT_DIR",
  "PLAYWRIGHT_JUNIT_OUTPUT_FILE",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_PATH_MANIFEST_PATH",
  "PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE",
  "PLAYWRIGHT_PREBUILD_RECEIPT_INODE",
  "PLAYWRIGHT_PREBUILD_RECEIPT_PATH",
  "PLAYWRIGHT_PREBUILD_RECEIPT_SHA256",
  "PLAYWRIGHT_PREBUILD_RUNNER_PID",
  "PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN",
  "PLAYWRIGHT_PREBUILT_SERVER",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_RUN_ID",
  "PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH",
  "PLAYWRIGHT_SERVER_LOG_PATH",
  "PLAYWRIGHT_STARSHIP_PRELAUNCH"
]);

const e2eTempTsconfigHardeningExcludes = Object.freeze([
  ".next-*",
  ".s??-*",
  "tmp",
  "temp",
  "output",
  "outputs",
  "coverage",
  "playwright-report",
  "test-results",
  "var",
  "var/**/*",
  "MAIS-MVP-*",
  "MAIS-MVP-*/**/*"
]);

const disabledProviderEnvironment = Object.freeze({
  AI_TUTOR_PROVIDER_PROFILE: "offline-fixture",
  DEEPSEEK_API_KEY: "",
  DEEPSEEK_API_URL: "",
  DEEPSEEK_MODEL: "",
  LLM_API_KEY: "",
  LLM_API_URL: "",
  LLM_MODEL: "",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "",
  QWEN_API_KEY: "",
  QWEN_API_URL: "",
  QWEN_IMAGE_API_URL: "",
  QWEN_IMAGE_MODEL: "",
  QWEN_MODEL: "",
  QWEN_REALTIME_API_URL: "",
  QWEN_REALTIME_MODEL: "",
  QWEN_TEXT_MODEL: "qwen3.7-plus"
});

const prebuildRuntimeSourceRelativePaths = Object.freeze([
  "scripts/run-starship-playwright.mjs",
  "scripts/starship-e2e-path-gate.mjs",
  "scripts/next-clean-build.mjs",
  "scripts/cleanup-generated-artifacts.mjs",
  "scripts/check-stray-generated-types.mjs",
  "playwright.config.ts",
  "next.config.ts",
  "tsconfig.json",
  "tsconfig.next.json",
  "package.json",
  "package-lock.json",
  "node_modules/next/dist/bin/next",
  "node_modules/typescript/lib/typescript.js"
]);

const fullRunFixedRuntimeSourceRelativePaths = Object.freeze([
  "tests/e2e/starship-e2e-global-setup.ts",
  "tests/e2e/mainland-focused-canonical-cli.ts"
]);

const fullRunApprovedProducerRelativePaths = Object.freeze([
  "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts"
]);

const fullRunPinnedGlobalFunctionSources = Object.freeze([
  Object.freeze({
    relativePath: "tests/e2e/hk-visualization-collision-scanner.ts",
    sha256: "b775c93f615522da021cf813a42304bee27d5ba437b0e06247ccd4f5049f5824"
  }),
  Object.freeze({
    relativePath: "tests/e2e/hk-visualization-text-contrast-scanner.ts",
    sha256: "81cd3d4a612ae5934586be0cd0fa5a3e6987c96c3d6c89af32f76b8ef697913e"
  })
]);

const firstPartyRuntimeSourceExtensions = Object.freeze([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json"
]);
const fullRunRuntimeSourceClosurePlans = new WeakMap();

function exactFullRunProducerRelativePaths(playwrightArgs) {
  if (!Array.isArray(playwrightArgs) || playwrightArgs.some((argument) => typeof argument !== "string")) {
    throw new Error("Full-run runtime source arguments must be one exact string array.");
  }
  const explicitProducerRelativePaths = playwrightArgs
    .slice(1)
    .filter((argument) => /\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(argument));
  if (
    playwrightArgs[0] !== "test" ||
    JSON.stringify(explicitProducerRelativePaths) !==
      JSON.stringify(fullRunApprovedProducerRelativePaths)
  ) {
    throw new Error(
      "Full-run runtime source arguments require the exact approved G03-G06 producer set in canonical order."
    );
  }
  return explicitProducerRelativePaths;
}

function fullRunRuntimeSourceEntryPaths(repositoryRoot, playwrightArgs) {
  const canonicalRepositoryRoot = assertStarshipPath(
    "full-run runtime source repositoryRoot",
    repositoryRoot
  );
  const producerRelativePaths = exactFullRunProducerRelativePaths(playwrightArgs);
  return Object.freeze([
    ...starshipPlaywrightPrebuildRuntimeSourcePaths(canonicalRepositoryRoot),
    ...fullRunFixedRuntimeSourceRelativePaths.map((relativePath) =>
      path.join(canonicalRepositoryRoot, relativePath)
    ),
    ...producerRelativePaths.map((relativePath) =>
      path.join(canonicalRepositoryRoot, relativePath)
    )
  ]);
}

function firstPartyStaticImportSpecifiers(sourcePath, bytes) {
  if (path.extname(sourcePath).toLowerCase() === ".json") return [];
  const sourceDigest = sha256(bytes);
  const permitsPinnedGlobalFunctionUse = fullRunPinnedGlobalFunctionSources.some(
    ({ relativePath, sha256: expectedSha256 }) =>
      sourcePath.endsWith(`${path.sep}${relativePath}`) && sourceDigest === expectedSha256
  );
  const ts = require("typescript");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.getScriptKindFromFileName(sourcePath)
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    throw new Error(
      `Full-run runtime source has an unparseable static import graph: ${sourcePath}: ` +
      sourceFile.parseDiagnostics
        .map(({ messageText }) => ts.flattenDiagnosticMessageText(messageText, "\n"))
        .join(" | ")
    );
  }
  const compilerOptions = Object.freeze({
    allowJs: true,
    checkJs: false,
    jsx: ts.JsxEmit.Preserve,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest
  });
  const compilerHost = {
    fileExists: (fileName) => fileName === sourcePath,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => path.dirname(sourcePath),
    getDefaultLibFileName: () => "",
    getNewLine: () => "\n",
    getSourceFile: (fileName) => fileName === sourcePath ? sourceFile : undefined,
    readFile: (fileName) => fileName === sourcePath ? bytes.toString("utf8") : undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {}
  };
  const program = ts.createProgram({
    host: compilerHost,
    options: compilerOptions,
    rootNames: [sourcePath]
  });
  const checker = program.getTypeChecker();
  const boundSourceFile = program.getSourceFile(sourcePath);
  if (boundSourceFile !== sourceFile) {
    throw new Error(`Full-run runtime source binding failed for exact source: ${sourcePath}.`);
  }
  const runtimeSymbolAtIdentifier = (identifier) => {
    if (ts.isShorthandPropertyAssignment(identifier.parent) && identifier.parent.name === identifier) {
      return checker.getShorthandAssignmentValueSymbol(identifier.parent);
    }
    if (ts.isExportSpecifier(identifier.parent)) {
      return checker.getExportSpecifierLocalTargetSymbol(identifier.parent) ??
        checker.getSymbolAtLocation(identifier);
    }
    return checker.getSymbolAtLocation(identifier);
  };
  const specifiers = [];
  const firstPartySpecifier = (specifier) =>
    specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("@/");
  const recordSpecifier = (specifier) => {
    if (firstPartySpecifier(specifier)) specifiers.push(specifier);
  };
  const exactStaticArgument = (node, argumentIndex, argumentCount, form) => {
    const argument = node.arguments[argumentIndex];
    if (node.arguments.length !== argumentCount || !argument || !ts.isStringLiteralLike(argument)) {
      throw new Error(
        `Full-run runtime source uses an unsupported non-static ${form}: ${sourcePath}.`
      );
    }
    return argument;
  };
  const importDeclarationFor = (node) => {
    let current = node;
    while (current && !ts.isSourceFile(current)) {
      if (ts.isImportDeclaration(current)) return current;
      current = current.parent;
    }
    return null;
  };
  const unwrapStaticLoaderExpression = (node) => {
    let current = node;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isPartiallyEmittedExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  };
  const isImportMetaUrlExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (!ts.isPropertyAccessExpression(node) || node.name.text !== "url") return false;
    const receiver = unwrapStaticLoaderExpression(node.expression);
    return ts.isMetaProperty(receiver) &&
      receiver.keywordToken === ts.SyntaxKind.ImportKeyword &&
      receiver.name.text === "meta";
  };
  const isNodeCreateRequireImport = (identifier) => {
    const symbol = runtimeSymbolAtIdentifier(identifier);
    return symbol?.declarations?.some((declaration) => {
      if (!ts.isImportSpecifier(declaration) || declaration.isTypeOnly) return false;
      const importedName = declaration.propertyName?.text ?? declaration.name.text;
      const importDeclaration = importDeclarationFor(declaration);
      let importClause = declaration.parent;
      while (importClause && !ts.isImportClause(importClause) && !ts.isSourceFile(importClause)) {
        importClause = importClause.parent;
      }
      return importedName === "createRequire" &&
        (!ts.isImportClause(importClause) || !importClause.isTypeOnly) &&
        !!importDeclaration &&
        ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
        ["module", "node:module"].includes(importDeclaration.moduleSpecifier.text);
    }) ?? false;
  };
  const isNodeModuleObjectImport = (identifier) => {
    if (!ts.isIdentifier(identifier)) return false;
    const symbol = runtimeSymbolAtIdentifier(identifier);
    return symbol?.declarations?.some((declaration) => {
      const isRuntimeNamespace = ts.isNamespaceImport(declaration);
      const isRuntimeDefault = ts.isImportClause(declaration) &&
        declaration.name?.text === identifier.text &&
        !declaration.isTypeOnly;
      if (!isRuntimeNamespace && !isRuntimeDefault) return false;
      const importDeclaration = importDeclarationFor(declaration);
      return !!importDeclaration &&
        ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
        ["module", "node:module"].includes(importDeclaration.moduleSpecifier.text);
    }) ?? false;
  };
  const isNodeModuleConstructorImport = (identifier) => {
    if (!ts.isIdentifier(identifier)) return false;
    const symbol = runtimeSymbolAtIdentifier(identifier);
    return symbol?.declarations?.some((declaration) => {
      if (!ts.isImportSpecifier(declaration) || declaration.isTypeOnly) return false;
      const importedName = declaration.propertyName?.text ?? declaration.name.text;
      const importDeclaration = importDeclarationFor(declaration);
      let importClause = declaration.parent;
      while (importClause && !ts.isImportClause(importClause) && !ts.isSourceFile(importClause)) {
        importClause = importClause.parent;
      }
      return importedName === "Module" &&
        (!ts.isImportClause(importClause) || !importClause.isTypeOnly) &&
        !!importDeclaration &&
        ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
        ["module", "node:module"].includes(importDeclaration.moduleSpecifier.text);
    }) ?? false;
  };
  const isNodeVmRuntimeImport = (identifier) => {
    if (!ts.isIdentifier(identifier)) return false;
    const symbol = runtimeSymbolAtIdentifier(identifier);
    return symbol?.declarations?.some((declaration) => {
      const isRuntimeNamed = ts.isImportSpecifier(declaration) && !declaration.isTypeOnly;
      const isRuntimeNamespace = ts.isNamespaceImport(declaration);
      const isRuntimeDefault = ts.isImportClause(declaration) &&
        declaration.name?.text === identifier.text &&
        !declaration.isTypeOnly;
      if (!isRuntimeNamed && !isRuntimeNamespace && !isRuntimeDefault) return false;
      let importClause = declaration;
      while (importClause && !ts.isImportClause(importClause) && !ts.isSourceFile(importClause)) {
        importClause = importClause.parent;
      }
      const importDeclaration = importDeclarationFor(declaration);
      return (!ts.isImportClause(importClause) || !importClause.isTypeOnly) &&
        !!importDeclaration &&
        ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
        ["vm", "node:vm"].includes(importDeclaration.moduleSpecifier.text);
    }) ?? false;
  };
  const isNodeCreateRequireFactoryExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    return ts.isIdentifier(node) && isNodeCreateRequireImport(node);
  };
  const staticMemberName = (node) => {
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression)
    ) {
      return node.argumentExpression.text;
    }
    return null;
  };
  const isCommonJsModuleConstructorExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    return (
      ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
    ) &&
      staticMemberName(node) === "constructor" &&
      isRealModuleIdentifier(unwrapStaticLoaderExpression(node.expression));
  };
  const isNodeModuleRequireCall = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (!ts.isCallExpression(node) || node.arguments.length !== 1) return false;
    const target = node.arguments[0];
    return ts.isStringLiteralLike(target) &&
      ["module", "node:module"].includes(target.text) &&
      isRealRequireIdentifier(unwrapStaticLoaderExpression(node.expression));
  };
  const isUnsupportedNodeCreateRequireFactoryExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    const receiver = unwrapStaticLoaderExpression(node.expression);
    const knownFactoryOwner = isNodeModuleObjectImport(receiver) ||
      isNodeModuleConstructorImport(receiver) ||
      isCommonJsModuleConstructorExpression(receiver) ||
      isNodeModuleRequireCall(receiver);
    if (!knownFactoryOwner) return false;
    const memberName = staticMemberName(node);
    return memberName === "createRequire" ||
      (ts.isElementAccessExpression(node) && memberName === null);
  };
  const bindingCreatesNodeRequire = (symbol) => symbol?.declarations?.some((declaration) => {
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
    const initializer = unwrapStaticLoaderExpression(declaration.initializer);
    return ts.isCallExpression(initializer) &&
      isNodeCreateRequireFactoryExpression(initializer.expression) &&
      initializer.arguments.length === 1 &&
      isImportMetaUrlExpression(initializer.arguments[0]);
  }) ?? false;
  const declarationIsAmbient = (declaration) => {
    let current = declaration;
    while (current && !ts.isSourceFile(current)) {
      if (
        ts.canHaveModifiers(current) &&
        ts.getModifiers(current)?.some(({ kind }) => kind === ts.SyntaxKind.DeclareKeyword)
      ) {
        return true;
      }
      current = current.parent;
    }
    return false;
  };
  const importBindingIsRuntime = (declaration) => {
    if (ts.isImportSpecifier(declaration) && declaration.isTypeOnly) return false;
    let current = declaration;
    while (current && !ts.isImportClause(current) && !ts.isSourceFile(current)) {
      current = current.parent;
    }
    return !ts.isImportClause(current) || !current.isTypeOnly;
  };
  const declarationCreatesRuntimeBinding = (declaration) => {
    if (declarationIsAmbient(declaration)) return false;
    if (
      ts.isImportSpecifier(declaration) ||
      ts.isImportClause(declaration) ||
      ts.isNamespaceImport(declaration)
    ) {
      return importBindingIsRuntime(declaration);
    }
    if (
      ts.isVariableDeclaration(declaration) ||
      ts.isParameter(declaration) ||
      ts.isBindingElement(declaration) ||
      ts.isFunctionDeclaration(declaration) ||
      ts.isFunctionExpression(declaration) ||
      ts.isClassDeclaration(declaration) ||
      ts.isClassExpression(declaration) ||
      ts.isImportEqualsDeclaration(declaration) ||
      ts.isEnumDeclaration(declaration) ||
      ts.isModuleDeclaration(declaration)
    ) {
      return true;
    }
    return false;
  };
  const symbolHasRuntimeBinding = (symbol) =>
    symbol?.declarations?.some(declarationCreatesRuntimeBinding) ?? false;
  const isUnshadowedRuntimeGlobalIdentifier = (node, name) => {
    if (!ts.isIdentifier(node) || node.text !== name) return false;
    const symbol = runtimeSymbolAtIdentifier(node);
    return !symbol || !symbolHasRuntimeBinding(symbol);
  };
  const isRealRequireIdentifier = (node) => {
    if (!ts.isIdentifier(node)) return false;
    const symbol = runtimeSymbolAtIdentifier(node);
    if (bindingCreatesNodeRequire(symbol)) return true;
    return node.text === "require" && (!symbol || !symbolHasRuntimeBinding(symbol));
  };
  const isRealModuleIdentifier = (node) =>
    ts.isIdentifier(node) &&
    node.text === "module" &&
    (() => {
      const symbol = runtimeSymbolAtIdentifier(node);
      return !symbol || !symbolHasRuntimeBinding(symbol);
    })();
  const isDirectRealGlobalObjectExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    return isUnshadowedRuntimeGlobalIdentifier(node, "globalThis") ||
      isUnshadowedRuntimeGlobalIdentifier(node, "global");
  };
  const symbolAliasesRealGlobalObject = (symbol, seen = new Set()) => {
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    return symbol.declarations?.some((declaration) => {
      if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
      const initializer = unwrapStaticLoaderExpression(declaration.initializer);
      if (isDirectRealGlobalObjectExpression(initializer)) return true;
      return ts.isIdentifier(initializer) &&
        symbolAliasesRealGlobalObject(runtimeSymbolAtIdentifier(initializer), seen);
    }) ?? false;
  };
  const isRealGlobalObjectExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (isDirectRealGlobalObjectExpression(node)) return true;
    return ts.isIdentifier(node) &&
      symbolAliasesRealGlobalObject(runtimeSymbolAtIdentifier(node));
  };
  const isDirectRealProcessExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (isUnshadowedRuntimeGlobalIdentifier(node, "process")) return true;
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    if (staticMemberName(node) !== "process") return false;
    const receiver = unwrapStaticLoaderExpression(node.expression);
    return isRealGlobalObjectExpression(receiver);
  };
  const symbolAliasesRealProcess = (symbol, seen = new Set()) => {
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    return symbol.declarations?.some((declaration) => {
      if (
        (
          !ts.isVariableDeclaration(declaration) &&
          !ts.isParameter(declaration) &&
          !ts.isBindingElement(declaration)
        ) ||
        !declaration.initializer
      ) {
        return false;
      }
      const initializer = unwrapStaticLoaderExpression(declaration.initializer);
      if (isDirectRealProcessExpression(initializer)) return true;
      return ts.isIdentifier(initializer) &&
        symbolAliasesRealProcess(runtimeSymbolAtIdentifier(initializer), seen);
    }) ?? false;
  };
  const isRealProcessExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (isDirectRealProcessExpression(node)) return true;
    return ts.isIdentifier(node) &&
      symbolAliasesRealProcess(runtimeSymbolAtIdentifier(node));
  };
  const processBindingElementSelectsGetBuiltinModule = (declaration) => {
    if (!ts.isBindingElement(declaration) || !ts.isObjectBindingPattern(declaration.parent)) {
      return false;
    }
    let owner = declaration.parent.parent;
    while (owner && ts.isBindingElement(owner)) owner = owner.parent.parent;
    if (!owner || !ts.isVariableDeclaration(owner) || !owner.initializer) return false;
    if (!isRealProcessExpression(owner.initializer)) return false;
    if (!declaration.propertyName) {
      return ts.isIdentifier(declaration.name) && declaration.name.text === "getBuiltinModule";
    }
    if (
      ts.isIdentifier(declaration.propertyName) ||
      ts.isStringLiteralLike(declaration.propertyName)
    ) {
      return declaration.propertyName.text === "getBuiltinModule";
    }
    return ts.isComputedPropertyName(declaration.propertyName);
  };
  const symbolAliasesProcessGetBuiltinModule = (symbol, seen = new Set()) => {
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    return symbol.declarations?.some((declaration) => {
      if (processBindingElementSelectsGetBuiltinModule(declaration)) return true;
      if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
      const initializer = unwrapStaticLoaderExpression(declaration.initializer);
      if (
        (ts.isPropertyAccessExpression(initializer) || ts.isElementAccessExpression(initializer)) &&
        isRealProcessExpression(initializer.expression)
      ) {
        const memberName = staticMemberName(initializer);
        return memberName === "getBuiltinModule" ||
          (ts.isElementAccessExpression(initializer) && memberName === null);
      }
      return ts.isIdentifier(initializer) &&
        symbolAliasesProcessGetBuiltinModule(runtimeSymbolAtIdentifier(initializer), seen);
    }) ?? false;
  };
  const isProcessGetBuiltinModuleCapability = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (
      ts.isIdentifier(node) &&
      symbolAliasesProcessGetBuiltinModule(runtimeSymbolAtIdentifier(node))
    ) {
      return true;
    }
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    if (!isRealProcessExpression(node.expression)) return false;
    const memberName = staticMemberName(node);
    return memberName === "getBuiltinModule" ||
      (ts.isElementAccessExpression(node) && memberName === null);
  };
  const isProcessGetBuiltinModuleCall = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    return ts.isCallExpression(node) &&
      isProcessGetBuiltinModuleCapability(node.expression);
  };
  const isGlobalDynamicCodeExpression = (rawNode) => {
    if (permitsPinnedGlobalFunctionUse) return false;
    const node = unwrapStaticLoaderExpression(rawNode);
    if (
      isUnshadowedRuntimeGlobalIdentifier(node, "eval") ||
      isUnshadowedRuntimeGlobalIdentifier(node, "Function")
    ) {
      return true;
    }
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    const memberName = staticMemberName(node);
    if (memberName !== "eval" && memberName !== "Function") return false;
    const receiver = unwrapStaticLoaderExpression(node.expression);
    return isRealGlobalObjectExpression(receiver);
  };
  const assignedExpressionsBySymbol = new Map();
  const collectAssignedExpressions = (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const target = unwrapStaticLoaderExpression(node.left);
      if (ts.isIdentifier(target)) {
        const symbol = runtimeSymbolAtIdentifier(target);
        if (symbol) {
          const expressions = assignedExpressionsBySymbol.get(symbol) ?? [];
          expressions.push(node.right);
          assignedExpressionsBySymbol.set(symbol, expressions);
        }
      }
    }
    ts.forEachChild(node, collectAssignedExpressions);
  };
  collectAssignedExpressions(sourceFile);
  const symbolCreatesCallableConstructor = (symbol, seen = new Set()) => {
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    const expressionCreatesCallable = (rawExpression) => {
      const expression = unwrapStaticLoaderExpression(rawExpression);
      if (
        ts.isArrowFunction(expression) ||
        ts.isFunctionExpression(expression) ||
        ts.isClassExpression(expression)
      ) {
        return true;
      }
      if (ts.isIdentifier(expression)) {
        return symbolCreatesCallableConstructor(runtimeSymbolAtIdentifier(expression), seen);
      }
      if (
        ts.isBinaryExpression(expression) &&
        (
          expression.operatorToken.kind === ts.SyntaxKind.EqualsToken ||
          expression.operatorToken.kind === ts.SyntaxKind.CommaToken
        )
      ) {
        return expressionCreatesCallable(expression.right);
      }
      return false;
    };
    if (symbol.declarations?.some((declaration) => {
      if (
        ts.isFunctionDeclaration(declaration) ||
        ts.isFunctionExpression(declaration) ||
        ts.isClassDeclaration(declaration) ||
        ts.isClassExpression(declaration)
      ) {
        return true;
      }
      return ts.isVariableDeclaration(declaration) &&
        !!declaration.initializer &&
        expressionCreatesCallable(declaration.initializer);
    })) {
      return true;
    }
    return assignedExpressionsBySymbol.get(symbol)?.some(expressionCreatesCallable) ?? false;
  };
  const isRuntimeCallableExpression = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isClassExpression(node)
    ) {
      return true;
    }
    return ts.isIdentifier(node) &&
      symbolCreatesCallableConstructor(runtimeSymbolAtIdentifier(node));
  };
  const isDynamicFunctionConstructorCapability = (rawNode) => {
    const node = unwrapStaticLoaderExpression(rawNode);
    if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
    if (!isRuntimeCallableExpression(node.expression)) return false;
    const memberName = staticMemberName(node);
    return memberName === "constructor" ||
      (ts.isElementAccessExpression(node) && memberName === null);
  };
  const isProcessAliasDeclarationInitializer = (node) => {
    const parent = node.parent;
    return !!parent &&
      (
        ts.isVariableDeclaration(parent) ||
        ts.isParameter(parent) ||
        ts.isBindingElement(parent)
      ) &&
      parent.initializer === node;
  };
  const isGlobalObjectAliasDeclarationInitializer = (node) => {
    let initializer = node;
    while (
      initializer.parent &&
      (
        ts.isParenthesizedExpression(initializer.parent) ||
        ts.isAsExpression(initializer.parent) ||
        ts.isTypeAssertionExpression(initializer.parent) ||
        ts.isNonNullExpression(initializer.parent) ||
        ts.isSatisfiesExpression(initializer.parent)
      ) &&
      initializer.parent.expression === initializer
    ) {
      initializer = initializer.parent;
    }
    const parent = initializer.parent;
    return !!parent &&
      ts.isVariableDeclaration(parent) &&
      parent.initializer === initializer;
  };
  const bindingElementStaticName = (element) => {
    if (!element.propertyName) {
      return ts.isIdentifier(element.name) ? element.name.text : null;
    }
    if (ts.isIdentifier(element.propertyName) || ts.isStringLiteralLike(element.propertyName)) {
      return element.propertyName.text;
    }
    return null;
  };
  const objectBindingEscapesNamedCapability = (declaration, receiverPredicate, names) =>
    ts.isObjectBindingPattern(declaration.name) &&
    !!declaration.initializer &&
    receiverPredicate(declaration.initializer) &&
    declaration.name.elements.some((element) => {
      const name = bindingElementStaticName(element);
      return name === null || names.includes(name);
    });
  const isApprovedPrebuildProcessIdentityArgument = (node) => {
    if (!isDirectRealProcessExpression(node)) return false;
    const property = node.parent;
    if (
      !property ||
      !ts.isPropertyAssignment(property) ||
      property.initializer !== node ||
      (
        !ts.isIdentifier(property.name) ||
        property.name.text !== "processIdentity"
      )
    ) {
      return false;
    }
    const objectLiteral = property.parent;
    const call = objectLiteral?.parent;
    if (
      !objectLiteral ||
      !ts.isObjectLiteralExpression(objectLiteral) ||
      !call ||
      !ts.isCallExpression(call) ||
      !call.arguments.includes(objectLiteral)
    ) {
      return false;
    }
    const callee = unwrapStaticLoaderExpression(call.expression);
    if (!ts.isIdentifier(callee)) return false;
    const symbol = runtimeSymbolAtIdentifier(callee);
    return symbol?.declarations?.some((declaration) => {
      if (!ts.isImportSpecifier(declaration) || declaration.isTypeOnly) return false;
      const importedName = declaration.propertyName?.text ?? declaration.name.text;
      const importDeclaration = importDeclarationFor(declaration);
      return importedName === "validateStarshipPlaywrightPrebuildReceipt" &&
        !!importDeclaration &&
        ts.isStringLiteralLike(importDeclaration.moduleSpecifier) &&
        importDeclaration.moduleSpecifier.text === "./scripts/run-starship-playwright.mjs";
    }) ?? false;
  };
  const unwrapExpression = unwrapStaticLoaderExpression;
  const loaderExpression = (rawNode) => {
    const node = unwrapExpression(rawNode);
    if (isRealRequireIdentifier(node)) {
      return Object.freeze({ kind: "require-function", origin: "bare" });
    }
    if (isRealModuleIdentifier(node)) {
      return Object.freeze({ kind: "module-object" });
    }
    if (ts.isPropertyAccessExpression(node)) {
      const receiver = loaderExpression(node.expression);
      if (receiver?.kind === "module-object") {
        if (node.name.text === "require") {
          return Object.freeze({ kind: "require-function", origin: "module" });
        }
        if (node.name.text === "constructor") {
          return Object.freeze({ kind: "module-constructor" });
        }
        if (node.name.text === "__proto__") {
          return Object.freeze({ kind: "module-prototype" });
        }
        if (node.name.text === "parent") {
          return Object.freeze({ kind: "module-parent-object" });
        }
        if (node.name.text === "children") {
          return Object.freeze({ kind: "module-children-container" });
        }
        return Object.freeze({ kind: "module-property", member: node.name.text });
      }
      if (receiver?.kind === "require-function") {
        if (node.name.text === "call") {
          return Object.freeze({
            kind: "require-call",
            origin: receiver.origin
          });
        }
        if (node.name.text === "resolve") {
          return Object.freeze({
            kind: "require-resolve",
            origin: receiver.origin
          });
        }
        if (node.name.text === "main") {
          return Object.freeze({ kind: "require-main-module-object" });
        }
        if (node.name.text === "cache") {
          return Object.freeze({ kind: "require-module-cache" });
        }
        return Object.freeze({ kind: "require-property", member: node.name.text });
      }
      return null;
    }
    if (ts.isElementAccessExpression(node)) {
      const receiver = loaderExpression(node.expression);
      const member = node.argumentExpression;
      if (receiver?.kind === "module-object") {
        if (!member || !ts.isStringLiteralLike(member)) {
          return Object.freeze({ kind: "module-computed" });
        }
        if (member.text === "require") {
          return Object.freeze({ kind: "require-function", origin: "module" });
        }
        if (member.text === "constructor") {
          return Object.freeze({ kind: "module-constructor" });
        }
        if (member.text === "__proto__") {
          return Object.freeze({ kind: "module-prototype" });
        }
        if (member.text === "parent") {
          return Object.freeze({ kind: "module-parent-object" });
        }
        if (member.text === "children") {
          return Object.freeze({ kind: "module-children-container" });
        }
        return Object.freeze({ kind: "module-property", member: member.text });
      }
      if (receiver?.kind === "require-function") {
        if (!member || !ts.isStringLiteralLike(member)) {
          return Object.freeze({ kind: "require-computed", origin: receiver.origin });
        }
        if (member.text === "call") {
          return Object.freeze({ kind: "require-call", origin: receiver.origin });
        }
        if (member.text === "resolve") {
          return Object.freeze({ kind: "require-resolve", origin: receiver.origin });
        }
        if (member.text === "main") {
          return Object.freeze({ kind: "require-main-module-object" });
        }
        if (member.text === "cache") {
          return Object.freeze({ kind: "require-module-cache" });
        }
        return Object.freeze({ kind: "require-property", member: member.text });
      }
    }
    return null;
  };
  const isIdentifierValueReference = (node) => {
    const parent = node.parent;
    if (!parent) return true;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
    if (
      (
        ts.isVariableDeclaration(parent) ||
        ts.isParameter(parent) ||
        ts.isFunctionDeclaration(parent) ||
        ts.isFunctionExpression(parent) ||
        ts.isClassDeclaration(parent) ||
        ts.isClassExpression(parent) ||
        ts.isInterfaceDeclaration(parent) ||
        ts.isTypeAliasDeclaration(parent) ||
        ts.isModuleDeclaration(parent) ||
        ts.isEnumDeclaration(parent) ||
        ts.isImportClause(parent) ||
        ts.isImportEqualsDeclaration(parent) ||
        ts.isNamespaceImport(parent) ||
        ts.isTypeParameterDeclaration(parent)
      ) &&
      parent.name === node
    ) {
      return false;
    }
    if (
      ts.isBindingElement(parent) &&
      (parent.name === node || parent.propertyName === node)
    ) {
      return false;
    }
    if (
      (
        ts.isPropertyAssignment(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodSignature(parent) ||
        ts.isGetAccessorDeclaration(parent) ||
        ts.isSetAccessorDeclaration(parent)
      ) &&
      parent.name === node
    ) {
      return false;
    }
    if (
      (ts.isLabeledStatement(parent) || ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) &&
      parent.label === node
    ) {
      return false;
    }
    return true;
  };
  const rejectLoaderEscape = (form) => {
    throw new Error(
      `Full-run runtime source lets a Node loader escape the approved static grammar ` +
      `through ${form}: ${sourcePath}.`
    );
  };
  const hasModifier = (node, kind) =>
    ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === kind);
  const variableDeclarationIsExported = (declaration) => {
    const declarationList = declaration.parent;
    const statement = declarationList?.parent;
    return !!statement &&
      ts.isVariableStatement(statement) &&
      !!hasModifier(statement, ts.SyntaxKind.ExportKeyword);
  };
  const nodeModuleReExportCarriesLoaderFactory = (declaration) => {
    if (
      declaration.isTypeOnly ||
      !declaration.moduleSpecifier ||
      !ts.isStringLiteralLike(declaration.moduleSpecifier) ||
      !["module", "node:module"].includes(declaration.moduleSpecifier.text)
    ) {
      return false;
    }
    if (!declaration.exportClause || ts.isNamespaceExport(declaration.exportClause)) return true;
    return declaration.exportClause.elements.some((element) => {
      if (element.isTypeOnly) return false;
      const exportedSourceName = element.propertyName?.text ?? element.name.text;
      return ["createRequire", "Module", "default"].includes(exportedSourceName);
    });
  };
  const nodeVmReExportCarriesDynamicExecutor = (declaration) => {
    if (
      declaration.isTypeOnly ||
      !declaration.moduleSpecifier ||
      !ts.isStringLiteralLike(declaration.moduleSpecifier) ||
      !["vm", "node:vm"].includes(declaration.moduleSpecifier.text)
    ) {
      return false;
    }
    if (!declaration.exportClause || ts.isNamespaceExport(declaration.exportClause)) return true;
    return declaration.exportClause.elements.some((element) => !element.isTypeOnly);
  };
  const analyze = (node) => {
    if (ts.isTypeNode(node)) return;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.name.elements.some(processBindingElementSelectsGetBuiltinModule)
    ) {
      rejectLoaderEscape("process.getBuiltinModule destructuring");
    }
    if (
      ts.isVariableDeclaration(node) &&
      objectBindingEscapesNamedCapability(
        node,
        isRealGlobalObjectExpression,
        ["eval", "Function", "process"]
      )
    ) {
      rejectLoaderEscape("global dynamic-code or process capability destructuring");
    }
    if (
      ts.isVariableDeclaration(node) &&
      objectBindingEscapesNamedCapability(node, isRuntimeCallableExpression, ["constructor"])
    ) {
      rejectLoaderEscape("function or class constructor destructuring");
    }
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteralLike(node.moduleSpecifier)) recordSpecifier(node.moduleSpecifier.text);
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (!ts.isStringLiteralLike(node.moduleSpecifier)) {
        throw new Error(`Full-run runtime source has a non-static export target: ${sourcePath}.`);
      }
      if (nodeModuleReExportCarriesLoaderFactory(node)) {
        rejectLoaderEscape("node:module loader-factory re-export");
      }
      if (nodeVmReExportCarriesDynamicExecutor(node)) {
        rejectLoaderEscape("node:vm dynamic-executor re-export");
      }
      recordSpecifier(node.moduleSpecifier.text);
      return;
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const expression = node.moduleReference.expression;
      if (!expression || !ts.isStringLiteralLike(expression)) {
        throw new Error(`Full-run runtime source has a non-static import-equals target: ${sourcePath}.`);
      }
      if (["module", "node:module", "vm", "node:vm"].includes(expression.text)) {
        rejectLoaderEscape("Node loader or dynamic-executor object returned by import-equals");
      }
      recordSpecifier(expression.text);
      return;
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const target = exactStaticArgument(node, 0, 1, "import expression");
        if (["module", "node:module", "vm", "node:vm"].includes(target.text)) {
          rejectLoaderEscape("Node loader or dynamic-executor object returned by import expression");
        }
        recordSpecifier(target.text);
        return;
      }
      if (isGlobalDynamicCodeExpression(node.expression)) {
        rejectLoaderEscape("global dynamic-code capability call");
      }
      if (isDynamicFunctionConstructorCapability(node.expression)) {
        rejectLoaderEscape("function or class constructor dynamic-code call");
      }
      if (isProcessGetBuiltinModuleCall(node)) {
        rejectLoaderEscape("process.getBuiltinModule dynamic loader object");
      }
      if (isUnsupportedNodeCreateRequireFactoryExpression(node.expression)) {
        rejectLoaderEscape("unsupported createRequire factory acquisition");
      }
      if (isNodeCreateRequireFactoryExpression(node.expression)) {
        const parent = node.parent;
        if (
          !ts.isVariableDeclaration(parent) ||
          parent.initializer !== node ||
          !ts.isIdentifier(parent.name) ||
          node.arguments.length !== 1 ||
          !isImportMetaUrlExpression(node.arguments[0]) ||
          variableDeclarationIsExported(parent)
        ) {
          rejectLoaderEscape("exported createRequire loader, factory alias, or non-canonical base");
        }
        return;
      }
      const loader = loaderExpression(node.expression);
      if (loader?.kind === "require-function") {
        const target = exactStaticArgument(node, 0, 1, "require expression");
        if (["module", "node:module", "vm", "node:vm"].includes(target.text)) {
          rejectLoaderEscape("Node loader or dynamic-executor object returned by require");
        }
        recordSpecifier(target.text);
        return;
      }
      if (loader?.kind === "require-call" && loader.origin === "bare") {
        const target = exactStaticArgument(node, 1, 2, "require.call expression");
        if (["module", "node:module", "vm", "node:vm"].includes(target.text)) {
          rejectLoaderEscape("Node loader or dynamic-executor object returned by require.call");
        }
        analyze(node.arguments[0]);
        recordSpecifier(target.text);
        return;
      }
      if (loader?.kind === "require-resolve" && loader.origin === "bare") {
        const target = exactStaticArgument(node, 0, 1, "require.resolve expression");
        if (firstPartySpecifier(target.text)) {
          throw new Error(
            `Full-run runtime source uses an unsupported first-party require.resolve form: ` +
            `${sourcePath} -> ${target.text}.`
          );
        }
        return;
      }
      if (loader) rejectLoaderEscape(`unsupported ${loader.kind} call`);
      analyze(node.expression);
      for (const argument of node.arguments) analyze(argument);
      return;
    }
    if (
      ts.isNewExpression(node) &&
      (
        isGlobalDynamicCodeExpression(node.expression) ||
        isDynamicFunctionConstructorCapability(node.expression)
      )
    ) {
      rejectLoaderEscape("global or constructor dynamic-code capability");
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (isGlobalDynamicCodeExpression(node)) {
        rejectLoaderEscape("global dynamic-code capability value");
      }
      if (isProcessGetBuiltinModuleCapability(node)) {
        rejectLoaderEscape("process.getBuiltinModule capability value");
      }
      if (isDynamicFunctionConstructorCapability(node)) {
        rejectLoaderEscape("function or class constructor dynamic-code value");
      }
      if (isRealProcessExpression(node)) {
        if (
          isProcessAliasDeclarationInitializer(node) ||
          isApprovedPrebuildProcessIdentityArgument(node)
        ) return;
        rejectLoaderEscape("Node process object value");
      }
      if (isRealProcessExpression(node.expression)) return;
      if (isRealGlobalObjectExpression(node.expression)) return;
      if (isUnsupportedNodeCreateRequireFactoryExpression(node)) {
        rejectLoaderEscape("unsupported createRequire factory value");
      }
      const loader = loaderExpression(node);
      if (loader?.kind === "module-property" || loader?.kind === "require-property") return;
      if (loader) rejectLoaderEscape(`${loader.kind} value`);
      analyze(node.expression);
      return;
    }
    if (ts.isElementAccessExpression(node)) {
      if (isGlobalDynamicCodeExpression(node)) {
        rejectLoaderEscape("global dynamic-code capability value");
      }
      if (isProcessGetBuiltinModuleCapability(node)) {
        rejectLoaderEscape("process.getBuiltinModule capability value");
      }
      if (isDynamicFunctionConstructorCapability(node)) {
        rejectLoaderEscape("function or class constructor dynamic-code value");
      }
      if (isRealProcessExpression(node)) {
        if (
          isProcessAliasDeclarationInitializer(node) ||
          isApprovedPrebuildProcessIdentityArgument(node)
        ) return;
        rejectLoaderEscape("Node process object value");
      }
      if (isRealProcessExpression(node.expression)) return;
      if (isRealGlobalObjectExpression(node.expression)) return;
      if (isUnsupportedNodeCreateRequireFactoryExpression(node)) {
        rejectLoaderEscape("unsupported createRequire factory value");
      }
      const loader = loaderExpression(node);
      if (loader?.kind === "module-property" || loader?.kind === "require-property") return;
      if (loader) rejectLoaderEscape(`${loader.kind} value`);
      analyze(node.expression);
      if (node.argumentExpression) analyze(node.argumentExpression);
      return;
    }
    if (ts.isIdentifier(node) && isIdentifierValueReference(node)) {
      if (isGlobalDynamicCodeExpression(node)) {
        rejectLoaderEscape("global dynamic-code capability value");
      }
      if (isRealGlobalObjectExpression(node)) {
        if (isGlobalObjectAliasDeclarationInitializer(node)) return;
        rejectLoaderEscape("global object value");
      }
      if (isRealProcessExpression(node)) {
        if (
          isProcessAliasDeclarationInitializer(node) ||
          isApprovedPrebuildProcessIdentityArgument(node)
        ) return;
        rejectLoaderEscape("Node process object value");
      }
      if (
        isNodeCreateRequireImport(node) ||
        isNodeModuleObjectImport(node) ||
        isNodeModuleConstructorImport(node) ||
        isNodeVmRuntimeImport(node)
      ) {
        rejectLoaderEscape("Node loader factory or dynamic-executor value");
      }
      if (isRealRequireIdentifier(node)) rejectLoaderEscape("require-function value");
      if (isRealModuleIdentifier(node)) rejectLoaderEscape("module-object value");
      return;
    }
    ts.forEachChild(node, analyze);
  };
  analyze(sourceFile);
  return Object.freeze([...new Set(specifiers)]);
}

function firstPartyRuntimeImportCandidatePaths(repositoryRoot, importerPath, specifier) {
  const unresolvedBase = specifier.startsWith("@/")
    ? path.resolve(repositoryRoot, specifier.slice(2))
    : path.resolve(path.dirname(importerPath), specifier);
  const relative = path.relative(repositoryRoot, unresolvedBase);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).includes("node_modules")
  ) {
    throw new Error(
      `Full-run first-party import escapes the repository source boundary: ${importerPath} -> ${specifier}.`
    );
  }
  const explicitExtension = path.extname(unresolvedBase).toLowerCase();
  if (explicitExtension) {
    if (!firstPartyRuntimeSourceExtensions.includes(explicitExtension)) {
      throw new Error(
        `Full-run first-party import uses an unsupported source extension: ` +
        `${importerPath} -> ${specifier}; extension=${explicitExtension}.`
      );
    }
    return Object.freeze([unresolvedBase]);
  }
  const candidates = [];
  for (const extension of firstPartyRuntimeSourceExtensions) {
    candidates.push(`${unresolvedBase}${extension}`);
  }
  for (const extension of firstPartyRuntimeSourceExtensions) {
    candidates.push(path.join(unresolvedBase, `index${extension}`));
  }
  return Object.freeze([...new Set(candidates)]);
}

function resolveFirstPartyRuntimeImport({
  importerPath,
  repositoryRoot,
  specifier
}) {
  const candidates = firstPartyRuntimeImportCandidatePaths(
    repositoryRoot,
    importerPath,
    specifier
  );
  const matches = [];
  for (const candidate of candidates) {
    let stat;
    try {
      stat = lstatSync(candidate, { bigint: true });
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Full-run first-party import resolves through a symlink: ${importerPath} -> ${specifier}: ${candidate}.`
      );
    }
    if (!stat.isFile()) continue;
    const canonical = assertStarshipPath("full-run first-party runtime import", candidate);
    if (canonical !== candidate) {
      throw new Error(
        `Full-run first-party import is not one physical canonical file: ${importerPath} -> ${specifier}.`
      );
    }
    matches.push(Object.freeze({
      device: stat.dev.toString(),
      inode: stat.ino.toString(),
      path: candidate
    }));
  }
  if (matches.length === 0) {
    throw new Error(
      `Full-run first-party import must resolve to one supported non-symlink file: ` +
      `${importerPath} -> ${specifier}; matches=${JSON.stringify(matches)}.`
    );
  }
  const physicalCandidatePaths = new Map();
  for (const match of matches) {
    const identity = `${match.device}:${match.inode}`;
    const priorPath = physicalCandidatePaths.get(identity);
    if (priorPath && priorPath !== match.path) {
      throw new Error(
        `Full-run first-party import has ambiguous candidate paths for one physical file: ` +
        `${importerPath} -> ${specifier}; paths=${JSON.stringify([priorPath, match.path])}.`
      );
    }
    physicalCandidatePaths.set(identity, match.path);
  }
  return matches[0].path;
}

function computeFirstPartyRuntimeSourceClosure({
  entryPaths,
  heldSourceByPath = null,
  repositoryRoot
}) {
  if (!Array.isArray(entryPaths) || entryPaths.length === 0) {
    throw new Error("Full-run first-party runtime closure requires exact ordered entry paths.");
  }
  if (new Set(entryPaths).size !== entryPaths.length) {
    throw new Error("Full-run first-party runtime closure entry paths must be unique.");
  }
  const orderedPaths = [...entryPaths];
  const enqueued = new Set(orderedPaths);
  const edges = [];
  const sourceReceipts = [];
  for (let index = 0; index < orderedPaths.length; index += 1) {
    const sourcePath = orderedPaths[index];
    const relative = path.relative(repositoryRoot, sourcePath);
    if (
      relative === "" ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`Full-run runtime closure source escapes repositoryRoot: ${sourcePath}.`);
    }
    const held = heldSourceByPath?.get(sourcePath);
    if (heldSourceByPath && !held) {
      throw new Error(
        `Full-run held-byte import graph references an unheld runtime source: ${sourcePath}.`
      );
    }
    const sourceObservation = held
      ? null
      : exactRegularFileReceipt(
          `full-run runtime closure source ${index}`,
          sourcePath,
          { includeChangeToken: true }
        );
    const bytes = held ? held.bytes : sourceObservation.bytes;
    if (sourceObservation) {
      sourceReceipts.push(Object.freeze({
        path: sourcePath,
        receipt: sourceObservation.receipt
      }));
    }
    if (relative.split(path.sep).includes("node_modules")) continue;
    for (const specifier of firstPartyStaticImportSpecifiers(sourcePath, bytes)) {
      const dependencyPath = resolveFirstPartyRuntimeImport({
        importerPath: sourcePath,
        repositoryRoot,
        specifier
      });
      if (heldSourceByPath) {
        const heldDependency = heldSourceByPath.get(dependencyPath);
        if (!heldDependency) {
          throw new Error(
            `Full-run live first-party candidate winner is not held: ` +
            `${sourcePath} -> ${specifier} -> ${dependencyPath}.`
          );
        }
        const liveDependency = exactRegularFileReceipt(
          "full-run live first-party candidate winner",
          dependencyPath,
          { includeChangeToken: true }
        );
        assertExactRuntimeReceipt(
          `full-run live/held first-party candidate ${dependencyPath}`,
          heldDependency.before,
          liveDependency.receipt
        );
      }
      edges.push(Object.freeze({
        importerPath: sourcePath,
        resolvedPath: dependencyPath,
        specifier
      }));
      if (!enqueued.has(dependencyPath)) {
        enqueued.add(dependencyPath);
        orderedPaths.push(dependencyPath);
      }
    }
  }
  return Object.freeze({
    edges: Object.freeze(edges),
    entryPaths: Object.freeze([...entryPaths]),
    orderedPaths: Object.freeze(orderedPaths),
    repositoryRoot,
    sourceReceipts: Object.freeze(sourceReceipts)
  });
}

export function starshipPlaywrightPrebuildRuntimeSourcePaths(repositoryRoot) {
  const canonicalRepositoryRoot = assertStarshipPath(
    "prebuild runtime source repositoryRoot",
    repositoryRoot
  );
  return Object.freeze(prebuildRuntimeSourceRelativePaths.map((relativePath) =>
    path.join(canonicalRepositoryRoot, relativePath)
  ));
}

export function starshipPlaywrightFullRunRuntimeSourcePaths(repositoryRoot, playwrightArgs = []) {
  const canonicalRepositoryRoot = assertStarshipPath(
    "full-run runtime source repositoryRoot",
    repositoryRoot
  );
  const closurePlan = computeFirstPartyRuntimeSourceClosure({
    entryPaths: fullRunRuntimeSourceEntryPaths(canonicalRepositoryRoot, playwrightArgs),
    repositoryRoot: canonicalRepositoryRoot
  });
  fullRunRuntimeSourceClosurePlans.set(closurePlan.orderedPaths, closurePlan);
  return closurePlan.orderedPaths;
}

function focusedRunId() {
  return `focused-playwright-${new Date().toISOString().replace(/[^0-9TZ]/gu, "")}-${process.pid}`;
}

function assertCanonicalFocusedPlaywrightArguments(args) {
  if (args[0] !== "test") {
    throw new Error("Focused Starship Playwright wrapper accepts only the `test` command.");
  }
  if (args.slice(1).includes("test")) {
    throw new Error(
      "Focused Starship Playwright wrapper requires exactly one `test` command token."
    );
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (
      argument === "--pass-with-no-tests" ||
      argument.startsWith("--pass-with-no-tests=")
    ) {
      throw new Error(
        `Focused Starship Playwright wrapper forbids zero-test success override ${argument}.`
      );
    }
    if (
      argument === "--test-list" ||
      argument.startsWith("--test-list=") ||
      argument === "--test-list-invert" ||
      argument.startsWith("--test-list-invert=")
    ) {
      throw new Error(
        `Focused Starship Playwright wrapper forbids pre-import test-list filtering ${argument}.`
      );
    }
    if (
      argument === "--config" ||
      argument === "-c" ||
      argument.startsWith("--config=") ||
      argument === "--output" ||
      argument.startsWith("--output=")
    ) {
      throw new Error(
        `Focused Starship Playwright wrapper forbids path-owning CLI override ${argument}.`
      );
    }
    const reporterValue = argument === "--reporter"
      ? args[index + 1]
      : argument.startsWith("--reporter=")
        ? argument.slice("--reporter=".length)
        : null;
    if (
      reporterValue &&
      reporterValue.split(",").some((reporter) =>
        !["dot", "json", "line", "list", "null"].includes(reporter)
      )
    ) {
      throw new Error(
        `Focused Starship Playwright wrapper rejects artifact-owning/custom reporter ${reporterValue}.`
      );
    }
  }
}

function canonicalStarshipServer(baseEnvironment) {
  const port = Number(baseEnvironment.PLAYWRIGHT_PORT ?? 3020);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PLAYWRIGHT_PORT must be an integer from 1 through 65535.");
  }
  const baseURL = `http://127.0.0.1:${port}`;
  const configuredBaseURL = baseEnvironment.PLAYWRIGHT_BASE_URL?.trim();
  if (configuredBaseURL && configuredBaseURL !== baseURL) {
    throw new Error(`PLAYWRIGHT_BASE_URL must equal the exact local server URL ${baseURL}.`);
  }
  return Object.freeze({ baseURL, port });
}

export function buildStarshipPlaywrightInvocation({
  args,
  baseEnvironment = process.env,
  repositoryRoot = defaultRepositoryRoot,
  runId = focusedRunId()
} = {}) {
  const canonicalRepositoryRoot = assertStarshipPath("repositoryRoot", repositoryRoot);
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error("Focused Starship Playwright wrapper requires Playwright CLI arguments.");
  }
  assertCanonicalFocusedPlaywrightArguments(args);
  const inheritedOverrides = rejectedInheritedPathNames.filter((name) =>
    typeof baseEnvironment[name] === "string" && baseEnvironment[name].trim().length > 0
  );
  if (inheritedOverrides.length > 0) {
    throw new Error(
      `Focused Starship Playwright wrapper rejects inherited path overrides: ${inheritedOverrides.join(", ")}.`
    );
  }
  const server = canonicalStarshipServer(baseEnvironment);
  const pathManifest = buildStarshipE2ePathManifest({
    repositoryRoot: canonicalRepositoryRoot,
    runId
  });
  const environment = {
    ...baseEnvironment,
    HK_MATH_DB_PATH: pathManifest.paths.databasePath,
    MAIS_FOCUSED_PLAYWRIGHT_ARGS_JSON: JSON.stringify(args),
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_COMPILE_CACHE: pathManifest.paths.nodeCompileCacheDir,
    npm_config_cache: pathManifest.paths.npmCacheDir,
    npm_config_update_notifier: "false",
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH: pathManifest.paths.browserProfileEvidencePath,
    PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH: pathManifest.paths.browserProcessEvidencePath,
    PLAYWRIGHT_BROWSER_TEMP_DIR: pathManifest.paths.browserTempDir,
    PLAYWRIGHT_CRASH_DUMP_DIR: pathManifest.paths.crashDumpDir,
    PLAYWRIGHT_E2E_ROOT: pathManifest.paths.e2eRunRoot,
    PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(
      pathManifest.paths.e2eRunRoot,
      "playwright-report.json"
    ),
    PLAYWRIGHT_NEXT_DIST_DIR: pathManifest.paths.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: pathManifest.paths.nextTsconfigPath,
    PLAYWRIGHT_OUTPUT_DIR: pathManifest.paths.outputDir,
    PLAYWRIGHT_PATH_MANIFEST_PATH: pathManifest.paths.pathManifestPath,
    PLAYWRIGHT_BASE_URL: server.baseURL,
    PLAYWRIGHT_PORT: String(server.port),
    PLAYWRIGHT_REPORT_DIR: pathManifest.paths.reportDir,
    PLAYWRIGHT_RUN_ID: pathManifest.runId,
    PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH: pathManifest.paths.serverCommandOwnerPidPath,
    PLAYWRIGHT_SERVER_LOG_PATH: pathManifest.paths.serverLogPath,
    PLAYWRIGHT_STARSHIP_PRELAUNCH: "1",
    TEMP: pathManifest.paths.browserTempDir,
    TMP: pathManifest.paths.browserTempDir,
    TMPDIR: pathManifest.paths.browserTempDir
  };
  return Object.freeze({
    args: Object.freeze([require.resolve("@playwright/test/cli"), ...args]),
    command: process.execPath,
    cwd: canonicalRepositoryRoot,
    environment: Object.freeze(environment),
    pathManifest,
    server
  });
}

function assertRepositoryRelativeBuildPath(label, repositoryRoot, absolutePath) {
  const relativePath = path.relative(repositoryRoot, absolutePath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} must stay below the exact repository root.`);
  }
  return relativePath;
}

export function buildStarshipNextPrebuildInvocation(invocation) {
  if (!invocation || typeof invocation !== "object" || Array.isArray(invocation)) {
    throw new Error("Starship Next prebuild requires the runner-owned Playwright invocation.");
  }
  const manifest = validateStarshipE2ePathManifest(invocation.pathManifest);
  const repositoryRoot = manifest.paths.repositoryRoot;
  if (invocation.cwd !== repositoryRoot || realpathSync.native(repositoryRoot) !== repositoryRoot) {
    throw new Error("Starship Next prebuild cwd must equal the physical manifest repository root.");
  }
  const nextDistRelative = assertRepositoryRelativeBuildPath(
    "NEXT_DIST_DIR",
    repositoryRoot,
    manifest.paths.nextDistDir
  );
  const nextTsconfigRelative = assertRepositoryRelativeBuildPath(
    "NEXT_TSCONFIG_PATH",
    repositoryRoot,
    manifest.paths.nextTsconfigPath
  );
  const nextEnvPath = path.join(repositoryRoot, "next-env.d.ts");
  const buildScriptPath = path.join(repositoryRoot, "scripts", "next-clean-build.mjs");
  return Object.freeze({
    args: Object.freeze([buildScriptPath]),
    command: process.execPath,
    cwd: repositoryRoot,
    environment: Object.freeze({
      ...invocation.environment,
      ...disabledProviderEnvironment,
      NEXT_DIST_DIR: nextDistRelative,
      NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS: "true",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_TSCONFIG_PATH: nextTsconfigRelative,
      npm_config_cache: manifest.paths.npmCacheDir,
      npm_config_update_notifier: "false"
    }),
    nextEnvPath,
    nextTsconfigPath: manifest.paths.nextTsconfigPath,
    pathManifest: manifest,
    serverLogPath: manifest.paths.serverLogPath
  });
}

function parseCommandLine(argv) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    return { help: true };
  }
  const separatorIndex = argv.indexOf("--");
  if (separatorIndex === -1) {
    throw new Error("Use -- to separate wrapper options from Playwright arguments.");
  }
  const wrapperArgs = argv.slice(0, separatorIndex);
  const playwrightArgs = argv.slice(separatorIndex + 1);
  let runId;
  for (let index = 0; index < wrapperArgs.length; index += 1) {
    const argument = wrapperArgs[index];
    if (argument !== "--run-id") throw new Error(`Unknown wrapper option: ${argument}.`);
    runId = wrapperArgs[index + 1];
    if (!runId) throw new Error("--run-id requires a value.");
    index += 1;
  }
  if (playwrightArgs.length === 0) throw new Error("No Playwright arguments were supplied after --.");
  return { help: false, playwrightArgs, runId };
}

function usage() {
  return [
    "Usage:",
    "  node scripts/run-starship-playwright.mjs [--run-id NAME] -- test <specs/options>",
    "",
    "Starts the Playwright Node process with every mutable path and TMPDIR/TMP/TEMP under /Volumes/Starship."
  ].join("\n");
}

export function acquireStarshipPlaywrightRunLock(lockPath, metadata) {
  const canonicalLockPath = assertStarshipPath("focused Playwright run lock", lockPath);
  mkdirSync(dirname(canonicalLockPath), { recursive: true });
  let held;
  try {
    held = createStarshipHeldExclusiveFile({
      bytes: Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`),
      filePath: canonicalLockPath,
      label: "focused Playwright run lock"
    });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new Error(
        `Another Starship Playwright run owns ${canonicalLockPath}; concurrent builds would corrupt tracked Next route-type state.`
      );
    }
    throw error;
  }
  let released = false;
  return (interposition = {}) => {
    if (released) return;
    released = true;
    removeStarshipHeldExclusiveFile(held, interposition);
  };
}

export function snapshotStarshipTrackedFile(filePath) {
  const canonicalFilePath = assertStarshipPath("tracked E2E side-effect file", filePath);
  return existsSync(canonicalFilePath) ? readFileSync(canonicalFilePath) : null;
}

export function restoreStarshipTrackedFile(filePath, snapshot) {
  const canonicalFilePath = assertStarshipPath("tracked E2E side-effect file", filePath);
  if (snapshot === null) {
    if (existsSync(canonicalFilePath)) unlinkSync(canonicalFilePath);
    return;
  }
  const current = existsSync(canonicalFilePath) ? readFileSync(canonicalFilePath) : null;
  if (current?.equals(snapshot)) return;
  writeFileSync(canonicalFilePath, snapshot);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function readStarshipProcessIdentity(pid) {
  if (!Number.isInteger(pid) || pid < 1) {
    throw new Error("Starship process identity requires a positive integer PID.");
  }
  const output = execFileSync(
    "/bin/ps",
    ["-p", String(pid), "-o", "pid=,lstart="],
    { encoding: "utf8", maxBuffer: 64 * 1024, timeout: 2_000 }
  ).trim();
  const match = output.match(/^(\d+)\s+(.+)$/u);
  if (!match || Number(match[1]) !== pid || match[2].trim().length === 0) {
    throw new Error(`Could not bind live OS start token for PID ${pid}.`);
  }
  return Object.freeze({ pid, startToken: match[2].trim() });
}

export function readStarshipProcessGroupIdentity(pid) {
  if (!Number.isInteger(pid) || pid < 1) {
    throw new Error("Starship process-group identity requires a positive integer PID.");
  }
  const output = execFileSync(
    "/bin/ps",
    ["-p", String(pid), "-o", "pid=,pgid=,lstart="],
    { encoding: "utf8", maxBuffer: 64 * 1024, timeout: 2_000 }
  );
  const match = output.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/u);
  if (
    !match ||
    Number(match[1]) !== pid ||
    !Number.isInteger(Number(match[2])) ||
    Number(match[2]) < 1 ||
    match[3].trim().length === 0
  ) {
    throw new Error(`Could not bind live OS PID, PGID, and start token for PID ${pid}.`);
  }
  return Object.freeze({
    pgid: Number(match[2]),
    pid,
    startToken: match[3].trim()
  });
}

function writeDescriptorBytes(descriptor, bytes, label) {
  let offset = 0;
  while (offset < bytes.length) {
    const count = writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
    if (count === 0) {
      throw new Error(`${label} made no write progress.`);
    }
    offset += count;
  }
}

function receiptFromObservation(filePath, observed, { includeChangeToken = false } = {}) {
  const receipt = {
    device: observed.stat.dev.toString(),
    inode: observed.stat.ino.toString(),
    mode: Number(observed.stat.mode & 0o7777n).toString(8),
    path: filePath,
    sha256: sha256(observed.bytes),
    size: Number(observed.stat.size)
  };
  if (includeChangeToken) {
    receipt.ctimeNs = observed.stat.ctimeNs.toString();
    receipt.mtimeNs = observed.stat.mtimeNs.toString();
  }
  return Object.freeze(receipt);
}

export function createStarshipHeldExclusiveFile({
  bytes,
  filePath,
  label,
  operations = {}
}) {
  const lexicalPath = path.resolve(filePath);
  const canonicalPath = assertStarshipPath(label, lexicalPath);
  if (canonicalPath !== lexicalPath) {
    throw new Error(`${label} must be a physical canonical path.`);
  }
  const parentPath = dirname(lexicalPath);
  const parent = lstatSync(parentPath);
  if (
    !parent.isDirectory() ||
    parent.isSymbolicLink() ||
    realpathSync.native(parentPath) !== parentPath
  ) {
    throw new Error(`${label} parent must be a physical canonical directory.`);
  }
  const descriptor = openSync(
    lexicalPath,
    fsConstants.O_RDWR |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600
  );
  let primaryError = null;
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const observed = exactDescriptorBytes(descriptor);
    const receipt = receiptFromObservation(
      lexicalPath,
      observed,
      { includeChangeToken: true }
    );
    operations.afterDescriptorReceipt?.(Object.freeze({ descriptor, receipt }));
    const lexical = lstatSync(lexicalPath, { bigint: true });
    if (
      !lexical.isFile() ||
      lexical.isSymbolicLink() ||
      lexical.dev !== observed.stat.dev ||
      lexical.ino !== observed.stat.ino
    ) {
      throw new Error(`${label} path was replaced after descriptor-bound creation; preserving it.`);
    }
    return Object.freeze({ descriptor, label, path: lexicalPath, receipt });
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  }
  let closeError = null;
  try {
    closeSync(descriptor);
  } catch (error) {
    closeError = error instanceof Error ? error : new Error(String(error));
  }
  if (closeError) {
    throw new AggregateError(
      [primaryError, closeError],
      `${label} creation and descriptor close both failed.`
    );
  }
  throw primaryError;
}

export function createStarshipExclusiveRegularFile(label, filePath, bytes, operations = {}) {
  const held = createStarshipHeldExclusiveFile({ bytes, filePath, label });
  let closeError = null;
  try {
    closeSync(held.descriptor);
  } catch (error) {
    closeError = error instanceof Error ? error : new Error(String(error));
  }
  if (closeError) throw closeError;
  operations.afterCreatedDescriptorClosed?.(held);
  const reopened = exactRegularFileReceipt(label, held.path).receipt;
  assertExactReceipt(`${label} created-descriptor/reopened-path`, held.receipt, reopened);
  return reopened;
}

export function buildStarshipE2eTempTsconfigBytes(prebuildInvocation) {
  const ts = require("typescript");
  const baseTsconfigPath = path.join(prebuildInvocation.cwd, "tsconfig.json");
  const baseTsconfig = exactRegularFileReceipt(
    "Starship prebuild base tsconfig",
    baseTsconfigPath
  );
  const { config, error } = ts.readConfigFile(
    baseTsconfigPath,
    () => baseTsconfig.bytes.toString("utf8")
  );
  const canonicalIncludes = Array.isArray(config?.include) ? config.include : null;
  const canonicalExcludes = Array.isArray(config?.exclude) ? config.exclude : null;
  if (error || !canonicalIncludes || !canonicalExcludes) {
    throw new Error(
      `Could not read include/exclude from ${baseTsconfigPath} for the Starship prebuild tsconfig` +
      `${error ? `: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}` : "."}`
    );
  }
  const nextDistRelative = prebuildInvocation.environment.NEXT_DIST_DIR;
  const temporaryConfigDirectory = path.dirname(prebuildInvocation.nextTsconfigPath);
  const portableRelativeFromTemporaryConfig = (absolutePath) =>
    path.relative(temporaryConfigDirectory, absolutePath).split(path.sep).join("/");
  const rebaseRepositoryPattern = (entry) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error("Starship prebuild tsconfig include/exclude entries must be nonempty strings.");
    }
    if (path.isAbsolute(entry)) return entry.split(path.sep).join("/");
    return portableRelativeFromTemporaryConfig(path.join(prebuildInvocation.cwd, entry));
  };
  const nextDistAbsolute = path.resolve(prebuildInvocation.cwd, nextDistRelative);
  const nextDistFromTemporaryConfig = portableRelativeFromTemporaryConfig(nextDistAbsolute);
  return Buffer.from(`${JSON.stringify({
    extends: portableRelativeFromTemporaryConfig(baseTsconfigPath),
    compilerOptions: { plugins: [{ name: "next" }] },
    include: Array.from(new Set([
      ...canonicalIncludes
        .filter((entry) => entry !== ".next/types/**/*.ts")
        .map(rebaseRepositoryPattern),
      `${nextDistFromTemporaryConfig}/types/**/*.ts`,
      // Next compares this exact repository-relative spelling before deciding
      // whether to rewrite the explicit config. It is intentionally retained
      // as a harmless sentinel in addition to the correctly rebased glob.
      `${nextDistRelative}/types/**/*.ts`
    ])),
    exclude: Array.from(new Set([
      ...canonicalExcludes.map(rebaseRepositoryPattern),
      ...e2eTempTsconfigHardeningExcludes.map(rebaseRepositoryPattern)
    ]))
  }, null, 2)}\n`);
}

function prepareStarshipNextPrebuild(prebuildInvocation) {
  const bytes = buildStarshipE2eTempTsconfigBytes(prebuildInvocation);
  const heldTsconfig = createStarshipHeldExclusiveFile({
    bytes,
    filePath: prebuildInvocation.nextTsconfigPath,
    label: "Starship prebuild temporary tsconfig"
  });
  return Object.freeze({ heldTsconfig });
}

function exactDescriptorBytes(descriptor) {
  const stat = fstatSync(descriptor, { bigint: true });
  if (!stat.isFile() || stat.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Tracked next-env descriptor is not a safely readable regular file.");
  }
  const bytes = Buffer.alloc(Number(stat.size));
  let offset = 0;
  while (offset < bytes.length) {
    const count = readSync(descriptor, bytes, offset, bytes.length - offset, offset);
    if (count === 0) {
      throw new Error("Tracked next-env descriptor reached EOF before its captured size.");
    }
    offset += count;
  }
  const after = fstatSync(descriptor, { bigint: true });
  if (
    after.dev !== stat.dev ||
    after.ino !== stat.ino ||
    after.size !== stat.size ||
    after.mode !== stat.mode ||
    after.mtimeNs !== stat.mtimeNs ||
    after.ctimeNs !== stat.ctimeNs
  ) {
    throw new Error("Tracked next-env changed while its exact bytes were being read.");
  }
  return { bytes, stat: after };
}

function captureStarshipNextEnvBuildBoundary(repositoryRoot, nextEnvPath) {
  const canonicalRepositoryRoot = assertStarshipPath("next-env build repositoryRoot", repositoryRoot);
  if (canonicalRepositoryRoot !== path.resolve(repositoryRoot)) {
    throw new Error("next-env build repositoryRoot must be a physical canonical path.");
  }
  const repositoryStat = lstatSync(canonicalRepositoryRoot);
  if (!repositoryStat.isDirectory() || repositoryStat.isSymbolicLink()) {
    throw new Error("next-env build repositoryRoot must be a physical non-symlink directory.");
  }
  if (realpathSync.native(canonicalRepositoryRoot) !== canonicalRepositoryRoot) {
    throw new Error("next-env build repositoryRoot realpath must equal its configured path.");
  }
  const expectedPath = path.join(canonicalRepositoryRoot, "next-env.d.ts");
  const canonicalNextEnvPath = assertStarshipPath("tracked Next environment file", nextEnvPath);
  if (canonicalNextEnvPath !== expectedPath || path.resolve(nextEnvPath) !== expectedPath) {
    throw new Error(`Tracked next-env path must equal ${expectedPath}.`);
  }
  const lexical = lstatSync(expectedPath, { bigint: true });
  if (!lexical.isFile() || lexical.isSymbolicLink()) {
    throw new Error("Tracked next-env must be a regular non-symlink file before build.");
  }
  const descriptor = openSync(
    expectedPath,
    fsConstants.O_RDWR | fsConstants.O_NOFOLLOW
  );
  try {
    const captured = exactDescriptorBytes(descriptor);
    if (
      captured.stat.dev !== lexical.dev ||
      captured.stat.ino !== lexical.ino
    ) {
      throw new Error("Tracked next-env identity changed between lstat and O_NOFOLLOW open.");
    }
    const snapshot = Object.freeze({
      bytes: captured.bytes,
      device: captured.stat.dev,
      inode: captured.stat.ino,
      mode: captured.stat.mode & 0o7777n,
      sha256: sha256(captured.bytes),
      size: captured.stat.size
    });
    return {
      beforeReceipt: Object.freeze({
        device: snapshot.device.toString(),
        inode: snapshot.inode.toString(),
        mode: Number(snapshot.mode).toString(8),
        path: expectedPath,
        sha256: snapshot.sha256,
        size: Number(snapshot.size)
      }),
      descriptor,
      nextEnvPath: expectedPath,
      snapshot
    };
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function foreignNextEnvReplacementError(detail = "") {
  const error = new Error(
    "Tracked next-env path was replaced during build; preserving the foreign path and refusing launch." +
      (detail ? ` ${detail}` : "")
  );
  error.code = "STARSHIP_NEXT_ENV_FOREIGN_REPLACEMENT";
  return error;
}

function restoreStarshipNextEnvBuildBoundary(boundary) {
  let observed;
  try {
    observed = lstatSync(boundary.nextEnvPath, { bigint: true });
  } catch (error) {
    throw foreignNextEnvReplacementError(
      `Path inspection failed: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
  if (
    !observed.isFile() ||
    observed.isSymbolicLink() ||
    observed.dev !== boundary.snapshot.device ||
    observed.ino !== boundary.snapshot.inode
  ) {
    throw foreignNextEnvReplacementError();
  }
  const descriptorBefore = fstatSync(boundary.descriptor, { bigint: true });
  if (
    !descriptorBefore.isFile() ||
    descriptorBefore.dev !== boundary.snapshot.device ||
    descriptorBefore.ino !== boundary.snapshot.inode
  ) {
    throw new Error("Tracked next-env descriptor identity changed during build.");
  }
  const current = exactDescriptorBytes(boundary.descriptor);
  const currentMode = current.stat.mode & 0o7777n;
  if (!current.bytes.equals(boundary.snapshot.bytes) || currentMode !== boundary.snapshot.mode) {
    ftruncateSync(boundary.descriptor, 0);
    writeDescriptorBytes(
      boundary.descriptor,
      boundary.snapshot.bytes,
      "Tracked next-env restore"
    );
    fchmodSync(boundary.descriptor, Number(boundary.snapshot.mode));
    fsyncSync(boundary.descriptor);
  }
  const after = exactDescriptorBytes(boundary.descriptor);
  const pathAfter = lstatSync(boundary.nextEnvPath, { bigint: true });
  const exact =
    pathAfter.isFile() &&
    !pathAfter.isSymbolicLink() &&
    pathAfter.dev === boundary.snapshot.device &&
    pathAfter.ino === boundary.snapshot.inode &&
    after.stat.dev === boundary.snapshot.device &&
    after.stat.ino === boundary.snapshot.inode &&
    (after.stat.mode & 0o7777n) === boundary.snapshot.mode &&
    after.stat.size === boundary.snapshot.size &&
    after.bytes.equals(boundary.snapshot.bytes) &&
    sha256(after.bytes) === boundary.snapshot.sha256;
  if (!exact) {
    throw new Error("Tracked next-env exact bytes, mode, hash, or identity were not restored after build.");
  }
  return Object.freeze({
    device: after.stat.dev.toString(),
    exact: true,
    inode: after.stat.ino.toString(),
    mode: Number(after.stat.mode & 0o7777n).toString(8),
    path: boundary.nextEnvPath,
    sha256: boundary.snapshot.sha256,
    size: Number(after.stat.size)
  });
}

function normalizeBuildOutcome(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Starship prebuild returned no exact process outcome.");
  }
  return Object.freeze({
    code: Number.isInteger(value.code) ? value.code : null,
    signal: typeof value.signal === "string" ? value.signal : null,
    spawnError: value.spawnError instanceof Error
      ? value.spawnError.message
      : typeof value.spawnError === "string"
        ? value.spawnError
        : null
  });
}

function exactRegularFileReceipt(label, filePath, { includeChangeToken = false } = {}) {
  const lexicalPath = path.resolve(filePath);
  const canonicalPath = assertStarshipPath(label, lexicalPath);
  if (canonicalPath !== lexicalPath) {
    throw new Error(`${label} must be a physical canonical non-symlink path.`);
  }
  const lexical = lstatSync(lexicalPath, { bigint: true });
  if (!lexical.isFile() || lexical.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file.`);
  }
  const descriptor = openSync(lexicalPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const observed = exactDescriptorBytes(descriptor);
    if (observed.stat.dev !== lexical.dev || observed.stat.ino !== lexical.ino) {
      throw new Error(`${label} changed identity between lstat and O_NOFOLLOW open.`);
    }
    return Object.freeze({
      bytes: observed.bytes,
      receipt: receiptFromObservation(
        lexicalPath,
        observed,
        { includeChangeToken }
      )
    });
  } finally {
    closeSync(descriptor);
  }
}

function assertExactReceipt(label, expected, actual) {
  for (const key of ["device", "inode", "mode", "path", "sha256", "size"]) {
    if (expected?.[key] !== actual?.[key]) {
      throw new Error(
        `${label} ${key} mismatch; expected=${String(expected?.[key])} actual=${String(actual?.[key])}.`
      );
    }
  }
}

function assertExactRuntimeReceipt(label, expected, actual) {
  assertExactReceipt(label, expected, actual);
  for (const key of ["ctimeNs", "mtimeNs"]) {
    if (expected?.[key] !== actual?.[key]) {
      throw new Error(
        `${label} ${key} change token mismatch; expected=${String(expected?.[key])} ` +
        `actual=${String(actual?.[key])}.`
      );
    }
  }
}

function captureStarshipRuntimeSources(runtimeSourcePaths) {
  if (!Array.isArray(runtimeSourcePaths)) {
    throw new Error("Starship runtime source paths must be an exact array.");
  }
  const canonicalPaths = runtimeSourcePaths.map((sourcePath, index) => {
    const lexicalPath = path.resolve(sourcePath);
    const canonicalPath = assertStarshipPath(`prebuild runtime source ${index}`, lexicalPath);
    if (canonicalPath !== lexicalPath) {
      throw new Error(`Prebuild runtime source must be a physical canonical path: ${lexicalPath}.`);
    }
    return lexicalPath;
  });
  if (new Set(canonicalPaths).size !== canonicalPaths.length) {
    throw new Error("Starship runtime source paths must be unique.");
  }
  const heldSources = [];
  try {
    for (const sourcePath of canonicalPaths) {
      const lexical = lstatSync(sourcePath, { bigint: true });
      if (!lexical.isFile() || lexical.isSymbolicLink()) {
        throw new Error(`Prebuild runtime source must be regular and non-symlink: ${sourcePath}.`);
      }
      const descriptor = openSync(
        sourcePath,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
      );
      try {
        const observed = exactDescriptorBytes(descriptor);
        if (observed.stat.dev !== lexical.dev || observed.stat.ino !== lexical.ino) {
          throw new Error(`Prebuild runtime source changed identity during capture: ${sourcePath}.`);
        }
        heldSources.push(Object.freeze({
          before: receiptFromObservation(sourcePath, observed, { includeChangeToken: true }),
          descriptor,
          path: sourcePath
        }));
      } catch (error) {
        closeSync(descriptor);
        throw error;
      }
    }
    return heldSources;
  } catch (error) {
    const closeErrors = [];
    for (const held of heldSources) {
      try {
        closeSync(held.descriptor);
      } catch (closeError) {
        closeErrors.push(closeError instanceof Error ? closeError : new Error(String(closeError)));
      }
    }
    if (closeErrors.length > 0) {
      throw new AggregateError(
        [error instanceof Error ? error : new Error(String(error)), ...closeErrors],
        "Runtime source capture and descriptor cleanup had multiple failures."
      );
    }
    throw error;
  }
}

function verifyStarshipRuntimeSources(heldSources) {
  const joins = [];
  for (const held of heldSources) {
    const lexical = lstatSync(held.path, { bigint: true });
    if (
      !lexical.isFile() ||
      lexical.isSymbolicLink() ||
      lexical.dev.toString() !== held.before.device ||
      lexical.ino.toString() !== held.before.inode
    ) {
      throw new Error(`Prebuild runtime source path identity changed: ${held.path}.`);
    }
    const observed = exactDescriptorBytes(held.descriptor);
    const after = receiptFromObservation(held.path, observed, { includeChangeToken: true });
    assertExactRuntimeReceipt(`prebuild runtime source ${held.path}`, held.before, after);
    joins.push(Object.freeze({ after, before: held.before }));
  }
  return Object.freeze(joins);
}

function closeStarshipRuntimeSources(heldSources) {
  const failures = [];
  for (const held of heldSources) {
    try {
      closeSync(held.descriptor);
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, "Multiple runtime source descriptors failed to close.");
  }
}

function statPathReceipt(filePath, stat) {
  return Object.freeze({
    ctimeNs: stat.ctimeNs.toString(),
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
    mode: Number(stat.mode & 0o7777n).toString(8),
    mtimeNs: stat.mtimeNs.toString(),
    path: filePath,
    size: Number(stat.size)
  });
}

const fullRunRuntimeParentReceiptKeys = Object.freeze([
  "device",
  "inode",
  "mode",
  "size",
  "mtimeNs",
  "ctimeNs"
]);

function fullRunRuntimeParentReceiptsMatch(expected, actual) {
  return fullRunRuntimeParentReceiptKeys.every((key) => expected?.[key] === actual?.[key]);
}

function exactFullRunChildIdentity(value) {
  if (
    !Number.isInteger(value?.pid) ||
    value.pid < 1 ||
    !Number.isInteger(value?.pgid) ||
    value.pgid < 1 ||
    typeof value?.startToken !== "string" ||
    value.startToken.length === 0
  ) {
    throw new Error("Full-run runtime source hold requires an exact child PID, PGID, and OS start token.");
  }
  return Object.freeze({ pid: value.pid, pgid: value.pgid, startToken: value.startToken });
}

function exactFullRunInvocation(value, repositoryRoot) {
  if (
    typeof value?.command !== "string" ||
    !path.isAbsolute(value.command) ||
    !Array.isArray(value?.args) ||
    !value.args.every((argument) => typeof argument === "string") ||
    value.cwd !== repositoryRoot
  ) {
    throw new Error("Full-run runtime source hold requires one exact command, argv, and repository cwd.");
  }
  return Object.freeze({ args: Object.freeze([...value.args]), command: value.command, cwd: value.cwd });
}

function captureStarshipFullRunRuntimeSources(
  runtimeSourcePaths,
  repositoryRoot,
  initialClosurePlan = null
) {
  if (!Array.isArray(runtimeSourcePaths) || runtimeSourcePaths.length === 0) {
    throw new Error("Full-run runtime source hold requires one exact ordered non-empty source set.");
  }
  const canonicalPaths = runtimeSourcePaths.map((sourcePath, index) => {
    const lexicalPath = path.resolve(sourcePath);
    const canonicalPath = assertStarshipPath(`full-run runtime source ${index}`, lexicalPath);
    const relative = path.relative(repositoryRoot, lexicalPath);
    if (
      canonicalPath !== lexicalPath ||
      relative === "" ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new Error(`Full-run runtime source must be a physical canonical path: ${lexicalPath}.`);
    }
    return lexicalPath;
  });
  if (new Set(canonicalPaths).size !== canonicalPaths.length) {
    throw new Error("Full-run runtime source paths must be unique and retain exact order.");
  }
  const initialReceiptByPath = initialClosurePlan
    ? new Map(initialClosurePlan.sourceReceipts.map(({ path: sourcePath, receipt }) => [
        sourcePath,
        receipt
      ]))
    : null;
  if (
    initialReceiptByPath &&
    (
      initialReceiptByPath.size !== canonicalPaths.length ||
      canonicalPaths.some((sourcePath) => !initialReceiptByPath.has(sourcePath))
    )
  ) {
    throw new Error("Full-run initial closure receipts do not cover the exact captured source set.");
  }
  const heldSources = [];
  try {
    for (let index = 0; index < canonicalPaths.length; index += 1) {
      const sourcePath = canonicalPaths[index];
      const parentPath = dirname(sourcePath);
      const parentLexical = lstatSync(parentPath, { bigint: true });
      if (
        !parentLexical.isDirectory() ||
        parentLexical.isSymbolicLink() ||
        realpathSync.native(parentPath) !== parentPath
      ) {
        throw new Error(`Full-run runtime source parent must be physical: ${parentPath}.`);
      }
      const parentDescriptor = openSync(
        parentPath,
        fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
      );
      let sourceDescriptor = null;
      try {
        const parentHeld = fstatSync(parentDescriptor, { bigint: true });
        const parentLexicalReceipt = statPathReceipt(parentPath, parentLexical);
        const parentHeldReceipt = statPathReceipt(parentPath, parentHeld);
        if (
          !parentHeld.isDirectory() ||
          !fullRunRuntimeParentReceiptsMatch(parentLexicalReceipt, parentHeldReceipt)
        ) {
          throw new Error(`Full-run runtime source parent changed during capture: ${parentPath}.`);
        }
        const sourceLexical = lstatSync(sourcePath, { bigint: true });
        if (!sourceLexical.isFile() || sourceLexical.isSymbolicLink()) {
          throw new Error(`Full-run runtime source must be regular and non-symlink: ${sourcePath}.`);
        }
        sourceDescriptor = openSync(
          sourcePath,
          fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW
        );
        const observed = exactDescriptorBytes(sourceDescriptor);
        if (observed.stat.dev !== sourceLexical.dev || observed.stat.ino !== sourceLexical.ino) {
          throw new Error(`Full-run runtime source changed identity during capture: ${sourcePath}.`);
        }
        const before = receiptFromObservation(
          sourcePath,
          observed,
          { includeChangeToken: true }
        );
        const initialReceipt = initialReceiptByPath?.get(sourcePath);
        if (initialReceipt) {
          assertExactRuntimeReceipt(
            `full-run initial closure/captured source ${sourcePath}`,
            initialReceipt,
            before
          );
        }
        heldSources.push({
          before,
          bytes: observed.bytes,
          descriptor: sourceDescriptor,
          index,
          parentBefore: parentHeldReceipt,
          parentDescriptor,
          parentPath,
          path: sourcePath
        });
        sourceDescriptor = null;
      } finally {
        if (sourceDescriptor !== null) closeSync(sourceDescriptor);
        if (!heldSources.some((held) => held.parentDescriptor === parentDescriptor)) {
          closeSync(parentDescriptor);
        }
      }
    }
    return heldSources;
  } catch (error) {
    const failures = [error instanceof Error ? error : new Error(String(error))];
    for (const held of heldSources) {
      for (const descriptor of [held.descriptor, held.parentDescriptor]) {
        try {
          closeSync(descriptor);
        } catch (closeError) {
          failures.push(closeError instanceof Error ? closeError : new Error(String(closeError)));
        }
      }
    }
    if (failures.length === 1) throw failures[0];
    throw new AggregateError(failures, "Full-run runtime source capture and cleanup both failed.");
  }
}

function fullRunRuntimeResolutionDirectoryPaths(repositoryRoot, edges) {
  const directoryPaths = [];
  const seen = new Set();
  const includeExistingAncestorChain = (candidateDirectoryPath) => {
    const relative = path.relative(repositoryRoot, candidateDirectoryPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(
        `Full-run runtime resolution candidate directory escapes repositoryRoot: ` +
        `${candidateDirectoryPath}.`
      );
    }
    const components = relative === "" ? [] : relative.split(path.sep);
    let ancestorPath = repositoryRoot;
    for (let index = 0; index <= components.length; index += 1) {
      if (index > 0) ancestorPath = path.join(ancestorPath, components[index - 1]);
      let stat;
      try {
        stat = lstatSync(ancestorPath, { bigint: true });
      } catch (error) {
        if (error?.code === "ENOENT") break;
        throw error;
      }
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        realpathSync.native(ancestorPath) !== ancestorPath
      ) {
        throw new Error(
          `Full-run runtime resolution candidate ancestor must be a physical directory: ` +
          `${ancestorPath}.`
        );
      }
      if (!seen.has(ancestorPath)) {
        seen.add(ancestorPath);
        directoryPaths.push(ancestorPath);
      }
    }
  };
  for (const { importerPath, specifier } of edges) {
    for (const candidatePath of firstPartyRuntimeImportCandidatePaths(
      repositoryRoot,
      importerPath,
      specifier
    )) {
      includeExistingAncestorChain(path.dirname(candidatePath));
    }
  }
  return Object.freeze(directoryPaths);
}

function captureStarshipFullRunRuntimeResolutionDirectories(repositoryRoot, edges) {
  const directoryPaths = fullRunRuntimeResolutionDirectoryPaths(repositoryRoot, edges);
  const heldDirectories = [];
  try {
    for (let index = 0; index < directoryPaths.length; index += 1) {
      const directoryPath = directoryPaths[index];
      const lexical = lstatSync(directoryPath, { bigint: true });
      if (
        !lexical.isDirectory() ||
        lexical.isSymbolicLink() ||
        realpathSync.native(directoryPath) !== directoryPath
      ) {
        throw new Error(
          `Full-run runtime resolution directory must remain physical: ${directoryPath}.`
        );
      }
      const descriptor = openSync(
        directoryPath,
        fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
      );
      let retained = false;
      try {
        const descriptorStat = fstatSync(descriptor, { bigint: true });
        const before = statPathReceipt(directoryPath, lexical);
        const descriptorReceipt = statPathReceipt(directoryPath, descriptorStat);
        if (
          !descriptorStat.isDirectory() ||
          !fullRunRuntimeParentReceiptsMatch(before, descriptorReceipt)
        ) {
          throw new Error(
            `Full-run runtime resolution directory changed during capture: ${directoryPath}.`
          );
        }
        heldDirectories.push(Object.freeze({ before, descriptor, index, path: directoryPath }));
        retained = true;
      } finally {
        if (!retained) closeSync(descriptor);
      }
    }
    return heldDirectories;
  } catch (error) {
    const failures = [error instanceof Error ? error : new Error(String(error))];
    for (const held of heldDirectories) {
      try {
        closeSync(held.descriptor);
      } catch (closeError) {
        failures.push(closeError instanceof Error ? closeError : new Error(String(closeError)));
      }
    }
    if (failures.length === 1) throw failures[0];
    throw new AggregateError(
      failures,
      "Full-run runtime resolution-directory capture and cleanup both failed."
    );
  }
}

function observeStarshipFullRunRuntimeResolutionDirectory(held) {
  const errors = [];
  let pathReceipt = null;
  let descriptorReceipt = null;
  try {
    const pathStat = lstatSync(held.path, { bigint: true });
    const descriptorStat = fstatSync(held.descriptor, { bigint: true });
    pathReceipt = statPathReceipt(held.path, pathStat);
    descriptorReceipt = statPathReceipt(held.path, descriptorStat);
    if (
      !pathStat.isDirectory() ||
      pathStat.isSymbolicLink() ||
      !descriptorStat.isDirectory() ||
      realpathSync.native(held.path) !== held.path ||
      !fullRunRuntimeParentReceiptsMatch(held.before, pathReceipt) ||
      !fullRunRuntimeParentReceiptsMatch(held.before, descriptorReceipt) ||
      !fullRunRuntimeParentReceiptsMatch(pathReceipt, descriptorReceipt)
    ) {
      errors.push(`resolution directory identity or change token changed for ${held.path}`);
    }
  } catch (error) {
    errors.push(
      `resolution directory observation failed for ${held.path}: ` +
      `${error instanceof Error ? error.message : String(error)}`
    );
  }
  return Object.freeze({
    descriptor: descriptorReceipt,
    errors: Object.freeze(errors),
    index: held.index,
    path: pathReceipt,
    resolutionDirectoryPath: held.path
  });
}

function validateStarshipFullRunHeldRuntimeClosure({
  entryPaths,
  expectedEdges,
  heldSources,
  repositoryRoot
}) {
  const heldSourceByPath = new Map(heldSources.map((held) => [held.path, held]));
  const recomputedClosure = computeFirstPartyRuntimeSourceClosure({
    entryPaths,
    heldSourceByPath,
    repositoryRoot
  });
  const capturedOrder = heldSources.map(({ path: sourcePath }) => sourcePath);
  if (JSON.stringify(recomputedClosure.orderedPaths) !== JSON.stringify(capturedOrder)) {
    throw new Error(
      "Full-run held-byte first-party runtime import graph does not match the captured ordered closure."
    );
  }
  if (JSON.stringify(recomputedClosure.edges) !== JSON.stringify(expectedEdges)) {
    throw new Error(
      "Full-run live held-byte first-party edges do not match the originally resolved closure edges."
    );
  }
  return recomputedClosure;
}

function observeStarshipFullRunRuntimeSource(held) {
  const errors = [];
  let parentPathReceipt = null;
  let parentDescriptorReceipt = null;
  let pathReceipt = null;
  let descriptorReceipt = null;
  try {
    const parentPathStat = lstatSync(held.parentPath, { bigint: true });
    parentPathReceipt = statPathReceipt(held.parentPath, parentPathStat);
    const parentDescriptorStat = fstatSync(held.parentDescriptor, { bigint: true });
    parentDescriptorReceipt = statPathReceipt(held.parentPath, parentDescriptorStat);
    if (
      !parentPathStat.isDirectory() ||
      parentPathStat.isSymbolicLink() ||
      !parentDescriptorStat.isDirectory() ||
      !fullRunRuntimeParentReceiptsMatch(held.parentBefore, parentPathReceipt) ||
      !fullRunRuntimeParentReceiptsMatch(held.parentBefore, parentDescriptorReceipt) ||
      !fullRunRuntimeParentReceiptsMatch(parentPathReceipt, parentDescriptorReceipt)
    ) {
      errors.push(`parent identity or change token changed for ${held.parentPath}`);
    }
  } catch (error) {
    errors.push(`parent observation failed for ${held.parentPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const pathStat = lstatSync(held.path, { bigint: true });
    pathReceipt = statPathReceipt(held.path, pathStat);
    if (
      !pathStat.isFile() ||
      pathStat.isSymbolicLink() ||
      pathReceipt.device !== held.before.device ||
      pathReceipt.inode !== held.before.inode
    ) {
      errors.push(`path identity changed for ${held.path}`);
    }
  } catch (error) {
    errors.push(`path observation failed for ${held.path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    const observed = exactDescriptorBytes(held.descriptor);
    descriptorReceipt = receiptFromObservation(
      held.path,
      observed,
      { includeChangeToken: true }
    );
    assertExactRuntimeReceipt(`full-run runtime source ${held.path}`, held.before, descriptorReceipt);
    if (
      pathReceipt &&
      (
        pathReceipt.ctimeNs !== descriptorReceipt.ctimeNs ||
        pathReceipt.mtimeNs !== descriptorReceipt.mtimeNs ||
        pathReceipt.mode !== descriptorReceipt.mode ||
        pathReceipt.size !== descriptorReceipt.size
      )
    ) {
      errors.push(`path change token or mode diverged from held descriptor for ${held.path}`);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze({
    descriptor: descriptorReceipt,
    errors: Object.freeze(errors),
    index: held.index,
    parent: Object.freeze({
      descriptor: parentDescriptorReceipt,
      held: held.parentBefore,
      path: parentPathReceipt
    }),
    path: pathReceipt,
    sourcePath: held.path
  });
}

function observeStarshipFullRunRuntimeSources(
  heldSources,
  name,
  extra = {},
  {
    entryPaths = heldSources.map(({ path: sourcePath }) => sourcePath),
    expectedEdges = Object.freeze([]),
    heldResolutionDirectories = Object.freeze([]),
    repositoryRoot = null
  } = {}
) {
  const sources = heldSources.map(observeStarshipFullRunRuntimeSource);
  const errors = sources.flatMap(({ errors }) => errors);
  const resolutionDirectories = heldResolutionDirectories.map(
    observeStarshipFullRunRuntimeResolutionDirectory
  );
  errors.push(...resolutionDirectories.flatMap((directory) => directory.errors));
  if (repositoryRoot) {
    try {
      validateStarshipFullRunHeldRuntimeClosure({
        entryPaths,
        expectedEdges,
        heldSources,
        repositoryRoot
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return Object.freeze({
    at: new Date().toISOString(),
    ...extra,
    errors: Object.freeze(errors),
    name,
    resolutionDirectories: Object.freeze(resolutionDirectories),
    sources: Object.freeze(sources),
    status: errors.length === 0 ? "exact" : "failed"
  });
}

function closeStarshipFullRunRuntimeSources(
  heldSources,
  heldResolutionDirectories,
  operations = {}
) {
  const closeDescriptor = operations.closeDescriptor ?? closeSync;
  const closeErrors = [];
  for (const held of heldSources) {
    for (const [kind, descriptor] of [
      ["source", held.descriptor],
      ["parent", held.parentDescriptor]
    ]) {
      try {
        closeDescriptor(descriptor, Object.freeze({ held, kind }));
      } catch (error) {
        closeErrors.push(Object.freeze({
          error: error instanceof Error ? error.message : String(error),
          index: held.index,
          kind,
          path: kind === "source" ? held.path : held.parentPath
        }));
      }
    }
  }
  for (const held of heldResolutionDirectories) {
    try {
      closeDescriptor(
        held.descriptor,
        Object.freeze({ held, kind: "resolution-directory" })
      );
    } catch (error) {
      closeErrors.push(Object.freeze({
        error: error instanceof Error ? error.message : String(error),
        index: held.index,
        kind: "resolution-directory",
        path: held.path
      }));
    }
  }
  return Object.freeze(closeErrors);
}

function fullRunNotReachedBoundary(name, reason) {
  return Object.freeze({
    at: new Date().toISOString(),
    errors: Object.freeze([reason]),
    name,
    resolutionDirectories: Object.freeze([]),
    sources: Object.freeze([]),
    status: "not-reached"
  });
}

export async function runStarshipFullExecutionSourceHold({
  executeChild,
  invocation,
  operations = {},
  prebuild,
  receiptPath,
  repositoryRoot,
  runtimeSourceEntryPaths,
  runtimeSourcePaths,
  terminalCleanup
} = {}) {
  const canonicalRepositoryRoot = assertStarshipPath(
    "full-run runtime source repositoryRoot",
    path.resolve(repositoryRoot)
  );
  if (canonicalRepositoryRoot !== path.resolve(repositoryRoot)) {
    throw new Error("Full-run runtime source repositoryRoot must be physical and canonical.");
  }
  const repositoryStat = lstatSync(canonicalRepositoryRoot);
  if (
    !repositoryStat.isDirectory() ||
    repositoryStat.isSymbolicLink() ||
    realpathSync.native(canonicalRepositoryRoot) !== canonicalRepositoryRoot
  ) {
    throw new Error("Full-run runtime source repositoryRoot must be a physical non-symlink directory.");
  }
  const exactInvocation = exactFullRunInvocation(invocation, canonicalRepositoryRoot);
  const canonicalReceiptPath = assertStarshipPath(
    "full-run runtime source receipt",
    path.resolve(receiptPath)
  );
  if (
    canonicalReceiptPath !== path.resolve(receiptPath) ||
    !canonicalReceiptPath.startsWith(`${canonicalRepositoryRoot}${path.sep}`)
  ) {
    throw new Error("Full-run runtime source receipt must be an exact repository-contained path.");
  }
  if (
    typeof prebuild !== "function" ||
    typeof executeChild !== "function" ||
    typeof terminalCleanup !== "function"
  ) {
    throw new Error("Full-run runtime source hold requires prebuild, child, and cleanup callbacks.");
  }
  const openedAt = new Date().toISOString();
  const initialClosurePlan = fullRunRuntimeSourceClosurePlans.get(runtimeSourcePaths) ?? null;
  if (initialClosurePlan) {
    if (
      initialClosurePlan.repositoryRoot !== canonicalRepositoryRoot ||
      JSON.stringify(initialClosurePlan.orderedPaths) !== JSON.stringify(runtimeSourcePaths) ||
      (
        runtimeSourceEntryPaths !== undefined &&
        JSON.stringify(initialClosurePlan.entryPaths) !== JSON.stringify(runtimeSourceEntryPaths)
      )
    ) {
      throw new Error(
        "Full-run initial runtime closure plan does not match the exact repository, entries, or ordered source set."
      );
    }
  }
  const heldSources = captureStarshipFullRunRuntimeSources(
    runtimeSourcePaths,
    canonicalRepositoryRoot,
    initialClosurePlan
  );
  const failures = [];
  const closureEntryPaths = Object.freeze([
    ...(runtimeSourceEntryPaths ?? initialClosurePlan?.entryPaths ?? runtimeSourcePaths)
  ]);
  let expectedEdges = initialClosurePlan?.edges ?? Object.freeze([]);
  let heldResolutionDirectories = [];
  try {
    if (!initialClosurePlan) {
      const provisionalClosure = computeFirstPartyRuntimeSourceClosure({
        entryPaths: closureEntryPaths,
        heldSourceByPath: new Map(heldSources.map((held) => [held.path, held])),
        repositoryRoot: canonicalRepositoryRoot
      });
      const capturedOrder = heldSources.map(({ path: sourcePath }) => sourcePath);
      if (JSON.stringify(provisionalClosure.orderedPaths) !== JSON.stringify(capturedOrder)) {
        throw new Error(
          "Full-run held-byte first-party runtime import graph does not match the captured ordered closure."
        );
      }
      expectedEdges = provisionalClosure.edges;
    }
    heldResolutionDirectories = captureStarshipFullRunRuntimeResolutionDirectories(
      canonicalRepositoryRoot,
      expectedEdges
    );
    validateStarshipFullRunHeldRuntimeClosure({
      entryPaths: closureEntryPaths,
      expectedEdges,
      heldSources,
      repositoryRoot: canonicalRepositoryRoot
    });
  } catch (error) {
    failures.push(error instanceof Error ? error : new Error(String(error)));
  }
  try {
    operations.afterSourcesCaptured?.();
  } catch (error) {
    failures.push(error instanceof Error ? error : new Error(String(error)));
  }
  const boundaryGuard = Object.freeze({
    entryPaths: closureEntryPaths,
    expectedEdges,
    heldResolutionDirectories,
    repositoryRoot: canonicalRepositoryRoot
  });
  const opened = observeStarshipFullRunRuntimeSources(
    heldSources,
    "opened",
    {},
    boundaryGuard
  );
  const boundaries = [opened];
  if (opened.status !== "exact") {
    failures.push(new Error(
      `Full-run runtime source opened boundary failed: ${opened.errors.join(" | ")}`
    ));
  }
  let child = null;
  let childExitRecorded = false;
  let childResult;
  let postSpawnRecorded = false;
  let prebuildResult;
  try {
    if (failures.length === 0) {
      try {
        prebuildResult = await prebuild();
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    const postPrebuild = observeStarshipFullRunRuntimeSources(
      heldSources,
      "postPrebuildPreSpawn",
      {},
      boundaryGuard
    );
    boundaries.push(postPrebuild);
    if (postPrebuild.status !== "exact") {
      failures.push(new Error(
        `Full-run runtime source post-prebuild boundary failed: ${postPrebuild.errors.join(" | ")}`
      ));
    }
    if (failures.length === 0) {
      try {
        childResult = await executeChild(Object.freeze({
          childExited(outcome) {
            if (childExitRecorded) {
              throw new Error("Full-run runtime source child-exit boundary was recorded more than once.");
            }
            childExitRecorded = true;
            const normalizedOutcome = normalizeBuildOutcome(outcome);
            const boundary = observeStarshipFullRunRuntimeSources(
              heldSources,
              "immediatelyAfterChildExit",
              { outcome: normalizedOutcome },
              boundaryGuard
            );
            boundaries.push(boundary);
            if (boundary.status !== "exact") {
              throw new Error(
                `Full-run runtime source child-exit boundary failed: ${boundary.errors.join(" | ")}`
              );
            }
            if (
              normalizedOutcome.spawnError ||
              normalizedOutcome.signal ||
              normalizedOutcome.code !== 0
            ) {
              throw new Error(
                `Full-run runtime source child outcome is not exact zero: ` +
                `${JSON.stringify(normalizedOutcome)}.`
              );
            }
          },
          postSpawnLoad(identity) {
            if (postSpawnRecorded) {
              throw new Error("Full-run runtime source post-spawn boundary was recorded more than once.");
            }
            child = exactFullRunChildIdentity(identity);
            postSpawnRecorded = true;
            const boundary = observeStarshipFullRunRuntimeSources(
              heldSources,
              "postSpawnLoad",
              { child },
              boundaryGuard
            );
            boundaries.push(boundary);
            if (boundary.status !== "exact") {
              throw new Error(
                `Full-run runtime source post-spawn boundary failed: ${boundary.errors.join(" | ")}`
              );
            }
          }
        }));
      } catch (error) {
        failures.push(error instanceof Error ? error : new Error(String(error)));
      }
      if (!postSpawnRecorded) {
        boundaries.push(fullRunNotReachedBoundary(
          "postSpawnLoad",
          "Child callback did not record the exact post-spawn/load identity boundary."
        ));
        failures.push(new Error("Full-run runtime source hold has no exact post-spawn/load boundary."));
      }
      if (!childExitRecorded) {
        boundaries.push(fullRunNotReachedBoundary(
          "immediatelyAfterChildExit",
          "Child callback did not record the immediate child-exit boundary."
        ));
        failures.push(new Error("Full-run runtime source hold has no immediate child-exit boundary."));
      }
    } else {
      boundaries.push(fullRunNotReachedBoundary(
        "postSpawnLoad",
        "Prebuild did not authorize child spawn."
      ));
      boundaries.push(fullRunNotReachedBoundary(
        "immediatelyAfterChildExit",
        "No child was spawned."
      ));
    }
  } finally {
    try {
      await terminalCleanup();
    } catch (error) {
      failures.push(error instanceof Error ? error : new Error(String(error)));
    }
  }
  const beforeReceiptClose = observeStarshipFullRunRuntimeSources(
    heldSources,
    "beforeReceiptClose",
    {},
    boundaryGuard
  );
  boundaries.push(beforeReceiptClose);
  if (beforeReceiptClose.status !== "exact") {
    failures.push(new Error(
      `Full-run runtime source final boundary failed: ${beforeReceiptClose.errors.join(" | ")}`
    ));
  }
  const closeErrors = closeStarshipFullRunRuntimeSources(
    heldSources,
    heldResolutionDirectories,
    operations
  );
  for (const closeError of closeErrors) {
    failures.push(new Error(
      `Full-run runtime source ${closeError.kind} descriptor close failed for ` +
      `${closeError.path}: ${closeError.error}`
    ));
  }
  const finalBoundary = boundaries[boundaries.length - 1];
  const orderedSourcePaths = Object.freeze(
    heldSources.map(({ path: sourcePath }) => sourcePath)
  );
  const closureCore = Object.freeze({
    entryPaths: Object.freeze([...closureEntryPaths]),
    expectedEdges: Object.freeze(expectedEdges.map((edge) => Object.freeze({ ...edge }))),
    orderedSourcePaths
  });
  const closure = Object.freeze({
    ...closureCore,
    sha256: sha256(Buffer.from(JSON.stringify(closureCore), "utf8"))
  });
  const receipt = Object.freeze({
    boundaries: Object.freeze(boundaries),
    child,
    closeErrors,
    closure,
    contract: "starship-playwright-full-run-runtime-source-hold-v2",
    invocation: exactInvocation,
    openedAt,
    orderedSourcePaths,
    repositoryRoot: canonicalRepositoryRoot,
    resolutionDirectories: Object.freeze(heldResolutionDirectories.map((held) => Object.freeze({
      held: held.before,
      index: held.index,
      path: held.path
    }))),
    schemaVersion: 2,
    sources: Object.freeze(heldSources.map((held) => {
      const final = finalBoundary.sources.find(({ index }) => index === held.index);
      return Object.freeze({
        final: final?.descriptor ?? null,
        held: held.before,
        index: held.index,
        parent: Object.freeze({ final: final?.parent ?? null, held: held.parentBefore }),
        path: held.path
      });
    }))
  });
  let receiptError = null;
  try {
    createStarshipExclusiveRegularFile(
      "full-run runtime source hold receipt",
      canonicalReceiptPath,
      Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8"),
      operations.receiptFile
    );
  } catch (error) {
    receiptError = error instanceof Error ? error : new Error(String(error));
    failures.push(receiptError);
  }
  if (failures.length === 1) {
    failures[0].receiptPath = receiptError ? null : canonicalReceiptPath;
    throw failures[0];
  }
  if (failures.length > 1) {
    const aggregate = new AggregateError(
      failures,
      "Full-run runtime source hold, child execution, cleanup, or receipt failed."
    );
    aggregate.receiptPath = receiptError ? null : canonicalReceiptPath;
    throw aggregate;
  }
  return Object.freeze({ childResult, prebuildResult, receipt, receiptPath: canonicalReceiptPath });
}

/**
 * @param {{
 *   baseURL?: string,
 *   environment?: Record<string, string | undefined>,
 *   nowMs?: number,
 *   pathManifest?: any,
 *   port?: number,
 *   processIdentity?: { ppid?: number },
 *   readProcessIdentity?: (pid: number) => { pid: number, startToken: string }
 * }} [options]
 */
export function validateStarshipPlaywrightPrebuildReceipt(options = {}) {
  const {
    baseURL,
    environment = process.env,
    nowMs = Date.now(),
    pathManifest,
    port,
    processIdentity = process,
    readProcessIdentity = readStarshipProcessIdentity
  } = options;
  const manifest = validateStarshipE2ePathManifest(pathManifest);
  if (environment.PLAYWRIGHT_PREBUILT_SERVER !== "1") {
    throw new Error("PLAYWRIGHT_PREBUILT_SERVER=1 is required for a start-only webServer.");
  }
  const expectedReceiptPath = path.join(
    manifest.paths.e2eRunRoot,
    "evidence",
    "next-env-prebuild-receipt.json"
  );
  if (environment.PLAYWRIGHT_PREBUILD_RECEIPT_PATH !== expectedReceiptPath) {
    throw new Error(`Prebuild receipt path must equal ${expectedReceiptPath}.`);
  }
  const observedReceiptFile = exactRegularFileReceipt(
    "Starship Playwright prebuild receipt",
    expectedReceiptPath
  );
  if (
    environment.PLAYWRIGHT_PREBUILD_RECEIPT_SHA256 !==
      observedReceiptFile.receipt.sha256 ||
    environment.PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE !==
      observedReceiptFile.receipt.device ||
    environment.PLAYWRIGHT_PREBUILD_RECEIPT_INODE !==
      observedReceiptFile.receipt.inode
  ) {
    throw new Error("Prebuild receipt environment binding does not match its exact path identity or bytes.");
  }
  let receipt;
  try {
    receipt = JSON.parse(observedReceiptFile.bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`Prebuild receipt JSON is malformed: ${error instanceof Error ? error.message : String(error)}.`);
  }
  if (
    receipt?.schemaVersion !== 1 ||
    receipt?.contract !== "starship-playwright-prebuild-v1" ||
    receipt?.status !== "build-restored-before-playwright"
  ) {
    throw new Error("Prebuild receipt schema, contract, or status is invalid.");
  }
  if (
    receipt.repositoryRoot !== manifest.paths.repositoryRoot ||
    receipt.runId !== manifest.runId ||
    receipt.paths?.nextEnv !== path.join(manifest.paths.repositoryRoot, "next-env.d.ts") ||
    receipt.paths?.nextDistDir !== manifest.paths.nextDistDir ||
    receipt.paths?.nextTsconfigPath !== manifest.paths.nextTsconfigPath
  ) {
    throw new Error("Prebuild receipt is not bound to the exact repository, run, or build paths.");
  }
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    baseURL !== `http://127.0.0.1:${port}` ||
    receipt.port !== port ||
    receipt.baseURL !== baseURL
  ) {
    throw new Error("Prebuild receipt port or baseURL does not match the exact parsed local server.");
  }
  if (!Number.isInteger(processIdentity.ppid) || processIdentity.ppid < 1) {
    throw new Error("Prebuild receipt requires the current Playwright parent PID.");
  }
  const liveParent = readProcessIdentity(processIdentity.ppid);
  if (
    liveParent?.pid !== processIdentity.ppid ||
    typeof liveParent?.startToken !== "string" ||
    liveParent.startToken.length === 0 ||
    receipt.runner?.pid !== liveParent.pid ||
    receipt.runner?.startToken !== liveParent.startToken ||
    environment.PLAYWRIGHT_PREBUILD_RUNNER_PID !== String(liveParent.pid) ||
    environment.PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN !== liveParent.startToken
  ) {
    throw new Error(
      "Prebuild receipt runner PID or OS start token does not match the independently observed live parent."
    );
  }
  if (
    receipt.build?.code !== 0 ||
    receipt.build?.signal !== null ||
    receipt.build?.spawnError !== null
  ) {
    throw new Error("Prebuild receipt does not prove an exact zero build outcome.");
  }
  const completedAtMs = Date.parse(receipt.completedAt);
  if (
    !Number.isFinite(completedAtMs) ||
    completedAtMs > nowMs + 1_000 ||
    nowMs - completedAtMs > 120_000
  ) {
    throw new Error("Prebuild receipt is malformed, future-dated, or stale.");
  }
  const currentNextEnv = exactRegularFileReceipt(
    "restored next-env before Playwright collection",
    receipt.paths.nextEnv
  ).receipt;
  assertExactReceipt("prebuild next-env after receipt", receipt.nextEnv?.after, currentNextEnv);
  assertExactReceipt("prebuild next-env before/after identity", receipt.nextEnv?.before, receipt.nextEnv?.after);
  for (const [key, fileName, label] of [
    ["buildId", "BUILD_ID", "BUILD_ID"],
    ["requiredServerFiles", "required-server-files.json", "required-server-files"],
    ["buildManifest", "build-manifest.json", "build-manifest"]
  ]) {
    const expectedPath = path.join(manifest.paths.nextDistDir, fileName);
    if (receipt.buildOutputs?.[key]?.path !== expectedPath) {
      throw new Error(`Prebuild receipt ${label} build output path is not canonical.`);
    }
    const currentOutput = exactRegularFileReceipt(
      `prebuilt Next ${label} build output`,
      expectedPath
    ).receipt;
    assertExactReceipt(
      `prebuilt ${label} build output receipt`,
      receipt.buildOutputs[key],
      currentOutput
    );
  }
  const expectedRuntimeSourcePaths = starshipPlaywrightPrebuildRuntimeSourcePaths(
    manifest.paths.repositoryRoot
  );
  if (
    !Array.isArray(receipt.runtimeSources) ||
    receipt.runtimeSources.length !== expectedRuntimeSourcePaths.length
  ) {
    throw new Error("Prebuild receipt runtime source set is missing or incomplete.");
  }
  for (let index = 0; index < expectedRuntimeSourcePaths.length; index += 1) {
    const expectedPath = expectedRuntimeSourcePaths[index];
    const join = receipt.runtimeSources[index];
    if (join?.before?.path !== expectedPath || join?.after?.path !== expectedPath) {
      throw new Error(`Prebuild receipt runtime source path mismatch at index ${index}.`);
    }
    assertExactRuntimeReceipt(
      `prebuild receipt runtime source before/after ${expectedPath}`,
      join.before,
      join.after
    );
    const current = exactRegularFileReceipt(
      `prebuild runtime source before Playwright collection ${expectedPath}`,
      expectedPath,
      { includeChangeToken: true }
    ).receipt;
    assertExactRuntimeReceipt(
      `prebuild receipt/current runtime source ${expectedPath}`,
      join.after,
      current
    );
  }
  return Object.freeze(receipt);
}

export async function runStarshipNextEnvBuildBeforeLaunch({
  build,
  launch,
  nextEnvPath,
  operations = {},
  repositoryRoot,
  runtimeSourcePaths = []
} = {}) {
  if (typeof build !== "function" || typeof launch !== "function") {
    throw new Error("Starship prebuild requires exact build and launch callbacks.");
  }
  const boundary = captureStarshipNextEnvBuildBoundary(repositoryRoot, nextEnvPath);
  let heldRuntimeSources;
  try {
    heldRuntimeSources = captureStarshipRuntimeSources(runtimeSourcePaths);
  } catch (error) {
    try {
      closeSync(boundary.descriptor);
    } catch (closeError) {
      throw new AggregateError(
        [
          error instanceof Error ? error : new Error(String(error)),
          closeError instanceof Error ? closeError : new Error(String(closeError))
        ],
        "Runtime source capture and next-env descriptor close both failed."
      );
    }
    throw error;
  }
  let buildError = null;
  let outcome = null;
  let runtimeSources = null;
  let runtimeSourceError = null;
  let restoreReceipt = null;
  let restoreError = null;
  let runtimeCloseError = null;
  let closeError = null;
  try {
    try {
      outcome = normalizeBuildOutcome(await build());
    } catch (error) {
      buildError = error instanceof Error ? error : new Error(String(error));
      outcome = Object.freeze({ code: null, signal: null, spawnError: buildError.message });
    }
    try {
      runtimeSources = verifyStarshipRuntimeSources(heldRuntimeSources);
    } catch (error) {
      runtimeSourceError = error instanceof Error ? error : new Error(String(error));
    }
    try {
      restoreReceipt = restoreStarshipNextEnvBuildBoundary(boundary);
    } catch (error) {
      restoreError = error instanceof Error ? error : new Error(String(error));
    }
  } finally {
    try {
      closeStarshipRuntimeSources(heldRuntimeSources);
    } catch (error) {
      runtimeCloseError = error instanceof Error ? error : new Error(String(error));
    }
    try {
      const closeDescriptor = operations.closeDescriptor ?? closeSync;
      closeDescriptor(boundary.descriptor);
    } catch (error) {
      closeError = error instanceof Error ? error : new Error(String(error));
    }
  }
  const outcomeError = !buildError && (outcome.spawnError || outcome.signal || outcome.code !== 0)
    ? new Error(
      `Starship prebuild failed before Playwright launch: ${JSON.stringify(outcome)}.`
    )
    : null;
  const failures = [
    buildError ?? outcomeError,
    runtimeSourceError,
    restoreError,
    runtimeCloseError,
    closeError
  ].filter(Boolean);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(failures, "Starship prebuild and exact next-env cleanup had multiple failures.");
  }
  return await launch(Object.freeze({
    beforeReceipt: boundary.beforeReceipt,
    outcome,
    restoreReceipt,
    runtimeSources
  }));
}

export async function runStarshipNextEnvWholeRunBoundary({
  nextEnvPath,
  operations = {},
  repositoryRoot,
  run
} = {}) {
  if (typeof run !== "function") {
    throw new Error("Whole-run next-env boundary requires a run callback.");
  }
  const boundary = captureStarshipNextEnvBuildBoundary(repositoryRoot, nextEnvPath);
  let result;
  let runError = null;
  let restoreError = null;
  let closeError = null;
  try {
    try {
      result = await run();
    } catch (error) {
      runError = error instanceof Error ? error : new Error(String(error));
    }
    try {
      restoreStarshipNextEnvBuildBoundary(boundary);
    } catch (error) {
      restoreError = error instanceof Error ? error : new Error(String(error));
    }
  } finally {
    try {
      const closeDescriptor = operations.closeDescriptor ?? closeSync;
      closeDescriptor(boundary.descriptor);
    } catch (error) {
      closeError = error instanceof Error ? error : new Error(String(error));
    }
  }
  const failures = [runError, restoreError, closeError].filter(Boolean);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      "Starship whole-run execution and exact next-env cleanup had multiple failures."
    );
  }
  return result;
}

export function finalizeStarshipPrebuildProcessOutcome({
  closeError = null,
  outcome,
  primaryError = null
}) {
  const normalizedOutcome = normalizeBuildOutcome(outcome);
  const outcomeError = (
    normalizedOutcome.spawnError ||
    normalizedOutcome.signal ||
    normalizedOutcome.code !== 0
  ) ? new Error(`Starship prebuild process failed: ${JSON.stringify(normalizedOutcome)}.`) : null;
  const failures = [outcomeError, primaryError, closeError].filter(Boolean);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      "Starship prebuild process outcome and cleanup had multiple failures."
    );
  }
  return normalizedOutcome;
}

async function runStarshipNextPrebuildProcess(prebuildInvocation, operations = {}) {
  const logPath = prebuildInvocation.serverLogPath;
  const canonicalLogPath = assertStarshipPath("Starship prebuild server log", logPath);
  if (canonicalLogPath !== logPath || realpathSync.native(dirname(logPath)) !== dirname(logPath)) {
    throw new Error("Starship prebuild server log must have a physical canonical parent.");
  }
  const logDescriptor = openSync(
    logPath,
    fsConstants.O_WRONLY |
      fsConstants.O_CREAT |
      fsConstants.O_EXCL |
      fsConstants.O_NOFOLLOW,
    0o600
  );
  let observer = null;
  let outcome = null;
  let primaryError = null;
  let closeError = null;
  try {
    let child;
    try {
      const spawnProcess = operations.spawnProcess ?? spawn;
      child = spawnProcess(prebuildInvocation.command, prebuildInvocation.args, {
        cwd: prebuildInvocation.cwd,
        env: prebuildInvocation.environment,
        stdio: ["ignore", logDescriptor, logDescriptor]
      });
    } catch (error) {
      outcome = {
        code: null,
        signal: null,
        spawnError: error instanceof Error ? error.message : String(error)
      };
    }
    if (child) {
      observer = observeStarshipPlaywrightChild(child);
      const childOutcome = await observer.outcome;
      outcome = childOutcome.error
        ? {
            code: null,
            signal: null,
            spawnError: childOutcome.error instanceof Error
              ? childOutcome.error.message
              : String(childOutcome.error)
          }
        : {
            code: childOutcome.code,
            signal: childOutcome.signal,
            spawnError: null
          };
      if (observer.forwardingError()) throw observer.forwardingError();
    }
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  } finally {
    observer?.dispose();
    try {
      const closeLogDescriptor = operations.closeLogDescriptor ?? closeSync;
      closeLogDescriptor(logDescriptor);
    } catch (error) {
      closeError = error instanceof Error ? error : new Error(String(error));
    }
  }
  return finalizeStarshipPrebuildProcessOutcome({ closeError, outcome, primaryError });
}

export function writeStarshipPlaywrightPrebuildReceipt({
  beforeReceipt,
  invocation,
  operations = {},
  outcome,
  restoreReceipt,
  runnerIdentity,
  runtimeSources,
  server
}) {
  const manifest = validateStarshipE2ePathManifest(invocation.pathManifest);
  assertExactReceipt("restored next-env before/after receipt", beforeReceipt, restoreReceipt);
  if (
    outcome.code !== 0 ||
    outcome.signal !== null ||
    outcome.spawnError !== null ||
    restoreReceipt?.exact !== true
  ) {
    throw new Error("Cannot mint a trusted receipt without a zero build and exact next-env restore.");
  }
  if (
    !Number.isInteger(runnerIdentity?.pid) ||
    runnerIdentity.pid !== process.pid ||
    typeof runnerIdentity?.startToken !== "string" ||
    runnerIdentity.startToken.length === 0
  ) {
    throw new Error("Cannot mint a trusted receipt without the prebuild runner OS identity.");
  }
  if (
    !Number.isInteger(server?.port) ||
    server.port < 1 ||
    server.port > 65_535 ||
    server.baseURL !== `http://127.0.0.1:${server.port}`
  ) {
    throw new Error("Cannot mint a trusted receipt without an exact local port and baseURL.");
  }
  const expectedRuntimeSourcePaths = starshipPlaywrightPrebuildRuntimeSourcePaths(
    manifest.paths.repositoryRoot
  );
  if (
    !Array.isArray(runtimeSources) ||
    runtimeSources.length !== expectedRuntimeSourcePaths.length
  ) {
    throw new Error("Cannot mint a trusted receipt without every exact prebuild runtime source.");
  }
  for (let index = 0; index < expectedRuntimeSourcePaths.length; index += 1) {
    const join = runtimeSources[index];
    if (
      join?.before?.path !== expectedRuntimeSourcePaths[index] ||
      join?.after?.path !== expectedRuntimeSourcePaths[index]
    ) {
      throw new Error("Prebuild runtime source receipt order or exact path is invalid.");
    }
    assertExactRuntimeReceipt(
      `prebuild runtime source before/after ${expectedRuntimeSourcePaths[index]}`,
      join.before,
      join.after
    );
  }
  const buildOutputs = Object.freeze(Object.fromEntries([
    ["buildId", "BUILD_ID", "BUILD_ID"],
    ["requiredServerFiles", "required-server-files.json", "required-server-files"],
    ["buildManifest", "build-manifest.json", "build-manifest"]
  ].map(([key, fileName, label]) => [
    key,
    exactRegularFileReceipt(
      `Starship prebuilt Next ${label}`,
      path.join(manifest.paths.nextDistDir, fileName)
    ).receipt
  ])));
  const receipt = Object.freeze({
    baseURL: server.baseURL,
    build: outcome,
    buildOutputs,
    completedAt: new Date().toISOString(),
    contract: "starship-playwright-prebuild-v1",
    nextEnv: Object.freeze({ after: restoreReceipt, before: beforeReceipt }),
    paths: Object.freeze({
      nextDistDir: manifest.paths.nextDistDir,
      nextEnv: path.join(manifest.paths.repositoryRoot, "next-env.d.ts"),
      nextTsconfigPath: manifest.paths.nextTsconfigPath
    }),
    repositoryRoot: manifest.paths.repositoryRoot,
    runId: manifest.runId,
    port: server.port,
    runner: Object.freeze({
      pid: runnerIdentity.pid,
      startToken: runnerIdentity.startToken
    }),
    runtimeSources,
    schemaVersion: 1,
    status: "build-restored-before-playwright"
  });
  const receiptPath = path.join(
    manifest.paths.e2eRunRoot,
    "evidence",
    "next-env-prebuild-receipt.json"
  );
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const receiptFile = createStarshipExclusiveRegularFile(
    "Starship Playwright prebuild receipt",
    receiptPath,
    receiptBytes,
    operations.receiptFile
  );
  if (receiptFile.mode !== "600") {
    throw new Error("Starship Playwright prebuild receipt must have mode 600.");
  }
  const receiptEnvironment = Object.freeze({
    PLAYWRIGHT_PREBUILD_RECEIPT_DEVICE: receiptFile.device,
    PLAYWRIGHT_PREBUILD_RECEIPT_INODE: receiptFile.inode,
    PLAYWRIGHT_PREBUILD_RECEIPT_PATH: receiptPath,
    PLAYWRIGHT_PREBUILD_RECEIPT_SHA256: receiptFile.sha256,
    PLAYWRIGHT_PREBUILD_RUNNER_PID: String(runnerIdentity.pid),
    PLAYWRIGHT_PREBUILD_RUNNER_START_TOKEN: runnerIdentity.startToken,
    PLAYWRIGHT_PREBUILT_SERVER: "1"
  });
  validateStarshipPlaywrightPrebuildReceipt({
    baseURL: server.baseURL,
    environment: receiptEnvironment,
    pathManifest: manifest,
    port: server.port,
    processIdentity: { ppid: process.pid }
  });
  return receiptEnvironment;
}

const STARSHIP_RENAME_EXCLUSIVE_SOURCE = String.raw`
import ctypes
import errno
import os
import sys

libc = ctypes.CDLL(None, use_errno=True)
renameatx_np = libc.renameatx_np
renameatx_np.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
renameatx_np.restype = ctypes.c_int
result = renameatx_np(3, os.fsencode(sys.argv[1]), 4, os.fsencode(sys.argv[2]), 0x00000004)
if result == 0:
    sys.stdout.write("renamed")
elif ctypes.get_errno() == errno.EEXIST:
    sys.stdout.write("destination-exists")
else:
    sys.stdout.write("errno:" + str(ctypes.get_errno()))
`;

function openStarshipDirectoryIdentityAnchor(label, directoryPath) {
  const canonicalPath = assertStarshipPath(label, directoryPath);
  const lexical = lstatSync(canonicalPath, { bigint: true });
  if (
    !lexical.isDirectory() ||
    lexical.isSymbolicLink() ||
    realpathSync.native(canonicalPath) !== canonicalPath
  ) {
    throw new Error(`${label} must be a physical canonical non-symlink directory.`);
  }
  const descriptor = openSync(
    canonicalPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW
  );
  try {
    const observed = fstatSync(descriptor, { bigint: true });
    if (
      !observed.isDirectory() ||
      observed.dev !== lexical.dev ||
      observed.ino !== lexical.ino
    ) {
      throw new Error(`${label} changed identity between lstat and descriptor open.`);
    }
    return Object.freeze({
      descriptor,
      device: observed.dev.toString(),
      inode: observed.ino.toString(),
      label,
      path: canonicalPath
    });
  } catch (error) {
    closeSync(descriptor);
    throw error;
  }
}

function validateStarshipDirectoryIdentityAnchor(anchor) {
  const held = fstatSync(anchor.descriptor, { bigint: true });
  const lexical = lstatSync(anchor.path, { bigint: true });
  return held.isDirectory() &&
    lexical.isDirectory() &&
    !lexical.isSymbolicLink() &&
    held.dev.toString() === anchor.device &&
    held.ino.toString() === anchor.inode &&
    lexical.dev.toString() === anchor.device &&
    lexical.ino.toString() === anchor.inode &&
    realpathSync.native(anchor.path) === anchor.path;
}

function renameStarshipNoReplaceAnchored({
  destinationAnchor,
  destinationName,
  sourceAnchor,
  sourceName
}) {
  for (const [label, value] of [
    ["source basename", sourceName],
    ["destination basename", destinationName]
  ]) {
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value === "." ||
      value === ".." ||
      value.includes(path.sep)
    ) {
      throw new Error(`Starship no-replace disposition has an invalid ${label}.`);
    }
  }
  const outcome = execFileSync(
    "/usr/bin/python3",
    [
      "-I",
      "-S",
      "-B",
      "-c",
      STARSHIP_RENAME_EXCLUSIVE_SOURCE,
      sourceName,
      destinationName
    ],
    {
      encoding: "utf8",
      env: Object.freeze({ PATH: "/usr/bin:/bin", PYTHONDONTWRITEBYTECODE: "1" }),
      maxBuffer: 1_024,
      stdio: [
        "ignore",
        "pipe",
        "pipe",
        sourceAnchor.descriptor,
        destinationAnchor.descriptor
      ]
    }
  ).trim();
  if (outcome === "renamed") return Object.freeze({ renamed: true, status: "renamed" });
  if (outcome === "destination-exists") {
    return Object.freeze({ renamed: false, status: "destination-exists" });
  }
  return Object.freeze({
    error: `renameatx_np failed with ${outcome || "an empty helper result"}`,
    renamed: false,
    status: "rename-error"
  });
}

function pathEntryExists(filePath) {
  try {
    lstatSync(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

function starshipHeldDispositionPath(held) {
  const basename = path.basename(held.path);
  const { ctimeNs, device, inode } = held.receipt;
  return path.join(
    dirname(held.path),
    `.${basename}.disposed-${device}-${inode}-${ctimeNs}`
  );
}

function assertExactHeldDisposition(label, held, dispositionPath) {
  const disposition = exactRegularFileReceipt(
    `${label} exact disposition`,
    dispositionPath
  );
  assertExactReceipt(
    `${label} created/disposition receipt`,
    held.receipt,
    Object.freeze({ ...disposition.receipt, path: held.path })
  );
  const descriptorReceipt = receiptFromObservation(
    held.path,
    exactDescriptorBytes(held.descriptor)
  );
  assertExactReceipt(
    `${label} created/held disposition descriptor receipt`,
    held.receipt,
    descriptorReceipt
  );
  return disposition.receipt;
}

function disposeStarshipHeldExclusiveFileNoReplace(held, interposition) {
  const { descriptor, label, path: filePath, receipt: expectedReceipt } = held;
  let observed;
  try {
    observed = lstatSync(filePath, { bigint: true });
  } catch (error) {
    throw new Error(
      `${label} disappeared before exact cleanup: ${error instanceof Error ? error.message : String(error)}.`
    );
  }
  if (
    !observed.isFile() ||
    observed.isSymbolicLink() ||
    observed.dev.toString() !== expectedReceipt.device ||
    observed.ino.toString() !== expectedReceipt.inode
  ) {
    throw new Error(`${label} was replaced; preserving the foreign path during cleanup.`);
  }
  const heldStat = fstatSync(descriptor, { bigint: true });
  if (
    !heldStat.isFile() ||
    heldStat.dev.toString() !== expectedReceipt.device ||
    heldStat.ino.toString() !== expectedReceipt.inode
  ) {
    throw new Error(`${label} held descriptor identity changed before cleanup.`);
  }
  let exactError = null;
  try {
    const currentReceipt = receiptFromObservation(
      filePath,
      exactDescriptorBytes(descriptor),
      { includeChangeToken: true }
    );
    assertExactRuntimeReceipt(
      `${label} created/current cleanup receipt`,
      expectedReceipt,
      currentReceipt
    );
  } catch (error) {
    exactError = error instanceof Error ? error : new Error(String(error));
  }
  if (exactError) throw exactError;

  const parentAnchor = openStarshipDirectoryIdentityAnchor(
    `${label} disposition parent`,
    dirname(filePath)
  );
  const dispositionPath = starshipHeldDispositionPath(held);
  let dispositionError = null;
  try {
    if (!validateStarshipDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent identity changed; preserving all paths.`);
    }
    interposition?.afterFinalValidationBeforeDisposition?.(Object.freeze({
      dispositionPath,
      sourcePath: filePath
    }));
    const movement = renameStarshipNoReplaceAnchored({
      destinationAnchor: parentAnchor,
      destinationName: path.basename(dispositionPath),
      sourceAnchor: parentAnchor,
      sourceName: path.basename(filePath)
    });
    if (!movement.renamed) {
      throw new Error(
        `${label} exact no-replace disposition failed (${movement.status}); preserving all paths.`
      );
    }
    fsyncSync(parentAnchor.descriptor);
    if (!validateStarshipDirectoryIdentityAnchor(parentAnchor)) {
      throw new Error(`${label} parent changed during disposition; preserving all paths.`);
    }
    try {
      assertExactHeldDisposition(label, held, dispositionPath);
    } catch (error) {
      const restoration = renameStarshipNoReplaceAnchored({
        destinationAnchor: parentAnchor,
        destinationName: path.basename(filePath),
        sourceAnchor: parentAnchor,
        sourceName: path.basename(dispositionPath)
      });
      fsyncSync(parentAnchor.descriptor);
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${label} foreign source reached disposition; preserving it ` +
        `(restore=${restoration.status}): ${reason}`
      );
    }
    if (pathEntryExists(filePath)) {
      throw new Error(`${label} foreign successor appeared during disposition; preserving it.`);
    }
    return Object.freeze({
      dispositionPath,
      removed: true,
      status: "owned-inode-quarantined"
    });
  } catch (error) {
    dispositionError = error instanceof Error ? error : new Error(String(error));
  } finally {
    try {
      closeSync(parentAnchor.descriptor);
    } catch (error) {
      const closeError = error instanceof Error ? error : new Error(String(error));
      dispositionError = dispositionError
        ? new AggregateError(
            [dispositionError, closeError],
            `${label} disposition and parent descriptor close both failed.`
          )
        : closeError;
    }
  }
  throw dispositionError;
}

export function removeStarshipHeldExclusiveFile(held, interposition = {}) {
  let primaryError = null;
  try {
    disposeStarshipHeldExclusiveFileNoReplace(held, interposition);
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  }
  let closeError = null;
  try {
    closeSync(held.descriptor);
  } catch (error) {
    closeError = error instanceof Error ? error : new Error(String(error));
  }
  if (primaryError && closeError) {
    throw new AggregateError(
      [primaryError, closeError],
      `${held.label} disposition and held descriptor close both failed.`
    );
  }
  if (primaryError) throw primaryError;
  if (closeError) throw closeError;
}

function assertStarshipHeldExclusiveFilePath(held) {
  const lexical = lstatSync(held.path, { bigint: true });
  const descriptorStat = fstatSync(held.descriptor, { bigint: true });
  if (
    !lexical.isFile() ||
    lexical.isSymbolicLink() ||
    lexical.dev.toString() !== held.receipt.device ||
    lexical.ino.toString() !== held.receipt.inode ||
    !descriptorStat.isFile() ||
    descriptorStat.dev.toString() !== held.receipt.device ||
    descriptorStat.ino.toString() !== held.receipt.inode
  ) {
    throw new Error(`${held.label} path or held descriptor identity was replaced.`);
  }
  const observed = receiptFromObservation(
    held.path,
    exactDescriptorBytes(held.descriptor),
    { includeChangeToken: true }
  );
  assertExactRuntimeReceipt(`${held.label} held creation/current receipt`, held.receipt, observed);
  return true;
}

export function observeStarshipPlaywrightChild(child, { processTarget = process } = {}) {
  let complete = false;
  let disposed = false;
  let forwardingError = null;
  let resolveOutcome;
  const outcome = new Promise((resolveExit) => {
    resolveOutcome = resolveExit;
  });
  const settle = (childOutcome) => {
    if (complete) return;
    complete = true;
    resolveOutcome(childOutcome);
  };
  const onError = (error) => settle({ error });
  const onExit = (code, signal) => settle({ code, signal });
  child.once("error", onError);
  child.once("exit", onExit);

  const signalHandlers = new Map(
    ["SIGINT", "SIGTERM"].map((signal) => [signal, () => {
      if (
        complete ||
        child.exitCode !== null ||
        child.signalCode !== null
      ) {
        return;
      }
      try {
        if (!child.kill(signal)) {
          forwardingError ??= new Error(
            `Failed to forward ${signal} to Playwright child process ${child.pid ?? "unknown"}.`
          );
        }
      } catch (error) {
        forwardingError ??= error instanceof Error ? error : new Error(String(error));
      }
    }])
  );
  for (const [signal, handler] of signalHandlers) {
    processTarget.on(signal, handler);
  }

  return Object.freeze({
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const [signal, handler] of signalHandlers) {
        processTarget.removeListener(signal, handler);
      }
      child.removeListener("error", onError);
      child.removeListener("exit", onExit);
    },
    forwardingError: () => forwardingError,
    isComplete: () => complete,
    outcome
  });
}

async function main(argv = process.argv.slice(2)) {
  const parsed = parseCommandLine(argv);
  if (parsed.help) {
    console.log(usage());
    return;
  }
  const invocation = buildStarshipPlaywrightInvocation({
    args: parsed.playwrightArgs,
    runId: parsed.runId
  });
  const paths = invocation.pathManifest.paths;
  for (const directory of [
    paths.browserTempDir,
    paths.crashDumpDir,
    dirname(paths.databasePath),
    paths.e2eRunRoot,
    dirname(paths.nextTsconfigPath),
    paths.nodeCompileCacheDir,
    paths.npmCacheDir,
    paths.outputDir,
    dirname(paths.pathManifestPath),
    dirname(paths.browserProcessEvidencePath),
    paths.reportDir,
    dirname(paths.serverCommandOwnerPidPath),
    dirname(paths.serverLogPath)
  ]) {
    mkdirSync(assertStarshipPath("focused Playwright directory", directory), { recursive: true });
  }
  const runLockPath = assertStarshipPath(
    "focused Playwright run lock",
    resolve(invocation.cwd, ".tmp", "starship-playwright-run.lock")
  );
  const nextEnvPath = assertStarshipPath(
    "tracked Next environment file",
    resolve(invocation.cwd, "next-env.d.ts")
  );
  const releaseRunLock = acquireStarshipPlaywrightRunLock(runLockPath, {
    createdAt: new Date().toISOString(),
    ownerPid: process.pid,
    repositoryRoot: invocation.cwd,
    runId: invocation.pathManifest.runId
  });
  let childObserver = null;
  let prebuildPreparation = null;
  let runLockActive = true;
  let primaryError = null;
  const terminalCleanup = async () => {
    const cleanupErrors = [];
    if (prebuildPreparation) {
      const heldPreparation = prebuildPreparation;
      prebuildPreparation = null;
      try {
        removeStarshipHeldExclusiveFile(heldPreparation.heldTsconfig);
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (runLockActive) {
      runLockActive = false;
      try {
        releaseRunLock();
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (childObserver) {
      const observer = childObserver;
      childObserver = null;
      try {
        observer.dispose();
      } catch (error) {
        cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    if (cleanupErrors.length === 1) throw cleanupErrors[0];
    if (cleanupErrors.length > 1) {
      throw new AggregateError(cleanupErrors, "Starship Playwright terminal cleanup had multiple failures.");
    }
  };
  try {
    await runStarshipNextEnvWholeRunBoundary({
      nextEnvPath,
      repositoryRoot: invocation.cwd,
      run: async () => {
        const prebuildRuntimeSourcePaths = starshipPlaywrightPrebuildRuntimeSourcePaths(
          invocation.cwd
        );
        const runtimeSourcePaths = starshipPlaywrightFullRunRuntimeSourcePaths(
          invocation.cwd,
          parsed.playwrightArgs
        );
        const runtimeSourceEntryPaths = fullRunRuntimeSourceEntryPaths(
          invocation.cwd,
          parsed.playwrightArgs
        );
        const fullRunReceiptPath = path.join(
          paths.e2eRunRoot,
          "evidence",
          "full-run-runtime-source-hold.json"
        );
        let receiptEnvironment = null;
        await runStarshipFullExecutionSourceHold({
          invocation: {
            args: invocation.args,
            command: invocation.command,
            cwd: invocation.cwd
          },
          prebuild: async () => {
            console.log(JSON.stringify({
              contract: "starship-e2e-path-v1",
              paths: invocation.pathManifest.paths,
              runLockPath,
              status: "prebuilding-before-playwright",
              trackedSideEffectSnapshot: nextEnvPath
            }, null, 2));
            const prebuildInvocation = buildStarshipNextPrebuildInvocation(invocation);
            const runnerIdentity = readStarshipProcessIdentity(process.pid);
            receiptEnvironment = await runStarshipNextEnvBuildBeforeLaunch({
              build: async () => {
                prebuildPreparation = prepareStarshipNextPrebuild(prebuildInvocation);
                assertStarshipHeldExclusiveFilePath(prebuildPreparation.heldTsconfig);
                const outcome = await runStarshipNextPrebuildProcess(prebuildInvocation);
                let identityError = null;
                try {
                  assertStarshipHeldExclusiveFilePath(prebuildPreparation.heldTsconfig);
                } catch (error) {
                  identityError = error instanceof Error ? error : new Error(String(error));
                }
                if (identityError) {
                  return finalizeStarshipPrebuildProcessOutcome({ outcome, primaryError: identityError });
                }
                return outcome;
              },
              launch: async ({ beforeReceipt, outcome, restoreReceipt, runtimeSources }) =>
                writeStarshipPlaywrightPrebuildReceipt({
                  beforeReceipt,
                  invocation,
                  outcome,
                  restoreReceipt,
                  runnerIdentity,
                  runtimeSources,
                  server: invocation.server
                }),
              nextEnvPath,
              repositoryRoot: invocation.cwd,
              runtimeSourcePaths: prebuildRuntimeSourcePaths
            });
            return receiptEnvironment;
          },
          executeChild: async ({ childExited, postSpawnLoad }) => {
            const child = spawn(invocation.command, invocation.args, {
              cwd: invocation.cwd,
              env: { ...invocation.environment, ...receiptEnvironment },
              stdio: "inherit"
            });
            childObserver = observeStarshipPlaywrightChild(child);
            if (!Number.isInteger(child.pid)) {
              throw new Error("Playwright child process exposed no numeric PID.");
            }
            postSpawnLoad(readStarshipProcessGroupIdentity(child.pid));
            const minimumDistinctProfiles = (
              parsed.playwrightArgs[0] === "test" && !parsed.playwrightArgs.includes("--list")
            ) ? 2 : 0;
            const monitorPromise = monitorStarshipBrowserProcesses({
              ancestorPid: child.pid,
              expectedBrowserTempDir: paths.browserTempDir,
              isComplete: childObserver.isComplete,
              minimumDistinctProfiles
            });
            const childOutcome = await childObserver.outcome;
            let childBoundaryError = null;
            try {
              childExited({
                code: childOutcome.code,
                signal: childOutcome.signal,
                spawnError: childOutcome.error
                  ? childOutcome.error instanceof Error
                    ? childOutcome.error.message
                    : String(childOutcome.error)
                  : null
              });
            } catch (error) {
              childBoundaryError = error instanceof Error ? error : new Error(String(error));
            }
            let browserProcessEvidence;
            let monitorError = null;
            try {
              browserProcessEvidence = await monitorPromise;
            } catch (error) {
              monitorError = error instanceof Error ? error : new Error(String(error));
              browserProcessEvidence = error && typeof error === "object" && error.evidence
                ? error.evidence
                : {
                    ancestorPid: child.pid,
                    schemaVersion: 1,
                    status: "failed",
                    violation: error instanceof Error ? error.message : String(error)
                  };
            }
            writeFileSync(
              assertStarshipPath(
                "focused Playwright browser process evidence",
                paths.browserProcessEvidencePath
              ),
              `${JSON.stringify(browserProcessEvidence, null, 2)}\n`,
              "utf8"
            );
            const childFailures = [
              childBoundaryError,
              childOutcome.error
                ? childOutcome.error instanceof Error
                  ? childOutcome.error
                  : new Error(String(childOutcome.error))
                : null,
              childObserver.forwardingError(),
              childOutcome.signal
                ? new Error(`Playwright was terminated by signal ${childOutcome.signal}.`)
                : null,
              monitorError
            ].filter(Boolean);
            if (childFailures.length === 1) throw childFailures[0];
            if (childFailures.length > 1) {
              throw new AggregateError(
                childFailures,
                "Playwright child outcome, source hold, or browser monitor had multiple failures."
              );
            }
            process.exitCode = childOutcome.code ?? 1;
            return Object.freeze({ outcome: childOutcome });
          },
          receiptPath: fullRunReceiptPath,
          repositoryRoot: invocation.cwd,
          runtimeSourceEntryPaths,
          runtimeSourcePaths,
          terminalCleanup
        });
      }
    });
  } catch (error) {
    primaryError = error instanceof Error ? error : new Error(String(error));
  } finally {
    const cleanupErrors = [];
    try {
      await terminalCleanup();
    } catch (error) {
      cleanupErrors.push(error instanceof Error ? error : new Error(String(error)));
    }
    const failures = [primaryError, ...cleanupErrors].filter(Boolean);
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      throw new AggregateError(
        failures,
        "Starship Playwright execution and terminal cleanup had multiple failures."
      );
    }
  }
}

const invokedAsMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage());
    process.exitCode = 1;
  });
}
