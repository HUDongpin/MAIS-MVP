import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import {
  materializeSyntheticRequiredBrowserExecutionScope
} from "./active-browser-dependency-proof.test-helper.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

import {
  bootstrapValidatedRunPlan,
  buildValidatedRunEnvironment,
  cleanupValidatedEphemeralLeaves,
  createValidatedRunPlan,
  materializeValidatedRunPlan,
  validateOwnedWritablePath,
  validatePlanOwnedEnvironmentInventory,
  validatePlaywrightOwnerEnvironment
} from "./playwright-owner-paths.mjs";

function fixture() {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const root = readTestFixtureCapabilityView(capability).definition.leaf;
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability);
  const repoRoot = executionFixture.repoRoot;
  const tmpBase = path.join(repoRoot, ".tmp");
  const cwd = path.join(root, "cwd-proof");
  const homeDir = path.join(root, "home-proof");
  const osTempDir = path.join(root, "os-tmp-proof");
  const outsideRoot = path.join(root, "outside");
  const nonce = capability.nonce;
  for (const directory of [tmpBase, cwd, homeDir, osTempDir, outsideRoot]) {
    mkdirSync(directory, { recursive: true });
  }
  return {
    cleanup: () => removeTestFixtureCapability(capability),
    cwd,
    dependencyAttestation: executionFixture.dependencyAttestation,
    executionScope: executionFixture.executionScope,
    homeDir,
    nonce,
    osTempDir,
    outsideRoot,
    repoRoot,
    root,
    sourceFingerprints: executionFixture.sourceFingerprints,
    tmpBase
  };
}

function materialized(scope) {
  const plan = createValidatedRunPlan({
    cwd: scope.cwd,
    dependencyAttestation: scope.dependencyAttestation,
    executionScope: scope.executionScope,
    homeDir: scope.homeDir,
    nonce: scope.nonce,
    osTempDir: scope.osTempDir,
    repoRoot: scope.repoRoot,
    sourceFingerprints: scope.sourceFingerprints
  });
  bootstrapValidatedRunPlan(plan);
  materializeValidatedRunPlan(plan, { fingerprints: scope.sourceFingerprints });
  return plan;
}

