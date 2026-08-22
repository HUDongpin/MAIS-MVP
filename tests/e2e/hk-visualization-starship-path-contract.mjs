import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize, relative } from "node:path";

export const HK_VISUALIZATION_STARSHIP_ROOT = "/Volumes/Starship";
export const HK_VISUALIZATION_STARSHIP_PATH_CONTRACT_VERSION =
  "hk-viz-starship-paths-v6";

const PHYSICAL_IDENTITY_KEYS = Object.freeze([
  "device",
  "inode",
  "path",
  "realpath",
]);
const VOLUME_IDENTITY_KEYS = Object.freeze([
  "starshipRoot",
  "systemRoot",
  "workspace",
]);
const TOOLCHAIN_IDENTITY_KEYS = Object.freeze([
  "nextBuildScript",
  "nextCli",
  "nodeExecutable",
]);

const PATH_KEYS = Object.freeze([
  "workspace",
  "artifactRoot",
  "browserProfileParent",
  "runtimeTmpDir",
  "nextDistDir",
  "nextTsconfigPath",
  "nodeCompileCacheDir",
  "npmCacheDir",
  "npmLogsDir",
  "sqliteTmpDir",
  "databasePath",
  "outputDir",
  "reportDir",
  "jsonReport",
  "serviceLogDir",
  "servicePidDir",
  "xdgCacheDir",
  "xdgConfigDir",
  "xdgStateDir",
  "chromeLogPath",
  "pathManifestFile",
  "releaseSourceReceiptPath",
  "runtimeProfileReceiptPath",
  "globalProfileMonitorDir",
  "globalProfileMonitorTmpDir",
  "globalProfileMonitorReceiptPath",
  "globalProfileMonitorReadyPath",
  "globalProfileMonitorStopPath",
  "globalProfileMonitorPidPath",
  "globalProfileMonitorLogPath",
  "workloadSupervisorDir",
  "workloadSupervisorTmpDir",
  "workloadSupervisorReceiptPath",
  "workloadSupervisorReadyPath",
  "workloadSupervisorStartPath",
  "workloadSupervisorPidPath",
  "workloadSupervisorLeaderPath",
  "workloadSupervisorLogPath",
  "workloadSupervisorNextEnvSnapshotPath",
  "workloadSupervisorLockPath",
]);

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Path evidence numbers must be finite.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object")
    throw new Error("Path evidence must be canonical JSON data.");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error("Path evidence objects must be plain objects.");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function sha256(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactObjectKeys(value, expectedKeys) {
  return (
    isPlainObject(value) &&
    canonicalJson(Object.keys(value).sort()) ===
      canonicalJson([...expectedKeys].sort())
  );
}

function physicalIdentityValueIsValid(value) {
  return typeof value === "string" && /^[1-9][0-9]*$/.test(value);
}

/**
 * Capture one physical path identity without following an alias at the final
 * entry or accepting a parent-chain alias through a different real path.
 * Device and inode are decimal strings so evidence remains lossless on file
 * systems whose native identifiers exceed JavaScript's safe integer range.
 */
export function captureHkVisualizationPhysicalPathIdentity(
  label,
  value,
  { expectedType = "directory" } = {},
) {
  if (typeof value !== "string" || !value.trim() || !isAbsolute(value)) {
    throw new Error(`${label} must be a non-empty absolute physical path.`);
  }
  const absolutePath = normalize(value);
  const metadata = lstatSync(absolutePath, { bigint: true });
  if (metadata.isSymbolicLink()) {
    throw new Error(`${label} cannot be a symlink alias: ${absolutePath}.`);
  }
  if (expectedType === "directory" && !metadata.isDirectory()) {
    throw new Error(`${label} must be a physical directory: ${absolutePath}.`);
  }
  if (expectedType === "file" && !metadata.isFile()) {
    throw new Error(`${label} must be a physical regular file: ${absolutePath}.`);
  }
  if (!new Set(["directory", "file"]).has(expectedType)) {
    throw new Error(`${label} requested an unsupported physical entry type.`);
  }
  const realpath = realpathSync(absolutePath);
  if (realpath !== absolutePath) {
    throw new Error(
      `${label} resolves through a physical path alias: path=${absolutePath}, realpath=${realpath}.`,
    );
  }
  return Object.freeze({
    device: metadata.dev.toString(10),
    inode: metadata.ino.toString(10),
    path: absolutePath,
    realpath,
  });
}

function validatePhysicalIdentityRecord(identity, expectedPath, label) {
  const issues = [];
  if (!exactObjectKeys(identity, PHYSICAL_IDENTITY_KEYS)) {
    return [`${label} physical identity key set drift`];
  }
  if (identity.path !== expectedPath) issues.push(`${label} path drift`);
  if (identity.realpath !== expectedPath) issues.push(`${label} realpath alias`);
  if (!physicalIdentityValueIsValid(identity.device))
    issues.push(`${label} device invalid`);
  if (!physicalIdentityValueIsValid(identity.inode))
    issues.push(`${label} inode invalid`);
  return issues;
}

function captureVolumeIdentity(workspace) {
  const volumeIdentity = Object.freeze({
    systemRoot: captureHkVisualizationPhysicalPathIdentity(
      "system root identity",
      "/",
    ),
    starshipRoot: captureHkVisualizationPhysicalPathIdentity(
      "Starship root identity",
      HK_VISUALIZATION_STARSHIP_ROOT,
    ),
    workspace: captureHkVisualizationPhysicalPathIdentity(
      "HK Visualization workspace identity",
      workspace,
    ),
  });
  if (
    volumeIdentity.starshipRoot.device !== volumeIdentity.workspace.device
  ) {
    throw new Error(
      "HK Visualization workspace must be on the same physical device as /Volumes/Starship.",
    );
  }
  if (
    volumeIdentity.systemRoot.device === volumeIdentity.starshipRoot.device
  ) {
    throw new Error(
      "HK Visualization /Volumes/Starship must be a physical device distinct from the system root device.",
    );
  }
  return volumeIdentity;
}

function captureToolchainIdentity(workspace) {
  const nodeExecutable = normalize(process.execPath);
  const nextBuildScript = join(workspace, "scripts", "next-clean-build.mjs");
  const nextCli = join(workspace, "node_modules", "next", "dist", "bin", "next");
  return Object.freeze({
    nodeExecutable: captureHkVisualizationPhysicalPathIdentity(
      "HK Visualization Node executable",
      nodeExecutable,
      { expectedType: "file" },
    ),
    nextBuildScript: captureHkVisualizationPhysicalPathIdentity(
      "HK Visualization clean-build entrypoint",
      nextBuildScript,
      { expectedType: "file" },
    ),
    nextCli: captureHkVisualizationPhysicalPathIdentity(
      "HK Visualization Next CLI entrypoint",
      nextCli,
      { expectedType: "file" },
    ),
  });
}

/**
 * Resolve the exact physical Node and Next entrypoints only for a real managed
 * build/start command. Generic manifest consumers (for example isolated
 * supervisor fixtures) do not require a dependency tree, while the release
 * runner can preserve this identity in its dedicated source receipt.
 */
export function captureHkVisualizationManagedToolchainIdentity(manifest) {
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0) {
    throw new Error(
      `Cannot capture the managed toolchain from an invalid manifest: ${manifestIssues.join("; ")}.`,
    );
  }
  const identity = captureToolchainIdentity(manifest.workspace);
  if (!exactObjectKeys(identity, TOOLCHAIN_IDENTITY_KEYS)) {
    throw new Error("HK Visualization managed toolchain key set drifted.");
  }
  for (const key of ["nextBuildScript", "nextCli"]) {
    if (identity[key].device !== manifest.volumeIdentity.starshipRoot.device) {
      throw new Error(
        `HK Visualization ${key} must remain on the bound Starship device.`,
      );
    }
  }
  return identity;
}

