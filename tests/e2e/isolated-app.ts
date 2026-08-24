import type { TestInfo } from "@playwright/test";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { createServer, type Server } from "node:http";
import { createConnection } from "node:net";
import path from "node:path";

export type IsolatedAppOptions = {
  warmPaths?: string[];
  env?: Record<string, string | undefined>;
  dbPath?: string;
  liveProviders?: boolean;
  mode?: "dev" | "production" | "auto";
};

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logLine(logs: string[], message: string) {
  logs.push(`[${new Date().toISOString()}] ${message}\n`);
}

function recentLogTail(logs: string[]) {
  return logs.slice(-80).join("");
}

function processState(appProcess: ChildProcessWithoutNullStreams) {
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
  inspector: "lsof" | "procfs" | "none-needed";
  pids: string[];
};

function canonicalFileCandidates(dbPath: string) {
  const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]
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
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        return null;
      }
    }

    const fdRoot = path.join(processRoot, "fd");
    let fileDescriptors;
    try {
      fileDescriptors = readdirSync(fdRoot);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "ESRCH") continue;
      return null;
    }

    for (const descriptor of fileDescriptors) {
      let target;
      try {
        target = readlinkSync(path.join(fdRoot, descriptor));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ESRCH") continue;
        return null;
      }

      const cleanTarget = cleanProcFileTarget(target);
      if (path.isAbsolute(cleanTarget) && candidateSet.has(path.resolve(cleanTarget))) {
        pids.add(entry.name);
        break;
      }
    }
  }

  return Array.from(pids).sort();
}

function inspectSqliteHolders(dbPath: string, options: SqliteHolderInspectionOptions = {}): SqliteHolderInspection {
  const candidates = canonicalFileCandidates(dbPath);
  if (!candidates.length) return { inspector: "none-needed", pids: [] };

  const lsofPids = lsofSqliteHolderPids(candidates, options.lsofCommand ?? "lsof");
  if (lsofPids) return { inspector: "lsof", pids: lsofPids };

  if ((options.platform ?? process.platform) === "linux") {
    const procfsPids = procfsSqliteHolderPids(candidates, options.procRoot ?? "/proc");
    if (procfsPids) return { inspector: "procfs", pids: procfsPids };
  }

  throw new Error(`Preflight failed: no SQLite holder inspector is available for ${path.resolve(dbPath)}.`);
}