test("manifest-derived environment binds every exact plan-owned value and HOME hash", () => {
  const scope = fixture();
  try {
    const plan = materialized(scope);
    const environment = buildValidatedRunEnvironment(plan, {
      HOME: scope.homeDir,
      NODE_OPTIONS: `--redirect-warnings=${path.join(scope.outsideRoot, "warnings.log")}`,
      PLAYWRIGHT_BROWSERS_PATH: path.join(scope.outsideRoot, "browsers"),
      npm_config_cache: path.join(scope.outsideRoot, "npm-cache")
    });
    assert.equal(environment.HOME, scope.homeDir);
    assert.equal(Object.hasOwn(environment, "NODE_OPTIONS"), false);
    assert.equal(Object.hasOwn(environment, "PLAYWRIGHT_BROWSERS_PATH"), false);
    assert.equal(Object.hasOwn(environment, "npm_config_cache"), false);
    assert.equal(environment.PLAYWRIGHT_RUN_ID, plan.runId);
    assert.equal(environment.PLAYWRIGHT_OWNER_RUN_ROOT, plan.ownerRoot);
    assert.equal(environment.PLAYWRIGHT_OUTPUT_DIR, plan.evidencePaths.artifacts);
    assert.equal(environment.PLAYWRIGHT_REPORT_DIR, plan.evidencePaths.finalReport);
    assert.equal(environment.PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH, plan.evidencePaths.finalResults);
    assert.equal(environment.TMPDIR, plan.cleanupLeaves.temp);
    assert.equal(environment.XDG_CACHE_HOME, plan.cleanupLeaves.cache);
    assert.equal(environment.XDG_CONFIG_HOME, plan.cleanupLeaves.config);
    assert.equal(environment.XDG_DATA_HOME, plan.cleanupLeaves.data);
    assert.equal(environment.XDG_STATE_HOME, plan.paths.xdgStateDir);
    assert.equal(environment.NODE_COMPILE_CACHE, plan.cleanupLeaves.nodeCompileCache);
    assert.equal(environment.TURBO_CACHE_DIR, plan.paths.turboCacheDir);
    assert.equal(environment.NEXT_TELEMETRY_DISABLED, "1");
    assert.equal(environment.TURBO_TELEMETRY_DISABLED, "1");
    assert.equal(environment.MAIS_BROWSER_OWNER_TOKEN, plan.nonce);

    const exactInventory = validatePlanOwnedEnvironmentInventory(plan, environment);
    assert.deepEqual(Object.keys(exactInventory).sort(), plan.environmentBinding.inventoryKeys);
    assert.match(plan.environmentBinding.inventorySha256, /^[a-f0-9]{64}$/);
    assert.match(plan.environmentBinding.homeSha256, /^[a-f0-9]{64}$/);

    for (const key of plan.environmentBinding.inventoryKeys) {
      const missing = { ...environment };
      delete missing[key];
      assert.throws(
        () => validatePlanOwnedEnvironmentInventory(plan, missing),
        new RegExp(`${key}|missing|inventory`, "i")
      );
    }
    for (const [key, value] of Object.entries(exactInventory).filter(([, value]) => value !== "")) {
      assert.throws(
        () => validatePlanOwnedEnvironmentInventory(plan, { ...environment, [key]: "" }),
        new RegExp(`${key}|exact|inventory`, "i")
      );
    }
    assert.throws(
      () => validatePlanOwnedEnvironmentInventory(plan, {
        ...environment,
        HOME: scope.outsideRoot
      }),
      /HOME|hash|binding/i
    );
    for (const key of [
      "NODE_PATH",
      "PLAYWRIGHT_BROWSERS_PATH",
      "PUPPETEER_CACHE_DIR",
      "BROWSER_CACHE_DIR",
      "CHROME_PATH"
    ]) {
      assert.throws(
        () => validatePlanOwnedEnvironmentInventory(plan, { ...environment, [key]: scope.outsideRoot }),
        new RegExp(`${key}|override|cache|resolution`, "i")
      );
    }

    for (const key of [
      "PLAYWRIGHT_OWNER_RUN_ROOT",
      "PLAYWRIGHT_E2E_ROOT",
      "PLAYWRIGHT_NEXT_DIST_DIR",
      "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
      "HK_MATH_DB_PATH",
      "PLAYWRIGHT_OUTPUT_DIR",
      "PLAYWRIGHT_REPORT_DIR",
      "PLAYWRIGHT_REQUIRED_GENERATED_DIR",
      "PLAYWRIGHT_REQUIRED_CONFIG_PATH",
      "PLAYWRIGHT_REQUIRED_JSON_REPORT_PATH",
      "TMPDIR",
      "TMP",
      "TEMP",
      "XDG_CACHE_HOME",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_STATE_HOME",
      "NODE_COMPILE_CACHE",
      "TURBO_CACHE_DIR",
      "MAIS_BROWSER_OWNER_TOKEN",
      "PLAYWRIGHT_SERVICE_LOG_PATH",
      "PLAYWRIGHT_SERVICE_PID_PATH"
    ]) {
      assert.throws(
        () => validatePlanOwnedEnvironmentInventory(
          plan,
          { ...environment, [key]: path.join(scope.outsideRoot, key) }
        ),
        new RegExp(key)
      );
    }
  } finally {
    scope.cleanup();
  }
});

test("exact dangling-symlink file targets fail before any external target is created", async (t) => {
  const cases = [
    "nextTsconfig",
    "requiredConfig",
    "requiredJsonReport",
    "serviceLog",
    "servicePid"
  ];
  for (const key of cases) {
    await t.test(key, () => {
      const scope = fixture();
      try {
        const plan = materialized(scope);
        const target = plan.paths[key];
        const externalTarget = path.join(scope.outsideRoot, `${key}.target`);
        symlinkSync(externalTarget, target);
        assert.equal(existsSync(target), false, "fixture must be dangling");
        assert.equal(lstatSync(target).isSymbolicLink(), true);
        assert.throws(
          () => buildValidatedRunEnvironment(plan),
          /symlink|canonical/i
        );
        assert.equal(existsSync(externalTarget), false);
      } finally {
        scope.cleanup();
      }
    });
  }
});

