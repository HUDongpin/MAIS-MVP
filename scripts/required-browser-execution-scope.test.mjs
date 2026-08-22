import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { buildActiveBrowserDependencyProof } from "./active-browser-dependency-proof.mjs";
import {
  REQUIRED_BROWSER_EXECUTION_MATRIX,
  REQUIRED_BROWSER_PROOF_INPUT_FILES,
  analyzeRequiredBrowserSourceSemanticsForTest,
  assertLiveRequiredBrowserExecutionScope,
  buildRequiredBrowserExecutionScope,
  requiredBrowserEnvironmentValueSha256,
  requiredBrowserSourceFingerprints,
  validateAndHashRequiredBrowserStaticEnvironment,
  validateRequiredBrowserExecutionScopeSnapshot
} from "./required-browser-execution-scope.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

const TEST_CAPABILITY_CLASSES = Object.freeze([
  "browser", "dynamic-code", "filesystem-delete", "filesystem-read", "filesystem-write",
  "network", "shell", "subprocess", "unknown"
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function hashObject(value, omittedKey = "sha256") {
  const source = { ...value };
  delete source[omittedKey];
  return createHash("sha256").update(JSON.stringify(stableValue(source))).digest("hex");
}

function domainHashObject(domain, value, omittedKey = "sha256") {
  const source = { ...value };
  delete source[omittedKey];
  return createHash("sha256")
    .update(`${domain}\0${JSON.stringify(stableValue(source))}`)
    .digest("hex");
}

function compareStable(left, right) {
  return JSON.stringify(stableValue(left)).localeCompare(JSON.stringify(stableValue(right)));
}

function clone(value) {
  return structuredClone(value);
}

function fixture(mode = "static-no-browser") {
  const repoRoot = realpathSync(process.cwd());
  const dependencyAttestation = buildActiveBrowserDependencyProof(repoRoot);
  const sourceFingerprints = requiredBrowserSourceFingerprints(repoRoot);
  const scope = buildRequiredBrowserExecutionScope({
    dependencyAttestation,
    mode,
    repoRoot,
    sourceFingerprints
  });
  return { dependencyAttestation, repoRoot, scope, sourceFingerprints };
}

function rehashCapabilityProofs(scope) {
  const proofs = scope.capabilityProofs;
  proofs.analyzer.parser.sha256 = domainHashObject(
    "capability-parser",
    proofs.analyzer.parser
  );
  proofs.analyzer.ruleset.sha256 = domainHashObject(
    "capability-ruleset",
    proofs.analyzer.ruleset
  );
  proofs.analyzer.sha256 = domainHashObject("capability-analyzer", proofs.analyzer);
  const definitionsById = new Map(
    scope.commandCatalog.definitions.map((definition) => [definition.id, definition])
  );
  for (const command of proofs.commands) {
    const definition = definitionsById.get(command.commandId);
    if (!definition) throw new Error(`Test rehash lacks definition ${command.commandId}.`);
    for (const file of command.files) {
      file.capabilityFindings.sort(compareStable);
      file.inertCapabilitySites.sort(compareStable);
      file.proofSha256 = domainHashObject(
        "capability-file-proof",
        file,
        "proofSha256"
      );
    }
    command.files.sort((left, right) => left.path.localeCompare(right.path));
    const findingCounts = Object.fromEntries(
      TEST_CAPABILITY_CLASSES.map((capability) => [capability, 0])
    );
    for (const file of command.files) {
      for (const finding of file.capabilityFindings) findingCounts[finding.capability] += 1;
    }
    command.analyzerSha256 = proofs.analyzer.sha256;
    command.catalogSha256 = scope.commandCatalog.sha256;
    command.closureSha256 = scope.closure.sha256;
    command.commandDefinitionSha256 = createHash("sha256")
      .update(`capability-command-definition\0${JSON.stringify(stableValue(definition))}`)
      .digest("hex");
    command.findingCounts = stableValue(findingCounts);
    command.parserSha256 = proofs.analyzer.parser.sha256;
    command.rulesetSha256 = proofs.analyzer.ruleset.sha256;
    command.proofSha256 = domainHashObject(
      "capability-command-proof",
      command,
      "proofSha256"
    );
  }
  proofs.commands.sort((left, right) => left.commandId.localeCompare(right.commandId));
  proofs.catalogSha256 = scope.commandCatalog.sha256;
  proofs.closureSha256 = scope.closure.sha256;
  proofs.sha256 = domainHashObject("capability-proofs", proofs);
}

function rehashScope(scope) {
  scope.proofInputs.sha256 = hashObject(scope.proofInputs);
  scope.commandCatalog.sha256 = hashObject(scope.commandCatalog);
  scope.closure.sha256 = hashObject(scope.closure);
  scope.destructiveLedger.sha256 = hashObject(scope.destructiveLedger);
  rehashCapabilityProofs(scope);
  scope.scopeFingerprint = hashObject(scope, "scopeFingerprint");
  return scope;
}

function repartitionLedger(ledger) {
  ledger.entries.sort((left, right) => JSON.stringify(stableValue(left)).localeCompare(JSON.stringify(stableValue(right))));
  ledger.outOfScopeEntries = ledger.entries.filter(({ reachableFromCommandIds }) => reachableFromCommandIds.length === 0);
  ledger.reachableEntries = ledger.entries.filter(({ reachableFromCommandIds }) => reachableFromCommandIds.length > 0);
}

function rejectMutation(current, mutate, pattern) {
  const mutated = clone(current.scope);
  mutate(mutated);
  assert.throws(
    () => assertLiveRequiredBrowserExecutionScope(mutated, {
      dependencyAttestation: current.dependencyAttestation,
      repoRoot: current.repoRoot,
      sourceFingerprints: current.sourceFingerprints
    }),
    pattern
  );
}

function rejectFullyRehashedSnapshot(current, mutate, pattern) {
  const mutated = clone(current.scope);
  mutate(mutated);
  rehashScope(mutated);
  assert.throws(() => validateRequiredBrowserExecutionScopeSnapshot(mutated), pattern);
}

function staticEnvironmentFixture(t) {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  t.after(() => removeTestFixtureCapability(capability));
  const ownerRoot = readTestFixtureCapabilityView(capability).definition.leaf;
  const ownerPath = (name) => {
    const value = join(ownerRoot, name);
    mkdirSync(value, { recursive: true, mode: 0o700 });
    return value;
  };
  const environment = {
    CI: "1",
    HOME: ownerRoot,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    MAIS_BROWSER_OWNER_TOKEN: "a".repeat(64),
    MAIS_REQUIRED_BROWSER_COMMAND_CATALOG_SHA256: "b".repeat(64),
    MAIS_REQUIRED_BROWSER_COMMAND_ID: "static.prod-certification-unit",
    MAIS_REQUIRED_BROWSER_DESCRIPTOR_SHA256: "c".repeat(64),
    MAIS_REQUIRED_BROWSER_EXECUTION_SCOPE_FINGERPRINT: "d".repeat(64),
    MAIS_REQUIRED_BROWSER_PLAN_FINGERPRINT: "e".repeat(64),
    MAIS_REQUIRED_BROWSER_RUN_ID: `bug3-owner-${"f".repeat(64)}`,
    NODE_COMPILE_CACHE: ownerPath("node-compile-cache"),
    TEMP: ownerPath("temp"),
    TMP: ownerPath("tmp"),
    TMPDIR: ownerPath("tmpdir"),
    TZ: "UTC",
    XDG_CACHE_HOME: ownerPath("xdg-cache"),
    XDG_CONFIG_HOME: ownerPath("xdg-config"),
    XDG_DATA_HOME: ownerPath("xdg-data"),
    XDG_STATE_HOME: ownerPath("xdg-state")
  };
  return {
    environment,
    expectedHomeSha256: requiredBrowserEnvironmentValueSha256("HOME", environment.HOME),
    ownerRoot
  };
}

test("current physical tree constructs both no-write execution-scope modes", () => {
  for (const mode of ["static-no-browser", "required-matrix"]) {
    const current = fixture(mode);
    assert.deepEqual(validateRequiredBrowserExecutionScopeSnapshot(current.scope), current.scope);
    assert.deepEqual(
      assertLiveRequiredBrowserExecutionScope(current.scope, {
        dependencyAttestation: current.dependencyAttestation,
        repoRoot: current.repoRoot,
        sourceFingerprints: current.sourceFingerprints
      }),
      current.scope
    );
    assert.equal(current.scope.mode, mode);
  }
});

test("execution scope owns the exact proof list, harness, and six non-cross-product matrix bindings", () => {
  const configAuthorityTest = "scripts/required-browser-config-authority.test.mjs";
  assert.equal(REQUIRED_BROWSER_PROOF_INPUT_FILES.includes(configAuthorityTest), true);
  assert.equal(REQUIRED_BROWSER_PROOF_INPUT_FILES.includes("scripts/required-browser-execution-scope.test.mjs"), true);
  assert.equal(REQUIRED_BROWSER_EXECUTION_MATRIX.reduce((total, row) => total + row.contracts.length, 0), 6);
  const bindings = REQUIRED_BROWSER_EXECUTION_MATRIX.flatMap(({ contracts, project }) =>
    contracts.map(({ contractId, file, grep }) => `${project}\0${contractId}\0${file}\0${grep}`)
  );
  assert.equal(new Set(bindings).size, 6);

  const current = fixture();
  const harnessDefinition = current.scope.commandCatalog.definitions.find(
    ({ id }) => id === "static.owner-harness"
  );
  assert.ok(harnessDefinition);
  const expectedHarnessFiles = [
    "scripts/bug3-owner-run-plan.test.mjs",
    "scripts/playwright-owner-paths.test.mjs",
    "scripts/provision-exact-browser-dependencies.test.mjs",
    configAuthorityTest,
    "scripts/required-browser-execution-scope.test.mjs",
    "scripts/required-browser-runner.test.mjs",
    "scripts/test-fixture-capability.test.mjs"
  ];
  assert.deepEqual(harnessDefinition.entrypointPaths, expectedHarnessFiles);
  assert.deepEqual(
    harnessDefinition.argv.map(({ kind, value }) => {
      assert.equal(kind, "literal");
      return value;
    }),
    ["--test", "--test-concurrency=1", ...expectedHarnessFiles]
  );
  const closureFile = current.scope.closure.files.find(({ path }) => path === configAuthorityTest);
  assert.ok(closureFile);
  assert.equal(closureFile.reachableFromCommandIds.includes("static.owner-harness"), true);
  const harnessProof = current.scope.capabilityProofs.commands.find(
    ({ commandId }) => commandId === "static.owner-harness"
  );
  assert.ok(harnessProof);
  assert.equal(harnessProof.files.some(({ path }) => path === configAuthorityTest), true);
});

test("static child environment requires exact values and canonical raw key order", (t) => {
  const current = staticEnvironmentFixture(t);
  const validate = (environment, expectedHomeSha256 = current.expectedHomeSha256) =>
    validateAndHashRequiredBrowserStaticEnvironment({
      environment,
      expectedHomeSha256,
      ownerRoot: current.ownerRoot
    });
  const valid = validate(current.environment);
  assert.deepEqual(
    valid.entries.map(({ key }) => key),
    Object.keys(current.environment)
  );
  const reject = (mutate, pattern) => {
    const environment = { ...current.environment };
    mutate(environment);
    assert.throws(() => validate(environment), pattern);
  };
  reject((environment) => { delete environment.TEMP; }, /keys differ|order|incomplete/i);
  reject((environment) => { environment.HOME = ""; }, /non-empty|HOME/i);
  reject((environment) => { environment.TMPDIR = undefined; }, /non-empty|TMPDIR/i);
  reject((environment) => { environment.EXTRA_VALUE = "forged"; }, /keys differ|order/i);
  reject((environment) => { environment.NODE_PATH = current.ownerRoot; }, /NODE_PATH/i);
  reject((environment) => {
    environment.PLAYWRIGHT_BROWSERS_PATH = current.ownerRoot;
  }, /override|prohibited/i);
  assert.throws(
    () => validate(Object.fromEntries(Object.entries(current.environment).reverse())),
    /key order/i
  );
  assert.throws(
    () => validate(current.environment, "0".repeat(64)),
    /HOME hash/i
  );
});

test("capability proof binds strict prod flags, analyzer roles, and nested hashes", () => {
  const current = fixture();
  const proofs = current.scope.capabilityProofs;
  assert.equal(proofs.mode, "static-no-browser");
  assert.match(proofs.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    proofs.commands.map(({ commandId }) => commandId),
    current.scope.commandCatalog.allowedCommandIds
  );
  const prod = proofs.commands.find(
    ({ commandId }) => commandId === "static.prod-certification-unit"
  );
  assert.ok(prod);
  assert.deepEqual(prod.catalogCapabilities, {
    browserCapable: false,
    networkCapable: false,
    subprocessCapable: false
  });
  assert.deepEqual(prod.forbiddenCapabilities, [
    "browser", "dynamic-code", "filesystem-delete", "filesystem-write", "network", "shell",
    "subprocess", "unknown"
  ]);
  assert.equal(prod.forbiddenCapabilities.every((name) => prod.findingCounts[name] === 0), true);
  const analyzerFile = prod.files.find(
    ({ path }) => path === "scripts/required-browser-execution-scope.mjs"
  );
  assert.ok(analyzerFile);
  assert.deepEqual(analyzerFile.roles, [
    "capability-analyzer", "command-catalog", "trusted-source"
  ]);
  assert.match(analyzerFile.proofSha256, /^[a-f0-9]{64}$/);
});

test("AST closure ignores inert syntax and binds computed imports and child_process effects exactly", () => {
  const current = fixture();
  const boundImports = current.scope.closure.importEdges.filter(({ from, kind }) =>
    from === "tests/e2e/reported-bug-source-regressions.test.ts"
    && kind === "bound-computed-import"
  );
  assert.deepEqual(boundImports.map(({ to }) => to).sort(), [
    "playwright.config.ts",
    "scripts/run-required-frontend-browser-contracts.mjs"
  ]);
  const edges = current.scope.closure.spawnEdges.filter(({ commandId, file }) =>
    commandId === "static.source-canary"
    && file === "tests/e2e/reported-bug-source-regressions.test.ts"
  );
  assert.equal(edges.length, 1);
  assert.match(edges[0].syntaxSha256, /^[a-f0-9]{64}$/);
  assert.notEqual(edges[0].syntaxSha256, createHash("sha256").update("spawnSync(").digest("hex"));
  assert.equal(current.scope.closure.unresolvedLocalImports.length, 0);
  assert.equal(current.scope.closure.unresolvedSpawnSites.length, 0);
  const inert = current.scope.destructiveLedger.entries.filter(
    ({ file, semanticClass }) => file === "scripts/required-browser-execution-scope.test.mjs"
      && semanticClass === "inert-literal-or-comment"
  );
  assert.equal(inert.length > 0, true);
  assert.equal(inert.every(({ disposition, reachableFromCommandIds }) =>
    disposition === "INERT_LITERAL_OR_COMMENT" && reachableFromCommandIds.length === 0), true);
  const dormant = current.scope.destructiveLedger.entries.filter(
    ({ file, semanticClass }) => file === "package.json" && semanticClass === "dormant-package-script"
  );
  assert.equal(dormant.length > 0, true);
  assert.equal(dormant.every(({ disposition, reachableFromCommandIds }) =>
    disposition === "DORMANT_PACKAGE_SCRIPT" && reachableFromCommandIds.length === 0), true);
  const runnerFile = current.scope.closure.files.find(
    ({ path }) => path === "scripts/run-required-frontend-browser-contracts.mjs"
  );
  assert.ok(runnerFile);
  assert.deepEqual(
    runnerFile.reachableFromCommandIds.filter((commandId) =>
      ["static.owner-harness", "static.source-regressions"].includes(commandId)
    ),
    ["static.owner-harness", "static.source-regressions"]
  );
});

test("pure AST analyzer normalizes effect families and classifies active child commands", () => {
  const analysis = analyzeRequiredBrowserSourceSemanticsForTest(String.raw`
    import * as fs from "node:fs";
    import { exec as execute, spawnSync as namedSpawn } from "node:child_process";
    const childNamespace = await import("node:child_process");
    const childDefault = childNamespace.default;
    const childAlias = childDefault;
    const namedAlias = namedSpawn;
    let assigned;
    assigned = namedAlias;
    fs.promises.rm("/tmp/synthetic-only");
    childAlias.execFileSync(process.execPath, ["noop.mjs"]);
    assigned(process.execPath, ["noop.mjs"]);
    execute("rm -rf /tmp/synthetic-only");
  `);
  assert.deepEqual(
    analysis.childProcessCalls.map(({ member }) => member).sort(),
    ["exec", "execFileSync", "spawnSync"]
  );
  assert.deepEqual(
    analysis.destructiveCalls.map(({ semanticClass }) => semanticClass).sort(),
    ["active-child-process-delete", "active-filesystem-delete"]
  );
  assert.equal(
    analysis.inertDestructiveSites.some(
      ({ semanticClass }) => semanticClass === "inert-literal-or-comment"
    ),
    false
  );
});

test("pure AST analyzer ignores ordinary exec calls and keeps literals comments and regex inert", () => {
  const analysis = analyzeRequiredBrowserSourceSemanticsForTest(String.raw`
    const matcher = /rmSync\(/;
    matcher.exec("rmSync(");
    const database = { exec() { return true; } };
    database.exec("rm -rf /tmp/inert");
    const inertText = "unlinkSync(";
    // git reset --hard
  `);
  assert.deepEqual(analysis.childProcessCalls, []);
  assert.deepEqual(analysis.destructiveCalls, []);
  assert.equal(analysis.inertDestructiveSites.length >= 4, true);
  assert.equal(
    analysis.inertDestructiveSites.every(
      ({ semanticClass }) => semanticClass === "inert-literal-or-comment"
    ),
    true
  );
});

test("pure AST analyzer fails closed on reassigned or computed effect aliases", () => {
  assert.throws(
    () => analyzeRequiredBrowserSourceSemanticsForTest(String.raw`
      import { spawnSync } from "node:child_process";
      let run = spawnSync;
      run = runtimeSelectedCallable;
      run(process.execPath, ["noop.mjs"]);
    `),
    /ambiguous effect alias/i
  );
  assert.throws(
    () => analyzeRequiredBrowserSourceSemanticsForTest(String.raw`
      import * as childProcess from "node:child_process";
      childProcess[runtimeSelectedMember](process.execPath, ["noop.mjs"]);
    `),
    /ambiguous effect alias/i
  );
});

test("pure snapshot validator rejects fully rehashed analyzer and ruleset forgeries", () => {
  const current = fixture();
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.capabilityProofs.analyzer.ruleset.browserModules.push("forged-browser-module");
    scope.capabilityProofs.analyzer.ruleset.browserModules.sort();
  }, /ruleset|canonical/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.capabilityProofs.analyzer.source.canonicalPath = join(
      scope.repoRoot,
      "scripts",
      "forged-capability-analyzer.mjs"
    );
  }, /analyzer source|source binding/i);
});

