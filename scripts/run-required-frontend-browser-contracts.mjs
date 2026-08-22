import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  assertActiveBrowserDependencyProofUnchanged,
  buildActiveBrowserDependencyProof,
  validateActiveBrowserDependencyProof
} from "./active-browser-dependency-proof.mjs";
import {
  REQUIRED_BROWSER_EXECUTION_MATRIX,
  REQUIRED_BROWSER_PROOF_INPUT_FILES,
  assertLiveRequiredBrowserExecutionScope,
  assertRequiredBrowserSourceFingerprintsUnchanged,
  buildRequiredBrowserExecutionScope,
  requiredBrowserSourceFingerprints,
  resolveRequiredBrowserCommandSet,
  validateRequiredBrowserExecutionScopeSnapshot
} from "./required-browser-execution-scope.mjs";
export {
  buildActiveBrowserDependencyProof,
  validateActiveBrowserDependencyProof
} from "./active-browser-dependency-proof.mjs";
import {
  bootstrapValidatedRunPlan,
  assertCanonicalStarshipBrowserHost,
  buildValidatedRunEnvironment,
  cleanupValidatedEphemeralLeaves,
  createValidatedRunPlan,
  materializeValidatedRunPlan,
  validateMaterializedRunPlan,
  validateOwnedWritablePath,
  validatePlanOwnedEnvironmentInventory,
  writeValidatedEvidenceJsonAtomic
} from "./playwright-owner-paths.mjs";
import {
  assertLiveHomeEnvironmentValue,
  assertLiveHomeProof,
  copyLiveHomeToChildEnvironment,
  createLiveHomeProof
} from "./live-home-protection.mjs";

export function resolveOwnedBrowserCommands({
  dependencyAttestation,
  executionScope,
  plan,
  repoRoot
}) {
  return resolveRequiredBrowserCommandSet({
    dependencyAttestation,
    executionScope,
    plan,
    repoRoot
  });
}

export const executionMatrix = REQUIRED_BROWSER_EXECUTION_MATRIX;

const requiredBug3Outcomes = executionMatrix.flatMap(({ contracts, project }) =>
  contracts
    .filter(({ contractId }) => contractId === "bug3.lesson.desktop" || contractId === "bug3.lesson.mobile")
    .map((contract) => ({ ...contract, project }))
);

const callerOwnedWritableKeys = [
  "HOSTNAME",
  "PLAYWRIGHT_OWNER_RUN_ROOT",
  "PLAYWRIGHT_RUN_PLAN_MANIFEST",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_REQUIRED_GENERATED_DIR",
  "PLAYWRIGHT_REQUIRED_CONFIG_PATH",
  "PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH",
  "PLAYWRIGHT_SERVICE_LOG_PATH",
  "PLAYWRIGHT_SERVICE_PID_PATH",
  "PLAYWRIGHT_RUN_ID",
  "PLAYWRIGHT_SKIP_WEBSERVER",
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_PORT",
  "PLAYWRIGHT_BROWSER_CHANNEL",
  "HK_MATH_DB_PATH",
  "NEXT_CONFIG_READ_ONLY_IMPORT",
  "NEXT_DIST_DIR",
  "NEXT_RUNTIME",
  "NEXT_TELEMETRY_DISABLED",
  "NEXT_TSCONFIG_PATH",
  "NODE_COMPILE_CACHE",
  "NODE_ENV",
  "NODE_OPTIONS",
  "NODE_PATH",
  "NPM_CONFIG_CACHE",
  "NPM_CONFIG_LOGS_DIR",
  "PORT",
  "__NEXT_PRIVATE_ORIGIN",
  "MAIS_BROWSER_OWNER_TOKEN"
];

const callerWritableOrBehaviorOverridePattern =
  /^(?:BROWSER|CHROME|CHROMIUM|DYLD_|LD_PRELOAD$|NEXT_|NODE_|NPM_CONFIG_|npm_config_|PLAYWRIGHT_|PUPPETEER_|TEMP$|TMP$|TMPDIR$|TURBO_|XDG_)/;

const evidenceEnvironmentKeys = [
  "HK_MATH_DB_PATH",
  "NEXT_DIST_DIR",
  "NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_BROWSER_CHANNEL",
  "PLAYWRIGHT_E2E_ROOT",
  "PLAYWRIGHT_NEXT_DIST_DIR",
  "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
  "PLAYWRIGHT_OUTPUT_DIR",
  "PLAYWRIGHT_OWNER_RUN_ROOT",
  "PLAYWRIGHT_PORT",
  "PLAYWRIGHT_REPORT_DIR",
  "PLAYWRIGHT_REQUIRED_CONFIG_PATH",
  "PLAYWRIGHT_REQUIRED_GENERATED_DIR",
  "PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH",
  "PLAYWRIGHT_RUN_ID",
  "PLAYWRIGHT_RUN_PLAN_MANIFEST",
  "PLAYWRIGHT_SERVICE_LOG_PATH",
  "PLAYWRIGHT_SERVICE_PID_PATH",
  "PLAYWRIGHT_SKIP_WEBSERVER",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TURBO_CACHE_DIR",
  "TURBO_TELEMETRY_DISABLED",
  "XDG_CACHE_HOME",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME"
];

export const declaredProofInputFiles = REQUIRED_BROWSER_PROOF_INPUT_FILES;

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])])
  );
}

function sameJson(left, right) {
  return JSON.stringify(stableObject(left)) === JSON.stringify(stableObject(right));
}

function assertRunnerLiveHome(plan, liveHomeProof) {
  return assertLiveHomeProof(liveHomeProof, {
    expectedHomeValueSha256: plan?.homeValueSha256
  });
}

function assertRunnerOwnerPath(plan, liveHomeProof, label, candidatePath) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const validated = validateOwnedWritablePath(
    plan,
    liveHomeProof,
    label,
    candidatePath,
    { cwd: plan.repoRoot }
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  return validated.absolutePath;
}

function assertEvidenceExcludesTransientHome(value) {
  const seen = new WeakSet();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== "object") return;
    if (seen.has(candidate)) return;
    seen.add(candidate);
    for (const [key, child] of Object.entries(candidate)) {
      if (key.toUpperCase() === "HOME") {
        throw new Error("Retained evidence must exclude the transient HOME value.");
      }
      visit(child);
    }
  };
  visit(value);
  // Opaque LiveHomeProof objects reject JSON serialization, so this also
  // prevents the capability itself from entering retained evidence.
  JSON.stringify(value);
  return value;
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

const runnerOwnedCommandIds = Object.freeze([
  "owner.audit.owner-token-table",
  "owner.audit.pid-environment",
  "owner.audit.process-table",
  "owner.next.build",
  "owner.next.service",
  "owner.playwright.discovery",
  "owner.playwright.final"
]);
const runnerOwnedCommandIdSet = new Set(runnerOwnedCommandIds);
const runnerAuditAmbientEnvironmentKeys = Object.freeze([
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ"
]);
const runnerCommandEvidenceKeys = Object.freeze([
  "argvSha256",
  "commandId",
  "environmentInventorySha256",
  "executableSha256",
  "scopeFingerprint"
]);

function sha256StableJson(value) {
  return createHash("sha256")
    .update(JSON.stringify(stableObject(value)))
    .digest("hex");
}

function resolveRunnerCommandDescriptor(
  plan,
  liveHomeProof,
  commands,
  commandId,
  bindings = {}
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  if (!runnerOwnedCommandIdSet.has(commandId)) {
    throw new Error("Runner attempted to resolve a command outside its closed owner callgraph.");
  }
  const liveScope = assertLiveRequiredBrowserExecutionScope(plan.executionScope, {
    dependencyAttestation: plan.dependencyAttestation,
    repoRoot: plan.repoRoot,
    sourceFingerprints: plan.sourceFingerprints
  });
  if (commands?.scopeFingerprint !== liveScope.scopeFingerprint) {
    throw new Error("Runner command resolver is not bound to the current live execution scope.");
  }

  let resolver = commands;
  let slotBindings = bindings;
  if (commandId === "owner.audit.pid-environment") {
    const { provenOwnedIdentity, ...rest } = bindings;
    if (
      !provenOwnedIdentity
      || !Number.isSafeInteger(provenOwnedIdentity.pid)
      || provenOwnedIdentity.pid <= 1
    ) {
      throw new Error("PID-environment audit requires a revalidated owned identity.");
    }
    const identityBoundPlan = Object.freeze({
      ...plan,
      ownedProcessIdentities: Object.freeze([
        Object.freeze({ pid: provenOwnedIdentity.pid })
      ])
    });
    resolver = resolveOwnedBrowserCommands({
      dependencyAttestation: plan.dependencyAttestation,
      executionScope: plan.executionScope,
      plan: identityBoundPlan,
      repoRoot: plan.repoRoot
    });
    slotBindings = { ...rest, provenOwnedPid: provenOwnedIdentity.pid };
  }

  const descriptor = resolver.resolve(commandId, slotBindings);
  if (
    !descriptor
    || !sameJson(Object.keys(descriptor).sort(), [
      "args",
      "argvSha256",
      "command",
      "commandId",
      "cwd",
      "environmentInventorySha256",
      "executable",
      "scopeFingerprint"
    ])
    || descriptor.commandId !== commandId
    || descriptor.scopeFingerprint !== liveScope.scopeFingerprint
    || descriptor.cwd !== plan.repoRoot
    || descriptor.environmentInventorySha256 !== plan.environmentBinding.inventorySha256
    || !Array.isArray(descriptor.args)
    || descriptor.args.some((value) => typeof value !== "string")
    || descriptor.argvSha256 !== sha256StableJson(descriptor.args)
    || descriptor.command !== descriptor.executable?.canonicalPath
    || !sameJson(Object.keys(descriptor.executable ?? {}).sort(), [
      "canonicalPath", "dev", "ino", "role", "sha256"
    ])
    || !/^[a-f0-9]{64}$/.test(descriptor.executable.sha256 ?? "")
  ) {
    throw new Error("Resolved runner command descriptor is malformed or plan-unbound.");
  }
  const executableEntry = lstatSync(descriptor.command, { throwIfNoEntry: false });
  if (
    !executableEntry?.isFile()
    || executableEntry.isSymbolicLink()
    || realpathSync(descriptor.command) !== descriptor.command
    || String(executableEntry.dev) !== descriptor.executable.dev
    || String(executableEntry.ino) !== descriptor.executable.ino
    || sha256File(descriptor.command) !== descriptor.executable.sha256
  ) {
    throw new Error("Resolved runner executable identity changed before use.");
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return descriptor;
}

function runnerCommandEvidence(descriptor) {
  const evidence = {
    argvSha256: descriptor.argvSha256,
    commandId: descriptor.commandId,
    environmentInventorySha256: descriptor.environmentInventorySha256,
    executableSha256: descriptor.executable.sha256,
    scopeFingerprint: descriptor.scopeFingerprint
  };
  if (
    !sameJson(Object.keys(evidence).sort(), [...runnerCommandEvidenceKeys].sort())
    || !runnerOwnedCommandIdSet.has(evidence.commandId)
    || [
      evidence.argvSha256,
      evidence.environmentInventorySha256,
      evidence.executableSha256,
      evidence.scopeFingerprint
    ].some((value) => !/^[a-f0-9]{64}$/.test(value ?? ""))
  ) {
    throw new Error("Runner command evidence is malformed.");
  }
  return Object.freeze(assertEvidenceExcludesTransientHome(evidence));
}

function combineRunnerCommandEvidence(...sources) {
  const byIdentity = new Map();
  for (const source of sources.flat(Infinity)) {
    if (!source) continue;
    const evidence = runnerCommandEvidence({
      argvSha256: source.argvSha256,
      commandId: source.commandId,
      environmentInventorySha256: source.environmentInventorySha256,
      executable: { sha256: source.executableSha256 },
      scopeFingerprint: source.scopeFingerprint
    });
    const key = JSON.stringify(evidence);
    if (!byIdentity.has(key)) byIdentity.set(key, evidence);
  }
  return [...byIdentity.values()].sort(
    (left, right) =>
      left.commandId.localeCompare(right.commandId)
      || left.argvSha256.localeCompare(right.argvSha256)
  );
}

function exactOwnedChildEnvironment(plan, liveHomeProof, environment, descriptor) {
  assertRunnerLiveHome(plan, liveHomeProof);
  if (descriptor.environmentInventorySha256 !== plan.environmentBinding.inventorySha256) {
    throw new Error("Owned child descriptor environment binding differs from its plan.");
  }
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) {
    throw new Error("Owned child environment must be an exact object.");
  }
  const observedKeys = Object.keys(environment);
  if (!sameJson(observedKeys, plan.environmentBinding.inventoryKeys)) {
    throw new Error("Owned child environment keys/order differ from the plan inventory.");
  }
  for (const key of observedKeys) {
    const property = Object.getOwnPropertyDescriptor(environment, key);
    if (!property || !("value" in property) || typeof property.value !== "string") {
      throw new Error("Owned child environment contains a non-exact value.");
    }
  }
  validatePlanOwnedEnvironmentInventory(plan, environment, liveHomeProof);
  assertLiveHomeEnvironmentValue(liveHomeProof, environment.HOME);
  const withLiveHome = copyLiveHomeToChildEnvironment(liveHomeProof, environment);
  const childEnvironment = Object.fromEntries(
    plan.environmentBinding.inventoryKeys.map((key) => [key, withLiveHome[key]])
  );
  if (!sameJson(Object.keys(childEnvironment), plan.environmentBinding.inventoryKeys)) {
    throw new Error("Owned child environment changed while binding live HOME.");
  }
  validatePlanOwnedEnvironmentInventory(plan, childEnvironment, liveHomeProof);
  assertRunnerLiveHome(plan, liveHomeProof);
  return childEnvironment;
}

function exactAuditChildEnvironment(plan, liveHomeProof) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const ambient = {};
  for (const key of runnerAuditAmbientEnvironmentKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(process.env, key);
    if (descriptor && "value" in descriptor && typeof descriptor.value === "string") {
      ambient[key] = descriptor.value;
    }
  }
  const childEnvironment = copyLiveHomeToChildEnvironment(liveHomeProof, ambient);
  assertLiveHomeEnvironmentValue(liveHomeProof, childEnvironment.HOME);
  assertRunnerLiveHome(plan, liveHomeProof);
  return childEnvironment;
}

function runnerIdentitySignatureFragments(descriptor) {
  return Object.freeze([descriptor.command, ...descriptor.args]);
}

export function collectActiveBrowserDependencyAttestation(repoRoot = process.cwd()) {
  return buildActiveBrowserDependencyProof(repoRoot);
}

export function assertActiveBrowserDependencyAttestationUnchanged(repoRoot, expected) {
  return assertActiveBrowserDependencyProofUnchanged(repoRoot, expected);
}

export function sourceFingerprints(repoRoot = process.cwd()) {
  return requiredBrowserSourceFingerprints(repoRoot);
}

export function assertSourceFingerprintsUnchanged(repoRoot, expectedFingerprints) {
  return assertRequiredBrowserSourceFingerprintsUnchanged(repoRoot, expectedFingerprints);
}

