import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  chmodSync,
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import {
  CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
  assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt,
  createCaliforniaSignatureFinalCompositorMeasurementLifecycle,
  publishCaliforniaSignatureFinalCompositorMeasurementReceipt,
  readCaliforniaSignatureFinalCompositorMeasurementReceipt,
  type CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput,
  type CaliforniaSignatureFinalCompositorMeasurementSubject,
  type CaliforniaSignatureFinalCompositorRawTimingSample
} from "./california-signature-final-compositor-measurement-lifecycle";
import {
  beforeNextCaliforniaSignatureFinalCompositorMeasurementTestIo,
  californiaSignatureFinalCompositorMeasurementTestDirectoryPath,
  disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle,
  publishCaliforniaSignatureFinalCompositorMeasurementTestFixture,
  publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture
} from "./california-signature-final-compositor-measurement-lifecycle.test-fixture";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const worktreeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const testRoot = mkdtempSync(path.join(
  worktreeRoot,
  ".tmp",
  "california-final-compositor-measurement-lifecycle-"
));
const lifecycle = createCaliforniaSignatureFinalCompositorMeasurementLifecycle({ worktreeRoot });

after(() => {
  disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle(lifecycle);
  rmSync(testRoot, { force: true, recursive: true });
});

const environment: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput = {
  architecture: "arm64",
  browserBinaryPath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  browserBuildId: "synthetic-chrome-build-1",
  browserChannel: "chrome",
  browserExecutableSha256: sha256("synthetic-browser-executable"),
  browserLaunchArgs: ["--headless=new", "--force-color-profile=srgb"],
  browserVersion: "synthetic-chrome-1",
  colorProfile: "srgb",
  cpuLogicalCoreCount: 12,
  cpuModel: "synthetic-arm-cpu",
  cpuPhysicalCoreCount: 6,
  dependencyLockSha256: sha256("synthetic-lockfile"),
  fontInventory: [
    {
      family: "Arial",
      fileSha256: sha256("synthetic-arial-font"),
      postscriptName: "ArialMT",
      sourcePath: "/System/Library/Fonts/Supplemental/Arial.ttf",
      version: "synthetic-1"
    }
  ],
  headless: true,
  kernelVersion: "synthetic-kernel-1",
  libvipsVersion: "8.17.1",
  loadAverage1mMilli: 250,
  locale: "en-US",
  nodeVersion: "v24.15.0",
  operatingSystem: "darwin",
  playwrightVersion: "1.55.0",
  powerSource: "ac",
  processCount: 1,
  ramBytes: 68_719_476_736,
  sharpVersion: "0.34.3",
  sourceBuildId: "synthetic-next-build-1",
  sourceBuildSha256: sha256("synthetic-next-build"),
  sourcePlanSha256: sha256("synthetic-source-plan"),
  sourceSnapshotSha256: sha256("synthetic-source-snapshot"),
  storageFileSystem: "apfs",
  storageFreeBytes: 1_000_000_000,
  storageTotalBytes: 2_000_000_000,
  storageVolumePath: "/Volumes/Starship",
  thermalState: "nominal",
  timezone: "Asia/Hong_Kong",
  workersPerProcess: 1
};

const subject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
  dimensionRegistrySha256: sha256("synthetic-dimension-registry"),
  groupKey: "desktop-chrome\0SyntheticBench\0desktop-en-light\0layout",
  kind: "baseline-group-v2",
  sourcePlanSha256: environment.sourcePlanSha256,
  sourceSnapshotSha256: environment.sourceSnapshotSha256,
  stageCoverage: {
    finalCompositorIncluded: false,
    hydrate: true,
    layout: true,
    navigation: true,
    realReset: true,
    replay: true
  },
  workUnitsSha256: sha256("synthetic-work-units")
};

function rawSamples(maximumMeasuredMs = 24): readonly CaliforniaSignatureFinalCompositorRawTimingSample[] {
  const durations = [10, 11, 20, 21, 22, 23, maximumMeasuredMs];
  return durations.map((durationMs, ordinal) => ({
    durationMs,
    endedAtMonotonicMs: 1_000 + ordinal * 100 + durationMs,
    kind: ordinal < CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY.warmupCount
      ? "warmup" as const
      : "measured" as const,
    ordinal,
    startedAtMonotonicMs: 1_000 + ordinal * 100
  }));
}

