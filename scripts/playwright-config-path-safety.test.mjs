import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const requiredWriteRoot = path.dirname(repoRoot);
const e2eRuntimeRoot = path.join(repoRoot, ".tmp", "china-lesson-e2e-runtime");
const fixtureRoot = path.join(e2eRuntimeRoot, "path-safety-test");
const runRoot = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "safe-run");
const independentOutputRoot = path.join(e2eRuntimeRoot, "outputs", "path-safety-test");
const environmentRoot = path.join(e2eRuntimeRoot, "environment", "path-safety-test");

mkdirSync(path.join(environmentRoot, "home"), { recursive: true });
mkdirSync(path.join(environmentRoot, "tmp"), { recursive: true });
mkdirSync(path.join(environmentRoot, "xdg"), { recursive: true });
mkdirSync(path.join(environmentRoot, "node-cache"), { recursive: true });
mkdirSync(path.join(environmentRoot, "npm-cache"), { recursive: true });
mkdirSync(path.join(environmentRoot, "npm-logs"), { recursive: true });
mkdirSync(path.join(environmentRoot, "playwright-browsers"), { recursive: true });
const escapedCacheLink = path.join(environmentRoot, "escaped-npm-cache-link");
try {
  unlinkSync(escapedCacheLink);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
symlinkSync(path.join(path.parse(repoRoot).root, "tmp"), escapedCacheLink, "dir");

const importConfigScript = `
const loaded = await import("./playwright.config.ts?path-safety=" + Date.now());
const config = loaded.default?.default ?? loaded.default;
console.log(JSON.stringify({
  outputDir: config.outputDir,
  reporter: config.reporter,
  dbPath: process.env.HK_MATH_DB_PATH,
  e2eRoot: process.env.PLAYWRIGHT_E2E_ROOT,
  nextDist: process.env.PLAYWRIGHT_NEXT_DIST_DIR,
  tempTsconfig: process.env.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
  webServerCommand: config.webServer?.command ?? null
}));
`;

function loadPlaywrightConfig(overrides = {}, unset = []) {
  const env = {
    ...process.env,
    HOME: path.join(environmentRoot, "home"),
    TMPDIR: path.join(environmentRoot, "tmp"),
    TMP: path.join(environmentRoot, "tmp"),
    TEMP: path.join(environmentRoot, "tmp"),
    XDG_CACHE_HOME: path.join(environmentRoot, "xdg"),
    NODE_COMPILE_CACHE: path.join(environmentRoot, "node-cache"),
    npm_config_cache: path.join(environmentRoot, "npm-cache"),
    npm_config_logs_dir: path.join(environmentRoot, "npm-logs"),
    PLAYWRIGHT_BROWSERS_PATH: path.join(environmentRoot, "playwright-browsers"),
    PLAYWRIGHT_SKIP_WEBSERVER: "1",
    PLAYWRIGHT_RUN_ID: "path-safety-test",
    PLAYWRIGHT_E2E_ROOT: runRoot,
    PLAYWRIGHT_NEXT_DIST_DIR: path.join(runRoot, "next-dist"),
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(runRoot, "tsconfig.playwright.tmp.json"),
    HK_MATH_DB_PATH: path.join(runRoot, "db", "hk-math.sqlite"),
    PLAYWRIGHT_OUTPUT_DIR: path.join(runRoot, "test-results"),
    PLAYWRIGHT_REPORT_DIR: path.join(runRoot, "playwright-report"),
    TSX_DISABLE_CACHE: "1",
    ...overrides
  };
  if (!Object.prototype.hasOwnProperty.call(overrides, "MAIS_ALLOW_EXTERNAL_ARTIFACTS")) {
    delete env.MAIS_ALLOW_EXTERNAL_ARTIFACTS;
  }
  if (!Object.prototype.hasOwnProperty.call(overrides, "MAIS_E2E_REQUIRED_WRITE_ROOT")) {
    delete env.MAIS_E2E_REQUIRED_WRITE_ROOT;
  }
  if (!Object.prototype.hasOwnProperty.call(overrides, "PLAYWRIGHT_CLEANUP_TEST_SWAP_BEFORE_RENAME")) {
    delete env.PLAYWRIGHT_CLEANUP_TEST_SWAP_BEFORE_RENAME;
  }
  unset.forEach((name) => delete env[name]);

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", importConfigScript],
    { cwd: repoRoot, encoding: "utf8", env }
  );
  result.configEnvironment = env;
  return result;
}

