import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rmdir,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME,
  type CaliforniaFormalProjectName
} from "./california-visualization-qa-helpers";
import {
  CALIFORNIA_VISUALIZATION_COVERAGE_FAILURE_SUFFIX,
  CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX,
  CALIFORNIA_VISUALIZATION_COVERAGE_PARTIAL_SUFFIX,
  CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
  CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME,
  CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME,
  buildCaliforniaVisualizationCoverageExpectedArtifactMatrix,
  buildCaliforniaVisualizationCoverageRunIdentity,
  californiaVisualizationCoverageRunDirectory,
  initializeCaliforniaVisualizationCoverageArtifactRun,
  loadCaliforniaVisualizationCoverageSealedArtifacts,
  persistCaliforniaVisualizationCoverageDiagnostic,
  persistCaliforniaVisualizationCoveragePassedArtifact,
  publishCaliforniaVisualizationCoverageProducerSuccess,
  sealCaliforniaVisualizationCoverageArtifactRun,
  verifyCaliforniaVisualizationCoverageArtifactMatrix,
  type CaliforniaVisualizationCoverageExpectedArtifact,
  type CaliforniaVisualizationCoveragePassedPayload,
  type CaliforniaVisualizationCoverageProducerSuccessReceipt,
  type CaliforniaVisualizationCoverageRunIdentity,
  type CaliforniaVisualizationCoverageSealReceipt
} from "./california-visualization-artifact-lifecycle";

const TEST_TMP_ROOT = "/Volumes/Starship/MAIS-ca-viz-labs-wt/.tmp";

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function identity(overrides: Partial<CaliforniaVisualizationCoverageRunIdentity> = {}) {
  return buildCaliforniaVisualizationCoverageRunIdentity({
    baselineSha: "1234567890abcdef1234567890abcdef12345678",
    buildId: "ca-viz-fresh-build-0123456789",
    catalogHash: "1".repeat(64),
    harnessHash: "2".repeat(64),
    matrixConfigHash: "3".repeat(64),
    matrixRunId: `ca-broad-${randomUUID()}`,
    sourceHash: "4".repeat(64),
    sourceSnapshotSha256: "5".repeat(64),
    ...overrides
  });
}

function matrix(provenance: CaliforniaVisualizationCoverageRunIdentity) {
  return buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-p1-1", "premium-p1"],
    provenance
  });
}

function payload(
  expected: CaliforniaVisualizationCoverageExpectedArtifact,
  provenance: CaliforniaVisualizationCoverageRunIdentity
): CaliforniaVisualizationCoveragePassedPayload {
  assert.ok(expected.projectName === "desktop-chrome" || expected.projectName === "mobile-chrome");
  return {
    attachmentsDurable: true,
    axes: ["desktop-en-light"],
    budgets: {
      packageTimeoutMs: 60_000,
      recoveryDeadlineMs: 60_000,
      uxReadyMs: 30_000
    },
    createdAt: "2026-08-10T00:00:00.000Z",
    execution: {
      repeatEachIndex: expected.execution.repeatEachIndex,
      retry: 0
    },
    expected: 1,
    packageIssues: [],
    project: expected.projectName,
    projectEvidence: structuredClone(
      CALIFORNIA_FORMAL_PROJECT_EVIDENCE_BY_NAME[expected.projectName as CaliforniaFormalProjectName]
    ),
    provenance: structuredClone(provenance),
    records: [{
      attempted: true,
      logicalToken: `${expected.projectName}:${expected.packageId}`,
      status: "passed"
    }],
    schemaVersion: 5,
    selection: {
      grades: ["P1"],
      includePremiumDirect: true,
      labIds: [],
      shard: null
    },
    summary: {
      attempted: 1,
      failed: 0,
      passed: 1,
      pending: 0,
      unattempted: 0
    },
    workItem: {
      id: expected.packageId,
      kind: expected.packageId.startsWith("premium") ? "premium-direct" : "directory",
      visitCount: 1
    }
  };
}

function validatePayload(value: CaliforniaVisualizationCoveragePassedPayload) {
  assert.equal(value.records.length, 1);
  assert.equal(
    value.records[0]!.logicalToken,
    `${value.project}:${value.workItem.id}`,
    "synthetic aggregate payload binding drifted"
  );
}

async function temporaryLedger(t: test.TestContext) {
  await mkdir(TEST_TMP_ROOT, { recursive: true });
  const root = await mkdtemp(path.join(TEST_TMP_ROOT, "ca-broad-artifact-lifecycle-"));
  t.after(async () => {
    await rm(root, { force: true, recursive: true });
  });
  return {
    ledgerRoot: path.join(root, "ledger"),
    root
  };
}

