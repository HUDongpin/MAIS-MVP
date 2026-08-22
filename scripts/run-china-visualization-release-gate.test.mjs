import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import test from "node:test";

import {
  assertNoInheritedChinaVizOverrides,
  buildCanonicalChinaVisualizationEnvironment,
  buildCanonicalChinaVisualizationInvocation,
  CHINA_VISUALIZATION_DEDICATED_VALIDATOR_COVERAGE,
  CHINA_VISUALIZATION_RELEASE_CONTRACT,
  runChinaVisualizationReleaseGate,
  validateChinaVisualizationPlaywrightReport
} from "./run-china-visualization-release-gate.mjs";
import { buildChinaVisualizationStateBudgetManifest } from "../tests/e2e/china-visualization-state-budget.mjs";

const acceptanceSpecSource = readFileSync(
  "tests/e2e/china-visualization-labs.spec.ts",
  "utf8"
);
const releaseRunnerSource = readFileSync(
  "scripts/run-china-visualization-release-gate.mjs",
  "utf8"
);
const repositoryRoot = realpathSync("/Volumes/Starship/MAIS-china-viz-labs-wt");

function jsonAttachment(name, value) {
  return {
    body: Buffer.from(JSON.stringify(value)).toString("base64"),
    contentType: "application/json",
    name
  };
}

