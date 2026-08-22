#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
  validateMainlandFocusedVisualizationRawReplayLedger,
  validateMainlandFocusedVisualizationReport,
} from "./validate-mainland-focused-visualization-report.mjs";

export const MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS = Object.freeze({
  canonicalCli: "tests/e2e/mainland-focused-canonical-cli.ts",
  cleanupGeneratedArtifacts: "scripts/cleanup-generated-artifacts.mjs",
  nextCleanBuild: "scripts/next-clean-build.mjs",
  nextConfig: "next.config.ts",
  nextRuntime: "node_modules/next/dist/bin/next",
  focusedValidator: "scripts/validate-mainland-focused-visualization-report.mjs",
  focusedValidatorTest: "scripts/validate-mainland-focused-visualization-report.test.mjs",
  g03Producer: "tests/e2e/china-mainland-g03-signed-real-production.spec.ts",
  g04Producer: "tests/e2e/china-mainland-g04-fraction-operations-production.spec.ts",
  g05Producer: "tests/e2e/china-mainland-g05-percent-applications-production.spec.ts",
  g06Producer: "tests/e2e/china-mainland-g06-ratio-proportion-scale-production.spec.ts",
  globalSetup: "tests/e2e/starship-e2e-global-setup.ts",
  innerRunner: "scripts/run-starship-playwright.mjs",
  nextEnv: "next-env.d.ts",
  parentBinder: "scripts/validate-mainland-focused-supervised-release.mjs",
  parentBinderTest: "scripts/validate-mainland-focused-supervised-release.test.mjs",
  pathGate: "scripts/starship-e2e-path-gate.mjs",
  packageJson: "package.json",
  packageLock: "package-lock.json",
  playwrightConfig: "playwright.config.ts",
  prebuildTest: "scripts/run-starship-playwright-prebuild.test.mjs",
  strayGeneratedTypesGate: "scripts/check-stray-generated-types.mjs",
  supervisor: "scripts/run-starship-playwright-supervised.mjs",
  supervisorTest: "scripts/run-starship-playwright-supervised.test.mjs",
  tsconfig: "tsconfig.json",
  tsconfigNext: "tsconfig.next.json",
  typescriptRuntime: "node_modules/typescript/lib/typescript.js",
});

const prebuildRuntimeSourceLabels = Object.freeze([
  "innerRunner",
  "pathGate",
  "nextCleanBuild",
  "cleanupGeneratedArtifacts",
  "strayGeneratedTypesGate",
  "playwrightConfig",
  "nextConfig",
  "tsconfig",
  "tsconfigNext",
  "packageJson",
  "packageLock",
  "nextRuntime",
  "typescriptRuntime",
]);

const forbiddenInheritedServerOverrides = Object.freeze([
  "PLAYWRIGHT_BASE_URL",
  "PLAYWRIGHT_SKIP_WEBSERVER",
]);

const requiredSupervisorChildEnvironmentNames = Object.freeze([
  "NODE_OPTIONS",
  "PLAYWRIGHT_PORT",
  "STARSHIP_SUPERVISOR_PRELOAD_PATH",
  "STARSHIP_SUPERVISOR_PRELOAD_SHA256",
  "STARSHIP_SUPERVISOR_REGISTRY_DEVICE",
  "STARSHIP_SUPERVISOR_REGISTRY_FD",
  "STARSHIP_SUPERVISOR_REGISTRY_INODE",
  "STARSHIP_SUPERVISOR_RUN_LOCK_PATH",
  "STARSHIP_SUPERVISOR_RUN_NONCE",
  "STARSHIP_SUPERVISOR_RUN_TOKEN",
  "STARSHIP_SUPERVISOR_RUN_TOKEN_SHA256",
  "STARSHIP_SUPERVISOR_RUNNER_PATH",
  "STARSHIP_SUPERVISOR_RUNNER_SHA256",
  "STARSHIP_SUPERVISOR_TSCONFIG_PATH",
  "TEMP",
  "TMP",
  "TMPDIR",
]);

const canonicalInnerArgs = Object.freeze([
  "test",
  MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.g03Producer,
  MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.g04Producer,
  MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.g05Producer,
  MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.g06Producer,
  "--workers=1",
  "--retries=0",
  "--reporter=list,json",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactEnvironmentReceipt(environment) {
  const entries = Object.entries(environment)
    .map(([name, value]) => [name, String(value)])
    .sort(([left], [right]) => left.localeCompare(right));
  return deepFreeze({
    names: entries.map(([name]) => name),
    sha256: sha256(Buffer.from(JSON.stringify(entries), "utf8")),
    valueCount: entries.length,
  });
}

function isInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function assertRepositoryRoot(value) {
  if (typeof value !== "string" || !path.isAbsolute(value)) {
    throw new Error("repositoryRoot must be an absolute /Volumes/Starship path.");
  }
  const canonical = path.resolve(value);
  if (canonical === "/Volumes/Starship" || !canonical.startsWith("/Volumes/Starship/")) {
    throw new Error(`repositoryRoot must stay below /Volumes/Starship; actual=${value}.`);
  }
  return canonical;
}

function assertRunId(value) {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(value) ||
    value === "." ||
    value === ".."
  ) {
    throw new Error("runId must be one canonical 1-128 character path segment.");
  }
  return value;
}

function assertIntendedPort(value) {
  if (!Number.isSafeInteger(value) || value < 1024 || value > 65_535) {
    throw new Error("intendedPort must be an integer from 1024 through 65535.");
  }
  return value;
}

function sameFileStatIdentity(left, right) {
  return left.isFile() &&
    right.isFile() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function sameDirectoryStatIdentity(left, right) {
  return left.isDirectory() &&
    right.isDirectory() &&
    left.dev === right.dev &&
    left.ino === right.ino;
}

async function readNativeExactFileEvidence(
  artifactPath,
  { changeTokens = false } = {},
  testHooks = {},
) {
  const parentPath = path.dirname(artifactPath);
  const directory = await open(
    parentPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  );
  let descriptor = null;
  let finalDescriptor = null;
  try {
    descriptor = await open(
      artifactPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const [directoryBefore, parentPathBefore, canonicalParent, before, canonical, bytes] =
      await Promise.all([
        directory.stat({ bigint: true }),
        lstat(parentPath, { bigint: true }),
        realpath(parentPath),
        descriptor.stat({ bigint: true }),
        realpath(artifactPath),
        descriptor.readFile(),
      ]);
    const after = await descriptor.stat({ bigint: true });
    if (typeof testHooks.afterStableRead === "function") {
      await testHooks.afterStableRead();
    }
    finalDescriptor = await open(
      artifactPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const [pathAtLinearization, finalHeld, directoryAfter, parentPathAtLinearization] =
      await Promise.all([
        lstat(artifactPath, { bigint: true }),
        finalDescriptor.stat({ bigint: true }),
        directory.stat({ bigint: true }),
        lstat(parentPath, { bigint: true }),
      ]);
    if (
      canonical !== artifactPath ||
      canonicalParent !== parentPath ||
      !before.isFile() ||
      !after.isFile() ||
      !pathAtLinearization.isFile() ||
      !finalHeld.isFile() ||
      !sameFileStatIdentity(before, after) ||
      !sameFileStatIdentity(after, pathAtLinearization) ||
      !sameFileStatIdentity(after, finalHeld) ||
      !sameDirectoryStatIdentity(directoryBefore, directoryAfter) ||
      !sameDirectoryStatIdentity(directoryBefore, parentPathBefore) ||
      !sameDirectoryStatIdentity(directoryBefore, parentPathAtLinearization) ||
      BigInt(bytes.length) !== after.size
    ) {
      throw new Error(
        `pathname no longer names the exact held file at the final linearization point: ${artifactPath}.`,
      );
    }
    const receipt = {
      device: after.dev.toString(10),
      inode: after.ino.toString(10),
      mode: Number(after.mode & 0o7777n).toString(8),
      path: artifactPath,
      sha256: sha256(bytes),
      size: bytes.length,
    };
    if (changeTokens) {
      receipt.ctimeNs = after.ctimeNs.toString(10);
      receipt.mtimeNs = after.mtimeNs.toString(10);
    }
    return deepFreeze({ bytes, receipt });
  } finally {
    if (finalDescriptor !== null) await finalDescriptor.close();
    if (descriptor !== null) await descriptor.close();
    await directory.close();
  }
}

export async function readNativeExactFileEvidenceForUntrustedTestOnly(
  artifactPath,
  testHooks = {},
) {
  const evidence = await readNativeExactFileEvidence(
    artifactPath,
    { changeTokens: true },
    testHooks,
  );
  return deepFreeze({
    evidence,
    releaseReady: false,
    status: "injected-untrusted-test-seam",
  });
}

async function readNativeExactFile(artifactPath) {
  return (await readNativeExactFileEvidence(artifactPath)).bytes;
}

function deepFreeze(value) {
  if (ArrayBuffer.isView(value)) return value;
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(label, value, expectedKeys) {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} keys drifted; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actualKeys)}.`,
    );
  }
}

function assertSha256(label, value) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`${label} must be one lowercase SHA-256 digest.`);
  }
  return value;
}

function validateExactFileReceipt(
  label,
  value,
  expectedPath,
  { changeTokens = false } = {},
) {
  const expectedKeys = ["device", "inode", "mode", "path", "sha256", "size"];
  if (changeTokens) expectedKeys.push("ctimeNs", "mtimeNs");
  assertExactKeys(label, value, expectedKeys);
  if (
    value.path !== expectedPath ||
    typeof value.device !== "string" ||
    !/^(?:0|[1-9][0-9]*)$/u.test(value.device) ||
    typeof value.inode !== "string" ||
    !/^(?:0|[1-9][0-9]*)$/u.test(value.inode) ||
    typeof value.mode !== "string" ||
    !/^[0-7]{3,4}$/u.test(value.mode) ||
    !Number.isSafeInteger(value.size) ||
    value.size < 0
  ) {
    throw new Error(`${label} path/type/identity/mode/size is invalid.`);
  }
  assertSha256(`${label} sha256`, value.sha256);
  if (
    changeTokens &&
    (
      typeof value.ctimeNs !== "string" ||
      !/^(?:0|[1-9][0-9]*)$/u.test(value.ctimeNs) ||
      typeof value.mtimeNs !== "string" ||
      !/^(?:0|[1-9][0-9]*)$/u.test(value.mtimeNs)
    )
  ) {
    throw new Error(`${label} change tokens are invalid.`);
  }
  return value;
}

function validateSupervisorSourceReceipt(label, value, expectedPath) {
  assertExactKeys(label, value, [
    "ctimeNs",
    "device",
    "exists",
    "inode",
    "mode",
    "mtimeNs",
    "path",
    "pathSha256",
    "sha256",
    "size",
  ]);
  if (
    value.exists !== true ||
    value.pathSha256 !== sha256(Buffer.from(expectedPath, "utf8"))
  ) {
    throw new Error(`${label} existence or path SHA-256 is invalid.`);
  }
  validateExactFileReceipt(
    label,
    {
      ctimeNs: value.ctimeNs,
      device: value.device,
      inode: value.inode,
      mode: value.mode,
      mtimeNs: value.mtimeNs,
      path: value.path,
      sha256: value.sha256,
      size: value.size,
    },
    expectedPath,
    { changeTokens: true },
  );
  return value;
}

function validateEnvironmentReceipt(label, value) {
  assertExactKeys(label, value, ["names", "sha256", "valueCount"]);
  if (
    !Array.isArray(value.names) ||
    value.names.some((name) => typeof name !== "string" || name.length === 0) ||
    new Set(value.names).size !== value.names.length ||
    !sameJson(value.names, [...value.names].sort((left, right) =>
      left.localeCompare(right))) ||
    value.valueCount !== value.names.length
  ) {
    throw new Error(`${label} names/valueCount are not one exact sorted environment key set.`);
  }
  assertSha256(`${label} sha256`, value.sha256);
  return value;
}

function expectedReleasePaths(repositoryRoot, runId) {
  const supervisorRoot = path.join(
    repositoryRoot,
    ".tmp",
    `starship-playwright-supervisor-${runId}`,
  );
  const e2eRunRoot = path.join(repositoryRoot, ".tmp", `e2e-run-${runId}`);
  return {
    parentReceiptPath: path.join(
      supervisorRoot,
      "mainland-focused-final-release-receipt.json",
    ),
    pathManifestPath: path.join(
      e2eRunRoot,
      "evidence",
      "starship-path-manifest.json",
    ),
    prebuildReceiptPath: path.join(
      e2eRunRoot,
      "evidence",
      "next-env-prebuild-receipt.json",
    ),
    reportPath: path.join(e2eRunRoot, "playwright-report.json"),
    serverCommandOwnerPidPath: path.join(
      e2eRunRoot,
      "server",
      "server-command-owner.pid",
    ),
    serverLogPath: path.join(e2eRunRoot, "server", "server.log"),
    signalJournalPath: path.join(supervisorRoot, "delivered-signals.jsonl"),
    supervisorReceiptPath: path.join(
      supervisorRoot,
      "supervisor-terminal-receipt.json",
    ),
  };
}

function expectedSupervisorArgv(repositoryRoot, runId) {
  return [
    process.execPath,
    path.join(repositoryRoot, MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner),
    "--run-id",
    runId,
    "--",
    ...canonicalInnerArgs,
  ];
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseJsonBytes(label, bytes) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not exact JSON: ${error instanceof Error ? error.message : String(error)}.`);
  }
}