test("Playwright rejects an output directory outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_OUTPUT_DIR: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-playwright-output")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_OUTPUT_DIR must stay under \.tmp/u);
});

test("Playwright rejects a not-yet-created output path below an escaping symlink", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_OUTPUT_DIR: path.join(escapedCacheLink, "not-yet-created", "test-results")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_OUTPUT_DIR must resolve under the worktree \.tmp/u);
});

test("Playwright rejects an E2E run root outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_E2E_ROOT: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-e2e-root")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_E2E_ROOT must stay under \.tmp/u);
});

test("Playwright rejects raw parent traversal after an escaping symlink in the E2E run root", () => {
  const rawEscapingRunRoot = `${escapedCacheLink}${path.sep}..${path.sep}cleanup-sibling`;
  const result = loadPlaywrightConfig({ PLAYWRIGHT_E2E_ROOT: rawEscapingRunRoot });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_E2E_ROOT must not contain parent traversal/u);
});

test("Playwright rejects the shared E2E runtime root as a recursive cleanup target", () => {
  const result = loadPlaywrightConfig({ PLAYWRIGHT_E2E_ROOT: e2eRuntimeRoot });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_E2E_ROOT must stay within its run-owned cleanup root/u);
});

test("the external-artifact override cannot authorize cleanup outside the dedicated runtime", () => {
  const preservedExternalRoot = path.join(repoRoot, ".tmp", "path-safety-external-preserved", "run");
  const preservedSentinel = path.join(preservedExternalRoot, "sentinel.txt");
  rmSync(path.dirname(preservedExternalRoot), { recursive: true, force: true });
  mkdirSync(preservedExternalRoot, { recursive: true });
  writeFileSync(preservedSentinel, "must survive rejected external cleanup");

  try {
    const result = loadPlaywrightConfig({
      MAIS_ALLOW_EXTERNAL_ARTIFACTS: "1",
      PLAYWRIGHT_E2E_ROOT: preservedExternalRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: path.join(preservedExternalRoot, "next-dist")
    });

    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_E2E_ROOT must stay within its run-owned cleanup root/u);
    assert.equal(readFileSync(preservedSentinel, "utf8"), "must survive rejected external cleanup");
  } finally {
    rmSync(path.dirname(preservedExternalRoot), { recursive: true, force: true });
  }
});

test("Playwright rejects a Next dist directory outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_NEXT_DIST_DIR: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-next-dist")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_NEXT_DIST_DIR must stay under \.tmp/u);
});

test("Playwright rejects raw parent traversal in an independent cleanup path under normal and required-root guards", () => {
  const rawEscapingNextDist = `${escapedCacheLink}${path.sep}..${path.sep}independent-next-dist`;
  const guardOverrides = [
    {},
    { MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot }
  ];

  for (const overrides of guardOverrides) {
    const result = loadPlaywrightConfig({
      ...overrides,
      PLAYWRIGHT_NEXT_DIST_DIR: rawEscapingNextDist
    });

    assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_NEXT_DIST_DIR must not contain parent traversal/u);
  }
});

test("Playwright rejects an HTML report directory outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_REPORT_DIR: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-playwright-report")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_REPORT_DIR must stay under \.tmp/u);
});

test("Playwright rejects a SQLite path outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    HK_MATH_DB_PATH: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-hk-math.sqlite")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /HK_MATH_DB_PATH must stay under \.tmp/u);
});

test("Playwright rejects a temporary tsconfig outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-playwright-tsconfig.json")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_NEXT_TSCONFIG_PATH must stay under \.tmp/u);
});