export function validateBrowserLaunchSources(sources) {
  const rawCommandFixtureAllowlist = new Set([
    "components/visualizations/three/manim/mathSceneV2CrossAgentHandoff.test.ts",
    "components/visualizations/three/manim/mathSceneV2FinalOwnerClosurePacket.test.ts",
    "components/visualizations/three/manim/mathSceneV2OwnerGateHandoffBundle.test.ts",
    "components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandEvidenceIntake.test.ts",
    "components/visualizations/three/manim/mathSceneV2OwnerGateRerunCommandTranscriptIntake.test.ts",
    "components/visualizations/three/manim/mathSceneV2OwnerGateTranscriptReadinessPacket.test.ts",
    "components/visualizations/three/manim/mathSceneV2OwnerGateTranscriptRequestPacket.test.ts",
    "components/visualizations/three/manim/mathSceneV2TranscriptVerifiedClosurePipeline.test.ts",
    "scripts/bug3-owner-run-plan.test.mjs",
    "scripts/required-browser-runner.test.mjs",
    "scripts/required-browser-source-canary.test.mjs",
    "tests/e2e/reported-bug-source-regressions.test.ts"
  ]);
  for (const [file, source] of Object.entries(sources)) {
    const normalizedFile = file.replaceAll("\\", "/");
    const allowsRawCommandFixture = rawCommandFixtureAllowlist.has(normalizedFile);
    if (/^\.github\/workflows\/.*\.ya?ml$/.test(normalizedFile)) {
      if (/\bnpx\s+playwright\b|\bplaywright\s+(?:install|test)\b|test:required-frontend-browser-contracts/i.test(source)) {
        throw new Error(`Workflow contains a prohibited Playwright browser command: ${normalizedFile}`);
      }
      if (/actions\/(?:upload-artifact|cache)|^\s*post\s*:/im.test(source)) {
        throw new Error(`Workflow contains a prohibited upload, cache, or post action: ${normalizedFile}`);
      }
    }
    if (normalizedFile === "package.json") {
      const manifest = JSON.parse(source);
      for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
        if (/\bnpx\s+playwright\b|(?:^|\s)playwright\s+test\b|node_modules\/\.bin\/playwright/.test(String(command))) {
          throw new Error(`Package script ${name} contains a direct Playwright browser escape.`);
        }
      }
    }
    const hasRawDirectCommand =
      normalizedFile !== "package.json" &&
      !/^\.github\/workflows\//.test(normalizedFile) &&
      /\bnpx\s+playwright\b|node_modules\/\.bin\/playwright|(?:^|["'`\s])playwright\s+test\b|["']playwright["']\s*,\s*["']test["']/i.test(source);
    let executableDirectCommand = false;
    let executableDirectLaunch = false;
    if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(normalizedFile)) {
      const scriptKind = /\.tsx?$/.test(normalizedFile)
        ? ts.ScriptKind.TSX
        : /\.jsx$/.test(normalizedFile)
          ? ts.ScriptKind.JSX
          : ts.ScriptKind.JS;
      const sourceFile = ts.createSourceFile(
        normalizedFile,
        source,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );
      const browserIdentifiers = new Set(["chromium", "firefox", "webkit"]);
      const playwrightNamespaces = new Set();
      const childProcessNamespaces = new Set();
      const executableIdentifiers = new Set([
        "exec",
        "execFile",
        "execFileSync",
        "execSync",
        "execa",
        "spawn",
        "spawnSync"
      ]);
      const variableInitializers = new Map();
      let hasPlaywrightImport = false;
      const unwrapExpression = (expression) => {
        let current = expression;
        while (
          ts.isAwaitExpression(current) || ts.isParenthesizedExpression(current) ||
          ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) ||
          ts.isNonNullExpression(current) || ts.isSatisfiesExpression?.(current)
        ) {
          current = current.expression;
        }
        return current;
      };
      const staticPropertyName = (expression) => {
        const unwrapped = unwrapExpression(expression);
        if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text;
        if (
          ts.isElementAccessExpression(unwrapped) &&
          unwrapped.argumentExpression &&
          ts.isStringLiteralLike(unwrapExpression(unwrapped.argumentExpression))
        ) {
          return unwrapExpression(unwrapped.argumentExpression).text;
        }
        return null;
      };
      const moduleNameForRequire = (expression) => {
        const unwrapped = unwrapExpression(expression);
        if (
          !ts.isCallExpression(unwrapped) ||
          !ts.isIdentifier(unwrapped.expression) ||
          unwrapped.expression.text !== "require" ||
          unwrapped.arguments.length !== 1 ||
          !ts.isStringLiteralLike(unwrapped.arguments[0])
        ) {
          return null;
        }
        return unwrapped.arguments[0].text;
      };
      const moduleNameForDynamicImport = (expression) => {
        const unwrapped = unwrapExpression(expression);
        if (
          !ts.isCallExpression(unwrapped) ||
          unwrapped.expression.kind !== ts.SyntaxKind.ImportKeyword ||
          unwrapped.arguments.length !== 1 ||
          !ts.isStringLiteralLike(unwrapped.arguments[0])
        ) return null;
        return unwrapped.arguments[0].text;
      };
      const moduleNameForExpression = (expression) =>
        moduleNameForRequire(expression) ?? moduleNameForDynamicImport(expression);
      const rootIdentifier = (expression) => {
        let current = unwrapExpression(expression);
        while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
          current = unwrapExpression(current.expression);
        }
        return ts.isIdentifier(current) ? current.text : null;
      };
      const rootExpression = (expression) => {
        let current = unwrapExpression(expression);
        while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
          current = unwrapExpression(current.expression);
        }
        return current;
      };
      const rootModuleName = (expression) => moduleNameForExpression(rootExpression(expression));
      const registerObjectBinding = (binding, names, allowedProperties) => {
        if (!ts.isObjectBindingPattern(binding)) return;
        for (const element of binding.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const imported = element.propertyName && ts.isIdentifier(element.propertyName)
            ? element.propertyName.text
            : element.name.text;
          if (allowedProperties.has(imported)) names.add(element.name.text);
        }
      };
      const collectDeclarations = (node) => {
        if (
          ts.isCallExpression(node) &&
          /^(?:@playwright\/test|playwright|playwright-core)$/.test(
            moduleNameForDynamicImport(node) ?? ""
          )
        ) {
          hasPlaywrightImport = true;
        }
        if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
          const moduleName = node.moduleSpecifier.text;
          const clause = node.importClause;
          if (/^(?:@playwright\/test|playwright|playwright-core)$/.test(moduleName)) {
            hasPlaywrightImport = true;
            if (clause?.name) playwrightNamespaces.add(clause.name.text);
            if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
              playwrightNamespaces.add(clause.namedBindings.name.text);
            }
            if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
              for (const element of clause.namedBindings.elements) {
                const imported = element.propertyName?.text ?? element.name.text;
                if (["chromium", "firefox", "webkit"].includes(imported)) {
                  browserIdentifiers.add(element.name.text);
                }
              }
            }
          }
          if (/^(?:node:)?child_process$/.test(moduleName) && clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) {
              childProcessNamespaces.add(clause.namedBindings.name.text);
            } else {
              for (const element of clause.namedBindings.elements) {
                const imported = element.propertyName?.text ?? element.name.text;
                if (executableIdentifiers.has(imported)) executableIdentifiers.add(element.name.text);
              }
            }
          }
          if (/^(?:node:)?child_process$/.test(moduleName) && clause?.name) {
            childProcessNamespaces.add(clause.name.text);
          }
        }
        if (ts.isVariableDeclaration(node) && node.initializer) {
          if (ts.isIdentifier(node.name)) variableInitializers.set(node.name.text, node.initializer);
          const initialized = unwrapExpression(node.initializer);
          const requiredModule = moduleNameForExpression(initialized);
          if (/^(?:@playwright\/test|playwright|playwright-core)$/.test(requiredModule ?? "")) {
            hasPlaywrightImport = true;
            if (ts.isIdentifier(node.name)) playwrightNamespaces.add(node.name.text);
            registerObjectBinding(
              node.name,
              browserIdentifiers,
              new Set(["chromium", "firefox", "webkit"])
            );
          }
          if (
            (ts.isPropertyAccessExpression(initialized) || ts.isElementAccessExpression(initialized)) &&
            /^(?:@playwright\/test|playwright|playwright-core)$/.test(
              moduleNameForExpression(initialized.expression) ?? ""
            ) &&
            ["chromium", "firefox", "webkit"].includes(staticPropertyName(initialized)) &&
            ts.isIdentifier(node.name)
          ) {
            hasPlaywrightImport = true;
            browserIdentifiers.add(node.name.text);
          }
          if (/^(?:node:)?child_process$/.test(requiredModule ?? "")) {
            if (ts.isIdentifier(node.name)) childProcessNamespaces.add(node.name.text);
            registerObjectBinding(node.name, executableIdentifiers, new Set([
              "exec",
              "execFile",
              "execFileSync",
              "execSync",
              "spawn",
              "spawnSync"
            ]));
          }
          if (
            (ts.isPropertyAccessExpression(initialized) || ts.isElementAccessExpression(initialized)) &&
            /^(?:node:)?child_process$/.test(
              moduleNameForExpression(initialized.expression) ?? ""
            ) &&
            ts.isIdentifier(node.name)
          ) {
            const property = staticPropertyName(initialized);
            if (property === "default") childProcessNamespaces.add(node.name.text);
            if (executableIdentifiers.has(property)) executableIdentifiers.add(node.name.text);
          }
        }
        ts.forEachChild(node, collectDeclarations);
      };
      collectDeclarations(sourceFile);
      let aliasesChanged = true;
      while (aliasesChanged) {
        aliasesChanged = false;
        for (const [name, initializer] of variableInitializers) {
          const unwrappedInitializer = unwrapExpression(initializer);
          const property = staticPropertyName(unwrappedInitializer);
          const receiver = ts.isPropertyAccessExpression(unwrappedInitializer) || ts.isElementAccessExpression(unwrappedInitializer)
            ? unwrappedInitializer.expression
            : null;
          const browserAlias =
            (ts.isIdentifier(unwrappedInitializer) && browserIdentifiers.has(unwrappedInitializer.text)) ||
            (receiver && playwrightNamespaces.has(rootIdentifier(receiver)) &&
              ["chromium", "firefox", "webkit"].includes(property));
          if (browserAlias && !browserIdentifiers.has(name)) {
            browserIdentifiers.add(name);
            aliasesChanged = true;
          }
          const playwrightNamespaceAlias =
            ts.isIdentifier(unwrappedInitializer) && playwrightNamespaces.has(unwrappedInitializer.text);
          if (playwrightNamespaceAlias && !playwrightNamespaces.has(name)) {
            playwrightNamespaces.add(name);
            aliasesChanged = true;
          }
          const executableAlias =
            (ts.isIdentifier(unwrappedInitializer) && executableIdentifiers.has(unwrappedInitializer.text)) ||
            (receiver && childProcessNamespaces.has(rootIdentifier(receiver)) &&
              executableIdentifiers.has(property));
          if (executableAlias && !executableIdentifiers.has(name)) {
            executableIdentifiers.add(name);
            aliasesChanged = true;
          }
          const childProcessNamespaceAlias =
            (ts.isIdentifier(unwrappedInitializer) && childProcessNamespaces.has(unwrappedInitializer.text)) ||
            (receiver && childProcessNamespaces.has(rootIdentifier(receiver)) && property === "default");
          if (childProcessNamespaceAlias && !childProcessNamespaces.has(name)) {
            childProcessNamespaces.add(name);
            aliasesChanged = true;
          }
        }
      }
      const resolveStaticStrings = (expression, seen = new Set()) => {
        const unwrapped = unwrapExpression(expression);
        if (ts.isStringLiteralLike(unwrapped) || ts.isNoSubstitutionTemplateLiteral(unwrapped)) {
          return [unwrapped.text];
        }
        if (ts.isTemplateExpression(unwrapped)) {
          const parts = [unwrapped.head.text];
          for (const span of unwrapped.templateSpans) {
            const value = resolveStaticStrings(span.expression, seen);
            if (value.length !== 1) return [];
            parts.push(value[0], span.literal.text);
          }
          return [parts.join("")];
        }
        if (ts.isArrayLiteralExpression(unwrapped)) {
          return unwrapped.elements.flatMap((element) => resolveStaticStrings(element, seen));
        }
        if (ts.isIdentifier(unwrapped) && variableInitializers.has(unwrapped.text) && !seen.has(unwrapped.text)) {
          return resolveStaticStrings(
            variableInitializers.get(unwrapped.text),
            new Set([...seen, unwrapped.text])
          );
        }
        if (
          ts.isElementAccessExpression(unwrapped) &&
          unwrapped.argumentExpression &&
          ts.isNumericLiteral(unwrapExpression(unwrapped.argumentExpression))
        ) {
          const receiver = unwrapExpression(unwrapped.expression);
          const initialized = ts.isIdentifier(receiver)
            ? unwrapExpression(variableInitializers.get(receiver.text) ?? receiver)
            : receiver;
          if (ts.isArrayLiteralExpression(initialized)) {
            const index = Number(unwrapExpression(unwrapped.argumentExpression).text);
            const element = initialized.elements[index];
            return element ? resolveStaticStrings(element, seen) : [];
          }
        }
        if (
          ts.isCallExpression(unwrapped) &&
          staticPropertyName(unwrapped.expression) === "slice" &&
          (ts.isPropertyAccessExpression(unwrapped.expression) || ts.isElementAccessExpression(unwrapped.expression))
        ) {
          const receiver = unwrapExpression(unwrapped.expression.expression);
          const initialized = ts.isIdentifier(receiver)
            ? unwrapExpression(variableInitializers.get(receiver.text) ?? receiver)
            : receiver;
          const start = unwrapped.arguments.length > 0
            ? unwrapExpression(unwrapped.arguments[0])
            : null;
          if (ts.isArrayLiteralExpression(initialized) && (!start || ts.isNumericLiteral(start))) {
            const index = start ? Number(start.text) : 0;
            return initialized.elements
              .slice(index)
              .flatMap((element) => resolveStaticStrings(element, seen));
          }
        }
        if (ts.isBinaryExpression(unwrapped) && unwrapped.operatorToken.kind === ts.SyntaxKind.PlusToken) {
          const left = resolveStaticStrings(unwrapped.left, seen);
          const right = resolveStaticStrings(unwrapped.right, seen);
          return left.length === 1 && right.length === 1 ? [`${left[0]}${right[0]}`] : [...left, ...right];
        }
        return [];
      };
      const visit = (node) => {
        if (ts.isCallExpression(node)) {
          const launchMethod = staticPropertyName(node.expression);
          const launchReceiver = ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)
            ? node.expression.expression
            : null;
          if (
            ["launch", "launchPersistentContext"].includes(launchMethod) &&
            (
              hasPlaywrightImport ||
              (launchReceiver && browserIdentifiers.has(rootIdentifier(launchReceiver))) ||
              (launchReceiver && playwrightNamespaces.has(rootIdentifier(launchReceiver))) ||
              (launchReceiver && /^(?:@playwright\/test|playwright|playwright-core)$/.test(
                rootModuleName(launchReceiver) ?? ""
              ))
            )
          ) {
            executableDirectLaunch = true;
          }
          const callText = node.getText(sourceFile);
          const callee = ts.isIdentifier(node.expression) ? node.expression.text : null;
          const receiver = ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)
            ? node.expression.expression
            : null;
          const executableCall =
            (callee !== null && executableIdentifiers.has(callee)) ||
            (receiver && childProcessNamespaces.has(rootIdentifier(receiver)) &&
              executableIdentifiers.has(staticPropertyName(node.expression))) ||
            (receiver && /^(?:node:)?child_process$/.test(rootModuleName(receiver) ?? "") &&
              executableIdentifiers.has(staticPropertyName(node.expression)));
          const staticArguments = node.arguments.flatMap((argument) => resolveStaticStrings(argument));
          const staticCommand = staticArguments.join(" ");
          if (
            executableCall &&
            (
              /\bplaywright\s+test\b|node_modules\/(?:@playwright\/test|playwright(?:-core)?)\/cli(?:\.js)?\s+test\b|node_modules\/\.bin\/playwright\s+test\b/i.test(staticCommand) ||
              (/@playwright\/test\/cli(?:\.js)?/i.test(source) && /\btest\b/i.test(`${staticCommand} ${callText}`)) ||
              /\bnpx\s+playwright\b|node_modules\/\.bin\/playwright|["']playwright["']\s*,\s*["']test["']|["'`]playwright\s+test\b|@playwright\/test\/cli(?:\.js)?["'`]?\s*,\s*["']test["']/i.test(callText)
            )
          ) {
            executableDirectCommand = true;
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    if (/\.py$/.test(normalizedFile)) {
      const importsPlaywright = /(?:^|\n)\s*(?:from\s+playwright(?:\.|\s)|import\s+playwright\b)/m.test(source);
      const callsBrowserLaunch = /\.\s*(?:launch|launch_persistent_context)\s*\(/.test(source) ||
        /\[\s*["'](?:launch|launch_persistent_context)["']\s*\]\s*\(/.test(source);
      if (importsPlaywright && callsBrowserLaunch) executableDirectLaunch = true;
      if (
        /(?:subprocess\s*\.\s*(?:run|Popen|call|check_call|check_output)|\b(?:run|Popen)\s*\()[\s\S]{0,500}(?:\bplaywright\b[\s\S]{0,120}\btest\b|@playwright\/test\/cli)/i.test(source)
      ) {
        executableDirectCommand = true;
      }
      const pythonConstants = new Map();
      for (const match of source.matchAll(/^\s*([A-Za-z_]\w*)\s*=\s*(["'])([^\r\n"']*)\2\s*$/gm)) {
        pythonConstants.set(match[1], match[3]);
      }
      const pythonInvokesSubprocess = /(?:subprocess\s*\.\s*(?:run|Popen|call|check_call|check_output)|\b(?:run|Popen)\s*\()/.test(source);
      const pythonConstantCommand = [...pythonConstants.values()].join(" ");
      if (
        pythonInvokesSubprocess &&
        /(?:\bplaywright\b[\s\S]{0,120}\btest\b|@playwright\/test\/cli)/i.test(pythonConstantCommand)
      ) {
        executableDirectCommand = true;
      }
    }
    if (/\.(?:sh|zsh|bash)$/.test(normalizedFile)) {
      const shellConstants = new Map();
      for (const match of source.matchAll(/^\s*([A-Za-z_]\w*)=(?:(["'])([^\r\n"']*)\2|([^\s#;]+))\s*$/gm)) {
        shellConstants.set(match[1], match[3] ?? match[4] ?? "");
      }
      const expandedShell = source.replace(
        /\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g,
        (_match, braced, plain) => shellConstants.get(braced ?? plain) ?? ""
      ).replace(/["']/g, "");
      if (
        /\b(?:npx\s+)?playwright\s+test\b|node_modules\/(?:@playwright\/test|playwright(?:-core)?)\/cli(?:\.js)?\s+test\b/i.test(expandedShell)
      ) {
        executableDirectCommand = true;
      }
    }
    if (executableDirectCommand || (hasRawDirectCommand && !allowsRawCommandFixture)) {
      throw new Error(`Active source contains a prohibited direct Playwright command: ${normalizedFile}`);
    }
    if (executableDirectLaunch) {
      throw new Error(
        `Direct browser launch APIs are prohibited; use the authenticated owner runner: ${normalizedFile}`
      );
    }
  }
  return true;
}

export function collectRepositoryBrowserLaunchSources(repoRoot = process.cwd()) {
  const canonicalRepoRoot = realpathSync(resolve(repoRoot));
  const sources = {
    "package.json": readFileSync(resolve(canonicalRepoRoot, "package.json"), "utf8")
  };
  const excludedDirectories = new Set([
    ".git",
    ".local",
    ".next",
    ".tmp",
    "node_modules",
    "public",
    "session-logs"
  ]);
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) visit(absolute);
        continue;
      }
      const relativeFile = relative(canonicalRepoRoot, absolute).replaceAll("\\", "/");
      const isWorkflow = /^\.github\/workflows\/.*\.ya?ml$/.test(relativeFile);
      const isExecutableSource = /\.(?:[cm]?[jt]s|[jt]sx|py|sh|zsh)$/.test(entry.name);
      if (isWorkflow || isExecutableSource) {
        sources[relativeFile] = readFileSync(absolute, "utf8");
      }
    }
  };
  visit(canonicalRepoRoot);
  return sources;
}

export function assertRepositoryBrowserLaunchConfinement(repoRoot = process.cwd()) {
  assertCanonicalStarshipBrowserHost({ repoRoot });
  return validateBrowserLaunchSources(collectRepositoryBrowserLaunchSources(repoRoot));
}

export function assertNoCallerOwnedWritableOverrides(environment) {
  if (!environment || typeof environment !== "object" || Array.isArray(environment)) {
    throw new Error("Caller environment must be an exact object.");
  }
  for (const key of Object.keys(environment).sort()) {
    const property = Object.getOwnPropertyDescriptor(environment, key);
    if (!property || !("value" in property) || typeof property.value !== "string") {
      throw new Error("Caller environment contains a non-exact value.");
    }
    if (
      callerOwnedWritableKeys.includes(key)
      || callerWritableOrBehaviorOverridePattern.test(key)
    ) {
      throw new Error(`${key} is runner-owned or behavior-affecting and must be absent.`);
    }
  }
}

export function createDiscoveryArgs(project, { file, grep }) {
  return [
    "test",
    file,
    `--project=${project}`,
    "--grep",
    grep,
    "--list",
    "--reporter=line"
  ];
}

export function parseLineDiscovery(
  output,
  { family, minimumSelected, expectedSelected, project }
) {
  const clean = stripAnsi(output);
  const tuples = [];
  for (const line of clean.split(/\r?\n/)) {
    const match = line.match(/^\s*\[([^\]]+)\]\s+›\s+.+?:\d+:\d+\s+›\s+(.+?)\s*$/);
    if (!match) continue;
    if (match[1] !== project) {
      throw new Error(`Discovery returned unexpected project ${match[1]} for ${family}.`);
    }
    tuples.push({ family, project, title: match[2] });
  }
  const totalMatch = clean.match(/Total:\s+(\d+)\s+tests?\b/);
  const reportedTotal = totalMatch ? Number(totalMatch[1]) : 0;
  if (reportedTotal !== tuples.length) {
    throw new Error(
      `${family} discovery line reporter listed ${tuples.length} tuples but reported ${reportedTotal}.`
    );
  }
  if (tuples.length < minimumSelected) {
    throw new Error(
      `${family} on ${project} selected ${tuples.length}; expected at least ${minimumSelected}.`
    );
  }
  if (Number.isSafeInteger(expectedSelected) && tuples.length !== expectedSelected) {
    throw new Error(
      `${family} on ${project} selected ${tuples.length}; expected exactly ${expectedSelected}.`
    );
  }
  const keys = tuples.map(({ project: tupleProject, title }) => `${tupleProject}\u0000${title}`);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${family} discovery contains duplicate selected tests for ${project}.`);
  }
  return tuples;
}

