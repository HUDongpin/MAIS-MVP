import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, readFileSync, writeSync } from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";
import {
  acquireSqliteAppLease,
  captureIsolatedAppRunRootIdentity,
  captureIsolatedAppTempTsconfigIdentity,
  isolatedAppProcessGroupIsRunning,
  isolatedAppProcessIdentity,
  removeCapturedIsolatedAppRunRoot,
  removeCapturedIsolatedAppTempTsconfig,
  sqliteHolderPids,
  type IsolatedAppRunRootIdentity,
  type IsolatedAppTempTsconfigIdentity,
  type SqliteAppLeaseOwner
} from "./isolated-app";
import type { IsolatedAppProcessSupervisorMarker } from "./isolated-app-process-supervisor";

export type LeaseGuardianCompileContract = IsolatedAppProcessSupervisorMarker;

export type LeaseGuardianCommand =
  | { type: "spawn-app"; command: string; args: string[]; port: number }
  | { type: "release" };

export type LeaseGuardianMessage =
  | { type: "ready"; guardianPid: number; leasePath: string; owner: SqliteAppLeaseOwner }
  | { type: "app-spawned"; pid: number; processGroupId: number; processIdentity: string }
  | { type: "app-exit"; code: number | null; signal: NodeJS.Signals | null }
  | { type: "app-error"; message: string }
  | { type: "released" }
  | { type: "error"; operation: string; message: string };

function send(message: LeaseGuardianMessage) {
  try {
    writeSync(3, `${JSON.stringify(message)}\n`);
  } catch {
    // An abruptly killed worker closes the control pipe. The guardian must keep
    // the lease instead of treating parent-pipe loss as permission to release.
  }
}

const processGroupIsAlive = isolatedAppProcessGroupIsRunning;

