import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-v4-runtime-successor-provenance.ts";
const HARDENING_TEST_PATH =
  "coordination/content-qa/hk-ease-v4-runtime-successor-hardening.test.ts";
const STEP0_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-step0-immutable-preimage-relocation.test.ts";
const STEP0_RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/step0-immutable-preimage-relocation-v1.json";
const STEP0_RECEIPT_SHA256 =
  "9d661d739710a72c9a4744e224f221ffe808632dacb12b63d49c39fe4886262e";
const PREDECESSOR_RUNTIME_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256/697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1.ts.snapshot";
const LIVE_RUNTIME_PATH = "lib/hongKongEaseIndependentOracleV4.ts";
const PREDECESSOR_SHA256 =
  "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1";
const SUCCESSOR_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const SUCCESSOR_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance";
const SUCCESSOR_SNAPSHOT_PATH =
  `${SUCCESSOR_DIRECTORY}/sha256/${SUCCESSOR_SHA256}.ts.snapshot`;
const AUTHORITY_PATH = `${SUCCESSOR_DIRECTORY}/v4-runtime-successor-authority-v1.json`;
const SUPPLEMENT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json";
const SUPPLEMENT_SHA256 =
  "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6";
const SUPPLEMENT_ROWS_PAYLOAD_SHA256 =
  "315a47b34b0e48eeb4674e3b7b88f3de0b6ed1b5ce0348b1afe4cb64ae43f335";
const PREDECESSOR_TEST_PATH = "lib/hongKongEaseIndependentOracleV4.test.ts";
const PREDECESSOR_TEST_SNAPSHOT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/exact26-frozen-coordinates/sha256/cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472.ts.snapshot";
const PREDECESSOR_TEST_SHA256 =
  "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472";
const SOURCE_CLASSIFICATION =
  "pre-existing-unattributed-postimage-adopted-only-after-independent-review";

export const HK_EASE_V4_RUNTIME_SUCCESSOR_OUTPUT_PATHS = [
  SUCCESSOR_SNAPSHOT_PATH,
  AUTHORITY_PATH
] as const;

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function physicalRoot(repositoryRoot: string) {
  const stats = lstatSync(repositoryRoot);
  if (stats.isSymbolicLink() || !stats.isDirectory()) fail("V4_RUNTIME_SUCCESSOR_ROOT_INVALID");
  return realpathSync(repositoryRoot);
}

function assertCanonicalRelativePath(path: string) {
  if (
    !path ||
    isAbsolute(path) ||
    path.includes("\\") ||
    path.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) fail("V4_RUNTIME_SUCCESSOR_PATH_INVALID", path);
}

function readRepositoryBytes(root: string, path: string, code: string) {
  assertCanonicalRelativePath(path);
  const lexical = resolve(root, path);
  const inside = relative(root, lexical);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`)) fail(`${code}_ESCAPE`);
  const stats = lstatSync(lexical);
  if (stats.isSymbolicLink() || !stats.isFile()) fail(`${code}_NOT_REGULAR_FILE`, path);
  const physical = realpathSync(lexical);
  if (physical !== lexical) fail(`${code}_PHYSICAL_DRIFT`, path);
  return readFileSync(physical);
}

function readExactBytes(root: string, path: string, expectedSha256: string, code: string) {
  const bytes = readRepositoryBytes(root, path, code);
  const actual = sha256(bytes);
  if (actual !== expectedSha256) fail(`${code}_SHA256_DRIFT`, `${actual} != ${expectedSha256}`);
  return bytes;
}

function parseJson(bytes: Buffer, code: string): JsonRecord {
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${code}_SHAPE_DRIFT`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(`${code}_`)) throw error;
    fail(`${code}_JSON_INVALID`);
  }
}

function sourceBinding(root: string, path: string) {
  const bytes = readRepositoryBytes(root, path, "V4_RUNTIME_SUCCESSOR_SOURCE");
  return { path, sha256: sha256(bytes), byteLength: bytes.byteLength };
}

