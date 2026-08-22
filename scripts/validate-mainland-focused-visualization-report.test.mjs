import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import test from "node:test";

import {
  MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
  MAINLAND_FOCUSED_VISUALIZATION_OUTER_SUPERVISOR_CONTRACT,
  validateMainlandFocusedVisualizationRawReplayLedger,
  validateMainlandFocusedVisualizationReport,
} from "./validate-mainland-focused-visualization-report.mjs";
import {
  MUTABLE_BROWSER_PATH_FLAGS,
  buildStarshipE2ePathManifest,
} from "./starship-e2e-path-gate.mjs";

const repositoryRoot = "/Volumes/Starship/focused-report-test";
const pathManifest = buildStarshipE2ePathManifest({
  repositoryRoot,
  runId: "focused-report-test",
});
const reportPath = `${pathManifest.paths.e2eRunRoot}/playwright-report.json`;
const pathManifestPath = pathManifest.paths.pathManifestPath;
const browserProcessEvidencePath = pathManifest.paths.browserProcessEvidencePath;
const browserProfileEvidencePath = pathManifest.paths.browserProfileEvidencePath;
const configFile = `${repositoryRoot}/playwright.config.ts`;
const globalSetup = `${repositoryRoot}/tests/e2e/starship-e2e-global-setup.ts`;
const stateIds = ["lab-a:state-01", "lab-a:state-02"];
const statePlanSha256 = createHash("sha256")
  .update(`${stateIds.join("\n")}\n`)
  .digest("hex");
const plannedStateDescriptors = stateIds.map((stateId) => ({
  plan: {
    controlParameter: null,
    kind: "fixture",
    mode: null,
    request: null,
  },
  stateId,
}));
const stateDescriptorPlanSha256 =
  "43f4ebd5641067ab8d08e6868eb787c63604cb5dcfa82d7263d3f58089e913b2";
const focusedLabIds = Object.freeze({
  G03: "bnu-junior-s1-upper-rational-numbers",
  G04: "bnu-primary-p5-lower-fraction-add-sub",
  G05: "bnu-primary-p6-upper-percentage-applications",
  G06: "pep-primary-p6-lower-ratio-proportion-scale",
});
const rawReplayTopicIds = Object.freeze({
  G03: [
    "bnu-junior-s1-upper-rational-numbers",
    "bnu-junior-s2-upper-real-numbers",
    "hjb-junior-s2-upper-quadratic-radicals",
    "hjb-junior-s2-upper-real-numbers",
    "hjb-primary-p6-lower-rational-numbers",
    "pep-junior-s1-upper-rational-numbers",
  ],
  G04: [
    "bnu-primary-p5-lower-fraction-add-sub",
    "bnu-primary-p5-lower-fraction-division",
    "bnu-primary-p5-lower-fraction-multiplication",
    "hjb-primary-p5-lower-fractions-equivalence-operations",
    "pep-primary-p5-lower-factors-fractions",
  ],
  G05: [
    "bnu-primary-p6-upper-percentage-applications",
    "pep-primary-p6-upper-percent-fractions",
  ],
  G06: ["pep-primary-p6-lower-ratio-proportion-scale"],
});
const integrationArtifactPaths = Object.freeze({
  collisionScanner: "tests/e2e/hk-visualization-collision-scanner.ts",
  contrastScanner: "tests/e2e/hk-visualization-text-contrast-scanner.ts",
  durabilityBrowser: "tests/e2e/visualization-lesson-session-durability-browser.ts",
  durabilityBrowserTest: "tests/e2e/visualization-lesson-session-durability-browser.test.ts",
  durabilityPure: "tests/e2e/visualization-lesson-session-durability.ts",
  durabilityPureTest: "tests/e2e/visualization-lesson-session-durability.test.ts",
  focusedReportValidator: "scripts/validate-mainland-focused-visualization-report.mjs",
  focusedReportValidatorTest: "scripts/validate-mainland-focused-visualization-report.test.mjs",
  nextEnv: "next-env.d.ts",
  scannerSixCaseTest: "tests/e2e/hk-visualization-scanner-six-case-contract.test.mjs",
});
const fixtureArtifactBytes = (relativePath) => `fixture bytes for ${relativePath}\n`;
const fixtureSha256 = (relativePath) => createHash("sha256")
  .update(fixtureArtifactBytes(relativePath))
  .digest("hex");
const shasumAggregate = (relativePaths) => createHash("sha256")
  .update(relativePaths.map((relativePath) =>
    `${fixtureSha256(relativePath)}  ${relativePath}\n`
  ).join(""))
  .digest("hex");
const scannerAggregate = () => {
  const hash = createHash("sha256");
  for (const relativePath of [
    integrationArtifactPaths.collisionScanner,
    integrationArtifactPaths.contrastScanner,
    integrationArtifactPaths.scannerSixCaseTest,
  ]) {
    hash.update(relativePath);
    hash.update(Uint8Array.of(0));
    hash.update(fixtureArtifactBytes(relativePath));
  }
  return hash.digest("hex");
};
const durabilityPaths = Object.freeze([
  integrationArtifactPaths.durabilityBrowser,
  integrationArtifactPaths.durabilityBrowserTest,
  integrationArtifactPaths.durabilityPure,
  integrationArtifactPaths.durabilityPureTest,
]);

function focusedIntegrationSource(groupId) {
  const common = {
    collisionScanner: fixtureSha256(integrationArtifactPaths.collisionScanner),
    contrastScanner: fixtureSha256(integrationArtifactPaths.contrastScanner),
    durabilityBrowser: fixtureSha256(integrationArtifactPaths.durabilityBrowser),
    durabilityBrowserTest: fixtureSha256(integrationArtifactPaths.durabilityBrowserTest),
    durabilityPure: fixtureSha256(integrationArtifactPaths.durabilityPure),
    durabilityPureTest: fixtureSha256(integrationArtifactPaths.durabilityPureTest),
    focusedReportValidator: fixtureSha256(integrationArtifactPaths.focusedReportValidator),
    focusedReportValidatorTest: fixtureSha256(integrationArtifactPaths.focusedReportValidatorTest),
    nextEnv: fixtureSha256(integrationArtifactPaths.nextEnv),
    scannerSixCaseTest: fixtureSha256(integrationArtifactPaths.scannerSixCaseTest),
  };
  if (groupId !== "G04") return common;
  return {
    durabilityBrowser: common.durabilityBrowser,
    durabilityBrowserPairAggregate: shasumAggregate(durabilityPaths.slice(0, 2)),
    durabilityBrowserTest: common.durabilityBrowserTest,
    durabilityFourFileAggregate: shasumAggregate(durabilityPaths),
    durabilityPure: common.durabilityPure,
    durabilityPureTest: common.durabilityPureTest,
    focusedReportValidator: common.focusedReportValidator,
    focusedReportValidatorTest: common.focusedReportValidatorTest,
    nextEnv: common.nextEnv,
    scannerCollision: common.collisionScanner,
    scannerContrast: common.contrastScanner,
    scannerPackageAggregate: scannerAggregate(),
    scannerSixCaseTest: common.scannerSixCaseTest,
  };
}

function focusedSourceAggregates() {
  return {
    durabilityBrowserPairSha256: shasumAggregate(durabilityPaths.slice(0, 2)),
    durabilityFourFileSha256: shasumAggregate(durabilityPaths),
    durabilitySerialization:
      "shasum-a-256-lowercase-digest-two-spaces-repo-relative-path-lf-fixed-order",
    scannerEntries: [
      integrationArtifactPaths.collisionScanner,
      integrationArtifactPaths.contrastScanner,
      integrationArtifactPaths.scannerSixCaseTest,
    ],
    scannerSerialization:
      "ordered-repo-relative-path-utf8-nul-raw-file-bytes-no-final-separator",
    scannerSha256: scannerAggregate(),
  };
}
const contract = {
  projects: ["desktop-chrome", "mobile-chrome"],
  groups: [{
    attachmentPrefix: "focused-a-",
    canonicalExecutionCount: 2,
    chunks: [{ chunkId: "lab-a:chunk-01-of-01", stateCount: 2 }],
    file: "tests/e2e/focused-a.spec.ts",
    id: "A",
    schemaVersion: "focused-a.v1",
    stateCountPerProject: 2,
    stateDescriptorPlanSha256,
    statePlanSha256,
  }],
};

function positiveReceipt(stateId) {
  return {
    action: { status: "accepted" },
    collision: {
      inspectedCandidateCount: 1,
      learnerControlCount: 1,
      totalCandidatePairCount: 1,
    },
    configuredState: "focused-a-state",
    contrast: {
      audited: 1,
      auditedTextCount: 1,
      minRatio: 7,
      requiredRatio: 4.5,
      worstTarget: "focused-a-label",
    },
    controls: [{ disabled: false, id: "focused-a-control" }],
    domain: { observed: { value: 1 } },
    geometry: { status: "supported" },
    layout: { targetCount: 1 },
    mode: "focused-a-mode",
    productAction: { status: "accepted" },
    productActionReceipt: { status: "accepted" },
    runtimeSignature: { stable: true },
    stateId,
    touchTargetCount: 1,
    visual: { status: "supported" },
  };
}

