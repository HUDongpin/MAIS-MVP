import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";

import { REQUIRED_BROWSER_PROOF_INPUT_FILES } from "./required-browser-execution-scope.mjs";
import {
  collectRepositoryBrowserLaunchSources,
  validateBrowserLaunchSources
} from "./run-required-frontend-browser-contracts.mjs";

const repoRoot = resolve(process.cwd());
const source = (file) => readFileSync(resolve(repoRoot, file), "utf8");
const parsedSources = new Map();
const scopeTrustBoundaryInventory = Object.freeze([
  Object.freeze({
    file: "next.config.ts",
    functions: Object.freeze([
      Object.freeze({
        name: "revalidateOwnerAuthority",
        requiredCalls: Object.freeze([
          "assertOwnerNextConfigAuthorityUnchanged",
          "validatePlaywrightOwnerEnvironment",
          "validateRequiredBrowserNextInvocation"
        ])
      }),
      Object.freeze({
        name: "validatedNextConfig",
        requiredCalls: Object.freeze([
          "revalidateOwnerAuthority",
          "revalidateReadOnlyAuthority"
        ])
      })
    ]),
    topLevelCalls: Object.freeze([
      "captureNextConfigReadOnlyAuthority",
      "captureOwnerNextConfigAuthority",
      "classifyNextConfigInvocationContext",
      "createLiveHomeProof",
      "validatePlaywrightOwnerEnvironment",
      "validateRequiredBrowserNextInvocation"
    ])
  }),
  Object.freeze({
    file: "playwright.config.ts",
    functions: Object.freeze([]),
    topLevelCalls: Object.freeze([
      "validatePlaywrightOwnerEnvironment",
      "validateRequiredBrowserPlaywrightInvocation"
    ])
  }),
  Object.freeze({
    file: "scripts/playwright-owner-paths.mjs",
    functions: Object.freeze([
      Object.freeze({ name: "derivePlan", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) }),
      Object.freeze({ name: "materializeValidatedRunPlan", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) })
    ]),
    topLevelCalls: Object.freeze([])
  }),
  Object.freeze({
    file: "scripts/required-browser-execution-scope.mjs",
    functions: Object.freeze([
      Object.freeze({
        name: "assertLiveRequiredBrowserExecutionScope",
        requiredCalls: Object.freeze([
          "buildRequiredBrowserExecutionScope",
          "validateRequiredBrowserExecutionScopeSnapshot"
        ])
      }),
      Object.freeze({ name: "resolveRequiredBrowserCommandSet", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) }),
      Object.freeze({
        name: "liveInvocationContext",
        requiredCalls: Object.freeze([
          "assertLiveRequiredBrowserExecutionScope",
          "resolveRequiredBrowserCommandSet"
        ])
      }),
      Object.freeze({ name: "validateRequiredBrowserNextInvocation", requiredCalls: Object.freeze(["liveInvocationContext"]) }),
      Object.freeze({ name: "validateRequiredBrowserPlaywrightInvocation", requiredCalls: Object.freeze(["liveInvocationContext"]) })
    ]),
    topLevelCalls: Object.freeze([])
  }),
  Object.freeze({
    file: "scripts/run-required-frontend-browser-contracts.mjs",
    functions: Object.freeze([
      Object.freeze({ name: "assertTerminalSummaryPlanAndLiveBinding", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope", "validateTerminalSummary"]) }),
      Object.freeze({ name: "main", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) }),
      Object.freeze({ name: "validateFinalRequiredBrowserReport", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) }),
      Object.freeze({ name: "writeExecutionConfig", requiredCalls: Object.freeze(["assertLiveRequiredBrowserExecutionScope"]) })
    ]),
    topLevelCalls: Object.freeze([])
  })
]);

function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.(?:ts|mts)$/.test(file)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function parseSourceText(sourceText, file) {
  const tree = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file)
  );
  assert.equal(tree.parseDiagnostics.length, 0, `${file} must parse before source-canary slicing`);
  return tree;
}