function canonicalReport(axis, mutate = () => {}) {
  const labIds = Array.from(
    { length: CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericLabCountPerAxis },
    (_, index) => `lab-${String(index + 1).padStart(3, "0")}`
  );
  const dedicatedLabIds = Array.from(
    { length: CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.dedicatedLabCountPerAxis },
    (_, index) => `dedicated-${String(index + 1).padStart(2, "0")}`
  );
  const catalogLabIds = [...labIds, ...dedicatedLabIds];
  const dedicatedGroupManifests = [];
  let dedicatedOffset = 0;
  for (const [groupId, count] of Object.entries({
    G01: 9,
    G02: 4,
    G03: 6,
    G04: 5,
    G05: 2,
    G06: 1,
    G07: 7
  })) {
    dedicatedGroupManifests.push({
      groupId,
      labIds: dedicatedLabIds.slice(dedicatedOffset, dedicatedOffset + count)
    });
    dedicatedOffset += count;
  }
  const partitionPlan = [
    ...labIds.map((labId) => `generic:${labId}`),
    ...dedicatedGroupManifests.flatMap(({ groupId, labIds: groupLabIds }) =>
      groupLabIds.map((labId) => `${groupId}:${labId}`)
    )
  ];
  const packageIds = Array.from(
    { length: CHINA_VISUALIZATION_RELEASE_CONTRACT.expected.genericPackageCountPerAxis },
    (_, index) => `package-${String(index + 1).padStart(2, "0")}`
  );
  const stateIds = labIds.flatMap((labId) => [
    JSON.stringify([labId, "default"]),
    JSON.stringify([labId, "direct/range=0:value=0"]),
    JSON.stringify([labId, "reset"])
  ]);
  const budgetPackages = packageIds.map((id, index) => {
    const start = Math.floor((index * labIds.length) / packageIds.length);
    const end = Math.floor(((index + 1) * labIds.length) / packageIds.length);
    const ownedLabIds = labIds.slice(start, end);
    const ownedLabIdSet = new Set(ownedLabIds);
    return {
      id,
      labIds: ownedLabIds,
      stateIds: stateIds.filter((stateId) => ownedLabIdSet.has(JSON.parse(stateId)[0]))
    };
  });
  const stateBudgetManifest = buildChinaVisualizationStateBudgetManifest(budgetPackages);
  const specs = packageIds.map((packageId, index) => {
    const attachments = [jsonAttachment(
      `china-viz-telemetry-${axis.id}-${packageId}.json`,
      {
        language: axis.language,
        packageId,
        summary: [
          { count: 1, failed: 0, maxMs: 12, p95Ms: 12, path: "/api/learning-events" },
          { count: 1, failed: 0, maxMs: 18, p95Ms: 18, path: "/api/visualization-sessions" }
        ],
        theme: axis.theme,
        timings: [
          { outcome: "finished", status: 200, url: "http://127.0.0.1/api/learning-events" },
          { outcome: "finished", status: 200, url: "http://127.0.0.1/api/visualization-sessions" }
        ],
        viewport: axis.viewport
      }
    )];
    if (index === packageIds.length - 1) {
      attachments.push(jsonAttachment(
        `china-viz-run-ledger-${axis.id}-shard-1-of-1.json`,
        {
          catalogLabIds,
          catalogPartitionSha256: sha256Json(partitionPlan),
          dedicatedGroupManifests,
          dedicatedLabIds,
          dedicatedLabIdsSha256: sha256Json(dedicatedLabIds),
          executedLabIds: labIds,
          executedPackageIds: packageIds,
          executedStateIds: stateIds,
          language: axis.language,
          plannedLabIds: labIds,
          plannedPackageIds: packageIds,
          plannedStateIds: stateIds,
          rangeStateExecutionMismatches: [],
          rangeStateExecutionSchemaVersion: 1,
          genericLabIds: labIds,
          genericLabIdsSha256: sha256Json(labIds),
          releaseAcceptance: true,
          scope: "generic301",
          shardIndex: 0,
          shardTotal: 1,
          theme: axis.theme,
          unobservedStateIds: [],
          viewport: axis.viewport,
          stateBudgetManifest
        }
      ));
    }
    return {
      file: CHINA_VISUALIZATION_RELEASE_CONTRACT.spec,
      title: packageId,
      tests: [{
        annotations: [],
        expectedStatus: "passed",
        projectName: CHINA_VISUALIZATION_RELEASE_CONTRACT.canonicalProject,
        results: [{ annotations: [], attachments, retry: 0, status: "passed" }],
        status: "expected"
      }]
    };
  });
  const report = { suites: [{ specs }] };
  mutate({
    catalogLabIds,
    dedicatedGroupManifests,
    dedicatedLabIds,
    labIds,
    packageIds,
    report,
    specs,
    stateIds
  });
  return {
    catalogLabIds,
    dedicatedGroupManifests,
    dedicatedLabIds,
    labIds,
    report,
    stateIds
  };
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalDedicatedEvidence(partition, mutate = () => {}) {
  const groups = partition.dedicatedGroupManifests.map((manifest) => {
    const stateIds = manifest.labIds.map((labId) =>
      JSON.stringify([labId, "x"])
    );
    return {
      groupId: manifest.groupId,
      labIds: [...manifest.labIds],
      labIdsSha256: sha256Json(manifest.labIds),
      receipts: CHINA_VISUALIZATION_RELEASE_CONTRACT.axes.map((axis) => ({
        axisId: axis.id,
        genericFallbackUsed: false,
        labIds: [...manifest.labIds],
        producerKind: "dedicated",
        stateIds: [...stateIds],
        statePlanSha256: sha256Json(stateIds),
        status: "passed",
        supervision: {
          schemaVersion: 1,
          sourceReportSha256: "a".repeat(64),
          status: "supervised",
          supervisorRole: "A11",
          validatorSourceSha256: "b".repeat(64)
        }
      }))
    };
  });
  const evidence = {
    evidenceKind: "dedicated-groups",
    groups,
    partitionSha256: partition.partitionSha256,
    schemaVersion: 1,
    status: "passed"
  };
  mutate(evidence);
  return evidence;
}

test("canonical contract locks all 12 complete axes and aggregate evidence counts", () => {
  assert.equal(CHINA_VISUALIZATION_RELEASE_CONTRACT.axes.length, 12);
  assert.equal(
    new Set(CHINA_VISUALIZATION_RELEASE_CONTRACT.axes.map(({ id }) => id)).size,
    12
  );
  assert.deepEqual(CHINA_VISUALIZATION_RELEASE_CONTRACT.expected, {
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
  });
});

test("canonical invocation pins one project, one worker, zero retries, and no grep or shard args", () => {
  const invocation = buildCanonicalChinaVisualizationInvocation(repositoryRoot);
  assert.equal(invocation.cwd, repositoryRoot);
  assert.ok(invocation.args.includes("--project=desktop-chrome"));
  assert.ok(invocation.args.includes("--workers=1"));
  assert.ok(invocation.args.includes("--retries=0"));
  assert.equal(invocation.args.some((arg) => /grep|shard|repeat-each|last-failed/u.test(arg)), false);
  assert.deepEqual(
    invocation.args.filter((arg) => arg.endsWith(".spec.ts")),
    [CHINA_VISUALIZATION_RELEASE_CONTRACT.spec]
  );
  assert.throws(
    () => buildCanonicalChinaVisualizationInvocation("/tmp/repository"),
    /\/Volumes\/Starship/u
  );
});

test("release runner stops before browser work when supervised dedicated evidence is absent", async () => {
  await assert.rejects(
    runChinaVisualizationReleaseGate({
      baseEnvironment: {},
      repositoryRoot
    }),
    /dedicated G01-G07 evidence is required before the generic301 browser matrix can run/u
  );
});

test("production runner rejects syntactic exact7x12 dedicated JSON before artifacts or browser spawn", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const { report } = canonicalReport(axis);
  const genericAxis = await validateChinaVisualizationPlaywrightReport(
    report,
    "/tmp/generic-report.json",
    axis
  );
  const fabricatedEvidence = canonicalDedicatedEvidence(genericAxis.partition);
  assert.equal(fabricatedEvidence.groups.length, 7);
  for (const group of fabricatedEvidence.groups) {
    assert.equal(group.receipts.length, 12);
    for (const receipt of group.receipts) {
      assert.deepEqual(
        receipt.stateIds,
        group.labIds.map((labId) => JSON.stringify([labId, "x"]))
      );
      assert.match(receipt.statePlanSha256, /^[0-9a-f]{64}$/u);
      assert.match(receipt.supervision.sourceReportSha256, /^[0-9a-f]{64}$/u);
      assert.match(receipt.supervision.validatorSourceSha256, /^[0-9a-f]{64}$/u);
    }
  }
  let mkdirCallCount = 0;
  let spawnBrowserCallCount = 0;

  await assert.rejects(
    runChinaVisualizationReleaseGate(
      {
        baseEnvironment: {},
        dedicatedEvidencePath:
          `${repositoryRoot}/.tmp/fabricated-exact7x12-dedicated.json`,
        repositoryRoot
      },
      {
        existsSync: () => true,
        mkdir: async () => {
          mkdirCallCount += 1;
        },
        readFile: async () => Buffer.from(JSON.stringify(fabricatedEvidence)),
        spawnBrowser: async () => {
          spawnBrowserCallCount += 1;
          return 0;
        }
      }
    ),
    /dedicated validator coverage unavailable.*G01.*G02.*G07/iu
  );
  assert.equal(mkdirCallCount, 0);
  assert.equal(spawnBrowserCallCount, 0);
});