function validateVolumeIdentity(volumeIdentity, workspace) {
  const issues = [];
  if (!exactObjectKeys(volumeIdentity, VOLUME_IDENTITY_KEYS)) {
    return ["volumeIdentity key set drift"];
  }
  const expectedPaths = {
    systemRoot: "/",
    starshipRoot: HK_VISUALIZATION_STARSHIP_ROOT,
    workspace,
  };
  for (const key of VOLUME_IDENTITY_KEYS) {
    issues.push(
      ...validatePhysicalIdentityRecord(
        volumeIdentity[key],
        expectedPaths[key],
        `volumeIdentity.${key}`,
      ),
    );
  }
  if (
    volumeIdentity.starshipRoot?.device !== volumeIdentity.workspace?.device
  ) {
    issues.push("workspace device differs from Starship root device");
  }
  if (
    volumeIdentity.systemRoot?.device === volumeIdentity.starshipRoot?.device
  ) {
    issues.push("Starship root device matches system root device");
  }
  try {
    const liveIdentity = captureVolumeIdentity(workspace);
    if (canonicalJson(liveIdentity) !== canonicalJson(volumeIdentity)) {
      issues.push("volumeIdentity live physical identity drift");
    }
  } catch (error) {
    issues.push(
      `volumeIdentity live capture failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return issues;
}

function pathIsInside(candidate, root) {
  const child = relative(root, candidate);
  return child !== "" && !child.startsWith("..") && !isAbsolute(child);
}

function nearestExistingAncestor(absolutePath) {
  let candidate = absolutePath;
  while (true) {
    try {
      lstatSync(candidate);
      return candidate;
    } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "ENOENT") {
        throw error;
      }
    }
    const parent = dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
}

export function assertHkVisualizationStarshipPath(label, value) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} must be a non-empty absolute /Volumes/Starship path.`);
  if (!isAbsolute(value))
    throw new Error(`${label} must be an absolute /Volumes/Starship path; received ${JSON.stringify(value)}.`);
  const absolutePath = normalize(value);
  const lexicalRoot = normalize(HK_VISUALIZATION_STARSHIP_ROOT);
  captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization Starship root",
    lexicalRoot,
  );
  if (absolutePath === lexicalRoot)
    throw new Error(`${label} cannot target the /Volumes/Starship root itself.`);
  if (!pathIsInside(absolutePath, lexicalRoot)) {
    throw new Error(`${label} must stay inside /Volumes/Starship without lexical escape; received ${absolutePath}.`);
  }

  const existingAncestor = nearestExistingAncestor(absolutePath);
  if (!existingAncestor)
    throw new Error(`${label} has no existing ancestor that can be verified.`);
  const ancestorRelative = relative(lexicalRoot, existingAncestor);
  let current = lexicalRoot;
  for (const segment of ancestorRelative.split("/").filter(Boolean)) {
    current = join(current, segment);
    if (lstatSync(current).isSymbolicLink()) {
      throw new Error(
        `${label} contains a symlink alias at ${current}; every existing path segment must be a physical Starship entry.`,
      );
    }
  }
  const realRoot = realpathSync(lexicalRoot);
  const realAncestor = realpathSync(existingAncestor);
  if (realAncestor !== realRoot && !pathIsInside(realAncestor, realRoot)) {
    throw new Error(
      `${label} escapes /Volumes/Starship through a symlink or foreign real path: ${realAncestor}.`,
    );
  }
  return absolutePath;
}

