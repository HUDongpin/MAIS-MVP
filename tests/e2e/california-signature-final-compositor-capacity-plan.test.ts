import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS
} from "./california-signature-exhaustive-artifact-lifecycle";
import {
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME
} from "./california-visualization-qa-helpers";
import {
  californiaSignatureAxisIdsForProject,
  iterateCaliforniaSignatureSourceOracleCanvasReceiptMatrix
} from "./california-signature-exhaustive-qa";
import {
  buildCaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  buildCaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  buildCaliforniaCanvasGraphicsSourceContract
} from "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS,
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS,
  CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256,
  assertCaliforniaSignatureObservedFinalCompositorDimensions,
  buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry,
  buildCaliforniaSignatureReviewedFinalCompositorSourcePlan,
  buildCaliforniaSignatureFinalCompositorTimingReceipt,
  californiaSignatureFinalCompositorGroupKey,
  calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256,
  calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256,
  calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256,
  decideCaliforniaSignatureFinalCompositorCapacity,
  deriveCaliforniaCanvasSourceBackingScaleCap,
  deriveCaliforniaSignatureFinalCompositorExpectedReceiptSequence,
  iterateCaliforniaSignatureFinalCompositorWorkUnits,
  partitionCaliforniaSignatureFinalCompositorGroups,
  summarizeCaliforniaSignatureFinalCompositorCapacityGroups,
  summarizeCaliforniaSignatureFinalCompositorWorkUnits,
  type CaliforniaSignatureFinalCompositorBaseline,
  type CaliforniaSignatureFinalCompositorBindingDimensionPolicy,
  type CaliforniaSignatureFinalCompositorCalibration,
  type CaliforniaSignatureFinalCompositorDimensionClass,
  type CaliforniaSignatureFinalCompositorEnvironmentIdentity,
  type CaliforniaSignatureFinalCompositorExecutionGroupSummary,
  type CaliforniaSignatureFinalCompositorProject,
  type CaliforniaSignatureFinalCompositorProjectDimensionPolicy,
  type CaliforniaSignatureFinalCompositorCapacitySourceIdentity
} from "./california-signature-final-compositor-capacity-plan";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  createCaliforniaSignatureFinalCompositorMeasurementLifecycle,
  readCaliforniaSignatureFinalCompositorMeasurementReceipt,
  type CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput,
  type CaliforniaSignatureFinalCompositorMeasurementSubject,
  type CaliforniaSignatureFinalCompositorRawTimingSample,
  type CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt
} from "./california-signature-final-compositor-measurement-lifecycle";
import {
  disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle,
  publishCaliforniaSignatureFinalCompositorMeasurementTestFixture
} from "./california-signature-final-compositor-measurement-lifecycle.test-fixture";
import type { CaliforniaSignatureCanvasReceiptExpectation } from
  "./california-signature-exhaustive-qa";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const worktreeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const capacityMeasurementLifecycle =
  createCaliforniaSignatureFinalCompositorMeasurementLifecycle({ worktreeRoot });

after(() => {
  disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle(
    capacityMeasurementLifecycle);
});

test("capacity-plan canonical ordering is independent of locale and ICU data", () => {
  const source = readFileSync(new URL(
    "./california-signature-final-compositor-capacity-plan.ts",
    import.meta.url
  ), "utf8");
  assert.match(source, /function compareCodeUnits\(/);
  assert.doesNotMatch(source, /\.localeCompare\(/);
});

test("capacity group identity rejects an arbitrary runtime phase", () => {
  assert.throws(() => californiaSignatureFinalCompositorGroupKey({
    axisId: "desktop-en-light",
    benchId: "AreaLab",
    phase: "diagnostic" as "layout",
    projectName: "desktop-chrome"
  }), /phase must be functional, layout, or structural/);
});

function formalDimensionProjects(): CaliforniaSignatureFinalCompositorProjectDimensionPolicy[] {
  return CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => {
    const evidence = CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName];
    return {
      axisIds: californiaSignatureAxisIdsForProject(projectName),
      deviceScaleFactor: evidence.deviceScaleFactor,
      projectName,
      viewport: { ...evidence.viewport }
    };
  });
}

test("reviewed dimension registry is source-owned and covers every binding/project without observations", () => {
  const sourceContract = buildCaliforniaCanvasGraphicsSourceContract();
  const registry = buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry({
    canvasContract: sourceContract,
    projectDimensionPolicies: formalDimensionProjects()
  });

  assert.equal(registry.unreviewedDiagnostic, false);
  assert.equal(registry.bindingPolicies.length,
    sourceContract.bindings.length * CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.length);
  assert.equal(registry.dimensionClasses.length, 4,
    "current source must independently declare cap-2 and cap-3 classes for each project");
  assert.equal(new Set(registry.bindingPolicies.map((policy) =>
    `${policy.projectName}\0${policy.bindingKey}`
  )).size, registry.bindingPolicies.length);
  assert.equal(registry.dimensionRegistrySha256,
    calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256(registry));

  assert.throws(() => buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry({
    canvasContract: sourceContract,
    projectDimensionPolicies: [...formalDimensionProjects()].reverse()
  }), /formal project order/i,
  "the reviewed registry must not accept a caller-defined formal project order");

  const forgedSourceContract = structuredClone(sourceContract);
  forgedSourceContract.sources[0]!.sourceSha256 = sha256("forged source payload");
  assert.throws(() => buildCaliforniaSignatureReviewedFinalCompositorDimensionRegistry({
    canvasContract: forgedSourceContract,
    projectDimensionPolicies: formalDimensionProjects()
  }), /contract payload differs from current frozen source/i,
  "stale top-level Canvas hashes must not authorize a mutated nested contract payload");
  assert.equal(registry.dimensionRegistrySha256,
    CALIFORNIA_SIGNATURE_REVIEWED_FINAL_COMPOSITOR_DIMENSION_REGISTRY_SHA256);

  const mobileCap2 = registry.dimensionClasses.find((row) =>
    row.classId === "mobile-chrome-source-dpr-cap-2"
  );
  const mobileCap3 = registry.dimensionClasses.find((row) =>
    row.classId === "mobile-chrome-source-dpr-cap-3"
  );
  assert.deepEqual(mobileCap2?.cssSizeBounds,
    { maxHeight: 727, maxWidth: 393, minHeight: 1, minWidth: 1 });
  assert.deepEqual(mobileCap2?.backingSizeBounds,
    { maxHeight: 1_454, maxWidth: 786, minHeight: 1, minWidth: 1 });
  assert.deepEqual(mobileCap3?.backingSizeBounds,
    { maxHeight: 1_999, maxWidth: 1_081, minHeight: 1, minWidth: 1 });

  const shapesPolicies = registry.bindingPolicies.filter((policy) =>
    policy.bindingKey.startsWith("ShapesLab/")
  );
  assert.deepEqual(shapesPolicies.map((policy) => policy.classId), [
    "desktop-chrome-source-dpr-cap-3",
    "mobile-chrome-source-dpr-cap-3"
  ]);
  assert.equal(registry.bindingPolicies.filter((policy) =>
    policy.classId.endsWith("source-dpr-cap-3")
  ).length, 2);
});

