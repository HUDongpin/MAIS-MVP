import { chromium, type FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  assertMutableBrowserPathsOnStarship,
  assertStarshipE2eEnvironment,
  assertStarshipPath,
  MUTABLE_BROWSER_PATH_FLAGS,
  parseMutableBrowserPathArguments,
  validateStarshipE2ePathManifest
} from "../../scripts/starship-e2e-path-gate.mjs";

type ProcessRow = {
  command: string;
  pid: number;
  ppid: number;
};

function processRows(): ProcessRow[] {
  const output = execFileSync("ps", ["-axo", "pid=,ppid=,command="], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  return output
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/u))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      command: match[3],
      pid: Number(match[1]),
      ppid: Number(match[2])
    }));
}

function descendantRows(rows: ProcessRow[], ancestorPid: number) {
  const childrenByParent = new Map<number, number[]>();
  const rowByPid = new Map(rows.map((row) => [row.pid, row]));
  for (const row of rows) {
    const children = childrenByParent.get(row.ppid) ?? [];
    children.push(row.pid);
    childrenByParent.set(row.ppid, children);
  }
  const descendants: ProcessRow[] = [];
  const pending = [...(childrenByParent.get(ancestorPid) ?? [])];
  const seen = new Set<number>();
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

async function observeLaunchedChrome(browserTempDir: string) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const rows = descendantRows(processRows(), process.pid);
    const browserRow = rows.find((row) => {
      if (!row.command.includes("--remote-debugging-pipe")) return false;
      const userData = parseMutableBrowserPathArguments(row.command)
        .find(({ flag }) => flag === "user-data-dir");
      return userData?.path.startsWith(`${browserTempDir}${path.sep}`) === true;
    });
    if (browserRow) {
      const browserTree = [browserRow, ...descendantRows(rows, browserRow.pid)];
      const mutablePaths = browserTree.flatMap((row) =>
        assertMutableBrowserPathsOnStarship(row.command)
          .map((entry) => ({ ...entry, pid: row.pid }))
      );
      const userDataPath = mutablePaths.find(({ flag, pid }) =>
        flag === "user-data-dir" && pid === browserRow.pid
      )?.path;
      if (!userDataPath) throw new Error("Launched Chrome exposed no --user-data-dir path.");
      const canonicalUserDataPath = assertStarshipPath(
        "actual Chrome --user-data-dir",
        userDataPath
      );
      if (!canonicalUserDataPath.startsWith(`${browserTempDir}${path.sep}`)) {
        throw new Error(
          `Actual Chrome --user-data-dir escaped browserTempDir; actual=${canonicalUserDataPath}.`
        );
      }
      return {
        browserPid: browserRow.pid,
        mutablePaths,
        processCount: browserTree.length,
        userDataDir: canonicalUserDataPath
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(
    `Could not observe an actual Chrome --user-data-dir under ${browserTempDir} within 5000ms.`
  );
}

export default async function starshipE2eGlobalSetup(config: FullConfig) {
  const manifestPath = assertStarshipPath(
    "PLAYWRIGHT_PATH_MANIFEST_PATH",
    process.env.PLAYWRIGHT_PATH_MANIFEST_PATH
  );
  const manifest = validateStarshipE2ePathManifest(
    JSON.parse(readFileSync(manifestPath, "utf8"))
  );
  const browserTempDir = manifest.paths.browserTempDir;
  assertStarshipE2eEnvironment(
    process.env,
    browserTempDir,
    manifest.paths.nodeCompileCacheDir,
    manifest.paths.npmCacheDir
  );
  const crashDumpDir = manifest.paths.crashDumpDir;
  const evidencePath = manifest.paths.browserProfileEvidencePath;
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome";
  const enforcedLaunchArgs = [
    "--disable-breakpad",
    "--disable-crash-reporter",
    `--crash-dumps-dir=${crashDumpDir}`
  ];
  const projectContracts = config.projects.map((project) => {
    const launchArgs = project.use.launchOptions?.args ?? [];
    const missingLaunchArgs = enforcedLaunchArgs.filter((argument) => !launchArgs.includes(argument));
    if (project.use.channel !== channel || missingLaunchArgs.length > 0) {
      throw new Error(
        `Project ${project.name} does not inherit the enforced Starship browser launch contract; ` +
        `channel=${String(project.use.channel)} missingArgs=${missingLaunchArgs.join(",")}.`
      );
    }
    return {
      channel: project.use.channel,
      launchArgs: enforcedLaunchArgs,
      projectName: project.name,
      workerTempEnvironmentInheritedFromPlaywrightNode: true
    };
  });
  mkdirSync(browserTempDir, { recursive: true });
  mkdirSync(crashDumpDir, { recursive: true });
  mkdirSync(path.dirname(evidencePath), { recursive: true });

  const browser = await chromium.launch({
    args: enforcedLaunchArgs,
    channel,
    headless: true
  });
  try {
    const observed = await observeLaunchedChrome(browserTempDir);
    const evidence = {
      browserVersion: browser.version(),
      browserCommandAudit: {
        crashpadDatabaseFlagIsFailClosedWhenSpawnedInBrowserTree: true,
        immutableExecutablePathsExcludedFromMutableArtifactClassification: true,
        mutableFlags: MUTABLE_BROWSER_PATH_FLAGS
      },
      channel,
      environment: {
        NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED,
        NODE_COMPILE_CACHE: process.env.NODE_COMPILE_CACHE,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        TMPDIR: process.env.TMPDIR,
        npm_config_cache: process.env.npm_config_cache
      },
      observed,
      pathManifestPath: manifestPath,
      projectFixtureInheritance: projectContracts,
      schemaVersion: 1,
      status: "passed"
    };
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  } finally {
    await browser.close();
  }
}
