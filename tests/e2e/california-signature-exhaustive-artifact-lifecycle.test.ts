import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rmdir,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_SIGNATURE_ARTIFACT_LIFECYCLE_VERSION,
  CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX,
  CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX,
  CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX,
  CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME,
  CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS,
  CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME,
  CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME,
  buildCaliforniaSignatureArtifactRunIdentity,
  buildCaliforniaSignatureArtifactValidationContext,
  buildCaliforniaSignatureExecutionGroupOwnershipManifest,
  buildCaliforniaSignatureExpectedArtifactMatrix,
  buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix,
  californiaSignatureArtifactValidationContextKey,
  californiaSignatureArtifactRunDirectory,
  createCaliforniaSignatureOfficialEvidenceWriter,
  initializeCaliforniaSignatureArtifactRunDirectory,
  loadCaliforniaSignatureOfficialArtifacts,
  loadCaliforniaSignatureSealedOfficialArtifacts,
  persistCaliforniaSignatureFailureDiagnosticFixture,
  persistCaliforniaSignatureSuccessfulArtifact,
  persistCaliforniaSignatureSuccessfulArtifactFixture,
  publishCaliforniaSignatureExhaustiveProducerSuccess,
  readCaliforniaSignatureExecutionGroupOwnershipManifest,
  sealCaliforniaSignatureOfficialArtifactRun,
  verifyCaliforniaSignatureOfficialArtifactMatrix,
  type CaliforniaSignatureArtifactRunIdentity,
  type CaliforniaSignatureExecutionGroupOwnershipManifest,
  type CaliforniaSignatureLoadedArtifact,
  type CaliforniaSignatureOfficialArtifact
} from "./california-signature-exhaustive-artifact-lifecycle";
import {
  CALIFORNIA_SIGNATURE_EXHAUSTIVE_SCHEMA_VERSION,
  buildCaliforniaSignatureExternalEvidenceExpectations,
  iterateCaliforniaSignatureExpandedSourceEvidenceOracle,
  type CaliforniaSignatureExactEvidenceRecord
} from "./california-signature-exhaustive-qa";
import { buildCaliforniaSignatureSourceManifest } from "./california-signature-control-manifest";
import { buildCaliforniaCanvasGraphicsSourceContract } from
  "./california-canvas-graphics-source-contract";
import {
  CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  californiaSignatureSourceEvidenceOracleRowKey,
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import { canonicalCaliforniaSignatureEvidenceJson } from
  "./california-signature-evidence-stream";
import {
  buildCaliforniaSignatureReviewedFinalCompositorSourcePlan,
  calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256,
  partitionCaliforniaSignatureFinalCompositorGroups
} from "./california-signature-final-compositor-capacity-plan";
import {
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME
} from "./california-visualization-qa-helpers";
import { californiaSignatureAxisIdsForProject } from
  "./california-signature-exhaustive-qa";

const sourceManifest = buildCaliforniaSignatureSourceManifest();
const sourceSha256 = sourceManifest.componentSourceSha256;
const blueprintSha256 = sourceManifest.blueprintSha256;
const controlStagingSha256 = "3".repeat(64);
const canvasContract = buildCaliforniaCanvasGraphicsSourceContract();
const canvasContractSha256 = canvasContract.contractSha256;
const syntheticBenches = sourceManifest.benches.slice(0, 2);
const lifecycleTestRoot = process.env.CA_SIGNATURE_LIFECYCLE_TEST_ROOT?.trim();
assert.ok(lifecycleTestRoot && path.isAbsolute(lifecycleTestRoot) &&
  lifecycleTestRoot.startsWith("/Volumes/Starship/"),
"CA_SIGNATURE_LIFECYCLE_TEST_ROOT must be one absolute /Volumes/Starship path");

function syntheticGroupOwnedManifest(): CaliforniaSignatureExecutionGroupOwnershipManifest {
  const packages = Array.from({ length: 51 }, (_, slotIndex) => ({
    packageId: `signature-final-compositor-capacity-${String(slotIndex + 1).padStart(3, "0")}`,
    projects: CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => {
      const benchId = `SyntheticBench${String(slotIndex).padStart(3, "0")}`;
      return {
        benchIds: [benchId],
        cropCount: 1,
        expectedRecordCount: 1,
        groupKeys: [
          `${projectName}\0${benchId}\0${projectName}-synthetic-axis-${slotIndex}\0layout`
        ],
        projectName,
        receiptCount: 1
      };
    }),
    slotIndex
  }));
  return {
    capacityPlanSha256: "a".repeat(64),
    cropCount: 102,
    evidenceRecordCount: 102,
    formalExecutionAuthorized: false,
    groupCount: 102,
    packages,
    receiptCount: 102,
    schemaVersion: 1,
    sourceIdentitySha256: "b".repeat(64),
    sourceSnapshotSha256: "c".repeat(64),
    status: "diagnostic-capacity-partition"
  };
}

function identity(overrides: Partial<{
  buildId: string;
  origin: string;
  runId: string;
  runtimeRunId: string;
  sourceSnapshotSha256: string;
}> = {}) {
  return buildCaliforniaSignatureArtifactRunIdentity({
    buildId: overrides.buildId ?? "next-build-0123456789abcdef",
    markers: {
      canvas: {
        animationCancellations: 96,
        animationSchedules: 150,
        benches: 186,
        contextRegistrations: 190,
        instrumentationVersion: 1,
        noDeploy: true,
        paintInvocations: 2_372,
        productSourceSha256: sourceSha256,
        sourceContractSha256: canvasContractSha256
      },
      control: {
        blueprintSha256,
        componentCount: 186,
        controlsInstrumented: 1_854,
        productBytesUnchanged: true,
        productSourceSha256: sourceSha256,
        purpose: "California signature browser QA only",
        releaseEligible: false,
        stagingSourceSha256: controlStagingSha256
      }
    },
    origin: overrides.origin ?? "http://127.0.0.1:3138",
    runId: overrides.runId ?? "ca-signature-run-0123456789abcdef",
    runtimeRunId: overrides.runtimeRunId ?? "ca-canvas-runtime-0123456789abcdef",
    sourceSnapshotSha256: overrides.sourceSnapshotSha256 ?? "5".repeat(64)
  });
}

function evidence(benchId = syntheticBenches[0]!.benchId): CaliforniaSignatureExactEvidenceRecord {
  const bench = sourceManifest.benches.find((candidate) => candidate.benchId === benchId)!;
  const runIdentity = identity();
  const ownership = buildCaliforniaSignatureExternalEvidenceExpectations({
    expectedOrigin: runIdentity.origin,
    expectedRuntimeRunId: runIdentity.runtimeRunId,
    manifest: sourceManifest
  }).routes.find((route) => route.benchId === benchId)!;
  const value = {
    axisId: "desktop-en-light",
    benchId,
    branchPath: [],
    canvasGraphicsContrastAck: null,
    canvasGraphicsEvidence: null,
    canvasGraphicsEvidenceSha256: null,
    canvasGraphicsNodeAck: null,
    combinationActivations: null,
    endpoint: null,
    instanceKey: null,
    labId: ownership.labId,
    layoutSettleEvidence: null,
    layoutSettleEvidenceSha256: null,
    numericMidpoint: null,
    phase: "functional" as const,
    resetEvidence: null,
    resetEvidenceSha256: null,
    sourceEndpoint: null,
    sourceSiteKey: null,
    stepKey: bench.lessonSteps[0]!.key
  };
  const key = createHash("sha256").update(JSON.stringify({
    axisId: value.axisId,
    benchId: value.benchId,
    branchPath: value.branchPath,
    combinationActivations: value.combinationActivations,
    endpoint: value.endpoint,
    instanceKey: value.instanceKey,
    labId: value.labId,
    numericMidpoint: value.numericMidpoint,
    phase: value.phase,
    sourceEndpoint: value.sourceEndpoint,
    sourceSiteKey: value.sourceSiteKey,
    stepKey: value.stepKey
  })).digest("hex");
  return { ...value, key };
}