test("dangling-symlink parents for Next dist, output, and generated targets fail closed", async (t) => {
  for (const [label, parent] of [
    ["Next dist", "build"],
    ["output", "evidence"],
    ["generated", "generated"]
  ]) {
    await t.test(label, () => {
      const scope = fixture();
      try {
        const plan = materialized(scope);
        const safeParent = parent === "build"
          ? plan.cleanupLeaves.build
          : parent === "generated"
            ? plan.cleanupLeaves.generated
            : plan.evidenceRoot;
        const link = path.join(safeParent, `${parent}-dangling-parent`);
        const externalParent = path.join(scope.outsideRoot, `${parent}-external-parent`);
        const candidate = path.join(link, "future-output");
        symlinkSync(externalParent, link);
        assert.equal(existsSync(link), false);
        assert.equal(lstatSync(link).isSymbolicLink(), true);
        assert.throws(
          () => validateOwnedWritablePath(plan.ownerRoot, label, candidate, {
            cwd: scope.repoRoot
          }),
          /symlink|canonical/i
        );
        assert.equal(existsSync(externalParent), false);
      } finally {
        scope.cleanup();
      }
    });
  }
});

test("ordinary missing planned targets validate without being created", () => {
  const scope = fixture();
  try {
    const plan = materialized(scope);
    assert.equal(existsSync(plan.paths.nextDist), false);
    assert.equal(existsSync(plan.paths.nextTsconfig), false);
    assert.equal(existsSync(plan.paths.outputDir), false);
    assert.doesNotThrow(() => buildValidatedRunEnvironment(plan));
    assert.equal(existsSync(plan.paths.nextDist), false);
    assert.equal(existsSync(plan.paths.nextTsconfig), false);
    assert.equal(existsSync(plan.paths.outputDir), false);
  } finally {
    scope.cleanup();
  }
});

test("owner marker and preflight-manifest tampering invalidate the plan", async (t) => {
  await t.test("owner marker", () => {
    const scope = fixture();
    try {
      const plan = materialized(scope);
      const marker = JSON.parse(readFileSync(plan.markerPath, "utf8"));
      writeFileSync(plan.markerPath, JSON.stringify({ ...marker, nonce: "0".repeat(64) }));
      assert.throws(() => buildValidatedRunEnvironment(plan), /marker/i);
    } finally {
      scope.cleanup();
    }
  });
  await t.test("preflight manifest", () => {
    const scope = fixture();
    try {
      const plan = materialized(scope);
      const environment = buildValidatedRunEnvironment(plan);
      const manifest = JSON.parse(readFileSync(plan.evidencePaths.preflightManifest, "utf8"));
      writeFileSync(
        plan.evidencePaths.preflightManifest,
        JSON.stringify({ ...manifest, planFingerprint: "0".repeat(64) })
      );
      assert.throws(
        () => validatePlaywrightOwnerEnvironment(environment, { cwd: scope.repoRoot }),
        /manifest|plan/i
      );
    } finally {
      scope.cleanup();
    }
  });
  await t.test("preflight fingerprints", () => {
    const scope = fixture();
    try {
      const plan = materialized(scope);
      const environment = buildValidatedRunEnvironment(plan);
      const manifest = JSON.parse(readFileSync(plan.evidencePaths.preflightManifest, "utf8"));
      writeFileSync(
        plan.evidencePaths.preflightManifest,
        JSON.stringify({ ...manifest, fingerprints: { validator: "0".repeat(64) } })
      );
      assert.throws(
        () => validatePlaywrightOwnerEnvironment(environment, { cwd: scope.repoRoot }),
        /fingerprint|manifest|plan/i
      );
    } finally {
      scope.cleanup();
    }
  });
  await t.test("preflight paths", () => {
    const scope = fixture();
    try {
      const plan = materialized(scope);
      const environment = buildValidatedRunEnvironment(plan);
      const manifest = JSON.parse(readFileSync(plan.evidencePaths.preflightManifest, "utf8"));
      writeFileSync(
        plan.evidencePaths.preflightManifest,
        JSON.stringify({
          ...manifest,
          paths: { ...manifest.paths, outputDir: path.join(scope.outsideRoot, "escaped-output") }
        })
      );
      assert.throws(
        () => validatePlaywrightOwnerEnvironment(environment, { cwd: scope.repoRoot }),
        /manifest|plan|output/i
      );
    } finally {
      scope.cleanup();
    }
  });
});