export function normalizeMainlandFocusedSpecFile(value, rootDir) {
  const normalized = String(value ?? "").replaceAll("\\", "/");
  if (normalized.startsWith("tests/e2e/")) return normalized;
  const testsE2eMarker = "/tests/e2e/";
  const testsE2eIndex = normalized.lastIndexOf(testsE2eMarker);
  if (testsE2eIndex >= 0) {
    return normalized.slice(testsE2eIndex + 1);
  }
  const canonicalRoot = typeof rootDir === "string"
    ? rootDir.replaceAll("\\", "/").replace(/\/$/u, "")
    : "";
  if (canonicalRoot && normalized.startsWith(`${canonicalRoot}/`)) {
    const rootRelative = normalized.slice(canonicalRoot.length + 1);
    return rootRelative.startsWith("tests/e2e/")
      ? rootRelative
      : `tests/e2e/${rootRelative}`;
  }
  return normalized.length > 0 && !normalized.startsWith("/")
    ? `tests/e2e/${normalized.replace(/^\.\//u, "")}`
    : normalized;
}

async function defaultRawReplaySummary(report, reportPath, readArtifact) {
  const groupsByFile = new Map(
    MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT.groups.map((group) => [
      group.file,
      group.id,
    ]),
  );
  const rows = [];
  const visit = async (suite) => {
    if (!isRecord(suite)) return;
    for (const spec of Array.isArray(suite.specs) ? suite.specs : []) {
      if (!isRecord(spec)) continue;
      const groupId = groupsByFile.get(
        normalizeMainlandFocusedSpecFile(
          spec.file ?? suite.file,
          report?.config?.rootDir,
        ),
      );
      if (!groupId) continue;
      for (const testCase of Array.isArray(spec.tests) ? spec.tests : []) {
        if (!isRecord(testCase)) continue;
        for (const result of Array.isArray(testCase.results) ? testCase.results : []) {
          if (!isRecord(result)) continue;
          for (const attachment of Array.isArray(result.attachments)
            ? result.attachments
            : []) {
            if (!isRecord(attachment)) continue;
            let bytes = null;
            if (typeof attachment.body === "string") {
              bytes = Buffer.from(attachment.body, "base64");
            } else if (typeof attachment.path === "string" && attachment.path.length > 0) {
              const attachmentPath = path.isAbsolute(attachment.path)
                ? attachment.path
                : path.resolve(path.dirname(reportPath), attachment.path);
              bytes = await readArtifact(attachmentPath);
            }
            if (!bytes) continue;
            let evidence;
            try {
              evidence = JSON.parse(Buffer.from(bytes).toString("utf8"));
            } catch {
              continue;
            }
            if (!isRecord(evidence?.durabilityReceipts?.rawReplayLedger)) continue;
            rows.push({
              chunkId: evidence.chunkId,
              final: evidence.durabilityReceipts.final,
              groupId,
              project: testCase.projectName,
              rawReplayLedger: evidence.durabilityReceipts.rawReplayLedger,
            });
          }
        }
      }
    }
    for (const nested of Array.isArray(suite.suites) ? suite.suites : []) {
      await visit(nested);
    }
  };
  for (const suite of Array.isArray(report?.suites) ? report.suites : []) {
    await visit(suite);
  }
  return validateMainlandFocusedVisualizationRawReplayLedger(
    rows,
    MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
  );
}

export function assertNoInheritedMainlandFocusedServerOverrides(
  environment = process.env,
) {
  const inherited = forbiddenInheritedServerOverrides.filter((name) =>
    typeof environment?.[name] === "string" && environment[name].trim().length > 0
  );
  if (inherited.length > 0) {
    throw new Error(
      `Mainland focused supervised release rejects inherited server overrides: ${inherited.join(", ")}.`,
    );
  }
}

export async function buildMainlandFocusedSupervisedReleaseInvocation(
  {
    baseEnvironment = process.env,
    intendedPort,
    repositoryRoot,
    runId,
  } = {},
  dependencies = {},
) {
  assertNoInheritedMainlandFocusedServerOverrides(baseEnvironment);
  if (
    typeof baseEnvironment?.PLAYWRIGHT_PORT === "string" &&
    baseEnvironment.PLAYWRIGHT_PORT.trim().length > 0
  ) {
    throw new Error("Mainland focused supervised release owns PLAYWRIGHT_PORT exactly.");
  }
  const canonicalRepositoryRoot = assertRepositoryRoot(repositoryRoot);
  const canonicalRunId = assertRunId(runId);
  const canonicalPort = assertIntendedPort(intendedPort);
  const readArtifact = dependencies.readArtifact ?? readNativeExactFile;
  const sourceSha256 = {};
  for (const [label, relativePath] of Object.entries(
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS,
  )) {
    const artifactPath = path.join(canonicalRepositoryRoot, relativePath);
    if (!isInside(artifactPath, canonicalRepositoryRoot)) {
      throw new Error(`fixed source path escaped repositoryRoot: ${relativePath}.`);
    }
    sourceSha256[label] = sha256(await readArtifact(artifactPath));
  }
  const paths = expectedReleasePaths(canonicalRepositoryRoot, canonicalRunId);
  const environment = {
    ...baseEnvironment,
    PLAYWRIGHT_PORT: String(canonicalPort),
  };
  delete environment.PLAYWRIGHT_BASE_URL;
  delete environment.PLAYWRIGHT_SKIP_WEBSERVER;
  const evidence = {
    contract: "mainland-focused-supervised-release-invocation-v1",
    forbiddenInheritedEnvironment: {
      PLAYWRIGHT_BASE_URL: null,
      PLAYWRIGHT_SKIP_WEBSERVER: null,
    },
    innerArgs: [...canonicalInnerArgs],
    intendedPort: canonicalPort,
    paths,
    plannedOuterEnvironment: exactEnvironmentReceipt(environment),
    repositoryRoot: canonicalRepositoryRoot,
    runId: canonicalRunId,
    schemaVersion: 1,
    sourceSha256,
  };
  const supervisorPath = path.join(
    canonicalRepositoryRoot,
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.supervisor,
  );
  const innerRunnerPath = path.join(
    canonicalRepositoryRoot,
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner,
  );
  return deepFreeze({
    args: [
      supervisorPath,
      "--repository-root",
      canonicalRepositoryRoot,
      "--inner-runner",
      innerRunnerPath,
      "--run-id",
      canonicalRunId,
      "--",
      ...canonicalInnerArgs,
    ],
    command: process.execPath,
    cwd: canonicalRepositoryRoot,
    environment,
    evidence,
  });
}

async function waitForOuterSupervisor(child) {
  return new Promise((resolvePromise) => {
    let settled = false;
    const settle = (outcome) => {
      if (settled) return;
      settled = true;
      resolvePromise(outcome);
    };
    child.once("error", (error) => settle({
      code: null,
      signal: null,
      spawnError: error instanceof Error ? error.message : String(error),
    }));
    child.once("exit", (code, signal) => settle({
      code,
      signal,
      spawnError: null,
    }));
  });
}

const finalReleaseWriterAuthority = Symbol("same-process-final-release-writer");

async function executeMainlandFocusedOuterSupervisor(
  options = {},
  dependencies = {},
) {
  const invocation = await buildMainlandFocusedSupervisedReleaseInvocation(
    options,
    dependencies,
  );
  const spawnOuter = dependencies.spawnOuter ?? spawn;
  const canonicalSpawnOptions = {
    cwd: invocation.cwd,
    env: { ...invocation.environment },
    stdio: "inherit",
  };
  const spawnOptions = dependencies.prepareSpawnOptions
    ? await dependencies.prepareSpawnOptions(canonicalSpawnOptions)
    : canonicalSpawnOptions;
  if (!sameJson(
    Object.keys(spawnOptions ?? {}).sort(),
    ["cwd", "env", "stdio"],
  )) {
    throw new Error(
      "outer supervisor spawn options keys drifted from exact cwd/env/stdio.",
    );
  }
  const spawnedEnvironment = exactEnvironmentReceipt(spawnOptions?.env ?? {});
  if (!sameJson(
    spawnedEnvironment,
    invocation.evidence.plannedOuterEnvironment,
  )) {
    throw new Error(
      "outer supervisor spawn environment drifted from the exact planned digest/value count.",
    );
  }
  if (spawnOptions?.cwd !== invocation.cwd || spawnOptions?.stdio !== "inherit") {
    throw new Error("outer supervisor spawn cwd/stdio drifted from the exact invocation.");
  }
  const child = spawnOuter(invocation.command, invocation.args, spawnOptions);
  if (!Number.isSafeInteger(child?.pid) || child.pid <= 0) {
    throw new Error("same-process outer supervisor spawn returned no owned positive PID.");
  }
  const actualOutcome = await waitForOuterSupervisor(child);
  if (
    actualOutcome.code !== 0 ||
    actualOutcome.signal !== null ||
    actualOutcome.spawnError !== null
  ) {
    throw new Error(
      `same-process outer supervisor exit was not code 0/no signal; code=${String(actualOutcome.code)} signal=${String(actualOutcome.signal)} spawnError=${String(actualOutcome.spawnError)}.`,
    );
  }
  const outerSupervisor = deepFreeze({
    args: [...invocation.args],
    argv: [invocation.command, ...invocation.args],
    command: invocation.command,
    cwd: invocation.cwd,
    environment: spawnedEnvironment,
    outcome: { ...actualOutcome },
    pid: child.pid,
  });
  return { invocation, outerSupervisor };
}

export async function executeMainlandFocusedSupervisedRelease(options = {}) {
  const allowedOptionNames = new Set([
    "baseEnvironment",
    "intendedPort",
    "repositoryRoot",
    "runId",
  ]);
  if (
    arguments.length > 1 ||
    !isRecord(options) ||
    Object.keys(options).some((name) => !allowedOptionNames.has(name))
  ) {
    const error = new Error(
      "injected-untrusted-test-seam or unknown option cannot enter the native final-release executor.",
    );
    error.releaseReady = false;
    error.status = "injected-untrusted-test-seam";
    throw error;
  }
  const { invocation, outerSupervisor } =
    await executeMainlandFocusedOuterSupervisor(options);
  return writeMainlandFocusedSupervisedReleaseReceipt(
    invocation.evidence,
    {
      code: outerSupervisor.outcome.code,
      signal: outerSupervisor.outcome.signal,
    },
    outerSupervisor,
    finalReleaseWriterAuthority,
  );
}

export async function executeMainlandFocusedSupervisedReleaseForUntrustedTestOnly(
  options = {},
  dependencies = {},
) {
  try {
    const { invocation, outerSupervisor } =
      await executeMainlandFocusedOuterSupervisor(options, dependencies);
    const validation = await validateMainlandFocusedSupervisedRelease(
      invocation.evidence,
      {
        code: outerSupervisor.outcome.code,
        signal: outerSupervisor.outcome.signal,
      },
      dependencies,
    );
    return deepFreeze({
      contract: "mainland-focused-injected-untrusted-test-seam-v1",
      outerSupervisor,
      releaseReady: false,
      status: "injected-untrusted-test-seam",
      validation: {
        releaseReady: false,
        status: validation.status,
      },
    });
  } catch (error) {
    if (error && typeof error === "object") {
      error.releaseReady = false;
      error.status = "injected-untrusted-test-seam";
    }
    throw error;
  }
}