function syntheticSourceOracle(benchIds: readonly string[]): CaliforniaSignatureSourceExpectedEvidenceOracle {
  const evidenceRows = benchIds.flatMap((benchId) => {
    const bench = sourceManifest.benches.find((candidate) => candidate.benchId === benchId)!;
    return bench.lessonSteps.map((step) => {
      const withoutDerived = {
      activationEndpoint: null,
      benchId,
      branchPath: [],
      combinationActivations: null,
      controlKind: null,
      instanceKey: null,
      numericMidpoint: null,
      phases: ["functional", "layout", "structural"] as const,
      rowKind: "authored-state" as const,
      sourceConditionKeys: [],
      sourceEndpoint: null,
      sourceSiteKey: null,
        stepKey: step.key
      };
      return {
        ...withoutDerived,
        key: californiaSignatureSourceEvidenceOracleRowKey(withoutDerived)
      };
    });
  });
  const canvasBenches = new Set(canvasContract.bindings.map((binding) => binding.benchId));
  return {
    blueprintSha256: sourceManifest.blueprintSha256,
    canvasContractSha256,
    componentSourceSha256: sourceManifest.componentSourceSha256,
    counts: {
      authoredStates: 0,
      branchStates: 0,
      canvasReceiptRows: evidenceRows.filter((row) => canvasBenches.has(row.benchId)).length,
      combinationOccurrences: 0,
      controlOccurrences: 0,
      endpointOccurrences: 0,
      evidenceControlRows: 0,
      evidenceCombinationRows: 0,
      evidenceEndpointRows: 0,
      evidenceRows: evidenceRows.length,
      evidenceStateRows: evidenceRows.length,
      numericAvailableOccurrences: 0,
      numericOccurrences: 0,
      numericUnavailableContracts: 0,
      numericUnavailableOccurrences: 0,
      numericUnavailableSites: 0,
      reachableStates: 0
    },
    evidenceKeysSha256: createHash("sha256")
      .update(evidenceRows.map((row) => row.key).sort().join("\n")).digest("hex"),
    frontierRemaining: 0,
    pairwisePeak: { rowCount: 0, stateKey: "" },
    schemaVersion: CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
    states: []
  };
}

function validationContext(runIdentity: CaliforniaSignatureArtifactRunIdentity, benchIds = [syntheticBenches[0]!.benchId]) {
  return buildCaliforniaSignatureArtifactValidationContext({
    expectedBenchIds: benchIds,
    externalExpectations: buildCaliforniaSignatureExternalEvidenceExpectations({
      expectedOrigin: runIdentity.origin,
      expectedRuntimeRunId: runIdentity.runtimeRunId,
      manifest: sourceManifest
    }),
    manifest: sourceManifest,
    sourceEvidenceOracle: syntheticSourceOracle(benchIds)
  });
}

const successfulTestInfo = {
  async attach() {},
  errors: [],
  repeatEachIndex: 0,
  retry: 0 as const
};

const diagnosticTestInfo = {
  repeatEachIndex: 0,
  retry: 0,
  workerIndex: 0
};

async function temporaryLedger(t: test.TestContext) {
  await mkdir(lifecycleTestRoot!, { recursive: true });
  const ledgerRoot = await mkdtemp(path.join(lifecycleTestRoot!, "ca-signature-artifacts-"));
  t.after(() => {
    // Starship-only test roots remain available for exact post-run inspection.
  });
  return ledgerRoot;
}

function oneEntryMatrix(runIdentity: CaliforniaSignatureArtifactRunIdentity) {
  return buildCaliforniaSignatureExpectedArtifactMatrix({
    packages: [{ benchIds: [syntheticBenches[0]!.benchId], packageId: "signature-exhaustive-p1-1" }],
    projects: ["desktop-chrome"],
    runId: runIdentity.runId
  });
}

async function syntheticLoaded(t: test.TestContext, runIdentity = identity()) {
  const ledgerRoot = await temporaryLedger(t);
  const expectedMatrix = oneEntryMatrix(runIdentity);
  const context = validationContext(runIdentity);
  await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: context
  });
  return {
    expectedMatrix,
    loaded: await loadCaliforniaSignatureOfficialArtifacts({
      expectedIdentity: runIdentity,
      expectedMatrix,
      ledgerRoot
    }),
    validationContexts: new Map([["signature-exhaustive-p1-1", context]])
  };
}

async function persistStrictEvidence(options: {
  evidence: readonly CaliforniaSignatureExactEvidenceRecord[];
  identity: CaliforniaSignatureArtifactRunIdentity;
  ledgerRoot: string;
  validationContext: ReturnType<typeof validationContext>;
}) {
  const writer = await createCaliforniaSignatureOfficialEvidenceWriter({
    identity: options.identity,
    ledgerRoot: options.ledgerRoot,
    manifest: options.validationContext.manifest,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    repeatEachIndex: 0,
    shard: null
  });
  await writer.appendBatch(options.evidence);
  const evidenceStream = await writer.finalize();
  return persistCaliforniaSignatureSuccessfulArtifact({
    evidenceStream,
    identity: options.identity,
    ledgerRoot: options.ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: options.validationContext
  });
}