test("Playwright defaults every generated path to its isolated worktree runtime root", () => {
  const generatedPathVariables = [
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
    "HK_MATH_DB_PATH",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_REPORT_DIR"
  ];
  const result = loadPlaywrightConfig({}, generatedPathVariables);

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const loaded = JSON.parse(result.stdout.trim());
  const expectedRunRoot = path.join(repoRoot, ".tmp", "china-lesson-e2e-runtime", "runs", "path-safety-test");
  const reportFolder = loaded.reporter.find(([name]) => name === "html")?.[1]?.outputFolder;
  for (const [label, value] of Object.entries({
    e2eRoot: loaded.e2eRoot,
    nextDist: loaded.nextDist,
    tempTsconfig: loaded.tempTsconfig,
    dbPath: loaded.dbPath,
    outputDir: loaded.outputDir,
    reportFolder
  })) {
    assert.equal(typeof value, "string", `${label} should be exposed as a stable generated path`);
  }

  assert.deepEqual(
    {
      e2eRoot: path.resolve(repoRoot, loaded.e2eRoot),
      nextDist: path.resolve(repoRoot, loaded.nextDist),
      tempTsconfig: path.resolve(repoRoot, loaded.tempTsconfig),
      dbPath: path.resolve(repoRoot, loaded.dbPath),
      outputDir: path.resolve(repoRoot, loaded.outputDir),
      reportFolder: path.resolve(repoRoot, reportFolder)
    },
    {
      e2eRoot: expectedRunRoot,
      nextDist: path.join(expectedRunRoot, "next-dist"),
      tempTsconfig: path.join(expectedRunRoot, "tsconfig.playwright.tmp.json"),
      dbPath: path.join(expectedRunRoot, "db", "hk-math.sqlite"),
      outputDir: path.join(expectedRunRoot, "test-results"),
      reportFolder: path.join(expectedRunRoot, "playwright-report")
    }
  );
  assert.equal(
    expectedRunRoot.startsWith(`${environmentRoot}${path.sep}`) || environmentRoot.startsWith(`${expectedRunRoot}${path.sep}`),
    false,
    "webServer cleanup must not own HOME/cache paths"
  );
});

test("the .tmp-local temporary tsconfig still resolves repository sources and dist types", () => {
  const result = loadPlaywrightConfig({ PLAYWRIGHT_SKIP_WEBSERVER: "" });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const loaded = JSON.parse(result.stdout.trim());
  assert.equal(typeof loaded.webServerCommand, "string");
  const writeCommand = loaded.webServerCommand
    .split(" && ")
    .find((command) =>
      command.startsWith("node -e ")
      && command.includes("writeFileSync")
      && command.includes("tsconfig.playwright.tmp.json")
    );
  assert.equal(typeof writeCommand, "string", "webServer should contain the isolated temp-tsconfig writer");

  const tempTsconfigPath = path.join(runRoot, "tsconfig.playwright.tmp.json");
  mkdirSync(path.dirname(tempTsconfigPath), { recursive: true });
  const writeResult = spawnSync("/bin/sh", ["-c", writeCommand], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env
  });
  assert.equal(writeResult.status, 0, `${writeResult.stdout}\n${writeResult.stderr}`);

  const parsed = JSON.parse(readFileSync(tempTsconfigPath, "utf8"));
  const configDir = path.dirname(tempTsconfigPath);
  const resolvedIncludes = parsed.include.map((entry) => path.resolve(configDir, entry));
  const resolvedExcludes = parsed.exclude.map((entry) => path.resolve(configDir, entry));

  assert.equal(path.resolve(configDir, parsed.extends), path.join(repoRoot, "tsconfig.json"));
  assert.equal(path.resolve(configDir, parsed.compilerOptions.baseUrl), repoRoot);
  assert.deepEqual(parsed.compilerOptions.paths, { "@/*": ["*"] });
  assert.deepEqual(parsed.compilerOptions.plugins, [{ name: "next" }]);
  assert.deepEqual(resolvedIncludes, [
    path.join(repoRoot, "next-env.d.ts"),
    path.join(repoRoot, "**", "*.ts"),
    path.join(repoRoot, "**", "*.tsx"),
    path.join(repoRoot, ".next", "types", "**", "*.ts"),
    path.join(runRoot, "next-dist", "types", "**", "*.ts")
  ]);
  assert.ok(resolvedExcludes.includes(path.join(repoRoot, "node_modules")));
  assert.ok(resolvedExcludes.includes(path.join(repoRoot, "private", "**", "*")));
});