async function publishOne(options: {
  expected: CaliforniaVisualizationCoverageExpectedArtifact;
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  retry?: number;
}) {
  return persistCaliforniaVisualizationCoveragePassedArtifact({
    errors: [],
    expectedMatrix: options.expectedMatrix,
    ledgerRoot: options.ledgerRoot,
    packageId: options.expected.packageId,
    payload: payload(options.expected, options.provenance),
    projectName: options.expected.projectName,
    provenance: options.provenance,
    repeatEachIndex: options.expected.execution.repeatEachIndex,
    retry: options.retry ?? 0,
    validatePayload
  });
}

async function publishAll(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}) {
  const published = [];
  for (const expected of options.expectedMatrix.values()) {
    published.push(await publishOne({ ...options, expected }));
  }
  return published;
}

async function seal(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
}) {
  const producerSuccessReceipt = await publishCaliforniaVisualizationCoverageProducerSuccess({
    ...options,
    producerReportSha256: "a".repeat(64),
    validatePayload
  });
  let aggregateCalls = 0;
  const sealed = await sealCaliforniaVisualizationCoverageArtifactRun({
    ...options,
    producerSuccessReceipt,
    validateAggregate(artifacts) {
      aggregateCalls += 1;
      assert.equal(artifacts.length, options.expectedMatrix.size);
      for (const artifact of artifacts) validatePayload(artifact.payload);
    },
    validatePayload
  });
  assert.equal(aggregateCalls, 2,
    "aggregate validation must run before seal and after sealed disk reread");
  return { ...sealed, producerSuccessReceipt };
}

async function loadSealed(options: {
  expectedMatrix: ReadonlyMap<string, CaliforniaVisualizationCoverageExpectedArtifact>;
  ledgerRoot: string;
  provenance: CaliforniaVisualizationCoverageRunIdentity;
  producerSuccessReceipt: CaliforniaVisualizationCoverageProducerSuccessReceipt;
  sealReceipt: CaliforniaVisualizationCoverageSealReceipt;
}) {
  return loadCaliforniaVisualizationCoverageSealedArtifacts({
    ...options,
    validatePayload
  });
}

test("broad coverage lifecycle publishes exact bytes, seals the full matrix, and forbids retry, overwrite, or late publication", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = matrix(provenance);
  const initialized = await initializeCaliforniaVisualizationCoverageArtifactRun({
    expectedMatrix,
    ledgerRoot,
    provenance
  });
  assert.deepEqual(await readdir(initialized.runDirectory), [
    CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME
  ]);

  await assert.rejects(
    () => initializeCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix,
      ledgerRoot,
      provenance: identity({
        buildId: "stale-build-identity",
        matrixRunId: provenance.matrixRunId
      })
    }),
    /mixed or stale provenance field buildId/
  );

  const first = [...expectedMatrix.values()][0]!;
  const firstPublication = await publishOne({ expected: first, expectedMatrix, ledgerRoot, provenance });
  assert.ok(firstPublication.destination.endsWith(CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX));
  assert.match(firstPublication.fileSha256, /^[a-f0-9]{64}$/);
  assert.equal((await lstat(firstPublication.destination)).nlink, 1);

  const second = [...expectedMatrix.values()][1]!;
  await assert.rejects(
    () => publishOne({ expected: second, expectedMatrix, ledgerRoot, provenance, retry: 1 }),
    /retries=0/
  );

  for (const expected of [...expectedMatrix.values()].slice(1)) {
    await publishOne({ expected, expectedMatrix, ledgerRoot, provenance });
  }
  await assert.rejects(
    () => loadCaliforniaVisualizationCoverageSealedArtifacts({
      expectedMatrix,
      ledgerRoot,
      producerSuccessReceipt: {
        fileName: CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
        sha256: "e".repeat(64)
      },
      provenance,
      sealReceipt: {
        fileName: CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME,
        sha256: "f".repeat(64)
      },
      validatePayload
    }),
    /lacks its terminal seal/,
    "the acceptance loader must never accept an open run"
  );

  const sealed = await seal({ expectedMatrix, ledgerRoot, provenance });
  assert.match(sealed.sealReceipt.sha256, /^[a-f0-9]{64}$/);
  const loaded = await loadSealed({
    expectedMatrix,
    ledgerRoot,
    producerSuccessReceipt: sealed.producerSuccessReceipt,
    provenance,
    sealReceipt: sealed.sealReceipt
  });
  assert.equal(loaded.length, expectedMatrix.size);
  assert.equal(verifyCaliforniaVisualizationCoverageArtifactMatrix({
    expectedMatrix,
    loaded,
    provenance
  }).length, expectedMatrix.size);

  const runDirectory = californiaVisualizationCoverageRunDirectory(ledgerRoot, provenance.matrixRunId);
  assert.deepEqual(
    (await readdir(runDirectory)).sort(),
    [
      CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME,
      CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
      CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME,
      ...[...expectedMatrix.values()].map((expected) => expected.fileName)
    ].sort()
  );
  await assert.rejects(
    () => seal({ expectedMatrix, ledgerRoot, provenance }),
    /run is sealed/
  );
  await assert.rejects(
    () => publishOne({ expected: first, expectedMatrix, ledgerRoot, provenance }),
    /run is sealed/
  );
  await assert.rejects(
    () => persistCaliforniaVisualizationCoverageDiagnostic({
      error: new Error("late failure"),
      expectedMatrix,
      ledgerRoot,
      packageId: first.packageId,
      projectName: first.projectName,
      provenance,
      repeatEachIndex: 0,
      retry: 0
    }),
    /run is sealed/,
    "sealed runs are immutable to both official and diagnostic writers"
  );
});

