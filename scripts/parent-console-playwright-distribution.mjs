import { spawnSync } from "node:child_process";
import path from "node:path";

const desktop = "desktop-chrome";
const mobile = "mobile-chrome";

const specs = [
  {
    group: "shared",
    file: "tests/e2e/parent-console-feature-matrix.spec.ts",
    tests: [
      "the Notices route is reachable from parent navigation and renders its receipt surface",
      "a sent teacher notice reaches the parent, the filter narrows it, and Confirm receipt records it",
      "notice receipts stay private to the owning guardian and reject unknown recipients",
      "the Child focus selector re-scopes list routes and swaps the child detail route",
      "the Ask teacher form creates a thread and the Threads list switches between them"
    ],
    passedProjects: [desktop]
  },
  {
    group: "shared",
    file: "tests/e2e/parent-console.spec.ts",
    tests: [
      "parent overview renders without page errors on the active viewport"
    ],
    passedProjects: [desktop, mobile]
  },
  {
    group: "shared",
    file: "tests/e2e/parent-console.spec.ts",
    tests: [
      "parent navigation links and child card open their target views",
      "auth routing and parent API boundaries are enforced",
      "linked child summaries, parent reports, filters, and privacy boundaries work",
      "no-child parent can link a child by invite code and repeated links stay idempotent",
      "parent-teacher messages stay structured and separate from student private threads"
    ],
    passedProjects: [desktop]
  },
  {
    group: "shared",
    file: "tests/e2e/teacher-parent-hydration.spec.ts",
    tests: [
      "teacher console first-load routes hydrate without React page errors",
      "parent console first-load routes hydrate without React page errors"
    ],
    passedProjects: [desktop, mobile]
  },
  {
    group: "isolated",
    file: "tests/e2e/parent-console-stress.spec.ts",
    tests: [
      "parent pages render cleanly across viewport projects and support navigation stress"
    ],
    passedProjects: [desktop, mobile]
  },
  {
    group: "isolated",
    file: "tests/e2e/parent-console-stress.spec.ts",
    tests: [
      "parent APIs enforce auth, validation, privacy, and idempotent child linking",
      "pending and revoked guardian links do not grant parent access after restart",
      "concurrent parent message creation persists across a production restart",
      "same SQLite multi-process preflight blocks a second server before stress results are trusted"
    ],
    passedProjects: [desktop]
  },
  {
    group: "isolated",
    file: "tests/e2e/teacher-parent-p1-regressions.spec.ts",
    tests: [
      "ended live-classroom join codes are no longer readable by students",
      "teacher and parent SSR timestamps hydrate without page errors across UTC server and Hong Kong browser"
    ],
    passedProjects: [desktop]
  }
];

const projects = [desktop, mobile];

function instanceKey(instance) {
  return [instance.group, instance.file, instance.project, instance.title].join("\u0000");
}

function sorted(instances) {
  return [...instances].sort((left, right) => instanceKey(left).localeCompare(instanceKey(right), "en"));
}

export const parentConsolePlaywrightInstances = sorted(specs.flatMap((spec) => (
  spec.tests.flatMap((title) => projects.map((project) => ({
    group: spec.group,
    file: spec.file,
    project,
    title,
    expectedStatus: spec.passedProjects.includes(project) ? "passed" : "skipped"
  })))
)));

export const parentConsolePlaywrightGroups = [
  {
    name: "shared",
    files: [
      "tests/e2e/parent-console.spec.ts",
      "tests/e2e/parent-console-feature-matrix.spec.ts",
      "tests/e2e/teacher-parent-hydration.spec.ts"
    ],
    expectedInstances: 26,
    expectedPassed: 16,
    expectedSkipped: 10
  },
  {
    name: "isolated",
    files: [
      "tests/e2e/parent-console-stress.spec.ts",
      "tests/e2e/teacher-parent-p1-regressions.spec.ts"
    ],
    expectedInstances: 14,
    expectedPassed: 8,
    expectedSkipped: 6
  }
];

const groupByFile = new Map(parentConsolePlaywrightGroups.flatMap((group) => (
  group.files.map((file) => [file, group.name])
)));

function normalizeParentConsolePlaywrightFile(file) {
  const portableFile = file.replaceAll(path.sep, "/");
  const marker = "/tests/e2e/";
  const markerIndex = portableFile.lastIndexOf(marker);
  return markerIndex >= 0
    ? portableFile.slice(markerIndex + 1)
    : portableFile.startsWith("tests/e2e/")
      ? portableFile
      : `tests/e2e/${path.basename(portableFile)}`;
}

function collectJsonInstances(suite, group, instances) {
  for (const spec of suite.specs ?? []) {
    for (const playwrightTest of spec.tests ?? []) {
      instances.push({
        group,
        file: `tests/e2e/${spec.file}`,
        project: playwrightTest.projectName,
        title: spec.title,
        expectedStatus: parentConsolePlaywrightInstances.find((candidate) => (
          candidate.group === group
          && candidate.file === `tests/e2e/${spec.file}`
          && candidate.project === playwrightTest.projectName
          && candidate.title === spec.title
        ))?.expectedStatus ?? "unmanifested"
      });
    }
  }
  for (const child of suite.suites ?? []) collectJsonInstances(child, group, instances);
}

