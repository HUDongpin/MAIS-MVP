import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

export const STARSHIP_VOLUME_ROOT = "/Volumes/Starship";
export const STARSHIP_E2E_PATH_SCHEMA_VERSION = 1;

export const MUTABLE_BROWSER_PATH_FLAGS = Object.freeze([
  "user-data-dir",
  "crash-dumps-dir",
  "disk-cache-dir",
  "data-path",
  "homedir",
  "database"
]);

function isPathInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function canonicalizeWithExistingAncestor(value) {
  const absolutePath = path.resolve(value);
  let existingAncestor = absolutePath;
  const missingSegments = [];
  while (!existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    missingSegments.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }
  const canonicalAncestor = realpathSync.native(existingAncestor);
  return path.join(canonicalAncestor, ...missingSegments);
}

function requireAbsolutePath(label, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty absolute path under ${STARSHIP_VOLUME_ROOT}.`);
  }
  if (!path.isAbsolute(value)) {
    throw new Error(`${label} must be absolute; actual=${JSON.stringify(value)}.`);
  }
}

export function assertStarshipPath(label, value, { allowVolumeRoot = false } = {}) {
  requireAbsolutePath(label, value);
  const canonicalStarshipRoot = realpathSync.native(STARSHIP_VOLUME_ROOT);
  const canonicalPath = canonicalizeWithExistingAncestor(value);
  if (!isPathInside(canonicalPath, canonicalStarshipRoot)) {
    throw new Error(
      `${label} resolves outside ${STARSHIP_VOLUME_ROOT}; actual=${canonicalPath}.`
    );
  }
  if (!allowVolumeRoot && canonicalPath === canonicalStarshipRoot) {
    throw new Error(`${label} must be a child of ${STARSHIP_VOLUME_ROOT}, not the volume root itself.`);
  }
  return canonicalPath;
}

function sanitizeRunId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";
}

export function buildStarshipE2ePathManifest({
  repositoryRoot,
  runId,
  overrides = {}
}) {
  const canonicalRepositoryRoot = assertStarshipPath("repositoryRoot", repositoryRoot);
  const safeRunId = sanitizeRunId(runId);
  const defaultRunRoot = path.join(canonicalRepositoryRoot, ".tmp", `e2e-run-${safeRunId}`);
  const e2eRunRoot = assertStarshipPath(
    "paths.e2eRunRoot",
    overrides.e2eRunRoot ?? defaultRunRoot
  );
  const defaults = {
    browserProfileEvidencePath: path.join(e2eRunRoot, "evidence", "browser-profile.json"),
    browserProcessEvidencePath: path.join(e2eRunRoot, "evidence", "browser-processes.json"),
    browserTempDir: path.join(e2eRunRoot, "browser-temp"),
    crashDumpDir: path.join(e2eRunRoot, "browser-crash-dumps"),
    databasePath: path.join(e2eRunRoot, "database", "hk-math-db.sqlite"),
    e2eRunRoot,
    nextDistDir: path.join(e2eRunRoot, "next-dist"),
    nextTsconfigPath: path.join(
      e2eRunRoot,
      `tsconfig.playwright-${safeRunId}.tmp.json`
    ),
    nodeCompileCacheDir: path.join(e2eRunRoot, "node-compile-cache"),
    npmCacheDir: path.join(e2eRunRoot, "npm-cache"),
    outputDir: path.join(e2eRunRoot, "test-results"),
    pathManifestPath: path.join(e2eRunRoot, "evidence", "starship-path-manifest.json"),
    reportDir: path.join(e2eRunRoot, "playwright-report"),
    repositoryRoot: canonicalRepositoryRoot,
    serverCommandOwnerPidPath: path.join(e2eRunRoot, "server", "server-command-owner.pid"),
    serverLogPath: path.join(e2eRunRoot, "server", "server.log")
  };
  const paths = Object.fromEntries(
    Object.entries(defaults).map(([label, defaultValue]) => [
      label,
      assertStarshipPath(`paths.${label}`, overrides[label] ?? defaultValue)
    ])
  );
  if (!isPathInside(paths.e2eRunRoot, paths.repositoryRoot)) {
    throw new Error(
      `paths.e2eRunRoot must stay inside the repository worktree; actual=${paths.e2eRunRoot}.`
    );
  }
  for (const [label, value] of Object.entries(paths)) {
    if (label === "repositoryRoot" || label === "e2eRunRoot") continue;
    if (!isPathInside(value, paths.e2eRunRoot)) {
      throw new Error(`${label} must stay inside paths.e2eRunRoot; actual=${value}.`);
    }
  }
  return Object.freeze({
    contract: Object.freeze({
      mutablePathsOnlyOnStarship: true,
      serverCommandOwnerPidSemantics: "shell-command-owner-that-execs-npm-start",
      starshipRoot: realpathSync.native(STARSHIP_VOLUME_ROOT)
    }),
    paths: Object.freeze(paths),
    runId: safeRunId,
    schemaVersion: STARSHIP_E2E_PATH_SCHEMA_VERSION
  });
}

export function validateStarshipE2ePathManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Starship E2E path manifest must be an object.");
  }
  if (manifest.schemaVersion !== STARSHIP_E2E_PATH_SCHEMA_VERSION) {
    throw new Error(
      `Starship E2E path manifest schema mismatch; actual=${String(manifest.schemaVersion)}.`
    );
  }
  if (!manifest.paths || typeof manifest.paths !== "object" || Array.isArray(manifest.paths)) {
    throw new Error("Starship E2E path manifest paths must be an object.");
  }
  if (
    manifest.contract?.mutablePathsOnlyOnStarship !== true ||
    manifest.contract?.serverCommandOwnerPidSemantics !==
      "shell-command-owner-that-execs-npm-start" ||
    manifest.contract?.starshipRoot !== realpathSync.native(STARSHIP_VOLUME_ROOT)
  ) {
    throw new Error("Starship E2E path manifest contract is missing or malformed.");
  }
  const rebuilt = buildStarshipE2ePathManifest({
    repositoryRoot: manifest.paths.repositoryRoot,
    runId: manifest.runId,
    overrides: manifest.paths
  });
  for (const [label, expected] of Object.entries(rebuilt.paths)) {
    if (manifest.paths[label] !== expected) {
      throw new Error(`paths.${label} is not canonical; actual=${String(manifest.paths[label])}.`);
    }
  }
  return manifest;
}

export function assertStarshipE2eEnvironment(
  environment,
  expectedBrowserTempDir,
  expectedNodeCompileCacheDir = path.join(path.dirname(expectedBrowserTempDir), "node-compile-cache"),
  expectedNpmCacheDir = path.join(path.dirname(expectedBrowserTempDir), "npm-cache")
) {
  const canonicalBrowserTempDir = assertStarshipPath(
    "expectedBrowserTempDir",
    expectedBrowserTempDir
  );
  if (environment.PLAYWRIGHT_STARSHIP_PRELAUNCH !== "1") {
    throw new Error(
      "PLAYWRIGHT_STARSHIP_PRELAUNCH=1 must be set before the Playwright Node process starts."
    );
  }
  const normalized = { PLAYWRIGHT_STARSHIP_PRELAUNCH: "1" };
  for (const name of ["TEMP", "TMP", "TMPDIR"]) {
    const actual = assertStarshipPath(name, environment[name]);
    if (actual !== canonicalBrowserTempDir) {
      throw new Error(
        `${name} must equal the canonical browser temp directory ${canonicalBrowserTempDir}; actual=${actual}.`
      );
    }
    normalized[name] = actual;
  }
  const canonicalNodeCompileCacheDir = assertStarshipPath(
    "expectedNodeCompileCacheDir",
    expectedNodeCompileCacheDir
  );
  const actualNodeCompileCacheDir = assertStarshipPath(
    "NODE_COMPILE_CACHE",
    environment.NODE_COMPILE_CACHE
  );
  if (actualNodeCompileCacheDir !== canonicalNodeCompileCacheDir) {
    throw new Error(
      `NODE_COMPILE_CACHE must equal ${canonicalNodeCompileCacheDir}; actual=${actualNodeCompileCacheDir}.`
    );
  }
  normalized.NODE_COMPILE_CACHE = actualNodeCompileCacheDir;
  const canonicalNpmCacheDir = assertStarshipPath(
    "expectedNpmCacheDir",
    expectedNpmCacheDir
  );
  const actualNpmCacheDir = assertStarshipPath(
    "npm_config_cache",
    environment.npm_config_cache
  );
  if (actualNpmCacheDir !== canonicalNpmCacheDir) {
    throw new Error(
      `npm_config_cache must equal ${canonicalNpmCacheDir}; actual=${actualNpmCacheDir}.`
    );
  }
  normalized.npm_config_cache = actualNpmCacheDir;
  if (environment.NEXT_TELEMETRY_DISABLED !== "1") {
    throw new Error("NEXT_TELEMETRY_DISABLED=1 is required for Starship E2E execution.");
  }
  normalized.NEXT_TELEMETRY_DISABLED = "1";
  return normalized;
}

export function parseMutableBrowserPathArguments(command) {
  const flagPattern = MUTABLE_BROWSER_PATH_FLAGS.join("|");
  const pattern = new RegExp(
    `--(${flagPattern})=(?:"([^"]*)"|'([^']*)'|([^\\r\\n]*?))(?=\\s+--|$)`,
    "gu"
  );
  return [...String(command ?? "").matchAll(pattern)].map((match) => ({
    flag: match[1],
    path: match[2] ?? match[3] ?? match[4]
  }));
}