test("a duplicate official publication attempt poisons the open run instead of selecting either attempt", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-duplicate"],
    projects: ["desktop-chrome"],
    provenance
  });
  const expected = [...expectedMatrix.values()][0]!;
  await publishOne({ expected, expectedMatrix, ledgerRoot, provenance });
  await assert.rejects(
    () => publishOne({ expected, expectedMatrix, ledgerRoot, provenance }),
    /EEXIST/,
    "the same logical item cannot be overwritten or selected as a later attempt"
  );
  await assert.rejects(
    () => seal({ expectedMatrix, ledgerRoot, provenance }),
    /failure\/partial\/temp\/unknown files/,
    "a duplicate producer attempt must make the run permanently unsealable"
  );
});

test("finalization requires the exact external producer process-success receipt and freezes later producers", async (t) => {
  const missing = await temporaryLedger(t);
  const missingProvenance = identity();
  const missingMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-producer-fence"],
    projects: ["desktop-chrome"],
    provenance: missingProvenance
  });
  await publishAll({
    expectedMatrix: missingMatrix,
    ledgerRoot: missing.ledgerRoot,
    provenance: missingProvenance
  });
  await assert.rejects(
    () => sealCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      producerSuccessReceipt: {
        fileName: CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME,
        sha256: "f".repeat(64)
      },
      provenance: missingProvenance,
      validateAggregate() {},
      validatePayload
    }),
    /lacks its producer process-success receipt/
  );

  const receipt = await publishCaliforniaVisualizationCoverageProducerSuccess({
    expectedMatrix: missingMatrix,
    ledgerRoot: missing.ledgerRoot,
    producerReportSha256: "b".repeat(64),
    provenance: missingProvenance,
    validatePayload
  });
  const expected = [...missingMatrix.values()][0]!;
  await assert.rejects(
    () => publishOne({
      expected,
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      provenance: missingProvenance
    }),
    /producer already reported process success/
  );
  await assert.rejects(
    () => persistCaliforniaVisualizationCoverageDiagnostic({
      error: new Error("late producer failure"),
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      packageId: expected.packageId,
      projectName: expected.projectName,
      provenance: missingProvenance,
      repeatEachIndex: 0,
      retry: 0
    }),
    /producer already reported process success/
  );

  const producerPath = path.join(
    californiaVisualizationCoverageRunDirectory(missing.ledgerRoot, missingProvenance.matrixRunId),
    CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME
  );
  const exactProducerBytes = await readFile(producerPath, "utf8");
  await writeFile(producerPath, `${exactProducerBytes.trimEnd()}  \n`, "utf8");
  await assert.rejects(
    () => sealCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      producerSuccessReceipt: receipt,
      provenance: missingProvenance,
      validateAggregate() {},
      validatePayload
    }),
    /producer process-success receipt no longer matches its external receipt/
  );
});

test("producer success binds exact official artifact bytes before terminal sealing", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-preseal-byte-fence"],
    projects: ["desktop-chrome"],
    provenance
  });
  const published = await publishAll({ expectedMatrix, ledgerRoot, provenance });
  const producerSuccessReceipt = await publishCaliforniaVisualizationCoverageProducerSuccess({
    expectedMatrix,
    ledgerRoot,
    producerReportSha256: "c".repeat(64),
    provenance,
    validatePayload
  });
  const runDirectory = californiaVisualizationCoverageRunDirectory(ledgerRoot, provenance.matrixRunId);
  const producerSuccess = JSON.parse(await readFile(
    path.join(runDirectory, CALIFORNIA_VISUALIZATION_COVERAGE_PRODUCER_SUCCESS_FILENAME),
    "utf8"
  ));
  assert.deepEqual(
    producerSuccess.artifacts,
    [{
      artifactId: [...expectedMatrix.values()][0]!.artifactId,
      fileName: [...expectedMatrix.values()][0]!.fileName,
      sha256: published[0]!.fileSha256
    }],
    "producer success must durably bind the sorted official artifact byte identities"
  );

  const mutated = JSON.parse(await readFile(published[0]!.destination, "utf8"));
  mutated.createdAt = "2099-01-01T00:00:00.000Z";
  await writeFile(published[0]!.destination, `${JSON.stringify(mutated)}\n`, "utf8");
  await assert.rejects(
    () => sealCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix,
      ledgerRoot,
      producerSuccessReceipt,
      provenance,
      validateAggregate() {},
      validatePayload
    }),
    /official artifact bytes no longer match producer process-success/,
    "schema-valid byte drift after producer success must never be sealed as producer truth"
  );
  assert.equal(
    (await readdir(runDirectory)).includes(CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME),
    false,
    "pre-seal byte drift must fail before any terminal seal is published"
  );
});

