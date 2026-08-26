import type { TestInfo } from "@playwright/test";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { createServer, type Server } from "node:http";
import { createConnection } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Readable } from "node:stream";
import type {
  LeaseGuardianCommand,
  LeaseGuardianMessage
} from "./isolated-app-lease-guardian";

export type IsolatedAppOptions = {
  warmPaths?: string[];
  env?: Record<string, string | undefined>;
  dbPath?: string;
  liveProviders?: boolean;
  mode?: "dev" | "production" | "auto";
};

type IsolatedAppEnvironmentIdentity = {
  authSessionSecret: string;
  dbPath: string;
  nextDistDir?: string;
  nextTsconfigPath?: string;
};

export function isolatedAppProcessEnvironment(
  baseEnv: NodeJS.ProcessEnv,
  optionEnv: Record<string, string | undefined>,
  identity: IsolatedAppEnvironmentIdentity
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    ...optionEnv,
    AUTH_SESSION_SECRET: identity.authSessionSecret,
    HK_MATH_DB_PATH: identity.dbPath,
    HK_MATH_ENABLE_DEMO_USER: "true",
    HK_MATH_EXPOSE_LOCAL_RESET_LINKS: "true",
    AI_TUTOR_MAX_REQUESTS_PER_MINUTE: "2",
    NEXT_DIST_DIR: identity.nextDistDir,
    NEXT_TSCONFIG_PATH: identity.nextTsconfigPath
  };
}

export type IsolatedApp = {
  baseURL: string;
  dbPath: string;
  rootDir: string;
  logs: string[];
  url: (pathname: string) => string;
  assertAlive: (label: string, pathname?: string) => Promise<void>;
  stop: () => Promise<void>;
  attachLogs: (testInfo: TestInfo, name?: string) => Promise<void>;
};

const projectRoot = process.cwd();
const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
const productionBuildRequiredPaths = [
  buildIdPath,
  path.join(projectRoot, ".next", "required-server-files.json"),
  path.join(projectRoot, ".next", "server", "middleware-manifest.json"),
  path.join(projectRoot, ".next", "server", "pages", "_error.js")
];

type IsolatedAppProcessState = {
  pid?: number;
  exitCode: number | null;
  signalCode: NodeJS.Signals | null;
  processIdentity?: string | null;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logLine(logs: string[], message: string) {
  logs.push(`[${new Date().toISOString()}] ${message}\n`);
}

function recentLogTail(logs: string[]) {
  return logs.slice(-80).join("");
}

function processState(appProcess: IsolatedAppProcessState) {
  return [
    `pid=${appProcess.pid ?? "unknown"}`,
    `exitCode=${appProcess.exitCode ?? "null"}`,
    `signalCode=${appProcess.signalCode ?? "null"}`
  ].join(" ");
}

function sanitize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a local port.");
  return address.port;
}

async function freePort() {
  const server = createServer();
  const port = await listen(server);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return port;
}

async function assertNoLocalListener(port: number, logs: string[]) {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (error?: Error) => {
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve();
    };

    socket.once("connect", () => finish(new Error(`Preflight failed: another local server is already listening on 127.0.0.1:${port}.`)));
    socket.once("timeout", () => finish());
    socket.once("error", () => finish());
    socket.setTimeout(500);
  });
  logLine(logs, `preflightPortFree port=${port}`);
}

type SqliteHolderInspectionOptions = {
  lsofCommand?: string;
  platform?: NodeJS.Platform;
  procRoot?: string;
};

type SqliteHolderInspection = {
  inspector: "lsof" | "procfs" | "lsof+procfs" | "none-needed";
  pids: string[];
};

function canonicalSqliteDatabasePath(dbPath: string, visitedPaths = new Set<string>()): string {
  const resolvedPath = path.resolve(dbPath);
  if (visitedPaths.has(resolvedPath)) {
    throw new Error(`Could not canonicalize cyclic SQLite database symlink: ${resolvedPath}`);
  }
  visitedPaths.add(resolvedPath);
  const missingSegments: string[] = [];
  let existingAncestor = resolvedPath;

  while (true) {
    try {
      const ancestorStat = lstatSync(existingAncestor);
      if (ancestorStat.isSymbolicLink()) {
        const linkTarget = readlinkSync(existingAncestor);
        const targetPath = path.resolve(path.dirname(existingAncestor), linkTarget);
        return canonicalSqliteDatabasePath(
          path.join(targetPath, ...missingSegments.reverse()),
          visitedPaths
        );
      }
      const canonicalAncestor = realpathSync.native(existingAncestor);
      return path.join(canonicalAncestor, ...missingSegments.reverse());
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
      const parent = path.dirname(existingAncestor);
      if (parent === existingAncestor) {
        throw new Error(`Could not canonicalize SQLite database path: ${resolvedPath}`, { cause: error });
      }
      missingSegments.push(path.basename(existingAncestor));
      existingAncestor = parent;
    }
  }
}

function canonicalFileCandidates(dbPath: string) {
  const resolvedDbPath = path.resolve(dbPath);
  const canonicalDbPath = canonicalSqliteDatabasePath(resolvedDbPath);
  const candidates = [
    resolvedDbPath,
    `${resolvedDbPath}-wal`,
    `${resolvedDbPath}-shm`,
    canonicalDbPath,
    `${canonicalDbPath}-wal`,
    `${canonicalDbPath}-shm`
  ]
    .map((candidate) => path.resolve(candidate))
    .filter((candidate) => existsSync(candidate));
  const canonicalCandidates = new Set(candidates);

  for (const candidate of candidates) {
    try {
      canonicalCandidates.add(realpathSync.native(candidate));
    } catch {
      // A SQLite sidecar can disappear between existsSync and realpathSync.
    }
  }

  return Array.from(canonicalCandidates);
}

function lsofSqliteHolderPids(candidates: string[], lsofCommand: string) {
  const pids = new Set<string>();

  for (const candidate of candidates) {
    try {
      const output = execFileSync(lsofCommand, ["-t", "--", candidate], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });
      output
        .split(/\s+/)
        .map((pid) => pid.trim())
        .filter(Boolean)
        .forEach((pid) => pids.add(pid));
    } catch (error) {
      const failure = error as NodeJS.ErrnoException & { status?: number | null };
      // lsof uses status 1 for a valid no-match result. Hosted Linux runners do
      // not guarantee that lsof exists, so every other failure needs procfs.
      if (failure.status === 1) continue;
      return null;
    }
  }

  return Array.from(pids).sort();
}

function cleanProcFileTarget(target: string) {
  return target.endsWith(" (deleted)") ? target.slice(0, -" (deleted)".length) : target;
}