let publicationOrdinal = 0;

function publish(options: {
  environment?: CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput;
  samples?: readonly CaliforniaSignatureFinalCompositorRawTimingSample[];
  subject?: CaliforniaSignatureFinalCompositorMeasurementSubject;
} = {}) {
  publicationOrdinal += 1;
  return publishCaliforniaSignatureFinalCompositorMeasurementTestFixture({
    compositorImplementationSha256: sha256("synthetic-final-compositor-implementation"),
    environment: options.environment ?? environment,
    fileName: `measurement-${publicationOrdinal}.json`,
    lifecycle,
    samples: options.samples ?? rawSamples(),
    subject: options.subject ?? subject
  });
}

function readPublication(publication: {
  fileName: string;
  fileSha256: string;
}) {
  return readCaliforniaSignatureFinalCompositorMeasurementReceipt({
    expectedFileSha256: publication.fileSha256,
    fileName: publication.fileName,
    lifecycle
  });
}

test("exclusive diagnostic measurement publication is held-FD read and WeakMap branded", () => {
  assert.equal(Object.isFrozen(
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY), true);
  assert.equal(Reflect.set(
    CALIFORNIA_SIGNATURE_FINAL_COMPOSITOR_REVIEWED_TIMING_POLICY,
    "fixedHeadroomMs",
    0
  ), false, "the reviewed timing policy must be runtime immutable");
  const publication = publish();
  const validated = readPublication(publication);

  assert.doesNotThrow(() =>
    assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(validated));
  assert.equal(validated.receipt.formalExecutionAuthorized, false);
  assert.equal(validated.receipt.status, "diagnostic-measurement");
  assert.equal(validated.receipt.upperBoundMs, 37,
    "fixed policy must derive ceil(max measured 24ms * 1.25) + 7ms");

  const rawCaller = JSON.parse(readFileSync(publication.filePath, "utf8"));
  assert.throws(() =>
    assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(rawCaller),
  /held-FD|validated measurement|brand/i,
  "an exact-looking caller object must not substitute for a held-FD reader result");
  assert.throws(() =>
    assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(
      structuredClone(validated)
    ),
  /held-FD|validated measurement|brand/i,
  "copying a reader result must lose its unforgeable in-process brand");
  assert.equal(Object.isFrozen(validated), true);
  assert.equal(Object.isFrozen(validated.receipt), true);
  assert.equal(Object.isFrozen(validated.receipt.environment), true);
  assert.equal(Reflect.set(validated.receipt.environment, "cpuModel", "post-read mutation"), false,
    "a held-FD validated environment must be deeply immutable");
});

test("production lifecycle keeps measurement producer unavailable instead of branding caller claims", () => {
  const hostileCaller = publishCaliforniaSignatureFinalCompositorMeasurementReceipt as unknown as
    (claims: unknown) => never;
  assert.throws(() => hostileCaller({
    compositorImplementationSha256: sha256("caller-claimed-nonexistent-implementation"),
    directoryPath: testRoot,
    environment: {
      ...environment,
      browserBinaryPath: "/nonexistent/caller-browser",
      fontInventory: [{
        ...environment.fontInventory[0]!,
        sourcePath: "/nonexistent/caller-font.ttf"
      }]
    },
    fileName: "caller-claimed-one-millisecond.json",
    samples: rawSamples(1),
    subject
  }), /producer.*unavailable|HOLD|caller.*claims/i);
});

test("a branded receipt is rejected if its durable file changes after the held-FD read", () => {
  const publication = publish();
  const validated = readPublication(publication);
  const original = readFileSync(publication.filePath, "utf8");
  writeFileSync(publication.filePath, `${original.trimEnd()} \n`, "utf8");
  assert.throws(() =>
    assertCaliforniaSignatureFinalCompositorValidatedMeasurementReceipt(validated),
  /durable file|file.*changed|file SHA|producer identity/i);
});