export function assertMutableBrowserPathsOnStarship(command) {
  const mutablePaths = parseMutableBrowserPathArguments(command);
  for (const entry of mutablePaths) {
    assertStarshipPath(`browser --${entry.flag}`, entry.path);
  }
  return mutablePaths;
}

function processRows() {
  const output = execFileSync("ps", ["-axo", "pid=,ppid=,command="], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return output
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/u))
    .filter(Boolean)
    .map((match) => ({
      command: match[3],
      pid: Number(match[1]),
      ppid: Number(match[2])
    }));
}

function descendantProcessRows(rows, ancestorPid) {
  const childrenByParent = new Map();
  const rowByPid = new Map(rows.map((row) => [row.pid, row]));
  for (const row of rows) {
    const children = childrenByParent.get(row.ppid) ?? [];
    children.push(row.pid);
    childrenByParent.set(row.ppid, children);
  }
  const descendants = [];
  const pending = [...(childrenByParent.get(ancestorPid) ?? [])];
  const seen = new Set();
  while (pending.length > 0) {
    const pid = pending.pop();
    if (pid === undefined || seen.has(pid)) continue;
    seen.add(pid);
    const row = rowByPid.get(pid);
    if (row) descendants.push(row);
    pending.push(...(childrenByParent.get(pid) ?? []));
  }
  return descendants;
}