test("synthetic manifest config import fails independent physical dependency recheck without side effects", () => {
  const scope = fixture();
  try {
    const plan = materialized(scope);
    const environment = {
      ...buildValidatedRunEnvironment(plan, {
      ...process.env,
      HOME: scope.homeDir
      }),
      // `CI=1` makes tsx resolve its configuration eagerly from the spawned
      // cwd. The cwd is deliberately a synthetic repository so the owner-plan
      // validator can be exercised without touching the real checkout. Bind
      // transpilation to the real, read-only project config instead of asking
      // the synthetic repository to contain an unrelated tsconfig fixture.
      TSX_TSCONFIG_PATH: path.join(process.cwd(), "tsconfig.json")
    };
    const configUrl = `${pathToFileURL(path.join(process.cwd(), "playwright.config.ts")).href}?owner-unit=${process.pid}`;
    const runnerUrl = `${pathToFileURL(path.join(process.cwd(), "scripts/run-required-frontend-browser-contracts.mjs")).href}?owner-unit=${process.pid}`;
    const tsxLoader = import.meta.resolve("tsx");
    const script = [
      `const config = await import(${JSON.stringify(configUrl)});`,
      `const runner = await import(${JSON.stringify(runnerUrl)});`,
      'if (!config.default) throw new Error("missing config");',
      'if (typeof runner.validateFinalRequiredBrowserReport !== "function") throw new Error("missing runner");',
      `if (process.env.HOME !== ${JSON.stringify(scope.homeDir)}) throw new Error("HOME changed");`,
      'const effective = config.default?.default ?? config.default;',
      'if (effective.webServer !== undefined) throw new Error("config retained a browser-capable webServer");',
      'process.stdout.write("owner-import-green\\n");'
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "--eval", script],
      {
        cwd: scope.repoRoot,
        encoding: "utf8",
        env: environment
      }
    );
    assert.notEqual(child.status, 0, `${child.stdout}\n${child.stderr}`);
    assert.match(child.stderr, /dependency|physical|node_modules|activation/i);
    assert.doesNotMatch(child.stdout, /owner-import-green/);
    assert.equal(existsSync(plan.paths.requiredConfig), false);
    assert.equal(existsSync(plan.paths.requiredJsonReport), false);
    assert.equal(existsSync(plan.paths.nextTsconfig), false);
    cleanupValidatedEphemeralLeaves(plan, Object.values(plan.cleanupLeaves));
  } finally {
    scope.cleanup();
  }
});