test("pure snapshot validator rejects fully rehashed forbidden and false-flag findings", () => {
  const current = fixture();
  const addFinding = (scope, capability, kind, member) => {
    const command = scope.capabilityProofs.commands.find(
      ({ commandId }) => commandId === "static.prod-certification-unit"
    );
    const file = command.files.find(
      ({ path }) => path === "scripts/prod-certification-core.mjs"
    ) ?? command.files[0];
    file.capabilityFindings.push({
      capability,
      column: 1,
      file: file.path,
      kind,
      line: 1,
      member,
      sourceKind: "call-expression",
      syntaxSha256: createHash("sha256").update(`${capability}\0${kind}`).digest("hex")
    });
  };
  rejectFullyRehashedSnapshot(current, (scope) => {
    addFinding(scope, "dynamic-code", "dynamic-code-call", "eval");
  }, /forbidden capability|nonzero/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    addFinding(scope, "unknown", "variable-child-process-command", "spawnSync");
  }, /forbidden capability|nonzero/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    addFinding(scope, "browser", "browser-launch-or-connect-call", "launch");
  }, /forbidden capability|catalog capability|nonzero/i);
});

test("pure snapshot validator rejects fully rehashed capability file omission duplication and hash drift", () => {
  const current = fixture();
  rejectFullyRehashedSnapshot(current, (scope) => {
    const command = scope.capabilityProofs.commands.find(
      ({ commandId }) => commandId === "static.prod-certification-unit"
    );
    command.files.pop();
  }, /capability file set|capability files/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    const command = scope.capabilityProofs.commands.find(
      ({ commandId }) => commandId === "static.prod-certification-unit"
    );
    command.files.push(clone(command.files[0]));
  }, /sorted and duplicate-free|capability files/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    const command = scope.capabilityProofs.commands.find(
      ({ commandId }) => commandId === "static.prod-certification-unit"
    );
    command.files[0].sourceSha256 = "7".repeat(64);
  }, /capability.*hash differs|source hash|proof-input hash|trusted-source hash/i);
});