function collectFamily(
  project,
  contract,
  runEnvironment,
  { commands, liveHomeProof, log, plan, processRecords }
) {
  const startedAt = new Date().toISOString();
  const descriptor = resolveRunnerCommandDescriptor(
    plan,
    liveHomeProof,
    commands,
    "owner.playwright.discovery",
    {
      contractId: contract.contractId,
      grep: contract.grep,
      project,
      spec: contract.file
    }
  );
  const childEnvironment = exactOwnedChildEnvironment(
    plan,
    liveHomeProof,
    runEnvironment,
    descriptor
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  const result = spawnSync(
    descriptor.command,
    descriptor.args,
    {
      cwd: descriptor.cwd,
      encoding: "utf8",
      env: childEnvironment,
      maxBuffer: 16 * 1024 * 1024,
      timeout: 120_000
    }
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  log.append(result.stdout ?? "");
  log.append(result.stderr ?? "");
  processRecords.push({
    ...runnerCommandEvidence(descriptor),
    completionReason: result.error
      ? result.error.code === "ETIMEDOUT" ? "timed-out" : "spawn-error"
      : "natural-exit",
    endedAt: new Date().toISOString(),
    endedAtObserved: true,
    exitCode: result.status,
    label: `discovery:${project}:${contract.label}`,
    logPath: log.path,
    signal: result.signal ?? null,
    spawnError: result.error ? failureForEvidence(result.error) : null,
    startedAt,
    termination: { killSent: false, termSent: false },
    timeoutReason: result.error?.code === "ETIMEDOUT" ? "discovery-bounded-timeout" : null,
    timedOut: result.error?.code === "ETIMEDOUT"
  });
  if (result.error) {
    throw new Error("Owned Playwright discovery subprocess failed to start or timed out.");
  }
  if (result.status !== 0) {
    throw new Error(
      `${contract.label} discovery failed for ${project} with exit code ${result.status ?? 1}.`
    );
  }
  const tuples = parseLineDiscovery(result.stdout, {
    expectedSelected: contract.expectedSelected,
    family: contract.label,
    minimumSelected: contract.minimumSelected,
    project
  });
  for (const tuple of tuples) {
    if (
      project === "mobile-chrome" &&
      contract.allowedMobileSkipTitle &&
      tuple.title === contract.allowedMobileSkipTitle
    ) {
      tuple.allowedStatus = "skipped";
    }
  }
  console.log(
    `Required browser discovery: project=${project} family="${contract.label}" selected=${tuples.length} exact=${contract.expectedSelected}`
  );
  return tuples;
}

function collectReportSpecs(suites, ancestry = [], specs = [], topLevel = true) {
  if (!Array.isArray(suites)) {
    throw new Error("Required browser reporter is malformed: suites must be an array.");
  }
  for (const suite of suites) {
    if (!suite || typeof suite !== "object") {
      throw new Error("Required browser reporter is malformed: every suite must be an object.");
    }
    if (typeof suite.title !== "string") {
      throw new Error("Required browser reporter is malformed: every suite needs a title.");
    }
    if ("specs" in suite && !Array.isArray(suite.specs)) {
      throw new Error("Required browser reporter is malformed: suite specs must be an array.");
    }
    const nextAncestry = topLevel ? ancestry : [...ancestry, suite.title];
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (!spec || typeof spec.title !== "string") {
          throw new Error("Required browser reporter contains a malformed spec title.");
        }
        specs.push({
          ...spec,
          fullTitle: [...nextAncestry, spec.title].join(" › ")
        });
      }
    }
    if ("suites" in suite) {
      collectReportSpecs(suite.suites, nextAncestry, specs, false);
    }
  }
  return specs;
}

function hasSkipOrFixmeAnnotation(test, finalResult) {
  const annotations = [
    ...(Array.isArray(test.annotations) ? test.annotations : []),
    ...(Array.isArray(finalResult.annotations) ? finalResult.annotations : [])
  ];
  return annotations.some((annotation) =>
    annotation?.type === "skip" || annotation?.type === "fixme"
  );
}

function testKey(project, title) {
  return `${project}\u0000${title}`;
}

export function validateFinalRequiredBrowserReport(
  report,
  { dependencyAttestation, executionScope, expectedTests, fingerprints, runId }
) {
  if (!report || typeof report !== "object") {
    throw new Error("Required browser reporter is malformed: expected a JSON object.");
  }
  const validatedScope = assertLiveRequiredBrowserExecutionScope(executionScope, {
    dependencyAttestation,
    repoRoot: executionScope?.repoRoot,
    sourceFingerprints: fingerprints
  });
  if (report.config?.metadata?.requiredRunId !== runId) {
    throw new Error("Required browser reporter run id does not match the validated owner run.");
  }
  if (!sameJson(report.config?.metadata?.sourceFingerprints, fingerprints)) {
    throw new Error("Required browser reporter source fingerprints do not match preflight.");
  }
  if (
    !sameJson(
      report.config?.metadata?.requiredBrowserExecutionScope,
      requiredBrowserExecutionScopeMetadata(validatedScope)
    )
  ) {
    throw new Error("Required browser reporter execution scope does not match preflight.");
  }
  const dependencyAttestationFingerprint = dependencyAttestation?.attestationFingerprint;
  if (
    !/^[a-f0-9]{64}$/.test(dependencyAttestationFingerprint ?? "") ||
    report.config?.metadata?.dependencyAttestationFingerprint !==
      dependencyAttestationFingerprint
  ) {
    throw new Error(
      "Required browser reporter dependency attestation fingerprint does not match preflight."
    );
  }
  if (!Array.isArray(expectedTests) || expectedTests.length === 0) {
    throw new Error("Required browser expected matrix is missing.");
  }
  const expectedByKey = new Map();
  for (const expected of expectedTests) {
    const key = testKey(expected.project, expected.title);
    if (expectedByKey.has(key)) throw new Error(`Expected matrix contains duplicate test: ${key}`);
    expectedByKey.set(key, expected);
  }

  const actualByKey = new Map();
  for (const spec of collectReportSpecs(report.suites)) {
    if (!spec || typeof spec.title !== "string" || !Array.isArray(spec.tests)) {
      throw new Error("Required browser reporter contains a malformed spec.");
    }
    for (const browserTest of spec.tests) {
      const key = testKey(browserTest?.projectName, spec.fullTitle);
      if (actualByKey.has(key)) throw new Error(`Required browser reporter contains duplicate test: ${key}`);
      actualByKey.set(key, { browserTest, spec });
    }
  }

  const missing = [...expectedByKey.keys()].filter((key) => !actualByKey.has(key));
  const extra = [...actualByKey.keys()].filter((key) => !expectedByKey.has(key));
  if (missing.length > 0) {
    throw new Error(`Required browser reporter omitted expected tests: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    throw new Error(`Required browser reporter contains unexpected extra tests: ${extra.join(", ")}`);
  }

  const familyMap = new Map();
  let passed = 0;
  let allowedSkipped = 0;
  let unexpectedSkippedOrFixme = 0;
  for (const [key, expected] of expectedByKey) {
    const { browserTest } = actualByKey.get(key);
    if (!Array.isArray(browserTest.results) || browserTest.results.length === 0) {
      throw new Error(`Required browser reporter has no result for ${key}.`);
    }
    const finalResult = browserTest.results[browserTest.results.length - 1];
    const skippedOrFixme =
      finalResult.status === "skipped" ||
      browserTest.expectedStatus === "skipped" ||
      hasSkipOrFixmeAnnotation(browserTest, finalResult);
    if (expected.allowedStatus === "skipped") {
      if (finalResult.status !== "skipped" || browserTest.expectedStatus !== "skipped") {
        throw new Error(`Allowed skip did not report the exact skipped outcome: ${key}`);
      }
      allowedSkipped += 1;
    } else {
      if (skippedOrFixme) {
        unexpectedSkippedOrFixme += 1;
        throw new Error(`Required browser reporter contains a disallowed skip/fixme: ${key}`);
      }
      if (finalResult.status !== "passed" || browserTest.expectedStatus !== "passed") {
        throw new Error(`Required browser test did not pass: ${key} status=${finalResult.status}`);
      }
      passed += 1;
    }
    const familyKey = `${expected.project}\u0000${expected.family}`;
    const family = familyMap.get(familyKey) ?? {
      allowedSkipped: 0,
      family: expected.family,
      passed: 0,
      project: expected.project,
      selected: 0,
      unexpectedSkippedOrFixme: 0
    };
    family.selected += 1;
    if (expected.allowedStatus === "skipped") family.allowedSkipped += 1;
    else family.passed += 1;
    familyMap.set(familyKey, family);
  }
  return {
    allowedSkipped,
    families: [...familyMap.values()],
    passed,
    total: expectedTests.length,
    unexpectedSkippedOrFixme
  };
}

export function assertRequiredBug3Outcomes(report, requirements = requiredBug3Outcomes) {
  const specs = collectReportSpecs(report?.suites);
  const summaries = [];
  for (const requirement of requirements) {
    let selected = 0;
    let passed = 0;
    let unexpectedSkippedOrFixme = 0;
    for (const spec of specs) {
      if (typeof spec?.title !== "string" || !spec.title.includes(requirement.grep)) continue;
      for (const browserTest of spec.tests ?? []) {
        if (browserTest.projectName !== requirement.project) continue;
        selected += 1;
        const finalResult = browserTest.results?.at(-1);
        const skipped = !finalResult ||
          finalResult.status === "skipped" ||
          browserTest.expectedStatus === "skipped" ||
          hasSkipOrFixmeAnnotation(browserTest, finalResult);
        if (skipped) unexpectedSkippedOrFixme += 1;
        else if (finalResult.status === "passed" && browserTest.expectedStatus === "passed") passed += 1;
      }
    }
    if (unexpectedSkippedOrFixme > 0) {
      throw new Error(`${requirement.label} has unexpected skipped/fixme outcomes.`);
    }
    if (passed < requirement.minimumPassed) {
      throw new Error(`${requirement.label} passed ${passed}; expected at least ${requirement.minimumPassed}.`);
    }
    summaries.push({
      label: requirement.label,
      passed,
      project: requirement.project,
      selected,
      unexpectedSkippedOrFixme
    });
  }
  return summaries;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requiredBrowserExecutionScopeMetadata(executionScope) {
  return stableObject({
    closureSha256: executionScope.closure.sha256,
    commandCatalogSha256: executionScope.commandCatalog.sha256,
    destructiveLedgerSha256: executionScope.destructiveLedger.sha256,
    mode: executionScope.mode,
    proofInputsSha256: executionScope.proofInputs.sha256,
    scopeFingerprint: executionScope.scopeFingerprint
  });
}

export function writeExecutionConfig(plan, liveHomeProof, fingerprints, expectedTests) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const validatedScope = assertLiveRequiredBrowserExecutionScope(plan.executionScope, {
    dependencyAttestation: plan.dependencyAttestation,
    repoRoot: plan.repoRoot,
    sourceFingerprints: fingerprints
  });
  const scopeMetadata = requiredBrowserExecutionScopeMetadata(validatedScope);
  const configPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "required execution config",
    plan.paths.requiredConfig
  );
  const reportPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "required JSON report",
    plan.evidencePaths.finalResults
  );
  if (configPath !== resolve(plan.paths.requiredGeneratedDir, "required.config.ts")) {
    throw new Error("Required execution config path does not match its validated leaf.");
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  if (existsSync(configPath)) throw new Error(`Required execution config already exists: ${configPath}`);
  const relativeBaseConfigPath = relative(dirname(configPath), resolve(plan.repoRoot, "playwright.config.ts"))
    .replaceAll("\\", "/");
  const baseConfigImport = relativeBaseConfigPath.startsWith(".")
    ? relativeBaseConfigPath
    : `./${relativeBaseConfigPath}`;
  const generatedMatrix = executionMatrix.map(({ project, contracts }) => ({
    project,
    files: Array.from(new Set(contracts.map(({ file }) => `**/${basename(file)}`))),
    grep: contracts.map(({ grep }) => escapeRegExp(grep)).join("|")
  }));
  const configSource = [
    `import baseConfig from ${JSON.stringify(baseConfigImport)};`,
    "",
    `const requiredProjects = ${JSON.stringify(generatedMatrix, null, 2)};`,
    "const projects = requiredProjects.map(({ project, files, grep }) => {",
    "  const baseProject = baseConfig.projects?.find((candidate) => candidate.name === project);",
    '  if (!baseProject) throw new Error("Missing Playwright project in base config: " + project);',
    "  return { ...baseProject, testMatch: files, grep: new RegExp(grep) };",
    "});",
    `const metadata = { ...(baseConfig.metadata ?? {}), dependencyAttestationFingerprint: ${JSON.stringify(plan.dependencyAttestation.attestationFingerprint)}, requiredBrowserExecutionScope: ${JSON.stringify(scopeMetadata)}, requiredRunId: ${JSON.stringify(plan.runId)}, sourceFingerprints: ${JSON.stringify(fingerprints)} };`,
    `const reporter = [["line"], ["json", { outputFile: ${JSON.stringify(reportPath)} }], ["html", { open: "never", outputFolder: ${JSON.stringify(plan.evidencePaths.finalReport)} }]];`,
    `export default { ...baseConfig, metadata, retries: 0, testDir: ${JSON.stringify(resolve(plan.repoRoot, "tests/e2e"))}, webServer: undefined, projects, reporter };`,
    ""
  ].join("\n");
  assertRunnerOwnerPath(plan, liveHomeProof, "required execution config", configPath);
  writeFileSync(configPath, configSource, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return configPath;
}

function isStrictDescendant(candidate, root) {
  const pathRelative = relative(root, candidate);
  return pathRelative !== "" && !pathRelative.startsWith("..") && !pathRelative.startsWith("/");
}

function redactCommandForEvidence(command) {
  return String(command)
    .replace(
      /(\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|COOKIE|AUTHORIZATION|AUTH|SESSION)[A-Z0-9_]*=)(?:"[^"]*"|'[^']*'|\S+)/gi,
      "$1[REDACTED]"
    )
    .replace(
      /(--(?:api[-_]?key|token|secret|password|credential|authorization|auth|cookie|session)(?:=|\s+))(?:"[^"]*"|'[^']*'|\S+)/gi,
      "$1[REDACTED]"
    )
    .replace(/(\b(?:authorization|proxy-authorization)\s*:\s*(?:bearer|basic)\s+)\S+/gi, "$1[REDACTED]")
    .replace(/(\b(?:cookie|set-cookie)\s*:\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(\bbearer\s+)\S+/gi, "$1[REDACTED]")
    .replace(
      /(["']?(?:api[-_]?key|token|secret|password|credential|authorization|cookie|session)["']?\s*:\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi,
      "$1[REDACTED]"
    )
    .replace(/([?&](?:api[-_]?key|token|secret|password|credential|authorization|cookie|session)=)[^&#\s]+/gi, "$1[REDACTED]")
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[REDACTED]@");
}

export function failureForEvidence(error) {
  const failure = error instanceof Error ? error : new Error(String(error));
  const message = redactFailureText(failure.message);
  const allowedNames = new Set([
    "AbortError",
    "AggregateError",
    "AssertionError",
    "Error",
    "EvalError",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError"
  ]);
  const name = allowedNames.has(failure.name) ? failure.name : "Error";
  const stackBody = failure.stack
    ? String(failure.stack)
        .split(/\r?\n/)
        .slice(1)
        .filter((line) => /^\s*at\s+/.test(line))
        .slice(0, 64)
        .join("\n")
    : "";
  return {
    message,
    name,
    stack: failure.stack
      ? name + ": " + message + (stackBody ? "\n" + redactFailureText(stackBody) : "")
      : undefined
  };
}

export function redactStreamText(value) {
  return redactFailureText(String(value))
    .replace(/\b(?:sk_(?:live|test)_[A-Za-z0-9_-]+|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+|xox[baprs]-[A-Za-z0-9-]+|AKIA[A-Z0-9]{16})\b/g, "[REDACTED]");
}

function redactFailureText(value) {
  return redactCommandForEvidence(value)
    .replace(/\b[a-f0-9]{64}\b/gi, "[FINGERPRINT]")
    .replace(/\b(pid|ppid)\s*[:=]?\s*\d+\b/gi, "$1 [PID]")
    .replace(/(?:[A-Za-z]:[\\/]|\/)(?:[^\s"'`<>])+/g, "[ABSOLUTE_PATH]");
}

export function stableCiFailureMessage() {
  return "Required browser gate failed; inspect the confined local validated summary.";
}

export function failureSummaryForEvidence(
  error,
  {
    cleanup,
    expectedTests,
    fingerprints,
    mode,
    planFingerprint,
    retainedHashes,
    runId,
    shutdownClean
  }
) {
  return {
    cleanup,
    expectedTests,
    failure: failureForEvidence(error),
    fingerprints,
    mode,
    planFingerprint,
    retainedHashes,
    runId,
    shutdownClean,
    status: "failed"
  };
}

export function parseOwnedProcessSnapshot(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    const extended = line.match(
      /^\s*(\d+)\s+(\d+)\s+(\d+)\s+([A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+?)\s*$/
    );
    if (extended) {
      rows.push({
        command: extended[5],
        pgid: Number(extended[3]),
        pid: Number(extended[1]),
        ppid: Number(extended[2]),
        startedAt: extended[4]
      });
      continue;
    }
    const legacy = line.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/);
    if (legacy) {
      rows.push({
        command: legacy[3],
        pgid: null,
        pid: Number(legacy[1]),
        ppid: Number(legacy[2]),
        startedAt: null
      });
    }
  }
  return rows;
}

