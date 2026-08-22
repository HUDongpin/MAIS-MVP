import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-historical-regression-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-historical-regression-candidate.test.ts";
const DATA_AUTHORITY_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate/candidate-hold-authority-v1.json";
const DATA_AUTHORITY_SHA256 =
  "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16";
const DATA_AUTHORITY_PAYLOAD_SHA256 =
  "984c473210ca7fa8af6dcd6f90a8d1bb1754189d3986a9a5e58cfc8ff33a4622";
const RUNTIME_AUTHORITY_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate/runtime-hold-authority-v1.json";
const RUNTIME_AUTHORITY_SHA256 =
  "980ab2f3ec057a9f09d2fa2faccd787b9c9f03de838efa78eaa8b48056e26013";
const RUNTIME_AUTHORITY_PAYLOAD_SHA256 =
  "622e51fa75d065140142503505399b4af2d42a9bc621dd7e828b16cb23b34227";
const RESIDUAL28_VERSION_MANIFEST_PREIMAGE_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92.json";
const RESIDUAL28_VERSION_MANIFEST_PREIMAGE_SHA256 =
  "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92";

export const HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-historical-regression-candidate";

const LOGICAL_TARGET_PATHS = [
  "lib/hongKongQuestionVersioning.test.ts",
  "lib/server/hongKongHistoricalQuestionProjection.test.ts",
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts",
  "lib/hongKongResidual47RepairContract.test.ts",
  "lib/server/hongKongEaseResponseContracts.test.ts",
  "lib/hongKongResidual47FocusedTestLedger.ts",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json",
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json"
] as const;

type LogicalTargetPath = (typeof LOGICAL_TARGET_PATHS)[number];

const SOURCE_PREIMAGE_SHA256_BY_PATH: Record<LogicalTargetPath, string> = {
  "lib/hongKongQuestionVersioning.test.ts":
    "751b0381cc68b17487cc2dbcadad50b9f919e2590278ac0c3ef4769853b83402",
  "lib/server/hongKongHistoricalQuestionProjection.test.ts":
    "197df7e56e964210341cdeb50b4ae8fc14c985d74eed5b991f85e768f093b22e",
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts":
    "0c6b677d07f473bbe81692cecdca1fbda1f6240cd19a0583a17b48046848d506",
  "lib/hongKongResidual47RepairContract.test.ts":
    "143db278d2a924b992d26e3be00918dcb7b41ceb40da8f54a521d95bf4da3fbb",
  "lib/server/hongKongEaseResponseContracts.test.ts":
    "01156ab629d631a7ba4e53f789877d90f7ef66be69728d29a4cf715d6fd7dbc5",
  "lib/hongKongResidual47FocusedTestLedger.ts":
    "6b79ac5f0df83bb8d416abecb23f53706542b5e34c6b8cf1fcbbb263a3586a96",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json":
    "3db51ff0c238675293ae7d3a7ee214f7f6511c3552d904ea5a005fa791bef94b",
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json":
    "aa9ef44b07f6c452090f312c77a43b7384bbaae5684e1c6137c46b1542e00bfe"
};

const EXPECTED_POSTIMAGE_BINDING_BY_PATH: Record<
  LogicalTargetPath,
  { sha256: string; byteLength: number }
> = {
  "lib/hongKongQuestionVersioning.test.ts": {
    sha256: "4e2640bf0d4fd0b28fb3186e73625022b0d00989e0380ed1a5304e38b64b6128",
    byteLength: 11553
  },
  "lib/server/hongKongHistoricalQuestionProjection.test.ts": {
    sha256: "abeb79cb4c2b437bb687ac09b63fd948959ddd30428d0734ce91aabc35c4b963",
    byteLength: 15819
  },
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts": {
    sha256: "bb77a21004cdfd9eb8eb2d07b37fb134e0c82d19f45e5a0afc605e454cffa869",
    byteLength: 41477
  },
  "lib/hongKongResidual47RepairContract.test.ts": {
    sha256: "1600b6131f448720223b7ad41592c4912e52f8a08406ce57f590c19fefcde800",
    byteLength: 50343
  },
  "lib/server/hongKongEaseResponseContracts.test.ts": {
    sha256: "b71f2b6780895cb303033fbe1879a05515fc174102350d8081c0412c1ac31026",
    byteLength: 22626
  },
  "lib/hongKongResidual47FocusedTestLedger.ts": {
    sha256: "2c20817b6c96b42ed5a89972c7ea4d084205538a2d35f5278f2dddd3a38b3c63",
    byteLength: 8088
  },
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json": {
    sha256: "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0",
    byteLength: 1632
  },
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json": {
    sha256: "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91",
    byteLength: 1307
  }
};