test("a successful package publishes one exact official artifact and refuses overwrite", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity();
  const runDirectory = await initializeCaliforniaSignatureArtifactRunDirectory({
    identity: runIdentity,
    ledgerRoot
  });
  assert.deepEqual(await readdir(runDirectory), [CALIFORNIA_SIGNATURE_RUN_MANIFEST_FILENAME]);
  await assert.rejects(
    () => initializeCaliforniaSignatureArtifactRunDirectory({
      identity: identity({ buildId: "stale-build", runId: runIdentity.runId }),
      ledgerRoot
    }),
    /run manifest: mixed or stale buildId/,
    "an existing run directory cannot be adopted by mixed build provenance"
  );

  const destination = await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  });
  assert.ok(destination.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX));
  assert.equal(path.dirname(destination), runDirectory);

  const loaded = await loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    ledgerRoot
  });
  await assert.doesNotReject(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    loaded,
    validationContexts: new Map([["signature-exhaustive-p1-1", validationContext(runIdentity)]])
  }));
  await assert.rejects(
    () => persistCaliforniaSignatureSuccessfulArtifactFixture({
      evidence: [evidence()],
      identity: runIdentity,
      ledgerRoot,
      packageId: "signature-exhaustive-p1-1",
      projectName: "desktop-chrome",
      shard: null,
      testInfo: successfulTestInfo,
      validationContext: validationContext(runIdentity)
    }),
    /EEXIST/,
    "an existing official logical artifact must never be replaced"
  );
  await assert.doesNotReject(() => loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    ledgerRoot
  }), "a rejected final-chunk publication must clean its private pending and preserve the accepted run");
  assert.equal(
    (await readdir(runDirectory)).some((name) => name.includes(".pending")),
    false,
    "a rejected final-chunk publication must not leave private pending poison"
  );

  const attachFailureIdentity = identity({ runId: "ca-signature-run-attach-0123456789" });
  await assert.rejects(
    () => persistCaliforniaSignatureSuccessfulArtifactFixture({
      evidence: [evidence()],
      identity: attachFailureIdentity,
      ledgerRoot,
      packageId: "signature-exhaustive-p1-1",
      projectName: "desktop-chrome",
      shard: null,
      testInfo: {
        ...successfulTestInfo,
        async attach() { throw new Error("synthetic attachment failure"); }
      },
      validationContext: validationContext(attachFailureIdentity)
    }),
    /synthetic attachment failure/
  );
  const attachFailureDirectory = californiaSignatureArtifactRunDirectory(
    ledgerRoot,
    attachFailureIdentity.runId
  );
  const attachFailureEntries = await readdir(attachFailureDirectory);
  assert.equal(
    attachFailureEntries.some((name) => name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX)),
    false,
    "a post-package attachment failure must happen before official metadata publication"
  );
  assert.ok(attachFailureEntries.some((name) => name.endsWith(".frame")),
    "a post-stream attachment failure must retain authenticated chunks as diagnosable run poison");
  await assert.rejects(() => loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: attachFailureIdentity,
    expectedMatrix: oneEntryMatrix(attachFailureIdentity),
    ledgerRoot
  }), /failure\/partial\/temp\/unknown files|missing or extra project\/package\/repeat item/,
  "a chunk-only post-stream failure must remain unsealable");

  const rejectedSuccessCases: Array<{
    evidenceRecords: CaliforniaSignatureExactEvidenceRecord[];
    label: string;
    testInfo: Parameters<typeof persistCaliforniaSignatureSuccessfulArtifactFixture>[0]["testInfo"];
  }> = [
    { evidenceRecords: [], label: "empty evidence", testInfo: successfulTestInfo },
    {
      evidenceRecords: [evidence()],
      label: "recorded error",
      testInfo: { ...successfulTestInfo, errors: [{ message: "recorded failure" }] }
    },
    { evidenceRecords: [evidence()], label: "retry", testInfo: { ...successfulTestInfo, retry: 1 } }
  ];
  for (const { evidenceRecords, label, testInfo } of rejectedSuccessCases) {
    const rejectedIdentity = identity({
      runId: `ca-signature-run-rejected-${label.replace(" ", "-")}-0123456789`
    });
    await assert.rejects(
      () => persistCaliforniaSignatureSuccessfulArtifactFixture({
        evidence: [...evidenceRecords],
        identity: rejectedIdentity,
        ledgerRoot,
        packageId: "signature-exhaustive-p1-1",
        projectName: "desktop-chrome",
        shard: null,
        testInfo,
        validationContext: validationContext(rejectedIdentity)
      }),
      /must contain (?:evidence|1\.\.4096 bounded records)|recorded test error|retries=0/,
      `${label} must never reach official publication`
    );
  }
});

test("official publication clones evidence and rejects absent or mismatched validation ownership", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const mutationIdentity = identity({ runId: "ca-signature-run-mutation-0123456789" });
  const mutableEvidence = [evidence()];
  const destination = await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: mutableEvidence,
    identity: mutationIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: {
      ...successfulTestInfo,
      async attach() {
        mutableEvidence.splice(0, mutableEvidence.length, evidence(syntheticBenches[1]!.benchId));
      }
    },
    validationContext: validationContext(mutationIdentity)
  });
  const published = JSON.parse(await readFile(destination, "utf8")) as CaliforniaSignatureOfficialArtifact;
  assert.equal(published.evidenceStream.recordCount, 1,
    "attachment-time caller mutation must not change the validated official stream");

  const missingContextIdentity = identity({ runId: "ca-signature-run-no-context-0123456789" });
  await assert.rejects(
    () => persistCaliforniaSignatureSuccessfulArtifactFixture({
      evidence: [evidence()],
      identity: missingContextIdentity,
      ledgerRoot,
      packageId: "signature-exhaustive-p1-1",
      projectName: "desktop-chrome",
      shard: null,
      testInfo: successfulTestInfo
    } as unknown as Parameters<typeof persistCaliforniaSignatureSuccessfulArtifactFixture>[0]),
    /requires a concrete validation context/
  );

  for (const [label, mutate] of [
    ["origin", (context: ReturnType<typeof validationContext>) => {
      context.externalExpectations.expectedOrigin = "http://127.0.0.1:9999";
    }],
    ["runtime", (context: ReturnType<typeof validationContext>) => {
      context.externalExpectations.expectedRuntimeRunId = "ca-canvas-runtime-wrong-0123456789";
    }]
  ] as const) {
    const runIdentity = identity({ runId: `ca-signature-run-wrong-${label}-0123456789` });
    const context = validationContext(runIdentity);
    mutate(context);
    await assert.rejects(() => persistCaliforniaSignatureSuccessfulArtifactFixture({
      evidence: [evidence()],
      identity: runIdentity,
      ledgerRoot,
      packageId: "signature-exhaustive-p1-1",
      projectName: "desktop-chrome",
      shard: null,
      testInfo: successfulTestInfo,
      validationContext: context
    }), new RegExp(`validation ${label} is not bound`));
  }
});

test("a validated finalizer seals the exact run and rejects post-seal writers and late files", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-sealed-0123456789" });
  await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  });
  let aggregateValidations = 0;
  const expectedMatrix = oneEntryMatrix(runIdentity);
  const validationContexts = new Map([
    ["signature-exhaustive-p1-1", validationContext(runIdentity)]
  ]);
  const producerSuccessReceipt = await publishCaliforniaSignatureExhaustiveProducerSuccess({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerReportSha256: "7".repeat(64),
    validationContexts
  });
  assert.equal(producerSuccessReceipt.fileName, CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME);
  const sealed = await sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt,
    validateAggregate(current) {
      aggregateValidations += 1;
      assert.equal(current.length, 1);
    },
    validationContexts
  });
  assert.equal(sealed.artifacts.length, 1);
  assert.equal(aggregateValidations, 2,
    "the finalizer must validate before seal and after sealed disk reload");
  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId);
  assert.ok((await readdir(runDirectory)).includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME));

  await assert.rejects(() => persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  }), /run is sealed; late official publication is forbidden/);
  await assert.rejects(() => persistCaliforniaSignatureFailureDiagnosticFixture({
    error: new Error("late diagnostic"),
    evidence: [],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: diagnosticTestInfo
  }), /run is sealed; late official publication is forbidden/);

  const original = (await readdir(runDirectory)).find((name) =>
    name.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX)
  )!;
  await copyFile(path.join(runDirectory, original), path.join(
    runDirectory,
    `late${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`
  ));
  await assert.rejects(() => loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot
  }), /open producer run already has a process-success receipt/);
  await assert.rejects(() => loadCaliforniaSignatureSealedOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt,
    sealReceipt: sealed.sealReceipt
  }), /missing or extra project\/package\/repeat item|sealed official filenames: exact values drifted/);
});