export async function validateMainlandFocusedSupervisedRelease(
  invocationEnvelope,
  outerExit,
  dependencies = {},
) {
  assertExactKeys("parent invocation envelope", invocationEnvelope, [
    "contract",
    "forbiddenInheritedEnvironment",
    "innerArgs",
    "intendedPort",
    "paths",
    "plannedOuterEnvironment",
    "repositoryRoot",
    "runId",
    "schemaVersion",
    "sourceSha256",
  ]);
  if (
    invocationEnvelope.contract !==
      "mainland-focused-supervised-release-invocation-v1" ||
    invocationEnvelope.schemaVersion !== 1
  ) {
    throw new Error("parent invocation envelope contract/schema drifted.");
  }
  const repositoryRoot = assertRepositoryRoot(invocationEnvelope.repositoryRoot);
  const runId = assertRunId(invocationEnvelope.runId);
  const intendedPort = assertIntendedPort(invocationEnvelope.intendedPort);
  validateEnvironmentReceipt(
    "planned outer supervisor environment",
    invocationEnvelope.plannedOuterEnvironment,
  );
  if (!sameJson(invocationEnvelope.innerArgs, canonicalInnerArgs)) {
    throw new Error("parent invocation inner Playwright arguments drifted.");
  }
  if (!sameJson(invocationEnvelope.forbiddenInheritedEnvironment, {
    PLAYWRIGHT_BASE_URL: null,
    PLAYWRIGHT_SKIP_WEBSERVER: null,
  })) {
    throw new Error(
      "parent invocation does not prove inherited PLAYWRIGHT_BASE_URL/PLAYWRIGHT_SKIP_WEBSERVER absence.",
    );
  }
  const expectedPaths = expectedReleasePaths(repositoryRoot, runId);
  if (!sameJson(invocationEnvelope.paths, expectedPaths)) {
    throw new Error("parent invocation runId/path set drifted.");
  }
  assertExactKeys("outer exit evidence", outerExit, ["code", "signal"]);
  if (outerExit.code !== 0 || outerExit.signal !== null) {
    throw new Error(
      `outer supervisor exit was not code 0/no signal; code=${String(outerExit.code)} signal=${String(outerExit.signal)}.`,
    );
  }

  const readArtifact = dependencies.readArtifact ?? readNativeExactFile;
  const readArtifactEvidence = dependencies.readArtifactEvidence ??
    readNativeExactFileEvidence;
  const validateFocusedReport = dependencies.validateFocusedReport ??
    ((report, reportPath) =>
      validateMainlandFocusedVisualizationReport(report, reportPath));
  const deriveRawReplaySummary = dependencies.deriveRawReplaySummary ??
    ((report, reportPath) => defaultRawReplaySummary(report, reportPath, readArtifact));

  assertExactKeys(
    "source SHA snapshot",
    invocationEnvelope.sourceSha256,
    Object.keys(MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS),
  );
  const sources = {};
  for (const [label, relativePath] of Object.entries(
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS,
  )) {
    const artifactPath = path.join(repositoryRoot, relativePath);
    const bytes = await readArtifact(artifactPath);
    const observedSha256 = sha256(bytes);
    const expectedSha256 = assertSha256(
      `source SHA snapshot ${label}`,
      invocationEnvelope.sourceSha256[label],
    );
    if (observedSha256 !== expectedSha256) {
      throw new Error(`fixed source drifted after parent invocation: ${label}.`);
    }
    sources[label] = {
      path: artifactPath,
      sha256: observedSha256,
      size: Buffer.byteLength(bytes),
    };
  }

  const [
    reportBytes,
    supervisorReceiptBytes,
    signalJournalBytes,
    pathManifestBytes,
    prebuildReceiptBytes,
    serverOwnerBytes,
    serverLogBytes,
  ] = await Promise.all([
    readArtifact(expectedPaths.reportPath),
    readArtifact(expectedPaths.supervisorReceiptPath),
    readArtifact(expectedPaths.signalJournalPath),
    readArtifact(expectedPaths.pathManifestPath),
    readArtifact(expectedPaths.prebuildReceiptPath),
    readArtifact(expectedPaths.serverCommandOwnerPidPath),
    readArtifact(expectedPaths.serverLogPath),
  ]);
  const report = parseJsonBytes("focused Playwright JSON report", reportBytes);
  const supervisor = parseJsonBytes("supervisor terminal receipt", supervisorReceiptBytes);
  const manifest = parseJsonBytes("Starship path manifest", pathManifestBytes);
  const prebuild = parseJsonBytes("Starship Playwright prebuild receipt", prebuildReceiptBytes);

  const focusedSummary = await validateFocusedReport(report, expectedPaths.reportPath);
  if (
    focusedSummary?.status !== "inner-report-passed" ||
    focusedSummary?.releaseReady !== false ||
    focusedSummary?.executionCount !== 92 ||
    focusedSummary?.stateReceiptCount !== 2_646 ||
    focusedSummary?.groupCount !== 4 ||
    !sameJson(focusedSummary?.projects, ["desktop-chrome", "mobile-chrome"]) ||
    focusedSummary?.reportPath !== expectedPaths.reportPath
  ) {
    throw new Error("captured focused-validator result is not the exact inner-report-passed 92/2646/4/desktop-mobile contract.");
  }
  const rawReplaySummary = await deriveRawReplaySummary(
    report,
    expectedPaths.reportPath,
  );
  if (
    rawReplaySummary?.executionCount !== 92 ||
    rawReplaySummary?.includedCount !== 14 ||
    !sameJson(rawReplaySummary?.countsByGroup, { G03: 6, G04: 5, G05: 2, G06: 1 }) ||
    !Array.isArray(rawReplaySummary?.representativeCaseIds) ||
    rawReplaySummary.representativeCaseIds.length !== 14
  ) {
    throw new Error("independent focused raw-replay result is not exact rawReplayIncludedCount=14 across 92 executions.");
  }

  if (
    supervisor?.contract !== "starship-playwright-supervisor-v2" ||
    supervisor?.schemaVersion !== 2 ||
    supervisor?.status !== "passed" ||
    supervisor?.releaseReady !== false ||
    !Array.isArray(supervisor?.violations) ||
    supervisor.violations.length !== 0
  ) {
    throw new Error("supervisor terminal receipt is not an exact violation-free v2 pass held at releaseReady=false.");
  }
  if (
    supervisor.child?.cwd !== repositoryRoot ||
    !sameJson(supervisor.child?.argv, expectedSupervisorArgv(repositoryRoot, runId)) ||
    !sameJson(supervisor.child?.outcome, { code: 0, signal: null, spawnError: null }) ||
    supervisor.child.outcome.code !== outerExit.code ||
    supervisor.child.outcome.signal !== outerExit.signal
  ) {
    throw new Error("supervisor child/runId/argv/outcome does not match the exact parent invocation and outer exit.");
  }
  const supervisorChildEnvironment = supervisor.child?.environment;
  const inheritedEnvironmentNames = supervisorChildEnvironment?.names;
  if (
    !Array.isArray(inheritedEnvironmentNames) ||
    inheritedEnvironmentNames.some((name) =>
      typeof name !== "string" || name.length === 0
    ) ||
    new Set(inheritedEnvironmentNames).size !== inheritedEnvironmentNames.length ||
    !sameJson(
      inheritedEnvironmentNames,
      [...inheritedEnvironmentNames].sort((left, right) =>
        left.localeCompare(right)),
    ) ||
    supervisorChildEnvironment.valueCount !== inheritedEnvironmentNames.length ||
    !/^[0-9a-f]{64}$/u.test(supervisorChildEnvironment.sha256 ?? "") ||
    requiredSupervisorChildEnvironmentNames.some((name) =>
      !inheritedEnvironmentNames.includes(name)
    ) ||
    !inheritedEnvironmentNames.includes("PLAYWRIGHT_PORT") ||
    inheritedEnvironmentNames.includes("PLAYWRIGHT_BASE_URL") ||
    inheritedEnvironmentNames.includes("PLAYWRIGHT_SKIP_WEBSERVER")
  ) {
    throw new Error(
      "supervisor inner effective environment receipt does not prove its sorted names, digest/value count, runtime additions, exact port ownership, and forbidden override absence.",
    );
  }
  for (const [label, expectedPath] of [
    ["e2eRunRoot", `${repositoryRoot}/.tmp/e2e-run-${runId}`],
    ["nextEnvPath", `${repositoryRoot}/next-env.d.ts`],
    ["receiptPath", expectedPaths.supervisorReceiptPath],
    ["signalJournalPath", expectedPaths.signalJournalPath],
  ]) {
    if (supervisor.paths?.[label] !== expectedPath) {
      throw new Error(`supervisor path/runId drifted for ${label}.`);
    }
  }
  const cleanup = supervisor.cleanup;
  const terminationGroups = [
    cleanup?.processGroupTermination,
    ...(Array.isArray(cleanup?.detachedProcessGroupTermination)
      ? cleanup.detachedProcessGroupTermination
      : []),
    ...(Array.isArray(cleanup?.recordedProcessGroupTermination)
      ? cleanup.recordedProcessGroupTermination
      : []),
  ];
  if (
    cleanup?.complete !== true ||
    cleanup?.ownedUniverse?.provenEmpty !== true ||
    cleanup?.ownedUniverse?.consecutiveZeroScans < 2 ||
    !sameJson(cleanup?.ownedUniverse?.finalRows, []) ||
    cleanup?.orphanScan?.provenEmpty !== true ||
    !sameJson(cleanup?.orphanScan?.finalMembers, []) ||
    terminationGroups.length < 3 ||
    terminationGroups.some((group) =>
      group?.provenEmpty !== true || !sameJson(group?.finalMembers, [])
    ) ||
    !Array.isArray(cleanup?.validatedProcessGroups) ||
    cleanup.validatedProcessGroups.length === 0 ||
    !Array.isArray(cleanup?.validatedDetachedProcessGroups) ||
    cleanup.validatedDetachedProcessGroups.length === 0
  ) {
    throw new Error("supervisor cleanup/owned universe/process groups are not proven terminally empty.");
  }
  const nextEnv = cleanup.nextEnv;
  if (
    nextEnv?.exact !== true ||
    !["unchanged", "restored-exact"].includes(nextEnv?.status) ||
    nextEnv?.before?.sha256 !== invocationEnvelope.sourceSha256.nextEnv ||
    nextEnv?.after?.sha256 !== invocationEnvelope.sourceSha256.nextEnv ||
    nextEnv?.before?.size !== nextEnv?.after?.size
  ) {
    throw new Error("supervisor next-env cleanup is not exact against the fixed raw source snapshot.");
  }
  if (
    supervisor.runner?.before?.sha256 !== invocationEnvelope.sourceSha256.innerRunner ||
    supervisor.runner?.after?.sha256 !== invocationEnvelope.sourceSha256.innerRunner ||
    supervisor.supervisor?.before?.sha256 !== invocationEnvelope.sourceSha256.supervisor ||
    supervisor.supervisor?.after?.sha256 !== invocationEnvelope.sourceSha256.supervisor
  ) {
    throw new Error("supervisor or inner-runner raw source SHA drifted across outer execution.");
  }

  assertExactKeys("prebuild receipt", prebuild, [
    "baseURL",
    "build",
    "buildOutputs",
    "completedAt",
    "contract",
    "nextEnv",
    "paths",
    "port",
    "repositoryRoot",
    "runId",
    "runner",
    "runtimeSources",
    "schemaVersion",
    "status",
  ]);
  const expectedBaseURL = `http://127.0.0.1:${intendedPort}`;
  const expectedNextDistDir = `${repositoryRoot}/.tmp/e2e-run-${runId}/next-dist`;
  const expectedNextTsconfigPath = `${repositoryRoot}/tsconfig.playwright-${runId}.tmp.json`;
  if (
    prebuild.contract !== "starship-playwright-prebuild-v1" ||
    prebuild.schemaVersion !== 1 ||
    prebuild.status !== "build-restored-before-playwright" ||
    prebuild.repositoryRoot !== repositoryRoot ||
    prebuild.runId !== runId ||
    prebuild.port !== intendedPort ||
    prebuild.baseURL !== expectedBaseURL ||
    !sameJson(prebuild.paths, {
      nextDistDir: expectedNextDistDir,
      nextEnv: `${repositoryRoot}/next-env.d.ts`,
      nextTsconfigPath: expectedNextTsconfigPath,
    }) ||
    !sameJson(prebuild.build, { code: 0, signal: null, spawnError: null })
  ) {
    throw new Error("prebuild receipt contract/run/path/server/build outcome is stale or foreign.");
  }
  const prebuildCompletedAtMs = Date.parse(prebuild.completedAt);
  const supervisorStartedAtMs = Date.parse(supervisor.startedAt);
  const supervisorFinishedAtMs = Date.parse(supervisor.finishedAt);
  if (
    !Number.isFinite(prebuildCompletedAtMs) ||
    !Number.isFinite(supervisorStartedAtMs) ||
    !Number.isFinite(supervisorFinishedAtMs) ||
    prebuildCompletedAtMs < supervisorStartedAtMs ||
    prebuildCompletedAtMs > supervisorFinishedAtMs
  ) {
    throw new Error("prebuild receipt completion is stale or outside the exact supervisor interval.");
  }

  assertExactKeys("prebuild next-env join", prebuild.nextEnv, ["after", "before"]);
  const expectedNextEnvPath = `${repositoryRoot}/next-env.d.ts`;
  const prebuildNextEnvBefore = validateExactFileReceipt(
    "prebuild next-env before",
    prebuild.nextEnv.before,
    expectedNextEnvPath,
  );
  const prebuildNextEnvAfter = validateExactFileReceipt(
    "prebuild next-env after",
    prebuild.nextEnv.after,
    expectedNextEnvPath,
  );
  if (
    !sameJson(prebuildNextEnvBefore, prebuildNextEnvAfter) ||
    prebuildNextEnvAfter.sha256 !== invocationEnvelope.sourceSha256.nextEnv ||
    prebuildNextEnvAfter.size !== sources.nextEnv.size
  ) {
    throw new Error("prebuild receipt does not bind the exact restored next-env source bytes.");
  }

  if (
    !Array.isArray(prebuild.runtimeSources) ||
    prebuild.runtimeSources.length !== prebuildRuntimeSourceLabels.length
  ) {
    throw new Error("prebuild receipt runtime-source held descriptor set is missing or incomplete.");
  }
  const runtimeSources = [];
  for (let index = 0; index < prebuildRuntimeSourceLabels.length; index += 1) {
    const label = prebuildRuntimeSourceLabels[index];
    const expectedPath = path.join(
      repositoryRoot,
      MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS[label],
    );
    const join = prebuild.runtimeSources[index];
    assertExactKeys(`prebuild runtime-source join ${label}`, join, ["after", "before"]);
    const before = validateExactFileReceipt(
      `prebuild runtime-source before ${label}`,
      join.before,
      expectedPath,
      { changeTokens: true },
    );
    const after = validateExactFileReceipt(
      `prebuild runtime-source after ${label}`,
      join.after,
      expectedPath,
      { changeTokens: true },
    );
    if (
      !sameJson(before, after) ||
      after.sha256 !== invocationEnvelope.sourceSha256[label] ||
      after.size !== sources[label].size
    ) {
      throw new Error(`prebuild runtime-source held descriptor drifted for ${label}.`);
    }
    const current = await readArtifactEvidence(expectedPath, { changeTokens: true });
    assertExactKeys(`live runtime-source evidence ${label}`, current, ["bytes", "receipt"]);
    const currentReceipt = validateExactFileReceipt(
      `live runtime-source receipt ${label}`,
      current.receipt,
      expectedPath,
      { changeTokens: true },
    );
    if (
      sha256(current.bytes) !== after.sha256 ||
      Buffer.byteLength(current.bytes) !== after.size ||
      !sameJson(currentReceipt, after)
    ) {
      throw new Error(`live runtime-source path/identity/bytes drifted after prebuild: ${label}.`);
    }
    runtimeSources.push({ after: { ...after }, before: { ...before } });
  }

  assertExactKeys("prebuild build outputs", prebuild.buildOutputs, [
    "buildId",
    "buildManifest",
    "requiredServerFiles",
  ]);
  const buildOutputs = {};
  for (const [key, fileName] of [
    ["buildId", "BUILD_ID"],
    ["requiredServerFiles", "required-server-files.json"],
    ["buildManifest", "build-manifest.json"],
  ]) {
    const expectedPath = path.join(expectedNextDistDir, fileName);
    const expected = validateExactFileReceipt(
      `prebuild ${key} output`,
      prebuild.buildOutputs[key],
      expectedPath,
    );
    const current = await readArtifactEvidence(expectedPath);
    assertExactKeys(`live prebuild ${key} evidence`, current, ["bytes", "receipt"]);
    const currentReceipt = validateExactFileReceipt(
      `live prebuild ${key} receipt`,
      current.receipt,
      expectedPath,
    );
    if (
      sha256(current.bytes) !== expected.sha256 ||
      Buffer.byteLength(current.bytes) !== expected.size ||
      !sameJson(currentReceipt, expected)
    ) {
      throw new Error(`live prebuild build output path/identity/bytes drifted: ${key}.`);
    }
    buildOutputs[key] = { ...expected };
  }

  assertExactKeys("prebuild runner identity", prebuild.runner, ["pid", "startToken"]);
  const runnerPath = path.join(
    repositoryRoot,
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.innerRunner,
  );
  const supervisorPath = path.join(
    repositoryRoot,
    MAINLAND_FOCUSED_SUPERVISED_SOURCE_PATHS.supervisor,
  );
  const runnerBefore = validateSupervisorSourceReceipt(
    "supervisor runner before",
    supervisor.runner?.before,
    runnerPath,
  );
  const runnerAfter = validateSupervisorSourceReceipt(
    "supervisor runner after",
    supervisor.runner?.after,
    runnerPath,
  );
  const supervisorBefore = validateSupervisorSourceReceipt(
    "supervisor source before",
    supervisor.supervisor?.before,
    supervisorPath,
  );
  const supervisorAfter = validateSupervisorSourceReceipt(
    "supervisor source after",
    supervisor.supervisor?.after,
    supervisorPath,
  );
  const liveSupervisorSource = await readArtifactEvidence(supervisorPath, {
    changeTokens: true,
  });
  const liveSupervisorReceipt = validateExactFileReceipt(
    "live supervisor source receipt",
    liveSupervisorSource.receipt,
    supervisorPath,
    { changeTokens: true },
  );
  const runtimeRunnerAfter = runtimeSources[0]?.after;
  if (
    !sameJson(runnerBefore, runnerAfter) ||
    !sameJson(supervisorBefore, supervisorAfter) ||
    !sameJson({
      device: runnerAfter.device,
      inode: runnerAfter.inode,
      mode: runnerAfter.mode,
      path: runnerAfter.path,
      sha256: runnerAfter.sha256,
      size: runnerAfter.size,
      ctimeNs: runnerAfter.ctimeNs,
      mtimeNs: runnerAfter.mtimeNs,
    }, runtimeRunnerAfter) ||
    !sameJson({
      device: supervisorAfter.device,
      inode: supervisorAfter.inode,
      mode: supervisorAfter.mode,
      path: supervisorAfter.path,
      sha256: supervisorAfter.sha256,
      size: supervisorAfter.size,
      ctimeNs: supervisorAfter.ctimeNs,
      mtimeNs: supervisorAfter.mtimeNs,
    }, liveSupervisorReceipt) ||
    sha256(liveSupervisorSource.bytes) !== supervisorAfter.sha256 ||
    Buffer.byteLength(liveSupervisorSource.bytes) !== supervisorAfter.size
  ) {
    throw new Error("runner or supervisor source path identity drifted across terminal evidence.");
  }
  const runnerAck = Array.isArray(supervisor.registry?.preloadAcks)
    ? supervisor.registry.preloadAcks.find((ack) =>
        ack?.pid === prebuild.runner.pid &&
        ack?.pgid === prebuild.runner.pid &&
        ack?.startToken === prebuild.runner.startToken &&
        ack?.runnerPathSha256 === sha256(Buffer.from(runnerPath, "utf8")) &&
        ack?.runnerSha256 === invocationEnvelope.sourceSha256.innerRunner
      )
    : null;
  if (
    !Number.isSafeInteger(prebuild.runner.pid) ||
    prebuild.runner.pid <= 0 ||
    typeof prebuild.runner.startToken !== "string" ||
    prebuild.runner.startToken.length === 0 ||
    prebuild.runner.pid !== supervisor.child.processGroupId ||
    typeof runnerAck?.eventId !== "string" ||
    runnerAck.eventId.length === 0 ||
    !runnerAck
  ) {
    throw new Error("prebuild runner PID/start token is foreign to the exact supervisor child and registry ACK.");
  }

  const signalSha256 = sha256(signalJournalBytes);
  const signalJournal = supervisor.signals?.journal;
  if (
    !sameJson(supervisor.signals?.forwarded, []) ||
    signalJournal?.path !== expectedPaths.signalJournalPath ||
    signalJournal?.deliveredCount !== 0 ||
    !sameJson(signalJournal?.deliveredRecords, []) ||
    !sameJson(signalJournal?.errors, []) ||
    signalJournal?.snapshotExact !== true ||
    signalJournal?.receipt?.exact !== true ||
    signalJournal?.expectedSha256 !== signalSha256 ||
    signalJournal?.receipt?.final?.sha256 !== signalSha256 ||
    signalJournal?.receipt?.final?.size !== Buffer.byteLength(signalJournalBytes)
  ) {
    throw new Error("live signal journal drifted from the exact supervisor terminal receipt.");
  }

  const reportProjects = report?.config?.projects;
  const reportProjectBaseURLs = Array.isArray(reportProjects)
    ? reportProjects.map((project) => project?.use?.baseURL)
    : [];
  const reportProjectUsePresent = reportProjectBaseURLs.length > 0 &&
    reportProjectBaseURLs.every((value) => value !== undefined);
  const reportProjectUseAbsent = reportProjectBaseURLs.length > 0 &&
    reportProjectBaseURLs.every((value) => value === undefined);
  if (
    !Array.isArray(reportProjects) ||
    !sameJson(reportProjects.map((project) => project?.name), [
      "desktop-chrome",
      "mobile-chrome",
    ]) ||
    (!reportProjectUsePresent && !reportProjectUseAbsent) ||
    (reportProjectUsePresent &&
      reportProjectBaseURLs.some((value) => value !== expectedBaseURL))
  ) {
    throw new Error(`focused report baseURL/project evidence is not exact ${expectedBaseURL}.`);
  }
  if (
    manifest?.runId !== runId ||
    manifest?.status !== "preflight-passed" ||
    manifest?.process?.cwd !== repositoryRoot ||
    manifest?.paths?.repositoryRoot !== repositoryRoot ||
    manifest?.paths?.e2eRunRoot !== `${repositoryRoot}/.tmp/e2e-run-${runId}` ||
    manifest?.paths?.pathManifestPath !== expectedPaths.pathManifestPath ||
    manifest?.paths?.serverCommandOwnerPidPath !== expectedPaths.serverCommandOwnerPidPath ||
    manifest?.paths?.serverLogPath !== expectedPaths.serverLogPath ||
    manifest?.externalEvidencePaths?.jsonReportPath !== expectedPaths.reportPath ||
    manifest?.externalEvidencePaths?.PLAYWRIGHT_JSON_OUTPUT_FILE !== expectedPaths.reportPath
  ) {
    throw new Error("Starship path manifest runId/report/server paths drifted from the parent invocation.");
  }
  const serverOwnerText = Buffer.from(serverOwnerBytes).toString("utf8").trim();
  if (!/^\d+$/u.test(serverOwnerText)) {
    throw new Error("managed webServer command-owner PID evidence is malformed.");
  }
  const commandOwnerPid = Number(serverOwnerText);
  const serverOwnerAcks = Array.isArray(supervisor.registry?.preloadAcks)
    ? supervisor.registry.preloadAcks.filter((ack) =>
        ack?.pid === commandOwnerPid &&
        ack?.pgid === commandOwnerPid &&
        typeof ack?.eventId === "string" &&
        ack.eventId.length > 0 &&
        typeof ack?.startToken === "string" &&
        ack.startToken.length > 0 &&
        /^[0-9a-f]{64}$/u.test(ack?.processCommandSha256 ?? "") &&
        ack?.runnerPathSha256 === sha256(Buffer.from(runnerPath, "utf8")) &&
        ack?.runnerSha256 === invocationEnvelope.sourceSha256.innerRunner
      )
    : [];
  const serverOwnerAck = serverOwnerAcks.length === 1 ? serverOwnerAcks[0] : null;
  const serverOwnerTransitions = serverOwnerAck &&
    Array.isArray(supervisor.registry?.commandTransitions)
    ? supervisor.registry.commandTransitions.filter((transition) =>
        transition?.pid === commandOwnerPid &&
        transition?.pgid === commandOwnerPid &&
        transition?.startToken === serverOwnerAck.startToken &&
        transition?.registeredCommandSha256 === serverOwnerAck.processCommandSha256 &&
        /^[0-9a-f]{64}$/u.test(transition?.observedCommandSha256 ?? "") &&
        transition.observedCommandSha256 !== transition.registeredCommandSha256 &&
        transition?.reason === "live-registry-command-transition"
      )
    : [];
  const serverOwnerTransition = serverOwnerTransitions.length === 1
    ? serverOwnerTransitions[0]
    : null;
  const matchingDetachedTerminations = Array.isArray(
    cleanup.detachedProcessGroupTermination,
  )
    ? cleanup.detachedProcessGroupTermination.filter((group) =>
        group?.processGroupId === commandOwnerPid &&
        group?.provenEmpty === true &&
        sameJson(group?.finalMembers, [])
      )
    : [];
  const matchingRecordedTerminations = Array.isArray(
    cleanup.recordedProcessGroupTermination,
  )
    ? cleanup.recordedProcessGroupTermination.filter((group) =>
        group?.processGroupId === commandOwnerPid &&
        group?.provenEmpty === true &&
        sameJson(group?.finalMembers, [])
      )
    : [];
  const recordedGroupMatches = Array.isArray(supervisor.registry?.recordedProcessGroups)
    ? supervisor.registry.recordedProcessGroups.filter((pgid) => pgid === commandOwnerPid)
    : [];
  const seenServerOwnerIdentities = serverOwnerAck && serverOwnerTransition &&
    Array.isArray(supervisor.registry?.seenIdentities)
    ? supervisor.registry.seenIdentities.filter((identity) =>
        identity?.pid === commandOwnerPid &&
        identity?.pgid === commandOwnerPid &&
        identity?.startToken === serverOwnerAck.startToken &&
        identity?.commandSha256 === serverOwnerTransition.observedCommandSha256
      )
    : [];
  if (
    !Number.isSafeInteger(commandOwnerPid) ||
    commandOwnerPid <= 0 ||
    commandOwnerPid === prebuild.runner.pid ||
    !serverOwnerAck ||
    !serverOwnerTransition ||
    seenServerOwnerIdentities.length !== 1 ||
    recordedGroupMatches.length !== 1 ||
    matchingDetachedTerminations.length !== 1 ||
    matchingRecordedTerminations.length !== 1 ||
    !cleanup.validatedProcessGroups.includes(commandOwnerPid) ||
    !cleanup.validatedDetachedProcessGroups.includes(commandOwnerPid)
  ) {
    throw new Error("managed webServer command-owner PID lacks its exact preload ACK/start token/PGID/command transition/recorded detached-group binding.");
  }
  const serverLogText = Buffer.from(serverLogBytes).toString("utf8");
  if (
    Buffer.byteLength(serverLogBytes) === 0 ||
    !serverLogText.includes(expectedBaseURL)
  ) {
    throw new Error(
      `managed webServer/build log does not bind the exact baseURL ${expectedBaseURL}.`,
    );
  }

  return deepFreeze({
    artifacts: {
      pathManifest: {
        path: expectedPaths.pathManifestPath,
        sha256: sha256(pathManifestBytes),
        size: Buffer.byteLength(pathManifestBytes),
      },
      prebuildReceipt: {
        path: expectedPaths.prebuildReceiptPath,
        sha256: sha256(prebuildReceiptBytes),
        size: Buffer.byteLength(prebuildReceiptBytes),
      },
      report: {
        path: expectedPaths.reportPath,
        sha256: sha256(reportBytes),
        size: Buffer.byteLength(reportBytes),
      },
      signalJournal: {
        path: expectedPaths.signalJournalPath,
        sha256: signalSha256,
        size: Buffer.byteLength(signalJournalBytes),
      },
      supervisorReceipt: {
        path: expectedPaths.supervisorReceiptPath,
        sha256: sha256(supervisorReceiptBytes),
        size: Buffer.byteLength(supervisorReceiptBytes),
      },
    },
    contract: "mainland-focused-supervised-release-receipt-v1",
    focusedValidator: {
      executionCount: focusedSummary.executionCount,
      groupCount: focusedSummary.groupCount,
      projects: [...focusedSummary.projects],
      rawReplay: {
        countsByGroup: { ...rawReplaySummary.countsByGroup },
        executionCount: rawReplaySummary.executionCount,
        includedCount: rawReplaySummary.includedCount,
        representativeCaseIds: [...rawReplaySummary.representativeCaseIds],
      },
      rawReplayIncludedCount: rawReplaySummary.includedCount,
      releaseReady: false,
      reportPath: focusedSummary.reportPath,
      stateReceiptCount: focusedSummary.stateReceiptCount,
      status: focusedSummary.status,
    },
    intendedPort,
    invocation: {
      forbiddenInheritedEnvironment: {
        PLAYWRIGHT_BASE_URL: null,
        PLAYWRIGHT_SKIP_WEBSERVER: null,
      },
      innerArgs: [...canonicalInnerArgs],
      paths: { ...expectedPaths },
      plannedOuterEnvironment: {
        names: [...invocationEnvelope.plannedOuterEnvironment.names],
        sha256: invocationEnvelope.plannedOuterEnvironment.sha256,
        valueCount: invocationEnvelope.plannedOuterEnvironment.valueCount,
      },
    },
    outerExit: { code: outerExit.code, signal: outerExit.signal },
    prebuild: {
      build: { ...prebuild.build },
      buildOutputs,
      completedAt: prebuild.completedAt,
      contract: prebuild.contract,
      heldFileDispositionEvidence: {
        cleanupClaimed: false,
        reason: "the inner runner does not serialize receipt/path results for its two hidden .disposed-* quarantines",
        receiptCount: 0,
        status: "not-serialized-by-inner-runner",
      },
      nextEnv: {
        after: { ...prebuildNextEnvAfter },
        before: { ...prebuildNextEnvBefore },
      },
      receipt: {
        path: expectedPaths.prebuildReceiptPath,
        sha256: sha256(prebuildReceiptBytes),
        size: Buffer.byteLength(prebuildReceiptBytes),
      },
      runner: { ...prebuild.runner },
      runnerRegistryBinding: {
        childProcessGroupId: supervisor.child.processGroupId,
        preloadAckEventId: runnerAck.eventId,
        status: "exact-pid-start-token-path-and-source-match",
      },
      runtimeSources,
      schemaVersion: prebuild.schemaVersion,
      sourceIdentities: {
        innerRunner: {
          after: { ...runnerAfter },
          before: { ...runnerBefore },
        },
        playwrightConfig: {
          after: { ...runtimeSources[5].after },
          before: { ...runtimeSources[5].before },
        },
        supervisor: {
          after: { ...supervisorAfter },
          before: { ...supervisorBefore },
        },
      },
      status: prebuild.status,
    },
    releaseReady: false,
    repositoryRoot,
    runtimeSourceExecutionHold: {
      releaseReady: false,
      requiredEvidence: "held descriptor identities for every fixed runtime source continuously spanning Playwright/config/spec/helper load through child exit",
      serializedEvidencePresent: false,
      status: "blocked-missing-full-run-runtime-source-hold",
    },
    runId,
    schemaVersion: 1,
    server: {
      baseURL: expectedBaseURL,
      baseURLSources: {
        managedWebServerLog: true,
        reportProjectUse: reportProjectUsePresent,
      },
      buildLog: {
        path: expectedPaths.serverLogPath,
        sha256: sha256(serverLogBytes),
        size: Buffer.byteLength(serverLogBytes),
      },
      commandOwnerEvidence: {
        path: expectedPaths.serverCommandOwnerPidPath,
        sha256: sha256(serverOwnerBytes),
        size: Buffer.byteLength(serverOwnerBytes),
      },
      commandOwnerBinding: {
        detachedProcessGroupId: commandOwnerPid,
        observedCommandSha256: serverOwnerTransition.observedCommandSha256,
        pgid: serverOwnerAck.pgid,
        preloadAckEventId: serverOwnerAck.eventId,
        registeredCommandSha256: serverOwnerAck.processCommandSha256,
        startToken: serverOwnerAck.startToken,
        status: "exact-preload-ack-command-transition-and-detached-group",
      },
      commandOwnerPid,
      ownerBoundToSupervisor: true,
    },
    sources: {
      serialization: "sha256-of-exact-raw-file-bytes-at-fixed-repository-relative-paths",
      values: sources,
    },
    status: "blocked",
    supervisor: {
      cleanupComplete: true,
      contract: supervisor.contract,
      innerEffectiveEnvironment: {
        derivation: "observed-terminal supervisor environment after nonce, registry, preload, runtime-temp, and NODE_OPTIONS additions; distinct from the exact parent outer-spawn plan",
        names: [...inheritedEnvironmentNames],
        sha256: supervisorChildEnvironment.sha256,
        valueCount: supervisorChildEnvironment.valueCount,
      },
      nextEnvExact: true,
      ownedUniverseProvenEmpty: true,
      releaseReady: false,
      schemaVersion: supervisor.schemaVersion,
      status: supervisor.status,
      violations: [],
    },
  });
}