test("source backing-scale policy rejects missing, mixed, or unreviewed DPR caps", () => {
  const source = (cap: string) =>
    `const dpr = Math.min(window.devicePixelRatio || 1, ${cap});`;
  assert.equal(deriveCaliforniaCanvasSourceBackingScaleCap(source("2"), "FixtureLab.jsx"), 2);
  assert.equal(deriveCaliforniaCanvasSourceBackingScaleCap(source("2.75"), "FixtureLab.jsx"), 2.75);
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    "const dpr = window.devicePixelRatio || 1;",
    "FixtureLab.jsx"
  ), /no exact bounded devicePixelRatio policy/);
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    `${source("2")}\n${source("3")}`,
    "FixtureLab.jsx"
  ), /mixes multiple devicePixelRatio caps/);
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    source("8"),
    "FixtureLab.jsx"
  ), /outside the reviewed 1\.\.4 range/);
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    `// ${source("2")}\nconst dpr = window.devicePixelRatio || 1;`,
    "FixtureLab.jsx"
  ), /no exact bounded devicePixelRatio policy/,
  "comments must not manufacture a reviewed DPR cap");
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    `const note = ${JSON.stringify(source("2"))};`,
    "FixtureLab.jsx"
  ), /no exact bounded devicePixelRatio policy/,
  "string literals must not manufacture a reviewed DPR cap");
  assert.throws(() => deriveCaliforniaCanvasSourceBackingScaleCap(
    `const unrelated = Math.min(window.devicePixelRatio || 1, 2);\n` +
    `const dpr = window.devicePixelRatio || 1;\n` +
    `canvas.width = Math.round(W * dpr);\n` +
    `canvas.height = Math.round(H * dpr);\n` +
    `ctx.setTransform(dpr, 0, 0, dpr, 0, 0);`,
    "FixtureLab.jsx"
  ), /dpr declaration.*exact bounded|no exact bounded.*dpr declaration/i,
  "an unrelated bounded expression must not authorize an uncapped Canvas dpr binding");
});

const projects: readonly CaliforniaSignatureFinalCompositorProject[] = [
  {
    axisIds: ["desktop-en-light", "desktop-zhHK-dark"],
    projectName: "desktop-chrome"
  },
  {
    axisIds: ["mobile-en-light", "mobile-zhHK-dark"],
    projectName: "mobile-chrome"
  }
];

const dimensionClasses: readonly CaliforniaSignatureFinalCompositorDimensionClass[] = [
  {
    backingSizeBounds: { maxHeight: 2_000, maxWidth: 2_000, minHeight: 1, minWidth: 1 },
    classId: "desktop-reviewed-square",
    clipSizeBounds: { maxHeight: 1_000, maxWidth: 1_000, minHeight: 1, minWidth: 1 },
    cssSizeBounds: { maxHeight: 1_000, maxWidth: 1_000, minHeight: 1, minWidth: 1 },
    projectName: "desktop-chrome",
    reviewedClassSha256: sha256("desktop-reviewed-square")
  },
  {
    backingSizeBounds: { maxHeight: 2_000, maxWidth: 2_000, minHeight: 1, minWidth: 1 },
    classId: "mobile-reviewed-square",
    clipSizeBounds: { maxHeight: 1_000, maxWidth: 1_000, minHeight: 1, minWidth: 1 },
    cssSizeBounds: { maxHeight: 1_000, maxWidth: 1_000, minHeight: 1, minWidth: 1 },
    projectName: "mobile-chrome",
    reviewedClassSha256: sha256("mobile-reviewed-square")
  }
];

const policies: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[] = [
  {
    bindingKey: "canvas-a",
    classId: "desktop-reviewed-square",
    projectName: "desktop-chrome",
    reviewedPolicySha256: sha256("desktop/canvas-a")
  },
  {
    bindingKey: "canvas-b",
    classId: "desktop-reviewed-square",
    projectName: "desktop-chrome",
    reviewedPolicySha256: sha256("desktop/canvas-b")
  },
  {
    bindingKey: "canvas-a",
    classId: "mobile-reviewed-square",
    projectName: "mobile-chrome",
    reviewedPolicySha256: sha256("mobile/canvas-a")
  }
];

const syntheticSourceSnapshotSha256 = sha256("synthetic-source-snapshot");
const syntheticDimensionRegistrySha256 =
  calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256({
    bindingPolicies: policies,
    dimensionClasses,
    projects
  });

function receipt(
  overrides: Partial<CaliforniaSignatureCanvasReceiptExpectation> = {}
): CaliforniaSignatureCanvasReceiptExpectation {
  return {
    axisId: "desktop-en-light",
    benchId: "HeavyBench",
    bindingKeys: ["canvas-b", "canvas-a"],
    canvasCount: 2,
    key: "receipt-1",
    oracleRowKey: sha256("oracle-row-1"),
    phase: "layout",
    stateKey: "layout-state-1",
    surfaceKey: "signature-canvas",
    ...overrides
  };
}

function syntheticReceipts(): CaliforniaSignatureCanvasReceiptExpectation[] {
  return [
    receipt(),
    receipt({
      axisId: "desktop-zhHK-dark",
      bindingKeys: ["canvas-a"],
      canvasCount: 1,
      key: "receipt-2",
      oracleRowKey: sha256("oracle-row-2"),
      stateKey: "layout-state-2"
    }),
    receipt({
      axisId: "mobile-en-light",
      bindingKeys: ["canvas-a"],
      canvasCount: 1,
      key: "receipt-3",
      oracleRowKey: sha256("oracle-row-3"),
      phase: "structural",
      stateKey: "structural-state-3"
    }),
    receipt({
      axisId: "mobile-zhHK-dark",
      benchId: "OtherBench",
      bindingKeys: ["canvas-a"],
      canvasCount: 1,
      key: "receipt-4",
      oracleRowKey: sha256("oracle-row-4"),
      stateKey: "layout-state-4"
    })
  ];
}

function workUnits(
  receipts: Iterable<CaliforniaSignatureCanvasReceiptExpectation> = syntheticReceipts(),
  options: {
    bindingPolicies?: readonly CaliforniaSignatureFinalCompositorBindingDimensionPolicy[];
    classes?: readonly CaliforniaSignatureFinalCompositorDimensionClass[];
    expectedDimensionRegistrySha256?: string;
    projectDefinitions?: readonly CaliforniaSignatureFinalCompositorProject[];
  } = {}
) {
  const selectedPolicies = options.bindingPolicies ?? policies;
  const selectedClasses = options.classes ?? dimensionClasses;
  const selectedProjects = options.projectDefinitions ?? projects;
  return [...iterateCaliforniaSignatureFinalCompositorWorkUnits({
    bindingPolicies: selectedPolicies,
    dimensionClasses: selectedClasses,
    expectedDimensionRegistrySha256: options.expectedDimensionRegistrySha256 ??
      calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256({
        bindingPolicies: selectedPolicies,
        dimensionClasses: selectedClasses,
        projects: selectedProjects
      }),
    projects: selectedProjects,
    receipts,
    sourceSnapshotSha256: syntheticSourceSnapshotSha256,
    unreviewedDiagnostic: false
  })];
}

function expectedSyntheticReceipts(
  receipts: Iterable<CaliforniaSignatureCanvasReceiptExpectation> = syntheticReceipts()
) {
  return deriveCaliforniaSignatureFinalCompositorExpectedReceiptSequence({
    receipts,
    sourceSnapshotSha256: syntheticSourceSnapshotSha256
  });
}

test("lazy work units emit one crop per sorted binding key with a project/bench/axis/phase group", () => {
  let pulls = 0;
  function* lazyReceipts() {
    for (const row of syntheticReceipts()) {
      pulls += 1;
      yield row;
    }
  }

  const iterator = iterateCaliforniaSignatureFinalCompositorWorkUnits({
    bindingPolicies: policies,
    dimensionClasses,
    expectedDimensionRegistrySha256: syntheticDimensionRegistrySha256,
    projects,
    receipts: lazyReceipts(),
    sourceSnapshotSha256: syntheticSourceSnapshotSha256,
    unreviewedDiagnostic: false
  });
  assert.equal(pulls, 0, "constructing the planner must not consume its source iterator");
  const first = iterator.next();
  assert.equal(first.done, false);
  assert.equal(pulls, 1, "the first crop must pull only its first source receipt");
  assert.equal(first.value?.bindingKey, "canvas-a");
  const units = [first.value!, ...iterator];

  assert.equal(pulls, syntheticReceipts().length);
  assert.equal(units.length, 5);
  assert.deepEqual(units.slice(0, 2).map((unit) => unit.bindingKey), ["canvas-a", "canvas-b"]);
  assert.deepEqual(units[0]!.group, {
    axisId: "desktop-en-light",
    benchId: "HeavyBench",
    phase: "layout",
    projectName: "desktop-chrome"
  });
  assert.equal(units[0]!.classId, "desktop-reviewed-square");
  assert.match(units[0]!.key, /^[a-f0-9]{64}$/);
});