test("producer success is externally receipted, forbids late artifacts, and rejects byte tampering", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-producer-receipt-0123456789" });
  const expectedMatrix = oneEntryMatrix(runIdentity);
  const validationContexts = new Map([
    ["signature-exhaustive-p1-1", validationContext(runIdentity)]
  ]);
  const artifactPath = await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  });
  const exactArtifactBytes = await readFile(artifactPath);
  const exactArtifactSha256 = createHash("sha256").update(exactArtifactBytes).digest("hex");
  const exactArtifact = JSON.parse(exactArtifactBytes.toString("utf8")) as
    CaliforniaSignatureOfficialArtifact;
  const receipt = await publishCaliforniaSignatureExhaustiveProducerSuccess({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerReportSha256: "8".repeat(64),
    validationContexts
  });
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  const expectedArtifact = [...expectedMatrix.values()][0]!;
  const producerPath = path.join(
    californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId),
    CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME
  );
  const exactProducerBytes = await readFile(producerPath);
  const producer = JSON.parse(exactProducerBytes.toString("utf8"));
  assert.deepEqual(producer.artifacts, [{
    artifactId: expectedArtifact.artifactId,
    evidenceChunkMerkleRootSha256: exactArtifact.evidenceStream.chunkMerkleRootSha256,
    evidenceChunks: exactArtifact.evidenceStream.chunks.map((chunk) => ({
      fileName: chunk.fileName,
      framedBytes: chunk.framedBytes,
      recordCount: chunk.recordCount,
      recordMerkleRootSha256: chunk.recordMerkleRootSha256,
      sha256: chunk.sha256
    })),
    evidenceFramedBytes: exactArtifact.evidenceStream.framedBytes,
    evidenceManifestSha256: createHash("sha256").update(
      canonicalCaliforniaSignatureEvidenceJson(exactArtifact.evidenceStream)
    ).digest("hex"),
    evidenceRecordCount: exactArtifact.evidenceStream.recordCount,
    evidenceStreamOwnershipSha256: exactArtifact.evidenceStreamOwnershipSha256,
    executionGroupOwnership: exactArtifact.executionGroupOwnership,
    fileName: expectedArtifact.fileName,
    sha256: exactArtifactSha256
  }], "producer success must bind exact exhaustive artifact bytes");

  const mutatedArtifact = structuredClone(exactArtifact);
  mutatedArtifact.createdAt = "2099-08-10T00:00:00.000Z";
  await writeFile(artifactPath, `${JSON.stringify(mutatedArtifact)}\n`, "utf8");
  await assert.rejects(() => sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt: receipt,
    validateAggregate() {},
    validationContexts
  }), /official artifact bytes no longer match producer process-success/,
  "schema-valid artifact byte drift after producer success must remain unsealable");
  assert.equal(
    (await readdir(californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId)))
      .includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME),
    false,
    "post-producer artifact byte drift must fail before terminal seal publication"
  );
  await writeFile(artifactPath, exactArtifactBytes);

  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId);
  const chunkPath = path.join(runDirectory, exactArtifact.evidenceStream.chunks[0]!.fileName);
  const exactChunkBytes = await readFile(chunkPath);
  const mutatedChunkBytes = Buffer.from(exactChunkBytes);
  mutatedChunkBytes[mutatedChunkBytes.length - 1] ^= 0x01;
  await writeFile(chunkPath, mutatedChunkBytes);
  await assert.rejects(() => sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt: receipt,
    validateAggregate() {},
    validationContexts
  }), /evidence.*(?:SHA-256|newline|canonical|digest).*drifted|terminal newline/i,
  "a producer-bound evidence chunk mutation must remain unsealable");
  await writeFile(chunkPath, exactChunkBytes);

  const lateChunkPath = path.join(runDirectory, "late-extra-evidence.frame");
  await writeFile(lateChunkPath, exactChunkBytes);
  await assert.rejects(() => sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt: receipt,
    validateAggregate() {},
    validationContexts
  }), /official evidence chunk inventory.*exact values drifted|evidence chunk filenames/i,
  "a producer-bound run with one late extra chunk must remain unsealable");
  await unlink(lateChunkPath);

  await assert.rejects(() => persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  }), /producer already reported process success/);
  await assert.rejects(() => persistCaliforniaSignatureFailureDiagnosticFixture({
    error: new Error("late producer diagnostic"),
    evidence: [],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: diagnosticTestInfo
  }), /producer already reported process success/);

  await writeFile(producerPath, `${exactProducerBytes.toString("utf8").trimEnd()}  \n`, "utf8");
  await assert.rejects(() => sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt: receipt,
    validateAggregate() {},
    validationContexts
  }), /producer process-success no longer matches its external receipt/);
});

test("post-link validation failure leaves pending poison that a concurrent producer finalizer cannot accept", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-post-link-race-0123456789" });
  const expectedMatrix = oneEntryMatrix(runIdentity);
  const validationContexts = new Map([
    ["signature-exhaustive-p1-1", validationContext(runIdentity)]
  ]);
  let validationCalls = 0;
  let reachedPostLink!: () => void;
  let releasePostLink!: () => void;
  const postLinkReached = new Promise<void>((resolve) => { reachedPostLink = resolve; });
  const postLinkRelease = new Promise<void>((resolve) => { releasePostLink = resolve; });
  const writer = persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    async validateAdditionalPublicationEvidence() {
      validationCalls += 1;
      if (validationCalls === 2) {
        reachedPostLink();
        await postLinkRelease;
        throw new Error("synthetic exhaustive post-link producer failure");
      }
    },
    validationContext: validationContext(runIdentity)
  }).then(
    () => new Error("writer unexpectedly passed"),
    (error: unknown) => error
  );
  await postLinkReached;
  const producer = publishCaliforniaSignatureExhaustiveProducerSuccess({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot,
    producerReportSha256: "9".repeat(64),
    validationContexts
  }).then(
    () => new Error("producer finalizer unexpectedly passed"),
    (error: unknown) => error
  );
  releasePostLink();
  assert.match(String(await writer), /synthetic exhaustive post-link producer failure/);
  assert.match(String(await producer), /failure\/partial\/temp\/unknown files/);
  const entries = await readdir(
    californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId)
  );
  assert.ok(entries.some((name) => name.includes(".producer-pending.tmp")),
    "a rejected post-link producer must retain its pending intent");
  assert.equal(entries.includes(CALIFORNIA_SIGNATURE_PRODUCER_SUCCESS_FILENAME), false,
    "the concurrent producer finalizer must not publish process success");
  assert.equal(entries.includes(CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME), false,
    "the concurrent producer finalizer must not seal the run");
});

test("publication-lock cleanup failure retains pending poison and external seal receipt rejects tampering", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const lockIdentity = identity({ runId: "ca-signature-run-lock-cleanup-0123456789" });
  let validationCalls = 0;
  await assert.rejects(() => persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: lockIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    async validateAdditionalPublicationEvidence() {
      validationCalls += 1;
      if (validationCalls === 2) {
        await rmdir(path.join(ledgerRoot, `.${lockIdentity.runId}.publication-lock`));
      }
    },
    validationContext: validationContext(lockIdentity)
  }), /ENOENT/);
  const poisonedEntries = await readdir(
    californiaSignatureArtifactRunDirectory(ledgerRoot, lockIdentity.runId)
  );
  assert.ok(poisonedEntries.some((name) => name.includes(".producer-pending.tmp")),
    "lock cleanup failure must retain producer pending poison");

  const sealedIdentity = identity({ runId: "ca-signature-run-seal-tamper-0123456789" });
  const expectedMatrix = oneEntryMatrix(sealedIdentity);
  const validationContexts = new Map([
    ["signature-exhaustive-p1-1", validationContext(sealedIdentity)]
  ]);
  await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: sealedIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(sealedIdentity)
  });
  const producerSuccessReceipt = await publishCaliforniaSignatureExhaustiveProducerSuccess({
    expectedIdentity: sealedIdentity,
    expectedMatrix,
    ledgerRoot,
    producerReportSha256: "a".repeat(64),
    validationContexts
  });
  const sealed = await sealCaliforniaSignatureOfficialArtifactRun({
    expectedIdentity: sealedIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt,
    validateAggregate() {},
    validationContexts
  });
  await assert.rejects(() => loadCaliforniaSignatureSealedOfficialArtifacts({
    expectedIdentity: sealedIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt,
    sealReceipt: { ...sealed.sealReceipt, sha256: "b".repeat(64) }
  }), /seal no longer matches its external receipt/);
  const sealPath = path.join(
    californiaSignatureArtifactRunDirectory(ledgerRoot, sealedIdentity.runId),
    CALIFORNIA_SIGNATURE_RUN_SEAL_FILENAME
  );
  const sealBytes = await readFile(sealPath, "utf8");
  await writeFile(sealPath, `${sealBytes.trimEnd()}  \n`, "utf8");
  await assert.rejects(() => loadCaliforniaSignatureSealedOfficialArtifacts({
    expectedIdentity: sealedIdentity,
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt,
    sealReceipt: sealed.sealReceipt
  }), /seal no longer matches its external receipt/);
});

