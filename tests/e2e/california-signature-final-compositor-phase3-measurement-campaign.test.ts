import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import test, { before } from "node:test";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS,
  prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign,
  type CaliforniaSignatureFinalCompositorPhase3CampaignPublication,
  type CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan,
  type CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt,
  type CaliforniaSignatureFinalCompositorPhase3MeasurementDriver,
  type CaliforniaSignatureFinalCompositorPhase3ProducerIdentity
} from "./california-signature-final-compositor-phase3-measurement-campaign";
import {
  summarizeCaliforniaSignatureFinalCompositorCapacityGroups
} from "./california-signature-final-compositor-capacity-plan";
import { californiaSignatureFinalCompositorPhase3MeasurementCampaignTestFixture as fixture } from
  "./california-signature-final-compositor-phase3-measurement-campaign.test-fixture";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

let exactSourceReceipt: CaliforniaSignatureFinalCompositorPhase3CurrentSourceReceipt;
let exactSourcePlan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan;

before(async () => {
  exactSourceReceipt = await fixture.produceCurrentSourceReceipt();
  exactSourcePlan = exactSourceReceipt.sourcePlan;
  assert.equal(Object.isFrozen(exactSourceReceipt), true);
  assert.equal(Object.isFrozen(exactSourcePlan), true);
  assert.equal(Object.isFrozen(exactSourcePlan.executionGroups), true);
});

function producerIdentity(): CaliforniaSignatureFinalCompositorPhase3ProducerIdentity {
  return {
    acceptedBuildId: "accepted-next-build-fixture",
    acceptedBuildReceiptSha256: sha256("accepted-build-receipt"),
    browserExecutableSha256: sha256("physical-chrome"),
    browserIdentitySha256: sha256("browser-identity"),
    dependencySha256: sha256("dependency-identity"),
    environmentDiscoveryFileSha256: sha256("environment-discovery-file"),
    environmentSha256: sha256("environment-identity"),
    machineSha256: sha256("machine-identity"),
    sharpLibvipsSha256: sha256("sharp-libvips-identity"),
    sourceBuildSha256: sha256("source-build"),
    sourceSnapshotSha256: exactSourcePlan.sourceIdentity.sourceSnapshotSha256
  };
}

function createClock(options: { freezeAtCall?: number } = {}) {
  let calls = 0;
  let value = BigInt(1_000_000);
  return () => {
    calls += 1;
    if (calls !== options.freezeAtCall) value += BigInt(1_000_000);
    return value;
  };
}

function createDriver(options: {
  badCalibrationClassId?: string;
  badStageGroupKey?: string;
} = {}) {
  let baselineSampleCount = 0;
  let calibrationSampleCount = 0;
  const driver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = {
    async runBaselineSample(context) {
      baselineSampleCount += 1;
      const stages = ["navigation", "hydrate", "replay", "layout", "real-reset"] as const;
      return {
        browserContextIdentitySha256: sha256("fixture-browser-context"),
        finalCompositorExcluded: true,
        groupKey: context.group.groupKey,
        stages: stages
          .filter((stage) => !(context.group.groupKey === options.badStageGroupKey &&
            stage === "real-reset"))
          .map((stage) => ({
            acknowledgementSha256: sha256(`${context.group.groupKey}\0${stage}`),
            completed: true as const,
            stage
          }))
      };
    },
    async runCalibrationSample(context) {
      calibrationSampleCount += 1;
      const dimensions = structuredClone(context.dimensionClass.maximumDimensions);
      if (context.dimensionClass.classId === options.badCalibrationClassId) {
        dimensions.backingSize.width += 1;
      }
      return {
        browserContextIdentitySha256: sha256("fixture-browser-context"),
        comparisonSha256: sha256(`compare\0${context.dimensionClass.classId}`),
        decodeSha256: sha256(`decode\0${context.dimensionClass.classId}`),
        finalCompositorIncluded: true,
        maximumDimensions: dimensions,
        mismatchPixelCount: 0,
        screenshotByteCount: 4_096,
        screenshotSha256: sha256(`screenshot\0${context.dimensionClass.classId}`),
        stage: "final-compositor"
      };
    }
  };
  return {
    driver,
    counts: () => ({ baselineSampleCount, calibrationSampleCount })
  };
}

test("production Phase3 remains a zero-argument hard hold before an accepted build and real driver",
async () => {
  assert.throws(() => prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign(),
    /HOLD.*accepted BUILD_ID.*physical browser/i);
  assert.throws(() =>
    (prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign as unknown as
      (forged: unknown) => unknown)({
        environment: {},
        samples: [{ durationMs: 1 }],
        sourceReceipt: exactSourceReceipt
      }), /takes no caller-authored/i);
  await assert.rejects(() =>
    (fixture.produceCurrentSourceReceipt as unknown as
      (forged: unknown) => Promise<unknown>)({ sourceIdentity: exactSourcePlan.sourceIdentity }),
  /takes no caller-authored source identities/i);
});

