import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { before } from "node:test";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE,
  type CaliforniaSignatureFinalCompositorClassCounter,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  type CaliforniaSignatureFinalCompositorPhase4CalibrationTarget,
  type CaliforniaSignatureFinalCompositorPhase4RealDriverLease
} from "./california-signature-final-compositor-phase4-real-driver-contract";
import {
  prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver
} from "./california-signature-final-compositor-phase4-real-driver";
import {
  californiaSignatureFinalCompositorPhase4RealDriverTestFixture as fixture
} from "./california-signature-final-compositor-phase4-real-driver.test-fixture";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";

let authoritativeSubjects: {
  calibrationClass: CaliforniaSignatureFinalCompositorClassCounter;
  calibrationTargets: readonly CaliforniaSignatureFinalCompositorPhase4CalibrationTarget[];
  executionGroups: readonly CaliforniaSignatureFinalCompositorExecutionGroupSummary[];
};
let baselineGroup: CaliforniaSignatureFinalCompositorExecutionGroupSummary;
let mobileBaselineGroup: CaliforniaSignatureFinalCompositorExecutionGroupSummary;
let calibrationClass: CaliforniaSignatureFinalCompositorClassCounter;

before(async () => {
  authoritativeSubjects = await fixture.createHarness({ acceptedReceipt: "valid" }).subjects();
  baselineGroup = authoritativeSubjects.executionGroups.find((group) =>
    group.projectName === "desktop-chrome")!;
  mobileBaselineGroup = authoritativeSubjects.executionGroups.find((group) =>
    group.projectName === "mobile-chrome")!;
  calibrationClass = authoritativeSubjects.calibrationClass;
});

async function completeAuthenticatedBaseline(
  lease: CaliforniaSignatureFinalCompositorPhase4RealDriverLease
) {
  for (const group of authoritativeSubjects.executionGroups) {
    for (let ordinal = 0; ordinal < 7; ordinal += 1) {
      await lease.driver.runBaselineSample({
        group: structuredClone(group),
        kind: ordinal < 2 ? "warmup" : "measured",
        ordinal
      });
    }
  }
}

test("Phase4 refuses to touch Playwright or Sharp without one private accepted-build receipt", async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: null
  });

  await assert.rejects(
    () => harness.prepare(),
    /private accepted production build receipt/i
  );
  assert.deepEqual(harness.externalCalls(), []);
});

test("production Phase4 is zero-argument and exposes no caller timing, environment, or samples", async () => {
  assert.equal(prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver.length, 0);
  await assert.rejects(
    () => (prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver as unknown as
      (forged: unknown) => Promise<unknown>)({
        environment: {},
        nowMonotonicNs: () => BigInt(1),
        samples: [{ durationMs: 1 }]
      }),
    /takes no caller-authored/i
  );
  await assert.rejects(
    () => prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver(),
    /HOLD.*formal execution authorization remains false/i
  );
  const source = readFileSync(path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.ts"
  ), "utf8");
  assert.doesNotMatch(source, /NODE_TEST_CONTEXT|Symbol\.for|globalThis/);
  const entrySource =
    prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver.toString();
  assert.doesNotMatch(entrySource, /realKernel|WithKernel|chromium\.launch|require\(.*sharp/i);
});

test("held Phase4 source owns a real Playwright and Sharp adapter without executing it", () => {
  const source = readFileSync(path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.ts"
  ), "utf8");
  for (const required of [
    "playwright.chromium.launch",
    "require(\"sharp\")",
    "page.screenshot",
    "decodeScreenshot",
    "compareIndependentPixels",
    "captureIndependentExpectedPixels",
    "deviceScaleFactor: config.deviceScaleFactor",
    "hasTouch: config.hasTouch",
    "isMobile: config.isMobile",
    "expectedPixels",
    "resize is forbidden",
    "__californiaCanvasGraphicsRuntime"
  ]) {
    assert.equal(source.includes(required), true,
      `California Phase4 held real adapter lost ${required}`);
  }
});