const fdRelativeNoReplaceHelperCommand = "/usr/bin/python3";
const fdRelativeNoReplaceHelperInvocationContract =
  "mainland-fd-relative-openat-helper-invocation-v1";
const fdRelativeNoReplaceHelperProtocolContract =
  "mainland-fd-relative-openat-helper-protocol-v1";
const fdRelativeNoReplaceHelperProtocolLimits = Object.freeze({
  maxLineBytes: 16_384,
  maxStderrBytes: 16_384,
  maxStderrLineBytes: 4_096,
  maxStdoutBytes: 65_536,
  phaseDeadlineMs: 5_000,
});
const fdRelativeNoReplaceHelperPhases = Object.freeze([
  "immediately-before-open",
  "after-create",
  "after-held-read",
  "terminal-join-held",
]);
const fdRelativeNoReplaceHelperSource = String.raw`
import base64
import hashlib
import json
import os
import signal
import stat
import sys
import time

def emit(value):
    sys.stdout.write(json.dumps(value, separators=(",", ":")) + "\n")
    sys.stdout.flush()

def header(sequence, phase, nonce_value=None):
    return {
        "challenge": protocol["challenges"][sequence - 1],
        "contract": protocol["contract"],
        "nonce": protocol["nonce"] if nonce_value is None else nonce_value,
        "phase": phase,
        "schemaVersion": protocol["schemaVersion"],
        "sequence": sequence,
    }

def emit_phase(sequence, phase, extra=None, nonce_value=None):
    value = header(sequence, phase, nonce_value)
    if extra is not None:
        value.update(extra)
    emit(value)

def receive(sequence, phase, action, allow_bytes=False):
    line = sys.stdin.readline()
    if not line:
        raise RuntimeError("native helper control channel closed")
    value = json.loads(line)
    expected = header(sequence, phase)
    expected["action"] = action
    if allow_bytes:
        expected_keys = set(expected.keys()) | {"bytesBase64"}
    else:
        expected_keys = set(expected.keys())
    if set(value.keys()) != expected_keys:
        raise RuntimeError("native helper control keys drifted")
    for key, expected_value in expected.items():
        if value.get(key) != expected_value:
            raise RuntimeError("native helper control value drifted: " + key)
    return value

created_fd = None
directory_fds = []
try:
    name = sys.argv[1]
    protocol = json.loads(base64.b64decode(sys.argv[2], validate=True))
    if set(protocol.keys()) != {
        "challenges", "contract", "maxLineBytes", "maxStderrBytes",
        "maxStderrLineBytes", "maxStdoutBytes", "nonce", "phaseDeadlineMs",
        "parentComponents", "schemaVersion", "testFault",
    }:
        raise RuntimeError("native helper protocol configuration keys drifted")
    if protocol["contract"] != "mainland-fd-relative-openat-helper-protocol-v1":
        raise RuntimeError("native helper protocol contract drifted")
    if protocol["schemaVersion"] != 1:
        raise RuntimeError("native helper protocol schema drifted")
    if (
        protocol["maxLineBytes"] != 16384
        or protocol["maxStderrBytes"] != 16384
        or protocol["maxStderrLineBytes"] != 4096
        or protocol["maxStdoutBytes"] != 65536
        or not 10 <= protocol["phaseDeadlineMs"] <= 5000
    ):
        raise RuntimeError("native helper protocol limits drifted")
    if (
        not isinstance(protocol["nonce"], str)
        or len(protocol["nonce"]) != 64
        or any(character not in "0123456789abcdef" for character in protocol["nonce"])
        or not isinstance(protocol["challenges"], list)
        or len(protocol["challenges"]) != 4
        or any(
            not isinstance(challenge, str)
            or len(challenge) != 64
            or any(character not in "0123456789abcdef" for character in challenge)
            for challenge in protocol["challenges"]
        )
        or len(set(protocol["challenges"])) != 4
    ):
        raise RuntimeError("native helper protocol nonce or challenges drifted")
    if (
        not isinstance(protocol["parentComponents"], list)
        or len(protocol["parentComponents"]) == 0
        or any(
            not isinstance(component, str)
            or component in {"", ".", ".."}
            or "/" in component
            or "\x00" in component
            for component in protocol["parentComponents"]
        )
    ):
        raise RuntimeError("fd-anchored Starship component walk configuration drifted")
    root_directory = os.fstat(3)
    directory_chain = [{
        "component": "/Volumes/Starship",
        "device": str(root_directory.st_dev),
        "inode": str(root_directory.st_ino),
        "sequence": 0,
    }]
    parent_fd = 3
    try:
        for index, component in enumerate(protocol["parentComponents"], start=1):
            next_fd = os.open(
                component,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=parent_fd,
            )
            directory_fds.append(next_fd)
            parent_fd = next_fd
            directory_stat = os.fstat(parent_fd)
            directory_chain.append({
                "component": component,
                "device": str(directory_stat.st_dev),
                "inode": str(directory_stat.st_ino),
                "sequence": index,
            })
    except OSError as error:
        raise RuntimeError(
            "fd-anchored Starship component walk rejected the parent"
        ) from error
    fault = protocol["testFault"]
    if fault == "crash":
        os._exit(17)
    if fault == "signal":
        os.kill(os.getpid(), signal.SIGTERM)
    if fault == "partial-eof":
        sys.stdout.write('{"contract":')
        sys.stdout.flush()
        os._exit(18)
    if fault == "stall":
        time.sleep(1.0)
    if fault == "oversized-stdout":
        sys.stdout.write("x" * (protocol["maxLineBytes"] + 1))
        sys.stdout.flush()
    if fault == "oversized-stderr":
        sys.stderr.write("x" * (protocol["maxStderrLineBytes"] + 1))
        sys.stderr.flush()
    if fault == "oversized-stderr-total":
        diagnostic_line = ("x" * 100) + "\n"
        sys.stderr.write(diagnostic_line * ((protocol["maxStderrBytes"] // len(diagnostic_line)) + 2))
        sys.stderr.flush()
    emit_phase(
        1,
        "immediately-before-open",
        nonce_value=("0" * len(protocol["nonce"])) if fault == "stale-nonce" else None,
    )
    payload = receive(1, "immediately-before-open", "create", allow_bytes=True)
    data = base64.b64decode(payload["bytesBase64"], validate=True)
    created_fd = os.open(
        name,
        os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o400,
        dir_fd=parent_fd,
    )
    if fault == "replay-phase":
        emit_phase(1, "immediately-before-open")
    else:
        emit_phase(2, "after-create")
    receive(2, "after-create", "continue")
    offset = 0
    while offset < len(data):
        count = os.write(created_fd, data[offset:])
        if count <= 0:
            raise RuntimeError("native helper write made no progress")
        offset += count
    os.fchmod(created_fd, 0o400)
    os.fsync(created_fd)
    os.lseek(created_fd, 0, os.SEEK_SET)
    chunks = []
    remaining = len(data)
    while remaining > 0:
        chunk = os.read(created_fd, remaining)
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    observed = b"".join(chunks)
    emit_phase(3, "after-held-read")
    receive(3, "after-held-read", "continue")
    created = os.fstat(created_fd)
    joined = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    parent = os.fstat(parent_fd)
    os.fsync(parent_fd)
    terminal_extra = {
        "created": {
            "ctimeNs": str(created.st_ctime_ns),
            "device": str(created.st_dev),
            "inode": str(created.st_ino),
            "mode": format(stat.S_IMODE(created.st_mode), "o"),
            "mtimeNs": str(created.st_mtime_ns),
            "sha256": hashlib.sha256(observed).hexdigest(),
            "size": created.st_size,
        },
        "joined": {
            "ctimeNs": str(joined.st_ctime_ns),
            "device": str(joined.st_dev),
            "inode": str(joined.st_ino),
            "mode": format(stat.S_IMODE(joined.st_mode), "o"),
            "mtimeNs": str(joined.st_mtime_ns),
            "size": joined.st_size,
        },
        "parent": {
            "device": str(parent.st_dev),
            "inode": str(parent.st_ino),
        },
        "directoryChain": directory_chain,
    }
    emit_phase(4, "terminal-join-held", terminal_extra)
    if fault == "duplicate-terminal":
        emit_phase(4, "terminal-join-held", terminal_extra)
    receive(4, "terminal-join-held", "finish")
    if fault == "surplus-terminal":
        emit_phase(4, "terminal-join-held", terminal_extra)
except BaseException as error:
    sys.stderr.write(type(error).__name__ + ": " + str(error) + "\n")
    sys.stderr.flush()
    raise
finally:
    if created_fd is not None:
        os.close(created_fd)
    for directory_fd in reversed(directory_fds):
        os.close(directory_fd)
`;