test("a byte-identical replacement cannot inherit the exclusive producer identity", () => {
  const publication = publish();
  const originalBytes = readFileSync(publication.filePath);
  const originalBackupPath = path.join(testRoot, "byte-identical-original-receipt.json");
  renameSync(publication.filePath, originalBackupPath);
  writeFileSync(publication.filePath, originalBytes, { mode: 0o600 });
  assert.throws(() => readPublication(publication),
    /exclusive producer identity|inode|file identity/i);
});

test("every explicit environment field is required and unknown fields fail closed", () => {
  for (const key of Object.keys(environment)) {
    const missing = { ...environment } as Record<string, unknown>;
    delete missing[key];
    assert.throws(() => publish({
      environment: missing as CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput
    }), /environment input keys drifted/i, `missing environment field ${key} must fail closed`);
  }
  assert.throws(() => publish({
    environment: {
      ...environment,
      callerClaimedMachineClass: "fast"
    } as CaliforniaSignatureFinalCompositorMeasurementEnvironmentInput
  }), /environment input keys drifted/i);
  assert.throws(() => publish({
    environment: { ...environment, storageVolumePath: "/tmp" }
  }), /storage volume must remain on \/Volumes\/Starship/i);
  assert.throws(() => publish({
    environment: { ...environment, workersPerProcess: 2 }
  }), /workersPerProcess must remain one/i);
});

test("raw samples and fixed stage coverage cannot be shortened, reordered, overlapped, or reclassified", () => {
  assert.throws(() => publish({ samples: rawSamples().slice(1) }),
    /sample count differs from fixed reviewed policy/i);
  assert.throws(() => publish({
    samples: rawSamples().map((sample, index) => index === 3
      ? { ...sample, ordinal: 2 }
      : sample)
  }), /duplicate, missing, or retrograde/i);
  assert.throws(() => publish({
    samples: rawSamples().map((sample, index) => index === 2
      ? { ...sample, startedAtMonotonicMs: 1_010, endedAtMonotonicMs: 1_030 }
      : sample)
  }), /overlaps or regresses/i);
  assert.throws(() => publish({
    samples: rawSamples().map((sample, index) => index === 1
      ? { ...sample, kind: "measured" as const }
      : sample)
  }), /warmup\/measured order drifted/i);
  assert.throws(() => publish({
    subject: {
      ...subject,
      stageCoverage: { ...subject.stageCoverage, realReset: false }
    }
  }), /stage coverage is not the exact reviewed procedure/i);
  assert.throws(() => publish({
    subject: {
      ...subject,
      stageCoverage: { ...subject.stageCoverage, finalCompositorIncluded: true }
    }
  }), /stage coverage is not the exact reviewed procedure/i);
});

test("calibration receipts bind exact reviewed class, maximum dimensions, and one crop", () => {
  const calibrationSubject: CaliforniaSignatureFinalCompositorMeasurementSubject = {
    calibratedCropCount: 1,
    classId: "desktop-cap-3",
    dimensionRegistrySha256: subject.dimensionRegistrySha256,
    kind: "compositor-class-calibration-v2",
    maximumDimensions: {
      backingSize: { height: 2_160, width: 3_840 },
      clipSize: { height: 720, width: 1_280 },
      cssSize: { height: 720, width: 1_280 }
    },
    reviewedClassSha256: sha256("desktop-cap-3-reviewed-class"),
    reviewedPoliciesSha256: sha256("desktop-cap-3-reviewed-policies"),
    sourceClassCropCount: 524_634,
    sourcePlanSha256: environment.sourcePlanSha256,
    sourceSnapshotSha256: environment.sourceSnapshotSha256,
    stageCoverage: {
      finalCompositorIncluded: true,
      hydrate: false,
      layout: false,
      navigation: false,
      realReset: false,
      replay: false
    }
  };
  const publication = publish({ subject: calibrationSubject });
  const validated = readPublication(publication);
  assert.equal(validated.receipt.measurementKind, "compositor-class-calibration-v2");
  assert.deepEqual(validated.receipt.subject, calibrationSubject);

  assert.throws(() => publish({
    subject: {
      ...calibrationSubject,
      calibratedCropCount: 2
    } as unknown as CaliforniaSignatureFinalCompositorMeasurementSubject
  }), /exactly one maximum-dimension crop/i);
  assert.throws(() => publish({
    subject: {
      ...calibrationSubject,
      maximumDimensions: {
        ...calibrationSubject.maximumDimensions,
        clipSize: { height: 0, width: 1_280 }
      }
    }
  }), /maximum clip size\.height.*positive safe integer/i);
  assert.throws(() => publish({
    subject: {
      ...calibrationSubject,
      stageCoverage: {
        ...calibrationSubject.stageCoverage,
        hydrate: true
      }
    }
  }), /stage coverage is not the exact reviewed procedure/i);
});