test("exhaustive publication-lock cleanup refuses to delete a replacement lock directory", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-lock-replacement-0123456789" });
  const lockPath = path.join(ledgerRoot, `.${runIdentity.runId}.publication-lock`);
  const displacedLockPath = `${lockPath}.displaced`;
  let replacementIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
  let validationCalls = 0;

  const writerError = await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    async validateAdditionalPublicationEvidence() {
      validationCalls += 1;
      if (validationCalls === 2) {
        const acquiredIdentity = await lstat(lockPath);
        await rename(lockPath, displacedLockPath);
        await mkdir(lockPath);
        replacementIdentity = await lstat(lockPath);
        assert.notEqual(
          replacementIdentity.ino,
          acquiredIdentity.ino,
          "the adversarial fixture must install a different exhaustive lock inode"
        );
      }
    },
    validationContext: validationContext(runIdentity)
  }).then(
    () => new Error("exhaustive writer unexpectedly removed a replacement publication lock"),
    (error: unknown) => error
  );

  assert.match(String(writerError), /publication lock ownership changed inode before cleanup/);
  const installedReplacement = replacementIdentity as Awaited<ReturnType<typeof lstat>> | null;
  assert.ok(installedReplacement, "the adversarial fixture never installed its exhaustive replacement lock");
  const retainedReplacement = await lstat(lockPath);
  assert.equal(retainedReplacement.dev, installedReplacement.dev);
  assert.equal(retainedReplacement.ino, installedReplacement.ino,
    "the previous exhaustive lock holder must not delete a replacement lock");

  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId);
  assert.ok(
    (await readdir(runDirectory)).some((name) => name.includes(".producer-pending.tmp")),
    "replacement-lock rejection must retain exhaustive producer pending poison"
  );

  await rmdir(lockPath);
  await assert.rejects(
    () => publishCaliforniaSignatureExhaustiveProducerSuccess({
      expectedIdentity: runIdentity,
      expectedMatrix: oneEntryMatrix(runIdentity),
      ledgerRoot,
      producerReportSha256: "c".repeat(64),
      validationContexts: new Map([
        ["signature-exhaustive-p1-1", validationContext(runIdentity)]
      ])
    }),
    /failure\/partial\/temp\/unknown files/,
    "the exhaustive replacement-lock race must leave the run unsealable"
  );
});

test("package validation rejects missing source endpoints and source-required Canvas receipts", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const bench = syntheticBenches[0]!;
  const site = bench.controlSites.find((candidate) => candidate.endpointTargets.length > 0)!;
  const target = site.endpointTargets[0]!;
  const endpointWithoutDerived = {
    activationEndpoint: "activate",
    benchId: bench.benchId,
    branchPath: [],
    combinationActivations: null,
    controlKind: site.kind,
    instanceKey: "source-endpoint-canary",
    numericMidpoint: null,
    phases: ["functional"] as const,
    rowKind: "endpoint" as const,
    sourceConditionKeys: site.sourceConditionKeys,
    sourceEndpoint: {
      instanceKey: `${target.key}:0`,
      sourceTargetKey: target.key,
      value: target.sourceExpression || target.name
    },
    sourceSiteKey: site.siteKey,
    stepKey: bench.lessonSteps[0]!.key
  };
  const missingEndpointIdentity = identity({ runId: "ca-signature-run-missing-endpoint-0123456789" });
  const endpointOracle = syntheticSourceOracle([bench.benchId]);
  const stateKey = JSON.stringify({
    benchId: bench.benchId,
    branchPath: [],
    stepKey: bench.lessonSteps[0]!.key
  });
  const endpoint = {
    activationEndpoint: endpointWithoutDerived.activationEndpoint,
    sourceEndpoint: endpointWithoutDerived.sourceEndpoint
  };
  endpointOracle.states = [{
    benchId: bench.benchId,
    branchPath: [],
    controls: [{
      activeEndpoints: [endpoint],
      allEndpoints: [endpoint],
      benchId: bench.benchId,
      branchPath: [],
      disabled: false,
      instanceKey: endpointWithoutDerived.instanceKey,
      key: createHash("sha256").update(`${stateKey}\0${site.siteKey}`).digest("hex"),
      kind: site.kind,
      numericMidpoint: null,
      sourceConditionKeys: site.sourceConditionKeys,
      sourceSiteKey: site.siteKey,
      stateKey,
      stepKey: bench.lessonSteps[0]!.key
    }],
    key: stateKey,
    kind: "branch",
    sourceStateSha256: createHash("sha256").update(stateKey).digest("hex"),
    stepKey: bench.lessonSteps[0]!.key
  }];
  const missingEndpointContext = buildCaliforniaSignatureArtifactValidationContext({
    expectedBenchIds: [bench.benchId],
    externalExpectations: buildCaliforniaSignatureExternalEvidenceExpectations({
      expectedOrigin: missingEndpointIdentity.origin,
      expectedRuntimeRunId: missingEndpointIdentity.runtimeRunId,
      manifest: sourceManifest
    }),
    manifest: sourceManifest,
    sourceEvidenceOracle: endpointOracle
  });
  await assert.rejects(() => persistStrictEvidence({
    evidence: [evidence()],
    identity: missingEndpointIdentity,
    ledgerRoot,
    validationContext: missingEndpointContext
  }), /source-oracle phase\/axis matrix is not exact|actual\/source semantic order key drifted/);

  const missingCanvasIdentity = identity({ runId: "ca-signature-run-missing-canvas-0123456789" });
  const missingCanvasContext = validationContext(missingCanvasIdentity);
  const sourceRows = new Map([...iterateCaliforniaSignatureSourceEvidenceOracleRows({
    manifest: missingCanvasContext.manifest,
    oracle: missingCanvasContext.sourceEvidenceOracle
  })].map((row) => [row.key, row]));
  const ownership = missingCanvasContext.externalExpectations.routes.find(
    (route) => route.benchId === bench.benchId
  )!;
  const missingCanvasEvidence = [...iterateCaliforniaSignatureExpandedSourceEvidenceOracle({
    manifest: missingCanvasContext.manifest,
    oracle: missingCanvasContext.sourceEvidenceOracle
  })].map((expectation): CaliforniaSignatureExactEvidenceRecord => {
    const row = sourceRows.get(expectation.oracleRowKey)!;
    const value = {
      axisId: expectation.axisId,
      benchId: row.benchId,
      branchPath: [...row.branchPath],
      canvasGraphicsContrastAck: null,
      canvasGraphicsEvidence: null,
      canvasGraphicsEvidenceSha256: null,
      canvasGraphicsNodeAck: null,
      combinationActivations: row.combinationActivations,
      endpoint: row.activationEndpoint,
      instanceKey: row.instanceKey,
      labId: ownership.labId,
      layoutSettleEvidence: null,
      layoutSettleEvidenceSha256: null,
      numericMidpoint: row.numericMidpoint,
      phase: expectation.phase,
      resetEvidence: null,
      resetEvidenceSha256: null,
      sourceEndpoint: row.sourceEndpoint,
      sourceSiteKey: row.sourceSiteKey,
      stepKey: row.stepKey
    };
    return {
      ...value,
      key: createHash("sha256").update(JSON.stringify({
        axisId: value.axisId,
        benchId: value.benchId,
        branchPath: value.branchPath,
        combinationActivations: value.combinationActivations,
        endpoint: value.endpoint,
        instanceKey: value.instanceKey,
        labId: value.labId,
        numericMidpoint: value.numericMidpoint,
        phase: value.phase,
        sourceEndpoint: value.sourceEndpoint,
        sourceSiteKey: value.sourceSiteKey,
        stepKey: value.stepKey
      })).digest("hex")
    };
  });
  await assert.rejects(() => persistStrictEvidence({
    evidence: missingCanvasEvidence,
    identity: missingCanvasIdentity,
    ledgerRoot,
    validationContext: missingCanvasContext
  }), /Canvas graphics receipt|source-required Canvas receipt/);
});