function evidence(project, overrides = {}) {
  const title = "A lab-a:chunk-01-of-01 audits 2 exact states";
  return {
    body: Buffer.from(JSON.stringify({
      canonicalExecutionCount: 2,
      chunkId: "lab-a:chunk-01-of-01",
      expectedChunkIds: ["lab-a:chunk-01-of-01"],
      expectedStateCountPerProject: 2,
      expectedStateDescriptorPlanSha256: stateDescriptorPlanSha256,
      expectedStatePlanSha256: statePlanSha256,
      plannedStateDescriptors,
      plannedStateIds: stateIds,
      project,
      receipts: stateIds.map(positiveReceipt),
      schemaVersion: "focused-a.v1",
      starshipPaths: {
        output: pathManifest.paths.outputDir,
        pathManifestPath,
      },
      testTitle: title,
      ...overrides,
    })).toString("base64"),
    contentType: "application/json",
    name: `focused-a-${project}.json`,
  };
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function repinDurabilitySeal(final, { sealId = final.seal.sealId } = {}) {
  const events = [...final.first.controlEvents, ...final.second.controlEvents];
  const observerSnapshot = {
    controlObserverActive: false,
    controlObserverFrozenEventCount: 4,
    controlObserverLedgerFrozen: true,
    controlObserverRemovalCount: 1,
    controlObserverStopReceipt: final.controlObserverStop,
    events,
    initialStorage: final.mount.initialStorage.entries.map(({ key, raw }) => ({ key, raw })),
    listenerErrors: [],
    location: final.navigation.location,
    navigationDrifts: final.navigation.historyDrifts,
    storageError: null,
    storageEvents: final.storageEvents,
    topologyEvents: final.topology.applicationEvents,
    version: 1,
  };
  const digests = {
    locationSha256: createHash("sha256")
      .update(canonicalJson(final.navigation.location)).digest("hex"),
    observerSha256: createHash("sha256")
      .update(canonicalJson(observerSnapshot)).digest("hex"),
    storageSha256: createHash("sha256")
      .update(canonicalJson(final.storage.entries.map(({ key, raw }) => ({ key, raw }))))
      .digest("hex"),
  };
  const networkSha256 = createHash("sha256")
    .update(canonicalJson(final.requests)).digest("hex");
  final.seal.digests = digests;
  final.seal.networkSha256 = networkSha256;
  final.seal.sealId = sealId;
  final.seal.compositeSha256 = createHash("sha256").update(canonicalJson({
    browserEpoch: final.seal.epoch,
    digests,
    networkSha256,
    sealId,
    terminalEpoch: final.seal.terminalEpoch,
  })).digest("hex");
}

function protocolControlStorageReceipt(userId, mutate = () => {}) {
  const user = encodeURIComponent(userId);
  const entries = [
    {
      family: "analytics-generation",
      key: `mais:learning-analytics-generation:v1:${user}`,
      parsed: 0,
    },
    {
      family: "analytics-clear-fence",
      key: `mais:learning-analytics-clear-fence:v1:${user}`,
      parsed: {
        baseGeneration: 0,
        clearedCompletionStorageKeys: [],
        clearedStorageKeys: [],
        completionClaims: [],
        deleteAttemptedAt: null,
        phase: "prepared",
        requestId: "clear-request",
        requestedAt: "2026-08-11T00:00:00.000Z",
        userId,
        version: 2,
      },
    },
    {
      family: "analytics-generation-handshake",
      key: `mais:learning-analytics-generation-handshake:v1:${user}`,
      parsed: {
        existingUnconfirmedEventIds: [],
        generation: 0,
        phase: "prepared",
        requestId: "handshake-request",
        startedAt: "2026-08-11T00:00:00.000Z",
        userId,
        version: 2,
      },
    },
    {
      family: "analytics-generation-transition",
      key: `mais:learning-analytics-generation-transition:v1:${user}`,
      parsed: {
        boundaryClearedAt: "2026-08-11T00:00:00.000Z",
        clearedCompletionStorageKeys: [],
        completionClaims: [],
        fromGeneration: 0,
        kind: "forward-clear",
        phase: "prepared",
        preparedAt: "2026-08-11T00:00:00.000Z",
        preserveAllUnconfirmed: false,
        preserveEventIds: [],
        preserveUnconfirmedStorageKeys: [],
        quarantineConfirmedStorageKeys: [],
        quarantineEventIds: [],
        quarantineUnconfirmedStorageKeys: [],
        toGeneration: 1,
        transitionId: "transition-request",
        userId,
        version: 2,
      },
    },
    {
      family: "analytics-boundary-lineage",
      key: `mais:learning-analytics-boundary-lineage:v1:${user}`,
      parsed: {
        generation: 0,
        preservedBoundaryTokens: ["boundary-request"],
        userId,
        version: 1,
      },
    },
  ];
  mutate(entries);
  const materialized = entries
    .map((entry) => {
      const raw = JSON.stringify(entry.parsed);
      return {
        ...entry,
        raw,
        rawSha256: createHash("sha256").update(raw).digest("hex"),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
  return {
    digest: createHash("sha256")
      .update(canonicalJson(materialized.map(({ key, raw }) => ({ key, raw }))))
      .digest("hex"),
    entries: materialized,
    liveAnalyticsRecords: [],
    liveSessionRecords: [],
    outboxEntries: [],
    poisonKeys: [],
    protocolControlEntries: structuredClone(materialized),
  };
}

function descriptorPlanSha256(descriptors) {
  return createHash("sha256")
    .update(`${descriptors.map(canonicalJson).join("\n")}\n`)
    .digest("hex");
}

function focusedStateDescriptor(groupId, receipt) {
  const request = structuredClone(receipt.action.plannedRequest);
  const mode = groupId === "G05"
    ? receipt.domain.observed.mode
    : groupId === "G06"
      ? receipt.configuredState.mode
      : receipt.mode;
  const controlParameter = request.kind === "control"
    ? request.control ?? request.controlId ?? null
    : request.kind === "controller"
      ? groupId === "G04"
        ? "mode/evaluated-operation"
        : groupId === "G03"
          ? request.controller ?? null
          : request.controllerId ?? null
      : null;
  return {
    labId: receipt.stateId.slice(0, receipt.stateId.indexOf(":")),
    plan: {
      controlParameter,
      kind: request.kind,
      mode,
      request,
    },
    stateId: receipt.stateId,
  };
}

function testCase(project, overrides = {}) {
  return {
    annotations: [],
    expectedStatus: "passed",
    projectId: project,
    projectName: project,
    results: [{
      annotations: [],
      attachments: [evidence(project, overrides.evidence)],
      duration: 1_000,
      errors: [],
      retry: 0,
      startTime: "2026-08-11T00:00:00.000Z",
      status: "passed",
      ...overrides.result,
    }],
    status: "expected",
    timeout: 60_000,
    ...overrides.test,
  };
}

function report({ projects = contract.projects, evidenceOverrides = {}, resultOverrides = {} } = {}) {
  return {
    config: {
      configFile,
      forbidOnly: false,
      fullyParallel: false,
      globalSetup,
      globalTeardown: null,
      grep: {},
      grepInvert: null,
      maxFailures: 0,
      projects: contract.projects.map((name) => ({
        id: name,
        name,
        outputDir: pathManifest.paths.outputDir,
        repeatEach: 1,
        retries: 0,
        testDir: "/Volumes/Starship/focused-report-test/tests/e2e",
        timeout: 60_000,
      })),
      reporter: [["list"], ["json"]],
      rootDir: `${repositoryRoot}/tests/e2e`,
      shard: null,
      version: "1.59.1",
      workers: 1,
    },
    errors: [],
    stats: {
      duration: 2_000,
      expected: projects.length,
      flaky: 0,
      skipped: 0,
      startTime: "2026-08-11T00:00:00.000Z",
      unexpected: 0,
    },
    suites: [{
      file: "tests/e2e/focused-a.spec.ts",
      specs: projects.map((project) => ({
        file: "tests/e2e/focused-a.spec.ts",
        id: `focused-a-spec-${project}`,
        ok: true,
        tags: [],
        tests: [testCase(project, {
          evidence: evidenceOverrides[project],
          result: resultOverrides[project],
        })],
        title: "A lab-a:chunk-01-of-01 audits 2 exact states",
      })),
    }],
  };
}

function g03ProductionInvariantStates(configuredState, input) {
  const fields = Object.fromEntries(configuredState.split("|").slice(1).map((entry) => {
    const separator = entry.indexOf("=");
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
  const normalizeRational = (numerator, denominator) => {
    const normalized = normalizeFixtureRational(BigInt(numerator), BigInt(denominator));
    return {
      denominator: Number(normalized.denominator),
      kind: "rational",
      numerator: Number(normalized.numerator),
    };
  };
  const rationalSymbolic = ({ denominator, numerator }) =>
    numerator === 0 ? "0" : denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
  const addRationals = (left, right, direction = 1) => normalizeRational(
    left.numerator * right.denominator +
      direction * right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
  const multiplyRationals = (left, right) => normalizeRational(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
  const divideRationals = (left, right) => normalizeRational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
  const canonicalSurd = (value) => {
    const coefficient = normalizeRational(
      value.coefficient.numerator,
      value.coefficient.denominator,
    );
    if (coefficient.numerator === 0 || value.radicand === 0) {
      return { coefficient: normalizeRational(0, 1), radicand: 1 };
    }
    let outside = 1;
    let remaining = value.radicand;
    for (let factor = 2; factor * factor <= remaining; factor += 1) {
      const square = factor * factor;
      while (remaining % square === 0) {
        outside *= factor;
        remaining /= square;
      }
    }
    return {
      coefficient: normalizeRational(
        coefficient.numerator * outside,
        coefficient.denominator,
      ),
      radicand: remaining,
    };
  };
  const quadraticSymbolic = ({ coefficient, radicand }) => {
    if (coefficient.numerator === 0 || radicand === 0) return "0";
    if (radicand === 1) return rationalSymbolic(coefficient);
    const negative = coefficient.numerator < 0;
    const magnitude = {
      denominator: coefficient.denominator,
      numerator: Math.abs(coefficient.numerator),
    };
    const coefficientText = magnitude.numerator === magnitude.denominator
      ? ""
      : magnitude.denominator === 1
        ? String(magnitude.numerator)
        : `${magnitude.numerator}/${magnitude.denominator}`;
    return `${negative ? "-" : ""}${coefficientText}√${radicand}`;
  };
  const point = g03FixturePoint(fields.point);
  const comparisonPoint = fields.compare === "-" ? null : g03FixturePoint(fields.compare);
  const operationStart = fields.start === "-" ? null : g03FixturePoint(fields.start);
  const operationStep = fields.step === "-" ? null : g03FixturePoint(fields.step);
  const pointSymbolic = (candidate, absolute = false) => {
    if (candidate.kind === "rational") {
      return rationalSymbolic({
        denominator: candidate.denominator,
        numerator: absolute ? Math.abs(candidate.numerator) : candidate.numerator,
      });
    }
    if ([
      "simplify", "radical-add", "radical-subtract", "radical-multiply",
      "radical-divide", "estimate-check",
    ].includes(fields.mode)) {
      return quadraticSymbolic({
        coefficient: {
          denominator: candidate.coefficientDenominator,
          numerator: (absolute ? 1 : candidate.sign) * candidate.coefficientNumerator,
        },
        radicand: candidate.radicand,
      });
    }
    const sign = absolute ? 1 : candidate.sign;
    return `${sign < 0 && candidate.radicand !== 0 ? "-" : ""}${
      candidate.index === 2 ? `√(${candidate.radicand})` : `√[${candidate.index}](${candidate.radicand})`
    }`;
  };
  const distance = point.kind === "rational"
    ? { ...point, numerator: Math.abs(point.numerator) }
    : { ...point, sign: 1 };
  const operationSignedStep = operationStep === null
    ? null
    : {
        ...operationStep,
        numerator: fields.mode === "subtract"
          ? -operationStep.numerator
          : operationStep.numerator,
      };
  const operationEndpoint = operationStart === null
    ? null
    : addRationals(operationStart, operationSignedStep);
  const rationals = [
    point,
    distance,
    comparisonPoint,
    operationStart,
    operationStep,
    operationSignedStep,
    operationEndpoint,
  ].filter((candidate) => candidate?.kind === "rational");
  const pointSign = (candidate) => candidate.kind === "rational"
    ? candidate.numerator === 0 ? 0 : candidate.numerator < 0 ? -1 : 1
    : candidate.radicand === 0 ? 0 : candidate.sign;
  const compareBigInts = (left, right) => left === right ? 0 : left < right ? -1 : 1;
  const exactComparison = (left, right) => {
    if (left.kind === "rational" && right.kind === "rational") {
      return compareBigInts(
        BigInt(left.numerator) * BigInt(right.denominator),
        BigInt(right.numerator) * BigInt(left.denominator),
      );
    }
    const leftSign = pointSign(left);
    const rightSign = pointSign(right);
    if (leftSign === 0 && rightSign === 0) return 0;
    if (leftSign !== rightSign) return leftSign < rightSign ? -1 : 1;
    let magnitude;
    if (left.kind === "rational") {
      magnitude = compareBigInts(
        g03FixturePower(BigInt(Math.abs(left.numerator)), right.index),
        BigInt(right.radicand) * g03FixturePower(BigInt(left.denominator), right.index),
      );
    } else if (right.kind === "rational") {
      magnitude = compareBigInts(
        BigInt(left.radicand) * g03FixturePower(BigInt(right.denominator), left.index),
        g03FixturePower(BigInt(Math.abs(right.numerator)), left.index),
      );
    } else {
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const commonPower = (left.index * right.index) / gcd(left.index, right.index);
      magnitude = compareBigInts(
        g03FixturePower(BigInt(left.radicand), commonPower / left.index),
        g03FixturePower(BigInt(right.radicand), commonPower / right.index),
      );
    }
    return leftSign < 0 && magnitude !== 0 ? -magnitude : magnitude;
  };
  const radicalPower = (() => {
    if (point.kind !== "radical" || point.index !== 2) return null;
    const scale = 10 ** Number(fields.precision);
    const denominator = BigInt(point.coefficientDenominator);
    const scaledCoefficient = BigInt(Math.abs(point.coefficientNumerator)) * BigInt(scale);
    const targetPower = BigInt(point.radicand) * g03FixturePower(scaledCoefficient, point.index);
    let low = 0n;
    let high = BigInt(Math.max(1, point.radicand)) * scaledCoefficient + 1n;
    while (low + 1n < high) {
      const middle = (low + high) / 2n;
      if (g03FixturePower(middle * denominator, point.index) <= targetPower) low = middle;
      else high = middle;
    }
    return `${g03FixturePower(low * denominator, point.index)}<=${targetPower}<${
      g03FixturePower((low + 1n) * denominator, point.index)
    }`;
  })();
  const quadraticResultSymbolic = (() => {
    const quadraticModes = [
      "simplify", "radical-add", "radical-subtract", "radical-multiply",
      "radical-divide", "estimate-check",
    ];
    if (!quadraticModes.includes(input.mode)) return null;
    const left = canonicalSurd(input.mode === "simplify" || input.mode === "estimate-check"
      ? input.value
      : input.left);
    if (input.mode === "simplify" || input.mode === "estimate-check") {
      return quadraticSymbolic(left);
    }
    const right = canonicalSurd(input.right);
    if (input.mode === "radical-add" || input.mode === "radical-subtract") {
      const effectiveRight = {
        ...right,
        coefficient: normalizeRational(
          (input.mode === "radical-subtract" ? -1 : 1) * right.coefficient.numerator,
          right.coefficient.denominator,
        ),
      };
      if (left.radicand === effectiveRight.radicand) {
        return quadraticSymbolic(canonicalSurd({
          coefficient: addRationals(left.coefficient, effectiveRight.coefficient),
          radicand: left.radicand,
        }));
      }
      return [left, effectiveRight].map((term, index) => {
        const negative = term.coefficient.numerator < 0;
        const unsigned = quadraticSymbolic({
          ...term,
          coefficient: { ...term.coefficient, numerator: Math.abs(term.coefficient.numerator) },
        });
        if (index === 0) return negative ? `-${unsigned}` : unsigned;
        return `${negative ? "−" : "+"} ${unsigned}`;
      }).join(" ");
    }
    if (input.mode === "radical-multiply") {
      return quadraticSymbolic(canonicalSurd({
        coefficient: multiplyRationals(left.coefficient, right.coefficient),
        radicand: left.radicand * right.radicand,
      }));
    }
    const quotient = divideRationals(left.coefficient, right.coefficient);
    return quadraticSymbolic(canonicalSurd({
      coefficient: divideRationals(quotient, normalizeRational(right.radicand, 1)),
      radicand: left.radicand * right.radicand,
    }));
  })();
  const rationalOperationApplicable = [
    "add", "subtract", "multiply", "divide", "opposite",
  ].includes(fields.mode) || (fields.mode === "absolute-value" && point.kind === "rational");
  const rationalOperationSymbolic = fields.mode === "absolute-value"
    ? pointSymbolic(distance)
    : rationalOperationApplicable
      ? pointSymbolic(point)
      : "not-applicable";
  const realConceptApplicable = [
    "classify", "square-root", "cube-root", "estimate",
  ].includes(fields.mode);
  const realConceptExpected = fields.mode === "square-root" || fields.mode === "cube-root"
    ? String(input.radicand)
    : "classification-or-estimate";
  const realConceptObserved = fields.mode === "square-root" || fields.mode === "cube-root"
    ? point.kind === "rational"
      ? g03FixturePower(BigInt(point.numerator), fields.mode === "square-root" ? 2 : 3).toString()
      : String(input.radicand)
    : "classification-or-estimate";
  const quadraticApplicable = [
    "simplify", "radical-add", "radical-subtract", "radical-multiply",
    "radical-divide", "estimate-check",
  ].includes(fields.mode);
  const receipt = (id, applicable, expected, observed = expected) =>
    `${id}|${applicable ? "pass" : "not-applicable"}|${expected}|${observed}`;
  return [
    receipt(
      "rational-point",
      rationals.length > 0,
      "all rational denominators are positive and reduced",
      rationals.map(rationalSymbolic).join(";") || "not-applicable",
    ),
    receipt(
      "radical-square-error",
      radicalPower !== null,
      "lower^2 <= scaled radicand < next^2",
      radicalPower ?? "not-applicable",
    ),
    receipt("absolute-value-distance", true, pointSymbolic(distance)),
    receipt(
      "signed-origin-stability",
      true,
      pointSign(point) === 0 ? "origin" : pointSign(point) < 0 ? "negative" : "positive",
    ),
    receipt(
      "exact-cross-product",
      comparisonPoint !== null,
      comparisonPoint === null ? "not-applicable" : String(exactComparison(point, comparisonPoint)),
    ),
    receipt(
      "additive-endpoint",
      operationEndpoint !== null,
      operationEndpoint === null ? "not-applicable" : rationalSymbolic(operationEndpoint),
    ),
    receipt(
      "topic-mode-allowlist",
      true,
      "mode belongs to the exact topic allowlist",
    ),
    receipt(
      "rational-operation-reconstruction",
      rationalOperationApplicable,
      rationalOperationSymbolic,
    ),
    receipt(
      "real-concept-reconstruction",
      realConceptApplicable,
      realConceptExpected,
      realConceptObserved,
    ),
    receipt(
      "quadratic-radical-reconstruction",
      quadraticApplicable,
      quadraticResultSymbolic ?? "not-applicable",
    ),
  ];
}

function focusedGroupReceipt(groupId, stateId) {
  const controls = [{
    disabled: false,
    kind: "range",
    max: 10,
    min: -10,
    options: [],
    parameter: "value",
    step: 1,
    value: "1",
  }];
  const candidatePairCounts = {
    "control-control": 1,
    "dom-text-text": 1,
    "svg-label-label": 1,
    "svg-label-mark": 1,
    "text-control": 1,
    "text-occlusion": 1,
  };
  const common = {
    collision: {
      candidatePairCounts,
      canvasSurfaceCount: 0,
      htmlTextFragmentCount: 2,
      inspectedCandidateCount: 8,
      learnerControlCount: 2,
      overlapExemptionCount: 0,
      paintedMarkCount: 2,
      phase: stateId,
      svgSurfaceCount: 1,
      svgTextFragmentCount: 2,
      totalCandidatePairCount: 6,
    },
    contrast: {
      audited: 4,
      auditedTextCount: 4,
      minRatio: 7,
      requiredRatio: 4.5,
      worstTarget: "learner-label",
    },
    controls,
    stateId,
  };
  if (groupId === "G03") {
    const labId = "bnu-junior-s1-upper-rational-numbers";
    const configuredState = [
      "signed-real-number-line-v1",
      `lab=${labId}`,
      "mode=locate",
      "precision=2",
      "point=r:-3/2",
      "compare=-",
      "start=-",
      "step=-",
    ].join("|");
    const request = { kind: "initial", topicId: labId };
    const input = {
      labId,
      mode: "locate",
      precision: 2,
      value: { denominator: 2, kind: "rational", numerator: -3 },
    };
    const controlState = {
      labId,
      mode: "locate",
      numberKind: "rational",
      rightRationalDenominator: 1,
      rightRationalNumerator: 1,
      rightSurdCoefficientDenominator: 1,
      rightSurdCoefficientNumerator: 1,
      rightSurdRadicand: 2,
      valueRadicand: 2,
      valueSign: 1,
    };
    const signedRealControls = [
      ["value-numerator", -24, 24, "-3"],
      ["value-denominator", 1, 12, "2"],
      ["precision", 0, 6, "2"],
    ].map(([parameter, min, max, value]) => ({
      disabled: false,
      kind: "range",
      max,
      min,
      options: [],
      parameter,
      step: 1,
      value,
    }));
    const settledSnapshot = {
      configuredState,
      controlState,
      input,
      labId,
      mode: "locate",
      pendingRequest: null,
    };
    const requestedSnapshot = { ...settledSnapshot, pendingRequest: request };
    const receipt = {
      before: settledSnapshot,
      expected: settledSnapshot,
      observed: settledSnapshot,
      projections: [],
      rejection: null,
      request,
      requested: requestedSnapshot,
      status: "accepted",
      version: "signed-real-number-line-action-receipt-v1",
    };
    const signature = {
      actionReceipt: JSON.stringify(receipt),
      controls: signedRealControls,
      domainId: `signed-real-number-line:${labId}:locate:v1`,
      geometryOwners: [
        {
          exactKey: "r:0/1",
          ownerId: "origin",
          renderMarker: true,
          semanticId: "origin",
        },
        {
          exactKey: "r:-3/2",
          ownerId: "primary",
          renderMarker: true,
          semanticId: "primary",
        },
      ],
      geometryState: [
        "signed-real-number-line-geometry-v1",
        "axis=-2:2",
        "svg=70:890",
        "origin:r:0/1:480:origin",
        "primary:r:-3/2:172.5:primary",
      ].join("|"),
      invariantStates: g03ProductionInvariantStates(configuredState, input),
      mode: "locate",
      semanticState: configuredState,
      state: configuredState,
    };
    return {
      ...common,
      controls: signedRealControls,
      action: {
        beforeSignature: signature,
        expectedSignature: signature,
        observedSignature: signature,
        plannedRequest: request,
        projections: [],
        receipt,
      },
      configuredState,
      geometry: [
        {
          exactKey: "r:0/1",
          lower: 480,
          marker: true,
          owner: "origin",
          reason: "unique-exact-value",
          rendered: 480,
          semanticId: "origin",
          upper: 480,
        },
        {
          exactKey: "r:-3/2",
          lower: 172.5,
          marker: true,
          owner: "primary",
          reason: "unique-exact-value",
          rendered: 172.5,
          semanticId: "primary",
          upper: 172.5,
        },
      ],
      layout: { targetCount: 3 },
      mode: "locate",
    };
  }
  if (groupId === "G04") {
    const labId = "bnu-primary-p5-lower-fraction-add-sub";
    const state = {
      evaluatedOperation: "add",
      leftDenominator: 4,
      leftNumerator: 7,
      mode: "add",
      rightDenominator: 6,
      rightNumerator: 5,
    };
    const fractionControls = [
      ["left-numerator", -48, 48, state.leftNumerator, false],
      ["left-denominator", 1, 24, state.leftDenominator, false],
      ["right-numerator", -48, 48, state.rightNumerator, false],
      ["right-denominator", 1, 24, state.rightDenominator, false],
    ].map(([parameter, min, max, value, zeroExcluded]) => ({
      affects: [],
      disabled: false,
      kind: "number",
      max,
      min,
      options: [],
      parameter,
      projection: null,
      projectionReason: null,
      step: 1,
      value: String(value),
      zeroExcluded,
    }));
    const request = { kind: "initial" };
    const domain = {
      expected: state,
      match: true,
      observed: state,
      projectionCount: 0,
      projectionReasons: [],
      rejection: null,
      requested: state,
    };
    const productActionReceipt = {
      accepted: true,
      before: state,
      domainId: "fraction-operations-divisor-nonzero-v1",
      domainVersion: 1,
      expected: state,
      matchesExpected: true,
      observed: state,
      projections: [],
      rejection: null,
      request,
      requested: state,
      requestedValidity: "accepted-as-requested",
      status: "accepted",
      version: "fraction-operations-action-receipt-v1",
    };
    const plannerReceipt = {
      domainId: "fraction-operations-divisor-nonzero-v1",
      domainVersion: 1,
      expected: state,
      matchesExpected: true,
      observed: state,
      projections: [],
      request: { evaluatedOperation: "add", kind: "controller", mode: "add" },
      requested: state,
    };
    const configuredState = [
      "fraction-operations-v2",
      `lab=${labId}`,
      "mode=add",
      "evaluated=add",
      "left=7/4",
      "right=5/6",
      "result=31/12",
    ].join("|");
    return {
      ...common,
      controls: fractionControls,
      action: {
        beforeControls: fractionControls,
        beforeDomain: domain,
        expectedActionReceipt: productActionReceipt,
        expectedProjection: false,
        expectedRejection: null,
        observedControls: fractionControls,
        oracleAfter: state,
        oracleBefore: state,
        plannedRequest: request,
        plannerReceipt,
        rejectedRequest: null,
      },
      configuredState,
      domain,
      evaluatedOperation: "add",
      mode: "add",
      productActionReceipt,
      runtimeSignature: {
        action: {
          "data-viz-action-accepted": "true",
          "data-viz-action-before": JSON.stringify(state),
          "data-viz-action-expected": JSON.stringify(state),
          "data-viz-action-observed": JSON.stringify(state),
          "data-viz-action-projections": "[]",
          "data-viz-action-receipt": JSON.stringify(productActionReceipt),
          "data-viz-action-receipt-version": "fraction-operations-action-receipt-v1",
          "data-viz-action-rejection": "none",
          "data-viz-action-request": JSON.stringify(request),
          "data-viz-action-requested": JSON.stringify(state),
          "data-viz-action-requested-validity": "accepted-as-requested",
          "data-viz-action-status": "accepted",
        },
        configuredState,
        controls: [
          ...["add", "subtract", "simplify", "estimate"].map((runtimeMode) => ({
            attributes: {
              "aria-pressed": String(runtimeMode === state.mode),
              "data-viz-domain-controller": "mode",
              "data-viz-mode": runtimeMode,
              "data-viz-mode-active": String(runtimeMode === state.mode),
              "data-viz-mode-button": "true",
              type: "button",
            },
            disabled: false,
            options: [],
            tagName: "button",
            text: runtimeMode,
            value: null,
          })),
          ...fractionControls.map((control) => ({
            attributes: {
              "data-viz-parameter": control.parameter,
              "data-viz-zero-excluded": String(control.zeroExcluded),
              max: String(control.max),
              min: String(control.min),
              step: String(control.step),
              type: "number",
            },
            disabled: false,
            options: [],
            tagName: "input",
            text: "",
            value: control.value,
          })),
          {
            attributes: {
              "data-viz-reset-model": "true",
              "data-viz-reset-module-id": "configured-visualization-lab",
              "data-viz-reset-topic-id": labId,
              type: "button",
            },
            disabled: false,
            options: [],
            tagName: "button",
            text: "Reset",
            value: null,
          },
        ],
        domain: {
          domainId: "fraction-operations-divisor-nonzero-v1",
          domainVersion: "1",
          expected: state,
          match: "true",
          observed: state,
          projectionCount: "0",
          projectionReasons: [],
          projections: [],
          rejection: null,
          requested: state,
        },
        evaluatedOperation: "add",
        mode: "add",
        semanticState: configuredState,
        visual: {
          geometry: [],
          interpretations: [],
          visibleReceipts: [{
            attributes: { "data-viz-visible-receipt": "arithmetic" },
            text: "",
          }],
        },
      },
      touchTargetCount: 2,
      visual: {
        expectedInterpretations: [],
        supported: [],
        unsupported: [],
      },
    };
  }
  if (groupId === "G05") {
    const state = {
      amount: 36,
      base: 240,
      inverseDirection: "increase",
      labId: "bnu-primary-p6-upper-percentage-applications",
      mode: "find-part",
      newValue: 120,
      rateBasisPoints: 1_500,
    };
    const percentControls = [
      { disabled: false, max: 1_000_000, min: 0, parameter: "base", step: 1, value: "240" },
      { disabled: false, max: 50_000, min: 0, parameter: "rate-basis-points", step: 1, value: "1500" },
    ];
    const domain = {
      expected: state,
      observed: state,
      projectionCount: 0,
      projectionReasons: [],
      rejection: null,
      requested: state,
    };
    const signature = { controls: percentControls, inverseDirection: "increase", mode: state.mode, state };
    const visualReceipt = {
      kind: "find-part",
      part: "36/1",
      rate: "3/20",
      reconstruction: "36/1",
      status: "supported",
      whole: "240/1",
    };
    return {
      ...common,
      controls: percentControls,
      action: {
        before: signature,
        beforeDomain: domain,
        expected: signature,
        expectedDomain: domain,
        expectedRejection: null,
        observed: signature,
        plannedProjections: [],
        plannedRequest: { kind: "initial" },
      },
      domain,
      layout: { targetCount: 2 },
      runtimeSignature: {
        configuredState: state,
        controls: percentControls,
        domain,
        inverseDirection: "increase",
        mode: state.mode,
        semanticState: state,
        visual: [
          {
            geometryReceipt: null,
            kind: null,
            markCount: null,
            visibleReceipt: "find-part",
          },
          {
            geometryReceipt: JSON.stringify(visualReceipt),
            kind: "find-part",
            markCount: "2",
            visibleReceipt: null,
          },
        ],
      },
      visual: { kind: "find-part", markCount: 2, receipt: visualReceipt, status: "supported" },
    };
  }
  const state = {
    actualUnit: "m",
    drawingLength: 5,
    drawingUnit: "cm",
    labId: "pep-primary-p6-lower-ratio-proportion-scale",
    mode: "direct-proportion",
    ratioA: 2,
    ratioB: 3,
    scaleFactor: 4,
  };
  const beforeState = { ...state, mode: "equivalent-ratios" };
  const ratioControls = [
    ["ratio-a", state.ratioA],
    ["ratio-b", state.ratioB],
    ["scale-factor", state.scaleFactor],
  ].map(([parameter, value]) => ({
    disabled: false,
    kind: "range",
    max: 10_000,
    min: 1,
    options: [],
    parameter,
    step: 1,
    value: String(value),
  }));
  const geometryReceipt = {
    constantK: { first: "3/2", second: "3/2" },
    crossProducts: { left: "24/1", right: "24/1" },
    firstPair: { dependent: "3/1", independent: "2/1" },
    kind: "direct-proportion",
    scaleFactor: "4/1",
    secondPair: { dependent: "12/1", independent: "8/1" },
    status: "supported",
  };
  const request = { controllerId: "mode", kind: "controller", value: "direct-proportion" };
  const domain = {
    domainId: "ratio-proportion-scale-direct-proportion-v1",
    expected: state,
    match: true,
    observed: state,
    projectionCount: 0,
    rejection: null,
    requested: state,
  };
  const productAction = {
    before: beforeState,
    expected: state,
    observed: state,
    projections: [],
    rejection: null,
    request,
    requested: state,
    status: "accepted",
    version: "ratio-proportion-scale-action-receipt-v1",
  };
  return {
    ...common,
    controls: ratioControls,
    action: { before: beforeState, expectedRejection: null, expectedState: state, plannedRequest: request },
    configuredState: state,
    domain,
    productAction,
    runtimeSignature: JSON.stringify({
      actionBefore: JSON.stringify(beforeState),
      actionExpected: JSON.stringify(state),
      actionObserved: JSON.stringify(state),
      actionProjections: "[]",
      actionReceipt: JSON.stringify(productAction),
      actionRejection: "none",
      actionRequest: JSON.stringify(request),
      actionRequested: JSON.stringify(state),
      actionStatus: "accepted",
      actionVersion: "ratio-proportion-scale-action-receipt-v1",
      controls: ratioControls,
      domainId: "ratio-proportion-scale-direct-proportion-v1",
      expected: JSON.stringify(state),
      geometry: [{ kind: "direct-proportion", marks: "5", receipt: JSON.stringify(geometryReceipt) }],
      mode: "direct-proportion",
      observed: JSON.stringify(state),
      projectionCount: "0",
      rejection: null,
      requested: JSON.stringify(state),
      semanticState: JSON.stringify(state),
      state: JSON.stringify(state),
    }),
    touchTargetCount: 2,
    visual: { kind: "direct-proportion", markCount: 5, receipt: geometryReceipt },
  };
}

function focusedGroupPathReceipt(groupId, project) {
  const outputDir = `${pathManifest.paths.outputDir}/${groupId.toLowerCase()}-${project}`;
  if (groupId === "G03") {
    return {
      browserProfileEvidencePath,
      browserProcessEvidencePath,
      browserTempDir: pathManifest.paths.browserTempDir,
      crashDumpDir: pathManifest.paths.crashDumpDir,
      databasePath: pathManifest.paths.databasePath,
      e2eRunRoot: pathManifest.paths.e2eRunRoot,
      nextDistDir: pathManifest.paths.nextDistDir,
      nodeCompileCache: pathManifest.paths.nodeCompileCacheDir,
      npmCache: pathManifest.paths.npmCacheDir,
      outputDir,
      pathManifestPath,
      reportDir: pathManifest.paths.reportDir,
      serverLogPath: pathManifest.paths.serverLogPath,
      temp: pathManifest.paths.browserTempDir,
      tmp: pathManifest.paths.browserTempDir,
      tmpdir: pathManifest.paths.browserTempDir,
      worktree: repositoryRoot,
    };
  }
  if (groupId === "G05") {
    return {
      browserProfileEvidencePath,
      browserProcessEvidencePath,
      browserTempDir: pathManifest.paths.browserTempDir,
      crashDumpDir: pathManifest.paths.crashDumpDir,
      databasePath: pathManifest.paths.databasePath,
      e2eRunRoot: pathManifest.paths.e2eRunRoot,
      nextDistDir: pathManifest.paths.nextDistDir,
      nextTsconfigPath: pathManifest.paths.nextTsconfigPath,
      nodeCompileCache: pathManifest.paths.nodeCompileCacheDir,
      npmCache: pathManifest.paths.npmCacheDir,
      outputDir,
      outputRoot: pathManifest.paths.outputDir,
      pathManifestPath,
      reportDir: pathManifest.paths.reportDir,
      serverCommandOwnerPidPath: pathManifest.paths.serverCommandOwnerPidPath,
      serverLogPath: pathManifest.paths.serverLogPath,
      temp: pathManifest.paths.browserTempDir,
      tmp: pathManifest.paths.browserTempDir,
      tmpdir: pathManifest.paths.browserTempDir,
      worktree: repositoryRoot,
    };
  }
  if (groupId === "G04") {
    const paths = Object.fromEntries(
      [
        "browserProfileEvidencePath",
        "browserProcessEvidencePath",
        "browserTempDir",
        "crashDumpDir",
        "databasePath",
        "e2eRunRoot",
        "nextDistDir",
        "nextTsconfigPath",
        "nodeCompileCacheDir",
        "npmCacheDir",
        "outputDir",
        "pathManifestPath",
        "reportDir",
        "serverCommandOwnerPidPath",
        "serverLogPath",
      ].map((key) => [key, pathManifest.paths[key]]),
    );
    return {
      manifestPath: pathManifestPath,
      paths,
      process: { cwd: repositoryRoot, pid: 31_001, ppid: 31_000 },
      temporaryPaths: {
        TEMP: pathManifest.paths.browserTempDir,
        TMP: pathManifest.paths.browserTempDir,
        TMPDIR: pathManifest.paths.browserTempDir,
      },
    };
  }
  return {
    manifestPath: pathManifestPath,
    pathNames: [
      "HK_MATH_DB_PATH",
      "NODE_COMPILE_CACHE",
      "PLAYWRIGHT_BROWSER_PROFILE_EVIDENCE_PATH",
      "PLAYWRIGHT_BROWSER_PROCESS_EVIDENCE_PATH",
      "PLAYWRIGHT_BROWSER_TEMP_DIR",
      "PLAYWRIGHT_CRASH_DUMP_DIR",
      "PLAYWRIGHT_E2E_ROOT",
      "PLAYWRIGHT_NEXT_DIST_DIR",
      "PLAYWRIGHT_OUTPUT_DIR",
      "PLAYWRIGHT_PATH_MANIFEST_PATH",
      "PLAYWRIGHT_REPORT_DIR",
      "PLAYWRIGHT_SERVER_LOG_PATH",
      "TEMP",
      "TMP",
      "TMPDIR",
      "npm_config_cache",
    ],
  };
}

const focusedG03ProbeModeByTopic = Object.freeze({
  "bnu-junior-s1-upper-rational-numbers": "compare",
  "bnu-junior-s2-upper-real-numbers": "locate",
  "hjb-junior-s2-upper-quadratic-radicals": "radical-add",
  "hjb-junior-s2-upper-real-numbers": "locate",
  "hjb-primary-p6-lower-rational-numbers": "compare",
  "pep-junior-s1-upper-rational-numbers": "compare",
});

function focusedDurabilityReceipts(
  groupId,
  project,
  topicId,
  included,
  expectedTopicIds,
  testTitle,
) {
  const userId = "focused-fixture-user";
  const source = groupId === "G03" ? "coordinate-plane" : "geometry";
  const gradeMatch = topicId.match(/-(?:primary-p([1-6])|junior-s([1-6]))-/u);
  const grade = gradeMatch?.[1] ? `P${gradeMatch[1]}` : `S${gradeMatch?.[2] ?? ""}`;
  assert.match(grade, /^(?:P|S)[1-6]$/u, "focused topic must encode its grade");
  const adapterId = "viz-durability-123e4567-e89b-42d3-a456-426614174000";
  const firstExpectedControl = {
    controlKey: groupId === "G03"
      ? focusedG03ProbeModeByTopic[topicId]
      : `${topicId}:first-button`,
    eventTypes: ["pointerup", "click"],
  };
  const secondExpectedControl = {
    controlKey: topicId,
    eventTypes: ["pointerup", "click"],
  };
  const event = (controlKey, sequence, type) => ({
    controlKey,
    key: null,
    sequence,
    type,
  });
  const firstEvents = [
    event(firstExpectedControl.controlKey, 1, "pointerup"),
    event(firstExpectedControl.controlKey, 2, "click"),
  ];
  const secondEvents = [
    event(secondExpectedControl.controlKey, 3, "pointerup"),
    event(secondExpectedControl.controlKey, 4, "click"),
  ];
  const events = [...firstEvents, ...secondEvents];
  const stop = {
    active: false,
    adapterId,
    eventCount: 4,
    events,
    eventsSha256: createHash("sha256").update(canonicalJson(events)).digest("hex"),
    lastSequence: 4,
    removalCount: 1,
    removedEventTypes: ["change", "click", "input", "keyup", "pointerup"],
    removedExactlyOnce: true,
    removedListenerCount: 5,
    stopId: `${adapterId}:control-observer-stop:1`,
  };
  const emptyStorage = {
    digest: createHash("sha256").update(canonicalJson([])).digest("hex"),
    entries: [],
    liveAnalyticsRecords: [],
    liveSessionRecords: [],
    outboxEntries: [],
    poisonKeys: [],
    protocolControlEntries: [],
  };
  const mountedButtonControl = (key) => ({
    ariaPressed: "false",
    dataPressed: [
      ["data-viz-mode-active", null],
      ["data-viz-strand-active", null],
      ["data-viz-active", null],
    ],
    key,
    max: null,
    min: null,
    options: [],
    step: null,
    tag: "button",
    type: null,
    value: null,
  });
  const mount = {
    acknowledgements: { lessonPageView: null, lessonProgressStart: null },
    browserDigest: "d".repeat(64),
    controlEventCount: 0,
    durability: included ? {
      hardFailures: [], pending: [], rawPayloadSha256: "a".repeat(64),
      rawRevision: 1, terminal: true, terminalDigest: "d".repeat(64),
    } : null,
    initialStorage: emptyStorage,
    networkRequestCount: 3,
    rawIncluded: included,
    root: {
      activeLabId: topicId,
      controls: [
        mountedButtonControl(firstExpectedControl.controlKey),
        mountedButtonControl(secondExpectedControl.controlKey),
      ],
      count: 1, matchesRootSelector: true,
      moduleId: "configured-visualization-lab", sessionOwner: "first-control-interaction",
      topicId, visible: true,
    },
    storage: emptyStorage,
  };
  const requestBody = {
    moduleId: "configured-visualization-lab",
    topicId,
    source,
  };
  const requestBytes = JSON.stringify(requestBody);
  const responseBody = {
    acknowledgedUserId: userId,
    durablyPersisted: true,
    session: {
      moduleId: "configured-visualization-lab",
      topicId,
      source,
      explored: true,
      completedAt: "2026-08-11T00:00:00.175Z",
      updatedAt: "2026-08-11T00:00:00.175Z",
    },
  };
  const responseBytes = JSON.stringify(responseBody);
  const firstSessionApiResponseBytes = JSON.stringify({ sessions: [responseBody.session] });
  const evidenceHash = (name) => createHash("sha256")
    .update(`${groupId}:${project}:${topicId}:${name}`)
    .digest("hex");
  const firstDurability = included ? {
    apiResponseBytes: firstSessionApiResponseBytes,
    apiResponseSha256: createHash("sha256").update(firstSessionApiResponseBytes).digest("hex"),
    appStatePayloadSha256: evidenceHash("app-state-payload"),
    appStateRevision: 2,
    appStateUpdatedAt: "2026-08-11T00:00:01.000Z",
    gamificationEventsSha256: evidenceHash("gamification-events"),
    gamificationRewardPoints: 20,
    gamificationXp: 45,
    learningEventsSha256: createHash("sha256").update(canonicalJson([])).digest("hex"),
    moduleId: "configured-visualization-lab",
    requestBodySha256: createHash("sha256").update(canonicalJson(requestBody)).digest("hex"),
    responseBytes,
    responseSha256: createHash("sha256").update(responseBytes).digest("hex"),
    rewardAmount: 20,
    rewardsSha256: createHash("sha256").update(canonicalJson([{
      amount: 20,
      createdAt: responseBody.session.updatedAt,
      reason: "visualization-complete",
      sourceKey: `visualization-complete:v2:${createHash("sha256")
        .update(JSON.stringify([userId, "configured-visualization-lab", topicId]))
        .digest("hex")}`,
      studentId: userId,
    }])).digest("hex"),
    rewardSourceKey: `visualization-complete:v2:${createHash("sha256")
      .update(JSON.stringify([userId, "configured-visualization-lab", topicId]))
      .digest("hex")}`,
    selectedTopicId: topicId,
    sessionSha256: createHash("sha256").update(canonicalJson(responseBody.session)).digest("hex"),
    source,
    userId,
    visualizationEventsSha256: createHash("sha256").update(canonicalJson([])).digest("hex"),
    visualizationSliceSha256: evidenceHash("visualization-slice"),
  } : null;
  const first = {
    adapterId: stop.adapterId,
    browserDigest: "1".repeat(64),
    browserEventCount: 2,
    browserSessionPostCount: 1,
    controlEvents: firstEvents,
    durability: firstDurability,
    expectedControl: firstExpectedControl,
    ordinal: 1,
    rawIncluded: included,
    requestBody,
    requestBytes,
    requestHeaders: {
      "content-type": "application/json",
      "x-mais-visualization-user-id": encodeURIComponent(userId),
    },
    requestId: 4,
    requestOrigin: "http://127.0.0.1:3000",
    requestPathname: "/api/visualization-sessions",
    requestUrl: "http://127.0.0.1:3000/api/visualization-sessions",
    response: {
      body: responseBody,
      bytes: responseBytes,
      bytesSha256: createHash("sha256").update(responseBytes).digest("hex"),
      status: 200,
    },
    storage: emptyStorage,
  };
  const firstRequestIdentity = {
    finished: true,
    hash: "",
    id: first.requestId,
    method: "POST",
    origin: first.requestOrigin,
    pathname: first.requestPathname,
    requestBodySha256: createHash("sha256").update(first.requestBytes).digest("hex"),
    responseSha256: first.response.bytesSha256,
    search: "",
    status: 200,
    url: first.requestUrl,
  };
  const firstMutation = {
    ...firstRequestIdentity,
    authorizedPhase: "first-control",
    requestBody,
    requestBytes,
    responseBytes,
  };
  const browserMutation = ({ id, pathname, requestBody: body, responseBody: bodyResponse }) => {
    const bodyBytes = JSON.stringify(body);
    const bodyResponseBytes = JSON.stringify(bodyResponse);
    const identity = {
      finished: true,
      hash: "",
      id,
      method: "POST",
      origin: first.requestOrigin,
      pathname,
      requestBodySha256: createHash("sha256").update(bodyBytes).digest("hex"),
      responseSha256: createHash("sha256").update(bodyResponseBytes).digest("hex"),
      search: "",
      status: 200,
      url: `${first.requestOrigin}${pathname}`,
    };
    return {
      identity,
      mutation: {
        ...identity,
        authorizedPhase: "mount",
        requestBody: body,
        requestBytes: bodyBytes,
        responseBytes: bodyResponseBytes,
      },
    };
  };
  const lessonProgress = browserMutation({
    id: 1,
    pathname: "/api/lesson-progress",
    requestBody: { slug: topicId, action: "start" },
    responseBody: {
      lesson: { slug: topicId, status: "in-progress", topicId },
    },
  });
  const analyticsHandshake = browserMutation({
    id: 2,
    pathname: "/api/learning-events",
    requestBody: { generation: 1, events: [] },
    responseBody: {
      accepted: 0,
      acknowledgedEventIds: [],
      acknowledgedUserId: userId,
      dispositions: [],
      durablyPersisted: true,
      generation: 1,
    },
  });
  const pageViewTimestamp = "2026-08-11T00:00:00.075Z";
  const pageViewEventId = `${pageViewTimestamp}-abcdefgh`;
  const lessonPageView = browserMutation({
    id: 3,
    pathname: "/api/learning-events",
    requestBody: {
      generation: 1,
      events: [{
        id: pageViewEventId,
        type: "page-view",
        source: "lesson",
        timestamp: pageViewTimestamp,
        grade,
        topicId: `student-lessons-${topicId}`,
      }],
    },
    responseBody: {
      accepted: 1,
      acknowledgedEventIds: [pageViewEventId],
      acknowledgedUserId: userId,
      dispositions: [{ id: pageViewEventId, disposition: "inserted" }],
      durablyPersisted: true,
      generation: 1,
    },
  });
  const mountAcknowledgement = ({ authorizedPhase: _phase, ...acknowledgement }) =>
    acknowledgement;
  mount.acknowledgements = {
    lessonPageView: mountAcknowledgement(lessonPageView.mutation),
    lessonProgressStart: mountAcknowledgement(lessonProgress.mutation),
  };
  let apiReceiptSequence = 0;
  const apiReceipt = ({ method, pathname, requestBytes: apiRequestBytes, responseBytes: apiResponseBytes }) => {
    const startedAt = new Date(Date.parse("2026-08-11T00:00:00.000Z") + apiReceiptSequence * 100);
    apiReceiptSequence += 1;
    return {
      completedAt: new Date(startedAt.getTime() + 50).toISOString(),
      method,
      origin: "http://127.0.0.1:3000",
      pathname,
      requestBodySha256: apiRequestBytes === null
        ? null
        : createHash("sha256").update(apiRequestBytes).digest("hex"),
      requestBytes: apiRequestBytes,
      responseBytes: apiResponseBytes,
      responseSha256: createHash("sha256").update(apiResponseBytes).digest("hex"),
      responseUrl: `http://127.0.0.1:3000${pathname}`,
      startedAt: startedAt.toISOString(),
      statusCode: 200,
      url: `http://127.0.0.1:3000${pathname}`,
    };
  };
  const learnerProfileRequestBytes = JSON.stringify({
    answers: { challenge: "balanced", goal: "repair", help: "hint" },
    status: "skipped",
  });
  const learnerProfileResponseBytes = JSON.stringify({
    learnerProfile: {
      answers: { challenge: "balanced", goal: "repair", help: "hint" },
      initializedFrom: "login-onboarding",
      questionnaireVersion: "learner-start-v1",
      skippedAt: "2026-08-11T00:00:00.025Z",
      status: "skipped",
      updatedAt: "2026-08-11T00:00:00.025Z",
      userId,
    },
    shouldShowOnboarding: false,
  });
  const learnerProfileRequest = apiReceipt({
    method: "PATCH",
    pathname: "/api/me/learner-profile",
    requestBytes: learnerProfileRequestBytes,
    responseBytes: learnerProfileResponseBytes,
  });
  const learnerProfileSetup = {
    appOrigin: "http://127.0.0.1:3000",
    completedAt: learnerProfileRequest.completedAt,
    method: "PATCH",
    pathname: "/api/me/learner-profile",
    request: learnerProfileRequest,
    requestBodySha256: learnerProfileRequest.requestBodySha256,
    responseBytes: learnerProfileResponseBytes,
    responseSha256: learnerProfileRequest.responseSha256,
    shouldShowOnboarding: false,
    skippedAt: "2026-08-11T00:00:00.025Z",
    startedAt: learnerProfileRequest.startedAt,
    status: "skipped",
    statusCode: 200,
    userId,
  };
  const mountSessionRead = apiReceipt({
    method: "GET",
    pathname: "/api/visualization-sessions",
    requestBytes: null,
    responseBytes: JSON.stringify({ sessions: [] }),
  });
  const firstSessionRead = apiReceipt({
    method: "GET",
    pathname: "/api/visualization-sessions",
    requestBytes: null,
    responseBytes: firstSessionApiResponseBytes,
  });
  const replayApiRequest = included ? apiReceipt({
    method: "POST",
    pathname: "/api/visualization-sessions",
    requestBytes,
    responseBytes,
  }) : null;
  const replay = included ? {
    directReplayCount: 1,
    duplicate: {
      appStateRevision: firstDurability.appStateRevision,
      idempotent: true,
      responseSha256: firstDurability.responseSha256,
      selectedTopicId: topicId,
      visualizationSliceSha256: firstDurability.visualizationSliceSha256,
    },
    request: replayApiRequest,
    responseBytes,
    responseSha256: createHash("sha256").update(responseBytes).digest("hex"),
  } : null;
  const replaySessionRead = included ? apiReceipt({
    method: "GET",
    pathname: "/api/visualization-sessions",
    requestBytes: null,
    responseBytes: firstSessionApiResponseBytes,
  }) : null;
  const second = {
    browserDigest: "2".repeat(64),
    browserEventCount: 4,
    browserSessionPostCount: 1,
    controlEvents: secondEvents,
    controlObserverStop: stop,
    expectedControl: secondExpectedControl,
    ordinal: 2,
    storage: emptyStorage,
  };
  const lessonUrl = `http://127.0.0.1:3000/student/lessons/${encodeURIComponent(topicId)}`;
  const final = {
    apiRequests: [
      learnerProfileRequest,
      mountSessionRead,
      firstSessionRead,
      ...(replayApiRequest && replaySessionRead
        ? [replayApiRequest, replaySessionRead]
        : []),
    ],
    browserSessionPostCount: 1,
    controlEvents: { first: firstEvents, second: secondEvents },
    controlObserverStop: stop,
    coverage: included ? "full-raw-replay" : "browser",
    directReplayCount: included ? 1 : 0,
    expectedControl: { first: firstExpectedControl, second: secondExpectedControl },
    first,
    identity: {
      appOrigin: "http://127.0.0.1:3000",
      grade,
      lessonPathname: `/student/lessons/${encodeURIComponent(topicId)}`,
      lessonSlug: topicId,
      moduleId: "configured-visualization-lab",
      selectedTopicId: topicId,
      siblingTopicIds: [],
      source,
      userId,
    },
    learnerProfileSetup,
    manifest: {
      pathManifestPath,
      paths: { ...pathManifest.paths },
      runId: pathManifest.runId,
      schemaVersion: 1,
    },
    mount,
    mutations: [
      lessonProgress.mutation,
      analyticsHandshake.mutation,
      lessonPageView.mutation,
      firstMutation,
    ],
    navigation: {
      historyDrifts: [],
      location: {
        hash: "",
        href: lessonUrl,
        origin: "http://127.0.0.1:3000",
        pathname: `/student/lessons/${encodeURIComponent(topicId)}`,
        search: "",
      },
      mainFrameNavigations: [{ sequence: 1, url: lessonUrl }],
    },
    projectName: project,
    replay,
    requests: [
      lessonProgress.identity,
      analyticsHandshake.identity,
      lessonPageView.identity,
      firstRequestIdentity,
    ],
    second,
    seal: null,
    storage: emptyStorage,
    storageEvents: [],
    testOutputDir: `${pathManifest.paths.outputDir}/${groupId.toLowerCase()}-${project}`,
    title: testTitle,
    topology: {
      applicationEvents: [],
      arm: { frameCount: 1, mainFrameUrl: "about:blank", pageCount: 1, pageUrl: "about:blank" },
      current: { frameCount: 1, mainFrameUrl: lessonUrl, pageCount: 1, pageUrl: lessonUrl },
      events: [],
      listenerCleanup: {
        applicationTopologyObserverRemoved: true,
        contextPageListenerRemoved: true,
        pageListenerEvents: [
          "frameattached", "framedetached", "framenavigated", "popup",
          "request", "requestfailed", "requestfinished", "response",
        ],
        removedExactlyOnce: true,
        storageEventListenerRemoved: true,
        totalRemoved: 9,
      },
    },
  };
  const networkSha256 = createHash("sha256")
    .update(canonicalJson(final.requests))
    .digest("hex");
  const sealId = `${adapterId}:1`;
  const observerSnapshot = {
    controlObserverActive: false,
    controlObserverFrozenEventCount: 4,
    controlObserverLedgerFrozen: true,
    controlObserverRemovalCount: 1,
    controlObserverStopReceipt: stop,
    events,
    initialStorage: mount.initialStorage.entries.map(({ key, raw }) => ({ key, raw })),
    listenerErrors: [],
    location: final.navigation.location,
    navigationDrifts: final.navigation.historyDrifts,
    storageError: null,
    storageEvents: final.storageEvents,
    topologyEvents: final.topology.applicationEvents,
    version: 1,
  };
  const sealDigests = {
    locationSha256: createHash("sha256")
      .update(canonicalJson(final.navigation.location)).digest("hex"),
    observerSha256: createHash("sha256")
      .update(canonicalJson(observerSnapshot)).digest("hex"),
    storageSha256: final.storage.digest,
  };
  const sealEpoch = 9;
  const terminalEpoch = 12;
  final.seal = {
    compositeSha256: createHash("sha256").update(canonicalJson({
      browserEpoch: sealEpoch,
      digests: sealDigests,
      networkSha256,
      sealId,
      terminalEpoch,
    })).digest("hex"),
    digests: sealDigests,
    epoch: sealEpoch,
    linearization: "browser-task-sealed-after-immutable-snapshot-digests-and-confirmed-after-125ms",
    networkSha256,
    postSealViolations: [],
    sealId,
    state: "sealed",
    terminalEpoch,
  };
  const acknowledgement = responseBody;
  const rawReplayLedger = {
    expectedCountAcrossReport: expectedTopicIds.length,
    expectedProjects: ["desktop-chrome"],
    expectedTopicIds,
    included,
    representativeRule: groupId === "G06"
      ? "desktop-chrome:first-canonical-chunk-for-g06-topic"
      : `desktop-chrome:first-canonical-chunk-per-${groupId.toLowerCase()}-topic`,
    topicId,
  };
  if (groupId === "G03" || groupId === "G05") {
    const probe = {
      controlObserverStop: stop,
      first,
      second,
      sessionAcknowledgement: acknowledgement,
    };
    if (groupId === "G03") {
      const resetCase = producerG03ResetCases.find(({ input }) => input.labId === topicId);
      assert.ok(resetCase, `missing G03 reset probe case for ${topicId}`);
      const probeMode = focusedG03ProbeModeByTopic[topicId];
      assert.ok(probeMode, `missing G03 durability probe mode for ${topicId}`);
      const probeCase = probeMode === "compare"
        ? {
            compare: "r:1/1",
            input: {
              labId: topicId,
              left: g03Rational(-3, 2),
              mode: probeMode,
              precision: 3,
              right: g03Rational(1),
            },
            point: "r:-3/2",
          }
        : probeMode === "locate"
          ? {
              input: {
                labId: topicId,
                mode: probeMode,
                precision: 3,
                value: structuredClone(resetCase.input.value),
              },
              point: resetCase.point,
            }
          : {
              input: {
                labId: topicId,
                left: g03Surd(2, resetCase.input.value.radicand),
                mode: probeMode,
                precision: 3,
                right: g03Surd(1, 2),
              },
              point: "d:1:2:3:4/1",
            };
      const snapshotForCase = (modeCase) => {
        const configuredState = [
          "signed-real-number-line-v1",
          `lab=${topicId}`,
          `mode=${modeCase.input.mode}`,
          `precision=${modeCase.input.precision}`,
          `point=${modeCase.point}`,
          `compare=${modeCase.compare ?? "-"}`,
          `start=${modeCase.start ?? "-"}`,
          `step=${modeCase.step ?? "-"}`,
        ].join("|");
        return {
          configuredState,
          controlState: g03FixtureControlState(modeCase.input),
          input: structuredClone(modeCase.input),
          labId: topicId,
          mode: modeCase.input.mode,
          pendingRequest: null,
        };
      };
      const signatureFor = (modeCase, snapshot, product) => {
        const geometry = g03FixtureGeometry({
          compare: modeCase.compare ?? "-",
          point: modeCase.point,
          precision: modeCase.input.precision,
          start: modeCase.start ?? "-",
        });
        return {
          actionReceipt: JSON.stringify(product),
          controls: g03FixtureSignatureControls(modeCase.input),
          domainId: `signed-real-number-line:${topicId}:${modeCase.input.mode}:v1`,
          geometryOwners: geometry.geometry.map((point) => ({
            exactKey: point.exactKey,
            ownerId: point.owner,
            renderMarker: point.marker,
            semanticId: point.semanticId,
          })),
          geometryState: geometry.geometryState,
          invariantStates: g03ProductionInvariantStates(
            snapshot.configuredState,
            snapshot.input,
          ),
          mode: modeCase.input.mode,
          semanticState: snapshot.configuredState,
          state: snapshot.configuredState,
        };
      };
      const resetSnapshot = snapshotForCase(resetCase);
      const priorRequest = { kind: "initial", topicId };
      const priorProduct = {
        before: structuredClone(resetSnapshot),
        expected: structuredClone(resetSnapshot),
        observed: structuredClone(resetSnapshot),
        projections: [],
        rejection: null,
        request: priorRequest,
        requested: { ...structuredClone(resetSnapshot), pendingRequest: priorRequest },
        status: "accepted",
        version: "signed-real-number-line-action-receipt-v1",
      };
      const resetSignature = signatureFor(resetCase, resetSnapshot, priorProduct);
      const probeSnapshot = snapshotForCase(probeCase);
      const firstRequest = { controller: "mode", kind: "controller", value: probeMode };
      const firstProduct = {
        before: resetSnapshot,
        expected: probeSnapshot,
        observed: probeSnapshot,
        projections: [],
        rejection: null,
        request: firstRequest,
        requested: { ...structuredClone(resetSnapshot), pendingRequest: firstRequest },
        status: "accepted",
        version: "signed-real-number-line-action-receipt-v1",
      };
      const probeSignature = signatureFor(probeCase, probeSnapshot, firstProduct);
      probe.firstAction = {
        beforeSignature: resetSignature,
        expectedSignature: probeSignature,
        observedSignature: probeSignature,
        plannedRequest: firstRequest,
        projections: [],
        receipt: firstProduct,
      };
      const resetRequest = { kind: "reset", topicId };
      const secondProduct = {
        before: probeSnapshot,
        expected: resetSnapshot,
        observed: resetSnapshot,
        projections: [],
        rejection: null,
        request: resetRequest,
        requested: { ...structuredClone(probeSnapshot), pendingRequest: resetRequest },
        status: "accepted",
        version: "signed-real-number-line-action-receipt-v1",
      };
      const secondResetSignature = signatureFor(resetCase, resetSnapshot, secondProduct);
      probe.secondAction = {
        beforeSignature: probeSignature,
        expectedSignature: secondResetSignature,
        observedSignature: secondResetSignature,
        plannedRequest: resetRequest,
        projections: [],
        receipt: secondProduct,
      };
    }
    return {
      final,
      mount,
      probe,
      rawReplayLedger,
    };
  }
  return {
    controlEvidence: {
      final: {
        controlEvents: final.controlEvents,
        controlObserverStop: stop,
        expectedControl: final.expectedControl,
      },
      first: { controlEvents: firstEvents, expectedControl: firstExpectedControl },
      second: {
        controlEvents: secondEvents,
        controlObserverStop: stop,
        expectedControl: secondExpectedControl,
      },
    },
    final,
    firstSessionAcknowledgement: acknowledgement,
    mount,
    rawReplayLedger,
  };
}

function focusedGroupFixture(groupId) {
  const activeContract = structuredClone(contract);
  const group = activeContract.groups[0];
  group.id = groupId;
  group.attachmentPrefix = `china-mainland-${groupId.toLowerCase()}-`;
  group.file = `tests/e2e/china-mainland-${groupId.toLowerCase()}-fixture.spec.ts`;
  group.schemaVersion = `china-mainland-${groupId.toLowerCase()}-fixture.v1`;
  group.analyticsSource = groupId === "G03" ? "coordinate-plane" : "geometry";
  const labId = focusedLabIds[groupId];
  assert.ok(labId, `missing focused lab ID for ${groupId}`);
  group.chunks[0].chunkId = `${labId}:chunk-01-of-01`;
  const focusedStateIds = stateIds.map((stateId) =>
    `${labId}:${stateId.slice(stateId.indexOf(":") + 1)}`
  );
  group.statePlanSha256 = createHash("sha256")
    .update(`${focusedStateIds.join("\n")}\n`)
    .digest("hex");
  const activeReport = report();
  const title = `${groupId} ${group.chunks[0].chunkId} audits 2 exact states`;
  activeReport.suites[0].file = group.file;
  for (const spec of activeReport.suites[0].specs) {
    spec.file = group.file;
    spec.title = title;
    spec.id = `${groupId.toLowerCase()}-${spec.tests[0].projectName}`;
    const testNode = spec.tests[0];
    const attachment = testNode.results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.project = testNode.projectName;
    payload.chunkId = group.chunks[0].chunkId;
    payload.expectedChunkIds = [group.chunks[0].chunkId];
    payload.expectedStatePlanSha256 = group.statePlanSha256;
    payload.plannedStateIds = focusedStateIds;
    payload.receipts = focusedStateIds.map((stateId) => focusedGroupReceipt(groupId, stateId));
    payload.plannedStateDescriptors = payload.receipts.map((receipt) =>
      focusedStateDescriptor(groupId, receipt)
    );
    const focusedDescriptorPlanSha256 = descriptorPlanSha256(
      payload.plannedStateDescriptors,
    );
    group.stateDescriptorPlanSha256 = focusedDescriptorPlanSha256;
    payload.expectedStateDescriptorPlanSha256 = focusedDescriptorPlanSha256;
    payload.schemaVersion = group.schemaVersion;
    payload.testTitle = title;
    payload.userId = "focused-fixture-user";
    payload.theme = "light";
    payload.viewport = { height: 720, width: 1280 };
    payload.collisionScannerSha256 = fixtureSha256(
      integrationArtifactPaths.collisionScanner,
    );
    payload.contrastScannerSha256 = fixtureSha256(
      integrationArtifactPaths.contrastScanner,
    );
    payload.integrationSourceSha256 = focusedIntegrationSource(groupId);
    payload.producerSourceSha256 = fixtureSha256(group.file);
    payload.durabilityReceipts = focusedDurabilityReceipts(
      groupId,
      testNode.projectName,
      labId,
      testNode.projectName === "desktop-chrome",
      [labId],
      title,
    );
    payload.observedStateDescriptorPlanSha256 = focusedDescriptorPlanSha256;
    payload.observedStatePlanSha256 = group.statePlanSha256;
    if (groupId === "G03") {
      payload.controlDomainVersion = "signed-real-number-line-control-domain-v1";
      payload.geometryVersion = "signed-real-number-line-geometry-v1";
      payload.sourceAggregates = focusedSourceAggregates();
      payload.stateDescriptorSerializer =
        "recursive-object-keys-code-unit-sort-compact-json-lines-final-lf";
    }
    if (groupId === "G05") {
      payload.controlDomain = { id: "percent-applications-rate-v1", version: 1 };
      payload.canonicalRunner = {};
      payload.expectedTopicModeControlTable = {};
      payload.expectedTopicModeControlTableSha256 = "b".repeat(64);
      payload.observedMutationWrites = [];
      payload.observedTopicModeControlTableSha256 = "b".repeat(64);
      payload.sourceAggregates = focusedSourceAggregates();
    }
    if (groupId === "G04") {
      payload.canonicalCliReceipt = {};
      payload.expectedTopicModeControlTable = {};
      payload.expectedTopicModeControlTableSha256 = "c".repeat(64);
      payload.observedTopicModeControlTableSha256 = "c".repeat(64);
      payload.sessionWrites = [];
      payload.sourcePlannerCanaries = {};
    }
    if (groupId === "G06") {
      payload.chunkStateCounts = [2];
      payload.sessionWrites = [];
      payload.sourceHardRejects = {};
      payload.sourceAggregates = focusedSourceAggregates();
      payload.stateDescriptorSerializer =
        "recursive-object-keys-code-unit-sort-compact-json-lines-final-lf";
    }
    if (groupId === "G03" || groupId === "G05") {
      payload.starshipPaths = focusedGroupPathReceipt(groupId, testNode.projectName);
      delete payload.pathReceipt;
    } else {
      payload.pathReceipt = focusedGroupPathReceipt(groupId, testNode.projectName);
      delete payload.starshipPaths;
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    attachment.name = `${group.attachmentPrefix}${testNode.projectName}.json`;
  }
  return { activeContract, activeReport };
}

function focusedControllerDescriptorFixture(groupId) {
  const { activeContract, activeReport } = groupId === "G03"
    ? producerShapedG03ActionFixture({
        beforeCase: producerShapedG03ModeCases[0],
        expectedCase: producerShapedG03ModeCases[0],
        request: { controller: "mode", kind: "controller", value: "locate" },
      })
    : focusedGroupFixture(groupId);
  const controller = {
    G03: {
      controlParameter: "mode",
      request: { controller: "mode", kind: "controller", value: "locate" },
    },
    G04: {
      controlParameter: "mode/evaluated-operation",
      request: { evaluatedOperation: "add", kind: "controller", mode: "add" },
    },
    G05: {
      controlParameter: "mode",
      request: { controllerId: "mode", kind: "controller", value: "find-part" },
    },
  }[groupId];
  assert.ok(controller, `missing controller fixture for ${groupId}`);
  let descriptorSha = null;
  for (const spec of activeReport.suites[0].specs) {
    const attachment = spec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    for (const receipt of payload.receipts) {
      const request = structuredClone(controller.request);
      receipt.action.plannedRequest = request;
      if (groupId === "G03") {
        receipt.action.receipt.request = request;
        receipt.action.receipt.requested.pendingRequest = request;
        synchronizeG03SignatureActionReceipt(receipt.action);
      } else if (groupId === "G04") {
        receipt.productActionReceipt.request = request;
        receipt.action.expectedActionReceipt.request = request;
        receipt.action.plannerReceipt.request = request;
        synchronizeG04RuntimeAction(receipt);
      }
    }
    payload.plannedStateDescriptors = payload.receipts.map((receipt) => ({
      labId: receipt.stateId.slice(0, receipt.stateId.indexOf(":")),
      plan: {
        controlParameter: controller.controlParameter,
        kind: "controller",
        mode: groupId === "G05" ? receipt.domain.observed.mode : receipt.mode,
        request: structuredClone(controller.request),
      },
      stateId: receipt.stateId,
    }));
    const currentSha = descriptorPlanSha256(payload.plannedStateDescriptors);
    if (descriptorSha === null) descriptorSha = currentSha;
    assert.equal(currentSha, descriptorSha);
    payload.expectedStateDescriptorPlanSha256 = currentSha;
    payload.observedStateDescriptorPlanSha256 = currentSha;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  activeContract.groups[0].stateDescriptorPlanSha256 = descriptorSha;
  return { activeContract, activeReport };
}

function artifactMap(overrides = {}) {
  const sourceArtifacts = Object.fromEntries([
    ...Object.values(integrationArtifactPaths),
    ...["G03", "G04", "G05", "G06"].map((groupId) =>
      `tests/e2e/china-mainland-${groupId.toLowerCase()}-fixture.spec.ts`
    ),
  ].map((relativePath) => [
    `${repositoryRoot}/${relativePath}`,
    fixtureArtifactBytes(relativePath),
  ]));
  return new Map(Object.entries({
    [pathManifestPath]: JSON.stringify({
      ...pathManifest,
      externalEvidencePaths: {
        PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
        jsonReportPath: reportPath,
      },
      process: { cwd: repositoryRoot, pid: 31_001, ppid: 31_000 },
      status: "preflight-passed",
    }),
    [browserProcessEvidencePath]: JSON.stringify({
      ancestorPid: 31_001,
      minimumDistinctProfiles: 2,
      observations: [
        {
          browserPid: 41_001,
          mutablePaths: [
            { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir, pid: 41_001 },
            { flag: "user-data-dir", path: `${pathManifest.paths.browserTempDir}/profile-a`, pid: 41_001 },
          ],
          processCount: 3,
          userDataDir: `${pathManifest.paths.browserTempDir}/profile-a`,
        },
        {
          browserPid: 41_002,
          mutablePaths: [
            { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir, pid: 41_002 },
            { flag: "user-data-dir", path: `${pathManifest.paths.browserTempDir}/profile-b`, pid: 41_002 },
          ],
          processCount: 3,
          userDataDir: `${pathManifest.paths.browserTempDir}/profile-b`,
        },
      ],
      immutableExecutablePathsExcludedFromMutableArtifactClassification: true,
      processMutablePathAudit: [
        { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir, pid: 41_001, processKind: "browser-main" },
        { flag: "user-data-dir", path: `${pathManifest.paths.browserTempDir}/profile-a`, pid: 41_001, processKind: "browser-main" },
        { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir, pid: 41_002, processKind: "browser-main" },
        { flag: "user-data-dir", path: `${pathManifest.paths.browserTempDir}/profile-b`, pid: 41_002, processKind: "browser-main" },
      ],
      schemaVersion: 1,
      status: "passed",
    }),
    [browserProfileEvidencePath]: JSON.stringify({
      browserVersion: "151.0.0.0",
      browserCommandAudit: {
        crashpadDatabaseFlagIsFailClosedWhenSpawnedInBrowserTree: true,
        immutableExecutablePathsExcludedFromMutableArtifactClassification: true,
        mutableFlags: [...MUTABLE_BROWSER_PATH_FLAGS],
      },
      channel: "chrome",
      environment: {
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_COMPILE_CACHE: pathManifest.paths.nodeCompileCacheDir,
        TEMP: pathManifest.paths.browserTempDir,
        TMP: pathManifest.paths.browserTempDir,
        TMPDIR: pathManifest.paths.browserTempDir,
        npm_config_cache: pathManifest.paths.npmCacheDir,
      },
      observed: {
        browserPid: 41_001,
        mutablePaths: [
          { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir, pid: 41_001 },
          { flag: "user-data-dir", path: `${pathManifest.paths.browserTempDir}/profile-a`, pid: 41_001 },
        ],
        processCount: 3,
        userDataDir: `${pathManifest.paths.browserTempDir}/profile-a`,
      },
      pathManifestPath,
      projectFixtureInheritance: contract.projects.map((projectName) => ({
        channel: "chrome",
        launchArgs: [
          "--disable-breakpad",
          "--disable-crash-reporter",
          `--crash-dumps-dir=${pathManifest.paths.crashDumpDir}`,
        ],
        projectName,
        workerTempEnvironmentInheritedFromPlaywrightNode: true,
      })),
      schemaVersion: 1,
      status: "passed",
    }),
    ...sourceArtifacts,
    ...overrides,
  }));
}

function validationOptions(overrides) {
  const artifacts = artifactMap(overrides);
  const stableStat = (bytes) => ({
    ctimeNs: 4n,
    dev: 1n,
    ino: 2n,
    isFile: () => true,
    mtimeNs: 3n,
    size: BigInt(bytes.length),
  });
  return {
    lstatArtifact: async (artifactPath) => ({
      dev: 1n,
      ino: 2n,
      isFile: () => artifacts.has(artifactPath),
      isSymbolicLink: () => false,
    }),
    openArtifact: async (artifactPath) => {
      const value = artifacts.get(artifactPath);
      if (value === undefined) throw new Error(`missing fixture ${artifactPath}`);
      const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
      return {
        close: async () => {},
        readFile: async () => bytes,
        stat: async () => stableStat(bytes),
      };
    },
    readArtifact: async (artifactPath, encoding) => {
      const value = artifacts.get(artifactPath);
      if (value === undefined) throw new Error(`missing fixture ${artifactPath}`);
      if (encoding === "utf8") return Buffer.isBuffer(value) ? value.toString("utf8") : value;
      return Buffer.isBuffer(value) ? value : Buffer.from(value);
    },
    realpathArtifact: async (artifactPath) => artifactPath,
  };
}

test("pins the four-group two-project release topology independently of every spec", () => {
  const frozen = MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT;
  assert.deepEqual(frozen.projects, ["desktop-chrome", "mobile-chrome"]);
  assert.deepEqual(
    frozen.groups.map(({ canonicalExecutionCount, chunks, id, stateCountPerProject }) => ({
      canonicalExecutionCount,
      chunkCount: chunks.length,
      id,
      stateCountPerProject,
    })),
    [
      { canonicalExecutionCount: 52, chunkCount: 26, id: "G03", stateCountPerProject: 778 },
      { canonicalExecutionCount: 26, chunkCount: 13, id: "G04", stateCountPerProject: 357 },
      { canonicalExecutionCount: 10, chunkCount: 5, id: "G05", stateCountPerProject: 126 },
      { canonicalExecutionCount: 4, chunkCount: 2, id: "G06", stateCountPerProject: 62 },
    ],
  );
  assert.deepEqual(
    frozen.groups.map(({ analyticsSource }) => analyticsSource),
    ["coordinate-plane", "geometry", "geometry", "geometry"],
  );
  assert.equal(
    frozen.groups.reduce((sum, group) => sum + group.canonicalExecutionCount, 0),
    92,
  );
  assert.equal(
    frozen.groups.reduce((sum, group) => sum + group.chunks.length, 0),
    46,
  );
  assert.equal(
    new Set(frozen.groups.flatMap((group) =>
      group.chunks.map((chunk) =>
        `${group.file}\u0000${group.id} ${chunk.chunkId} audits ${chunk.stateCount} exact states`
      )
    )).size,
    46,
  );
  assert.equal(
    frozen.groups.reduce((sum, group) => sum + group.stateCountPerProject * frozen.projects.length, 0),
    2_646,
  );
  assert.deepEqual(
    frozen.groups.map((group) => group.stateDescriptorPlanSha256),
    [
      "277bd4b9b512ac7768738f3ce3d96a32f954e971770a146f4bd51c3de87e7da0",
      "701af7210820f410d663a2eab8018c3d9f4cfe2cbc55651e68c3d5f25adf3978",
      "5273f49a219e3b1416d346de98c34f60d239b9904782fa817955f91ca7d3c7be",
      "3756c3e9344aebcdc68b9e5ad011061a14e5df1ddac9c79af9f0b1450460acb6",
    ],
    "G03-G06 pin the independently reviewed producer descriptor plans",
  );
  assert.deepEqual(
    frozen.groups.map((group) => group.schemaVersion),
    [
      "china-mainland-g03-signed-real-production.v3",
      "china-mainland-g04-fraction-operations-production.v4",
      "china-mainland-g05-percent-applications-production.v3",
      "china-mainland-g06-ratio-proportion-scale-production.v3",
    ],
  );
  assert.equal(descriptorPlanSha256(plannedStateDescriptors), stateDescriptorPlanSha256);
  assert.deepEqual(MAINLAND_FOCUSED_VISUALIZATION_OUTER_SUPERVISOR_CONTRACT, {
    integrationHook: "outerSupervisorReceiptPath",
    releaseReadyWithoutOuterSupervisorReceipt: false,
    schemaVersion: 1,
    validatorScope: "inner-playwright-report-and-run-receipts-only",
  });
});

test("accepts the exact two-project report and recomputes every ordered state receipt", async () => {
  const summary = await validateMainlandFocusedVisualizationReport(
    report(), reportPath, contract, validationOptions(),
  );
  assert.deepEqual(summary, {
    dynamicSourceReadLinearization:
      "successful-second-O_NOFOLLOW-open-read-and-before-after-fstat-with-byte-equality; post-point path replacement is outside the pure-path API guarantee",
    executionCount: 2,
    groupCount: 1,
    ioTrust: "injected-untrusted-test-seam",
    outerSupervisor: MAINLAND_FOCUSED_VISUALIZATION_OUTER_SUPERVISOR_CONTRACT,
    projects: ["desktop-chrome", "mobile-chrome"],
    releaseReady: false,
    reportPath,
    stateReceiptCount: 4,
    status: "inner-report-passed",
  });
});

test("producer contract 73 accepts exact closed durability and source provenance attachments", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const summary = await validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    );
    assert.equal(summary.executionCount, 2);
  }
});

test("mutation 73b rejects a coherent analytics source outside the pinned group contract", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const targetSpec = activeReport.suites[0].specs.find((spec) =>
    spec.tests[0].projectName === "mobile-chrome"
  );
  assert.ok(targetSpec);
  const attachment = targetSpec.tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const durability = payload.durabilityReceipts;
  const final = durability.final;
  const forgedSource = "coordinate-plane";
  durability.firstSessionAcknowledgement.session.source = forgedSource;
  final.identity.source = forgedSource;
  final.first.requestBody.source = forgedSource;
  final.first.requestBytes = JSON.stringify(final.first.requestBody);
  final.first.response.body = structuredClone(durability.firstSessionAcknowledgement);
  final.first.response.bytes = JSON.stringify(final.first.response.body);
  final.first.response.bytesSha256 = createHash("sha256")
    .update(final.first.response.bytes).digest("hex");
  for (const request of final.apiRequests) {
    if (request.requestBytes !== null) {
      request.requestBytes = request.requestBytes.replaceAll("geometry", forgedSource);
      request.requestBodySha256 = createHash("sha256").update(request.requestBytes).digest("hex");
    }
    request.responseBytes = request.responseBytes.replaceAll("geometry", forgedSource);
    request.responseSha256 = createHash("sha256").update(request.responseBytes).digest("hex");
  }
  const firstMutation = final.mutations.find(({ authorizedPhase }) =>
    authorizedPhase === "first-control"
  );
  assert.ok(firstMutation);
  firstMutation.requestBody.source = forgedSource;
  firstMutation.requestBytes = JSON.stringify(firstMutation.requestBody);
  firstMutation.responseBytes = JSON.stringify(durability.firstSessionAcknowledgement);
  firstMutation.requestBodySha256 = createHash("sha256")
    .update(firstMutation.requestBytes).digest("hex");
  firstMutation.responseSha256 = createHash("sha256")
    .update(firstMutation.responseBytes).digest("hex");
  const firstRequest = final.requests.find(({ id }) => id === firstMutation.id);
  assert.ok(firstRequest);
  firstRequest.requestBodySha256 = firstMutation.requestBodySha256;
  firstRequest.responseSha256 = firstMutation.responseSha256;
  repinDurabilitySeal(final);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /analytics source drifted from the group contract/u,
  );
});

test("mutation 74 rejects a surplus durability receipt key", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  payload.durabilityReceipts.surplus = true;
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /durabilityReceipts key mismatch/u,
  );
});

test("mutation 75 rejects missing final second-control evidence", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  delete payload.durabilityReceipts.final.second;
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /durabilityReceipts\.final key mismatch/u,
  );
});

test("mutation 76 rejects a reordered control event even with a recomputed self hash", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const coherentlyReorder = (value) => {
    if (Array.isArray(value)) {
      for (const child of value) coherentlyReorder(child);
      return;
    }
    if (value === null || typeof value !== "object") return;
    if (value.sequence === 1 && value.type === "pointerup") value.sequence = 2;
    for (const child of Object.values(value)) coherentlyReorder(child);
    if (Array.isArray(value.events) && typeof value.eventsSha256 === "string") {
      value.eventsSha256 = createHash("sha256")
        .update(canonicalJson(value.events))
        .digest("hex");
    }
  };
  coherentlyReorder(payload.durabilityReceipts);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /control event.*sequence|control ledger/u,
  );
});