test("a post-link producer failure leaves durable pending poison that a concurrent finalizer cannot seal", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-race"],
    projects: ["desktop-chrome"],
    provenance
  });
  const expected = [...expectedMatrix.values()][0]!;
  let validationCalls = 0;
  let reachedPostLink!: () => void;
  let releasePostLink!: () => void;
  const postLinkReached = new Promise<void>((resolve) => { reachedPostLink = resolve; });
  const postLinkRelease = new Promise<void>((resolve) => { releasePostLink = resolve; });

  const writer = persistCaliforniaVisualizationCoveragePassedArtifact({
    errors: [],
    expectedMatrix,
    ledgerRoot,
    packageId: expected.packageId,
    payload: payload(expected, provenance),
    projectName: expected.projectName,
    provenance,
    repeatEachIndex: expected.execution.repeatEachIndex,
    retry: 0,
    async validatePayload(candidate) {
      validatePayload(candidate);
      validationCalls += 1;
      if (validationCalls === 2) {
        reachedPostLink();
        await postLinkRelease;
        throw new Error("synthetic post-link producer failure");
      }
    }
  }).then(
    () => new Error("writer unexpectedly passed"),
    (error: unknown) => error
  );

  await postLinkReached;
  const finalizer = seal({ expectedMatrix, ledgerRoot, provenance }).then(
    () => new Error("finalizer unexpectedly sealed"),
    (error: unknown) => error
  );
  releasePostLink();

  const writerError = await writer;
  assert.match(String(writerError), /synthetic post-link producer failure/);
  const finalizerError = await finalizer;
  assert.match(String(finalizerError), /failure\/partial\/temp\/unknown files/);

  const runDirectory = californiaVisualizationCoverageRunDirectory(
    ledgerRoot,
    provenance.matrixRunId
  );
  const entries = await readdir(runDirectory);
  assert.ok(entries.includes(expected.fileName), "the adversarial fixture must reach official publication");
  assert.ok(
    entries.some((name) => name.includes(".producer-pending.tmp")),
    "the failed producer must retain a durable pending intent"
  );
  assert.equal(
    entries.includes(CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME),
    false,
    "a concurrent finalizer must never seal the orphaned official artifact"
  );
});

test("publication-lock cleanup failure cannot remove the producer intent or leave a sealable official", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-lock-integrity"],
    projects: ["desktop-chrome"],
    provenance
  });
  const expected = [...expectedMatrix.values()][0]!;
  let validationCalls = 0;
  const writerError = await persistCaliforniaVisualizationCoveragePassedArtifact({
    errors: [],
    expectedMatrix,
    ledgerRoot,
    packageId: expected.packageId,
    payload: payload(expected, provenance),
    projectName: expected.projectName,
    provenance,
    repeatEachIndex: 0,
    retry: 0,
    async validatePayload(candidate) {
      validatePayload(candidate);
      validationCalls += 1;
      if (validationCalls === 2) {
        await rmdir(path.join(
          ledgerRoot,
          `.${provenance.matrixRunId}.coverage-publication-lock`
        ));
      }
    }
  }).then(
    () => new Error("writer unexpectedly passed after lock deletion"),
    (error: unknown) => error
  );
  assert.match(String(writerError), /ENOENT/);

  const runDirectory = californiaVisualizationCoverageRunDirectory(
    ledgerRoot,
    provenance.matrixRunId
  );
  const entries = await readdir(runDirectory);
  assert.ok(entries.includes(expected.fileName), "the fixture must reach official publication");
  assert.ok(
    entries.some((name) => name.includes(".producer-pending.tmp")),
    "a lock-cleanup failure must retain producer poison until the public writer resolves"
  );
  await assert.rejects(
    () => seal({ expectedMatrix, ledgerRoot, provenance }),
    /failure\/partial\/temp\/unknown files/
  );
});