function isBrowserMainProcess(row) {
  return row.command.includes("--remote-debugging-pipe") && !/\s--type=/u.test(row.command);
}

export function auditStarshipBrowserProcessRows({
  ancestorPid,
  expectedBrowserTempDir,
  rows
}) {
  const canonicalBrowserTempDir = assertStarshipPath(
    "expectedBrowserTempDir",
    expectedBrowserTempDir
  );
  const descendantRows = descendantProcessRows(rows, ancestorPid);
  const processMutablePathAudit = descendantRows.flatMap((row) =>
    assertMutableBrowserPathsOnStarship(row.command).map((entry) => ({
      ...entry,
      pid: row.pid,
      processKind: isBrowserMainProcess(row)
        ? "browser-main"
        : row.command.includes("crashpad_handler")
          ? "crashpad"
          : "descendant"
    }))
  );
  const observations = descendantRows
    .filter(isBrowserMainProcess)
    .map((row) => {
      const browserTree = [row, ...descendantProcessRows(rows, row.pid)];
      const mutablePaths = browserTree.flatMap((browserProcess) =>
        assertMutableBrowserPathsOnStarship(browserProcess.command).map((entry) => ({
          ...entry,
          pid: browserProcess.pid
        }))
      );
      const userDataDir = mutablePaths.find(({ flag, pid }) =>
        flag === "user-data-dir" && pid === row.pid
      )?.path;
      if (!userDataDir) return null;
      const canonicalUserDataDir = assertStarshipPath(
        "observed fixture Chrome --user-data-dir",
        userDataDir
      );
      if (!canonicalUserDataDir.startsWith(`${canonicalBrowserTempDir}${path.sep}`)) {
        throw new Error(
          `Observed fixture Chrome --user-data-dir escaped browserTempDir; actual=${canonicalUserDataDir}.`
        );
      }
      return {
        browserPid: row.pid,
        mutablePaths,
        processCount: browserTree.length,
        userDataDir: canonicalUserDataDir
      };
    })
    .filter(Boolean);
  return {
    observations,
    processMutablePathAudit
  };
}

export function snapshotStarshipBrowserProcesses(ancestorPid, expectedBrowserTempDir) {
  return auditStarshipBrowserProcessRows({
    ancestorPid,
    expectedBrowserTempDir,
    rows: processRows()
  });
}

export async function monitorStarshipBrowserProcesses({
  ancestorPid,
  expectedBrowserTempDir,
  isComplete,
  minimumDistinctProfiles = 2,
  pollIntervalMs = 25
}) {
  const observationsByProfile = new Map();
  const processMutablePathAudit = new Map();
  let firstViolation = null;
  do {
    try {
      const snapshot = snapshotStarshipBrowserProcesses(
        ancestorPid,
        expectedBrowserTempDir
      );
      for (const observation of snapshot.observations) {
        observationsByProfile.set(observation.userDataDir, observation);
      }
      for (const entry of snapshot.processMutablePathAudit) {
        processMutablePathAudit.set(`${entry.pid}:${entry.flag}:${entry.path}`, entry);
      }
    } catch (error) {
      firstViolation ??= error instanceof Error ? error.message : String(error);
    }
    if (!isComplete()) {
      await new Promise((resolvePoll) => setTimeout(resolvePoll, pollIntervalMs));
    }
  } while (!isComplete());

  const observations = [...observationsByProfile.values()];
  const violation = firstViolation ?? (
    observations.length < minimumDistinctProfiles
      ? (
      `Expected at least ${minimumDistinctProfiles} distinct actual Chrome profiles ` +
        `(global setup plus test fixture); observed=${observations.length}.`
      )
      : null
  );
  const evidence = {
    ancestorPid,
    immutableExecutablePathsExcludedFromMutableArtifactClassification: true,
    minimumDistinctProfiles,
    observations,
    processMutablePathAudit: [...processMutablePathAudit.values()],
    schemaVersion: 1,
    status: violation ? "failed" : "passed",
    ...(violation ? { violation } : {})
  };
  if (violation) {
    const error = new Error(violation);
    error.evidence = evidence;
    throw error;
  }
  return evidence;
}