test("ordinary Node cannot recover the private lifecycle seam through env, argv, or an import bridge",
() => {
  const sourcePath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.ts"
  );
  const exactTestPath = path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.test.ts"
  );
  const script = [
    "import assert from 'node:assert/strict';",
    "process.env.NODE_TEST_CONTEXT = 'child-v8';",
    `process.argv[1] = ${JSON.stringify(exactTestPath)};`,
    "globalThis[Symbol.for('california-phase4-real-driver-test-fixture')] = { forged: true };",
    `const imported = await import(${JSON.stringify(sourcePath)});`,
    "assert.equal(imported.prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver.length, 0);",
    "assert.equal(Object.keys(imported).some((key) => " +
      "/kernel|bind|execute|testHarness|withKernel/i.test(key)), false);",
    "await assert.rejects(() => " +
      "imported.prepareCaliforniaSignatureFinalCompositorPhase4RealMeasurementDriver(), " +
      "/HOLD.*formal execution authorization remains false/i);"
  ].join("\n");
  const result = spawnSync(process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: WORKTREE,
      encoding: "utf8"
    });
  assert.equal(result.status, 0, result.stderr);
});

test("Phase4 test-support has one structurally isolated tracked importer", () => {
  const productionSource = readFileSync(path.join(
    WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.ts"
  ), "utf8");
  const supportSpecifier =
    "california-signature-final-compositor-phase4-real-driver." + "test-support";
  assert.equal(productionSource.includes(supportSpecifier), false,
    "production Phase4 HOLD imports its test-support seam");
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
    "tests/e2e/california-signature-final-compositor-phase4-real-driver.test-fixture.ts"
  ]);
});

test("one exact private receipt prepares one physical process-bound driver and keeps authorization false",
async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid"
  });
  const lease = await harness.prepare();
  try {
    assert.equal(lease.formalExecutionAuthorized, false);
    assert.match(lease.acceptedBuildReceiptSha256, /^[a-f0-9]{64}$/);
    assert.match(lease.processIdentitySha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(harness.externalCalls(), [
      "read-production-build", "inspect-physical-chrome", "inspect-sharp",
      "launch-physical-chrome"
    ]);
    assert.equal(harness.observations().browserLaunchCount, 1);
    assert.equal(harness.observations().browserContextCount, 2);
    assert.equal(lease.producerIdentity.acceptedBuildId, "phase4-build-fixture");
    assert.equal(
      lease.producerIdentity.acceptedBuildReceiptSha256,
      lease.acceptedBuildReceiptSha256
    );
  } finally {
    await lease.close();
  }
  assert.equal(harness.observations().browserCloseCount, 1);
});

test("lifecycle-owned calibration plan covers every exact Phase3 dimension class", () => {
  assert.equal(authoritativeSubjects.calibrationClass.classId,
    authoritativeSubjects.calibrationTargets[0]!.classId);
  assert.equal(authoritativeSubjects.calibrationTargets.length, 4);
  assert.equal(new Set(authoritativeSubjects.calibrationTargets.map((row) => row.classId)).size, 4);
  assert.deepEqual(new Set(authoritativeSubjects.calibrationTargets.map((row) => row.projectName)),
    new Set(["desktop-chrome", "mobile-chrome"]));
});

test("baseline owns the exact navigation, hydrate, replay, layout, real Reset sequence without Sharp",
async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid"
  });
  const lease = await harness.prepare();
  try {
    const outcome = await lease.driver.runBaselineSample({
      group: structuredClone(baselineGroup),
      kind: "warmup",
      ordinal: 0
    });
    assert.equal(outcome.finalCompositorExcluded, true);
    assert.equal(outcome.groupKey, baselineGroup.groupKey);
    assert.deepEqual(outcome.stages.map((row) => row.stage),
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE);
    assert.ok(outcome.stages.every((row) => row.completed === true));
    assert.ok(outcome.stages.every((row) => /^[a-f0-9]{64}$/.test(row.acknowledgementSha256)));
    assert.deepEqual(harness.observations().baselineStages,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE);
    assert.equal(harness.observations().screenshotCount, 0);
    assert.equal(harness.observations().sharpDecodeCount, 0);
    assert.equal(harness.observations().sharpCompareCount, 0);
  } finally {
    await lease.close();
  }
});