function parseProcessSnapshot(output) {
  return parseOwnedProcessSnapshot(output);
}

export function createSpawnOwnedIdentity({
  expectedParentPid,
  label,
  ownerToken,
  requireOwnProcessGroup = true,
  row,
  signatureFragments = []
}) {
  if (!row || !Number.isSafeInteger(row.pid) || row.pid <= 1) {
    throw new Error("Spawn-owned process identity requires a valid PID.");
  }
  if (!Number.isSafeInteger(row.ppid) || row.ppid !== expectedParentPid) {
    throw new Error("Spawn-owned process identity parent does not match the spawning process.");
  }
  if (!Number.isSafeInteger(row.pgid) || row.pgid <= 1) {
    throw new Error("Spawn-owned process identity requires a process group.");
  }
  if (requireOwnProcessGroup && row.pgid !== row.pid) {
    throw new Error("Spawn-owned root must own its process group.");
  }
  if (typeof row.startedAt !== "string" || row.startedAt.length < 20) {
    throw new Error("Spawn-owned process identity requires an immutable start time.");
  }
  if (!Array.isArray(signatureFragments) || signatureFragments.length === 0) {
    throw new Error("Spawn-owned root requires an executable/run-root signature.");
  }
  if (signatureFragments.some((fragment) => !row.command.includes(fragment))) {
    throw new Error("Spawn-owned root command does not match its executable/run-root signature.");
  }
  return Object.freeze({
    depth: 0,
    label,
    ownerToken,
    pgid: row.pgid,
    pid: row.pid,
    ppidAtDiscovery: row.ppid,
    role: "root",
    rootPid: row.pid,
    signatureFragments: [...signatureFragments],
    startedAt: row.startedAt
  });
}

function identityMatchesRow(identity, row) {
  if (!row || identity.pid !== row.pid) return false;
  if (identity.pgid !== row.pgid || identity.startedAt !== row.startedAt) return false;
  if (identity.role === "root") {
    const originalSignature = identity.signatureFragments.every((fragment) =>
      row.command.includes(fragment)
    );
    const verifiedServiceTransition =
      identity.label === "service" && /^next-server(?:\s|$)/.test(row.command);
    if (!originalSignature && !verifiedServiceTransition) return false;
  }
  return true;
}

export function refreshSpawnOwnedRegistry(registry, rows) {
  const nextRegistry = new Map(registry);
  const rowsByPid = new Map(rows.map((row) => [row.pid, row]));
  const liveByPid = new Map();
  const identityMismatches = [];
  for (const identity of nextRegistry.values()) {
    const row = rowsByPid.get(identity.pid);
    if (!row) continue;
    if (!identityMatchesRow(identity, row)) {
      identityMismatches.push({
        classification: "identity-mismatch",
        label: identity.label,
        pid: identity.pid,
        ppid: row.ppid
      });
      continue;
    }
    liveByPid.set(identity.pid, identity);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (nextRegistry.has(row.pid) || !liveByPid.has(row.ppid)) continue;
      const parent = liveByPid.get(row.ppid);
      if (
        !Number.isSafeInteger(row.pgid) ||
        typeof row.startedAt !== "string" ||
        row.pgid !== parent.pgid
      ) {
        continue;
      }
      const identity = Object.freeze({
        depth: parent.depth + 1,
        label: parent.label,
        ownerToken: parent.ownerToken,
        pgid: row.pgid,
        pid: row.pid,
        ppidAtDiscovery: row.ppid,
        role: "descendant",
        rootPid: parent.rootPid,
        signatureFragments: [],
        startedAt: row.startedAt
      });
      nextRegistry.set(identity.pid, identity);
      liveByPid.set(identity.pid, identity);
      changed = true;
    }
  }
  return {
    identityMismatches,
    liveVerified: [...liveByPid.values()].sort((left, right) => left.pid - right.pid),
    registry: nextRegistry
  };
}

export function classifyUnprovenOwnerProcesses(
  plan,
  rows,
  { tokenBearingPids = new Set(), verifiedPids = new Set() } = {}
) {
  const tokenPids = tokenBearingPids instanceof Set
    ? tokenBearingPids
    : new Set(tokenBearingPids);
  const provenPids = verifiedPids instanceof Set ? verifiedPids : new Set(verifiedPids);
  const unproven = [];
  for (const row of rows) {
    if (provenPids.has(row.pid)) continue;
    const hasOwnerToken = tokenPids.has(row.pid);
    const hasOwnerRoot =
      typeof plan?.ownerRoot === "string" && row.command.includes(plan.ownerRoot);
    if (!hasOwnerToken && !hasOwnerRoot) continue;
    unproven.push({
      classification: hasOwnerToken ? "owner-token-unproven" : "owner-root-unproven",
      pid: row.pid,
      ppid: row.ppid
    });
  }
  return unproven.sort((left, right) => left.pid - right.pid);
}

export function assertSpawnOwnedIdentityEstablished(identity, record) {
  if (!identity) {
    throw new Error(
      `Spawned ${record?.label ?? "subprocess"} process identity could not be established.`
    );
  }
  return identity;
}

export function planVerifiedSignalOrder(registry, rows) {
  const refreshed = refreshSpawnOwnedRegistry(registry, rows);
  if (refreshed.identityMismatches.length > 0) {
    throw new Error("Spawn-owned process identity mismatch prevents blind signaling.");
  }
  return [...refreshed.liveVerified].sort(
    (left, right) => right.depth - left.depth || right.pid - left.pid
  );
}

export function verifyServicePidEvidenceText(value, identity) {
  const pid = Number(String(value).trim());
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    return { signalAuthority: false, status: "malformed" };
  }
  return {
    signalAuthority: false,
    status: pid === identity?.pid ? "matched" : "mismatch"
  };
}

export function analyzeProcessSnapshot(plan, output, ownedRootPids = []) {
  const rows = parseProcessSnapshot(output);
  const owned = new Set(ownedRootPids.filter(Number.isSafeInteger));
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (!owned.has(row.pid) && owned.has(row.ppid)) {
        owned.add(row.pid);
        changed = true;
      }
    }
  }
  const ownedProcesses = rows
    .filter(({ pid }) => owned.has(pid))
    .map(({ command, pid, ppid }) => ({
      command: redactCommandForEvidence(command),
      pid,
      ppid
    }));
  const profilePaths = [];
  const relevantProcesses = [];
  for (const row of rows) {
    const hasOwnerPath = row.command.includes(plan.ownerRoot);
    const hasProfile = row.command.includes("playwright_chromiumdev_profile-");
    if (owned.has(row.pid) || hasOwnerPath || hasProfile) {
      relevantProcesses.push({
        command: redactCommandForEvidence(row.command),
        pid: row.pid,
        ppid: row.ppid
      });
    }
    for (const match of row.command.matchAll(/--user-data-dir=(?:"([^"]+)"|'([^']+)'|(\S+))/g)) {
      const profilePath = resolve(match[1] ?? match[2] ?? match[3]);
      if (profilePath.includes("playwright_chromiumdev_profile-")) profilePaths.push(profilePath);
    }
  }
  const uniqueProfiles = [...new Set(profilePaths)].sort();
  const foreignProfiles = uniqueProfiles.filter(
    (profilePath) => !isStrictDescendant(profilePath, plan.paths.tmpDir)
  );
  return {
    foreignProfiles,
    ownedProfiles: uniqueProfiles.filter(
      (profilePath) => isStrictDescendant(profilePath, plan.paths.tmpDir)
    ),
    ownedPids: ownedProcesses.map(({ pid }) => pid).sort((left, right) => left - right),
    ownedProcesses,
    profilePaths: uniqueProfiles,
    relevantProcesses
  };
}

function classifiedProfileForEvidence(plan, profilePath) {
  const classification = isStrictDescendant(profilePath, plan.paths.tmpDir)
    ? "owned"
    : "foreign";
  return {
    classification,
    profile: `[${classification.toUpperCase()}_PROFILE]`
  };
}

const maxProcessAuditSamples = 256;

function mergeProcessAuditOverflow(collection, evidence) {
  let overflow = collection.find(({ eventType }) => eventType === "process-sample-overflow");
  if (!overflow) {
    overflow = {
      activeProfileCount: 0,
      capturedAt: evidence.capturedAt,
      commands: [],
      eventType: "process-sample-overflow",
      firstCapturedAt: evidence.capturedAt,
      foreignProfileCount: 0,
      identityMismatchCount: 0,
      lastPhase: evidence.phase,
      omittedSampleCount: 0,
      ownedProfileCount: 0,
      phase: "bounded-overflow",
      processes: [],
      profiles: [],
      violationCode: null,
      violationCounts: {}
    };
    if (collection.length < maxProcessAuditSamples) collection.push(overflow);
    else collection[collection.length - 1] = overflow;
  }
  overflow.activeProfileCount = Math.max(
    overflow.activeProfileCount,
    evidence.activeProfileCount ?? 0
  );
  overflow.capturedAt = evidence.capturedAt;
  overflow.foreignProfileCount = Math.max(
    overflow.foreignProfileCount,
    evidence.foreignProfileCount ?? 0
  );
  overflow.identityMismatchCount = Math.max(
    overflow.identityMismatchCount,
    evidence.identityMismatchCount ?? 0
  );
  overflow.lastPhase = evidence.phase;
  overflow.omittedSampleCount += 1;
  overflow.ownedProfileCount = Math.max(
    overflow.ownedProfileCount,
    evidence.ownedProfileCount ?? 0
  );
  if (evidence.violationCode) {
    overflow.violationCounts[evidence.violationCode] =
      (overflow.violationCounts[evidence.violationCode] ?? 0) + 1;
  }
  overflow.commands = combineRunnerCommandEvidence(
    overflow.commands,
    evidence.commands ?? []
  ).slice(0, 32);
  return overflow;
}

export function appendBoundedProcessAuditEvidence(collection, evidence) {
  if (!Array.isArray(collection) || !evidence || typeof evidence !== "object") {
    throw new Error("Bounded process-audit evidence requires a collection and sample.");
  }
  const hasOverflow = collection.some(
    ({ eventType }) => eventType === "process-sample-overflow"
  );
  if (!hasOverflow && collection.length < maxProcessAuditSamples - 1) {
    collection.push(evidence);
    return collection;
  }
  if (evidence.violationCode) {
    const replaceIndex = collection.findLastIndex(
      ({ eventType, violationCode }) =>
        eventType !== "process-sample-overflow" && !violationCode
    );
    if (
      !hasOverflow &&
      collection.length === maxProcessAuditSamples - 1 &&
      replaceIndex >= 0
    ) {
      mergeProcessAuditOverflow(collection, collection[replaceIndex]);
      collection[replaceIndex] = evidence;
      return collection;
    }
    if (collection.length < maxProcessAuditSamples) {
      collection.push(evidence);
      return collection;
    }
    if (replaceIndex >= 0) {
      mergeProcessAuditOverflow(collection, collection[replaceIndex]);
      collection[replaceIndex] = evidence;
      return collection;
    }
  }
  mergeProcessAuditOverflow(collection, evidence);
  return collection;
}

export function persistSanitizedProcessAuditSample(
  plan,
  collection,
  phase,
  audit,
  persist,
  { assertSafe = true, commandEvidence = [] } = {}
) {
  const ownedPids = new Set((audit.ownedProcesses ?? []).map(({ pid }) => pid));
  const processEvidence = [];
  const seenProcessEvidence = new Set();
  const appendProcessEvidence = ({ classification, pid, ppid }) => {
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(ppid)) return;
    const key = `${classification}\u0000${pid}\u0000${ppid}`;
    if (seenProcessEvidence.has(key) || processEvidence.length >= 100) return;
    seenProcessEvidence.add(key);
    processEvidence.push({ classification, pid, ppid });
  };
  for (const { pid, ppid } of audit.relevantProcesses ?? []) {
    appendProcessEvidence({
      classification: ownedPids.has(pid) ? "spawn-owned" : "observed-profile-reference",
      pid,
      ppid
    });
  }
  for (const mismatch of audit.identityMismatches ?? []) {
    appendProcessEvidence({
      classification: "identity-mismatch",
      pid: mismatch.pid,
      ppid: mismatch.ppid
    });
  }
  for (const unproven of audit.unprovenOwnerProcesses ?? []) {
    appendProcessEvidence(unproven);
  }
  const evidence = {
    activeProfileCount: audit.profilePaths?.length ?? 0,
    capturedAt: audit.capturedAt,
    commands: combineRunnerCommandEvidence(commandEvidence),
    eventType: "process-sample",
    foreignProfileCount: audit.foreignProfiles?.length ?? 0,
    identityMismatchCount: audit.identityMismatches?.length ?? 0,
    ownedProfileCount: audit.ownedProfiles?.length ?? 0,
    phase,
    processes: processEvidence,
    profiles: (audit.profilePaths ?? []).slice(0, 100).map((profilePath) =>
      classifiedProfileForEvidence(plan, profilePath)
    ),
    violationCode: (audit.foreignProfiles?.length ?? 0) > 0
      ? "FOREIGN_PLAYWRIGHT_PROFILE"
      : (audit.identityMismatches?.length ?? 0) > 0
        ? "PROCESS_IDENTITY_MISMATCH"
        : (audit.unprovenOwnerProcesses?.length ?? 0) > 0
          ? "UNPROVEN_OWNER_PROCESS"
        : null
  };
  appendBoundedProcessAuditEvidence(collection, evidence);
  persist(evidence, collection);
  if (assertSafe && evidence.foreignProfileCount > 0) {
    throw new Error(`${phase} process audit found a foreign Playwright profile.`);
  }
  return evidence;
}

export function createBoundedRedactedLog(
  plan,
  liveHomeProof,
  filePath,
  { maxBytes = 512 * 1024 } = {}
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 64) {
    throw new Error("Bounded log maxBytes must be an integer of at least 64 bytes.");
  }
  const guardedPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "bounded redacted log",
    filePath
  );
  const descriptor = openSync(guardedPath, "wx", 0o600);
  let bytesWritten = 0;
  let closed = false;
  let pending = "";
  let truncated = false;
  const inputLimit = maxBytes * 4;
  const truncationMarker = Buffer.from("\n[LOG_TRUNCATED]\n", "utf8");
  const dataLimit = maxBytes - truncationMarker.length;

  const persistRedacted = (value) => {
    if (!value || truncated) return;
    const redacted = redactStreamText(value);
    const remaining = dataLimit - bytesWritten;
    if (remaining <= 0) {
      truncated = true;
      return;
    }
    const encoded = Buffer.from(redacted, "utf8");
    if (encoded.length > remaining) {
      assertRunnerLiveHome(plan, liveHomeProof);
      writeSync(descriptor, encoded.subarray(0, remaining));
      bytesWritten += remaining;
      truncated = true;
      return;
    }
    assertRunnerLiveHome(plan, liveHomeProof);
    writeSync(descriptor, encoded);
    bytesWritten += encoded.length;
  };

  return {
    path: guardedPath,
    append(chunk) {
      if (closed) return;
      if (truncated) return;
      pending += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      if (Buffer.byteLength(pending, "utf8") > inputLimit) {
        pending = Buffer.from(pending, "utf8").subarray(0, inputLimit).toString("utf8");
        truncated = true;
        return;
      }
      let newline = pending.indexOf("\n");
      while (newline >= 0) {
        persistRedacted(pending.slice(0, newline + 1));
        pending = pending.slice(newline + 1);
        newline = pending.indexOf("\n");
      }
    },
    close() {
      if (closed) {
        return { bytesWritten, path: guardedPath, truncated };
      }
      if (pending) persistRedacted(pending);
      if (truncated) {
        assertRunnerLiveHome(plan, liveHomeProof);
        writeSync(descriptor, truncationMarker);
        bytesWritten += truncationMarker.length;
      }
      assertRunnerLiveHome(plan, liveHomeProof);
      closeSync(descriptor);
      closed = true;
      return { bytesWritten, path: guardedPath, truncated };
    }
  };
}

function assertIsoTimestampOrNull(label, value) {
  if (value === null) return;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`Terminal summary schema requires ${label} to be an ISO timestamp or null.`);
  }
}