function buildAuthority(root: string, successorBytes: Buffer) {
  const predecessorBytes = readExactBytes(
    root,
    PREDECESSOR_RUNTIME_PATH,
    PREDECESSOR_SHA256,
    "V4_RUNTIME_PREDECESSOR"
  );
  if (predecessorBytes.byteLength !== 192_607) fail("V4_RUNTIME_PREDECESSOR_LENGTH_DRIFT");
  if (successorBytes.byteLength !== 210_235) fail("V4_RUNTIME_SUCCESSOR_LENGTH_DRIFT");
  const supplementBytes = readExactBytes(
    root,
    SUPPLEMENT_PATH,
    SUPPLEMENT_SHA256,
    "V4_RUNTIME_SUCCESSOR_SUPPLEMENT"
  );
  const supplement = parseJson(supplementBytes, "V4_RUNTIME_SUCCESSOR_SUPPLEMENT");
  if (
    supplement.questionCount !== 701 ||
    !Array.isArray(supplement.rows) ||
    supplement.rows.length !== 701 ||
    supplement.rowsPayloadSha256 !== SUPPLEMENT_ROWS_PAYLOAD_SHA256 ||
    sha256(JSON.stringify(supplement.rows)) !== SUPPLEMENT_ROWS_PAYLOAD_SHA256
  ) fail("V4_RUNTIME_SUCCESSOR_SUPPLEMENT_PAYLOAD_DRIFT");
  const predecessorTestBytes = readExactBytes(
    root,
    PREDECESSOR_TEST_PATH,
    PREDECESSOR_TEST_SHA256,
    "V4_RUNTIME_PREDECESSOR_TEST"
  );
  const predecessorTestSnapshotBytes = readExactBytes(
    root,
    PREDECESSOR_TEST_SNAPSHOT_PATH,
    PREDECESSOR_TEST_SHA256,
    "V4_RUNTIME_PREDECESSOR_TEST_SNAPSHOT"
  );
  if (!predecessorTestBytes.equals(predecessorTestSnapshotBytes)) {
    fail("V4_RUNTIME_PREDECESSOR_TEST_SNAPSHOT_DRIFT");
  }
  readExactBytes(root, STEP0_RECEIPT_PATH, STEP0_RECEIPT_SHA256, "V4_RUNTIME_STEP0_RECEIPT");
  const builderBinding = sourceBinding(root, BUILDER_PATH);
  const hardeningTestBinding = sourceBinding(root, HARDENING_TEST_PATH);
  const step0TestBinding = sourceBinding(root, STEP0_TEST_PATH);
  const authorityWithoutHash = {
    schemaVersion: "hk-ease-v4-runtime-successor-provenance-v1",
    status: "independently-reviewed-runtime-successor-candidate-production-cascade-hold",
    sourceClassification: SOURCE_CLASSIFICATION,
    ownerAttribution: null,
    ownerEvidence:
      "no durable original-owner or authorization artifact was present when the 11c postimage was observed",
    adoptionBoundary:
      "the observed postimage is adopted only as a reviewed immutable successor; historical 697c remains the predecessor and is never rewritten",
    builderBinding,
    predecessor: {
      logicalPath: LIVE_RUNTIME_PATH,
      immutableSnapshotPath: PREDECESSOR_RUNTIME_PATH,
      sha256: PREDECESSOR_SHA256,
      byteLength: predecessorBytes.byteLength,
      modePolicy: "immutable-content-addressed-0444"
    },
    successor: {
      logicalPath: LIVE_RUNTIME_PATH,
      immutableSnapshotPath: SUCCESSOR_SNAPSHOT_PATH,
      sha256: SUCCESSOR_SHA256,
      byteLength: successorBytes.byteLength,
      modePolicy: "immutable-content-addressed-0444",
      liveBytesMustEqualSnapshot: true
    },
    supplement: {
      path: SUPPLEMENT_PATH,
      sha256: SUPPLEMENT_SHA256,
      byteLength: supplementBytes.byteLength,
      rowCount: 701,
      rowsPayloadSha256: SUPPLEMENT_ROWS_PAYLOAD_SHA256
    },
    predecessorFocusedTest: {
      path: PREDECESSOR_TEST_PATH,
      immutableSnapshotPath: PREDECESSOR_TEST_SNAPSHOT_PATH,
      sha256: PREDECESSOR_TEST_SHA256,
      byteLength: predecessorTestBytes.byteLength
    },
    independentHardeningTest: hardeningTestBinding,
    step0SuccessorPolicyTest: step0TestBinding,
    historicalStep0Receipt: {
      path: STEP0_RECEIPT_PATH,
      sha256: STEP0_RECEIPT_SHA256,
      role: "historical-predecessor-relocation-receipt-unchanged"
    },
    parallelPhase2ACandidateBoundary: {
      status: "out-of-scope-not-adopted-by-this-lineage",
      policy:
        "this runtime lineage neither reads nor blesses Phase2A candidate bytes; later candidate regeneration cannot rewrite or invalidate the 697c-to-11c provenance"
    },
    exactDiff: {
      predecessorSha256: PREDECESSOR_SHA256,
      successorSha256: SUCCESSOR_SHA256,
      hunkCount: 21,
      additions: 568,
      deletions: 20,
      categories: [
        "strict-plain-JSON-prototype-symbol-descriptor-and-enumerability-guards",
        "strict-array-density-order-and-finite-value-guards",
        "cycle-safe-strict-JSON-data-validation",
        "replay-bound-expression-factor-payload-variants",
        "registered-operation-allowlist-and-exhaustive-dispatch",
        "exact-parameter-and-output-key-schemas",
        "select-unique-option-input-consumption-and-output-binding"
      ]
    },
    review: {
      currentPositiveCorpus: {
        supplementSha256: SUPPLEMENT_SHA256,
        rowsPayloadSha256: SUPPLEMENT_ROWS_PAYLOAD_SHA256,
        expectedPassCount: 701,
        expectedFailCount: 0
      },
      mutationCoverage: [
        "exotic-prototype",
        "symbol-key",
        "accessor-property",
        "non-enumerable-property",
        "sparse-array",
        "cyclic-data",
        "non-finite-number",
        "unknown-operation",
        "parameter-schema-drift",
        "output-schema-drift",
        "factor-payload-drift",
        "select-unique-option-consumption-drift",
        "signed-zero-value-distinction",
        "array-order-drift",
        "value-drift",
        "plain-object-key-reorder-differential"
      ],
      acceptanceExpansionPolicy:
        "only-plain-JSON-object-key-order-is-relaxed-arrays-order-and-values-remain-strict",
      failClosedPolicy:
        "all non-allowlisted shape-operation-schema-factor-selector-array-or-value mutations reject"
    },
    successorPolicy: {
      predecessorCount: 1,
      authorizedSuccessorCount: 1,
      acceptedLiveSha256: [PREDECESSOR_SHA256, SUCCESSOR_SHA256],
      arbitraryLiveDriftAccepted: false,
      lineage: `${PREDECESSOR_SHA256}->${SUCCESSOR_SHA256}`
    },
    promotion: {
      status: "hold-not-authorized-for-production-cascade",
      authorizedActions: [
        "preserve-11c-as-content-addressed-immutable-successor",
        "independently-verify-runtime-semantics-and-provenance"
      ],
      forbiddenActions: [
        "rewrite-697c-predecessor",
        "edit-live-runtime",
        "edit-v4-artifacts",
        "edit-phase2a-candidate",
        "promote-exact3-live",
        "release"
      ]
    }
  };
  return {
    ...authorityWithoutHash,
    authorityPayloadSha256: sha256(JSON.stringify(authorityWithoutHash))
  };
}

