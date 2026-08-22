import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonRecord = Record<string, any>;

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-v4-lineage-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-v4-lineage-candidate.test.ts";

const AUTHORITY_ROOT =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair";
const DATA_CANDIDATE_ROOT = `${AUTHORITY_ROOT}/phase2b-data-plane-candidate`;
const RUNTIME_CANDIDATE_ROOT = `${AUTHORITY_ROOT}/phase2b-runtime-candidate`;
const CANDIDATE_ROOT = `${AUTHORITY_ROOT}/phase2b-v4-lineage-candidate`;

const SANITIZED_OUTPUT_PATH = `${CANDIDATE_ROOT}/v4-sanitized-derivation-input-exact3-v1.json`;
const SUPPLEMENT_OUTPUT_PATH = `${CANDIDATE_ROOT}/v4-row-specific-derivation-supplement-exact3-v1.json`;
const ORACLE_OUTPUT_PATH = `${CANDIDATE_ROOT}/independent-answer-oracle-v4-exact3-v1.json`;
const SANITIZED_BUILDER_OUTPUT_PATH =
  `${CANDIDATE_ROOT}/build-hk-ease-derivation-input-v4-postimage.ts.snapshot`;
const SUPPLEMENT_BUILDER_OUTPUT_PATH =
  `${CANDIDATE_ROOT}/build-hk-ease-independent-oracle-v4-supplement-postimage.ts.snapshot`;
const ORACLE_BUILDER_OUTPUT_PATH =
  `${CANDIDATE_ROOT}/build-hk-ease-independent-oracle-v4-postimage.ts.snapshot`;
const SHADOW_BRIDGE_OUTPUT_PATH =
  `${CANDIDATE_ROOT}/generation-shadow-bridge.ts.snapshot`;
const V4_TEST_OUTPUT_PATH =
  `${CANDIDATE_ROOT}/lib-hongKongEaseIndependentOracleV4.test.ts.snapshot`;

export const HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS = [
  SANITIZED_OUTPUT_PATH,
  SUPPLEMENT_OUTPUT_PATH,
  ORACLE_OUTPUT_PATH,
  SANITIZED_BUILDER_OUTPUT_PATH,
  SUPPLEMENT_BUILDER_OUTPUT_PATH,
  ORACLE_BUILDER_OUTPUT_PATH,
  SHADOW_BRIDGE_OUTPUT_PATH,
  V4_TEST_OUTPUT_PATH
] as const;

export const HK_EASE_EXACT3_V4_LINEAGE_AUTHORITY_PATH =
  `${CANDIDATE_ROOT}/candidate-hold-authority-v1.json`;

const DATA_AUTHORITY_PATH = `${DATA_CANDIDATE_ROOT}/candidate-hold-authority-v1.json`;
const DATA_AUTHORITY_SHA256 =
  "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16";
const DATA_AUTHORITY_PAYLOAD_SHA256 =
  "984c473210ca7fa8af6dcd6f90a8d1bb1754189d3986a9a5e58cfc8ff33a4622";
const QUESTION_PACK_PATH = `${DATA_CANDIDATE_ROOT}/full-question-pack-base-id-v1.json`;
const QUESTION_PACK_SHA256 =
  "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf";
const STRICT_MANIFEST_PATH = `${DATA_CANDIDATE_ROOT}/full-strict-response-contracts-v1.json`;
const STRICT_MANIFEST_SHA256 =
  "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c";
const SIMPLE_MANIFEST_PATH = `${DATA_CANDIDATE_ROOT}/full-simple-response-contracts-v1.json`;
const SIMPLE_MANIFEST_SHA256 =
  "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41";
const VERSION_MANIFEST_PATH = `${DATA_CANDIDATE_ROOT}/full-question-version-manifest-v1.json`;
const VERSION_MANIFEST_SHA256 =
  "abf8da2300978b554efa07d96c5b70e721a9f0977e190a3f86105388591dfe8d";

const RUNTIME_AUTHORITY_PATH = `${RUNTIME_CANDIDATE_ROOT}/runtime-hold-authority-v1.json`;
const RUNTIME_AUTHORITY_SHA256 =
  "980ab2f3ec057a9f09d2fa2faccd787b9c9f03de838efa78eaa8b48056e26013";
const RUNTIME_AUTHORITY_PAYLOAD_SHA256 =
  "622e51fa75d065140142503505399b4af2d42a9bc621dd7e828b16cb23b34227";
const RESPONSE_RUNTIME_PATH =
  `${RUNTIME_CANDIDATE_ROOT}/lib-server-hongKongEaseResponseContracts.ts.snapshot`;
const RESPONSE_RUNTIME_SHA256 =
  "c3f462f619b0b90bf4a5a98475367927a7209a21300d59695b6e0a3ea97f03dd";

const V4_RUNTIME_AUTHORITY_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance/v4-runtime-successor-authority-v1.json";
const V4_RUNTIME_AUTHORITY_SHA256 =
  "4feebefec120b2c227a913a22f517496170604903fcbfe452a0a7578f6e706fa";
const V4_RUNTIME_SNAPSHOT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance/sha256/11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c.ts.snapshot";
const V4_RUNTIME_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const V4_TEST_PATH = "lib/hongKongEaseIndependentOracleV4.test.ts";
const V4_TEST_SHA256 =
  "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472";

const OLD_V3_ORACLE_PATH =
  `${AUTHORITY_ROOT}/preimages/sha256/8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62.json`;
const OLD_V3_ORACLE_SHA256 =
  "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62";

const SANITIZED_BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-derivation-input-v4.ts";
const SANITIZED_BUILDER_SHA256 =
  "67b2265380d8f8dad92eec621d7a838853ebc46c47ae583da82ebcb5a7a054ab";
