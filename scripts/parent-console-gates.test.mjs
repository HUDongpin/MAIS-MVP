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
  assert.equal(manifest.parentDomainTestFiles.length, 6);
  assert.equal(manifest.expectedParentDomainTestCount, 49);
  assert.equal(countStaticNodeTests(manifest.parentDomainTestFiles), 49);

  assert.deepEqual(manifest.parentConsoleSupportTestFiles, [
    "lib/server/authRouteGuards.test.ts",
    "lib/server/contentSafetySeed.test.ts",
    "lib/server/questionStore.test.ts",
    "app/api/questions/routeQuestionStore.test.ts"
  ]);
  assert.equal(manifest.expectedParentConsoleSupportTestCount, 12);
  assert.equal(countStaticNodeTests(manifest.parentConsoleSupportTestFiles), 12);
  assert.equal(manifest.parentConsoleTestFiles.length, 10);
  assert.equal(manifest.expectedParentConsoleTestCount, 61);
  assert.deepEqual(
    manifest.parentConsoleTestFiles,
    [...manifest.parentConsoleSupportTestFiles, ...manifest.parentDomainTestFiles]
  );

  const tsconfig = JSON.parse(readRepoFile("tsconfig.parent-console.json"));
  assert.deepEqual(tsconfig.files, manifest.parentConsoleTestFiles);

  const runner = readRepoFile("scripts/run-parent-console-tests.mjs");
  assert.match(runner, /parentConsoleTestFiles/u);
  assert.match(runner, /assertParentConsoleTestManifest/u);
});

test("a new app/parent RSC test trips the explicit manifest instead of being silently skipped", async () => {
  const manifest = await import(`./parent-console-test-manifest.mjs?rsc-tripwire=${Date.now()}`);
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "parent-console-manifest-"));
  const newRscTest = "app/parent/parentRscSafeBoundary.test.ts";

  try {
    for (const relativePath of [...manifest.parentConsoleTestFiles, newRscTest]) {
      const absolutePath = path.join(fixtureRoot, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, "// manifest fixture\n");
    }

    assert.throws(
      () => manifest.assertParentConsoleTestManifest(fixtureRoot),
      new RegExp(`Unlisted parent-domain tests: ${newRscTest.replaceAll(".", "\\.")}`, "u")
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
