#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");

export const HK_VISUALIZATION_RELEASE_CONTRACT = Object.freeze({
  canonicalProject: "desktop-chrome",
  canonicalEnvironment: Object.freeze({
    HK_VIZ_ALLOW_PARTIAL: "0",
    HK_VIZ_FULL_MATRIX: "1",
    HK_VIZ_INTERACTION_DEPTH: "full",
    HK_VIZ_LESSON_FULL: "1"
  }),
  expected: Object.freeze({
    hkLabCount: 51,
    lessonBrowserCellCount: 102,
    lessonBrowserPackageCount: 24,
    lessonGradePackageCount: 12,
    lessonTestCount: 28,
    machineCellCount: 918,
    machinePackageCount: 216,
    machineTestCount: 218,
    stateTestCount: 7,
    totalTestCount: 253
  }),
  files: Object.freeze({
    lesson: "tests/e2e/hk-visualization-lesson-embeddability.spec.ts",
    machine: "tests/e2e/hk-visualization-machine-acceptance.spec.ts",
    state: "tests/e2e/hk-visualization-state-isolation.spec.ts"
  }),
  machineSchemaVersion: "hk-viz-machine-acceptance.v3"
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

function sortedStrings(values) {
  return [...values].map(String).sort();
}

function sameStringSet(left, right) {
  return JSON.stringify(sortedStrings(left)) === JSON.stringify(sortedStrings(right));
}

function sameStringArray(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function allBooleansTrue(value) {
  return isRecord(value)
    && Object.values(value).length > 0
    && Object.values(value).every((entry) => entry === true);
}

function formatErrors(errors) {
  const entries = [...errors];
  const visible = entries.slice(0, 80);
  const omitted = entries.length - visible.length;
  const suffix = omitted > 0 ? `\n- ... ${omitted} additional violation(s) omitted.` : "";
  return `HK Visualization release evidence rejected with ${entries.length} violation(s):\n`
    + visible.map((error) => `- ${error}`).join("\n")
    + suffix;
}

export function assertNoInheritedHkVizOverrides(environment = process.env) {
  const inheritedNames = Object.keys(environment)
    .filter((name) => name.startsWith("HK_VIZ_") && environment[name] !== undefined)
    .sort();
  if (inheritedNames.length > 0) {
    throw new Error(
      "The canonical HK Visualization release gate rejects every inherited HK_VIZ_* override. "
      + `Unset these variables and run again: ${inheritedNames.join(", ")}.`
    );
  }
}

export function buildCanonicalHkVisualizationEnvironment({
  baseEnvironment = process.env,
  jsonReportPath,
  runId
}) {
  assertNoInheritedHkVizOverrides(baseEnvironment);
  const childEnvironment = Object.fromEntries(
    Object.entries(baseEnvironment).filter(([name]) => !name.startsWith("HK_VIZ_"))
  );
  return {
    ...childEnvironment,
    ...HK_VISUALIZATION_RELEASE_CONTRACT.canonicalEnvironment,
    PLAYWRIGHT_JSON_OUTPUT_FILE: jsonReportPath,
    PLAYWRIGHT_RUN_ID: runId
  };
}

export function buildCanonicalHkVisualizationInvocation(repositoryRoot = defaultRepositoryRoot) {
  const playwrightCli = require.resolve("@playwright/test/cli");
  const { canonicalProject, files } = HK_VISUALIZATION_RELEASE_CONTRACT;
  return Object.freeze({
    args: Object.freeze([
      playwrightCli,
      "test",
      files.machine,
      files.lesson,
      files.state,
      `--project=${canonicalProject}`,
      "--workers=1",
      "--retries=0",
      "--reporter=list,json"
    ]),
    command: process.execPath,
    cwd: repositoryRoot
  });
}

function flattenReportSpecs(report) {
  const flattened = [];
  const visit = (suite) => {
    if (!isRecord(suite)) return;
    for (const spec of arrayOf(suite.specs)) {
      if (!isRecord(spec)) continue;
      flattened.push({
        ...spec,
        file: normalizedFile(spec.file ?? suite.file)
      });
    }
    for (const nested of arrayOf(suite.suites)) visit(nested);
  };
  for (const suite of arrayOf(report?.suites)) visit(suite);
  return flattened;
}

async function decodeJsonAttachment(attachment, reportPath) {
  let text;
  if (typeof attachment.body === "string") {
    text = Buffer.from(attachment.body, "base64").toString("utf8");
  } else if (typeof attachment.path === "string" && attachment.path.length > 0) {
    const attachmentPath = isAbsolute(attachment.path)
      ? attachment.path
      : resolve(dirname(reportPath), attachment.path);
    text = await readFile(attachmentPath, "utf8");
  } else {
    throw new Error("attachment has neither an inline body nor a readable path");
  }
  return JSON.parse(text);
}

async function collectReportEvidence(report, reportPath, addError) {
  const specs = flattenReportSpecs(report);
  const tests = [];
  const attachments = [];

  for (const spec of specs) {
    const specTests = arrayOf(spec.tests);
    if (specTests.length !== 1) {
      addError(`${spec.file} :: ${spec.title} must contain exactly one desktop-chrome test result; actual=${specTests.length}.`);
    }
    for (const test of specTests) {
      if (!isRecord(test)) continue;
      tests.push({ file: spec.file, spec, test });
      const annotations = [...arrayOf(test.annotations)];
      if (test.expectedStatus !== "passed") {
        addError(`${spec.file} :: ${spec.title} expectedStatus must be passed; actual=${String(test.expectedStatus)}.`);
      }
      if (test.projectName !== HK_VISUALIZATION_RELEASE_CONTRACT.canonicalProject) {
        addError(`${spec.file} :: ${spec.title} ran in ${String(test.projectName)} instead of desktop-chrome.`);
      }
      if (test.status !== "expected") {
        addError(`${spec.file} :: ${spec.title} outcome must be expected; actual=${String(test.status)}.`);
      }

      const results = arrayOf(test.results);
      if (results.length !== 1) {
        addError(`${spec.file} :: ${spec.title} must have exactly one zero-retry result; actual=${results.length}.`);
      }
      for (const result of results) {
        if (!isRecord(result)) continue;
        annotations.push(...arrayOf(result.annotations));
        if (result.status !== "passed") {
          addError(`${spec.file} :: ${spec.title} result must be passed; actual=${String(result.status)}.`);
        }
        if (result.retry !== 0) {
          addError(`${spec.file} :: ${spec.title} used retry=${String(result.retry)}; the release gate requires zero retries.`);
        }
        for (const attachment of arrayOf(result.attachments)) {
          if (!isRecord(attachment)) continue;
          if (attachment.contentType !== "application/json" && !String(attachment.name).endsWith(".json")) continue;
          try {
            attachments.push({
              attachment,
              data: await decodeJsonAttachment(attachment, reportPath),
              file: spec.file,
              result,
              spec,
              test
            });
          } catch (error) {
            addError(
              `${spec.file} :: ${spec.title} has unreadable JSON attachment ${String(attachment.name)}: `
              + `${error instanceof Error ? error.message : String(error)}.`
            );
          }
        }
      }

      for (const annotation of annotations) {
        if (!isRecord(annotation)) continue;
        const type = String(annotation.type ?? "");
        if (forbiddenAnnotationTypes.has(type)) {
          addError(`${spec.file} :: ${spec.title} contains forbidden runtime annotation ${type}.`);
        }
        if (type === "hk-viz-scope" && annotation.description !== "full") {
          addError(`${spec.file} :: ${spec.title} reports non-full hk-viz-scope=${String(annotation.description)}.`);
        }
        if (type === "hk-viz-interaction-depth" && annotation.description !== "full") {
          addError(`${spec.file} :: ${spec.title} reports non-full interaction depth=${String(annotation.description)}.`);
        }
      }
    }
  }

  return { attachments, specs, tests };
}

function attachmentsNamed(evidence, name) {
  return evidence.attachments.filter(({ attachment }) => attachment.name === name);
}

function requireOneAttachment(evidence, name, addError) {
  const matches = attachmentsNamed(evidence, name);
  if (matches.length !== 1) {
    addError(`Expected exactly one ${name} attachment; actual=${matches.length}.`);
  }
  return matches[0] ?? null;
}

function assertArrayEmpty(value, label, addError) {
  if (!Array.isArray(value) || value.length !== 0) {
    addError(`${label} must be an empty array; actualCount=${Array.isArray(value) ? value.length : "not-array"}.`);
  }
}

function assertExactLedger(ledger, expectedCount, label, addError) {
  if (!isRecord(ledger)) {
    addError(`${label} ledger is missing.`);
    return;
  }
  const planned = arrayOf(ledger.plannedCellIds ?? ledger.plannedStepIds);
  const executed = arrayOf(ledger.executedCellIds ?? ledger.executedStepIds);
  const missing = arrayOf(ledger.missingCellIds ?? ledger.missingStepIds);
  const duplicate = arrayOf(ledger.duplicateCellIds ?? ledger.duplicateStepIds);
  if (planned.length !== expectedCount) addError(`${label} planned ledger expected=${expectedCount} actual=${planned.length}.`);
  if (executed.length !== expectedCount) addError(`${label} executed ledger expected=${expectedCount} actual=${executed.length}.`);
  if (!sameStringArray(executed, planned)) addError(`${label} executed ledger does not exactly equal its plan.`);
  if (missing.length !== 0) addError(`${label} has ${missing.length} missing ledger item(s).`);
  if (duplicate.length !== 0) addError(`${label} has ${duplicate.length} duplicate ledger item(s).`);
}

function assertFullMatrix(value, label, addError) {
  if (!isRecord(value)) {
    addError(`${label} full-matrix contract is missing.`);
    return;
  }
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  if (value.allowPartial !== false) addError(`${label} allowPartial must be false.`);
  if (value.fullMatrixRequested !== true) addError(`${label} fullMatrixRequested must be true.`);
  if (value.scope !== "full") addError(`${label} scope must be full; actual=${String(value.scope)}.`);
  if (value.interactionDepth !== "full") addError(`${label} interactionDepth must be full.`);
  if (value.expectedCellCount !== expected.machineCellCount) {
    addError(`${label} expectedCellCount must be ${expected.machineCellCount}; actual=${String(value.expectedCellCount)}.`);
  }
  if (value.expectedPackageCount !== expected.machinePackageCount) {
    addError(`${label} expectedPackageCount must be ${expected.machinePackageCount}; actual=${String(value.expectedPackageCount)}.`);
  }
  if (!sameStringArray(arrayOf(value.languages), ["en", "zh", "zh-Hans"])) {
    addError(`${label} languages must be exactly en, zh, zh-Hans.`);
  }
  if (!sameStringArray(arrayOf(value.themes), ["light", "dark"])) {
    addError(`${label} themes must be exactly light, dark.`);
  }
  const viewportIds = arrayOf(value.viewports).map((viewport) => isRecord(viewport) ? viewport.id : viewport);
  if (!sameStringArray(viewportIds, ["desktop", "tablet", "mobile"])) {
    addError(`${label} viewports must be exactly desktop, tablet, mobile.`);
  }
  assertArrayEmpty(value.explicitFilters, `${label} explicitFilters`, addError);
}

function assertLessonSourceManifest(manifest, label, addError) {
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  if (!isRecord(manifest)) {
    addError(`${label} is not an object.`);
    return;
  }
  if (arrayOf(manifest.rows).length !== expected.hkLabCount) {
    addError(`${label} rows expected=${expected.hkLabCount} actual=${arrayOf(manifest.rows).length}.`);
  }
  assertExactLedger(manifest.ledger, expected.hkLabCount, label, addError);
  const summary = isRecord(manifest.summary) ? manifest.summary : {};
  for (const [name, value] of Object.entries({
    embeddableLessonCount: expected.hkLabCount,
    expectedLabCount: expected.hkLabCount,
    registryLabCount: expected.hkLabCount
  })) {
    if (summary[name] !== value) addError(`${label} summary.${name} expected=${value} actual=${String(summary[name])}.`);
  }
  const contract = isRecord(manifest.contract) ? manifest.contract : {};
  for (const name of ["quadraticRouteExact", "legacySeniorRoutingExact", "newS3RoutingExact"]) {
    if (contract[name] !== true) addError(`${label} contract.${name} must be true.`);
  }
  for (const name of [
    "catalogOnlyLabIds",
    "duplicateLessonLabIds",
    "duplicateRouteSlugs",
    "duplicateTopicLabIds",
    "gradeContractDriftLabIds",
    "invalidBindingLabIds",
    "missingLessonLabIds",
    "missingTopicLabIds",
    "notEmbeddableLabIds",
    "slugContractDriftLabIds"
  ]) {
    assertArrayEmpty(contract[name], `${label} contract.${name}`, addError);
  }
}

function annotationValue(entry, type) {
  const annotations = [
    ...arrayOf(entry.test?.annotations),
    ...arrayOf(entry.result?.annotations)
  ];
  return annotations.find((annotation) => isRecord(annotation) && annotation.type === type)?.description;
}

function validateMachineEvidence(evidence, addError) {
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  const file = HK_VISUALIZATION_RELEASE_CONTRACT.files.machine;
  const manifestEntry = requireOneAttachment(evidence, "hk-visualization-matrix-manifest.json", addError);
  const manifest = manifestEntry?.data;
  if (!isRecord(manifest)) {
    addError("Machine matrix manifest is missing or malformed.");
    return;
  }
  if (manifest.schemaVersion !== HK_VISUALIZATION_RELEASE_CONTRACT.machineSchemaVersion) {
    addError(`Machine matrix schema version drifted: ${String(manifest.schemaVersion)}.`);
  }
  const catalog = isRecord(manifest.catalog) ? manifest.catalog : {};
  if (catalog.allHkLabCount !== expected.hkLabCount || catalog.selectedLabCount !== expected.hkLabCount) {
    addError(`Machine manifest must select all ${expected.hkLabCount} HK labs.`);
  }
  assertFullMatrix(manifest.matrix, "Machine manifest", addError);
  const manifestPlan = isRecord(manifest.plan) ? manifest.plan : {};
  const manifestPackageIds = arrayOf(manifestPlan.packageIds);
  const manifestCellIds = arrayOf(manifestPlan.plannedCellIds);
  if (manifestPackageIds.length !== expected.machinePackageCount) {
    addError(`Machine manifest package count expected=${expected.machinePackageCount} actual=${manifestPackageIds.length}.`);
  }
  if (manifestCellIds.length !== expected.machineCellCount) {
    addError(`Machine manifest cell count expected=${expected.machineCellCount} actual=${manifestCellIds.length}.`);
  }
  if (duplicateValues(manifestPackageIds).length > 0) addError("Machine manifest contains duplicate package IDs.");
  if (duplicateValues(manifestCellIds).length > 0) addError("Machine manifest contains duplicate cell IDs.");

  const packages = evidence.attachments.filter(({ data }) =>
    isRecord(data)
    && data.schemaVersion === HK_VISUALIZATION_RELEASE_CONTRACT.machineSchemaVersion
    && isRecord(data.package)
    && isRecord(data.matrix)
  );
  if (packages.length !== expected.machinePackageCount) {
    addError(`Machine evidence package count expected=${expected.machinePackageCount} actual=${packages.length}.`);
  }

  const packageIds = [];
  const plannedCellIds = [];
  const executedCellIds = [];
  for (const entry of packages) {
    const result = entry.data;
    const packageData = result.package;
    const packageId = String(packageData.id ?? "");
    const label = `Machine package ${packageId || "<missing-id>"}`;
    packageIds.push(packageId);
    if (entry.file !== file) addError(`${label} came from unexpected file ${entry.file}.`);
    if (entry.spec.title !== `${packageId} exercises every selected HK lab`) {
      addError(`${label} attachment is not owned by its exact package test title.`);
    }
    if (annotationValue(entry, "hk-viz-scope") !== "full") addError(`${label} lacks hk-viz-scope=full annotation.`);
    if (annotationValue(entry, "hk-viz-interaction-depth") !== "full") addError(`${label} lacks full interaction annotation.`);
    if (annotationValue(entry, "hk-viz-package") !== packageId) addError(`${label} package annotation does not match.`);
    if (entry.attachment.name !== `${packageId}.json`) addError(`${label} attachment name does not match package ID.`);
    if (result.status !== "passed") addError(`${label} status must be passed.`);
    assertArrayEmpty(result.failures, `${label} failures`, addError);
    assertFullMatrix(result.matrix, label, addError);
    const planned = arrayOf(packageData.plannedCellIds);
    const executed = arrayOf(packageData.executedCellIds);
    plannedCellIds.push(...planned);
    executedCellIds.push(...executed);
    if (!sameStringArray(executed, planned)) addError(`${label} executed cells do not exactly equal planned cells.`);
    assertArrayEmpty(packageData.missingCellIds, `${label} missingCellIds`, addError);
    assertArrayEmpty(packageData.duplicateCellIds, `${label} duplicateCellIds`, addError);
    const cells = arrayOf(result.cells);
    if (cells.length !== planned.length) addError(`${label} cell evidence count does not equal its plan.`);
    if (cells.some((cell) => !isRecord(cell) || cell.status !== "passed")) addError(`${label} contains a non-passing cell.`);
    if (!sameStringSet(cells.map((cell) => isRecord(cell) ? cell.cellId : ""), planned)) {
      addError(`${label} cell evidence IDs do not equal its plan.`);
    }
    const summary = isRecord(result.summary) ? result.summary : {};
    if (summary.plannedCellCount !== planned.length || summary.executedCellCount !== planned.length) {
      addError(`${label} summary planned/executed counts do not equal ${planned.length}.`);
    }
    if (summary.failedCellCount !== 0 || summary.missingCellCount !== 0 || summary.passedCellCount !== planned.length) {
      addError(`${label} summary is not a complete pass.`);
    }
  }

  if (!sameStringSet(packageIds, manifestPackageIds)) addError("Machine evidence package IDs do not equal the manifest plan.");
  if (plannedCellIds.length !== expected.machineCellCount) {
    addError(`Machine package ledger planned cells expected=${expected.machineCellCount} actual=${plannedCellIds.length}.`);
  }
  if (executedCellIds.length !== expected.machineCellCount) {
    addError(`Machine package ledger executed cells expected=${expected.machineCellCount} actual=${executedCellIds.length}.`);
  }
  if (duplicateValues(plannedCellIds).length > 0) addError("Machine package evidence contains duplicate planned cells.");
  if (!sameStringSet(plannedCellIds, manifestCellIds)) addError("Machine package cells do not equal the 918-cell manifest plan.");
  if (!sameStringArray(executedCellIds, plannedCellIds)) addError("Machine aggregate execution order does not exactly equal its plan.");
}

function validateLessonEvidence(evidence, addError) {
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  const file = HK_VISUALIZATION_RELEASE_CONTRACT.files.lesson;
  const sourceEntry = requireOneAttachment(evidence, "hk-visualization-lesson-source-manifest.json", addError);
  assertLessonSourceManifest(sourceEntry?.data, "Lesson source manifest", addError);
  if (sourceEntry && sourceEntry.file !== file) addError("Lesson source manifest came from an unexpected spec file.");

  const gradeEntry = requireOneAttachment(evidence, "hk-visualization-lesson-grade-packages.json", addError);
  const gradeData = gradeEntry?.data;
  const gradePackages = isRecord(gradeData) ? arrayOf(gradeData.packages) : [];
  if (gradePackages.length !== expected.lessonGradePackageCount) {
    addError(`Lesson grade package count expected=${expected.lessonGradePackageCount} actual=${gradePackages.length}.`);
  }
  const gradeIds = gradePackages.map((entry) => isRecord(entry) ? String(entry.id ?? "") : "");
  const gradeLabIds = gradePackages.flatMap((entry) => isRecord(entry) ? arrayOf(entry.plannedLabIds) : []);
  if (duplicateValues(gradeIds).length > 0) addError("Lesson grade package manifest contains duplicate IDs.");
  if (gradeLabIds.length !== expected.hkLabCount || duplicateValues(gradeLabIds).length > 0) {
    addError(`Lesson grade packages must contain exactly ${expected.hkLabCount} unique lab IDs.`);
  }

  const packages = evidence.attachments.filter(({ data }) => {
    const packageId = isRecord(data) && isRecord(data.package) ? data.package.id : null;
    return typeof packageId === "string" && /^hk-viz-lesson-(desktop|mobile)-/.test(packageId);
  });
  if (packages.length !== expected.lessonBrowserPackageCount) {
    addError(`LessonView browser package count expected=${expected.lessonBrowserPackageCount} actual=${packages.length}.`);
  }
  const expectedPackageIds = ["desktop", "mobile"].flatMap((viewport) =>
    gradeIds.map((gradeId) => gradeId.replace("hk-viz-lesson-", `hk-viz-lesson-${viewport}-`))
  );
  const packageIds = [];
  const plannedCellIds = [];
  const executedCellIds = [];
  for (const entry of packages) {
    const result = entry.data;
    const packageData = result.package;
    const packageId = String(packageData.id ?? "");
    const label = `LessonView package ${packageId || "<missing-id>"}`;
    packageIds.push(packageId);
    if (entry.file !== file) addError(`${label} came from unexpected file ${entry.file}.`);
    const viewport = String(packageData.viewportId ?? "");
    const grade = String(packageData.grade ?? "");
    if (entry.spec.title !== `${viewport}/${grade} verifies every planned lesson embed`) {
      addError(`${label} attachment is not owned by its exact package test title.`);
    }
    if (entry.attachment.name !== `${packageId}.json`) addError(`${label} attachment name does not match package ID.`);
    if (result.status !== "passed") addError(`${label} status must be passed.`);
    const run = isRecord(result.run) ? result.run : {};
    if (run.allowPartial !== false || run.fullBrowserRequested !== true || run.releaseAcceptance !== true) {
      addError(`${label} is not full release acceptance evidence.`);
    }
    const planned = arrayOf(packageData.plannedCellIds);
    const executed = arrayOf(packageData.executedCellIds);
    plannedCellIds.push(...planned);
    executedCellIds.push(...executed);
    if (!sameStringArray(executed, planned)) addError(`${label} executed cells do not exactly equal planned cells.`);
    assertArrayEmpty(packageData.missingCellIds, `${label} missingCellIds`, addError);
    assertArrayEmpty(packageData.duplicateCellIds, `${label} duplicateCellIds`, addError);
    const cells = arrayOf(result.cells);
    if (cells.length !== planned.length) addError(`${label} cell evidence count does not equal its plan.`);
    for (const cell of cells) {
      if (!isRecord(cell) || cell.status !== "passed") {
        addError(`${label} contains a non-passing cell.`);
        continue;
      }
      if (arrayOf(cell.failures).length !== 0) addError(`${label} cell ${String(cell.cellId)} carries failures.`);
      if (arrayOf(cell.renderOnlyWriteRequests).length !== 0) {
        addError(`${label} cell ${String(cell.cellId)} observed a render-only write.`);
      }
      const contract = isRecord(cell.contract) ? cell.contract : {};
      if (contract.renderOnlyNoWrite !== true) addError(`${label} cell ${String(cell.cellId)} lacks no-write proof.`);
      if (contract.collisionCount !== 0) addError(`${label} cell ${String(cell.cellId)} has collisionCount=${String(contract.collisionCount)}.`);
    }
    if (!sameStringSet(cells.map((cell) => isRecord(cell) ? cell.cellId : ""), planned)) {
      addError(`${label} cell evidence IDs do not equal its plan.`);
    }
    const summary = isRecord(result.summary) ? result.summary : {};
    if (summary.plannedCellCount !== planned.length || summary.executedCellCount !== planned.length) {
      addError(`${label} summary planned/executed counts do not equal ${planned.length}.`);
    }
    if (summary.failedCellCount !== 0 || summary.missingCellCount !== 0 || summary.passedCellCount !== planned.length) {
      addError(`${label} summary is not a complete pass.`);
    }
  }

  if (!sameStringSet(packageIds, expectedPackageIds)) addError("LessonView package IDs do not equal the exact 12-grade × 2-viewport plan.");
  if (plannedCellIds.length !== expected.lessonBrowserCellCount) {
    addError(`LessonView planned cell count expected=${expected.lessonBrowserCellCount} actual=${plannedCellIds.length}.`);
  }
  if (executedCellIds.length !== expected.lessonBrowserCellCount) {
    addError(`LessonView executed cell count expected=${expected.lessonBrowserCellCount} actual=${executedCellIds.length}.`);
  }
  if (duplicateValues(plannedCellIds).length > 0) addError("LessonView browser evidence contains duplicate cells.");
  if (!sameStringArray(executedCellIds, plannedCellIds)) addError("LessonView aggregate execution order does not exactly equal its plan.");
}

function assertPassedEvidence(value, label, addError) {
  if (!isRecord(value)) {
    addError(`${label} is missing or malformed.`);
    return;
  }
  if (value.status !== "passed") addError(`${label} status must be passed.`);
  assertArrayEmpty(value.failures, `${label} failures`, addError);
  if (!allBooleansTrue(value.contract)) addError(`${label} contract must contain only true boolean checks.`);
}

function validateStateAndNoWriteEvidence(evidence, addError) {
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  const file = HK_VISUALIZATION_RELEASE_CONTRACT.files.state;
  const requiredNames = [
    "hk-visualization-state-isolation-plan.json",
    "hk-visualization-all-topics-state-plan.json",
    "hk-visualization-all-topics-pure-evidence.json",
    "hk-visualization-state-isolation-evidence.json",
    "hk-visualization-render-no-write-evidence.json",
    "hk-visualization-all-topics-source-gate.json",
    "hk-visualization-all-topics-runtime-evidence.json"
  ];
  const required = Object.fromEntries(requiredNames.map((name) => [name, requireOneAttachment(evidence, name, addError)]));
  for (const [name, entry] of Object.entries(required)) {
    if (entry && entry.file !== file) addError(`${name} came from unexpected file ${entry.file}.`);
  }

  const twoTopicPlan = required[requiredNames[0]]?.data;
  if (!isRecord(twoTopicPlan) || twoTopicPlan.expectedRecordCount !== 2 || arrayOf(twoTopicPlan.topics).length !== 2) {
    addError("State-isolation plan must contain exactly two topic-scoped records.");
  }
  const allTopicPlan = required[requiredNames[1]]?.data;
  if (!isRecord(allTopicPlan)
    || allTopicPlan.expectedRecordCount !== expected.hkLabCount
    || arrayOf(allTopicPlan.topics).length !== expected.hkLabCount) {
    addError(`All-topics state plan must contain exactly ${expected.hkLabCount} topics.`);
  }

  const pure = required[requiredNames[2]]?.data;
  if (!isRecord(pure) || pure.passing?.status !== "passed" || pure.rejected?.status !== "failed" || pure.rejectedShape?.status !== "failed") {
    addError("All-topics pure evidence must prove one positive case and both negative guards.");
  }

  const isolation = required[requiredNames[3]]?.data;
  assertPassedEvidence(isolation, "Topic-scoped state-isolation evidence", addError);
  if (isRecord(isolation)) assertExactLedger(isolation.ledger, 12, "Topic-scoped state-isolation evidence", addError);

  const noWrite = required[requiredNames[4]]?.data;
  assertPassedEvidence(noWrite, "Render-only no-write evidence", addError);
  if (isRecord(noWrite)) {
    assertArrayEmpty(noWrite.observedVisualizationWriteRequests, "Render-only no-write observed requests", addError);
    assertExactLedger(noWrite.ledger, 7, "Render-only no-write evidence", addError);
    for (const phase of ["before", "after"]) {
      const snapshot = isRecord(noWrite[phase]) ? noWrite[phase] : {};
      if (!allBooleansTrue(snapshot.readable)) addError(`Render-only no-write ${phase} snapshot is not fully readable.`);
    }
  }

  const sourceGate = required[requiredNames[5]]?.data;
  assertLessonSourceManifest(sourceGate, "State suite lesson source gate", addError);

  const runtime = required[requiredNames[6]]?.data;
  if (!isRecord(runtime)) {
    addError("All-topics runtime evidence is missing or malformed.");
  } else {
    assertPassedEvidence(runtime.evidence, "All-topics runtime state evidence", addError);
    if (runtime.getStatus !== 200) addError(`All-topics runtime GET status must be 200; actual=${String(runtime.getStatus)}.`);
    const postResults = arrayOf(runtime.postResults);
    if (postResults.length !== expected.hkLabCount) {
      addError(`All-topics runtime POST result count expected=${expected.hkLabCount} actual=${postResults.length}.`);
    }
    if (postResults.some((result) => !isRecord(result) || result.ok !== true || result.responseExact !== true)) {
      addError("All-topics runtime evidence contains a non-exact POST response.");
    }
    if (isRecord(runtime.evidence)) {
      assertExactLedger(runtime.evidence.ledger, expected.hkLabCount, "All-topics runtime state evidence", addError);
      if (arrayOf(runtime.evidence.observed?.records).length !== expected.hkLabCount) {
        addError(`All-topics runtime observed record count must be ${expected.hkLabCount}.`);
      }
    }
  }
}

function scanForPartialEvidence(value, label, addError, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForPartialEvidence(entry, `${label}[${index}]`, addError, seen));
    return;
  }
  if (value.allowPartial === true) addError(`${label} contains allowPartial=true.`);
  if (value.fullMatrixRequested === false) addError(`${label} contains fullMatrixRequested=false.`);
  if (value.fullBrowserRequested === false) addError(`${label} contains fullBrowserRequested=false.`);
  if (value.releaseAcceptance === false) addError(`${label} contains releaseAcceptance=false.`);
  if (value.scope === "partial") addError(`${label} contains scope=partial.`);
  if (value.interactionDepth === "layout") addError(`${label} contains interactionDepth=layout.`);
  if (Array.isArray(value.explicitFilters) && value.explicitFilters.length > 0) {
    addError(`${label} contains ${value.explicitFilters.length} explicit filter(s).`);
  }
  for (const [name, child] of Object.entries(value)) {
    scanForPartialEvidence(child, `${label}.${name}`, addError, seen);
  }
}

export async function validateHkVisualizationPlaywrightReport(report, {
  reportPath = join(defaultRepositoryRoot, "playwright-report.json")
} = {}) {
  const errors = new Set();
  const addError = (message) => errors.add(message);
  if (!isRecord(report)) throw new Error("HK Visualization Playwright report must be a JSON object.");
  const reportErrors = arrayOf(report.errors);
  if (reportErrors.length !== 0) addError(`Playwright reporter contains ${reportErrors.length} top-level error(s).`);
  const stats = isRecord(report.stats) ? report.stats : {};
  const expected = HK_VISUALIZATION_RELEASE_CONTRACT.expected;
  for (const name of ["skipped", "unexpected", "flaky"]) {
    if (stats[name] !== 0) addError(`Playwright stats.${name} must be 0; actual=${String(stats[name])}.`);
  }
  if (stats.expected !== expected.totalTestCount) {
    addError(`Playwright stats.expected must be ${expected.totalTestCount}; actual=${String(stats.expected)}.`);
  }

  const evidence = await collectReportEvidence(report, reportPath, addError);
  const expectedFiles = Object.values(HK_VISUALIZATION_RELEASE_CONTRACT.files);
  const actualFiles = [...new Set(evidence.specs.map((spec) => spec.file))];
  if (!sameStringSet(actualFiles, expectedFiles)) {
    addError(`Report files must be exactly [${expectedFiles.join(", ")}]; actual=[${actualFiles.join(", ")}].`);
  }
  const expectedCountsByFile = {
    [HK_VISUALIZATION_RELEASE_CONTRACT.files.machine]: expected.machineTestCount,
    [HK_VISUALIZATION_RELEASE_CONTRACT.files.lesson]: expected.lessonTestCount,
    [HK_VISUALIZATION_RELEASE_CONTRACT.files.state]: expected.stateTestCount
  };
  for (const [file, expectedCount] of Object.entries(expectedCountsByFile)) {
    const actualCount = evidence.tests.filter((entry) => entry.file === file).length;
    if (actualCount !== expectedCount) addError(`${file} test count expected=${expectedCount} actual=${actualCount}.`);
  }
  if (evidence.tests.length !== expected.totalTestCount) {
    addError(`Reporter test count expected=${expected.totalTestCount} actual=${evidence.tests.length}.`);
  }

  validateMachineEvidence(evidence, addError);
  validateLessonEvidence(evidence, addError);
  validateStateAndNoWriteEvidence(evidence, addError);
  for (const entry of evidence.attachments) {
    scanForPartialEvidence(entry.data, `attachment ${String(entry.attachment.name)}`, addError);
  }

  if (errors.size > 0) throw new Error(formatErrors(errors));
  return Object.freeze({
    canonicalProject: HK_VISUALIZATION_RELEASE_CONTRACT.canonicalProject,
    lessonBrowserCells: expected.lessonBrowserCellCount,
    lessonBrowserPackages: expected.lessonBrowserPackageCount,
    machineCells: expected.machineCellCount,
    machinePackages: expected.machinePackageCount,
    reportPath,
    stateAndNoWriteTests: expected.stateTestCount,
    status: "passed",
    tests: expected.totalTestCount
  });
}

export async function validateHkVisualizationPlaywrightReportFile(reportPath) {
  const resolvedReportPath = resolve(reportPath);
  const report = JSON.parse(await readFile(resolvedReportPath, "utf8"));
  return validateHkVisualizationPlaywrightReport(report, { reportPath: resolvedReportPath });
}

function runChild(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, options);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Playwright was terminated by signal ${signal}.`));
      else resolvePromise(code ?? 1);
    });
  });
}

function releaseRunId() {
  return `hk-viz-release-${new Date().toISOString().replace(/[^0-9TZ]/g, "")}-${process.pid}`;
}

export async function runHkVisualizationReleaseGate({
  baseEnvironment = process.env,
  repositoryRoot = defaultRepositoryRoot
} = {}) {
  assertNoInheritedHkVizOverrides(baseEnvironment);
  const invocation = buildCanonicalHkVisualizationInvocation(repositoryRoot);
  const missingSpecs = Object.values(HK_VISUALIZATION_RELEASE_CONTRACT.files)
    .filter((file) => !existsSync(join(repositoryRoot, file)));
  if (missingSpecs.length > 0) {
    throw new Error(`Canonical HK Visualization specs are missing: ${missingSpecs.join(", ")}.`);
  }

  const runId = releaseRunId();
  const artifactsDirectory = join(repositoryRoot, ".tmp", "hk-visualization-release-gate", runId);
  const reportPath = join(artifactsDirectory, "playwright-report.json");
  const summaryPath = join(artifactsDirectory, "gate-summary.json");
  await mkdir(artifactsDirectory, { recursive: true });
  const environment = buildCanonicalHkVisualizationEnvironment({
    baseEnvironment,
    jsonReportPath: reportPath,
    runId
  });

  const exitCode = await runChild(invocation.command, invocation.args, {
    cwd: invocation.cwd,
    env: environment,
    stdio: "inherit"
  });
  let validation;
  let validationError = null;
  if (existsSync(reportPath)) {
    try {
      validation = await validateHkVisualizationPlaywrightReportFile(reportPath);
    } catch (error) {
      validationError = error;
    }
  } else {
    validationError = new Error(`Playwright did not produce the required JSON report at ${reportPath}.`);
  }

  const summary = {
    artifactsDirectory,
    canonicalEnvironment: HK_VISUALIZATION_RELEASE_CONTRACT.canonicalEnvironment,
    canonicalProject: HK_VISUALIZATION_RELEASE_CONTRACT.canonicalProject,
    exitCode,
    generatedAt: new Date().toISOString(),
    reportPath,
    runId,
    status: exitCode === 0 && !validationError ? "passed" : "failed",
    validation: validation ?? null,
    validationError: validationError instanceof Error ? validationError.message : null
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  if (exitCode !== 0 || validationError) {
    const details = [
      exitCode !== 0 ? `Playwright exited with code ${exitCode}.` : null,
      validationError instanceof Error ? validationError.message : null,
      `Evidence directory: ${artifactsDirectory}`
    ].filter(Boolean).join("\n");
    throw new Error(details);
  }

  return { ...summary, summaryPath };
}

function usage() {
  return [
    "Usage:",
    "  node scripts/run-hk-visualization-release-gate.mjs",
    "  node scripts/run-hk-visualization-release-gate.mjs --validate-report <playwright-report.json>",
    "",
    "The run command rejects all inherited HK_VIZ_* variables and always executes",
    "the exact HK machine, LessonView, and state/no-write suites in desktop-chrome."
  ].join("\n");
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    console.log(usage());
    return;
  }
  if (argv.length === 2 && argv[0] === "--validate-report") {
    assertNoInheritedHkVizOverrides(process.env);
    const result = await validateHkVisualizationPlaywrightReportFile(argv[1]);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (argv.length !== 0) throw new Error(`Unknown arguments.\n${usage()}`);
  const result = await runHkVisualizationReleaseGate();
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