const SUPPLEMENT_BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement.ts";
const SUPPLEMENT_BUILDER_SHA256 =
  "459ee6c75f53de7ec4062d3a6224e1a50c4f66620ef4943d1bc93efc47272fab";
const ORACLE_BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-independent-oracle-v4.ts";
const ORACLE_BUILDER_SHA256 =
  "c04d59c92f7aefa8acb59d80fc1a147a511b32ba8dac778fa2a58da4d719522d";
const DSL_PATH = "coordination/content-qa/hk-ease-v4-derivation-dsl.ts";
const DSL_SHA256 =
  "62522f86bdd86b3bb1636675ed33881acf744c0034c9a6beef36c6650c33882f";
const WORKED_RESPONSE_RUNTIME_PATH = "lib/server/hongKongEaseWorkedResponseContracts.ts";
const WORKED_RESPONSE_RUNTIME_SHA256 =
  "45d64494963dff0cf5c3a1bd7db9c7d751b96e6b2b13b02fb4f4cf16790be590";

const OLD_PACK_SHA256 =
  "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2";
const OLD_STRICT_SHA256 =
  "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4";
const OLD_SIMPLE_SHA256 =
  "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597";
const OLD_SANITIZED_SHA256 =
  "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634";
const OLD_SANITIZED_ROWS_PAYLOAD_SHA256 =
  "b8a580d7667065e98932c06fe460817f0b89026651d3c6d81ea72b642b0175cb";
const OLD_SUPPLEMENT_SOURCE_SHA256 =
  "a855b86192312ca450c17969749f9d4643ce21b493e01dace10273bb57dbe763";

const EXPECTED_SANITIZED_SHA256 =
  "54e9861f4fe6963e005752dbe5f741fed8ba71b8596eec8d80d365fc46ad0cfb";
const EXPECTED_SANITIZED_ROWS_PAYLOAD_SHA256 =
  "ad5c83775f197de4a20c28054a3a9eac8c1624e24eee115ddf1b863fd4b4265c";
const EXPECTED_ORDERED_BASE_ID_SHA256 =
  "fe20c8ff458b6d67b911c20ee02675202b188c44b4cc933066a2f64bd965b66a";
const EXPECTED_SUPPLEMENT_SHA256 =
  "2eec0d9b7ce7adf06d9f50d1dfa30738df9a8d97481d09c0458ad9023eca181e";
const EXPECTED_SUPPLEMENT_ROWS_PAYLOAD_SHA256 =
  "b68a5d7b2790c4d06bf127a11c97915e610be1e2c00cd554cfe98b5eebfbe7b6";
const EXPECTED_ORACLE_SHA256 =
  "236b6bf6342a9524869b2cff5562a35ef74efd9712456054f326f4e6b9a16844";
const EXPECTED_ORACLE_ROWS_PAYLOAD_SHA256 =
  "6b8999e4a92c519a774ea6888a5655c5fd26e7b0bc496d5b5de275d2ba26d19b";
const EXPECTED_SOURCE_POSTIMAGE_SHA256 = Object.freeze({
  sanitizedBuilder:
    "432f29c1bb455bc9b1a88d634e893cc3d59d9e033234d67f09c57279d4e67107",
  supplementBuilder:
    "fefa0d33056e0e28455df751129292bd650557499aed1fcf64bdb424087361c1",
  oracleBuilder:
    "6132185bdd6fb314659a35dd5b0a6311c5a0011fcd20615412e2b7f2cd5f551f",
  shadowBridge:
    "28b08b046c4d476493908f28eb73b07362412ea3a508e1700c1a5ebb820ebe08",
  v4Test:
    "459c89f15d073f50927b21605be093543e6e64ffede351734c23f1188251285a"
});

