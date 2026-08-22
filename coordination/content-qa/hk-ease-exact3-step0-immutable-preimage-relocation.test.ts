import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const RELOCATION_MODULE_PATH =
  "coordination/content-qa/hk-ease-exact3-immutable-preimage-relocation.ts";
const MATERIALIZER_PATH =
  "coordination/content-qa/materialize-hk-ease-exact3-step0-immutable-preimages.ts";
const SNAPSHOT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256";
const EXACT26_SNAPSHOT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256";
const RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/step0-immutable-preimage-relocation-v1.json";
const RUNTIME_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-preimages/sha256/af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91.ts";
const RUNTIME_PHASE1_POSTIMAGE_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-phase1-postimages/sha256/1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1.ts";
const RUNTIME_INSERTION_SHA256 =
  "d98dc50edc6509c9834d966d019eab3d80a2eb4a74d1c840aff98e07c7024d9c";
const RUNTIME_INSERTION_PATH =
  `coordination/content-qa/authoritative/hk-ease-exact3-production-repair/runtime-phase1-insertions/sha256/${RUNTIME_INSERTION_SHA256}.blob`;
const CURRENT_PHASE1_RUNTIME_SHA256 =
  "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1";
const V4_RUNTIME_LOGICAL_PATH = "lib/hongKongEaseIndependentOracleV4.ts";
const V4_RUNTIME_PREDECESSOR_SHA256 =
  "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1";
const V4_RUNTIME_SUCCESSOR_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const V4_RUNTIME_SUCCESSOR_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance";
const V4_RUNTIME_SUCCESSOR_SNAPSHOT_PATH =
  `${V4_RUNTIME_SUCCESSOR_DIRECTORY}/sha256/${V4_RUNTIME_SUCCESSOR_SHA256}.ts.snapshot`;
const V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH =
  `${V4_RUNTIME_SUCCESSOR_DIRECTORY}/v4-runtime-successor-authority-v1.json`;
const V4_RUNTIME_SUCCESSOR_SOURCE_CLASSIFICATION =
  "pre-existing-unattributed-postimage-adopted-only-after-independent-review";

const RECEIPT_COORDINATE_SOURCE_PATHS = [
  RELOCATION_MODULE_PATH,
  MATERIALIZER_PATH,
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimage-v1.json",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json",
  "data/historical/hongKongResidual28PromotionManifest.json",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-independent-exact26-review-receipt.json",
  "coordination/content-qa/recover-hk-ease-independent-oracle-v4-exact26-preimage.ts",
  V4_RUNTIME_LOGICAL_PATH,
  "lib/hongKongEaseIndependentOracleV4.test.ts",
  "lib/server/hongKongEaseResponseContracts.ts"
] as const;

const EXPECTED_EXACT26_RELOCATIONS = [
  {
    logicalPath: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
    expectedOldSha256: "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634",
    storedExtension: ".json"
  },
  {
    logicalPath: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
    expectedOldSha256: "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6",
    storedExtension: ".json"
  },
  {
    logicalPath: "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-independent-exact26-review-receipt.json",
    expectedOldSha256: "5f2252132c425923d8edfaeac047664823c2770225ad7cf9fdd11859287bf3d5",
    storedExtension: ".json"
  },
  {
    logicalPath: "coordination/content-qa/recover-hk-ease-independent-oracle-v4-exact26-preimage.ts",
    expectedOldSha256: "2ce83f09fd4f1d61ea248f3de3a15cbad1f3f76a4b20d0240b7c82b2b486a01f",
    storedExtension: ".ts.snapshot"
  },
  {
    logicalPath: "lib/hongKongEaseIndependentOracleV4.ts",
    expectedOldSha256: "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1",
    storedExtension: ".ts.snapshot"
  },
  {
    logicalPath: "lib/hongKongEaseIndependentOracleV4.test.ts",
    expectedOldSha256: "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472",
    storedExtension: ".ts.snapshot"
  }
] as const;

const EXPECTED_RELOCATIONS = [
  {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
    expectedOldSha256: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"
  },
  {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
    expectedOldSha256: "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"
  },
  {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
    expectedOldSha256: "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"
  },
  {
    logicalPath: "data/historical/hongKongQuestionVersionManifest.json",
    expectedOldSha256: "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"
  },
  {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
    expectedOldSha256: "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62"
  },
  {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
    expectedOldSha256: "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597"
  }
] as const;

type Relocation = (typeof EXPECTED_RELOCATIONS)[number] & {
  immutableSnapshotPath: string;
};

type Exact26Relocation = (typeof EXPECTED_EXACT26_RELOCATIONS)[number] & {
  immutableSnapshotPath: string;
};