test("mutation 77 rejects G04 controlEvidence drift from final evidence", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  payload.durabilityReceipts.controlEvidence.first.expectedControl.controlKey += "-forged";
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /controlEvidence family drifted/u,
  );
});

test("mutation 78 rejects surplus first-request, response, and identity keys", async () => {
  for (const target of ["requestBody", "response", "identity"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    const selected = target === "identity" ? final.identity : final.first[target];
    selected.surplus = true;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      new RegExp(`${target} key mismatch`, "u"),
    );
  }
});

test("mutation 79 rejects a surplus producer top-level attachment key", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.surplus = true;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      new RegExp(`${groupId} attachment key mismatch`, "u"),
    );
  }
});

test("mutation 80 rejects a coherent ACK and final identity moved to a sibling topic", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const originalTopic = focusedLabIds.G05;
  const siblingTopic = "pep-primary-p6-upper-percent-fractions";
  payload.durabilityReceipts = JSON.parse(
    JSON.stringify(payload.durabilityReceipts).replaceAll(originalTopic, siblingTopic),
  );
  const repinResponseHashes = (value) => {
    if (Array.isArray(value)) return value.forEach(repinResponseHashes);
    if (value === null || typeof value !== "object") return;
    if (
      Object.hasOwn(value, "body") &&
      typeof value.bytes === "string" &&
      typeof value.bytesSha256 === "string"
    ) {
      value.bytes = JSON.stringify(value.body);
      value.bytesSha256 = createHash("sha256").update(value.bytes).digest("hex");
    }
    if (Array.isArray(value.events) && typeof value.eventsSha256 === "string") {
      value.eventsSha256 = createHash("sha256")
        .update(canonicalJson(value.events))
        .digest("hex");
    }
    for (const child of Object.values(value)) repinResponseHashes(child);
  };
  repinResponseHashes(payload.durabilityReceipts);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /lesson identity grade\/sibling\/slug contract drifted/u,
  );
});

function productionRawLedgerRows() {
  return MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT.groups.flatMap((group) => {
    const topicIds = [...new Set(group.chunks.map(({ chunkId }) =>
      chunkId.slice(0, chunkId.indexOf(":chunk-"))
    ))];
    const rule = group.id === "G06"
      ? "desktop-chrome:first-canonical-chunk-for-g06-topic"
      : `desktop-chrome:first-canonical-chunk-per-${group.id.toLowerCase()}-topic`;
    return MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT.projects.flatMap((project) =>
      group.chunks.map(({ chunkId }) => {
        const topicId = chunkId.slice(0, chunkId.indexOf(":chunk-"));
        const included = project === "desktop-chrome" && /:chunk-01-of-/u.test(chunkId);
        return {
          chunkId,
          final: {
            coverage: included ? "full-raw-replay" : "browser",
            directReplayCount: included ? 1 : 0,
            first: { durability: included ? {} : null, rawIncluded: included },
            mount: { durability: included ? {} : null, rawIncluded: included },
            replay: included ? {} : null,
          },
          groupId: group.id,
          project,
          rawReplayLedger: {
            expectedCountAcrossReport: topicIds.length,
            expectedProjects: ["desktop-chrome"],
            expectedTopicIds: topicIds,
            included,
            representativeRule: rule,
            topicId,
          },
        };
      })
    );
  });
}

test("producer contract 81 independently derives the exact raw14 representatives from 92 rows", () => {
  const summary = validateMainlandFocusedVisualizationRawReplayLedger(
    productionRawLedgerRows(),
    MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
  );
  assert.equal(summary.executionCount, 92);
  assert.equal(summary.includedCount, 14);
  assert.deepEqual(summary.countsByGroup, { G03: 6, G04: 5, G05: 2, G06: 1 });
});

test("mutation 82 rejects a coherent raw representative move from chunk-01 to chunk-02", () => {
  const rows = productionRawLedgerRows();
  const first = rows.find((row) =>
    row.groupId === "G03" &&
    row.project === "desktop-chrome" &&
    row.chunkId === "bnu-junior-s1-upper-rational-numbers:chunk-01-of-04"
  );
  const second = rows.find((row) =>
    row.groupId === "G03" &&
    row.project === "desktop-chrome" &&
    row.chunkId === "bnu-junior-s1-upper-rational-numbers:chunk-02-of-04"
  );
  assert.ok(first && second);
  for (const [row, included] of [[first, false], [second, true]]) {
    row.rawReplayLedger.included = included;
    row.final.coverage = included ? "full-raw-replay" : "browser";
    row.final.directReplayCount = included ? 1 : 0;
    row.final.first.rawIncluded = included;
    row.final.first.durability = included ? {} : null;
    row.final.mount.rawIncluded = included;
    row.final.replay = included ? {} : null;
  }
  assert.throws(
    () => validateMainlandFocusedVisualizationRawReplayLedger(
      rows,
      MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
    ),
    /raw replay canonical representative drifted/u,
  );
});

test("mutation 83 rejects a coherently forged source leaf and producer hash", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  for (const spec of activeReport.suites[0].specs) {
    const attachment = spec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const forged = "f".repeat(64);
    payload.collisionScannerSha256 = forged;
    payload.integrationSourceSha256.collisionScanner = forged;
    payload.producerSourceSha256 = forged;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /dynamic source provenance.*(integrationSourceSha256|collisionScanner|producerSourceSha256)/u,
  );
});

test("mutation 84 rejects durability and scanner aggregate drift", async () => {
  for (const field of ["durabilityBrowserPairSha256", "scannerSha256"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.sourceAggregates[field] = "e".repeat(64);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /dynamic source provenance aggregate drifted/u,
    );
  }
});

test("mutation 85 rejects symlink, nonregular, and realpath-alias source metadata", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  for (const kind of ["symlink", "directory", "alias"]) {
    const base = validationOptions();
    const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
    const options = {
      ...base,
      lstatArtifact: async (artifactPath) => artifactPath === targetPath
        ? {
            isFile: () => kind !== "directory",
            isSymbolicLink: () => kind === "symlink",
          }
        : base.lstatArtifact(artifactPath),
      realpathArtifact: async (artifactPath) =>
        kind === "alias" && artifactPath === targetPath
          ? `${repositoryRoot}-evil/${integrationArtifactPaths.collisionScanner}`
          : base.realpathArtifact(artifactPath),
    };
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, options,
      ),
      /dynamic source provenance.*(regular non-symlink|realpath alias)/u,
    );
  }
});

test("mutation 86 rejects producerSourceSha256 drift against the fixed group file", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  for (const spec of activeReport.suites[0].specs) {
    const attachment = spec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.producerSourceSha256 = "d".repeat(64);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /dynamic source provenance producerSourceSha256 drifted/u,
  );
});

test("mutation 87 rejects forged request, API-request, and mutation ledgers", async () => {
  for (const field of ["requests", "apiRequests", "mutations"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.durabilityReceipts.final[field] = [{ forged: true }];
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /request ledger|API request ledger|mutation ledger/u,
    );
  }
});

test("mutation 88 rejects a coherent non-origin URL and ambiguous required headers", async () => {
  for (const kind of ["origin", "headers"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const first = payload.durabilityReceipts.final.first;
    if (kind === "origin") {
      const forgedOrigin = "https://forged.invalid";
      first.requestOrigin = forgedOrigin;
      first.requestUrl = `${forgedOrigin}/api/visualization-sessions`;
      payload.durabilityReceipts.final.identity.appOrigin = forgedOrigin;
      for (const request of payload.durabilityReceipts.final.requests) {
        request.origin = forgedOrigin;
        request.url = first.requestUrl;
      }
      for (const mutation of payload.durabilityReceipts.final.mutations) {
        mutation.origin = forgedOrigin;
        mutation.url = first.requestUrl;
      }
    } else {
      first.requestHeaders["Content-Type"] = "text/plain";
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /canonical app origin|ambiguous required request header/u,
    );
  }
});

test("mutation 89 rejects raw-ledger drift through the main report validator", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const durability = payload.durabilityReceipts;
  durability.rawReplayLedger.included = false;
  durability.mount.rawIncluded = false;
  durability.final.mount.rawIncluded = false;
  durability.final.first.rawIncluded = false;
  durability.final.first.durability = null;
  durability.final.coverage = "browser";
  durability.final.directReplayCount = 0;
  durability.final.replay = null;
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /raw replay ledger validation failed.*canonical representative drifted/u,
  );
});

test("producer contract 90 hashes non-UTF8 fixed source bytes without text coercion", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const rawBytes = Buffer.from([0xff, 0x00, 0x0a]);
  const rawSha256 = createHash("sha256").update(rawBytes).digest("hex");
  const scannerHash = createHash("sha256");
  for (const relativePath of [
    integrationArtifactPaths.collisionScanner,
    integrationArtifactPaths.contrastScanner,
    integrationArtifactPaths.scannerSixCaseTest,
  ]) {
    scannerHash.update(relativePath);
    scannerHash.update(Uint8Array.of(0));
    scannerHash.update(
      relativePath === integrationArtifactPaths.collisionScanner
        ? rawBytes
        : fixtureArtifactBytes(relativePath),
    );
  }
  const rawScannerAggregate = scannerHash.digest("hex");
  for (const spec of activeReport.suites[0].specs) {
    const attachment = spec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.collisionScannerSha256 = rawSha256;
    payload.integrationSourceSha256.collisionScanner = rawSha256;
    payload.sourceAggregates.scannerSha256 = rawScannerAggregate;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  const summary = await validateMainlandFocusedVisualizationReport(
    activeReport,
    reportPath,
    activeContract,
    validationOptions({
      [`${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`]: rawBytes,
    }),
  );
  assert.equal(summary.ioTrust, "injected-untrusted-test-seam");
});

test("mutation 91 rejects aggregate serializer and fixed-order drift", async () => {
  for (const mutation of [
    (aggregates) => { aggregates.durabilitySerialization = "single-space-no-final-lf"; },
    (aggregates) => { aggregates.scannerSerialization = "path-raw-no-nul"; },
    (aggregates) => { aggregates.scannerEntries.reverse(); },
  ]) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    mutation(payload.sourceAggregates);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /dynamic source provenance aggregate drifted/u,
    );
  }
});

test("mutation 92 requires artifact IO injection to be all-or-none", async () => {
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      { readArtifact: validationOptions().readArtifact },
    ),
    /artifact IO dependencies must be injected all-or-none/u,
  );
});

test("mutation 93 rejects a nonempty canonical-session URL fragment", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const final = payload.durabilityReceipts.final;
  const firstMutation = final.mutations.find(({ authorizedPhase }) =>
    authorizedPhase === "first-control"
  );
  assert.ok(firstMutation);
  const firstRequest = final.requests.find(({ id }) => id === firstMutation.id);
  assert.ok(firstRequest);
  firstRequest.hash = "#forged";
  firstRequest.url += "#forged";
  firstMutation.hash = "#forged";
  firstMutation.url += "#forged";
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /request ledger does not uniquely bind/u,
  );
});

test("mutation 94 rejects raw mount durability on an excluded execution", () => {
  const rows = productionRawLedgerRows();
  const excluded = rows.find((row) =>
    row.groupId === "G04" &&
    row.project === "mobile-chrome" &&
    row.chunkId === "bnu-primary-p5-lower-fraction-add-sub:chunk-01-of-02"
  );
  assert.ok(excluded);
  excluded.final.mount.durability = { forged: true };
  assert.throws(
    () => validateMainlandFocusedVisualizationRawReplayLedger(
      rows,
      MAINLAND_FOCUSED_VISUALIZATION_REPORT_CONTRACT,
    ),
    /raw replay coverage implication drifted/u,
  );
});

test("mutation 95 rejects the wrong session owner and a hollow mount control list", async () => {
  for (const kind of ["owner", "controls"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const mount = payload.durabilityReceipts.mount;
    if (kind === "owner") mount.root.sessionOwner = payload.userId;
    else mount.root.controls = [];
    payload.durabilityReceipts.final.mount = structuredClone(mount);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      kind === "owner"
        ? /first-session acknowledgement\/request identity drifted/u
        : /mount root control ledger is empty/u,
    );
  }
});

test("mutation 96 rejects forged browser event counts and adapter identity", async () => {
  for (const kind of ["event-counts", "adapter-id"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    if (kind === "event-counts") {
      final.first.browserEventCount = 4;
      final.second.browserEventCount = 2;
      payload.durabilityReceipts.probe.first.browserEventCount = 4;
      payload.durabilityReceipts.probe.second.browserEventCount = 2;
    } else {
      const forged = "adapter-forged";
      const replaceAdapter = (value) => {
        if (Array.isArray(value)) return value.forEach(replaceAdapter);
        if (value === null || typeof value !== "object") return;
        if (typeof value.adapterId === "string") value.adapterId = forged;
        if (typeof value.stopId === "string") {
          value.stopId = `${forged}:control-observer-stop:1`;
        }
        for (const child of Object.values(value)) replaceAdapter(child);
      };
      replaceAdapter(payload.durabilityReceipts);
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /browser event count|adapter identity/u,
    );
  }
});

test("producer contract 97 accepts the exact four-key G05 probe without invented actions", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  for (const spec of activeReport.suites[0].specs) {
    const attachment = spec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    assert.deepEqual(Object.keys(payload.durabilityReceipts.probe).sort(), [
      "controlObserverStop",
      "first",
      "second",
      "sessionAcknowledgement",
    ]);
  }
  const summary = await validateMainlandFocusedVisualizationReport(
    activeReport, reportPath, activeContract, validationOptions(),
  );
  assert.equal(summary.executionCount, 2);
});

test("mutation 98 rejects fixed-path replacement after the no-follow handle opens", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const base = validationOptions();
  const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
  let targetLstatCalls = 0;
  const options = {
    ...base,
    lstatArtifact: async (artifactPath, statOptions) => {
      const metadata = await base.lstatArtifact(artifactPath, statOptions);
      if (artifactPath !== targetPath) return metadata;
      targetLstatCalls += 1;
      return targetLstatCalls === 1
        ? metadata
        : { ...metadata, ino: 99n };
    },
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, options,
    ),
    /changed path identity while being read/u,
  );
});

test("mutation 99 rejects replacement between post-read path check and confirmation open", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const base = validationOptions();
  const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
  let targetOpenCalls = 0;
  let targetCloseCalls = 0;
  const options = {
    ...base,
    openArtifact: async (artifactPath, flags) => {
      assert.equal(
        flags,
        fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
        "fixed sources must use O_RDONLY | O_NOFOLLOW",
      );
      if (artifactPath !== targetPath) return base.openArtifact(artifactPath, flags);
      targetOpenCalls += 1;
      if (targetOpenCalls === 1) {
        const handle = await base.openArtifact(artifactPath, flags);
        return {
          ...handle,
          close: async () => {
            targetCloseCalls += 1;
            await handle.close();
          },
        };
      }
      return {
        close: async () => { targetCloseCalls += 1; },
        readFile: async () => { throw new Error("confirmation handle must not read"); },
        stat: async () => ({
          dev: 1n,
          ino: 99n,
          isFile: () => true,
          mtimeNs: 3n,
          size: 1n,
        }),
      };
    },
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, options,
    ),
    /changed identity after post-read realpath confirmation/u,
  );
  assert.equal(targetOpenCalls, 2);
  assert.equal(targetCloseCalls, 2, "both opened handles close exactly once");
});

test("mutation 101 preserves primary and close failures and closes the source handle once", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const base = validationOptions();
  const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
  let targetCloseCalls = 0;
  const options = {
    ...base,
    openArtifact: async (artifactPath, flags) => {
      if (artifactPath !== targetPath) return base.openArtifact(artifactPath, flags);
      const handle = await base.openArtifact(artifactPath, flags);
      return {
        ...handle,
        close: async () => {
          targetCloseCalls += 1;
          throw new Error("close-failure-sentinel");
        },
        readFile: async () => {
          throw new Error("primary-read-failure-sentinel");
        },
      };
    },
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, options,
    ),
    (error) => {
      assert.match(error.message, /primary-read-failure-sentinel/u);
      assert.match(error.message, /close-failure-sentinel/u);
      return true;
    },
  );
  assert.equal(targetCloseCalls, 1, "the failing source handle closes exactly once");
});

test("mutation 102 rejects a close-only source failure and closes both handles once", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const base = validationOptions();
  const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
  const closeCalls = [];
  let targetOpenCalls = 0;
  const options = {
    ...base,
    openArtifact: async (artifactPath, flags) => {
      if (artifactPath !== targetPath) return base.openArtifact(artifactPath, flags);
      const handle = await base.openArtifact(artifactPath, flags);
      const handleIndex = targetOpenCalls;
      targetOpenCalls += 1;
      closeCalls[handleIndex] = 0;
      return {
        ...handle,
        close: async () => {
          closeCalls[handleIndex] += 1;
          if (handleIndex === 0) throw new Error("close-only-failure-sentinel");
          await handle.close();
        },
      };
    },
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, options,
    ),
    /close-only-failure-sentinel/u,
  );
  assert.equal(targetOpenCalls, 2);
  assert.deepEqual(closeCalls, [1, 1], "each opened handle closes exactly once");
});

test("mutation 103 rejects same-inode bytes rewritten before the linearization open", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const base = validationOptions();
  const targetPath = `${repositoryRoot}/${integrationArtifactPaths.collisionScanner}`;
  let targetOpenCalls = 0;
  let confirmationReadCalls = 0;
  const options = {
    ...base,
    openArtifact: async (artifactPath, flags) => {
      if (artifactPath !== targetPath) return base.openArtifact(artifactPath, flags);
      targetOpenCalls += 1;
      const handle = await base.openArtifact(artifactPath, flags);
      if (targetOpenCalls === 1) return handle;
      const originalBytes = Buffer.from(fixtureArtifactBytes(integrationArtifactPaths.collisionScanner));
      const rewrittenBytes = Buffer.from(originalBytes);
      rewrittenBytes[0] ^= 0xff;
      return {
        ...handle,
        readFile: async () => {
          confirmationReadCalls += 1;
          return rewrittenBytes;
        },
      };
    },
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, options,
    ),
    /changed bytes before the source-read linearization point/u,
  );
  assert.equal(targetOpenCalls, 2);
  assert.equal(confirmationReadCalls, 1);
});