export function validateTerminalSummary(summary) {
  if (!summary || typeof summary !== "object" || summary.schemaVersion !== 1) {
    throw new Error("Terminal summary schemaVersion is invalid.");
  }
  if (!["discovery", "required-matrix"].includes(summary.mode)) {
    throw new Error("Terminal summary mode is invalid.");
  }
  if (!["passed", "failed"].includes(summary.status)) {
    throw new Error("Terminal summary status is invalid.");
  }
  if (typeof summary.runId !== "string" || !/^[a-z0-9-]+$/i.test(summary.runId)) {
    throw new Error("Terminal summary runId is invalid.");
  }
  if (typeof summary.planFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(summary.planFingerprint)) {
    throw new Error("Terminal summary plan fingerprint is invalid.");
  }
  if (!/^[a-f0-9]{64}$/.test(summary.expectedEnvironmentInventorySha256 ?? "")) {
    throw new Error("Terminal summary environment inventory fingerprint is invalid.");
  }
  if (!summary.fingerprints || typeof summary.fingerprints !== "object") {
    throw new Error("Terminal summary fingerprints are missing.");
  }
  if (
    summary.terminalSummaryLocation !== undefined &&
    (
      typeof summary.terminalSummaryLocation !== "string" ||
      resolve(summary.terminalSummaryLocation) !== summary.terminalSummaryLocation ||
      basename(summary.terminalSummaryLocation) !== "bootstrap-terminal-summary.json"
    )
  ) {
    throw new Error("Terminal summary fallback location is invalid.");
  }
  const dependency = summary.dependencyAttestation;
  const validDependencyProof = (proof) => {
    try {
      validateActiveBrowserDependencyProof(proof, { repoRoot: proof?.repoRoot });
      return true;
    } catch {
      return false;
    }
  };
  if (
    !dependency || typeof dependency !== "object" ||
    !["drifted", "failed", "matched", "not-observed"].includes(dependency.status) ||
    !validDependencyProof(dependency.pre) ||
    (["failed", "not-observed"].includes(dependency.status) && dependency.post !== null) ||
    (!["failed", "not-observed"].includes(dependency.status) && !validDependencyProof(dependency.post)) ||
    (dependency.status === "matched" && !sameJson(dependency.pre, dependency.post)) ||
    (dependency.status === "drifted" && sameJson(dependency.pre, dependency.post)) ||
    (dependency.status === "failed" && !dependency.failure)
  ) {
    throw new Error("Terminal summary dependency attestation schema is invalid.");
  }
  const executionScope = summary.executionScope;
  const validExecutionScopeSnapshot = (scope, dependencyProof) => {
    try {
      const validated = validateRequiredBrowserExecutionScopeSnapshot(scope);
      return (
        validated.repoRoot === summary.repoRoot
        && validated.repoRoot === dependencyProof?.repoRoot
        && validated.dependencyAttestationFingerprint ===
          dependencyProof?.attestationFingerprint
        && validated.mode === summary.mode
      );
    } catch {
      return false;
    }
  };
  if (
    typeof summary.repoRoot !== "string"
    || !summary.repoRoot.startsWith("/Volumes/Starship/")
    || !/^[a-f0-9]{64}$/.test(summary.expectedExecutionScopeFingerprint ?? "")
    || !executionScope
    || typeof executionScope !== "object"
    || !["drifted", "failed", "matched", "not-observed"].includes(executionScope.status)
    || !validExecutionScopeSnapshot(executionScope.pre, dependency.pre)
    || executionScope.pre.scopeFingerprint !== summary.expectedExecutionScopeFingerprint
    || !sameJson(executionScope.pre.sourceFingerprints, summary.fingerprints)
    || (["failed", "not-observed"].includes(executionScope.status) && executionScope.post !== null)
    || (!["failed", "not-observed"].includes(executionScope.status)
      && !validExecutionScopeSnapshot(executionScope.post, dependency.post))
    || (executionScope.status === "matched" && !sameJson(executionScope.pre, executionScope.post))
    || (executionScope.status === "drifted" && sameJson(executionScope.pre, executionScope.post))
    || (executionScope.status === "failed" && !executionScope.failure)
  ) {
    throw new Error("Terminal summary execution-scope snapshot schema is invalid.");
  }
  const manifest = summary.manifest;
  if (
    !manifest
    || typeof manifest !== "object"
    || manifest.path !== summary.evidence?.paths?.preflightManifest
    || manifest.planFingerprint !== summary.planFingerprint
    || manifest.executionScopeFingerprint !== summary.expectedExecutionScopeFingerprint
    || !["invalid", "missing", "present"].includes(manifest.status)
    || (manifest.status === "present" && !/^[a-f0-9]{64}$/.test(manifest.sha256 ?? ""))
    || (manifest.status !== "present" && manifest.sha256 !== null)
  ) {
    throw new Error("Terminal summary plan-manifest binding is invalid.");
  }
  if (!Array.isArray(summary.expectedTests) || !Array.isArray(summary.processes)) {
    throw new Error("Terminal summary expectedTests/processes schema is invalid.");
  }
  for (const processInfo of summary.processes) {
    if (!processInfo || typeof processInfo.label !== "string" || typeof processInfo.logPath !== "string") {
      throw new Error("Terminal summary subprocess label/log schema is invalid.");
    }
    if (
      !runnerOwnedCommandIdSet.has(processInfo.commandId)
      || !executionScope.pre.commandCatalog.allowedCommandIds.includes(processInfo.commandId)
      || processInfo.scopeFingerprint !== summary.expectedExecutionScopeFingerprint
      || processInfo.environmentInventorySha256 !== summary.expectedEnvironmentInventorySha256
      || [
        processInfo.argvSha256,
        processInfo.environmentInventorySha256,
        processInfo.executableSha256,
        processInfo.scopeFingerprint
      ].some((value) => !/^[a-f0-9]{64}$/.test(value ?? ""))
      || ["args", "argv", "command", "environment", "HOME"].some((key) =>
        Object.prototype.hasOwnProperty.call(processInfo, key)
      )
    ) {
      throw new Error("Terminal summary subprocess command binding is invalid.");
    }
    assertIsoTimestampOrNull("subprocess startedAt", processInfo.startedAt);
    assertIsoTimestampOrNull("subprocess endedAt", processInfo.endedAt);
    const allowedCompletionReasons = new Set([
      "identity-unestablished",
      "exit-unobserved",
      "natural-exit",
      "shutdown-sigkill",
      "shutdown-sigterm",
      "spawn-error",
      "timed-out",
      "unproven-survivor"
    ]);
    if (
      !allowedCompletionReasons.has(processInfo.completionReason) ||
      typeof processInfo.endedAtObserved !== "boolean" ||
      processInfo.endedAtObserved !== (processInfo.endedAt !== null) ||
      !(processInfo.exitCode === null || Number.isInteger(processInfo.exitCode)) ||
      !(processInfo.signal === null || typeof processInfo.signal === "string") ||
      typeof processInfo.timedOut !== "boolean" ||
      !(processInfo.spawnError === null || typeof processInfo.spawnError === "object") ||
      typeof processInfo.termination?.termSent !== "boolean" ||
      typeof processInfo.termination?.killSent !== "boolean" ||
      !(processInfo.timeoutReason === null || typeof processInfo.timeoutReason === "string") ||
      processInfo.timedOut !== (processInfo.timeoutReason !== null)
    ) {
      throw new Error("Terminal summary subprocess outcome schema is invalid.");
    }
  }
  if (!summary.jsonReport || typeof summary.jsonReport.path !== "string") {
    throw new Error("Terminal summary JSON report schema is invalid.");
  }
  const allowedJsonStatuses = new Set(["malformed", "missing", "not-required", "validated"]);
  if (
    typeof summary.jsonReport.expected !== "boolean" ||
    !allowedJsonStatuses.has(summary.jsonReport.status)
  ) {
    throw new Error("Terminal summary JSON report status is invalid.");
  }
  if (summary.status === "passed") {
    if (dependency.status !== "matched") {
      throw new Error("Passed terminal summary requires matched pre/post dependency attestation.");
    }
    if (executionScope.status !== "matched") {
      throw new Error("Passed terminal summary requires matched pre/post execution scope.");
    }
    if (summary.manifest.status !== "present") {
      throw new Error("Passed terminal summary requires a retained plan manifest hash.");
    }
    const expectedJsonStatus = summary.mode === "discovery" ? "not-required" : "validated";
    if (summary.jsonReport.status !== expectedJsonStatus) {
      throw new Error("Passed terminal summary has an invalid JSON report status.");
    }
    if (summary.failedPhase !== null) {
      throw new Error("Passed terminal summary cannot declare a failed phase.");
    }
  } else if (typeof summary.failedPhase !== "string" || !summary.failure) {
    throw new Error("Failed terminal summary requires failedPhase and failure evidence.");
  }
  if (
    typeof summary.shutdownClean !== "boolean" ||
    !summary.cleanup ||
    typeof summary.cleanup !== "object" ||
    !summary.evidence ||
    typeof summary.evidence.hashes !== "object" ||
    typeof summary.evidence.paths !== "object" ||
    !Array.isArray(summary.evidence.missingRequired)
  ) {
    throw new Error("Terminal summary cleanup/evidence schema is invalid.");
  }
  for (const [label, hash] of Object.entries(summary.evidence.hashes)) {
    if (
      !hash ||
      typeof hash.path !== "string" ||
      typeof hash.required !== "boolean" ||
      !["invalid", "missing", "present"].includes(hash.status) ||
      (hash.status === "present" && !/^[a-f0-9]{64}$/.test(hash.sha256)) ||
      (hash.status !== "present" && "sha256" in hash)
    ) {
      throw new Error(`Terminal summary evidence hash schema is invalid for ${label}.`);
    }
  }
  const preflightManifestEvidence = summary.evidence.hashes.preflightManifest;
  if (
    !preflightManifestEvidence
    || !sameJson(summary.manifest, {
      executionScopeFingerprint: summary.expectedExecutionScopeFingerprint,
      path: preflightManifestEvidence.path,
      planFingerprint: summary.planFingerprint,
      sha256: preflightManifestEvidence.status === "present"
        ? preflightManifestEvidence.sha256
        : null,
      status: preflightManifestEvidence.status
    })
  ) {
    throw new Error("Terminal summary manifest binding differs from retained evidence.");
  }
  if (summary.status === "passed" && summary.evidence.missingRequired.length > 0) {
    throw new Error("Passed terminal summary cannot have missing required evidence.");
  }
  return summary;
}

function assertTerminalSummaryPlanAndLiveBinding(plan, liveHomeProof, summary) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const validated = validateTerminalSummary(
    assertEvidenceExcludesTransientHome(summary)
  );
  if (
    validated.planFingerprint !== plan.planFingerprint
    || validated.repoRoot !== plan.repoRoot
    || validated.expectedExecutionScopeFingerprint !== plan.executionScope.scopeFingerprint
    || validated.expectedEnvironmentInventorySha256 !== plan.environmentBinding.inventorySha256
    || !sameJson(validated.executionScope.pre, plan.executionScope)
    || !sameJson(validated.dependencyAttestation.pre, plan.dependencyAttestation)
    || !sameJson(validated.fingerprints, plan.sourceFingerprints)
  ) {
    throw new Error("Terminal summary preflight evidence differs from the immutable run plan.");
  }
  const manifestPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "preflight manifest evidence",
    plan.evidencePaths.preflightManifest
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  const manifestPresent = existsSync(manifestPath);
  const manifestHash = manifestPresent
    ? (
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "preflight manifest evidence",
          manifestPath
        ),
        sha256File(manifestPath)
      )
    : null;
  if (validated.manifest.sha256 !== manifestHash) {
    throw new Error("Terminal summary manifest hash differs from retained plan evidence.");
  }
  if (validated.status === "passed") {
    assertRunnerLiveHome(plan, liveHomeProof);
    const live = assertLiveRequiredBrowserExecutionScope(plan.executionScope, {
      dependencyAttestation: plan.dependencyAttestation,
      repoRoot: plan.repoRoot,
      sourceFingerprints: plan.sourceFingerprints
    });
    if (
      !sameJson(validated.executionScope.pre, live)
      || !sameJson(validated.executionScope.post, live)
    ) {
      throw new Error("Passed terminal summary execution scope differs from the plan/current live rebuild.");
    }
  }
  return validated;
}

export function finalizeProcessRecordObservations(processRecords) {
  for (const record of processRecords) {
    record.endedAtObserved = record.endedAt !== null;
    if (record.completionReason === null) {
      if (record.spawnError) record.completionReason = "spawn-error";
      else if (record.timedOut) record.completionReason = "timed-out";
      else if (record.endedAtObserved) record.completionReason = "natural-exit";
      else record.completionReason = "exit-unobserved";
    }
    if (record.timedOut && record.timeoutReason === null) {
      record.timeoutReason = `${record.label}-bounded-timeout`;
    }
  }
  return processRecords;
}

export function writeAndValidateTerminalSummary(plan, liveHomeProof, summary) {
  const validated = assertTerminalSummaryPlanAndLiveBinding(
    plan,
    liveHomeProof,
    summary
  );
  writeValidatedEvidenceJsonAtomic(
    plan,
    liveHomeProof,
    plan.evidencePaths.validatedSummary,
    validated
  );
  const summaryPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "validated terminal summary",
    plan.evidencePaths.validatedSummary
  );
  const readBack = assertEvidenceExcludesTransientHome(
    JSON.parse(readFileSync(summaryPath, "utf8"))
  );
  assertTerminalSummaryPlanAndLiveBinding(plan, liveHomeProof, readBack);
  if (!sameJson(readBack, validated)) {
    throw new Error("Terminal summary atomic readback does not match the validated payload.");
  }
  return readBack;
}

function validateBootstrapTerminalSummaryTarget(plan, liveHomeProof) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const expectedTarget = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "bootstrap terminal summary",
    resolve(plan.ownerRoot, "bootstrap-terminal-summary.json")
  );
  if (plan.terminalFallbackPath !== expectedTarget) {
    throw new Error("Bootstrap terminal summary path is not bound to the validated owner root.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot);
  const ownerEntry = lstatSync(plan.ownerRoot, { throwIfNoEntry: false });
  if (!ownerEntry?.isDirectory() || ownerEntry.isSymbolicLink()) {
    throw new Error("Bootstrap terminal summary owner root is missing or unsafe.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot);
  if (realpathSync(plan.ownerRoot) !== plan.ownerRoot) {
    throw new Error("Bootstrap terminal summary owner root is not canonical.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner marker", plan.markerPath);
  const markerEntry = lstatSync(plan.markerPath, { throwIfNoEntry: false });
  if (!markerEntry?.isFile() || markerEntry.isSymbolicLink()) {
    throw new Error("Bootstrap terminal summary owner marker is missing or unsafe.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner marker", plan.markerPath);
  const marker = JSON.parse(readFileSync(plan.markerPath, "utf8"));
  if (
    marker.kind !== "mais-bug3-owner-root" ||
    marker.nonce !== plan.nonce ||
    marker.ownerRoot !== plan.ownerRoot ||
    marker.planFingerprint !== plan.planFingerprint ||
    marker.runId !== plan.runId ||
    marker.schemaVersion !== plan.schemaVersion
  ) {
    throw new Error("Bootstrap terminal summary owner marker does not match the validated plan.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", expectedTarget);
  if (existsSync(expectedTarget)) {
    throw new Error("Bootstrap terminal summary target already exists and cannot be replaced.");
  }
  return {
    dev: String(ownerEntry.dev),
    ino: String(ownerEntry.ino),
    target: expectedTarget
  };
}

export function writeBootstrapTerminalSummaryAtomic(plan, liveHomeProof, summary) {
  const target = validateBootstrapTerminalSummaryTarget(plan, liveHomeProof);
  const payload = assertEvidenceExcludesTransientHome({
    ...summary,
    terminalSummaryLocation: target.target
  });
  validateTerminalSummary(payload);
  const temporary = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "bootstrap terminal summary temporary",
    `${target.target}.tmp-${randomBytes(12).toString("hex")}`
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  let temporaryIdentity = null;
  try {
    assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "bootstrap terminal summary temporary",
      temporary
    );
    writeFileSync(temporary, serialized, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600
    });
    assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "bootstrap terminal summary temporary",
      temporary
    );
    const temporaryEntry = lstatSync(temporary, { throwIfNoEntry: false });
    if (
      !temporaryEntry?.isFile()
      || temporaryEntry.isSymbolicLink()
      || (temporaryEntry.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && temporaryEntry.uid !== process.getuid())
      || (
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "bootstrap terminal summary temporary",
          temporary
        ),
        readFileSync(temporary, "utf8")
      ) !== serialized
    ) {
      throw new Error("Bootstrap terminal summary temp identity, mode, ownership, or content changed after creation.");
    }
    temporaryIdentity = Object.freeze({
      dev: String(temporaryEntry.dev),
      ino: String(temporaryEntry.ino)
    });
    assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot);
    const refreshed = lstatSync(plan.ownerRoot, { throwIfNoEntry: false });
    if (
      !refreshed?.isDirectory() || refreshed.isSymbolicLink() ||
      String(refreshed.dev) !== target.dev || String(refreshed.ino) !== target.ino ||
      (
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot),
        realpathSync(plan.ownerRoot)
      ) !== plan.ownerRoot ||
      (
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", target.target),
        existsSync(target.target)
      )
    ) {
      throw new Error("Bootstrap terminal summary owner identity changed before atomic persistence.");
    }
    assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "bootstrap terminal summary temporary",
      temporary
    );
    const immediatelyBeforeRename = lstatSync(temporary, { throwIfNoEntry: false });
    if (
      !immediatelyBeforeRename?.isFile()
      || immediatelyBeforeRename.isSymbolicLink()
      || String(immediatelyBeforeRename.dev) !== temporaryIdentity.dev
      || String(immediatelyBeforeRename.ino) !== temporaryIdentity.ino
      || (immediatelyBeforeRename.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && immediatelyBeforeRename.uid !== process.getuid())
      || (
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "bootstrap terminal summary temporary",
          temporary
        ),
        readFileSync(temporary, "utf8")
      ) !== serialized
    ) {
      throw new Error("Bootstrap terminal summary temp changed immediately before rename.");
    }
    assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "bootstrap terminal summary temporary",
      temporary
    );
    assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", target.target);
    assertRunnerLiveHome(plan, liveHomeProof);
    renameSync(temporary, target.target);
    assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", target.target);
    const targetEntry = lstatSync(target.target, { throwIfNoEntry: false });
    if (
      !targetEntry?.isFile()
      || targetEntry.isSymbolicLink()
      || String(targetEntry.dev) !== temporaryIdentity.dev
      || String(targetEntry.ino) !== temporaryIdentity.ino
      || (targetEntry.mode & 0o777) !== 0o600
      || (typeof process.getuid === "function" && targetEntry.uid !== process.getuid())
      || (
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", target.target),
        readFileSync(target.target, "utf8")
      ) !== serialized
    ) {
      throw new Error("Bootstrap terminal summary target identity or content changed after rename.");
    }
    if (!targetEntry?.isFile() || targetEntry.isSymbolicLink()) {
      throw new Error("Bootstrap terminal summary target is not a regular retained file.");
    }
    assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap terminal summary", target.target);
    const readBack = assertEvidenceExcludesTransientHome(
      JSON.parse(readFileSync(target.target, "utf8"))
    );
    validateTerminalSummary(readBack);
    if (!sameJson(readBack, payload)) {
      throw new Error("Bootstrap terminal summary atomic readback does not match the payload.");
    }
    return readBack;
  } catch (error) {
    try {
      assertRunnerOwnerPath(
        plan,
        liveHomeProof,
        "bootstrap terminal summary temporary",
        temporary
      );
      const current = lstatSync(temporary, { throwIfNoEntry: false });
      if (temporaryIdentity && current) {
        if (
          current.isSymbolicLink()
          || !current.isFile()
          || String(current.dev) !== temporaryIdentity.dev
          || String(current.ino) !== temporaryIdentity.ino
          || (current.mode & 0o777) !== 0o600
          || (typeof process.getuid === "function" && current.uid !== process.getuid())
          || (
            assertRunnerOwnerPath(
              plan,
              liveHomeProof,
              "bootstrap terminal summary temporary",
              temporary
            ),
            readFileSync(temporary, "utf8")
          ) !== serialized
        ) {
          throw new Error("Bootstrap terminal summary temp changed and was retained in place.");
        }
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot);
        const refreshed = lstatSync(plan.ownerRoot, { throwIfNoEntry: false });
        if (
          !refreshed?.isDirectory()
          || refreshed.isSymbolicLink()
          || String(refreshed.dev) !== target.dev
          || String(refreshed.ino) !== target.ino
          || (
            assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot),
            realpathSync(plan.ownerRoot)
          ) !== plan.ownerRoot
        ) {
          throw new Error("Bootstrap owner identity changed before temporary retention.");
        }
        const retained = join(
          plan.ownerRoot,
          `.${basename(temporary)}.retained-summary-failure-${randomBytes(24).toString("hex")}`
        );
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "bootstrap retained summary",
          retained
        );
        if (existsSync(retained)) throw new Error("Bootstrap retained summary target unexpectedly exists.");
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "bootstrap terminal summary temporary",
          temporary
        );
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap retained summary", retained);
        assertRunnerLiveHome(plan, liveHomeProof);
        renameSync(temporary, retained);
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap retained summary", retained);
        const retainedEntry = lstatSync(retained, { throwIfNoEntry: false });
        assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap owner root", plan.ownerRoot);
        const retainedParent = lstatSync(plan.ownerRoot, { throwIfNoEntry: false });
        if (
          !retainedEntry?.isFile()
          || retainedEntry.isSymbolicLink()
          || String(retainedEntry.dev) !== temporaryIdentity.dev
          || String(retainedEntry.ino) !== temporaryIdentity.ino
          || (retainedEntry.mode & 0o777) !== 0o600
          || (typeof process.getuid === "function" && retainedEntry.uid !== process.getuid())
          || (
            assertRunnerOwnerPath(plan, liveHomeProof, "bootstrap retained summary", retained),
            readFileSync(retained, "utf8")
          ) !== serialized
          || !retainedParent?.isDirectory()
          || retainedParent.isSymbolicLink()
          || String(retainedParent.dev) !== target.dev
          || String(retainedParent.ino) !== target.ino
          || (
            assertRunnerOwnerPath(
              plan,
              liveHomeProof,
              "bootstrap terminal summary temporary",
              temporary
            ),
            existsSync(temporary)
          )
        ) {
          throw new Error("Bootstrap retained summary identity or content changed after rename.");
        }
      }
    } catch (retentionError) {
      throw new AggregateError(
        [error, retentionError],
        "Bootstrap terminal summary failed and exact temporary retention could not be proven."
      );
    }
    throw error;
  }
}