type RelocationModule = {
  HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS: readonly Relocation[];
  HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS: readonly Exact26Relocation[];
  resolveHongKongEaseExact3ImmutablePreimage: (request: {
    repositoryRoot: string;
    logicalPath: string;
    expectedOldSha256: string;
  }) => {
    logicalPath: string;
    expectedOldSha256: string;
    immutableSnapshotPath: string;
    absoluteSnapshotPath: string;
    bytes: Buffer;
  };
  resolveHongKongEaseExact3Exact26FrozenCoordinate: (request: {
    repositoryRoot: string;
    logicalPath: string;
    expectedOldSha256: string;
  }) => {
    logicalPath: string;
    expectedOldSha256: string;
    immutableSnapshotPath: string;
    absoluteSnapshotPath: string;
    bytes: Buffer;
  };
};

type MaterializerModule = {
  materializeHongKongEaseExact3Step0ImmutablePreimages: (repositoryRoot: string) => {
    relocations: Relocation[];
    exact26FrozenCoordinateRelocations: Exact26Relocation[];
    runtimePreRepairRecovery: {
      status: string;
      recoveredSnapshotPath: string;
      recoveredSha256: string;
      recoveredByteLength: number;
      phase1PostimageSnapshotPath: string;
      phase1PostimageSha256: string;
      exactInsertionSnapshotPath: string;
      exactInsertionSha256: string;
      exactInsertionByteLength: number;
    };
  };
  replayHongKongEaseExact3RuntimePreRepairRecovery: (repositoryRoot: string) => {
    recoveredBytes: Buffer;
    phase1PostimageBytes: Buffer;
    exactInsertionBytes: Buffer;
  };
  serializeHongKongEaseExact3Step0RelocationReceipt: (repositoryRoot: string) => string;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertInside(root: string, candidate: string, label: string) {
  const inside = relative(root, candidate);
  assert.ok(inside && inside !== ".." && !inside.startsWith(`..${sep}`), `${label}: escaped root`);
}

function testTmpRoot() {
  const configured = process.env.TMPDIR;
  assert.ok(configured, "runner must configure a unique Starship TMPDIR");
  const physical = realpathSync(configured);
  assert.match(physical, /^\/Volumes\/Starship\//, "TMPDIR must remain on Starship");
  return physical;
}

function exact26SnapshotPath(
  relocation: (typeof EXPECTED_EXACT26_RELOCATIONS)[number]
) {
  return `${EXACT26_SNAPSHOT_DIRECTORY}/${relocation.expectedOldSha256}${relocation.storedExtension}`;
}

function exact26PredecessorBytes(
  relocation: (typeof EXPECTED_EXACT26_RELOCATIONS)[number]
) {
  const bytes = readFileSync(resolve(process.cwd(), exact26SnapshotPath(relocation)));
  assert.equal(
    sha256(bytes),
    relocation.expectedOldSha256,
    `${relocation.logicalPath}: frozen predecessor snapshot digest drift`
  );
  return bytes;
}

function rehashRuntimeSuccessorAuthority(authority: Record<string, any>) {
  const rebound = structuredClone(authority);
  delete rebound.authorityPayloadSha256;
  rebound.authorityPayloadSha256 = sha256(JSON.stringify(rebound));
  return rebound;
}

function assertExactOneAuthorizedRuntimeSuccessor(
  authority: Record<string, any>,
  observedLiveSha256: string
) {
  const payload = { ...authority };
  delete payload.authorityPayloadSha256;
  assert.equal(authority.authorityPayloadSha256, sha256(JSON.stringify(payload)));
  assert.equal(authority.schemaVersion, "hk-ease-v4-runtime-successor-provenance-v1");
  assert.equal(authority.sourceClassification, V4_RUNTIME_SUCCESSOR_SOURCE_CLASSIFICATION);
  assert.equal(authority.ownerAttribution, null, "unattributed postimage must not gain a fake owner");
  assert.equal("successors" in authority, false, "only the singular reviewed successor is allowed");
  assert.deepEqual(authority.predecessor, {
    logicalPath: V4_RUNTIME_LOGICAL_PATH,
    immutableSnapshotPath:
      `${EXACT26_SNAPSHOT_DIRECTORY}/${V4_RUNTIME_PREDECESSOR_SHA256}.ts.snapshot`,
    sha256: V4_RUNTIME_PREDECESSOR_SHA256,
    byteLength: 192_607,
    modePolicy: "immutable-content-addressed-0444"
  });
  assert.deepEqual(authority.successor, {
    logicalPath: V4_RUNTIME_LOGICAL_PATH,
    immutableSnapshotPath: V4_RUNTIME_SUCCESSOR_SNAPSHOT_PATH,
    sha256: V4_RUNTIME_SUCCESSOR_SHA256,
    byteLength: 210_235,
    modePolicy: "immutable-content-addressed-0444",
    liveBytesMustEqualSnapshot: true
  });
  assert.deepEqual(authority.successorPolicy, {
    predecessorCount: 1,
    authorizedSuccessorCount: 1,
    acceptedLiveSha256: [V4_RUNTIME_PREDECESSOR_SHA256, V4_RUNTIME_SUCCESSOR_SHA256],
    arbitraryLiveDriftAccepted: false,
    lineage: `${V4_RUNTIME_PREDECESSOR_SHA256}->${V4_RUNTIME_SUCCESSOR_SHA256}`
  });
  assert.equal(
    observedLiveSha256,
    V4_RUNTIME_SUCCESSOR_SHA256,
    "current live bytes must be the exact reviewed successor, never arbitrary drift"
  );
}

function seedLogicalSources(repositoryRoot: string) {
  for (const relocation of EXPECTED_RELOCATIONS) {
    const source = resolve(process.cwd(), relocation.logicalPath);
    const target = resolve(repositoryRoot, relocation.logicalPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source), { flag: "wx" });
  }
  for (const relativePath of RECEIPT_COORDINATE_SOURCE_PATHS) {
    const exact26Relocation = EXPECTED_EXACT26_RELOCATIONS.find(
      (relocation) => relocation.logicalPath === relativePath
    );
    const sourceBytes = exact26Relocation
      ? exact26PredecessorBytes(exact26Relocation)
      : readFileSync(resolve(process.cwd(), relativePath));
    const target = resolve(repositoryRoot, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) writeFileSync(target, sourceBytes, { flag: "wx" });
  }
}

function copyRelativePath(repositoryRoot: string, relativePath: string) {
  const target = resolve(repositoryRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(resolve(process.cwd(), relativePath)), { flag: "wx" });
}

test("STEP0 relocation is an exact six-entry dual-key allowlist and fails closed", async () => {
  const absoluteModulePath = resolve(process.cwd(), RELOCATION_MODULE_PATH);
  assert.equal(existsSync(absoluteModulePath), true, "STEP0 relocation module must exist");
  if (!existsSync(absoluteModulePath)) return;

  const module = await import(pathToFileURL(absoluteModulePath).href) as RelocationModule;
  assert.equal(typeof module.resolveHongKongEaseExact3ImmutablePreimage, "function");
  assert.equal(module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.length, 6);
  assert.deepEqual(
    module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map(
      ({ logicalPath, expectedOldSha256 }) => ({ logicalPath, expectedOldSha256 })
    ),
    EXPECTED_RELOCATIONS
  );
  assert.equal(
    new Set(
      module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map(
        ({ immutableSnapshotPath }) => immutableSnapshotPath
      )
    ).size,
    6,
    "the six distinct preimages require six distinct content addresses"
  );
  for (const relocation of module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS) {
    assert.equal(
      relocation.immutableSnapshotPath,
      `${SNAPSHOT_DIRECTORY}/${relocation.expectedOldSha256}.json`,
      `${relocation.logicalPath}: snapshot path must carry the complete content digest`
    );
  }

  const fixtureRoot = mkdtempSync(join(testTmpRoot(), "hk-ease-exact3-step0-resolver-"));
  try {
    for (const relocation of module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS) {
      const snapshot = resolve(fixtureRoot, relocation.immutableSnapshotPath);
      mkdirSync(dirname(snapshot), { recursive: true });
      writeFileSync(snapshot, readFileSync(resolve(process.cwd(), relocation.logicalPath)), {
        flag: "wx"
      });
      const resolution = module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: relocation.logicalPath,
        expectedOldSha256: relocation.expectedOldSha256
      });
      assert.equal(resolution.logicalPath, relocation.logicalPath);
      assert.equal(resolution.expectedOldSha256, relocation.expectedOldSha256);
      assert.equal(resolution.immutableSnapshotPath, relocation.immutableSnapshotPath);
      assert.equal(resolution.absoluteSnapshotPath, realpathSync(snapshot));
      assert.equal(sha256(resolution.bytes), relocation.expectedOldSha256);
      assertInside(realpathSync(fixtureRoot), resolution.absoluteSnapshotPath, relocation.logicalPath);
    }

    const first = module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS[0];
    const second = module.HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS[1];
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath,
        expectedOldSha256: second.expectedOldSha256
      }),
      /PAIR_NOT_ALLOWLISTED/,
      "a valid logical path cannot be paired with another valid digest"
    );
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: "data/generated-content/hk-ease-practice-bank-v2/not-allowlisted.json",
        expectedOldSha256: first.expectedOldSha256
      }),
      /PAIR_NOT_ALLOWLISTED/,
      "a valid digest cannot authorize a different logical path"
    );
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath
      } as Parameters<RelocationModule["resolveHongKongEaseExact3ImmutablePreimage"]>[0]),
      /BOTH_LOGICAL_PATH_AND_OLD_SHA_REQUIRED/,
      "path-only resolution must be impossible"
    );
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        expectedOldSha256: first.expectedOldSha256
      } as Parameters<RelocationModule["resolveHongKongEaseExact3ImmutablePreimage"]>[0]),
      /BOTH_LOGICAL_PATH_AND_OLD_SHA_REQUIRED/,
      "digest-only resolution must be impossible"
    );

    const firstSnapshot = resolve(fixtureRoot, first.immutableSnapshotPath);
    writeFileSync(firstSnapshot, "drift\n");
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath,
        expectedOldSha256: first.expectedOldSha256
      }),
      /SNAPSHOT_SHA256_DRIFT/
    );

    rmSync(firstSnapshot);
    symlinkSync(resolve(fixtureRoot, second.immutableSnapshotPath), firstSnapshot);
    assert.equal(lstatSync(firstSnapshot).isSymbolicLink(), true);
    assert.throws(
      () => module.resolveHongKongEaseExact3ImmutablePreimage({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath,
        expectedOldSha256: first.expectedOldSha256
      }),
      /SNAPSHOT_SYMLINK_FORBIDDEN/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});