test("receipt reader rejects noncanonical bytes, symlinks, hard links, and duplicate publication", () => {
  publicationOrdinal += 1;
  const duplicateFileName = `measurement-${publicationOrdinal}.json`;
  const duplicateOptions = {
    compositorImplementationSha256: sha256("synthetic-final-compositor-implementation"),
    environment,
    fileName: duplicateFileName,
    lifecycle,
    samples: rawSamples(),
    subject
  } as const;
  const duplicatePublication =
    publishCaliforniaSignatureFinalCompositorMeasurementTestFixture(duplicateOptions);
  assert.throws(() =>
    publishCaliforniaSignatureFinalCompositorMeasurementTestFixture(duplicateOptions),
  /EEXIST|exist|repeats a produced receipt/i,
  "exclusive publication must never replace an existing receipt");

  const parsed = JSON.parse(readFileSync(duplicatePublication.filePath, "utf8"));

  const exactSchemaMutations: readonly {
    label: string;
    mutate(receipt: Record<string, unknown>): void;
    pattern: RegExp;
  }[] = [
    {
      label: "extra-top-level-key",
      mutate(receipt) { receipt.callerAuthorization = true; },
      pattern: /receipt keys drifted/i
    },
    {
      label: "formal-authorization",
      mutate(receipt) { receipt.formalExecutionAuthorized = true; },
      pattern: /must never authorize formal execution/i
    },
    {
      label: "policy-swap",
      mutate(receipt) {
        receipt.policy = {
          ...receipt.policy as Record<string, unknown>,
          fixedHeadroomMs: 0
        };
      },
      pattern: /fixed reviewed policy/i
    }
  ];
  for (const mutation of exactSchemaMutations) {
    const mutated = structuredClone(parsed) as Record<string, unknown>;
    mutation.mutate(mutated);
    const bytes = `${JSON.stringify(mutated)}\n`;
    const publication = publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture({
      bytes: Buffer.from(bytes),
      fileName: `${mutation.label}.json`,
      lifecycle
    });
    assert.throws(() => readPublication(publication), mutation.pattern);
  }

  for (const key of [
    "compositorImplementationSha256",
    "dependencySha256",
    "environmentSha256",
    "sourceBuildSha256",
    "sourcePlanSha256",
    "sourceSnapshotSha256"
  ] as const) {
    const mutated = structuredClone(parsed) as Record<string, unknown>;
    mutated[key] = sha256(`caller-swapped-${key}`);
    const bytes = `${JSON.stringify(mutated)}\n`;
    const publication = publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture({
      bytes: Buffer.from(bytes),
      fileName: `swapped-${key.toLowerCase()}.json`,
      lifecycle
    });
    assert.throws(() => readPublication(publication), /exact derived receipt/i,
      `${key} must stay bound to the exact receipt payload`);
  }

  const prettyBytes = `${JSON.stringify(parsed, null, 2)}\n`;
  const prettyPublication = publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture({
    bytes: Buffer.from(prettyBytes),
    fileName: "noncanonical.json",
    lifecycle
  });
  assert.throws(() => readPublication(prettyPublication), /canonical JSON bytes/i);

  const symlinkPublication = publish();
  const symlinkBackupPath = path.join(testRoot, "symlink-receipt-backup.json");
  renameSync(symlinkPublication.filePath, symlinkBackupPath);
  symlinkSync(symlinkBackupPath, symlinkPublication.filePath);
  assert.throws(() => readPublication(symlinkPublication),
    /held-directory helper rejected|private regular|symlink/i);

  const hardLinkPublication = publish();
  const hardLinkPath = path.join(testRoot, "hard-linked-measurement.json");
  linkSync(hardLinkPublication.filePath, hardLinkPath);
  assert.throws(() => readPublication(hardLinkPublication),
    /held-directory helper rejected|private regular|non-linked/i);

  const publicModePublication = publish();
  chmodSync(publicModePublication.filePath, 0o644);
  assert.throws(() => readPublication(publicModePublication),
    /held-directory helper rejected|private regular non-linked/i);
});