test("publication-lock cleanup refuses to delete a replacement lock directory", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-lock-replacement"],
    projects: ["desktop-chrome"],
    provenance
  });
  const expected = [...expectedMatrix.values()][0]!;
  const lockPath = path.join(
    ledgerRoot,
    `.${provenance.matrixRunId}.coverage-publication-lock`
  );
  const displacedLockPath = `${lockPath}.displaced`;
  let replacementIdentity: Awaited<ReturnType<typeof lstat>> | null = null;
  let validationCalls = 0;

  const writerError = await persistCaliforniaVisualizationCoveragePassedArtifact({
    errors: [],
    expectedMatrix,
    ledgerRoot,
    packageId: expected.packageId,
    payload: payload(expected, provenance),
    projectName: expected.projectName,
    provenance,
    repeatEachIndex: 0,
    retry: 0,
    async validatePayload(candidate) {
      validatePayload(candidate);
      validationCalls += 1;
      if (validationCalls === 2) {
        const acquiredIdentity = await lstat(lockPath);
        await rename(lockPath, displacedLockPath);
        await mkdir(lockPath);
        replacementIdentity = await lstat(lockPath);
        assert.notEqual(
          replacementIdentity.ino,
          acquiredIdentity.ino,
          "the adversarial fixture must install a different lock inode"
        );
      }
    }
  }).then(
    () => new Error("writer unexpectedly removed a replacement publication lock"),
    (error: unknown) => error
  );

  assert.match(String(writerError), /publication lock ownership changed inode before cleanup/);
  const installedReplacement = replacementIdentity as Awaited<ReturnType<typeof lstat>> | null;
  assert.ok(installedReplacement, "the adversarial fixture never installed its replacement lock");
  const retainedReplacement = await lstat(lockPath);
  assert.equal(retainedReplacement.dev, installedReplacement.dev);
  assert.equal(retainedReplacement.ino, installedReplacement.ino,
    "the previous lock holder must not delete a replacement lock");

  const runDirectory = californiaVisualizationCoverageRunDirectory(
    ledgerRoot,
    provenance.matrixRunId
  );
  assert.ok(
    (await readdir(runDirectory)).some((name) => name.includes(".producer-pending.tmp")),
    "replacement-lock rejection must retain producer pending poison"
  );

  await rmdir(lockPath);
  await assert.rejects(
    () => seal({ expectedMatrix, ledgerRoot, provenance }),
    /failure\/partial\/temp\/unknown files/,
    "the replacement-lock race must leave the run unsealable"
  );
});

test("exact matrix fails closed on missing, extra, duplicate logical, stale, and payload-swapped artifacts", async (t) => {
  assert.throws(
    () => buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
      packages: ["duplicate", "duplicate"],
      provenance: identity()
    }),
    /repeats a package/
  );

  const missing = await temporaryLedger(t);
  const missingProvenance = identity();
  const missingMatrix = matrix(missingProvenance);
  const missingItems = [...missingMatrix.values()];
  for (const expected of missingItems.slice(0, -1)) {
    await publishOne({
      expected,
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      provenance: missingProvenance
    });
  }
  await assert.rejects(
    () => seal({
      expectedMatrix: missingMatrix,
      ledgerRoot: missing.ledgerRoot,
      provenance: missingProvenance
    }),
    /missing or extra project\/package\/repeat item/
  );

  const extra = await temporaryLedger(t);
  const extraProvenance = identity();
  const extraMatrix = matrix(extraProvenance);
  const extraPublished = await publishAll({
    expectedMatrix: extraMatrix,
    ledgerRoot: extra.ledgerRoot,
    provenance: extraProvenance
  });
  const extraRun = californiaVisualizationCoverageRunDirectory(extra.ledgerRoot, extraProvenance.matrixRunId);
  await copyFile(
    extraPublished[0]!.destination,
    path.join(extraRun, `duplicate-logical${CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX}`)
  );
  await assert.rejects(
    () => seal({ expectedMatrix: extraMatrix, ledgerRoot: extra.ledgerRoot, provenance: extraProvenance }),
    /missing or extra project\/package\/repeat item/,
    "there is no highest-retry or duplicate-logical-item selection path"
  );

  const swapped = await temporaryLedger(t);
  const swappedProvenance = identity();
  const swappedMatrix = matrix(swappedProvenance);
  const swappedPublished = await publishAll({
    expectedMatrix: swappedMatrix,
    ledgerRoot: swapped.ledgerRoot,
    provenance: swappedProvenance
  });
  const left = JSON.parse(await readFile(swappedPublished[0]!.destination, "utf8"));
  const right = JSON.parse(await readFile(swappedPublished[1]!.destination, "utf8"));
  left.payload = right.payload;
  left.payloadSha256 = right.payloadSha256;
  await writeFile(swappedPublished[0]!.destination, `${JSON.stringify(left)}\n`, "utf8");
  await assert.rejects(
    () => seal({
      expectedMatrix: swappedMatrix,
      ledgerRoot: swapped.ledgerRoot,
      provenance: swappedProvenance
    }),
    /payload project does not bind|payload workItem does not bind/,
    "equal-status package payloads cannot be swapped between logical files"
  );

  const stale = await temporaryLedger(t);
  const staleProvenance = identity();
  const staleMatrix = matrix(staleProvenance);
  const stalePublished = await publishAll({
    expectedMatrix: staleMatrix,
    ledgerRoot: stale.ledgerRoot,
    provenance: staleProvenance
  });
  const staleArtifact = JSON.parse(await readFile(stalePublished[0]!.destination, "utf8"));
  staleArtifact.provenance.buildId = "stale-build";
  await writeFile(stalePublished[0]!.destination, `${JSON.stringify(staleArtifact)}\n`, "utf8");
  await assert.rejects(
    () => seal({ expectedMatrix: staleMatrix, ledgerRoot: stale.ledgerRoot, provenance: staleProvenance }),
    /mixed or stale provenance field buildId/
  );
});