const LIVE_PATHS_THAT_MUST_REMAIN_UNCHANGED = [
  ["data/generated-content/hk-ease-practice-bank-v2/question-pack.json", OLD_PACK_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contracts.json", OLD_STRICT_SHA256],
  ["data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json", OLD_SIMPLE_SHA256],
  ["coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json", OLD_SANITIZED_SHA256],
  ["coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json", "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6"],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json", "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"],
  ["lib/hongKongEaseIndependentOracleV4.ts", V4_RUNTIME_SHA256],
  [V4_TEST_PATH, V4_TEST_SHA256],
  [SANITIZED_BUILDER_PATH, SANITIZED_BUILDER_SHA256],
  [SUPPLEMENT_BUILDER_PATH, SUPPLEMENT_BUILDER_SHA256],
  [ORACLE_BUILDER_PATH, ORACLE_BUILDER_SHA256]
] as const;

const requiredInputBindingMap = new Map<string, string>([
  [DATA_AUTHORITY_PATH, DATA_AUTHORITY_SHA256],
  [RUNTIME_AUTHORITY_PATH, RUNTIME_AUTHORITY_SHA256],
  [V4_RUNTIME_AUTHORITY_PATH, V4_RUNTIME_AUTHORITY_SHA256],
  [QUESTION_PACK_PATH, QUESTION_PACK_SHA256],
  [STRICT_MANIFEST_PATH, STRICT_MANIFEST_SHA256],
  [SIMPLE_MANIFEST_PATH, SIMPLE_MANIFEST_SHA256],
  [VERSION_MANIFEST_PATH, VERSION_MANIFEST_SHA256],
  [RESPONSE_RUNTIME_PATH, RESPONSE_RUNTIME_SHA256],
  [V4_RUNTIME_SNAPSHOT_PATH, V4_RUNTIME_SHA256],
  [OLD_V3_ORACLE_PATH, OLD_V3_ORACLE_SHA256],
  [DSL_PATH, DSL_SHA256],
  [WORKED_RESPONSE_RUNTIME_PATH, WORKED_RESPONSE_RUNTIME_SHA256],
  ...LIVE_PATHS_THAT_MUST_REMAIN_UNCHANGED
]);

export const HK_EASE_EXACT3_V4_LINEAGE_REQUIRED_INPUT_BINDINGS = Object.freeze(
  [...requiredInputBindingMap.entries()].map(([path, sha256]) =>
    Object.freeze({ path, sha256 })
  )
);

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const prettyJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const fail = (code: string, detail?: string): never => {
  throw new Error(detail ? `${code}:${detail}` : code);
};

const assertPhysicalFile = (
  repositoryRoot: string,
  relativePath: string,
  expectedSha256: string
): string => {
  const physicalRoot = realpathSync(repositoryRoot);
  const absolutePath = resolve(physicalRoot, relativePath);
  const lexicalRelative = relative(physicalRoot, absolutePath);
  if (
    !lexicalRelative ||
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(`..${sep}`) ||
    resolve(absolutePath) !== absolutePath
  ) {
    fail("PHASE2B4_INPUT_PATH_INVALID", relativePath);
  }
  if (!existsSync(absolutePath)) fail("PHASE2B4_INPUT_MISSING", relativePath);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("PHASE2B4_INPUT_NOT_REGULAR", relativePath);
  }
  const physicalPath = realpathSync(absolutePath);
  const physicalRelative = relative(physicalRoot, physicalPath);
  if (
    !physicalRelative ||
    physicalRelative === ".." ||
    physicalRelative.startsWith(`..${sep}`)
  ) {
    fail("PHASE2B4_INPUT_PHYSICAL_ESCAPE", relativePath);
  }
  const bytes = readFileSync(physicalPath);
  if (sha256(bytes) !== expectedSha256) {
    fail("PHASE2B4_PINNED_INPUT_DRIFT", relativePath);
  }
  return bytes.toString("utf8");
};

const replaceExactlyOnce = (
  source: string,
  before: string,
  after: string,
  label: string
): string => {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    fail("PHASE2B4_SOURCE_TRANSFORM_DRIFT", label);
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

const assertStarshipMutableRoot = (mutableRoot: string): string => {
  if (resolve(mutableRoot) !== mutableRoot || !mutableRoot.startsWith("/Volumes/Starship/")) {
    fail("PHASE2B4_TMPDIR_OUTSIDE_STARSHIP", mutableRoot);
  }
  if (!existsSync(mutableRoot)) fail("PHASE2B4_TMPDIR_MISSING", mutableRoot);
  const stat = lstatSync(mutableRoot);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail("PHASE2B4_TMPDIR_NOT_PHYSICAL", mutableRoot);
  }
  const physical = realpathSync(mutableRoot);
  if (physical !== mutableRoot || !physical.startsWith("/Volumes/Starship/")) {
    fail("PHASE2B4_TMPDIR_OUTSIDE_STARSHIP", mutableRoot);
  }
  return physical;
};

const writeShadowFile = (shadowRoot: string, relativePath: string, bytes: string): void => {
  const absolutePath = resolve(shadowRoot, relativePath);
  const lexicalRelative = relative(shadowRoot, absolutePath);
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith(`..${sep}`)) {
    fail("PHASE2B4_SHADOW_PATH_ESCAPE", relativePath);
  }
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o600 });
};

const dynamicImport = async (absolutePath: string): Promise<any> =>
  import(`${pathToFileURL(absolutePath).href}?phase2b4=${randomUUID()}`);

const buildShadowBridge = (): string => `import versionManifestJson from "../../data/historical/hongKongQuestionVersionManifest.json";
import {
  hongKongEaseResponseContractDecision,
  hongKongEaseReviewedSimpleResponseDecision
} from "../../lib/server/hongKongEaseResponseContracts";

const manifest = versionManifestJson as { activeIdByHistoricalId: Record<string, string> };
export const activeHongKongQuestionIdByHistoricalId =
  new Map(Object.entries(manifest.activeIdByHistoricalId));

export const questionAnswerMatches = (
  question: { id?: string },
  selectedAnswer: string
): boolean => {
  const strict = hongKongEaseResponseContractDecision(question.id, selectedAnswer);
  if (strict !== null) return strict;
  const simple = hongKongEaseReviewedSimpleResponseDecision(question.id, selectedAnswer);
  if (simple !== null) return simple;
  throw new Error(\`PHASE2B4_RESPONSE_POLICY_UNBOUND:\${question.id ?? "missing-id"}\`);
};
`;

const buildShadowV4Runtime = (source: string): string => {
  let result = replaceExactlyOnce(
    source,
    'from "@/coordination/content-qa/build-hk-ease-derivation-input-v4";',
    'from "../coordination/content-qa/build-hk-ease-derivation-input-v4";',
    "shadow-v4-sanitized-builder-import"
  );
  result = replaceExactlyOnce(
    result,
    'from "@/coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement";',
    'from "../coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement";',
    "shadow-v4-supplement-builder-import"
  );
  result = replaceExactlyOnce(
    result,
    'from "@/coordination/content-qa/hk-ease-v4-derivation-dsl";',
    'from "../coordination/content-qa/hk-ease-v4-derivation-dsl";',
    "shadow-v4-dsl-import"
  );
  return result;
};