function procfsSqliteHolderPids(candidates: string[], procRoot: string) {
  if (!existsSync(procRoot)) return null;
  const candidateSet = new Set(candidates);
  const currentUid = process.getuid?.();
  const pids = new Set<string>();
  let inspectedDescriptorCount = 0;
  let entries;

  try {
    entries = readdirSync(procRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
    const processRoot = path.join(procRoot, entry.name);

    if (currentUid !== undefined) {
      // The isolated app runs as this user; skip unrelated system processes
      // instead of treating their protected fd directories as an inspection gap.
      try {
        if (statSync(processRoot).uid !== currentUid) continue;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (["EACCES", "ENOENT", "EPERM", "ESRCH"].includes(code ?? "")) continue;
        return null;
      }
    }

    const fdRoot = path.join(processRoot, "fd");
    let fileDescriptors;
    try {
      fileDescriptors = readdirSync(fdRoot);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      // GitHub-hosted runners can expose same-UID supervisor processes whose
      // fd directories are protected. Skip only that individual process; a
      // completely unreadable procfs still fails closed below.
      if (["EACCES", "ENOENT", "EPERM", "ESRCH"].includes(code ?? "")) continue;
      return null;
    }

    for (const descriptor of fileDescriptors) {
      let target;
      try {
        target = readlinkSync(path.join(fdRoot, descriptor));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (["EACCES", "ENOENT", "EPERM", "ESRCH"].includes(code ?? "")) continue;
        return null;
      }
      inspectedDescriptorCount += 1;

      const cleanTarget = cleanProcFileTarget(target);
      if (path.isAbsolute(cleanTarget)) {
        const targetCandidates = new Set([path.resolve(cleanTarget)]);
        try {
          targetCandidates.add(realpathSync.native(cleanTarget));
        } catch {
          // A descriptor target can disappear after readlink if the process exits.
        }
        if (Array.from(targetCandidates).some((candidate) => candidateSet.has(candidate))) {
          pids.add(entry.name);
          break;
        }
      }
    }
  }

  return inspectedDescriptorCount > 0 ? Array.from(pids).sort() : null;
}

function inspectSqliteHolders(dbPath: string, options: SqliteHolderInspectionOptions = {}): SqliteHolderInspection {
  const candidates = canonicalFileCandidates(dbPath);
  if (!candidates.length) return { inspector: "none-needed", pids: [] };

  const platform = options.platform ?? process.platform;
  const lsofPids = lsofSqliteHolderPids(candidates, options.lsofCommand ?? "lsof");
  const procfsPids = platform === "linux"
    ? procfsSqliteHolderPids(candidates, options.procRoot ?? "/proc")
    : null;

  if (lsofPids && procfsPids) {
    return {
      inspector: "lsof+procfs",
      pids: Array.from(new Set([...lsofPids, ...procfsPids])).sort()
    };
  }
  if (procfsPids) return { inspector: "procfs", pids: procfsPids };
  if (lsofPids && (platform !== "linux" || lsofPids.length > 0)) {
    return { inspector: "lsof", pids: lsofPids };
  }

  throw new Error(`Preflight failed: no SQLite holder inspector is available for ${path.resolve(dbPath)}.`);
}

export function sqliteHolderPids(dbPath: string, options: SqliteHolderInspectionOptions = {}) {
  return inspectSqliteHolders(dbPath, options).pids;
}

export type SqliteAppLeaseOwner = {
  version: 1;
  leaseId: string;
  dbPath: string;
  runId: string;
  ownerPid: number;
  ownerProcessIdentity: string | null;
  acquiredAt: string;
};

type SqliteAppLeaseOptions = {
  logs?: string[];
  runId?: string;
  recoveryNonce?: string;
};

const sqliteAppLeaseSuffix = ".mais-isolated-app-lease.sqlite";
const sqliteAppLeaseStateSuffix = ".state.json";

type SqliteAppLeaseRecoveryState = {
  version: 1;
  status: "lease-held" | "app-registering" | "app-active" | "released";
  leaseId: string;
  runId: string;
  recoveryNonce: string;
  dbPath: string;
  dbPhysicalIdentity: string;
  leasePath: string;
  leasePhysicalIdentity: string;
  ownerPid: number;
  ownerProcessIdentity: string | null;
  appPort: number | null;
  appProcessGroupId: number | null;
  appProcessIdentity: string | null;
  appRegistrationPath: string | null;
  updatedAt: string;
};

export function sqliteAppLeaseDatabasePath(dbPath: string) {
  return `${canonicalSqliteDatabasePath(dbPath)}${sqliteAppLeaseSuffix}`;
}

export function sqliteAppLeaseStatePath(dbPath: string) {
  return `${sqliteAppLeaseDatabasePath(dbPath)}${sqliteAppLeaseStateSuffix}`;
}

function processStartIdentity(pid: number) {
  const stableProcessInspectionEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LC_ALL: "C",
    LANG: "C",
    LANGUAGE: "C",
    TZ: "UTC"
  };
  let commandLine: Buffer | string;
  try {
    commandLine = process.platform === "linux"
      ? readFileSync(path.join("/proc", String(pid), "cmdline"))
      : execFileSync("/bin/ps", ["-ww", "-o", "command=", "-p", String(pid)], {
          encoding: "utf8",
          env: stableProcessInspectionEnv,
          stdio: ["ignore", "pipe", "ignore"]
        });
  } catch {
    return null;
  }
  if (commandLine.length === 0) return null;
  const commandHash = createHash("sha256").update(commandLine).digest("hex");

  if (process.platform === "linux") {
    try {
      const stat = readFileSync(path.join("/proc", String(pid), "stat"), "utf8");
      const commandEnd = stat.lastIndexOf(")");
      if (commandEnd === -1) return null;
      const fieldsAfterCommand = stat.slice(commandEnd + 1).trim().split(/\s+/u);
      const startTime = fieldsAfterCommand[19];
      return startTime ? `linux-start-ticks:${startTime}:command-sha256:${commandHash}` : null;
    } catch {
      return null;
    }
  }

  if (process.platform === "win32") return null;
  try {
    const startedAt = execFileSync("/bin/ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
      env: stableProcessInspectionEnv,
      stdio: ["ignore", "pipe", "ignore"]
    }).trim().replace(/\s+/gu, " ");
    return startedAt ? `ps-start:${startedAt}:command-sha256:${commandHash}` : null;
  } catch {
    return null;
  }
}

export function isolatedAppProcessIdentity(pid: number) {
  return processStartIdentity(pid);
}

function sqliteLeaseIsBusy(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return code === "SQLITE_BUSY" || code === "SQLITE_LOCKED" || /database (?:is )?locked/iu.test(error.message);
}

function filesystemIdentity(targetPath: string) {
  const stat = statSync(targetPath);
  return `${stat.dev}:${stat.ino}`;
}

export type IsolatedAppRunRootIdentity = {
  rootDir: string;
  runId: string;
  filesystemIdentity: string;
  projectRootIdentity: string;
  tmpRootIdentity: string;
  isolatedRunsRootIdentity: string;
  suiteRootIdentity: string;
};

export type IsolatedAppTempTsconfigIdentity = {
  path: string;
  runId: string;
  filesystemIdentity: string;
  projectRootIdentity: string;
};

function runRootIdentityMatches(
  left: IsolatedAppRunRootIdentity,
  right: IsolatedAppRunRootIdentity
) {
  return left.rootDir === right.rootDir &&
    left.runId === right.runId &&
    left.filesystemIdentity === right.filesystemIdentity &&
    left.projectRootIdentity === right.projectRootIdentity &&
    left.tmpRootIdentity === right.tmpRootIdentity &&
    left.isolatedRunsRootIdentity === right.isolatedRunsRootIdentity &&
    left.suiteRootIdentity === right.suiteRootIdentity;
}

function tempTsconfigIdentityMatches(
  left: IsolatedAppTempTsconfigIdentity,
  right: IsolatedAppTempTsconfigIdentity
) {
  return left.path === right.path &&
    left.runId === right.runId &&
    left.filesystemIdentity === right.filesystemIdentity &&
    left.projectRootIdentity === right.projectRootIdentity;
}

function assertOwnedDirectory(targetPath: string, label: string) {
  const targetStat = lstatSync(targetPath);
  if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
    throw new Error(`Refusing isolated app ownership through a non-directory or symlink ${label}: ${targetPath}`);
  }
  return `${targetStat.dev}:${targetStat.ino}`;
}

function ensureOwnedDirectory(targetPath: string, label: string) {
  if (!existsSync(targetPath)) mkdirSync(targetPath, { mode: 0o700 });
  return assertOwnedDirectory(targetPath, label);
}