export function buildHongKongEaseV4RuntimeSuccessorProvenance(repositoryRoot: string) {
  const root = physicalRoot(repositoryRoot);
  const successorBytes = readExactBytes(
    root,
    LIVE_RUNTIME_PATH,
    SUCCESSOR_SHA256,
    "V4_RUNTIME_SUCCESSOR_LIVE"
  );
  return {
    successorBytes,
    authority: buildAuthority(root, successorBytes)
  };
}

export function serializeHongKongEaseV4RuntimeSuccessorProvenance(repositoryRoot: string) {
  const build = buildHongKongEaseV4RuntimeSuccessorProvenance(repositoryRoot);
  return {
    [SUCCESSOR_SNAPSHOT_PATH]: build.successorBytes,
    [AUTHORITY_PATH]: `${JSON.stringify(build.authority, null, 2)}\n`
  };
}

function materialize(repositoryRoot: string) {
  const root = physicalRoot(repositoryRoot);
  const outputs = serializeHongKongEaseV4RuntimeSuccessorProvenance(root);
  for (const path of HK_EASE_V4_RUNTIME_SUCCESSOR_OUTPUT_PATHS) {
    const absolutePath = resolve(root, path);
    const expected = outputs[path];
    const bytes = Buffer.isBuffer(expected) ? expected : Buffer.from(expected);
    if (!existsSync(absolutePath)) {
      mkdirSync(dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
    } else {
      const stats = lstatSync(absolutePath);
      if (stats.isSymbolicLink() || !stats.isFile()) fail("V4_RUNTIME_SUCCESSOR_OUTPUT_INVALID", path);
      if (!readFileSync(absolutePath).equals(bytes)) fail("V4_RUNTIME_SUCCESSOR_OUTPUT_DRIFT", path);
      if ((statSync(absolutePath).mode & 0o777) !== 0o444) {
        fail("V4_RUNTIME_SUCCESSOR_OUTPUT_MODE_DRIFT", path);
      }
    }
  }
}

const executedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (executedPath && pathToFileURL(executedPath).href === import.meta.url) {
  if (!process.argv.includes("--write")) fail("V4_RUNTIME_SUCCESSOR_WRITE_FLAG_REQUIRED");
  materialize(process.cwd());
  process.stdout.write(`${fileURLToPath(import.meta.url)}\n${AUTHORITY_PATH}\n`);
}