test("the cleanup step revalidates canonical independent targets and preserves sibling data", () => {
  const cleanupFixtureRoot = path.join(fixtureRoot, "cleanup-fixture");
  const cleanupRunRoot = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "cleanup-fixture");
  const independentNextDist = path.join(independentOutputRoot, "independent-next-dist");
  const preservedSentinel = path.join(cleanupFixtureRoot, "preserved", "sentinel.txt");
  rmSync(cleanupFixtureRoot, { recursive: true, force: true });
  rmSync(cleanupRunRoot, { recursive: true, force: true });
  rmSync(independentOutputRoot, { recursive: true, force: true });
  mkdirSync(cleanupRunRoot, { recursive: true });
  mkdirSync(independentNextDist, { recursive: true });
  mkdirSync(path.dirname(preservedSentinel), { recursive: true });
  writeFileSync(path.join(cleanupRunRoot, "stale.txt"), "delete only the configured run root");
  writeFileSync(path.join(independentNextDist, "stale.txt"), "delete only the configured Next output");
  writeFileSync(preservedSentinel, "must survive");

  try {
    const result = loadPlaywrightConfig({
      MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
      PLAYWRIGHT_SKIP_WEBSERVER: "",
      PLAYWRIGHT_E2E_ROOT: cleanupRunRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: independentNextDist,
      PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(cleanupRunRoot, "tsconfig.playwright.tmp.json"),
      HK_MATH_DB_PATH: path.join(cleanupRunRoot, "db", "hk-math.sqlite"),
      PLAYWRIGHT_OUTPUT_DIR: path.join(cleanupRunRoot, "test-results"),
      PLAYWRIGHT_REPORT_DIR: path.join(cleanupRunRoot, "playwright-report")
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const loaded = JSON.parse(result.stdout.trim());
    const cleanupCommand = loaded.webServerCommand.split(" && ")[0];
    assert.match(cleanupCommand, /^node -e /u, "cleanup should run through the revalidating Node helper");

    const cleanupResult = spawnSync("/bin/sh", ["-c", cleanupCommand], {
      cwd: repoRoot,
      encoding: "utf8",
      env: result.configEnvironment
    });
    assert.equal(cleanupResult.status, 0, `${cleanupResult.stdout}\n${cleanupResult.stderr}`);
    assert.equal(existsSync(cleanupRunRoot), false, "configured run root should be removed");
    assert.equal(existsSync(independentNextDist), false, "independent Next output should be removed");
    assert.equal(readFileSync(preservedSentinel, "utf8"), "must survive");
  } finally {
    rmSync(cleanupFixtureRoot, { recursive: true, force: true });
    rmSync(cleanupRunRoot, { recursive: true, force: true });
    rmSync(independentOutputRoot, { recursive: true, force: true });
  }
});

test("the cleanup step rechecks the required-write-root boundary at deletion time", () => {
  const cleanupRunRoot = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "required-root-recheck");
  const preservedSentinel = path.join(cleanupRunRoot, "sentinel.txt");
  rmSync(cleanupRunRoot, { recursive: true, force: true });
  mkdirSync(cleanupRunRoot, { recursive: true });
  writeFileSync(preservedSentinel, "must survive deletion-time required-root rejection");

  try {
    const result = loadPlaywrightConfig({
      MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
      PLAYWRIGHT_SKIP_WEBSERVER: "",
      PLAYWRIGHT_E2E_ROOT: cleanupRunRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: path.join(cleanupRunRoot, "next-dist"),
      PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(cleanupRunRoot, "tsconfig.playwright.tmp.json"),
      HK_MATH_DB_PATH: path.join(cleanupRunRoot, "db", "hk-math.sqlite"),
      PLAYWRIGHT_OUTPUT_DIR: path.join(cleanupRunRoot, "test-results"),
      PLAYWRIGHT_REPORT_DIR: path.join(cleanupRunRoot, "playwright-report")
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const loaded = JSON.parse(result.stdout.trim());
    const cleanupCommand = loaded.webServerCommand.split(" && ")[0];
    const cleanupResult = spawnSync("/bin/sh", ["-c", cleanupCommand], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...result.configEnvironment,
        MAIS_E2E_REQUIRED_WRITE_ROOT: path.join(e2eRuntimeRoot, "environment")
      }
    });

    assert.notEqual(cleanupResult.status, 0, `${cleanupResult.stdout}\n${cleanupResult.stderr}`);
    assert.match(`${cleanupResult.stdout}\n${cleanupResult.stderr}`, /MAIS_E2E_REQUIRED_WRITE_ROOT/u);
    assert.equal(
      readFileSync(preservedSentinel, "utf8"),
      "must survive deletion-time required-root rejection"
    );
  } finally {
    rmSync(cleanupRunRoot, { recursive: true, force: true });
  }
});