test("streaming summary derives exact receipt/crop/class/group/project counters and deterministic SHAs", () => {
  const expectedReceipts = expectedSyntheticReceipts();
  const first = summarizeCaliforniaSignatureFinalCompositorWorkUnits(workUnits(), expectedReceipts);
  const second = summarizeCaliforniaSignatureFinalCompositorWorkUnits(workUnits(), expectedReceipts);

  assert.deepEqual(second, first);
  assert.equal(first.receiptCount, 4);
  assert.equal(first.cropCount, 5);
  assert.equal(first.groupCount, 4);
  assert.deepEqual(first.classes.map((entry) => [entry.classId, entry.cropCount]), [
    ["desktop-reviewed-square", 3],
    ["mobile-reviewed-square", 2]
  ]);
  assert.deepEqual(first.projects.map((entry) => [
    entry.projectName,
    entry.receiptCount,
    entry.cropCount,
    entry.groupCount
  ]), [
    ["desktop-chrome", 2, 3, 2],
    ["mobile-chrome", 2, 2, 2]
  ]);
  assert.match(first.workUnitsSha256, /^[a-f0-9]{64}$/);
  assert.match(first.receiptsSha256, /^[a-f0-9]{64}$/);
  assert.match(first.summarySha256, /^[a-f0-9]{64}$/);
  assert.equal(first.sourceSnapshotSha256, syntheticSourceSnapshotSha256);
  assert.equal(first.unreviewedDiagnostic, false);
});

test("dimension policy is source-owned and rejects missing, extra, duplicate, unknown, and removed bindings", () => {
  assert.throws(() => workUnits(syntheticReceipts(), {
    bindingPolicies: policies.filter((policy) => policy.bindingKey !== "canvas-b")
  }), /missing reviewed dimension policy.*canvas-b/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    bindingPolicies: [...policies, {
      bindingKey: "unused-canvas",
      classId: "mobile-reviewed-square",
      projectName: "mobile-chrome",
      reviewedPolicySha256: sha256("mobile/unused-canvas")
    }]
  }), /extra reviewed dimension polic/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    bindingPolicies: [...policies, policies[0]!]
  }), /duplicate reviewed dimension policy/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    bindingPolicies: policies.map((policy, index) => index === 0
      ? { ...policy, classId: "browser-invented-class" }
      : policy)
  }), /unknown dimension class/i);

  assert.throws(() => workUnits([
    receipt({ bindingKeys: ["canvas-a"], canvasCount: 2 })
  ]), /canvas count.*binding/i);

  assert.throws(() => workUnits([
    receipt({ bindingKeys: ["canvas-a", "canvas-a"], canvasCount: 2 })
  ]), /duplicate canvas binding/i);

  assert.throws(() => workUnits([
    receipt({ axisId: "browser-invented-axis" })
  ]), /unknown project axis/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    expectedDimensionRegistrySha256: sha256("stale independent registry receipt")
  }), /reviewed dimension registry.*digest/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    projectDefinitions: [
      projects[0]!,
      { ...projects[1]!, axisIds: ["mobile-en-light", "desktop-en-light"] }
    ]
  }), /project axes repeat.*desktop-en-light/i);

  assert.throws(() => workUnits(syntheticReceipts(), {
    projectDefinitions: [
      { ...projects[0]!, axisIds: ["desktop-en-light", "desktop-en-light"] },
      projects[1]!
    ]
  }), /project axes repeat.*desktop-en-light/i);

  const observationsCannotRepairMissingPolicy = {
    backingSize: { height: 200, width: 200 },
    clipSize: { height: 100, width: 100 },
    cssSize: { height: 100, width: 100 }
  };
  assert.throws(() => [...iterateCaliforniaSignatureFinalCompositorWorkUnits({
    bindingPolicies: policies.filter((policy) => policy.bindingKey !== "canvas-b"),
    dimensionClasses,
    expectedDimensionRegistrySha256:
      calculateCaliforniaSignatureFinalCompositorDimensionRegistrySha256({
        bindingPolicies: policies.filter((policy) => policy.bindingKey !== "canvas-b"),
        dimensionClasses,
        projects
      }),
    observations: [observationsCannotRepairMissingPolicy],
    projects,
    receipts: syntheticReceipts(),
    sourceSnapshotSha256: syntheticSourceSnapshotSha256,
    unreviewedDiagnostic: false
  } as Parameters<typeof iterateCaliforniaSignatureFinalCompositorWorkUnits>[0])],
  /missing reviewed dimension policy.*canvas-b/i);
});

test("streaming summary rejects duplicate or retrograde receipt transitions and missing middle receipts", () => {
  const expected = expectedSyntheticReceipts();
  const complete = workUnits();
  const duplicateRetrograde = [...complete, { ...complete[0]!, receiptOrdinal: 0 }];
  assert.throws(() => summarizeCaliforniaSignatureFinalCompositorWorkUnits(
    duplicateRetrograde,
    expected
  ), /receipt ordinal.*retrograde|receipt transition.*exact/i);

  const missingMiddle = complete.filter((unit) => unit.receiptKey !== "receipt-2");
  assert.throws(() => summarizeCaliforniaSignatureFinalCompositorWorkUnits(
    missingMiddle,
    expected
  ), /receipt (ordinal|count|sequence).*(expected|exact)/i);

  assert.throws(() => summarizeCaliforniaSignatureFinalCompositorWorkUnits(
    complete,
    { ...expected, receiptsSha256: sha256("independently reviewed stale sequence") }
  ), /receipt sequence.*expected/i);
});

test("observed sizes only validate a predeclared class and never define expected class membership", () => {
  const unit = workUnits()[0]!;
  assert.equal(unit.classId, "desktop-reviewed-square");
  assert.doesNotThrow(() => assertCaliforniaSignatureObservedFinalCompositorDimensions({
    observation: {
      backingSize: { height: 200, width: 200 },
      clipSize: { height: 100, width: 100 },
      cssSize: { height: 100, width: 100 },
      workUnitKey: unit.key
    },
    workUnit: unit
  }));
  assert.equal(unit.classId, "desktop-reviewed-square");
  assert.throws(() => assertCaliforniaSignatureObservedFinalCompositorDimensions({
    observation: {
      backingSize: { height: 200, width: 200 },
      clipSize: { height: 100, width: 1_001 },
      cssSize: { height: 100, width: 1_001 },
      workUnitKey: unit.key
    },
    workUnit: unit
  }), /outside reviewed.*class/i);
});