const buildShadowResponseRuntime = (source: string): string => {
  let result = replaceExactlyOnce(
    source,
    'from "@/data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";',
    'from "../../data/generated-content/hk-ease-practice-bank-v2/response-contracts.json";',
    "shadow-response-strict-import"
  );
  result = replaceExactlyOnce(
    result,
    'from "@/data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";',
    'from "../../data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json";',
    "shadow-response-simple-import"
  );
  result = replaceExactlyOnce(
    result,
    'from "@/data/historical/hongKongQuestionVersionManifest.json";',
    'from "../../data/historical/hongKongQuestionVersionManifest.json";',
    "shadow-response-version-import"
  );
  result = replaceExactlyOnce(
    result,
    'from "@/lib/server/hongKongEaseWorkedResponseContracts";',
    'from "./hongKongEaseWorkedResponseContracts";',
    "shadow-response-worked-import"
  );
  return result;
};

const loadInputs = (repositoryRoot: string) => {
  const read = (path: string, expectedSha256: string) =>
    assertPhysicalFile(repositoryRoot, path, expectedSha256);
  const dataAuthority = JSON.parse(read(DATA_AUTHORITY_PATH, DATA_AUTHORITY_SHA256));
  const runtimeAuthority = JSON.parse(read(RUNTIME_AUTHORITY_PATH, RUNTIME_AUTHORITY_SHA256));
  const v4RuntimeAuthority = JSON.parse(
    read(V4_RUNTIME_AUTHORITY_PATH, V4_RUNTIME_AUTHORITY_SHA256)
  );
  if (dataAuthority.authorityPayloadSha256 !== DATA_AUTHORITY_PAYLOAD_SHA256) {
    fail("PHASE2B4_DATA_AUTHORITY_PAYLOAD_DRIFT");
  }
  if (runtimeAuthority.authorityPayloadSha256 !== RUNTIME_AUTHORITY_PAYLOAD_SHA256) {
    fail("PHASE2B4_RUNTIME_AUTHORITY_PAYLOAD_DRIFT");
  }
  if (
    v4RuntimeAuthority.successor?.sha256 !== V4_RUNTIME_SHA256 ||
    v4RuntimeAuthority.successor?.immutableSnapshotPath !== V4_RUNTIME_SNAPSHOT_PATH ||
    v4RuntimeAuthority.successorPolicy?.authorizedSuccessorCount !== 1
  ) {
    fail("PHASE2B4_V4_RUNTIME_AUTHORITY_DRIFT");
  }
  for (const [path, expectedSha256] of LIVE_PATHS_THAT_MUST_REMAIN_UNCHANGED) {
    read(path, expectedSha256);
  }
  return {
    dataAuthority,
    runtimeAuthority,
    v4RuntimeAuthority,
    questionPackBytes: read(QUESTION_PACK_PATH, QUESTION_PACK_SHA256),
    strictManifestBytes: read(STRICT_MANIFEST_PATH, STRICT_MANIFEST_SHA256),
    simpleManifestBytes: read(SIMPLE_MANIFEST_PATH, SIMPLE_MANIFEST_SHA256),
    versionManifestBytes: read(VERSION_MANIFEST_PATH, VERSION_MANIFEST_SHA256),
    responseRuntimeSource: read(RESPONSE_RUNTIME_PATH, RESPONSE_RUNTIME_SHA256),
    v4RuntimeSource: read(V4_RUNTIME_SNAPSHOT_PATH, V4_RUNTIME_SHA256),
    oldV3OracleBytes: read(OLD_V3_ORACLE_PATH, OLD_V3_ORACLE_SHA256),
    sanitizedBuilderSource: read(SANITIZED_BUILDER_PATH, SANITIZED_BUILDER_SHA256),
    supplementBuilderSource: read(SUPPLEMENT_BUILDER_PATH, SUPPLEMENT_BUILDER_SHA256),
    oracleBuilderSource: read(ORACLE_BUILDER_PATH, ORACLE_BUILDER_SHA256),
    dslSource: read(DSL_PATH, DSL_SHA256),
    workedResponseRuntimeSource: read(
      WORKED_RESPONSE_RUNTIME_PATH,
      WORKED_RESPONSE_RUNTIME_SHA256
    ),
    v4TestSource: read(V4_TEST_PATH, V4_TEST_SHA256)
  };
};

const buildSanitizedBuilderPostimage = (source: string): string =>
  replaceExactlyOnce(source, OLD_PACK_SHA256, QUESTION_PACK_SHA256, "sanitized-pack-sha");

const buildSupplementBuilderPostimage = (
  source: string,
  sanitizedSha256: string,
  sanitizedRowsPayloadSha256: string
): string => {
  let result = replaceExactlyOnce(
    source,
    OLD_SANITIZED_SHA256,
    sanitizedSha256,
    "supplement-sanitized-sha"
  );
  result = replaceExactlyOnce(
    result,
    OLD_SANITIZED_ROWS_PAYLOAD_SHA256,
    sanitizedRowsPayloadSha256,
    "supplement-sanitized-rows-payload"
  );
  return result;
};

const buildOracleBuilderPostimage = (
  source: string,
  sanitizedSha256: string,
  supplementSha256: string
): string => {
  let result = replaceExactlyOnce(source, OLD_PACK_SHA256, QUESTION_PACK_SHA256, "oracle-pack");
  result = replaceExactlyOnce(result, OLD_STRICT_SHA256, STRICT_MANIFEST_SHA256, "oracle-strict");
  result = replaceExactlyOnce(result, OLD_SIMPLE_SHA256, SIMPLE_MANIFEST_SHA256, "oracle-simple");
  result = replaceExactlyOnce(result, OLD_SANITIZED_SHA256, sanitizedSha256, "oracle-sanitized");
  result = replaceExactlyOnce(
    result,
    OLD_SUPPLEMENT_SOURCE_SHA256,
    supplementSha256,
    "oracle-supplement"
  );
  return result;
};