export function captureIsolatedAppRunRootIdentity(
  rootDir: string,
  runId: string
): IsolatedAppRunRootIdentity {
  const tmpRoot = path.resolve(projectRoot, ".tmp");
  const isolatedRunsRoot = path.join(tmpRoot, "e2e-isolated");
  const resolvedRoot = path.resolve(rootDir);
  const relativeRoot = path.relative(isolatedRunsRoot, resolvedRoot);
  const relativeSegments = relativeRoot.split(path.sep).filter(Boolean);
  const normalizedRunId = sanitize(runId);

  if (
    !relativeRoot ||
    relativeRoot === ".." ||
    relativeRoot.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeRoot) ||
    relativeSegments.length !== 2
  ) {
    throw new Error(
      `Refusing isolated app root cleanup outside an exact suite/run path below ${isolatedRunsRoot}: ${resolvedRoot}`
    );
  }
  if (!normalizedRunId || path.basename(resolvedRoot) !== normalizedRunId) {
    throw new Error(
      `Refusing isolated app root cleanup whose run id does not match its exact directory: ` +
      `runId=${runId} rootDir=${resolvedRoot}`
    );
  }

  const suiteRoot = path.dirname(resolvedRoot);
  const projectRootIdentity = assertOwnedDirectory(projectRoot, "project root");
  const tmpRootIdentity = assertOwnedDirectory(tmpRoot, ".tmp root");
  const isolatedRunsRootIdentity = assertOwnedDirectory(isolatedRunsRoot, "e2e-isolated root");
  const suiteRootIdentity = assertOwnedDirectory(suiteRoot, "suite root");
  const rootStat = lstatSync(resolvedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Refusing isolated app root cleanup through a non-directory or symlink path: ${resolvedRoot}`);
  }

  const physicalRunsRoot = realpathSync.native(isolatedRunsRoot);
  const physicalRoot = realpathSync.native(resolvedRoot);
  const physicalRelative = path.relative(physicalRunsRoot, physicalRoot);
  const physicalSegments = physicalRelative.split(path.sep).filter(Boolean);
  if (
    !physicalRelative ||
    physicalRelative === ".." ||
    physicalRelative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(physicalRelative) ||
    physicalSegments.length !== 2
  ) {
    throw new Error(
      `Refusing isolated app root cleanup whose physical path escapes its owned namespace: ${resolvedRoot}`
    );
  }

  return {
    rootDir: resolvedRoot,
    runId: normalizedRunId,
    filesystemIdentity: `${rootStat.dev}:${rootStat.ino}`,
    projectRootIdentity,
    tmpRootIdentity,
    isolatedRunsRootIdentity,
    suiteRootIdentity
  };
}

export function removeCapturedIsolatedAppRunRoot(identity: IsolatedAppRunRootIdentity) {
  const current = captureIsolatedAppRunRootIdentity(identity.rootDir, identity.runId);
  if (!runRootIdentityMatches(current, identity)) {
    throw new Error(
      `Refusing isolated app root cleanup after its physical or ancestor identity changed: ${identity.rootDir}`
    );
  }
  rmSync(identity.rootDir, { recursive: true, force: false });
}

function createIsolatedAppRunRoot(suiteName: string, runId: string) {
  const suiteSegment = sanitize(suiteName);
  const normalizedRunId = sanitize(runId);
  if (!suiteSegment || suiteSegment.includes(path.sep)) {
    throw new Error(`Refusing to create an isolated app run root without one safe suite segment: ${suiteName}`);
  }
  if (!normalizedRunId || normalizedRunId !== runId || runId.includes(path.sep)) {
    throw new Error(`Refusing to create an isolated app run root without one exact sanitized run id: ${runId}`);
  }
  const tmpRoot = path.join(projectRoot, ".tmp");
  const isolatedRunsRoot = path.join(tmpRoot, "e2e-isolated");
  const suiteRoot = path.join(isolatedRunsRoot, suiteSegment);
  const rootDir = path.join(suiteRoot, runId);
  assertOwnedDirectory(projectRoot, "project root");
  ensureOwnedDirectory(tmpRoot, ".tmp root");
  ensureOwnedDirectory(isolatedRunsRoot, "e2e-isolated root");
  ensureOwnedDirectory(suiteRoot, "suite root");
  mkdirSync(rootDir, { mode: 0o700 });
  return captureIsolatedAppRunRootIdentity(rootDir, runId);
}

export function captureIsolatedAppTempTsconfigIdentity(
  tempTsconfigPath: string,
  runId: string
): IsolatedAppTempTsconfigIdentity {
  const resolvedPath = path.resolve(tempTsconfigPath);
  const normalizedRunId = sanitize(runId);
  const expectedPath = path.join(projectRoot, `tsconfig.${normalizedRunId}.tmp.json`);
  if (!normalizedRunId || resolvedPath !== expectedPath || path.dirname(resolvedPath) !== projectRoot) {
    throw new Error(
      `Refusing isolated app temp-tsconfig ownership outside its exact project-root path: ${resolvedPath}`
    );
  }
  const projectRootIdentity = assertOwnedDirectory(projectRoot, "project root");
  const tempStat = lstatSync(resolvedPath);
  if (!tempStat.isFile() || tempStat.isSymbolicLink()) {
    throw new Error(`Refusing isolated app temp-tsconfig ownership of a non-regular or symlink path: ${resolvedPath}`);
  }
  return {
    path: resolvedPath,
    runId: normalizedRunId,
    filesystemIdentity: `${tempStat.dev}:${tempStat.ino}`,
    projectRootIdentity
  };
}

export function removeCapturedIsolatedAppTempTsconfig(identity: IsolatedAppTempTsconfigIdentity) {
  if (!existsSync(identity.path)) return;
  const current = captureIsolatedAppTempTsconfigIdentity(identity.path, identity.runId);
  if (!tempTsconfigIdentityMatches(current, identity)) {
    throw new Error(
      `Refusing isolated app temp-tsconfig cleanup after its physical identity changed: ${identity.path}`
    );
  }
  rmSync(identity.path, { force: false });
}

function sqliteDatabasePhysicalIdentity(canonicalDbPath: string) {
  try {
    const stat = statSync(canonicalDbPath);
    if (stat.nlink > 1) {
      throw new Error(
        `Preflight failed: hard-linked SQLite database paths are unsupported because they can split isolated app leases: ${canonicalDbPath}`
      );
    }
    return `inode:${stat.dev}:${stat.ino}`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const canonicalParent = realpathSync.native(path.dirname(canonicalDbPath));
    return `parent-entry:${filesystemIdentity(canonicalParent)}:${path.basename(canonicalDbPath)}`;
  }
}

function parseSqliteAppLeaseState(statePath: string): SqliteAppLeaseRecoveryState | null {
  if (!existsSync(statePath)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(statePath, "utf8"));
  } catch (error) {
    throw new Error(`Preflight failed: isolated app lease state is unreadable: ${statePath}`, { cause: error });
  }

  const state = parsed as Partial<SqliteAppLeaseRecoveryState>;
  if (
    state.version !== 1 ||
    !["lease-held", "app-registering", "app-active", "released"].includes(String(state.status)) ||
    typeof state.leaseId !== "string" ||
    typeof state.runId !== "string" ||
    typeof state.recoveryNonce !== "string" ||
    typeof state.dbPath !== "string" ||
    typeof state.dbPhysicalIdentity !== "string" ||
    typeof state.leasePath !== "string" ||
    typeof state.leasePhysicalIdentity !== "string" ||
    !Number.isSafeInteger(state.ownerPid) ||
    !(state.ownerProcessIdentity === null || typeof state.ownerProcessIdentity === "string") ||
    !(state.appPort === null || Number.isSafeInteger(state.appPort)) ||
    !(state.appProcessGroupId === null || Number.isSafeInteger(state.appProcessGroupId)) ||
    !(state.appProcessIdentity === null || typeof state.appProcessIdentity === "string") ||
    !(state.appRegistrationPath === null || typeof state.appRegistrationPath === "string")
  ) {
    throw new Error(`Preflight failed: isolated app lease state has an invalid schema: ${statePath}`);
  }
  return state as SqliteAppLeaseRecoveryState;
}

function atomicWriteSqliteAppLeaseState(statePath: string, state: SqliteAppLeaseRecoveryState) {
  const tempPath = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(state)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(tempPath, statePath);
  } finally {
    rmSync(tempPath, { force: true });
  }
}

function registeredProcessGroupId(state: SqliteAppLeaseRecoveryState) {
  if (state.appProcessGroupId) return state.appProcessGroupId;
  if (!state.appRegistrationPath || !existsSync(state.appRegistrationPath)) return null;
  try {
    const pid = Number(readFileSync(state.appRegistrationPath, "utf8").trim());
    return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function assertPreviousLeaseStateIsReclaimable(
  previousState: SqliteAppLeaseRecoveryState | null,
  canonicalDbPath: string,
  leasePath: string,
  leasePhysicalIdentity: string,
  dbPhysicalIdentity: string,
  leaseDbExistedBeforeOpen: boolean
) {
  if (!previousState) {
    if (leaseDbExistedBeforeOpen) {
      throw new Error(
        `Preflight failed: a pre-existing isolated app lease DB has no recovery state: ${leasePath}`
      );
    }
    return;
  }
  if (previousState.dbPath !== canonicalDbPath || previousState.leasePath !== leasePath) {
    throw new Error(
      `Preflight failed: isolated app lease state does not match the canonical SQLite identity: ${leasePath}`
    );
  }
  if (previousState.leasePhysicalIdentity !== leasePhysicalIdentity) {
    throw new Error(
      `Preflight failed: isolated app lease-file physical identity changed unexpectedly: ${leasePath}`
    );
  }
  const databaseIdentityTransitionAllowed =
    previousState.dbPhysicalIdentity === dbPhysicalIdentity ||
    (
      previousState.dbPhysicalIdentity.startsWith("parent-entry:") &&
      dbPhysicalIdentity.startsWith("inode:")
    );
  if (!databaseIdentityTransitionAllowed) {
    throw new Error(
      `Preflight failed: SQLite product database physical identity changed unexpectedly: ${canonicalDbPath}`
    );
  }
  if (previousState.status === "released") return;

  const processGroupId = registeredProcessGroupId(previousState);
  if (processGroupId && processGroupIsRunning(processGroupId)) {
    const currentProcessIdentity = processStartIdentity(processGroupId);
    const identityStatus = previousState.appProcessIdentity && currentProcessIdentity
      ? previousState.appProcessIdentity === currentProcessIdentity ? "same" : "ambiguous-reuse"
      : "unavailable";
    throw new Error(
      `Preflight failed: a surviving isolated app process group still owns the SQLite database: ` +
      `${canonicalDbPath} (processGroupId=${processGroupId}, identity=${identityStatus})`
    );
  }

  if (previousState.status === "app-registering" && !processGroupId) {
    throw new Error(
      `Preflight failed: an interrupted isolated app registration cannot be proven inactive: ${canonicalDbPath}`
    );
  }
  if (
    previousState.status === "app-active" &&
    (!processGroupId || !previousState.appProcessIdentity)
  ) {
    throw new Error(
      `Preflight failed: isolated app recovery state lacks a verifiable process identity: ${canonicalDbPath}`
    );
  }

  if (
    previousState.status === "lease-held" &&
    capturedProcessIsRunning({
      pid: previousState.ownerPid,
      identity: previousState.ownerProcessIdentity
    })
  ) {
    throw new Error(
      `Preflight failed: the prior isolated app lease owner is still alive without a recoverable lock: ${canonicalDbPath}`
    );
  }
}

const closeRetryLeaseDatabases = new Set<DatabaseSync>();
let closeRetryTimer: NodeJS.Timeout | null = null;

function retainLeaseDatabaseForCloseRetry(database: DatabaseSync) {
  closeRetryLeaseDatabases.add(database);
  if (closeRetryTimer) return;
  closeRetryTimer = setInterval(() => {
    for (const retainedDatabase of closeRetryLeaseDatabases) {
      try {
        retainedDatabase.close();
        closeRetryLeaseDatabases.delete(retainedDatabase);
      } catch {
        // Keep the connection reachable and retry; losing the reference could
        // silently release ownership at an unpredictable garbage-collection point.
      }
    }
    if (!closeRetryLeaseDatabases.size && closeRetryTimer) {
      clearInterval(closeRetryTimer);
      closeRetryTimer = null;
    }
  }, 250);
  closeRetryTimer.unref();
}

export function acquireSqliteAppLease(dbPath: string, options: SqliteAppLeaseOptions = {}) {
  const canonicalDbPath = canonicalSqliteDatabasePath(dbPath);
  const leasePath = sqliteAppLeaseDatabasePath(canonicalDbPath);
  const statePath = sqliteAppLeaseStatePath(canonicalDbPath);
  const leaseDbExistedBeforeOpen = existsSync(leasePath);
  const logs = options.logs ?? [];
  const ownerPid = process.pid;
  const requestedRunId = options.runId ?? process.env.PLAYWRIGHT_RUN_ID ?? `pid-${ownerPid}`;
  const runId = sanitize(requestedRunId) || `pid-${ownerPid}`;
  const recoveryNonce = options.recoveryNonce ?? randomUUID();
  const dbPhysicalIdentity = sqliteDatabasePhysicalIdentity(canonicalDbPath);
  const owner: SqliteAppLeaseOwner = {
    version: 1,
    leaseId: randomUUID(),
    dbPath: canonicalDbPath,
    runId,
    ownerPid,
    ownerProcessIdentity: processStartIdentity(ownerPid),
    acquiredAt: new Date().toISOString()
  };

  mkdirSync(path.dirname(canonicalDbPath), { recursive: true });
  let leaseDb: DatabaseSync | null = null;
  let transactionStarted = false;
  let state: SqliteAppLeaseRecoveryState | null = null;

  try {
    leaseDb = new DatabaseSync(leasePath);
    leaseDb.exec("PRAGMA busy_timeout = 0");
    leaseDb.exec("PRAGMA journal_mode = DELETE");
    leaseDb.exec(`
      CREATE TABLE IF NOT EXISTS isolated_app_lease_owner (
        lease_key INTEGER PRIMARY KEY CHECK (lease_key = 1),
        lease_id TEXT NOT NULL,
        db_path TEXT NOT NULL,
        run_id TEXT NOT NULL,
        owner_pid INTEGER NOT NULL,
        owner_process_identity TEXT,
        acquired_at TEXT NOT NULL
      )
    `);
    leaseDb.exec("BEGIN EXCLUSIVE");
    transactionStarted = true;
    leaseDb.prepare(`
      INSERT INTO isolated_app_lease_owner (
        lease_key,
        lease_id,
        db_path,
        run_id,
        owner_pid,
        owner_process_identity,
        acquired_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lease_key) DO UPDATE SET
        lease_id = excluded.lease_id,
        db_path = excluded.db_path,
        run_id = excluded.run_id,
        owner_pid = excluded.owner_pid,
        owner_process_identity = excluded.owner_process_identity,
        acquired_at = excluded.acquired_at
    `).run(
      owner.leaseId,
      owner.dbPath,
      owner.runId,
      owner.ownerPid,
      owner.ownerProcessIdentity,
      owner.acquiredAt
    );
    const leasePhysicalIdentity = filesystemIdentity(leasePath);
    assertPreviousLeaseStateIsReclaimable(
      parseSqliteAppLeaseState(statePath),
      canonicalDbPath,
      leasePath,
      leasePhysicalIdentity,
      dbPhysicalIdentity,
      leaseDbExistedBeforeOpen
    );
    state = {
      version: 1,
      status: "lease-held",
      leaseId: owner.leaseId,
      runId,
      recoveryNonce,
      dbPath: canonicalDbPath,
      dbPhysicalIdentity,
      leasePath,
      leasePhysicalIdentity,
      ownerPid,
      ownerProcessIdentity: owner.ownerProcessIdentity,
      appPort: null,
      appProcessGroupId: null,
      appProcessIdentity: null,
      appRegistrationPath: null,
      updatedAt: new Date().toISOString()
    };
    atomicWriteSqliteAppLeaseState(statePath, state);
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (transactionStarted) {
      try {
        leaseDb?.exec("ROLLBACK");
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }
    try {
      leaseDb?.close();
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
      if (leaseDb) retainLeaseDatabaseForCloseRetry(leaseDb);
    }

    let acquisitionError: unknown = error;
    if (sqliteLeaseIsBusy(error)) {
      acquisitionError = new Error(
        `Preflight failed: SQLite database is already held by another isolated app lease: ${canonicalDbPath}`,
        { cause: error }
      );
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [acquisitionError, ...cleanupErrors],
        `SQLite lease acquisition failed and ${cleanupErrors.length} cleanup failure(s) also occurred.`,
        { cause: acquisitionError }
      );
    }
    throw acquisitionError;
  }

  logLine(logs, `sqliteLeaseAcquired runId=${runId} ownerPid=${ownerPid} leasePath=${leasePath}`);
  let transactionOpen = true;
  let connectionClosed = false;
  const transitionState = (
    status: SqliteAppLeaseRecoveryState["status"],
    update: Partial<SqliteAppLeaseRecoveryState> = {}
  ) => {
    if (!state || connectionClosed) throw new Error(`Cannot update a released SQLite app lease: ${leasePath}`);
    state = {
      ...state,
      ...update,
      status,
      updatedAt: new Date().toISOString()
    };
    atomicWriteSqliteAppLeaseState(statePath, state);
  };

  return {
    leasePath,
    statePath,
    owner,
    recoveryNonce,
    beginAppRegistration(appPort: number) {
      const appRegistrationPath = `${statePath}.${recoveryNonce}.app-group`;
      rmSync(appRegistrationPath, { force: true });
      transitionState("app-registering", {
        appPort,
        appProcessGroupId: null,
        appProcessIdentity: null,
        appRegistrationPath
      });
      return appRegistrationPath;
    },
    activateApp(processGroupId: number) {
      const appProcessIdentity = processStartIdentity(processGroupId);
      if (!appProcessIdentity) {
        throw new Error(`Could not record isolated app process identity for group ${processGroupId}.`);
      }
      transitionState("app-active", {
        appProcessGroupId: processGroupId,
        appProcessIdentity
      });
      return appProcessIdentity;
    },
    readPersistedActiveApp() {
      const persisted = parseSqliteAppLeaseState(statePath);
      if (
        !persisted ||
        persisted.leaseId !== owner.leaseId ||
        persisted.recoveryNonce !== recoveryNonce ||
        persisted.dbPath !== canonicalDbPath ||
        persisted.leasePath !== leasePath
      ) {
        throw new Error(`Persisted isolated app lease identity does not match the live guardian: ${statePath}`);
      }
      if (
        persisted.status !== "app-active" ||
        !persisted.appProcessGroupId ||
        !persisted.appProcessIdentity ||
        !persisted.appPort
      ) {
        throw new Error(`Persisted isolated app state lacks an active process identity: ${statePath}`);
      }
      return {
        processGroupId: persisted.appProcessGroupId,
        processIdentity: persisted.appProcessIdentity,
        port: persisted.appPort
      };
    },
    release() {
      if (connectionClosed) return;
      transitionState("released");
      if (leaseDb && !leaseDb.isOpen) {
        connectionClosed = true;
        transactionOpen = false;
        closeRetryLeaseDatabases.delete(leaseDb);
        logLine(logs, `sqliteLeaseReleased leaseId=${owner.leaseId} leasePath=${leasePath}`);
        return;
      }
      const releaseErrors: unknown[] = [];
      if (transactionOpen) {
        try {
          leaseDb?.exec("ROLLBACK");
          transactionOpen = false;
        } catch (error) {
          releaseErrors.push(error);
        }
      }
      try {
        leaseDb?.close();
        connectionClosed = true;
        transactionOpen = false;
        if (leaseDb) closeRetryLeaseDatabases.delete(leaseDb);
      } catch (error) {
        releaseErrors.push(error);
        if (leaseDb) retainLeaseDatabaseForCloseRetry(leaseDb);
      }
      if (connectionClosed) {
        if (state?.appRegistrationPath) rmSync(state.appRegistrationPath, { force: true });
        logLine(logs, `sqliteLeaseReleased leaseId=${owner.leaseId} leasePath=${leasePath}`);
      }
      if (releaseErrors.length === 1) throw releaseErrors[0];
      if (releaseErrors.length > 1) {
        throw new AggregateError(
          releaseErrors,
          `SQLite lease release failed with ${releaseErrors.length} cleanup errors: ${leasePath}`
        );
      }
    }
  };
}

function assertNoSqliteHolder(dbPath: string, logs: string[]) {
  const inspection = inspectSqliteHolders(dbPath);
  if (inspection.pids.length) {
    throw new Error(`Preflight failed: SQLite database is already held by process id(s) ${inspection.pids.join(", ")}: ${dbPath}`);
  }
  logLine(logs, `preflightDbFree inspector=${inspection.inspector} dbPath=${dbPath}`);
}

function childProcessIds(parentPid: number) {
  try {
    const output = execFileSync("pgrep", ["-P", String(parentPid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return output
      .split(/\s+/)
      .map((pid) => Number(pid.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    // pgrep exits non-zero when the process has no children.
    return [];
  }
}

function processTreeIds(rootPid: number) {
  const seen = new Set<number>();
  const stack = [rootPid];

  while (stack.length) {
    const pid = stack.pop();
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    stack.push(...childProcessIds(pid));
  }

  return Array.from(seen);
}

function processIdIsRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

type CapturedProcess = {
  pid: number;
  identity: string | null;
};

function capturedProcessIsRunning(target: CapturedProcess) {
  if (!processIdIsRunning(target.pid)) return false;
  if (!target.identity) return true;
  const currentIdentity = processStartIdentity(target.pid);
  return currentIdentity === null || currentIdentity === target.identity;
}

function captureProcess(processes: Map<number, CapturedProcess>, pid: number) {
  if (!processes.has(pid)) {
    processes.set(pid, { pid, identity: processStartIdentity(pid) });
  }
}

async function waitForCapturedProcessesToExit(processes: Map<number, CapturedProcess>, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let running = Array.from(processes.values()).filter(capturedProcessIsRunning);

  while (running.length && Date.now() < deadline) {
    await delay(50);
    running = Array.from(processes.values()).filter(capturedProcessIsRunning);
  }

  return running;
}

function processGroupIsRunning(processGroupId: number) {
  return isolatedAppProcessGroupIsRunning(processGroupId);
}

function linuxProcessState(pid: number) {
  try {
    const stat = readFileSync(path.join("/proc", String(pid), "stat"), "utf8");
    const commandEnd = stat.lastIndexOf(")");
    if (commandEnd === -1) return null;
    return stat.slice(commandEnd + 2, commandEnd + 3) || null;
  } catch {
    return null;
  }
}

function processGroupHasLivePsMember(processGroupId: number) {
  let output: string;
  try {
    output = execFileSync("/bin/ps", ["-axo", "pgid=,state="], {
      encoding: "utf8",
      env: {
        ...process.env,
        LC_ALL: "C",
        LANG: "C",
        LANGUAGE: "C"
      },
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }

  const states = output
    .split("\n")
    .map((line) => line.trim().split(/\s+/u))
    .filter(([rawProcessGroupId, state]) => Number(rawProcessGroupId) === processGroupId && Boolean(state))
    .map(([, state]) => state);
  if (!states.length) return null;
  return states.some((state) => !/^[XZ]/u.test(state));
}

export function isolatedAppProcessGroupIsRunning(processGroupId: number) {
  let signalProbe: "running" | "permission-denied";
  try {
    process.kill(-processGroupId, 0);
    signalProbe = "running";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") return false;
    signalProbe = "permission-denied";
  }

  if (process.platform === "linux") {
    const leaderState = linuxProcessState(processGroupId);
    if (leaderState && !/^[XZ]/u.test(leaderState)) return true;
  } else if (signalProbe === "running") {
    return true;
  }

  // POSIX signal probes keep reporting zombie-only groups as present (and can
  // report EPERM on macOS). Zombies cannot execute or retain file descriptors,
  // but a live descendant in the same group still blocks cleanup. Inspect the
  // complete group and fail closed whenever membership cannot be proven.
  return processGroupHasLivePsMember(processGroupId) ?? true;
}

async function waitForProcessGroupToExit(processGroupId: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupIsRunning(processGroupId) && Date.now() < deadline) await delay(50);
  return !processGroupIsRunning(processGroupId);
}

async function waitForApp(baseURL: string, appProcess: IsolatedAppProcessState, logs: string[], timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (appProcess.exitCode !== null) {
      throw new Error(`Isolated app exited before it was ready. ${processState(appProcess)}\n${recentLogTail(logs)}`);
    }

    try {
      const response = await fetch(baseURL, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Keep polling until Next is ready to accept requests.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for isolated app at ${baseURL}. ${processState(appProcess)}\n${recentLogTail(logs)}`);
}

