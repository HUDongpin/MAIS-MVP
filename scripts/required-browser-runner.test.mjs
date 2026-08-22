import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { test } from "node:test";

import * as runner from "./run-required-frontend-browser-contracts.mjs";
import * as ownerPlan from "./playwright-owner-paths.mjs";
import {
  materializeSyntheticRequiredBrowserExecutionScope
} from "./active-browser-dependency-proof.test-helper.mjs";
import {
  attestPhysicalDependencyTree,
  compareInstalledLockToSource
} from "./provision-exact-browser-dependencies.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

function api(name) {
  assert.equal(typeof runner[name], "function", `${name} must be an exported runner contract`);
  return runner[name];
}

const fingerprints = {
  config: "a".repeat(64),
  helper: "b".repeat(64),
  keyboard: "c".repeat(64),
  lesson: "d".repeat(64),
  runner: "e".repeat(64),
  sourceGuard: "f".repeat(64)
};
const dependencyAttestationFingerprint = "9".repeat(64);

const expectedTests = [
  {
    family: "Bug 3 desktop lesson pane ownership",
    project: "desktop-chrome",
    title: "Learning Worlds lesson menu › Bug 3 desktop lesson pane contract first"
  },
  {
    family: "Bug 3 mobile lesson document flow",
    project: "mobile-chrome",
    title: "Learning Worlds lesson menu › Bug 3 mobile lesson flow contract first"
  },
  {
    allowedStatus: "skipped",
    family: "Practice math keyboard responsive layout",
    project: "mobile-chrome",
    title: "Practice math keyboard responsive layout gate › opening and closing in a lesson leaves the desktop directory fixed"
  }
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])])
  );
}

function withRecomputedProofFingerprint(value) {
  const clone = structuredClone(value);
  delete clone.attestationFingerprint;
  clone.attestationFingerprint = sha256(JSON.stringify(stableObject(clone)));
  return clone;
}

function withoutProofPath(value, pathParts) {
  const clone = structuredClone(value);
  let parent = clone;
  for (const part of pathParts.slice(0, -1)) parent = parent[part];
  delete parent[pathParts.at(-1)];
  return withRecomputedProofFingerprint(clone);
}

function dependencyAttestationFixture() {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const root = readTestFixtureCapabilityView(capability).definition.leaf;
  const repo = root;
  const tmp = path.join(repo, ".tmp");
  const nodeModules = path.join(repo, "node_modules");
  for (const directory of [repo, tmp, nodeModules]) mkdirSync(directory, { recursive: true });
  const dependencies = { next: "15.5.23" };
  const devDependencies = {
    "@playwright/test": "^1.59.1",
    postcss: "8.5.26"
  };
  const packageManifest = {
    dependencies,
    devDependencies,
    name: "synthetic-runner-attestation",
    private: true,
    version: "1.0.0"
  };
  const packages = {
    "": { dependencies, devDependencies, name: packageManifest.name, version: packageManifest.version },
    "node_modules/@playwright/test": {
      integrity: "sha512-synthetic-playwright-test",
      resolved: "https://registry.npmjs.org/@playwright/test/-/test-1.59.1.tgz",
      version: "1.59.1"
    },
    "node_modules/next": {
      integrity: "sha512-synthetic-next",
      resolved: "https://registry.npmjs.org/next/-/next-15.5.23.tgz",
      version: "15.5.23"
    },
    "node_modules/playwright": {
      integrity: "sha512-synthetic-playwright",
      resolved: "https://registry.npmjs.org/playwright/-/playwright-1.59.1.tgz",
      version: "1.59.1"
    },
    "node_modules/postcss": {
      integrity: "sha512-synthetic-postcss",
      resolved: "https://registry.npmjs.org/postcss/-/postcss-8.5.26.tgz",
      version: "8.5.26"
    }
  };
  const lockfile = {
    lockfileVersion: 3,
    name: packageManifest.name,
    packages,
    requires: true,
    version: packageManifest.version
  };
  writeFileSync(path.join(repo, "package.json"), `${JSON.stringify(packageManifest)}\n`, "utf8");
  writeFileSync(path.join(repo, "package-lock.json"), `${JSON.stringify(lockfile)}\n`, "utf8");
  writeFileSync(path.join(nodeModules, ".package-lock.json"), `${JSON.stringify(lockfile)}\n`, "utf8");
  const versions = {
    "@playwright/test": "1.59.1",
    next: "15.5.23",
    playwright: "1.59.1",
    postcss: "8.5.26"
  };
  for (const [name, version] of Object.entries(versions)) {
    const packageRoot = path.join(nodeModules, name);
    mkdirSync(packageRoot, { recursive: true });
    const manifest = name === "playwright" ? { main: "index.js", name, version } : { name, version };
    writeFileSync(path.join(packageRoot, "package.json"), `${JSON.stringify(manifest)}\n`, "utf8");
    if (name === "playwright") {
      writeFileSync(path.join(packageRoot, "index.js"), "module.exports = {};\n", "utf8");
    }
  }
  const cliRelativePaths = {
    next: "next/dist/bin/next",
    playwrightCore: "playwright/cli.js",
    playwrightTest: "@playwright/test/cli.js"
  };
  for (const relativePath of Object.values(cliRelativePaths)) {
    const absolute = path.join(nodeModules, relativePath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, "export default {};\n", "utf8");
  }
  const candidate = attestPhysicalDependencyTree(nodeModules);
  const comparison = compareInstalledLockToSource(lockfile, lockfile);
  assert.deepEqual(comparison.mismatches, []);
  const cliPaths = Object.fromEntries(Object.entries(cliRelativePaths).map(([label, relativePath]) => [
    label,
    { relativePath, sha256: sha256(readFileSync(path.join(nodeModules, relativePath))) }
  ]));
  const criticalPackages = Object.fromEntries(Object.entries(versions).map(([name, version]) => {
    const manifestRelativePath = `${name}/package.json`;
    return [name, {
      manifestRelativePath,
      manifestSha256: sha256(readFileSync(path.join(nodeModules, manifestRelativePath))),
      version
    }];
  }));
  const attemptRoot = path.join(tmp, `dependency-provision-${"a".repeat(64)}`);
  const evidenceRoot = path.join(attemptRoot, "evidence");
  mkdirSync(attemptRoot, { mode: 0o700 });
  mkdirSync(evidenceRoot, { mode: 0o700 });
  const activationPath = path.join(evidenceRoot, "activation-attestation.json");
  const activeTree = {
    cliPaths,
    comparison,
    installedLockSha256: sha256(readFileSync(path.join(nodeModules, ".package-lock.json"))),
    packages: criticalPackages,
    versions
  };
  const activation = {
    action: "requalified-and-activated-completed-install",
    activeTree,
    attemptId: `sha256:${"b".repeat(64)}`,
    candidate,
    npmLsJsonSha256: "c".repeat(64),
    postProcesses: {
      activeProfileCount: 0,
      foreignProfileCount: 0,
      ownedProfileCount: 0,
      ownerAssociatedCount: 0,
      tokenBearingCount: 0,
      violations: []
    },
    postSource: {
      packageLockSha256: sha256(readFileSync(path.join(repo, "package-lock.json"))),
      packageSha256: sha256(readFileSync(path.join(repo, "package.json")))
    },
    rollback: { preserved: true, previousRealpathClass: "starship-other-tree" },
    schemaVersion: 1,
    status: "passed",
    subprocesses: ["npm-ls-staged", "npm-ls-active"].map((phase) => ({
      completionReason: "exit-zero",
      endedAtObserved: true,
      exitStatus: 0,
      identityEstablished: true,
      phase,
      processOutcome: {
        survivorCount: 0,
        termination: { killSent: false, termSent: false }
      },
      signal: null,
      timedOut: false
    }))
  };
  writeFileSync(path.join(attemptRoot, ".mais-dependency-provision.json"), `${JSON.stringify({
    nonce: "a".repeat(64),
    packageLockSha256: activation.postSource.packageLockSha256,
    packageSha256: activation.postSource.packageSha256,
    repoRoot: repo,
    schemaVersion: 1,
    status: "active"
  }, null, 2)}\n`, { mode: 0o600 });
  writeFileSync(activationPath, `${JSON.stringify(activation, null, 2)}\n`, { mode: 0o600 });
  return {
    activationPath,
    cleanup: () => removeTestFixtureCapability(capability),
    nodeModules,
    repo
  };
}