function withDeadline(promise, deadlineMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`${label} exceeded its ${deadlineMs}ms deadline.`));
      }, deadlineMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function createBoundedUtf8LineReader(stream, { maxLineBytes, maxTotalBytes }) {
  const iterator = stream[Symbol.asyncIterator]();
  let buffered = Buffer.alloc(0);
  let totalBytes = 0;
  return async () => {
    while (true) {
      const newline = buffered.indexOf(0x0a);
      if (newline >= 0) {
        if (newline > maxLineBytes) {
          throw new Error("fd-relative native helper exceeded its stdout line bound.");
        }
        const line = buffered.subarray(0, newline).toString("utf8");
        buffered = buffered.subarray(newline + 1);
        return line;
      }
      if (buffered.length > maxLineBytes) {
        throw new Error("fd-relative native helper exceeded its stdout line bound.");
      }
      const next = await iterator.next();
      if (next.done) {
        if (buffered.length === 0) return null;
        throw new Error("fd-relative native helper closed with a partial stdout line.");
      }
      const chunk = Buffer.from(next.value);
      totalBytes += chunk.length;
      if (totalBytes > maxTotalBytes) {
        throw new Error("fd-relative native helper exceeded its total stdout bound.");
      }
      buffered = Buffer.concat([buffered, chunk]);
    }
  };
}