const SNAPSHOT_BASENAME_BY_TARGET: Record<LogicalTargetPath, string> = {
  "lib/hongKongQuestionVersioning.test.ts": "lib-hongKongQuestionVersioning.test.ts.snapshot",
  "lib/server/hongKongHistoricalQuestionProjection.test.ts":
    "lib-server-hongKongHistoricalQuestionProjection.test.ts.snapshot",
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts":
    "lib-hongKongDisplayed74FigureHistoryContract.test.ts.snapshot",
  "lib/hongKongResidual47RepairContract.test.ts":
    "lib-hongKongResidual47RepairContract.test.ts.snapshot",
  "lib/server/hongKongEaseResponseContracts.test.ts":
    "lib-server-hongKongEaseResponseContracts.test.ts.snapshot",
  "lib/hongKongResidual47FocusedTestLedger.ts":
    "lib-hongKongResidual47FocusedTestLedger.ts.snapshot",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json":
    "hk-residual47-focused-test-ledger.json.snapshot",
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json":
    "hk-ease-response-focused-test-ledger.json.snapshot"
};

export type HongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs = {
  repositoryRoot: string;
  sourcePreimages: Record<LogicalTargetPath, string>;
  dataPlaneAuthority: JsonRecord;
  runtimeAuthority: JsonRecord;
  residual28VersionManifestPreimage: string;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function prettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function readText(repositoryRoot: string, relativePath: string) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("PHASE2B3_INPUT_NOT_REGULAR", relativePath);
  return readFileSync(absolutePath, "utf8");
}

function readJson(repositoryRoot: string, relativePath: string) {
  return JSON.parse(readText(repositoryRoot, relativePath)) as JsonRecord;
}

function replaceOnce(source: string, before: string, after: string, label: string) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) fail("PHASE2B3_SOURCE_ANCHOR_DRIFT", `${label}:${first < 0 ? 0 : 2}`);
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function sourceSha(repositoryRoot: string, relativePath: string) {
  return sha256(readText(repositoryRoot, relativePath));
}

function canonicalLedgerNameHash(ledger: JsonRecord) {
  const keys = (ledger.suites as JsonRecord[]).flatMap((suite) =>
    (suite.testNames as string[]).map((name) => `${suite.suiteId}\0${name}`)
  );
  return sha256(JSON.stringify(keys.sort()));
}

function assertAuthority(
  authority: JsonRecord,
  expectedSha256: string,
  expectedPayloadSha256: string,
  expectedSchema: string,
  expectedStatus: string,
  errorCode: string
) {
  if (sha256(prettyJson(authority)) !== expectedSha256) fail(errorCode, "file-sha256");
  const { authorityPayloadSha256, ...payload } = authority;
  if (
    authority.schemaVersion !== expectedSchema ||
    authority.status !== expectedStatus ||
    authorityPayloadSha256 !== expectedPayloadSha256 ||
    sha256(JSON.stringify(payload)) !== expectedPayloadSha256
  ) fail(errorCode, "payload");
}

