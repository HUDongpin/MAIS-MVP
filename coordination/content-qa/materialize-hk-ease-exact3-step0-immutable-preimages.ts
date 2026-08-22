import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS,
  HK_EASE_EXACT3_STEP0_EXACT26_SNAPSHOT_DIRECTORY,
  HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS,
  HK_EASE_EXACT3_STEP0_SNAPSHOT_DIRECTORY,
  resolveHongKongEaseExact3Exact26FrozenCoordinate,
  resolveHongKongEaseExact3ImmutablePreimage,
  type HongKongEaseExact3Exact26FrozenCoordinateRelocation,
  type HongKongEaseExact3ImmutablePreimageRelocation
} from "./hk-ease-exact3-immutable-preimage-relocation";

const BUILDER_PATH =
  "coordination/content-qa/materialize-hk-ease-exact3-step0-immutable-preimages.ts";
const RESOLVER_PATH =
  "coordination/content-qa/hk-ease-exact3-immutable-preimage-relocation.ts";
const OUTPUT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/step0-immutable-preimage-relocation-v1.json";
const RUNTIME_LOGICAL_PATH = "lib/server/hongKongEaseResponseContracts.ts";
const RUNTIME_PRE_REPAIR_SHA256 =
  "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91";
const RUNTIME_PHASE1_POSTIMAGE_SHA256 =
  "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1";
const RUNTIME_PREIMAGE_PATH =
  `coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-preimages/sha256/${RUNTIME_PRE_REPAIR_SHA256}.ts`;
const RUNTIME_PHASE1_POSTIMAGE_PATH =
  `coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-phase1-postimages/sha256/${RUNTIME_PHASE1_POSTIMAGE_SHA256}.ts`;
const RUNTIME_INSERTION_SHA256 =
  "d98dc50edc6509c9834d966d019eab3d80a2eb4a74d1c840aff98e07c7024d9c";
const RUNTIME_INSERTION_PATH =
  `coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-phase1-insertions/sha256/${RUNTIME_INSERTION_SHA256}.blob`;
const RUNTIME_START_MARKER = "type ExactClassifiedFractionGroups = readonly [";
const RUNTIME_END_MARKER =
  "function matchContract(contract: Contract, selectedAnswer: string): boolean {";

const preservedHistoricalJsonAuthorities = [
  {
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimage-v1.json",
    sha256: "8c087e024d184f92e1a6a51798cdb5f9ae3ddcff7dbc15e7ec65bb0fe1c2b608"
  },
  {
    path: "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json",
    sha256: "89891eb15b8823f29c7ca5c22a1a7f59ad4501d5c7600fea7a2ef82dce72f0b4"
  },
  {
    path: "data/historical/hongKongResidual28PromotionManifest.json",
    sha256: "b1e77a04e0ef7c6d381afcd114e790bdaae97dedc5b8829328fe0d7945aa7540"
  }
] as const;

const exact26FrozenCoordinates = {
  sanitizedInput: {
    path: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
    sha256: "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634"
  },
  finalSupplement: {
    path: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
    sha256: "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6",
    rowsPayloadSha256: "315a47b34b0e48eeb4674e3b7b88f3de0b6ed1b5ce0348b1afe4cb64ae43f335"
  },
  independentReviewReceipt: {
    path: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-independent-exact26-review-receipt.json",
    sha256: "5f2252132c425923d8edfaeac047664823c2770225ad7cf9fdd11859287bf3d5"
  },
  preimageRecoveryBuilder: {
    path: "coordination/content-qa/recover-hk-ease-independent-oracle-v4-exact26-preimage.ts",
    sha256: "2ce83f09fd4f1d61ea248f3de3a15cbad1f3f76a4b20d0240b7c82b2b486a01f"
  },
  oracleRuntime: {
    path: "lib/hongKongEaseIndependentOracleV4.ts",
    sha256: "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1"
  },
  oracleFocusedTest: {
    path: "lib/hongKongEaseIndependentOracleV4.test.ts",
    sha256: "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472"
  }
} as const;

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertCanonicalRelativePath(candidate: string, code: string) {
  if (
    !candidate ||
    isAbsolute(candidate) ||
    candidate.includes("\\") ||
    candidate.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    fail(code, candidate);
  }
}