test("mutation 100 rejects a coherent foreign or non-200 API request receipt", async () => {
  for (const kind of ["foreign", "status"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    const forged = structuredClone(final.apiRequests[0]);
    if (kind === "foreign") {
      forged.origin = "https://forged.invalid";
      forged.pathname = "/steal";
      forged.url = "https://forged.invalid/steal";
      forged.responseUrl = forged.url;
      forged.method = "GET";
      forged.requestBytes = null;
      forged.requestBodySha256 = null;
    } else {
      forged.statusCode = -999;
    }
    final.apiRequests.push(forged);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /API request ledger.*(local exact target|status)/u,
    );
  }
});

test("mutation 104 rejects a reordered or hollow terminal mount mutation ledger", async () => {
  for (const kind of ["order", "count"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    if (kind === "order") {
      [final.mutations[0], final.mutations[1]] = [final.mutations[1], final.mutations[0]];
    } else {
      final.mutations.splice(1, 1);
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /terminal mount mutation ledger|non-safe request ledger is not the exact mutation projection/u,
    );
  }
});

test("mutation 105 rejects a forged final network seal even when its hash is well formed", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  payload.durabilityReceipts.final.seal.networkSha256 = "f".repeat(64);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /final network seal/u,
  );
});

test("mutation 106 rejects a hollow root control and nonterminal mount digest", async () => {
  for (const kind of ["control", "digest"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const mount = payload.durabilityReceipts.mount;
    if (kind === "control") mount.root.controls[0] = {};
    else mount.browserDigest = "not-a-sha";
    payload.durabilityReceipts.final.mount = structuredClone(mount);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /mount(?:.*root.*(?:control|key mismatch)| terminal envelope)/u,
    );
  }
});

test("mutation 107 rejects hollow or coherently forged raw first/replay/API receipts", async () => {
  for (const kind of ["first", "duplicate", "tail", "nonraw-replay"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const targetSpec = activeReport.suites[0].specs.find((spec) =>
      spec.tests[0].projectName === (kind === "nonraw-replay" ? "mobile-chrome" : "desktop-chrome")
    );
    assert.ok(targetSpec);
    const attachment = targetSpec.tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    if (kind === "first") {
      final.first.durability = {};
      payload.durabilityReceipts.probe.first.durability = {};
    } else if (kind === "duplicate") {
      final.replay.duplicate.responseSha256 = "f".repeat(64);
    } else if (kind === "tail") {
      const last = final.apiRequests.length - 1;
      [final.apiRequests[last - 1], final.apiRequests[last]] = [
        final.apiRequests[last], final.apiRequests[last - 1],
      ];
    } else {
      final.replay = {
        directReplayCount: 1,
        duplicate: {},
        request: structuredClone(final.apiRequests[0]),
        responseBytes: "{}",
        responseSha256: createHash("sha256").update("{}").digest("hex"),
      };
      final.coverage = "full-raw-replay";
      final.directReplayCount = 1;
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /first\.durability key mismatch|raw first interaction|replay receipt|API request ledger.*(?:phase|serial)|raw replay/u,
    );
  }
});

test("mutation 108 rejects forged grade, sibling, or storage projections", async () => {
  for (const kind of ["grade", "siblings", "storage"]) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    if (kind === "grade") final.identity.grade = "P9";
    else if (kind === "siblings") final.identity.siblingTopicIds = ["forged-topic"];
    else final.storage.digest = "f".repeat(64);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /page-view|lesson identity|storage receipt/u,
    );
  }
});

test("mutation 109 rejects forged navigation, topology, manifest, and seal leaf claims", async (t) => {
  for (const kind of ["navigation", "topology", "manifest", "seal-leaf"]) {
    await t.test(kind, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      if (kind === "navigation") final.navigation.location.href = "https://forged.invalid/";
      else if (kind === "topology") final.topology.current.pageCount = 2;
      else if (kind === "manifest") final.manifest = {};
      else {
        final.seal.digests.observerSha256 = "f".repeat(64);
        final.seal.compositeSha256 = createHash("sha256").update(canonicalJson({
          browserEpoch: final.seal.epoch,
          digests: final.seal.digests,
          networkSha256: final.seal.networkSha256,
          sealId: final.seal.sealId,
          terminalEpoch: final.seal.terminalEpoch,
        })).digest("hex");
      }
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /navigation|topology|manifest|seal digest/u,
      );
    });
  }
});

test("mutation 109b binds final manifest and test output to the separately read outer manifest", async (t) => {
  for (const kind of ["manifest-projection", "test-output-dir"]) {
    await t.test(kind, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      if (kind === "manifest-projection") {
        final.manifest.runId = "coherent-but-foreign-run";
      } else {
        final.manifest.paths.outputDir = "/Volumes/Starship/foreign-focused-output";
        final.testOutputDir = "/Volumes/Starship/foreign-focused-output/g06-desktop-chrome";
      }
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /outer manifest|testOutputDir.*outer manifest/u,
      );
    });
  }
});

test("producer contract 112 permits a safe non-200 GET but rejects an unlisted mutation", async (t) => {
  await t.test("safe GET status 304", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    const firstMutation = final.mutations.find(({ authorizedPhase }) =>
      authorizedPhase === "first-control"
    );
    assert.ok(firstMutation);
    const firstRequest = final.requests.find(({ id }) => id === firstMutation.id);
    assert.ok(firstRequest);
    firstMutation.id += 1;
    firstRequest.id += 1;
    final.first.requestId += 1;
    final.requests.splice(3, 0, {
      finished: true,
      hash: "",
      id: 4,
      method: "GET",
      origin: final.identity.appOrigin,
      pathname: "/api/safe-health-probe",
      requestBodySha256: null,
      responseSha256: "a".repeat(64),
      search: "",
      status: 304,
      url: `${final.identity.appOrigin}/api/safe-health-probe`,
    });
    repinDurabilitySeal(final);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.doesNotReject(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
    );
  });

  await t.test("unlisted unsafe POST", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    final.requests.push({
      finished: true,
      hash: "",
      id: final.requests.length + 1,
      method: "POST",
      origin: final.identity.appOrigin,
      pathname: "/api/unlisted-mutation",
      requestBodySha256: "b".repeat(64),
      responseSha256: "c".repeat(64),
      search: "",
      status: 200,
      url: `${final.identity.appOrigin}/api/unlisted-mutation`,
    });
    repinDurabilitySeal(final);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /non-safe request.*mutation projection/u,
    );
  });

  await t.test("listed mutation status remains exact 200", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    const firstMutation = final.mutations.find(({ authorizedPhase }) =>
      authorizedPhase === "first-control"
    );
    assert.ok(firstMutation);
    const firstRequest = final.requests.find(({ id }) => id === firstMutation.id);
    assert.ok(firstRequest);
    firstMutation.status = 204;
    firstRequest.status = 204;
    repinDurabilitySeal(final);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
      /request ledger has a duplicate or invalid id/u,
    );
  });
});

test("mutation 113 binds analytics handshake and page-view to one generation", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const final = payload.durabilityReceipts.final;
  const pageView = final.mutations.find((mutation) =>
    mutation.pathname === "/api/learning-events" &&
    Array.isArray(mutation.requestBody?.events) &&
    mutation.requestBody.events.length === 1
  );
  assert.ok(pageView);
  pageView.requestBody.generation = 2;
  const pageViewResponse = JSON.parse(pageView.responseBytes);
  pageViewResponse.generation = 2;
  pageView.requestBytes = JSON.stringify(pageView.requestBody);
  pageView.responseBytes = JSON.stringify(pageViewResponse);
  pageView.requestBodySha256 = createHash("sha256").update(pageView.requestBytes).digest("hex");
  pageView.responseSha256 = createHash("sha256").update(pageView.responseBytes).digest("hex");
  const request = final.requests.find(({ id }) => id === pageView.id);
  assert.ok(request);
  request.requestBodySha256 = pageView.requestBodySha256;
  request.responseSha256 = pageView.responseSha256;
  const { authorizedPhase: _phase, ...acknowledgement } = pageView;
  payload.durabilityReceipts.mount.acknowledgements.lessonPageView = acknowledgement;
  final.mount = structuredClone(payload.durabilityReceipts.mount);
  repinDurabilitySeal(final);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /handshake and page-view generations differ/u,
  );
});

test("producer contract 114 validates protocol storage, storage events, and seal retry evidence", async (t) => {
  await t.test("five production protocol entries", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    final.storage = protocolControlStorageReceipt(payload.userId);
    repinDurabilitySeal(final);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.doesNotReject(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
    );
  });

  await t.test("external set-remove retry seals as canonical :2", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    const key = `mais:learning-analytics-generation:v1:${encodeURIComponent(payload.userId)}`;
    const value = JSON.stringify(9);
    final.storageEvents = [
      {
        key,
        newValue: value,
        oldValue: null,
        sequence: 1,
        url: `${final.identity.appOrigin}/external-storage-writer`,
      },
      {
        key,
        newValue: null,
        oldValue: value,
        sequence: 2,
        url: `${final.identity.appOrigin}/external-storage-writer`,
      },
    ];
    repinDurabilitySeal(final, {
      sealId: `${final.controlObserverStop.adapterId}:2`,
    });
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.doesNotReject(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
    );
  });

  await t.test("zero and zero-padded seal suffixes are noncanonical", async () => {
    for (const suffix of ["0", "00"]) {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      repinDurabilitySeal(final, {
        sealId: `${final.controlObserverStop.adapterId}:${suffix}`,
      });
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport,
          reportPath,
          activeContract,
          validationOptions(),
        ),
        /final network seal is malformed or not recomputed/u,
      );
    }
  });

  await t.test("v2 pre-revision transition normalizes to collecting recovery", async () => {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const final = payload.durabilityReceipts.final;
    final.storage = protocolControlStorageReceipt(payload.userId, (entries) => {
      const transition = entries.find(({ family }) =>
        family === "analytics-generation-transition"
      );
      assert.ok(transition);
      transition.parsed.preserveUnconfirmedStorageKeys = ["legacy-event-id"];
      transition.parsed.phase = "legacy-phase";
      transition.parsed.completionClaims = "legacy-claims";
    });
    repinDurabilitySeal(final);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.doesNotReject(
      validateMainlandFocusedVisualizationReport(
        activeReport, reportPath, activeContract, validationOptions(),
      ),
    );
  });

  for (const kind of ["exact-arrays-stale", "non-v2-recovery", "common-field-poison"]) {
    await t.test(`transition recovery rejects ${kind}`, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      final.storage = protocolControlStorageReceipt(payload.userId, (entries) => {
        const transition = entries.find(({ family }) =>
          family === "analytics-generation-transition"
        );
        assert.ok(transition);
        transition.parsed.phase = "legacy-phase";
        transition.parsed.completionClaims = "legacy-claims";
        if (kind !== "exact-arrays-stale") {
          transition.parsed.preserveUnconfirmedStorageKeys = ["legacy-event-id"];
        }
        if (kind === "non-v2-recovery") transition.parsed.version = 3;
        if (kind === "common-field-poison") transition.parsed.fromGeneration = -1;
      });
      repinDurabilitySeal(final);
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /protocol storage schema/u,
      );
    });
  }

  for (const kind of [
    "generation", "clear-fence", "clear-corrupt-alias", "handshake", "transition",
    "boundary-lineage",
  ]) {
    await t.test(`self-consistent invalid ${kind} schema`, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      final.storage = protocolControlStorageReceipt(payload.userId, (entries) => {
        if (kind === "generation") {
          const generation = entries.find(({ family }) => family === "analytics-generation");
          assert.ok(generation);
          generation.parsed = -1;
        } else if (kind === "clear-fence" || kind === "clear-corrupt-alias") {
          const fence = entries.find(({ family }) => family === "analytics-clear-fence");
          assert.ok(fence);
          if (kind === "clear-fence") fence.parsed.userId = "foreign-user";
          else {
            fence.parsed.clearedStorageKeys = [
              `mais:learning-analytics-corrupt-outbox:v1:${encodeURIComponent(payload.userId)}:forged:row`,
            ];
          }
        } else if (kind === "handshake") {
          const handshake = entries.find(({ family }) =>
            family === "analytics-generation-handshake"
          );
          assert.ok(handshake);
          handshake.parsed.existingUnconfirmedEventIds = ["duplicate", "duplicate"];
        } else if (kind === "transition") {
          const transition = entries.find(({ family }) =>
            family === "analytics-generation-transition"
          );
          assert.ok(transition);
          transition.parsed.toGeneration = transition.parsed.fromGeneration;
        } else {
          const lineage = entries.find(({ family }) =>
            family === "analytics-boundary-lineage"
          );
          assert.ok(lineage);
          lineage.parsed.preservedBoundaryTokens = ["duplicate", "duplicate"];
        }
      });
      repinDurabilitySeal(final);
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /protocol storage schema/u,
      );
    });
  }
});

test("mutation 115 rejects API and profile receipts outside the Playwright result interval", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const targetSpec = activeReport.suites[0].specs.find((spec) =>
    spec.tests[0].projectName === "mobile-chrome"
  );
  assert.ok(targetSpec);
  const result = targetSpec.tests[0].results[0];
  const attachment = result.attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const final = payload.durabilityReceipts.final;
  const shiftOneDay = (value) => new Date(Date.parse(value) + 86_400_000).toISOString();
  const profileResponse = JSON.parse(final.apiRequests[0].responseBytes);
  profileResponse.learnerProfile.skippedAt = shiftOneDay(
    profileResponse.learnerProfile.skippedAt,
  );
  profileResponse.learnerProfile.updatedAt = profileResponse.learnerProfile.skippedAt;
  const profileResponseBytes = JSON.stringify(profileResponse);
  for (const request of final.apiRequests) {
    request.startedAt = shiftOneDay(request.startedAt);
    request.completedAt = shiftOneDay(request.completedAt);
  }
  final.apiRequests[0].responseBytes = profileResponseBytes;
  final.apiRequests[0].responseSha256 = createHash("sha256")
    .update(profileResponseBytes)
    .digest("hex");
  const profile = final.learnerProfileSetup;
  profile.request = structuredClone(final.apiRequests[0]);
  profile.startedAt = profile.request.startedAt;
  profile.completedAt = profile.request.completedAt;
  profile.skippedAt = profileResponse.learnerProfile.skippedAt;
  profile.responseBytes = profileResponseBytes;
  profile.responseSha256 = profile.request.responseSha256;
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /outside Playwright result interval/u,
  );
});

test("mutation 121 rejects forged page-view identity or browser phase chronology", async (t) => {
  for (const kind of ["identity", "chronology"]) {
    await t.test(kind, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G06");
      const targetSpec = activeReport.suites[0].specs.find((spec) =>
        spec.tests[0].projectName === "mobile-chrome"
      );
      assert.ok(targetSpec);
      const attachment = targetSpec.tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      const pageView = final.mutations.find((mutation) =>
        mutation.pathname === "/api/learning-events" &&
        mutation.requestBody?.events?.[0]?.type === "page-view"
      );
      assert.ok(pageView);
      const timestamp = kind === "chronology"
        ? "2026-08-11T00:00:00.251Z"
        : pageView.requestBody.events[0].timestamp;
      const eventId = kind === "identity"
        ? "static-page-view"
        : `${timestamp}-abcdefgh`;
      pageView.requestBody.events[0].timestamp = timestamp;
      pageView.requestBody.events[0].id = eventId;
      const response = JSON.parse(pageView.responseBytes);
      response.acknowledgedEventIds = [eventId];
      response.dispositions = [{ disposition: "inserted", id: eventId }];
      pageView.requestBytes = JSON.stringify(pageView.requestBody);
      pageView.responseBytes = JSON.stringify(response);
      pageView.requestBodySha256 = createHash("sha256").update(pageView.requestBytes).digest("hex");
      pageView.responseSha256 = createHash("sha256").update(pageView.responseBytes).digest("hex");
      const request = final.requests.find(({ id }) => id === pageView.id);
      assert.ok(request);
      request.requestBodySha256 = pageView.requestBodySha256;
      request.responseSha256 = pageView.responseSha256;
      const { authorizedPhase: _phase, ...acknowledgement } = pageView;
      payload.durabilityReceipts.mount.acknowledgements.lessonPageView = acknowledgement;
      final.mount = structuredClone(payload.durabilityReceipts.mount);
      repinDurabilitySeal(final);
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /page-view event identity|browser phase chronology/u,
      );
    });
  }
});

test("mutation 116 rejects non-SHA interaction browser digests", async (t) => {
  for (const target of ["first", "second"]) {
    await t.test(target, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G04");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      payload.durabilityReceipts.final[target].browserDigest = target === "first"
        ? "not-a-sha"
        : null;
      if (target === "first") {
        payload.durabilityReceipts.controlEvidence.first = {
          controlEvents: payload.durabilityReceipts.final.first.controlEvents,
          expectedControl: payload.durabilityReceipts.final.first.expectedControl,
        };
      }
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /interaction browser digest/u,
      );
    });
  }
});

test("mutation 117 binds mounted controls to both interaction keys", async (t) => {
  for (const kind of ["hollow", "missing-first", "missing-reset"]) {
    await t.test(kind, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G04");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const final = payload.durabilityReceipts.final;
      const mount = payload.durabilityReceipts.mount;
      if (kind === "hollow") {
        mount.root.controls = [];
      } else {
        const rejectedKey = kind === "missing-first"
          ? final.first.expectedControl.controlKey
          : final.second.expectedControl.controlKey;
        mount.root.controls = mount.root.controls.filter(({ key }) => key !== rejectedKey);
      }
      mount.root.count = 1;
      final.mount = structuredClone(mount);
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /mount root control ledger is empty|mounted controls do not contain both exact interaction keys/u,
      );
    });
  }
});

test("mutation 110 rejects forged G03 durability probe action evidence", async (t) => {
  for (const kind of [
    "first-mode",
    "second-topic",
    "projections",
    "signature-controls",
    "signature-invariants",
    "before-action-receipt",
    "requested-drift",
    "coherent-transition",
  ]) {
    await t.test(kind, async () => {
      const { activeContract, activeReport } = focusedGroupFixture("G03");
      const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      const probe = payload.durabilityReceipts.probe;
      const firstAction = probe.firstAction;
      const secondAction = probe.secondAction;
      if (kind === "first-mode") {
        firstAction.observedSignature.mode = "locate";
        firstAction.expectedSignature.mode = "locate";
      } else if (kind === "second-topic") {
        secondAction.receipt.request = { kind: "reset", topicId: "forged-topic" };
        secondAction.plannedRequest = structuredClone(secondAction.receipt.request);
        secondAction.receipt.requested.pendingRequest = structuredClone(
          secondAction.receipt.request,
        );
      } else if (kind === "projections") {
        const projection = {
          affectedControl: "right-rational-numerator",
          expectedValue: 9,
          previousValue: 1,
          projection: "forged-projection",
          reason: "forged",
        };
        firstAction.projections = [projection];
        firstAction.receipt.projections = [structuredClone(projection)];
        synchronizeG03SignatureActionReceipt(firstAction);
      } else if (kind === "signature-controls") {
        firstAction.expectedSignature.controls = [];
        firstAction.observedSignature.controls = [];
        secondAction.beforeSignature = structuredClone(firstAction.observedSignature);
      } else if (kind === "signature-invariants") {
        const forged = ["forged-invariant|pass|forged|forged"];
        secondAction.expectedSignature.invariantStates = forged;
        secondAction.observedSignature.invariantStates = structuredClone(forged);
      } else if (kind === "before-action-receipt") {
        firstAction.beforeSignature.actionReceipt = "{}";
      } else if (kind === "requested-drift") {
        firstAction.receipt.requested = {
          ...structuredClone(firstAction.receipt.expected),
          pendingRequest: structuredClone(firstAction.receipt.request),
        };
        synchronizeG03SignatureActionReceipt(firstAction);
        secondAction.beforeSignature = structuredClone(
          firstAction.observedSignature,
        );
      } else {
        const configuredState = firstAction.receipt.expected.configuredState.replace(
          "compare=r:1/1",
          "compare=r:2/1",
        );
        const forgedSnapshot = structuredClone(firstAction.receipt.expected);
        forgedSnapshot.configuredState = configuredState;
        forgedSnapshot.input.right.numerator = 2;
        forgedSnapshot.controlState.rightRationalNumerator = 2;
        firstAction.receipt.expected = structuredClone(forgedSnapshot);
        firstAction.receipt.observed = structuredClone(forgedSnapshot);
        const geometry = g03FixtureGeometry({
          compare: "r:2/1",
          point: "r:-3/2",
          precision: 3,
          start: "-",
        });
        const forgedSignature = structuredClone(firstAction.expectedSignature);
        forgedSignature.controls.find(({ parameter }) =>
          parameter === "right-rational-numerator"
        ).value = "2";
        forgedSignature.geometryOwners = geometry.geometry.map((point) => ({
          exactKey: point.exactKey,
          ownerId: point.owner,
          renderMarker: point.marker,
          semanticId: point.semanticId,
        }));
        forgedSignature.geometryState = geometry.geometryState;
        forgedSignature.invariantStates = g03ProductionInvariantStates(
          configuredState,
          forgedSnapshot.input,
        );
        forgedSignature.semanticState = configuredState;
        forgedSignature.state = configuredState;
        firstAction.expectedSignature = structuredClone(forgedSignature);
        firstAction.observedSignature = structuredClone(forgedSignature);
        synchronizeG03SignatureActionReceipt(firstAction);
        secondAction.receipt.before = structuredClone(forgedSnapshot);
        secondAction.receipt.requested = {
          ...structuredClone(forgedSnapshot),
          pendingRequest: structuredClone(secondAction.receipt.request),
        };
        secondAction.beforeSignature = structuredClone(firstAction.observedSignature);
        synchronizeG03SignatureActionReceipt(secondAction);
      }
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport, reportPath, activeContract, validationOptions(),
        ),
        /durabilityReceipts\.probe\.(?:firstAction|secondAction)|G03 durability probe action|signature|projection/u,
      );
    });
  }
});

test("mutation 118 rejects forged ordinary G03 action signatures", async (t) => {
  for (const kind of ["action-receipt", "controls", "invariant-ledger"]) {
    await t.test(kind, async () => {
      const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
      const entries = focusedPayloadEntries(fixture.activeReport);
      const receipt = entries[0].payload.receipts[0];
      const signatures = [
        receipt.action.beforeSignature,
        receipt.action.expectedSignature,
        receipt.action.observedSignature,
      ];
      if (kind === "action-receipt") {
        for (const signature of signatures) signature.actionReceipt = "{}";
      } else if (kind === "controls") {
        for (const signature of signatures) {
          signature.controls[0].value = "999";
        }
        receipt.controls[0].value = "999";
      } else {
        for (const signature of signatures) {
          signature.invariantStates[0] =
            "rational-point|pass|forged-expected|forged-observed";
        }
      }
      writeFocusedPayloadEntries(entries);
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          fixture.activeReport,
          reportPath,
          fixture.activeContract,
          validationOptions(),
        ),
        /G03.*(?:actionReceipt|controls reconstructed|invariantStates|signature)/su,
      );
    });
  }
});

test("mutation 120 rejects an unrelated ordinary G03 mode-transition state change", async (t) => {
  for (const projectionKind of ["empty", "forged-nonempty"]) {
    await t.test(projectionKind, async () => {
      const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
      const beforeFixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[0]);
      const entries = focusedPayloadEntries(fixture.activeReport);
      const beforeEntries = focusedPayloadEntries(beforeFixture.activeReport);
      for (const [entryIndex, entry] of entries.entries()) {
        const receipt = entry.payload.receipts[0];
        const beforeReceipt = beforeEntries[entryIndex].payload.receipts[0];
        const request = { controller: "mode", kind: "controller", value: "compare" };
        const snapshot = structuredClone(receipt.action.receipt.expected);
        snapshot.input.right.numerator = 2;
        snapshot.controlState.rightRationalNumerator = 2;
        snapshot.configuredState = snapshot.configuredState.replace(
          "compare=r:1/1",
          "compare=r:2/1",
        );
        const geometry = g03FixtureGeometry({
          compare: "r:2/1",
          point: "r:-3/2",
          precision: 3,
          start: "-",
        });
        const signature = structuredClone(receipt.action.expectedSignature);
        signature.controls.find(({ parameter }) =>
          parameter === "right-rational-numerator"
        ).value = "2";
        signature.geometryOwners = geometry.geometry.map((point) => ({
          exactKey: point.exactKey,
          ownerId: point.owner,
          renderMarker: point.marker,
          semanticId: point.semanticId,
        }));
        signature.geometryState = geometry.geometryState;
        signature.invariantStates = g03ProductionInvariantStates(
          snapshot.configuredState,
          snapshot.input,
        );
        signature.semanticState = snapshot.configuredState;
        signature.state = snapshot.configuredState;
        const projections = projectionKind === "empty" ? [] : [{
          affectedControl: "number-kind",
          expectedValue: "rational",
          previousValue: "rational",
          projection: "mode-number-kind",
          reason: "mode-requires-number-kind",
        }];
        const product = receipt.action.receipt;
        product.before = structuredClone(beforeReceipt.action.receipt.expected);
        product.request = request;
        product.requested = {
          ...structuredClone(product.before),
          pendingRequest: structuredClone(request),
        };
        product.expected = structuredClone(snapshot);
        product.observed = structuredClone(snapshot);
        product.projections = structuredClone(projections);
        receipt.action.beforeSignature = structuredClone(
          beforeReceipt.action.expectedSignature,
        );
        receipt.action.expectedSignature = structuredClone(signature);
        receipt.action.observedSignature = structuredClone(signature);
        receipt.action.plannedRequest = structuredClone(request);
        receipt.action.projections = structuredClone(projections);
        synchronizeG03SignatureActionReceipt(receipt.action);
        receipt.configuredState = snapshot.configuredState;
        receipt.controls = structuredClone(signature.controls);
        receipt.geometry = structuredClone(geometry.geometry);
      }
      repinFocusedDescriptors(fixture.activeContract, entries, "G03");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          fixture.activeReport,
          reportPath,
          fixture.activeContract,
          validationOptions(),
        ),
        /ordinary (?:accepted mode transition|action oracle).*(?:exact|expected snapshot)/u,
      );
    });
  }
});

test("mutation 123 rejects ordinary G03 oracle bypasses", async (t) => {
  await t.test("noncanonical initial state", async () => {
    const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
    const entries = focusedPayloadEntries(fixture.activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        const request = { kind: "initial", topicId: g03RationalLab };
        receipt.action.receipt.request = structuredClone(request);
        receipt.action.receipt.requested.pendingRequest = structuredClone(request);
        receipt.action.plannedRequest = structuredClone(request);
        synchronizeG03SignatureActionReceipt(receipt.action);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G03.*(?:initial|action oracle|canonical)/su,
    );
  });

  await t.test("direct control changes an unrelated state leaf", async () => {
    const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
    const beforeFixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
    const entries = focusedPayloadEntries(fixture.activeReport);
    const beforeEntries = focusedPayloadEntries(beforeFixture.activeReport);
    for (const [entryIndex, entry] of entries.entries()) {
      const receipt = entry.payload.receipts[0];
      const beforeReceipt = beforeEntries[entryIndex].payload.receipts[0];
      const request = {
        control: "precision",
        kind: "control",
        value: 3,
      };
      const snapshot = structuredClone(receipt.action.receipt.expected);
      snapshot.input.left.numerator = -5;
      snapshot.configuredState = snapshot.configuredState.replace(
        "point=r:-3/2",
        "point=r:-5/2",
      );
      const geometry = g03FixtureGeometry({
        compare: "r:1/1",
        point: "r:-5/2",
        precision: 3,
        start: "-",
      });
      const signature = structuredClone(receipt.action.expectedSignature);
      signature.controls.find(({ parameter }) => parameter === "left-numerator").value = "-5";
      signature.geometryOwners = geometry.geometry.map((point) => ({
        exactKey: point.exactKey,
        ownerId: point.owner,
        renderMarker: point.marker,
        semanticId: point.semanticId,
      }));
      signature.geometryState = geometry.geometryState;
      signature.invariantStates = g03ProductionInvariantStates(
        snapshot.configuredState,
        snapshot.input,
      );
      signature.semanticState = snapshot.configuredState;
      signature.state = snapshot.configuredState;
      const product = receipt.action.receipt;
      product.before = structuredClone(beforeReceipt.action.receipt.expected);
      product.request = structuredClone(request);
      product.requested = {
        ...structuredClone(product.before),
        pendingRequest: structuredClone(request),
      };
      product.expected = structuredClone(snapshot);
      product.observed = structuredClone(snapshot);
      product.projections = [];
      receipt.action.beforeSignature = structuredClone(
        beforeReceipt.action.expectedSignature,
      );
      receipt.action.expectedSignature = structuredClone(signature);
      receipt.action.observedSignature = structuredClone(signature);
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.projections = [];
      synchronizeG03SignatureActionReceipt(receipt.action);
      receipt.configuredState = snapshot.configuredState;
      receipt.controls = structuredClone(signature.controls);
      receipt.geometry = structuredClone(geometry.geometry);
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G03.*(?:ordinary action oracle|direct control|expected snapshot)/su,
    );
  });

  await t.test("requested snapshot drifts from before state", async () => {
    const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
    const driftFixture = producerShapedG03ModeFixture({
      compare: "r:1/1",
      input: {
        ...structuredClone(producerShapedG03ModeCases[1].input),
        left: g03Rational(-5, 2),
      },
      point: "r:-5/2",
    });
    const entries = focusedPayloadEntries(fixture.activeReport);
    const driftEntries = focusedPayloadEntries(driftFixture.activeReport);
    for (const [entryIndex, entry] of entries.entries()) {
      for (const [receiptIndex, receipt] of entry.payload.receipts.entries()) {
        const requested = structuredClone(
          driftEntries[entryIndex].payload.receipts[receiptIndex].action.receipt.expected,
        );
        requested.pendingRequest = structuredClone(receipt.action.receipt.request);
        receipt.action.receipt.requested = requested;
        synchronizeG03SignatureActionReceipt(receipt.action);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G03.*requested snapshot before state/su,
    );
  });

  await t.test("valid precision request forged as rejected", async () => {
    const fixture = producerShapedG03ModeFixture(producerShapedG03ModeCases[1]);
    const entries = focusedPayloadEntries(fixture.activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        receipt.action.receipt.status = "rejected";
        receipt.action.receipt.rejection = "DIRECT_REQUEST_VIOLATES_DOMAIN";
        receipt.action.receipt.expected = structuredClone(
          receipt.action.receipt.before,
        );
        receipt.action.receipt.observed = structuredClone(
          receipt.action.receipt.before,
        );
        synchronizeG03SignatureActionReceipt(receipt.action);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G03.*(?:ordinary action oracle|rejection|status)/su,
    );
  });
});

test("mutation 111 rejects a coherently forged learner profile wire receipt", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const attachment = activeReport.suites[0].specs[0].tests[0].results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const profile = payload.durabilityReceipts.final.learnerProfileSetup;
  const forgedBody = {
    answers: { challenge: "forged", goal: "repair", help: "hint" },
    status: "skipped",
  };
  profile.request.requestBytes = JSON.stringify(forgedBody);
  profile.request.requestBodySha256 = createHash("sha256")
    .update(profile.request.requestBytes).digest("hex");
  profile.requestBodySha256 = profile.request.requestBodySha256;
  payload.durabilityReceipts.final.apiRequests[0] = structuredClone(profile.request);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport, reportPath, activeContract, validationOptions(),
    ),
    /learner profile.*wire|learner profile setup/u,
  );
});

test("accepts Playwright 1.59 reporter-relative suite files with absent spec.file", async () => {
  const realShape = report();
  const nestedSpecs = realShape.suites[0].specs;
  realShape.suites[0].file = "focused-a.spec.ts";
  realShape.suites[0].specs = [];
  realShape.suites[0].suites = [{
    file: "focused-a.spec.ts",
    specs: nestedSpecs,
    suites: [],
    title: "focused-a.spec.ts",
  }];
  for (const spec of nestedSpecs) delete spec.file;
  const summary = await validateMainlandFocusedVisualizationReport(
    realShape,
    reportPath,
    contract,
    validationOptions(),
  );
  assert.equal(summary.executionCount, 2);
  assert.equal(summary.stateReceiptCount, 4);
});

test("rejects a single-project partial run even when its own attachment claims canonical execution", async () => {
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report({ projects: ["desktop-chrome"] }), reportPath, contract, validationOptions(),
    ),
    /expected 2 canonical executions, found 1|mobile-chrome chunk order\/set mismatch/u,
  );
});

test("rejects a retry, annotation, and duplicate or stale receipt identity", async () => {
  const broken = report({
    evidenceOverrides: {
      "desktop-chrome": {
        plannedStateIds: [stateIds[0], stateIds[0]],
        receipts: [{ stateId: stateIds[0] }, { stateId: "stale-state" }],
      },
    },
    resultOverrides: {
      "desktop-chrome": { annotations: [{ type: "slow" }], retry: 1 },
    },
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(broken, reportPath, contract, validationOptions()),
    /retry=1[\s\S]*result annotations or errors[\s\S]*duplicate planned state IDs[\s\S]*receipt state IDs/u,
  );
});

test("rejects self-reported plan drift by independently hashing the attachment state IDs", async () => {
  const broken = report({
    evidenceOverrides: {
      "mobile-chrome": {
        plannedStateIds: [stateIds[0], "lab-a:corrupted"],
        receipts: [{ stateId: stateIds[0] }, { stateId: "lab-a:corrupted" }],
      },
    },
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(broken, reportPath, contract, validationOptions()),
    /independently recomputed state-plan SHA mismatch[\s\S]*state plan differs between/u,
  );
});

test("rejects report and evidence paths outside Starship", async () => {
  const broken = report({
    evidenceOverrides: {
      "desktop-chrome": { starshipPaths: { output: "/tmp/results" } },
    },
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken, "/tmp/report.json", contract, validationOptions(),
    ),
    /report path must resolve under \/Volumes\/Starship[\s\S]*(relative path evidence|escaped Starship)/u,
  );
});

test("rejects global report errors, corrupt stats, and noncanonical config", async () => {
  const broken = report();
  broken.errors = [{ message: "global teardown failed" }];
  broken.stats = { expected: 0, flaky: 7, skipped: 8, unexpected: 9 };
  broken.config = {
    projects: [{
      name: "desktop-chrome",
      outputDir: "/tmp/results",
      repeatEach: 2,
      retries: 7,
      testDir: "/tmp/tests",
    }],
    rootDir: "/tmp",
    workers: 999,
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken, reportPath, contract, validationOptions(),
    ),
    /top-level errors[\s\S]*stats.expected[\s\S]*stats.skipped[\s\S]*stats.unexpected[\s\S]*stats.flaky[\s\S]*config.workers[\s\S]*project set[\s\S]*escaped Starship/u,
  );
});

test("rejects failed or incomplete terminal browser path receipts", async () => {
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProcessEvidencePath]: JSON.stringify({
          minimumDistinctProfiles: 2,
          observations: [],
          schemaVersion: 1,
          status: "failed",
          violation: "profile escaped Starship",
        }),
      }),
    ),
    /browser process receipt[\s\S]*(terminal pass|key mismatch)|distinct actual Chrome profiles/u,
  );
});

test("rejects hollow passing browser-process and browser-profile receipts", async () => {
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProcessEvidencePath]: JSON.stringify({
          minimumDistinctProfiles: 2,
          observations: [
            { userDataDir: `${pathManifest.paths.browserTempDir}/fake-a` },
            { userDataDir: `${pathManifest.paths.browserTempDir}/fake-b` },
          ],
          processMutablePathAudit: [],
          schemaVersion: 1,
          status: "passed",
        }),
      }),
    ),
    /browser process receipt (?:is not a terminal pass|key mismatch)|lacks its exact user-data-dir audit/u,
  );

  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProfileEvidencePath]: JSON.stringify({
          browserVersion: "151.0.0.0",
          channel: "chrome",
          observed: {
            userDataDir: `${pathManifest.paths.browserTempDir}/profile-a`,
          },
          pathManifestPath,
          projectFixtureInheritance: contract.projects.map((projectName) => ({ projectName })),
          schemaVersion: 1,
          status: "passed",
        }),
      }),
    ),
    /browser profile receipt (?:is not a canonical terminal Chrome pass|key mismatch)/u,
  );
});