test("execution scope rejects ordinary unhashed authorization and live-tree mutations", () => {
  const current = fixture();
  rejectMutation(current, (scope) => {
    scope.commandCatalog.allowedCommandIds.push("unknown.command");
  }, /fingerprint|rebuild|scope|catalog/i);
  rejectMutation(current, (scope) => {
    scope.commandCatalog.definitions.reverse();
  }, /fingerprint|rebuild|scope|catalog|sorted/i);
  rejectMutation(current, (scope) => {
    scope.sourceFingerprints[Object.keys(scope.sourceFingerprints)[0]] = "2".repeat(64);
  }, /fingerprint|rebuild|scope|proof/i);
  rejectMutation(current, (scope) => {
    scope.dependencyAttestationFingerprint = "3".repeat(64);
  }, /fingerprint|rebuild|scope|dependency/i);
});

test("pure snapshot validator rejects fully rehashed proof and command-policy forgeries", () => {
  const current = fixture();
  rejectFullyRehashedSnapshot(current, (scope) => {
    const removed = scope.proofInputs.files.pop();
    delete scope.sourceFingerprints[removed];
  }, /canonical manifest|proof-input/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.commandCatalog.allowedCommandIds[0] = "unknown.command";
    scope.commandCatalog.allowedCommandIds.sort();
  }, /canonical mode policy|allowed command/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.commandCatalog.typedSlots.servicePort.grammar = "anything";
  }, /deny\/slot|canonical policy/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.commandCatalog.definitions[0].argv.push({ kind: "literal", value: "; rm -rf /" });
  }, /canonical policy|command/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.commandCatalog.definitions[0].executable.unrecognized = true;
  }, /keys differ|executable/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.commandCatalog.definitions[0].modes = ["static-no-browser"];
  }, /canonical policy|command/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    const definition = scope.commandCatalog.definitions.find(
      ({ id }) => id === "static.prod-certification-unit"
    );
    definition.descriptorFingerprint = "8".repeat(64);
  }, /descriptor fingerprint|command/i);
});