test("public group-owned matrix consumer rejects an in-memory legacy package impersonation", () => {
  const exact = syntheticGroupOwnedManifest();
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: exact,
    runId: "ca-signature-consumer-seam-run-0123456789abcdef"
  }), /opaque validated ownership manifest/i,
  "even an exact caller-shaped object must come from the source builder or held-FD reader");

  const impersonation = structuredClone(exact);
  impersonation.packages[0]!.packageId = "noncanonical-package-001";
  Object.assign(impersonation.packages[0]!, { extraPackageField: true });
  Object.assign(impersonation.packages[0]!.projects[0]!, { extraSliceField: true });
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: impersonation,
    runId: "ca-signature-consumer-probe-0123456789abcdef"
  }), /canonical package|exact schema/i,
  "the public matrix consumer must not trust a caller-shaped whole-bench package");

  const projectSwap = structuredClone(exact);
  projectSwap.packages[0]!.projects = [...projectSwap.packages[0]!.projects].reverse();
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: projectSwap,
    runId: "ca-signature-consumer-project-swap-0123456789abcdef"
  }), /project order/i,
  "the public matrix consumer must require the exact formal project order");

  const groupProjectSwap = structuredClone(exact);
  const groupProjectSlice = groupProjectSwap.packages[0]!.projects[0]!;
  groupProjectSwap.packages[0]!.projects = [
    {
      ...groupProjectSlice,
      groupKeys: [groupProjectSlice.groupKeys[0]!.replace(
        /^desktop-chrome\0/,
        "mobile-chrome\0"
      )]
    },
    ...groupProjectSwap.packages[0]!.projects.slice(1)
  ];
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: groupProjectSwap,
    runId: "ca-signature-consumer-group-swap-0123456789abcdef"
  }), /group key swaps projects/i,
  "the public matrix consumer must bind each group key to its formal project");

  const benchDrift = structuredClone(exact);
  const benchDriftSlice = benchDrift.packages[0]!.projects[0]!;
  benchDrift.packages[0]!.projects = [
    { ...benchDriftSlice, benchIds: ["LegacyWholeBench"] },
    ...benchDrift.packages[0]!.projects.slice(1)
  ];
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: benchDrift,
    runId: "ca-signature-consumer-bench-drift-0123456789abcdef"
  }), /benchIds do not derive/i,
  "the public matrix consumer must derive bench ownership from exact group keys");

  const counterDrift = structuredClone(exact);
  counterDrift.evidenceRecordCount += 1;
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: counterDrift,
    runId: "ca-signature-consumer-counter-drift-0123456789abcdef"
  }), /evidence count drifted/i,
  "the public matrix consumer must recompute manifest counters from all 102 slices");
});

test("held-FD ownership reader applies the public consumer's nested exact validation", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const exact = syntheticGroupOwnedManifest();
  const exactPath = path.join(ledgerRoot, "execution-group-ownership.json");
  const exactBytes = `${JSON.stringify(exact)}\n`;
  await writeFile(exactPath, exactBytes);
  const exactReceipt = createHash("sha256").update(exactBytes).digest("hex");
  const reread = readCaliforniaSignatureExecutionGroupOwnershipManifest({
    allowedRoot: ledgerRoot,
    expectedSha256: exactReceipt,
    expectedSourceSnapshotSha256: exact.sourceSnapshotSha256,
    manifestPath: exactPath
  });
  assert.equal(reread.fileSha256, exactReceipt);
  assert.equal(buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: reread.manifest,
    runId: "ca-signature-reader-seam-run-0123456789abcdef"
  }).size, 102);
  reread.manifest.sourceIdentitySha256 = "d".repeat(64);
  assert.throws(() => buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: reread.manifest,
    runId: "ca-signature-reader-post-validation-mutation-0123456789abcdef"
  }), /changed after validation/i,
  "an opaque reader result must not remain trusted after in-memory mutation");

  const forged = structuredClone(exact);
  Object.assign(forged.packages[0]!, { legacyWholeBenchPackage: true });
  Object.assign(forged.packages[0]!.projects[0]!, { legacyWholeBenchSlice: true });
  const forgedPath = path.join(ledgerRoot, "forged-execution-group-ownership.json");
  const forgedBytes = `${JSON.stringify(forged)}\n`;
  await writeFile(forgedPath, forgedBytes);
  assert.throws(() => readCaliforniaSignatureExecutionGroupOwnershipManifest({
    allowedRoot: ledgerRoot,
    expectedSha256: createHash("sha256").update(forgedBytes).digest("hex"),
    expectedSourceSnapshotSha256: forged.sourceSnapshotSha256,
    manifestPath: forgedPath
  }), /exact schema/i,
  "a byte-receipted held-FD file must still fail nested consumer validation");
});