function buildPaths(workspace, runId) {
  const artifactRoot = join(workspace, ".tmp", runId);
  const globalProfileMonitorDir = join(
    artifactRoot,
    "global-profile-monitor",
  );
  const workloadSupervisorDir = join(
    artifactRoot,
    "workload-supervisor",
  );
  return Object.freeze({
    workspace,
    artifactRoot,
    browserProfileParent: join(artifactRoot, "runtime-tmp"),
    runtimeTmpDir: join(artifactRoot, "runtime-tmp"),
    nextDistDir: join(artifactRoot, "next-dist"),
    // Next resolves `extends`, include globs, and inherited aliases relative
    // to the active tsconfig file. Keep the disposable config at the worktree
    // root while every build/browser artifact remains inside this run root.
    nextTsconfigPath: join(workspace, `tsconfig.playwright-${runId}.tmp.json`),
    nodeCompileCacheDir: join(artifactRoot, "node-compile-cache"),
    npmCacheDir: join(artifactRoot, "npm-cache"),
    npmLogsDir: join(artifactRoot, "npm-cache", "_logs"),
    sqliteTmpDir: join(artifactRoot, "sqlite-tmp"),
    databasePath: join(artifactRoot, "hk-math-db.sqlite"),
    outputDir: join(artifactRoot, "test-results"),
    reportDir: join(artifactRoot, "html-report"),
    jsonReport: join(artifactRoot, "playwright-report.json"),
    serviceLogDir: join(artifactRoot, "service-logs"),
    servicePidDir: join(artifactRoot, "service-pids"),
    xdgCacheDir: join(artifactRoot, "xdg-cache"),
    xdgConfigDir: join(artifactRoot, "xdg-config"),
    xdgStateDir: join(artifactRoot, "xdg-state"),
    chromeLogPath: join(artifactRoot, "service-logs", "chrome.log"),
    pathManifestFile: join(artifactRoot, "starship-path-manifest.json"),
    releaseSourceReceiptPath: join(
      artifactRoot,
      "release-source-receipt.json",
    ),
    runtimeProfileReceiptPath: join(
      artifactRoot,
      "runtime-browser-profile-receipt.json",
    ),
    globalProfileMonitorDir,
    globalProfileMonitorTmpDir: join(globalProfileMonitorDir, "runtime-tmp"),
    globalProfileMonitorReceiptPath: join(
      globalProfileMonitorDir,
      "receipt.json",
    ),
    globalProfileMonitorReadyPath: join(
      globalProfileMonitorDir,
      "ready.json",
    ),
    globalProfileMonitorStopPath: join(
      globalProfileMonitorDir,
      "stop.signal",
    ),
    globalProfileMonitorPidPath: join(globalProfileMonitorDir, "monitor.pid"),
    globalProfileMonitorLogPath: join(globalProfileMonitorDir, "monitor.log"),
    workloadSupervisorDir,
    workloadSupervisorTmpDir: join(workloadSupervisorDir, "runtime-tmp"),
    workloadSupervisorReceiptPath: join(workloadSupervisorDir, "receipt.json"),
    workloadSupervisorReadyPath: join(workloadSupervisorDir, "ready.json"),
    workloadSupervisorStartPath: join(workloadSupervisorDir, "start.signal"),
    workloadSupervisorPidPath: join(workloadSupervisorDir, "supervisor.pid"),
    workloadSupervisorLeaderPath: join(workloadSupervisorDir, "leader.json"),
    workloadSupervisorLogPath: join(workloadSupervisorDir, "supervisor.log"),
    workloadSupervisorNextEnvSnapshotPath: join(
      workloadSupervisorDir,
      "next-env.snapshot",
    ),
    workloadSupervisorLockPath: join(workloadSupervisorDir, "run.lock"),
  });
}