test("manifest-only actual config import rejects missing exact plan-owned environment", () => {
  const scope = fixture();
  try {
    const plan = materialized(scope);
    const configUrl = `${pathToFileURL(path.join(process.cwd(), "playwright.config.ts")).href}?manifest-only=${process.pid}`;
    const playwrightCli = import.meta.resolve("@playwright/test/cli");
    const tsxLoader = import.meta.resolve("tsx");
    const script = [
      `process.argv = [process.execPath, ${JSON.stringify(playwrightCli)}, "test", "--config", "required.config.ts"];`,
      `const config = await import(${JSON.stringify(configUrl)});`,
      `const effective = config.default?.default ?? config.default;`,
      `if (process.env.PLAYWRIGHT_RUN_ID !== ${JSON.stringify(plan.runId)}) throw new Error("run id split brain");`,
      `if (process.env.PLAYWRIGHT_BASE_URL !== ${JSON.stringify(plan.serviceBaseUrl)}) throw new Error("base url split brain");`,
      `if (effective.webServer !== undefined) throw new Error("owner config retained webServer");`,
      `if (effective.outputDir !== ${JSON.stringify(plan.paths.outputDir)}) throw new Error("output split brain");`,
      `if (effective.use.baseURL !== ${JSON.stringify(plan.serviceBaseUrl)}) throw new Error("use baseURL split brain");`,
      `process.stdout.write("manifest-only-green\\n");`
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "--eval", script],
      {
        cwd: scope.repoRoot,
        encoding: "utf8",
        env: {
          CI: "1",
          HOME: process.env.HOME,
          PATH: process.env.PATH,
          PLAYWRIGHT_RUN_PLAN_MANIFEST: plan.evidencePaths.preflightManifest,
          TSX_TSCONFIG_PATH: path.join(process.cwd(), "tsconfig.json")
        }
      }
    );
    assert.notEqual(child.status, 0, `${child.stdout}\n${child.stderr}`);
    assert.match(child.stderr, /missing|environment|PLAYWRIGHT_|TMP|XDG/i);
    assert.doesNotMatch(child.stdout, /manifest-only-green/);
  } finally {
    scope.cleanup();
  }
});

test("actual config independently rechecks the full physical proof and exact environment without launching", () => {
  const scope = fixture();
  const repoRoot = scope.repoRoot;
  const plan = materialized(scope);
  try {
    const configUrl = `${pathToFileURL(path.join(process.cwd(), "playwright.config.ts")).href}?physical-proof=${scope.nonce}`;
    const playwrightCli = import.meta.resolve("@playwright/test/cli");
    const tsxLoader = import.meta.resolve("tsx");
    const script = [
      `process.argv = [process.execPath, ${JSON.stringify(playwrightCli)}, "test", "--config", ${JSON.stringify(plan.paths.requiredConfig)}];`,
      `const config = await import(${JSON.stringify(configUrl)});`,
      `const effective = config.default?.default ?? config.default;`,
      `if (effective.webServer !== undefined) throw new Error("owner config retained webServer");`,
      `if (effective.outputDir !== ${JSON.stringify(plan.paths.outputDir)}) throw new Error("output split brain");`,
      `process.stdout.write("physical-config-green\\n");`
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      ["--import", tsxLoader, "--input-type=module", "--eval", script],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...buildValidatedRunEnvironment(plan, process.env),
          TSX_TSCONFIG_PATH: path.join(process.cwd(), "tsconfig.json")
        },
        timeout: 30_000
      }
    );
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
    assert.match(child.stdout, /physical-config-green/);
    assert.equal(existsSync(plan.paths.requiredConfig), false);
    assert.equal(existsSync(plan.evidencePaths.finalResults), false);
  } finally {
    scope.cleanup();
  }
});

test("actual Playwright config import without a canonical manifest fails before writes", () => {
  const configUrl = `${pathToFileURL(path.join(process.cwd(), "playwright.config.ts")).href}?direct-reject=${process.pid}`;
  const playwrightCli = import.meta.resolve("@playwright/test/cli");
  const tsxLoader = import.meta.resolve("tsx");
  const script = [
    `process.argv = [process.execPath, ${JSON.stringify(playwrightCli)}, "test"];`,
    `await import(${JSON.stringify(configUrl)});`
  ].join("\n");
  const child = spawnSync(
    process.execPath,
    ["--import", tsxLoader, "--input-type=module", "--eval", script],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        CI: "1",
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        TSX_TSCONFIG_PATH: path.join(process.cwd(), "tsconfig.json")
      }
    }
  );
  assert.notEqual(child.status, 0);
  assert.match(`${child.stdout}\n${child.stderr}`, /manifest|Starship|owner/i);
});