function parsedRepositorySource(file) {
  if (!parsedSources.has(file)) {
    const text = source(file);
    parsedSources.set(file, { text, tree: parseSourceText(text, file) });
  }
  return parsedSources.get(file);
}

function namedFunctionRegion(file, functionName) {
  const { text, tree } = parsedRepositorySource(file);
  const matches = [];
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(matches.length, 1, `${file} must declare exactly one ${functionName} function`);
  return text.slice(matches[0].getStart(tree), matches[0].end);
}

function identifierCallCount(sourceText, file, identifier) {
  const tree = parseSourceText(sourceText, file);
  let count = 0;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === identifier) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return count;
}

function topLevelIdentifierCallCount(sourceText, file, identifier) {
  const tree = parseSourceText(sourceText, file);
  let count = 0;
  const visit = (node) => {
    if (
      node !== tree
      && (
        ts.isFunctionDeclaration(node)
        || ts.isFunctionExpression(node)
        || ts.isArrowFunction(node)
        || ts.isMethodDeclaration(node)
      )
    ) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && node.expression.text === identifier) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return count;
}

function exactDelimitedRegion(sourceText, startMarker, endMarker, label) {
  const start = sourceText.indexOf(startMarker);
  const end = sourceText.indexOf(endMarker, start + startMarker.length);
  assert.equal(start >= 0 && end > start, true, `${label} markers must exist in order`);
  assert.equal(sourceText.lastIndexOf(startMarker), start, `${label} start marker must be unique`);
  assert.equal(sourceText.lastIndexOf(endMarker), end, `${label} end marker must be unique`);
  return sourceText.slice(start, end);
}

test("portable canary rejects active browser launch escapes without a browser or owner write", () => {
  assert.doesNotThrow(() => validateBrowserLaunchSources(
    collectRepositoryBrowserLaunchSources(repoRoot)
  ));
  assert.throws(
    () => validateBrowserLaunchSources({
      "scripts/unsafe-array.mjs": "spawnSync('npx', ['playwright', 'test', 'unsafe.spec.ts']);"
    }),
    /direct|Playwright|command/i
  );
});