function assertInputs(inputs: HongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs) {
  for (const path of LOGICAL_TARGET_PATHS) {
    if (sha256(inputs.sourcePreimages[path]) !== SOURCE_PREIMAGE_SHA256_BY_PATH[path]) {
      fail("PHASE2B3_SOURCE_PREIMAGE_DRIFT", path);
    }
  }
  assertAuthority(
    inputs.dataPlaneAuthority,
    DATA_AUTHORITY_SHA256,
    DATA_AUTHORITY_PAYLOAD_SHA256,
    "hk-ease-exact3-phase2b-data-plane-candidate-hold-authority-v1",
    "candidate-hold-not-promotable-until-phase3",
    "PHASE2B3_DATA_AUTHORITY_DRIFT"
  );
  assertAuthority(
    inputs.runtimeAuthority,
    RUNTIME_AUTHORITY_SHA256,
    RUNTIME_AUTHORITY_PAYLOAD_SHA256,
    "hk-ease-exact3-phase2b-serving-runtime-candidate-hold-authority-v1",
    "candidate-hold-not-live-promotion",
    "PHASE2B3_RUNTIME_AUTHORITY_DRIFT"
  );
  if (sha256(inputs.residual28VersionManifestPreimage) !== RESIDUAL28_VERSION_MANIFEST_PREIMAGE_SHA256) {
    fail("PHASE2B3_RESIDUAL28_MANIFEST_PREIMAGE_DRIFT", "sha256");
  }
  const manifest = JSON.parse(inputs.residual28VersionManifestPreimage) as JsonRecord;
  if (
    manifest.schemaVersion !== 1 ||
    Object.keys(manifest.activeIdByHistoricalId ?? {}).length !== 1108 ||
    !Array.isArray(manifest.retiredHistoricalIds) ||
    manifest.retiredHistoricalIds.length !== 1109
  ) fail("PHASE2B3_RESIDUAL28_MANIFEST_PREIMAGE_DRIFT", "shape");
}

export function loadHongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs(
  repositoryRoot = process.cwd()
): HongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs {
  return {
    repositoryRoot,
    sourcePreimages: Object.fromEntries(
      LOGICAL_TARGET_PATHS.map((path) => [path, readText(repositoryRoot, path)])
    ) as Record<LogicalTargetPath, string>,
    dataPlaneAuthority: readJson(repositoryRoot, DATA_AUTHORITY_PATH),
    runtimeAuthority: readJson(repositoryRoot, RUNTIME_AUTHORITY_PATH),
    residual28VersionManifestPreimage: readText(repositoryRoot, RESIDUAL28_VERSION_MANIFEST_PREIMAGE_PATH)
  };
}

function buildResidualLedger(source: string) {
  const ledger = JSON.parse(source) as JsonRecord;
  if (
    ledger.schemaVersion !== "hk-residual47-focused-test-ledger-v1" ||
    ledger.expectedSuiteCount !== 1 ||
    ledger.expectedFocusedTestCount !== 10 ||
    ledger.testNameSha256 !== "15b9041caf9984415f8998aabf6b27793a7ee918f5212a685209b0bf5031faab" ||
    ledger.suites?.[0]?.testNames?.[6] !==
      "the immutable resolver adds exactly 27 unique residual preimages and exposes all 1788 generations"
  ) fail("PHASE2B3_RESIDUAL_LEDGER_PREIMAGE_DRIFT");
  ledger.suites[0].testNames[6] =
    "the immutable resolver adds exactly 27 unique residual preimages and exposes all 1791 generations";
  ledger.testNameSha256 = canonicalLedgerNameHash(ledger);
  if (ledger.testNameSha256 !== "d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd") {
    fail("PHASE2B3_RESIDUAL_LEDGER_POSTIMAGE_DRIFT");
  }
  const postimage = prettyJson(ledger);
  if (sha256(postimage) !== "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0") {
    fail("PHASE2B3_RESIDUAL_LEDGER_POSTIMAGE_DRIFT", "file-sha256");
  }
  return postimage;
}

function buildEaseLedger(source: string) {
  const ledger = JSON.parse(source) as JsonRecord;
  if (
    ledger.schemaVersion !== "hk-ease-response-focused-test-ledger-v1" ||
    ledger.expectedSuiteCount !== 1 ||
    ledger.expectedFocusedTestCount !== 7 ||
    ledger.testNameSha256 !== "c93bfe5772aa5cc556b220746d93dbc395e4f095b80deaa30ffab0f702737923"
  ) fail("PHASE2B3_EASE_LEDGER_PREIMAGE_DRIFT");
  ledger.suites[0].testNames[3] =
    "all 584 positive EASE contract probes and all 1912 stored accepted forms pass through production grading";
  ledger.suites[0].testNames[4] =
    "all 581 negative EASE contract probes fail closed through production grading";
  ledger.testNameSha256 = canonicalLedgerNameHash(ledger);
  if (ledger.testNameSha256 !== "38d338428107012f5813a051e84afec2c04e8b0a048e54186b419a7475db8b1a") {
    fail("PHASE2B3_EASE_LEDGER_POSTIMAGE_DRIFT");
  }
  const postimage = prettyJson(ledger);
  if (sha256(postimage) !== "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91") {
    fail("PHASE2B3_EASE_LEDGER_POSTIMAGE_DRIFT", "file-sha256");
  }
  return postimage;
}