test("pure snapshot validator rejects fully rehashed closure cross-link forgeries", () => {
  const current = fixture();
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.files.pop();
  }, /closure|entrypoint|import edge|capability file set/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.files.push(clone(scope.closure.files[0]));
    scope.closure.files.sort((left, right) => left.path.localeCompare(right.path));
  }, /sorted and duplicate-free|closure files/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.files[0].reachableFromCommandIds = ["unknown.command"];
  }, /reachability|unauthorized/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.files[0].sha256 = "1".repeat(64);
  }, /closure\/proof hash|fingerprint|hash differs/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.importEdges[0].to = "scripts/not-in-closure.mjs";
    scope.closure.importEdges.sort((left, right) =>
      JSON.stringify(stableValue(left)).localeCompare(JSON.stringify(stableValue(right))));
  }, /not closed|import edge/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    const edge = scope.closure.spawnEdges[0];
    edge.file = scope.closure.files.find(({ reachableFromCommandIds }) =>
      !reachableFromCommandIds.includes(edge.commandId)
      && !reachableFromCommandIds.some((id) =>
        scope.commandCatalog.definitions.find((definition) => definition.id === id)
          ?.maySpawnCommandIds.includes(edge.commandId)
      )
    ).path;
    scope.closure.spawnEdges.sort((left, right) =>
      JSON.stringify(stableValue(left)).localeCompare(JSON.stringify(stableValue(right))));
  }, /authorized parent|spawn edge/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.closure.files[0].extra = "forged";
  }, /keys differ|closure file/i);
});