const buildShadowOracleComposer = (postimage: string): string => {
  let result = replaceExactlyOnce(
    postimage,
    'import { activeHongKongQuestionIdByHistoricalId } from "../../data/questions";',
    'import { activeHongKongQuestionIdByHistoricalId } from "./hk-ease-exact3-v4-shadow-bridge";',
    "shadow-active-map-import"
  );
  result = replaceExactlyOnce(
    result,
    'import { questionAnswerMatches } from "../../lib/server/answerMatching";',
    'import { questionAnswerMatches } from "./hk-ease-exact3-v4-shadow-bridge";',
    "shadow-grader-import"
  );
  return result;
};

const buildV4TestPostimage = (source: string): string => {
  let result = replaceExactlyOnce(
    source,
    "const sanitizedBytes = readFileSync(join(process.cwd(), HK_EASE_V4_EXACT26_SANITIZED_PATH));",
    "const sanitizedBytes = readFileSync(HK_EASE_V4_EXACT26_DURABLE_SANITIZED_INPUT_PATH);",
    "test-exact26-immutable-sanitized-reader"
  );
  result = replaceExactlyOnce(
    result,
    "assert.equal(factMutations, 1366);",
    "assert.equal(factMutations, 1365);",
    "test-fact-cardinality"
  );
  result = replaceExactlyOnce(
    result,
    `    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[missing.index], missing),
      /V4_OPTION_ADJUDICATION_INVALID/
    );
    missingOptionMutations += 1;

    const duplicated = structuredClone(baselineRow);
    duplicated.optionAdjudications.push(structuredClone(duplicated.optionAdjudications[0]));
    rehashV4Row(duplicated);
    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[duplicated.index], duplicated),
      /V4_OPTION_ADJUDICATION_INVALID/
    );`,
    `    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[missing.index], missing),
      /V4_(?:OPTION_ADJUDICATION|STEP_INPUT_BINDING)_INVALID/
    );
    missingOptionMutations += 1;

    const duplicated = structuredClone(baselineRow);
    duplicated.optionAdjudications.push(structuredClone(duplicated.optionAdjudications[0]));
    rehashV4Row(duplicated);
    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[duplicated.index], duplicated),
      /V4_(?:OPTION_ADJUDICATION|STEP_INPUT_BINDING)_INVALID/
    );`,
    "test-option-consumption-hardening-code"
  );
  result = replaceExactlyOnce(
    result,
    `    const multipleTrue = structuredClone(baselineRow);
    const falseOption = multipleTrue.optionAdjudications.find((entry) => !entry.truth)!;
    falseOption.truth = true;
    rehashV4Row(multipleTrue);
    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[multipleTrue.index], multipleTrue),
      /V4_OPTION_ADJUDICATION_INVALID/
    );`,
    `    const multipleTrue = structuredClone(baselineRow);
    const falseOption = multipleTrue.optionAdjudications.find((entry) => !entry.truth)!;
    falseOption.truth = true;
    rehashV4Row(multipleTrue);
    assert.throws(
      () => validateHongKongEaseV4DerivationRow(sanitized.rows[multipleTrue.index], multipleTrue),
      /V4_(?:OPTION_ADJUDICATION|STEP_INPUT_BINDING)_INVALID/
    );`,
    "test-option-truth-hardening-code"
  );
  result = replaceExactlyOnce(
    result,
    `    const expectedResponse = groups
      .map((group) => \`(\${group.label}) \${group.decisions.map((decision) => decision.truth ? "✓" : "✗").join(", ")}\`)
      .join("; ");
    require(row.computedResult.responseText === expectedResponse, "divisibility-matrix-checkmark-response");
    require(row.facts.some((fact) => fact.locator.source === "prompt.zh" && fact.locator.exact.includes("✓/✗")), "divisibility-matrix-zh-format-fact");`,
    `    const responseTokens = requiredFormat?.includes("No, Yes, No")
      ? { yes: "Yes", no: "No" }
      : { yes: "✓", no: "✗" };
    const expectedResponse = groups
      .map((group) => \`(\${group.label}) \${group.decisions.map((decision) => decision.truth ? responseTokens.yes : responseTokens.no).join(", ")}\`)
      .join("; ");
    require(row.computedResult.responseText === expectedResponse, "divisibility-matrix-prompt-format-response");
    require(
      requiredFormat !== null && row.facts.some((fact) => fact.locator.exact.includes(requiredFormat)),
      "divisibility-matrix-format-fact"
    );`,
    "test-divisibility-format-policy"
  );
  return result;
};

const assertExact3SemanticDelta = (
  historicalRows: JsonRecord[],
  candidateRows: JsonRecord[],
  code: string
): void => {
  const diffs = candidateRows
    .map((row, index) => ({ row, index }))
    .filter(({ row, index }) => JSON.stringify(row) !== JSON.stringify(historicalRows[index]));
  if (
    diffs.length !== 1 ||
    diffs[0].index !== 693 ||
    diffs[0].row.baseId !== "hk-ease-1041"
  ) {
    fail(code, JSON.stringify(diffs.map(({ row, index }) => [index, row.baseId])));
  }
};