function buildVersioningTest(source: string) {
  let result = replaceOnce(
    source,
    "  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n",
    "  HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,\n" +
      "  HONG_KONG_EASE_V2_HISTORY_SOURCE_PACKAGE_SHA256,\n" +
      "  HONG_KONG_QUESTION_HISTORY_SOURCE_COMMIT,\n",
    "versioning-test-exact3-source-sha-import"
  );
  result = replaceOnce(
    result,
    "  easeV2HistoricalHongKongQuestions,\n",
    "  easeExact3V3HistoricalHongKongQuestions,\n  easeV2HistoricalHongKongQuestions,\n",
    "versioning-test-exact3-history-import"
  );
  result = replaceOnce(
    result,
    '    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1"\n  );\n});\n\ntest("materially changed same-ID HK questions receive a new active ID and retire the old ID",',
    '    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1"\n' +
      '  );\n' +
      '  assert.equal(\n' +
      '    HONG_KONG_EASE_EXACT3_V3_HISTORY_SOURCE_PACKAGE_SHA256,\n' +
      '    "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b"\n' +
      '  );\n' +
      '  assert.deepEqual(\n' +
      '    easeExact3V3HistoricalHongKongQuestions.map((question) => question.id),\n' +
      '    ["hk-ease-10481-v3", "hk-ease-10496-v3", "hk-ease-1041-v3"]\n' +
      '  );\n' +
      '  for (const question of easeExact3V3HistoricalHongKongQuestions) {\n' +
      '    assert.deepEqual(historicalHongKongQuestionForId(question.id), question);\n' +
      '  }\n' +
      '});\n\n' +
      'test("materially changed same-ID HK questions receive a new active ID and retire the old ID",',
    "versioning-test-exact3-history-assertions"
  );
  result = replaceOnce(result, "length, 617);", "length, 614);", "versioning-test-v2-count");
  result = replaceOnce(result, "length, 84);", "length, 87);", "versioning-test-v3-count");
  result = replaceOnce(
    result,
    "  const promotedBaseIds = activeEase\n",
    '  const exact3BaseIds = new Set(["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);\n' +
      '  for (const baseId of exact3BaseIds) {\n' +
      '    const active = activeEase.find((question) => question.id === `${baseId}-v3`);\n' +
      '    const frozen = easeExact3V3HistoricalHongKongQuestions.find(\n' +
      '      (question) => question.id === `${baseId}-v3`\n' +
      '    );\n' +
      '    assert.ok(active, `${baseId}: missing exact3 active v3`);\n' +
      '    assert.ok(frozen, `${baseId}: missing exact3 frozen v3`);\n' +
      '    assert.equal(questionMaterialFingerprint(active), questionMaterialFingerprint(frozen));\n' +
      '  }\n\n' +
      "  const promotedBaseIds = activeEase\n",
    "versioning-test-exact3-active-assertions"
  );
  result = replaceOnce(
    result,
    '    .filter((baseId) => baseId !== "hk-ease-10672" && baseId !== "hk-ease-1129")\n',
    '    .filter((baseId) => baseId !== "hk-ease-10672" && baseId !== "hk-ease-1129")\n' +
      '    .filter((baseId) => !exact3BaseIds.has(baseId))\n',
    "versioning-test-residual82-partition"
  );
  return result;
}

function buildProjectionTest(source: string) {
  return replaceOnce(
    source,
    "assert.equal(retiredHongKongQuestionIds.size, 1109);",
    "assert.equal(retiredHongKongQuestionIds.size, 1112);",
    "projection-test-retired-count"
  );
}