/**
 * @param {{
 *   workspace: string;
 *   nextDistDir: string;
 *   exclude?: string[];
 * }} options
 */
export function buildHkVisualizationE2eTsconfig({
  workspace,
  nextDistDir,
  exclude = [],
}) {
  const absoluteWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization tsconfig workspace",
    workspace,
  );
  const absoluteNextDistDir = assertHkVisualizationStarshipPath(
    "HK Visualization tsconfig Next distDir",
    nextDistDir,
  );
  if (!Array.isArray(exclude) || exclude.some((value) => typeof value !== "string"))
    throw new Error("HK Visualization tsconfig exclude must be an array of strings.");
  const relativeNextDistDir = relative(absoluteWorkspace, absoluteNextDistDir);
  if (
    relativeNextDistDir === "" ||
    relativeNextDistDir.startsWith("..") ||
    isAbsolute(relativeNextDistDir) ||
    !relativeNextDistDir.startsWith(".tmp/")
  ) {
    throw new Error(
      `HK Visualization tsconfig Next distDir must stay in the workspace .tmp directory; received ${relativeNextDistDir}.`,
    );
  }
  return Object.freeze({
    extends: "./tsconfig.json",
    include: Object.freeze([
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      `${relativeNextDistDir}/types/**/*.ts`,
    ]),
    exclude: Object.freeze([...exclude]),
  });
}

const HK_VISUALIZATION_DISABLED_PROVIDER_ASSIGNMENTS = Object.freeze([
  "LLM_API_KEY=",
  "OPENAI_API_KEY=",
  "LLM_MODEL=",
  "OPENAI_MODEL=",
  "LLM_API_URL=",
  "DEEPSEEK_API_KEY=",
  "DEEPSEEK_MODEL=",
  "DEEPSEEK_API_URL=",
  "QWEN_API_KEY=",
  "QWEN_API_URL=",
  "QWEN_MODEL=",
  "QWEN_TEXT_MODEL=qwen3.7-plus",
  "QWEN_IMAGE_MODEL=",
  "QWEN_IMAGE_API_URL=",
  "QWEN_REALTIME_MODEL=",
  "QWEN_REALTIME_API_URL=",
  "AI_TUTOR_PROVIDER_PROFILE=offline-fixture",
]);