function reportFor(tests = expectedTests, overrides = {}) {
  const nestedSuites = tests.map((entry) => {
    const titles = entry.title.split(" › ");
    const specTitle = titles.pop();
    let child = {
      specs: [{
        title: specTitle,
        tests: [{
          annotations: [],
          expectedStatus: entry.allowedStatus ?? "passed",
          projectName: entry.project,
          results: [{
            annotations: [],
            status: entry.allowedStatus ?? "passed"
          }]
        }]
      }],
      title: titles.pop() ?? ""
    };
    while (titles.length > 0) {
      child = { specs: [], suites: [child], title: titles.pop() };
    }
    return child;
  });
  return {
    config: {
      metadata: {
        dependencyAttestationFingerprint,
        requiredRunId: "bug3-owner-test",
        sourceFingerprints: fingerprints,
        ...overrides.metadata
      }
    },
    suites: [{ specs: [], suites: nestedSuites, title: "synthetic.spec.ts" }]
  };
}

function firstReportSpec(report) {
  const visit = (suites) => {
    for (const suite of suites ?? []) {
      if (suite.specs?.length) return suite.specs[0];
      const nested = visit(suite.suites);
      if (nested) return nested;
    }
    return undefined;
  };
  return visit(report.suites);
}

test("discovery uses only the line reporter and returns unique selected tuples", () => {
  const args = api("createDiscoveryArgs")(
    "desktop-chrome",
    {
      file: "tests/e2e/lesson-world-menu.spec.ts",
      grep: "Bug 3 desktop lesson pane contract"
    }
  );
  assert.deepEqual(args, [
    "test",
    "tests/e2e/lesson-world-menu.spec.ts",
    "--project=desktop-chrome",
    "--grep",
    "Bug 3 desktop lesson pane contract",
    "--list",
    "--reporter=line"
  ]);
  assert.equal(args.some((argument) => /json/i.test(argument)), false);

  const parsed = api("parseLineDiscovery")([
    "Listing tests:",
    "  [desktop-chrome] › lesson-world-menu.spec.ts:10:3 › Bug 3 desktop lesson pane contract first",
    "  [desktop-chrome] › lesson-world-menu.spec.ts:20:3 › Bug 3 desktop lesson pane contract second",
    "Total: 2 tests in 1 file"
  ].join("\n"), {
    family: "Bug 3 desktop lesson pane ownership",
    minimumSelected: 2,
    project: "desktop-chrome"
  });
  assert.deepEqual(parsed, [
    {
      family: "Bug 3 desktop lesson pane ownership",
      project: "desktop-chrome",
      title: "Bug 3 desktop lesson pane contract first"
    },
    {
      family: "Bug 3 desktop lesson pane ownership",
      project: "desktop-chrome",
      title: "Bug 3 desktop lesson pane contract second"
    }
  ]);
  assert.throws(
    () => api("parseLineDiscovery")([
      "  [desktop-chrome] › lesson-world-menu.spec.ts:10:3 › duplicate",
      "  [desktop-chrome] › lesson-world-menu.spec.ts:20:3 › duplicate",
      "Total: 2 tests in 1 file"
    ].join("\n"), {
      family: "family",
      minimumSelected: 2,
      project: "desktop-chrome"
    }),
    /duplicate/i
  );
});

test("final report requires exact run id, fingerprints, selected matrix, outcomes, and sole allowed skip", () => {
  const validate = api("validateFinalRequiredBrowserReport");
  const summary = validate(reportFor(), {
    dependencyAttestationFingerprint,
    expectedTests,
    fingerprints,
    runId: "bug3-owner-test"
  });
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.allowedSkipped, 1);
  assert.equal(summary.unexpectedSkippedOrFixme, 0);

  assert.throws(
    () => validate(reportFor(), {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints,
      runId: "bug3-owner-other"
    }),
    /run id/i
  );
  assert.throws(
    () => validate(reportFor(), {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints: { ...fingerprints, helper: "0".repeat(64) },
      runId: "bug3-owner-test"
    }),
    /fingerprint/i
  );
  assert.throws(
    () => validate(reportFor(), {
      dependencyAttestationFingerprint: "8".repeat(64),
      expectedTests,
      fingerprints,
      runId: "bug3-owner-test"
    }),
    /dependency attestation fingerprint/i
  );
  assert.throws(
    () => validate(reportFor(expectedTests.slice(0, 2)), {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints,
      runId: "bug3-owner-test"
    }),
    /omitted|missing/i
  );
  assert.throws(
    () => validate(reportFor([...expectedTests, {
      family: "extra",
      project: "desktop-chrome",
      title: "unexpected extra"
    }]), {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints,
      runId: "bug3-owner-test"
    }),
    /unexpected|extra/i
  );
  assert.throws(
    () => validate(reportFor([...expectedTests, expectedTests[0]]), {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints,
      runId: "bug3-owner-test"
    }),
    /duplicate/i
  );

  const disallowedSkip = structuredClone(reportFor());
  const disallowedSpec = firstReportSpec(disallowedSkip);
  assert.ok(disallowedSpec);
  disallowedSpec.tests[0].expectedStatus = "skipped";
  disallowedSpec.tests[0].results[0].status = "skipped";
  assert.throws(
    () => validate(disallowedSkip, {
      dependencyAttestationFingerprint,
      expectedTests,
      fingerprints,
      runId: "bug3-owner-test"
    }),
    /disallowed skip|unexpected skipped/i
  );
});

test("runner refuses caller-owned writable roots before discovery or spawn", () => {
  const reject = api("assertNoCallerOwnedWritableOverrides");
  for (const key of [
    "PLAYWRIGHT_OWNER_RUN_ROOT",
    "PLAYWRIGHT_RUN_PLAN_MANIFEST",
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_REPORT_DIR",
    "PLAYWRIGHT_REQUIRED_GENERATED_DIR",
    "PLAYWRIGHT_REQUIRED_CONFIG_PATH",
    "PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH",
    "HK_MATH_DB_PATH",
    "PLAYWRIGHT_SERVICE_LOG_PATH",
    "PLAYWRIGHT_SERVICE_PID_PATH",
    "PLAYWRIGHT_RUN_ID",
    "PLAYWRIGHT_SKIP_WEBSERVER",
    "PLAYWRIGHT_BASE_URL",
    "PLAYWRIGHT_PORT",
    "PLAYWRIGHT_BROWSER_CHANNEL",
    "MAIS_BROWSER_OWNER_TOKEN"
  ]) {
    assert.throws(() => reject({ [key]: "/unsafe" }), new RegExp(key));
  }
  assert.doesNotThrow(() => reject({
    HOME: "/ambient-home",
    TMPDIR: "/ambient-tmp",
    TMP: "/ambient-tmp",
    TEMP: "/ambient-tmp",
    XDG_CACHE_HOME: "/ambient-cache"
  }));
});