function buildDisplayedHistoryTest(source: string) {
  let result = replaceOnce(
    source,
    'import versionManifest from "@/data/historical/hongKongQuestionVersionManifest.json";',
    `import versionManifest from "@/${RESIDUAL28_VERSION_MANIFEST_PREIMAGE_PATH}";`,
    "displayed-test-residual28-manifest-preimage"
  );
  result = replaceOnce(
    result,
    "  // Reconstruct the complete pre-promotion compact manifest from the live\n  // postimage and the exact production promotion map.",
    "  // Reconstruct the complete pre-promotion compact manifest from the immutable\n  // residual28 postimage and the exact production promotion map.",
    "displayed-test-historical-comment"
  );
  return result;
}

function buildResidualTest(source: string) {
  let result = replaceOnce(
    source,
    "  easeV2HistoricalHongKongQuestions,\n  historicalHongKongQuestionForId,\n",
    "  easeExact3V3HistoricalHongKongQuestions,\n" +
      "  easeV2HistoricalHongKongQuestions,\n" +
      "  historicalHongKongQuestionForId,\n",
    "residual-test-exact3-history-import"
  );
  result = replaceOnce(
    result,
    "    ...easeV2HistoricalHongKongQuestions.map((question) => question.id),\n" +
      "    ...(displayed74SnapshotJson.questions as Question[]).map((question) => question.id),\n",
    "    ...easeV2HistoricalHongKongQuestions.map((question) => question.id),\n" +
      "    ...easeExact3V3HistoricalHongKongQuestions.map((question) => question.id),\n" +
      "    ...(displayed74SnapshotJson.questions as Question[]).map((question) => question.id),\n",
    "residual-test-exact3-history-enumeration"
  );
  const replacements: Array<[string, string, string]> = [
    ["assert.equal(activeHongKongQuestionIdByHistoricalId.size, 1108);", "assert.equal(activeHongKongQuestionIdByHistoricalId.size, 1111);", "residual-test-runtime-map-count"],
    ["assert.equal(retiredHongKongQuestionIds.size, 1109);", "assert.equal(retiredHongKongQuestionIds.size, 1112);", "residual-test-runtime-retired-count"],
    ["assert.equal(Object.keys(versionManifestJson.activeIdByHistoricalId).length, 1108);", "assert.equal(Object.keys(versionManifestJson.activeIdByHistoricalId).length, 1111);", "residual-test-manifest-map-count"],
    ["assert.equal(versionManifestJson.retiredHistoricalIds.length, 1109);", "assert.equal(versionManifestJson.retiredHistoricalIds.length, 1112);", "residual-test-manifest-retired-count"],
    ["the immutable resolver adds exactly 27 unique residual preimages and exposes all 1788 generations", "the immutable resolver adds exactly 27 unique residual preimages and exposes all 1791 generations", "residual-test-name"],
    ["assert.equal(uniqueIds.size, 1788);", "assert.equal(uniqueIds.size, 1791);", "residual-test-history-count"]
  ];
  for (const [before, after, label] of replacements) result = replaceOnce(result, before, after, label);
  return result;
}

function buildResponseTest(source: string) {
  let result = source;
  const replacements: Array<[string, string, string]> = [
    ["all 552 positive EASE contract probes and all 1896 stored accepted forms pass through production grading", "all 584 positive EASE contract probes and all 1912 stored accepted forms pass through production grading", "response-test-positive-name"],
    ["all 554 negative EASE contract probes fail closed through production grading", "all 581 negative EASE contract probes fail closed through production grading", "response-test-negative-name"],
    ["25525ae2f602ef83b6731464e05eca8931c4fe1dd5f1118aedf3a7f8cdfafb29", "e6704e246a807d176edcea4dde99c9fc834d4400ee1cee1d6f1a675a47b7107b", "response-test-bare-name-hash"],
    ["responseManifest.candidateSha256, \"fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2\"", "responseManifest.candidateSha256, \"afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf\"", "response-test-pack-sha"],
    ["responseManifest.auditSha256, \"3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28\"", "responseManifest.auditSha256, \"3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a\"", "response-test-audit-sha"],
    ["assert.equal(responseManifest.positiveProbeCount, 552);", "assert.equal(responseManifest.positiveProbeCount, 584);", "response-test-manifest-positive-count"],
    ["assert.equal(responseManifest.negativeProbeCount, 554);", "assert.equal(responseManifest.negativeProbeCount, 581);", "response-test-manifest-negative-count"],
    ["assert.equal(probes, 552);", "assert.equal(probes, 584);", "response-test-positive-count"],
    ["assert.equal(storedAcceptedForms, 1896);", "assert.equal(storedAcceptedForms, 1912);", "response-test-accepted-count"],
    ["assert.equal(probes, 554);", "assert.equal(probes, 581);", "response-test-negative-count"]
  ];
  for (const [before, after, label] of replacements) result = replaceOnce(result, before, after, label);
  return result;
}