test("capacity execution-group ownership splits heavy benches and binds the exact 102-artifact source union", async () => {
  const oracle = await buildCaliforniaSignatureSourceExpectedEvidenceOracle(sourceManifest);
  const sourceSnapshotSha256 = createHash("sha256").update([
    oracle.blueprintSha256,
    oracle.canvasContractSha256,
    oracle.componentSourceSha256,
    oracle.evidenceKeysSha256
  ].join("\0")).digest("hex");
  const reviewed = buildCaliforniaSignatureReviewedFinalCompositorSourcePlan({
    canvasContract,
    manifest: sourceManifest,
    oracle,
    projectDimensionPolicies: CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS.map((projectName) => ({
      axisIds: californiaSignatureAxisIdsForProject(projectName),
      deviceScaleFactor: CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName].deviceScaleFactor,
      projectName,
      viewport: { ...CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[projectName].viewport }
    })),
    sourceSnapshotSha256
  });
  // Test-only deterministic weights exercise the ownership seam. They are not
  // timing measurements and can never authorize a browser run.
  const groups = reviewed.executionGroups.map((group) => ({
    ...group,
    weightMs: group.expectedRecordCount
  }));
  const capacityPlan = partitionCaliforniaSignatureFinalCompositorGroups({
    groups,
    projectNames: [...CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS],
    sourceIdentity: reviewed.sourceIdentity,
    terminalArtifactTarget: 102
  });
  const ownership = buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  });

  assert.equal(ownership.formalExecutionAuthorized, false);
  assert.equal(ownership.packages.length, 51);
  assert.equal(ownership.groupCount, 4_700);
  assert.equal(ownership.evidenceRecordCount, 1_131_863);
  assert.equal(ownership.receiptCount, 1_033_884);
  assert.equal(ownership.cropCount, 1_052_136);
  assert.equal(ownership.packages.reduce((sum, workPackage) =>
    sum + workPackage.projects.length, 0), 102);

  const allSlices = ownership.packages.flatMap((workPackage) => workPackage.projects);
  assert.equal(allSlices.reduce((sum, slice) => sum + slice.groupKeys.length, 0), 4_700);
  assert.equal(new Set(allSlices.flatMap((slice) => slice.groupKeys)).size, 4_700);
  assert.equal(allSlices.reduce((sum, slice) => sum + slice.expectedRecordCount, 0), 1_131_863);
  assert.equal(allSlices.reduce((sum, slice) => sum + slice.receiptCount, 0), 1_033_884);
  assert.equal(allSlices.reduce((sum, slice) => sum + slice.cropCount, 0), 1_052_136);
  for (const projectName of CALIFORNIA_SIGNATURE_REQUIRED_PROJECTS) {
    const benchPackageCounts = new Map<string, Set<string>>();
    for (const workPackage of ownership.packages) {
      const slice = workPackage.projects.find((candidate) =>
        candidate.projectName === projectName)!;
      for (const benchId of slice.benchIds) {
        const packageIds = benchPackageCounts.get(benchId) ?? new Set<string>();
        packageIds.add(workPackage.packageId);
        benchPackageCounts.set(benchId, packageIds);
      }
    }
    assert.ok([...benchPackageCounts.values()].some((packageIds) => packageIds.size >= 2),
      `${projectName}: at least one heavy bench must split across complete group slices`);
  }

  const expectedMatrix = buildCaliforniaSignatureGroupOwnedExpectedArtifactMatrix({
    ownershipManifest: ownership,
    runId: "ca-signature-group-plan-run-0123456789abcdef"
  });
  assert.equal(expectedMatrix.size, 102);
  for (const expected of expectedMatrix.values()) {
    assert.ok(expected.executionGroupOwnership);
    assert.equal(expected.executionGroupOwnership.planSha256, capacityPlan.planSha256);
    assert.equal(expected.executionGroupOwnership.sourceIdentitySha256,
      capacityPlan.sourceIdentitySha256);
    assert.equal(expected.executionGroupOwnership.sourceSnapshotSha256, sourceSnapshotSha256);
    assert.ok(expected.executionGroupOwnership.groupKeys.length > 0);
    assert.equal(
      californiaSignatureArtifactValidationContextKey(expected.projectName, expected.packageId),
      `${expected.projectName}\0${expected.packageId}`
    );
  }

  const legacy = buildCaliforniaSignatureExpectedArtifactMatrix({
    packages: [{ benchIds: sourceManifest.benches.map((bench) => bench.benchId), packageId: "legacy-whole-bench" }],
    projects: ["desktop-chrome"],
    runId: "ca-signature-legacy-plan-run-0123456789abcdef"
  });
  assert.equal([...legacy.values()][0]!.executionGroupOwnership, null,
    "legacy whole-bench ownership must be explicitly distinct from a group plan");

  const missing = structuredClone(capacityPlan);
  missing.packages[0]!.projects[0]!.groupKeys =
    missing.packages[0]!.projects[0]!.groupKeys.slice(1);
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: missing,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /plan|group|digest|SHA/i);

  const duplicate = structuredClone(capacityPlan);
  duplicate.packages[0]!.projects[0]!.groupKeys = [
    duplicate.packages[0]!.projects[0]!.groupKeys[0]!,
    ...duplicate.packages[0]!.projects[0]!.groupKeys
  ];
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: duplicate,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /plan|group|duplicate|digest|SHA/i);

  const phaseSwap = structuredClone(reviewed.executionGroups);
  phaseSwap[0]!.phase = phaseSwap[0]!.phase === "functional" ? "layout" : "functional";
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan,
    executionGroups: phaseSwap,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /group|identity|source|phase/i);

  const projectSwap = structuredClone(capacityPlan);
  Object.defineProperty(projectSwap.packages[0]!, "projects", {
    configurable: true,
    enumerable: true,
    value: [...projectSwap.packages[0]!.projects].reverse(),
    writable: true
  });
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: projectSwap,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /plan|project|digest|SHA/i);

  const extraPlanKey = {
    ...structuredClone(capacityPlan),
    legacyWholeBenchPackages: [] as string[]
  };
  const { planSha256: _extraPlanSha256, ...extraPlanBase } = extraPlanKey;
  extraPlanKey.planSha256 = calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
    extraPlanBase
  );
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: extraPlanKey,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /exact.*schema|keys.*drift/i,
  "a digest-consistent legacy whole-bench field must not impersonate an exact group plan");

  const extraProjectKey = structuredClone(capacityPlan);
  Object.assign(extraProjectKey.packages[0]!.projects[0]!, {
    legacyWholeBenchIds: [sourceManifest.benches[0]!.benchId]
  });
  const { planSha256: _extraProjectSha256, ...extraProjectBase } = extraProjectKey;
  extraProjectKey.planSha256 = calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
    extraProjectBase
  );
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: extraProjectKey,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /exact.*schema|keys.*drift/i,
  "a digest-consistent legacy whole-bench project slice must not impersonate group ownership");

  const extraPackageKey = structuredClone(capacityPlan);
  Object.assign(extraPackageKey.packages[0]!, { legacyWholeBenchPackage: true });
  const { planSha256: _extraPackageSha256, ...extraPackageBase } = extraPackageKey;
  extraPackageKey.planSha256 = calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
    extraPackageBase
  );
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: extraPackageKey,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /exact.*schema|keys.*drift/i,
  "a digest-consistent legacy package field must not impersonate exact group ownership");

  const renamedPackage = structuredClone(capacityPlan);
  renamedPackage.packages[0]!.packageId = "legacy-whole-bench-package-001";
  const { planSha256: _renamedPackageSha256, ...renamedPackageBase } = renamedPackage;
  renamedPackage.planSha256 = calculateCaliforniaSignatureFinalCompositorPartitionPlanSha256(
    renamedPackageBase
  );
  assert.throws(() => buildCaliforniaSignatureExecutionGroupOwnershipManifest({
    capacityPlan: renamedPackage,
    executionGroups: reviewed.executionGroups,
    sourceIdentity: reviewed.sourceIdentity,
    sourceSnapshotSha256
  }), /canonical package|packageId.*drift/i,
  "a digest-consistent legacy package ID must not be interpreted as a group-plan package");
});

test("failure and partial diagnostics never use the accepted suffix and make aggregation fail closed", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-failure-0123456789" });
  const failed = await persistCaliforniaSignatureFailureDiagnosticFixture({
    error: new Error("failed before evidence"),
    evidence: [],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: diagnosticTestInfo
  });
  const partial = await persistCaliforniaSignatureFailureDiagnosticFixture({
    error: new Error("failed after evidence"),
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-2",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: diagnosticTestInfo
  });
  assert.ok(failed.endsWith(CALIFORNIA_SIGNATURE_FAILURE_ARTIFACT_SUFFIX));
  assert.ok(partial.endsWith(CALIFORNIA_SIGNATURE_PARTIAL_ARTIFACT_SUFFIX));
  assert.equal(failed.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX), false);
  assert.equal(partial.endsWith(CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX), false);
  await assert.rejects(
    () => loadCaliforniaSignatureOfficialArtifacts({
      expectedIdentity: runIdentity,
      expectedMatrix: oneEntryMatrix(runIdentity),
      ledgerRoot
    }),
    /failure\/partial\/temp\/unknown files/,
    "a finally-path partial diagnostic must never pollute accepted artifacts"
  );

  const specSource = await readFile(
    path.join(process.cwd(), "tests/e2e/california-signature-exhaustive.spec.ts"),
    "utf8"
  );
  assert.doesNotMatch(specSource, /persistCaliforniaSignatureExhaustiveArtifact/,
    "the exhaustive spec must not call the legacy finally-path official writer");
  assert.doesNotMatch(specSource, /\bfinally\s*\{/,
    "the exhaustive spec must not publish official evidence from finally");
  const guardedPageClose = specSource.indexOf("await page.close({ runBeforeUnload: false });");
  const followingCatch = specSource.indexOf("} catch (error) {", guardedPageClose);
  const officialPublish = specSource.lastIndexOf("await persistCaliforniaSignatureSuccessfulArtifact({");
  assert.ok(guardedPageClose >= 0 && followingCatch > guardedPageClose && officialPublish > followingCatch,
    "the guarded page close must finish before the post-catch official publication");
});