function repositoryRoot(repositoryRoot: string) {
  let stats;
  try {
    stats = lstatSync(repositoryRoot);
  } catch {
    fail("HK_EASE_EXACT3_STEP0_REPOSITORY_ROOT_INVALID", repositoryRoot);
  }
  if (stats.isSymbolicLink()) fail("HK_EASE_EXACT3_STEP0_REPOSITORY_ROOT_SYMLINK_FORBIDDEN");
  if (!stats.isDirectory()) fail("HK_EASE_EXACT3_STEP0_REPOSITORY_ROOT_INVALID");
  return realpathSync(repositoryRoot);
}

function assertInside(root: string, candidate: string, code: string) {
  const inside = relative(root, candidate);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`)) fail(code, candidate);
  return inside;
}

function readRepositoryBytes(root: string, relativePath: string, code: string) {
  assertCanonicalRelativePath(relativePath, `${code}_PATH_INVALID`);
  const lexical = resolve(root, relativePath);
  const lexicalRelative = assertInside(root, lexical, `${code}_REPOSITORY_ESCAPE`);
  let stats;
  try {
    stats = lstatSync(lexical);
  } catch {
    fail(`${code}_MISSING`, relativePath);
  }
  if (stats.isSymbolicLink()) fail(`${code}_SYMLINK_FORBIDDEN`, relativePath);
  if (!stats.isFile()) fail(`${code}_NOT_FILE`, relativePath);
  const physical = realpathSync(lexical);
  const physicalRelative = assertInside(root, physical, `${code}_PHYSICAL_REPOSITORY_ESCAPE`);
  if (physicalRelative !== lexicalRelative) fail(`${code}_PHYSICAL_TARGET_DRIFT`, relativePath);
  return readFileSync(physical);
}

function readExactRepositoryBytes(
  root: string,
  relativePath: string,
  expectedSha256: string,
  code: string
) {
  const bytes = readRepositoryBytes(root, relativePath, code);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== expectedSha256) {
    fail(`${code}_SHA256_DRIFT`, `${relativePath} ${actualSha256} != ${expectedSha256}`);
  }
  return bytes;
}

function ensureSafeDirectory(root: string, relativeDirectory: string) {
  assertCanonicalRelativePath(relativeDirectory, "HK_EASE_EXACT3_STEP0_DIRECTORY_PATH_INVALID");
  let cursor = root;
  for (const segment of relativeDirectory.split("/")) {
    const next = resolve(cursor, segment);
    assertInside(root, next, "HK_EASE_EXACT3_STEP0_DIRECTORY_REPOSITORY_ESCAPE");
    if (!existsSync(next)) mkdirSync(next);
    const stats = lstatSync(next);
    if (stats.isSymbolicLink()) {
      fail("HK_EASE_EXACT3_STEP0_DIRECTORY_SYMLINK_FORBIDDEN", next);
    }
    if (!stats.isDirectory()) fail("HK_EASE_EXACT3_STEP0_DIRECTORY_NOT_DIRECTORY", next);
    const physical = realpathSync(next);
    if (physical !== next) fail("HK_EASE_EXACT3_STEP0_DIRECTORY_PHYSICAL_TARGET_DRIFT", next);
    cursor = next;
  }
  return cursor;
}

function materializeImmutableBytes(
  root: string,
  relativePath: string,
  bytes: Buffer,
  expectedSha256: string,
  code: string
) {
  const output = resolve(root, relativePath);
  assertInside(root, output, `${code}_REPOSITORY_ESCAPE`);
  if (!existsSync(output)) {
    ensureSafeDirectory(root, relative(root, dirname(output)).split(sep).join("/"));
    writeFileSync(output, bytes, { flag: "wx", mode: 0o444 });
  }
  return readExactRepositoryBytes(root, relativePath, expectedSha256, code);
}

function exactlyOneMarker(source: string, marker: string, code: string) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) fail(code);
  return first;
}

function deriveRuntimePreRepairRecovery(phase1PostimageBytes: Buffer) {
  if (sha256(phase1PostimageBytes) !== RUNTIME_PHASE1_POSTIMAGE_SHA256) {
    fail("HK_EASE_EXACT3_RUNTIME_PHASE1_POSTIMAGE_SHA256_DRIFT");
  }
  if (phase1PostimageBytes.byteLength !== 76_868) {
    fail("HK_EASE_EXACT3_RUNTIME_PHASE1_POSTIMAGE_BYTE_LENGTH_DRIFT");
  }
  const phase1Postimage = phase1PostimageBytes.toString("utf8");
  const start = exactlyOneMarker(
    phase1Postimage,
    RUNTIME_START_MARKER,
    "HK_EASE_EXACT3_RUNTIME_RECOVERY_START_MARKER_DRIFT"
  );
  const end = exactlyOneMarker(
    phase1Postimage,
    RUNTIME_END_MARKER,
    "HK_EASE_EXACT3_RUNTIME_RECOVERY_END_MARKER_DRIFT"
  );
  if (end <= start) fail("HK_EASE_EXACT3_RUNTIME_RECOVERY_MARKER_ORDER_DRIFT");
  const insertedBytes = Buffer.from(phase1Postimage.slice(start, end), "utf8");
  if (insertedBytes.byteLength !== 4_174) {
    fail("HK_EASE_EXACT3_RUNTIME_RECOVERY_INSERTED_BYTE_LENGTH_DRIFT");
  }
  if (sha256(insertedBytes) !== RUNTIME_INSERTION_SHA256) {
    fail("HK_EASE_EXACT3_RUNTIME_RECOVERY_INSERTED_SHA256_DRIFT");
  }
  const recoveredBytes = Buffer.from(
    `${phase1Postimage.slice(0, start)}${phase1Postimage.slice(end)}`,
    "utf8"
  );
  if (recoveredBytes.byteLength !== 72_694 || sha256(recoveredBytes) !== RUNTIME_PRE_REPAIR_SHA256) {
    fail("HK_EASE_EXACT3_RUNTIME_RECOVERY_PREIMAGE_DRIFT");
  }
  return { phase1PostimageBytes, insertedBytes, recoveredBytes };
}

function recoverRuntimePreRepairBytesFromLive(root: string) {
  return deriveRuntimePreRepairRecovery(readExactRepositoryBytes(
    root,
    RUNTIME_LOGICAL_PATH,
    RUNTIME_PHASE1_POSTIMAGE_SHA256,
    "HK_EASE_EXACT3_RUNTIME_PHASE1_POSTIMAGE"
  ));
}

export function replayHongKongEaseExact3RuntimePreRepairRecovery(repository: string) {
  const root = repositoryRoot(repository);
  const phase1PostimageBytes = readExactRepositoryBytes(
    root,
    RUNTIME_PHASE1_POSTIMAGE_PATH,
    RUNTIME_PHASE1_POSTIMAGE_SHA256,
    "HK_EASE_EXACT3_RUNTIME_PHASE1_POSTIMAGE_SNAPSHOT"
  );
  const exactInsertionBytes = readExactRepositoryBytes(
    root,
    RUNTIME_INSERTION_PATH,
    RUNTIME_INSERTION_SHA256,
    "HK_EASE_EXACT3_RUNTIME_INSERTION_SNAPSHOT"
  );
  if (exactInsertionBytes.byteLength !== 4_174) {
    fail("HK_EASE_EXACT3_RUNTIME_INSERTION_SNAPSHOT_BYTE_LENGTH_DRIFT");
  }
  const recoveredSnapshotBytes = readExactRepositoryBytes(
    root,
    RUNTIME_PREIMAGE_PATH,
    RUNTIME_PRE_REPAIR_SHA256,
    "HK_EASE_EXACT3_RUNTIME_PRE_REPAIR_PREIMAGE"
  );
  const replay = deriveRuntimePreRepairRecovery(phase1PostimageBytes);
  if (!replay.insertedBytes.equals(exactInsertionBytes)) {
    fail("HK_EASE_EXACT3_RUNTIME_INSERTION_REPLAY_DRIFT");
  }
  if (!replay.recoveredBytes.equals(recoveredSnapshotBytes)) {
    fail("HK_EASE_EXACT3_RUNTIME_PREIMAGE_REPLAY_DRIFT");
  }
  return {
    phase1PostimageBytes: replay.phase1PostimageBytes,
    exactInsertionBytes: replay.insertedBytes,
    recoveredBytes: replay.recoveredBytes
  };
}

function runtimePreRepairRecoveryResult() {
  return {
    status: "recovered-authentic-exact-reverse-of-recorded-phase1-isolated-insertion",
    recoveredSnapshotPath: RUNTIME_PREIMAGE_PATH,
    recoveredSha256: RUNTIME_PRE_REPAIR_SHA256,
    recoveredByteLength: 72_694,
    phase1PostimageSnapshotPath: RUNTIME_PHASE1_POSTIMAGE_PATH,
    phase1PostimageSha256: RUNTIME_PHASE1_POSTIMAGE_SHA256,
    exactInsertionSnapshotPath: RUNTIME_INSERTION_PATH,
    exactInsertionSha256: RUNTIME_INSERTION_SHA256,
    exactInsertionByteLength: 4_174
  } as const;
}

export function materializeHongKongEaseExact3Step0ImmutablePreimages(repository: string) {
  const root = repositoryRoot(repository);
  const sourceBytes = HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map(
    (relocation) => ({
      relocation,
      bytes: readExactRepositoryBytes(
        root,
        relocation.logicalPath,
        relocation.expectedOldSha256,
        "HK_EASE_EXACT3_SOURCE_PREIMAGE"
      )
    })
  );
  const exact26SourceBytes = HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS.map(
    (relocation) => ({
      relocation,
      bytes: readExactRepositoryBytes(
        root,
        relocation.logicalPath,
        relocation.expectedOldSha256,
        "HK_EASE_EXACT3_EXACT26_SOURCE_COORDINATE"
      )
    })
  );
  const runtimeRecovery = recoverRuntimePreRepairBytesFromLive(root);

  for (const { relocation, bytes } of sourceBytes) {
    materializeImmutableBytes(
      root,
      relocation.immutableSnapshotPath,
      bytes,
      relocation.expectedOldSha256,
      "HK_EASE_EXACT3_IMMUTABLE_PREIMAGE"
    );
    resolveHongKongEaseExact3ImmutablePreimage({
      repositoryRoot: root,
      logicalPath: relocation.logicalPath,
      expectedOldSha256: relocation.expectedOldSha256
    });
  }
  const expectedSnapshotNames = HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS
    .map(({ expectedOldSha256 }) => `${expectedOldSha256}.json`)
    .sort();
  const actualSnapshotNames = readdirSync(resolve(root, HK_EASE_EXACT3_STEP0_SNAPSHOT_DIRECTORY))
    .sort();
  if (JSON.stringify(actualSnapshotNames) !== JSON.stringify(expectedSnapshotNames)) {
    fail("HK_EASE_EXACT3_IMMUTABLE_PREIMAGE_EXACT_ALLOWLIST_DRIFT");
  }

  for (const { relocation, bytes } of exact26SourceBytes) {
    materializeImmutableBytes(
      root,
      relocation.immutableSnapshotPath,
      bytes,
      relocation.expectedOldSha256,
      "HK_EASE_EXACT3_EXACT26_FROZEN_COORDINATE"
    );
    resolveHongKongEaseExact3Exact26FrozenCoordinate({
      repositoryRoot: root,
      logicalPath: relocation.logicalPath,
      expectedOldSha256: relocation.expectedOldSha256
    });
  }
  const expectedExact26SnapshotNames =
    HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS
      .map(({ expectedOldSha256, storedExtension }) => `${expectedOldSha256}${storedExtension}`)
      .sort();
  const actualExact26SnapshotNames = readdirSync(
    resolve(root, HK_EASE_EXACT3_STEP0_EXACT26_SNAPSHOT_DIRECTORY)
  ).sort();
  if (JSON.stringify(actualExact26SnapshotNames) !== JSON.stringify(expectedExact26SnapshotNames)) {
    fail("HK_EASE_EXACT3_EXACT26_FROZEN_COORDINATE_EXACT_ALLOWLIST_DRIFT");
  }

  materializeImmutableBytes(
    root,
    RUNTIME_PREIMAGE_PATH,
    runtimeRecovery.recoveredBytes,
    RUNTIME_PRE_REPAIR_SHA256,
    "HK_EASE_EXACT3_RUNTIME_PRE_REPAIR_PREIMAGE"
  );
  materializeImmutableBytes(
    root,
    RUNTIME_PHASE1_POSTIMAGE_PATH,
    runtimeRecovery.phase1PostimageBytes,
    RUNTIME_PHASE1_POSTIMAGE_SHA256,
    "HK_EASE_EXACT3_RUNTIME_PHASE1_POSTIMAGE_SNAPSHOT"
  );
  materializeImmutableBytes(
    root,
    RUNTIME_INSERTION_PATH,
    runtimeRecovery.insertedBytes,
    RUNTIME_INSERTION_SHA256,
    "HK_EASE_EXACT3_RUNTIME_INSERTION_SNAPSHOT"
  );
  replayHongKongEaseExact3RuntimePreRepairRecovery(root);
  return {
    relocations: HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map(
      (relocation) => ({ ...relocation })
    ) as HongKongEaseExact3ImmutablePreimageRelocation[],
    exact26FrozenCoordinateRelocations:
      HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS.map(
        (relocation) => ({ ...relocation })
      ) as HongKongEaseExact3Exact26FrozenCoordinateRelocation[],
    runtimePreRepairRecovery: runtimePreRepairRecoveryResult()
  };
}

function verifyFrozenCoordinate(
  root: string,
  coordinate: { path: string; sha256: string },
  label: string
) {
  return readExactRepositoryBytes(root, coordinate.path, coordinate.sha256, label);
}

export function buildHongKongEaseExact3Step0RelocationReceipt(repository: string) {
  const root = repositoryRoot(repository);
  const sourceRelocations = HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map(
    (relocation) => {
      resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: root,
        logicalPath: relocation.logicalPath,
        expectedOldSha256: relocation.expectedOldSha256
      });
      return { ...relocation };
    }
  );
  const exact26FrozenCoordinateRelocations =
    HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS.map((relocation) => {
      resolveHongKongEaseExact3Exact26FrozenCoordinate({
        repositoryRoot: root,
        logicalPath: relocation.logicalPath,
        expectedOldSha256: relocation.expectedOldSha256
      });
      return { ...relocation };
    });
  for (const coordinate of preservedHistoricalJsonAuthorities) {
    verifyFrozenCoordinate(root, coordinate, "HK_EASE_EXACT3_PRESERVED_HISTORICAL_AUTHORITY");
  }
  const supplementCoordinate = exact26FrozenCoordinates.finalSupplement;
  const supplementResolution = resolveHongKongEaseExact3Exact26FrozenCoordinate({
    repositoryRoot: root,
    logicalPath: supplementCoordinate.path,
    expectedOldSha256: supplementCoordinate.sha256
  });
  const supplement = JSON.parse(
    supplementResolution.bytes.toString("utf8")
  ) as { rowsPayloadSha256?: unknown };
  if (
    supplement.rowsPayloadSha256 !==
      exact26FrozenCoordinates.finalSupplement.rowsPayloadSha256
  ) {
    fail("HK_EASE_EXACT3_EXACT26_ROWS_PAYLOAD_SHA256_DRIFT");
  }
  replayHongKongEaseExact3RuntimePreRepairRecovery(root);
  const implementationSourceBindings = [
    {
      role: "materializer-and-receipt-builder",
      path: BUILDER_PATH,
      sha256: sha256(readRepositoryBytes(root, BUILDER_PATH, "HK_EASE_EXACT3_IMPLEMENTATION_SOURCE"))
    },
    {
      role: "dual-key-relocation-resolver",
      path: RESOLVER_PATH,
      sha256: sha256(readRepositoryBytes(root, RESOLVER_PATH, "HK_EASE_EXACT3_IMPLEMENTATION_SOURCE"))
    }
  ];

  const receiptWithoutHash = {
    schemaVersion: "hk-ease-exact3-step0-immutable-preimage-relocation-v1",
    builderPath: BUILDER_PATH,
    outputPath: OUTPUT_PATH,
    status: "step0-frozen-live-phase2-mutation-not-authorized",
    authorizationBoundary:
      "immutable-preimage-plus-relocation-only; no learner content, live pack, live contracts, live audit, live version manifest, or runtime dispatch mutation",
    snapshotDirectory: HK_EASE_EXACT3_STEP0_SNAPSHOT_DIRECTORY,
    exact26SnapshotDirectory: HK_EASE_EXACT3_STEP0_EXACT26_SNAPSHOT_DIRECTORY,
    sourceRelocations,
    exact26FrozenCoordinateRelocations,
    implementationSourceBindings,
    versionManifestDualUsePolicy:
      "both residual28 reconstruction occurrences retain the same logical f0cf pair and resolve to the one f0cf content-addressed snapshot",
    runtimePreRepairRecovery: {
      status: "recovered-authentic-exact-reverse-of-recorded-phase1-isolated-insertion",
      logicalPath: RUNTIME_LOGICAL_PATH,
      claimedPreRepairSha256: RUNTIME_PRE_REPAIR_SHA256,
      recoveredSnapshotPath: RUNTIME_PREIMAGE_PATH,
      recoveredByteLength: 72_694,
      phase1PostimageSha256: RUNTIME_PHASE1_POSTIMAGE_SHA256,
      phase1PostimageByteLength: 76_868,
      phase1PostimageSnapshotPath: RUNTIME_PHASE1_POSTIMAGE_PATH,
      exactInsertedByteLength: 4_174,
      exactInsertedSha256: RUNTIME_INSERTION_SHA256,
      exactInsertedSnapshotPath: RUNTIME_INSERTION_PATH,
      startMarker: RUNTIME_START_MARKER,
      endMarker: RUNTIME_END_MARKER,
      markerOccurrencePolicy: "each-marker-exactly-once",
      recoveryPolicy: "remove-only-the-byte-range-from-start-marker-up-to-end-marker",
      substitutionPolicy:
        "current-or-unverified-bytes-must-never-substitute-for-the-claimed-pre-repair-image"
    },
    preservedHistoricalJsonAuthorities: preservedHistoricalJsonAuthorities.map(
      (coordinate) => ({ ...coordinate })
    ),
    exact26FrozenCoordinates: structuredClone(exact26FrozenCoordinates),
    forbiddenLiveMutationPaths: [
      ...sourceRelocations.map(({ logicalPath }) => logicalPath),
      ...exact26FrozenCoordinateRelocations.map(({ logicalPath }) => logicalPath),
      RUNTIME_LOGICAL_PATH
    ]
  };
  return {
    ...receiptWithoutHash,
    receiptPayloadSha256: sha256(JSON.stringify(receiptWithoutHash))
  };
}

export function serializeHongKongEaseExact3Step0RelocationReceipt(repository: string) {
  return `${JSON.stringify(buildHongKongEaseExact3Step0RelocationReceipt(repository), null, 2)}\n`;
}

function materializeCheckedInReceipt(repository: string) {
  const root = repositoryRoot(repository);
  materializeHongKongEaseExact3Step0ImmutablePreimages(root);
  const bytes = Buffer.from(serializeHongKongEaseExact3Step0RelocationReceipt(root), "utf8");
  const output = resolve(root, OUTPUT_PATH);
  if (!existsSync(output)) {
    ensureSafeDirectory(root, relative(root, dirname(output)).split(sep).join("/"));
    writeFileSync(output, bytes, { flag: "wx", mode: 0o444 });
  } else if (!readFileSync(output).equals(bytes)) {
    fail("HK_EASE_EXACT3_STEP0_RECEIPT_DRIFT", OUTPUT_PATH);
  }
  return output;
}

const executedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (executedPath && pathToFileURL(executedPath).href === import.meta.url) {
  const output = materializeCheckedInReceipt(process.cwd());
  process.stdout.write(`${fileURLToPath(import.meta.url)}\n${output}\n`);
}