function weightedGroups(): Array<CaliforniaSignatureFinalCompositorExecutionGroupSummary & { weightMs: number }> {
  const rows: Array<{
    axisId: string;
    benchId: string;
    classId: string;
    phase: "layout" | "structural";
    projectName: string;
    weightMs: number;
  }> = [
    { axisId: "desktop-a", benchId: "HeavyBench", classId: "desktop-class", phase: "layout", projectName: "desktop-chrome", weightMs: 90 },
    { axisId: "desktop-b", benchId: "HeavyBench", classId: "desktop-class", phase: "layout", projectName: "desktop-chrome", weightMs: 80 },
    { axisId: "desktop-c", benchId: "HeavyBench", classId: "desktop-class", phase: "structural", projectName: "desktop-chrome", weightMs: 70 },
    { axisId: "desktop-d", benchId: "OtherBench", classId: "desktop-class", phase: "layout", projectName: "desktop-chrome", weightMs: 10 },
    { axisId: "mobile-a", benchId: "HeavyBench", classId: "mobile-class", phase: "layout", projectName: "mobile-chrome", weightMs: 90 },
    { axisId: "mobile-b", benchId: "HeavyBench", classId: "mobile-class", phase: "layout", projectName: "mobile-chrome", weightMs: 80 },
    { axisId: "mobile-c", benchId: "HeavyBench", classId: "mobile-class", phase: "structural", projectName: "mobile-chrome", weightMs: 70 },
    { axisId: "mobile-d", benchId: "OtherBench", classId: "mobile-class", phase: "layout", projectName: "mobile-chrome", weightMs: 10 }
  ];
  return rows.map((row) => ({
    axisId: row.axisId,
    benchId: row.benchId,
    classCropCounts: [{ classId: row.classId, cropCount: 1 }],
    cropCount: 1,
    expectedRecordCount: 1,
    groupKey: [row.projectName, row.benchId, row.axisId, row.phase].join("\u0000"),
    phase: row.phase,
    projectName: row.projectName,
    receiptCount: 1,
    weightMs: row.weightMs
  }));
}

function capacitySourceIdentity(
  groups: readonly (CaliforniaSignatureFinalCompositorExecutionGroupSummary & { weightMs: number })[],
  classIds: readonly string[] = [...new Set(groups.flatMap((group) =>
    group.classCropCounts.map((row) => row.classId)
  ))].sort(),
  terminalArtifactTarget = 4
): CaliforniaSignatureFinalCompositorCapacitySourceIdentity {
  const groupIdentity = summarizeCaliforniaSignatureFinalCompositorCapacityGroups(groups);
  assert.deepEqual(groupIdentity.classes.map((row) => row.classId), [...classIds].sort(),
    "synthetic capacity identity classes must equal its exact group classes");
  return {
    classes: groupIdentity.classes.map((row) => ({
      ...row,
      maximumDimensions: {
        backingSize: { height: 300, width: 300 },
        clipSize: { height: 100, width: 100 },
        cssSize: { height: 100, width: 100 }
      },
      reviewedClassSha256: sha256(`${row.classId}/reviewed-class`),
      reviewedPoliciesSha256: sha256(`${row.classId}/reviewed-binding-policies`)
    })),
    cropCount: groupIdentity.cropCount,
    dimensionRegistrySha256: sha256("capacity-reviewed-dimension-registry"),
    evidenceRecordCount: groupIdentity.evidenceRecordCount,
    formalContract: {
      projectNames: groupIdentity.projects.map((project) => project.projectName),
      terminalArtifactTarget
    },
    groupCount: groupIdentity.groupCount,
    groupsSha256: groupIdentity.groupsSha256,
    projects: groupIdentity.projects,
    receiptCount: groupIdentity.receiptCount,
    receiptsSha256: sha256("capacity-reviewed-receipt-sequence"),
    sourceSnapshotSha256: sha256("capacity-reviewed-source-snapshot"),
    summarySha256: sha256("capacity-reviewed-source-summary"),
    unreviewedDiagnostic: false,
    workUnitsSha256: sha256("capacity-reviewed-work-units")
  };
}

test("weighted partition is deterministic, contiguous, splits a heavy bench by group, and covers each project once", () => {
  const groups = weightedGroups();
  const options = {
    groups,
    projectNames: ["desktop-chrome", "mobile-chrome"],
    sourceIdentity: capacitySourceIdentity(groups, undefined, 6),
    terminalArtifactTarget: 6
  } as const;
  const first = partitionCaliforniaSignatureFinalCompositorGroups(options);
  const second = partitionCaliforniaSignatureFinalCompositorGroups(options);
  assert.deepEqual(second, first);
  assert.equal(first.slotCount, 3);
  assert.equal(first.packages.length, 3);
  assert.equal(first.terminalArtifactTarget, 6);
  assert.match(first.planSha256, /^[a-f0-9]{64}$/);

  for (const projectName of options.projectNames) {
    const expected = options.groups.filter((group) => group.projectName === projectName)
      .map((group) => group.groupKey);
    const actual = first.packages.flatMap((workPackage) => {
      const slice = workPackage.projects.find((project) => project.projectName === projectName);
      assert.ok(slice);
      assert.ok(slice.groupKeys.length > 0);
      return slice.groupKeys;
    });
    assert.deepEqual(actual, expected, `${projectName} groups must retain source order and exact union`);
    assert.equal(new Set(actual).size, actual.length);
  }

  const desktopHeavyPackageCount = first.packages.filter((workPackage) => {
    const slice = workPackage.projects.find((project) => project.projectName === "desktop-chrome")!;
    return slice.groupKeys.some((groupKey) => groupKey.includes("HeavyBench"));
  }).length;
  assert.ok(desktopHeavyPackageCount > 1,
    "a heavy bench must be splittable across packages only at complete group boundaries");

  assert.throws(() => partitionCaliforniaSignatureFinalCompositorGroups({
    ...options,
    terminalArtifactTarget: 5
  }), /source-owned terminal artifact target/i);
  assert.throws(() => partitionCaliforniaSignatureFinalCompositorGroups({
    ...options,
    groups: [...options.groups, options.groups[0]!]
  }), /duplicate group/i);
  assert.throws(() => partitionCaliforniaSignatureFinalCompositorGroups({
    ...options,
    projectNames: [...options.projectNames].reverse()
  }), /source-owned project order/i);
  assert.throws(() => partitionCaliforniaSignatureFinalCompositorGroups({
    ...options,
    terminalArtifactTarget: 4
  }), /source-owned terminal artifact target/i);
});

function measurementEnvironmentInput(
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  processCount = 1
): CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput {
  return {
    architecture: "arm64",
    browserBinaryPath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    browserBuildId: "synthetic-formal-build",
    browserChannel: "chrome",
    browserExecutableSha256: sha256("formal-browser-executable"),
    browserLaunchArgs: ["--headless=new", "--force-color-profile=srgb"],
    browserVersion: "synthetic-chrome-1",
    colorProfile: "srgb",
    cpuLogicalCoreCount: 64,
    cpuModel: "synthetic-arm-cpu",
    cpuPhysicalCoreCount: 32,
    dependencyLockSha256: sha256("synthetic-package-lock"),
    fontInventory: [{
      family: "Arial",
      fileSha256: sha256("synthetic-arial-font"),
      postscriptName: "ArialMT",
      sourcePath: "/System/Library/Fonts/Supplemental/Arial.ttf",
      version: "synthetic-1"
    }],
    headless: true,
    kernelVersion: "synthetic-kernel-1",
    libvipsVersion: "8.17.1",
    loadAverage1mMilli: 250,
    locale: "en-US",
    nodeVersion: "v24.15.0",
    operatingSystem: "darwin",
    playwrightVersion: "1.55.0",
    powerSource: "ac",
    processCount,
    ramBytes: 68_719_476_736,
    sharpVersion: "0.34.3",
    sourceBuildId: "synthetic-next-build-1",
    sourceBuildSha256: sha256("synthetic-next-build"),
    sourcePlanSha256:
      calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(sourceIdentity),
    sourceSnapshotSha256: sourceIdentity.sourceSnapshotSha256,
    storageFileSystem: "apfs",
    storageFreeBytes: 1_000_000_000,
    storageTotalBytes: 2_000_000_000,
    storageVolumePath: "/Volumes/Starship",
    thermalState: "nominal",
    timezone: "Asia/Hong_Kong",
    workersPerProcess: 1
  };
}