test("browser-capable child commands resolve only authenticated local descriptors", () => {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability, {
    mode: "required-matrix"
  });
  const cwd = path.join(executionFixture.repoRoot, "cwd");
  const homeDir = path.join(executionFixture.repoRoot, "home");
  const osTempDir = path.join(executionFixture.repoRoot, "os-tmp");
  for (const directory of [cwd, homeDir, osTempDir]) mkdirSync(directory, { recursive: true });
  try {
    const plan = ownerPlan.createValidatedRunPlan({
      cwd,
      dependencyAttestation: executionFixture.dependencyAttestation,
      executionScope: executionFixture.executionScope,
      homeDir,
      nonce: capability.nonce,
      osTempDir,
      repoRoot: executionFixture.repoRoot,
      sourceFingerprints: executionFixture.sourceFingerprints
    });
    ownerPlan.bootstrapValidatedRunPlan(plan);
    ownerPlan.materializeValidatedRunPlan(plan, {
      fingerprints: executionFixture.sourceFingerprints
    });
    const materializedPlan = ownerPlan.validateMaterializedRunPlan(plan);
    const commandSet = api("resolveOwnedBrowserCommands")({
      dependencyAttestation: materializedPlan.dependencyAttestation,
      executionScope: materializedPlan.executionScope,
      plan: materializedPlan,
      repoRoot: materializedPlan.repoRoot
    });
    const build = commandSet.resolve("owner.next.build");
    const service = commandSet.resolve("owner.next.service", {
      servicePort: materializedPlan.servicePort
    });
    const playwright = commandSet.resolve("owner.playwright.final", {
      requiredConfig: materializedPlan.paths.requiredConfig
    });
    assert.equal(build.command, realpathSync(process.execPath));
    assert.equal(service.command, realpathSync(process.execPath));
    assert.equal(playwright.command, realpathSync(process.execPath));
    assert.match(build.args[0], /node_modules\/next\/dist\/bin\/next$/);
    assert.deepEqual(build.args.slice(1), ["build"]);
    assert.deepEqual(service.args.slice(-2), ["--port", String(materializedPlan.servicePort)]);
    assert.match(playwright.args[0], /node_modules\/@playwright\/test\/cli\.js$/);
    assert.deepEqual(
      playwright.args.slice(1),
      ["test", "--config", materializedPlan.paths.requiredConfig]
    );
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("synthetic execution-scope fixture materializes exact repository-local tsx and TypeScript CLIs", () => {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability, {
    mode: "static-no-browser"
  });
  const cwd = path.join(executionFixture.repoRoot, "cwd");
  const homeDir = path.join(executionFixture.repoRoot, "home");
  const osTempDir = path.join(executionFixture.repoRoot, "os-tmp");
  for (const directory of [cwd, homeDir, osTempDir]) mkdirSync(directory, { recursive: true });
  try {
    const plan = ownerPlan.createValidatedRunPlan({
      cwd,
      dependencyAttestation: executionFixture.dependencyAttestation,
      executionScope: executionFixture.executionScope,
      homeDir,
      nonce: capability.nonce,
      osTempDir,
      repoRoot: executionFixture.repoRoot,
      sourceFingerprints: executionFixture.sourceFingerprints
    });
    ownerPlan.bootstrapValidatedRunPlan(plan);
    ownerPlan.materializeValidatedRunPlan(plan, {
      fingerprints: executionFixture.sourceFingerprints
    });
    const materializedPlan = ownerPlan.validateMaterializedRunPlan(plan);
    const commandSet = api("resolveOwnedBrowserCommands")({
      dependencyAttestation: materializedPlan.dependencyAttestation,
      executionScope: materializedPlan.executionScope,
      plan: materializedPlan,
      repoRoot: materializedPlan.repoRoot
    });
    const sourceRegressions = commandSet.resolve("static.source-regressions");
    const typeCheck = commandSet.resolve("static.type-check");
    assert.equal(sourceRegressions.command, realpathSync(process.execPath));
    assert.equal(typeCheck.command, realpathSync(process.execPath));
    assert.match(sourceRegressions.args[0], /node_modules\/tsx\/dist\/cli\.mjs$/);
    assert.match(typeCheck.args[0], /node_modules\/typescript\/bin\/tsc$/);
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("runner independently binds the active physical dependency tree and activation evidence", () => {
  const scope = dependencyAttestationFixture();
  try {
    const collect = api("collectActiveBrowserDependencyAttestation");
    const assertUnchanged = api("assertActiveBrowserDependencyAttestationUnchanged");
    const attestation = collect(scope.repo);
    assert.equal(attestation.schemaVersion, 2);
    assert.equal(attestation.status, "passed");
    assert.equal(attestation.nodeModules.relativePath, "node_modules");
    assert.equal(attestation.nodeModules.physical, true);
    assert.match(attestation.nodeModules.proof.inventorySha256, /^[a-f0-9]{64}$/);
    assert.equal(attestation.nodeModules.canonicalRoot, scope.nodeModules);
    assert.deepEqual(attestation.critical.actualVersions, {
      "@playwright/test": "1.59.1",
      next: "15.5.23",
      playwright: "1.59.1",
      postcss: "8.5.26"
    });
    assert.deepEqual(attestation.critical.expectedVersions, attestation.critical.actualVersions);
    assert.equal(attestation.comparator.mismatchCount, 0);
    assert.equal(attestation.source.lockfileVersion, 3);
    assert.equal(attestation.npmLs.exitStatus, 0);
    assert.equal(attestation.npmLs.phase, "npm-ls-active");
    assert.equal(attestation.packageInstances.count, 4);
    assert.match(attestation.packageInstances.sha256, /^[a-f0-9]{64}$/);
    assert.match(attestation.optionalPlatform.rootsSha256, /^[a-f0-9]{64}$/);
    assert.match(attestation.optionalPlatform.closureSha256, /^[a-f0-9]{64}$/);
    assert.equal(attestation.resolution.nodePathAbsent, true);
    assert.equal(attestation.resolution.sharedFallback, false);
    assert.match(attestation.activation.evidenceSha256, /^[a-f0-9]{64}$/);
    assert.match(attestation.attestationFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(Object.isFrozen(attestation), true);
    assert.doesNotThrow(() => assertUnchanged(scope.repo, attestation));

    const validate = api("validateActiveBrowserDependencyProof");
    const mandatoryPaths = [
      ["activation"],
      ["activation", "evidenceSha256"],
      ["comparator"],
      ["comparator", "comparisonSha256"],
      ["critical"],
      ["critical", "actualVersions"],
      ["critical", "clis"],
      ["critical", "manifests"],
      ["nodeModules"],
      ["nodeModules", "canonicalRoot"],
      ["nodeModules", "identity"],
      ["nodeModules", "proof"],
      ["npmLs"],
      ["npmLs", "resultSha256"],
      ["optionalPlatform"],
      ["optionalPlatform", "closure"],
      ["optionalPlatform", "roots"],
      ["packageInstances"],
      ["packageInstances", "entries"],
      ["repoRoot"],
      ["resolution"],
      ["source"],
      ["source", "installedLockSha256"],
      ["source", "lockfileVersion"],
      ["source", "packageLockSha256"],
      ["source", "packageSha256"],
      ["status"]
    ];
    for (const proofPath of mandatoryPaths) {
      assert.throws(
        () => validate(withoutProofPath(attestation, proofPath), { repoRoot: scope.repo }),
        /dependency|proof|omitted|invalid|missing/i,
        proofPath.join(".")
      );
    }
    const forgedMismatch = structuredClone(attestation);
    forgedMismatch.comparator.mismatchCount = 1;
    assert.throws(
      () => validate(withRecomputedProofFingerprint(forgedMismatch), { repoRoot: scope.repo }),
      /comparator|exact/i
    );
    const forgedNodePath = structuredClone(attestation);
    forgedNodePath.resolution.nodePathAbsent = false;
    forgedNodePath.resolution.nodePathValueHash = "1".repeat(64);
    assert.throws(
      () => validate(withRecomputedProofFingerprint(forgedNodePath), { repoRoot: scope.repo }),
      /fallback|NODE_PATH|resolution/i
    );

    writeFileSync(
      path.join(scope.nodeModules, "@playwright", "test", "cli.js"),
      "export default { drift: true };\n",
      "utf8"
    );
    assert.throws(
      () => assertUnchanged(scope.repo, attestation),
      /dependency|activation|inventory|drift|CLI/i
    );
  } finally {
    scope.cleanup();
  }
});

test("main binds dependency and live execution scope before its first write and retains terminal bindings", () => {
  const source = readFileSync(
    path.join(process.cwd(), "scripts/run-required-frontend-browser-contracts.mjs"),
    "utf8"
  );
  const mainSource = source.slice(source.indexOf("async function main()"));
  const attestationIndex = mainSource.indexOf(
    "const dependencyPre = collectActiveBrowserDependencyAttestation(repoRoot);"
  );
  const scopeBuildIndex = mainSource.indexOf("buildRequiredBrowserExecutionScope({");
  const scopeLiveIndex = mainSource.indexOf(
    "const executionScopePre = assertLiveRequiredBrowserExecutionScope("
  );
  const planIndex = mainSource.indexOf("const plan = createValidatedRunPlan({");
  const bootstrapIndex = mainSource.indexOf("bootstrapValidatedRunPlan(plan);");
  for (const index of [
    attestationIndex,
    scopeBuildIndex,
    scopeLiveIndex,
    planIndex,
    bootstrapIndex
  ]) {
    assert.notEqual(index, -1);
  }
  assert.equal(attestationIndex < scopeBuildIndex, true);
  assert.equal(scopeBuildIndex <= scopeLiveIndex, true);
  assert.equal(scopeLiveIndex < planIndex, true);
  assert.equal(planIndex < bootstrapIndex, true);
  assert.match(mainSource, /dependencyAttestation:\s*dependencyPre/);
  assert.match(mainSource, /executionScope:\s*executionScopePre/);
  assert.match(
    mainSource,
    /resolveOwnedBrowserCommands\(\{[\s\S]*?dependencyAttestation:\s*materializedPlan\.dependencyAttestation[\s\S]*?executionScope:\s*materializedPlan\.executionScope[\s\S]*?plan:\s*materializedPlan[\s\S]*?repoRoot:\s*materializedPlan\.repoRoot[\s\S]*?\}\)/
  );
  assert.match(mainSource, /validateMaterializedRunPlan\(plan\)/);
  assert.match(
    mainSource,
    /executionScope:\s*\{[\s\S]*?post:\s*executionScopePost[\s\S]*?pre:\s*plan\.executionScope/
  );
  assert.match(
    mainSource,
    /expectedExecutionScopeFingerprint:\s*plan\.executionScope\.scopeFingerprint/
  );
  assert.match(mainSource, /manifest,[\s\S]*?repoRoot:\s*plan\.repoRoot/);
  assert.doesNotMatch(mainSource, /if \(existsSync\(plan\.evidenceRoot\)\)/);
  assert.match(mainSource, /writeTerminalSummaryWithFailureFallback\(plan, finalSummary\)/);
});

test("declared proof inputs cover every Bug 1, Bug 3, and Bug 15 runtime and gate dependency", () => {
  const declared = new Set(runner.declaredProofInputFiles);
  const required = [
    "app/api/assessments/[assessmentId]/submit/route.ts",
    "app/api/attempts/route.ts",
    "app/student/assessments/[assessmentId]/page.tsx",
    "components/lesson/LessonView.tsx",
    "components/practice/HandwritingAnswerBoard.tsx",
    "components/practice/MathSoftKeyboard.tsx",
    "components/practice/PracticeQuestionCard.tsx",
    "lib/answerLimits.ts",
    "lib/answerUnits.ts",
    "lib/exactScalarArithmetic.ts",
    "lib/mathSoftKeyboardCalculation.ts",
    "lib/questionBankSolvability.ts",
    "lib/server/answerMatching.ts",
    "lib/server/questionStore.ts",
    "lib/server/userStore/teacherOpsSubmissionPersistence.ts",
    "tests/e2e/practice-math-keyboard.spec.ts",
    "tests/e2e/lesson-world-menu.spec.ts",
    "tests/e2e/visualization-contract.spec.ts",
    "tests/e2e/helpers.ts",
    "components/visualizations/visualizationDiagnostics.ts",
    "data/visualizationLabs.ts",
    "playwright.config.ts",
    "scripts/active-browser-dependency-proof.mjs",
    "scripts/active-browser-dependency-proof.test-helper.mjs",
    "scripts/browser-host-geometry.mjs",
    "scripts/playwright-owner-paths.mjs",
    "scripts/provision-exact-browser-dependencies.mjs",
    "scripts/required-browser-source-canary.test.mjs",
    "scripts/run-required-frontend-browser-contracts.mjs",
    "scripts/test-fixture-capability.mjs",
    "scripts/test-fixture-capability.test.mjs",
    "tests/e2e/reported-bug-source-regressions.test.ts",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
    "postcss.config.mjs",
    "tailwind.config.ts"
  ];
  for (const file of required) assert.equal(declared.has(file), true, file);

  const fingerprints = api("sourceFingerprints")(process.cwd());
  assert.deepEqual(Object.keys(fingerprints).sort(), [...declared].sort());
  assert.doesNotThrow(() => api("assertSourceFingerprintsUnchanged")(
    process.cwd(),
    fingerprints
  ));
  const omitted = { ...fingerprints };
  delete omitted[required[0]];
  assert.throws(
    () => api("assertSourceFingerprintsUnchanged")(process.cwd(), omitted),
    /omission|drift|fingerprint/i
  );
});

test("repository browser launch source canary rejects every active unguarded or CI launch escape", () => {
  const collected = api("collectRepositoryBrowserLaunchSources")(process.cwd());
  assert.equal("scripts/required-browser-runner.test.mjs" in collected, true);
  assert.equal("tests/e2e/practice-math-keyboard.spec.ts" in collected, true);
  assert.doesNotThrow(() => api("validateBrowserLaunchSources")(collected));

  const directLaunch = `${["chromium", "launch"].join(".")}();`;
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      "scripts/unsafe.mjs": `import { chromium } from 'playwright'; ${directLaunch}`
    }),
    /direct|authenticated|owner runner|launch/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      "scripts/dead-guard.mjs": [
        "import { chromium } from 'playwright';",
        "function neverCalled() { assertCanonicalStarshipBrowserHost(); }",
        directLaunch
      ].join("\n")
    }),
    /direct|authenticated|owner runner|launch/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      "scripts/second-launch.mjs": [
        "assertCanonicalStarshipBrowserHost();",
        directLaunch,
        `function later() { ${directLaunch} }`
      ].join("\n")
    }),
    /direct|authenticated|owner runner|launch/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      ".github/workflows/unsafe.yml": "run: npx playwright test"
    }),
    /workflow|browser|Playwright/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      ".github/workflows/unsafe.yml": "uses: actions/upload-artifact@v4"
    }),
    /upload|artifact|workflow/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      "components/unsafe-command-packet.ts": "export const command = 'npx playwright test unsafe.spec.ts';"
    }),
    /direct|Playwright|command/i
  );
  assert.throws(
    () => api("validateBrowserLaunchSources")({
      "scripts/unsafe-array.mjs": "spawnSync('npx', ['playwright', 'test', 'unsafe.spec.ts']);"
    }),
    /direct|Playwright|command/i
  );

  const aliasAndIndirectEscapes = [
    [
      "tests/aliased-import.spec.ts",
      "import { chromium as browserType } from 'playwright'; browserType.launch();"
    ],
    [
      "tests/local-alias.spec.ts",
      "import { chromium } from 'playwright'; const browserType = chromium; browserType.launch();"
    ],
    [
      "tests/nested-receiver.spec.ts",
      "import * as pw from 'playwright'; pw.chromium.launch();"
    ],
    [
      "tests/computed-launch.spec.ts",
      "import { chromium } from 'playwright'; chromium['launch']();"
    ],
    [
      "tests/indirect-exec.spec.ts",
      "import { execFileSync } from 'node:child_process'; const run = execFileSync; const cli = '/repo/node_modules/@playwright/test/cli.js'; run(process.execPath, [cli, 'test', 'unsafe.spec.ts']);"
    ],
    [
      "tests/indirect-spawn.spec.ts",
      "import { spawnSync } from 'node:child_process'; const run = spawnSync; const tool = 'npx'; const args = ['playwright', 'test', 'unsafe.spec.ts']; run(tool, args);"
    ],
    [
      "scripts/unsafe_playwright.py",
      "from playwright.sync_api import sync_playwright\npw = sync_playwright().start()\nbrowser_type = pw.chromium\nbrowser_type.launch()\n"
    ],
    [
      "tests/member-require.spec.ts",
      "const engine = require('playwright').chromium; engine.launch();"
    ],
    [
      "tests/dynamic-namespace.spec.ts",
      "const pw = await import('playwright'); await pw.chromium.launch();"
    ],
    [
      "tests/dynamic-member.spec.ts",
      "const { chromium: engine } = await import('@playwright/test'); await engine.launch();"
    ],
    [
      "tests/dynamic-direct-member.spec.ts",
      "await (await import('playwright')).chromium.launch();"
    ],
    [
      "tests/default-child-process.spec.ts",
      "import childProcess from 'node:child_process'; const tool = 'playwright'; const mode = 'test'; childProcess.spawnSync(tool, [mode, 'unsafe.spec.ts']);"
    ],
    [
      "tests/dynamic-child-process.spec.ts",
      "const childProcess = await import('node:child_process'); const command = ['playwright', 'test', 'unsafe.spec.ts']; childProcess.default.execFileSync(command[0], command.slice(1));"
    ],
    [
      "tests/dynamic-direct-child-process.spec.ts",
      "const command = ['playwright', 'test', 'unsafe.spec.ts']; (await import('node:child_process')).execFileSync(command[0], command.slice(1));"
    ],
    [
      "scripts/unsafe-variable.sh",
      "tool=playwright\nmode=test\n\"$tool\" \"$mode\" unsafe.spec.ts\n"
    ],
    [
      "scripts/unsafe_variable.py",
      "import subprocess\ntool = 'playwright'\nmode = 'test'\nsubprocess.run([tool, mode, 'unsafe.spec.ts'])\n"
    ]
  ];
  for (const [file, source] of aliasAndIndirectEscapes) {
    assert.throws(
      () => api("validateBrowserLaunchSources")({ [file]: source }),
      /direct|Playwright|browser|launch|command/i,
      file
    );
  }
});