test("calibration performs exactly one maximum-envelope screenshot, Sharp decode, and pixel compare",
async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid"
  });
  const lease = await harness.prepare();
  try {
    await completeAuthenticatedBaseline(lease);
    const outcome = await lease.driver.runCalibrationSample({
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup",
      ordinal: 0
    });
    assert.equal(outcome.finalCompositorIncluded, true);
    assert.equal(outcome.stage, "final-compositor");
    assert.deepEqual(outcome.maximumDimensions, calibrationClass.maximumDimensions);
    assert.equal(outcome.mismatchPixelCount, 0);
    assert.ok(outcome.screenshotByteCount > 0);
    assert.match(outcome.screenshotSha256, /^[a-f0-9]{64}$/);
    assert.match(outcome.decodeSha256, /^[a-f0-9]{64}$/);
    assert.match(outcome.comparisonSha256, /^[a-f0-9]{64}$/);
    assert.deepEqual(harness.observations().calibrationDimensions,
      [calibrationClass.maximumDimensions]);
    assert.equal(harness.observations().screenshotCount, 1);
    assert.equal(harness.observations().sharpDecodeCount, 1);
    assert.equal(harness.observations().sharpCompareCount, 1);
  } finally {
    await lease.close();
  }
});

test("sample rows are cloned and deeply frozen before lifecycle awaits can observe caller mutation",
async () => {
  const baselineHarness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await baselineHarness.prepare();
  try {
    const mutableBaseline = {
      group: structuredClone(baselineGroup),
      kind: "warmup" as const,
      ordinal: 0
    };
    const baselinePromise = lease.driver.runBaselineSample(mutableBaseline);
    mutableBaseline.group.groupKey = "caller-forged-after-bind";
    mutableBaseline.group.classCropCounts[0]!.cropCount = 999_999;
    const baselineOutcome = await baselinePromise;
    assert.equal(baselineOutcome.groupKey, baselineGroup.groupKey);

    const observed = baselineHarness.observations();
    assert.deepEqual(observed.baselineGroupKeys,
      Array(5).fill(baselineGroup.groupKey));
    assert.deepEqual(observed.baselineClassCropCounts,
      Array(5).fill(null).map(() => baselineGroup.classCropCounts.map((row) => row.cropCount)));
    assert.ok(observed.baselineContextFrozen.every(Boolean));
  } finally {
    await lease.close();
  }

  const calibrationHarness = fixture.createHarness({ acceptedReceipt: "valid" });
  const calibrationLease = await calibrationHarness.prepare();
  try {
    await completeAuthenticatedBaseline(calibrationLease);
    const mutableCalibration = {
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup" as const,
      ordinal: 0
    };
    const calibrationPromise = calibrationLease.driver.runCalibrationSample(mutableCalibration);
    mutableCalibration.dimensionClass.maximumDimensions.backingSize.width = 1;
    mutableCalibration.dimensionClass.reviewedPoliciesSha256 = "0".repeat(64);
    const calibrationOutcome = await calibrationPromise;
    assert.equal(calibrationOutcome.maximumDimensions.backingSize.width,
      calibrationClass.maximumDimensions.backingSize.width);

    const observed = calibrationHarness.observations();
    assert.deepEqual(observed.calibrationDimensions,
      [calibrationClass.maximumDimensions]);
    assert.deepEqual(observed.calibrationContextFrozen, [true, true]);
  } finally {
    await calibrationLease.close();
  }
});