test("rejects relative manifest paths and a report path binding mismatch", async () => {
  const relativePathManifest = {
    ...pathManifest,
    externalEvidencePaths: {
      PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
      jsonReportPath: reportPath,
    },
    paths: { ...pathManifest.paths, outputDir: "relative-results" },
    process: { cwd: repositoryRoot, pid: 31_001, ppid: 31_000 },
    status: "preflight-passed",
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [pathManifestPath]: JSON.stringify(relativePathManifest),
      }),
    ),
    /terminal Starship receipt validation failed/u,
  );

  const mismatchedReportManifest = {
    ...pathManifest,
    externalEvidencePaths: {
      PLAYWRIGHT_JSON_OUTPUT_FILE: `${pathManifest.paths.e2eRunRoot}/different-report.json`,
      jsonReportPath: `${pathManifest.paths.e2eRunRoot}/different-report.json`,
    },
    process: { cwd: repositoryRoot, pid: 31_001, ppid: 31_000 },
    status: "preflight-passed",
  };
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [pathManifestPath]: JSON.stringify(mismatchedReportManifest),
      }),
    ),
    /does not bind the canonical JSON report/u,
  );
});

test("rejects ambiguous attachments, relative path evidence, and cross-run attachment files", async () => {
  const ambiguous = report();
  ambiguous.suites[0].specs[0].tests[0].results[0].attachments[0].path =
    "/var/folders/escaped-evidence.json";
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      ambiguous,
      reportPath,
      contract,
      validationOptions(),
    ),
    /attachment[\s\S]*(ambiguous|escaped|path)/u,
  );

  const relativeEvidence = report({
    evidenceOverrides: {
      "desktop-chrome": {
        starshipPaths: {
          output: pathManifest.paths.outputDir,
          pathManifestPath,
          relativeLeak: "../../../../var/folders/escaped",
        },
      },
    },
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      relativeEvidence,
      reportPath,
      contract,
      validationOptions(),
    ),
    /relative path evidence|relativeLeak|escaped Starship/u,
  );

  const externalAttachmentPath =
    "/Volumes/Starship/another-run/test-results/stale-evidence.json";
  const crossRun = report();
  const attachment =
    crossRun.suites[0].specs[0].tests[0].results[0].attachments[0];
  const decodedBody = Buffer.from(attachment.body, "base64").toString("utf8");
  delete attachment.body;
  attachment.path = externalAttachmentPath;
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      crossRun,
      reportPath,
      contract,
      validationOptions({ [externalAttachmentPath]: decodedBody }),
    ),
    /attachment path[\s\S]*(output|run root|escaped)/u,
  );
});

test("binds browser-profile identity to the process-observed profile set", async () => {
  const profileC = `${pathManifest.paths.browserTempDir}/profile-c`;
  const mismatchedProfile = JSON.parse(
    artifactMap().get(browserProfileEvidencePath),
  );
  mismatchedProfile.observed.userDataDir = profileC;
  mismatchedProfile.observed.mutablePaths = [
    { flag: "crash-dumps-dir", path: pathManifest.paths.crashDumpDir },
    { flag: "user-data-dir", path: profileC },
  ];
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProfileEvidencePath]: JSON.stringify(mismatchedProfile),
      }),
    ),
    /browser profile[\s\S]*process-observed profile/u,
  );
});

test("rejects malformed suite, spec, test, result, and attachment nodes", async () => {
  const malformed = report();
  malformed.suites.push(null);
  malformed.suites[0].specs.push(null);
  malformed.suites[0].specs[0].tests.push(null);
  malformed.suites[0].specs[0].tests[0].results.push(null);
  malformed.suites[0].specs[1].tests[0].results[0].attachments.push(null);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      malformed,
      reportPath,
      contract,
      validationOptions(),
    ),
    /malformed (suite|spec|test|result|attachment)/u,
  );
});

test("mutation 1 rejects non-success node identities, non-arrays, result.error, and invalid timing", async () => {
  const broken = report();
  const spec = broken.suites[0].specs[0];
  const testNode = spec.tests[0];
  const result = testNode.results[0];
  spec.ok = false;
  testNode.annotations = {};
  testNode.projectId = "stale-project-id";
  testNode.timeout = "60000";
  result.annotations = {};
  result.duration = -1;
  result.error = { message: "hidden singular error" };
  result.errors = {};
  result.startTime = "not-an-iso-timestamp";
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /spec\.ok|projectId|annotations|result\.error|duration|startTime|timing/u,
  );
});

test("mutation 2 rejects any attachment collection that is not exactly the canonical JSON receipt", async () => {
  const broken = report();
  broken.suites[0].specs[0].tests[0].results[0].attachments.push({
    body: Buffer.from("diagnostic").toString("base64"),
    contentType: "text/plain",
    name: "extra-diagnostic.txt",
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /exactly one attachment|attachment collection/u,
  );
});

test("mutation 3 rejects noncanonical base64 and an oversized inline JSON receipt", async () => {
  const noncanonical = report();
  noncanonical.suites[0].specs[0].tests[0].results[0].attachments[0].body += "\n";
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      noncanonical,
      reportPath,
      contract,
      validationOptions(),
    ),
    /canonical base64/u,
  );

  const oversized = report();
  const attachment = oversized.suites[0].specs[0].tests[0].results[0].attachments[0];
  const decoded = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  decoded.padding = "x".repeat(16 * 1024 * 1024 + 1);
  attachment.body = Buffer.from(JSON.stringify(decoded)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      oversized,
      reportPath,
      contract,
      validationOptions(),
    ),
    /attachment body exceeds|size cap/u,
  );
});

test("mutation 4 binds configFile, globalSetup, rootDir, and report path to the manifest repository", async () => {
  const broken = report();
  broken.config.configFile = `${repositoryRoot}/playwright.other.ts`;
  broken.config.globalSetup = `${repositoryRoot}/tests/e2e/other-global-setup.ts`;
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /configFile|globalSetup|canonical Playwright config/u,
  );
});

test("mutation 5 rejects noncanonical config execution identity and malformed aggregate timing", async () => {
  const broken = report();
  broken.config.forbidOnly = true;
  broken.config.fullyParallel = true;
  broken.config.maxFailures = 1;
  broken.config.projects[0].id = "stale-project-id";
  broken.config.projects[0].timeout = 0;
  broken.config.reporter = [["json"]];
  broken.stats.duration = -1;
  broken.stats.startTime = "not-an-iso-timestamp";
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /forbidOnly|fullyParallel|maxFailures|project id|reporter|stats.*(duration|startTime)/u,
  );
});

test("mutation 6 rejects Starship path receipts whose known keys drift from the current run manifest", async () => {
  const broken = report({
    evidenceOverrides: {
      "desktop-chrome": {
        starshipPaths: {
          outputDir: "/Volumes/Starship/another-run/test-results/stale-test-output",
          pathManifestPath,
        },
      },
    },
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /path receipt|outputDir.*manifest|current run/u,
  );
});

test("mutation 7 rejects duplicate browser pids and profile process-count identity drift", async () => {
  const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
  processReceipt.observations[1].browserPid = processReceipt.observations[0].browserPid;
  processReceipt.observations[1].mutablePaths[0].pid = processReceipt.observations[0].browserPid;
  processReceipt.processMutablePathAudit[1].pid = processReceipt.observations[0].browserPid;
  const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
  profileReceipt.observed.processCount = 99;
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProcessEvidencePath]: JSON.stringify(processReceipt),
        [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
      }),
    ),
    /duplicate browser pid|processCount|process-count/u,
  );
});

test("mutation 8 rejects every off-Starship mutable browser launch argument", async () => {
  const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
  profileReceipt.projectFixtureInheritance[0].launchArgs.push(
    "--disk-cache-dir=/var/folders/escaped-browser-cache",
  );
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
      }),
    ),
    /disk-cache-dir|mutable launch argument|escaped Starship/u,
  );
});

test("mutation 9 rejects hollow state receipts that contain only self-reported state IDs", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const positive = await validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    );
    assert.equal(positive.stateReceiptCount, 4);

    const desktopAttachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(
      Buffer.from(desktopAttachment.body, "base64").toString("utf8"),
    );
    payload.receipts = stateIds.map((stateId) => ({ stateId }));
    desktopAttachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*(hollow state receipt|required positive evidence|collision|controls)`, "su"),
    );
  }
});

test("mutation 10 rejects semantically failed G03-G06 state receipts", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const mutations = [
      (_payload, receipt) => { receipt.action.status = "failed"; },
      (_payload, receipt) => { receipt.controls[0].disabled = true; },
      (_payload, receipt) => { receipt.controls[0].parameter = ""; },
      (_payload, receipt) => { receipt.controls.push({ ...receipt.controls[0] }); },
      (_payload, receipt) => { receipt.collision.totalCandidatePairCount += 1; },
    ];
    if (groupId === "G03") {
      mutations.push(
        (payload) => { payload.controlDomainVersion = "stale-control-domain"; },
        (_payload, receipt) => { receipt.action.receipt.version = "stale-action-version"; },
        (_payload, receipt) => { receipt.action.receipt.rejection = "INVALID_STATE"; },
        (_payload, receipt) => { receipt.action.observedSignature.semanticState = "stale-state"; },
        (_payload, receipt) => { receipt.geometry = { status: "failed" }; },
        (_payload, receipt) => { receipt.geometry[0].rendered = receipt.geometry[0].upper + 1; },
      );
    } else if (groupId === "G04") {
      mutations.push(
        (_payload, receipt) => { receipt.domain.match = false; },
        (_payload, receipt) => { receipt.domain.observed = { ...receipt.domain.observed, value: 2 }; },
        (_payload, receipt) => { receipt.domain.status = "failed"; },
        (_payload, receipt) => { receipt.productActionReceipt.version = "stale-action-version"; },
        (_payload, receipt) => { receipt.productActionReceipt.status = "failed"; },
        (_payload, receipt) => { receipt.productActionReceipt.accepted = false; },
        (_payload, receipt) => { receipt.runtimeSignature.stable = false; },
        (_payload, receipt) => { receipt.runtimeSignature.semanticState = "stale-runtime-state"; },
        (_payload, receipt) => { receipt.visual.status = "failed"; },
        (_payload, receipt) => { receipt.visual.expectedInterpretations.push("stale-interpretation"); },
      );
    } else if (groupId === "G05") {
      mutations.push(
        (payload) => { payload.controlDomain.id = "stale-control-domain"; },
        (_payload, receipt) => { receipt.domain.observed = { ...receipt.domain.observed, amount: 2 }; },
        (_payload, receipt) => { receipt.domain.status = "failed"; },
        (_payload, receipt) => { receipt.action.expectedDomain.rejection = "INVALID_STATE"; },
        (_payload, receipt) => { receipt.runtimeSignature.stable = false; },
        (_payload, receipt) => { receipt.runtimeSignature.semanticState = { ...receipt.runtimeSignature.semanticState, amount: 2 }; },
        (_payload, receipt) => { receipt.visual.status = "failed"; },
      );
    } else {
      mutations.push(
        (_payload, receipt) => { receipt.domain.match = false; },
        (_payload, receipt) => { receipt.domain.domainId = "ratio-proportion-scale-stale-v1"; },
        (_payload, receipt) => { receipt.domain.status = "failed"; },
        (_payload, receipt) => { receipt.productAction.version = "stale-action-version"; },
        (_payload, receipt) => { receipt.productAction.status = "failed"; },
        (_payload, receipt) => { receipt.productAction.rejection = "INVALID_STATE"; },
        (_payload, receipt) => {
          const runtime = JSON.parse(receipt.runtimeSignature);
          runtime.stable = false;
          receipt.runtimeSignature = JSON.stringify(runtime);
        },
        (_payload, receipt) => {
          const runtime = JSON.parse(receipt.runtimeSignature);
          runtime.actionStatus = "failed";
          receipt.runtimeSignature = JSON.stringify(runtime);
        },
        (_payload, receipt) => {
          const runtime = JSON.parse(receipt.runtimeSignature);
          runtime.semanticState = JSON.stringify({ ...receipt.configuredState, ratioA: 9 });
          receipt.runtimeSignature = JSON.stringify(runtime);
        },
        (_payload, receipt) => { receipt.visual.status = "failed"; },
        (_payload, receipt) => { receipt.visual.markCount = 0; },
      );
    }

    for (const mutate of mutations) {
      const { activeContract, activeReport } = focusedGroupFixture(groupId);
      const attachment = activeReport.suites[0].specs[0].tests[0]
        .results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      mutate(payload, payload.receipts[0]);
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
      await assert.rejects(
        validateMainlandFocusedVisualizationReport(
          activeReport,
          reportPath,
          activeContract,
          validationOptions(),
        ),
        new RegExp(`${groupId}.*(hollow state receipt|semantic|status|disabled|domain|geometry|visual|runtime|version|collision|rejection|mark)`, "su"),
      );
    }
  }
});

test("mutation 11 rejects an extra known-file spec with no project tests", async () => {
  const broken = report();
  broken.suites[0].specs.push({
    file: "tests/e2e/focused-a.spec.ts",
    id: "focused-a-empty-extra",
    ok: true,
    tags: [],
    tests: [],
    title: "A extra known-file empty spec",
  });
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      broken,
      reportPath,
      contract,
      validationOptions(),
    ),
    /unexpected spec title|spec node|exactly one project test|spec count/u,
  );

  const duplicateId = report();
  duplicateId.suites[0].specs[1].id = duplicateId.suites[0].specs[0].id;
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      duplicateId,
      reportPath,
      contract,
      validationOptions(),
    ),
    /spec ids.*unique|unique non-empty identities/u,
  );
});

test("mutation 12 rejects a result whose interval falls outside aggregate report timing", async () => {
  for (const timing of [
    { duration: 0, startTime: "2026-08-11T00:00:02.099Z" },
    { duration: 1_000, startTime: "2026-08-11T00:00:01.500Z" },
    { duration: 0, startTime: "2026-08-10T23:59:59.999Z" },
  ]) {
    const broken = report();
    Object.assign(
      broken.suites[0].specs[0].tests[0].results[0],
      timing,
    );
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        broken,
        reportPath,
        contract,
        validationOptions(),
      ),
      /result interval|stats timing|outside.*report/u,
    );
  }
});

test("mutation 13 rejects contradictory browser receipts missing the exact producer contract", async () => {
  const mutations = [
    {
      expected: /violation|terminal pass/u,
      mutate(processReceipt) {
        processReceipt.violation = "producer observed a mutable path violation";
      },
    },
    {
      expected: /processKind/u,
      mutate(processReceipt) {
        for (const entry of processReceipt.processMutablePathAudit) delete entry.processKind;
      },
    },
    {
      expected: /mutableFlags|terminal Chrome pass/u,
      mutate(_processReceipt, profileReceipt) {
        delete profileReceipt.browserCommandAudit.mutableFlags;
      },
    },
    {
      expected: /producer contract|mutable launch argument/u,
      mutate(_processReceipt, profileReceipt) {
        for (const inheritance of profileReceipt.projectFixtureInheritance) {
          inheritance.launchArgs = [`--crash-dumps-dir=${pathManifest.paths.crashDumpDir}`];
        }
      },
    },
  ];
  for (const { expected, mutate } of mutations) {
    const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
    const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
    mutate(processReceipt, profileReceipt);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        report(),
        reportPath,
        contract,
        validationOptions({
          [browserProcessEvidencePath]: JSON.stringify(processReceipt),
          [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
        }),
      ),
      expected,
    );
  }
});

test("mutation 14 rejects an unmodelled failed collision wrapper status", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.receipts[0].collision.status = "failed";
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*collision.*status`, "su"),
    );
  }
});

test("mutation 15 rejects an unmodelled failed contrast wrapper status", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.receipts[0].contrast.status = "failed";
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*contrast.*status`, "su"),
    );
  }
});

test("mutation 16 rejects unmodelled failed geometry and layout wrapper statuses", async () => {
  const mutations = [
    {
      groupId: "G03",
      mutate(receipt) { receipt.geometry[0].status = "failed"; },
    },
    {
      groupId: "G03",
      mutate(receipt) { receipt.layout.status = "failed"; },
    },
    {
      groupId: "G05",
      mutate(receipt) { receipt.layout.status = "failed"; },
    },
  ];
  for (const { groupId, mutate } of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    mutate(payload.receipts[0]);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*(geometry|layout).*status`, "su"),
    );
  }
});

test("mutation 17 binds every G06 visual and nested geometry receipt to supported mode identity", async () => {
  const mutations = [
    (receipt) => { receipt.visual.receipt.status = "failed"; },
    (receipt) => { receipt.visual.receipt.kind = "stale-mode"; },
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      const geometryReceipt = JSON.parse(runtime.geometry[0].receipt);
      geometryReceipt.status = "failed";
      runtime.geometry[0].receipt = JSON.stringify(geometryReceipt);
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      const geometryReceipt = JSON.parse(runtime.geometry[0].receipt);
      geometryReceipt.kind = "stale-mode";
      runtime.geometry[0].receipt = JSON.stringify(geometryReceipt);
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    mutate(payload.receipts[0]);
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G06.*(visual|geometry).*(supported|kind|mode|status)/su,
    );
  }
});

test("mutation 18 rejects a coherent multiply state with empty physical-interpretation evidence", async () => {
  const { activeContract, activeReport } = producerShapedG04UnsupportedFixture();
  const attachment = activeReport.suites[0].specs[0].tests[0]
    .results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const receipt = payload.receipts[0];
  receipt.visual = {
    expectedInterpretations: [],
    supported: [],
    unsupported: [],
  };
  receipt.runtimeSignature.visual = {
    geometry: [],
    interpretations: [],
    visibleReceipts: [{
      attributes: { "data-viz-visible-receipt": "arithmetic" },
      text: "",
    }],
  };
  synchronizeG04RuntimeAction(receipt);
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(multiply|interpretation|visual)/su,
  );
});

test("mutation 19 reconstructs G04 aggregate interpretations from exact runtime DOM receipts", async () => {
  const multiplyFixture = () => {
    const { activeContract, activeReport } = producerShapedG04UnsupportedFixture();
    let attachment;
    let payload;
    for (const spec of activeReport.suites[0].specs) {
      const currentAttachment = spec.tests[0].results[0].attachments[0];
      const currentPayload = JSON.parse(
        Buffer.from(currentAttachment.body, "base64").toString("utf8"),
      );
      for (const receipt of currentPayload.receipts) {
        receipt.collision.svgSurfaceCount = 3;
        const descriptors = [
          ["multiplication-area-interpretation", "area-grid"],
          ["multiplication-repeated-group-interpretation", "part-of-quantity"],
          ["multiplication-scaling-interpretation", "scaling"],
        ];
        receipt.visual = {
          expectedInterpretations: descriptors.map(([name]) => name),
          supported: descriptors.map(([, kind]) => ({
            kind,
            markCount: 2,
            receipt: { kind, status: "supported" },
            status: "supported",
          })),
          unsupported: [],
        };
        receipt.runtimeSignature.visual = {
          geometry: receipt.visual.supported.map((item) => ({
            attributes: {
              "data-viz-fraction-visual": item.kind,
              "data-viz-geometry-receipt": JSON.stringify(item.receipt),
              "data-viz-painted-mark-count": String(item.markCount),
            },
            text: "",
          })),
          interpretations: descriptors.map(([name]) => ({
            attributes: {
              "data-viz-interpretation-status": "supported",
              "data-viz-name": name,
            },
            text: "",
          })),
          visibleReceipts: [{
            attributes: { "data-viz-visible-receipt": "arithmetic" },
            text: "",
          }],
        };
        synchronizeG04RuntimeAction(receipt);
      }
      currentPayload.plannedStateDescriptors = currentPayload.receipts.map((receipt) =>
        focusedStateDescriptor("G04", receipt)
      );
      const currentDescriptorSha = descriptorPlanSha256(
        currentPayload.plannedStateDescriptors,
      );
      activeContract.groups[0].stateDescriptorPlanSha256 = currentDescriptorSha;
      currentPayload.expectedStateDescriptorPlanSha256 = currentDescriptorSha;
      currentPayload.observedStateDescriptorPlanSha256 = currentDescriptorSha;
      currentAttachment.body = Buffer.from(JSON.stringify(currentPayload)).toString("base64");
      if (attachment === undefined) {
        attachment = currentAttachment;
        payload = currentPayload;
      }
    }
    return { activeContract, activeReport, attachment, payload };
  };

  const valid = multiplyFixture();
  const positive = await validateMainlandFocusedVisualizationReport(
    valid.activeReport,
    reportPath,
    valid.activeContract,
    validationOptions(),
  );
  assert.equal(positive.stateReceiptCount, 4);

  const mutations = [
    (receipt) => { receipt.runtimeSignature.visual.interpretations = []; },
    (receipt) => { receipt.runtimeSignature.visual.geometry = []; },
    (receipt) => { receipt.runtimeSignature.visual.visibleReceipts = []; },
    (receipt) => {
      receipt.runtimeSignature.visual.geometry[0].attributes["data-viz-painted-mark-count"] = "99";
    },
    (receipt) => {
      receipt.runtimeSignature.visual.interpretations[0].attributes["data-viz-interpretation-status"] = "failed";
    },
  ];
  for (const mutate of mutations) {
    const current = multiplyFixture();
    mutate(current.payload.receipts[0]);
    current.attachment.body = Buffer.from(JSON.stringify(current.payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        current.activeReport,
        reportPath,
        current.activeContract,
        validationOptions(),
      ),
      /G04.*(runtime|visual|interpretation|geometry|visible)/su,
    );
  }
});

test("mutation 20 rejects unsupported G05 visual ownership for a nonzero magnitude", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const attachment = activeReport.suites[0].specs[0].tests[0]
    .results[0].attachments[0];
  const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
  const receipt = payload.receipts[0];
  receipt.visual = { kind: "find-part", status: "unsupported" };
  receipt.collision = {
    inspectedCandidateCount: 8,
    learnerControlCount: 2,
    status: "unsupported-zero-area-explicit-owner",
    totalCandidatePairCount: 6,
  };
  attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G05.*(unsupported|zero|magnitude|visual)/su,
  );
});

test("mutation 21 permits only the exact G05 zero-magnitude unsupported kind", async () => {
  const zeroFixture = () => {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    const makeZero = (value) => {
      if (Array.isArray(value)) {
        value.forEach(makeZero);
        return;
      }
      if (value === null || typeof value !== "object") return;
      if (value.mode === "find-part" && Object.hasOwn(value, "base")) value.base = 0;
      if (value.parameter === "base" && Object.hasOwn(value, "value")) value.value = "0";
      Object.values(value).forEach(makeZero);
    };
    for (const receipt of payload.receipts) {
      makeZero(receipt);
      receipt.visual = { kind: "find-part", status: "unsupported" };
      receipt.collision = {
        inspectedCandidateCount: 8,
        learnerControlCount: 2,
        status: "unsupported-zero-area-explicit-owner",
        totalCandidatePairCount: 6,
      };
      receipt.runtimeSignature.visual = [
        {
          geometryReceipt: null,
          kind: null,
          markCount: null,
          visibleReceipt: "find-part",
        },
        {
          geometryReceipt: null,
          kind: "unsupported",
          markCount: null,
          visibleReceipt: null,
        },
      ];
    }
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    return { activeContract, activeReport, attachment, payload };
  };

  const valid = zeroFixture();
  const positive = await validateMainlandFocusedVisualizationReport(
    valid.activeReport,
    reportPath,
    valid.activeContract,
    validationOptions(),
  );
  assert.equal(positive.stateReceiptCount, 4);

  const wrongKind = zeroFixture();
  wrongKind.payload.receipts[0].visual.kind = "discount";
  wrongKind.attachment.body = Buffer.from(JSON.stringify(wrongKind.payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      wrongKind.activeReport,
      reportPath,
      wrongKind.activeContract,
      validationOptions(),
    ),
    /G05.*visual\.kind.*mode/su,
  );

  const surplusCollision = zeroFixture();
  surplusCollision.payload.receipts[0].collision.forged = true;
  surplusCollision.attachment.body = Buffer.from(JSON.stringify(surplusCollision.payload)).toString("base64");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      surplusCollision.activeReport,
      reportPath,
      surplusCollision.activeContract,
      validationOptions(),
    ),
    /G05.*collision.*(key|shape|exact|surplus)/su,
  );
});

test("mutation 22 requires each browser observation to carry its exact main-PID crash tuple", async () => {
  const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
  processReceipt.observations[0].mutablePaths =
    processReceipt.observations[0].mutablePaths.filter(
      (entry) => entry.flag !== "crash-dumps-dir",
    );
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProcessEvidencePath]: JSON.stringify(processReceipt),
      }),
    ),
    /browser process observation.*crash-dumps-dir.*main.*pid|main-PID.*crash/su,
  );
});

test("mutation 23 binds the browser-profile mutable-path set exactly to its matched observation", async () => {
  const mutations = [
    (processReceipt, profileReceipt) => {
      profileReceipt.observed.mutablePaths[0] = {
        ...processReceipt.observations[1].mutablePaths[0],
      };
    },
    (_processReceipt, profileReceipt) => {
      profileReceipt.observed.mutablePaths.push({
        ...profileReceipt.observed.mutablePaths[1],
      });
    },
    (processReceipt, profileReceipt) => {
      profileReceipt.observed.mutablePaths.push({
        ...processReceipt.observations[1].mutablePaths[1],
      });
    },
    (processReceipt, profileReceipt) => {
      const thirdProfileEntry = {
        flag: "user-data-dir",
        path: `${pathManifest.paths.browserTempDir}/profile-c`,
        pid: 41_003,
      };
      processReceipt.processMutablePathAudit.push({
        ...thirdProfileEntry,
        processKind: "browser-main",
      });
      profileReceipt.observed.mutablePaths.push(thirdProfileEntry);
    },
  ];
  for (const mutate of mutations) {
    const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
    const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
    mutate(processReceipt, profileReceipt);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        report(),
        reportPath,
        contract,
        validationOptions({
          [browserProcessEvidencePath]: JSON.stringify(processReceipt),
          [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
        }),
      ),
      /browser (profile|process).*(exact|identity|mutable-path|observation|duplicate|surplus)/su,
    );
  }
});

test("mutation 24 rejects third-profile user-data evidence hidden inside one browser observation", async () => {
  const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
  const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
  const thirdProfileEntry = {
    flag: "user-data-dir",
    path: `${pathManifest.paths.browserTempDir}/profile-c`,
    pid: 41_003,
  };
  processReceipt.observations[0].mutablePaths.push(thirdProfileEntry);
  processReceipt.processMutablePathAudit.push({
    ...thirdProfileEntry,
    processKind: "descendant",
  });
  profileReceipt.observed.mutablePaths.push(thirdProfileEntry);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      report(),
      reportPath,
      contract,
      validationOptions({
        [browserProcessEvidencePath]: JSON.stringify(processReceipt),
        [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
      }),
    ),
    /browser process observation.*user-data-dir.*profile|third-profile|profile identity/su,
  );
});

test("mutation 25 requires a pinned canonical per-state semantic descriptor plan", async () => {
  {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const attachment = activeReport.suites[0].specs[0].tests[0]
      .results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    delete payload.plannedStateDescriptors;
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G03.*plannedStateDescriptors.*array|semantic descriptor plan/su,
    );
  }

  {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    activeContract.groups[0].stateDescriptorPlanSha256 = null;
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G03.*pinned.*descriptor-plan SHA|semantic descriptor.*HOLD/su,
    );
  }

  const semanticallyRepinnedMutation = async (mutate, expected) => {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    let repinnedSha = null;
    for (const spec of activeReport.suites[0].specs) {
      const attachment = spec.tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      mutate(payload.plannedStateDescriptors, payload.receipts);
      const currentSha = descriptorPlanSha256(payload.plannedStateDescriptors);
      if (repinnedSha === null) repinnedSha = currentSha;
      assert.equal(currentSha, repinnedSha);
      payload.expectedStateDescriptorPlanSha256 = currentSha;
      payload.observedStateDescriptorPlanSha256 = currentSha;
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    }
    activeContract.groups[0].stateDescriptorPlanSha256 = repinnedSha;
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      expected,
    );
  };

  await semanticallyRepinnedMutation(
    (descriptors) => { descriptors[0].plan.mode = "stale-mode"; },
    /G03.*descriptor.*mode.*receipt/su,
  );
  await semanticallyRepinnedMutation(
    (descriptors) => { descriptors[0].plan.request = { kind: "initial", topicId: "stale-lab" }; },
    /G03.*descriptor.*request.*receipt/su,
  );
  await semanticallyRepinnedMutation(
    (descriptors) => { descriptors[0].plan.controlParameter = "value"; },
    /G03.*descriptor.*control.*request|control parameter/su,
  );
  await semanticallyRepinnedMutation(
    (descriptors) => { descriptors.reverse(); },
    /G03.*descriptor state IDs.*ordered plan|descriptor plan.*state IDs/su,
  );
});