test("exact Phase3 campaign measures every group and every source-owned maximum class", async () => {
  const measurement = createDriver();
  const publication = await fixture.execute({
    driver: measurement.driver,
    nowMonotonicNs: createClock(),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  });
  try {
    assert.deepEqual(publication.seal.counters,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS);
    assert.deepEqual(measurement.counts(), {
      baselineSampleCount: 4_650 * 7,
      calibrationSampleCount: 4 * 7
    });
    assert.equal(publication.seal.formalExecutionAuthorized, false);
    assert.equal(publication.seal.status, "diagnostic-phase3-measurement-campaign");
    assert.equal(publication.seal.capacityAuthorization.artifact24hPassed, false);
    assert.equal(publication.seal.capacityAuthorization.formal72hPassed, false);
    assert.equal(lstatSync(publication.directoryPath).mode & 0o777, 0o700);
    assert.equal(lstatSync(publication.receiptStreamFilePath).mode & 0o777, 0o400);
    assert.equal(lstatSync(publication.sealFilePath).mode & 0o777, 0o400);
    assert.equal(readFileSync(publication.receiptStreamFilePath).length,
      publication.seal.receiptStream.byteCount);
  } finally {
    fixture.dispose(publication);
  }
});

test("Phase3 awaits genuinely asynchronous Playwright and Sharp driver work", async () => {
  const measurement = createDriver();
  let pendingBaselineResolutions = 0;
  let pendingCalibrationResolutions = 0;
  const asynchronousDriver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = {
    async runBaselineSample(context) {
      await Promise.resolve();
      pendingBaselineResolutions += 1;
      return measurement.driver.runBaselineSample(context);
    },
    async runCalibrationSample(context) {
      await Promise.resolve();
      pendingCalibrationResolutions += 1;
      return measurement.driver.runCalibrationSample(context);
    }
  };
  const publication = await fixture.execute({
    driver: asynchronousDriver,
    nowMonotonicNs: createClock(),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  });
  try {
    assert.equal(pendingBaselineResolutions, 4_650 * 7);
    assert.equal(pendingCalibrationResolutions, 4 * 7);
  } finally {
    fixture.dispose(publication);
  }
});

test("forged exact-count or source identities cannot bind a Phase3 plan", () => {
  for (const mutate of [
    (plan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan) => {
      plan.sourceIdentity.groupCount -= 1;
    },
    (plan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan) => {
      plan.sourceIdentity.evidenceRecordCount -= 1;
    },
    (plan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan) => {
      plan.sourceIdentity.receiptCount -= 1;
    },
    (plan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan) => {
      plan.sourceIdentity.cropCount -= 1;
    },
    (plan: CaliforniaSignatureFinalCompositorPhase3CampaignSourcePlan) => {
      plan.canvasGroupCount -= 1;
    }
  ]) {
    const forged = structuredClone(exactSourceReceipt);
    mutate(forged.sourcePlan);
    assert.throws(() => fixture.bindSourcePlan(forged),
      /authoritative current-source receipt|brand/i);
  }
});

test("source class crop distribution must match the independently derived execution groups", () => {
  const authenticated = fixture.bindSourcePlan(exactSourceReceipt);
  const derivedClasses = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
    exactSourcePlan.executionGroups.map((group) => ({ ...group, weightMs: 1 }))
  ).classes;
  assert.deepEqual(authenticated.classPlans.map((row) => ({
    classId: row.classId,
    cropCount: row.cropCount,
    projectName: row.projectName
  })), derivedClasses,
  "calibration class plans must use independently derived class counters");
  assert.equal(authenticated.classDistributionSha256, sha256(stableJson(derivedClasses)),
    "execution plan must bind the independently derived class distribution digest");
  const registryOrder = exactSourcePlan.sourceIdentity.classes.map((row) => ({
    classId: row.classId,
    maximumDimensions: row.maximumDimensions,
    projectName: row.projectName,
    reviewedClassSha256: row.reviewedClassSha256,
    reviewedPoliciesSha256: row.reviewedPoliciesSha256
  }));
  assert.equal(authenticated.classRegistryOrderSha256, sha256(stableJson(registryOrder)),
    "execution plan must bind reviewed registry class and policy order");

  const forged = structuredClone(exactSourceReceipt);
  const desktopCap2 = forged.sourcePlan.sourceIdentity.classes.find((row) =>
    row.classId === "desktop-chrome-source-dpr-cap-2");
  const desktopCap3 = forged.sourcePlan.sourceIdentity.classes.find((row) =>
    row.classId === "desktop-chrome-source-dpr-cap-3");
  assert.ok(desktopCap2 && desktopCap3);
  const originalDesktopCap2CropCount = desktopCap2.cropCount;
  const originalDesktopCap3CropCount = desktopCap3.cropCount;
  assert.ok(originalDesktopCap2CropCount > 1 && originalDesktopCap3CropCount > 0,
    "current authoritative desktop classes must support the exact one-crop forgery probe");
  desktopCap2.cropCount = originalDesktopCap2CropCount - 1;
  desktopCap3.cropCount = originalDesktopCap3CropCount + 1;
  assert.equal(forged.sourcePlan.sourceIdentity.classes.reduce((sum, row) =>
    sum + row.cropCount, 0),
    exactSourcePlan.sourceIdentity.cropCount,
  "reviewer forgery must preserve the exact total crop count");
  assert.deepEqual(forged.sourcePlan.executionGroups, exactSourcePlan.executionGroups,
    "reviewer forgery must preserve the exact execution groups and their digest");
  assert.throws(() => fixture.bindSourcePlan(forged),
    /authoritative current-source receipt|brand/i);
});