function buildResidualRegistrar(source: string) {
  let result = replaceOnce(
    source,
    "3db51ff0c238675293ae7d3a7ee214f7f6511c3552d904ea5a005fa791bef94b",
    "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0",
    "residual-registrar-ledger-file-sha"
  );
  result = replaceOnce(
    result,
    "15b9041caf9984415f8998aabf6b27793a7ee918f5212a685209b0bf5031faab",
    "d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd",
    "residual-registrar-name-sha"
  );
  return result;
}

function buildPostimages(inputs: HongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs) {
  return {
    "lib/hongKongQuestionVersioning.test.ts":
      buildVersioningTest(inputs.sourcePreimages["lib/hongKongQuestionVersioning.test.ts"]),
    "lib/server/hongKongHistoricalQuestionProjection.test.ts":
      buildProjectionTest(inputs.sourcePreimages["lib/server/hongKongHistoricalQuestionProjection.test.ts"]),
    "lib/hongKongDisplayed74FigureHistoryContract.test.ts":
      buildDisplayedHistoryTest(inputs.sourcePreimages["lib/hongKongDisplayed74FigureHistoryContract.test.ts"]),
    "lib/hongKongResidual47RepairContract.test.ts":
      buildResidualTest(inputs.sourcePreimages["lib/hongKongResidual47RepairContract.test.ts"]),
    "lib/server/hongKongEaseResponseContracts.test.ts":
      buildResponseTest(inputs.sourcePreimages["lib/server/hongKongEaseResponseContracts.test.ts"]),
    "lib/hongKongResidual47FocusedTestLedger.ts":
      buildResidualRegistrar(inputs.sourcePreimages["lib/hongKongResidual47FocusedTestLedger.ts"]),
    "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json":
      buildResidualLedger(inputs.sourcePreimages[
        "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json"
      ]),
    "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json":
      buildEaseLedger(inputs.sourcePreimages[
        "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json"
      ])
  } satisfies Record<LogicalTargetPath, string>;
}

export function buildHongKongEaseExact3Phase2BHistoricalRegressionCandidateFromInputs(
  inputs: HongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs
) {
  assertInputs(inputs);
  const postimages = buildPostimages(inputs);
  for (const logicalTargetPath of LOGICAL_TARGET_PATHS) {
    const expected = EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath];
    if (
      sha256(postimages[logicalTargetPath]) !== expected.sha256 ||
      Buffer.byteLength(postimages[logicalTargetPath]) !== expected.byteLength
    ) fail("PHASE2B3_POSTIMAGE_DRIFT", logicalTargetPath);
  }
  return {
    schemaVersion: "hk-ease-exact3-phase2b-historical-regression-candidate-v1" as const,
    status: "candidate-hold-not-live-promotion" as const,
    postimages,
    postimageBindings: LOGICAL_TARGET_PATHS.map((logicalTargetPath) => ({
      logicalTargetPath,
      snapshotPath: `${HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY}/${SNAPSHOT_BASENAME_BY_TARGET[logicalTargetPath]}`,
      preimageSha256: SOURCE_PREIMAGE_SHA256_BY_PATH[logicalTargetPath],
      sha256: EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath].sha256,
      byteLength: EXPECTED_POSTIMAGE_BINDING_BY_PATH[logicalTargetPath].byteLength,
      classification: logicalTargetPath.endsWith(".json")
        ? "isolated-full-json-postimage-candidate" as const
        : "isolated-full-typescript-test-postimage-candidate" as const
    }))
  };
}

export function buildHongKongEaseExact3Phase2BHistoricalRegressionCandidate(
  repositoryRoot = process.cwd()
) {
  return buildHongKongEaseExact3Phase2BHistoricalRegressionCandidateFromInputs(
    loadHongKongEaseExact3Phase2BHistoricalRegressionCandidateInputs(repositoryRoot)
  );
}