test("uncloneable baseline and calibration inputs close the lease without physical evidence",
async (t) => {
  await t.test("baseline DataCloneError", async () => {
    const harness = fixture.createHarness({ acceptedReceipt: "valid" });
    const lease = await harness.prepare();
    await assert.rejects(() => lease.driver.runBaselineSample({
      group: structuredClone(authoritativeSubjects.executionGroups[0]!),
      kind: "warmup",
      notCloneable: () => undefined,
      ordinal: 0
    } as never), /clone|DataCloneError/i);
    assert.equal(harness.observations().baselineStages.length, 0);
    assert.equal(harness.observations().baselineCommitCount, 0);
    assert.equal(harness.observations().browserCloseCount, 1);
  });

  await t.test("calibration DataCloneError", async () => {
    const harness = fixture.createHarness({ acceptedReceipt: "valid" });
    const lease = await harness.prepare();
    await completeAuthenticatedBaseline(lease);
    await assert.rejects(() => lease.driver.runCalibrationSample({
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup",
      notCloneable: () => undefined,
      ordinal: 0
    } as never), /clone|DataCloneError/i);
    assert.equal(harness.observations().screenshotCount, 0);
    assert.equal(harness.observations().calibrationCommitCount, 0);
    assert.equal(harness.observations().browserCloseCount, 1);
  });

  await t.test("active registered transaction drains before uncloneable cleanup", async () => {
    const harness = fixture.createHarness({
      acceptedReceipt: "valid",
      fault: "hold-first-baseline-stage"
    } as never);
    const lease = await harness.prepare();
    const valid = lease.driver.runBaselineSample({
      group: structuredClone(authoritativeSubjects.executionGroups[0]!),
      kind: "warmup",
      ordinal: 0
    });
    await harness.waitForHeldBaselineStage();
    const invalid = lease.driver.runBaselineSample({
      group: structuredClone(authoritativeSubjects.executionGroups[0]!),
      kind: "warmup",
      notCloneable: () => undefined,
      ordinal: 0
    } as never);
    assert.equal(harness.observations().browserCloseCount, 0,
      "California Phase4 must not close an active registered stage prematurely");
    harness.releaseHeldBaselineStage();
    const outcomes = await Promise.race([
      Promise.allSettled([valid, invalid]),
      new Promise<never>((_resolve, reject) => {
        const timeout = setTimeout(() => reject(
          new Error("California Phase4 uncloneable cleanup deadlocked")), 1_000);
        timeout.unref();
      })
    ]);
    assert.equal(outcomes[0]!.status, "fulfilled");
    assert.equal(outcomes[1]!.status, "rejected");
    assert.equal(harness.observations().baselineStages.length,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE.length);
    assert.equal(harness.observations().baselineCommitCount, 1);
    assert.equal(harness.observations().browserCloseCount, 1);
  });
});

test("driver rejects caller-forged source, build, environment, and sample metadata", async () => {
  {
    const lease = await fixture.createHarness({ acceptedReceipt: "valid" }).prepare();
    await assert.rejects(() => lease.driver.runBaselineSample({
      group: structuredClone(baselineGroup),
      kind: "measured",
      ordinal: 1,
      sourcePlan: { sourceSnapshotSha256: "0".repeat(64) }
    } as never), /baseline sample keys drifted/i);
  }
  {
    const lease = await fixture.createHarness({ acceptedReceipt: "valid" }).prepare();
    await assert.rejects(() => lease.driver.runCalibrationSample({
      acceptedBuildId: "caller-build",
      dimensionClass: structuredClone(calibrationClass),
      environment: { NODE_TEST_CONTEXT: "forged" },
      kind: "measured",
      ordinal: 1,
      samples: [{ durationMs: 1 }]
    } as never), /calibration sample keys drifted/i);
  }
  {
    const lease = await fixture.createHarness({ acceptedReceipt: "valid" }).prepare();
    await assert.rejects(() => lease.driver.runBaselineSample({
      group: {
        ...structuredClone(baselineGroup),
        classCropCounts: [{ classId: baselineGroup.classCropCounts[0]!.classId,
          cropCount: 1, reviewedPolicy: "caller" }]
      },
      kind: "warmup",
      ordinal: 1
    } as never), /execution-group membership.*authenticated/i);
  }
});

