#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateChinaVisualizationStateBudgetManifest } from "../tests/e2e/china-visualization-state-budget.mjs";
import {
  assertStarshipE2eEnvironment,
  assertStarshipPath,
  buildStarshipE2ePathManifest,
  monitorStarshipBrowserProcesses,
  validateStarshipE2ePathManifest
} from "./starship-e2e-path-gate.mjs";

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");

const languages = ["en", "zh-Hans"];
const themes = ["light", "dark"];
const viewports = ["390x844", "768x1024", "1440x1100"];

export const CHINA_VISUALIZATION_RELEASE_CONTRACT = Object.freeze({
  axes: Object.freeze(
    languages.flatMap((language) =>
      themes.flatMap((theme) =>
        viewports.map((viewport) => Object.freeze({
          id: `${language}-${theme}-${viewport}`,
          language,
          theme,
          viewport
        }))
      )
    )
  ),
  canonicalProject: "desktop-chrome",
  expected: Object.freeze({
    axisCount: 12,
    catalogLabCount: 335,
    dedicatedGroupCount: 7,
    dedicatedLabCountPerAxis: 34,
    genericLabCountPerAxis: 301,
    genericPackageCountPerAxis: 66,
    totalCatalogLabCells: 4_020,
    totalDedicatedLabCells: 408,
    totalGenericLabCells: 3_612,
    totalGenericPackageTests: 792
  }),
  spec: "tests/e2e/china-visualization-labs.spec.ts"
});