test("spawn-owned identities require immutable start time, process group, ancestry, and root signature", () => {
  const parse = api("parseOwnedProcessSnapshot");
  const rootCommand = `${process.execPath} /Volumes/Starship/repo/node_modules/next/dist/bin/next start --port 3210`;
  const rows = parse([
    `700 699 700 Mon Aug 11 10:00:00 2026 ${rootCommand}`,
    "701 700 700 Mon Aug 11 10:00:01 2026 next-server (v15.5.23)",
    "702 701 700 Mon Aug 11 10:00:02 2026 helper-child"
  ].join("\n"));
  const root = api("createSpawnOwnedIdentity")({
    expectedParentPid: 699,
    label: "service",
    requireOwnProcessGroup: true,
    row: rows[0],
    signatureFragments: ["node_modules/next/dist/bin/next", "start", "--port", "3210"]
  });
  const refreshed = api("refreshSpawnOwnedRegistry")(
    new Map([[root.pid, root]]),
    rows
  );
  assert.deepEqual([...refreshed.registry.keys()].sort(), [700, 701, 702]);
  assert.deepEqual(
    api("planVerifiedSignalOrder")(refreshed.registry, rows).map(({ pid }) => pid),
    [702, 701, 700]
  );

  const reparented = parse([
    "701 1 700 Mon Aug 11 10:00:01 2026 next-server (v15.5.23)",
    "702 701 700 Mon Aug 11 10:00:02 2026 helper-child"
  ].join("\n"));
  const afterReparent = api("refreshSpawnOwnedRegistry")(refreshed.registry, reparented);
  assert.deepEqual(afterReparent.liveVerified.map(({ pid }) => pid).sort(), [701, 702]);

  const reused = parse("701 1 700 Mon Aug 11 10:30:01 2026 foreign-process");
  const afterReuse = api("refreshSpawnOwnedRegistry")(refreshed.registry, reused);
  assert.deepEqual(afterReuse.liveVerified, []);
  assert.equal(afterReuse.identityMismatches.length, 1);
  assert.deepEqual(afterReuse.identityMismatches[0], {
    classification: "identity-mismatch",
    label: "service",
    pid: 701,
    ppid: 1
  });
});

