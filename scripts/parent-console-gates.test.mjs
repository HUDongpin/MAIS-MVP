import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function ciJobSource(ci, jobName) {
  const marker = `  ${jobName}:`;
  const start = ci.indexOf(marker);
  assert.notEqual(start, -1, `${jobName} must exist in CI`);
  const tail = ci.slice(start + marker.length);
  const nextJob = tail.match(/^  [a-zA-Z0-9_-]+:\s*$/mu);
  const end = nextJob ? start + marker.length + nextJob.index : ci.length;
  return ci.slice(start, end);
}

function countStaticNodeTests(relativePaths) {
  return relativePaths.reduce((total, relativePath) => {
    const source = readRepoFile(relativePath);
    return total + Array.from(source.matchAll(/^\s*test\s*\(/gmu)).length;
  }, 0);
}

test("the parent Node gate uses an explicit, complete manifest and matching tsconfig", async () => {
  const manifest = await import(`./parent-console-test-manifest.mjs?contract=${Date.now()}`);
  const discovered = manifest.discoverParentDomainTestFiles(repoRoot);

  assert.deepEqual(discovered, manifest.parentDomainTestFiles);
  assert.equal(manifest.parentDomainTestFiles.length, 17);
  assert.equal(manifest.expectedParentDomainTestCount, 140);
  assert.equal(manifest.expectedParentDomainStaticDeclarationCount, 140);
  assert.equal(
    countStaticNodeTests(manifest.parentDomainTestFiles),
    manifest.expectedParentDomainStaticDeclarationCount
  );

  assert.deepEqual(manifest.parentConsoleSupportTestFiles, [
    "lib/server/authRouteGuards.test.ts",
    "lib/server/contentSafetySeed.test.ts",
    "lib/server/questionStore.test.ts",
    "app/api/questions/routeQuestionStore.test.ts",
    "components/ui/LanguageToggle.test.ts"
  ]);
  assert.equal(manifest.expectedParentConsoleSupportTestCount, 15);
  assert.equal(manifest.expectedParentConsoleSupportStaticDeclarationCount, 15);
  assert.equal(
    countStaticNodeTests(manifest.parentConsoleSupportTestFiles),
    manifest.expectedParentConsoleSupportStaticDeclarationCount
  );

  assert.deepEqual(manifest.parentSecurityLifecycleTestFiles, [
    "app/api/attempts/routeSessionRevision.test.ts",
    "app/api/auth/logout-all/route.test.ts",
    "app/api/auth/password-change/routeSessionRevision.test.ts",
    "app/api/auth/password-reset/confirm/routeSessionRevision.test.ts",
    "app/api/auth/sessionIssuanceRoutes.test.ts",
    "app/api/guardianInvitationRoutes.test.ts",
    "app/api/teacher/teacherReportPreviewRoute.test.ts",
    "components/teacher/GuardianAccessControls.test.ts",
    "components/teacher/teacherReportFormState.test.ts",
    "lib/server/sessionCookie.test.ts",
    "lib/server/userStoreAuthSessionPersistence.test.ts",
    "lib/server/userStoreGuardianInvitationPersistence.test.ts",
    "lib/server/userStoreSessionRevisionPostgres.test.ts",
    "lib/server/userStoreSessionRevisionSqliteConcurrency.test.ts",
    "lib/server/userStoreTeacherOpsReportPersistence.test.ts",
    "lib/server/userStoreTeacherReportPreviewDecoder.test.ts",
    "lib/session.test.ts"
  ]);
  assert.equal(manifest.parentSecurityLifecycleTestFiles.length, 17);
  assert.equal(manifest.expectedParentSecurityLifecycleTestCount, 146);
  assert.equal(manifest.expectedParentSecurityLifecycleStaticDeclarationCount, 144);
  assert.equal(
    countStaticNodeTests(manifest.parentSecurityLifecycleTestFiles),
    manifest.expectedParentSecurityLifecycleStaticDeclarationCount
  );
  assert.doesNotMatch(
    manifest.parentConsoleTestFiles.join("\n"),
    /userStoreNovaPostgresIntegration\.test\.ts/u,
    "live Postgres integration must stay a separately provisioned acceptance gate"
  );

  assert.equal(manifest.parentConsoleTestFiles.length, 39);
  assert.equal(manifest.expectedParentConsoleTestCount, 301);
  assert.equal(manifest.expectedParentConsoleStaticDeclarationCount, 299);
  assert.equal(
    countStaticNodeTests(manifest.parentConsoleTestFiles),
    manifest.expectedParentConsoleStaticDeclarationCount
  );
  assert.deepEqual(
    manifest.parentConsoleTestFiles,
    [
      ...manifest.parentConsoleSupportTestFiles,
      ...manifest.parentDomainTestFiles,
      ...manifest.parentSecurityLifecycleTestFiles
    ]
  );

  const tsconfig = JSON.parse(readRepoFile("tsconfig.parent-console.json"));
  assert.equal(
    tsconfig.compilerOptions.jsx,
    "react-jsx",
    "compiled TSX dependencies must emit loadable .js instead of unresolved .jsx"
  );
  assert.deepEqual(tsconfig.files, manifest.parentConsoleTestFiles);

  const runner = readRepoFile("scripts/run-parent-console-tests.mjs");
  assert.match(runner, /parentConsoleTestFiles/u);
  assert.match(runner, /assertParentConsoleTestManifest/u);
  assert.match(runner, /--test-concurrency=1/u);
  assert.match(runner, /--test-reporter=tap/u);
  assert.match(runner, /finalTapMetric/u);
  assert.match(runner, /summary\.skipped !== 0/u);
  assert.match(runner, /summary\.todo !== 0/u);
});

test("CI and package preserve the parent, delivery, webhook, and readiness union", () => {
  const packageJson = JSON.parse(readRepoFile("package.json"));
  const expectedScripts = {
    "maintain:teacher-notice-resend-webhook":
      "node --import tsx scripts/teacher-notice-resend-webhook-maintenance.mjs",
    "migrate:teacher-notice-resend-webhook":
      "node --import tsx scripts/teacher-notice-resend-webhook-migration.mjs",
    "teacher-notice-outbox:migrate":
      "node --import tsx scripts/teacher-notice-outbox-migration.mjs --apply",
    "teacher-notice-outbox:preflight":
      "node --import tsx scripts/teacher-notice-outbox-migration.mjs --preflight",
    "test:postgres-readiness":
      "node --test scripts/run-postgres-readiness-tests.test.mjs && node scripts/run-postgres-readiness-tests.mjs",
    "test:teacher-notice-outbox":
      "node --import tsx --test scripts/teacher-notice-outbox-migration.test.mjs lib/server/teacherNoticeEmailDelivery.test.ts lib/server/teacherNoticeEmailOutboxHandlers.test.ts lib/server/userStoreTeacherNoticeEmailOutboxPersistence.test.ts lib/server/userStoreTeacherNoticeEmailOutboxStorage.test.ts lib/server/userStoreTeacherNoticeEmailOutboxSqliteIntegration.test.ts lib/server/userStoreTeacherNoticeEmailOutboxRemediation.test.ts lib/server/userStoreTeacherOpsNoticePersistence.test.ts lib/server/userStoreTeacherOpsReminderPersistence.test.ts",
    "test:teacher-notice-outbox:postgres16":
      "node -e \"if (!process.env.MAIS_OUTBOX_POSTGRES16_INTEGRATION_URL) process.exit(2)\" && node --import tsx --test lib/server/userStoreTeacherNoticeEmailOutboxIntegration.test.ts",
    "test:teacher-notice-resend-webhook":
      "node scripts/run-teacher-notice-resend-webhook-tests.mjs",
    "test:teacher-notice-resend-webhook:postgres":
      "node --import tsx --test lib/server/userStoreTeacherNoticeResendWebhookPostgresIntegration.test.ts"
  };
  for (const [name, command] of Object.entries(expectedScripts)) {
    assert.equal(packageJson.scripts[name], command, `${name} must retain its exact reviewed body`);
  }
  assert.equal(packageJson.dependencies.svix, "^2.0.0");
  assert.equal(
    Object.keys(packageJson.scripts).filter((name) => name === "test:postgres-readiness").length,
    1,
    "the readiness runner must have one canonical package entry"
  );

  const ci = readRepoFile(".github/workflows/ci.yml");
  const workflow = YAML.parse(ci);
  const validateRuns = workflow.jobs.validate.steps.map((step) => step.run).filter(Boolean);
  for (const command of [
    "npm run test:parent-console",
    "npm run test:teacher-notice-outbox",
    "npm run test:teacher-notice-resend-webhook",
    "npm run test:postgres-readiness"
  ]) {
    assert.equal(
      validateRuns.filter((run) => run === command).length,
      1,
      `${command} must appear exactly once in validate`
    );
  }

  const fullPostgresEventMatrix =
    "${{ github.event_name == 'pull_request' || github.event_name == 'merge_group' || (github.event_name == 'push' && github.ref == 'refs/heads/main') || (github.event_name == 'workflow_dispatch' && inputs.full_validation) }}";
  for (const jobName of [
    "postgres-integration",
    "teacher-notice-outbox-postgres16",
    "resend-webhook-postgres-integration"
  ]) {
    const job = workflow.jobs[jobName];
    assert.ok(job, `${jobName} must exist`);
    assert.equal(job.if, fullPostgresEventMatrix, `${jobName} must cover the full event matrix`);
    const checkoutSteps = job.steps.filter((step) => step.uses === "actions/checkout@v4");
    assert.equal(checkoutSteps.length, 1, `${jobName} must have one checkout`);
    assert.equal(checkoutSteps[0].with?.ref, "${{ github.sha }}", `${jobName} must checkout the event SHA`);
    const shaAssertions = job.steps.filter(
      (step) => step.env?.EXPECTED_EVENT_SHA === "${{ github.sha }}"
        && step.run === 'test "$(git rev-parse HEAD)" = "$EXPECTED_EVENT_SHA"'
    );
    assert.equal(shaAssertions.length, 1, `${jobName} must assert the checked-out event SHA`);
  }

  const runnerSelfTest = readRepoFile("scripts/run-postgres-readiness-tests.test.mjs");
  assert.match(
    runnerSelfTest,
    /ci\.slice\(\s*ci\.indexOf\("  postgres-integration:"\),\s*ci\.indexOf\("  visualization-browser:"\)\s*\)/u
  );
  const configuredRunnerSlice = ci.slice(
    ci.indexOf("  postgres-integration:"),
    ci.indexOf("  visualization-browser:")
  );
  assert.equal(
    configuredRunnerSlice,
    ciJobSource(ci, "postgres-integration"),
    "the readiness self-test slice must end at the current job boundary"
  );
});

test("new parent-domain tests trip the explicit manifest instead of being silently skipped", async () => {
  const manifest = await import(`./parent-console-test-manifest.mjs?rsc-tripwire=${Date.now()}`);
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "parent-console-manifest-"));
  const futureTest = "components/parent/parentFutureBoundary.test.ts";

  try {
    for (const relativePath of [...manifest.parentConsoleTestFiles, futureTest]) {
      const absolutePath = path.join(fixtureRoot, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "// manifest fixture\n");
    }

    assert.throws(
      () => manifest.assertParentConsoleTestManifest(fixtureRoot),
      /Unlisted parent-domain tests: components\/parent\/parentFutureBoundary\.test\.ts/u
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("CI routes the complete parent Playwright matrix without mixing isolated servers", () => {
  const ci = readRepoFile(".github/workflows/ci.yml");
  const job = ci.slice(ci.indexOf("  teacher-parent-e2e:"));
  const teacherSpecs = [
    "tests/e2e/teacher-operations.spec.ts",
    "tests/e2e/teacher-workspace.spec.ts"
  ];
  const sharedServerSpecs = [
    "tests/e2e/parent-console.spec.ts",
    "tests/e2e/parent-console-feature-matrix.spec.ts",
    "tests/e2e/teacher-parent-hydration.spec.ts"
  ];
  const isolatedServerSpecs = [
    "tests/e2e/parent-console-stress.spec.ts",
    "tests/e2e/teacher-parent-p1-regressions.spec.ts"
  ];

  for (const spec of [...teacherSpecs, ...sharedServerSpecs, ...isolatedServerSpecs]) {
    assert.equal(job.split(spec).length - 1, 1, `${spec} should appear exactly once in the CI job`);
  }

  const runLines = job
    .split("\n")
    .filter((line) => line.trimStart().startsWith("run: npx playwright test"));
  const teacherRun = runLines.find((line) => teacherSpecs.every((spec) => line.includes(spec)));
  const sharedRun = runLines.find((line) => sharedServerSpecs.every((spec) => line.includes(spec)));
  const isolatedRun = runLines.find((line) => isolatedServerSpecs.every((spec) => line.includes(spec)));
  assert.ok(teacherRun, "teacher specs should retain their desktop-only CI route");
  assert.ok(sharedRun, "shared-server parent specs should run together");
  assert.ok(isolatedRun, "isolated-stateful parent specs should run together");
  for (const spec of isolatedServerSpecs) assert.doesNotMatch(sharedRun, new RegExp(spec.replaceAll(".", "\\."), "u"));
  for (const spec of sharedServerSpecs) assert.doesNotMatch(isolatedRun, new RegExp(spec.replaceAll(".", "\\."), "u"));
  assert.match(teacherRun, /--project=desktop-chrome/u);
  for (const parentRun of [sharedRun, isolatedRun]) {
    assert.match(parentRun, /--project=desktop-chrome/u);
    assert.match(parentRun, /--project=mobile-chrome/u);
  }
});

test("CI uses a fresh production build for isolated parent tests and rejects flaky results", () => {
  const ci = readRepoFile(".github/workflows/ci.yml");
  const workflow = YAML.parse(ci);
  const steps = workflow.jobs["teacher-parent-e2e"].steps;
  const isolatedIndex = steps.findIndex((step) =>
    typeof step.run === "string" && step.run.includes("tests/e2e/parent-console-stress.spec.ts")
  );
  assert.ok(isolatedIndex > 0, "isolated parent Playwright step must exist after setup");

  const buildIndex = steps.findIndex((step) =>
    typeof step.run === "string" && step.run === "npm run build"
  );
  assert.ok(buildIndex >= 0 && buildIndex < isolatedIndex, "a fresh default production build must precede isolated tests");
  assert.equal(steps[isolatedIndex].env?.PLAYWRIGHT_ISOLATED_MODE, "production");
  assert.match(String(steps[isolatedIndex].env?.PLAYWRIGHT_RUN_ID ?? ""), /parent-isolated/u);

  const config = readRepoFile("playwright.config.ts");
  assert.match(config, /failOnFlakyTests:\s*Boolean\(process\.env\.CI\)/u);
});

test("CI artifact globs match Playwright's run-owned output directories", () => {
  const ci = readRepoFile(".github/workflows/ci.yml");
  const workflow = YAML.parse(ci);
  const uploadStep = workflow.jobs["teacher-parent-e2e"].steps.find(
    (step) => step.uses === "actions/upload-artifact@v4"
  );

  assert.ok(uploadStep, "teacher-parent-e2e should retain a failure-artifact upload step");
  assert.equal(uploadStep.with["include-hidden-files"], true);
  assert.match(ci, /^\s+\.tmp\/china-lesson-e2e-runtime\/runs\/\*\/test-results\s*$/mu);
  assert.match(ci, /^\s+\.tmp\/china-lesson-e2e-runtime\/runs\/\*\/playwright-report\s*$/mu);
  assert.doesNotMatch(ci, /\.tmp\/e2e-run-\*\/(?:test-results|playwright-report)/u);
});

test("isolated dev servers hold next-env restoration for their full lifecycle", () => {
  const isolatedApp = readRepoFile("tests/e2e/isolated-app.ts");

  assert.match(isolatedApp, /scripts\/with-next-env-restore\.mjs/u);
  assert.match(isolatedApp, /const appCommand = useProductionBuild \? "npm" : process\.execPath;/u);
  assert.match(
    isolatedApp,
    /const appArgs = useProductionBuild[\s\S]*?"scripts\/with-next-env-restore\.mjs"[\s\S]*?"npm", "run", "dev"/u
  );
  assert.match(isolatedApp, /detached: false/u);
  assert.doesNotMatch(
    isolatedApp,
    /spawn\("npm", \["run", startScript/u,
    "an unwrapped detached next dev can outlive an interrupted Playwright worker and strand next-env.d.ts"
  );
});

test("desktop-only duplicate suppression remains explicit in parent specs", () => {
  const expectedSkipCounts = new Map([
    ["tests/e2e/parent-console.spec.ts", 2],
    ["tests/e2e/parent-console-feature-matrix.spec.ts", 1],
    ["tests/e2e/parent-console-stress.spec.ts", 4],
    ["tests/e2e/teacher-parent-p1-regressions.spec.ts", 1]
  ]);

  for (const [spec, expectedCount] of expectedSkipCounts) {
    const source = readRepoFile(spec);
    const matches = source.match(/test\.skip\(testInfo\.project\.name !== "desktop-chrome"/gu) ?? [];
    assert.equal(matches.length, expectedCount, `${spec} should keep its explicit project de-duplication skips`);
  }
});

test("the Playwright gate freezes all 40 project-test instances as 24 runs and 16 explicit duplicate skips", async () => {
  const distribution = await import(`./parent-console-playwright-distribution.mjs?contract=${Date.now()}`);
  const { default: ParentConsolePlaywrightReporter } = await import(
    `./parent-console-playwright-reporter.mjs?contract=${Date.now()}`
  );
  const discovered = distribution.discoverParentConsolePlaywrightInstances(repoRoot);

  assert.deepEqual(discovered, distribution.parentConsolePlaywrightInstances);
  assert.equal(distribution.parentConsolePlaywrightInstances.length, 40);
  assert.equal(
    distribution.parentConsolePlaywrightInstances.filter((instance) => instance.expectedStatus === "passed").length,
    24
  );
  assert.equal(
    distribution.parentConsolePlaywrightInstances.filter((instance) => instance.expectedStatus === "skipped").length,
    16
  );
  assert.deepEqual(
    distribution.parentConsolePlaywrightGroups.map((group) => ({
      name: group.name,
      instances: group.expectedInstances,
      passed: group.expectedPassed,
      skipped: group.expectedSkipped
    })),
    [
      { name: "shared", instances: 26, passed: 16, skipped: 10 },
      { name: "isolated", instances: 14, passed: 8, skipped: 6 }
    ]
  );

  const syntheticExecution = distribution.parentConsolePlaywrightInstances.map((instance) => ({
    ...instance,
    actualStatus: instance.expectedStatus
  }));
  assert.doesNotThrow(() => distribution.assertParentConsolePlaywrightExecution(
    syntheticExecution,
    ["shared", "isolated"]
  ));
  assert.throws(
    () => distribution.assertParentConsolePlaywrightExecution(syntheticExecution.map((instance, index) => (
      index === 0 ? { ...instance, actualStatus: "skipped" } : instance
    )), ["shared", "isolated"]),
    /expected passed but finished skipped/u
  );
  assert.throws(
    () => distribution.assertParentConsolePlaywrightExecution([], ["shared"]),
    /Missing parent Playwright result/u
  );
  assert.throws(
    () => distribution.assertParentConsolePlaywrightExecution([
      syntheticExecution.find((instance) => instance.group === "shared" && instance.actualStatus === "passed")
    ], ["shared"]),
    /Missing parent Playwright result/u
  );
  assert.throws(
    () => distribution.assertParentConsolePlaywrightExecution([], []),
    /at least one planned group/u
  );
  assert.deepEqual(
    distribution.parentConsolePlaywrightGroupNamesForFiles([
      path.join(repoRoot, "tests/e2e/parent-console.spec.ts")
    ]),
    ["shared"]
  );
  assert.throws(
    () => distribution.normalizeParentConsolePlaywrightResult({
      file: "tests/e2e/unmanifested-parent.spec.ts",
      project: "desktop-chrome",
      title: "unmanifested",
      actualStatus: "passed"
    }),
    /Unmanifested parent Playwright file/u
  );
  assert.throws(
    () => distribution.assertParentConsolePlaywrightExecution([
      {
        ...syntheticExecution.find((instance) => instance.group === "shared" && instance.actualStatus === "passed"),
        title: "unexpected runtime instance"
      }
    ], ["shared"]),
    /Unmanifested parent Playwright instance/u
  );

  const fakeSuite = {
    allTests: () => distribution.parentConsolePlaywrightGroups
      .find((group) => group.name === "shared")
      .files
      .map((file) => ({ location: { file: path.join(repoRoot, file) } }))
  };
  const quietReporterEnd = (reporter) => {
    const originalLog = console.log;
    const originalError = console.error;
    try {
      console.log = () => {};
      console.error = () => {};
      return reporter.onEnd({ status: "passed" });
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  };
  const zeroReporter = new ParentConsolePlaywrightReporter();
  zeroReporter.onBegin({}, fakeSuite);
  assert.deepEqual(quietReporterEnd(zeroReporter), { status: "failed" });

  const partialReporter = new ParentConsolePlaywrightReporter();
  partialReporter.onBegin({}, fakeSuite);
  const [firstSharedResult] = syntheticExecution.filter((instance) => instance.group === "shared");
  partialReporter.onTestEnd({
    id: "partial",
    location: { file: path.join(repoRoot, firstSharedResult.file) },
    parent: { project: () => ({ name: firstSharedResult.project }) },
    title: firstSharedResult.title
  }, { status: firstSharedResult.actualStatus });
  assert.deepEqual(quietReporterEnd(partialReporter), { status: "failed" });

  const retryReporter = new ParentConsolePlaywrightReporter();
  retryReporter.onBegin({}, fakeSuite);
  for (const [index, instance] of syntheticExecution.filter((candidate) => candidate.group === "shared").entries()) {
    const playwrightTest = {
      id: `shared-${index}`,
      location: { file: path.join(repoRoot, instance.file) },
      parent: { project: () => ({ name: instance.project }) },
      title: instance.title
    };
    if (index === 0) retryReporter.onTestEnd(playwrightTest, { status: "failed" });
    retryReporter.onTestEnd(playwrightTest, { status: instance.actualStatus });
  }
  assert.deepEqual(quietReporterEnd(retryReporter), { status: "passed" });

  const ci = readRepoFile(".github/workflows/ci.yml");
  const parentRunLines = ci
    .split("\n")
    .filter((line) => line.trimStart().startsWith("run: npx playwright test tests/e2e/parent-console"));
  assert.equal(parentRunLines.length, 2);
  for (const runLine of parentRunLines) {
    assert.match(runLine, /--reporter=line,\.\/scripts\/parent-console-playwright-reporter\.mjs/u);
    assert.doesNotMatch(runLine, /--list|--pass-with-no-tests/u);
  }
});

test("the existing parent stress instance freezes five-width long-content overflow coverage", () => {
  const stress = readRepoFile("tests/e2e/parent-console-stress.spec.ts");
  const viewportSmoke = readRepoFile("tests/e2e/parent-console.spec.ts");

  assert.match(stress, /const parentOverflowWidths = \[320, 375, 768, 1024, 1440\] as const;/u);
  assert.match(stress, /document\.documentElement\.scrollWidth/u);
  assert.match(stress, /document\.documentElement\.clientWidth/u);
  assert.match(stress, /horizontalOverflowTolerance/u);
  assert.match(stress, /padEnd\(2000, "U"\)/u);
  assert.match(stress, /toHaveLength\(2000\)/u);
  assert.match(stress, /data-parent-messages-layout="three-panel"/u);
  assert.match(stress, /gridTemplateColumns/u);
  assert.match(stress, /Messages must render as three columns at 1440px/u);
  assert.match(stress, /expect\(columnCount,[\s\S]*?\)\.toBe\(3\)/u);
  for (const coverageMarker of [
    "long-unbroken-message",
    "long-url-message",
    "long-english-title",
    "long-traditional-title",
    "long-simplified-title",
    "long-child-name",
    "long-class-name",
    "long-teacher-name"
  ]) {
    assert.match(stress, new RegExp(coverageMarker, "u"));
  }

  assert.match(viewportSmoke, /parent-locale-theme-matrix/u);
  const localeThemeStart = viewportSmoke.indexOf("// parent-locale-theme-matrix");
  const localeThemeEnd = viewportSmoke.indexOf("] as const;", localeThemeStart);
  assert.ok(localeThemeStart >= 0 && localeThemeEnd > localeThemeStart);
  const localeThemeMatrix = viewportSmoke.slice(localeThemeStart, localeThemeEnd);
  assert.equal((localeThemeMatrix.match(/language: "en",/gu) ?? []).length, 2);
  assert.equal((localeThemeMatrix.match(/language: "zh",/gu) ?? []).length, 2);
  assert.equal((localeThemeMatrix.match(/language: "zh-Hans",/gu) ?? []).length, 2);
  assert.equal((localeThemeMatrix.match(/theme: "light",/gu) ?? []).length, 3);
  assert.equal((localeThemeMatrix.match(/theme: "dark",/gu) ?? []).length, 3);
  assert.match(viewportSmoke, /expect\(combinations\)\.toHaveLength\(6\)/u);
  for (const localeMarker of ["en-HK", "zh-Hant-HK", "zh-Hans-CN"]) {
    assert.match(viewportSmoke, new RegExp(localeMarker, "u"));
  }
  assert.match(viewportSmoke, /getByRole\("img"/u);
  assert.match(viewportSmoke, /weeklyDescription/u);
  assert.match(viewportSmoke, /document\.documentElement\.scrollWidth/u);
});

test("the existing feature-matrix instances freeze real browser message-context race coverage", () => {
  const featureMatrix = readRepoFile("tests/e2e/parent-console-feature-matrix.spec.ts");

  for (const coverageMarker of [
    "installDeferredParentThreadFetch",
    "deferred-thread-context-child",
    "deferred-thread-context-all",
    "expectParentReportComposeContext",
    "report-context-a",
    "report-context-b"
  ]) {
    assert.match(featureMatrix, new RegExp(coverageMarker, "u"));
  }
  assert.match(featureMatrix, /window\.history\.pushState/u);
  assert.match(featureMatrix, /page\.goBack\(\)/u);
  assert.match(featureMatrix, /page\.goForward\(\)/u);
  assert.match(featureMatrix, /expectRuntimeLabelAssociation/u);
  assert.match(featureMatrix, /control\.labels\?\.\[0\]/u);
  assert.doesNotMatch(
    featureMatrix,
    /expect\(page\.getByRole\("alert"\)\)\.toHaveCount\(0\)/u,
    "deferred races must scope product alerts below main so Next's route announcer is excluded"
  );
});
