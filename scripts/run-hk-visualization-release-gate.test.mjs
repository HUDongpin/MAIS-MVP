import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoInheritedHkVizOverrides,
  buildCanonicalHkVisualizationEnvironment,
  buildCanonicalHkVisualizationInvocation,
  HK_VISUALIZATION_RELEASE_CONTRACT,
  validateHkVisualizationPlaywrightReport
} from "./run-hk-visualization-release-gate.mjs";

const { expected, files, machineSchemaVersion } = HK_VISUALIZATION_RELEASE_CONTRACT;

function jsonAttachment(name, data) {
  return {
    body: Buffer.from(JSON.stringify(data), "utf8").toString("base64"),
    contentType: "application/json",
    name
  };
}

function reportSpec(file, title, attachments = [], annotations = []) {
  return {
    column: 1,
    file,
    id: `${file}::${title}`,
    line: 1,
    ok: true,
    tags: [],
    tests: [{
      annotations,
      expectedStatus: "passed",
      projectId: "desktop-chrome",
      projectName: "desktop-chrome",
      results: [{
        annotations,
        attachments,
        duration: 1,
        errors: [],
        retry: 0,
        startTime: "2026-08-09T00:00:00.000Z",
        status: "passed",
        stderr: [],
        stdout: [],
        workerIndex: 0
      }],
      status: "expected",
      timeout: 30_000
    }],
    title
  };
}

function fullMatrixContract() {
  return {
    allowPartial: false,
    expectedCellCount: expected.machineCellCount,
    expectedFullCellCount: expected.machineCellCount,
    expectedFullPackageCount: expected.machinePackageCount,
    expectedPackageCount: expected.machinePackageCount,
    explicitFilters: [],
    fullMatrixRequested: true,
    interactionDepth: "full",
    languages: ["en", "zh", "zh-Hans"],
    scope: "full",
    themes: ["light", "dark"],
    viewports: [
      { height: 900, id: "desktop", width: 1440 },
      { height: 1024, id: "tablet", width: 768 },
      { height: 844, id: "mobile", width: 390 }
    ]
  };
}

function exactLedger(ids) {
  return {
    duplicateCellIds: [],
    executedCellIds: [...ids],
    missingCellIds: [],
    plannedCellIds: [...ids]
  };
}

function exactStepLedger(ids) {
  return {
    duplicateStepIds: [],
    executedStepIds: [...ids],
    missingStepIds: [],
    plannedStepIds: [...ids]
  };
}

function lessonSourceManifest(labIds) {
  return {
    contract: {
      catalogOnlyLabIds: [],
      duplicateLessonLabIds: [],
      duplicateRouteSlugs: [],
      duplicateTopicLabIds: [],
      gradeContractDriftLabIds: [],
      invalidBindingLabIds: [],
      legacySeniorRoutingExact: true,
      missingLessonLabIds: [],
      missingTopicLabIds: [],
      newS3RoutingExact: true,
      notEmbeddableLabIds: [],
      quadraticRouteExact: true,
      slugContractDriftLabIds: []
    },
    ledger: exactLedger(labIds),
    rows: labIds.map((labId) => ({ labId })),
    schemaVersion: "hk-viz-lesson-embeddability.v1",
    summary: {
      embeddableLessonCount: expected.hkLabCount,
      expectedLabCount: expected.hkLabCount,
      registryLabCount: expected.hkLabCount
    }
  };
}