test("the cleanup step refuses a symlinked ancestor and preserves its target", () => {
  const cleanupFixtureRoot = path.join(fixtureRoot, "cleanup-symlink-fixture");
  const physicalRunParent = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "physical-run-parent");
  const linkedRunParent = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "linked-run-parent");
  const linkedRunRoot = path.join(linkedRunParent, "run");
  const preservedSentinel = path.join(physicalRunParent, "run", "sentinel.txt");
  rmSync(cleanupFixtureRoot, { recursive: true, force: true });
  rmSync(physicalRunParent, { recursive: true, force: true });
  rmSync(linkedRunParent, { recursive: true, force: true });
  mkdirSync(cleanupFixtureRoot, { recursive: true });
  mkdirSync(path.dirname(preservedSentinel), { recursive: true });
  writeFileSync(preservedSentinel, "must survive rejected symlink cleanup");
  symlinkSync(physicalRunParent, linkedRunParent, "dir");

  try {
    const result = loadPlaywrightConfig({
      MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
      PLAYWRIGHT_SKIP_WEBSERVER: "",
      PLAYWRIGHT_E2E_ROOT: linkedRunRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: path.join(linkedRunRoot, "next-dist"),
      PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(linkedRunRoot, "tsconfig.playwright.tmp.json"),
      HK_MATH_DB_PATH: path.join(linkedRunRoot, "db", "hk-math.sqlite"),
      PLAYWRIGHT_OUTPUT_DIR: path.join(linkedRunRoot, "test-results"),
      PLAYWRIGHT_REPORT_DIR: path.join(linkedRunRoot, "playwright-report")
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const loaded = JSON.parse(result.stdout.trim());
    const cleanupCommand = loaded.webServerCommand.split(" && ")[0];
    const cleanupResult = spawnSync("/bin/sh", ["-c", cleanupCommand], {
      cwd: repoRoot,
      encoding: "utf8",
      env: result.configEnvironment
    });

    assert.notEqual(cleanupResult.status, 0, `${cleanupResult.stdout}\n${cleanupResult.stderr}`);
    assert.match(`${cleanupResult.stdout}\n${cleanupResult.stderr}`, /symlinked ancestor/u);
    assert.equal(readFileSync(preservedSentinel, "utf8"), "must survive rejected symlink cleanup");
  } finally {
    rmSync(cleanupFixtureRoot, { recursive: true, force: true });
    rmSync(linkedRunParent, { recursive: true, force: true });
    rmSync(physicalRunParent, { recursive: true, force: true });
  }
});