export function discoverParentConsolePlaywrightInstances(repoRoot) {
  const playwrightBin = path.join(repoRoot, "node_modules", ".bin", "playwright");
  const instances = [];
  for (const group of parentConsolePlaywrightGroups) {
    const result = spawnSync(playwrightBin, [
      "test",
      ...group.files,
      `--project=${desktop}`,
      `--project=${mobile}`,
      "--list",
      "--reporter=json"
    ], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 10 * 1_024 * 1_024,
      env: process.env
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Playwright ${group.name} enumeration failed: ${result.stderr || result.stdout}`);
    }
    let report;
    try {
      report = JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Playwright ${group.name} enumeration did not return JSON.`, { cause: error });
    }
    if ((report.errors ?? []).length > 0) {
      throw new Error(`Playwright ${group.name} enumeration reported configuration errors.`);
    }
    for (const suite of report.suites ?? []) collectJsonInstances(suite, group.name, instances);
  }
  return sorted(instances);
}

export function normalizeParentConsolePlaywrightResult({ file, project, title, actualStatus }) {
  const normalizedFile = normalizeParentConsolePlaywrightFile(file);
  const group = groupByFile.get(normalizedFile);
  if (!group) throw new Error(`Unmanifested parent Playwright file: ${normalizedFile}`);
  return { group, file: normalizedFile, project, title, actualStatus };
}

export function parentConsolePlaywrightGroupNamesForFiles(files) {
  const groupNames = new Set(files.map((file) => {
    const normalizedFile = normalizeParentConsolePlaywrightFile(file);
    const groupName = groupByFile.get(normalizedFile);
    if (!groupName) throw new Error(`Unmanifested parent Playwright file: ${normalizedFile}`);
    return groupName;
  }));
  if (groupNames.size === 0) {
    throw new Error("Parent Playwright reporter received an empty planned suite.");
  }
  return parentConsolePlaywrightGroups
    .map((group) => group.name)
    .filter((groupName) => groupNames.has(groupName));
}

export function assertParentConsolePlaywrightExecution(actualResults, selectedGroupNames) {
  if (!Array.isArray(selectedGroupNames) || selectedGroupNames.length === 0) {
    throw new Error("Parent Playwright execution must identify at least one planned group.");
  }
  const uniqueSelectedGroupNames = new Set(selectedGroupNames);
  if (uniqueSelectedGroupNames.size !== selectedGroupNames.length) {
    throw new Error("Parent Playwright execution reported duplicate planned groups.");
  }
  for (const groupName of uniqueSelectedGroupNames) {
    if (!parentConsolePlaywrightGroups.some((group) => group.name === groupName)) {
      throw new Error(`Unmanifested parent Playwright group: ${groupName}`);
    }
  }

  const normalized = actualResults.map(normalizeParentConsolePlaywrightResult);
  const duplicateKeys = normalized
    .map(instanceKey)
    .filter((key, index, keys) => keys.indexOf(key) !== index);
  if (duplicateKeys.length > 0) throw new Error("Duplicate final parent Playwright results were reported.");

  const selectedGroups = uniqueSelectedGroupNames;
  const expected = parentConsolePlaywrightInstances.filter((instance) => selectedGroups.has(instance.group));
  const actualByKey = new Map(normalized.map((instance) => [instanceKey(instance), instance]));
  const expectedByKey = new Map(expected.map((instance) => [instanceKey(instance), instance]));

  for (const instance of normalized) {
    if (!selectedGroups.has(instance.group)) {
      throw new Error(`Unplanned parent Playwright result from group ${instance.group}.`);
    }
    if (!expectedByKey.has(instanceKey(instance))) {
      throw new Error(`Unmanifested parent Playwright instance: ${instance.file} [${instance.project}] ${instance.title}`);
    }
  }
  for (const instance of expected) {
    const actual = actualByKey.get(instanceKey(instance));
    if (!actual) {
      throw new Error(`Missing parent Playwright result: ${instance.file} [${instance.project}] ${instance.title}`);
    }
    if (actual.actualStatus !== instance.expectedStatus) {
      throw new Error(
        `${instance.file} [${instance.project}] ${instance.title} expected ${instance.expectedStatus} `
        + `but finished ${actual.actualStatus}`
      );
    }
  }

  for (const group of parentConsolePlaywrightGroups.filter((candidate) => selectedGroups.has(candidate.name))) {
    const results = normalized.filter((instance) => instance.group === group.name);
    const passed = results.filter((instance) => instance.actualStatus === "passed").length;
    const skipped = results.filter((instance) => instance.actualStatus === "skipped").length;
    if (
      results.length !== group.expectedInstances
      || passed !== group.expectedPassed
      || skipped !== group.expectedSkipped
    ) {
      throw new Error(
        `Parent Playwright ${group.name} distribution changed: `
        + `${results.length} instances, ${passed} passed, ${skipped} skipped; expected `
        + `${group.expectedInstances}/${group.expectedPassed}/${group.expectedSkipped}.`
      );
    }
  }
}