test("held-directory I/O fails closed when the private ancestor is replaced between validation and I/O", () => {
  const raceLifecycle = createCaliforniaSignatureFinalCompositorMeasurementLifecycle({
    worktreeRoot
  });
  const directoryPath =
    californiaSignatureFinalCompositorMeasurementTestDirectoryPath(raceLifecycle);
  const backupPath = `${directoryPath}.held-backup`;
  const outsidePath = mkdtempSync(path.join(testRoot, "ancestor-race-outside-"));
  const fileName = "ancestor-race-write.json";
  let swapped = false;
  try {
    beforeNextCaliforniaSignatureFinalCompositorMeasurementTestIo(
      raceLifecycle,
      (validatedDirectoryPath) => {
        assert.equal(validatedDirectoryPath, directoryPath);
        renameSync(directoryPath, backupPath);
        symlinkSync(outsidePath, directoryPath, "dir");
        swapped = true;
      }
    );
    assert.throws(() =>
      publishCaliforniaSignatureFinalCompositorRawMeasurementTestFixture({
        bytes: Buffer.from("{}\n"),
        fileName,
        lifecycle: raceLifecycle
      }), /ancestor drifted during write-exclusive|ancestor path inode drifted|real directory/i);
    assert.equal(existsSync(path.join(outsidePath, fileName)), false,
      "an ancestor replacement must never redirect publication into the replacement directory");
    assert.equal(existsSync(path.join(backupPath, fileName)), true,
      "the inherited directory FD must keep the write bound to the originally held inode");
  } finally {
    if (swapped) {
      unlinkSync(directoryPath);
      renameSync(backupPath, directoryPath);
    }
    disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle(raceLifecycle);
  }
});

test("held-directory receipt reads fail closed when the private ancestor is replaced", () => {
  const raceLifecycle = createCaliforniaSignatureFinalCompositorMeasurementLifecycle({
    worktreeRoot
  });
  const directoryPath =
    californiaSignatureFinalCompositorMeasurementTestDirectoryPath(raceLifecycle);
  const backupPath = `${directoryPath}.held-backup`;
  const outsidePath = mkdtempSync(path.join(testRoot, "ancestor-read-outside-"));
  const publication = publishCaliforniaSignatureFinalCompositorMeasurementTestFixture({
    compositorImplementationSha256: sha256("synthetic-final-compositor-implementation"),
    environment,
    fileName: "ancestor-race-read.json",
    lifecycle: raceLifecycle,
    samples: rawSamples(),
    subject
  });
  writeFileSync(path.join(outsidePath, publication.fileName), "{}\n", {
    encoding: "utf8",
    mode: 0o600
  });
  let swapped = false;
  try {
    beforeNextCaliforniaSignatureFinalCompositorMeasurementTestIo(
      raceLifecycle,
      (validatedDirectoryPath) => {
        assert.equal(validatedDirectoryPath, directoryPath);
        renameSync(directoryPath, backupPath);
        symlinkSync(outsidePath, directoryPath, "dir");
        swapped = true;
      }
    );
    assert.throws(() =>
      readCaliforniaSignatureFinalCompositorMeasurementReceipt({
        expectedFileSha256: publication.fileSha256,
        fileName: publication.fileName,
        lifecycle: raceLifecycle
      }), /ancestor drifted during read-stable|ancestor path inode drifted|real directory/i);
    assert.equal(readFileSync(path.join(outsidePath, publication.fileName), "utf8"), "{}\n",
      "the replacement directory's same-name file must remain outside the held read identity");
  } finally {
    if (swapped) {
      unlinkSync(directoryPath);
      renameSync(backupPath, directoryPath);
    }
    disposeCaliforniaSignatureFinalCompositorMeasurementTestLifecycle(raceLifecycle);
  }
});
