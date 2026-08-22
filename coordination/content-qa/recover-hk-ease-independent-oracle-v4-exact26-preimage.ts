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
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CONTENT_QA_ROOT = resolve(REPOSITORY_ROOT, "coordination/content-qa");
const PREIMAGE_ROOT = resolve(
  CONTENT_QA_ROOT,
  "authoritative/hk-ease-701-independent-oracle/preimages"
);

export const HK_EASE_V4_EXACT26_RECOVERY_CONTAINER_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-supplement-builder-tsx-container-33c75059.json";
export const HK_EASE_V4_EXACT26_RECOVERY_DSL_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-derivation-dsl-62522f86.ts";
export const HK_EASE_V4_EXACT26_RECOVERY_INPUT_BUILDER_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-derivation-input-builder-67b22653.ts";
export const HK_EASE_V4_EXACT26_RECOVERY_SANITIZED_INPUT_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-sanitized-derivation-input-1b36361d.json";
export const HK_EASE_V4_EXACT26_IMMUTABLE_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/preimages/v4-row-specific-derivation-supplement-a855b861.json";

const BOOTSTRAP_CONTAINER_PATH = resolve(
  REPOSITORY_ROOT,
  ".tmp/e26r1/tsx-501/17871-b93308f57a5980993c31144fd2ef6185d54d54d8"
);
const LIVE_DSL_PATH = resolve(CONTENT_QA_ROOT, "hk-ease-v4-derivation-dsl.ts");
const LIVE_INPUT_BUILDER_PATH = resolve(CONTENT_QA_ROOT, "build-hk-ease-derivation-input-v4.ts");
const LIVE_SANITIZED_INPUT_PATH = resolve(
  CONTENT_QA_ROOT,
  "authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json"
);
const DURABLE_CONTAINER_PATH = resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_RECOVERY_CONTAINER_PATH);
const DURABLE_DSL_PATH = resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_RECOVERY_DSL_PATH);
const DURABLE_INPUT_BUILDER_PATH = resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_RECOVERY_INPUT_BUILDER_PATH);
const DURABLE_SANITIZED_INPUT_PATH = resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_RECOVERY_SANITIZED_INPUT_PATH);
const IMMUTABLE_PREIMAGE_PATH = resolve(REPOSITORY_ROOT, HK_EASE_V4_EXACT26_IMMUTABLE_PREIMAGE_PATH);

const EXPECTED_HISTORICAL_SOURCE_COORDINATE =
  "/Volumes/Starship/MAIS-hk-ease-v2-qa-wt/coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement.ts";
const EXPECTED_CONTAINER_SHA256 = "79ea30eec567b7ae2383921d27c8a065e337bebf53249eafaa5a4ce02ea32cb0";
const EXPECTED_RECOVERED_SOURCE_SHA256 = "33c75059dc657b5d252bb3f734763669d9491f47a4e1207ec86bae56f45f4b3d";
const EXPECTED_RECOVERED_SOURCE_BYTE_LENGTH = 193_239;
const EXPECTED_DSL_SHA256 = "62522f86bdd86b3bb1636675ed33881acf744c0034c9a6beef36c6650c33882f";
const EXPECTED_INPUT_BUILDER_SHA256 = "67b2265380d8f8dad92eec621d7a838853ebc46c47ae583da82ebcb5a7a054ab";
const EXPECTED_SANITIZED_INPUT_SHA256 = "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634";
const EXPECTED_SUPPLEMENT_SHA256 = "a855b86192312ca450c17969749f9d4643ce21b493e01dace10273bb57dbe763";
const EXPECTED_SUPPLEMENT_BYTE_LENGTH = 4_319_562;
const EXPECTED_ROWS_PAYLOAD_SHA256 = "70a5ab7f3ee807d34c0647f311aa8ae0c9577220f009c6aac4b3b1c6ede35de5";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

const fail = (code: string): never => {
  throw new Error(code);
};

type TsxCacheContainer = {
  code: string;
  warnings: unknown[];
  map: {
    version: number;
    sources: string[];
    sourcesContent: string[];
  };
};