function measurementEnvironmentInputFromIdentity(
  environment: CaliforniaSignatureFinalCompositorEnvironmentIdentity
): CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput {
  const {
    browserLaunchArgsSha256: _browserLaunchArgsSha256,
    browserSha256: _browserSha256,
    dependencySha256: _dependencySha256,
    environmentSha256: _environmentSha256,
    fontInventorySha256: _fontInventorySha256,
    machineSha256: _machineSha256,
    ...input
  } = environment;
  return structuredClone(input);
}

function samplesForUpperBound(
  upperBoundMs: number
): readonly CaliforniaSignatureFinalCompositorRawTimingSample[] {
  const policy = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY;
  let maximumMeasuredMs: number | null = null;
  const approximate = Math.max(1,
    Math.floor((upperBoundMs - policy.fixedHeadroomMs) * 10_000 /
      policy.safetyMultiplierBps));
  for (let durationMs = Math.max(1, approximate - 4);
      durationMs <= approximate + 4; durationMs += 1) {
    const derived = Math.ceil(durationMs * policy.safetyMultiplierBps / 10_000) +
      policy.fixedHeadroomMs;
    if (derived === upperBoundMs) {
      maximumMeasuredMs = durationMs;
      break;
    }
  }
  assert.ok(maximumMeasuredMs !== null,
    `synthetic upper bound ${upperBoundMs} is not representable under fixed reviewed policy`);
  const measuredDurations = [
    Math.max(1, maximumMeasuredMs - 4),
    Math.max(1, maximumMeasuredMs - 3),
    Math.max(1, maximumMeasuredMs - 2),
    Math.max(1, maximumMeasuredMs - 1),
    maximumMeasuredMs
  ];
  const durations = [1, 1, ...measuredDurations];
  return durations.map((durationMs, ordinal) => {
    const startedAtMonotonicMs = 1_000 + ordinal * (maximumMeasuredMs! + 10);
    return {
      durationMs,
      endedAtMonotonicMs: startedAtMonotonicMs + durationMs,
      kind: ordinal < policy.warmupCount ? "warmup" as const : "measured" as const,
      ordinal,
      startedAtMonotonicMs
    };
  });
}

let syntheticMeasurementOrdinal = 0;

function syntheticTimingReceipt(
  subject: CaliforniaSignatureFinalCompositorMeasurementSubject,
  upperBoundMs: number,
  producerLabel: string,
  environmentInput: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput,
  compositorImplementationSha256 = sha256("synthetic-final-compositor-implementation")
) {
  syntheticMeasurementOrdinal += 1;
  const publication = publishCaliforniaSignatureFinalCompositorMeasurementTestFixture({
    compositorImplementationSha256,
    environment: environmentInput,
    fileName: `${producerLabel}-${syntheticMeasurementOrdinal}.json`,
    lifecycle: capacityMeasurementLifecycle,
    samples: samplesForUpperBound(upperBoundMs),
    subject
  });
  const measurement = readCaliforniaSignatureFinalCompositorMeasurementReceipt({
    expectedFileSha256: publication.fileSha256,
    fileName: publication.fileName,
    lifecycle: capacityMeasurementLifecycle
  });
  const timingReceipt = buildCaliforniaSignatureFinalCompositorTimingReceipt({
    measurement,
    subject
  });
  assert.equal(timingReceipt.upperBoundMs, upperBoundMs);
  return { environment: measurement.receipt.environment, timingReceipt };
}

function baseline(
  groupKey: string,
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  upperBoundMs = 100,
  processCount = 1,
  compositorImplementationSha256 = sha256("synthetic-final-compositor-implementation")
): CaliforniaSignatureFinalCompositorBaseline {
  const sourcePlanSha256 =
    calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(sourceIdentity);
  const base = {
    coverage: {
      finalCompositorExcluded: true,
      hydrate: true,
      layout: true,
      navigation: true,
      realReset: true,
      replay: true
    },
    dimensionRegistrySha256: sourceIdentity.dimensionRegistrySha256,
    groupKey,
    sourcePlanSha256,
    sourceSnapshotSha256: sourceIdentity.sourceSnapshotSha256,
    upperBoundMs,
    workUnitsSha256: sourceIdentity.workUnitsSha256
  };
  const measurementSubject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
    dimensionRegistrySha256: base.dimensionRegistrySha256,
    groupKey: base.groupKey,
    kind: "baseline-group-v2",
    sourcePlanSha256,
    sourceSnapshotSha256: base.sourceSnapshotSha256,
    stageCoverage: {
      finalCompositorIncluded: false,
      hydrate: true,
      layout: true,
      navigation: true,
      realReset: true,
      replay: true
    },
    workUnitsSha256: base.workUnitsSha256
  };
  const measured = syntheticTimingReceipt(measurementSubject, upperBoundMs, "baseline",
    measurementEnvironmentInput(sourceIdentity, processCount), compositorImplementationSha256);
  return {
    ...base,
    environment: measured.environment,
    timingReceipt: measured.timingReceipt
  };
}

function calibration(
  classId: string,
  sourceIdentity: CaliforniaSignatureFinalCompositorCapacitySourceIdentity,
  upperBoundMsPerCrop: number,
  processCount = 1,
  compositorImplementationSha256 = sha256("synthetic-final-compositor-implementation")
): CaliforniaSignatureFinalCompositorCalibration {
  const reviewedClass = sourceIdentity.classes.find((row) => row.classId === classId);
  assert.ok(reviewedClass);
  const base = {
    classId,
    dimensionRegistrySha256: sourceIdentity.dimensionRegistrySha256,
    maximumDimensions: structuredClone(reviewedClass.maximumDimensions),
    reviewedClassSha256: reviewedClass.reviewedClassSha256,
    reviewedPoliciesSha256: reviewedClass.reviewedPoliciesSha256,
    sourceClassCropCount: reviewedClass.cropCount,
    sourcePlanSha256:
      calculateCaliforniaSignatureFinalCompositorCapacitySourceIdentitySha256(sourceIdentity),
    upperBoundMsPerCrop
  };
  const measurementSubject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
    calibratedCropCount: 1,
    classId: base.classId,
    dimensionRegistrySha256: base.dimensionRegistrySha256,
    kind: "compositor-class-calibration-v2",
    maximumDimensions: base.maximumDimensions,
    reviewedClassSha256: base.reviewedClassSha256,
    reviewedPoliciesSha256: base.reviewedPoliciesSha256,
    sourceClassCropCount: base.sourceClassCropCount,
    sourcePlanSha256: base.sourcePlanSha256,
    sourceSnapshotSha256: sourceIdentity.sourceSnapshotSha256,
    stageCoverage: {
      finalCompositorIncluded: true,
      hydrate: false,
      layout: false,
      navigation: false,
      realReset: false,
      replay: false
    }
  };
  const measured = syntheticTimingReceipt(measurementSubject, upperBoundMsPerCrop,
    "calibration", measurementEnvironmentInput(sourceIdentity, processCount),
    compositorImplementationSha256);
  return {
    ...base,
    environment: measured.environment,
    timingReceipt: measured.timingReceipt
  };
}

function retimeBaseline(
  row: CaliforniaSignatureFinalCompositorBaseline,
  upperBoundMs: number
): CaliforniaSignatureFinalCompositorBaseline {
  const measurementSubject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
    dimensionRegistrySha256: row.dimensionRegistrySha256,
    groupKey: row.groupKey,
    kind: "baseline-group-v2",
    sourcePlanSha256: row.sourcePlanSha256,
    sourceSnapshotSha256: row.sourceSnapshotSha256,
    stageCoverage: {
      finalCompositorIncluded: false,
      hydrate: true,
      layout: true,
      navigation: true,
      realReset: true,
      replay: true
    },
    workUnitsSha256: row.workUnitsSha256
  };
  const measured = syntheticTimingReceipt(measurementSubject, upperBoundMs, "baseline-retime",
    measurementEnvironmentInputFromIdentity(row.environment),
    row.timingReceipt.compositorImplementationSha256);
  return {
    ...row,
    environment: measured.environment,
    timingReceipt: measured.timingReceipt,
    upperBoundMs
  };
}