function buildAuthority(
  repositoryRoot: string,
  candidate: ReturnType<typeof buildHongKongEaseExact3Phase2BHistoricalRegressionCandidateFromInputs>
) {
  const payload = {
    schemaVersion: "hk-ease-exact3-phase2b-historical-regression-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    builderBinding: { path: BUILDER_PATH, sha256: sourceSha(repositoryRoot, BUILDER_PATH) },
    focusedTestBinding: { path: FOCUSED_TEST_PATH, sha256: sourceSha(repositoryRoot, FOCUSED_TEST_PATH) },
    priorAuthorityBindings: [
      { path: DATA_AUTHORITY_PATH, sha256: DATA_AUTHORITY_SHA256, authorityPayloadSha256: DATA_AUTHORITY_PAYLOAD_SHA256 },
      { path: RUNTIME_AUTHORITY_PATH, sha256: RUNTIME_AUTHORITY_SHA256, authorityPayloadSha256: RUNTIME_AUTHORITY_PAYLOAD_SHA256 }
    ],
    residual28VersionManifestPreimageBinding: {
      path: RESIDUAL28_VERSION_MANIFEST_PREIMAGE_PATH,
      sha256: RESIDUAL28_VERSION_MANIFEST_PREIMAGE_SHA256,
      role: "immutable-historical-reconstruction-input-not-current-live-manifest"
    },
    sourcePreimageBindings: LOGICAL_TARGET_PATHS.map((path) => ({
      path,
      sha256: SOURCE_PREIMAGE_SHA256_BY_PATH[path]
    })),
    outputPolicy: {
      exactPostimageCount: 8,
      exactControlArtifactCount: 1,
      fullPostimagesOnly: true,
      fileMode: "0444"
    },
    outputBindings: candidate.postimageBindings,
    promotion: {
      liveTestMutationAuthorized: false,
      liveLedgerMutationAuthorized: false,
      canonicalRunnerIntegrationAuthorized: false,
      fullBankIntegrationAuthorized: false,
      v4RegenerationAuthorized: false,
      browserAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "shadow execution of all candidate historical and response tests",
        "focused-ledger and canonical-runner source-binding update",
        "V4 exact3 regeneration and independent re-review",
        "full-bank, browser, and release evidence"
      ]
    }
  };
  return { ...payload, authorityPayloadSha256: sha256(JSON.stringify(payload)) };
}

function serializedCandidate(repositoryRoot: string) {
  const candidate = buildHongKongEaseExact3Phase2BHistoricalRegressionCandidate(repositoryRoot);
  const serialized: Record<string, string> = {};
  for (const binding of candidate.postimageBindings) {
    serialized[binding.snapshotPath] = candidate.postimages[binding.logicalTargetPath];
  }
  serialized[
    `${HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_DIRECTORY}/historical-regression-hold-authority-v1.json`
  ] = prettyJson(buildAuthority(repositoryRoot, candidate));
  return { candidate, serialized };
}

export function materializeHongKongEaseExact3Phase2BHistoricalRegressionCandidate(
  repositoryRoot = process.cwd()
) {
  const { candidate, serialized } = serializedCandidate(repositoryRoot);
  for (const [relativePath, expectedBytes] of Object.entries(serialized)) {
    const absolutePath = resolve(repositoryRoot, relativePath);
    if (existsSync(absolutePath)) {
      const stat = lstatSync(absolutePath);
      if (
        !stat.isFile() ||
        stat.isSymbolicLink() ||
        readFileSync(absolutePath, "utf8") !== expectedBytes ||
        (stat.mode & 0o777) !== 0o444
      ) fail("PHASE2B3_MATERIALIZATION_COLLISION", relativePath);
      continue;
    }
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, expectedBytes, { encoding: "utf8", flag: "wx", mode: 0o444 });
    chmodSync(absolutePath, 0o444);
  }
  return candidate;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  materializeHongKongEaseExact3Phase2BHistoricalRegressionCandidate(process.cwd());
}

export const HONG_KONG_EASE_EXACT3_PHASE2B_HISTORICAL_CANDIDATE_MODULE_URL =
  pathToFileURL(fileURLToPath(import.meta.url)).href;