test("missing build, server, physical Chrome, or Sharp fails before a browser launch", async (t) => {
  for (const [fault, pattern] of [
    ["missing-build", /production BUILD_ID/i],
    ["missing-server", /accepted production server|lifecycle checkpoint.*drift/i],
    ["missing-chrome", /physical Chrome/i],
    ["missing-sharp", /Sharp.*libvips/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({
        acceptedReceipt: "valid",
        fault
      });
      await assert.rejects(() => harness.prepare(), pattern);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("each prepare discovery await is fenced before later discovery or launch", async (t) => {
  for (const [fault, pattern, expectedCalls] of [
    ["drift-after-build-discovery", /lifecycle checkpoint.*drift/i,
      ["read-production-build"]],
    ["expire-after-chrome-discovery", /accepted.*receipt.*expired/i,
      ["read-production-build", "inspect-physical-chrome"]]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault } as never);
      await assert.rejects(() => harness.prepare(), pattern);
      assert.deepEqual(harness.externalCalls(), expectedCalls);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("stale, non-private, non-Starship, build-drifted, and source-drifted receipts fail closed",
async (t) => {
  for (const [fault, pattern] of [
    ["stale-receipt", /fresh accepted production build receipt/i],
    ["public-receipt", /private mode 0700.*0400/i],
    ["non-starship-receipt", /strict Starship.*\.tmp/i],
    ["build-drift", /accepted production BUILD_ID.*drift/i],
    ["source-drift", /current source manifest|lifecycle checkpoint.*drift/i],
    ["self-signed-source-drift", /current source manifest|lifecycle checkpoint.*drift/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({
        acceptedReceipt: "valid",
        fault
      });
      await assert.rejects(() => harness.prepare(), pattern);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("raw, modified, file-drifted, and nested-clone receipts fail before external discovery",
async (t) => {
  for (const [fault, pattern] of [
    ["raw-receipt", /not canonical JSON bytes/i],
    ["modified-receipt", /not exactly derived/i],
    ["receipt-file-drift", /durable bytes drifted/i],
    ["nested-clone-receipt", /strict Starship worktree \.tmp child/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault });
      await assert.rejects(() => harness.prepare(), pattern);
      assert.deepEqual(harness.externalCalls(), []);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("receipt cannot substitute its Phase3 plan, registry, source, subset, or target identities",
async (t) => {
  for (const [fault, pattern] of [
    ["execution-plan-drift", /Phase3 execution plan/i],
    ["dimension-registry-drift", /dimension registry/i],
    ["source-receipt-drift", /Phase3 source receipt/i],
    ["source-snapshot-drift", /Phase3 source snapshot/i],
    ["execution-subset-drift", /execution-group subset/i],
    ["target-plan-drift", /target-crop plan/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault } as never);
      await assert.rejects(() => harness.prepare(), pattern);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("authenticated baseline order rejects a later exact group before its predecessor", async () => {
  assert.ok(authoritativeSubjects.executionGroups.length > 1,
    "California Phase4 order adversarial requires two lifecycle-owned groups");
  const harness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await harness.prepare();
  try {
    await assert.rejects(() => lease.driver.runBaselineSample({
      group: structuredClone(authoritativeSubjects.executionGroups[1]!),
      kind: "warmup",
      ordinal: 0
    }), /authenticated baseline order drifted/i);
    assert.equal(harness.observations().baselineStages.length, 0);
  } finally {
    await lease.close();
  }
});

test("concurrent duplicate baseline samples execute and commit exactly once", async () => {
  const harness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await harness.prepare();
  try {
    const input = {
      group: structuredClone(authoritativeSubjects.executionGroups[0]!),
      kind: "warmup" as const,
      ordinal: 0
    };
    const outcomes = await Promise.allSettled([
      lease.driver.runBaselineSample(structuredClone(input)),
      lease.driver.runBaselineSample(structuredClone(input))
    ]);
    assert.equal(outcomes.filter((row) => row.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((row) => row.status === "rejected").length, 1);
    assert.equal(harness.observations().baselineCommitCount, 1);
    assert.equal(harness.observations().baselineStages.length,
      CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_PHASE4_BASELINE_STAGE_SEQUENCE.length);
  } finally {
    await lease.close();
  }
});

test("concurrent duplicate calibration samples capture and commit exactly once", async () => {
  const harness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await harness.prepare();
  try {
    await completeAuthenticatedBaseline(lease);
    const input = {
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup" as const,
      ordinal: 0
    };
    const outcomes = await Promise.allSettled([
      lease.driver.runCalibrationSample(structuredClone(input)),
      lease.driver.runCalibrationSample(structuredClone(input))
    ]);
    assert.equal(outcomes.filter((row) => row.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((row) => row.status === "rejected").length, 1);
    assert.equal(harness.observations().calibrationCommitCount, 1);
    assert.equal(harness.observations().screenshotCount, 1);
    assert.equal(harness.observations().sharpDecodeCount, 1);
    assert.equal(harness.observations().sharpCompareCount, 1);
  } finally {
    await lease.close();
  }
});

test("failed concurrent sample transactions release their claims without committing", async (t) => {
  await t.test("baseline failure", async () => {
    const harness = fixture.createHarness({ acceptedReceipt: "valid", fault: "wrong-stage" });
    const lease = await harness.prepare();
    const input = {
      group: structuredClone(authoritativeSubjects.executionGroups[0]!),
      kind: "warmup" as const,
      ordinal: 0
    };
    const outcomes = await Promise.allSettled([
      lease.driver.runBaselineSample(structuredClone(input)),
      lease.driver.runBaselineSample(structuredClone(input))
    ]);
    assert.equal(outcomes.every((row) => row.status === "rejected"), true);
    assert.equal(harness.observations().baselineStages.length, 1);
    assert.equal(harness.observations().baselineCommitCount, 0);
    assert.equal(harness.observations().browserCloseCount, 1);
  });

  await t.test("calibration failure", async () => {
    const harness = fixture.createHarness({ acceptedReceipt: "valid", fault: "pixel-mismatch" });
    const lease = await harness.prepare();
    await completeAuthenticatedBaseline(lease);
    const input = {
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup" as const,
      ordinal: 0
    };
    const outcomes = await Promise.allSettled([
      lease.driver.runCalibrationSample(structuredClone(input)),
      lease.driver.runCalibrationSample(structuredClone(input))
    ]);
    assert.equal(outcomes.every((row) => row.status === "rejected"), true);
    assert.equal(harness.observations().screenshotCount, 1);
    assert.equal(harness.observations().calibrationCommitCount, 0);
    assert.equal(harness.observations().browserCloseCount, 1);
  });
});

test("lease close rejects queued transactions without hanging or double-closing", async () => {
  const harness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await harness.prepare();
  const input = {
    group: structuredClone(authoritativeSubjects.executionGroups[0]!),
    kind: "warmup" as const,
    ordinal: 0
  };
  const first = lease.driver.runBaselineSample(structuredClone(input));
  const second = lease.driver.runBaselineSample(structuredClone(input));
  const outcomes = await Promise.allSettled([first, second, lease.close()]);
  assert.equal(outcomes[0]!.status, "rejected");
  assert.equal(outcomes[1]!.status, "rejected");
  assert.equal(outcomes[2]!.status, "fulfilled");
  assert.equal(harness.observations().baselineStages.length, 0);
  assert.equal(harness.observations().baselineCommitCount, 0);
  assert.equal(harness.observations().browserCloseCount, 1);
});

test("monotonic regression, wrong stage acknowledgement, and non-zero pixel mismatch reject evidence",
async (t) => {
  for (const [fault, run, pattern] of [
    ["monotonic-regression", "baseline", /monotonic clock.*advance/i],
    ["wrong-stage", "baseline", /stage acknowledgement.*drift/i],
    ["pixel-mismatch", "calibration", /pixel comparison.*mismatch/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({
        acceptedReceipt: "valid",
        fault
      });
      const lease = await harness.prepare();
      try {
        if (run === "baseline") {
          await assert.rejects(() => lease.driver.runBaselineSample({
            group: structuredClone(baselineGroup),
            kind: "warmup",
            ordinal: 0
          }), pattern);
        } else {
          await completeAuthenticatedBaseline(lease);
          await assert.rejects(() => lease.driver.runCalibrationSample({
            dimensionClass: structuredClone(calibrationClass),
            kind: "warmup",
            ordinal: 0
          }), pattern);
        }
      } finally {
        await lease.close();
      }
    });
  }
});

test("closing the lease reaps the sole browser context and makes the driver unusable", async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid"
  });
  const lease = await harness.prepare();
  await lease.close();
  await lease.close();
  assert.equal(harness.observations().browserCloseCount, 1);
  await assert.rejects(() => lease.driver.runBaselineSample({
    group: structuredClone(baselineGroup),
    kind: "measured",
    ordinal: 1
  }), /driver lease is closed/i);
});

test("mobile evidence rejects a desktop physical context even when its page viewport is 393 by 727",
async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid",
    fault: "wrong-mobile-physical-context"
  } as never);
  const lease = await harness.prepare();
  try {
    for (const group of authoritativeSubjects.executionGroups) {
      if (group.groupKey === mobileBaselineGroup.groupKey) break;
      for (let ordinal = 0; ordinal < 7; ordinal += 1) {
        await lease.driver.runBaselineSample({
          group: structuredClone(group),
          kind: ordinal < 2 ? "warmup" : "measured",
          ordinal
        });
      }
    }
    await assert.rejects(() => lease.driver.runBaselineSample({
      group: structuredClone(mobileBaselineGroup),
      kind: "warmup",
      ordinal: 0
    }), /physical context.*mobile-chrome|mobile-chrome.*physical context/i);
  } finally {
    await lease.close();
  }
});

test("calibration fails closed for an unrelated page screenshot and resized self-comparison",
async (t) => {
  for (const [fault, pattern] of [
    ["unrelated-page-screenshot", /exact target Canvas|target crop/i],
    ["unrelated-page-exact-target", /pixel comparison.*mismatch/i],
    ["resized-self-compare", /independent expected.*current|self-comparison/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault } as never);
      const lease = await harness.prepare();
      try {
        await completeAuthenticatedBaseline(lease);
        await assert.rejects(() => lease.driver.runCalibrationSample({
          dimensionClass: structuredClone(calibrationClass),
          kind: "warmup",
          ordinal: 0
        }), pattern);
      } finally {
        await lease.close();
      }
    });
  }
});

test("calibration rejects a comparator that lies about zero independently hashed pixel mismatch",
async () => {
  const harness = fixture.createHarness({
    acceptedReceipt: "valid",
    fault: "false-zero-comparator"
  } as never);
  const lease = await harness.prepare();
  try {
    await completeAuthenticatedBaseline(lease);
    await assert.rejects(() => lease.driver.runCalibrationSample({
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup",
      ordinal: 0
    }), /zero mismatch requires identical.*pixel hashes/i);
  } finally {
    await lease.close();
  }
});

test("allowed-field group and class forgeries are rejected before physical evidence", async () => {
  const groupHarness = fixture.createHarness({ acceptedReceipt: "valid" });
  const groupLease = await groupHarness.prepare();
  try {
    const forgedGroup = {
      ...structuredClone(baselineGroup),
      expectedRecordCount: baselineGroup.expectedRecordCount + 1
    };
    await assert.rejects(() => groupLease.driver.runBaselineSample({
      group: forgedGroup,
      kind: "warmup",
      ordinal: 0
    }), /authenticated execution plan|execution-group membership/i);

    assert.equal(groupHarness.observations().baselineStages.length, 0);
  } finally {
    await groupLease.close();
  }

  const classHarness = fixture.createHarness({ acceptedReceipt: "valid" });
  const classLease = await classHarness.prepare();
  try {
    const forgedClass = {
      ...structuredClone(calibrationClass),
      cropCount: calibrationClass.cropCount + 1,
      maximumDimensions: {
        backingSize: { height: 8, width: 8 },
        clipSize: { height: 8, width: 8 },
        cssSize: { height: 8, width: 8 }
      },
      reviewedClassSha256: "c".repeat(64),
      reviewedPoliciesSha256: "d".repeat(64)
    };
    await assert.rejects(() => classLease.driver.runCalibrationSample({
      dimensionClass: forgedClass,
      kind: "warmup",
      ordinal: 0
    }), /authenticated dimension class|dimension registry/i);
    assert.equal(classHarness.observations().baselineStages.length, 0);
    assert.equal(classHarness.observations().screenshotCount, 0);
  } finally {
    await classLease.close();
  }
});

test("copied, moved, or renamed sibling receipt bytes lack lifecycle provenance", async (t) => {
  for (const fault of [
    "copied-sibling-receipt",
    "moved-sibling-receipt",
    "renamed-sibling-receipt"
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault } as never);
      await assert.rejects(() => harness.prepare(), /lifecycle provenance|A22.*authority/i);
      assert.equal(harness.observations().browserLaunchCount, 0);
    });
  }
});

test("calibration cannot precede all authenticated baseline samples", async () => {
  const harness = fixture.createHarness({ acceptedReceipt: "valid" });
  const lease = await harness.prepare();
  try {
    await assert.rejects(() => lease.driver.runCalibrationSample({
      dimensionClass: structuredClone(calibrationClass),
      kind: "warmup",
      ordinal: 0
    }), /complete authenticated baseline/i);
    assert.equal(harness.observations().screenshotCount, 0);
  } finally {
    await lease.close();
  }
});

test("every awaited evidence boundary revalidates the held lifecycle and reaps failures", async (t) => {
  for (const [fault, run, pattern] of [
    ["drift-during-baseline", "baseline", /lifecycle checkpoint.*drift/i],
    ["expire-during-calibration", "calibration", /accepted.*receipt.*expired/i],
    ["new-page-rejection", "prepare", /new page/i],
    ["post-launch-context-drift", "prepare", /physical browser context.*drift/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ acceptedReceipt: "valid", fault } as never);
      if (run === "prepare") {
        await assert.rejects(() => harness.prepare(), pattern);
      } else {
        const lease = await harness.prepare();
        try {
          if (run === "baseline") {
            await assert.rejects(() => lease.driver.runBaselineSample({
              group: structuredClone(baselineGroup), kind: "warmup", ordinal: 0
            }), pattern);
          } else {
            await completeAuthenticatedBaseline(lease);
            await assert.rejects(() => lease.driver.runCalibrationSample({
              dimensionClass: structuredClone(calibrationClass), kind: "warmup", ordinal: 0
            }), pattern);
          }
        } finally {
          await lease.close();
        }
      }
      assert.equal(harness.observations().browserCloseCount, 1);
    });
  }
});

test("ordinary imports expose no arbitrary-kernel lease constructor", async () => {
  const internalPath = path.join(WORKTREE,
    "tests/e2e/california-signature-final-compositor-phase4-real-driver-internal.ts");
  const script = [
    `const imported = await import(${JSON.stringify(internalPath)});`,
    "if (Object.keys(imported).some((key) => /prepare|kernel|lease|bind/i.test(key))) process.exit(7);"
  ].join("\n");
  const result = spawnSync(process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: WORKTREE,
      encoding: "utf8"
    });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