test("portable canary proves physical production guards and fail-closed direct entries statically", () => {
  const helper = source("scripts/playwright-owner-paths.mjs");
  const hostGeometry = source("scripts/browser-host-geometry.mjs");
  const config = source("playwright.config.ts");
  const runner = source("scripts/run-required-frontend-browser-contracts.mjs");
  const nextConfig = source("next.config.ts");
  const nextAuthority = source("scripts/next-config-read-only-authority.mjs");
  const nextImporter = source("scripts/next-config-read-only-importer.mjs");
  const rejectEntry = source("scripts/reject-direct-browser-entry.mjs");

  assert.match(hostGeometry, /const CANONICAL_STARSHIP_ROOT = "\/Volumes\/Starship"/);
  assert.match(hostGeometry, /physically distinct mounted filesystem/);
  assert.match(helper, /from "\.\/browser-host-geometry\.mjs"/);
  assert.match(runner, /assertCanonicalStarshipBrowserHost\(\{ repoRoot \}\)/);
  assert.match(runner, /process\.execPath/);
  assert.match(config, /Actual Playwright execution requires an independently validated canonical Starship owner manifest/);
  assert.match(config, /webServer:\s*undefined/);
  assert.match(nextConfig, /classifyNextConfigInvocationContext/);
  assert.match(nextConfig, /validateRequiredBrowserNextInvocation/);
  assert.match(nextConfig, /assertOwnerNextConfigAuthorityUnchanged/);
  assert.match(nextConfig, /NEXT_CONFIG_READ_ONLY_IMPORT_PHASE/);
  assert.match(nextAuthority, /PINNED_NEXT_VERSION = "15\.5\.23"/);
  assert.match(nextAuthority, /__NEXT_PROCESSED_ENV/);
  assert.match(nextAuthority, /NEXT_CONFIG_CLI_CONTEXT_DENIED/);
  assert.match(nextImporter, /from "\.\.\/next\.config\.ts"/);
  assert.doesNotMatch(nextImporter, /node:fs|child_process|\b(?:eval|Function)\s*\(/);
  assert.doesNotMatch(
    nextConfig,
    /\b(?:writeFileSync|renameSync|unlinkSync|rmSync|readdirSync|mkdirSync)\s*\(/
  );
  assert.doesNotMatch(nextConfig, /retainOrphaned|sweepOrphaned|disposableTsconfigForDist/);
  assert.match(rejectEntry, /rejectDirectBrowserEntry/);
});

test("production certification unit imports only the side-effect-free core", () => {
  const prodUnit = source("scripts/prod-certification.test.mjs");
  assert.match(prodUnit, /from "\.\/prod-certification-core\.mjs"/);
  assert.doesNotMatch(prodUnit, /from "\.\/prod-certification\.mjs"/);
});

test("ubuntu workflows and source-regression recursion invoke only the portable no-browser canary", () => {
  const workflow = source(".github/workflows/ci.yml");
  const sourceRegressions = source("tests/e2e/reported-bug-source-regressions.test.ts");
  const packageManifest = JSON.parse(source("package.json"));

  assert.match(workflow, /npm run test:required-browser-source-canary/);
  assert.doesNotMatch(workflow, /npm run test:required-browser-harness/);
  assert.doesNotMatch(
    workflow,
    /playwright install|playwright test|test:required-frontend-browser-contracts|upload-artifact|actions\/cache|\bpost:/i
  );
  assert.equal(
    packageManifest.scripts?.["test:source-regressions"],
    "node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json --test tests/e2e/reported-bug-source-regressions.test.ts"
  );
  assert.match(
    sourceRegressions,
    /spawnSync\(\s*process\.execPath,\s*\["--test", "scripts\/required-browser-source-canary\.test\.mjs"\]/
  );
  assert.doesNotMatch(sourceRegressions, /npmExecutable|\["run", "test:required-browser-source-canary"\]/);
  assert.doesNotMatch(
    sourceRegressions,
    /spawnSync\([\s\S]{0,300}test:required-browser-harness/
  );
  assert.match(
    packageManifest.scripts?.["test:required-browser-harness"] ?? "",
    /(?:^|\s)scripts\/test-fixture-capability\.test\.mjs(?:\s|$)/
  );
  assert.match(
    packageManifest.scripts?.["test:required-browser-harness"] ?? "",
    /(?:^|\s)scripts\/required-browser-execution-scope\.test\.mjs(?:\s|$)/
  );
});

test("snapshot-only scope validation is confined to exact historical regions and never authorizes effects", () => {
  const pureName = "validateRequiredBrowserExecutionScopeSnapshot";
  const trustApiNames = [
    "assertLiveRequiredBrowserExecutionScope",
    "resolveRequiredBrowserCommandSet",
    "validateRequiredBrowserNextInvocation",
    "validateRequiredBrowserPlaywrightInvocation"
  ];
  const productionProofInputs = REQUIRED_BROWSER_PROOF_INPUT_FILES.filter((file) =>
    /\.(?:[cm]?[jt]sx?)$/.test(file)
    && !/(?:\.test|\.spec|\.test-helper)\./.test(file)
    && !/\.d\.(?:ts|mts)$/.test(file)
  );
  const observedBoundaryFiles = productionProofInputs.filter((file) => {
    const text = source(file);
    return trustApiNames.some((name) => text.includes(name));
  }).sort();
  const declaredBoundaryFiles = scopeTrustBoundaryInventory.map(({ file }) => file).sort();
  assert.deepEqual(observedBoundaryFiles, declaredBoundaryFiles);
  assert.equal(new Set(declaredBoundaryFiles).size, declaredBoundaryFiles.length);

  for (const boundary of scopeTrustBoundaryInventory) {
    const fileSource = source(boundary.file);
    for (const { name, requiredCalls } of boundary.functions) {
      const region = namedFunctionRegion(boundary.file, name);
      for (const requiredCall of requiredCalls) {
        assert.equal(
          identifierCallCount(region, `${boundary.file}#${name}`, requiredCall) > 0,
          true,
          `${boundary.file}#${name} must call ${requiredCall} inside its own AST function region`
        );
      }
    }
    for (const requiredCall of boundary.topLevelCalls) {
      assert.equal(
        topLevelIdentifierCallCount(fileSource, boundary.file, requiredCall),
        1,
        `${boundary.file} must contain exactly one ${requiredCall} call`
      );
    }
  }

  const scopeFile = "scripts/required-browser-execution-scope.mjs";
  const runnerFile = "scripts/run-required-frontend-browser-contracts.mjs";
  const scopeModule = source(scopeFile);
  const runner = source(runnerFile);
  const liveWrapper = namedFunctionRegion(scopeFile, "assertLiveRequiredBrowserExecutionScope");
  const terminalRegion = namedFunctionRegion(runnerFile, "validateTerminalSummary");
  const terminalLiveBindingRegion = namedFunctionRegion(
    runnerFile,
    "assertTerminalSummaryPlanAndLiveBinding"
  );
  const mainRegion = namedFunctionRegion(runnerFile, "main");
  const postCaptureRegion = exactDelimitedRegion(
    mainRegion,
    "if (!sourceFingerprintsPost || !dependencyPost)",
    "let cleanup",
    "runner post-run historical scope capture"
  );

  assert.equal(identifierCallCount(scopeModule, scopeFile, pureName), 1);
  assert.equal(identifierCallCount(liveWrapper, `${scopeFile}#assertLive`, pureName), 1);
  assert.equal(identifierCallCount(runner, runnerFile, pureName), 2);
  assert.equal(identifierCallCount(terminalRegion, `${runnerFile}#terminal`, pureName), 1);
  assert.equal(identifierCallCount(postCaptureRegion, `${runnerFile}#post`, pureName), 1);
  for (const file of [
    "next.config.ts",
    "playwright.config.ts",
    "scripts/next-config-read-only-authority.mjs",
    "scripts/playwright-owner-paths.mjs"
  ]) {
    assert.doesNotMatch(source(file), new RegExp(`\\b${pureName}\\b`));
  }

  for (const file of [
    "scripts/next-config-read-only-authority.d.mts",
    "scripts/next-config-read-only-authority.mjs",
    "scripts/next-config-read-only-importer.mjs"
  ]) {
    assert.equal(REQUIRED_BROWSER_PROOF_INPUT_FILES.includes(file), true);
  }
  assert.match(
    postCaptureRegion,
    /validateRequiredBrowserExecutionScopeSnapshot\(\s*buildRequiredBrowserExecutionScope\(/
  );
  assert.match(
    terminalRegion,
    /validated\.repoRoot === summary\.repoRoot[\s\S]+validated\.dependencyAttestationFingerprint/
  );
  assert.match(
    terminalRegion,
    /executionScope\.status === "matched" && !sameJson\(executionScope\.pre, executionScope\.post\)/
  );
  assert.match(
    terminalRegion,
    /summary\.status === "passed"[\s\S]+executionScope\.status !== "matched"/
  );
  assert.match(
    terminalLiveBindingRegion,
    /validated\.status === "passed"[\s\S]+assertLiveRequiredBrowserExecutionScope\([\s\S]+!sameJson\(validated\.executionScope\.pre, live\)[\s\S]+!sameJson\(validated\.executionScope\.post, live\)/
  );
});