test("mutation 26 normalizes all three producer controller-request identity shapes", async () => {
  for (const groupId of ["G03", "G04", "G05"]) {
    const valid = focusedControllerDescriptorFixture(groupId);
    const positive = await validateMainlandFocusedVisualizationReport(
      valid.activeReport,
      reportPath,
      valid.activeContract,
      validationOptions(),
    );
    assert.equal(positive.stateReceiptCount, 4);

    const broken = focusedControllerDescriptorFixture(groupId);
    let descriptorSha = null;
    for (const spec of broken.activeReport.suites[0].specs) {
      const attachment = spec.tests[0].results[0].attachments[0];
      const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
      for (const descriptor of payload.plannedStateDescriptors) {
        descriptor.plan.controlParameter = "stale-controller";
      }
      const currentSha = descriptorPlanSha256(payload.plannedStateDescriptors);
      if (descriptorSha === null) descriptorSha = currentSha;
      assert.equal(currentSha, descriptorSha);
      payload.expectedStateDescriptorPlanSha256 = currentSha;
      payload.observedStateDescriptorPlanSha256 = currentSha;
      attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
    }
    broken.activeContract.groups[0].stateDescriptorPlanSha256 = descriptorSha;
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        broken.activeReport,
        reportPath,
        broken.activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*descriptor control parameter.*receipt request`, "su"),
    );
  }
});

function focusedPayloadEntries(activeReport) {
  return activeReport.suites[0].specs.map((spec) => {
    const attachment = spec.tests[0].results[0].attachments[0];
    return {
      attachment,
      payload: JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8")),
    };
  });
}

function expectedG04RuntimeAction(product) {
  return {
    "data-viz-action-accepted": String(product.accepted),
    "data-viz-action-before": JSON.stringify(product.before),
    "data-viz-action-expected": JSON.stringify(product.expected),
    "data-viz-action-observed": JSON.stringify(product.observed),
    "data-viz-action-projections": JSON.stringify(product.projections),
    "data-viz-action-receipt": JSON.stringify(product),
    "data-viz-action-receipt-version": product.version,
    "data-viz-action-rejection": product.rejection ?? "none",
    "data-viz-action-request": JSON.stringify(product.request),
    "data-viz-action-requested": JSON.stringify(product.requested),
    "data-viz-action-requested-validity": product.requestedValidity,
    "data-viz-action-status": product.status,
  };
}

function synchronizeG04RuntimeAction(receipt) {
  receipt.runtimeSignature.action = expectedG04RuntimeAction(
    receipt.productActionReceipt,
  );
  const modeButtons = receipt.runtimeSignature.controls.filter(
    (control) => control.attributes["data-viz-mode-button"] === "true",
  );
  let activeButton = modeButtons.find(
    (control) => control.attributes["data-viz-mode"] === receipt.mode,
  );
  if (!activeButton && modeButtons.length === 1) {
    activeButton = modeButtons[0];
    activeButton.attributes["data-viz-mode"] = receipt.mode;
  }
  for (const button of modeButtons) {
    const active = button === activeButton;
    button.attributes["aria-pressed"] = String(active);
    button.attributes["data-viz-mode-active"] = String(active);
  }
}

function g04RuntimeModeButton(mode, state) {
  const active = mode === state.mode;
  const shouldProject = mode === "divide" ||
    (mode === "estimate" && state.evaluatedOperation === "divide");
  return {
    attributes: {
      "aria-pressed": String(active),
      "data-viz-domain-controller": "mode",
      "data-viz-mode": mode,
      "data-viz-mode-active": String(active),
      "data-viz-mode-button": "true",
      type: "button",
      ...(shouldProject
        ? {
            "data-viz-range-affects": "right-numerator",
            "data-viz-range-projection": "exclude-zero",
            "data-viz-range-projection-reason":
              "division-divisor-cannot-be-zero",
          }
        : {}),
    },
    disabled: false,
    options: [],
    tagName: "button",
    text: mode,
    value: null,
  };
}

function setG04RuntimeModes(receipt, modes) {
  const state = receipt.domain.observed;
  const controls = receipt.runtimeSignature.controls;
  const firstModeIndex = controls.findIndex(
    (control) => control.attributes["data-viz-mode-button"] === "true",
  );
  const remaining = controls.filter(
    (control) => control.attributes["data-viz-mode-button"] !== "true",
  );
  remaining.splice(
    Math.max(firstModeIndex, 0),
    0,
    ...modes.map((mode) => g04RuntimeModeButton(mode, state)),
  );
  receipt.runtimeSignature.controls = remaining;
  receipt.runtimeSignature.domain.projections = remaining.flatMap((control) =>
    control.attributes["data-viz-range-projection"] === undefined
      ? []
      : [{
          affects: control.attributes["data-viz-range-affects"] ?? null,
          parameter: control.attributes["data-viz-parameter"] ?? null,
          projection: control.attributes["data-viz-range-projection"],
          reason:
            control.attributes["data-viz-range-projection-reason"] ?? null,
        }]
  );
}

const producerG04LabProfiles = Object.freeze([
  Object.freeze({
    estimateOperations: Object.freeze(["add", "subtract"]),
    labId: "bnu-primary-p5-lower-fraction-add-sub",
    modes: Object.freeze(["add", "subtract", "simplify", "estimate"]),
    reset: Object.freeze({
      evaluatedOperation: "add",
      leftDenominator: 4,
      leftNumerator: 7,
      mode: "add",
      rightDenominator: 6,
      rightNumerator: 5,
    }),
  }),
  Object.freeze({
    estimateOperations: Object.freeze(["divide"]),
    labId: "bnu-primary-p5-lower-fraction-division",
    modes: Object.freeze(["divide", "simplify", "estimate"]),
    reset: Object.freeze({
      evaluatedOperation: "divide",
      leftDenominator: 4,
      leftNumerator: 7,
      mode: "divide",
      rightDenominator: 6,
      rightNumerator: 5,
    }),
  }),
  Object.freeze({
    estimateOperations: Object.freeze(["multiply"]),
    labId: "bnu-primary-p5-lower-fraction-multiplication",
    modes: Object.freeze(["multiply", "simplify", "estimate"]),
    reset: Object.freeze({
      evaluatedOperation: "multiply",
      leftDenominator: 4,
      leftNumerator: 7,
      mode: "multiply",
      rightDenominator: 6,
      rightNumerator: 5,
    }),
  }),
  Object.freeze({
    estimateOperations: Object.freeze(["add", "subtract"]),
    labId: "hjb-primary-p5-lower-fractions-equivalence-operations",
    modes: Object.freeze([
      "equivalence",
      "compare",
      "add",
      "subtract",
      "simplify",
      "estimate",
    ]),
    reset: Object.freeze({
      evaluatedOperation: "equivalence",
      leftDenominator: 4,
      leftNumerator: 6,
      mode: "equivalence",
      rightDenominator: 6,
      rightNumerator: 9,
    }),
  }),
  Object.freeze({
    estimateOperations: Object.freeze(["add", "subtract", "multiply", "divide"]),
    labId: "pep-primary-p5-lower-factors-fractions",
    modes: Object.freeze([
      "equivalence",
      "compare",
      "add",
      "subtract",
      "multiply",
      "divide",
      "simplify",
      "estimate",
    ]),
    reset: Object.freeze({
      evaluatedOperation: "simplify",
      leftDenominator: 8,
      leftNumerator: 12,
      mode: "simplify",
      rightDenominator: 10,
      rightNumerator: 15,
    }),
  }),
]);

function synchronizeG04NumericControls(receipt) {
  const state = receipt.domain.observed;
  setG04NumericControlCollection(receipt.controls, state);
  setG04NumericControlCollection(receipt.action.beforeControls, state);
  setG04NumericControlCollection(receipt.action.observedControls, state);
  setG04RuntimeNumericControls(receipt.runtimeSignature.controls, state);
}

function setG04NumericControlCollection(controls, state) {
  const values = {
    "left-denominator": String(state.leftDenominator),
    "left-numerator": String(state.leftNumerator),
    "right-denominator": String(state.rightDenominator),
    "right-numerator": String(state.rightNumerator),
  };
  for (const control of controls) {
    if (control.parameter in values) {
      control.value = values[control.parameter];
      control.zeroExcluded = control.parameter === "right-numerator" &&
        state.evaluatedOperation === "divide";
    }
  }
}

function setG04RuntimeNumericControls(controls, state) {
  const values = {
    "left-denominator": String(state.leftDenominator),
    "left-numerator": String(state.leftNumerator),
    "right-denominator": String(state.rightDenominator),
    "right-numerator": String(state.rightNumerator),
  };
  for (const control of controls) {
    const parameter = control.attributes["data-viz-parameter"];
    if (parameter in values) {
      control.value = values[parameter];
      control.attributes["data-viz-zero-excluded"] = String(
        parameter === "right-numerator" &&
          state.evaluatedOperation === "divide",
      );
    }
  }
}

function g04DivideProjection(mode) {
  return {
    affectedControlId: "right-numerator",
    after: 1,
    before: 0,
    controllerInputs: { evaluatedOperation: "divide", mode },
    domainId: "fraction-operations-divisor-nonzero-v1",
    projection: "exclude-zero",
    reason: "division-divisor-cannot-be-zero",
  };
}

function g04AggregateDomain(requested, expected, rejection, projections) {
  return {
    expected: structuredClone(expected),
    match: true,
    observed: structuredClone(expected),
    projectionCount: projections.length,
    projectionReasons: projections.map(({ reason }) => reason),
    rejection,
    requested: structuredClone(requested),
  };
}

function g04RuntimeDomain(product, domain, projectionDescriptors) {
  return {
    domainId: product.domainId,
    domainVersion: String(product.domainVersion),
    expected: structuredClone(domain.expected),
    match: "true",
    observed: structuredClone(domain.observed),
    projectionCount: String(domain.projectionCount),
    projectionReasons: [...domain.projectionReasons],
    projections: structuredClone(projectionDescriptors),
    rejection: domain.rejection,
    requested: structuredClone(domain.requested),
  };
}

function producerShapedG04DivideZeroFixture(kind) {
  const profile = producerG04LabProfiles.find(({ labId }) =>
    labId === "bnu-primary-p5-lower-fraction-division"
  );
  const fixture = producerShapedG04LabFixture(profile, "reset");
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const before = kind === "projection"
        ? {
            ...structuredClone(profile.reset),
            evaluatedOperation: "simplify",
            mode: "simplify",
            rightNumerator: 0,
          }
        : structuredClone(profile.reset);
      const request = kind === "projection"
        ? { evaluatedOperation: "divide", kind: "controller", mode: "divide" }
        : { controlId: "right-numerator", kind: "control", value: 0 };
      const requested = kind === "projection"
        ? { ...structuredClone(before), evaluatedOperation: "divide", mode: "divide" }
        : { ...structuredClone(before), rightNumerator: 0 };
      const expected = kind === "projection"
        ? { ...structuredClone(requested), rightNumerator: 1 }
        : structuredClone(before);
      const projections = kind === "projection"
        ? [g04DivideProjection("divide")]
        : [];
      const rejection = kind === "projection"
        ? null
        : "DIRECT_DIVISOR_ZERO_REQUEST";
      const product = {
        accepted: kind === "projection",
        before: structuredClone(before),
        domainId: "fraction-operations-divisor-nonzero-v1",
        domainVersion: 1,
        expected: structuredClone(expected),
        matchesExpected: true,
        observed: structuredClone(expected),
        projections: structuredClone(projections),
        rejection,
        request: structuredClone(request),
        requested: structuredClone(requested),
        requestedValidity: kind === "projection"
          ? "requires-projection"
          : "rejected-invalid",
        status: kind === "projection" ? "accepted" : "rejected",
        version: "fraction-operations-action-receipt-v1",
      };
      const domain = g04AggregateDomain(
        requested,
        expected,
        rejection,
        projections,
      );
      receipt.productActionReceipt = product;
      receipt.domain = domain;
      receipt.action.beforeDomain = g04AggregateDomain(before, before, null, []);
      receipt.action.expectedActionReceipt = structuredClone(product);
      receipt.action.expectedProjection = kind === "projection";
      receipt.action.expectedRejection = rejection;
      receipt.action.oracleBefore = structuredClone(before);
      receipt.action.oracleAfter = structuredClone(expected);
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt = kind === "projection"
        ? {
            domainId: product.domainId,
            domainVersion: product.domainVersion,
            expected: structuredClone(expected),
            matchesExpected: true,
            observed: structuredClone(expected),
            projections: structuredClone(projections),
            request: structuredClone(request),
            requested: structuredClone(requested),
          }
        : null;
      receipt.action.rejectedRequest = kind === "projection"
        ? null
        : structuredClone(request);
      receipt.mode = expected.mode;
      receipt.evaluatedOperation = expected.evaluatedOperation;
      receipt.runtimeSignature.mode = expected.mode;
      receipt.runtimeSignature.evaluatedOperation = expected.evaluatedOperation;
      setG04RuntimeModes(receipt, profile.modes);
      setG04NumericControlCollection(receipt.action.beforeControls, before);
      setG04NumericControlCollection(receipt.action.observedControls, expected);
      setG04NumericControlCollection(receipt.controls, expected);
      setG04RuntimeNumericControls(receipt.runtimeSignature.controls, expected);
      receipt.runtimeSignature.domain = g04RuntimeDomain(
        product,
        domain,
        receipt.runtimeSignature.domain.projections,
      );
      synchronizeG04ConfiguredState(receipt);
      setG04ProducerVisual(receipt);
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G04");
  return fixture;
}

function setG04ProducerVisual(receipt) {
  const operation = receipt.evaluatedOperation;
  const descriptors = operation === "divide"
    ? [
        ["division-measurement-interpretation", "measurement-division"],
        ["division-sharing-interpretation", "sharing-division"],
      ]
    : operation === "multiply"
      ? [
          ["multiplication-area-interpretation", "area-grid"],
          ["multiplication-repeated-group-interpretation", "part-of-quantity"],
          ["multiplication-scaling-interpretation", "scaling"],
        ]
      : [];
  const supported = descriptors.map(([, kind]) => ({
    kind,
    markCount: 2,
    receipt: { kind, status: "supported" },
    status: "supported",
  }));
  receipt.visual = {
    expectedInterpretations: descriptors.map(([name]) => name),
    supported,
    unsupported: [],
  };
  receipt.runtimeSignature.visual = {
    geometry: supported.map((item) => ({
      attributes: {
        "data-viz-fraction-visual": item.kind,
        "data-viz-geometry-receipt": JSON.stringify(item.receipt),
        "data-viz-painted-mark-count": String(item.markCount),
      },
      text: "",
    })),
    interpretations: [
      ...(operation === "divide"
        ? [{
            attributes: {
              "data-viz-interpretation-status": "supported",
              "data-viz-name": "division-reciprocal-interpretation",
            },
            text: "",
          }]
        : []),
      ...descriptors.map(([name]) => ({
        attributes: {
          "data-viz-interpretation-status": "supported",
          "data-viz-name": name,
        },
        text: "",
      })),
    ],
    visibleReceipts: [{
      attributes: {
        "data-viz-visible-receipt": operation === "equivalence"
          ? "equivalence"
          : operation === "compare"
            ? "comparison"
            : receipt.mode === "simplify"
              ? "simplification"
              : receipt.mode === "estimate"
                ? "estimate"
                : "arithmetic",
      },
      text: "",
    }],
  };
  receipt.collision.svgSurfaceCount = supported.length;
}

function producerShapedG04LabFixture(profile, requestKind) {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.stateId = `${profile.labId}:${receipt.stateId.slice(
        receipt.stateId.indexOf(":") + 1,
      )}`;
      receipt.collision.phase = receipt.stateId;
      mutateEveryG04DomainState(receipt, (state) => {
        Object.assign(state, profile.reset);
      });
      receipt.mode = profile.reset.mode;
      receipt.evaluatedOperation = profile.reset.evaluatedOperation;
      receipt.runtimeSignature.mode = profile.reset.mode;
      receipt.runtimeSignature.evaluatedOperation =
        profile.reset.evaluatedOperation;
      setG04ConfiguredState(
        receipt,
        receipt.configuredState.replace(
          /(?:^|\|)lab=[^|]+/u,
          `|lab=${profile.labId}`,
        ),
      );
      synchronizeG04ConfiguredState(receipt);
      setG04RuntimeModes(receipt, profile.modes);
      synchronizeG04NumericControls(receipt);
      const resetControl = receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-reset-model"] === "true",
      );
      resetControl.attributes["data-viz-reset-topic-id"] = profile.labId;
      const request = { kind: requestKind };
      receipt.productActionReceipt.request = request;
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt.request = {
        evaluatedOperation: profile.reset.evaluatedOperation,
        kind: "controller",
        mode: profile.reset.mode,
      };
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      setG04ProducerVisual(receipt);
      synchronizeG04RuntimeAction(receipt);
    }
    entry.payload.plannedStateIds = entry.payload.receipts.map(
      ({ stateId }) => stateId,
    );
    entry.payload.expectedStatePlanSha256 = createHash("sha256")
      .update(`${entry.payload.plannedStateIds.join("\n")}\n`)
      .digest("hex");
  }
  activeContract.groups[0].statePlanSha256 =
    entries[0].payload.expectedStatePlanSha256;
  repinFocusedDescriptors(activeContract, entries, "G04");
  return { activeContract, activeReport };
}

function producerShapedG04EstimateFixture(profile) {
  const fixture = producerShapedG04LabFixture(profile, "initial");
  const entries = focusedPayloadEntries(fixture.activeReport);
  const evaluatedOperation = profile.estimateOperations[0];
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      mutateEveryG04DomainState(receipt, (state) => {
        state.mode = "estimate";
        state.evaluatedOperation = evaluatedOperation;
      });
      receipt.mode = "estimate";
      receipt.evaluatedOperation = evaluatedOperation;
      receipt.runtimeSignature.mode = "estimate";
      receipt.runtimeSignature.evaluatedOperation = evaluatedOperation;
      synchronizeG04ConfiguredState(receipt);
      synchronizeG04NumericControls(receipt);
      const estimateControl = {
        affects: ["right-numerator"],
        disabled: false,
        kind: "select",
        max: null,
        min: null,
        options: [...profile.estimateOperations],
        parameter: "estimate-operation",
        projection: "exclude-zero",
        projectionReason: "division-divisor-cannot-be-zero",
        step: null,
        value: evaluatedOperation,
        zeroExcluded: null,
      };
      receipt.controls.unshift(structuredClone(estimateControl));
      receipt.action.beforeControls.unshift(structuredClone(estimateControl));
      receipt.action.observedControls.unshift(structuredClone(estimateControl));
      const firstNumericIndex = receipt.runtimeSignature.controls.findIndex(
        (control) => control.attributes["data-viz-parameter"] !== undefined,
      );
      receipt.runtimeSignature.controls.splice(firstNumericIndex, 0, {
        attributes: {
          "data-viz-domain-controller": "evaluated-operation",
          "data-viz-parameter": "estimate-operation",
          "data-viz-range-affects": "right-numerator",
          "data-viz-range-projection": "exclude-zero",
          "data-viz-range-projection-reason":
            "division-divisor-cannot-be-zero",
        },
        disabled: false,
        options: profile.estimateOperations.map((value) => ({
          disabled: false,
          value,
        })),
        tagName: "select",
        text: profile.estimateOperations.join(" "),
        value: evaluatedOperation,
      });
      setG04RuntimeModes(receipt, profile.modes);
      const request = {
        evaluatedOperation,
        kind: "controller",
        mode: "estimate",
      };
      receipt.productActionReceipt.request = request;
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt.request = structuredClone(request);
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      setG04ProducerVisual(receipt);
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G04");
  return fixture;
}

function mutateEveryG04DomainState(receipt, mutate) {
  const stateCollections = [
    receipt.domain,
    receipt.productActionReceipt,
    receipt.action.beforeDomain,
    receipt.action.plannerReceipt,
    receipt.runtimeSignature.domain,
  ].filter(Boolean);
  for (const collection of stateCollections) {
    for (const field of ["before", "expected", "observed", "requested"]) {
      if (collection[field] && typeof collection[field] === "object") {
        mutate(collection[field]);
      }
    }
  }
  for (const field of ["oracleAfter", "oracleBefore"]) {
    mutate(receipt.action[field]);
  }
  receipt.action.expectedActionReceipt = structuredClone(
    receipt.productActionReceipt,
  );
  synchronizeG04RuntimeAction(receipt);
}

function setG04ModeAndOperation(receipt, mode, evaluatedOperation) {
  mutateEveryG04DomainState(receipt, (state) => {
    state.mode = mode;
    state.evaluatedOperation = evaluatedOperation;
  });
  receipt.mode = mode;
  receipt.evaluatedOperation = evaluatedOperation;
  receipt.runtimeSignature.mode = mode;
  receipt.runtimeSignature.evaluatedOperation = evaluatedOperation;
  receipt.runtimeSignature.visual.visibleReceipts[0].attributes[
    "data-viz-visible-receipt"
  ] = mode === "estimate" ? "estimate" : "arithmetic";
  synchronizeG04RuntimeAction(receipt);
  synchronizeG04ConfiguredState(receipt);
}

function setG04ConfiguredState(receipt, configuredState) {
  receipt.configuredState = configuredState;
  receipt.runtimeSignature.configuredState = configuredState;
  receipt.runtimeSignature.semanticState = configuredState;
}

function normalizeFixtureRational(numerator, denominator) {
  const absolute = (value) => value < 0n ? -value : value;
  let left = absolute(numerator);
  let right = absolute(denominator);
  while (right !== 0n) [left, right] = [right, left % right];
  const divisor = left === 0n ? 1n : left;
  const sign = denominator < 0n ? -1n : 1n;
  return {
    denominator: absolute(denominator / divisor),
    numerator: numerator === 0n ? 0n : sign * (numerator / divisor),
  };
}

function g04FixtureResult(state) {
  const left = {
    denominator: BigInt(state.leftDenominator),
    numerator: BigInt(state.leftNumerator),
  };
  const right = {
    denominator: BigInt(state.rightDenominator),
    numerator: BigInt(state.rightNumerator),
  };
  if (["add", "subtract", "compare"].includes(state.evaluatedOperation)) {
    const direction = state.evaluatedOperation === "add" ? 1n : -1n;
    return normalizeFixtureRational(
      left.numerator * right.denominator +
        direction * right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  }
  if (state.evaluatedOperation === "multiply") {
    return normalizeFixtureRational(
      left.numerator * right.numerator,
      left.denominator * right.denominator,
    );
  }
  if (state.evaluatedOperation === "divide") {
    return normalizeFixtureRational(
      left.numerator * right.denominator,
      left.denominator * right.numerator,
    );
  }
  return normalizeFixtureRational(left.numerator, left.denominator);
}

function synchronizeG04ConfiguredState(receipt) {
  const state = receipt.domain.observed;
  const result = g04FixtureResult(state);
  const labId = receipt.configuredState.match(/(?:^|\|)lab=([^|]+)/u)?.[1] ??
    focusedLabIds.G04;
  setG04ConfiguredState(
    receipt,
    [
      "fraction-operations-v2",
      `lab=${labId}`,
      `mode=${state.mode}`,
      `evaluated=${state.evaluatedOperation}`,
      `left=${state.leftNumerator}/${state.leftDenominator}`,
      `right=${state.rightNumerator}/${state.rightDenominator}`,
      `result=${result.numerator}/${result.denominator}`,
    ].join("|"),
  );
}

function writeFocusedPayloadEntries(entries) {
  for (const { attachment, payload } of entries) {
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
}

function repinFocusedDescriptors(activeContract, entries, groupId) {
  let pinnedSha = null;
  for (const entry of entries) {
    entry.payload.plannedStateDescriptors = entry.payload.receipts.map((receipt) =>
      focusedStateDescriptor(groupId, receipt)
    );
    const currentSha = descriptorPlanSha256(entry.payload.plannedStateDescriptors);
    if (pinnedSha === null) pinnedSha = currentSha;
    assert.equal(currentSha, pinnedSha, `${groupId} descriptor plans must match by project`);
    entry.payload.expectedStateDescriptorPlanSha256 = currentSha;
    entry.payload.observedStateDescriptorPlanSha256 = currentSha;
  }
  activeContract.groups[0].stateDescriptorPlanSha256 = pinnedSha;
  writeFocusedPayloadEntries(entries);
}

function rewriteG04Operation(value, operation) {
  if (Array.isArray(value)) {
    value.forEach((entry) => rewriteG04Operation(entry, operation));
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "evaluatedOperation" || key === "mode") && child === "add") {
      value[key] = operation;
    } else {
      rewriteG04Operation(child, operation);
    }
  }
}

function producerShapedG04UnsupportedFixture() {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  const labId = "bnu-primary-p5-lower-fraction-multiplication";
  const interpretations = [
    ["multiplication-area-interpretation", "area-grid"],
    ["multiplication-repeated-group-interpretation", "part-of-quantity"],
    ["multiplication-scaling-interpretation", "scaling"],
  ];
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.stateId = `${labId}:${receipt.stateId.slice(receipt.stateId.indexOf(":") + 1)}`;
      receipt.collision.phase = receipt.stateId;
      setG04ConfiguredState(
        receipt,
        receipt.configuredState.replace(
          /(?:^|\|)lab=[^|]+/u,
          `|lab=${labId}`,
        ),
      );
      const resetControl = receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-reset-model"] === "true",
      );
      resetControl.attributes["data-viz-reset-topic-id"] = labId;
      rewriteG04Operation(receipt, "multiply");
      synchronizeG04ConfiguredState(receipt);
      setG04RuntimeModes(receipt, ["multiply", "simplify", "estimate"]);
      const supported = interpretations.slice(0, 2).map(([, kind]) => ({
        kind,
        markCount: 2,
        receipt: { kind, status: "supported" },
        status: "supported",
      }));
      receipt.collision.svgSurfaceCount = supported.length;
      receipt.visual = {
        expectedInterpretations: interpretations.map(([name]) => name),
        supported,
        unsupported: [{
          kind: "scaling",
          reason: "negative-magnitude-not-painted",
        }],
      };
      receipt.runtimeSignature.visual = {
        geometry: supported.map((item) => ({
          attributes: {
            "data-viz-fraction-visual": item.kind,
            "data-viz-geometry-receipt": JSON.stringify(item.receipt),
            "data-viz-painted-mark-count": String(item.markCount),
          },
          text: "",
        })),
        interpretations: interpretations.map(([name], index) => ({
          attributes: index < 2
            ? {
                "data-viz-interpretation-status": "supported",
                "data-viz-name": name,
              }
            : {
                "data-viz-interpretation-status": "unsupported",
                "data-viz-name": name,
                "data-viz-unsupported-reason": "negative-magnitude-not-painted",
              },
          text: "",
        })),
        visibleReceipts: [{
          attributes: { "data-viz-visible-receipt": "arithmetic" },
          text: "",
        }],
      };
      synchronizeG04RuntimeAction(receipt);
    }
    entry.payload.plannedStateIds = entry.payload.receipts.map(({ stateId }) => stateId);
    entry.payload.expectedStatePlanSha256 = createHash("sha256")
      .update(`${entry.payload.plannedStateIds.join("\n")}\n`)
      .digest("hex");
  }
  activeContract.groups[0].statePlanSha256 = entries[0].payload.expectedStatePlanSha256;
  repinFocusedDescriptors(activeContract, entries, "G04");
  return { activeContract, activeReport };
}

test("mutation 27 accepts the producer-shaped G04 unsupported interpretation receipt", async () => {
  const fixture = producerShapedG04UnsupportedFixture();
  const summary = await validateMainlandFocusedVisualizationReport(
    fixture.activeReport,
    reportPath,
    fixture.activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);
});

test("mutation 28 rejects unbound observations and duplicate accumulated audit identities", async () => {
  const mutations = [
    (processReceipt) => {
      const thirdObservation = {
        browserPid: 41_003,
        mutablePaths: [
          {
            flag: "crash-dumps-dir",
            path: pathManifest.paths.crashDumpDir,
            pid: 41_003,
          },
          {
            flag: "user-data-dir",
            path: `${pathManifest.paths.browserTempDir}/profile-c`,
            pid: 41_003,
          },
        ],
        processCount: 2,
        userDataDir: `${pathManifest.paths.browserTempDir}/profile-c`,
      };
      processReceipt.observations.push(thirdObservation);
      processReceipt.processMutablePathAudit.push(
        { ...thirdObservation.mutablePaths[0], processKind: "browser-main" },
      );
    },
    (processReceipt) => {
      processReceipt.processMutablePathAudit.push(
        structuredClone(processReceipt.processMutablePathAudit[0]),
      );
    },
  ];
  for (const mutate of mutations) {
    const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
    mutate(processReceipt);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        report(),
        reportPath,
        contract,
        validationOptions({
          [browserProcessEvidencePath]: JSON.stringify(processReceipt),
        }),
      ),
      /browser process.*(profile|observation|audit|identity|duplicate|bound)/su,
    );
  }
});

function setFocusedPlannedRequest(receipt, groupId, request) {
  receipt.action.plannedRequest = structuredClone(request);
  if (groupId === "G03") {
    receipt.action.receipt.request = structuredClone(request);
    receipt.action.receipt.requested.pendingRequest = structuredClone(request);
    return;
  }
  if (groupId === "G04") {
    receipt.productActionReceipt.request = structuredClone(request);
    receipt.action.expectedActionReceipt.request = structuredClone(request);
    if (receipt.action.plannerReceipt) {
      receipt.action.plannerReceipt.request = structuredClone(request);
    }
    synchronizeG04RuntimeAction(receipt);
    return;
  }
  if (groupId === "G06") {
    receipt.productAction.request = structuredClone(request);
    const runtime = JSON.parse(receipt.runtimeSignature);
    runtime.actionRequest = JSON.stringify(request);
    runtime.actionReceipt = JSON.stringify(receipt.productAction);
    receipt.runtimeSignature = JSON.stringify(runtime);
  }
}

test("mutation 29 rejects group-incompatible or ambiguous request identity aliases", async () => {
  const mutations = [
    ["G03", { controlId: "value", kind: "control", value: 1 }],
    ["G04", { control: "value", kind: "control", value: 1 }],
    ["G05", { control: "value", kind: "control", value: 1 }],
    ["G06", { control: "value", kind: "control", value: 1 }],
    ["G03", { controller: "mode", controllerId: "mode", kind: "controller", value: "add" }],
    ["G04", { controller: "mode", evaluatedOperation: "add", kind: "controller", mode: "add" }],
    ["G05", { controller: "mode", controllerId: "mode", kind: "controller", value: "find-part" }],
    ["G06", { controller: "mode", controllerId: "mode", kind: "controller", value: "direct-proportion" }],
  ];
  for (const [groupId, request] of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        setFocusedPlannedRequest(receipt, groupId, request);
      }
    }
    repinFocusedDescriptors(activeContract, entries, groupId);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*(request|control|controller|identity|alias)`, "su"),
    );
  }
});

function mutatedG03GeometryFixture(mutatePoint = () => {}) {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      mutatePoint(receipt.geometry[1], receipt.geometry[0]);
    }
  }
  writeFocusedPayloadEntries(entries);
  return { activeContract, activeReport };
}

test("mutation 30 enforces G03 semantic identity and exact-key colocation invariants", async () => {
  const positive = focusedGroupFixture("G03");
  const summary = await validateMainlandFocusedVisualizationReport(
    positive.activeReport,
    reportPath,
    positive.activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);

  for (const mutate of [
    (second) => { second.marker = false; },
    (second) => { second.owner = "different-owner"; },
    (second, first) => { second.semanticId = first.semanticId; },
  ]) {
    const broken = mutatedG03GeometryFixture(mutate);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        broken.activeReport,
        reportPath,
        broken.activeContract,
        validationOptions(),
      ),
      /G03.*geometry.*(semantic|marker|owner|identity|colocat)/su,
    );
  }
});

test("mutation 35 reconstructs the exact G03 action geometry-owner ledger", async () => {
  for (const [field, value] of [
    ["exactKey", "forged-exact-key"],
    ["owner", "forged-owner"],
    ["marker", false],
    ["semanticId", "forged-semantic-id"],
  ]) {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const entries = focusedPayloadEntries(activeReport);
    entries[0].payload.receipts[0].geometry[0][field] = value;
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G03.*geometry.*(action|owner|ledger|signature|semantic|marker|exact)/su,
    );
  }
});

test("mutation 43 derives every G03 pixel coordinate from the exact configured state", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const primary = receipt.geometry.find(({ semanticId }) => semanticId === "primary");
      assert.ok(primary, "producer-shaped G03 fixture must expose the primary point");
      primary.lower = 999;
      primary.rendered = 999;
      primary.upper = 999;
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G03.*geometry.*(configured|derived|pixel|position|state)/su,
  );
});

test("mutation 36 enforces the exact G04 production domain-state contract", async () => {
  const mutations = [
    (receipt) => mutateEveryG04DomainState(receipt, (state) => {
      state.unmodeled = "forged";
    }),
    (receipt) => mutateEveryG04DomainState(receipt, (state) => {
      state.leftNumerator = Number.MAX_SAFE_INTEGER + 1;
    }),
    (receipt) => mutateEveryG04DomainState(receipt, (state) => {
      state.leftDenominator = 25;
    }),
    (receipt) => setG04ModeAndOperation(receipt, "estimate", "equivalence"),
    (receipt) => {
      for (const state of [
        receipt.domain.requested,
        receipt.productActionReceipt.requested,
        receipt.action.beforeDomain.requested,
        receipt.action.plannerReceipt.requested,
        receipt.runtimeSignature.domain.requested,
      ]) {
        state.mode = "divide";
        state.evaluatedOperation = "divide";
        state.rightNumerator = 0;
      }
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      synchronizeG04RuntimeAction(receipt);
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) mutate(receipt);
    }
    repinFocusedDescriptors(activeContract, entries, "G04");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*(domain|state|mode|operation|integer|denominator|unmodel)/su,
    );
  }
});

test("mutation 37 binds the complete G04 before-state and planner receipt", async () => {
  const mutations = [
    (receipt) => { receipt.action.beforeDomain.status = "failed"; },
    (receipt) => {
      receipt.action.plannerReceipt.request = {
        controlId: "right-numerator",
        kind: "control",
        value: 7,
      };
    },
    (receipt) => { receipt.action.plannerReceipt.domainId = "forged-domain"; },
    (receipt) => { receipt.action.plannerReceipt.domainVersion = 2; },
    (receipt) => { receipt.action.plannerReceipt.status = "failed"; },
    (receipt) => { receipt.action.beforeControls[0].value = "999"; },
    (receipt) => { receipt.action.oracleBefore.leftNumerator = 999; },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*(before|planner|request|domain|version|control|oracle|unmodel|key)/su,
    );
  }
});

test("mutation 38 reconstructs every G04 runtime parameter, mode, and reset control", async () => {
  const mutations = [
    (receipt) => {
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "left-numerator",
      ).value = "999";
    },
    (receipt) => {
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "left-denominator",
      ).attributes.max = "25";
    },
    (receipt) => {
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "right-denominator",
      ).attributes.step = "2";
    },
    (receipt) => {
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "right-numerator",
      ).attributes.type = "text";
    },
    (receipt) => {
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "left-numerator",
      ).options.push({ disabled: false, value: "forged" });
    },
    (receipt) => {
      receipt.runtimeSignature.controls[0].attributes[
        "data-viz-range-projection"
      ] = "forged";
    },
    (receipt) => {
      receipt.runtimeSignature.controls.push({
        attributes: { "data-viz-unknown-control": "true" },
        disabled: false,
        options: [],
        tagName: "input",
        text: "",
        value: "1",
      });
    },
    (receipt) => {
      receipt.runtimeSignature.controls[0].attributes["data-viz-mode"] = "forged-mode";
    },
    (receipt) => {
      const reset = receipt.runtimeSignature.controls.at(-1);
      reset.attributes["data-viz-reset-module-id"] = "forged-module";
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*runtime.*(control|parameter|mode|reset|value|bound|metadata|unknown)/su,
    );
  }
});

test("mutation 44 rejects a coherently repinned G04 numeric value outside its production control range", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      mutateEveryG04DomainState(receipt, (state) => {
        state.leftNumerator = 49;
      });
      for (const controls of [
        receipt.controls,
        receipt.action.beforeControls,
        receipt.action.observedControls,
      ]) {
        controls.find(({ parameter }) => parameter === "left-numerator").value = "49";
      }
      receipt.runtimeSignature.controls.find(
        (control) => control.attributes["data-viz-parameter"] === "left-numerator",
      ).value = "49";
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(numerator|numeric|control|range|-48\.\.48)/su,
  );
});

function everyG05State(receipt) {
  return [
    ...[receipt.domain, receipt.action.beforeDomain, receipt.action.expectedDomain, receipt.runtimeSignature.domain]
      .flatMap((domain) => [domain.requested, domain.expected, domain.observed]),
    receipt.action.before.state,
    receipt.action.expected.state,
    receipt.action.observed.state,
    receipt.runtimeSignature.configuredState,
    receipt.runtimeSignature.semanticState,
  ];
}

function everyG05Controls(receipt) {
  return [
    receipt.controls,
    receipt.action.before.controls,
    receipt.action.expected.controls,
    receipt.action.observed.controls,
    receipt.runtimeSignature.controls,
  ];
}

function g05FixtureControls(state) {
  const parameterFields = {
    amount: "amount",
    base: "base",
    "new-value": "newValue",
  };
  const parameters = {
    convert: ["rate-basis-points"],
    decrease: ["base", "rate-basis-points"],
    discount: ["base", "rate-basis-points"],
    "find-part": ["base", "rate-basis-points"],
    "find-whole": ["amount", "rate-basis-points"],
    increase: ["base", "rate-basis-points"],
    inverse: ["new-value", "rate-basis-points"],
  }[state.mode];
  return parameters.map((parameter) => {
    const rate = parameter === "rate-basis-points";
    const value = rate ? state.rateBasisPoints : state[parameterFields[parameter]];
    return {
      disabled: false,
      max: rate
        ? state.mode === "decrease" || state.mode === "discount"
          ? 10_000
          : state.mode === "inverse" && state.inverseDirection === "decrease"
            ? 9_999
            : 50_000
        : 1_000_000,
      min: rate && state.mode === "find-whole" ? 1 : 0,
      parameter,
      step: 1,
      value: String(value),
    };
  });
}

function producerShapedG05VisualFixture({
  labId = focusedLabIds.G05,
  markCount,
  mode,
  rateBasisPoints = 1_500,
  receipt: visualReceipt,
  status = "supported",
  stateOverrides = {},
  visualKind,
}) {
  const fixture = focusedGroupFixture("G05");
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const state = {
        amount: 36,
        base: 240,
        inverseDirection: "increase",
        labId,
        mode,
        newValue: 120,
        rateBasisPoints,
        ...stateOverrides,
      };
      for (const observedState of everyG05State(receipt)) {
        Object.assign(observedState, structuredClone(state));
      }
      const controls = g05FixtureControls(state);
      for (const observedControls of everyG05Controls(receipt)) {
        observedControls.splice(0, observedControls.length, ...structuredClone(controls));
      }
      for (const signature of [
        receipt.action.before,
        receipt.action.expected,
        receipt.action.observed,
      ]) {
        signature.mode = mode;
        signature.inverseDirection = state.inverseDirection;
      }
      receipt.runtimeSignature.mode = mode;
      receipt.runtimeSignature.inverseDirection = state.inverseDirection;
      receipt.stateId = `${labId}:${receipt.stateId.slice(receipt.stateId.indexOf(":") + 1)}`;
      if (status === "supported") {
        receipt.visual = {
          kind: visualKind,
          markCount,
          receipt: structuredClone(visualReceipt),
          status,
        };
        receipt.runtimeSignature.visual = [
          {
            geometryReceipt: null,
            kind: null,
            markCount: null,
            visibleReceipt: visualKind,
          },
          {
            geometryReceipt: JSON.stringify(visualReceipt),
            kind: visualKind,
            markCount: String(markCount),
            visibleReceipt: null,
          },
        ];
        receipt.collision.paintedMarkCount = markCount;
        receipt.collision.inspectedCandidateCount =
          receipt.collision.htmlTextFragmentCount +
          receipt.collision.learnerControlCount +
          receipt.collision.svgTextFragmentCount +
          markCount;
        receipt.collision.phase = receipt.stateId;
      } else {
        receipt.visual = { kind: visualKind, status: "unsupported" };
        receipt.runtimeSignature.visual = [
          {
            geometryReceipt: null,
            kind: null,
            markCount: null,
            visibleReceipt: visualKind,
          },
          {
            geometryReceipt: null,
            kind: "unsupported",
            markCount: null,
            visibleReceipt: null,
          },
        ];
        receipt.collision = {
          inspectedCandidateCount: 4,
          learnerControlCount: 2,
          status: "unsupported-zero-area-explicit-owner",
          totalCandidatePairCount: 6,
        };
      }
    }
    entry.payload.plannedStateIds = entry.payload.receipts.map(({ stateId }) => stateId);
    entry.payload.expectedStatePlanSha256 = createHash("sha256")
      .update(`${entry.payload.plannedStateIds.join("\n")}\n`)
      .digest("hex");
  }
  fixture.activeContract.groups[0].statePlanSha256 =
    entries[0].payload.expectedStatePlanSha256;
  repinFocusedDescriptors(fixture.activeContract, entries, "G05");
  return fixture;
}

const producerShapedG05VisualCases = Object.freeze([
  Object.freeze({
    labId: "pep-primary-p6-upper-percent-fractions",
    markCount: 101,
    mode: "convert",
    rateBasisPoints: 1_250,
    receipt: Object.freeze({
      decimal: "0.125",
      filledWholeCells: 12,
      fraction: "1/8",
      gridCount: 1,
      kind: "conversion",
      partialCellBasisPoints: 50,
      percentText: "12.5%",
      status: "supported",
      totalCells: 100,
    }),
    visualKind: "conversion",
  }),
  Object.freeze({
    markCount: 2,
    mode: "find-part",
    receipt: Object.freeze({
      kind: "find-part",
      part: "36/1",
      rate: "3/20",
      reconstruction: "36/1",
      status: "supported",
      whole: "240/1",
    }),
    visualKind: "find-part",
  }),
  Object.freeze({
    markCount: 2,
    mode: "find-whole",
    receipt: Object.freeze({
      kind: "find-whole",
      knownPart: "36/1",
      rate: "3/20",
      reconstruction: "36/1",
      status: "supported",
      whole: "240/1",
    }),
    visualKind: "find-whole",
  }),
  Object.freeze({
    markCount: 3,
    mode: "increase",
    receipt: Object.freeze({
      absoluteChange: "36/1",
      direction: "increase",
      kind: "percent-change",
      multiplier: "23/20",
      newValue: "276/1",
      original: "240/1",
      reconstruction: "276/1",
      status: "supported",
    }),
    visualKind: "percent-change",
  }),
  Object.freeze({
    markCount: 3,
    mode: "discount",
    receipt: Object.freeze({
      discountAmount: "36/1",
      discountRate: "3/20",
      kind: "discount",
      originalPrice: "240/1",
      reconstruction: "240/1",
      salePrice: "204/1",
      status: "supported",
    }),
    visualKind: "discount",
  }),
  Object.freeze({
    markCount: 3,
    mode: "inverse",
    receipt: Object.freeze({
      direction: "increase",
      forwardCheck: "120/1",
      kind: "inverse",
      multiplier: "23/20",
      observedNewValue: "120/1",
      original: "2400/23",
      status: "supported",
    }),
    visualKind: "inverse",
  }),
]);