test("fast-exit spawns still require a proven identity and token-bearing orphans are unproven", () => {
  assert.throws(
    () => api("assertSpawnOwnedIdentityEstablished")(null, {
      endedAt: "2026-08-11T12:00:00.000Z",
      label: "fast-exit"
    }),
    /identity.*established|proven identity/i
  );

  const ownerRoot = `/Volumes/Starship/repo/.tmp/bug3-owner-${"a".repeat(64)}`;
  const rows = api("parseOwnedProcessSnapshot")([
    "901 1 901 Mon Aug 11 12:00:00 2026 next-server (v15.5.23)",
    `902 1 902 Mon Aug 11 12:00:01 2026 node worker --state=${ownerRoot}/ephemeral/state`
  ].join("\n"));
  assert.deepEqual(
    api("classifyUnprovenOwnerProcesses")(
      { ownerRoot },
      rows,
      { tokenBearingPids: new Set([901]), verifiedPids: new Set() }
    ),
    [
      { classification: "owner-token-unproven", pid: 901, ppid: 1 },
      { classification: "owner-root-unproven", pid: 902, ppid: 1 }
    ]
  );
});

test("service PID evidence corroborates but never creates signal authority", () => {
  const identity = {
    label: "service",
    pgid: 800,
    pid: 800,
    startedAt: "Mon Aug 11 11:00:00 2026"
  };
  assert.deepEqual(api("verifyServicePidEvidenceText")("800\n", identity), {
    signalAuthority: false,
    status: "matched"
  });
  assert.deepEqual(api("verifyServicePidEvidenceText")("900\n", identity), {
    signalAuthority: false,
    status: "mismatch"
  });
  assert.deepEqual(api("verifyServicePidEvidenceText")("not-a-pid", identity), {
    signalAuthority: false,
    status: "malformed"
  });
});