function shellQuote(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * @param {{ manifest: Record<string, unknown>; port?: number }} options
 */
export function buildHkVisualizationManagedWebServerCommand({
  manifest,
  port = 3020,
}) {
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0) {
    throw new Error(
      `Cannot build HK Visualization managed webServer command from an invalid path manifest: ${manifestIssues.join("; ")}.`,
    );
  }
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`HK Visualization managed webServer port is invalid: ${port}.`);
  }
  const paths = manifest;
  const nextDistDirForBuild = relative(paths.workspace, paths.nextDistDir);
  const nextTsconfigPathForBuild = relative(
    paths.workspace,
    paths.nextTsconfigPath,
  );
  if (
    nextDistDirForBuild === "" ||
    nextDistDirForBuild.startsWith("..") ||
    isAbsolute(nextDistDirForBuild) ||
    !nextDistDirForBuild.startsWith(".tmp/")
  ) {
    throw new Error(
      `HK Visualization managed Next distDir must resolve to a repository-relative .tmp path; received ${nextDistDirForBuild}.`,
    );
  }
  if (
    nextTsconfigPathForBuild === "" ||
    nextTsconfigPathForBuild.startsWith("..") ||
    isAbsolute(nextTsconfigPathForBuild) ||
    !/^tsconfig\.playwright-[A-Za-z0-9._-]+\.tmp\.json$/.test(
      nextTsconfigPathForBuild,
    )
  ) {
    throw new Error(
      `HK Visualization managed tsconfig must be a unique worktree-root disposable file; received ${nextTsconfigPathForBuild}.`,
    );
  }
  const runtimeAssignments = [
    ["HOME", paths.runtimeTmpDir],
    ["NODE_OPTIONS", "--max-old-space-size=8192"],
    ["TMPDIR", paths.runtimeTmpDir],
    ["TMP", paths.runtimeTmpDir],
    ["TEMP", paths.runtimeTmpDir],
    ["SQLITE_TMPDIR", paths.sqliteTmpDir],
    ["NODE_COMPILE_CACHE", paths.nodeCompileCacheDir],
    ["NPM_CONFIG_CACHE", paths.npmCacheDir],
    ["npm_config_cache", paths.npmCacheDir],
    ["NPM_CONFIG_LOGS_DIR", paths.npmLogsDir],
    ["npm_config_logs_dir", paths.npmLogsDir],
    ["XDG_CACHE_HOME", paths.xdgCacheDir],
    ["XDG_CONFIG_HOME", paths.xdgConfigDir],
    ["XDG_STATE_HOME", paths.xdgStateDir],
    // `next-clean-build.mjs` intentionally accepts only repository-relative
    // generated paths. The evidence manifest retains the canonical absolute
    // Starship path; the spawned build/start process receives its exact
    // repository-relative spelling.
    ["NEXT_DIST_DIR", nextDistDirForBuild],
  ]
    .map(([name, value]) => `${name}=${shellQuote(value)}`)
    .join(" ");
  const disabledProviderEnv =
    HK_VISUALIZATION_DISABLED_PROVIDER_ASSIGNMENTS.join(" ");
  const toolchainIdentity =
    captureHkVisualizationManagedToolchainIdentity(manifest);
  const nodeExecutable = toolchainIdentity.nodeExecutable.path;
  const nextBuildScript = toolchainIdentity.nextBuildScript.path;
  const nextCli = toolchainIdentity.nextCli.path;
  return [
    `/bin/rm -rf ${shellQuote(paths.nextDistDir)} ${shellQuote(paths.outputDir)} ${shellQuote(paths.reportDir)} ${shellQuote(paths.runtimeTmpDir)} ${shellQuote(paths.sqliteTmpDir)} ${shellQuote(paths.nodeCompileCacheDir)} ${shellQuote(paths.npmCacheDir)} ${shellQuote(paths.xdgCacheDir)} ${shellQuote(paths.xdgConfigDir)} ${shellQuote(paths.xdgStateDir)} ${shellQuote(paths.serviceLogDir)} ${shellQuote(paths.servicePidDir)}`,
    `/bin/rm -f ${shellQuote(paths.databasePath)} ${shellQuote(paths.jsonReport)} ${shellQuote(paths.chromeLogPath)} ${shellQuote(paths.runtimeProfileReceiptPath)}`,
    `/bin/mkdir -p ${shellQuote(dirname(paths.databasePath))} ${shellQuote(dirname(paths.nextTsconfigPath))} ${shellQuote(paths.outputDir)} ${shellQuote(paths.reportDir)} ${shellQuote(paths.runtimeTmpDir)} ${shellQuote(paths.sqliteTmpDir)} ${shellQuote(paths.nodeCompileCacheDir)} ${shellQuote(paths.npmCacheDir)} ${shellQuote(paths.npmLogsDir)} ${shellQuote(paths.xdgCacheDir)} ${shellQuote(paths.xdgConfigDir)} ${shellQuote(paths.xdgStateDir)} ${shellQuote(paths.serviceLogDir)} ${shellQuote(paths.servicePidDir)}`,
    `${runtimeAssignments} NEXT_TSCONFIG_PATH=${shellQuote(nextTsconfigPathForBuild)} ${disabledProviderEnv} NEXT_PUBLIC_SHOW_EXAMPLE_ACCOUNTS=true ${shellQuote(nodeExecutable)} ${shellQuote(nextBuildScript)}`,
    `${runtimeAssignments} ${disabledProviderEnv} AUTH_SESSION_SECRET=e2e-session-secret HK_MATH_DB_PATH=${shellQuote(paths.databasePath)} HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true HK_MATH_ENABLE_DEMO_USER=true AI_TUTOR_MAX_REQUESTS_PER_MINUTE=2 HK_MATH_E2E_LOGIN_IDENTIFIER_MAX=400 ${shellQuote(nodeExecutable)} ${shellQuote(nextCli)} start --hostname 127.0.0.1 --port ${port}`,
  ].join(" && ");
}