const forbiddenAnnotationTypes = new Set(["fail", "fixme", "skip"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedFile(value) {
  const normalized = String(value ?? "").replaceAll("\\", "/");
  const testsIndex = normalized.lastIndexOf("tests/e2e/");
  return testsIndex >= 0 ? normalized.slice(testsIndex) : normalized;
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function sameStringArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const dedicatedGroupCounts = Object.freeze({
  G01: 9,
  G02: 4,
  G03: 6,
  G04: 5,
  G05: 2,
  G06: 1,
  G07: 7
});
const dedicatedReceiptBindings = Object.freeze([
  "validatorSource",
  "validatedArtifact",
  "supervisorReceipt",
  "outerExitReceipt"
]);

export const CHINA_VISUALIZATION_DEDICATED_VALIDATOR_COVERAGE = Object.freeze({
  requiredGroupEvidence: Object.freeze(
    Object.keys(dedicatedGroupCounts).map((groupId) => Object.freeze({
      groupId,
      receiptBindings: dedicatedReceiptBindings
    }))
  ),
  status: "unavailable",
  unavailableGroupIds: Object.freeze(["G01", "G02", "G07"])
});

function formatErrors(errors) {
  const visible = errors.slice(0, 100);
  const omitted = errors.length - visible.length;
  return `China Visualization release evidence rejected with ${errors.length} violation(s):\n`
    + visible.map((error) => `- ${error}`).join("\n")
    + (omitted > 0 ? `\n- ... ${omitted} additional violation(s) omitted.` : "");
}

export function assertNoInheritedChinaVizOverrides(environment = process.env) {
  const inheritedNames = Object.keys(environment)
    .filter((name) => name.startsWith("CHINA_VIZ_") && environment[name] !== undefined)
    .sort();
  if (inheritedNames.length > 0) {
    throw new Error(
      "The canonical China Visualization release gate rejects every inherited CHINA_VIZ_* override. "
      + `Unset these variables and run again: ${inheritedNames.join(", ")}.`
    );
  }
}

export function buildCanonicalChinaVisualizationEnvironment({
  axis,
  axisIndex,
  baseEnvironment = process.env,
  jsonReportPath,
  repositoryRoot = defaultRepositoryRoot,
  runId
}) {
  assertNoInheritedChinaVizOverrides(baseEnvironment);
  const canonicalRepositoryRoot = assertStarshipPath("repositoryRoot", repositoryRoot);
  const canonicalJsonReportPath = assertStarshipPath("PLAYWRIGHT_JSON_OUTPUT_FILE", jsonReportPath);
  const axisRunId = `${runId}-${axis.id}`;
  const pathManifest = buildStarshipE2ePathManifest({
    repositoryRoot: canonicalRepositoryRoot,
    runId: axisRunId
  });
  const removedNames = new Set([
    "HK_MATH_DB_PATH",
    "NEXT_TELEMETRY_DISABLED",
    "NODE_COMPILE_CACHE",
    "npm_config_cache",
    "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_TEMP_DIR",
    "PLAYWRIGHT_BASE_URL",
    "PLAYWRIGHT_BROWSER_CHANNEL",
    "PLAYWRIGHT_CRASH_DUMP_DIR",
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
    "PLAYWRIGHT_HTML_OUTPUT_DIR",
    "PLAYWRIGHT_JUNIT_OUTPUT_DIR",
    "PLAYWRIGHT_JUNIT_OUTPUT_FILE",
    "PLAYWRIGHT_BLOB_OUTPUT_DIR",
    "PLAYWRIGHT_BLOB_OUTPUT_FILE",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_PATH_MANIFEST_PATH",
    "PLAYWRIGHT_PORT",
    "PLAYWRIGHT_REPORT_DIR",
    "PLAYWRIGHT_RUN_ID",
    "PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH",
    "PLAYWRIGHT_SERVER_LOG_PATH",
    "PLAYWRIGHT_SKIP_WEBSERVER",
    "PLAYWRIGHT_STARSHIP_PRELAUNCH",
    "TEMP",
    "TMP",
    "TMPDIR"
  ]);
  const childEnvironment = Object.fromEntries(
    Object.entries(baseEnvironment).filter(([name]) =>
      !name.startsWith("CHINA_VIZ_") && !removedNames.has(name)
    )
  );
  return {
    ...childEnvironment,
    CHINA_VIZ_LANGUAGE: axis.language,
    CHINA_VIZ_SHARD_INDEX: "0",
    CHINA_VIZ_SHARD_TOTAL: "1",
    CHINA_VIZ_THEME: axis.theme,
    CHINA_VIZ_VIEWPORT: axis.viewport,
    HK_MATH_DB_PATH: pathManifest.paths.databasePath,
    NEXT_TELEMETRY_DISABLED: "1",
    NODE_COMPILE_CACHE: pathManifest.paths.nodeCompileCacheDir,
    npm_config_cache: pathManifest.paths.npmCacheDir,
    npm_config_update_notifier: "false",
    PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH: pathManifest.paths.browserProfileEvidencePath,
    PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH: pathManifest.paths.browserProcessEvidencePath,
    PLAYWRIGHT_BROWSER_TEMP_DIR: pathManifest.paths.browserTempDir,
    PLAYWRIGHT_BROWSER_CHANNEL: "chrome",
    PLAYWRIGHT_CRASH_DUMP_DIR: pathManifest.paths.crashDumpDir,
    PLAYWRIGHT_E2E_ROOT: pathManifest.paths.e2eRunRoot,
    PLAYWRIGHT_JSON_OUTPUT_FILE: canonicalJsonReportPath,
    PLAYWRIGHT_NEXT_DIST_DIR: pathManifest.paths.nextDistDir,
    PLAYWRIGHT_NEXT_TSCONFIG_PATH: pathManifest.paths.nextTsconfigPath,
    PLAYWRIGHT_OUTPUT_DIR: pathManifest.paths.outputDir,
    PLAYWRIGHT_PATH_MANIFEST_PATH: pathManifest.paths.pathManifestPath,
    PLAYWRIGHT_PORT: String(31_220 + axisIndex),
    PLAYWRIGHT_REPORT_DIR: pathManifest.paths.reportDir,
    PLAYWRIGHT_RUN_ID: axisRunId,
    PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH: pathManifest.paths.serverCommandOwnerPidPath,
    PLAYWRIGHT_SERVER_LOG_PATH: pathManifest.paths.serverLogPath,
    PLAYWRIGHT_STARSHIP_PRELAUNCH: "1",
    TEMP: pathManifest.paths.browserTempDir,
    TMP: pathManifest.paths.browserTempDir,
    TMPDIR: pathManifest.paths.browserTempDir
  };
}

export function buildCanonicalChinaVisualizationInvocation(repositoryRoot = defaultRepositoryRoot) {
  const canonicalRepositoryRoot = assertStarshipPath("repositoryRoot", repositoryRoot);
  const playwrightCli = require.resolve("@playwright/test/cli");
  return Object.freeze({
    args: Object.freeze([
      playwrightCli,
      "test",
      CHINA_VISUALIZATION_RELEASE_CONTRACT.spec,
      `--project=${CHINA_VISUALIZATION_RELEASE_CONTRACT.canonicalProject}`,
      "--workers=1",
      "--retries=0",
      "--reporter=list,json"
    ]),
    command: process.execPath,
    cwd: canonicalRepositoryRoot
  });
}

function flattenReportSpecs(report) {
  const flattened = [];
  const visit = (suite) => {
    if (!isRecord(suite)) return;
    for (const spec of arrayOf(suite.specs)) {
      if (!isRecord(spec)) continue;
      flattened.push({ ...spec, file: normalizedFile(spec.file ?? suite.file) });
    }
    for (const nested of arrayOf(suite.suites)) visit(nested);
  };
  for (const suite of arrayOf(report?.suites)) visit(suite);
  return flattened;
}

async function decodeJsonAttachment(attachment, reportPath) {
  let source;
  if (typeof attachment.body === "string") {
    source = Buffer.from(attachment.body, "base64").toString("utf8");
  } else if (typeof attachment.path === "string" && attachment.path.length > 0) {
    const attachmentPath = isAbsolute(attachment.path)
      ? attachment.path
      : resolve(dirname(reportPath), attachment.path);
    source = await readFile(attachmentPath, "utf8");
  } else {
    throw new Error("attachment has neither an inline body nor a readable path");
  }
  return JSON.parse(source);
}

function validateTelemetryEvidence(data, axis, addError) {
  if (!isRecord(data)) {
    addError("telemetry attachment is not an object");
    return;
  }
  if (data.language !== axis.language || data.theme !== axis.theme) {
    addError(`telemetry attachment axis mismatch for ${String(data.packageId)}.`);
  }
  if (data.viewport !== axis.viewport) {
    addError(`telemetry attachment viewport mismatch for ${String(data.packageId)}.`);
  }
  if (typeof data.packageId !== "string" || data.packageId.length === 0) {
    addError("telemetry attachment has no packageId");
  }
  const summary = arrayOf(data.summary);
  const requiredPaths = new Set([
    "/api/learning-events",
    "/api/visualization-sessions"
  ]);
  for (const entry of summary) {
    if (!isRecord(entry)) continue;
    if (typeof entry.path === "string" && Number(entry.count) > 0) {
      requiredPaths.delete(entry.path);
    }
    if (entry.failed !== 0) {
      addError(`${String(data.packageId)} telemetry ${String(entry.path)} reports failed=${String(entry.failed)}.`);
    }
    if (!Number.isFinite(entry.maxMs) || !Number.isFinite(entry.p95Ms)) {
      addError(`${String(data.packageId)} telemetry ${String(entry.path)} has non-numeric duration evidence.`);
    }
    if (Number(entry.maxMs) > 4_000 || Number(entry.p95Ms) > 4_000) {
      addError(`${String(data.packageId)} telemetry ${String(entry.path)} exceeded the 4000ms terminal bound.`);
    }
  }
  if (requiredPaths.size > 0) {
    addError(
      `${String(data.packageId)} lacks positive terminal telemetry evidence for ${[...requiredPaths].join(", ")}.`
    );
  }
  if (!Array.isArray(data.timings)) {
    addError(`${String(data.packageId)} telemetry attachment has no raw timings array.`);
  } else if (data.timings.length === 0) {
    addError(`${String(data.packageId)} telemetry attachment has an empty raw timings array.`);
  } else {
    for (const timing of data.timings) {
      if (!isRecord(timing)) continue;
      if (timing.outcome !== "finished" || Number(timing.status) !== 200) {
        addError(
          `${String(data.packageId)} raw telemetry contains non-terminal evidence outcome=${String(timing.outcome)} status=${String(timing.status)}.`
        );
      }
    }
  }
}

function validateReleasePartitionEvidence(ledger, plannedLabIds, addError) {
  const catalogLabIds = arrayOf(ledger.catalogLabIds).map(String);
  const genericLabIds = arrayOf(ledger.genericLabIds).map(String);
  const dedicatedLabIds = arrayOf(ledger.dedicatedLabIds).map(String);
  const groupManifests = arrayOf(ledger.dedicatedGroupManifests);
  const catalogLabIdSet = new Set(catalogLabIds);
  const genericLabIdSet = new Set(genericLabIds);
  const dedicatedLabIdSet = new Set(dedicatedLabIds);
  const expectedGroupIds = Object.keys(dedicatedGroupCounts);

  if (
    catalogLabIds.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.catalogLabCount ||
    duplicateValues(catalogLabIds).length > 0
  ) {
    addError("release partition catalog must contain exactly 335 unique Lab IDs.");
  }
  if (
    genericLabIds.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericLabCountPerAxis ||
    duplicateValues(genericLabIds).length > 0 ||
    !sameStringArray(genericLabIds, plannedLabIds)
  ) {
    addError("release partition generic plan must be the exact ordered generic301 ledger.");
  }
  if (
    dedicatedLabIds.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.dedicatedLabCountPerAxis ||
    duplicateValues(dedicatedLabIds).length > 0
  ) {
    addError("release partition dedicated plan must contain exactly 34 unique Lab IDs.");
  }

  const observedGroupIds = groupManifests.map((manifest) => String(manifest?.groupId ?? ""));
  if (
    groupManifests.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.dedicatedGroupCount ||
    duplicateValues(observedGroupIds).length > 0 ||
    !sameStringArray(observedGroupIds, expectedGroupIds)
  ) {
    addError("release partition dedicated groups must be ordered exactly G01-G07.");
  }
  const groupedDedicatedLabIds = [];
  for (const manifest of groupManifests) {
    const groupId = String(manifest?.groupId ?? "");
    const labIds = arrayOf(manifest?.labIds).map(String);
    if (labIds.length !== dedicatedGroupCounts[groupId]) {
      addError(
        `${groupId || "unknown group"} must own exactly ${String(dedicatedGroupCounts[groupId])} dedicated Lab IDs; actual=${labIds.length}.`
      );
    }
    if (duplicateValues(labIds).length > 0) {
      addError(`${groupId || "unknown group"} dedicated Lab IDs are duplicated.`);
    }
    groupedDedicatedLabIds.push(...labIds);
  }
  if (!sameStringArray(groupedDedicatedLabIds, dedicatedLabIds)) {
    addError("G01-G07 group manifests do not concatenate to the exact dedicated34 order.");
  }

  const overlap = genericLabIds.filter((labId) => dedicatedLabIdSet.has(labId));
  const union = [...genericLabIds, ...dedicatedLabIds];
  const missing = catalogLabIds.filter((labId) => !union.includes(labId));
  const surplus = union.filter((labId) => !catalogLabIdSet.has(labId));
  if (
    overlap.length > 0 ||
    union.length !== catalogLabIds.length ||
    new Set(union).size !== catalogLabIdSet.size ||
    missing.length > 0 ||
    surplus.length > 0
  ) {
    addError(
      `generic301 and dedicated34 must be a disjoint exact catalog335 union; overlap=${overlap.join(",")} missing=${missing.join(",")} surplus=${surplus.join(",")}.`
    );
  }
  if (genericLabIdSet.size !== genericLabIds.length || dedicatedLabIdSet.size !== dedicatedLabIds.length) {
    addError("release partition contains duplicate generic or dedicated Lab IDs.");
  }

  const partitionPlan = [
    ...genericLabIds.map((labId) => `generic:${labId}`),
    ...groupManifests.flatMap((manifest) =>
      arrayOf(manifest?.labIds).map((labId) => `${String(manifest?.groupId)}:${String(labId)}`)
    )
  ];
  if (
    ledger.genericLabIdsSha256 !== sha256Json(genericLabIds) ||
    ledger.dedicatedLabIdsSha256 !== sha256Json(dedicatedLabIds) ||
    ledger.catalogPartitionSha256 !== sha256Json(partitionPlan)
  ) {
    addError("release partition Lab-ID or catalog partition hashes drifted.");
  }

  return {
    catalogLabIds,
    dedicatedGroupManifests: groupManifests.map((manifest) => ({
      groupId: String(manifest?.groupId ?? ""),
      labIds: arrayOf(manifest?.labIds).map(String)
    })),
    dedicatedLabIds,
    genericLabIds,
    partitionSha256: String(ledger.catalogPartitionSha256 ?? "")
  };
}

export async function validateChinaVisualizationPlaywrightReport(
  report,
  reportPath,
  axis,
  expectedLabIds = null,
  expectedStateIds = null
) {
  const errors = [];
  const addError = (message) => errors.push(`${axis.id}: ${message}`);
  const specs = flattenReportSpecs(report);
  if (specs.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis) {
    addError(
      `expected ${CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis} generic package tests, found ${specs.length}.`
    );
  }
  const attachments = [];

  for (const spec of specs) {
    if (spec.file !== CHINA_VISUALIZATION_RELEASE_CONTRACT.spec) {
      addError(`unexpected spec file ${spec.file}.`);
    }
    const tests = arrayOf(spec.tests);
    if (tests.length !== 1) {
      addError(`${spec.title} must contain exactly one canonical-project test; actual=${tests.length}.`);
    }
    for (const test of tests) {
      if (!isRecord(test)) continue;
      if (test.projectName !== CHINA_VISUALIZATION_RELEASE_CONTRACT.canonicalProject) {
        addError(`${spec.title} ran in ${String(test.projectName)}.`);
      }
      if (test.expectedStatus !== "passed" || test.status !== "expected") {
        addError(`${spec.title} was not an expected pass.`);
      }
      const results = arrayOf(test.results);
      if (results.length !== 1) {
        addError(`${spec.title} has ${results.length} results; retries/shards are forbidden.`);
      }
      const annotations = [...arrayOf(test.annotations)];
      for (const result of results) {
        if (!isRecord(result)) continue;
        annotations.push(...arrayOf(result.annotations));
        if (result.status !== "passed" || result.retry !== 0) {
          addError(`${spec.title} result=${String(result.status)} retry=${String(result.retry)}.`);
        }
        for (const attachment of arrayOf(result.attachments)) {
          if (!isRecord(attachment)) continue;
          if (attachment.contentType !== "application/json" && !String(attachment.name).endsWith(".json")) continue;
          try {
            attachments.push({
              data: await decodeJsonAttachment(attachment, reportPath),
              name: String(attachment.name ?? "")
            });
          } catch (error) {
            addError(`${spec.title} attachment ${String(attachment.name)} is unreadable: ${String(error)}.`);
          }
        }
      }
      for (const annotation of annotations) {
        if (forbiddenAnnotationTypes.has(String(annotation?.type))) {
          addError(`${spec.title} used forbidden annotation ${String(annotation?.type)}.`);
        }
      }
    }
  }

  const ledgers = attachments.filter(({ name }) => name.startsWith("china-viz-run-ledger-") && name.endsWith(".json"));
  if (ledgers.length !== 1) addError(`expected exactly one run ledger, found ${ledgers.length}.`);
  const telemetry = attachments.filter(({ name }) => name.startsWith("china-viz-telemetry-") && name.endsWith(".json"));
  if (telemetry.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis) {
    addError(
      `expected ${CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis} generic telemetry attachments, found ${telemetry.length}.`
    );
  }
  telemetry.forEach(({ data }) => validateTelemetryEvidence(data, axis, addError));
  const telemetryPackageIds = telemetry
    .map(({ data }) => isRecord(data) ? String(data.packageId ?? "") : "")
    .filter(Boolean);
  if (duplicateValues(telemetryPackageIds).length > 0) {
    addError("telemetry package IDs are duplicated.");
  }

  const ledger = ledgers[0]?.data;
  let labIds = [];
  let stateIds = [];
  let partition = null;
  if (isRecord(ledger)) {
    const plannedLabIds = arrayOf(ledger.plannedLabIds).map(String);
    const executedLabIds = arrayOf(ledger.executedLabIds).map(String);
    const plannedPackageIds = arrayOf(ledger.plannedPackageIds).map(String);
    const executedPackageIds = arrayOf(ledger.executedPackageIds).map(String);
    const plannedStateIds = arrayOf(ledger.plannedStateIds).map(String);
    const executedStateIds = arrayOf(ledger.executedStateIds).map(String);
    const rangeStateExecutionMismatches = arrayOf(ledger.rangeStateExecutionMismatches);
    const unobservedStateIds = arrayOf(ledger.unobservedStateIds).map(String);
    labIds = plannedLabIds;
    stateIds = plannedStateIds;
    if (
      ledger.language !== axis.language ||
      ledger.theme !== axis.theme ||
      ledger.viewport !== axis.viewport ||
      ledger.scope !== "generic301" ||
      ledger.releaseAcceptance !== true ||
      ledger.shardIndex !== 0 ||
      ledger.shardTotal !== 1
    ) {
      addError("run ledger is not the exact generic301 unsharded requested axis.");
    }
    if (
      plannedLabIds.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericLabCountPerAxis ||
      duplicateValues(plannedLabIds).length > 0 ||
      !sameStringArray(executedLabIds, plannedLabIds)
    ) {
      addError("run ledger does not execute all 301 planned generic Lab IDs exactly once in order.");
    }
    if (
      plannedPackageIds.length !== CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis ||
      duplicateValues(plannedPackageIds).length > 0 ||
      !sameStringArray(executedPackageIds, plannedPackageIds)
    ) {
      addError("run ledger does not execute all 66 planned generic package IDs exactly once in order.");
    }
    partition = validateReleasePartitionEvidence(ledger, plannedLabIds, addError);
    const malformedStateReceipts = [];
    const receiptStatesByLab = new Map(plannedLabIds.map((labId) => [labId, []]));
    for (const receipt of plannedStateIds) {
      try {
        const parsed = JSON.parse(receipt);
        if (
          !Array.isArray(parsed) ||
          parsed.length !== 2 ||
          typeof parsed[0] !== "string" ||
          typeof parsed[1] !== "string" ||
          !receiptStatesByLab.has(parsed[0]) ||
          parsed[1].length === 0
        ) {
          malformedStateReceipts.push(receipt);
          continue;
        }
        receiptStatesByLab.get(parsed[0]).push(parsed[1]);
      } catch {
        malformedStateReceipts.push(receipt);
      }
    }
    if (
      ledger.rangeStateExecutionSchemaVersion !== 1 ||
      rangeStateExecutionMismatches.length > 0 ||
      unobservedStateIds.length > 0
    ) {
      addError(
        "run ledger contains a requested/expected/observed range-state mismatch, an unobserved state, or an unsupported state-execution schema."
      );
    }
    for (const budgetError of validateChinaVisualizationStateBudgetManifest({
      manifest: ledger.stateBudgetManifest,
      plannedLabIds,
      plannedPackageIds,
      plannedStateIds
    })) {
      addError(`state-budget manifest: ${budgetError}.`);
    }
    if (
      plannedStateIds.length === 0 ||
      duplicateValues(plannedStateIds).length > 0 ||
      malformedStateReceipts.length > 0 ||
      !sameStringArray(executedStateIds, plannedStateIds)
    ) {
      addError(
        "run ledger does not execute its unique declared strand/mode/control-endpoint/reset state plan exactly once in order."
      );
    }
    for (const [labId, states] of receiptStatesByLab) {
      if (
        states.filter((state) => state === "default").length !== 1 ||
        states.filter((state) => state === "reset").length !== 1 ||
        !states.some((state) => state.includes("/range="))
      ) {
        addError(`${labId} state ledger lacks an exact default, reset, or declared slider endpoint receipt.`);
      }
    }
    if (
      telemetryPackageIds.length !== plannedPackageIds.length ||
      telemetryPackageIds.some((packageId) => !plannedPackageIds.includes(packageId))
    ) {
      addError("telemetry receipts do not map one-to-one to the 66 planned generic package IDs.");
    }
    if (expectedLabIds && !sameStringArray(plannedLabIds, expectedLabIds)) {
      addError("Lab ID order/set differs from the first canonical axis.");
    }
    if (expectedStateIds && !sameStringArray(plannedStateIds, expectedStateIds)) {
      addError("Declared strand/mode/control-endpoint/reset state order/set differs from the first canonical axis.");
    }
  } else {
    addError("run ledger is missing or malformed.");
  }

  if (errors.length > 0) throw new Error(formatErrors(errors));
  return {
    axis,
    labIds,
    packageTests: specs.length,
    partition,
    stateIds,
    telemetryPackages: telemetry.length
  };
}

export async function validateChinaVisualizationPlaywrightReportFile(
  reportPath,
  axis,
  expectedLabIds = null,
  expectedStateIds = null
) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  return validateChinaVisualizationPlaywrightReport(
    report,
    reportPath,
    axis,
    expectedLabIds,
    expectedStateIds
  );
}

async function runChild(command, args, options, {
  browserProcessEvidencePath,
  browserTempDir,
  minimumDistinctProfiles = 2
}) {
  const canonicalBrowserProcessEvidencePath = assertStarshipPath(
    "browserProcessEvidencePath",
    browserProcessEvidencePath
  );
  await mkdir(dirname(canonicalBrowserProcessEvidencePath), { recursive: true });
  const child = spawn(command, args, options);
  let childComplete = false;
  const monitorPromise = Number.isInteger(child.pid)
    ? monitorStarshipBrowserProcesses({
        ancestorPid: child.pid,
        expectedBrowserTempDir: browserTempDir,
        isComplete: () => childComplete,
        minimumDistinctProfiles
      })
    : Promise.reject(new Error("Playwright child process exposed no numeric PID."));
  const childOutcome = await new Promise((resolvePromise) => {
    child.once("error", (error) => {
      childComplete = true;
      resolvePromise({ error });
    });
    child.once("exit", (code, signal) => {
      childComplete = true;
      resolvePromise({ code, signal });
    });
  });
  let browserProcessEvidence;
  let monitorError = null;
  try {
    browserProcessEvidence = await monitorPromise;
  } catch (error) {
    monitorError = error;
    browserProcessEvidence = error && typeof error === "object" && error.evidence
      ? error.evidence
      : {
          ancestorPid: child.pid ?? null,
          schemaVersion: 1,
          status: "failed",
          violation: error instanceof Error ? error.message : String(error)
        };
  }
  await writeFile(
    canonicalBrowserProcessEvidencePath,
    `${JSON.stringify(browserProcessEvidence, null, 2)}\n`,
    "utf8"
  );
  if (childOutcome.error) throw childOutcome.error;
  if (childOutcome.signal) {
    throw new Error(`Playwright was terminated by signal ${childOutcome.signal}.`);
  }
  if (monitorError) throw monitorError;
  return childOutcome.code ?? 1;
}

function releaseRunId() {
  return `china-viz-release-${new Date().toISOString().replace(/[^0-9TZ]/g, "")}-${process.pid}`;
}

export async function validateCanonicalStarshipAxisPathEvidence(environment, repositoryRoot) {
  const canonicalRepositoryRoot = assertStarshipPath("repositoryRoot", repositoryRoot);
  const expectedManifest = buildStarshipE2ePathManifest({
    repositoryRoot: canonicalRepositoryRoot,
    runId: environment.PLAYWRIGHT_RUN_ID,
    overrides: {
      browserProfileEvidencePath: environment.PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH,
      browserProcessEvidencePath: environment.PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH,
      browserTempDir: environment.PLAYWRIGHT_BROWSER_TEMP_DIR,
      crashDumpDir: environment.PLAYWRIGHT_CRASH_DUMP_DIR,
      databasePath: environment.HK_MATH_DB_PATH,
      e2eRunRoot: environment.PLAYWRIGHT_E2E_ROOT,
      nextDistDir: environment.PLAYWRIGHT_NEXT_DIST_DIR,
      nextTsconfigPath: environment.PLAYWRIGHT_NEXT_TSCONFIG_PATH,
      nodeCompileCacheDir: environment.NODE_COMPILE_CACHE,
      npmCacheDir: environment.npm_config_cache,
      outputDir: environment.PLAYWRIGHT_OUTPUT_DIR,
      pathManifestPath: environment.PLAYWRIGHT_PATH_MANIFEST_PATH,
      reportDir: environment.PLAYWRIGHT_REPORT_DIR,
      serverCommandOwnerPidPath: environment.PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH,
      serverLogPath: environment.PLAYWRIGHT_SERVER_LOG_PATH
    }
  });
  assertStarshipE2eEnvironment(
    environment,
    expectedManifest.paths.browserTempDir,
    expectedManifest.paths.nodeCompileCacheDir,
    expectedManifest.paths.npmCacheDir
  );
  const jsonReportPath = assertStarshipPath(
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
    environment.PLAYWRIGHT_JSON_OUTPUT_FILE
  );
  const manifestPath = expectedManifest.paths.pathManifestPath;
  const browserEvidencePath = expectedManifest.paths.browserProfileEvidencePath;
  const browserProcessEvidencePath = expectedManifest.paths.browserProcessEvidencePath;
  if (!existsSync(manifestPath)) {
    throw new Error(`Starship path manifest was not produced: ${manifestPath}.`);
  }
  if (!existsSync(browserEvidencePath)) {
    throw new Error(`Actual Chrome profile evidence was not produced: ${browserEvidencePath}.`);
  }
  if (!existsSync(browserProcessEvidencePath)) {
    throw new Error(
      `Actual Playwright browser-process evidence was not produced: ${browserProcessEvidencePath}.`
    );
  }
  for (const [label, artifactPath] of [
    ["browserProcessEvidencePath", browserProcessEvidencePath],
    ["browserTempDir", expectedManifest.paths.browserTempDir],
    ["crashDumpDir", expectedManifest.paths.crashDumpDir],
    ["databasePath", expectedManifest.paths.databasePath],
    ["e2eRunRoot", expectedManifest.paths.e2eRunRoot],
    ["nextDistDir", expectedManifest.paths.nextDistDir],
    ["nodeCompileCacheDir", expectedManifest.paths.nodeCompileCacheDir],
    ["npmCacheDir", expectedManifest.paths.npmCacheDir],
    ["outputDir", expectedManifest.paths.outputDir],
    ["reportDir", expectedManifest.paths.reportDir],
    ["serverCommandOwnerPidPath", expectedManifest.paths.serverCommandOwnerPidPath],
    ["serverLogPath", expectedManifest.paths.serverLogPath],
    ["jsonReportPath", jsonReportPath]
  ]) {
    if (!existsSync(artifactPath)) {
      throw new Error(`Required Starship E2E artifact ${label} is missing: ${artifactPath}.`);
    }
  }
  const actualManifest = validateStarshipE2ePathManifest(
    JSON.parse(await readFile(manifestPath, "utf8"))
  );
  for (const [label, expectedPath] of Object.entries(expectedManifest.paths)) {
    if (actualManifest.paths[label] !== expectedPath) {
      throw new Error(
        `Starship path manifest drift for ${label}; expected=${expectedPath} actual=${String(actualManifest.paths[label])}.`
      );
    }
  }
  if (actualManifest.process?.cwd !== canonicalRepositoryRoot) {
    throw new Error(
      `Playwright config cwd drifted from the Starship worktree; actual=${String(actualManifest.process?.cwd)}.`
    );
  }
  if (actualManifest.externalEvidencePaths?.jsonReportPath !== jsonReportPath) {
    throw new Error("Playwright config did not bind the canonical JSON evidence path.");
  }
  const browserEvidence = JSON.parse(await readFile(browserEvidencePath, "utf8"));
  if (browserEvidence.status !== "passed" || browserEvidence.schemaVersion !== 1) {
    throw new Error("Actual Chrome profile evidence is missing a passing schema-v1 receipt.");
  }
  if (browserEvidence.pathManifestPath !== manifestPath) {
    throw new Error("Actual Chrome profile evidence points at a different path manifest.");
  }
  assertStarshipE2eEnvironment(
    {
      PLAYWRIGHT_STARSHIP_PRELAUNCH: environment.PLAYWRIGHT_STARSHIP_PRELAUNCH,
      ...browserEvidence.environment
    },
    expectedManifest.paths.browserTempDir,
    expectedManifest.paths.nodeCompileCacheDir,
    expectedManifest.paths.npmCacheDir
  );
  const actualUserDataDir = assertStarshipPath(
    "actual Chrome --user-data-dir",
    browserEvidence.observed?.userDataDir
  );
  if (!actualUserDataDir.startsWith(`${expectedManifest.paths.browserTempDir}/`)) {
    throw new Error(
      `Actual Chrome --user-data-dir escaped browserTempDir; actual=${actualUserDataDir}.`
    );
  }
  const observedMutablePaths = Array.isArray(browserEvidence.observed?.mutablePaths)
    ? browserEvidence.observed.mutablePaths
    : [];
  if (!observedMutablePaths.some((entry) => entry?.flag === "crash-dumps-dir")) {
    throw new Error("Actual Chrome profile evidence has no --crash-dumps-dir receipt.");
  }
  for (const entry of observedMutablePaths) {
    assertStarshipPath(`actual Chrome --${String(entry?.flag)}`, entry?.path);
  }
  if (
    browserEvidence.browserCommandAudit?.crashpadDatabaseFlagIsFailClosedWhenSpawnedInBrowserTree !== true ||
    browserEvidence.browserCommandAudit?.immutableExecutablePathsExcludedFromMutableArtifactClassification !== true
  ) {
    throw new Error("Actual Chrome evidence does not distinguish immutable executables from fail-closed mutable flags.");
  }
  const projectFixtureInheritance = Array.isArray(browserEvidence.projectFixtureInheritance)
    ? browserEvidence.projectFixtureInheritance
    : [];
  if (
    projectFixtureInheritance.length === 0 ||
    projectFixtureInheritance.some((entry) =>
      entry?.channel !== "chrome" ||
      entry?.workerTempEnvironmentInheritedFromPlaywrightNode !== true ||
      !Array.isArray(entry?.launchArgs) ||
      !entry.launchArgs.includes(`--crash-dumps-dir=${expectedManifest.paths.crashDumpDir}`)
    )
  ) {
    throw new Error("Playwright project fixtures do not inherit the probed Starship launch/TMP contract.");
  }
  const browserProcessEvidence = JSON.parse(
    await readFile(browserProcessEvidencePath, "utf8")
  );
  const processObservations = Array.isArray(browserProcessEvidence.observations)
    ? browserProcessEvidence.observations
    : [];
  if (
    browserProcessEvidence.status !== "passed" ||
    browserProcessEvidence.schemaVersion !== 1 ||
    browserProcessEvidence.immutableExecutablePathsExcludedFromMutableArtifactClassification !== true ||
    browserProcessEvidence.minimumDistinctProfiles < 2 ||
    new Set(processObservations.map((entry) => entry?.userDataDir)).size < 2
  ) {
    throw new Error(
      "Actual Playwright browser-process evidence lacks two passing global-setup/test-fixture profiles."
    );
  }
  for (const observation of processObservations) {
    const userDataDir = assertStarshipPath(
      "observed Playwright fixture --user-data-dir",
      observation?.userDataDir
    );
    if (!userDataDir.startsWith(`${expectedManifest.paths.browserTempDir}/`)) {
      throw new Error(
        `Observed Playwright fixture profile escaped browserTempDir; actual=${userDataDir}.`
      );
    }
    for (const entry of Array.isArray(observation?.mutablePaths) ? observation.mutablePaths : []) {
      assertStarshipPath(
        `observed Playwright browser-tree --${String(entry?.flag)}`,
        entry?.path
      );
    }
  }
  const processMutablePathAudit = Array.isArray(browserProcessEvidence.processMutablePathAudit)
    ? browserProcessEvidence.processMutablePathAudit
    : [];
  if (!processMutablePathAudit.some((entry) => entry?.flag === "user-data-dir")) {
    throw new Error("Actual Playwright browser-process evidence has no mutable profile audit.");
  }
  for (const entry of processMutablePathAudit) {
    assertStarshipPath(
      `observed Playwright descendant --${String(entry?.flag)}`,
      entry?.path
    );
  }
  const serverCommandOwnerPid = (
    await readFile(expectedManifest.paths.serverCommandOwnerPidPath, "utf8")
  ).trim();
  if (!/^\d+$/u.test(serverCommandOwnerPid)) {
    throw new Error(
      `Server command-owner PID evidence is malformed: ${expectedManifest.paths.serverCommandOwnerPidPath}.`
    );
  }
  return {
    actualBrowserUserDataDir: actualUserDataDir,
    browserEvidencePath,
    browserProcessEvidencePath,
    jsonReportPath,
    manifestPath,
    paths: expectedManifest.paths,
    serverCommandOwnerPid: Number(serverCommandOwnerPid)
  };
}

export async function runChinaVisualizationReleaseGate({
  baseEnvironment = process.env,
  dedicatedEvidencePath,
  repositoryRoot = defaultRepositoryRoot
} = {}, {
  existsSync: pathExists = existsSync,
  readFile: readArtifact = readFile
} = {}) {
  assertNoInheritedChinaVizOverrides(baseEnvironment);
  assertStarshipPath("repositoryRoot", repositoryRoot);
  if (typeof dedicatedEvidencePath !== "string" || dedicatedEvidencePath.length === 0) {
    throw new Error(
      "China Visualization dedicated G01-G07 evidence is required before the generic301 browser matrix can run; no current dedicated evidence is implied."
    );
  }
  const canonicalDedicatedEvidencePath = assertStarshipPath(
    "dedicatedEvidencePath",
    dedicatedEvidencePath
  );
  if (!pathExists(canonicalDedicatedEvidencePath)) {
    throw new Error(
      `China Visualization dedicated G01-G07 evidence is missing: ${canonicalDedicatedEvidencePath}.`
    );
  }
  JSON.parse(String(await readArtifact(canonicalDedicatedEvidencePath, "utf8")));
  throw new Error(
    "China Visualization dedicated validator coverage unavailable for G01, G02, and G07: "
    + "no fixed producer-honest validator source, validated artifact, supervisor receipt, and outer-exit receipt bindings exist. "
    + "Syntactic dedicated JSON cannot authorize the generic301 browser matrix or catalog335 release."
  );
}

function usage() {
  return [
    "Usage:",
    "  node scripts/run-china-visualization-release-gate.mjs --dedicated-evidence /Volumes/Starship/.../supervised-dedicated-evidence.json",
    "",
    "The release path currently fails closed because dedicated validator coverage is unavailable for G01, G02, and G07.",
    "A JSON receipt alone cannot authorize the exact 12-axis generic301 Mainland matrix.",
    "Inherited CHINA_VIZ_* filters, shards, and partial-run overrides are rejected."
  ].join("\n");
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(usage());
    return;
  }
  if (argv.length !== 2 || argv[0] !== "--dedicated-evidence") {
    throw new Error(`Unknown or missing arguments.\n${usage()}`);
  }
  const result = await runChinaVisualizationReleaseGate({
    dedicatedEvidencePath: argv[1]
  });
  console.log(JSON.stringify(result, null, 2));
}

const invokedAsMain = process.argv[1]
  && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