test("unsafe process samples are sanitized and persisted before assertion", () => {
  const events = [];
  const plan = {
    ownerRoot: "/Volumes/Starship/repo/.tmp/bug3-owner-safe",
    paths: { tmpDir: "/Volumes/Starship/repo/.tmp/bug3-owner-safe/ephemeral/temp" }
  };
  const audit = {
    capturedAt: "2026-08-11T12:00:00.000Z",
    foreignProfiles: ["/private/tmp/playwright_chromiumdev_profile-sk_live_secret_123"],
    identityMismatches: [{
      classification: "identity-mismatch",
      label: "service",
      pid: 11,
      ppid: 1
    }],
    ownedProcesses: [{ command: "TOKEN=do-not-retain node", pid: 10, ppid: 1 }],
    ownedProfiles: [],
    profilePaths: ["/private/tmp/playwright_chromiumdev_profile-sk_live_secret_123"],
    relevantProcesses: [{ command: "TOKEN=do-not-retain node", pid: 10, ppid: 1 }],
    unprovenOwnerProcesses: [{
      classification: "owner-token-unproven",
      pid: 12,
      ppid: 1
    }]
  };
  assert.throws(
    () => api("persistSanitizedProcessAuditSample")(
      plan,
      [],
      "live",
      audit,
      (evidence) => events.push(evidence)
    ),
    /foreign Playwright profile/i
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].foreignProfileCount, 1);
  assert.equal(events[0].violationCode, "FOREIGN_PLAYWRIGHT_PROFILE");
  assert.deepEqual(events[0].processes, [
    { classification: "spawn-owned", pid: 10, ppid: 1 },
    { classification: "identity-mismatch", pid: 11, ppid: 1 },
    { classification: "owner-token-unproven", pid: 12, ppid: 1 }
  ]);
  assert.doesNotMatch(
    JSON.stringify(events[0]),
    /private|do-not-retain|command|sk_live_secret_123/i
  );
});

test("transient process-safety violations remain sticky after later clean samples", () => {
  const state = { registry: new Map(), safetyViolations: new Set() };
  const record = api("recordStickyProcessSafetyViolations");
  assert.deepEqual(record(state, {
    foreignProfileCount: 1,
    identityMismatchCount: 0
  }), ["FOREIGN_PLAYWRIGHT_PROFILE"]);
  assert.deepEqual(record(state, {
    foreignProfileCount: 0,
    identityMismatchCount: 1
  }), ["FOREIGN_PLAYWRIGHT_PROFILE", "PROCESS_IDENTITY_MISMATCH"]);
  assert.deepEqual(record(state, {
    foreignProfileCount: 0,
    identityMismatchCount: 0,
    violationCode: "SERVICE_PID_EVIDENCE_MISMATCH"
  }), [
    "FOREIGN_PLAYWRIGHT_PROFILE",
    "PROCESS_IDENTITY_MISMATCH",
    "SERVICE_PID_EVIDENCE_MISMATCH"
  ]);
  assert.deepEqual(record(state, {
    foreignProfileCount: 0,
    identityMismatchCount: 0
  }), [
    "FOREIGN_PLAYWRIGHT_PROFILE",
    "PROCESS_IDENTITY_MISMATCH",
    "SERVICE_PID_EVIDENCE_MISMATCH"
  ]);
});

test("bounded process-audit evidence preserves the first transient violation after overflow", () => {
  const append = api("appendBoundedProcessAuditEvidence");
  const collection = [];
  for (let index = 0; index < 400; index += 1) {
    append(collection, {
      activeProfileCount: 0,
      capturedAt: new Date(1_700_000_000_000 + index).toISOString(),
      eventType: "process-sample",
      foreignProfileCount: 0,
      identityMismatchCount: 0,
      ownedProfileCount: 0,
      phase: `safe-${index}`,
      processes: [],
      profiles: [],
      violationCode: null
    });
  }
  append(collection, {
    activeProfileCount: 1,
    capturedAt: "2026-08-11T12:30:00.000Z",
    eventType: "process-sample",
    foreignProfileCount: 1,
    identityMismatchCount: 0,
    ownedProfileCount: 0,
    phase: "first-unsafe",
    processes: [],
    profiles: [{ classification: "foreign", profile: "[FOREIGN_PROFILE]" }],
    violationCode: "FOREIGN_PLAYWRIGHT_PROFILE"
  });
  assert.equal(collection.length <= 256, true);
  assert.equal(
    collection.some(({ phase, violationCode }) =>
      phase === "first-unsafe" && violationCode === "FOREIGN_PLAYWRIGHT_PROFILE"
    ),
    true
  );
  const overflow = collection.find(({ eventType }) => eventType === "process-sample-overflow");
  assert.ok(overflow);
  assert.equal(overflow.omittedSampleCount > 0, true);
});