test("failure, partial, temp, unknown, and missing-manifest files poison broad acceptance", async (t) => {
  for (const diagnosticKind of ["failure", "partial"] as const) {
    const fixture = await temporaryLedger(t);
    const provenance = identity();
    const expectedMatrix = matrix(provenance);
    const expected = [...expectedMatrix.values()][0]!;
    const diagnostic = await persistCaliforniaVisualizationCoverageDiagnostic({
      error: new Error(`${diagnosticKind} diagnostic`),
      expectedMatrix,
      ledgerRoot: fixture.ledgerRoot,
      packageId: expected.packageId,
      partialPayload: diagnosticKind === "partial" ? { records: [{ status: "passed" }] } : undefined,
      projectName: expected.projectName,
      provenance,
      repeatEachIndex: expected.execution.repeatEachIndex,
      retry: 0
    });
    assert.equal(
      diagnostic.endsWith(diagnosticKind === "partial"
        ? CALIFORNIA_VISUALIZATION_COVERAGE_PARTIAL_SUFFIX
        : CALIFORNIA_VISUALIZATION_COVERAGE_FAILURE_SUFFIX),
      true
    );
    assert.equal(diagnostic.endsWith(CALIFORNIA_VISUALIZATION_COVERAGE_OFFICIAL_SUFFIX), false);
    await assert.rejects(
      () => seal({ expectedMatrix, ledgerRoot: fixture.ledgerRoot, provenance }),
      /failure\/partial\/temp\/unknown files/
    );
  }

  for (const poisonName of ["leftover.tmp", "unknown.log"] as const) {
    const fixture = await temporaryLedger(t);
    const provenance = identity();
    const expectedMatrix = matrix(provenance);
    await publishAll({ expectedMatrix, ledgerRoot: fixture.ledgerRoot, provenance });
    const runDirectory = californiaVisualizationCoverageRunDirectory(
      fixture.ledgerRoot,
      provenance.matrixRunId
    );
    await writeFile(path.join(runDirectory, poisonName), "poison\n", "utf8");
    await assert.rejects(
      () => seal({ expectedMatrix, ledgerRoot: fixture.ledgerRoot, provenance }),
      /failure\/partial\/temp\/unknown files/
    );
  }

  const missingManifest = await temporaryLedger(t);
  const missingManifestProvenance = identity();
  const missingManifestMatrix = matrix(missingManifestProvenance);
  await publishAll({
    expectedMatrix: missingManifestMatrix,
    ledgerRoot: missingManifest.ledgerRoot,
    provenance: missingManifestProvenance
  });
  await unlink(path.join(
    californiaVisualizationCoverageRunDirectory(
      missingManifest.ledgerRoot,
      missingManifestProvenance.matrixRunId
    ),
    CALIFORNIA_VISUALIZATION_COVERAGE_RUN_MANIFEST_FILENAME
  ));
  await assert.rejects(
    () => seal({
      expectedMatrix: missingManifestMatrix,
      ledgerRoot: missingManifest.ledgerRoot,
      provenance: missingManifestProvenance
    }),
    /run manifest|ENOENT/
  );
});

test("an expected official filename occupied by a nonregular directory fails closed", async (t) => {
  const { ledgerRoot } = await temporaryLedger(t);
  const provenance = identity();
  const expectedMatrix = buildCaliforniaVisualizationCoverageExpectedArtifactMatrix({
    packages: ["directory-nonregular"],
    projects: ["desktop-chrome"],
    provenance
  });
  const initialized = await initializeCaliforniaVisualizationCoverageArtifactRun({
    expectedMatrix,
    ledgerRoot,
    provenance
  });
  const expected = [...expectedMatrix.values()][0]!;
  const nonregularPath = path.join(initialized.runDirectory, expected.fileName);
  await mkdir(nonregularPath);
  try {
    await assert.rejects(
      () => publishCaliforniaVisualizationCoverageProducerSuccess({
        expectedMatrix,
        ledgerRoot,
        producerReportSha256: "d".repeat(64),
        provenance,
        validatePayload
      }),
      /run entries must be regular non-symlink files/,
      "a directory cannot masquerade as the exact expected official artifact"
    );
  } finally {
    await rmdir(nonregularPath);
  }
});