export function writeTerminalSummaryWithFailureFallback(
  plan,
  liveHomeProof,
  summary,
  writer = writeAndValidateTerminalSummary,
  fallbackWriter = writeBootstrapTerminalSummaryAtomic
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  assertEvidenceExcludesTransientHome(summary);
  try {
    return { summary: writer(plan, liveHomeProof, summary), writeFailure: null };
  } catch (error) {
    const fallback = assertEvidenceExcludesTransientHome({
      ...summary,
      failedPhase: "summary-write-readback",
      failure: failureForEvidence(error),
      priorFailure: summary.failure ?? null,
      status: "failed",
      terminalSummaryLocation: plan.terminalFallbackPath
    });
    validateTerminalSummary(fallback);
    try {
      return {
        summary: fallbackWriter(plan, liveHomeProof, fallback),
        writeFailure: error
      };
    } catch (fallbackError) {
      throw new AggregateError(
        [error, fallbackError],
        "Terminal summary write/readback and schema-accurate failure fallback both failed."
      );
    }
  }
}

function systemProcessSnapshot(plan, liveHomeProof, commands) {
  const descriptor = resolveRunnerCommandDescriptor(
    plan,
    liveHomeProof,
    commands,
    "owner.audit.process-table"
  );
  const childEnvironment = exactAuditChildEnvironment(plan, liveHomeProof);
  assertRunnerLiveHome(plan, liveHomeProof);
  const ps = spawnSync(
    descriptor.command,
    descriptor.args,
    {
      cwd: descriptor.cwd,
      encoding: "utf8",
      env: childEnvironment,
      maxBuffer: 16 * 1024 * 1024
    }
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  if (ps.error) throw new Error("Bounded process-table audit could not start.");
  if (ps.status !== 0) {
    throw new Error("Bounded process-table audit failed.");
  }
  return {
    capturedAt: new Date().toISOString(),
    commandEvidence: runnerCommandEvidence(descriptor),
    output: ps.stdout,
    rows: parseOwnedProcessSnapshot(ps.stdout)
  };
}

function processHasOwnerToken(
  plan,
  liveHomeProof,
  commands,
  provenOwnedIdentity,
  ownerToken
) {
  if (
    !Number.isSafeInteger(provenOwnedIdentity?.pid)
    || provenOwnedIdentity.pid <= 1
    || typeof ownerToken !== "string"
    || ownerToken.length < 32
  ) {
    throw new Error("Owner-token audit requires a revalidated process identity.");
  }
  const descriptor = resolveRunnerCommandDescriptor(
    plan,
    liveHomeProof,
    commands,
    "owner.audit.pid-environment",
    { provenOwnedIdentity }
  );
  const childEnvironment = exactAuditChildEnvironment(plan, liveHomeProof);
  assertRunnerLiveHome(plan, liveHomeProof);
  const ps = spawnSync(
    descriptor.command,
    descriptor.args,
    {
      cwd: descriptor.cwd,
      encoding: "utf8",
      env: childEnvironment,
      maxBuffer: 4 * 1024 * 1024
    }
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  return {
    commandEvidence: runnerCommandEvidence(descriptor),
    matched:
      !ps.error
      && ps.status === 0
      && ps.stdout.includes(`MAIS_BROWSER_OWNER_TOKEN=${ownerToken}`)
  };
}

const stickyProcessSafetyCodes = new Set([
  "FOREIGN_PLAYWRIGHT_PROFILE",
  "OWNER_TOKEN_MISMATCH",
  "PROCESS_IDENTITY_MISMATCH",
  "SERVICE_PID_EVIDENCE_MISMATCH",
  "SIGNAL_FAILURE",
  "SPAWN_IDENTITY_REJECTED",
  "SPAWN_IDENTITY_UNESTABLISHED",
  "UNPROVEN_OWNER_PROCESS",
  "UNPROVEN_PROCESS_SURVIVOR"
]);

export function recordStickyProcessSafetyViolations(
  processState,
  {
    foreignProfileCount = 0,
    identityMismatchCount = 0,
    unprovenOwnerCount = 0,
    violationCode = null
  }
) {
  if (!(processState.safetyViolations instanceof Set)) {
    processState.safetyViolations = new Set();
  }
  if (foreignProfileCount > 0) {
    processState.safetyViolations.add("FOREIGN_PLAYWRIGHT_PROFILE");
  }
  if (identityMismatchCount > 0) {
    processState.safetyViolations.add("PROCESS_IDENTITY_MISMATCH");
  }
  if (unprovenOwnerCount > 0) {
    processState.safetyViolations.add("UNPROVEN_OWNER_PROCESS");
  }
  if (violationCode !== null) {
    if (!stickyProcessSafetyCodes.has(violationCode)) {
      throw new Error("Unknown process-safety violation code.");
    }
    processState.safetyViolations.add(violationCode);
  }
  return [...processState.safetyViolations].sort();
}

function persistProcessSafetyEvent(
  plan,
  liveHomeProof,
  processAudits,
  processState,
  phase,
  violationCode,
  processes = [],
  commandEvidence = []
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  recordStickyProcessSafetyViolations(processState, { violationCode });
  appendBoundedProcessAuditEvidence(processAudits, {
    activeProfileCount: 0,
    capturedAt: new Date().toISOString(),
    commands: combineRunnerCommandEvidence(commandEvidence),
    eventType: "safety-event",
    foreignProfileCount: 0,
    identityMismatchCount: /IDENTITY/.test(violationCode) ? 1 : 0,
    ownedProfileCount: 0,
    phase,
    processes: processes.slice(0, 100).map(({ classification, pid, ppid }) => ({
      classification,
      pid,
      ppid
    })),
    profiles: [],
    violationCode
  });
  writeValidatedEvidenceJsonAtomic(
    plan,
    liveHomeProof,
    plan.evidencePaths.processAudit,
    processAudits
  );
  assertRunnerLiveHome(plan, liveHomeProof);
}

function systemOwnerTokenPids(plan, liveHomeProof, commands, ownerToken) {
  if (typeof ownerToken !== "string" || !/^[a-f0-9]{64}$/.test(ownerToken)) {
    throw new Error("Owner-token process audit requires the validated run nonce.");
  }
  const descriptor = resolveRunnerCommandDescriptor(
    plan,
    liveHomeProof,
    commands,
    "owner.audit.owner-token-table"
  );
  const childEnvironment = exactAuditChildEnvironment(plan, liveHomeProof);
  assertRunnerLiveHome(plan, liveHomeProof);
  const ps = spawnSync(
    descriptor.command,
    descriptor.args,
    {
      cwd: descriptor.cwd,
      encoding: "utf8",
      env: childEnvironment,
      maxBuffer: 16 * 1024 * 1024
    }
  );
  assertRunnerLiveHome(plan, liveHomeProof);
  if (ps.error) throw new Error("Bounded owner-token process audit could not start.");
  if (ps.status !== 0) {
    throw new Error("Bounded owner-token process audit failed.");
  }
  const assignment = `MAIS_BROWSER_OWNER_TOKEN=${ownerToken}`;
  const pids = new Set();
  for (const line of ps.stdout.split(/\r?\n/)) {
    if (!line.includes(assignment)) continue;
    const match = line.match(/^\s*(\d+)\s+/);
    if (match) pids.add(Number(match[1]));
  }
  return {
    commandEvidence: runnerCommandEvidence(descriptor),
    pids
  };
}

function auditFromSnapshot(plan, snapshot, ownedPids) {
  return {
    ...analyzeProcessSnapshot(plan, snapshot.output, ownedPids),
    capturedAt: snapshot.capturedAt
  };
}

function persistProcessState(
  plan,
  liveHomeProof,
  commands,
  processState,
  processAudits,
  phase,
  {
    assertSafe = true,
    additionalCommandEvidence = [],
    snapshot = null,
    tokenSnapshot = null
  } = {}
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const observedSnapshot = snapshot ?? systemProcessSnapshot(plan, liveHomeProof, commands);
  const observedTokenSnapshot = tokenSnapshot
    ?? systemOwnerTokenPids(plan, liveHomeProof, commands, plan.nonce);
  const refreshed = refreshSpawnOwnedRegistry(processState.registry, observedSnapshot.rows);
  processState.registry = refreshed.registry;
  const audit = auditFromSnapshot(
    plan,
    observedSnapshot,
    refreshed.liveVerified.map(({ pid }) => pid)
  );
  audit.commandEvidence = combineRunnerCommandEvidence(
    observedSnapshot.commandEvidence,
    observedTokenSnapshot.commandEvidence,
    additionalCommandEvidence
  );
  audit.identityMismatches = refreshed.identityMismatches;
  audit.unprovenOwnerProcesses = classifyUnprovenOwnerProcesses(
    plan,
    observedSnapshot.rows,
    {
      tokenBearingPids: observedTokenSnapshot.pids,
      verifiedPids: new Set(refreshed.liveVerified.map(({ pid }) => pid))
    }
  );
  recordStickyProcessSafetyViolations(processState, {
    foreignProfileCount: audit.foreignProfiles.length,
    identityMismatchCount: refreshed.identityMismatches.length,
    unprovenOwnerCount: audit.unprovenOwnerProcesses.length
  });
  persistSanitizedProcessAuditSample(
    plan,
    processAudits,
    phase,
    audit,
    (_evidence, collection) => {
      assertRunnerLiveHome(plan, liveHomeProof);
      writeValidatedEvidenceJsonAtomic(
        plan,
        liveHomeProof,
        plan.evidencePaths.processAudit,
        collection
      );
    },
    { assertSafe, commandEvidence: audit.commandEvidence }
  );
  if (assertSafe && refreshed.identityMismatches.length > 0) {
    throw new Error(`${phase} found a spawn-owned process identity mismatch.`);
  }
  if (assertSafe && audit.unprovenOwnerProcesses.length > 0) {
    throw new Error(`${phase} found an unproven owner-associated process.`);
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return {
    audit,
    refreshed,
    snapshot: observedSnapshot,
    tokenSnapshot: observedTokenSnapshot
  };
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function closeLogOnce(log) {
  try {
    return log?.close();
  } catch (error) {
    return { error: failureForEvidence(error), path: log?.path, truncated: false };
  }
}

async function spawnOwnedProcess({
  bindings = {},
  commandId,
  commands,
  environment,
  handles,
  label,
  liveHomeProof,
  log,
  ownLog = true,
  plan,
  processAudits,
  processRecords,
  processState
}) {
  const descriptor = resolveRunnerCommandDescriptor(
    plan,
    liveHomeProof,
    commands,
    commandId,
    bindings
  );
  const commandEvidence = runnerCommandEvidence(descriptor);
  const childEnvironment = exactOwnedChildEnvironment(
    plan,
    liveHomeProof,
    environment,
    descriptor
  );
  const record = {
    ...commandEvidence,
    completionReason: null,
    endedAt: null,
    endedAtObserved: false,
    exitCode: null,
    label,
    logPath: log.path,
    signal: null,
    spawnError: null,
    startedAt: new Date().toISOString(),
    termination: { killSent: false, termSent: false },
    timeoutReason: null,
    timedOut: false
  };
  processRecords.push(record);
  let child;
  try {
    assertRunnerLiveHome(plan, liveHomeProof);
    child = spawn(descriptor.command, descriptor.args, {
      cwd: descriptor.cwd,
      detached: true,
      env: childEnvironment,
      stdio: ["ignore", "pipe", "pipe"]
    });
    assertRunnerLiveHome(plan, liveHomeProof);
  } catch (error) {
    record.completionReason = "spawn-error";
    record.endedAt = new Date().toISOString();
    record.endedAtObserved = true;
    record.spawnError = failureForEvidence(error);
    if (ownLog) record.log = closeLogOnce(log);
    throw new Error(`Owned ${label} subprocess failed to start.`);
  }
  child.stdout?.on("data", (chunk) => log.append(chunk));
  child.stderr?.on("data", (chunk) => log.append(chunk));

  let settled = false;
  let settleExit;
  const exitPromise = new Promise((resolvePromise) => {
    settleExit = (code, signal, spawnError) => {
      if (settled) return;
      settled = true;
      if (record.completionReason === null) {
        record.completionReason = spawnError ? "spawn-error" : "natural-exit";
      }
      record.endedAt = new Date().toISOString();
      record.endedAtObserved = true;
      record.exitCode = code;
      record.signal = signal;
      if (spawnError) record.spawnError = failureForEvidence(spawnError);
      if (ownLog) record.log = closeLogOnce(log);
      resolvePromise(record);
    };
  });
  child.once("error", (error) => settleExit(null, null, error));
  child.once("close", (code, signal) => settleExit(code, signal, null));

  if (!Number.isSafeInteger(child.pid) || child.pid <= 1) {
    persistProcessSafetyEvent(
      plan,
      liveHomeProof,
      processAudits,
      processState,
      `spawn:${label}`,
      "SPAWN_IDENTITY_UNESTABLISHED",
      [],
      [commandEvidence]
    );
    throw new Error(`Spawned ${label} process did not expose a valid PID.`);
  }
  const handle = { child, descriptor, exitPromise, identity: null, log, record };
  handles.push(handle);
  let identity;
  let lastObservedRow;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snapshot = systemProcessSnapshot(plan, liveHomeProof, commands);
    const row = snapshot.rows.find(({ pid }) => pid === child.pid);
    if (row) lastObservedRow = row;
    let identityError;
    let identityViolationCode = "SPAWN_IDENTITY_REJECTED";
    let tokenCommandEvidence = [];
    if (row) {
      try {
        identity = createSpawnOwnedIdentity({
          expectedParentPid: process.pid,
          label,
          ownerToken: childEnvironment.MAIS_BROWSER_OWNER_TOKEN,
          requireOwnProcessGroup: true,
          row,
          signatureFragments: runnerIdentitySignatureFragments(descriptor)
        });
        const tokenCheck = processHasOwnerToken(
          plan,
          liveHomeProof,
          commands,
          identity,
          identity.ownerToken
        );
        tokenCommandEvidence = [tokenCheck.commandEvidence];
        if (!tokenCheck.matched) {
          identityViolationCode = "OWNER_TOKEN_MISMATCH";
          throw new Error(`Spawned ${label} process is missing its immutable owner token.`);
        }
        processState.registry.set(identity.pid, identity);
        handle.identity = identity;
      } catch (error) {
        identity = undefined;
        identityError = error;
      }
    }
    persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      `spawn:${label}`,
      { additionalCommandEvidence: tokenCommandEvidence, snapshot }
    );
    if (identityError) {
      persistProcessSafetyEvent(
        plan,
        liveHomeProof,
        processAudits,
        processState,
        `spawn:${label}`,
        identityViolationCode,
        row ? [{ classification: "spawn-identity-rejected", pid: row.pid, ppid: row.ppid }] : [],
        combineRunnerCommandEvidence(commandEvidence, tokenCommandEvidence)
      );
      throw identityError;
    }
    if (identity) break;
    if (record.endedAt) break;
    assertRunnerLiveHome(plan, liveHomeProof);
    await delay(25);
  }
  if (!identity) {
    if (record.completionReason === null || record.completionReason === "natural-exit") {
      record.completionReason = "identity-unestablished";
    }
    persistProcessSafetyEvent(
      plan,
      liveHomeProof,
      processAudits,
      processState,
      `spawn:${label}`,
      "SPAWN_IDENTITY_UNESTABLISHED",
      lastObservedRow
        ? [{
            classification: "spawn-identity-unestablished",
            pid: lastObservedRow.pid,
            ppid: lastObservedRow.ppid
          }]
        : [{
            classification: "spawn-identity-unestablished",
            pid: child.pid,
            ppid: process.pid
          }],
      [commandEvidence]
    );
    assertSpawnOwnedIdentityEstablished(identity, record);
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return handle;
}

async function waitForOwnedProcessExit(
  handle,
  { commands, liveHomeProof, phase, plan, processAudits, processState, timeoutMs }
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const deadline = Date.now() + timeoutMs;
  while (!handle.record.endedAt) {
    assertRunnerLiveHome(plan, liveHomeProof);
    if (Date.now() >= deadline) {
      handle.record.timedOut = true;
      handle.record.timeoutReason = `${handle.record.label}-bounded-timeout`;
      handle.record.completionReason = "timed-out";
      throw new Error(`${handle.record.label} exceeded its bounded timeout.`);
    }
    await Promise.race([handle.exitPromise, delay(250)]);
    persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      phase
    );
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return handle.exitPromise;
}

async function waitForServiceReady(
  handle,
  { commands, liveHomeProof, plan, processAudits, processState, timeoutMs = 90_000 }
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    assertRunnerLiveHome(plan, liveHomeProof);
    if (handle.record.endedAt) {
      throw new Error("Owned Next service exited before becoming ready.");
    }
    persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      "service-readiness"
    );
    try {
      assertRunnerLiveHome(plan, liveHomeProof);
      const response = await fetch(plan.serviceBaseUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(1_500)
      });
      assertRunnerLiveHome(plan, liveHomeProof);
      if (response.status < 500) return;
    } catch {
      // The next bounded poll records another process audit before retrying.
    }
    assertRunnerLiveHome(plan, liveHomeProof);
    await delay(250);
  }
  handle.record.timedOut = true;
  handle.record.timeoutReason = "service-readiness-bounded-timeout";
  handle.record.completionReason = "timed-out";
  throw new Error("Owned Next service did not become ready before its bounded timeout.");
}