type HistoricalSupplement = {
  sourceSha256: string;
  questionCount: number;
  multipleChoiceCount: number;
  rowSpecificDerivationCount: number;
  rowsPayloadSha256: string;
  rows: Array<{ index: number; baseId: string }>;
};

type HistoricalBuilderModule = {
  buildHongKongEaseV4DerivationSupplement: () => HistoricalSupplement;
  renderHongKongEaseV4DerivationSupplement: (artifact: HistoricalSupplement) => string;
};

const assertNoCredentialMaterial = (source: string): void => {
  const credentialPatterns = [
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:api[_-]?key|password|secret|authorization)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i,
    /\bbearer\s+[A-Za-z0-9._~+/=-]{16,}/i
  ];
  if (credentialPatterns.some((pattern) => pattern.test(source))) {
    fail("V4_EXACT26_RECOVERY_CREDENTIAL_MATERIAL_DETECTED");
  }
};

const exactBytes = (path: string, expectedSha256: string, code: string): Buffer => {
  const bytes = readFileSync(path);
  if (sha256(bytes) !== expectedSha256) fail(code);
  return bytes;
};

const parseAndVerifyContainer = (containerBytes: Buffer): { source: string; container: TsxCacheContainer } => {
  if (sha256(containerBytes) !== EXPECTED_CONTAINER_SHA256) fail("V4_EXACT26_RECOVERY_CONTAINER_SHA256_DRIFT");
  let parsed: unknown;
  try {
    parsed = JSON.parse(containerBytes.toString("utf8"));
  } catch {
    fail("V4_EXACT26_RECOVERY_CONTAINER_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object") fail("V4_EXACT26_RECOVERY_CONTAINER_SHAPE_INVALID");
  const container = parsed as TsxCacheContainer;
  const expectedImportMeta = JSON.stringify({
    dirname: dirname(EXPECTED_HISTORICAL_SOURCE_COORDINATE),
    filename: EXPECTED_HISTORICAL_SOURCE_COORDINATE,
    url: pathToFileURL(EXPECTED_HISTORICAL_SOURCE_COORDINATE).href
  });
  if (
    typeof container.code !== "string" ||
    !Array.isArray(container.warnings) ||
    container.warnings.length !== 0 ||
    !container.map ||
    container.map.version !== 3 ||
    !Array.isArray(container.map.sources) ||
    !Array.isArray(container.map.sourcesContent) ||
    container.map.sources.length !== 2 ||
    container.map.sourcesContent.length !== 2 ||
    container.map.sources[0] !== EXPECTED_HISTORICAL_SOURCE_COORDINATE ||
    container.map.sources[1] !== "<define:import.meta>" ||
    typeof container.map.sourcesContent[0] !== "string" ||
    container.map.sourcesContent[1] !== expectedImportMeta
  ) {
    fail("V4_EXACT26_RECOVERY_CONTAINER_SHAPE_INVALID");
  }
  const source = container.map.sourcesContent[0];
  if (Buffer.byteLength(source, "utf8") !== EXPECTED_RECOVERED_SOURCE_BYTE_LENGTH) {
    fail("V4_EXACT26_RECOVERY_SOURCE_BYTE_LENGTH_DRIFT");
  }
  if (sha256(source) !== EXPECTED_RECOVERED_SOURCE_SHA256) fail("V4_EXACT26_RECOVERY_SOURCE_SHA256_DRIFT");
  assertNoCredentialMaterial(container.code);
  assertNoCredentialMaterial(source);
  return { source, container };
};

export type HongKongEaseV4Exact26RecoveredPreimage = {
  containerSha256: string;
  recoveredBuilderSourceSha256: string;
  supplementBytes: Buffer;
  supplementSha256: string;
  supplementByteLength: number;
  rowCount: number;
  rowsPayloadSha256: string;
};

export const recoverHongKongEaseV4Exact26SupplementPreimage = async ():
Promise<HongKongEaseV4Exact26RecoveredPreimage> => {
  const { source } = parseAndVerifyContainer(
    exactBytes(DURABLE_CONTAINER_PATH, EXPECTED_CONTAINER_SHA256, "V4_EXACT26_RECOVERY_CONTAINER_SHA256_DRIFT")
  );
  const dslBytes = exactBytes(DURABLE_DSL_PATH, EXPECTED_DSL_SHA256, "V4_EXACT26_RECOVERY_DSL_SHA256_DRIFT");
  const inputBuilderBytes = exactBytes(
    DURABLE_INPUT_BUILDER_PATH,
    EXPECTED_INPUT_BUILDER_SHA256,
    "V4_EXACT26_RECOVERY_INPUT_BUILDER_SHA256_DRIFT"
  );
  const sanitizedInputBytes = exactBytes(
    DURABLE_SANITIZED_INPUT_PATH,
    EXPECTED_SANITIZED_INPUT_SHA256,
    "V4_EXACT26_RECOVERY_SANITIZED_INPUT_SHA256_DRIFT"
  );
  assertNoCredentialMaterial(dslBytes.toString("utf8"));
  assertNoCredentialMaterial(inputBuilderBytes.toString("utf8"));
  assertNoCredentialMaterial(sanitizedInputBytes.toString("utf8"));

  const configuredTmpRoot = process.env.TMPDIR ? resolve(process.env.TMPDIR) : "";
  let physicalTmpRoot = "";
  let configuredTmpRootIsSymlink = false;
  try {
    configuredTmpRootIsSymlink = lstatSync(configuredTmpRoot).isSymbolicLink();
    physicalTmpRoot = realpathSync(configuredTmpRoot);
  } catch {
    fail("V4_EXACT26_RECOVERY_TMPDIR_INVALID");
  }
  if (
    configuredTmpRootIsSymlink ||
    !physicalTmpRoot.startsWith("/Volumes/Starship/") ||
    !statSync(physicalTmpRoot).isDirectory()
  ) {
    fail("V4_EXACT26_RECOVERY_TMPDIR_OUTSIDE_STARSHIP");
  }
  const temporaryRoot = mkdtempSync(resolve(physicalTmpRoot, "hk-ease-v4-exact26-recover-"));
  const temporaryContentQaRoot = resolve(temporaryRoot, "coordination/content-qa");
  const temporaryBuilderPath = resolve(
    temporaryContentQaRoot,
    "build-hk-ease-independent-oracle-v4-supplement.ts"
  );

  try {
    mkdirSync(
      resolve(temporaryContentQaRoot, "authoritative/hk-ease-701-independent-oracle"),
      { recursive: true }
    );
    writeFileSync(temporaryBuilderPath, source, { encoding: "utf8", flag: "wx" });
    writeFileSync(resolve(temporaryContentQaRoot, "hk-ease-v4-derivation-dsl.ts"), dslBytes, { flag: "wx" });
    writeFileSync(
      resolve(temporaryContentQaRoot, "build-hk-ease-derivation-input-v4.ts"),
      inputBuilderBytes,
      { flag: "wx" }
    );
    writeFileSync(
      resolve(
        temporaryContentQaRoot,
        "authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json"
      ),
      sanitizedInputBytes,
      { flag: "wx" }
    );
    const module = await import(pathToFileURL(temporaryBuilderPath).href) as HistoricalBuilderModule;
    if (
      typeof module.buildHongKongEaseV4DerivationSupplement !== "function" ||
      typeof module.renderHongKongEaseV4DerivationSupplement !== "function"
    ) {
      fail("V4_EXACT26_RECOVERY_BUILDER_EXPORT_INVALID");
    }
    const artifact = module.buildHongKongEaseV4DerivationSupplement();
    const supplementBytes = Buffer.from(
      module.renderHongKongEaseV4DerivationSupplement(artifact),
      "utf8"
    );
    const supplementSha256 = sha256(supplementBytes);
    if (
      supplementSha256 !== EXPECTED_SUPPLEMENT_SHA256 ||
      supplementBytes.byteLength !== EXPECTED_SUPPLEMENT_BYTE_LENGTH ||
      artifact.questionCount !== 701 ||
      artifact.rows.length !== 701 ||
      artifact.rowSpecificDerivationCount !== 701 ||
      artifact.multipleChoiceCount !== 90 ||
      artifact.sourceSha256 !== EXPECTED_SANITIZED_INPUT_SHA256 ||
      artifact.rowsPayloadSha256 !== EXPECTED_ROWS_PAYLOAD_SHA256 ||
      artifact.rows.some((row, index) => row.index !== index)
    ) {
      fail("V4_EXACT26_RECOVERY_SUPPLEMENT_DRIFT");
    }
    assertNoCredentialMaterial(supplementBytes.toString("utf8"));
    return {
      containerSha256: EXPECTED_CONTAINER_SHA256,
      recoveredBuilderSourceSha256: EXPECTED_RECOVERED_SOURCE_SHA256,
      supplementBytes,
      supplementSha256,
      supplementByteLength: supplementBytes.byteLength,
      rowCount: artifact.rows.length,
      rowsPayloadSha256: artifact.rowsPayloadSha256
    };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: false });
  }
};