test("the cleanup step preserves both inodes when a target is swapped before quarantine rename", () => {
  const cleanupRunRoot = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "race-swap");
  const heldOriginal = `${cleanupRunRoot}.path-safety-held-original`;
  const quarantineParent = path.join(e2eRuntimeRoot, "quarantine", "path-safety-test");
  const originalSentinel = path.join(cleanupRunRoot, "original-sentinel.txt");
  rmSync(cleanupRunRoot, { recursive: true, force: true });
  rmSync(heldOriginal, { recursive: true, force: true });
  rmSync(quarantineParent, { recursive: true, force: true });
  mkdirSync(cleanupRunRoot, { recursive: true });
  writeFileSync(originalSentinel, "original inode must survive the injected race");

  try {
    const result = loadPlaywrightConfig({
      MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
      NODE_ENV: "test",
      PLAYWRIGHT_CLEANUP_TEST_SWAP_BEFORE_RENAME: "PLAYWRIGHT_E2E_ROOT",
      PLAYWRIGHT_SKIP_WEBSERVER: "",
      PLAYWRIGHT_E2E_ROOT: cleanupRunRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: path.join(cleanupRunRoot, "next-dist"),
      PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(cleanupRunRoot, "tsconfig.playwright.tmp.json"),
      HK_MATH_DB_PATH: path.join(cleanupRunRoot, "db", "hk-math.sqlite"),
      PLAYWRIGHT_OUTPUT_DIR: path.join(cleanupRunRoot, "test-results"),
      PLAYWRIGHT_REPORT_DIR: path.join(cleanupRunRoot, "playwright-report")
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const loaded = JSON.parse(result.stdout.trim());
    const cleanupCommand = loaded.webServerCommand.split(" && ")[0];
    const cleanupResult = spawnSync("/bin/sh", ["-c", cleanupCommand], {
      cwd: repoRoot,
      encoding: "utf8",
      env: result.configEnvironment
    });

    assert.notEqual(cleanupResult.status, 0, `${cleanupResult.stdout}\n${cleanupResult.stderr}`);
    assert.match(`${cleanupResult.stdout}\n${cleanupResult.stderr}`, /identity changed before quarantine deletion/u);
    assert.equal(
      readFileSync(path.join(heldOriginal, "original-sentinel.txt"), "utf8"),
      "original inode must survive the injected race"
    );
    const quarantinedFiles = readdirSync(quarantineParent, { recursive: true, encoding: "utf8" });
    assert.ok(
      quarantinedFiles.some((entry) => entry.endsWith("replacement-marker.txt")),
      "the replacement inode should remain quarantined rather than recursively deleted"
    );
  } finally {
    rmSync(cleanupRunRoot, { recursive: true, force: true });
    rmSync(heldOriginal, { recursive: true, force: true });
    rmSync(quarantineParent, { recursive: true, force: true });
  }
});

test("the cleanup step rejects a pre-existing quarantine parent that is not owner-only", () => {
  const cleanupRunRoot = path.join(e2eRuntimeRoot, "runs", "path-safety-test", "unsafe-quarantine-mode");
  const quarantineParent = path.join(e2eRuntimeRoot, "quarantine", "path-safety-test");
  const preservedSentinel = path.join(cleanupRunRoot, "sentinel.txt");
  rmSync(cleanupRunRoot, { recursive: true, force: true });
  rmSync(quarantineParent, { recursive: true, force: true });
  mkdirSync(cleanupRunRoot, { recursive: true });
  mkdirSync(quarantineParent, { recursive: true, mode: 0o700 });
  chmodSync(quarantineParent, 0o755);
  writeFileSync(preservedSentinel, "must survive unsafe quarantine rejection");

  try {
    const result = loadPlaywrightConfig({
      MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
      PLAYWRIGHT_SKIP_WEBSERVER: "",
      PLAYWRIGHT_E2E_ROOT: cleanupRunRoot,
      PLAYWRIGHT_NEXT_DIST_DIR: path.join(cleanupRunRoot, "next-dist"),
      PLAYWRIGHT_NEXT_TSCONFIG_PATH: path.join(cleanupRunRoot, "tsconfig.playwright.tmp.json"),
      HK_MATH_DB_PATH: path.join(cleanupRunRoot, "db", "hk-math.sqlite"),
      PLAYWRIGHT_OUTPUT_DIR: path.join(cleanupRunRoot, "test-results"),
      PLAYWRIGHT_REPORT_DIR: path.join(cleanupRunRoot, "playwright-report")
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const loaded = JSON.parse(result.stdout.trim());
    const cleanupCommand = loaded.webServerCommand.split(" && ")[0];
    const cleanupResult = spawnSync("/bin/sh", ["-c", cleanupCommand], {
      cwd: repoRoot,
      encoding: "utf8",
      env: result.configEnvironment
    });

    assert.notEqual(cleanupResult.status, 0, `${cleanupResult.stdout}\n${cleanupResult.stderr}`);
    assert.match(`${cleanupResult.stdout}\n${cleanupResult.stderr}`, /must be owner-only \(0700\)/u);
    assert.equal(readFileSync(preservedSentinel, "utf8"), "must survive unsafe quarantine rejection");
  } finally {
    chmodSync(quarantineParent, 0o700);
    rmSync(cleanupRunRoot, { recursive: true, force: true });
    rmSync(quarantineParent, { recursive: true, force: true });
  }
});

test("the Goal runtime preflight rejects an npm cache outside its required writable root", () => {
  const result = loadPlaywrightConfig({
    MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
    npm_config_cache: path.join(path.dirname(requiredWriteRoot), "escaped-npm-cache")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /npm_config_cache must stay under MAIS_E2E_REQUIRED_WRITE_ROOT/u);
});

test("the Goal runtime preflight rejects a cache symlink that resolves outside its writable root", () => {
  const result = loadPlaywrightConfig({
    MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
    npm_config_cache: escapedCacheLink
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /npm_config_cache must resolve under MAIS_E2E_REQUIRED_WRITE_ROOT/u);
});

test("the Goal runtime preflight requires the external-artifact override to be unset", () => {
  const result = loadPlaywrightConfig({
    MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
    MAIS_ALLOW_EXTERNAL_ARTIFACTS: "1"
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /MAIS_ALLOW_EXTERNAL_ARTIFACTS must be unset/u);
});

test("the Goal runtime preflight keeps HOME and caches outside the cleaned run root", () => {
  const result = loadPlaywrightConfig({
    MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot,
    HOME: path.join(runRoot, "unsafe-home")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /HOME must stay outside PLAYWRIGHT_E2E_ROOT/u);
});

test("the Goal runtime preflight accepts the complete separated writable-path matrix", () => {
  const result = loadPlaywrightConfig({ MAIS_E2E_REQUIRED_WRITE_ROOT: requiredWriteRoot });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const loaded = JSON.parse(result.stdout.trim());
  assert.equal(path.resolve(repoRoot, loaded.e2eRoot), runRoot);
  assert.equal(path.resolve(repoRoot, loaded.outputDir), path.join(runRoot, "test-results"));
});