function retimeCalibration(
  row: CaliforniaSignatureFinalCompositorCalibration,
  upperBoundMsPerCrop: number
): CaliforniaSignatureFinalCompositorCalibration {
  const measurementSubject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
    calibratedCropCount: 1,
    classId: row.classId,
    dimensionRegistrySha256: row.dimensionRegistrySha256,
    kind: "compositor-class-calibration-v2",
    maximumDimensions: row.maximumDimensions,
    reviewedClassSha256: row.reviewedClassSha256,
    reviewedPoliciesSha256: row.reviewedPoliciesSha256,
    sourceClassCropCount: row.sourceClassCropCount,
    sourcePlanSha256: row.sourcePlanSha256,
    sourceSnapshotSha256: row.environment.sourceSnapshotSha256,
    stageCoverage: {
      finalCompositorIncluded: true,
      hydrate: false,
      layout: false,
      navigation: false,
      realReset: false,
      replay: false
    }
  };
  const measured = syntheticTimingReceipt(measurementSubject, upperBoundMsPerCrop,
    "calibration-retime", measurementEnvironmentInputFromIdentity(row.environment),
    row.timingReceipt.compositorImplementationSha256);
  return {
    ...row,
    environment: measured.environment,
    timingReceipt: measured.timingReceipt,
    upperBoundMsPerCrop
  };
}

function capacityFixture() {
  const groups: Array<CaliforniaSignatureFinalCompositorExecutionGroupSummary & { weightMs: number }> = [
    {
      axisId: "desktop-a",
      benchId: "BenchA",
      classCropCounts: [{ classId: "desktop-class", cropCount: 2 }],
      cropCount: 2,
      expectedRecordCount: 3,
      groupKey: "desktop-chrome\u0000BenchA\u0000desktop-a\u0000layout",
      phase: "layout",
      projectName: "desktop-chrome",
      receiptCount: 1,
      weightMs: 120
    },
    {
      axisId: "desktop-b",
      benchId: "BenchB",
      classCropCounts: [{ classId: "desktop-class", cropCount: 1 }],
      cropCount: 1,
      expectedRecordCount: 2,
      groupKey: "desktop-chrome\u0000BenchB\u0000desktop-b\u0000structural",
      phase: "structural",
      projectName: "desktop-chrome",
      receiptCount: 1,
      weightMs: 110
    },
    {
      axisId: "mobile-a",
      benchId: "BenchA",
      classCropCounts: [{ classId: "mobile-class", cropCount: 1 }],
      cropCount: 1,
      expectedRecordCount: 2,
      groupKey: "mobile-chrome\u0000BenchA\u0000mobile-a\u0000layout",
      phase: "layout",
      projectName: "mobile-chrome",
      receiptCount: 1,
      weightMs: 120
    },
    {
      axisId: "mobile-b",
      benchId: "BenchB",
      classCropCounts: [{ classId: "mobile-class", cropCount: 1 }],
      cropCount: 1,
      expectedRecordCount: 2,
      groupKey: "mobile-chrome\u0000BenchB\u0000mobile-b\u0000structural",
      phase: "structural",
      projectName: "mobile-chrome",
      receiptCount: 1,
      weightMs: 110
    }
  ];
  const sourceIdentity = capacitySourceIdentity(groups);
  const plan = partitionCaliforniaSignatureFinalCompositorGroups({
    groups,
    projectNames: ["desktop-chrome", "mobile-chrome"],
    sourceIdentity,
    terminalArtifactTarget: 4
  });
  const baselines = groups.map((group) => baseline(group.groupKey, sourceIdentity));
  return {
    baselines,
    calibrations: [
      calibration("desktop-class", sourceIdentity, 10),
      calibration("mobile-class", sourceIdentity, 20)
    ],
    environment: baselines[0]!.environment,
    groups,
    plan,
    sourceIdentity
  };
}

test("capacity decision binds complete baseline/calibration identity and adds compositor cost exactly once", () => {
  const fixture = capacityFixture();
  assert.equal("planSha256" in fixture.baselines[0]!, false,
    "baseline evidence must precede and inform the partition plan, not cite it circularly");
  const decision = decideCaliforniaSignatureFinalCompositorCapacity({
    ...fixture,
    artifactHeadroomMs: 10,
    formalHeadroomMs: 10
  });

  assert.equal(decision.passed, true);
  assert.equal(decision.formalExecutionAuthorized, false,
    "a pure capacity planner must never claim formal execution authorization");
  assert.equal(decision.artifactForecasts.length, 4);
  assert.equal(decision.baselineUpperBoundMs, 400);
  assert.equal(decision.compositorCropCount, 5);
  assert.equal(decision.compositorImplementationSha256,
    sha256("synthetic-final-compositor-implementation"));
  assert.equal(decision.compositorUpperBoundMs, 70);
  assert.equal(decision.measurementReceiptCount, 6);
  assert.match(decision.measurementReceiptsSha256, /^[a-f0-9]{64}$/);
  assert.equal(decision.makespanUpperBoundMs, 470,
    "formal concurrency one must sum every artifact, not treat artifact count as concurrency");
  assert.match(decision.decisionSha256, /^[a-f0-9]{64}$/);

  const exactOnce = decision.artifactForecasts.reduce((sum, artifact) =>
    sum + artifact.upperBoundMs, 0);
  assert.equal(exactOnce, decision.baselineUpperBoundMs + decision.compositorUpperBoundMs);
});

test("capacity planning rejects a forged subset of groups under an exact full-source identity", () => {
  const fixture = capacityFixture();
  const forgedGroups = [fixture.groups[0]!, fixture.groups[2]!];
  assert.throws(() => partitionCaliforniaSignatureFinalCompositorGroups({
    groups: forgedGroups,
    projectNames: ["desktop-chrome", "mobile-chrome"],
    sourceIdentity: fixture.sourceIdentity,
    terminalArtifactTarget: 2
  }), /source.*group summary|group summary.*source/i);
});

test("capacity decision revalidates source-owned project order, artifact target, and package IDs", () => {
  const fixture = capacityFixture();
  const reversedBase = {
    ...fixture.plan,
    packages: fixture.plan.packages.map((workPackage) => ({
      ...workPackage,
      projects: [...workPackage.projects].reverse()
    })),
    projectNames: [...fixture.plan.projectNames].reverse()
  };
  const { planSha256: _reversedSha, ...reversedWithoutSha } = reversedBase;
  const reversedPlan = {
    ...reversedWithoutSha,
    planSha256: calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
      reversedWithoutSha)
  };
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...fixture,
    artifactHeadroomMs: 1,
    formalHeadroomMs: 1,
    plan: reversedPlan
  }), /source-owned project order/i);

  const renamedWithoutSha = {
    ...fixture.plan,
    packages: fixture.plan.packages.map((workPackage, index) => index === 0
      ? { ...workPackage, packageId: "forged-package" }
      : workPackage)
  };
  const { planSha256: _renamedSha, ...renamedBase } = renamedWithoutSha;
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...fixture,
    artifactHeadroomMs: 1,
    formalHeadroomMs: 1,
    plan: {
      ...renamedBase,
      planSha256: calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(renamedBase)
    }
  }), /canonical weighted partition/i);

  const swappedPackages = fixture.plan.packages.map((workPackage, index, packages) => ({
    ...workPackage,
    projects: workPackage.projects.map((project) => project.projectName === "desktop-chrome"
      ? structuredClone(packages[index === 0 ? 1 : 0]!.projects.find((candidate) =>
          candidate.projectName === "desktop-chrome")!)
      : structuredClone(project))
  }));
  const swappedBase = { ...fixture.plan, packages: swappedPackages };
  const { planSha256: _swappedSha, ...swappedWithoutSha } = swappedBase;
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...fixture,
    artifactHeadroomMs: 1,
    formalHeadroomMs: 1,
    plan: {
      ...swappedWithoutSha,
      planSha256: calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
        swappedWithoutSha)
    }
  }), /canonical weighted partition/i);
});

