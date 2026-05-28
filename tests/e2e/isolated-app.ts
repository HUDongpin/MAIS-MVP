import type { TestInfo } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

export type IsolatedAppOptions = {
  warmPaths?: string[];
  env?: Record<string, string | undefined>;
};

export type IsolatedApp = {
  baseURL: string;
  dbPath: string;
  rootDir: string;
  logs: string[];
  url: (pathname: string) => string;
  stop: () => Promise<void>;
  attachLogs: (testInfo: TestInfo, name?: string) => Promise<void>;
};

const projectRoot = process.cwd();
const buildIdPath = path.join(projectRoot, ".next", "BUILD_ID");

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logLine(logs: string[], message: string) {
  logs.push(`[${new Date().toISOString()}] ${message}\n`);
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

async function waitForApp(baseURL: string, appProcess: ChildProcessWithoutNullStreams, logs: string[], timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (appProcess.exitCode !== null) {
      throw new Error(`Isolated app exited before it was ready.\n${logs.slice(-80).join("")}`);
    }

    try {
      const response = await fetch(baseURL, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Keep polling until Next is ready to accept requests.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for isolated app at ${baseURL}.\n${logs.slice(-80).join("")}`);
}

function readBuildId() {
  if (!existsSync(buildIdPath)) return "none";
  try {
    return readFileSync(buildIdPath, "utf8").trim() || "empty";
  } catch {
    return "unreadable";
  }
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
      throw new Error(`Isolated app exited before warmup for ${warmPath}.\n${logs.slice(-80).join("")}`);
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

async function stopProcess(appProcess: ChildProcessWithoutNullStreams, logs?: string[]) {
  if (appProcess.exitCode !== null) return;
  logLine(logs ?? [], `stopRequested pid=${appProcess.pid ?? "unknown"}`);

  const killTree = (signal: NodeJS.Signals) => {
    try {
      if (process.platform !== "win32" && appProcess.pid) {
        process.kill(-appProcess.pid, signal);
      } else {
        appProcess.kill(signal);
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
  const dbPath = path.join(rootDir, "hk-math-db.sqlite");
  const port = await freePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const logs: string[] = [];
  const hasProductionBuild = existsSync(buildIdPath);
  const useProductionBuild = process.env.PLAYWRIGHT_ISOLATED_FORCE_DEV !== "1" && hasProductionBuild;
  const startScript = useProductionBuild ? "start" : "dev";

  rmSync(rootDir, { recursive: true, force: true });
  mkdirSync(rootDir, { recursive: true });

  logLine(logs, `isolatedAppMode=${useProductionBuild ? "production-start" : "dev-isolated"}`);
  logLine(logs, `buildId=${readBuildId()}`);
  logLine(logs, `rootDir=${rootDir}`);
  logLine(logs, `dbPath=${dbPath}`);

  const appProcess = spawn("npm", ["run", startScript, "--", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      LLM_API_KEY: "",
      OPENAI_API_KEY: "",
      LLM_MODEL: "",
      OPENAI_MODEL: "",
      LLM_API_URL: "",
      AUTH_SESSION_SECRET: `${sanitize(suiteName)}-e2e-session-secret`,
      HK_MATH_DB_PATH: dbPath,
      HK_MATH_ENABLE_DEMO_USER: "true",
      HK_MATH_EXPOSE_LOCAL_RESET_LINKS: "true",
      AI_TUTOR_MAX_REQUESTS_PER_MINUTE: "2",
      ...options.env
    }
  });
  logLine(logs, `spawned pid=${appProcess.pid ?? "unknown"} script=${startScript} port=${port}`);

  appProcess.stdout.on("data", (chunk) => logs.push(chunk.toString()));
  appProcess.stderr.on("data", (chunk) => logs.push(chunk.toString()));

  try {
    await waitForApp(baseURL, appProcess, logs);
    logLine(logs, `ready baseURL=${baseURL}`);
    if (options.warmPaths?.length) await warmRouteChunks(baseURL, options.warmPaths, appProcess, logs);
  } catch (error) {
    await stopProcess(appProcess, logs);
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
    stop: () => stopProcess(appProcess, logs),
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