test("pure snapshot validator rejects fully rehashed ledger partition and semantic forgeries", () => {
  const current = fixture();
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.destructiveLedger.outOfScopeEntries.pop();
  }, /partitions|ledger/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    const entry = scope.destructiveLedger.entries.find(
      ({ semanticClass }) => semanticClass === "dormant-package-script"
    );
    entry.disposition = "NO_IMPORT_OR_SPAWN_PATH_FROM_SCOPE";
    repartitionLedger(scope.destructiveLedger);
  }, /Dormant package script|disposition/i);
  rejectFullyRehashedSnapshot(current, (scope) => {
    scope.destructiveLedger.entries[0].unrecognized = true;
    repartitionLedger(scope.destructiveLedger);
  }, /keys differ|ledger entry/i);
});

test("snapshot-only validation never substitutes for a fresh live rebuild", () => {
  const current = fixture();
  const historical = clone(current.scope);
  assert.deepEqual(validateRequiredBrowserExecutionScopeSnapshot(historical), current.scope);
  historical.scopeFingerprint = "4".repeat(64);
  assert.throws(() => validateRequiredBrowserExecutionScopeSnapshot(historical), /fingerprint/i);
  const scopeSource = readFileSync(new URL("./required-browser-execution-scope.mjs", import.meta.url), "utf8");
  assert.match(scopeSource, /const shaped = validateRequiredBrowserExecutionScopeSnapshot\(scope\)/);
  assert.match(scopeSource, /const rebuilt = buildRequiredBrowserExecutionScope\(/);
  assert.match(scopeSource, /if \(!sameJson\(rebuilt, shaped\)\)/);
});