function manifestHashInput(manifest) {
  return {
    contractVersion: manifest.contractVersion,
    root: manifest.root,
    runId: manifest.runId,
    paths: manifest.paths,
    volumeIdentity: manifest.volumeIdentity,
  };
}

export function buildHkVisualizationStarshipPathManifest({ workspace, runId }) {
  const absoluteWorkspace = assertHkVisualizationStarshipPath(
    "HK Visualization E2E workspace",
    workspace,
  );
  if (
    typeof runId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)
  ) {
    throw new Error(`HK Visualization runId is unsafe: ${JSON.stringify(runId)}.`);
  }
  const paths = buildPaths(absoluteWorkspace, runId);
  for (const key of PATH_KEYS)
    assertHkVisualizationStarshipPath(`HK Visualization ${key}`, paths[key]);
  const volumeIdentity = captureVolumeIdentity(absoluteWorkspace);
  const base = {
    contractVersion: HK_VISUALIZATION_STARSHIP_PATH_CONTRACT_VERSION,
    root: HK_VISUALIZATION_STARSHIP_ROOT,
    runId,
    paths,
    volumeIdentity,
  };
  const manifest = {
    ...base,
    ...paths,
    manifestHash: sha256(base),
  };
  const issues = validateHkVisualizationStarshipPathManifest(manifest);
  if (issues.length > 0)
    throw new Error(`Invalid HK Visualization Starship path manifest: ${issues.join("; ")}.`);
  Object.freeze(manifest.paths);
  Object.freeze(manifest.volumeIdentity);
  return Object.freeze(manifest);
}