test("independent expected matrix rejects missing, extra, duplicate, stale, and mixed provenance", async (t) => {
  const runIdentity = identity();
  const exact = await syntheticLoaded(t, runIdentity);
  await assert.doesNotReject(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    ...exact
  }));

  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: [],
    validationContexts: exact.validationContexts
  }), /no California signature official artifacts/);

  const duplicate = structuredClone(exact.loaded);
  duplicate.push(structuredClone(duplicate[0]!));
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: duplicate,
    validationContexts: exact.validationContexts
  }), /duplicate artifactId|duplicate logical keys/);

  const extra = structuredClone(exact.loaded);
  const extraArtifact = structuredClone(extra[0]!);
  extraArtifact.artifact.packageId = "signature-exhaustive-extra";
  extraArtifact.artifact.artifactId = `${extraArtifact.artifact.artifactId}-extra`;
  extraArtifact.fileName = `${extraArtifact.artifact.artifactId}${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`;
  extra.push(extraArtifact);
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: extra,
    validationContexts: exact.validationContexts
  }), /missing or extra/);

  const mutations: Array<[string, (artifact: CaliforniaSignatureOfficialArtifact) => void]> = [
    ["buildId", (artifact) => { artifact.buildId = "stale-build"; }],
    ["origin", (artifact) => { artifact.origin = "http://127.0.0.1:9999"; }],
    ["runId", (artifact) => { artifact.runId = "ca-signature-run-stale-0123456789"; }],
    ["runtimeRunId", (artifact) => { artifact.runtimeRunId = "ca-canvas-runtime-stale-0123456789"; }],
    ["componentSourceSha256", (artifact) => { artifact.componentSourceSha256 = "a".repeat(64); }],
    ["controlBlueprintSha256", (artifact) => { artifact.controlBlueprintSha256 = "b".repeat(64); }],
    ["markerIdentities", (artifact) => { artifact.markerIdentities.canvas.contextRegistrations -= 1; }],
    ["markerIdentitiesSha256", (artifact) => { artifact.markerIdentitiesSha256 = "c".repeat(64); }]
  ];
  for (const [field, mutate] of mutations) {
    const mixed = structuredClone(exact.loaded);
    mutate(mixed[0]!.artifact);
    await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
      expectedIdentity: runIdentity,
      expectedMatrix: exact.expectedMatrix,
      loaded: mixed,
      validationContexts: exact.validationContexts
    }), new RegExp(`mixed or stale ${field}|does not bind|identity drifted`), `${field} must fail closed`);
  }

  const wrongShard = structuredClone(exact.loaded);
  wrongShard[0]!.artifact.shard = { index: 1, total: 2 };
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: wrongShard,
    validationContexts: exact.validationContexts
  }), /shard drifted/);

  const staleName = structuredClone(exact.loaded);
  staleName[0]!.fileName = `stale${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`;
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: staleName,
    validationContexts: exact.validationContexts
  }), /stray or stale official filename/);

  const partialStatus = structuredClone(exact.loaded);
  (partialStatus[0]!.artifact as unknown as { terminalStatus: string })
    .terminalStatus = "partial";
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: exact.expectedMatrix,
    loaded: partialStatus,
    validationContexts: exact.validationContexts
  }), /terminal status is not passed/);
});

test("artifact matrix rejects package payload swaps even when the flattened evidence set is unchanged", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-payload-swap-0123456789" });
  const packages = syntheticBenches.map((bench, index) => ({
    benchIds: [bench.benchId],
    packageId: `signature-exhaustive-p1-${index + 1}`
  }));
  const expectedMatrix = buildCaliforniaSignatureExpectedArtifactMatrix({
    packages,
    projects: ["desktop-chrome"],
    runId: runIdentity.runId
  });
  const validationContexts = new Map(packages.map((workPackage) => [
    workPackage.packageId,
    validationContext(runIdentity, workPackage.benchIds)
  ]));
  for (const workPackage of packages) {
    await persistCaliforniaSignatureSuccessfulArtifactFixture({
      evidence: [evidence(workPackage.benchIds[0]!)],
      identity: runIdentity,
      ledgerRoot,
      packageId: workPackage.packageId,
      projectName: "desktop-chrome",
      shard: null,
      testInfo: successfulTestInfo,
      validationContext: validationContexts.get(workPackage.packageId)!
    });
  }
  const loaded = await loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix,
    ledgerRoot
  });
  const firstStream = structuredClone(loaded[0]!.artifact.evidenceStream);
  const firstSnapshot = structuredClone(loaded[0]!.artifact.evidenceSnapshot);
  loaded[0]!.artifact.evidenceStream = structuredClone(loaded[1]!.artifact.evidenceStream);
  loaded[0]!.artifact.evidenceSnapshot = structuredClone(loaded[1]!.artifact.evidenceSnapshot);
  loaded[1]!.artifact.evidenceStream = firstStream;
  loaded[1]!.artifact.evidenceSnapshot = firstSnapshot;
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix,
    loaded,
    validationContexts
  }), /evidence stream is not bound to execution-group ownership|fixture package evidence benches: exact values drifted|source-oracle projection references unknown bench/);
});

test("on-disk loader rejects stale replacement and a stray official copy", async (t) => {
  const ledgerRoot = await temporaryLedger(t);
  const runIdentity = identity({ runId: "ca-signature-run-loader-0123456789" });
  const destination = await persistCaliforniaSignatureSuccessfulArtifactFixture({
    evidence: [evidence()],
    identity: runIdentity,
    ledgerRoot,
    packageId: "signature-exhaustive-p1-1",
    projectName: "desktop-chrome",
    shard: null,
    testInfo: successfulTestInfo,
    validationContext: validationContext(runIdentity)
  });
  const original = JSON.parse(await readFile(destination, "utf8")) as CaliforniaSignatureOfficialArtifact;
  const stale = structuredClone(original);
  stale.buildId = "stale-replacement-build";
  await writeFile(destination, `${JSON.stringify(stale)}\n`, "utf8");
  const staleLoaded = await loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    ledgerRoot
  });
  await assert.rejects(() => verifyCaliforniaSignatureOfficialArtifactMatrix({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    loaded: staleLoaded,
    validationContexts: new Map([["signature-exhaustive-p1-1", validationContext(runIdentity)]])
  }), /mixed or stale buildId/);

  await writeFile(destination, `${JSON.stringify(original)}\n`, "utf8");
  const runDirectory = californiaSignatureArtifactRunDirectory(ledgerRoot, runIdentity.runId);
  const stray = path.join(runDirectory, `stray${CALIFORNIA_SIGNATURE_OFFICIAL_ARTIFACT_SUFFIX}`);
  await copyFile(destination, stray);
  await assert.rejects(() => loadCaliforniaSignatureOfficialArtifacts({
    expectedIdentity: runIdentity,
    expectedMatrix: oneEntryMatrix(runIdentity),
    ledgerRoot
  }), /missing or extra project\/package\/repeat item/,
  "a stray official file must not be ignored");
});