test("caller-authored source and registry digests cannot self-sign an authoritative plan", () => {
  const forged = structuredClone(exactSourceReceipt);
  forged.sourcePlan.sourceIdentity.dimensionRegistrySha256 = sha256("forged-dimension-registry");
  forged.sourcePlan.sourceIdentity.receiptsSha256 = sha256("forged-receipts");
  forged.sourcePlan.sourceIdentity.sourceSnapshotSha256 = sha256("forged-source-snapshot");
  forged.sourcePlan.sourceIdentity.summarySha256 = sha256("forged-summary");
  forged.sourcePlan.sourceIdentity.workUnitsSha256 = sha256("forged-work-units");
  for (const row of forged.sourcePlan.sourceIdentity.classes) {
    row.reviewedClassSha256 = sha256(`forged-reviewed-class\0${row.classId}`);
    row.reviewedPoliciesSha256 = sha256(`forged-reviewed-policies\0${row.classId}`);
  }
  assert.throws(() => fixture.bindSourcePlan(forged),
    /authoritative current-source receipt|brand|canonical registry|source identities/i);
});

test("missing, duplicate, or reordered execution groups fail exact plan binding", () => {
  const missing = structuredClone(exactSourceReceipt);
  missing.sourcePlan.executionGroups.pop();
  assert.throws(() => fixture.bindSourcePlan(missing), /authoritative current-source receipt|brand/i);

  const duplicate = structuredClone(exactSourceReceipt);
  duplicate.sourcePlan.executionGroups[1] =
    structuredClone(duplicate.sourcePlan.executionGroups[0]!);
  assert.throws(() => fixture.bindSourcePlan(duplicate),
    /authoritative current-source receipt|brand/i);

  const reordered = structuredClone(exactSourceReceipt);
  [reordered.sourcePlan.executionGroups[0], reordered.sourcePlan.executionGroups[1]] =
    [reordered.sourcePlan.executionGroups[1]!, reordered.sourcePlan.executionGroups[0]!];
  assert.throws(() => fixture.bindSourcePlan(reordered),
    /authoritative current-source receipt|brand/i);
});

test("baseline evidence cannot omit real Reset or include the compositor", async () => {
  const groupKey = exactSourcePlan.executionGroups[0]!.groupKey;
  const measurement = createDriver({ badStageGroupKey: groupKey });
  await assert.rejects(() => fixture.execute({
    driver: measurement.driver,
    nowMonotonicNs: createClock(),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  }), /real-reset|stage sequence|baseline coverage/i);
});

test("calibration must use the exact source-owned maximum envelope and real artifact identities", async () => {
  const classId = exactSourcePlan.sourceIdentity.classes[0]!.classId;
  const measurement = createDriver({ badCalibrationClassId: classId });
  await assert.rejects(() => fixture.execute({
    driver: measurement.driver,
    nowMonotonicNs: createClock(),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  }), /maximum dimensions|maximum envelope/i);
});

test("producer-owned monotonic clock cannot stall or regress", async () => {
  const measurement = createDriver();
  await assert.rejects(() => fixture.execute({
    driver: measurement.driver,
    nowMonotonicNs: createClock({ freezeAtCall: 2 }),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  }), /monotonic clock.*advance/i);
});