async function waitForProcessGroupExit(processGroupId: number, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (processGroupIsAlive(processGroupId) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !processGroupIsAlive(processGroupId);
}

function processIsStopped(pid: number) {
  if (process.platform === "linux") {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const commandEnd = stat.lastIndexOf(")");
      return commandEnd !== -1 && stat.slice(commandEnd + 2, commandEnd + 3) === "T";
    } catch {
      return false;
    }
  }

  try {
    return execFileSync("ps", ["-o", "state=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trimStart().startsWith("T");
  } catch {
    return false;
  }
}

async function waitForStoppedBootstrap(appProcess: ChildProcessWithoutNullStreams, registrationPath: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (appProcess.exitCode !== null || appProcess.signalCode !== null) {
      throw new Error(
        `isolated app bootstrap exited before registration: code=${appProcess.exitCode} signal=${appProcess.signalCode}`
      );
    }
    if (appProcess.pid && existsSync(registrationPath)) {
      const registeredPid = Number(readFileSync(registrationPath, "utf8").trim());
      if (registeredPid === appProcess.pid && processIsStopped(appProcess.pid)) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("isolated app bootstrap did not reach its registered stopped state");
}

async function localPortHasListener(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (listening: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(listening);
    };
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.setTimeout(500);
  });
}

const [
  dbPath,
  runId,
  recoveryNonce,
  requestedRootDir,
  requestedRootIdentity,
  requestedTempTsconfigPath,
  requestedTempTsconfigIdentity
] = process.argv.slice(2);
if (!dbPath || !runId || !recoveryNonce || process.platform === "win32") {
  send({
    type: "error",
    operation: "startup",
    message: process.platform === "win32"
      ? "The isolated app lease guardian is unsupported on Windows."
      : "SQLite lease guardian requires a DB path, run id, and recovery nonce."
  });
  process.exit(2);
}

let runRootIdentity: IsolatedAppRunRootIdentity | null = null;
let tempTsconfigIdentity: IsolatedAppTempTsconfigIdentity | null = null;
try {
  if ((requestedRootDir && !requestedRootIdentity) || (!requestedRootDir && requestedRootIdentity)) {
    throw new Error("SQLite lease guardian requires both a run root and its physical identity.");
  }
  if (requestedRootDir && requestedRootIdentity) {
    runRootIdentity = captureIsolatedAppRunRootIdentity(requestedRootDir, runId);
    if (runRootIdentity.filesystemIdentity !== requestedRootIdentity) {
      throw new Error(`SQLite lease guardian run-root physical identity changed before startup: ${requestedRootDir}`);
    }
  }
  if (
    (requestedTempTsconfigPath && !requestedTempTsconfigIdentity) ||
    (!requestedTempTsconfigPath && requestedTempTsconfigIdentity)
  ) {
    throw new Error("SQLite lease guardian requires both a temp-tsconfig path and its physical identity.");
  }
  if (requestedTempTsconfigPath && requestedTempTsconfigIdentity) {
    if (!runRootIdentity) {
      throw new Error("SQLite lease guardian cannot own a temp tsconfig without an exact run root.");
    }
    tempTsconfigIdentity = captureIsolatedAppTempTsconfigIdentity(requestedTempTsconfigPath, runId);
    if (tempTsconfigIdentity.filesystemIdentity !== requestedTempTsconfigIdentity) {
      throw new Error(
        `SQLite lease guardian temp-tsconfig physical identity changed before startup: ${requestedTempTsconfigPath}`
      );
    }
  }
} catch (error) {
  send({
    type: "error",
    operation: "startup",
    message: error instanceof Error ? error.message : String(error)
  });
  process.exit(2);
}

let lease: ReturnType<typeof acquireSqliteAppLease>;
try {
  lease = acquireSqliteAppLease(dbPath, { runId, recoveryNonce });
} catch (error) {
  send({
    type: "error",
    operation: "startup",
    message: error instanceof Error ? error.message : String(error)
  });
  process.exit(2);
}

let appProcess: ChildProcessWithoutNullStreams | null = null;
let appPort: number | null = null;
let registeredAppIdentity: string | null = null;
let parentDisconnected = false;
let registrationInProgress = false;
let releasing = false;
let orphanCleanupStarted = false;
let tempTsconfigRemoved = false;
let input = "";
let commandChain = Promise.resolve();

process.stderr.on("error", () => {
  // The worker-side log pipe disappears on worker crash. App output still has
  // to be drained so the detached app cannot block while the guardian holds.
});

function forwardAppOutput(chunk: Buffer | string) {
  try {
    process.stderr.write(chunk);
  } catch {
    // See the stderr error handler above.
  }
}

async function verifyReleaseBoundary() {
  if (registrationInProgress) {
    throw new Error("isolated app registration is still in progress");
  }
  if (appProcess?.pid && processGroupIsAlive(appProcess.pid)) {
    throw new Error(`isolated app process group ${appProcess.pid} is still alive`);
  }
  const holderPids = sqliteHolderPids(dbPath);
  if (holderPids.length) {
    throw new Error(`SQLite product DB holder(s) still alive: ${holderPids.join(", ")}`);
  }
  if (appPort && await localPortHasListener(appPort)) {
    throw new Error(`isolated app port ${appPort} still has a listener`);
  }
}

function assertRunRootIdentityUnchanged(identity: IsolatedAppRunRootIdentity) {
  const current = captureIsolatedAppRunRootIdentity(identity.rootDir, identity.runId);
  if (
    current.filesystemIdentity !== identity.filesystemIdentity ||
    current.projectRootIdentity !== identity.projectRootIdentity ||
    current.tmpRootIdentity !== identity.tmpRootIdentity ||
    current.isolatedRunsRootIdentity !== identity.isolatedRunsRootIdentity ||
    current.suiteRootIdentity !== identity.suiteRootIdentity
  ) {
    throw new Error(`isolated app run-root physical identity changed: ${identity.rootDir}`);
  }
}

function assertTempTsconfigIdentityUnchanged(identity: IsolatedAppTempTsconfigIdentity) {
  const current = captureIsolatedAppTempTsconfigIdentity(identity.path, identity.runId);
  if (
    current.filesystemIdentity !== identity.filesystemIdentity ||
    current.projectRootIdentity !== identity.projectRootIdentity
  ) {
    throw new Error(`isolated app temp-tsconfig physical identity changed: ${identity.path}`);
  }
}

async function releaseAndExit(operation: string, removeRunRoot = false) {
  if (releasing) return;
  releasing = true;
  try {
    await verifyReleaseBoundary();
    if (removeRunRoot) {
      if (!runRootIdentity) {
        throw new Error("orphan cleanup lacks an exact run-owned root identity");
      }
      assertRunRootIdentityUnchanged(runRootIdentity);
      if (tempTsconfigIdentity && !tempTsconfigRemoved) {
        if (existsSync(tempTsconfigIdentity.path)) {
          assertTempTsconfigIdentityUnchanged(tempTsconfigIdentity);
          removeCapturedIsolatedAppTempTsconfig(tempTsconfigIdentity);
        }
        tempTsconfigRemoved = true;
      }
    }
    lease.release();
    if (removeRunRoot && runRootIdentity) removeCapturedIsolatedAppRunRoot(runRootIdentity);
    clearInterval(keepAlive);
    send({ type: "released" });
    process.exit(0);
  } catch (error) {
    releasing = false;
    send({
      type: "error",
      operation,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function assertActiveAppMatchesGuardian(
  activeApp: ReturnType<typeof lease.readPersistedActiveApp>,
  operation: string
) {
  if (!appProcess?.pid || activeApp.processGroupId !== appProcess.pid || activeApp.port !== appPort) {
    throw new Error(
      `Persisted isolated app identity does not match the guardian's live app handle during ${operation}.`
    );
  }
  if (!registeredAppIdentity || activeApp.processIdentity !== registeredAppIdentity) {
    throw new Error(
      `Persisted isolated app process identity does not match the guardian's immutable registration before ${operation}; ` +
      `retaining its SQLite lease.`
    );
  }
  const currentIdentity = isolatedAppProcessIdentity(activeApp.processGroupId);
  if (!currentIdentity) {
    throw new Error(
      `Could not prove isolated app process identity before ${operation}; retaining its SQLite lease.`
    );
  }
  if (currentIdentity !== registeredAppIdentity) {
    throw new Error(
      `Persisted isolated app process identity mismatch before ${operation}; retaining its SQLite lease.`
    );
  }
}

async function stopOrphanedApp() {
  if (!runRootIdentity) {
    throw new Error("orphan cleanup lacks an exact run-owned root identity; refusing to signal the app group");
  }
  if (!appProcess) return;
  const activeApp = lease.readPersistedActiveApp();
  if (!processGroupIsAlive(activeApp.processGroupId)) return;

  assertActiveAppMatchesGuardian(activeApp, "SIGTERM");
  try {
    process.kill(-activeApp.processGroupId, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH" || processGroupIsAlive(activeApp.processGroupId)) {
      throw error;
    }
  }
  if (await waitForProcessGroupExit(activeApp.processGroupId)) return;

  const activeBeforeKill = lease.readPersistedActiveApp();
  if (
    activeBeforeKill.processGroupId !== activeApp.processGroupId ||
    activeBeforeKill.processIdentity !== activeApp.processIdentity ||
    activeBeforeKill.port !== activeApp.port
  ) {
    throw new Error("Persisted isolated app identity changed before SIGKILL; retaining its SQLite lease.");
  }
  assertActiveAppMatchesGuardian(activeBeforeKill, "SIGKILL");
  try {
    process.kill(-activeBeforeKill.processGroupId, "SIGKILL");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH" || processGroupIsAlive(activeBeforeKill.processGroupId)) {
      throw error;
    }
  }
  if (!await waitForProcessGroupExit(activeBeforeKill.processGroupId)) {
    throw new Error(
      `isolated app process group ${activeBeforeKill.processGroupId} remained alive after SIGKILL; retaining its SQLite lease`
    );
  }
}

async function spawnRegisteredApp(command: string, args: string[], port: number) {
  if (appProcess || registrationInProgress) throw new Error("isolated app has already been spawned");
  if (!command || !Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error("invalid isolated app spawn request");
  }

  registrationInProgress = true;
  appPort = port;

  try {
    const registrationPath = lease.beginAppRegistration(port);
    const supervisorPath = path.join(process.cwd(), "tests", "e2e", "isolated-app-process-supervisor.ts");
    appProcess = spawn(
      process.execPath,
      ["--import", "tsx", supervisorPath, registrationPath, command, ...args],
      {
        cwd: process.cwd(),
        detached: true,
        env: {
          ...process.env,
          HK_MATH_DB_PATH: lease.owner.dbPath
        }
      }
    );
    const spawnedProcess = appProcess;
    spawnedProcess.stdout.on("data", forwardAppOutput);
    spawnedProcess.stderr.on("data", forwardAppOutput);
    spawnedProcess.once("exit", (code, signal) => send({ type: "app-exit", code, signal }));
    spawnedProcess.once("error", (error) => send({ type: "app-error", message: error.message }));

    await waitForStoppedBootstrap(spawnedProcess, registrationPath);
    if (!spawnedProcess.pid) throw new Error("isolated app bootstrap has no process id");
    const processIdentity = lease.activateApp(spawnedProcess.pid);
    registeredAppIdentity = processIdentity;
    registrationInProgress = false;
    send({
      type: "app-spawned",
      pid: spawnedProcess.pid,
      processGroupId: spawnedProcess.pid,
      processIdentity
    });
    process.kill(-spawnedProcess.pid, "SIGCONT");
  } catch (error) {
    registrationInProgress = false;
    const cleanupErrors: unknown[] = [];
    if (appProcess?.pid) {
      try {
        process.kill(-appProcess.pid, "SIGKILL");
      } catch (cleanupError) {
        if ((cleanupError as NodeJS.ErrnoException).code !== "ESRCH") cleanupErrors.push(cleanupError);
      }
      if (!await waitForProcessGroupExit(appProcess.pid)) {
        cleanupErrors.push(
          new Error(`failed isolated app bootstrap group ${appProcess.pid} did not exit after SIGKILL`)
        );
      }
    }
    if (cleanupErrors.length) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `isolated app bootstrap failed with ${cleanupErrors.length} cleanup failure(s)`,
        { cause: error }
      );
    }
    throw error;
  }
}

async function handleCommand(command: LeaseGuardianCommand) {
  if (command.type === "spawn-app") {
    await spawnRegisteredApp(command.command, command.args, command.port);
    return;
  }
  if (command.type === "release") await releaseAndExit("release", Boolean(runRootIdentity));
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  input += chunk;
  while (input.includes("\n")) {
    const newline = input.indexOf("\n");
    const line = input.slice(0, newline).trim();
    input = input.slice(newline + 1);
    if (!line) continue;
    commandChain = commandChain.then(async () => {
      try {
        await handleCommand(JSON.parse(line) as LeaseGuardianCommand);
      } catch (error) {
        send({
          type: "error",
          operation: "command",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
});
process.stdin.on("end", () => {
  parentDisconnected = true;
  startOrphanCleanupOnce();
});
process.stdin.resume();

function startOrphanCleanupOnce() {
  if (
    !parentDisconnected ||
    releasing ||
    registrationInProgress ||
    orphanCleanupStarted
  ) return;
  orphanCleanupStarted = true;
  commandChain = commandChain.then(async () => {
    try {
      await stopOrphanedApp();
      await releaseAndExit("orphan-cleanup", true);
    } catch (error) {
      send({
        type: "error",
        operation: "orphan-cleanup",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

const keepAlive = setInterval(() => {
  startOrphanCleanupOnce();
}, 250);

send({
  type: "ready",
  guardianPid: process.pid,
  leasePath: lease.leasePath,
  owner: lease.owner
});