test("producer contract 53 accepts all six exact G05 visual families and zero unsupported", async () => {
  for (const visualCase of producerShapedG05VisualCases) {
    const fixture = producerShapedG05VisualFixture(visualCase);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4);
  }
  const unsupported = producerShapedG05VisualFixture({
    markCount: 0,
    mode: "find-part",
    receipt: null,
    stateOverrides: { base: 0 },
    status: "unsupported",
    visualKind: "find-part",
  });
  const summary = await validateMainlandFocusedVisualizationReport(
    unsupported.activeReport,
    reportPath,
    unsupported.activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);
});

test("mutation 45a rejects a coherently repinned G05 mode outside the exact topic allowlist", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      for (const state of everyG05State(receipt)) state.mode = "convert";
      for (const signature of [receipt.action.before, receipt.action.expected, receipt.action.observed]) {
        signature.mode = "convert";
        signature.controls = [
          { disabled: false, max: 50_000, min: 0, parameter: "rate-basis-points", step: 1, value: "1500" },
        ];
      }
      receipt.controls = structuredClone(receipt.action.expected.controls);
      receipt.runtimeSignature.controls = structuredClone(receipt.controls);
      receipt.runtimeSignature.mode = "convert";
      receipt.visual.kind = "conversion";
      receipt.visual.receipt.kind = "conversion";
      receipt.runtimeSignature.visual[0].visibleReceipt = "conversion";
      receipt.runtimeSignature.visual[1].kind = "conversion";
      receipt.runtimeSignature.visual[1].geometryReceipt = JSON.stringify(receipt.visual.receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G05");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G05.*(topic|lab|allowlist|mode)/su,
  );
});

test("mutation 45b rejects a coherently duplicated G05 surplus numeric control", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      for (const controls of everyG05Controls(receipt)) {
        controls.push({
          disabled: false,
          max: 1_000_000,
          min: 0,
          parameter: "amount",
          step: 1,
          value: "36",
        });
      }
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G05.*(control|parameter|surplus|exact)/su,
  );
});

test("mutation 45c binds the exact G05 request to the resulting domain state", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.action.plannedRequest = { controlId: "base", kind: "control", value: 999 };
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G05");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G05.*(request|result|state|domain|base)/su,
  );
});

test("mutation 46a reconstructs every G06 rational visual field from the observed domain", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.visual.receipt.constantK.first = "999/1";
      const runtime = JSON.parse(receipt.runtimeSignature);
      const runtimeReceipt = JSON.parse(runtime.geometry[0].receipt);
      runtimeReceipt.constantK.first = "999/1";
      runtime.geometry[0].receipt = JSON.stringify(runtimeReceipt);
      receipt.runtimeSignature = JSON.stringify(runtime);
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G06.*(visual|constantK|rational|domain|reconstruct)/su,
  );
});

test("mutation 46b binds an exact G06 control request to its result state", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setFocusedPlannedRequest(
        receipt,
        "G06",
        { controlId: "ratio-a", kind: "control", value: 999 },
      );
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G06");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G06.*(request|result|state|ratioA|domain)/su,
  );
});

test("mutation 46c rejects a coherent surplus G06 control outside the mode schema", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G06");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const surplus = {
        disabled: false,
        kind: "range",
        max: 10_000,
        min: 1,
        options: [],
        parameter: "drawing-length",
        step: 1,
        value: "5",
      };
      receipt.controls.push(surplus);
      const runtime = JSON.parse(receipt.runtimeSignature);
      runtime.controls.push(structuredClone(surplus));
      receipt.runtimeSignature = JSON.stringify(runtime);
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G06.*(control|parameter|mode|schema|surplus)/su,
  );
});

test("mutation 47 binds every full collision receipt to the producer-emitted state phase", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) receipt.collision.phase = "forged-phase";
    }
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
      new RegExp(`${groupId}.*collision.*phase`, "su"),
    );
  }
});

test("mutation 47b rejects surplus fields in every full producer collision receipt", async () => {
  for (const groupId of ["G03", "G04", "G05", "G06"]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) receipt.collision.forged = true;
    }
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
      new RegExp(`${groupId}.*collision.*(key|shape|exact|surplus)`, "su"),
    );
  }
});

test("mutation 48a rejects surplus keys in every coherently repinned G03 action request", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setFocusedPlannedRequest(receipt, "G03", {
        forged: true,
        kind: "initial",
        topicId: "bnu-junior-s1-upper-rational-numbers",
      });
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G03");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G03.*request.*(key|shape|exact|surplus)/su,
  );
});

test("mutation 48b binds the G03 initial/reset topic identity to the exact action state", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setFocusedPlannedRequest(receipt, "G03", { kind: "initial", topicId: "forged-topic" });
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G03");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G03.*(request|topic|lab|identity)/su,
  );
});

test("mutation 48c rejects an accepted G03 control request that produced no requested value", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setFocusedPlannedRequest(
        receipt,
        "G03",
        { control: "value-numerator", kind: "control", value: 999 },
      );
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G03");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G03.*(request|control|result|value|state)/su,
  );
});

test("mutation 48d binds the G03 requested snapshot to the exact before state plus pending request", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.action.receipt.requested.input.precision = 6;
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G03");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(activeReport, reportPath, activeContract, validationOptions()),
    /G03.*requested.*(before|state|snapshot|pending)/su,
  );
});

test("mutation 39 rejects every unmodeled field in G05 domain receipts", async () => {
  const mutations = [
    (receipt) => { receipt.action.beforeDomain.status = "failed"; },
    (receipt) => { receipt.action.beforeDomain.unmodeled = true; },
    (receipt) => {
      receipt.domain.unmodeled = true;
      receipt.action.expectedDomain.unmodeled = true;
      receipt.runtimeSignature.domain.unmodeled = true;
    },
    (receipt) => {
      for (const domain of [
        receipt.domain,
        receipt.action.beforeDomain,
        receipt.action.expectedDomain,
        receipt.runtimeSignature.domain,
      ]) {
        domain.observed.unmodeled = true;
        domain.expected.unmodeled = true;
        domain.requested.unmodeled = true;
      }
      receipt.runtimeSignature.configuredState.unmodeled = true;
      receipt.runtimeSignature.semanticState.unmodeled = true;
      receipt.action.before.state.unmodeled = true;
      receipt.action.expected.state.unmodeled = true;
      receipt.action.observed.state.unmodeled = true;
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G05.*[Dd]omain.*(key|status|unmodel|state)/su,
    );
  }
});

function synchronizeG06Runtime(receipt) {
  const runtime = JSON.parse(receipt.runtimeSignature);
  Object.assign(runtime, {
    actionBefore: JSON.stringify(receipt.productAction.before),
    actionExpected: JSON.stringify(receipt.productAction.expected),
    actionObserved: JSON.stringify(receipt.productAction.observed),
    actionReceipt: JSON.stringify(receipt.productAction),
    actionRequested: JSON.stringify(receipt.productAction.requested),
    domainId: receipt.domain.domainId,
    expected: JSON.stringify(receipt.domain.expected),
    mode: receipt.configuredState.mode,
    observed: JSON.stringify(receipt.domain.observed),
    requested: JSON.stringify(receipt.domain.requested),
    semanticState: JSON.stringify(receipt.configuredState),
    state: JSON.stringify(receipt.configuredState),
  });
  receipt.runtimeSignature = JSON.stringify(runtime);
}

function mutateEveryG06State(receipt, mutate) {
  for (const state of [
    receipt.configuredState,
    receipt.domain.requested,
    receipt.domain.expected,
    receipt.domain.observed,
    receipt.action.before,
    receipt.action.expectedState,
    receipt.productAction.before,
    receipt.productAction.requested,
    receipt.productAction.expected,
    receipt.productAction.observed,
  ]) {
    mutate(state);
  }
  synchronizeG06Runtime(receipt);
}

function repinG06Mode(receipt, mode) {
  mutateEveryG06State(receipt, (state) => { state.mode = mode; });
  receipt.domain.domainId = `ratio-proportion-scale-${mode}-v1`;
  receipt.visual.kind = mode;
  receipt.visual.markCount = 3;
  receipt.visual.receipt.kind = mode;
  const runtime = JSON.parse(receipt.runtimeSignature);
  runtime.domainId = receipt.domain.domainId;
  runtime.mode = mode;
  runtime.geometry[0].kind = mode;
  runtime.geometry[0].marks = "3";
  const geometryReceipt = JSON.parse(runtime.geometry[0].receipt);
  geometryReceipt.kind = mode;
  runtime.geometry[0].receipt = JSON.stringify(geometryReceipt);
  receipt.runtimeSignature = JSON.stringify(runtime);
}

test("mutation 40 enforces the exact G06 production state and visual identity", async () => {
  const mutations = [
    (receipt) => repinG06Mode(receipt, "forged-mode"),
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      const geometryReceipt = JSON.parse(runtime.geometry[0].receipt);
      geometryReceipt.unmodeled = "runtime-only";
      runtime.geometry[0].receipt = JSON.stringify(geometryReceipt);
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
    (receipt) => { receipt.visual.unmodeled = true; },
    (receipt) => mutateEveryG06State(receipt, (state) => {
      state.unmodeled = true;
    }),
    (receipt) => mutateEveryG06State(receipt, (state) => {
      state.ratioA = 10_001;
    }),
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) mutate(receipt);
    }
    repinFocusedDescriptors(activeContract, entries, "G06");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G06.*(mode|state|visual|geometry|receipt|safe|range|key|unmodel)/su,
    );
  }
});

test("mutation 41 closes browser observations, mutable paths, and main-PID audit kinds", async () => {
  const mutations = [
    (processReceipt) => { processReceipt.observations[0].status = "failed"; },
    (processReceipt) => { processReceipt.observations[0].violation = "forged"; },
    (processReceipt) => { processReceipt.observations[0].mutablePaths[0].status = "failed"; },
    (processReceipt) => { processReceipt.processMutablePathAudit[0].violation = "forged"; },
    (processReceipt) => { processReceipt.processMutablePathAudit[0].processKind = "descendant"; },
  ];
  for (const mutate of mutations) {
    const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
    mutate(processReceipt);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        report(),
        reportPath,
        contract,
        validationOptions({
          [browserProcessEvidencePath]: JSON.stringify(processReceipt),
        }),
      ),
      /browser process.*(observation|mutable|audit|main|processKind|key|status|violation)/su,
    );
  }

  for (const mutate of [
    (profileReceipt) => { profileReceipt.observed.status = "failed"; },
    (profileReceipt) => { profileReceipt.observed.mutablePaths[0].violation = "forged"; },
  ]) {
    const profileReceipt = JSON.parse(artifactMap().get(browserProfileEvidencePath));
    mutate(profileReceipt);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        report(),
        reportPath,
        contract,
        validationOptions({
          [browserProfileEvidencePath]: JSON.stringify(profileReceipt),
        }),
      ),
      /browser profile.*(observation|mutable|key|status|violation)/su,
    );
  }
});

test("mutation 42 accepts three current observations backed by an accumulated historical audit", async () => {
  const processReceipt = JSON.parse(artifactMap().get(browserProcessEvidencePath));
  const thirdObservation = {
    browserPid: 41_003,
    mutablePaths: [
      {
        flag: "crash-dumps-dir",
        path: pathManifest.paths.crashDumpDir,
        pid: 41_003,
      },
      {
        flag: "user-data-dir",
        path: `${pathManifest.paths.browserTempDir}/profile-c`,
        pid: 41_003,
      },
    ],
    processCount: 3,
    userDataDir: `${pathManifest.paths.browserTempDir}/profile-c`,
  };
  processReceipt.observations.push(thirdObservation);
  processReceipt.processMutablePathAudit.push(
    ...thirdObservation.mutablePaths.map((entry) => ({
      ...entry,
      processKind: "browser-main",
    })),
    {
      flag: "crash-dumps-dir",
      path: pathManifest.paths.crashDumpDir,
      pid: 40_999,
      processKind: "crashpad",
    },
  );
  const summary = await validateMainlandFocusedVisualizationReport(
    report(),
    reportPath,
    contract,
    validationOptions({
      [browserProcessEvidencePath]: JSON.stringify(processReceipt),
    }),
  );
  assert.equal(summary.status, "inner-report-passed");
  assert.equal(summary.releaseReady, false);
});

test("mutation 31 requires one G06 geometry with exact mode-derived safe-integer marks", async () => {
  const mutations = [
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      runtime.geometry.push(structuredClone(runtime.geometry[0]));
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      runtime.geometry[0].marks = "Infinity";
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      runtime.geometry[0].marks = "4";
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
    (receipt) => { receipt.visual.markCount = 4; },
    (receipt) => { receipt.visual.markCount = 0.5; },
    (receipt) => {
      const runtime = JSON.parse(receipt.runtimeSignature);
      runtime.geometry[0].marks = [5];
      receipt.runtimeSignature = JSON.stringify(runtime);
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G06");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G06.*(geometry|mark|visual|safe|integer|mode)/su,
    );
  }
});

test("mutation 32 reconstructs the exact G05 runtime visual and before-domain evidence", async () => {
  const positive = focusedGroupFixture("G05");
  const summary = await validateMainlandFocusedVisualizationReport(
    positive.activeReport,
    reportPath,
    positive.activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);

  const mutations = [
    (receipt) => { receipt.runtimeSignature.visual = [{}]; },
    (receipt) => { receipt.runtimeSignature.visual[1].kind = "discount"; },
    (receipt) => {
      receipt.runtimeSignature.visual.push(structuredClone(receipt.runtimeSignature.visual[0]));
    },
    (receipt) => { receipt.runtimeSignature.visual.shift(); },
    (receipt) => { receipt.runtimeSignature.visual[1].geometryReceipt = "{}"; },
    (receipt) => { receipt.runtimeSignature.visual[1].markCount = "02"; },
    (receipt) => { receipt.action.beforeDomain = {}; },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G05.*(runtime|visual|geometry|mark|beforeDomain|before domain|domain)/su,
    );
  }
});

test("mutation 33 reconstructs the complete G04 runtime action, controls, and domain", async () => {
  const positive = focusedGroupFixture("G04");
  const summary = await validateMainlandFocusedVisualizationReport(
    positive.activeReport,
    reportPath,
    positive.activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);

  const mutations = [
    (receipt) => { delete receipt.runtimeSignature.action; },
    (receipt) => { delete receipt.runtimeSignature.action["data-viz-action-request"]; },
    (receipt) => { receipt.runtimeSignature.action["data-viz-action-status"] = "failed"; },
    (receipt) => {
      receipt.runtimeSignature.controls[0].attributes["data-viz-parameter"] = "stale";
    },
    (receipt) => {
      receipt.runtimeSignature.domain.requested = {
        evaluatedOperation: "multiply",
        mode: "multiply",
        value: 99,
      };
    },
    (receipt) => { receipt.runtimeSignature.domain.rejection = "STALE"; },
    (receipt) => { receipt.runtimeSignature.domain.domainId = "stale-domain"; },
    (receipt) => { receipt.runtimeSignature.domain.domainVersion = "2"; },
    (receipt) => {
      receipt.runtimeSignature.domain.projections.push({
        parameter: "value",
        projection: "stale",
        reason: "stale",
      });
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const entries = focusedPayloadEntries(activeReport);
    mutate(entries[0].payload.receipts[0]);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*(runtime|action|control|domain|projection|version|rejection|requested)/su,
    );
  }

  const fractional = producerShapedG04UnsupportedFixture();
  const fractionalEntries = focusedPayloadEntries(fractional.activeReport);
  fractionalEntries[0].payload.receipts[0].visual.supported[0].markCount = 0.5;
  fractionalEntries[0].payload.receipts[0].runtimeSignature.visual.geometry[0]
    .attributes["data-viz-painted-mark-count"] = "0.5";
  writeFocusedPayloadEntries(fractionalEntries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      fractional.activeReport,
      reportPath,
      fractional.activeContract,
      validationOptions(),
    ),
    /G04.*markCount.*positive integer/su,
  );
});

function producerShapedG04AddSubEstimateFixture() {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setG04ModeAndOperation(receipt, "estimate", "add");
      const request = {
        evaluatedOperation: "add",
        kind: "controller",
        mode: "estimate",
      };
      receipt.productActionReceipt.request = structuredClone(request);
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt.request = structuredClone(request);
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      const estimateControl = {
        affects: ["right-numerator"],
        disabled: false,
        kind: "select",
        max: null,
        min: null,
        options: ["add", "subtract"],
        parameter: "estimate-operation",
        projection: "exclude-zero",
        projectionReason: "division-divisor-cannot-be-zero",
        step: null,
        value: "add",
        zeroExcluded: null,
      };
      receipt.controls.unshift(estimateControl);
      receipt.action.beforeControls.unshift(structuredClone(estimateControl));
      receipt.action.observedControls.unshift(structuredClone(estimateControl));
      receipt.runtimeSignature.controls.splice(1, 0, {
        attributes: {
          "data-viz-domain-controller": "evaluated-operation",
          "data-viz-parameter": "estimate-operation",
          "data-viz-range-affects": "right-numerator",
          "data-viz-range-projection": "exclude-zero",
          "data-viz-range-projection-reason": "division-divisor-cannot-be-zero",
        },
        disabled: false,
        options: estimateControl.options.map((value) => ({ disabled: false, value })),
        tagName: "select",
        text: "Add Subtract",
        value: "add",
      });
      receipt.runtimeSignature.domain.projections = [{
        affects: "right-numerator",
        parameter: "estimate-operation",
        projection: "exclude-zero",
        reason: "division-divisor-cannot-be-zero",
      }];
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G04");
  return { activeContract, activeReport };
}

test("mutation 34 accepts the honest add-sub estimate allowlist without inventing an applied projection", async () => {
  const { activeContract, activeReport } = producerShapedG04AddSubEstimateFixture();
  const summary = await validateMainlandFocusedVisualizationReport(
    activeReport,
    reportPath,
    activeContract,
    validationOptions(),
  );
  assert.equal(summary.stateReceiptCount, 4);
});

test("mutation 62 rejects missing, surplus, reordered, and selected-value-drifted G04 estimate options", async () => {
  const mutations = [
    (options) => options.pop(),
    (options) => options.push("multiply"),
    (options) => options.reverse(),
    (_options, control) => { control.value = "subtract"; },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = producerShapedG04AddSubEstimateFixture();
    const entries = focusedPayloadEntries(activeReport);
    const receipt = entries[0].payload.receipts[0];
    const controls = [
      receipt.controls,
      receipt.action.beforeControls,
      receipt.action.observedControls,
    ];
    for (const collection of controls) {
      const control = collection.find(({ parameter }) =>
        parameter === "estimate-operation"
      );
      mutate(control.options, control);
    }
    const runtimeControl = receipt.runtimeSignature.controls.find(
      (control) => control.attributes["data-viz-parameter"] === "estimate-operation",
    );
    mutate(runtimeControl.options, runtimeControl);
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*(?:estimate-operation|runtime select options|allowlist|control)/su,
    );
  }
});

test("mutation 49 binds G03 and G05 descriptor topics across same-mode labs", async () => {
  for (const [groupId, swappedLabId] of [
    ["G03", "hjb-primary-p6-lower-rational-numbers"],
    ["G05", "pep-primary-p6-upper-percent-fractions"],
  ]) {
    const { activeContract, activeReport } = focusedGroupFixture(groupId);
    const entries = focusedPayloadEntries(activeReport);
    let pinnedSha = null;
    for (const entry of entries) {
      for (const descriptor of entry.payload.plannedStateDescriptors) {
        descriptor.labId = swappedLabId;
      }
      const currentSha = descriptorPlanSha256(entry.payload.plannedStateDescriptors);
      if (pinnedSha === null) pinnedSha = currentSha;
      assert.equal(currentSha, pinnedSha);
      entry.payload.expectedStateDescriptorPlanSha256 = currentSha;
      entry.payload.observedStateDescriptorPlanSha256 = currentSha;
    }
    activeContract.groups[0].stateDescriptorPlanSha256 = pinnedSha;
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      new RegExp(`${groupId}.*(?:plannedStateDescriptors|descriptor).*labId.*(?:stateId|receipt|topic|lab)`, "su"),
    );
  }
});

test("mutation 50 closes every G03 snapshot input and controlState against configured state", async () => {
  const mutations = [
    (snapshot) => { snapshot.input.value.numerator = -4; },
    (snapshot) => { snapshot.controlState.rightRationalNumerator = 999; },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G03");
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        for (const snapshot of [
          receipt.action.receipt.before,
          receipt.action.receipt.requested,
          receipt.action.receipt.expected,
          receipt.action.receipt.observed,
        ]) {
          mutate(snapshot);
        }
      }
    }
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G03.*(?:input|controlState).*(?:configured|reconstruct|exact)/su,
    );
  }
});

test("mutation 51a rejects a coherently mirrored forged G04 exact result", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setG04ConfiguredState(
        receipt,
        receipt.configuredState.replace("result=31/12", "result=999/1"),
      );
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(?:configured|result|rational|reconstruct)/su,
  );
});

test("mutation 51b rejects a G04 state-key lab outside the exact mode allowlist", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setG04ConfiguredState(
        receipt,
        receipt.configuredState.replace(
          "lab=bnu-primary-p5-lower-fraction-add-sub",
          "lab=bnu-primary-p5-lower-fraction-division",
        ),
      );
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(?:lab|topic|allowlist|mode|stateId)/su,
  );
});

test("mutation 51c rejects G04 state-key mode and estimate-operation drift", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      setG04ConfiguredState(
        receipt,
        [
          "fraction-operations-v2",
          "lab=bnu-primary-p5-lower-fraction-add-sub",
          "mode=estimate",
          "evaluated=multiply",
          "left=1/2",
          "right=1/3",
          "result=1/6",
        ].join("|"),
      );
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(?:mode|estimate|operation|configured|domain)/su,
  );
});

test("mutation 52 rejects a coherently mirrored forged G05 rational visual value", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G05");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      receipt.visual.receipt.part = "999/1";
      const runtimeReceipt = JSON.parse(
        receipt.runtimeSignature.visual[1].geometryReceipt,
      );
      runtimeReceipt.part = "999/1";
      receipt.runtimeSignature.visual[1].geometryReceipt = JSON.stringify(runtimeReceipt);
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G05.*(?:visual|part|rational|reconstruct)/su,
  );
});

test("mutation 54 binds exact G05 marks across aggregate, runtime, and collision receipts", async () => {
  const mutations = [
    (receipt) => {
      receipt.collision.paintedMarkCount = 3;
      receipt.collision.inspectedCandidateCount = 9;
    },
    (receipt) => {
      receipt.visual.markCount = 3;
      receipt.runtimeSignature.visual[1].markCount = "3";
      receipt.collision.paintedMarkCount = 3;
      receipt.collision.inspectedCandidateCount = 9;
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G05");
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) mutate(receipt);
    }
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G05.*(?:mark|collision|visual|reconstruct)/su,
    );
  }
});

function g03FixtureControlState(input) {
  let numberKind = "rational";
  let valueSign = 1;
  let valueRadicand = 2;
  let rightRationalNumerator = 1;
  let rightRationalDenominator = 1;
  let rightSurdCoefficientNumerator = 1;
  let rightSurdCoefficientDenominator = 1;
  let rightSurdRadicand = 2;
  const primary = input.mode === "compare"
    ? input.left
    : ["locate", "absolute-value", "radical", "classify", "estimate"].includes(input.mode)
      ? input.value
      : null;
  if (primary) numberKind = primary.kind;
  if ([
    "simplify",
    "estimate-check",
    "radical-add",
    "radical-subtract",
    "radical-multiply",
    "radical-divide",
  ].includes(input.mode)) {
    numberKind = "quadratic-surd";
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    numberKind = "radical";
  }
  if (primary?.kind === "radical") {
    valueSign = primary.sign;
    valueRadicand = primary.radicand;
  } else if (input.mode === "square-root" || input.mode === "cube-root") {
    valueSign = input.radicand < 0 ? -1 : 1;
    valueRadicand = Math.abs(input.radicand);
  } else if (input.mode === "simplify" || input.mode === "estimate-check") {
    valueRadicand = input.value.radicand;
  }
  if (["compare", "multiply", "divide"].includes(input.mode) && input.right.kind === "rational") {
    rightRationalNumerator = input.right.numerator;
    rightRationalDenominator = input.right.denominator;
  }
  if (["radical-add", "radical-subtract", "radical-multiply", "radical-divide"].includes(input.mode)) {
    valueRadicand = input.left.radicand;
    rightSurdCoefficientNumerator = input.right.coefficient.numerator;
    rightSurdCoefficientDenominator = input.right.coefficient.denominator;
    rightSurdRadicand = input.right.radicand;
  }
  return {
    labId: input.labId,
    mode: input.mode,
    numberKind,
    rightRationalDenominator,
    rightRationalNumerator,
    rightSurdCoefficientDenominator,
    rightSurdCoefficientNumerator,
    rightSurdRadicand,
    valueRadicand,
    valueSign,
  };
}

function g03FixturePoint(encoded) {
  if (encoded.startsWith("r:")) {
    const [numerator, denominator] = encoded.slice(2).split("/").map(Number);
    return { denominator, encoded, kind: "rational", numerator };
  }
  const [sign, index, radicand, coefficient] = encoded.slice(2).split(":");
  const [coefficientNumerator, coefficientDenominator] = coefficient.split("/").map(Number);
  return {
    coefficientDenominator,
    coefficientNumerator,
    encoded,
    index: Number(index),
    kind: "radical",
    radicand: Number(radicand),
    sign: Number(sign),
  };
}

function g03FixturePower(base, exponent) {
  let result = 1n;
  for (let index = 0; index < exponent; index += 1) result *= base;
  return result;
}

function g03FixtureInterval(point, precision) {
  if (point.kind === "rational") {
    const value = point.numerator / point.denominator;
    return { lower: value, rendered: value, upper: value };
  }
  const scale = 10 ** precision;
  const coefficient = BigInt(Math.abs(point.coefficientNumerator));
  const denominator = BigInt(point.coefficientDenominator);
  const scaledCoefficient = coefficient * BigInt(scale);
  const target = BigInt(point.radicand) * g03FixturePower(scaledCoefficient, point.index);
  let low = 0n;
  let high = BigInt(Math.max(1, point.radicand)) * scaledCoefficient + 1n;
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (g03FixturePower(middle * denominator, point.index) <= target) low = middle;
    else high = middle;
  }
  const exact = g03FixturePower(low * denominator, point.index) === target;
  const rendered = Number(point.sign < 0 ? -low : low) / scale;
  const lower = exact || point.sign > 0 ? rendered : Number(-(low + 1n)) / scale;
  const upper = exact || point.sign < 0 ? rendered : Number(low + 1n) / scale;
  return { lower, rendered, upper };
}

function g03FixtureGeometry({ compare = "-", point, precision, start = "-" }) {
  const candidates = [
    { point: g03FixturePoint("r:0/1"), semanticId: "origin" },
    { point: g03FixturePoint(point), semanticId: "primary" },
  ];
  if (compare !== "-") {
    candidates.push({ point: g03FixturePoint(compare), semanticId: "comparison" });
  }
  if (start !== "-") {
    candidates.push({ point: g03FixturePoint(start), semanticId: "operation-start" });
    candidates.push({ point: g03FixturePoint(point), semanticId: "operation-endpoint" });
  }
  const intervals = candidates.map((candidate) => ({
    ...candidate,
    interval: g03FixtureInterval(candidate.point, precision),
  }));
  const maximumMagnitude = Math.max(
    0,
    ...intervals.flatMap(({ interval }) => [
      Math.abs(interval.lower),
      Math.abs(interval.upper),
    ]),
  );
  const halfRange = Math.max(2, Math.ceil(maximumMagnitude * 1.25));
  const axisMin = -halfRange;
  const axisMax = halfRange;
  const pixelsPerUnit = 820 / (axisMax - axisMin);
  const membersByExactKey = new Map();
  for (const candidate of intervals) {
    const members = membersByExactKey.get(candidate.point.encoded) ?? [];
    members.push(candidate.semanticId);
    membersByExactKey.set(candidate.point.encoded, members);
  }
  for (const members of membersByExactKey.values()) members.sort();
  const geometry = intervals.map((candidate) => {
    const members = membersByExactKey.get(candidate.point.encoded);
    const owner = members[0];
    const map = (value) => 70 + (value - axisMin) * pixelsPerUnit;
    return {
      exactKey: candidate.point.encoded,
      lower: map(candidate.interval.lower),
      marker: candidate.semanticId === owner,
      owner,
      reason: members.length > 1 ? "exact-equality" : "unique-exact-value",
      rendered: map(candidate.interval.rendered),
      semanticId: candidate.semanticId,
      upper: map(candidate.interval.upper),
    };
  });
  return {
    geometry,
    geometryState: [
      "signed-real-number-line-geometry-v1",
      `axis=${axisMin}:${axisMax}`,
      "svg=70:890",
      ...geometry.map((entry) =>
        `${entry.semanticId}:${entry.exactKey}:${entry.rendered}:${entry.owner}`
      ),
    ].join("|"),
  };
}

function g03FixtureSignatureControls(input) {
  const parameters = [];
  const rationalPair = (prefix) =>
    parameters.push(`${prefix}-numerator`, `${prefix}-denominator`);
  const exact = (prefix, value, includeKind) => {
    if (includeKind) parameters.push(`${prefix}-kind`);
    if (value.kind === "rational") rationalPair(prefix);
    else parameters.push(`${prefix}-sign`, `${prefix}-radicand`, `${prefix}-index`);
  };
  const surd = (prefix) => parameters.push(
    `${prefix}-coefficient-numerator`,
    `${prefix}-coefficient-denominator`,
    `${prefix}-radicand`,
  );
  const rationalTopic = input.labId === "bnu-junior-s1-upper-rational-numbers" ||
    input.labId === "hjb-primary-p6-lower-rational-numbers" ||
    input.labId === "pep-junior-s1-upper-rational-numbers";
  const quadraticTopic = input.labId === "hjb-junior-s2-upper-quadratic-radicals";
  if (rationalTopic) {
    if (["locate", "opposite", "absolute-value"].includes(input.mode)) {
      rationalPair("value");
    } else if (["compare", "multiply", "divide"].includes(input.mode)) {
      rationalPair("left");
      rationalPair("right");
    } else {
      rationalPair("start");
      rationalPair("step");
    }
  } else if (!quadraticTopic) {
    if (["locate", "absolute-value", "classify", "estimate"].includes(input.mode)) {
      exact("value", input.value, true);
    } else if (input.mode === "compare") {
      exact("left", input.left, true);
      exact("right", input.right, true);
    } else if (input.mode === "radical") {
      exact("value", input.value, false);
    } else if (input.mode === "square-root") {
      parameters.push("value-radicand");
    } else {
      parameters.push("value-sign", "value-radicand");
    }
  } else if (["simplify", "estimate-check"].includes(input.mode)) {
    surd("value");
  } else {
    surd("left");
    surd("right");
  }
  parameters.push("precision");
  const valueFor = (parameter) => {
    if (parameter === "precision") return String(input.precision);
    if (["square-root", "cube-root"].includes(input.mode) && parameter === "value-radicand") {
      return String(Math.abs(input.radicand));
    }
    if (input.mode === "cube-root" && parameter === "value-sign") {
      return String(input.radicand < 0 ? -1 : 1);
    }
    const [, prefix, field] = parameter.match(
      /^(value|left|right|start|step)-(kind|sign|radicand|index|numerator|denominator|coefficient-numerator|coefficient-denominator)$/u,
    );
    const source = input[prefix];
    if (field === "coefficient-numerator" || field === "coefficient-denominator") {
      return String(source.coefficient[
        field === "coefficient-numerator" ? "numerator" : "denominator"
      ]);
    }
    return String(source[field]);
  };
  const canonicalParameter = (parameter) => {
    if (rationalTopic && parameter === "right-numerator") return "right-rational-numerator";
    if (rationalTopic && parameter === "right-denominator") return "right-rational-denominator";
    if (quadraticTopic && parameter === "right-coefficient-numerator") {
      return "right-surd-coefficient-numerator";
    }
    if (quadraticTopic && parameter === "right-coefficient-denominator") {
      return "right-surd-coefficient-denominator";
    }
    if (quadraticTopic && parameter === "right-radicand") return "right-surd-radicand";
    if (!rationalTopic && !quadraticTopic && parameter === "left-sign") return "value-sign";
    if (!rationalTopic && !quadraticTopic && parameter === "left-radicand") {
      return "value-radicand";
    }
    return parameter;
  };
  return parameters.map((parameter) => {
    const select = parameter.endsWith("-kind") || parameter.endsWith("-sign");
    const range = parameter.endsWith("-numerator")
      ? { max: 24, min: -24, step: 1 }
      : parameter.endsWith("-denominator")
        ? { max: 12, min: 1, step: 1 }
        : parameter.endsWith("-radicand")
          ? { max: 50, min: 0, step: 1 }
          : parameter.endsWith("-index")
            ? { max: 9, min: 2, step: 1 }
            : parameter === "precision"
              ? { max: 6, min: 0, step: 1 }
              : { max: null, min: null, step: null };
    return {
      disabled: false,
      kind: select ? "select" : "range",
      ...(select ? { max: null, min: null, step: null } : range),
      options: select
        ? (parameter.endsWith("-kind") ? ["rational", "radical"] : ["-1", "1"])
        : [],
      parameter: canonicalParameter(parameter),
      value: valueFor(parameter),
    };
  });
}

function producerShapedG03ModeFixture(modeCase) {
  const fixture = focusedGroupFixture("G03");
  const entries = focusedPayloadEntries(fixture.activeReport);
  const compare = modeCase.compare ?? "-";
  const start = modeCase.start ?? "-";
  const step = modeCase.step ?? "-";
  const configuredState = [
    "signed-real-number-line-v1",
    `lab=${modeCase.input.labId}`,
    `mode=${modeCase.input.mode}`,
    `precision=${modeCase.input.precision}`,
    `point=${modeCase.point}`,
    `compare=${compare}`,
    `start=${start}`,
    `step=${step}`,
  ].join("|");
  const geometryEvidence = g03FixtureGeometry({
    compare,
    point: modeCase.geometryPoint ?? modeCase.point,
    precision: modeCase.input.precision,
    start,
  });
  const controls = g03FixtureSignatureControls(modeCase.input);
  const request = {
    control: "precision",
    kind: "control",
    value: modeCase.input.precision,
  };
  const controlState = g03FixtureControlState(modeCase.input);
  const settledSnapshot = {
    configuredState,
    controlState,
    input: structuredClone(modeCase.input),
    labId: modeCase.input.labId,
    mode: modeCase.input.mode,
    pendingRequest: null,
  };
  const requestedSnapshot = {
    ...structuredClone(settledSnapshot),
    pendingRequest: request,
  };
  const geometryOwners = geometryEvidence.geometry.map((entry) => ({
    exactKey: entry.exactKey,
    ownerId: entry.owner,
    renderMarker: entry.marker,
    semanticId: entry.semanticId,
  }));
  const product = {
    before: structuredClone(settledSnapshot),
    expected: structuredClone(settledSnapshot),
    observed: structuredClone(settledSnapshot),
    projections: [],
    rejection: null,
    request,
    requested: structuredClone(requestedSnapshot),
    status: "accepted",
    version: "signed-real-number-line-action-receipt-v1",
  };
  const signature = {
    actionReceipt: JSON.stringify(product),
    controls,
    domainId: `signed-real-number-line:${modeCase.input.labId}:${modeCase.input.mode}:v1`,
    geometryOwners,
    geometryState: geometryEvidence.geometryState,
    invariantStates: g03ProductionInvariantStates(configuredState, settledSnapshot.input),
    mode: modeCase.input.mode,
    semanticState: configuredState,
    state: configuredState,
  };
  for (const entry of entries) {
    entry.payload.receipts = entry.payload.receipts.map((receipt) => {
      const stateId = `${modeCase.input.labId}:${receipt.stateId.slice(receipt.stateId.indexOf(":") + 1)}`;
      return {
        ...receipt,
        action: {
          beforeSignature: structuredClone(signature),
          expectedSignature: structuredClone(signature),
          observedSignature: structuredClone(signature),
          plannedRequest: request,
          projections: [],
          receipt: structuredClone(product),
        },
        collision: { ...receipt.collision, phase: stateId },
        configuredState,
        controls,
        geometry: structuredClone(geometryEvidence.geometry),
        layout: { targetCount: 2 },
        mode: modeCase.input.mode,
        stateId,
      };
    });
    entry.payload.plannedStateIds = entry.payload.receipts.map(({ stateId }) => stateId);
    entry.payload.expectedStatePlanSha256 = createHash("sha256")
      .update(`${entry.payload.plannedStateIds.join("\n")}\n`)
      .digest("hex");
  }
  fixture.activeContract.groups[0].statePlanSha256 =
    entries[0].payload.expectedStatePlanSha256;
  repinFocusedDescriptors(fixture.activeContract, entries, "G03");
  return fixture;
}