test("production runner exposes only the unavailable dedicated provenance boundary", () => {
  assert.deepEqual(CHINA_VISUALIZATION_DEDICATED_VALIDATOR_COVERAGE, {
    requiredGroupEvidence: ["G01", "G02", "G03", "G04", "G05", "G06", "G07"]
      .map((groupId) => ({
        groupId,
        receiptBindings: [
          "validatorSource",
          "validatedArtifact",
          "supervisorReceipt",
          "outerExitReceipt"
        ]
      })),
    status: "unavailable",
    unavailableGroupIds: ["G01", "G02", "G07"]
  });
  const runnerStart = releaseRunnerSource.indexOf(
    "export async function runChinaVisualizationReleaseGate("
  );
  const runnerEnd = releaseRunnerSource.indexOf("\nfunction usage()", runnerStart);
  const productionRunner = releaseRunnerSource.slice(runnerStart, runnerEnd);
  const unavailableBoundary = productionRunner.indexOf(
    "dedicated validator coverage unavailable"
  );

  assert.ok(runnerStart !== -1 && runnerEnd > runnerStart);
  assert.ok(unavailableBoundary !== -1);
  assert.doesNotMatch(productionRunner, /\bmkdir\s*\(/u);
  assert.doesNotMatch(productionRunner, /\brunChild\s*\(|\bspawn\s*\(/u);
  assert.doesNotMatch(productionRunner, /status:\s*["']passed["']/u);
});

test("every receipt-bearing scanState requires exact signatures and fail-closed contrast at every scroll position", () => {
  const contrastHelperStart = acceptanceSpecSource.indexOf("async function auditTextContrast(");
  const contrastHelperEnd = acceptanceSpecSource.indexOf(
    "async function auditFractionValueLabels(",
    contrastHelperStart
  );
  const contrastHelper = acceptanceSpecSource.slice(contrastHelperStart, contrastHelperEnd);
  const scanStateStart = acceptanceSpecSource.indexOf("async function scanState(");
  const preSignatureStart = acceptanceSpecSource.indexOf(
    'verifyRequestedRangeState("before-scan")',
    scanStateStart
  );
  const semanticStart = acceptanceSpecSource.indexOf(
    "const expectedSemanticModel",
    preSignatureStart
  );
  const noScrollContrastStart = acceptanceSpecSource.indexOf(
    "await auditTextContrast(section, lab, state, addFailure)",
    semanticStart
  );
  const scrollLoopStart = acceptanceSpecSource.indexOf(
    "for (const position of scrollPositions)",
    noScrollContrastStart
  );
  const scrollContrastStart = acceptanceSpecSource.indexOf(
    "await auditTextContrast(",
    scrollLoopStart
  );
  const postSignatureStart = acceptanceSpecSource.indexOf(
    'verifyRequestedRangeState("after-scan")',
    scrollContrastStart
  );
  const receiptStart = acceptanceSpecSource.indexOf(
    "executedShardStateIds.push",
    postSignatureStart
  );

  assert.ok(contrastHelperStart !== -1 && contrastHelperStart < contrastHelperEnd);
  assert.match(
    contrastHelper,
    /section\.evaluate\(scanHkVisualizationTextContrast[\s\S]*for \(const issue of contrast\.issues\)[\s\S]*Text contrast scan failed closed/
  );
  assert.ok(scanStateStart !== -1 && scanStateStart < preSignatureStart);
  assert.ok(preSignatureStart < semanticStart && semanticStart < noScrollContrastStart);
  assert.ok(noScrollContrastStart < scrollLoopStart && scrollLoopStart < scrollContrastStart);
  assert.ok(scrollContrastStart < postSignatureStart && postSignatureStart < receiptStart);
  assert.match(
    acceptanceSpecSource.slice(scanStateStart, semanticStart),
    /RANGE_STATE_EXECUTION[\s\S]*if \(!\(await verifyRequestedRangeState\("before-scan"\)\)\) return false;/
  );
  assert.match(
    acceptanceSpecSource.slice(postSignatureStart, receiptStart + 100),
    /verifyRequestedRangeState\("after-scan"\)[\s\S]*executedShardStateIds\.push/
  );
  const scrollLoop = acceptanceSpecSource.slice(scrollLoopStart, postSignatureStart);
  assert.match(scrollLoop, /requestAnimationFrame[\s\S]*await auditTextContrast\(/);
  assert.match(scrollLoop, /position\.label === "left"[\s\S]*auditFractionValueLabels/);
  assert.match(scrollLoop, /await auditTextContrast\([\s\S]*collectUiIssues\(section\)/);
  assert.match(
    acceptanceSpecSource.slice(semanticStart, scrollLoopStart),
    /stateJson: marks\.getAttribute\("data-viz-state-json"\)[\s\S]*marksContract\.family === "fraction-operations"[\s\S]*JSON\.parse\(marksContract\.stateJson \?\? "null"\)/
  );
});

test("broad acceptance source partitions before configured-semantic planning and packages only generic301", () => {
  const partitionStart = acceptanceSpecSource.indexOf(
    "const releasePartition = buildChinaVisualizationReleasePartition"
  );
  const semanticPlanStart = acceptanceSpecSource.indexOf(
    "const resolvedSemanticFamilies",
    partitionStart
  );
  const selectionStart = acceptanceSpecSource.indexOf(
    "const selectedLabs = genericMainlandLabs.filter",
    semanticPlanStart
  );
  const packagingStart = acceptanceSpecSource.indexOf(
    "const allPackages = buildLabPackages(selectedLabs)",
    selectionStart
  );

  assert.ok(partitionStart !== -1 && partitionStart < semanticPlanStart);
  assert.ok(semanticPlanStart < selectionStart && selectionStart < packagingStart);
  assert.match(
    acceptanceSpecSource.slice(partitionStart, packagingStart + 200),
    /genericMainlandLabs\.length !== 301[\s\S]*for \(const lab of genericMainlandLabs\)[\s\S]*allPackages\.length !== 66/u
  );
  assert.doesNotMatch(
    acceptanceSpecSource.slice(semanticPlanStart, packagingStart),
    /for \(const lab of allMainlandLabs\)|const selectedLabs = allMainlandLabs\.filter/u
  );
});

test("package deadlines derive from the frozen exact-state budget and never use a remaining-time early exit", () => {
  assert.match(
    acceptanceSpecSource,
    /buildChinaVisualizationStateBudgetManifest\([\s\S]*stateBudgetPreflightErrors[\s\S]*stateBudgetByPackageId/
  );
  assert.match(
    acceptanceSpecSource,
    /test\.setTimeout\(\s*stateChunkPlan\.chunks\.reduce\([\s\S]*?chunk\.timeoutMs[\s\S]*?60_000,?\s*\),?\s*\)/
  );
  assert.doesNotMatch(
    acceptanceSpecSource,
    /test\.setTimeout\(stateBudget\.timeoutMs\)/
  );
  assert.doesNotMatch(
    acceptanceSpecSource,
    /test\.setTimeout\(Math\.max\(180_000, labPackage\.labs\.length \* 90_000\)\)/
  );
  const packageBody = acceptanceSpecSource.slice(
    acceptanceSpecSource.indexOf("for (const labPackage of shardPackages)"),
    acceptanceSpecSource.indexOf("function parseLanguage")
  );
  assert.doesNotMatch(packageBody, /(?:deadline|remaining(?:Ms|Time)?)[\s\S]{0,240}return;/iu);
});

test("canonical environment rejects inherited partial controls and replaces Playwright/storage overrides", () => {
  assert.throws(
    () => assertNoInheritedChinaVizOverrides({ CHINA_VIZ_LABS: "one" }),
    /CHINA_VIZ_LABS/u
  );
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const environment = buildCanonicalChinaVisualizationEnvironment({
    axis,
    axisIndex: 0,
    baseEnvironment: {
      HK_MATH_DB_PATH: "/tmp/shared.sqlite",
      PATH: "/bin",
      PLAYWRIGHT_BASE_URL: "http://example.test",
      PLAYWRIGHT_SKIP_WEBSERVER: "1"
    },
    jsonReportPath: `${repositoryRoot}/.tmp/china-release/unit-report.json`,
    repositoryRoot,
    runId: "unit-run"
  });
  assert.equal(environment.PATH, "/bin");
  assert.equal(environment.PLAYWRIGHT_SKIP_WEBSERVER, undefined);
  assert.equal(environment.PLAYWRIGHT_BASE_URL, undefined);
  assert.notEqual(environment.HK_MATH_DB_PATH, "/tmp/shared.sqlite");
  assert.equal(environment.CHINA_VIZ_SHARD_INDEX, "0");
  assert.equal(environment.CHINA_VIZ_SHARD_TOTAL, "1");
  assert.equal(environment.PLAYWRIGHT_RUN_ID, `unit-run-${axis.id}`);
  assert.equal(environment.PLAYWRIGHT_STARSHIP_PRELAUNCH, "1");
  assert.equal(environment.NEXT_TELEMETRY_DISABLED, "1");
  assert.equal(environment.NODE_COMPILE_CACHE.endsWith("/node-compile-cache"), true);
  assert.equal(environment.npm_config_cache.endsWith("/npm-cache"), true);
  assert.equal(environment.TMPDIR, environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  assert.equal(environment.TMP, environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  assert.equal(environment.TEMP, environment.PLAYWRIGHT_BROWSER_TEMP_DIR);
  for (const name of [
    "HK_MATH_DB_PATH",
    "NODE_COMPILE_CACHE",
    "npm_config_cache",
    "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
    "PLAYWRIGHT_BROWSER_TEMP_DIR",
    "PLAYWRIGHT_CRASH_DUMP_DIR",
    "PLAYWRIGHT_E2E_ROOT",
    "PLAYWRIGHT_JSON_OUTPUT_FILE",
    "PLAYWRIGHT_NEXT_DIST_DIR",
    "PLAYWRIGHT_NEXT_TSCONFIG_PATH",
    "PLAYWRIGHT_OUTPUT_DIR",
    "PLAYWRIGHT_PATH_MANIFEST_PATH",
    "PLAYWRIGHT_REPORT_DIR",
    "PLAYWRIGHT_SERVER_COMMAND_OWNER_PID_PATH",
    "PLAYWRIGHT_SERVER_LOG_PATH"
  ]) {
    assert.match(environment[name], /^\/Volumes\/Starship\//u, name);
  }
});

test("report validator accepts exact Lab, state, package, and terminal telemetry receipts", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const { labIds, report, stateIds } = canonicalReport(axis);
  const validated = await validateChinaVisualizationPlaywrightReport(
    report,
    "/tmp/report.json",
    axis
  );
  assert.deepEqual(validated.labIds, labIds);
  assert.deepEqual(validated.stateIds, stateIds);
  assert.equal(validated.packageTests, 66);
  assert.equal(validated.telemetryPackages, 66);
});

test("generic report validation remains scoped to generic301 and never claims catalog335 completion", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const { report } = canonicalReport(axis);
  const genericAxis = await validateChinaVisualizationPlaywrightReport(
    report,
    "/tmp/generic-only-report.json",
    axis
  );
  assert.equal(genericAxis.labIds.length, 301);
  assert.equal(genericAxis.partition.catalogLabIds.length, 335);
  assert.equal(genericAxis.partition.dedicatedLabIds.length, 34);
  assert.equal("status" in genericAxis, false);
  assert.equal("releaseEvidence" in genericAxis, false);
});

test("report validator rejects fake-green range receipts with requested/expected/observed drift", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const mismatch = canonicalReport(axis, ({ specs, stateIds }) => {
    const ledger = specs.at(-1).tests[0].results[0].attachments.at(-1);
    const data = JSON.parse(Buffer.from(ledger.body, "base64").toString("utf8"));
    data.rangeStateExecutionMismatches = [{
      domainId: "independent-controls",
      domainVersion: 1,
      expected: [{ disabled: false, id: "value", index: 0, value: 0 }],
      observed: [{ disabled: false, id: "value", index: 0, value: 3 }],
      phase: "before-scan",
      requested: [{ disabled: false, id: "value", index: 0, value: 0 }],
      stateId: stateIds[1]
    }];
    data.executedStateIds = data.executedStateIds.filter((stateId) => stateId !== stateIds[1]);
    data.unobservedStateIds = [stateIds[1]];
    ledger.body = Buffer.from(JSON.stringify(data)).toString("base64");
  }).report;

  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(mismatch, "/tmp/range-mismatch.json", axis),
    /requested\/expected\/observed range-state mismatch|does not execute its unique declared/u
  );
});

test("report validator rejects state-budget gaps, plan-hash drift, and count-independent timeouts", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const broken = canonicalReport(axis, ({ specs }) => {
    const ledger = specs.at(-1).tests[0].results[0].attachments.at(-1);
    const data = JSON.parse(Buffer.from(ledger.body, "base64").toString("utf8"));
    data.stateBudgetManifest.packagePlans[1].stateOffset += 1;
    data.stateBudgetManifest.packagePlans[1].timeoutMs -= 1;
    data.stateBudgetManifest.statePlanSha256 = "0".repeat(64);
    ledger.body = Buffer.from(JSON.stringify(data)).toString("base64");
  }).report;

  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(broken, "/tmp/budget-drift.json", axis),
    /state-budget manifest.*(?:gap|timeout drift|plan hashes)/u
  );
});

test("report validator rejects partial ledgers, skips, retries, missing telemetry, and cross-axis Lab drift", async () => {
  const axis = CHINA_VISUALIZATION_RELEASE_CONTRACT.axes[0];
  const partial = canonicalReport(axis, ({ specs }) => {
    const ledger = specs.at(-1).tests[0].results[0].attachments.at(-1);
    const data = JSON.parse(Buffer.from(ledger.body, "base64").toString("utf8"));
    data.scope = "partial";
    data.releaseAcceptance = false;
    ledger.body = Buffer.from(JSON.stringify(data)).toString("base64");
  }).report;
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(partial, "/tmp/partial.json", axis),
    /not the exact generic301 unsharded/u
  );

  const skipped = canonicalReport(axis, ({ specs }) => {
    specs[0].tests[0].annotations.push({ type: "skip" });
    specs[0].tests[0].results[0].retry = 1;
  }).report;
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(skipped, "/tmp/skipped.json", axis),
    /forbidden annotation skip|retry=1/u
  );

  const missingTelemetry = canonicalReport(axis, ({ specs }) => {
    specs[0].tests[0].results[0].attachments.shift();
  }).report;
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(missingTelemetry, "/tmp/missing.json", axis),
    /expected 66 generic telemetry attachments/u
  );

  const nonTerminalTelemetry = canonicalReport(axis, ({ specs }) => {
    const attachment = specs[0].tests[0].results[0].attachments[0];
    const data = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    data.timings[0].outcome = "completed";
    data.timings[1].status = 202;
    attachment.body = Buffer.from(JSON.stringify(data)).toString("base64");
  }).report;
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(
      nonTerminalTelemetry,
      "/tmp/non-terminal.json",
      axis
    ),
    /non-terminal evidence outcome=completed status=200|non-terminal evidence outcome=finished status=202/u
  );

  const { report, labIds } = canonicalReport(axis);
  const drifted = [...labIds];
  drifted[0] = "another-lab";
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(report, "/tmp/drift.json", axis, drifted),
    /differs from the first canonical axis/u
  );

  const stateDrifted = canonicalReport(axis);
  const expectedStateIds = [...stateDrifted.stateIds];
  expectedStateIds[1] = JSON.stringify([stateDrifted.labIds[0], "direct/range=0:value=999"]);
  await assert.rejects(
    validateChinaVisualizationPlaywrightReport(
      stateDrifted.report,
      "/tmp/state-drift.json",
      axis,
      stateDrifted.labIds,
      expectedStateIds
    ),
    /state order\/set differs/u
  );
});
