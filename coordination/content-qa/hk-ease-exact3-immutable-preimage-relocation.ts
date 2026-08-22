import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export const HK_EASE_EXACT3_STEP0_SNAPSHOT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256";
export const HK_EASE_EXACT3_STEP0_EXACT26_SNAPSHOT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256";

const sourceRelocations = [
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

const exact26FrozenCoordinateRelocations = [
  {
    logicalPath:
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
    expectedOldSha256: "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634",
    storedExtension: ".json"
  },
  {
    logicalPath:
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
    expectedOldSha256: "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6",
    storedExtension: ".json"
  },
  {
    logicalPath:
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-independent-exact26-review-receipt.json",
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

export type HongKongEaseExact3ImmutablePreimageRelocation =
  (typeof sourceRelocations)[number] & {
    immutableSnapshotPath: string;
  };

export const HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS = Object.freeze(
  sourceRelocations.map(({ logicalPath, expectedOldSha256 }) => Object.freeze({
    logicalPath,
    expectedOldSha256,
    immutableSnapshotPath:
      `${HK_EASE_EXACT3_STEP0_SNAPSHOT_DIRECTORY}/${expectedOldSha256}.json`
  }))
) as readonly HongKongEaseExact3ImmutablePreimageRelocation[];

export type HongKongEaseExact3Exact26FrozenCoordinateRelocation =
  (typeof exact26FrozenCoordinateRelocations)[number] & {
    immutableSnapshotPath: string;
  };

export const HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS = Object.freeze(
  exact26FrozenCoordinateRelocations.map(
    ({ logicalPath, expectedOldSha256, storedExtension }) => Object.freeze({
      logicalPath,
      expectedOldSha256,
      storedExtension,
      immutableSnapshotPath:
        `${HK_EASE_EXACT3_STEP0_EXACT26_SNAPSHOT_DIRECTORY}/${expectedOldSha256}${storedExtension}`
    })
  )
) as readonly HongKongEaseExact3Exact26FrozenCoordinateRelocation[];

const PAIR_SEPARATOR = "\u0000";
const pairKey = (logicalPath: string, expectedOldSha256: string) =>
  `${logicalPath}${PAIR_SEPARATOR}${expectedOldSha256}`;
const relocationByPair = new Map(
  HK_EASE_EXACT3_STEP0_IMMUTABLE_PREIMAGE_RELOCATIONS.map((relocation) => [
    pairKey(relocation.logicalPath, relocation.expectedOldSha256),
    relocation
  ] as const)
);
const exact26RelocationByPair = new Map(
  HK_EASE_EXACT3_STEP0_EXACT26_FROZEN_COORDINATE_RELOCATIONS.map((relocation) => [
    pairKey(relocation.logicalPath, relocation.expectedOldSha256),
    relocation
  ] as const)
);

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function assertCanonicalRepositoryRelativePath(candidate: string, code: string) {
  if (
    !candidate ||
    isAbsolute(candidate) ||
    candidate.includes("\\") ||
    candidate.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    fail(code, candidate);
  }
}

function physicalRoot(repositoryRoot: string) {
  if (typeof repositoryRoot !== "string" || !repositoryRoot) {
    fail("HK_EASE_EXACT3_RELOCATION_REPOSITORY_ROOT_REQUIRED");
  }
  let stats;
  try {
    stats = lstatSync(repositoryRoot);
  } catch {
    fail("HK_EASE_EXACT3_RELOCATION_REPOSITORY_ROOT_INVALID", repositoryRoot);
  }
  if (stats.isSymbolicLink()) {
    fail("HK_EASE_EXACT3_RELOCATION_REPOSITORY_ROOT_SYMLINK_FORBIDDEN", repositoryRoot);
  }
  if (!stats.isDirectory()) {
    fail("HK_EASE_EXACT3_RELOCATION_REPOSITORY_ROOT_INVALID", repositoryRoot);
  }
  return realpathSync(repositoryRoot);
}

function assertInsideRepository(root: string, candidate: string, code: string) {
  const inside = relative(root, candidate);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`)) fail(code, candidate);
  return inside;
}

export type HongKongEaseExact3ImmutablePreimageResolution = {
  logicalPath: string;
  expectedOldSha256: string;
  immutableSnapshotPath: string;
  absoluteSnapshotPath: string;
  bytes: Buffer;
};

type FrozenRelocation = {
  logicalPath: string;
  expectedOldSha256: string;
  immutableSnapshotPath: string;
};

type FrozenRelocationRequest = {
  repositoryRoot: string;
  logicalPath: string;
  expectedOldSha256: string;
};

function resolveFrozenRelocation<T extends FrozenRelocation>(
  request: FrozenRelocationRequest,
  relocationMap: ReadonlyMap<string, T>,
  codePrefix: string
): HongKongEaseExact3ImmutablePreimageResolution {
  if (
    !request ||
    typeof request.logicalPath !== "string" ||
    !request.logicalPath ||
    typeof request.expectedOldSha256 !== "string" ||
    !request.expectedOldSha256
  ) {
    fail(`${codePrefix}_BOTH_LOGICAL_PATH_AND_OLD_SHA_REQUIRED`);
  }
  assertCanonicalRepositoryRelativePath(
    request.logicalPath,
    `${codePrefix}_LOGICAL_PATH_INVALID`
  );
  if (!/^[0-9a-f]{64}$/.test(request.expectedOldSha256)) {
    fail(`${codePrefix}_OLD_SHA256_INVALID`, request.expectedOldSha256);
  }
  const relocation = relocationMap.get(pairKey(request.logicalPath, request.expectedOldSha256));
  if (!relocation) {
    fail(
      `${codePrefix}_PAIR_NOT_ALLOWLISTED`,
      `${request.logicalPath} ${request.expectedOldSha256}`
    );
  }

  const root = physicalRoot(request.repositoryRoot);
  assertCanonicalRepositoryRelativePath(
    relocation.immutableSnapshotPath,
    `${codePrefix}_SNAPSHOT_PATH_INVALID`
  );
  const lexicalSnapshotPath = resolve(root, relocation.immutableSnapshotPath);
  const lexicalRelative = assertInsideRepository(
    root,
    lexicalSnapshotPath,
    `${codePrefix}_SNAPSHOT_REPOSITORY_ESCAPE`
  );

  let snapshotStats;
  try {
    snapshotStats = lstatSync(lexicalSnapshotPath);
  } catch {
    fail(`${codePrefix}_SNAPSHOT_MISSING`, relocation.immutableSnapshotPath);
  }
  if (snapshotStats.isSymbolicLink()) {
    fail(`${codePrefix}_SNAPSHOT_SYMLINK_FORBIDDEN`, relocation.immutableSnapshotPath);
  }
  if (!snapshotStats.isFile()) {
    fail(`${codePrefix}_SNAPSHOT_NOT_FILE`, relocation.immutableSnapshotPath);
  }
  const absoluteSnapshotPath = realpathSync(lexicalSnapshotPath);
  const physicalRelative = assertInsideRepository(
    root,
    absoluteSnapshotPath,
    `${codePrefix}_SNAPSHOT_PHYSICAL_REPOSITORY_ESCAPE`
  );
  if (physicalRelative !== lexicalRelative) {
    fail(`${codePrefix}_SNAPSHOT_PHYSICAL_TARGET_DRIFT`, relocation.immutableSnapshotPath);
  }
  if (!statSync(absoluteSnapshotPath).isFile()) {
    fail(`${codePrefix}_SNAPSHOT_NOT_FILE`, relocation.immutableSnapshotPath);
  }
  const bytes = readFileSync(absoluteSnapshotPath);
  const actualSha256 = sha256(bytes);
  if (actualSha256 !== relocation.expectedOldSha256) {
    fail(
      `${codePrefix}_SNAPSHOT_SHA256_DRIFT`,
      `${relocation.immutableSnapshotPath} ${actualSha256} != ${relocation.expectedOldSha256}`
    );
  }
  return {
    logicalPath: relocation.logicalPath,
    expectedOldSha256: relocation.expectedOldSha256,
    immutableSnapshotPath: relocation.immutableSnapshotPath,
    absoluteSnapshotPath,
    bytes
  };
}

/**
 * Resolve only a frozen `(logical path, expected old SHA-256)` authority pair.
 * Neither coordinate is sufficient on its own, even when the other coordinate
 * appears elsewhere in the allowlist.
 */
export function resolveHongKongEaseExact3ImmutablePreimage(request: {
  repositoryRoot: string;
  logicalPath: string;
  expectedOldSha256: string;
}): HongKongEaseExact3ImmutablePreimageResolution {
  return resolveFrozenRelocation(request, relocationByPair, "HK_EASE_EXACT3");
}

/** Resolve only one of the six frozen exact26 final coordinates by its full pair. */
export function resolveHongKongEaseExact3Exact26FrozenCoordinate(request: {
  repositoryRoot: string;
  logicalPath: string;
  expectedOldSha256: string;
}): HongKongEaseExact3ImmutablePreimageResolution {
  return resolveFrozenRelocation(
    request,
    exact26RelocationByPair,
    "HK_EASE_EXACT3_EXACT26"
  );
}