const g03RationalLab = "bnu-junior-s1-upper-rational-numbers";
const g03RealLab = "bnu-junior-s2-upper-real-numbers";
const g03QuadraticLab = "hjb-junior-s2-upper-quadratic-radicals";
const g03Rational = (numerator, denominator = 1) => ({
  denominator,
  kind: "rational",
  numerator,
});
const g03Radical = (radicand, index = 2, sign = 1) => ({
  index,
  kind: "radical",
  radicand,
  sign,
});
const g03Surd = (numerator, radicand, denominator = 1) => ({
  coefficient: g03Rational(numerator, denominator),
  kind: "quadratic-surd",
  radicand,
});

const producerShapedG03ModeCases = Object.freeze([
  { input: { labId: g03RationalLab, mode: "locate", precision: 3, value: g03Rational(-3, 2) }, point: "r:-3/2" },
  { compare: "r:1/1", input: { labId: g03RationalLab, left: g03Rational(-3, 2), mode: "compare", precision: 3, right: g03Rational(1) }, point: "r:-3/2" },
  { input: { labId: g03RationalLab, mode: "add", precision: 3, start: g03Rational(-3, 2), step: g03Rational(5, 4) }, point: "r:-1/4", start: "r:-3/2", step: "r:5/4" },
  { input: { labId: g03RationalLab, mode: "subtract", precision: 3, start: g03Rational(-3, 2), step: g03Rational(-5, 4) }, point: "r:-1/4", start: "r:-3/2", step: "r:-5/4" },
  { input: { labId: g03RationalLab, left: g03Rational(-3, 2), mode: "multiply", precision: 3, right: g03Rational(1) }, point: "r:-3/2" },
  { input: { labId: g03RationalLab, left: g03Rational(-3, 2), mode: "divide", precision: 3, right: g03Rational(1) }, point: "r:-3/2" },
  { input: { labId: g03RationalLab, mode: "opposite", precision: 3, value: g03Rational(-7, 3) }, point: "r:7/3" },
  { input: { labId: g03RationalLab, mode: "absolute-value", precision: 3, value: g03Rational(-3, 2) }, point: "r:-3/2" },
  { input: { labId: g03RealLab, mode: "radical", precision: 3, value: g03Radical(2) }, point: "d:1:2:2:1/1" },
  { input: { labId: g03RealLab, mode: "classify", precision: 3, value: g03Radical(3, 2, -1) }, point: "d:-1:2:3:1/1" },
  { input: { labId: g03RealLab, mode: "square-root", precision: 3, radicand: 2 }, point: "d:1:2:2:1/1" },
  { input: { labId: g03RealLab, mode: "cube-root", precision: 3, radicand: -2 }, point: "d:-1:3:2:1/1" },
  { input: { labId: g03RealLab, mode: "estimate", precision: 3, value: g03Radical(5) }, point: "d:1:2:5:1/1" },
  { input: { labId: g03QuadraticLab, mode: "simplify", precision: 3, value: g03Surd(1, 12) }, point: "d:1:2:3:2/1" },
  { input: { labId: g03QuadraticLab, left: g03Surd(2, 2), mode: "radical-add", precision: 3, right: g03Surd(1, 2) }, point: "d:1:2:2:3/1" },
  { input: { labId: g03QuadraticLab, left: g03Surd(2, 2), mode: "radical-subtract", precision: 3, right: g03Surd(1, 2) }, point: "d:1:2:2:1/1" },
  { input: { labId: g03QuadraticLab, left: g03Surd(1, 2), mode: "radical-multiply", precision: 3, right: g03Surd(1, 3) }, point: "d:1:2:6:1/1" },
  { input: { labId: g03QuadraticLab, left: g03Surd(1, 2), mode: "radical-divide", precision: 3, right: g03Surd(1, 3) }, point: "d:1:2:6:1/3" },
  { input: { labId: g03QuadraticLab, mode: "estimate-check", precision: 3, value: g03Surd(-1, 12) }, point: "d:-1:2:3:2/1" },
]);

const producerG03ResetCases = Object.freeze([
  ...[
    "bnu-junior-s1-upper-rational-numbers",
    "hjb-primary-p6-lower-rational-numbers",
    "pep-junior-s1-upper-rational-numbers",
  ].map((labId) => ({
    input: {
      labId,
      mode: "locate",
      precision: 2,
      value: g03Rational(-3, 2),
    },
    point: "r:-3/2",
  })),
  ...[
    "bnu-junior-s2-upper-real-numbers",
    "hjb-junior-s2-upper-real-numbers",
  ].map((labId) => ({
    input: {
      labId,
      mode: "radical",
      precision: 3,
      value: g03Radical(2),
    },
    point: "d:1:2:2:1/1",
  })),
  {
    input: {
      labId: "hjb-junior-s2-upper-quadratic-radicals",
      mode: "simplify",
      precision: 3,
      value: g03Surd(1, 12),
    },
    point: "d:1:2:3:2/1",
  },
]);

function synchronizeG03SignatureActionReceipt(action) {
  const serialized = JSON.stringify(action.receipt);
  action.expectedSignature.actionReceipt = serialized;
  action.observedSignature.actionReceipt = serialized;
}

function producerShapedG03ResetFixture(resetCase) {
  const fixture = producerShapedG03ModeFixture(resetCase);
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const request = { kind: "reset", topicId: resetCase.input.labId };
      receipt.action.plannedRequest = request;
      receipt.action.receipt.request = structuredClone(request);
      receipt.action.receipt.requested.pendingRequest = structuredClone(request);
      synchronizeG03SignatureActionReceipt(receipt.action);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G03");
  return fixture;
}

function focusedG03DurabilityProbeFixture(resetCase) {
  const fixture = producerShapedG03ResetFixture(resetCase);
  const group = fixture.activeContract.groups[0];
  const chunkId = `${resetCase.input.labId}:chunk-01-of-01`;
  const title = `G03 ${chunkId} audits 2 exact states`;
  group.chunks[0].chunkId = chunkId;
  for (const spec of fixture.activeReport.suites[0].specs) {
    spec.title = title;
    const testNode = spec.tests[0];
    const attachment = testNode.results[0].attachments[0];
    const payload = JSON.parse(Buffer.from(attachment.body, "base64").toString("utf8"));
    payload.chunkId = chunkId;
    payload.expectedChunkIds = [chunkId];
    payload.testTitle = title;
    payload.durabilityReceipts = focusedDurabilityReceipts(
      "G03",
      testNode.projectName,
      resetCase.input.labId,
      testNode.projectName === "desktop-chrome",
      [resetCase.input.labId],
      title,
    );
    attachment.body = Buffer.from(JSON.stringify(payload)).toString("base64");
  }
  return fixture;
}

function producerG03NonresetCase(resetCase) {
  if (resetCase.input.mode === "locate") {
    return {
      compare: "r:1/1",
      input: {
        labId: resetCase.input.labId,
        left: g03Rational(-3, 2),
        mode: "compare",
        precision: 3,
        right: g03Rational(1),
      },
      point: "r:-3/2",
    };
  }
  if (resetCase.input.mode === "radical") {
    return {
      input: {
        labId: resetCase.input.labId,
        mode: "classify",
        precision: 3,
        value: g03Radical(3, 2, -1),
      },
      point: "d:-1:2:3:1/1",
    };
  }
  return {
    input: {
      labId: resetCase.input.labId,
      mode: "estimate-check",
      precision: 3,
      value: g03Surd(-1, 12),
    },
    point: "d:-1:2:3:2/1",
  };
}

function producerShapedG03ActionFixture({
  beforeCase,
  expectedCase,
  projections = [],
  rejection = null,
  request,
}) {
  const fixture = producerShapedG03ModeFixture(expectedCase);
  const beforeFixture = producerShapedG03ModeFixture(beforeCase);
  const entries = focusedPayloadEntries(fixture.activeReport);
  const beforeEntries = focusedPayloadEntries(beforeFixture.activeReport);
  for (const [entryIndex, entry] of entries.entries()) {
    for (const [receiptIndex, receipt] of entry.payload.receipts.entries()) {
      const beforeReceipt = beforeEntries[entryIndex].payload.receipts[receiptIndex];
      const beforeSnapshot = structuredClone(beforeReceipt.action.receipt.expected);
      const product = receipt.action.receipt;
      product.before = beforeSnapshot;
      product.request = structuredClone(request);
      product.requested = {
        ...structuredClone(beforeSnapshot),
        pendingRequest: structuredClone(request),
      };
      product.projections = structuredClone(projections);
      product.rejection = rejection;
      product.status = rejection === null ? "accepted" : "rejected";
      if (rejection !== null) {
        product.expected = structuredClone(beforeSnapshot);
        product.observed = structuredClone(beforeSnapshot);
        receipt.action.expectedSignature = structuredClone(
          beforeReceipt.action.expectedSignature,
        );
        receipt.action.observedSignature = structuredClone(
          beforeReceipt.action.expectedSignature,
        );
      }
      receipt.action.beforeSignature = structuredClone(
        beforeReceipt.action.expectedSignature,
      );
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.projections = structuredClone(projections);
      synchronizeG03SignatureActionReceipt(receipt.action);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G03");
  return fixture;
}

const g03RealNegativeClassifyCase = Object.freeze({
  input: {
    labId: g03RealLab,
    mode: "classify",
    precision: 3,
    value: g03Radical(3, 2, -1),
  },
  point: "d:-1:2:3:1/1",
});

const g03RealZeroClassifyCase = Object.freeze({
  input: {
    labId: g03RealLab,
    mode: "classify",
    precision: 3,
    value: g03Radical(0, 2, 1),
  },
  point: "r:0/1",
});

const g03RationalMultiplyZeroCase = Object.freeze({
  input: {
    labId: g03RationalLab,
    left: g03Rational(-3, 2),
    mode: "multiply",
    precision: 3,
    right: g03Rational(0),
  },
  point: "r:0/1",
});

const g03RationalDivideOneCase = Object.freeze({
  input: {
    labId: g03RationalLab,
    left: g03Rational(-3, 2),
    mode: "divide",
    precision: 3,
    right: g03Rational(1),
  },
  point: "r:-3/2",
});

test("producer contract 55 accepts exact closed G03 input/controlState for all 19 modes", async () => {
  for (const modeCase of producerShapedG03ModeCases) {
    const fixture = producerShapedG03ModeFixture(modeCase);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, modeCase.input.mode);
  }
});

test("producer contract 122 accepts exact initial, projected, and rejected G03 actions", async (t) => {
  await t.test("initial canonical reset for all six topics", async () => {
    for (const resetCase of producerG03ResetCases) {
      const fixture = producerShapedG03ActionFixture({
        beforeCase: resetCase,
        expectedCase: resetCase,
        request: { kind: "initial", topicId: resetCase.input.labId },
      });
      const summary = await validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      );
      assert.equal(summary.stateReceiptCount, 4, resetCase.input.labId);
    }
  });

  await t.test("zero-radicand sign projection", async () => {
    const fixture = producerShapedG03ActionFixture({
      beforeCase: g03RealNegativeClassifyCase,
      expectedCase: g03RealZeroClassifyCase,
      projections: [{
        affectedControl: "value-sign",
        expectedValue: 1,
        previousValue: -1,
        projection: "canonical-zero-sign",
        reason: "zero-has-no-negative-sign",
      }],
      request: { control: "value-radicand", kind: "control", value: 0 },
    });
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4);
  });

  await t.test("division-entry zero-divisor projection", async () => {
    const fixture = producerShapedG03ActionFixture({
      beforeCase: g03RationalMultiplyZeroCase,
      expectedCase: g03RationalDivideOneCase,
      projections: [{
        affectedControl: "right-rational-numerator",
        expectedValue: 1,
        previousValue: 0,
        projection: "exclude-zero-divisor",
        reason: "division-requires-nonzero-rational-divisor",
      }],
      request: { controller: "mode", kind: "controller", value: "divide" },
    });
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4);
  });

  await t.test("direct negative-zero rejection", async () => {
    const fixture = producerShapedG03ActionFixture({
      beforeCase: g03RealZeroClassifyCase,
      expectedCase: g03RealZeroClassifyCase,
      rejection: "DIRECT_REQUEST_VIOLATES_DOMAIN",
      request: { control: "value-sign", kind: "control", value: -1 },
    });
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4);
  });

  await t.test("complete controller, domain, and direct-control branch matrix", async () => {
    const realLocateRational = {
      input: {
        labId: g03RealLab,
        mode: "locate",
        precision: 3,
        value: g03Rational(-3, 2),
      },
      point: "r:-3/2",
    };
    const realLocateRadical = {
      input: {
        labId: g03RealLab,
        mode: "locate",
        precision: 3,
        value: g03Radical(2),
      },
      point: "d:1:2:2:1/1",
    };
    const realRadical = producerShapedG03ModeCases[8];
    const rationalCompareOne = producerShapedG03ModeCases[1];
    const rationalCompareTwo = {
      compare: "r:2/1",
      input: {
        ...structuredClone(rationalCompareOne.input),
        right: g03Rational(2),
      },
      point: "r:-3/2",
    };
    const rationalCompareHalf = {
      compare: "r:1/2",
      input: {
        ...structuredClone(rationalCompareOne.input),
        right: g03Rational(1, 2),
      },
      point: "r:-3/2",
    };
    const quadraticAddOne = producerShapedG03ModeCases[14];
    const quadraticAddTwo = {
      input: {
        ...structuredClone(quadraticAddOne.input),
        right: g03Surd(2, 2),
      },
      point: "d:1:2:2:4/1",
    };
    const quadraticAddHalf = {
      input: {
        ...structuredClone(quadraticAddOne.input),
        right: g03Surd(1, 2, 2),
      },
      point: "d:1:2:2:5/2",
    };
    const quadraticAddOther = {
      input: {
        ...structuredClone(quadraticAddOne.input),
        right: g03Surd(1, 3),
      },
      point: "d:1:2:2:2/1",
    };
    const quadraticMultiplyZero = {
      input: {
        labId: g03QuadraticLab,
        left: g03Surd(1, 2),
        mode: "radical-multiply",
        precision: 3,
        right: g03Surd(0, 0),
      },
      point: "r:0/1",
    };
    const quadraticDivideProjected = {
      input: {
        labId: g03QuadraticLab,
        left: g03Surd(1, 2),
        mode: "radical-divide",
        precision: 3,
        right: g03Surd(1, 1),
      },
      point: "d:1:2:2:1/1",
    };
    const rationalAddStartFourth = {
      input: {
        labId: g03RationalLab,
        mode: "add",
        precision: 3,
        start: g03Rational(-3, 4),
        step: g03Rational(5, 4),
      },
      point: "r:1/2",
      start: "r:-3/4",
      step: "r:5/4",
    };
    const realRadicalIndexThree = {
      input: {
        ...structuredClone(realRadical.input),
        value: g03Radical(2, 3),
      },
      point: "d:1:3:2:1/1",
    };
    const realRadicalFifty = {
      geometryPoint: "d:1:2:2:5/1",
      input: {
        ...structuredClone(realRadical.input),
        value: g03Radical(50),
      },
      point: "d:1:2:50:1/1",
    };
    const realCompareNegativeRadical = {
      compare: "d:-1:2:2:1/1",
      input: {
        labId: g03RealLab,
        left: g03Rational(-3, 2),
        mode: "compare",
        precision: 3,
        right: g03Radical(2, 2, -1),
      },
      point: "r:-3/2",
    };
    const realCompareZeroRadical = {
      compare: "r:0/1",
      input: {
        ...structuredClone(realCompareNegativeRadical.input),
        right: g03Radical(0, 2, 1),
      },
      point: "r:-3/2",
    };
    const matrix = [
      {
        beforeCase: producerShapedG03ModeCases[0],
        expectedCase: rationalCompareOne,
        name: "mode-no-projection",
        request: { controller: "mode", kind: "controller", value: "compare" },
      },
      {
        beforeCase: realLocateRational,
        expectedCase: realRadical,
        name: "mode-number-kind-projection",
        projections: [{
          affectedControl: "number-kind",
          expectedValue: "radical",
          previousValue: "rational",
          projection: "mode-number-kind",
          reason: "mode-requires-number-kind",
        }],
        request: { controller: "mode", kind: "controller", value: "radical" },
      },
      {
        beforeCase: realLocateRational,
        expectedCase: realLocateRadical,
        name: "number-kind-allowed",
        request: { controller: "number-kind", kind: "controller", value: "radical" },
      },
      {
        beforeCase: realRadical,
        expectedCase: realRadical,
        name: "number-kind-rejected",
        rejection: "NUMBER_KIND_NOT_ALLOWED",
        request: { controller: "number-kind", kind: "controller", value: "rational" },
      },
      {
        beforeCase: {
          ...g03RealNegativeClassifyCase,
          input: {
            ...structuredClone(g03RealNegativeClassifyCase.input),
            value: g03Radical(3),
          },
          point: "d:1:2:3:1/1",
        },
        expectedCase: g03RealNegativeClassifyCase,
        name: "real-sign",
        request: { control: "value-sign", kind: "control", value: -1 },
      },
      {
        beforeCase: rationalCompareOne,
        expectedCase: rationalCompareTwo,
        name: "rational-numerator",
        request: { control: "right-rational-numerator", kind: "control", value: 2 },
      },
      {
        beforeCase: rationalCompareOne,
        expectedCase: rationalCompareHalf,
        name: "rational-denominator",
        request: { control: "right-rational-denominator", kind: "control", value: 2 },
      },
      {
        beforeCase: g03RationalDivideOneCase,
        expectedCase: g03RationalDivideOneCase,
        name: "rational-zero-rejected",
        rejection: "DIRECT_REQUEST_VIOLATES_DOMAIN",
        request: { control: "right-rational-numerator", kind: "control", value: 0 },
      },
      {
        beforeCase: quadraticAddOne,
        expectedCase: quadraticAddTwo,
        name: "surd-coefficient-numerator",
        request: { control: "right-surd-coefficient-numerator", kind: "control", value: 2 },
      },
      {
        beforeCase: quadraticAddOne,
        expectedCase: quadraticAddHalf,
        name: "surd-coefficient-denominator",
        request: { control: "right-surd-coefficient-denominator", kind: "control", value: 2 },
      },
      {
        beforeCase: quadraticAddOne,
        expectedCase: quadraticAddOther,
        name: "surd-radicand",
        request: { control: "right-surd-radicand", kind: "control", value: 3 },
      },
      {
        beforeCase: quadraticMultiplyZero,
        expectedCase: quadraticDivideProjected,
        name: "radical-divide-two-projections",
        projections: [
          {
            affectedControl: "right-surd-coefficient-numerator",
            expectedValue: 1,
            previousValue: 0,
            projection: "exclude-zero-divisor",
            reason: "division-requires-nonzero-surd-coefficient",
          },
          {
            affectedControl: "right-surd-radicand",
            expectedValue: 1,
            previousValue: 0,
            projection: "exclude-zero-divisor",
            reason: "division-requires-nonzero-surd-radicand",
          },
        ],
        request: { controller: "mode", kind: "controller", value: "radical-divide" },
      },
      {
        beforeCase: producerShapedG03ModeCases[17],
        expectedCase: producerShapedG03ModeCases[17],
        name: "radical-divide-zero-coefficient-rejected",
        rejection: "DIRECT_REQUEST_VIOLATES_DOMAIN",
        request: {
          control: "right-surd-coefficient-numerator",
          kind: "control",
          value: 0,
        },
      },
      {
        beforeCase: producerShapedG03ModeCases[17],
        expectedCase: producerShapedG03ModeCases[17],
        name: "radical-divide-zero-radicand-rejected",
        rejection: "DIRECT_REQUEST_VIOLATES_DOMAIN",
        request: { control: "right-surd-radicand", kind: "control", value: 0 },
      },
      {
        beforeCase: rationalCompareOne,
        expectedCase: {
          ...structuredClone(rationalCompareOne),
          input: { ...structuredClone(rationalCompareOne.input), precision: 2 },
        },
        name: "direct-precision",
        request: { control: "precision", kind: "control", value: 2 },
      },
      {
        beforeCase: rationalCompareOne,
        expectedCase: {
          compare: "r:1/1",
          input: {
            ...structuredClone(rationalCompareOne.input),
            left: g03Rational(-5, 2),
          },
          point: "r:-5/2",
        },
        name: "direct-left-numerator",
        request: { control: "left-numerator", kind: "control", value: -5 },
      },
      {
        beforeCase: producerShapedG03ModeCases[2],
        expectedCase: rationalAddStartFourth,
        name: "direct-start-denominator",
        request: { control: "start-denominator", kind: "control", value: 4 },
      },
      {
        beforeCase: realRadical,
        expectedCase: realRadicalIndexThree,
        name: "direct-value-index",
        request: { control: "value-index", kind: "control", value: 3 },
      },
      {
        beforeCase: realRadical,
        expectedCase: realRadicalFifty,
        name: "domain-radicand-preserves-state-key",
        request: { control: "value-radicand", kind: "control", value: 50 },
      },
      {
        beforeCase: realCompareNegativeRadical,
        expectedCase: realCompareZeroRadical,
        name: "direct-zero-radical-canonical-sign",
        request: { control: "right-radicand", kind: "control", value: 0 },
      },
    ];
    for (const actionCase of matrix) {
      const fixture = producerShapedG03ActionFixture(actionCase);
      const summary = await validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      );
      assert.equal(summary.stateReceiptCount, 4, actionCase.name);
    }
  });
});

test("producer contract 68 accepts the exact canonical reset for all six G03 topics", async () => {
  for (const resetCase of producerG03ResetCases) {
    const fixture = producerShapedG03ResetFixture(resetCase);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, resetCase.input.labId);
  }
});

test("producer contract 119 accepts the exact durability probe for all six G03 topics", async () => {
  for (const resetCase of producerG03ResetCases) {
    const fixture = focusedG03DurabilityProbeFixture(resetCase);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, resetCase.input.labId);
  }
});

test("producer contract 70 accepts canonical G03 reset after a nonreset before state", async () => {
  for (const resetCase of producerG03ResetCases) {
    const fixture = producerShapedG03ResetFixture(resetCase);
    const beforeFixture = producerShapedG03ModeFixture(
      producerG03NonresetCase(resetCase),
    );
    const entries = focusedPayloadEntries(fixture.activeReport);
    const beforeEntries = focusedPayloadEntries(beforeFixture.activeReport);
    for (const [entryIndex, entry] of entries.entries()) {
      for (const [receiptIndex, receipt] of entry.payload.receipts.entries()) {
        const beforeReceipt =
          beforeEntries[entryIndex].payload.receipts[receiptIndex];
        const resetRequest = structuredClone(receipt.action.receipt.request);
        receipt.action.receipt.before = structuredClone(
          beforeReceipt.action.receipt.before,
        );
        receipt.action.receipt.requested = {
          ...structuredClone(beforeReceipt.action.receipt.before),
          pendingRequest: resetRequest,
        };
        receipt.action.beforeSignature = structuredClone(
          beforeReceipt.action.beforeSignature,
        );
        synchronizeG03SignatureActionReceipt(receipt.action);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, resetCase.input.labId);
  }
});

test("mutation 69 rejects a legal nonreset state masquerading as reset in all six G03 topics", async () => {
  for (const resetCase of producerG03ResetCases) {
    const sourceCase = producerG03NonresetCase(resetCase);
    const fixture = producerShapedG03ModeFixture(sourceCase);
    const entries = focusedPayloadEntries(fixture.activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        const request = { kind: "reset", topicId: resetCase.input.labId };
        receipt.action.plannedRequest = request;
        receipt.action.receipt.request = structuredClone(request);
        receipt.action.receipt.requested.pendingRequest = structuredClone(request);
        synchronizeG03SignatureActionReceipt(receipt.action);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G03");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G03 reset canonical (?:input|configured state|controlState|signature|geometry)/su,
      resetCase.input.labId,
    );
  }
});

test("mutation 56 rejects a negative configured radical coefficient with sign already encoded", async () => {
  const modeCase = producerShapedG03ModeCases.find(
    ({ input }) => input.mode === "estimate-check",
  );
  const fixture = producerShapedG03ModeFixture(modeCase);
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const replace = (value) => value.replace(
        /d:-1:2:3:2\/1/gu,
        "d:-1:2:3:-2/1",
      );
      receipt.configuredState = replace(receipt.configuredState);
      for (const snapshot of [
        receipt.action.receipt.before,
        receipt.action.receipt.requested,
        receipt.action.receipt.expected,
        receipt.action.receipt.observed,
      ]) {
        snapshot.configuredState = replace(snapshot.configuredState);
      }
      for (const signature of [
        receipt.action.beforeSignature,
        receipt.action.expectedSignature,
        receipt.action.observedSignature,
      ]) {
        signature.state = replace(signature.state);
        signature.semanticState = replace(signature.semanticState);
        signature.geometryState = replace(signature.geometryState);
        for (const owner of signature.geometryOwners) owner.exactKey = replace(owner.exactKey);
      }
      for (const point of receipt.geometry) point.exactKey = replace(point.exactKey);
    }
  }
  writeFocusedPayloadEntries(entries);
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    ),
    /G03.*(?:radical|coefficient|canonical|configured|input)/su,
  );
});

test("mutation 67 rejects a coherent G03 compare state masquerading as reset", async () => {
  const compareCase = producerShapedG03ModeCases.find(
    ({ input }) => input.mode === "compare",
  );
  const fixture = producerShapedG03ModeFixture(compareCase);
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const request = { kind: "reset", topicId: compareCase.input.labId };
      receipt.action.plannedRequest = request;
      receipt.action.receipt.request = structuredClone(request);
      receipt.action.receipt.requested.pendingRequest = structuredClone(request);
      synchronizeG03SignatureActionReceipt(receipt.action);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G03");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    ),
    /G03 reset.*canonical.*(?:input|configured|state|geometry)/su,
  );
});

test("mutation 57 rejects a G04 control request whose value is ignored by every state layer", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const request = {
        controlId: "left-numerator",
        kind: "control",
        value: 8,
      };
      receipt.productActionReceipt.request = request;
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt.request = structuredClone(request);
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G04");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04.*(?:control|request|requested).*(?:state|value|transition)/su,
  );
});

test("mutation 58 rejects a G04 controller request whose mode is ignored by every state layer", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      const request = {
        evaluatedOperation: "subtract",
        kind: "controller",
        mode: "subtract",
      };
      receipt.productActionReceipt.request = request;
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.plannerReceipt.request = structuredClone(request);
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G04");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04 controller request derived requested state/su,
  );
});

test("mutation 59 rejects a noncanonical G04 state coherently masquerading as reset", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      mutateEveryG04DomainState(receipt, (state) => {
        Object.assign(state, {
          evaluatedOperation: "add",
          leftDenominator: 2,
          leftNumerator: 1,
          mode: "add",
          rightDenominator: 3,
          rightNumerator: 1,
        });
      });
      const values = {
        "left-denominator": "2",
        "left-numerator": "1",
        "right-denominator": "3",
        "right-numerator": "1",
      };
      for (const controls of [
        receipt.controls,
        receipt.action.beforeControls,
        receipt.action.observedControls,
      ]) {
        for (const control of controls) control.value = values[control.parameter];
      }
      for (const control of receipt.runtimeSignature.controls) {
        const parameter = control.attributes["data-viz-parameter"];
        if (parameter in values) control.value = values[parameter];
      }
      synchronizeG04ConfiguredState(receipt);
      const request = { kind: "reset" };
      receipt.productActionReceipt.request = request;
      receipt.action.plannedRequest = structuredClone(request);
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G04");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04 reset request derived requested state/su,
  );
});

test("mutation 60 rejects a noncanonical G04 state coherently masquerading as initial", async () => {
  const { activeContract, activeReport } = focusedGroupFixture("G04");
  const entries = focusedPayloadEntries(activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      mutateEveryG04DomainState(receipt, (state) => {
        Object.assign(state, {
          evaluatedOperation: "add",
          leftDenominator: 2,
          leftNumerator: 1,
          mode: "add",
          rightDenominator: 3,
          rightNumerator: 1,
        });
      });
      const values = {
        "left-denominator": "2",
        "left-numerator": "1",
        "right-denominator": "3",
        "right-numerator": "1",
      };
      for (const controls of [
        receipt.controls,
        receipt.action.beforeControls,
        receipt.action.observedControls,
      ]) {
        for (const control of controls) control.value = values[control.parameter];
      }
      for (const control of receipt.runtimeSignature.controls) {
        const parameter = control.attributes["data-viz-parameter"];
        if (parameter in values) control.value = values[parameter];
      }
      synchronizeG04ConfiguredState(receipt);
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(activeContract, entries, "G04");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      activeReport,
      reportPath,
      activeContract,
      validationOptions(),
    ),
    /G04 initial request derived before state/su,
  );
});

test("producer contract 63 accepts the exact initial and reset state for all five G04 labs", async () => {
  for (const profile of producerG04LabProfiles) {
    for (const requestKind of ["initial", "reset"]) {
      const fixture = producerShapedG04LabFixture(profile, requestKind);
      const summary = await validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      );
      assert.equal(
        summary.stateReceiptCount,
        4,
        `${profile.labId}:${requestKind}`,
      );
    }
  }
});

test("mutation 64 rejects canonical-looking reset drift for every G04 lab", async () => {
  for (const profile of producerG04LabProfiles) {
    const fixture = producerShapedG04LabFixture(profile, "reset");
    const entries = focusedPayloadEntries(fixture.activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        const drifted = receipt.productActionReceipt.requested.leftNumerator === 48
          ? 47
          : receipt.productActionReceipt.requested.leftNumerator + 1;
        for (const state of [
          receipt.domain.requested,
          receipt.domain.expected,
          receipt.domain.observed,
          receipt.productActionReceipt.requested,
          receipt.productActionReceipt.expected,
          receipt.productActionReceipt.observed,
          receipt.action.beforeDomain.requested,
          receipt.action.beforeDomain.expected,
          receipt.action.beforeDomain.observed,
          receipt.action.plannerReceipt.requested,
          receipt.action.plannerReceipt.expected,
          receipt.action.plannerReceipt.observed,
          receipt.action.oracleAfter,
          receipt.runtimeSignature.domain.requested,
          receipt.runtimeSignature.domain.expected,
          receipt.runtimeSignature.domain.observed,
        ]) state.leftNumerator = drifted;
        synchronizeG04ConfiguredState(receipt);
        synchronizeG04NumericControls(receipt);
        receipt.action.expectedActionReceipt = structuredClone(
          receipt.productActionReceipt,
        );
        synchronizeG04RuntimeAction(receipt);
      }
    }
    repinFocusedDescriptors(fixture.activeContract, entries, "G04");
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G04 reset request derived requested state/su,
      profile.labId,
    );
  }
});

test("producer contract 65 accepts the exact estimate options for all five G04 labs", async () => {
  for (const profile of producerG04LabProfiles) {
    const fixture = producerShapedG04EstimateFixture(profile);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, profile.labId);
  }
});

test("mutation 66 rejects globally valid but lab-invalid or reordered G04 estimate options", async () => {
  for (const profile of producerG04LabProfiles) {
    const fixture = producerShapedG04EstimateFixture(profile);
    const entries = focusedPayloadEntries(fixture.activeReport);
    const receipt = entries[0].payload.receipts[0];
    const invalidOptions = profile.estimateOperations.length === 4
      ? [...profile.estimateOperations].reverse()
      : [...profile.estimateOperations, "add"].filter(
          (value, index, values) => values.indexOf(value) === index,
        );
    if (invalidOptions.length === profile.estimateOperations.length) {
      invalidOptions.push("multiply");
    }
    for (const controls of [
      receipt.controls,
      receipt.action.beforeControls,
      receipt.action.observedControls,
    ]) {
      controls.find(({ parameter }) => parameter === "estimate-operation").options =
        [...invalidOptions];
    }
    receipt.runtimeSignature.controls.find(
      (control) => control.attributes["data-viz-parameter"] === "estimate-operation",
    ).options = invalidOptions.map((value) => ({ disabled: false, value }));
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        fixture.activeReport,
        reportPath,
        fixture.activeContract,
        validationOptions(),
      ),
      /G04.*(?:estimate-operation|allowlist|runtime select options|control)/su,
      profile.labId,
    );
  }
});

test("producer contract 71 accepts exact projected and rejected G04 divide-zero actions", async () => {
  for (const kind of ["projection", "rejection"]) {
    const fixture = producerShapedG04DivideZeroFixture(kind);
    const summary = await validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    );
    assert.equal(summary.stateReceiptCount, 4, kind);
  }
});

test("mutation 72 rejects a coherent G04 divide-zero projection whose result is not exactly one", async () => {
  const fixture = producerShapedG04DivideZeroFixture("projection");
  const entries = focusedPayloadEntries(fixture.activeReport);
  for (const entry of entries) {
    for (const receipt of entry.payload.receipts) {
      for (const state of [
        receipt.domain.expected,
        receipt.domain.observed,
        receipt.productActionReceipt.expected,
        receipt.productActionReceipt.observed,
        receipt.action.plannerReceipt.expected,
        receipt.action.plannerReceipt.observed,
        receipt.action.oracleAfter,
        receipt.runtimeSignature.domain.expected,
        receipt.runtimeSignature.domain.observed,
      ]) state.rightNumerator = 2;
      receipt.action.expectedActionReceipt = structuredClone(
        receipt.productActionReceipt,
      );
      setG04NumericControlCollection(receipt.action.observedControls, {
        ...receipt.domain.observed,
      });
      setG04NumericControlCollection(receipt.controls, receipt.domain.observed);
      setG04RuntimeNumericControls(
        receipt.runtimeSignature.controls,
        receipt.domain.observed,
      );
      synchronizeG04ConfiguredState(receipt);
      synchronizeG04RuntimeAction(receipt);
    }
  }
  repinFocusedDescriptors(fixture.activeContract, entries, "G04");
  await assert.rejects(
    validateMainlandFocusedVisualizationReport(
      fixture.activeReport,
      reportPath,
      fixture.activeContract,
      validationOptions(),
    ),
    /G04 controller request derived expected state/su,
  );
});

test("mutation 61 rejects missing, surplus, reordered, or value-drifted G04 runtime modes", async () => {
  const mutations = [
    (controls) => controls.filter(
      (control) => control.attributes["data-viz-mode"] !== "subtract",
    ),
    (controls) => {
      const insertAt = controls.findIndex(
        (control) => control.attributes["data-viz-mode"] === "estimate",
      );
      controls.splice(
        insertAt,
        0,
        g04RuntimeModeButton("compare", { mode: "add" }),
      );
      return controls;
    },
    (controls) => {
      const modeButtons = controls.filter(
        (control) => control.attributes["data-viz-mode-button"] === "true",
      );
      const first = controls.indexOf(modeButtons[0]);
      const second = controls.indexOf(modeButtons[1]);
      [controls[first], controls[second]] = [controls[second], controls[first]];
      return controls;
    },
    (controls) => {
      controls.find(
        (control) => control.attributes["data-viz-mode"] === "subtract",
      ).value = "subtract";
      return controls;
    },
  ];
  for (const mutate of mutations) {
    const { activeContract, activeReport } = focusedGroupFixture("G04");
    const entries = focusedPayloadEntries(activeReport);
    for (const entry of entries) {
      for (const receipt of entry.payload.receipts) {
        receipt.runtimeSignature.controls = mutate(
          receipt.runtimeSignature.controls,
        );
      }
    }
    writeFocusedPayloadEntries(entries);
    await assert.rejects(
      validateMainlandFocusedVisualizationReport(
        activeReport,
        reportPath,
        activeContract,
        validationOptions(),
      ),
      /G04.*runtime.*(?:exact ordered.*mode allowlist|mode button)/su,
    );
  }
});