test("sealed loader rejects hard links, symlinks, and symlink-traversing Starship roots", async (t) => {
  const hardLinkFixture = await temporaryLedger(t);
  const hardLinkProvenance = identity();
  const hardLinkMatrix = matrix(hardLinkProvenance);
  const hardLinkPublished = await publishAll({
    expectedMatrix: hardLinkMatrix,
    ledgerRoot: hardLinkFixture.ledgerRoot,
    provenance: hardLinkProvenance
  });
  const hardLinkSeal = await seal({
    expectedMatrix: hardLinkMatrix,
    ledgerRoot: hardLinkFixture.ledgerRoot,
    provenance: hardLinkProvenance
  });
  const secondLink = path.join(hardLinkFixture.root, "external-hard-link.json");
  await link(hardLinkPublished[0]!.destination, secondLink);
  await assert.rejects(
    () => loadSealed({
      expectedMatrix: hardLinkMatrix,
      ledgerRoot: hardLinkFixture.ledgerRoot,
      producerSuccessReceipt: hardLinkSeal.producerSuccessReceipt,
      provenance: hardLinkProvenance,
      sealReceipt: hardLinkSeal.sealReceipt
    }),
    /hard-linked files are forbidden/
  );

  const symlinkFixture = await temporaryLedger(t);
  const symlinkProvenance = identity();
  const symlinkMatrix = matrix(symlinkProvenance);
  const symlinkPublished = await publishAll({
    expectedMatrix: symlinkMatrix,
    ledgerRoot: symlinkFixture.ledgerRoot,
    provenance: symlinkProvenance
  });
  const symlinkSeal = await seal({
    expectedMatrix: symlinkMatrix,
    ledgerRoot: symlinkFixture.ledgerRoot,
    provenance: symlinkProvenance
  });
  const backup = path.join(symlinkFixture.root, "official-backup.json");
  await copyFile(symlinkPublished[0]!.destination, backup);
  await unlink(symlinkPublished[0]!.destination);
  await symlink(backup, symlinkPublished[0]!.destination);
  await assert.rejects(
    () => loadSealed({
      expectedMatrix: symlinkMatrix,
      ledgerRoot: symlinkFixture.ledgerRoot,
      producerSuccessReceipt: symlinkSeal.producerSuccessReceipt,
      provenance: symlinkProvenance,
      sealReceipt: symlinkSeal.sealReceipt
    }),
    /regular non-symlink files/
  );

  const symlinkRootFixture = await temporaryLedger(t);
  const realLedger = path.join(symlinkRootFixture.root, "real-ledger");
  const linkedLedger = path.join(symlinkRootFixture.root, "linked-ledger");
  await mkdir(realLedger);
  await symlink(realLedger, linkedLedger);
  const symlinkRootProvenance = identity();
  await assert.rejects(
    () => initializeCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix: matrix(symlinkRootProvenance),
      ledgerRoot: linkedLedger,
      provenance: symlinkRootProvenance
    }),
    /non-symlink|must not traverse a symlink/
  );
});

test("external seal receipt rejects artifact drift, seal mismatch, and a forged directory-local reseal", async (t) => {
  const driftFixture = await temporaryLedger(t);
  const driftProvenance = identity();
  const driftMatrix = matrix(driftProvenance);
  const driftPublished = await publishAll({
    expectedMatrix: driftMatrix,
    ledgerRoot: driftFixture.ledgerRoot,
    provenance: driftProvenance
  });
  const driftSeal = await seal({
    expectedMatrix: driftMatrix,
    ledgerRoot: driftFixture.ledgerRoot,
    provenance: driftProvenance
  });
  const exactBytes = await readFile(driftPublished[0]!.destination, "utf8");
  await writeFile(driftPublished[0]!.destination, `${exactBytes.trimEnd()}  \n`, "utf8");
  await assert.rejects(
    () => loadSealed({
      expectedMatrix: driftMatrix,
      ledgerRoot: driftFixture.ledgerRoot,
      producerSuccessReceipt: driftSeal.producerSuccessReceipt,
      provenance: driftProvenance,
      sealReceipt: driftSeal.sealReceipt
    }),
    /terminal seal file list or artifact SHA drifted|official artifact bytes no longer match producer process-success/
  );

  const resealFixture = await temporaryLedger(t);
  const resealProvenance = identity();
  const resealMatrix = matrix(resealProvenance);
  await publishAll({
    expectedMatrix: resealMatrix,
    ledgerRoot: resealFixture.ledgerRoot,
    provenance: resealProvenance
  });
  const reseal = await seal({
    expectedMatrix: resealMatrix,
    ledgerRoot: resealFixture.ledgerRoot,
    provenance: resealProvenance
  });
  const sealPath = path.join(
    californiaVisualizationCoverageRunDirectory(resealFixture.ledgerRoot, resealProvenance.matrixRunId),
    CALIFORNIA_VISUALIZATION_COVERAGE_RUN_SEAL_FILENAME
  );
  const forgedSeal = JSON.parse(await readFile(sealPath, "utf8"));
  forgedSeal.sealedAt = "2099-08-10T01:00:00.000Z";
  await writeFile(sealPath, `${JSON.stringify(forgedSeal)}\n`, "utf8");
  await assert.rejects(
    () => loadSealed({
      expectedMatrix: resealMatrix,
      ledgerRoot: resealFixture.ledgerRoot,
      producerSuccessReceipt: reseal.producerSuccessReceipt,
      provenance: resealProvenance,
      sealReceipt: reseal.sealReceipt
    }),
    /terminal seal no longer matches its external receipt/,
    "directory-local SHA fields cannot replace the external terminal seal receipt"
  );
});