function buildValidReport() {
  const labIds = Array.from({ length: expected.hkLabCount }, (_, index) => `lab-${String(index + 1).padStart(2, "0")}`);
  const machineSpecs = [];
  const machinePackageIds = [];
  const machineCellIds = [];
  const machinePackageSpecs = [];
  let nextCell = 0;

  for (let index = 0; index < expected.machinePackageCount; index += 1) {
    const packageId = `hk-viz-package-${String(index + 1).padStart(3, "0")}`;
    const packageCellCount = index < 54 ? 5 : 4;
    const cellIds = Array.from({ length: packageCellCount }, () => {
      nextCell += 1;
      return `machine-cell-${String(nextCell).padStart(3, "0")}`;
    });
    machinePackageIds.push(packageId);
    machineCellIds.push(...cellIds);
    const data = {
      cells: cellIds.map((cellId) => ({ cellId, status: "passed" })),
      failures: [],
      matrix: fullMatrixContract(),
      package: {
        duplicateCellIds: [],
        executedCellIds: [...cellIds],
        id: packageId,
        missingCellIds: [],
        plannedCellIds: [...cellIds]
      },
      schemaVersion: machineSchemaVersion,
      status: "passed",
      summary: {
        executedCellCount: cellIds.length,
        failedCellCount: 0,
        missingCellCount: 0,
        passedCellCount: cellIds.length,
        plannedCellCount: cellIds.length
      }
    };
    const annotations = [
      { description: "full", type: "hk-viz-scope" },
      { description: "full", type: "hk-viz-interaction-depth" },
      { description: packageId, type: "hk-viz-package" }
    ];
    machinePackageSpecs.push(reportSpec(
      files.machine,
      `${packageId} exercises every selected HK lab`,
      [jsonAttachment(`${packageId}.json`, data)],
      annotations
    ));
  }

  const machineManifest = {
    catalog: {
      allHkLabCount: expected.hkLabCount,
      selectedLabCount: expected.hkLabCount
    },
    matrix: fullMatrixContract(),
    plan: {
      packageIds: machinePackageIds,
      plannedCellIds: machineCellIds
    },
    schemaVersion: machineSchemaVersion
  };
  machineSpecs.push(
    reportSpec(
      files.machine,
      "matrix manifest is complete for the requested scope",
      [jsonAttachment("hk-visualization-matrix-manifest.json", machineManifest)]
    ),
    reportSpec(files.machine, "false-pass guard helpers reject broad, untranslated, and non-transition evidence"),
    ...machinePackageSpecs
  );

  const gradeCounts = [5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const gradePackages = [];
  let labOffset = 0;
  for (let gradeIndex = 0; gradeIndex < gradeCounts.length; gradeIndex += 1) {
    const grade = gradeIndex < 6 ? `P${gradeIndex + 1}` : `S${gradeIndex - 5}`;
    const plannedLabIds = labIds.slice(labOffset, labOffset + gradeCounts[gradeIndex]);
    labOffset += gradeCounts[gradeIndex];
    gradePackages.push({
      grade,
      id: `hk-viz-lesson-${grade.toLowerCase()}`,
      plannedLabIds,
      plannedRoutes: plannedLabIds.map((labId) => `/student/lessons/${labId}`)
    });
  }
  const sourceManifest = lessonSourceManifest(labIds);
  const lessonSpecs = [
    reportSpec(
      files.lesson,
      "source manifest hard-gates one exact embedded lesson for all 51 registry ids",
      [
        jsonAttachment("hk-visualization-lesson-source-manifest.json", sourceManifest),
        jsonAttachment("hk-visualization-lesson-grade-packages.json", {
          packages: gradePackages,
          schemaVersion: "hk-viz-lesson-grade-packages.v1"
        })
      ]
    ),
    reportSpec(files.lesson, "lesson browser option resolver defaults to full and rejects partial false-passes"),
    reportSpec(files.lesson, "visibility-chain helper rejects hidden, inert, aria-hidden, and transparent ancestors"),
    reportSpec(files.lesson, "source guard keeps local visibility paths ancestor-aware and reuses the hardened machine scanners")
  ];

  for (const viewport of ["desktop", "mobile"]) {
    for (const gradePackage of gradePackages) {
      const packageId = gradePackage.id.replace("hk-viz-lesson-", `hk-viz-lesson-${viewport}-`);
      const cellIds = gradePackage.plannedLabIds.map((labId) => `${viewport}/${gradePackage.grade}/${labId}/${labId}`);
      lessonSpecs.push(reportSpec(
        files.lesson,
        `${viewport}/${gradePackage.grade} verifies every planned lesson embed`,
        [jsonAttachment(`${packageId}.json`, {
          cells: cellIds.map((cellId) => ({
            cellId,
            contract: { collisionCount: 0, renderOnlyNoWrite: true },
            failures: [],
            renderOnlyWriteRequests: [],
            status: "passed"
          })),
          package: {
            duplicateCellIds: [],
            executedCellIds: [...cellIds],
            grade: gradePackage.grade,
            id: packageId,
            missingCellIds: [],
            plannedCellIds: [...cellIds],
            viewportId: viewport
          },
          run: {
            allowPartial: false,
            fullBrowserRequested: true,
            releaseAcceptance: true
          },
          sourceContract: gradePackage.plannedLabIds.map((labId) => ({ labId })),
          status: "passed",
          summary: {
            executedCellCount: cellIds.length,
            failedCellCount: 0,
            missingCellCount: 0,
            passedCellCount: cellIds.length,
            plannedCellCount: cellIds.length
          }
        })]
      ));
    }
  }

  const stateSteps = Array.from({ length: 12 }, (_, index) => `state-step-${index + 1}`);
  const noWriteSteps = Array.from({ length: 7 }, (_, index) => `no-write-step-${index + 1}`);
  const topicRecords = labIds.map((topicId) => ({
    explored: true,
    moduleId: "configured-visualization-lab",
    source: "lesson",
    topicId
  }));
  const topicCells = labIds.map((topicId) => `post/${topicId}`);
  const passingAllTopics = {
    contract: {
      exact51DistinctTriples: true,
      exactLessonExploredRecordShape: true,
      exactRegistryTopicSet: true,
      legacyAndNewIdsAreFourSeparateRecords: true,
      noDuplicateTriples: true,
      noUnexpectedTriples: true
    },
    failures: [],
    ledger: exactLedger(topicCells),
    observed: { records: topicRecords },
    status: "passed"
  };
  const stateSpecs = [
    reportSpec(
      files.state,
      "51-topic reset/state contract supplies exact moduleId and topicId selectors",
      [
        jsonAttachment("hk-visualization-state-isolation-plan.json", {
          expectedRecordCount: 2,
          topics: labIds.slice(0, 2).map((topicId) => ({ topicId }))
        }),
        jsonAttachment("hk-visualization-all-topics-state-plan.json", {
          expectedRecordCount: expected.hkLabCount,
          topics: labIds.map((topicId) => ({ topicId }))
        })
      ]
    ),
    reportSpec(files.state, "helper rejects a user+module overwrite with explicit missing-topic diagnostics"),
    reportSpec(files.state, "pure render-only probes reject every write method and parse learning-event array/single forms"),
    reportSpec(
      files.state,
      "pure 51-topic assertion preserves every legacy and new topic as a distinct triple",
      [jsonAttachment("hk-visualization-all-topics-pure-evidence.json", {
        passing: passingAllTopics,
        rejected: { status: "failed" },
        rejectedShape: { status: "failed" }
      })]
    ),
    reportSpec(
      files.state,
      "one disposable student retains two exact topic records under the shared configured module",
      [jsonAttachment("hk-visualization-state-isolation-evidence.json", {
        contract: {
          authenticatedDisposableHkStudent: true,
          exactPostRecords: true,
          exactResetModuleTopicSelectors: true,
          exactTwoTopicRecordsOnEveryGet: true,
          duplicateWriteNoSecondEventOrReward: true,
          idempotentSameTripleNoDuplicate: true,
          noDuplicateTopicRecords: true,
          noNumericStatePayload: true,
          noUnexpectedSharedModuleRecords: true,
          sharedModuleDistinctTopics: true,
          topicBStableAfterTopicAUpdate: true
        },
        failures: [],
        ledger: exactStepLedger(stateSteps),
        status: "passed"
      })]
    ),
    reportSpec(
      files.state,
      "rendering an embedded lesson lab without interaction creates no session, event, or reward",
      [jsonAttachment("hk-visualization-render-no-write-evidence.json", {
        after: { readable: { analytics: true, rewards: true, sessions: true } },
        before: { readable: { analytics: true, rewards: true, sessions: true } },
        contract: {
          noRewardWrite: true,
          noSessionWrite: true,
          noVisualizationEventWrite: true,
          noVisualizationWriteRequest: true,
          readOnlyEvidenceComplete: true
        },
        failures: [],
        ledger: exactStepLedger(noWriteSteps),
        observedVisualizationWriteRequests: [],
        status: "passed"
      })]
    ),
    reportSpec(
      files.state,
      "source-wired 51-topic API sweep retains exactly 51 distinct triples",
      [
        jsonAttachment("hk-visualization-all-topics-source-gate.json", sourceManifest),
        jsonAttachment("hk-visualization-all-topics-runtime-evidence.json", {
          evidence: passingAllTopics,
          getStatus: 200,
          postResults: labIds.map((topicId) => ({ ok: true, responseExact: true, topicId }))
        })
      ]
    )
  ];

  const suites = [
    { column: 0, file: files.machine, line: 0, specs: machineSpecs, title: files.machine },
    { column: 0, file: files.lesson, line: 0, specs: lessonSpecs, title: files.lesson },
    { column: 0, file: files.state, line: 0, specs: stateSpecs, title: files.state }
  ];
  return {
    config: { projects: [{ name: "desktop-chrome" }] },
    errors: [],
    stats: {
      duration: 1,
      expected: expected.totalTestCount,
      flaky: 0,
      skipped: 0,
      startTime: "2026-08-09T00:00:00.000Z",
      unexpected: 0
    },
    suites
  };
}

function findAttachment(report, name) {
  for (const suite of report.suites) {
    for (const spec of suite.specs) {
      for (const result of spec.tests[0].results) {
        const attachment = result.attachments.find((candidate) => candidate.name === name);
        if (attachment) return attachment;
      }
    }
  }
  return null;
}

function readAttachmentData(attachment) {
  return JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
}

function writeAttachmentData(attachment, data) {
  attachment.body = Buffer.from(JSON.stringify(data), "utf8").toString("base64");
}

test("runner rejects every inherited HK_VIZ override and injects only canonical full flags", () => {
  for (const name of [
    "HK_VIZ_ALLOW_PARTIAL",
    "HK_VIZ_FULL_MATRIX",
    "HK_VIZ_INTERACTION_DEPTH",
    "HK_VIZ_GRADES",
    "HK_VIZ_LABS",
    "HK_VIZ_LANGUAGES",
    "HK_VIZ_LESSON_FULL",
    "HK_VIZ_THEMES",
    "HK_VIZ_VIEWPORTS",
    "HK_VIZ_FUTURE_FILTER"
  ]) {
    assert.throws(
      () => assertNoInheritedHkVizOverrides({ [name]: "0" }),
      new RegExp(name)
    );
  }

  const environment = buildCanonicalHkVisualizationEnvironment({
    baseEnvironment: { PATH: "/usr/bin" },
    jsonReportPath: "/tmp/hk-viz-report.json",
    runId: "hk-viz-test"
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(environment).filter(([name]) => name.startsWith("HK_VIZ_"))),
    HK_VISUALIZATION_RELEASE_CONTRACT.canonicalEnvironment
  );
  assert.equal(environment.PLAYWRIGHT_JSON_OUTPUT_FILE, "/tmp/hk-viz-report.json");
  assert.equal(environment.PLAYWRIGHT_RUN_ID, "hk-viz-test");
});

test("runner invocation fixes the exact specs, desktop project, full reporter, one worker, and zero retries", () => {
  const invocation = buildCanonicalHkVisualizationInvocation("/tmp/repository");
  assert.equal(invocation.command, process.execPath);
  assert.equal(invocation.cwd, "/tmp/repository");
  assert.deepEqual(invocation.args.slice(1, 5), [
    "test",
    files.machine,
    files.lesson,
    files.state
  ]);
  assert.deepEqual(invocation.args.slice(5), [
    "--project=desktop-chrome",
    "--workers=1",
    "--retries=0",
    "--reporter=list,json"
  ]);
});

test("validator accepts only the complete 918/216 machine, 24-package LessonView, and state/no-write report", async () => {
  const result = await validateHkVisualizationPlaywrightReport(buildValidReport(), {
    reportPath: "/tmp/hk-viz-valid-report.json"
  });
  assert.deepEqual(result, {
    canonicalProject: "desktop-chrome",
    lessonBrowserCells: 102,
    lessonBrowserPackages: 24,
    machineCells: 918,
    machinePackages: 216,
    reportPath: "/tmp/hk-viz-valid-report.json",
    stateAndNoWriteTests: 7,
    status: "passed",
    tests: 253
  });
});

test("validator rejects a partial/filter marker even when Playwright stats look green", async () => {
  const report = buildValidReport();
  const attachment = findAttachment(report, "hk-visualization-matrix-manifest.json");
  const manifest = readAttachmentData(attachment);
  manifest.matrix.allowPartial = true;
  manifest.matrix.explicitFilters = ["HK_VIZ_LABS"];
  manifest.matrix.scope = "partial";
  writeAttachmentData(attachment, manifest);
  await assert.rejects(
    validateHkVisualizationPlaywrightReport(report),
    /allowPartial must be false|explicitFilters|scope must be full/
  );
});

test("validator rejects any runtime skip or expected skip", async () => {
  const report = buildValidReport();
  const firstTest = report.suites[0].specs[0].tests[0];
  firstTest.expectedStatus = "skipped";
  firstTest.status = "skipped";
  firstTest.annotations = [{ type: "skip", description: "fake green" }];
  firstTest.results[0].status = "skipped";
  report.stats.expected -= 1;
  report.stats.skipped = 1;
  await assert.rejects(
    validateHkVisualizationPlaywrightReport(report),
    /stats\.skipped must be 0|forbidden runtime annotation skip|expectedStatus must be passed/
  );
});

test("validator rejects missing machine packages and missing no-write evidence", async () => {
  const report = buildValidReport();
  report.suites[0].specs.pop();
  const noWriteSpec = report.suites[2].specs.find((spec) =>
    spec.title.startsWith("rendering an embedded lesson lab")
  );
  noWriteSpec.tests[0].results[0].attachments = [];
  report.stats.expected -= 1;
  await assert.rejects(
    validateHkVisualizationPlaywrightReport(report),
    /Machine evidence package count expected=216 actual=215|Expected exactly one hk-visualization-render-no-write-evidence\.json/
  );
});