test("STEP0 preserves the exact26 final-six coordinates in a separate dual-key relocation", async () => {
  const module = await import(pathToFileURL(resolve(process.cwd(), RELOCATION_MODULE_PATH)).href) as RelocationModule;
  assert.equal(
    typeof module.resolveHongKongEaseExact3Exact26FrozenCoordinate,
    "function",
    "exact26 frozen coordinates require a dedicated resolver"
  );
  assert.equal(module.HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS?.length, 6);
  assert.deepEqual(
    module.HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS?.map(
      ({ logicalPath, expectedOldSha256, storedExtension }) => ({
        logicalPath,
        expectedOldSha256,
        storedExtension
      })
    ),
    EXPECTED_EXACT26_RELOCATIONS
  );
  for (const relocation of module.HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS ?? []) {
    assert.equal(
      relocation.immutableSnapshotPath,
      `${EXACT26_SNAPSHOT_DIRECTORY}/${relocation.expectedOldSha256}${relocation.storedExtension}`
    );
    assert.equal(
      relocation.immutableSnapshotPath.startsWith(`${SNAPSHOT_DIRECTORY}/`),
      false,
      "exact26 coordinates must never contaminate the exact-six JSON directory"
    );
  }

  const fixtureRoot = mkdtempSync(join(testTmpRoot(), "hk-ease-exact3-exact26-resolver-"));
  try {
    for (const relocation of module.HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS ?? []) {
      const snapshot = resolve(fixtureRoot, relocation.immutableSnapshotPath);
      mkdirSync(dirname(snapshot), { recursive: true });
      writeFileSync(snapshot, exact26PredecessorBytes(relocation), { flag: "wx" });
      const resolution = module.resolveHongKongEaseExact3Exact26FrozenCoordinate({
        repositoryRoot: fixtureRoot,
        logicalPath: relocation.logicalPath,
        expectedOldSha256: relocation.expectedOldSha256
      });
      assert.equal(resolution.immutableSnapshotPath, relocation.immutableSnapshotPath);
      assert.equal(sha256(resolution.bytes), relocation.expectedOldSha256);
    }

    const [first, second] = module.HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS;
    assert.ok(first && second);
    assert.throws(
      () => module.resolveHongKongEaseExact3Exact26FrozenCoordinate({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath,
        expectedOldSha256: second.expectedOldSha256
      }),
      /PAIR_NOT_ALLOWLISTED/
    );
    assert.throws(
      () => module.resolveHongKongEaseExact3Exact26FrozenCoordinate({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath
      } as Parameters<RelocationModule["resolveHongKongEaseExact3Exact26FrozenCoordinate"]>[0]),
      /BOTH_LOGICAL_PATH_AND_OLD_SHA_REQUIRED/
    );
    const firstSnapshot = resolve(fixtureRoot, first.immutableSnapshotPath);
    writeFileSync(firstSnapshot, "exact26 snapshot drift\n");
    assert.throws(
      () => module.resolveHongKongEaseExact3Exact26FrozenCoordinate({
        repositoryRoot: fixtureRoot,
        logicalPath: first.logicalPath,
        expectedOldSha256: first.expectedOldSha256
      }),
      /SNAPSHOT_SHA256_DRIFT/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});

test("STEP0 materializer writes exactly six verified bytes and a deterministic frozen receipt", async () => {
  const absoluteMaterializerPath = resolve(process.cwd(), MATERIALIZER_PATH);
  assert.equal(existsSync(absoluteMaterializerPath), true, "STEP0 materializer must exist");
  if (!existsSync(absoluteMaterializerPath)) return;

  const module = await import(pathToFileURL(absoluteMaterializerPath).href) as MaterializerModule;
  assert.equal(typeof module.materializeHongKongEaseExact3Step0ImmutablePreimages, "function");
  assert.equal(typeof module.serializeHongKongEaseExact3Step0RelocationReceipt, "function");

  const fixtureRoot = mkdtempSync(join(testTmpRoot(), "hk-ease-exact3-step0-materialize-"));
  try {
    seedLogicalSources(fixtureRoot);
    const result = module.materializeHongKongEaseExact3Step0ImmutablePreimages(fixtureRoot);
    assert.equal(result.relocations.length, 6);
    for (const relocation of result.relocations) {
      const sourceBytes = readFileSync(resolve(fixtureRoot, relocation.logicalPath));
      const snapshotBytes = readFileSync(resolve(fixtureRoot, relocation.immutableSnapshotPath));
      assert.deepEqual(snapshotBytes, sourceBytes, `${relocation.logicalPath}: snapshot byte drift`);
      assert.equal(sha256(snapshotBytes), relocation.expectedOldSha256);
    }
    assert.equal(result.exact26FrozenCoordinateRelocations?.length, 6);
    for (const relocation of result.exact26FrozenCoordinateRelocations ?? []) {
      const sourceBytes = readFileSync(resolve(fixtureRoot, relocation.logicalPath));
      const snapshotBytes = readFileSync(resolve(fixtureRoot, relocation.immutableSnapshotPath));
      assert.deepEqual(snapshotBytes, sourceBytes, `${relocation.logicalPath}: exact26 snapshot byte drift`);
      assert.equal(sha256(snapshotBytes), relocation.expectedOldSha256);
      assert.equal(relocation.immutableSnapshotPath.startsWith(`${SNAPSHOT_DIRECTORY}/`), false);
    }
    assert.deepEqual(result.runtimePreRepairRecovery, {
      status: "recovered-authentic-exact-reverse-of-recorded-phase1-isolated-insertion",
      recoveredSnapshotPath: RUNTIME_PREIMAGE_PATH,
      recoveredSha256: "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91",
      recoveredByteLength: 72_694,
      phase1PostimageSnapshotPath: RUNTIME_PHASE1_POSTIMAGE_PATH,
      phase1PostimageSha256: CURRENT_PHASE1_RUNTIME_SHA256,
      exactInsertionSnapshotPath: RUNTIME_INSERTION_PATH,
      exactInsertionSha256: RUNTIME_INSERTION_SHA256,
      exactInsertionByteLength: 4_174
    });
    assert.equal(
      sha256(readFileSync(resolve(fixtureRoot, RUNTIME_PREIMAGE_PATH))),
      result.runtimePreRepairRecovery.recoveredSha256
    );
    assert.equal(
      sha256(readFileSync(resolve(fixtureRoot, RUNTIME_PHASE1_POSTIMAGE_PATH))),
      CURRENT_PHASE1_RUNTIME_SHA256
    );
    assert.equal(
      sha256(readFileSync(resolve(fixtureRoot, RUNTIME_INSERTION_PATH))),
      RUNTIME_INSERTION_SHA256
    );
    assert.equal(readFileSync(resolve(fixtureRoot, RUNTIME_INSERTION_PATH)).byteLength, 4_174);
    const insertionSnapshot = resolve(fixtureRoot, RUNTIME_INSERTION_PATH);
    const insertionSnapshotBytes = readFileSync(insertionSnapshot);
    rmSync(insertionSnapshot);
    writeFileSync(insertionSnapshot, "forged insertion bytes\n", { flag: "wx" });
    assert.throws(
      () => module.replayHongKongEaseExact3RuntimePreRepairRecovery(fixtureRoot),
      /RUNTIME_INSERTION_SNAPSHOT_SHA256_DRIFT/,
      "a forged insertion blob must make the recovery replay fail closed"
    );
    rmSync(insertionSnapshot);
    writeFileSync(insertionSnapshot, insertionSnapshotBytes, { flag: "wx", mode: 0o444 });

    assert.doesNotThrow(() => module.materializeHongKongEaseExact3Step0ImmutablePreimages(fixtureRoot));
    const receiptBytes = module.serializeHongKongEaseExact3Step0RelocationReceipt(fixtureRoot);
    const receipt = JSON.parse(receiptBytes) as Record<string, unknown>;
    assert.equal(receipt.schemaVersion, "hk-ease-exact3-step0-immutable-preimage-relocation-v1");
    assert.equal(receipt.status, "step0-frozen-live-phase2-mutation-not-authorized");
    assert.equal(receipt.snapshotDirectory, SNAPSHOT_DIRECTORY);
    assert.equal(receipt.exact26SnapshotDirectory, EXACT26_SNAPSHOT_DIRECTORY);
    assert.deepEqual(receipt.sourceRelocations, result.relocations);
    assert.deepEqual(
      receipt.exact26FrozenCoordinateRelocations,
      result.exact26FrozenCoordinateRelocations
    );
    assert.deepEqual(receipt.runtimePreRepairRecovery, {
      status: "recovered-authentic-exact-reverse-of-recorded-phase1-isolated-insertion",
      logicalPath: "lib/server/hongKongEaseResponseContracts.ts",
      claimedPreRepairSha256:
        "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91",
      recoveredSnapshotPath: RUNTIME_PREIMAGE_PATH,
      recoveredByteLength: 72_694,
      phase1PostimageSha256: CURRENT_PHASE1_RUNTIME_SHA256,
      phase1PostimageByteLength: 76_868,
      phase1PostimageSnapshotPath: RUNTIME_PHASE1_POSTIMAGE_PATH,
      exactInsertedByteLength: 4_174,
      exactInsertedSha256: RUNTIME_INSERTION_SHA256,
      exactInsertedSnapshotPath: RUNTIME_INSERTION_PATH,
      startMarker: "type ExactClassifiedFractionGroups = readonly [",
      endMarker: "function matchContract(contract: Contract, selectedAnswer: string): boolean {",
      markerOccurrencePolicy: "each-marker-exactly-once",
      recoveryPolicy: "remove-only-the-byte-range-from-start-marker-up-to-end-marker",
      substitutionPolicy: "current-or-unverified-bytes-must-never-substitute-for-the-claimed-pre-repair-image"
    });
    assert.deepEqual(receipt.implementationSourceBindings, [
      {
        role: "materializer-and-receipt-builder",
        path: MATERIALIZER_PATH,
        sha256: sha256(readFileSync(resolve(fixtureRoot, MATERIALIZER_PATH)))
      },
      {
        role: "dual-key-relocation-resolver",
        path: RELOCATION_MODULE_PATH,
        sha256: sha256(readFileSync(resolve(fixtureRoot, RELOCATION_MODULE_PATH)))
      }
    ]);
    assert.deepEqual(receipt.preservedHistoricalJsonAuthorities, [
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
    ]);
    assert.deepEqual(receipt.exact26FrozenCoordinates, {
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
    });
    assert.match(String(receipt.receiptPayloadSha256), /^[0-9a-f]{64}$/);

    const preMutationReceiptBytes = receiptBytes;
    for (const [index, relocation] of result.exact26FrozenCoordinateRelocations.entries()) {
      writeFileSync(
        resolve(fixtureRoot, relocation.logicalPath),
        `future exact26 live drift ${index}\n`
      );
    }
    writeFileSync(resolve(fixtureRoot, "lib/server/hongKongEaseResponseContracts.ts"), "future exact3 runtime drift\n");
    const replay = module.replayHongKongEaseExact3RuntimePreRepairRecovery(fixtureRoot);
    assert.equal(sha256(replay.phase1PostimageBytes), CURRENT_PHASE1_RUNTIME_SHA256);
    assert.equal(sha256(replay.exactInsertionBytes), RUNTIME_INSERTION_SHA256);
    assert.equal(
      sha256(replay.recoveredBytes),
      "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91"
    );
    assert.equal(
      module.serializeHongKongEaseExact3Step0RelocationReceipt(fixtureRoot),
      preMutationReceiptBytes,
      "receipt replay must not depend on future exact26 or exact3 live bytes"
    );

    for (const sourcePath of [MATERIALIZER_PATH, RELOCATION_MODULE_PATH]) {
      const implementationSourcePath = resolve(fixtureRoot, sourcePath);
      const implementationSourceBytes = readFileSync(implementationSourcePath);
      writeFileSync(
        implementationSourcePath,
        Buffer.concat([implementationSourceBytes, Buffer.from("\n// drift\n")])
      );
      const implementationDriftReceipt =
        module.serializeHongKongEaseExact3Step0RelocationReceipt(fixtureRoot);
      assert.notEqual(
        implementationDriftReceipt,
        preMutationReceiptBytes,
        `${sourcePath}: receipt serialization must bind implementation source bytes`
      );
      writeFileSync(implementationSourcePath, implementationSourceBytes);
      assert.equal(
        module.serializeHongKongEaseExact3Step0RelocationReceipt(fixtureRoot),
        preMutationReceiptBytes
      );
    }

    const first = result.relocations[0];
    writeFileSync(resolve(fixtureRoot, first.logicalPath), "live drift\n");
    assert.throws(
      () => module.materializeHongKongEaseExact3Step0ImmutablePreimages(fixtureRoot),
      /SOURCE_PREIMAGE_SHA256_DRIFT/,
      "materialization after live-source drift must fail even when the snapshot already exists"
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});

test("the checked-in STEP0 predecessor receipt and exact-one runtime successor are deterministic", async () => {
  const absoluteMaterializerPath = resolve(process.cwd(), MATERIALIZER_PATH);
  assert.equal(existsSync(absoluteMaterializerPath), true, "STEP0 materializer must exist");
  if (!existsSync(absoluteMaterializerPath)) return;
  const module = await import(pathToFileURL(absoluteMaterializerPath).href) as MaterializerModule;

  const checkedInReceipt = resolve(process.cwd(), RECEIPT_PATH);
  assert.equal(existsSync(checkedInReceipt), true, "checked-in STEP0 receipt must exist");
  const historicalFixtureRoot = mkdtempSync(join(testTmpRoot(), "hk-ease-step0-historical-replay-"));
  try {
    seedLogicalSources(historicalFixtureRoot);
    module.materializeHongKongEaseExact3Step0ImmutablePreimages(historicalFixtureRoot);
    assert.equal(
      readFileSync(checkedInReceipt, "utf8"),
      module.serializeHongKongEaseExact3Step0RelocationReceipt(historicalFixtureRoot),
      "historical STEP0 must reconstruct from the immutable 697c predecessor, not current live"
    );
  } finally {
    rmSync(historicalFixtureRoot, { recursive: true, force: false });
  }
  const snapshotDirectory = resolve(process.cwd(), SNAPSHOT_DIRECTORY);
  const snapshotNames = EXPECTED_RELOCATIONS.map(
    ({ expectedOldSha256 }) => `${expectedOldSha256}.json`
  ).sort();
  assert.deepEqual(
    (await import("node:fs")).readdirSync(snapshotDirectory).sort(),
    snapshotNames,
    "snapshot directory must contain exactly the six authorized byte images"
  );
  const exact26SnapshotDirectory = resolve(process.cwd(), EXACT26_SNAPSHOT_DIRECTORY);
  const exact26SnapshotNames = EXPECTED_EXACT26_RELOCATIONS.map(
    ({ expectedOldSha256, storedExtension }) => `${expectedOldSha256}${storedExtension}`
  ).sort();
  assert.deepEqual(
    (await import("node:fs")).readdirSync(exact26SnapshotDirectory).sort(),
    exact26SnapshotNames,
    "the independent exact26 directory must contain exactly its final six byte images"
  );
  for (const relocation of EXPECTED_EXACT26_RELOCATIONS) {
    const predecessorBytes = readFileSync(resolve(
      exact26SnapshotDirectory,
      `${relocation.expectedOldSha256}${relocation.storedExtension}`
    ));
    assert.equal(
      sha256(predecessorBytes),
      relocation.expectedOldSha256,
      `${relocation.logicalPath}: checked-in exact26 predecessor digest drift`
    );
    if (relocation.logicalPath !== V4_RUNTIME_LOGICAL_PATH) {
      assert.deepEqual(
        predecessorBytes,
        readFileSync(resolve(process.cwd(), relocation.logicalPath)),
        `${relocation.logicalPath}: unchanged coordinate must remain predecessor-byte-identical`
      );
    }
  }
  const authorityPath = resolve(process.cwd(), V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH);
  assert.equal(existsSync(authorityPath), true, "exact-one V4 runtime successor authority missing");
  const authority = JSON.parse(readFileSync(authorityPath, "utf8")) as Record<string, any>;
  const observedLiveBytes = readFileSync(resolve(process.cwd(), V4_RUNTIME_LOGICAL_PATH));
  assertExactOneAuthorizedRuntimeSuccessor(authority, sha256(observedLiveBytes));
  const successorSnapshotPath = resolve(process.cwd(), V4_RUNTIME_SUCCESSOR_SNAPSHOT_PATH);
  assert.equal(lstatSync(successorSnapshotPath).isSymbolicLink(), false);
  assert.equal(statSync(successorSnapshotPath).mode & 0o777, 0o444);
  assert.deepEqual(readFileSync(successorSnapshotPath), observedLiveBytes);

  const twoSuccessors = structuredClone(authority);
  twoSuccessors.successorPolicy.authorizedSuccessorCount = 2;
  assert.throws(
    () => assertExactOneAuthorizedRuntimeSuccessor(
      rehashRuntimeSuccessorAuthority(twoSuccessors),
      V4_RUNTIME_SUCCESSOR_SHA256
    ),
    /Expected values to be strictly deep-equal/
  );
  const arbitraryDrift = structuredClone(authority);
  arbitraryDrift.successorPolicy.acceptedLiveSha256.push("f".repeat(64));
  arbitraryDrift.successorPolicy.arbitraryLiveDriftAccepted = true;
  assert.throws(
    () => assertExactOneAuthorizedRuntimeSuccessor(
      rehashRuntimeSuccessorAuthority(arbitraryDrift),
      "f".repeat(64)
    ),
    /Expected values to be strictly deep-equal/
  );
  const wrongPredecessor = structuredClone(authority);
  wrongPredecessor.predecessor.sha256 = "0".repeat(64);
  assert.throws(
    () => assertExactOneAuthorizedRuntimeSuccessor(
      rehashRuntimeSuccessorAuthority(wrongPredecessor),
      V4_RUNTIME_SUCCESSOR_SHA256
    ),
    /Expected values to be strictly deep-equal/
  );
  assert.throws(
    () => assertExactOneAuthorizedRuntimeSuccessor(authority, "e".repeat(64)),
    /current live bytes must be the exact reviewed successor/
  );
  const runtimeReplay = module.replayHongKongEaseExact3RuntimePreRepairRecovery(process.cwd());
  assert.equal(sha256(runtimeReplay.phase1PostimageBytes), CURRENT_PHASE1_RUNTIME_SHA256);
  assert.equal(sha256(runtimeReplay.exactInsertionBytes), RUNTIME_INSERTION_SHA256);
  assert.equal(
    sha256(runtimeReplay.recoveredBytes),
    "af8679b39dce192bcce8c7c18724e5c6538f56e5ec1ce2529bcdb2a1bd51ee91"
  );
});

test("both unchanged residual28 f0c reconstruction pairs use the one immutable snapshot reader", async () => {
  const provenancePath = resolve(
    process.cwd(),
    "coordination/content-qa/hongKongResidual28Provenance.ts"
  );
  const provenance = await import(pathToFileURL(provenancePath).href) as {
    readHongKongResidual28ReconstructionSource?: (request: {
      repositoryRoot: string;
      sourcePostimagePath: string;
      sourcePostimageSha256: string;
    }) => {
      bytes: Buffer;
      immutableSnapshotPath: string;
      versionManifest: Record<string, unknown>;
    };
  };
  assert.equal(
    typeof provenance.readHongKongResidual28ReconstructionSource,
    "function",
    "residual28 reconstruction reader must be exported and snapshot-bound"
  );
  if (!provenance.readHongKongResidual28ReconstructionSource) return;

  const repairContract = JSON.parse(readFileSync(resolve(
    process.cwd(),
    "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json"
  ), "utf8"));
  const promotionManifest = JSON.parse(readFileSync(resolve(
    process.cwd(),
    "data/historical/hongKongResidual28PromotionManifest.json"
  ), "utf8"));
  const pairs = [
    repairContract.sourceSnapshot.preimageVersionManifestReconstruction,
    promotionManifest.preimageVersionManifestReconstruction
  ];
  const resolutions = pairs.map((pair) =>
    provenance.readHongKongResidual28ReconstructionSource!({
      repositoryRoot: process.cwd(),
      sourcePostimagePath: pair.sourcePostimagePath,
      sourcePostimageSha256: pair.sourcePostimageSha256
    })
  );
  assert.equal(resolutions.length, 2);
  assert.deepEqual(resolutions[1].bytes, resolutions[0].bytes);
  assert.equal(
    resolutions[0].immutableSnapshotPath,
    `${SNAPSHOT_DIRECTORY}/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92.json`
  );
  assert.equal(
    resolutions[1].immutableSnapshotPath,
    resolutions[0].immutableSnapshotPath,
    "repair and promotion authorities must not create duplicate f0c snapshots"
  );
  assert.equal(resolutions[0].versionManifest.schemaVersion, 1);
});

test("both residual28 deterministic builders rebuild old JSON from relocated f0c bytes", async () => {
  const repairBuilderPath = resolve(
    process.cwd(),
    "coordination/content-qa/build-hk-residual28-repair-contract.ts"
  );
  const promotionBuilderPath = resolve(
    process.cwd(),
    "coordination/content-qa/build-hk-residual28-promotion-manifest.ts"
  );
  const repairBuilder = await import(pathToFileURL(repairBuilderPath).href) as {
    buildHongKongResidual28RepairContract: (repositoryRoot: string) => unknown;
  };
  const promotionBuilder = await import(pathToFileURL(promotionBuilderPath).href) as {
    buildHongKongResidual28PromotionManifest: (repositoryRoot: string) => unknown;
  };
  assert.equal(
    repairBuilder.buildHongKongResidual28RepairContract.length,
    1,
    "repair builder must accept an injected repository root for relocation proof"
  );
  assert.equal(
    promotionBuilder.buildHongKongResidual28PromotionManifest.length,
    1,
    "promotion builder must accept an injected repository root for relocation proof"
  );

  const expectedRepair = repairBuilder.buildHongKongResidual28RepairContract(process.cwd());
  const expectedPromotion = promotionBuilder.buildHongKongResidual28PromotionManifest(process.cwd());
  const fixtureRoot = mkdtempSync(join(testTmpRoot(), "hk-residual28-builder-relocation-"));
  try {
    for (const relativePath of [
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract-v1-superseded.json",
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v2.json",
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-semantic-reaudit-v3.json",
      "coordination/content-qa/authoritative/2026-08-13-data-questions-residual28-preimage.txt",
      "coordination/content-qa/authoritative/2026-08-13-hk-residual47-adjudication-ledger-v2.json",
      "coordination/content-qa/authoritative/2026-08-13-hk-residual47-partition.json",
      "coordination/content-qa/authoritative/2026-08-13-hk-residual28-repair-contract.json",
      "data/historical/hongKongQuestions-residual28-preimage-20260813.json",
      "data/questions.ts",
      "data/historical/hongKongQuestionVersionManifest.json",
      `${SNAPSHOT_DIRECTORY}/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92.json`
    ]) {
      copyRelativePath(fixtureRoot, relativePath);
    }
    writeFileSync(
      resolve(fixtureRoot, "data/historical/hongKongQuestionVersionManifest.json"),
      "deliberate post-STEP0 live manifest drift\n"
    );
    assert.deepEqual(
      repairBuilder.buildHongKongResidual28RepairContract(fixtureRoot),
      expectedRepair,
      "repair contract rebuild must use relocated f0c bytes"
    );
    assert.deepEqual(
      promotionBuilder.buildHongKongResidual28PromotionManifest(fixtureRoot),
      expectedPromotion,
      "promotion manifest rebuild must use relocated f0c bytes"
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});