function readBuildId() {
  if (!existsSync(buildIdPath)) return "none";
  try {
    return readFileSync(buildIdPath, "utf8").trim() || "empty";
  } catch {
    return "unreadable";
  }
}

function hasHealthyProductionBuild() {
  return productionBuildRequiredPaths.every((artifactPath) => existsSync(artifactPath));
}

function isolatedAppMode(value: string | undefined): "dev" | "production" | "auto" | null {
  return value === "dev" || value === "production" || value === "auto" ? value : null;
}

function writeTempNextTsconfig(tsconfigPath: string, nextDistDir: string, runId: string) {
  const absolutePath = path.join(projectRoot, tsconfigPath);
  writeFileSync(
    absolutePath,
    JSON.stringify({
      extends: "./tsconfig.json",
      include: [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts",
        `${nextDistDir}/types/**/*.ts`
      ],
      exclude: [
        "node_modules",
        ".git",
        ".local",
        ".next",
        ".next-*",
        ".tmp",
        ".s??-*",
        "tmp",
        "temp",
        "output",
        "outputs",
        "coverage",
        "playwright-report",
        "test-results",
        "MAIS-MVP-*",
        "MAIS-MVP-*/**/*"
      ]
    }, null, 2),
    { encoding: "utf8", flag: "wx", mode: 0o600 }
  );
  return captureIsolatedAppTempTsconfigIdentity(absolutePath, runId);
}