test("capacity timing receipt projects only one held-FD measurement under the fixed policy", () => {
  const fixture = capacityFixture();
  const receipt = retimeBaseline(fixture.baselines[0]!, 37).timingReceipt;
  assert.equal(receipt.upperBoundMs, 37,
    "ceil(max measured 24ms * 1.25) + 7ms must be independently derived");
  assert.match(receipt.measurementsSha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.receiptSha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(receipt.policy,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY);
});

test("capacity timing builder rejects caller-authored raw SHA and forged one-millisecond samples", () => {
  const rawCallerMeasurement = {
    fileName: "forged-one-millisecond.json",
    filePath: path.join(worktreeRoot, ".tmp", "forged-one-millisecond.json"),
    fileSha256: sha256("caller-authored-producer-receipt"),
    receipt: {
      formalExecutionAuthorized: false,
      status: "diagnostic-measurement",
      upperBoundMs: 1
    }
  } as unknown as CaliforniaSignatureFinalCompositorValidatedMeasurementReceipt;
  assert.throws(() => buildCaliforniaSignatureFinalCompositorTimingReceipt({
    measurement: rawCallerMeasurement,
    subject: {} as CaliforniaSignatureFinalCompositorMeasurementSubject
  }), /held-FD|validated measurement|brand/i);
});

test("capacity decision rejects incomplete baselines and stale, missing, extra, or duplicate class calibration", () => {
  const fixture = capacityFixture();
  const common = {
    ...fixture,
    artifactHeadroomMs: 10,
    formalHeadroomMs: 10
  };
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, coverage: { ...row.coverage, realReset: false } }
      : row)
  }), /baseline.*real reset/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, coverage: { ...row.coverage, finalCompositorExcluded: false } }
      : row)
  }), /baseline.*compositor.*excluded/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.slice(1)
  }), /missing baseline.*desktop-chrome/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: [...common.baselines, retimeBaseline({
      ...common.baselines[0]!,
      groupKey: "desktop-chrome\u0000unused\u0000unused-axis\u0000layout"
    }, common.baselines[0]!.upperBoundMs)]
  }), /extra baseline.*unused/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: [...common.baselines, common.baselines[0]!]
  }), /duplicate baseline/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.slice(1)
  }), /missing calibration.*desktop-class/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: [...common.calibrations, retimeCalibration({
      ...common.calibrations[0]!,
      classId: "unused-class"
    }, common.calibrations[0]!.upperBoundMsPerCrop)]
  }), /extra calibration.*unused-class/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: [...common.calibrations, common.calibrations[0]!]
  }), /duplicate calibration/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, environment: { ...row.environment, browserSha256: sha256("stale-browser") } }
      : row)
  }), /calibration.*brand/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, environment: { ...row.environment, sharpVersion: "stale-sharp" } }
      : row)
  }), /calibration.*brand/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, environment: { ...row.environment, machineSha256: sha256("stale-machine") } }
      : row)
  }), /calibration.*brand/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, environment: { ...row.environment, processCount: 2 } }
      : row)
  }), /calibration.*brand/i);

  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, sourceSnapshotSha256: sha256("stale baseline source") }
      : row)
  }), /baseline.*source snapshot/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, workUnitsSha256: sha256("stale baseline work units") }
      : row)
  }), /baseline.*work-unit/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, sourcePlanSha256: sha256("stale baseline source plan") }
      : row)
  }), /baseline.*source plan/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, environment: { ...row.environment, browserSha256: sha256("stale baseline browser") } }
      : row)
  }), /baseline.*brand/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, reviewedPoliciesSha256: sha256("stale reviewed binding policies") }
      : row)
  }), /calibration.*reviewed polic/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, dimensionRegistrySha256: sha256("stale calibration dimension registry") }
      : row)
  }), /calibration.*dimension registry/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? {
          ...row,
          maximumDimensions: {
            ...row.maximumDimensions,
            clipSize: { ...row.maximumDimensions.clipSize, width: 101 }
          }
        }
      : row)
  }), /calibration.*maximum dimensions/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    calibrations: common.calibrations.map((row, index) => index === 0
      ? { ...row, sourceClassCropCount: row.sourceClassCropCount + 1 }
      : row)
  }), /calibration.*source class crop count/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? { ...row, timingReceipt: structuredClone(row.timingReceipt) }
      : row)
  }), /timing receipt.*held-FD|timing receipt.*brand/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: common.baselines.map((row, index) => index === 0
      ? baseline(row.groupKey, common.sourceIdentity, row.upperBoundMs, 1,
          sha256("swapped-compositor-implementation"))
      : row)
  }), /measurement compositor implementation drifted/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    sourceIdentity: { ...common.sourceIdentity, unreviewedDiagnostic: true }
  }), /unreviewed diagnostic/i);
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    plan: { ...common.plan, packages: common.plan.packages.slice(1) }
  }), /plan digest.*exact contents/i);
  const concurrentBaselines = common.groups.map((group) =>
    baseline(group.groupKey, common.sourceIdentity, 100, 3));
  assert.throws(() => decideCaliforniaSignatureFinalCompositorCapacity({
    ...common,
    baselines: concurrentBaselines,
    calibrations: [
      calibration("desktop-class", common.sourceIdentity, 10, 3),
      calibration("mobile-class", common.sourceIdentity, 20, 3)
    ],
    environment: concurrentBaselines[0]!.environment
  }), /process concurrency exceeds non-empty package lanes/i);
});

test("capacity decision enforces strict artifact and formal timeout headroom boundaries at one millisecond", () => {
  const fixture = capacityFixture();
  const artifactHeadroomMs = 10;
  const formalHeadroomMs = 10;
  const base = {
    ...fixture,
    artifactHeadroomMs,
    formalHeadroomMs
  };

  const artifactPassBaselines = base.baselines.map((row, index) => index === 0
    ? retimeBaseline(row,
        CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_ARTIFACT_LIMIT_MS -
        artifactHeadroomMs - 20 - 1)
    : row);
  const artifactMinusOne = decideCaliforniaSignatureFinalCompositorCapacity({
    ...base,
    baselines: artifactPassBaselines
  });
  assert.equal(artifactMinusOne.passed, true);
  const artifactAtEquality = decideCaliforniaSignatureFinalCompositorCapacity({
    ...base,
    baselines: artifactPassBaselines.map((row, index) => index === 0
      ? retimeBaseline(row, row.upperBoundMs + 1)
      : row)
  });
  assert.equal(artifactAtEquality.passed, false);
  assert.match(artifactAtEquality.issues.join("\n"), /artifact.*headroom.*24h/i);

  const targetBaselineTotal = CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS -
    formalHeadroomMs - 1 - 70;
  const basePerGroup = Math.floor(targetBaselineTotal / base.baselines.length);
  let remainder = targetBaselineTotal - basePerGroup * base.baselines.length;
  const formalPassBaselines = base.baselines.map((row) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return retimeBaseline(row, basePerGroup + extra);
  });
  const formalMinusOne = decideCaliforniaSignatureFinalCompositorCapacity({
    ...base,
    baselines: formalPassBaselines
  });
  assert.equal(formalMinusOne.passed, true);
  assert.equal(formalMinusOne.makespanUpperBoundMs + formalHeadroomMs,
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_FORMAL_LIMIT_MS - 1);
  const formalAtEquality = decideCaliforniaSignatureFinalCompositorCapacity({
    ...base,
    baselines: formalPassBaselines.map((row, index) => index === 0
      ? retimeBaseline(row, row.upperBoundMs + 1)
      : row)
  });
  assert.equal(formalAtEquality.passed, false);
  assert.match(formalAtEquality.issues.join("\n"), /formal.*headroom.*72h/i);
});