export function validateHkVisualizationStarshipPathManifest(manifest) {
  const issues = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest))
    return ["manifest must be an object"];
  const expectedTopLevelKeys = [
    "contractVersion",
    "root",
    "runId",
    "paths",
    "volumeIdentity",
    "manifestHash",
    ...PATH_KEYS,
  ].sort();
  if (
    canonicalJson(Object.keys(manifest).sort()) !==
    canonicalJson(expectedTopLevelKeys)
  ) {
    issues.push("top-level key set drift");
  }
  if (manifest.contractVersion !== HK_VISUALIZATION_STARSHIP_PATH_CONTRACT_VERSION)
    issues.push("contractVersion drift");
  if (manifest.root !== HK_VISUALIZATION_STARSHIP_ROOT) issues.push("root drift");
  if (
    typeof manifest.runId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(manifest.runId)
  )
    issues.push("runId invalid");
  if (!manifest.paths || typeof manifest.paths !== "object" || Array.isArray(manifest.paths))
    return [...issues, "paths must be an object"];
  const actualKeys = Object.keys(manifest.paths).sort();
  const expectedKeys = [...PATH_KEYS].sort();
  if (canonicalJson(actualKeys) !== canonicalJson(expectedKeys))
    issues.push("path key set drift");

  let expectedPaths = null;
  try {
    const workspace = assertHkVisualizationStarshipPath(
      "manifest workspace",
      manifest.paths.workspace,
    );
    expectedPaths = buildPaths(workspace, manifest.runId);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  for (const key of PATH_KEYS) {
    try {
      assertHkVisualizationStarshipPath(`manifest ${key}`, manifest.paths[key]);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    if (expectedPaths && manifest.paths[key] !== expectedPaths[key])
      issues.push(`${key} is not the canonical derived path`);
    if (manifest[key] !== manifest.paths[key])
      issues.push(`${key} top-level alias drift`);
  }
  if (expectedPaths) {
    issues.push(
      ...validateVolumeIdentity(manifest.volumeIdentity, expectedPaths.workspace),
    );
  }
  if (!/^[a-f0-9]{64}$/.test(String(manifest.manifestHash ?? ""))) {
    issues.push("manifestHash is not lowercase SHA-256");
  } else {
    try {
      if (manifest.manifestHash !== sha256(manifestHashInput(manifest))) {
        issues.push("manifestHash drift");
      }
    } catch (error) {
      issues.push(
        `manifestHash input invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return issues;
}

/**
 * Capture the artifact root only after the runner has materialized it. This is
 * intentionally separate from the initial manifest because that manifest is
 * constructed before the unique run directory exists.
 */
export function captureHkVisualizationMaterializedArtifactRootIdentity(
  manifest,
) {
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0) {
    throw new Error(
      `Cannot capture a materialized artifact identity from an invalid manifest: ${manifestIssues.join("; ")}.`,
    );
  }
  const identity = captureHkVisualizationPhysicalPathIdentity(
    "HK Visualization materialized artifact root",
    manifest.artifactRoot,
  );
  if (identity.device !== manifest.volumeIdentity.starshipRoot.device) {
    throw new Error(
      "HK Visualization materialized artifact root must remain on the bound Starship device.",
    );
  }
  return identity;
}

export function validateHkVisualizationMaterializedArtifactRootIdentity(
  manifest,
  identity,
) {
  const issues = [];
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0) {
    return manifestIssues.map((issue) => `manifest: ${issue}`);
  }
  issues.push(
    ...validatePhysicalIdentityRecord(
      identity,
      manifest.artifactRoot,
      "artifactRootIdentity",
    ),
  );
  if (identity?.device !== manifest.volumeIdentity.starshipRoot.device) {
    issues.push("artifact root device differs from Starship root device");
  }
  try {
    const liveIdentity =
      captureHkVisualizationMaterializedArtifactRootIdentity(manifest);
    if (canonicalJson(liveIdentity) !== canonicalJson(identity)) {
      issues.push("artifact root live physical identity drift");
    }
  } catch (error) {
    issues.push(
      `artifact root live capture failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return issues;
}

export function parseHkVisualizationBrowserProfilePaths(commands) {
  if (!Array.isArray(commands))
    throw new Error("Chrome process commands must be an array.");
  const profiles = [];
  const seen = new Set();
  const pattern = /--user-data-dir=(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  for (const command of commands) {
    if (typeof command !== "string") continue;
    for (const match of command.matchAll(pattern)) {
      const value = match[1] ?? match[2] ?? match[3];
      if (!value || seen.has(value)) continue;
      seen.add(value);
      profiles.push(value);
    }
  }
  return profiles.sort();
}

export function assertHkVisualizationBrowserProfilePaths(profiles, manifest) {
  const manifestIssues = validateHkVisualizationStarshipPathManifest(manifest);
  if (manifestIssues.length > 0)
    throw new Error(`Cannot validate browser profiles against an invalid manifest: ${manifestIssues.join("; ")}.`);
  if (!Array.isArray(profiles) || profiles.length === 0)
    throw new Error("At least one actual Playwright Chrome profile path is required.");
  if (new Set(profiles).size !== profiles.length)
    throw new Error("Actual Playwright Chrome profile paths contain a duplicate.");
  const canonical = profiles.map((profile, index) => {
    const absolutePath = assertHkVisualizationStarshipPath(
      `browser profile[${index}]`,
      profile,
    );
    if (!pathIsInside(absolutePath, manifest.browserProfileParent))
      throw new Error(
        `Browser profile ${absolutePath} must stay inside its exact run parent ${manifest.browserProfileParent}.`,
      );
    if (!basename(absolutePath).startsWith("playwright_chromiumdev_profile-"))
      throw new Error(`Browser profile ${absolutePath} has the wrong Playwright profile prefix.`);
    return absolutePath;
  });
  return Object.freeze([...canonical].sort());
}