test("bounded subprocess logs redact split secrets before 0600 persistence and mark truncation", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const root = readTestFixtureCapabilityView(capability).definition.leaf;
  try {
    const logPath = path.join(root, "playwright.log");
    const log = api("createBoundedRedactedLog")(logPath, { maxBytes: 160 });
    log.append("Authorization: Bea");
    log.append("rer split-secret-value\n");
    log.append(`API_TOKEN=sk_live_secret_123 ${"x".repeat(500)}`);
    const result = log.close();
    const retained = readFileSync(logPath, "utf8");
    assert.equal(statSync(logPath).mode & 0o777, 0o600);
    assert.equal(statSync(logPath).size <= 160, true);
    assert.doesNotMatch(retained, /split-secret-value|sk_live_secret_123/);
    assert.match(retained, /\[REDACTED\]/);
    assert.match(retained, /LOG_TRUNCATED/);
    assert.equal(result.truncated, true);
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("every terminal summary uses one validated mode/schema with dependency, scope, manifest, subprocess, and JSON evidence", () => {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability);
  try {
    const manifestPath = path.join(
      executionFixture.repoRoot,
      ".tmp",
      "synthetic-preflight-manifest.json"
    );
    const manifestSha256 = "7".repeat(64);
    const summary = {
      cleanup: { status: "passed" },
      dependencyAttestation: {
        post: executionFixture.dependencyAttestation,
        pre: executionFixture.dependencyAttestation,
        status: "matched"
      },
      evidence: {
        hashes: {
          preflightManifest: {
            path: manifestPath,
            required: true,
            sha256: manifestSha256,
            status: "present"
          }
        },
        missingRequired: [],
        paths: {
          preflightManifest: manifestPath,
          validatedSummary: path.join(
            executionFixture.repoRoot,
            ".tmp",
            "validated-summary.json"
          )
        }
      },
      executionScope: {
        post: executionFixture.executionScope,
        pre: executionFixture.executionScope,
        status: "matched"
      },
      expectedExecutionScopeFingerprint: executionFixture.executionScope.scopeFingerprint,
      expectedTests: [],
      failedPhase: null,
      fingerprints: executionFixture.sourceFingerprints,
      jsonReport: {
        expected: false,
        path: path.join(executionFixture.repoRoot, ".tmp", "final-results.json"),
        status: "not-required"
      },
      manifest: {
        executionScopeFingerprint: executionFixture.executionScope.scopeFingerprint,
        path: manifestPath,
        planFingerprint: "1".repeat(64),
        sha256: manifestSha256,
        status: "present"
      },
      mode: "discovery",
      planFingerprint: "1".repeat(64),
      processes: [{
        completionReason: "natural-exit",
        endedAt: "2026-08-11T12:01:00.000Z",
        endedAtObserved: true,
        exitCode: 0,
        label: "discovery",
        logPath: path.join(executionFixture.repoRoot, ".tmp", "playwright.log"),
        signal: null,
        spawnError: null,
        startedAt: "2026-08-11T12:00:00.000Z",
        termination: { killSent: false, termSent: false },
        timeoutReason: null,
        timedOut: false
      }],
      repoRoot: executionFixture.repoRoot,
      runId: "bug3-owner-test",
      schemaVersion: 1,
      shutdownClean: true,
      status: "passed"
    };
    const validate = api("validateTerminalSummary");
    assert.deepEqual(validate(summary), summary);
    const captureFailure = {
      message: "sanitized capture failure",
      name: "Error"
    };
    const failedDependencySummary = {
      ...summary,
      dependencyAttestation: {
        failure: captureFailure,
        post: null,
        pre: summary.dependencyAttestation.pre,
        status: "failed"
      },
      executionScope: {
        failure: captureFailure,
        post: null,
        pre: summary.executionScope.pre,
        status: "failed"
      },
      failedPhase: "post-run-dependency-attestation",
      failure: captureFailure,
      status: "failed"
    };
    assert.deepEqual(validate(failedDependencySummary), failedDependencySummary);
    assert.throws(
      () => validate({ ...summary, dependencyAttestation: undefined }),
      /dependency|attestation|schema/i
    );
    assert.throws(
      () => validate({ ...summary, executionScope: undefined }),
      /scope|schema/i
    );
    assert.throws(
      () => validate({ ...summary, manifest: undefined }),
      /manifest|schema/i
    );
    assert.throws(() => validate({ ...summary, mode: undefined }), /mode|schema/i);
    assert.throws(
      () => validate({ ...summary, repoRoot: undefined }),
      /repo|scope|schema/i
    );
    assert.throws(() => validate({ ...summary, processes: undefined }), /process|schema/i);
    assert.throws(
      () => validate({
        ...summary,
        processes: [{ ...summary.processes[0], endedAtObserved: undefined }]
      }),
      /process|outcome|schema/i
    );
    assert.throws(
      () => validate({
        ...summary,
        jsonReport: { ...summary.jsonReport, status: "missing" },
        status: "passed"
      }),
      /JSON|status|schema/i
    );
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("evidence hashing retains every present hash and records each required missing path", () => {
  const capability = createTestFixtureCapability(process.cwd());
  const root = readTestFixtureCapabilityView(capability).definition.leaf;
  try {
    const finalReport = path.join(root, "final-report");
    mkdirSync(finalReport);
    writeFileSync(path.join(finalReport, "index.html"), "retained", "utf8");
    const pathAudit = path.join(root, "path-audit.json");
    writeFileSync(pathAudit, "{}", "utf8");
    const plan = {
      evidencePaths: {
        buildLog: path.join(root, "missing-build.log"),
        finalReport,
        finalResults: path.join(root, "missing-results.json"),
        pathAudit,
        playwrightLog: path.join(root, "missing-playwright.log"),
        preflightManifest: path.join(root, "missing-preflight.json"),
        processAudit: path.join(root, "missing-process.json"),
        serviceLog: path.join(root, "missing-service.log")
      }
    };
    const evidence = api("collectEvidenceHashes")(plan, { requireFinal: true });
    assert.equal(evidence.entries.pathAudit.status, "present");
    assert.match(evidence.entries.pathAudit.sha256, /^[a-f0-9]{64}$/);
    assert.equal(evidence.entries.finalReport.status, "present");
    assert.equal(evidence.entries.buildLog.status, "missing");
    assert.equal(evidence.entries.buildLog.required, true);
    assert.equal(evidence.missingRequired.includes("buildLog"), true);
    assert.equal(evidence.missingRequired.includes("pathAudit"), false);
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("terminal summary is atomically written, read back, and schema-validated", () => {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const root = readTestFixtureCapabilityView(capability).definition.leaf;
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability);
  const repoRoot = executionFixture.repoRoot;
  const cwd = path.join(root, "cwd");
  const homeDir = path.join(root, "home");
  const osTempDir = path.join(root, "os-tmp");
  const nonce = capability.nonce;
  for (const directory of [path.join(repoRoot, ".tmp"), cwd, homeDir, osTempDir]) {
    mkdirSync(directory, { recursive: true });
  }
  try {
    const plan = ownerPlan.createValidatedRunPlan({
      cwd,
      dependencyAttestation: executionFixture.dependencyAttestation,
      executionScope: executionFixture.executionScope,
      homeDir,
      nonce,
      osTempDir,
      repoRoot,
      sourceFingerprints: executionFixture.sourceFingerprints
    });
    ownerPlan.bootstrapValidatedRunPlan(plan);
    ownerPlan.materializeValidatedRunPlan(plan, {
      fingerprints: executionFixture.sourceFingerprints
    });
    writeFileSync(plan.evidencePaths.pathAudit, "{}\n", { mode: 0o600 });
    writeFileSync(plan.evidencePaths.processAudit, "{}\n", { mode: 0o600 });
    const retainedEvidence = api("collectEvidenceHashes")(plan);
    const preflightManifestEvidence = retainedEvidence.entries.preflightManifest;
    const summary = {
      cleanup: { status: "skipped" },
      dependencyAttestation: {
        post: plan.dependencyAttestation,
        pre: plan.dependencyAttestation,
        status: "matched"
      },
      evidence: {
        hashes: retainedEvidence.entries,
        missingRequired: retainedEvidence.missingRequired,
        paths: plan.evidencePaths
      },
      executionScope: {
        post: plan.executionScope,
        pre: plan.executionScope,
        status: "matched"
      },
      expectedExecutionScopeFingerprint: plan.executionScope.scopeFingerprint,
      expectedTests: [],
      failedPhase: null,
      fingerprints: plan.sourceFingerprints,
      jsonReport: {
        expected: false,
        path: plan.evidencePaths.finalResults,
        status: "not-required"
      },
      manifest: {
        executionScopeFingerprint: plan.executionScope.scopeFingerprint,
        path: plan.evidencePaths.preflightManifest,
        planFingerprint: plan.planFingerprint,
        sha256: preflightManifestEvidence.sha256,
        status: preflightManifestEvidence.status
      },
      mode: plan.executionScope.mode,
      planFingerprint: plan.planFingerprint,
      processes: [],
      repoRoot: plan.repoRoot,
      runId: plan.runId,
      schemaVersion: 1,
      shutdownClean: true,
      status: "passed"
    };
    const readBack = api("writeAndValidateTerminalSummary")(plan, summary);
    assert.deepEqual(readBack, summary);
    assert.deepEqual(
      JSON.parse(readFileSync(plan.evidencePaths.validatedSummary, "utf8")),
      summary
    );
    assert.equal(statSync(plan.evidencePaths.validatedSummary).mode & 0o777, 0o600);

    let attempts = 0;
    const fallbackResult = api("writeTerminalSummaryWithFailureFallback")(
      plan,
      summary,
      () => {
        attempts += 1;
        throw new Error("synthetic first write failure");
      }
    );
    assert.equal(attempts, 1);
    assert.equal(fallbackResult.writeFailure instanceof Error, true);
    assert.equal(fallbackResult.summary.status, "failed");
    assert.equal(fallbackResult.summary.failedPhase, "summary-write-readback");
    assert.equal(fallbackResult.summary.terminalSummaryLocation, plan.terminalFallbackPath);
    assert.deepEqual(
      JSON.parse(readFileSync(plan.terminalFallbackPath, "utf8")),
      fallbackResult.summary
    );
    assert.equal(statSync(plan.terminalFallbackPath).mode & 0o777, 0o600);
    assert.doesNotThrow(() => api("validateTerminalSummary")(fallbackResult.summary));
  } finally {
    removeTestFixtureCapability(capability);
  }
});

test("process evidence tracks generic owned descendants and redacts secrets", () => {
  const analyze = api("analyzeProcessSnapshot");
  const ownerRoot = "/repo/.tmp/bug3-owner-" + "a".repeat(64);
  const tempRoot = `${ownerRoot}/ephemeral/temp`;
  const snapshot = [
    `100 1 node playwright test --owner=${ownerRoot} API_TOKEN=do-not-retain`,
    "101 100 next-server (v15.5.23)",
    `102 101 chrome --user-data-dir=${tempRoot}/playwright_chromiumdev_profile-owned --password do-not-retain`,
    "200 1 chrome --user-data-dir=/private/tmp/playwright_chromiumdev_profile-foreign"
  ].join("\n");
  const audit = analyze(
    { ownerRoot, paths: { tmpDir: tempRoot } },
    snapshot,
    [100]
  );
  assert.deepEqual(audit.ownedPids, [100, 101, 102]);
  assert.deepEqual(audit.ownedProcesses.map(({ pid }) => pid), [100, 101, 102]);
  assert.match(audit.ownedProcesses[1].command, /next-server/);
  assert.doesNotMatch(JSON.stringify(audit), /do-not-retain/);
  assert.match(JSON.stringify(audit), /\[REDACTED\]/);
  assert.deepEqual(audit.foreignProfiles, [
    "/private/tmp/playwright_chromiumdev_profile-foreign"
  ]);
});

test("a discovered next-server remains owned after it is reparented", () => {
  const analyze = api("analyzeProcessSnapshot");
  const ownerRoot = "/repo/.tmp/bug3-owner-" + "b".repeat(64);
  const plan = {
    ownerRoot,
    paths: { tmpDir: `${ownerRoot}/ephemeral/temp` }
  };
  const whileAttached = analyze(
    plan,
    [
      "400 1 node playwright test",
      "401 400 npm run start",
      "402 401 next-server (v15.5.23)"
    ].join("\n"),
    [400]
  );
  assert.deepEqual(whileAttached.ownedPids, [400, 401, 402]);

  const afterParentsExit = analyze(
    plan,
    "402 1 next-server (v15.5.23)",
    whileAttached.ownedPids
  );
  assert.deepEqual(afterParentsExit.ownedPids, [402]);
  assert.equal(afterParentsExit.ownedProcesses[0].command, "next-server (v15.5.23)");
});

test("retained path evidence uses an explicit nonsecret environment allowlist", () => {
  const select = api("selectEvidenceEnvironment");
  const selected = select({
    PLAYWRIGHT_OWNER_RUN_ROOT: "/owned/root",
    PLAYWRIGHT_OUTPUT_DIR: "/owned/output",
    PLAYWRIGHT_SECRET_TOKEN: "do-not-retain",
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3210",
    HK_MATH_DB_PATH: "/owned/state.sqlite",
    HOME: "/ambient/home"
  });
  assert.deepEqual(selected, {
    HK_MATH_DB_PATH: "/owned/state.sqlite",
    PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3210",
    PLAYWRIGHT_OUTPUT_DIR: "/owned/output",
    PLAYWRIGHT_OWNER_RUN_ROOT: "/owned/root"
  });
  assert.doesNotMatch(JSON.stringify(selected), /do-not-retain|ambient/);
});

test("failure evidence redacts credential assignments, flags, and URL userinfo", () => {
  const redact = api("failureForEvidence");
  const fingerprint = "a".repeat(64);
  const evidence = redact(new Error([
    "API_KEY=do-not-retain",
    "--token do-not-retain",
    "https://owner:do-not-retain@example.test/path",
    "/Volumes/Starship/private/run/output.json",
    "pid 12345",
    fingerprint
  ].join(" ")));
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /do-not-retain|owner:|Volumes|12345|a{64}/);
  assert.match(serialized, /\[REDACTED\]/);
  assert.match(serialized, /\[ABSOLUTE_PATH\]/);
  assert.match(serialized, /\[FINGERPRINT\]/);
  assert.equal(evidence.name, "Error");

  const stableMessage = api("stableCiFailureMessage")();
  assert.equal(
    stableMessage,
    "Required browser gate failed; inspect the confined local validated summary."
  );
  assert.doesNotMatch(stableMessage, /\/|pid|token|fingerprint|[a-f0-9]{64}/i);
});

test("failure-summary API redacts auth headers, cookies, database URLs, and custom names", () => {
  const build = api("failureSummaryForEvidence");
  const failure = new Error([
    "Authorization: Bearer bearer-do-not-retain",
    "Cookie: session=cookie-do-not-retain",
    "DATABASE_URL=postgres://owner:database-do-not-retain@example.test/mais",
    '{"apiKey":"json-do-not-retain"}'
  ].join(" "));
  failure.name = "CustomError secret-name-do-not-retain";
  failure.stack += "\nCaused by: nested-stack-do-not-retain";

  const summary = build(failure, {
    cleanup: { status: "skipped" },
    expectedTests,
    fingerprints,
    mode: "required-matrix",
    planFingerprint: "1".repeat(64),
    retainedHashes: {},
    runId: "bug3-owner-test",
    shutdownClean: false
  });
  const serialized = JSON.stringify(summary);
  assert.equal(summary.status, "failed");
  assert.equal(summary.shutdownClean, false);
  assert.deepEqual(summary.expectedTests, expectedTests);
  assert.doesNotMatch(
    serialized,
    /bearer-do-not-retain|cookie-do-not-retain|database-do-not-retain|json-do-not-retain|secret-name-do-not-retain|nested-stack-do-not-retain/
  );
  assert.match(serialized, /\[REDACTED\]/);
});

test("secret-shaped valid Error names and split stream tokens are never retained", () => {
  const failure = new Error("safe message");
  failure.name = "sk_live_secret_123";
  const evidence = api("failureForEvidence")(failure);
  assert.equal(evidence.name, "Error");
  assert.doesNotMatch(JSON.stringify(evidence), /sk_live_secret_123/);

  const redact = api("redactStreamText");
  const redacted = redact("token=sk_live_secret_123 Authorization: Bearer abc.def.ghi");
  assert.doesNotMatch(redacted, /sk_live_secret_123|abc\.def\.ghi/);
  assert.match(redacted, /\[REDACTED\]/);
});