function writeOwnedNextTsconfig(plan, liveHomeProof) {
  const nextTsconfigPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "Next TypeScript config",
    plan.paths.nextTsconfig
  );
  if (existsSync(nextTsconfigPath)) {
    throw new Error("Owned Next TypeScript config already exists.");
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  const requireFromRepo = createRequire(resolve(plan.repoRoot, "package.json"));
  const ts = requireFromRepo("typescript");
  const baseTsconfig = resolve(plan.repoRoot, "tsconfig.json");
  const { config, error } = ts.readConfigFile(baseTsconfig, (file) => ts.sys.readFile(file));
  if (error || !Array.isArray(config?.exclude)) {
    throw new Error("Could not read the canonical TypeScript excludes for the owned Next build.");
  }
  const configDirectory = dirname(plan.paths.nextTsconfig);
  const fromConfig = (target) => {
    const value = relative(configDirectory, resolve(plan.repoRoot, target)).replaceAll("\\", "/");
    return value.startsWith(".") ? value : `./${value}`;
  };
  const hardeningExcludes = [
    ".next-*",
    ".s??-*",
    "coverage",
    "output",
    "outputs",
    "playwright-report",
    "temp",
    "test-results",
    "tmp",
    "var",
    "var/**/*"
  ];
  const content = {
    extends: fromConfig("tsconfig.json"),
    compilerOptions: {
      baseUrl: plan.repoRoot,
      paths: { "@/*": ["./*"] },
      plugins: [{ name: "next" }]
    },
    include: [
      fromConfig("next-env.d.ts"),
      fromConfig("**/*.ts"),
      fromConfig("**/*.tsx"),
      fromConfig(".next/types/**/*.ts"),
      fromConfig(`${relative(plan.repoRoot, plan.paths.nextDist).replaceAll("\\", "/")}/types/**/*.ts`)
    ],
    exclude: [...new Set([...config.exclude, ...hardeningExcludes])].map(fromConfig)
  };
  assertRunnerOwnerPath(plan, liveHomeProof, "Next TypeScript config", nextTsconfigPath);
  writeFileSync(nextTsconfigPath, `${JSON.stringify(content, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return nextTsconfigPath;
}

export function selectEvidenceEnvironment(environment) {
  return Object.fromEntries(
    evidenceEnvironmentKeys
      .filter((key) => typeof environment[key] === "string")
      .sort()
      .map((key) => [key, environment[key]])
  );
}

function buildPathAudit(plan, liveHomeProof, environment) {
  assertRunnerLiveHome(plan, liveHomeProof);
  return assertEvidenceExcludesTransientHome({
    cleanupLeaves: plan.cleanupLeaves,
    ephemeralRoot: plan.ephemeralRoot,
    evidencePaths: plan.evidencePaths,
    evidenceRoot: plan.evidenceRoot,
    interfaces: {
      nextDist: relative(plan.repoRoot, plan.paths.nextDist).replaceAll("\\", "/"),
      nextTsconfig: relative(plan.repoRoot, plan.paths.nextTsconfig).replaceAll("\\", "/")
    },
    ownerRoot: plan.ownerRoot,
    paths: plan.paths,
    planFingerprint: plan.planFingerprint,
    runId: plan.runId,
    writableEnvironment: selectEvidenceEnvironment(environment)
  });
}

function sha256Directory(plan, liveHomeProof, directory) {
  const hash = createHash("sha256");
  const visit = (current, prefix = "") => {
    const guardedCurrent = assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "retained evidence directory",
      current
    );
    for (const name of readdirSync(guardedCurrent).sort()) {
      const absolute = assertRunnerOwnerPath(
        plan,
        liveHomeProof,
        "retained evidence entry",
        resolve(guardedCurrent, name)
      );
      const relativePath = prefix ? `${prefix}/${name}` : name;
      const entry = lstatSync(absolute);
      if (entry.isSymbolicLink()) {
        throw new Error(`Retained evidence must not contain symlinks: ${absolute}`);
      }
      if (entry.isDirectory()) visit(absolute, relativePath);
      else if (entry.isFile()) {
        hash.update(relativePath);
        hash.update("\0");
        hash.update(readFileSync(absolute));
        hash.update("\0");
      }
    }
  };
  visit(directory);
  return hash.digest("hex");
}

export function collectEvidenceHashes(
  plan,
  liveHomeProof,
  { requireFinal = false } = {}
) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const files = {
    buildLog: plan.evidencePaths.buildLog,
    finalResults: plan.evidencePaths.finalResults,
    pathAudit: plan.evidencePaths.pathAudit,
    playwrightLog: plan.evidencePaths.playwrightLog,
    preflightManifest: plan.evidencePaths.preflightManifest,
    processAudit: plan.evidencePaths.processAudit,
    serviceLog: plan.evidencePaths.serviceLog
  };
  const required = new Set(["pathAudit", "preflightManifest", "processAudit"]);
  if (requireFinal) {
    required.add("buildLog");
    required.add("finalResults");
    required.add("playwrightLog");
    required.add("serviceLog");
  }
  const entries = {};
  const missingRequired = [];
  for (const [label, filePath] of Object.entries(files)) {
    const isRequired = required.has(label);
    const guardedPath = assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      `retained ${label} evidence`,
      filePath
    );
    if (!existsSync(guardedPath)) {
      entries[label] = { path: guardedPath, required: isRequired, status: "missing" };
      if (isRequired) missingRequired.push(label);
      continue;
    }
    assertRunnerOwnerPath(plan, liveHomeProof, `retained ${label} evidence`, guardedPath);
    const entry = lstatSync(guardedPath);
    if (!entry.isFile() || entry.isSymbolicLink()) {
      entries[label] = { path: guardedPath, required: isRequired, status: "invalid" };
      if (isRequired) missingRequired.push(label);
      continue;
    }
    assertRunnerOwnerPath(plan, liveHomeProof, `retained ${label} evidence`, guardedPath);
    entries[label] = {
      path: guardedPath,
      required: isRequired,
      sha256: sha256File(guardedPath),
      status: "present"
    };
  }
  const finalReportPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "retained final report evidence",
    plan.evidencePaths.finalReport
  );
  if (existsSync(finalReportPath)) {
    assertRunnerOwnerPath(
      plan,
      liveHomeProof,
      "retained final report evidence",
      finalReportPath
    );
    const finalReportEntry = lstatSync(finalReportPath);
    if (!finalReportEntry.isDirectory() || finalReportEntry.isSymbolicLink()) {
      entries.finalReport = {
        path: finalReportPath,
        required: requireFinal,
        status: "invalid"
      };
      if (requireFinal) missingRequired.push("finalReport");
    } else {
      entries.finalReport = {
        path: finalReportPath,
        required: requireFinal,
        sha256: sha256Directory(plan, liveHomeProof, finalReportPath),
        status: "present"
      };
    }
  } else {
    entries.finalReport = {
      path: finalReportPath,
      required: requireFinal,
      status: "missing"
    };
    if (requireFinal) missingRequired.push("finalReport");
  }
  return assertEvidenceExcludesTransientHome({
    entries,
    missingRequired: [...new Set(missingRequired)].sort()
  });
}

function writeOwnedServicePid(plan, liveHomeProof, pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error("Owned service PID must be a positive safe integer.");
  }
  const pidPath = assertRunnerOwnerPath(
    plan,
    liveHomeProof,
    "service PID evidence",
    plan.paths.servicePid
  );
  if (existsSync(pidPath)) {
    throw new Error("Service PID evidence already exists.");
  }
  assertRunnerOwnerPath(plan, liveHomeProof, "service PID evidence", pidPath);
  writeFileSync(pidPath, `${pid}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
  return pidPath;
}

function markTermination(processRecords, label, signal) {
  for (const record of processRecords) {
    if (record.label !== label) continue;
    if (signal === "SIGTERM") {
      record.termination.termSent = true;
      record.completionReason = "shutdown-sigterm";
    }
    if (signal === "SIGKILL") {
      record.termination.killSent = true;
      record.completionReason = "shutdown-sigkill";
    }
  }
}

function signalRevalidatedIdentities({
  commands,
  liveHomeProof,
  plan,
  processAudits,
  processRecords,
  processState,
  signal
}) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const initial = persistProcessState(
    plan,
    liveHomeProof,
    commands,
    processState,
    processAudits,
    `shutdown:${signal}:plan`,
    { assertSafe: false }
  );
  const ordered = [...initial.refreshed.liveVerified].sort(
    (left, right) => right.depth - left.depth || right.pid - left.pid
  );
  const signalFailures = [];
  for (const identity of ordered) {
    const snapshot = systemProcessSnapshot(plan, liveHomeProof, commands);
    const refreshed = refreshSpawnOwnedRegistry(processState.registry, snapshot.rows);
    processState.registry = refreshed.registry;
    const current = refreshed.liveVerified.find(({ pid }) => pid === identity.pid);
    const currentRow = current
      ? snapshot.rows.find(({ pid }) => pid === current.pid)
      : null;
    const identityStillMatches = Boolean(
      current && identityMatchesRow(current, currentRow)
    );
    const tokenCheck = identityStillMatches
      ? processHasOwnerToken(
          plan,
          liveHomeProof,
          commands,
          current,
          current.ownerToken
        )
      : null;
    persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      `shutdown:${signal}:revalidate`,
      {
        additionalCommandEvidence: tokenCheck ? [tokenCheck.commandEvidence] : [],
        assertSafe: false,
        snapshot
      }
    );
    if (!identityStillMatches) {
      continue;
    }
    if (!tokenCheck.matched) {
      persistProcessSafetyEvent(
        plan,
        liveHomeProof,
        processAudits,
        processState,
        `shutdown:${signal}:owner-token`,
        "OWNER_TOKEN_MISMATCH",
        currentRow
          ? [{
              classification: "owner-token-mismatch",
              pid: currentRow.pid,
              ppid: currentRow.ppid
            }]
          : [],
        [tokenCheck.commandEvidence]
      );
      signalFailures.push({ name: "Error", message: "owner token mismatch" });
      continue;
    }
    try {
      assertRunnerLiveHome(plan, liveHomeProof);
      process.kill(current.pid, signal);
      assertRunnerLiveHome(plan, liveHomeProof);
      markTermination(processRecords, current.label, signal);
    } catch (error) {
      if (error?.code !== "ESRCH") {
        persistProcessSafetyEvent(
          plan,
          liveHomeProof,
          processAudits,
          processState,
          `shutdown:${signal}:signal-failure`,
          "SIGNAL_FAILURE",
          [],
          [tokenCheck.commandEvidence]
        );
        signalFailures.push(failureForEvidence(error));
      }
    }
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return signalFailures;
}

async function boundedShutdownPoll({
  attempts,
  commands,
  liveHomeProof,
  phase,
  plan,
  processAudits,
  processState
}) {
  assertRunnerLiveHome(plan, liveHomeProof);
  let last;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      phase,
      { assertSafe: false }
    );
    if (
      last.refreshed.liveVerified.length === 0 &&
      last.audit.profilePaths.length === 0
    ) {
      return last;
    }
    assertRunnerLiveHome(plan, liveHomeProof);
    await delay(150);
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return last;
}

async function shutdownSpawnOwnedProcesses({
  commands,
  handles,
  liveHomeProof,
  plan,
  processAudits,
  processRecords,
  processState
}) {
  assertRunnerLiveHome(plan, liveHomeProof);
  const safetyFailures = [];
  const serviceHandle = handles.find(({ record }) => record.label === "service");
  if (serviceHandle) {
    let pidEvidence = { signalAuthority: false, status: "missing" };
    assertRunnerLiveHome(plan, liveHomeProof);
    if (existsSync(plan.paths.servicePid)) {
      const servicePidPath = assertRunnerOwnerPath(
        plan,
        liveHomeProof,
        "service PID evidence",
        plan.paths.servicePid
      );
      assertRunnerLiveHome(plan, liveHomeProof);
      const entry = lstatSync(servicePidPath);
      if (entry.isFile() && !entry.isSymbolicLink()) {
        assertRunnerLiveHome(plan, liveHomeProof);
        pidEvidence = verifyServicePidEvidenceText(
          readFileSync(servicePidPath, "utf8"),
          serviceHandle.identity
        );
        assertRunnerLiveHome(plan, liveHomeProof);
      } else {
        pidEvidence = { signalAuthority: false, status: "malformed" };
      }
    }
    if (pidEvidence.status !== "matched") {
      persistProcessSafetyEvent(
        plan,
        liveHomeProof,
        processAudits,
        processState,
        "service-pid-evidence",
        "SERVICE_PID_EVIDENCE_MISMATCH",
        serviceHandle.identity
          ? [{
              classification: "service-pid-evidence-mismatch",
              pid: serviceHandle.identity.pid,
              ppid: serviceHandle.identity.ppidAtDiscovery
            }]
          : [],
        serviceHandle.descriptor
          ? [runnerCommandEvidence(serviceHandle.descriptor)]
          : []
      );
      safetyFailures.push("service PID evidence mismatch");
    }
  }

  const beforeTerm = persistProcessState(
    plan,
    liveHomeProof,
    commands,
    processState,
    processAudits,
    "shutdown:before-term",
    { assertSafe: false }
  );
  if (beforeTerm.refreshed.liveVerified.length > 0) {
    const termFailures = signalRevalidatedIdentities({
      commands,
      liveHomeProof,
      plan,
      processAudits,
      processRecords,
      processState,
      signal: "SIGTERM"
    });
    if (termFailures.length > 0) safetyFailures.push("SIGTERM revalidation failure");
  }
  let afterTerm = await boundedShutdownPoll({
    attempts: 20,
    commands,
    liveHomeProof,
    phase: "shutdown:term-poll",
    plan,
    processAudits,
    processState
  });
  if (afterTerm?.refreshed.liveVerified.length > 0) {
    const killFailures = signalRevalidatedIdentities({
      commands,
      liveHomeProof,
      plan,
      processAudits,
      processRecords,
      processState,
      signal: "SIGKILL"
    });
    if (killFailures.length > 0) safetyFailures.push("SIGKILL revalidation failure");
  }
  const afterKill = await boundedShutdownPoll({
    attempts: 20,
    commands,
    liveHomeProof,
    phase: "shutdown:kill-poll",
    plan,
    processAudits,
    processState
  });

  for (const handle of handles) {
    assertRunnerLiveHome(plan, liveHomeProof);
    await Promise.race([handle.exitPromise, delay(3_000)]);
    assertRunnerLiveHome(plan, liveHomeProof);
  }
  const unprovenSurvivors = handles.filter(
    ({ identity, record }) => identity === null && record.endedAt === null
  );
  if (unprovenSurvivors.length > 0) {
    for (const { record } of unprovenSurvivors) {
      record.completionReason = "unproven-survivor";
    }
    persistProcessSafetyEvent(
      plan,
      liveHomeProof,
      processAudits,
      processState,
      "shutdown:unproven-survivor",
      "UNPROVEN_PROCESS_SURVIVOR",
      unprovenSurvivors.map(({ child }) => ({
        classification: "unproven-process-survivor",
        pid: child.pid,
        ppid: process.pid
      })),
      unprovenSurvivors.map(({ descriptor }) => runnerCommandEvidence(descriptor))
    );
  }
  const survivors = afterKill?.refreshed.liveVerified ?? [];
  const activeProfiles = afterKill?.audit.profilePaths ?? [];
  const foreignProfiles = afterKill?.audit.foreignProfiles ?? [];
  const unprovenOwnerProcesses = afterKill?.audit.unprovenOwnerProcesses ?? [];
  if (survivors.length > 0) safetyFailures.push("spawn-owned process survivor");
  if (activeProfiles.length > 0) safetyFailures.push("active Playwright profile survivor");
  if (foreignProfiles.length > 0) safetyFailures.push("foreign Playwright profile survivor");
  if (unprovenOwnerProcesses.length > 0) {
    safetyFailures.push("unproven owner-associated process survivor");
  }
  if (unprovenSurvivors.length > 0) safetyFailures.push("unproven process survivor");
  if ((afterKill?.refreshed.identityMismatches.length ?? 0) > 0) {
    safetyFailures.push("process identity mismatch");
  }
  for (const violationCode of processState.safetyViolations ?? []) {
    safetyFailures.push(`sticky safety violation ${violationCode}`);
  }
  if (safetyFailures.length > 0) {
    throw new Error(`Shutdown safety verification failed: ${safetyFailures.join(", ")}.`);
  }
  assertRunnerLiveHome(plan, liveHomeProof);
  return true;
}