const materializeVerifiedImmutableCopy = (
  immutablePath: string,
  bootstrapPath: string,
  expectedSha256: string,
  code: string
): void => {
  if (existsSync(immutablePath)) {
    exactBytes(immutablePath, expectedSha256, code);
    return;
  }
  const bytes = exactBytes(bootstrapPath, expectedSha256, code);
  writeFileSync(immutablePath, bytes, { flag: "wx" });
};

export const materializeHongKongEaseV4Exact26SupplementPreimage = async ():
Promise<HongKongEaseV4Exact26RecoveredPreimage> => {
  mkdirSync(PREIMAGE_ROOT, { recursive: true });
  materializeVerifiedImmutableCopy(
    DURABLE_CONTAINER_PATH,
    BOOTSTRAP_CONTAINER_PATH,
    EXPECTED_CONTAINER_SHA256,
    "V4_EXACT26_RECOVERY_CONTAINER_SHA256_DRIFT"
  );
  parseAndVerifyContainer(readFileSync(DURABLE_CONTAINER_PATH));
  materializeVerifiedImmutableCopy(
    DURABLE_DSL_PATH,
    LIVE_DSL_PATH,
    EXPECTED_DSL_SHA256,
    "V4_EXACT26_RECOVERY_DSL_SHA256_DRIFT"
  );
  materializeVerifiedImmutableCopy(
    DURABLE_INPUT_BUILDER_PATH,
    LIVE_INPUT_BUILDER_PATH,
    EXPECTED_INPUT_BUILDER_SHA256,
    "V4_EXACT26_RECOVERY_INPUT_BUILDER_SHA256_DRIFT"
  );
  materializeVerifiedImmutableCopy(
    DURABLE_SANITIZED_INPUT_PATH,
    LIVE_SANITIZED_INPUT_PATH,
    EXPECTED_SANITIZED_INPUT_SHA256,
    "V4_EXACT26_RECOVERY_SANITIZED_INPUT_SHA256_DRIFT"
  );
  const recovered = await recoverHongKongEaseV4Exact26SupplementPreimage();
  if (existsSync(IMMUTABLE_PREIMAGE_PATH)) {
    if (!readFileSync(IMMUTABLE_PREIMAGE_PATH).equals(recovered.supplementBytes)) {
      fail("V4_EXACT26_RECOVERY_IMMUTABLE_PREIMAGE_DRIFT");
    }
  } else {
    writeFileSync(IMMUTABLE_PREIMAGE_PATH, recovered.supplementBytes, { flag: "wx" });
  }
  return recovered;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void materializeHongKongEaseV4Exact26SupplementPreimage()
    .then(() => {
      process.stdout.write(
        `${relative(REPOSITORY_ROOT, IMMUTABLE_PREIMAGE_PATH)}:${EXPECTED_SUPPLEMENT_SHA256}\n`
      );
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : "V4_EXACT26_RECOVERY_UNKNOWN_ERROR"}\n`);
      process.exitCode = 1;
    });
}