test("lifecycle refuses non-Starship ledgers and non-passing payload envelopes", async (t) => {
  const provenance = identity();
  const expectedMatrix = matrix(provenance);
  await assert.rejects(
    () => initializeCaliforniaVisualizationCoverageArtifactRun({
      expectedMatrix,
      ledgerRoot: "/tmp/forbidden-ca-broad-ledger",
      provenance
    }),
    /strict descendant of \/Volumes\/Starship/
  );

  const fixture = await temporaryLedger(t);
  const expected = [...expectedMatrix.values()][0]!;
  const failedPayload = payload(expected, provenance);
  failedPayload.records[0]!.status = "failed";
  failedPayload.summary = {
    attempted: 1,
    failed: 1,
    passed: 0,
    pending: 0,
    unattempted: 0
  };
  await assert.rejects(
    () => persistCaliforniaVisualizationCoveragePassedArtifact({
      errors: [],
      expectedMatrix,
      ledgerRoot: fixture.ledgerRoot,
      packageId: expected.packageId,
      payload: failedPayload,
      projectName: expected.projectName,
      provenance,
      repeatEachIndex: expected.execution.repeatEachIndex,
      retry: 0,
      validatePayload
    }),
    /unattempted or non-passing record|summary is not terminally passed/
  );
});

test("the broad runner and finalizer are wired to the exclusive retry-zero lifecycle", async () => {
  const runner = await readFile(
    path.resolve("tests/e2e/california-visualization-labs.spec.ts"),
    "utf8"
  );
  const finalizer = await readFile(
    path.resolve("tests/e2e/california-visualization-coverage-ledger.test.ts"),
    "utf8"
  );
  const helper = await readFile(
    path.resolve("tests/e2e/california-visualization-qa-helpers.ts"),
    "utf8"
  );

  assert.match(runner, /test\.describe\.configure\(\{ mode: "serial", retries: 0 \}\)/);
  assert.match(runner, /persistCaliforniaVisualizationCoveragePassedArtifact\(/);
  assert.match(runner, /persistCaliforniaVisualizationCoverageDiagnostic\(/);
  assert.ok(
    runner.match(/persistCaliforniaVisualizationCoverageDiagnostic\(/g)!.length >= 2,
    "a post-publication lifecycle error must attempt a poisoning diagnostic"
  );
  assert.match(runner, /buildCaliforniaVisualizationCoverageExpectedArtifactMatrix\(/);
  assert.match(runner, /Durable California coverage requires the exact 12-axis/);
  assert.match(runner, /Durable California coverage forbids grade filters/);
  assert.match(runner, /Durable California coverage forbids lab filters/);
  assert.match(runner, /Durable California coverage forbids sharding/);
  assert.doesNotMatch(runner, /persistCoverageLedgerArtifact|\.coverage\.json/,
    "the superseded flat writer must not remain reachable");

  assert.match(finalizer, /sealCaliforniaVisualizationCoverageArtifactRun<CoverageArtifact>\(/);
  assert.match(finalizer, /formal coverage requires retry=0/);
  assert.match(finalizer, /formal full-matrix coverage forbids sharded artifacts/);
  assert.match(finalizer, /sealed\.sealReceipt\.sha256/);
  assert.doesNotMatch(finalizer, /attempts\.sort|keeps only the highest logical retry/,
    "the finalizer must never select a later retry");
  assert.match(helper, /"tests\/e2e\/california-visualization-artifact-lifecycle\.ts"/,
    "the broad provenance hash must bind its artifact lifecycle implementation");
});