function captureBoundedStream(
  stream,
  { maxLineBytes, maxTotalBytes },
  label,
) {
  const chunks = [];
  let size = 0;
  let currentLineBytes = 0;
  let overflow = null;
  const eof = new Promise((resolve, reject) => {
    stream.on("data", (chunkValue) => {
      const chunk = Buffer.from(chunkValue);
      size += chunk.length;
      if (size > maxTotalBytes) {
        overflow ??= new Error(
          `fd-relative native helper exceeded its total ${label} byte bound.`,
        );
      }
      let start = 0;
      while (start < chunk.length) {
        const newline = chunk.indexOf(0x0a, start);
        const end = newline === -1 ? chunk.length : newline;
        currentLineBytes += end - start;
        if (currentLineBytes > maxLineBytes) {
          overflow ??= new Error(
            `fd-relative native helper exceeded its ${label} line bound.`,
          );
          break;
        }
        if (newline === -1) break;
        currentLineBytes = 0;
        start = newline + 1;
      }
      if (overflow !== null) {
        return;
      }
      chunks.push(chunk);
    });
    stream.once("end", () => {
      if (overflow !== null) reject(overflow);
      else resolve(Buffer.concat(chunks));
    });
    stream.once("error", reject);
  });
  return { eof, text: () => Buffer.concat(chunks).toString("utf8").trim() };
}

function helperProtocolHeader(protocol, sequence, phase) {
  return {
    challenge: protocol.challenges[sequence - 1],
    contract: protocol.contract,
    nonce: protocol.nonce,
    phase,
    schemaVersion: protocol.schemaVersion,
    sequence,
  };
}

function assertHelperProtocolMessage(message, protocol, sequence, phase, extraKeys = []) {
  assertExactKeys(
    `fd-relative helper ${phase} evidence`,
    message,
    ["challenge", "contract", "nonce", "phase", "schemaVersion", "sequence", ...extraKeys],
  );
  const expectedHeader = helperProtocolHeader(protocol, sequence, phase);
  for (const [key, expectedValue] of Object.entries(expectedHeader)) {
    if (message[key] !== expectedValue) {
      throw new Error(
        `fd-relative native helper protocol drifted at sequence ${sequence}; field=${key}.`,
      );
    }
  }
}

function helperControl(protocol, sequence, phase, action, extra = {}) {
  return {
    action,
    ...helperProtocolHeader(protocol, sequence, phase),
    ...extra,
  };
}

function hasExactPlainDataShape(value, expectedKeys) {
  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return false;
  if (!sameJson([...ownKeys].sort(), [...expectedKeys].sort())) return false;
  return ownKeys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined &&
      descriptor.enumerable === true &&
      Object.hasOwn(descriptor, "value");
  });
}