async function main() {
  const unsupportedArgument = process.argv.slice(2).find((argument) => argument !== "--list");
  if (unsupportedArgument) throw new Error(`Unsupported argument: ${unsupportedArgument}`);
  assertNoCallerOwnedWritableOverrides(process.env);
  const liveHomeProof = createLiveHomeProof();
  assertLiveHomeProof(liveHomeProof);
  const repoRoot = realpathSync(process.cwd());
  assertCanonicalStarshipBrowserHost({ repoRoot });
  assertRepositoryBrowserLaunchConfinement(repoRoot);
  const discoveryOnly = process.argv.includes("--list");
  const mode = discoveryOnly ? "discovery" : "required-matrix";
  const nonce = randomBytes(32).toString("hex");
  const fingerprints = sourceFingerprints(repoRoot);
  assertSourceFingerprintsUnchanged(repoRoot, fingerprints);
  const dependencyPre = collectActiveBrowserDependencyAttestation(repoRoot);
  const executionScopePre = assertLiveRequiredBrowserExecutionScope(
    buildRequiredBrowserExecutionScope({
      dependencyAttestation: dependencyPre,
      mode,
      repoRoot,
      sourceFingerprints: fingerprints
    }),
    {
      dependencyAttestation: dependencyPre,
      repoRoot,
      sourceFingerprints: fingerprints
    }
  );
  const plan = createValidatedRunPlan({
    cwd: repoRoot,
    dependencyAttestation: dependencyPre,
    executionScope: executionScopePre,
    liveHomeProof,
    nonce,
    osTempDir: os.tmpdir(),
    repoRoot,
    sourceFingerprints: fingerprints
  });
  const processAudits = [];
  const processRecords = [];
  const processState = { registry: new Map(), safetyViolations: new Set() };
  const handles = [];
  const expectedTests = [];
  let primaryError;
  let failedPhase = null;
  let currentPhase = "preflight";
  let shutdownClean = false;
  let outcomes;
  let bug3;
  let commands;
  let materialized = false;
  let playwrightLog;
  let playwrightLogResult;
  let runEnvironment;
  let sourceFingerprintsPost = null;
  let sourceFingerprintFailure = null;
  let dependencyPost = null;
  let dependencyStatus = "not-observed";
  let dependencyFailure = null;
  let executionScopePost = null;
  let executionScopeStatus = "not-observed";
  let executionScopeFailure = null;
  const jsonReport = {
    expected: !discoveryOnly,
    path: plan.evidencePaths.finalResults,
    status: discoveryOnly ? "not-required" : "missing"
  };
  try {
    currentPhase = "command-resolution";
    commands = resolveOwnedBrowserCommands({
      dependencyAttestation: plan.dependencyAttestation,
      executionScope: plan.executionScope,
      plan,
      repoRoot: plan.repoRoot
    });
    const expectedRunnerCommandIds = runnerOwnedCommandIds
      .filter((commandId) =>
        mode === "required-matrix"
        || commandId.startsWith("owner.audit.")
        || commandId === "owner.playwright.discovery"
      )
      .sort();
    if (!sameJson([...commands.allowedCommandIds].sort(), expectedRunnerCommandIds)) {
      throw new Error("Runner command resolver exposes a command outside its closed mode callgraph.");
    }
    currentPhase = "bootstrap";
    assertLiveRequiredBrowserExecutionScope(plan.executionScope, {
      dependencyAttestation: plan.dependencyAttestation,
      repoRoot: plan.repoRoot,
      sourceFingerprints: plan.sourceFingerprints
    });
    bootstrapValidatedRunPlan(plan, liveHomeProof);
    currentPhase = "materialization";
    materializeValidatedRunPlan(plan, liveHomeProof, { fingerprints });
    materialized = true;
    const materializedPlan = validateMaterializedRunPlan(plan, liveHomeProof);
    runEnvironment = buildValidatedRunEnvironment(
      materializedPlan,
      liveHomeProof,
      { ...process.env }
    );
    assertActiveBrowserDependencyAttestationUnchanged(repoRoot, dependencyPre);
    assertLiveRequiredBrowserExecutionScope(materializedPlan.executionScope, {
      dependencyAttestation: materializedPlan.dependencyAttestation,
      repoRoot: materializedPlan.repoRoot,
      sourceFingerprints: materializedPlan.sourceFingerprints
    });
    currentPhase = "preflight";
    for (const [label, logPath] of [
      ["build log", plan.evidencePaths.buildLog],
      ["service log", plan.evidencePaths.serviceLog],
      ["Playwright log", plan.evidencePaths.playwrightLog]
    ]) {
      assertRunnerOwnerPath(plan, liveHomeProof, label, logPath);
      if (existsSync(logPath)) throw new Error(`${label} already exists.`);
    }
    playwrightLog = createBoundedRedactedLog(
      plan,
      liveHomeProof,
      plan.evidencePaths.playwrightLog
    );
    const preflight = persistProcessState(
      plan,
      liveHomeProof,
      commands,
      processState,
      processAudits,
      "preflight"
    );
    if (preflight.audit.relevantProcesses.length > 0) {
      throw new Error("Fresh owner run unexpectedly has an existing process or lock reference.");
    }
    writeValidatedEvidenceJsonAtomic(
      plan,
      liveHomeProof,
      plan.evidencePaths.pathAudit,
      buildPathAudit(plan, liveHomeProof, runEnvironment)
    );

    currentPhase = "discovery";
    assertSourceFingerprintsUnchanged(repoRoot, fingerprints);
    assertActiveBrowserDependencyAttestationUnchanged(repoRoot, dependencyPre);
    for (const { project, contracts } of executionMatrix) {
      for (const contract of contracts) {
        expectedTests.push(...collectFamily(project, contract, runEnvironment, {
          commands,
          liveHomeProof,
          log: playwrightLog,
          plan,
          processRecords
        }));
      }
    }
    assertSourceFingerprintsUnchanged(repoRoot, fingerprints);
    const expectedKeys = expectedTests.map(({ project, title }) => testKey(project, title));
    if (new Set(expectedKeys).size !== expectedKeys.length) {
      throw new Error("Required discovery matrix contains duplicates across families.");
    }

    if (!discoveryOnly) {
      currentPhase = "execution-config";
      writeExecutionConfig(plan, liveHomeProof, fingerprints, expectedTests);
      writeOwnedNextTsconfig(plan, liveHomeProof);

      currentPhase = "build";
      assertActiveBrowserDependencyAttestationUnchanged(repoRoot, dependencyPre);
      const buildLog = createBoundedRedactedLog(
        plan,
        liveHomeProof,
        plan.evidencePaths.buildLog
      );
      const buildHandle = await spawnOwnedProcess({
        commandId: "owner.next.build",
        commands,
        environment: runEnvironment,
        handles,
        label: "build",
        liveHomeProof,
        log: buildLog,
        plan,
        processAudits,
        processRecords,
        processState
      });
      const buildResult = await waitForOwnedProcessExit(buildHandle, {
        commands,
        liveHomeProof,
        phase: "build",
        plan,
        processAudits,
        processState,
        timeoutMs: 600_000
      });
      if (buildResult.spawnError || buildResult.exitCode !== 0) {
        throw new Error("Owned Next build did not complete successfully.");
      }
      assertSourceFingerprintsUnchanged(repoRoot, fingerprints);

      currentPhase = "service-start";
      assertActiveBrowserDependencyAttestationUnchanged(repoRoot, dependencyPre);
      const serviceLog = createBoundedRedactedLog(
        plan,
        liveHomeProof,
        plan.evidencePaths.serviceLog
      );
      const serviceHandle = await spawnOwnedProcess({
        bindings: { servicePort: plan.servicePort },
        commandId: "owner.next.service",
        commands,
        environment: runEnvironment,
        handles,
        label: "service",
        liveHomeProof,
        log: serviceLog,
        plan,
        processAudits,
        processRecords,
        processState
      });
      if (!serviceHandle.identity) {
        throw new Error("Owned Next service exited before its identity was established.");
      }
      writeOwnedServicePid(plan, liveHomeProof, serviceHandle.identity.pid);
      await waitForServiceReady(serviceHandle, {
        commands,
        liveHomeProof,
        plan,
        processAudits,
        processState
      });

      currentPhase = "required-matrix";
      assertActiveBrowserDependencyAttestationUnchanged(repoRoot, dependencyPre);
      const playwrightHandle = await spawnOwnedProcess({
        bindings: { requiredConfig: plan.paths.requiredConfig },
        commandId: "owner.playwright.final",
        commands,
        environment: runEnvironment,
        handles,
        label: "playwright",
        liveHomeProof,
        log: playwrightLog,
        ownLog: false,
        plan,
        processAudits,
        processRecords,
        processState
      });
      const run = await waitForOwnedProcessExit(playwrightHandle, {
        commands,
        liveHomeProof,
        phase: "required-matrix",
        plan,
        processAudits,
        processState,
        timeoutMs: 900_000
      });
      if (run.spawnError || run.exitCode !== 0) {
        throw new Error("Required Playwright matrix did not complete successfully.");
      }
      assertSourceFingerprintsUnchanged(repoRoot, fingerprints);

      currentPhase = "json-report";
      let report;
      const finalResultsPath = assertRunnerOwnerPath(
        plan,
        liveHomeProof,
        "required browser JSON report",
        plan.evidencePaths.finalResults
      );
      if (!existsSync(finalResultsPath)) {
        jsonReport.status = "missing";
        throw new Error("Required browser JSON reporter is missing.");
      }
      try {
        assertRunnerOwnerPath(
          plan,
          liveHomeProof,
          "required browser JSON report",
          finalResultsPath
        );
        report = JSON.parse(readFileSync(finalResultsPath, "utf8"));
      } catch (error) {
        jsonReport.status = "malformed";
        throw new Error("Required browser JSON reporter is malformed.", { cause: error });
      }
      outcomes = validateFinalRequiredBrowserReport(report, {
        dependencyAttestation: dependencyPre,
        executionScope: plan.executionScope,
        expectedTests,
        fingerprints,
        runId: plan.runId
      });
      bug3 = assertRequiredBug3Outcomes(report);
      jsonReport.status = "validated";
    }
  } catch (error) {
    primaryError = error;
    failedPhase = currentPhase;
  }

  currentPhase = "shutdown";
  if (materialized) {
    try {
      await shutdownSpawnOwnedProcesses({
        commands,
        handles,
        liveHomeProof,
        plan,
        processAudits,
        processRecords,
        processState
      });
      const final = persistProcessState(
        plan,
        liveHomeProof,
        commands,
        processState,
        processAudits,
        "final"
      );
      shutdownClean =
        final.refreshed.liveVerified.length === 0 &&
        final.audit.profilePaths.length === 0 &&
        final.audit.unprovenOwnerProcesses.length === 0;
      if (!shutdownClean) throw new Error("Final shutdown audit was not clean.");
    } catch (error) {
      shutdownClean = false;
      if (!primaryError) {
        primaryError = error;
        failedPhase = currentPhase;
      }
    }
  } else {
    try {
      assertRunnerLiveHome(plan, liveHomeProof);
      if (!commands) {
        shutdownClean = false;
      } else {
        const snapshot = systemProcessSnapshot(plan, liveHomeProof, commands);
        const tokenSnapshot = systemOwnerTokenPids(
          plan,
          liveHomeProof,
          commands,
          plan.nonce
        );
        const audit = auditFromSnapshot(plan, snapshot, []);
        const unproven = classifyUnprovenOwnerProcesses(plan, snapshot.rows, {
          tokenBearingPids: tokenSnapshot.pids,
          verifiedPids: new Set()
        });
        shutdownClean =
          handles.length === 0 && audit.profilePaths.length === 0 && unproven.length === 0;
      }
      if (!shutdownClean) {
        throw new Error("Unmaterialized run terminal audit was not clean.");
      }
    } catch (error) {
      shutdownClean = false;
      if (!primaryError) {
        primaryError = error;
        failedPhase = currentPhase;
      }
    }
  }
  const retainedLogs = new Set(handles.map(({ log }) => log).filter(Boolean));
  if (playwrightLog) retainedLogs.add(playwrightLog);
  for (const log of retainedLogs) {
    const result = closeLogOnce(log);
    for (const record of processRecords) {
      if (record.logPath === log.path) record.log = result;
    }
    if (log === playwrightLog) playwrightLogResult = result;
    if (result?.error && !primaryError) {
      primaryError = new Error("A retained subprocess log could not be finalized safely.");
      failedPhase = "log-finalization";
    }
  }
  try {
    assertRunnerLiveHome(plan, liveHomeProof);
    sourceFingerprintsPost = sourceFingerprints(repoRoot);
    if (!sameJson(sourceFingerprintsPost, fingerprints)) {
      const error = new Error("Required-browser proof inputs drifted during the owned run.");
      if (!primaryError) {
        primaryError = error;
        failedPhase = "post-run-fingerprint";
      }
    }
  } catch (error) {
    sourceFingerprintsPost = null;
    sourceFingerprintFailure = failureForEvidence(error);
    if (!primaryError) {
      primaryError = error;
      failedPhase = "post-run-fingerprint-capture";
    }
  }

  try {
    assertRunnerLiveHome(plan, liveHomeProof);
    assertRepositoryBrowserLaunchConfinement(repoRoot);
  } catch (error) {
    if (!primaryError) {
      primaryError = error;
      failedPhase = "post-run-browser-confinement";
    }
  }

  try {
    assertRunnerLiveHome(plan, liveHomeProof);
    dependencyPost = collectActiveBrowserDependencyAttestation(repoRoot);
    dependencyStatus = sameJson(dependencyPost, dependencyPre) ? "matched" : "drifted";
    if (dependencyStatus === "drifted") {
      const error = new Error("Active dependency attestation drifted during the owned run.");
      if (!primaryError) {
        primaryError = error;
        failedPhase = "post-run-dependency-attestation";
      }
    }
  } catch (error) {
    dependencyPost = null;
    dependencyStatus = "failed";
    dependencyFailure = failureForEvidence(error);
    if (!primaryError) {
      primaryError = error;
      failedPhase = "post-run-dependency-attestation";
    }
  }

  if (!sourceFingerprintsPost || !dependencyPost) {
    executionScopePost = null;
    executionScopeStatus = "failed";
    executionScopeFailure = sourceFingerprintFailure
      ?? dependencyFailure
      ?? failureForEvidence(new Error("Post-run execution scope inputs could not be captured."));
  } else {
    try {
      assertRunnerLiveHome(plan, liveHomeProof);
      executionScopePost = validateRequiredBrowserExecutionScopeSnapshot(
        buildRequiredBrowserExecutionScope({
          dependencyAttestation: dependencyPost,
          mode,
          repoRoot,
          sourceFingerprints: sourceFingerprintsPost
        })
      );
      executionScopeStatus = sameJson(executionScopePost, plan.executionScope)
        ? "matched"
        : "drifted";
      if (executionScopeStatus === "drifted") {
        const error = new Error("Required-browser execution scope drifted during the owned run.");
        if (!primaryError) {
          primaryError = error;
          failedPhase = "post-run-execution-scope";
        }
      }
    } catch (error) {
      executionScopePost = null;
      executionScopeStatus = "failed";
      executionScopeFailure = failureForEvidence(error);
      if (!primaryError) {
        primaryError = error;
        failedPhase = "post-run-execution-scope-capture";
      }
    }
  }

  let cleanup = { status: "skipped" };
  if (shutdownClean && materialized) {
    try {
      assertRunnerLiveHome(plan, liveHomeProof);
      const removed = cleanupValidatedEphemeralLeaves(
        plan,
        liveHomeProof,
        Object.values(plan.cleanupLeaves)
      );
      if (removed.length !== Object.keys(plan.cleanupLeaves).length) {
        throw new Error("Ephemeral cleanup did not remove every registered leaf.");
      }
      cleanup = {
        removed: Object.keys(plan.cleanupLeaves),
        status: "passed"
      };
    } catch (error) {
      cleanup = { failure: failureForEvidence(error), status: "failed" };
      if (!primaryError) {
        primaryError = error;
        failedPhase = "cleanup";
      }
    }
  } else {
    cleanup = {
      reason: materialized
        ? "owned processes or profiles were not proven stopped"
        : "run plan did not finish materialization",
      status: "skipped"
    };
  }

  assertRunnerLiveHome(plan, liveHomeProof);
  const retainedEvidence = collectEvidenceHashes(plan, liveHomeProof, {
    requireFinal: !discoveryOnly && !primaryError
  });
  if (retainedEvidence.missingRequired.length > 0 && !primaryError) {
    primaryError = new Error("Required retained terminal evidence is missing or invalid.");
    failedPhase = "terminal-evidence";
  }
  finalizeProcessRecordObservations(processRecords);

  const preflightManifestEvidence = retainedEvidence.entries.preflightManifest;
  const manifest = {
    executionScopeFingerprint: plan.executionScope.scopeFingerprint,
    path: preflightManifestEvidence.path,
    planFingerprint: plan.planFingerprint,
    sha256: preflightManifestEvidence.status === "present"
      ? preflightManifestEvidence.sha256
      : null,
    status: preflightManifestEvidence.status
  };
  assertRunnerLiveHome(plan, liveHomeProof);
  const finalSummary = assertEvidenceExcludesTransientHome({
    cleanup,
    dependencyAttestation: {
      post: dependencyPost,
      pre: dependencyPre,
      status: dependencyStatus,
      ...(dependencyFailure ? { failure: dependencyFailure } : {})
    },
    evidence: {
      hashes: retainedEvidence.entries,
      missingRequired: retainedEvidence.missingRequired,
      paths: plan.evidencePaths
    },
    executionScope: {
      post: executionScopePost,
      pre: plan.executionScope,
      status: executionScopeStatus,
      ...(executionScopeFailure ? { failure: executionScopeFailure } : {})
    },
    expectedEnvironmentInventorySha256: plan.environmentBinding.inventorySha256,
    expectedExecutionScopeFingerprint: plan.executionScope.scopeFingerprint,
    expectedTests,
    failedPhase: primaryError ? failedPhase ?? "terminal-evidence" : null,
    fingerprints,
    jsonReport,
    manifest,
    mode,
    planFingerprint: plan.planFingerprint,
    processes: processRecords,
    repoRoot: plan.repoRoot,
    runId: plan.runId,
    schemaVersion: 1,
    shutdownClean,
    status: primaryError ? "failed" : "passed",
    ...(bug3 ? { bug3 } : {}),
    ...(outcomes ? { outcomes } : {}),
    ...(playwrightLogResult ? { playwrightLog: playwrightLogResult } : {}),
    ...(primaryError ? { failure: failureForEvidence(primaryError) } : {})
  });
  try {
    const terminalWrite = writeTerminalSummaryWithFailureFallback(
      plan,
      liveHomeProof,
      finalSummary
    );
    if (terminalWrite.writeFailure && !primaryError) {
      primaryError = terminalWrite.writeFailure;
      failedPhase = "summary-write-readback";
    }
  } catch (error) {
    primaryError = primaryError
      ? new AggregateError(
          [primaryError, error],
          "Owned run failed and no schema-valid terminal summary could be retained."
        )
      : error;
    failedPhase = "summary-write-readback";
  }

  if (primaryError) throw primaryError;
  if (!discoveryOnly && outcomes) {
    console.log(
      `Required browser matrix: selected=${outcomes.total} passed=${outcomes.passed} allowed-skipped=${outcomes.allowedSkipped} unexpected-skip-fixme=${outcomes.unexpectedSkippedOrFixme}`
    );
  }
  console.log(
    `${discoveryOnly ? "Required browser discovery" : "Required browser matrix"}: PASS; confined local evidence retained.`
  );
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (status) => { process.exitCode = status; },
    () => {
      console.error(stableCiFailureMessage());
      process.exitCode = 1;
    }
  );
}