function staticScriptSources(html: string, baseURL: string) {
  const sources = new Set<string>();
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']*\/_next\/static\/[^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    sources.add(new URL(match[1], baseURL).toString());
  }

  return Array.from(sources);
}

async function warmRouteChunks(baseURL: string, warmPaths: string[], appProcess: IsolatedAppProcessState, logs: string[]) {
  const uniqueWarmPaths = Array.from(new Set(warmPaths));

  for (const warmPath of uniqueWarmPaths) {
    if (appProcess.exitCode !== null) {
      throw new Error(`Isolated app exited before warmup for ${warmPath}. ${processState(appProcess)}\n${recentLogTail(logs)}`);
    }

    const routeURL = new URL(warmPath.startsWith("/") ? warmPath : `/${warmPath}`, baseURL).toString();
    logLine(logs, `warmRouteStart path=${warmPath} url=${routeURL}`);

    try {
      const routeResponse = await fetch(routeURL);
      const html = await routeResponse.text();
      logLine(logs, `warmRouteResponse path=${warmPath} status=${routeResponse.status} bytes=${html.length}`);

      if (!routeResponse.ok) {
        throw new Error(`Warm route ${warmPath} returned ${routeResponse.status}.`);
      }

      const scripts = staticScriptSources(html, baseURL);
      logLine(logs, `warmRouteScripts path=${warmPath} count=${scripts.length}`);

      for (const scriptURL of scripts) {
        const scriptResponse = await fetch(scriptURL, { redirect: "manual" });
        logLine(logs, `warmChunkResponse path=${warmPath} status=${scriptResponse.status} url=${scriptURL}`);
        if (scriptResponse.status !== 200) {
          throw new Error(`Warm chunk returned ${scriptResponse.status}: ${scriptURL}`);
        }
      }
    } catch (error) {
      logLine(logs, `warmRouteFailure path=${warmPath} error=${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

async function assertIsolatedAppAlive(
  baseURL: string,
  appProcess: IsolatedAppProcessState,
  logs: string[],
  label: string,
  pathname = "/login"
) {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const probeURL = new URL(cleanPath, baseURL).toString();
  logLine(logs, `livenessStart label=${label} path=${cleanPath} url=${probeURL} ${processState(appProcess)}`);

  if (appProcess.exitCode !== null) {
    throw new Error(`Isolated app is not alive at ${label}. ${processState(appProcess)}\n${recentLogTail(logs)}`);
  }

  try {
    const response = await fetch(probeURL, { redirect: "manual" });
    logLine(logs, `livenessResponse label=${label} status=${response.status} ${processState(appProcess)}`);
    if (response.status >= 500) {
      throw new Error(`Liveness route returned ${response.status}.`);
    }
  } catch (error) {
    logLine(logs, `livenessFailure label=${label} error=${error instanceof Error ? error.message : String(error)} ${processState(appProcess)}`);
    throw new Error([
      `Isolated app liveness check failed at ${label}: ${probeURL}. ${processState(appProcess)}`,
      `Cause: ${error instanceof Error ? error.message : String(error)}`,
      recentLogTail(logs)
    ].join("\n"));
  }

  if (appProcess.exitCode !== null) {
    throw new Error(`Isolated app exited during liveness check at ${label}. ${processState(appProcess)}\n${recentLogTail(logs)}`);
  }
}

async function stopIsolatedProcess(
  appProcess: IsolatedAppProcessState,
  logs?: string[],
  processGroupId?: number | null
) {
  const nextLogs = logs ?? [];
  const rootPid = appProcess.pid;
  if (!rootPid) {
    if (appProcess.exitCode !== null || appProcess.signalCode !== null) return;
    throw new Error("Could not stop isolated app: the spawned process has no process id.");
  }

  if (processGroupId && process.platform !== "win32") {
    if (!processGroupIsRunning(processGroupId)) return;
    if (appProcess.exitCode !== null || appProcess.signalCode !== null) {
      throw new Error(
        `Refusing to signal a process group after its recorded app handle exited; retaining its SQLite lease. ` +
        `rootPid=${rootPid} processGroupId=${processGroupId}`
      );
    }
    const expectedProcessIdentity = appProcess.processIdentity ?? processStartIdentity(rootPid);
    const assertSignalIdentity = (signal: NodeJS.Signals) => {
      const currentProcessIdentity = processStartIdentity(rootPid);
      if (!expectedProcessIdentity || !currentProcessIdentity || currentProcessIdentity !== expectedProcessIdentity) {
        throw new Error(
          `Refusing to send ${signal} because isolated app process-group identity cannot be proven; ` +
          `retaining its SQLite lease. rootPid=${rootPid} processGroupId=${processGroupId}`
        );
      }
    };
    assertSignalIdentity("SIGTERM");
    logLine(nextLogs, `stopRequested pid=${rootPid} processGroupId=${processGroupId}`);
    try {
      process.kill(-processGroupId, "SIGTERM");
      logLine(nextLogs, `stopSignal signal=SIGTERM processGroupId=${processGroupId}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }

    if (!await waitForProcessGroupToExit(processGroupId, 5_000)) {
      assertSignalIdentity("SIGKILL");
      logLine(nextLogs, `stopEscalated signal=SIGKILL processGroupId=${processGroupId}`);
      try {
        process.kill(-processGroupId, "SIGKILL");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
      if (!await waitForProcessGroupToExit(processGroupId, 5_000)) {
        throw new Error(
          `Could not confirm isolated app process-group exit; retaining its SQLite lease. ` +
          `rootPid=${rootPid} processGroupId=${processGroupId}`
        );
      }
    }

    logLine(
      nextLogs,
      `stopped pid=${rootPid} exitCode=${appProcess.exitCode ?? "null"} ` +
      `signal=${appProcess.signalCode ?? "null"} confirmedProcessGroup=${processGroupId}`
    );
    return;
  }

  const processes = new Map<number, CapturedProcess>();
  for (const pid of processTreeIds(rootPid)) captureProcess(processes, pid);
  captureProcess(processes, rootPid);
  let running = Array.from(processes.values()).filter(capturedProcessIsRunning);
  if (!running.length) return;
  logLine(nextLogs, `stopRequested pid=${rootPid} capturedPids=${running.map(({ pid }) => pid).join(",")}`);

  const signalTree = (signal: NodeJS.Signals, targets: CapturedProcess[]) => {
    logLine(nextLogs, `stopSignal signal=${signal} pids=${targets.map(({ pid }) => pid).join(",") || "none"}`);
    for (const target of [...targets].reverse()) {
      if (!capturedProcessIsRunning(target)) continue;
      try {
        process.kill(target.pid, signal);
      } catch {
        // A descendant can exit between the liveness check and the signal.
      }
    }
  };

  signalTree("SIGTERM", running);
  running = await waitForCapturedProcessesToExit(processes, 5_000);

  if (running.length) {
    for (const { pid } of running) {
      for (const descendantPid of processTreeIds(pid)) captureProcess(processes, descendantPid);
    }
    running = Array.from(processes.values()).filter(capturedProcessIsRunning);
    logLine(nextLogs, `stopEscalated signal=SIGKILL pids=${running.map(({ pid }) => pid).join(",") || "none"}`);
    signalTree("SIGKILL", running);
    running = await waitForCapturedProcessesToExit(processes, 5_000);
  }

  if (running.length) {
    throw new Error(
      `Could not confirm isolated app process-tree exit; retaining its SQLite lease. ` +
      `rootPid=${rootPid} runningPids=${running.map(({ pid }) => pid).join(",")}`
    );
  }

  logLine(
    nextLogs,
    `stopped pid=${rootPid} exitCode=${appProcess.exitCode ?? "null"} ` +
    `signal=${appProcess.signalCode ?? "null"} confirmedPids=${Array.from(processes.keys()).join(",")}`
  );
}

export async function stopIsolatedProcessTree(
  appProcess: ChildProcessWithoutNullStreams,
  logs?: string[],
  processGroupId?: number | null
) {
  await stopIsolatedProcess(appProcess, logs, processGroupId);
}

export function assertIsolatedAppPlatform(platform: NodeJS.Platform = process.platform) {
  if (platform === "win32") {
    throw new Error(
      "startIsolatedApp is unsupported on Windows because its process-group and SQLite-holder teardown cannot be proven safe."
    );
  }
}

type SqliteLeaseGuardianOptions = {
  logs?: string[];
  runId?: string;
  env?: NodeJS.ProcessEnv;
  rootDir?: string;
  runRootIdentity?: IsolatedAppRunRootIdentity;
  tempTsconfigPath?: string;
  tempTsconfigIdentity?: IsolatedAppTempTsconfigIdentity | null;
};

export async function startSqliteAppLeaseGuardian(
  dbPath: string,
  options: SqliteLeaseGuardianOptions = {}
) {
  assertIsolatedAppPlatform();
  const logs = options.logs ?? [];
  const canonicalDbPath = canonicalSqliteDatabasePath(dbPath);
  const runId = sanitize(options.runId ?? process.env.PLAYWRIGHT_RUN_ID ?? `pid-${process.pid}`) || `pid-${process.pid}`;
  const recoveryNonce = randomUUID();
  if (Boolean(options.rootDir) !== Boolean(options.runRootIdentity)) {
    throw new Error("SQLite lease guardian requires both a run root and its original identity.");
  }
  const capturedRunRootIdentity = options.rootDir
    ? captureIsolatedAppRunRootIdentity(options.rootDir, runId)
    : null;
  if (
    options.runRootIdentity &&
    (!capturedRunRootIdentity || !runRootIdentityMatches(capturedRunRootIdentity, options.runRootIdentity))
  ) {
    throw new Error(`SQLite lease guardian run-root identity changed before spawn: ${options.rootDir ?? "missing"}`);
  }
  const runRootIdentity = options.runRootIdentity ?? null;
  if (options.tempTsconfigPath && !options.tempTsconfigIdentity) {
    throw new Error("SQLite lease guardian requires the temp tsconfig's original identity.");
  }
  const requestedTempIdentity = options.tempTsconfigIdentity ?? null;
  if (requestedTempIdentity) {
    if (
      options.tempTsconfigPath &&
      path.resolve(options.tempTsconfigPath) !== requestedTempIdentity.path
    ) {
      throw new Error("SQLite lease guardian temp-tsconfig path does not match its original identity.");
    }
    const currentTempIdentity = captureIsolatedAppTempTsconfigIdentity(requestedTempIdentity.path, runId);
    if (!tempTsconfigIdentityMatches(currentTempIdentity, requestedTempIdentity)) {
      throw new Error(`SQLite lease guardian temp-tsconfig identity changed before spawn: ${requestedTempIdentity.path}`);
    }
    if (!runRootIdentity) {
      throw new Error("SQLite lease guardian cannot own a temp tsconfig without an exact run root.");
    }
  }
  const guardianPath = path.join(projectRoot, "tests", "e2e", "isolated-app-lease-guardian.ts");
  const guardianProcess = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      guardianPath,
      canonicalDbPath,
      runId,
      recoveryNonce,
      ...(runRootIdentity ? [
        runRootIdentity.rootDir,
        runRootIdentity.filesystemIdentity,
        requestedTempIdentity?.path ?? "",
        requestedTempIdentity?.filesystemIdentity ?? ""
      ] : [])
    ],
    {
      cwd: projectRoot,
      detached: true,
      env: options.env ?? process.env,
      stdio: ["pipe", "ignore", "pipe", "pipe"]
    }
  );
  const control = guardianProcess.stdio[3] as Readable | null;
  if (!guardianProcess.stdin || !guardianProcess.stderr || !control) {
    try {
      if (guardianProcess.pid) process.kill(-guardianProcess.pid, "SIGKILL");
    } catch {
      // Preserve the structural stdio failure.
    }
    throw new Error("SQLite lease guardian did not expose its required control pipes.");
  }

  guardianProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  let controlInput = "";
  const messages: LeaseGuardianMessage[] = [];
  const messageWaiters = new Set<() => void>();
  let guardianExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  let guardianSpawnError: Error | null = null;
  let appProcess: IsolatedAppProcessState | null = null;
  let appPort: number | null = null;
  let pendingAppExit: Extract<LeaseGuardianMessage, { type: "app-exit" }> | null = null;

  const wakeMessageWaiters = () => {
    for (const waiter of messageWaiters) waiter();
    messageWaiters.clear();
  };
  const pushMessage = (message: LeaseGuardianMessage) => {
    if (message.type === "app-exit") {
      if (appProcess) {
        appProcess.exitCode = message.code;
        appProcess.signalCode = message.signal;
        logLine(
          logs,
          `processExit pid=${appProcess.pid ?? "unknown"} exitCode=${message.code ?? "null"} signal=${message.signal ?? "null"}`
        );
      } else {
        pendingAppExit = message;
      }
    } else {
      messages.push(message);
    }
    wakeMessageWaiters();
  };

  control.setEncoding("utf8");
  control.on("data", (chunk: string) => {
    controlInput += chunk;
    while (controlInput.includes("\n")) {
      const newline = controlInput.indexOf("\n");
      const line = controlInput.slice(0, newline).trim();
      controlInput = controlInput.slice(newline + 1);
      if (!line) continue;
      try {
        pushMessage(JSON.parse(line) as LeaseGuardianMessage);
      } catch (error) {
        pushMessage({
          type: "error",
          operation: "control-parse",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });
  guardianProcess.once("error", (error) => {
    guardianSpawnError = error;
    logLine(logs, `leaseGuardianError error=${error.message}`);
    wakeMessageWaiters();
  });
  guardianProcess.once("exit", (code, signal) => {
    guardianExit = { code, signal };
    logLine(logs, `leaseGuardianExit pid=${guardianProcess.pid ?? "unknown"} code=${code ?? "null"} signal=${signal ?? "null"}`);
    wakeMessageWaiters();
  });

  const nextMessage = async (
    expectedTypes: LeaseGuardianMessage["type"][],
    operation: string,
    timeoutMs = 10_000
  ) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const messageIndex = messages.findIndex(
        (message) => expectedTypes.includes(message.type) || message.type === "error" || message.type === "app-error"
      );
      if (messageIndex !== -1) {
        const [message] = messages.splice(messageIndex, 1);
        if (message.type === "error" || message.type === "app-error") {
          throw new Error(`SQLite lease guardian ${operation} failed: ${message.message}`);
        }
        return message;
      }
      if (guardianSpawnError) throw guardianSpawnError;
      if (guardianExit) {
        throw new Error(
          `SQLite lease guardian exited during ${operation}: code=${guardianExit.code} signal=${guardianExit.signal}`
        );
      }
      await new Promise<void>((resolve) => {
        const remainingMs = Math.max(1, deadline - Date.now());
        const timer = setTimeout(() => {
          messageWaiters.delete(waiter);
          resolve();
        }, remainingMs);
        const waiter = () => {
          clearTimeout(timer);
          resolve();
        };
        messageWaiters.add(waiter);
      });
    }
    throw new Error(`Timed out waiting for SQLite lease guardian ${operation}.`);
  };

  const sendCommand = async (command: LeaseGuardianCommand) => {
    if (guardianExit) {
      throw new Error(
        `SQLite lease guardian is not running: code=${guardianExit.code} signal=${guardianExit.signal}`
      );
    }
    await new Promise<void>((resolve, reject) => {
      guardianProcess.stdin?.write(`${JSON.stringify(command)}\n`, (error) => error ? reject(error) : resolve());
    });
  };

  let ready: Extract<LeaseGuardianMessage, { type: "ready" }>;
  try {
    ready = await nextMessage(["ready"], "startup") as Extract<LeaseGuardianMessage, { type: "ready" }>;
  } catch (error) {
    try {
      if (guardianProcess.pid) process.kill(-guardianProcess.pid, "SIGKILL");
    } catch {
      // The guardian may already have exited after reporting the startup error.
    }
    throw error;
  }
  logLine(logs, `sqliteLeaseGuardianReady runId=${runId} guardianPid=${ready.guardianPid} leasePath=${ready.leasePath}`);

  let released = false;
  let recoveryLease: ReturnType<typeof acquireSqliteAppLease> | null = null;
  let recoveryTempTsconfigRemoved = false;
  return {
    leasePath: ready.leasePath,
    owner: ready.owner,
    guardianPid: ready.guardianPid,
    recoveryNonce,
    removesRunArtifactsOnRelease: Boolean(runRootIdentity),
    get appProcess() {
      return appProcess;
    },
    async spawnApp(command: string, args: string[], port: number) {
      appPort = port;
      await sendCommand({ type: "spawn-app", command, args, port });
      const message = await nextMessage(["app-spawned"], "app spawn") as Extract<LeaseGuardianMessage, { type: "app-spawned" }>;
      appProcess = {
        pid: message.pid,
        exitCode: pendingAppExit?.code ?? null,
        signalCode: pendingAppExit?.signal ?? null,
        processIdentity: message.processIdentity
      };
      pendingAppExit = null;
      logLine(logs, `spawned pid=${message.pid} processGroupId=${message.processGroupId} port=${port}`);
      return { appProcess, processGroupId: message.processGroupId };
    },
    detachForOrphanCleanup() {
      if (!guardianProcess.stdin?.destroyed) guardianProcess.stdin?.end();
    },
    async release() {
      if (released) return;
      if (guardianExit) {
        if (appProcess?.pid && processGroupIsRunning(appProcess.pid)) {
          throw new Error(
            `SQLite lease guardian recovery refused while app process group ${appProcess.pid} is still alive.`
          );
        }
        if (runRootIdentity) {
          const currentRunRootIdentity = captureIsolatedAppRunRootIdentity(
            runRootIdentity.rootDir,
            runRootIdentity.runId
          );
          if (!runRootIdentityMatches(currentRunRootIdentity, runRootIdentity)) {
            throw new Error(
              `SQLite lease guardian recovery refused after its run-root identity changed: ${runRootIdentity.rootDir}`
            );
          }
        }
        if (requestedTempIdentity && existsSync(requestedTempIdentity.path)) {
          const currentTempIdentity = captureIsolatedAppTempTsconfigIdentity(
            requestedTempIdentity.path,
            requestedTempIdentity.runId
          );
          if (!tempTsconfigIdentityMatches(currentTempIdentity, requestedTempIdentity)) {
            throw new Error(
              `SQLite lease guardian recovery refused after its temp-tsconfig identity changed: ${requestedTempIdentity.path}`
            );
          }
        }
        recoveryLease ??= acquireSqliteAppLease(canonicalDbPath, {
          logs,
          runId: `${runId}-guardian-recovery`,
          recoveryNonce
        });
        assertNoSqliteHolder(canonicalDbPath, logs);
        if (appPort) await assertNoLocalListener(appPort, logs);
        if (requestedTempIdentity && !recoveryTempTsconfigRemoved) {
          if (existsSync(requestedTempIdentity.path)) {
            removeCapturedIsolatedAppTempTsconfig(requestedTempIdentity);
          }
          recoveryTempTsconfigRemoved = true;
        }
        recoveryLease.release();
        if (runRootIdentity) removeCapturedIsolatedAppRunRoot(runRootIdentity);
        released = true;
        return;
      }
      await sendCommand({ type: "release" });
      await nextMessage(["released"], "release");
      released = true;
    }
  };
}

type SqliteAppLease = Awaited<ReturnType<typeof startSqliteAppLeaseGuardian>>;
type LifecycleSqliteLease = {
  owner: SqliteAppLeaseOwner;
  release: () => void | Promise<void>;
  removesRunArtifactsOnRelease?: boolean;
};

type IsolatedAppLifecycle = {
  appProcess: IsolatedAppProcessState | null;
  processGroupId: number | null;
  sqliteLease: LifecycleSqliteLease | null;
  dbPath: string;
  port: number;
  tempTsconfigPath: string | null;
  logs: string[];
  rootDir?: string | null;
  runRootIdentity?: IsolatedAppRunRootIdentity | null;
  tempTsconfigIdentity?: IsolatedAppTempTsconfigIdentity | null;
};

export async function cleanupIsolatedAppLifecycle(lifecycle: IsolatedAppLifecycle) {
  const cleanupErrors: unknown[] = [];
  let safeToReleaseLease = lifecycle.appProcess === null;
  let leaseReleased = lifecycle.sqliteLease === null;
  let verifiedRunRootIdentity: IsolatedAppRunRootIdentity | null = null;
  let verifiedTempTsconfigIdentity: IsolatedAppTempTsconfigIdentity | null = null;
  const leaseRemovesRunArtifacts = lifecycle.sqliteLease?.removesRunArtifactsOnRelease === true;

  if (lifecycle.appProcess) {
    try {
      await stopIsolatedProcess(lifecycle.appProcess, lifecycle.logs, lifecycle.processGroupId);
      safeToReleaseLease = true;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (safeToReleaseLease) {
    let releaseBoundaryClear = true;
    try {
      assertNoSqliteHolder(lifecycle.dbPath, lifecycle.logs);
    } catch (error) {
      releaseBoundaryClear = false;
      cleanupErrors.push(error);
    }
    try {
      await assertNoLocalListener(lifecycle.port, lifecycle.logs);
    } catch (error) {
      releaseBoundaryClear = false;
      cleanupErrors.push(error);
    }
    safeToReleaseLease = releaseBoundaryClear;
  }

  if (lifecycle.rootDir) {
    try {
      if (!lifecycle.runRootIdentity) {
        throw new Error(
          `Refusing isolated app root cleanup without its original run-root identity: ${lifecycle.rootDir}`
        );
      }
      if (path.resolve(lifecycle.rootDir) !== lifecycle.runRootIdentity.rootDir) {
        throw new Error(
          `Refusing isolated app root cleanup whose recorded path does not match: ${lifecycle.rootDir}`
        );
      }
      const currentRootIdentity = captureIsolatedAppRunRootIdentity(
        lifecycle.runRootIdentity.rootDir,
        lifecycle.runRootIdentity.runId
      );
      if (!runRootIdentityMatches(currentRootIdentity, lifecycle.runRootIdentity)) {
        throw new Error(
          `Refusing isolated app root cleanup after its physical identity changed: ${lifecycle.rootDir}`
        );
      }
      verifiedRunRootIdentity = lifecycle.runRootIdentity;
    } catch (error) {
      safeToReleaseLease = false;
      cleanupErrors.push(error);
    }
  } else if (lifecycle.runRootIdentity) {
    safeToReleaseLease = false;
    cleanupErrors.push(new Error("Refusing isolated app cleanup with a run-root identity but no root directory."));
  }

  if (lifecycle.tempTsconfigPath) {
    try {
      if (!lifecycle.tempTsconfigIdentity) {
        throw new Error(
          `Refusing isolated app temp-tsconfig cleanup without its original identity: ${lifecycle.tempTsconfigPath}`
        );
      }
      if (path.resolve(lifecycle.tempTsconfigPath) !== lifecycle.tempTsconfigIdentity.path) {
        throw new Error(
          `Refusing isolated app temp-tsconfig cleanup whose recorded path does not match: ${lifecycle.tempTsconfigPath}`
        );
      }
      if (existsSync(lifecycle.tempTsconfigIdentity.path)) {
        const currentTempIdentity = captureIsolatedAppTempTsconfigIdentity(
          lifecycle.tempTsconfigIdentity.path,
          lifecycle.tempTsconfigIdentity.runId
        );
        if (!tempTsconfigIdentityMatches(currentTempIdentity, lifecycle.tempTsconfigIdentity)) {
          throw new Error(
            `Refusing isolated app temp-tsconfig cleanup after its physical identity changed: ${lifecycle.tempTsconfigPath}`
          );
        }
      }
      verifiedTempTsconfigIdentity = lifecycle.tempTsconfigIdentity;
    } catch (error) {
      safeToReleaseLease = false;
      cleanupErrors.push(error);
    }
  } else if (lifecycle.tempTsconfigIdentity) {
    safeToReleaseLease = false;
    cleanupErrors.push(new Error("Refusing isolated app cleanup with a temp-tsconfig identity but no path."));
  }

  if (
    safeToReleaseLease &&
    verifiedTempTsconfigIdentity &&
    !leaseRemovesRunArtifacts
  ) {
    try {
      if (existsSync(verifiedTempTsconfigIdentity.path)) {
        removeCapturedIsolatedAppTempTsconfig(verifiedTempTsconfigIdentity);
      }
      logLine(lifecycle.logs, `nextTsconfigRemoved path=${path.basename(verifiedTempTsconfigIdentity.path)}`);
    } catch (error) {
      safeToReleaseLease = false;
      cleanupErrors.push(error);
    }
  }

  if (lifecycle.sqliteLease) {
    if (safeToReleaseLease && cleanupErrors.length === 0) {
      try {
        await lifecycle.sqliteLease.release();
        leaseReleased = true;
      } catch (error) {
        cleanupErrors.push(error);
      }
    } else {
      logLine(
        lifecycle.logs,
        `sqliteLeaseRetained leaseId=${lifecycle.sqliteLease.owner.leaseId} ` +
        `reason=process-tree-or-holder-not-cleared`
      );
    }
  }

  if (
    leaseRemovesRunArtifacts &&
    leaseReleased &&
    verifiedTempTsconfigIdentity
  ) {
    if (existsSync(verifiedTempTsconfigIdentity.path)) {
      cleanupErrors.push(
        new Error(`SQLite lease guardian returned before removing temp tsconfig: ${verifiedTempTsconfigIdentity.path}`)
      );
    } else {
      logLine(lifecycle.logs, `nextTsconfigRemoved path=${path.basename(verifiedTempTsconfigIdentity.path)}`);
    }
  }

  if (lifecycle.rootDir) {
    if (
      safeToReleaseLease &&
      leaseReleased &&
      cleanupErrors.length === 0 &&
      verifiedRunRootIdentity
    ) {
      try {
        if (leaseRemovesRunArtifacts) {
          if (existsSync(verifiedRunRootIdentity.rootDir)) {
            throw new Error(
              `SQLite lease guardian returned before removing run root: ${verifiedRunRootIdentity.rootDir}`
            );
          }
        } else {
          removeCapturedIsolatedAppRunRoot(verifiedRunRootIdentity);
        }
        logLine(lifecycle.logs, `isolatedAppRootRemoved rootDir=${verifiedRunRootIdentity.rootDir}`);
      } catch (error) {
        cleanupErrors.push(error);
      }
    } else {
      logLine(
        lifecycle.logs,
        `isolatedAppRootRetained rootDir=${lifecycle.rootDir} ` +
        `safeToReleaseLease=${safeToReleaseLease} leaseReleased=${leaseReleased} ` +
        `cleanupErrors=${cleanupErrors.length}`
      );
    }
  }

  return cleanupErrors;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function errorWithCleanupFailures(primaryError: unknown, cleanupErrors: unknown[], label: string) {
  if (!cleanupErrors.length) return primaryError;
  return new AggregateError(
    [primaryError, ...cleanupErrors],
    `${label}: ${errorMessage(primaryError)}; ${cleanupErrors.length} cleanup failure(s) also occurred.`,
    { cause: primaryError }
  );
}

function cleanupFailure(cleanupErrors: unknown[], label: string) {
  if (cleanupErrors.length === 1) return cleanupErrors[0];
  return new AggregateError(cleanupErrors, `${label}: ${cleanupErrors.length} cleanup failures occurred.`);
}

export async function startIsolatedApp(suiteName: string, testInfo: TestInfo, options: IsolatedAppOptions = {}): Promise<IsolatedApp> {
  assertIsolatedAppPlatform();
  const runSlug = sanitize([
    suiteName,
    testInfo.project.name,
    `worker-${testInfo.workerIndex}`,
    Date.now().toString(),
    Math.random().toString(36).slice(2, 8)
  ].join("-"));
  const rootDir = path.join(projectRoot, ".tmp", "e2e-isolated", sanitize(suiteName), runSlug);
  const requestedDbPath = options.dbPath ? path.resolve(options.dbPath) : path.join(rootDir, "hk-math-db.sqlite");
  const dbPath = canonicalSqliteDatabasePath(requestedDbPath);
  const nextDistDir = path.join(rootDir, "next-dist");
  const nextDistDirEnv = path.relative(projectRoot, nextDistDir);
  const nextTsconfigPath = `tsconfig.${runSlug}.tmp.json`;
  const port = await freePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const logs: string[] = [];
  const hasProductionBuild = hasHealthyProductionBuild();
  const requestedMode = process.env.PLAYWRIGHT_ISOLATED_FORCE_DEV === "1"
    ? "dev"
    : options.mode ?? isolatedAppMode(process.env.PLAYWRIGHT_ISOLATED_MODE) ?? "dev";
  if (requestedMode === "production" && !hasProductionBuild) {
    throw new Error("startIsolatedApp was asked for production mode, but the default .next production build is not healthy.");
  }
  const useProductionBuild = requestedMode !== "dev" && hasProductionBuild;
  const startScript = useProductionBuild ? "start" : "dev";
  const appCommand = useProductionBuild ? "npm" : process.execPath;
  const appArgs = useProductionBuild
    ? ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)]
    : [
        "scripts/with-next-env-restore.mjs",
        "--",
        "npm", "run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)
      ];

  const providerEnv = options.liveProviders
    ? {}
    : {
        DEEPSEEK_API_KEY: "",
        DEEPSEEK_MODEL: "",
        DEEPSEEK_API_URL: "",
        QWEN_API_KEY: "",
        QWEN_API_URL: "",
        AI_TUTOR_QWEN_IMAGE_MODEL: "",
        QWEN_IMAGE_MODEL: "",
        QWEN_IMAGE_API_URL: "",
        QWEN_REALTIME_MODEL: "",
        QWEN_REALTIME_API_URL: ""
      };
  const appEnv = isolatedAppProcessEnvironment(
    { ...process.env, ...providerEnv },
    options.env ?? {},
    {
      authSessionSecret: `${sanitize(suiteName)}-e2e-session-secret`,
      dbPath,
      nextDistDir: useProductionBuild ? undefined : nextDistDirEnv,
      nextTsconfigPath: useProductionBuild ? undefined : nextTsconfigPath
    }
  );

  const tempTsconfigPath = useProductionBuild ? null : path.join(projectRoot, nextTsconfigPath);
  let sqliteLease: SqliteAppLease | null = null;
  let appProcess: IsolatedAppProcessState | null = null;
  let processGroupId: number | null = null;
  let rootIdentity: IsolatedAppRunRootIdentity | null = null;
  let tempTsconfigIdentity: IsolatedAppTempTsconfigIdentity | null = null;

  try {
    rootIdentity = createIsolatedAppRunRoot(suiteName, runSlug);
    mkdirSync(path.dirname(dbPath), { recursive: true });
    if (!useProductionBuild) {
      tempTsconfigIdentity = writeTempNextTsconfig(nextTsconfigPath, nextDistDirEnv, runSlug);
    }

    logLine(logs, `isolatedAppRequestedMode=${requestedMode}`);
    logLine(logs, `isolatedAppMode=${useProductionBuild ? "production-start" : "dev-isolated"}`);
    logLine(logs, `buildId=${readBuildId()}`);
    logLine(logs, `rootDir=${rootDir}`);
    if (!useProductionBuild) logLine(logs, `nextDistDir=${nextDistDirEnv}`);
    if (!useProductionBuild) logLine(logs, `nextTsconfigPath=${nextTsconfigPath}`);
    logLine(logs, `dbPath=${dbPath}`);

    await assertNoLocalListener(port, logs);
    sqliteLease = await startSqliteAppLeaseGuardian(dbPath, {
      logs,
      runId: runSlug,
      env: appEnv,
      rootDir,
      runRootIdentity: rootIdentity,
      tempTsconfigIdentity
    });
    assertNoSqliteHolder(dbPath, logs);

    const spawned = await sqliteLease.spawnApp(appCommand, appArgs, port);
    appProcess = spawned.appProcess;
    processGroupId = spawned.processGroupId;
    logLine(logs, `spawnedScript=${startScript} port=${port}`);

    await waitForApp(baseURL, appProcess, logs);
    logLine(logs, `ready baseURL=${baseURL}`);
    if (options.warmPaths?.length) await warmRouteChunks(baseURL, options.warmPaths, appProcess, logs);
  } catch (error) {
    const cleanupErrors = await cleanupIsolatedAppLifecycle({
      appProcess,
      processGroupId,
      sqliteLease,
      dbPath,
      port,
      tempTsconfigPath,
      logs,
      rootDir,
      runRootIdentity: rootIdentity,
      tempTsconfigIdentity
    });
    if (cleanupErrors.length) sqliteLease?.detachForOrphanCleanup();
    throw errorWithCleanupFailures(error, cleanupErrors, "Isolated app startup failed");
  }

  if (!appProcess || !sqliteLease || !rootIdentity) {
    throw new Error("Isolated app startup completed without a process, SQLite lease, or run-root identity.");
  }

  const startedProcess = appProcess;
  const acquiredLease = sqliteLease;
  let stopped = false;
  let stopAttempt: Promise<void> | null = null;
  const stop = () => {
    if (stopped) return Promise.resolve();
    if (stopAttempt) return stopAttempt;

    stopAttempt = (async () => {
      const cleanupErrors = await cleanupIsolatedAppLifecycle({
        appProcess: startedProcess,
        processGroupId,
        sqliteLease: acquiredLease,
        dbPath,
        port,
        tempTsconfigPath,
        logs,
        rootDir,
        runRootIdentity: rootIdentity,
        tempTsconfigIdentity
      });
      if (cleanupErrors.length) throw cleanupFailure(cleanupErrors, "Isolated app stop failed");
      stopped = true;
    })().finally(() => {
      if (!stopped) stopAttempt = null;
    });
    return stopAttempt;
  };

  return {
    baseURL,
    dbPath,
    rootDir,
    logs,
    url(pathname: string) {
      const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
      return new URL(cleanPath, baseURL).toString();
    },
    async assertAlive(label: string, pathname = "/login") {
      await assertIsolatedAppAlive(baseURL, startedProcess, logs, label, pathname);
    },
    stop,
    async attachLogs(nextTestInfo: TestInfo, name = "isolated-app.log") {
      if (!logs.length) return;
      await nextTestInfo.attach(name, {
        body: [
          `baseURL=${baseURL}`,
          `dbPath=${dbPath}`,
          "",
          logs.join("")
        ].join("\n"),
        contentType: "text/plain"
      });
    }
  };
}