async function openHeldHelperExecutableEvidence(executablePath) {
  let descriptor = null;
  try {
    descriptor = await open(
      executablePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const [canonical, before, bytes] = await Promise.all([
      realpath(executablePath),
      descriptor.stat({ bigint: true }),
      descriptor.readFile(),
    ]);
    const [after, pathname] = await Promise.all([
      descriptor.stat({ bigint: true }),
      lstat(executablePath, { bigint: true }),
    ]);
    if (
      canonical !== executablePath ||
      !sameFileStatIdentity(before, after) ||
      !sameFileStatIdentity(after, pathname) ||
      BigInt(bytes.length) !== after.size
    ) {
      throw new Error(
        `helper executable pathname does not name one stable held file: ${executablePath}.`,
      );
    }
    return {
      bytes,
      descriptor,
      receipt: deepFreeze({
        ctimeNs: after.ctimeNs.toString(10),
        device: after.dev.toString(10),
        inode: after.ino.toString(10),
        mode: Number(after.mode & 0o7777n).toString(8),
        mtimeNs: after.mtimeNs.toString(10),
        path: executablePath,
        sha256: sha256(bytes),
        size: bytes.length,
      }),
      stat: after,
    };
  } catch (error) {
    if (descriptor !== null) await descriptor.close();
    throw error;
  }
}

async function writeControlLine(stream, value) {
  await new Promise((resolve, reject) => {
    stream.write(`${JSON.stringify(value)}\n`, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function writeImmutableReceiptNative(receiptPath, bytes, testHooks = {}) {
  const starshipRootPath = "/Volumes/Starship";
  const canonicalPath = path.resolve(receiptPath);
  const parentPath = path.dirname(canonicalPath);
  const canonicalParent = await realpath(parentPath);
  if (canonicalParent !== parentPath) {
    throw new Error(`parent receipt directory is not a canonical non-symlink path: ${parentPath}.`);
  }
  const parentRelativeToStarship = path.relative(starshipRootPath, parentPath);
  const parentComponents = parentRelativeToStarship.split(path.sep);
  let directory = null;
  let starshipRootDirectory = null;
  let child = null;
  let childOutcomePromise = null;
  let childFinished = false;
  let createdReceiptDescriptor = null;
  let finalPathDescriptor = null;
  let helperExecutableEvidence = null;
  try {
    starshipRootDirectory = await open(
      starshipRootPath,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
    const [starshipRootBefore, starshipRootPathBefore] = await Promise.all([
      starshipRootDirectory.stat({ bigint: true }),
      lstat(starshipRootPath, { bigint: true }),
    ]);
    if (!sameDirectoryStatIdentity(starshipRootBefore, starshipRootPathBefore)) {
      throw new Error("trusted Starship root pathname does not name its held directory.");
    }
    if (typeof testHooks.afterParentRealpathBeforeAnchoredWalk === "function") {
      await testHooks.afterParentRealpathBeforeAnchoredWalk();
    }
    directory = await open(
      parentPath,
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
    const [directoryBefore, parentBefore] = await Promise.all([
      directory.stat({ bigint: true }),
      lstat(parentPath, { bigint: true }),
    ]);
    if (!sameDirectoryStatIdentity(directoryBefore, parentBefore)) {
      throw new Error("parent receipt directory pathname does not name the held directory.");
    }
    if (typeof testHooks.afterParentDescriptorOpened === "function") {
      await testHooks.afterParentDescriptorOpened();
    }
    const parentAtCreate = await lstat(parentPath, { bigint: true });
    if (!sameDirectoryStatIdentity(directoryBefore, parentAtCreate)) {
      throw new Error("parent receipt directory identity drifted before no-replace creation.");
    }
    const helperExecutablePath = testHooks.helperExecutablePathForUntrustedTestOnly ??
      fdRelativeNoReplaceHelperCommand;
    if (
      typeof helperExecutablePath !== "string" ||
      !path.isAbsolute(helperExecutablePath) ||
      path.resolve(helperExecutablePath) !== helperExecutablePath ||
      (
        helperExecutablePath !== fdRelativeNoReplaceHelperCommand &&
        !helperExecutablePath.startsWith("/Volumes/Starship/")
      )
    ) {
      throw new Error("untrusted helper executable path must be one absolute canonical path.");
    }
    helperExecutableEvidence = await openHeldHelperExecutableEvidence(helperExecutablePath);
    if (typeof testHooks.afterHelperExecutableAttestedBeforeSpawn === "function") {
      await testHooks.afterHelperExecutableAttestedBeforeSpawn();
    }
    let helperPathAtLaunch;
    try {
      helperPathAtLaunch = await lstat(helperExecutablePath, { bigint: true });
    } catch {
      throw new Error("helper executable pathname no longer names the held attested file.");
    }
    const helperHeldAtLaunch = await helperExecutableEvidence.descriptor.stat({ bigint: true });
    if (
      !sameFileStatIdentity(helperExecutableEvidence.stat, helperHeldAtLaunch) ||
      !sameFileStatIdentity(helperHeldAtLaunch, helperPathAtLaunch)
    ) {
      throw new Error("helper executable pathname no longer names the held attested file.");
    }
    if (helperExecutablePath !== fdRelativeNoReplaceHelperCommand) {
      throw new Error(
        "untrusted executable attestation path cannot become helper launch authority.",
      );
    }
    const phaseDeadlineMs = testHooks.phaseDeadlineMs === undefined
      ? fdRelativeNoReplaceHelperProtocolLimits.phaseDeadlineMs
      : testHooks.phaseDeadlineMs;
    if (
      !Number.isSafeInteger(phaseDeadlineMs) ||
      phaseDeadlineMs < 10 ||
      phaseDeadlineMs > fdRelativeNoReplaceHelperProtocolLimits.phaseDeadlineMs
    ) {
      throw new Error("fd-relative helper phase deadline override is invalid.");
    }
    const allowedTestFaults = new Set([
      null,
      "crash",
      "duplicate-terminal",
      "oversized-stderr",
      "oversized-stderr-total",
      "oversized-stdout",
      "partial-eof",
      "replay-phase",
      "signal",
      "stale-nonce",
      "stall",
      "surplus-terminal",
    ]);
    const testFault = testHooks.helperFault ?? null;
    if (!allowedTestFaults.has(testFault)) {
      throw new Error("fd-relative helper test fault is invalid.");
    }
    const protocol = {
      challenges: fdRelativeNoReplaceHelperPhases.map(() => randomBytes(32).toString("hex")),
      contract: fdRelativeNoReplaceHelperProtocolContract,
      maxLineBytes: fdRelativeNoReplaceHelperProtocolLimits.maxLineBytes,
      maxStderrBytes: fdRelativeNoReplaceHelperProtocolLimits.maxStderrBytes,
      maxStderrLineBytes: fdRelativeNoReplaceHelperProtocolLimits.maxStderrLineBytes,
      maxStdoutBytes: fdRelativeNoReplaceHelperProtocolLimits.maxStdoutBytes,
      nonce: randomBytes(32).toString("hex"),
      parentComponents: [...parentComponents],
      phaseDeadlineMs,
      schemaVersion: 1,
      testFault,
    };
    const encodedProtocol = Buffer.from(JSON.stringify(protocol), "utf8").toString("base64");
    const helperArgs = [
      "-I",
      "-S",
      "-B",
      "-c",
      fdRelativeNoReplaceHelperSource,
      path.basename(canonicalPath),
      encodedProtocol,
    ];
    const helperEnvironmentValues = [["LANG", "C"], ["LC_ALL", "C"]];
    const helperEnvironment = Object.fromEntries(helperEnvironmentValues);
    const helperEnvironmentReceipt = {
      ...exactEnvironmentReceipt(helperEnvironment),
      values: helperEnvironmentValues,
    };
    const helperFdMap = {
      0: "control-input-pipe",
      1: "protocol-output-pipe",
      2: "diagnostic-output-pipe",
      3: {
        device: starshipRootBefore.dev.toString(10),
        inode: starshipRootBefore.ino.toString(10),
        role: "held-trusted-starship-root-directory",
      },
    };
    const helperProtocolReceipt = {
      challengeSha256: protocol.challenges.map((challenge) =>
        sha256(Buffer.from(challenge, "utf8"))),
      challenges: [...protocol.challenges],
      configurationSha256: sha256(Buffer.from(JSON.stringify(protocol), "utf8")),
      contract: protocol.contract,
      maxLineBytes: protocol.maxLineBytes,
      maxStderrBytes: protocol.maxStderrBytes,
      maxStderrLineBytes: protocol.maxStderrLineBytes,
      maxStdoutBytes: protocol.maxStdoutBytes,
      nonce: protocol.nonce,
      nonceSha256: sha256(Buffer.from(protocol.nonce, "utf8")),
      phaseCount: fdRelativeNoReplaceHelperPhases.length,
      phaseDeadlineMs: protocol.phaseDeadlineMs,
      phases: [...fdRelativeNoReplaceHelperPhases],
      schemaVersion: protocol.schemaVersion,
    };
    const helperProcessImageBinding = {
      attestedPath: helperExecutablePath,
      heldDescriptorThroughChildExit: true,
      processImageExact: false,
      status: "blocked-no-held-executable-image-launch",
    };
    const helperInvocationRaw = {
      argv: [helperExecutablePath, ...helperArgs],
      contract: fdRelativeNoReplaceHelperInvocationContract,
      directoryWalk: {
        components: [...parentComponents],
        contract: "mainland-starship-root-openat-component-walk-v1",
        root: {
          device: starshipRootBefore.dev.toString(10),
          inode: starshipRootBefore.ino.toString(10),
          path: starshipRootPath,
        },
      },
      environment: helperEnvironmentReceipt,
      executable: helperExecutableEvidence.receipt,
      fdMap: helperFdMap,
      helperSource: {
        sha256: sha256(Buffer.from(fdRelativeNoReplaceHelperSource, "utf8")),
        size: Buffer.byteLength(fdRelativeNoReplaceHelperSource, "utf8"),
      },
      processImageBinding: helperProcessImageBinding,
      protocol: helperProtocolReceipt,
      schemaVersion: 1,
    };
    const helperInvocation = deepFreeze({
      ...helperInvocationRaw,
      argvSha256: sha256(Buffer.from(JSON.stringify(helperInvocationRaw.argv), "utf8")),
      sha256: sha256(Buffer.from(JSON.stringify(helperInvocationRaw), "utf8")),
    });
    const canonicalSpawnPlan = deepFreeze({
      args: [...helperArgs],
      command: helperExecutablePath,
      options: {
        env: { ...helperEnvironment },
        stdio: ["pipe", "pipe", "pipe", starshipRootDirectory.fd],
      },
    });
    const actualSpawnPlan = typeof testHooks.prepareFdRelativeSpawnForTest === "function"
      ? await testHooks.prepareFdRelativeSpawnForTest(canonicalSpawnPlan)
      : canonicalSpawnPlan;
    if (
      !hasExactPlainDataShape(actualSpawnPlan, ["args", "command", "options"]) ||
      !hasExactPlainDataShape(actualSpawnPlan.options, ["env", "stdio"]) ||
      !hasExactPlainDataShape(actualSpawnPlan.options.env, ["LANG", "LC_ALL"]) ||
      !Array.isArray(actualSpawnPlan.args) ||
      Object.getPrototypeOf(actualSpawnPlan.args) !== Array.prototype ||
      Reflect.ownKeys(actualSpawnPlan.args).some((key) => typeof key !== "string") ||
      actualSpawnPlan.command !== canonicalSpawnPlan.command ||
      !sameJson(actualSpawnPlan.args, canonicalSpawnPlan.args) ||
      !sameJson(actualSpawnPlan.options.env, canonicalSpawnPlan.options.env) ||
      !Array.isArray(actualSpawnPlan.options.stdio) ||
      Object.getPrototypeOf(actualSpawnPlan.options.stdio) !== Array.prototype ||
      Reflect.ownKeys(actualSpawnPlan.options.stdio).some((key) => typeof key !== "string") ||
      actualSpawnPlan.options.stdio.length !== 4 ||
      actualSpawnPlan.options.stdio[0] !== "pipe" ||
      actualSpawnPlan.options.stdio[1] !== "pipe" ||
      actualSpawnPlan.options.stdio[2] !== "pipe" ||
      actualSpawnPlan.options.stdio[3] !== starshipRootDirectory.fd
    ) {
      throw new Error("fd-relative helper spawn plan drifted from its canonical invocation.");
    }
    child = spawn(
      canonicalSpawnPlan.command,
      canonicalSpawnPlan.args,
      canonicalSpawnPlan.options,
    );
    const stderrCapture = captureBoundedStream(
      child.stderr,
      {
        maxLineBytes: protocol.maxStderrLineBytes,
        maxTotalBytes: protocol.maxStderrBytes,
      },
      "stderr",
    );
    const stderrOutcomePromise = stderrCapture.eof.then(
      (stderrBytes) => ({ error: null, stderrBytes }),
      (error) => ({ error, stderrBytes: null }),
    );
    childOutcomePromise = waitForOuterSupervisor(child);
    const readHelperLine = createBoundedUtf8LineReader(child.stdout, {
      maxLineBytes: protocol.maxLineBytes,
      maxTotalBytes: protocol.maxStdoutBytes,
    });
    const readMessage = async (sequence, phase, extraKeys = []) => {
      const line = await readHelperLine();
      if (line === null) {
        const outcome = await childOutcomePromise;
        throw new Error(
          `fd-relative native helper closed before terminal evidence; code=${String(outcome.code)} signal=${String(outcome.signal)} spawnError=${String(outcome.spawnError)} stderr=${stderrCapture.text()}.`,
        );
      }
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        throw new Error("fd-relative native helper emitted malformed JSON evidence.");
      }
      if (line !== JSON.stringify(message)) {
        throw new Error("fd-relative native helper emitted noncanonical JSON evidence.");
      }
      assertHelperProtocolMessage(message, protocol, sequence, phase, extraKeys);
      return message;
    };
    await withDeadline(
      readMessage(1, "immediately-before-open"),
      protocol.phaseDeadlineMs,
      "fd-relative helper immediately-before-open phase",
    );
    if (typeof testHooks.immediatelyBeforeFdRelativeOpen === "function") {
      await testHooks.immediatelyBeforeFdRelativeOpen();
    }
    await withDeadline(
      writeControlLine(child.stdin, helperControl(
        protocol,
        1,
        "immediately-before-open",
        "create",
        { bytesBase64: Buffer.from(bytes).toString("base64") },
      )),
      protocol.phaseDeadlineMs,
      "fd-relative helper create control",
    );
    await withDeadline(
      readMessage(2, "after-create"),
      protocol.phaseDeadlineMs,
      "fd-relative helper after-create phase",
    );
    if (typeof testHooks.afterCreate === "function") {
      await testHooks.afterCreate();
    }
    await withDeadline(
      writeControlLine(child.stdin, helperControl(
        protocol,
        2,
        "after-create",
        "continue",
      )),
      protocol.phaseDeadlineMs,
      "fd-relative helper after-create control",
    );
    await withDeadline(
      readMessage(3, "after-held-read"),
      protocol.phaseDeadlineMs,
      "fd-relative helper after-held-read phase",
    );
    if (typeof testHooks.afterHeldRead === "function") {
      await testHooks.afterHeldRead();
    }
    await withDeadline(
      writeControlLine(child.stdin, helperControl(
        protocol,
        3,
        "after-held-read",
        "continue",
      )),
      protocol.phaseDeadlineMs,
      "fd-relative helper after-held-read control",
    );
    const terminal = await withDeadline(
      readMessage(4, "terminal-join-held", [
        "created",
        "directoryChain",
        "joined",
        "parent",
      ]),
      protocol.phaseDeadlineMs,
      "fd-relative helper terminal phase",
    );
    assertExactKeys("fd-relative helper created evidence", terminal.created, [
      "ctimeNs",
      "device",
      "inode",
      "mode",
      "mtimeNs",
      "sha256",
      "size",
    ]);
    assertExactKeys("fd-relative helper joined evidence", terminal.joined, [
      "ctimeNs",
      "device",
      "inode",
      "mode",
      "mtimeNs",
      "size",
    ]);
    assertExactKeys("fd-relative helper parent evidence", terminal.parent, [
      "device",
      "inode",
    ]);
    if (
      !Array.isArray(terminal.directoryChain) ||
      terminal.directoryChain.length !== parentComponents.length + 1
    ) {
      throw new Error("fd-anchored Starship directory chain evidence drifted.");
    }
    const expectedDirectoryComponents = [starshipRootPath, ...parentComponents];
    for (let index = 0; index < terminal.directoryChain.length; index += 1) {
      const entry = terminal.directoryChain[index];
      assertExactKeys(`fd-anchored Starship directory chain ${index}`, entry, [
        "component",
        "device",
        "inode",
        "sequence",
      ]);
      if (
        entry.component !== expectedDirectoryComponents[index] ||
        entry.sequence !== index ||
        typeof entry.device !== "string" ||
        !/^[0-9]+$/u.test(entry.device) ||
        typeof entry.inode !== "string" ||
        !/^[0-9]+$/u.test(entry.inode)
      ) {
        throw new Error("fd-anchored Starship directory chain evidence drifted.");
      }
    }
    const anchoredRoot = terminal.directoryChain[0];
    const anchoredParent = terminal.directoryChain.at(-1);
    let pathAtSeal;
    let parentAtSeal;
    try {
      createdReceiptDescriptor = await open(
        canonicalPath,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      [pathAtSeal, parentAtSeal] = await Promise.all([
        lstat(canonicalPath, { bigint: true }),
        lstat(parentPath, { bigint: true }),
      ]);
    } catch {
      throw new Error(
        "parent receipt pathname does not join the held directory and fd-relative created inode.",
      );
    }
    const [directoryAtSeal, createdHeldAtSeal] = await Promise.all([
      directory.stat({ bigint: true }),
      createdReceiptDescriptor.stat({ bigint: true }),
    ]);
    const pathReceipt = {
      ctimeNs: pathAtSeal.ctimeNs.toString(10),
      device: pathAtSeal.dev.toString(10),
      inode: pathAtSeal.ino.toString(10),
      mode: Number(pathAtSeal.mode & 0o7777n).toString(8),
      mtimeNs: pathAtSeal.mtimeNs.toString(10),
      size: Number(pathAtSeal.size),
    };
    const createdIdentity = {
      ctimeNs: terminal.created.ctimeNs,
      device: terminal.created.device,
      inode: terminal.created.inode,
      mode: terminal.created.mode,
      mtimeNs: terminal.created.mtimeNs,
      size: terminal.created.size,
    };
    if (
      terminal.phase !== "terminal-join-held" ||
      !sameJson(createdIdentity, terminal.joined) ||
      !sameJson(terminal.joined, pathReceipt) ||
      terminal.created.device !== createdHeldAtSeal.dev.toString(10) ||
      terminal.created.inode !== createdHeldAtSeal.ino.toString(10) ||
      terminal.created.ctimeNs !== createdHeldAtSeal.ctimeNs.toString(10) ||
      terminal.created.mtimeNs !== createdHeldAtSeal.mtimeNs.toString(10) ||
      terminal.created.mode !== Number(createdHeldAtSeal.mode & 0o7777n).toString(8) ||
      terminal.created.size !== Number(createdHeldAtSeal.size) ||
      terminal.created.sha256 !== sha256(bytes) ||
      terminal.created.size !== Buffer.byteLength(bytes) ||
      terminal.created.mode !== "400" ||
      terminal.parent.device !== directoryBefore.dev.toString(10) ||
      terminal.parent.inode !== directoryBefore.ino.toString(10) ||
      anchoredRoot.device !== starshipRootBefore.dev.toString(10) ||
      anchoredRoot.inode !== starshipRootBefore.ino.toString(10) ||
      anchoredParent.device !== terminal.parent.device ||
      anchoredParent.inode !== terminal.parent.inode ||
      !sameDirectoryStatIdentity(directoryBefore, parentAtSeal) ||
      !sameDirectoryStatIdentity(directoryBefore, directoryAtSeal) ||
      !pathAtSeal.isFile()
    ) {
      throw new Error(
        "parent receipt pathname does not join the held directory and fd-relative created inode.",
      );
    }
    await withDeadline(
      writeControlLine(child.stdin, helperControl(
        protocol,
        4,
        "terminal-join-held",
        "finish",
      )),
      protocol.phaseDeadlineMs,
      "fd-relative helper finish control",
    );
    child.stdin.end();
    const surplusLine = await withDeadline(
      readHelperLine(),
      protocol.phaseDeadlineMs,
      "fd-relative helper exact stdout EOF",
    );
    if (surplusLine !== null) {
      throw new Error("fd-relative native helper emitted surplus terminal evidence.");
    }
    const stderrOutcome = await withDeadline(
      stderrOutcomePromise,
      protocol.phaseDeadlineMs,
      "fd-relative helper exact stderr EOF",
    );
    if (stderrOutcome.error !== null) throw stderrOutcome.error;
    const outcome = await withDeadline(
      childOutcomePromise,
      protocol.phaseDeadlineMs,
      "fd-relative helper terminal process exit",
    );
    childFinished = true;
    if (
      outcome.code !== 0 ||
      outcome.signal !== null ||
      outcome.spawnError !== null ||
      stderrOutcome.stderrBytes.length !== 0
    ) {
      throw new Error(
        `fd-relative native helper failed after terminal join; code=${String(outcome.code)} signal=${String(outcome.signal)} spawnError=${String(outcome.spawnError)} stderr=${stderrOutcome.stderrBytes.toString("utf8").trim()}.`,
      );
    }
    await directory.sync();
    if (
      typeof testHooks.afterHelperExitAndDirectoryFsyncBeforeFinalJoin ===
      "function"
    ) {
      await testHooks.afterHelperExitAndDirectoryFsyncBeforeFinalJoin();
    }
    let finalCreatedBefore;
    let finalJoinedBefore;
    let finalParentBefore;
    let finalDirectoryBefore;
    try {
      finalPathDescriptor = await open(
        canonicalPath,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
      );
      [
        finalCreatedBefore,
        finalJoinedBefore,
        finalParentBefore,
        finalDirectoryBefore,
      ] = await Promise.all([
        createdReceiptDescriptor.stat({ bigint: true }),
        finalPathDescriptor.stat({ bigint: true }),
        lstat(parentPath, { bigint: true }),
        directory.stat({ bigint: true }),
      ]);
    } catch {
      throw new Error(
        "final success join no longer names the held parent and created receipt.",
      );
    }
    const [finalCreatedBytes, finalJoinedBytes] = await Promise.all([
      createdReceiptDescriptor.readFile(),
      finalPathDescriptor.readFile(),
    ]);
    let finalCreatedAfter;
    let finalJoinedAfter;
    let finalPathAfter;
    let finalParentAfter;
    let finalDirectoryAfter;
    try {
      [
        finalCreatedAfter,
        finalJoinedAfter,
        finalPathAfter,
        finalParentAfter,
        finalDirectoryAfter,
      ] = await Promise.all([
        createdReceiptDescriptor.stat({ bigint: true }),
        finalPathDescriptor.stat({ bigint: true }),
        lstat(canonicalPath, { bigint: true }),
        lstat(parentPath, { bigint: true }),
        directory.stat({ bigint: true }),
      ]);
    } catch {
      throw new Error(
        "final success join no longer names the held parent and created receipt.",
      );
    }
    if (
      !sameFileStatIdentity(createdHeldAtSeal, finalCreatedBefore) ||
      !sameFileStatIdentity(finalCreatedBefore, finalCreatedAfter) ||
      !sameFileStatIdentity(finalCreatedAfter, finalJoinedBefore) ||
      !sameFileStatIdentity(finalJoinedBefore, finalJoinedAfter) ||
      !sameFileStatIdentity(finalJoinedAfter, finalPathAfter) ||
      !sameDirectoryStatIdentity(directoryBefore, finalDirectoryBefore) ||
      !sameDirectoryStatIdentity(finalDirectoryBefore, finalDirectoryAfter) ||
      !sameDirectoryStatIdentity(finalDirectoryAfter, finalParentBefore) ||
      !sameDirectoryStatIdentity(finalParentBefore, finalParentAfter) ||
      !finalCreatedBytes.equals(bytes) ||
      !finalJoinedBytes.equals(bytes) ||
      sha256(finalCreatedBytes) !== terminal.created.sha256 ||
      sha256(finalJoinedBytes) !== terminal.created.sha256 ||
      Number(finalCreatedAfter.mode & 0o7777n).toString(8) !== "400" ||
      finalCreatedAfter.size !== BigInt(bytes.length)
    ) {
      throw new Error(
        "final success join no longer names the held parent and created receipt.",
      );
    }
    const [starshipRootAfter, starshipRootPathAfter] = await Promise.all([
      starshipRootDirectory.stat({ bigint: true }),
      lstat(starshipRootPath, { bigint: true }),
    ]);
    if (
      !sameDirectoryStatIdentity(starshipRootBefore, starshipRootAfter) ||
      !sameDirectoryStatIdentity(starshipRootAfter, starshipRootPathAfter)
    ) {
      throw new Error("trusted Starship root identity drifted before final success.");
    }
    const finalCreatedReceipt = {
      ctimeNs: finalCreatedAfter.ctimeNs.toString(10),
      device: finalCreatedAfter.dev.toString(10),
      inode: finalCreatedAfter.ino.toString(10),
      mode: Number(finalCreatedAfter.mode & 0o7777n).toString(8),
      mtimeNs: finalCreatedAfter.mtimeNs.toString(10),
      sha256: sha256(finalCreatedBytes),
      size: Number(finalCreatedAfter.size),
    };
    return deepFreeze({
      directoryWalk: {
        chain: terminal.directoryChain,
        contract: "mainland-starship-root-openat-component-walk-v1",
        parentDescriptorHeldThroughFinalJoin: true,
        rootDescriptorHeldThroughFinalJoin: true,
        status: "fd-anchored-components-and-post-exit-parent-continuity-proven",
      },
      exact: false,
      finalLinearization: {
        created: finalCreatedReceipt,
        parent: {
          device: finalDirectoryAfter.dev.toString(10),
          inode: finalDirectoryAfter.ino.toString(10),
          path: parentPath,
        },
        status: "joined-after-helper-exit-and-directory-fsync",
      },
      helper: {
        command: helperExecutablePath,
        commandSha256: helperExecutableEvidence.receipt.sha256,
        invocation: helperInvocation,
        processImageBinding: helperProcessImageBinding,
        sourceSha256: sha256(Buffer.from(fdRelativeNoReplaceHelperSource, "utf8")),
      },
      immutable: true,
      mode: finalCreatedReceipt.mode,
      parent: {
        device: directoryBefore.dev.toString(10),
        inode: directoryBefore.ino.toString(10),
        path: parentPath,
      },
      path: canonicalPath,
      sha256: finalCreatedReceipt.sha256,
      size: finalCreatedReceipt.size,
      status: "blocked-no-held-executable-image-launch",
    });
  } finally {
    if (child !== null && !childFinished) {
      child.kill("SIGKILL");
      if (childOutcomePromise !== null) await childOutcomePromise;
    }
    if (helperExecutableEvidence !== null) {
      await helperExecutableEvidence.descriptor.close();
    }
    if (finalPathDescriptor !== null) await finalPathDescriptor.close();
    if (createdReceiptDescriptor !== null) await createdReceiptDescriptor.close();
    if (directory !== null) await directory.close();
    if (starshipRootDirectory !== null) await starshipRootDirectory.close();
  }
}

export async function writeImmutableReceiptProbeForUntrustedTestOnly(
  receiptPath,
  bytes,
  testHooks = {},
) {
  if (typeof receiptPath !== "string" || !path.isAbsolute(receiptPath)) {
    throw new Error("untrusted immutable seal probe path must be absolute.");
  }
  const resolvedProbePath = path.resolve(receiptPath);
  if (resolvedProbePath !== receiptPath) {
    throw new Error(
      "untrusted immutable seal probe path must use its exact canonical normalized spelling.",
    );
  }
  const resolvedProbeParent = path.dirname(resolvedProbePath);
  if (
    resolvedProbeParent === "/Volumes/Starship" ||
    !resolvedProbeParent.startsWith("/Volumes/Starship/")
  ) {
    throw new Error(
      "untrusted immutable seal probe parent must be strictly below /Volumes/Starship.",
    );
  }
  if (
    !path.basename(resolvedProbePath).startsWith(".untrusted-parent-seal-probe-") ||
    !Buffer.isBuffer(bytes)
  ) {
    throw new Error("untrusted immutable seal probe requires its reserved basename and Buffer bytes.");
  }
  let canonicalProbeParent;
  try {
    canonicalProbeParent = await realpath(resolvedProbeParent);
  } catch {
    throw new Error(
      "untrusted immutable seal probe canonical parent must be strictly below /Volumes/Starship and contain no symlink.",
    );
  }
  if (
    canonicalProbeParent !== resolvedProbeParent ||
    canonicalProbeParent === "/Volumes/Starship" ||
    !canonicalProbeParent.startsWith("/Volumes/Starship/")
  ) {
    throw new Error(
      "untrusted immutable seal probe canonical parent must be strictly below /Volumes/Starship and contain no symlink.",
    );
  }
  const artifact = await writeImmutableReceiptNative(
    resolvedProbePath,
    bytes,
    testHooks,
  );
  return deepFreeze({
    artifact,
    releaseReady: false,
    status: "injected-untrusted-test-seam",
  });
}

async function writeMainlandFocusedSupervisedReleaseReceipt(
  invocationEnvelope,
  outerExit,
  outerSupervisor,
  authority,
) {
  if (authority !== finalReleaseWriterAuthority) {
    throw new Error("final release writer requires private same-process execution authority.");
  }
  const validated = await validateMainlandFocusedSupervisedRelease(
    invocationEnvelope,
    outerExit,
  );
  if (!sameJson(
    outerSupervisor.environment,
    invocationEnvelope.plannedOuterEnvironment,
  )) {
    throw new Error(
      "same-process outer supervisor environment does not match the invocation plan.",
    );
  }
  if (
    validated.status !== "blocked" ||
    validated.releaseReady !== false ||
    validated.runtimeSourceExecutionHold?.serializedEvidencePresent !== false ||
    validated.runtimeSourceExecutionHold?.status !==
      "blocked-missing-full-run-runtime-source-hold"
  ) {
    throw new Error("native release validator returned an unsupported runtime-source hold state.");
  }
  const error = new Error(
    "native release is blocked: the runner does not serialize continuous held-descriptor source evidence through Playwright child exit.",
  );
  error.releaseReady = false;
  error.status = "blocked-missing-full-run-runtime-source-hold";
  throw error;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/validate-mainland-focused-supervised-release.mjs --repository-root /Volumes/Starship/... --run-id <id> --intended-port <port>",
    "",
    "This process builds and spawns the exact outer supervisor, awaits its real exit,",
    "then validates live evidence; final sealing remains blocked until the inner runner",
    "serializes continuous held-descriptor runtime-source evidence through child exit.",
    "It does not accept caller-authored invocation or outer-exit JSON.",
  ].join("\n");
}

function parseCliOptions(argv) {
  if (
    argv.length === 2 &&
    argv.every((value) => !value.startsWith("--"))
  ) {
    throw new Error(
      `This CLI does not accept caller-authored invocation or outer-exit JSON.\n${usage()}`,
    );
  }
  if (argv.length !== 6) throw new Error(usage());
  const entries = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (
      !["--repository-root", "--run-id", "--intended-port"].includes(name) ||
      entries.has(name)
    ) {
      throw new Error(usage());
    }
    entries.set(name, argv[index + 1]);
  }
  if (entries.size !== 3) throw new Error(usage());
  return {
    intendedPort: Number(entries.get("--intended-port")),
    repositoryRoot: entries.get("--repository-root"),
    runId: entries.get("--run-id"),
  };
}

async function main(argv) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const result = await executeMainlandFocusedSupervisedRelease(
    parseCliOptions(argv),
  );
  process.stdout.write(`${JSON.stringify({
    artifact: result.artifact,
    contract: result.receipt.contract,
    status: result.receipt.status,
  }, null, 2)}\n`);
}

const invokedAsMain = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedAsMain) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
