import assert from "node:assert/strict";
import { mkdirSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const requiredWriteRoot = path.dirname(repoRoot);
const runtimeRoot = path.join(repoRoot, ".tmp", "china-lesson-e2e-runtime", "path-safety-test");
const runRoot = path.join(runtimeRoot, "runs", "safe-run");
const environmentRoot = path.join(runtimeRoot, "environment");

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
  unset.forEach((name) => delete env[name]);

  return spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", importConfigScript],
    { cwd: repoRoot, encoding: "utf8", env }
  );
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

test("Playwright rejects a Next dist directory outside the worktree .tmp root", () => {
  const result = loadPlaywrightConfig({
    PLAYWRIGHT_NEXT_DIST_DIR: path.join(path.parse(repoRoot).root, "private", "tmp", "escaped-next-dist")
  });

  assert.notEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /PLAYWRIGHT_NEXT_DIST_DIR must stay under \.tmp/u);
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
    .find((command) => command.startsWith("node -e "));
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