test("failed asynchronous browser work removes the entire partial campaign", async () => {
  const measurement = createDriver();
  const failedDirectories = new Set<string>();
  const before = new Set<string>();
  const { readdirSync } = await import("node:fs");
  for (const name of readdirSync(path.join(WORKTREE, ".tmp"))) {
    if (name.startsWith("california-phase3-measurement-campaign-")) before.add(name);
  }
  let baselineCalls = 0;
  const failingDriver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = {
    async runBaselineSample(context) {
      baselineCalls += 1;
      if (baselineCalls === 8) throw new Error("fixture browser navigation failed");
      return measurement.driver.runBaselineSample(context);
    },
    async runCalibrationSample(context) {
      return measurement.driver.runCalibrationSample(context);
    }
  };
  await assert.rejects(() => fixture.execute({
    driver: failingDriver,
    nowMonotonicNs: createClock(),
    producerIdentity: producerIdentity(),
    sourceReceipt: exactSourceReceipt
  }), /fixture browser navigation failed/);
  for (const name of readdirSync(path.join(WORKTREE, ".tmp"))) {
    if (name.startsWith("california-phase3-measurement-campaign-") && !before.has(name)) {
      failedDirectories.add(name);
    }
  }
  assert.deepEqual([...failedDirectories], [],
    "failed Phase3 campaign left a partial durable directory");
});

test("driver cannot mutate an execution group across await and escape the sealed plan", async () => {
  const measurement = createDriver();
  let attacked = false;
  const mutatingDriver: CaliforniaSignatureFinalCompositorPhase3MeasurementDriver = {
    async runBaselineSample(context) {
      if (!attacked) {
        attacked = true;
        context.group.axisId = `${context.group.axisId}-forged-after-bind`;
      }
      return measurement.driver.runBaselineSample(context);
    },
    async runCalibrationSample(context) {
      return measurement.driver.runCalibrationSample(context);
    }
  };
  let publication: CaliforniaSignatureFinalCompositorPhase3CampaignPublication | undefined;
  let rejection: unknown;
  try {
    publication = await fixture.execute({
      driver: mutatingDriver,
      nowMonotonicNs: createClock(),
      producerIdentity: producerIdentity(),
      sourceReceipt: exactSourceReceipt
    });
  } catch (error) {
    rejection = error;
  } finally {
    if (publication) fixture.dispose(publication);
  }
  assert.ok(rejection, "campaign accepted a driver mutation after source-plan binding");
  assert.match(String(rejection),
    /immutable|mutat|group identity|sealed execution plan|read only|readonly/i);
});

test("ordinary Node cannot recover a private engine by spoofing env and exact argv", () => {
  const sourcePath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase3-measurement-campaign.ts"
  );
  const exactTestPath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase3-measurement-campaign.test.ts"
  );
  const script = [
    "import assert from 'node:assert/strict';",
    `process.argv[1] = ${JSON.stringify(exactTestPath)};`,
    `const imported = await import(${JSON.stringify(sourcePath)});`,
    "assert.ok(imported.CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE3_EXACT_COUNTERS);",
    "assert.equal(typeof imported.prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign, 'function');",
    "assert.equal(Object.getOwnPropertySymbols(globalThis).some((symbol) => " +
      "String(symbol).includes('phase3-measurement-campaign.test-fixture')), false);",
    "assert.equal(Object.keys(imported).some((key) => /bind|execute|dispose/i.test(key)), false);",
    "assert.equal(imported.prepareCaliforniaSignatureFinalCompositorPhase3MeasurementCampaign.length, 0);"
  ].join("\n");
  const result = spawnSync(process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: WORKTREE,
      encoding: "utf8",
      env: { ...process.env, NODE_TEST_CONTEXT: "child-v8" }
    });
  assert.equal(result.status, 0, result.stderr);
});

test("test-support engine has one structurally isolated tracked importer", () => {
  const productionPath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase3-measurement-campaign.ts"
  );
  const productionSource = readFileSync(productionPath, "utf8");
  for (const forbidden of [
    "NODE_TEST_CONTEXT",
    "Symbol.for",
    "globalThis",
    "bindCaliforniaSignatureFinalCompositorPhase3TestSourcePlan",
    "executeCaliforniaSignatureFinalCompositorPhase3TestCampaign",
    "disposeCaliforniaSignatureFinalCompositorPhase3TestCampaign"
  ]) {
    assert.equal(productionSource.includes(forbidden), false,
      `production Phase3 HOLD source exposes forbidden private seam ${forbidden}`);
  }
  const supportSpecifier =
    "california-signature-final-compositor-phase3-measurement-campaign." + "test-support";
  assert.equal(productionSource.includes(supportSpecifier), false,
    "production Phase3 HOLD imports its test-support engine");
  const result = spawnSync("rg", [
    "-l",
    "--fixed-strings",
    supportSpecifier,
    "app",
    "components",
    "data",
    "lib",
    "scripts",
    "tests/e2e"
  ], { cwd: WORKTREE, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), [
    "tests/e2e/california-signature-final-compositor-phase3-measurement-campaign.test-fixture.ts"
  ]);
});