export async function buildHongKongEaseExact3V4LineageCandidate(
  repositoryRoot = REPOSITORY_ROOT,
  mutableRoot = process.env.TMPDIR ?? ""
) {
  const physicalMutableRoot = assertStarshipMutableRoot(mutableRoot);
  const inputs = loadInputs(repositoryRoot);
  const shadowRoot = mkdtempSync(join(physicalMutableRoot, "hk-ease-exact3-v4-lineage."));
  try {
    const sanitizedBuilderPostimage = buildSanitizedBuilderPostimage(
      inputs.sanitizedBuilderSource
    );
    writeShadowFile(
      shadowRoot,
      "tsconfig.json",
      prettyJson({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          resolveJsonModule: true,
          esModuleInterop: true,
          strict: true,
          baseUrl: ".",
          paths: { "@/*": ["./*"] }
        }
      })
    );
    writeShadowFile(shadowRoot, SANITIZED_BUILDER_PATH, sanitizedBuilderPostimage);
    writeShadowFile(
      shadowRoot,
      "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
      inputs.questionPackBytes
    );
    const sanitizedModule = await dynamicImport(resolve(shadowRoot, SANITIZED_BUILDER_PATH));
    const sanitized = sanitizedModule.buildHongKongEaseV4SanitizedInput(
      JSON.parse(inputs.questionPackBytes),
      QUESTION_PACK_SHA256
    ) as JsonRecord;
    const serializedSanitized = sanitizedModule.renderHongKongEaseV4SanitizedInput(
      sanitized
    ) as string;
    if (
      sha256(serializedSanitized) !== EXPECTED_SANITIZED_SHA256 ||
      sanitized.rowsPayloadSha256 !== EXPECTED_SANITIZED_ROWS_PAYLOAD_SHA256 ||
      sanitized.orderedBaseIdSha256 !== EXPECTED_ORDERED_BASE_ID_SHA256
    ) {
      fail("PHASE2B4_SANITIZED_OUTPUT_DRIFT");
    }
    const historicalSanitized = JSON.parse(
      assertPhysicalFile(
        repositoryRoot,
        "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
        OLD_SANITIZED_SHA256
      )
    );
    assertExact3SemanticDelta(
      historicalSanitized.rows,
      sanitized.rows,
      "PHASE2B4_SANITIZED_DELTA_DRIFT"
    );
    writeShadowFile(
      shadowRoot,
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
      serializedSanitized
    );

    const supplementBuilderPostimage = buildSupplementBuilderPostimage(
      inputs.supplementBuilderSource,
      sha256(serializedSanitized),
      sanitized.rowsPayloadSha256
    );
    writeShadowFile(shadowRoot, SUPPLEMENT_BUILDER_PATH, supplementBuilderPostimage);
    writeShadowFile(shadowRoot, DSL_PATH, inputs.dslSource);
    const supplementModule = await dynamicImport(resolve(shadowRoot, SUPPLEMENT_BUILDER_PATH));
    const supplement = supplementModule.buildHongKongEaseV4DerivationSupplement(
      sanitized
    ) as JsonRecord;
    const serializedSupplement = supplementModule.renderHongKongEaseV4DerivationSupplement(
      supplement
    ) as string;
    if (
      sha256(serializedSupplement) !== EXPECTED_SUPPLEMENT_SHA256 ||
      supplement.rowsPayloadSha256 !== EXPECTED_SUPPLEMENT_ROWS_PAYLOAD_SHA256 ||
      supplement.sourceSha256 !== EXPECTED_SANITIZED_SHA256
    ) {
      fail("PHASE2B4_SUPPLEMENT_OUTPUT_DRIFT");
    }
    const historicalSupplement = JSON.parse(
      assertPhysicalFile(
        repositoryRoot,
        "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
        "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6"
      )
    );
    assertExact3SemanticDelta(
      historicalSupplement.rows,
      supplement.rows,
      "PHASE2B4_SUPPLEMENT_DELTA_DRIFT"
    );
    writeShadowFile(
      shadowRoot,
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
      serializedSupplement
    );

    const oracleBuilderPostimage = buildOracleBuilderPostimage(
      inputs.oracleBuilderSource,
      sha256(serializedSanitized),
      sha256(serializedSupplement)
    );
    const shadowBridgeSource = buildShadowBridge();
    const v4TestPostimage = buildV4TestPostimage(inputs.v4TestSource);
    const shadowOracleComposer = buildShadowOracleComposer(oracleBuilderPostimage);
    writeShadowFile(shadowRoot, ORACLE_BUILDER_PATH, shadowOracleComposer);
    writeShadowFile(
      shadowRoot,
      "coordination/content-qa/hk-ease-exact3-v4-shadow-bridge.ts",
      shadowBridgeSource
    );
    writeShadowFile(
      shadowRoot,
      "lib/hongKongEaseIndependentOracleV4.ts",
      buildShadowV4Runtime(inputs.v4RuntimeSource)
    );
    writeShadowFile(
      shadowRoot,
      "lib/server/hongKongEaseResponseContracts.ts",
      buildShadowResponseRuntime(inputs.responseRuntimeSource)
    );
    writeShadowFile(
      shadowRoot,
      WORKED_RESPONSE_RUNTIME_PATH,
      inputs.workedResponseRuntimeSource
    );
    writeShadowFile(
      shadowRoot,
      "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
      inputs.strictManifestBytes
    );
    writeShadowFile(
      shadowRoot,
      "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
      inputs.simpleManifestBytes
    );
    writeShadowFile(
      shadowRoot,
      "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json",
      inputs.oldV3OracleBytes
    );
    writeShadowFile(
      shadowRoot,
      "data/historical/hongKongQuestionVersionManifest.json",
      inputs.versionManifestBytes
    );
    const oracleModule = await dynamicImport(resolve(shadowRoot, ORACLE_BUILDER_PATH));
    oracleModule.assertHongKongEaseV4LiveSourceBytes(shadowRoot);
    const oracle = oracleModule.buildHongKongEaseIndependentOracleV4() as JsonRecord;
    const serializedOracle = oracleModule.renderHongKongEaseIndependentOracleV4(
      oracle
    ) as string;
    if (
      sha256(serializedOracle) !== EXPECTED_ORACLE_SHA256 ||
      oracle.rowsPayloadSha256 !== EXPECTED_ORACLE_ROWS_PAYLOAD_SHA256 ||
      oracle.questionCount !== 701 ||
      oracle.rowSpecificDerivationCount !== 701 ||
      oracle.strictResponsePolicyCount !== 344 ||
      oracle.reviewedSimpleResponsePolicyCount !== 357 ||
      oracle.directProductionGraderMatchCount !== 651 ||
      oracle.structuredSemanticMatchCount !== 50 ||
      !Array.isArray(oracle.unresolvedIds) ||
      oracle.unresolvedIds.length !== 0
    ) {
      fail("PHASE2B4_ORACLE_TOPOLOGY_DRIFT");
    }
    for (const [baseId, activeId] of [
      ["hk-ease-10481", "hk-ease-10481-v3"],
      ["hk-ease-10496", "hk-ease-10496-v3"],
      ["hk-ease-1041", "hk-ease-1041-v3"]
    ]) {
      const row = oracle.rows.find((entry: JsonRecord) => entry.baseId === baseId);
      if (
        !row ||
        row.activeId !== activeId ||
        row.productionComparison?.directProductionGraderAccepted !== true ||
        row.productionComparison?.matched !== true
      ) {
        fail("PHASE2B4_EXACT3_ORACLE_BINDING_DRIFT", baseId);
      }
    }
    const postimages = {
      sanitizedBuilder: sanitizedBuilderPostimage,
      supplementBuilder: supplementBuilderPostimage,
      oracleBuilder: oracleBuilderPostimage,
      shadowBridge: shadowBridgeSource,
      v4Test: v4TestPostimage
    };
    for (const [name, source] of Object.entries(postimages)) {
      if (
        sha256(source) !==
        EXPECTED_SOURCE_POSTIMAGE_SHA256[
          name as keyof typeof EXPECTED_SOURCE_POSTIMAGE_SHA256
        ]
      ) {
        fail("PHASE2B4_SOURCE_POSTIMAGE_DRIFT", name);
      }
    }

    return {
      schemaVersion: "hk-ease-exact3-v4-lineage-candidate-v1" as const,
      status: "candidate-hold-not-live-promotion" as const,
      sanitized,
      supplement,
      oracle,
      serializedSanitized,
      serializedSupplement,
      serializedOracle,
      sourcePostimages: postimages,
      sourcePreimageBindings: [
        { path: SANITIZED_BUILDER_PATH, sha256: SANITIZED_BUILDER_SHA256 },
        { path: SUPPLEMENT_BUILDER_PATH, sha256: SUPPLEMENT_BUILDER_SHA256 },
        { path: ORACLE_BUILDER_PATH, sha256: ORACLE_BUILDER_SHA256 },
        { path: DSL_PATH, sha256: DSL_SHA256 },
        { path: V4_RUNTIME_SNAPSHOT_PATH, sha256: V4_RUNTIME_SHA256 },
        { path: RESPONSE_RUNTIME_PATH, sha256: RESPONSE_RUNTIME_SHA256 },
        { path: WORKED_RESPONSE_RUNTIME_PATH, sha256: WORKED_RESPONSE_RUNTIME_SHA256 },
        { path: V4_TEST_PATH, sha256: V4_TEST_SHA256 }
      ]
    };
  } finally {
    rmSync(shadowRoot, { recursive: true, force: false });
  }
}