export function sqliteHolderPids(dbPath: string, options: SqliteHolderInspectionOptions = {}) {
  return inspectSqliteHolders(dbPath, options).pids;
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

async function waitForApp(baseURL: string, appProcess: ChildProcessWithoutNullStreams, logs: string[], timeoutMs = 90_000) {
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

function writeTempNextTsconfig(tsconfigPath: string, nextDistDir: string) {
  writeFileSync(
    path.join(projectRoot, tsconfigPath),
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
    }, null, 2)
  );
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

async function warmRouteChunks(baseURL: string, warmPaths: string[], appProcess: ChildProcessWithoutNullStreams, logs: string[]) {
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
  appProcess: ChildProcessWithoutNullStreams,
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

async function stopProcess(appProcess: ChildProcessWithoutNullStreams, logs?: string[]) {
  if (appProcess.exitCode !== null) return;
  logLine(logs ?? [], `stopRequested pid=${appProcess.pid ?? "unknown"}`);

  const killTree = (signal: NodeJS.Signals) => {
    try {
      if (process.platform === "win32" || !appProcess.pid) {
        appProcess.kill(signal);
        return;
      }

      const pids = processTreeIds(appProcess.pid);
      logLine(logs ?? [], `stopSignal signal=${signal} pids=${pids.join(",") || "none"}`);
      for (const pid of pids.reverse()) {
        try {
          process.kill(pid, signal);
        } catch {
          // A child may exit naturally while the tree is being signalled.
        }
      }
    } catch {
      // The process tree may have already exited between checks.
    }
  };

  await new Promise<void>((resolve) => {
    const killTimer = setTimeout(() => {
      if (appProcess.exitCode === null) {
        logLine(logs ?? [], `stopEscalated signal=SIGKILL pid=${appProcess.pid ?? "unknown"}`);
        killTree("SIGKILL");
      }
      resolve();
    }, 5_000);

    appProcess.once("exit", (code, signal) => {
      clearTimeout(killTimer);
      logLine(logs ?? [], `stopped pid=${appProcess.pid ?? "unknown"} exitCode=${code ?? "null"} signal=${signal ?? "null"}`);
      resolve();
    });

    killTree("SIGTERM");
  });
}

export async function startIsolatedApp(suiteName: string, testInfo: TestInfo, options: IsolatedAppOptions = {}): Promise<IsolatedApp> {
  const runSlug = sanitize([
    suiteName,
    testInfo.project.name,
    `worker-${testInfo.workerIndex}`,
    Date.now().toString(),
    Math.random().toString(36).slice(2, 8)
  ].join("-"));
  const rootDir = path.join(projectRoot, ".tmp", "e2e-isolated", sanitize(suiteName), runSlug);
  const dbPath = options.dbPath ? path.resolve(options.dbPath) : path.join(rootDir, "hk-math-db.sqlite");
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

  rmSync(rootDir, { recursive: true, force: true });
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!useProductionBuild) writeTempNextTsconfig(nextTsconfigPath, nextDistDirEnv);

  logLine(logs, `isolatedAppRequestedMode=${requestedMode}`);
  logLine(logs, `isolatedAppMode=${useProductionBuild ? "production-start" : "dev-isolated"}`);
  logLine(logs, `buildId=${readBuildId()}`);
  logLine(logs, `rootDir=${rootDir}`);
  if (!useProductionBuild) logLine(logs, `nextDistDir=${nextDistDirEnv}`);
  if (!useProductionBuild) logLine(logs, `nextTsconfigPath=${nextTsconfigPath}`);
  logLine(logs, `dbPath=${dbPath}`);
  await assertNoLocalListener(port, logs);
  assertNoSqliteHolder(dbPath, logs);

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

  const appProcess = spawn(appCommand, appArgs, {
    cwd: projectRoot,
    // Keep the restoration wrapper in the Playwright worker's foreground
    // process group so a runner interruption reaches it. Normal teardown still
    // walks and stops the exact child tree before the wrapper restores next-env.
    detached: false,
    env: {
      ...process.env,
      ...providerEnv,
      AUTH_SESSION_SECRET: `${sanitize(suiteName)}-e2e-session-secret`,
      HK_MATH_DB_PATH: dbPath,
      HK_MATH_ENABLE_DEMO_USER: "true",
      HK_MATH_EXPOSE_LOCAL_RESET_LINKS: "true",
      AI_TUTOR_MAX_REQUESTS_PER_MINUTE: "2",
      ...(useProductionBuild ? {} : { NEXT_DIST_DIR: nextDistDirEnv, NEXT_TSCONFIG_PATH: nextTsconfigPath }),
      ...options.env
    }
  });
  logLine(logs, `spawned pid=${appProcess.pid ?? "unknown"} script=${startScript} port=${port}`);

  appProcess.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  appProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()));
  appProcess.once("exit", (code, signal) => {
    logLine(logs, `processExit pid=${appProcess.pid ?? "unknown"} exitCode=${code ?? "null"} signal=${signal ?? "null"}`);
  });
  appProcess.once("error", (error) => {
    logLine(logs, `processError pid=${appProcess.pid ?? "unknown"} error=${error.message}`);
  });

  const stop = async () => {
    await stopProcess(appProcess, logs);
    if (!useProductionBuild) rmSync(path.join(projectRoot, nextTsconfigPath), { force: true });
  };

  try {
    await waitForApp(baseURL, appProcess, logs);
    logLine(logs, `ready baseURL=${baseURL}`);
    if (options.warmPaths?.length) await warmRouteChunks(baseURL, options.warmPaths, appProcess, logs);
  } catch (error) {
    await stop();
    throw error;
  }

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
      await assertIsolatedAppAlive(baseURL, appProcess, logs, label, pathname);
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