test("formal concurrency one sums all 102 artifact forecasts rather than treating 102 as parallelism", () => {
  const groups: Array<CaliforniaSignatureFinalCompositorExecutionGroupSummary & { weightMs: number }> = [];
  for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
    for (let index = 0; index < 51; index += 1) {
      const classId = `${projectName}-class`;
      groups.push({
        axisId: `${projectName}-axis-${index}`,
        benchId: `Bench${index}`,
        classCropCounts: [{ classId, cropCount: 1 }],
        cropCount: 1,
        expectedRecordCount: 1,
        groupKey: `${projectName}\u0000Bench${index}\u0000${projectName}-axis-${index}\u0000layout`,
        phase: "layout",
        projectName,
        receiptCount: 1,
        weightMs: 2
      });
    }
  }
  const sourceIdentity = capacitySourceIdentity(groups, [
    "desktop-chrome-class",
    "mobile-chrome-class"
  ], 102);
  const boundPlan = partitionCaliforniaSignatureFinalCompositorGroups({
    groups,
    projectNames: ["desktop-chrome", "mobile-chrome"],
    sourceIdentity,
    terminalArtifactTarget: 102
  });
  const baselines = groups.map((group) => baseline(group.groupKey, sourceIdentity, 10));
  const decision = decideCaliforniaSignatureFinalCompositorCapacity({
    artifactHeadroomMs: 1,
    baselines,
    calibrations: [
      calibration("desktop-chrome-class", sourceIdentity, 10),
      calibration("mobile-chrome-class", sourceIdentity, 10)
    ],
    environment: baselines[0]!.environment,
    formalHeadroomMs: 1,
    groups,
    plan: boundPlan,
    sourceIdentity
  });
  assert.equal(decision.artifactForecasts.length, 102);
  assert.equal(decision.makespanUpperBoundMs, 2_040);
  assert.equal(decision.passed, true);
});

test("formal multi-process lanes use an exact max-lane makespan without changing 102 artifacts", () => {
  const groups: Array<CaliforniaSignatureFinalCompositorExecutionGroupSummary & { weightMs: number }> = [];
  for (const projectName of ["desktop-chrome", "mobile-chrome"] as const) {
    for (let index = 0; index < 51; index += 1) {
      const classId = `${projectName}-class`;
      groups.push({
        axisId: `${projectName}-axis-${index}`,
        benchId: `Bench${index}`,
        classCropCounts: [{ classId, cropCount: 1 }],
        cropCount: 1,
        expectedRecordCount: 1,
        groupKey: `${projectName}\u0000Bench${index}\u0000${projectName}-axis-${index}\u0000layout`,
        phase: "layout",
        projectName,
        receiptCount: 1,
        weightMs: 2
      });
    }
  }
  const sourceIdentity = capacitySourceIdentity(groups, [
    "desktop-chrome-class",
    "mobile-chrome-class"
  ], 102);
  const boundPlan = partitionCaliforniaSignatureFinalCompositorGroups({
    groups,
    projectNames: ["desktop-chrome", "mobile-chrome"],
    sourceIdentity,
    terminalArtifactTarget: 102
  });
  const baselines = groups.map((group) => baseline(group.groupKey, sourceIdentity, 10, 2));
  const decision = decideCaliforniaSignatureFinalCompositorCapacity({
    artifactHeadroomMs: 1,
    baselines,
    calibrations: [
      calibration("desktop-chrome-class", sourceIdentity, 10, 2),
      calibration("mobile-chrome-class", sourceIdentity, 10, 2)
    ],
    environment: baselines[0]!.environment,
    formalHeadroomMs: 1,
    groups,
    plan: boundPlan,
    sourceIdentity
  });
  assert.equal(decision.artifactForecasts.length, 102);
  assert.deepEqual(decision.laneForecasts, [
    { laneIndex: 0, upperBoundMs: 1_040 },
    { laneIndex: 1, upperBoundMs: 1_000 }
  ]);
  assert.equal(decision.makespanUpperBoundMs, 1_040);
  assert.equal(decision.artifactForecasts.reduce((sum, row) => sum + row.upperBoundMs, 0),
    2_040);
  assert.equal(decision.passed, true);
});

test("current source derives its counts and hashes without using them as planner inputs", async (t) => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
  const sourceContract = buildCaliforniaCanvasGraphicsSourceContract();
  const sourceSnapshotSha256 = sha256([
    oracle.blueprintSha256,
    oracle.canvasContractSha256,
    oracle.componentSourceSha256,
    oracle.evidenceKeysSha256
  ].join("\0"));
  const reviewed = buildCaliforniaSignatureReviewedFinalCompositorSourcePlan({
    canvasContract: sourceContract,
    manifest,
    oracle,
    projectDimensionPolicies: formalDimensionProjects(),
    sourceSnapshotSha256
  });
  const { summary } = reviewed;

  assert.equal(summary.receiptCount, 1_031_016);
  assert.equal(summary.cropCount, 1_049_268);
  assert.equal(summary.groupCount, 4_464);
  assert.equal(reviewed.executionGroups.length, 4_650);
  assert.equal(reviewed.sourceIdentity.evidenceRecordCount, 1_127_995);
  assert.equal(reviewed.sourceIdentity.groupCount, 4_650);
  assert.equal(summary.projects.reduce((sum, project) => sum + project.receiptCount, 0),
    summary.receiptCount);
  assert.equal(summary.projects.reduce((sum, project) => sum + project.cropCount, 0),
    summary.cropCount);
  assert.equal(summary.classes.reduce((sum, dimensionClass) => sum + dimensionClass.cropCount, 0),
    summary.cropCount);
  assert.equal(summary.projects.length, reviewed.dimensionRegistry.projects.length);
  assert.deepEqual(reviewed.sourceIdentity.projects, [
    {
      cropCount: 524_634,
      evidenceRecordCount: 570_931,
      groupCount: 2_418,
      projectName: "desktop-chrome",
      receiptCount: 515_508
    },
    {
      cropCount: 524_634,
      evidenceRecordCount: 557_064,
      groupCount: 2_232,
      projectName: "mobile-chrome",
      receiptCount: 515_508
    }
  ]);
  assert.equal(summary.unreviewedDiagnostic, false);
  assert.equal(reviewed.sourceIdentity.dimensionRegistrySha256,
    reviewed.dimensionRegistry.dimensionRegistrySha256);
  assert.equal(reviewed.sourceIdentity.workUnitsSha256, summary.workUnitsSha256);
  assert.equal(reviewed.sourceIdentity.summarySha256, summary.summarySha256);
  assert.equal(reviewed.sourceIdentity.groupsSha256,
    summarizeCaliforniaSignatureFinalCompositorCapacityGroups(
      reviewed.executionGroups.map((group) => ({ ...group, weightMs: 1 }))
    ).groupsSha256);
  assert.match(summary.summarySha256, /^[a-f0-9]{64}$/);
  t.diagnostic(`current source-derived final compositor capacity counters=${JSON.stringify({
    classes: summary.classes,
    cropCount: summary.cropCount,
    groupCount: summary.groupCount,
    projects: summary.projects,
    receiptCount: summary.receiptCount,
    receiptsSha256: summary.receiptsSha256,
    summarySha256: summary.summarySha256,
    workUnitsSha256: summary.workUnitsSha256
  })}`);
});