const buildAuthority = (
  repositoryRoot: string,
  candidate: Awaited<ReturnType<typeof buildHongKongEaseExact3V4LineageCandidate>>
): JsonRecord => {
  const artifactBytes: Record<string, string> = {
    [SANITIZED_OUTPUT_PATH]: candidate.serializedSanitized,
    [SUPPLEMENT_OUTPUT_PATH]: candidate.serializedSupplement,
    [ORACLE_OUTPUT_PATH]: candidate.serializedOracle,
    [SANITIZED_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.sanitizedBuilder,
    [SUPPLEMENT_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.supplementBuilder,
    [ORACLE_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.oracleBuilder,
    [SHADOW_BRIDGE_OUTPUT_PATH]: candidate.sourcePostimages.shadowBridge,
    [V4_TEST_OUTPUT_PATH]: candidate.sourcePostimages.v4Test
  };
  const payload = {
    schemaVersion: "hk-ease-exact3-v4-lineage-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    builderBinding: {
      path: BUILDER_PATH,
      sha256: sha256(readFileSync(resolve(repositoryRoot, BUILDER_PATH)))
    },
    focusedTestBinding: {
      path: FOCUSED_TEST_PATH,
      sha256: sha256(readFileSync(resolve(repositoryRoot, FOCUSED_TEST_PATH)))
    },
    upstreamAuthorities: [
      {
        path: DATA_AUTHORITY_PATH,
        sha256: DATA_AUTHORITY_SHA256,
        authorityPayloadSha256: DATA_AUTHORITY_PAYLOAD_SHA256
      },
      {
        path: RUNTIME_AUTHORITY_PATH,
        sha256: RUNTIME_AUTHORITY_SHA256,
        authorityPayloadSha256: RUNTIME_AUTHORITY_PAYLOAD_SHA256
      },
      {
        path: V4_RUNTIME_AUTHORITY_PATH,
        sha256: V4_RUNTIME_AUTHORITY_SHA256,
        successorSha256: V4_RUNTIME_SHA256
      }
    ],
    sourcePreimageBindings: candidate.sourcePreimageBindings,
    sourceTransformations: [
      {
        logicalTargetPath: SANITIZED_BUILDER_PATH,
        preimageSha256: SANITIZED_BUILDER_SHA256,
        postimageSha256: sha256(candidate.sourcePostimages.sanitizedBuilder),
        exactChanges: ["question-pack-sha256"]
      },
      {
        logicalTargetPath: SUPPLEMENT_BUILDER_PATH,
        preimageSha256: SUPPLEMENT_BUILDER_SHA256,
        postimageSha256: sha256(candidate.sourcePostimages.supplementBuilder),
        exactChanges: ["sanitized-file-sha256", "sanitized-rows-payload-sha256"]
      },
      {
        logicalTargetPath: ORACLE_BUILDER_PATH,
        preimageSha256: ORACLE_BUILDER_SHA256,
        postimageSha256: sha256(candidate.sourcePostimages.oracleBuilder),
        exactChanges: [
          "question-pack-sha256",
          "strict-contract-sha256",
          "simple-contract-sha256",
          "sanitized-file-sha256",
          "supplement-file-sha256"
        ]
      },
      {
        logicalTargetPath: V4_TEST_PATH,
        preimageSha256: V4_TEST_SHA256,
        postimageSha256: sha256(candidate.sourcePostimages.v4Test),
        exactChanges: [
          "immutable-exact26-sanitized-preimage-reader",
          "fact-cardinality-1365",
          "11c-option-consumption-error-code",
          "prompt-selected-divisibility-response-format"
        ]
      }
    ],
    exactSemanticDelta: {
      sanitizedChangedRowCount: 1,
      supplementChangedRowCount: 1,
      changedIndex: 693,
      changedBaseId: "hk-ease-1041",
      unchangedAnswerBlindRows: 700,
      exact3ProductionComparisonRows: [
        "hk-ease-10481",
        "hk-ease-10496",
        "hk-ease-1041"
      ]
    },
    outputPolicy: {
      exactArtifactCount: HK_EASE_EXACT3_V4_LINEAGE_OUTPUT_PATHS.length,
      materializationDirectory: CANDIDATE_ROOT,
      fileMode: "0444",
      liveOverwriteAllowed: false
    },
    outputBindings: Object.entries(artifactBytes).map(([path, bytes]) => ({
      path,
      sha256: sha256(bytes),
      byteLength: Buffer.byteLength(bytes, "utf8")
    })),
    topology: {
      questionCount: candidate.oracle.questionCount,
      rowSpecificDerivationCount: candidate.oracle.rowSpecificDerivationCount,
      multipleChoiceCount: candidate.supplement.multipleChoiceCount,
      strictResponsePolicyCount: candidate.oracle.strictResponsePolicyCount,
      reviewedSimpleResponsePolicyCount: candidate.oracle.reviewedSimpleResponsePolicyCount,
      directProductionGraderMatchCount: candidate.oracle.directProductionGraderMatchCount,
      structuredSemanticMatchCount: candidate.oracle.structuredSemanticMatchCount,
      orderedBaseIdSha256: candidate.oracle.orderedBaseIdSha256
    },
    promotion: {
      liveDataMutationAuthorized: false,
      liveV4ArtifactMutationAuthorized: false,
      liveV4SourceMutationAuthorized: false,
      fullBankIntegrationAuthorized: false,
      canonicalRunnerAuthorized: false,
      browserAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "independent A18 review of the exact hk-ease-1041 V4 row delta",
        "independent source-bound review receipt for the exact V4 shadow suite",
        "focused-ledger and canonical runner integration",
        "browser and release evidence"
      ]
    }
  };
  return { ...payload, authorityPayloadSha256: sha256(JSON.stringify(payload)) };
};

export async function serializeHongKongEaseExact3V4LineageCandidate(
  candidate: Awaited<ReturnType<typeof buildHongKongEaseExact3V4LineageCandidate>>,
  repositoryRoot = REPOSITORY_ROOT
): Promise<Record<string, string>> {
  const serialized: Record<string, string> = {
    [SANITIZED_OUTPUT_PATH]: candidate.serializedSanitized,
    [SUPPLEMENT_OUTPUT_PATH]: candidate.serializedSupplement,
    [ORACLE_OUTPUT_PATH]: candidate.serializedOracle,
    [SANITIZED_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.sanitizedBuilder,
    [SUPPLEMENT_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.supplementBuilder,
    [ORACLE_BUILDER_OUTPUT_PATH]: candidate.sourcePostimages.oracleBuilder,
    [SHADOW_BRIDGE_OUTPUT_PATH]: candidate.sourcePostimages.shadowBridge,
    [V4_TEST_OUTPUT_PATH]: candidate.sourcePostimages.v4Test
  };
  serialized[HK_EASE_EXACT3_V4_LINEAGE_AUTHORITY_PATH] = prettyJson(
    buildAuthority(repositoryRoot, candidate)
  );
  return serialized;
}

export async function materializeHongKongEaseExact3V4LineageCandidate(
  repositoryRoot = REPOSITORY_ROOT,
  mutableRoot = process.env.TMPDIR ?? ""
): Promise<Record<string, string>> {
  const candidate = await buildHongKongEaseExact3V4LineageCandidate(
    repositoryRoot,
    mutableRoot
  );
  const serialized = await serializeHongKongEaseExact3V4LineageCandidate(
    candidate,
    repositoryRoot
  );
  for (const [relativePath, bytes] of Object.entries(serialized)) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    if (existsSync(absolutePath)) {
      const stat = lstatSync(absolutePath);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        readFileSync(absolutePath, "utf8") !== bytes
      ) {
        fail("PHASE2B4_MATERIALIZATION_COLLISION", relativePath);
      }
    } else {
      writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
    }
    chmodSync(absolutePath, 0o444);
  }
  return serialized;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (invokedPath === import.meta.url) {
  void materializeHongKongEaseExact3V4LineageCandidate(
    REPOSITORY_ROOT,
    process.env.TMPDIR ?? ""
  ).catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
