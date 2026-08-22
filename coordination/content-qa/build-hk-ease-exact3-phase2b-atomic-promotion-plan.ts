import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  type Stats
} from "node:fs";
import {
  dirname,
  isAbsolute,
  normalize,
  relative,
  resolve,
  sep
} from "node:path";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, any>;

export type PromotionFileCapture = {
  path: string;
  exists: boolean;
  regularFile: boolean;
  symbolicLink: boolean;
  mode: string | null;
  sha256: string | null;
  byteLength: number;
  bytesBase64: string | null;
};

export type AtomicPromotionOperationSpec = {
  sourceAuthorityId: string;
  operation: "replace-existing" | "create-new";
  logicalTargetPath: string;
  preimageSha256: string | null;
  preimagePhysicalPath?: string;
  candidatePhysicalPath: string;
  candidateSha256: string;
  candidateByteLength: number;
};

type AuthoritySpec = {
  id: string;
  path: string;
  sha256: string;
  schemaVersion: string;
  status: string;
  outputCount: number;
};

const HEX64 = /^[0-9a-f]{64}$/;
const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-atomic-promotion-plan.ts";
const TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-atomic-promotion-plan-candidate.test.ts";
const OUTPUT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-atomic-promotion-plan-candidate-v2";

export const HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH =
  `${OUTPUT_DIRECTORY}/atomic-promotion-plan-v1.json`;
export const HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH =
  `${OUTPUT_DIRECTORY}/atomic-promotion-plan-hold-authority-v1.json`;
export const HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_EXPECTED_OPERATION_COUNT = 32;

const INDEPENDENT_RECEIPT = {
  path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-independent-oracle-overlay-review-v2.json",
  sha256: "0aacfce318a7839f44beba7d3d5f6722e11a129b4ee6f8a3ac770b712382cd2e",
  detachedPayloadSha256: "c0387a5f0ea824510ab24d84f8e062a289354e8731caa3acde9320f30ecd825b"
} as const;

const AUTHORITY_SPECS: AuthoritySpec[] = [
  {
    id: "phase2b-data-plane",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate/candidate-hold-authority-v1.json",
    sha256: "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16",
    schemaVersion: "hk-ease-exact3-phase2b-data-plane-candidate-hold-authority-v1",
    status: "candidate-hold-not-promotable-until-phase3",
    outputCount: 7
  },
  {
    id: "phase2b-runtime",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate/runtime-hold-authority-v1.json",
    sha256: "980ab2f3ec057a9f09d2fa2faccd787b9c9f03de838efa78eaa8b48056e26013",
    schemaVersion: "hk-ease-exact3-phase2b-serving-runtime-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    outputCount: 4
  },
  {
    id: "phase2b-historical-regression",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-historical-regression-candidate/historical-regression-hold-authority-v1.json",
    sha256: "cef3e6916ed0c050d4843fb71ed9005f4830df1dabebd76a95ab6ee16e14a1ea",
    schemaVersion: "hk-ease-exact3-phase2b-historical-regression-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    outputCount: 8
  },
  {
    id: "phase2b-v4-lineage",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate/candidate-hold-authority-v1.json",
    sha256: "14af10dc5cfdb24e1f4dfda4678aa9c88819f7afac7eaaa377c2d845bc383948",
    schemaVersion: "hk-ease-exact3-v4-lineage-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    outputCount: 8
  },
  {
    id: "phase2b-fullbank",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-fullbank-candidate/fullbank-hold-authority-v1.json",
    sha256: "f4d302234a7163f40e599c4c96fa158ffcb4ef696ffe6c5315ba174140ce6e73",
    schemaVersion: "hk-ease-exact3-phase2b-fullbank-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    outputCount: 3
  },
  {
    id: "phase2b-canonical241",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/canonical241-hold-authority-v1.json",
    sha256: "6c7bb255da043e19d7c71c75184bfa7ea34e7929ebc18ed1c1249a77c563436c",
    schemaVersion: "hk-ease-exact3-phase2b-canonical241-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    outputCount: 3
  }
];

export const HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS = [
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate/generation-shadow-bridge.ts.snapshot"
];

const operation = (
  sourceAuthorityId: string,
  logicalTargetPath: string,
  preimageSha256: string | null,
  candidatePhysicalPath: string,
  candidateSha256: string,
  candidateByteLength: number,
  preimagePhysicalPath?: string
): AtomicPromotionOperationSpec => ({
  sourceAuthorityId,
  operation: preimageSha256 === null ? "create-new" : "replace-existing",
  logicalTargetPath,
  preimageSha256,
  ...(preimagePhysicalPath === undefined ? {} : { preimagePhysicalPath }),
  candidatePhysicalPath,
  candidateSha256,
  candidateByteLength
});

const DATA_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate";
const RUNTIME_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate";
const HISTORY_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-historical-regression-candidate";
const V4_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate";
const FULLBANK_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-fullbank-candidate";
const CANONICAL_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4";

export const HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS: AtomicPromotionOperationSpec[] = [
  operation("phase2b-data-plane",
    "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2",
    `${DATA_DIRECTORY}/full-question-pack-base-id-v1.json`,
    "afed98f9aca07951dffbc6ac8ce93bb6074629298c80ac848842bd7792fd7bdf", 1_435_398),
  operation("phase2b-data-plane",
    "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28",
    `${DATA_DIRECTORY}/full-response-contract-audit-v1.json`,
    "3f5671299ecb88fd58e0d22c6241737a27cd7d3a1e8332da989eea1f3b15010a", 890_576),
  operation("phase2b-data-plane",
    "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4",
    `${DATA_DIRECTORY}/full-strict-response-contracts-v1.json`,
    "86333f5482a6a90da42c4ae12d575df8e2859409ff12de18032122a6c67c2b2c", 298_862),
  operation("phase2b-data-plane",
    "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
    "fdb823e7e0923eff7cabb569e171680965dfa6d1e9edce36567fb4bf24ebc597",
    `${DATA_DIRECTORY}/full-simple-response-contracts-v1.json`,
    "d5f226b600e98cd4cfa1df6497137a0844e0f9685d8f87e4a6e1130aaa5c3d41", 1_259_409),
  operation("phase2b-data-plane",
    "data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json",
    null,
    `${DATA_DIRECTORY}/independent-answer-oracle-exact3-overlay-supplement-v2.json`,
    "3b1b5b5a4e4034712086de8345b04e74e435f58e4c7c8ed73c5d801cfad4b19c", 8_718),
  operation("phase2b-data-plane",
    "data/historical/hongKongQuestions-hk-ease-exact3-v3.json",
    null,
    `${DATA_DIRECTORY}/v3-history-v1.json`,
    "e5a696da5e8d5e1cc31259a6736d6d9974c08fdf25a57298a6958ffcd11b440b", 13_338),
  operation("phase2b-data-plane",
    "data/historical/hongKongQuestionVersionManifest.json",
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92",
    `${DATA_DIRECTORY}/full-question-version-manifest-v1.json`,
    "abf8da2300978b554efa07d96c5b70e721a9f0977e190a3f86105388591dfe8d", 84_368),

  operation("phase2b-runtime", "data/hongKongEasePracticeQuestions.ts",
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137",
    `${RUNTIME_DIRECTORY}/data-hongKongEasePracticeQuestions.ts.snapshot`,
    "692872955440282bd21426e1fa04e18368ae91b8d3b516bc0fdb97b568cb3dff", 27_329),
  operation("phase2b-runtime", "lib/hongKongQuestionVersioningContract.ts",
    "226230450e87dbefa7c89358d8121dac187b212aaba2738f2ccf18f5b13e844d",
    `${RUNTIME_DIRECTORY}/lib-hongKongQuestionVersioningContract.ts.snapshot`,
    "8c450a89cb767b4864a6c739dd4849c69616245c86f0a36a4db8554a5044fd0a", 558),
  operation("phase2b-runtime", "lib/hongKongQuestionVersioning.ts",
    "66ef792de4ddb2bc6512217fe24a919284c24a5b5dbfb88cb03dcfd2a08a33f1",
    `${RUNTIME_DIRECTORY}/lib-hongKongQuestionVersioning.ts.snapshot`,
    "43001bbdc9a57db6ef3c90aa8bd42913baea6180653436135d94227258252df4", 25_687),
  operation("phase2b-runtime", "lib/server/hongKongEaseResponseContracts.ts",
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1",
    `${RUNTIME_DIRECTORY}/lib-server-hongKongEaseResponseContracts.ts.snapshot`,
    "c3f462f619b0b90bf4a5a98475367927a7209a21300d59695b6e0a3ea97f03dd", 80_546),

  operation("phase2b-historical-regression", "lib/hongKongQuestionVersioning.test.ts",
    "751b0381cc68b17487cc2dbcadad50b9f919e2590278ac0c3ef4769853b83402",
    `${HISTORY_DIRECTORY}/lib-hongKongQuestionVersioning.test.ts.snapshot`,
    "4e2640bf0d4fd0b28fb3186e73625022b0d00989e0380ed1a5304e38b64b6128", 11_553),
  operation("phase2b-historical-regression", "lib/server/hongKongHistoricalQuestionProjection.test.ts",
    "197df7e56e964210341cdeb50b4ae8fc14c985d74eed5b991f85e768f093b22e",
    `${HISTORY_DIRECTORY}/lib-server-hongKongHistoricalQuestionProjection.test.ts.snapshot`,
    "abeb79cb4c2b437bb687ac09b63fd948959ddd30428d0734ce91aabc35c4b963", 15_819),
  operation("phase2b-historical-regression", "lib/hongKongDisplayed74FigureHistoryContract.test.ts",
    "0c6b677d07f473bbe81692cecdca1fbda1f6240cd19a0583a17b48046848d506",
    `${HISTORY_DIRECTORY}/lib-hongKongDisplayed74FigureHistoryContract.test.ts.snapshot`,
    "bb77a21004cdfd9eb8eb2d07b37fb134e0c82d19f45e5a0afc605e454cffa869", 41_477),
  operation("phase2b-historical-regression", "lib/hongKongResidual47RepairContract.test.ts",
    "143db278d2a924b992d26e3be00918dcb7b41ceb40da8f54a521d95bf4da3fbb",
    `${HISTORY_DIRECTORY}/lib-hongKongResidual47RepairContract.test.ts.snapshot`,
    "1600b6131f448720223b7ad41592c4912e52f8a08406ce57f590c19fefcde800", 50_343),
  operation("phase2b-historical-regression", "lib/server/hongKongEaseResponseContracts.test.ts",
    "01156ab629d631a7ba4e53f789877d90f7ef66be69728d29a4cf715d6fd7dbc5",
    `${HISTORY_DIRECTORY}/lib-server-hongKongEaseResponseContracts.test.ts.snapshot`,
    "b71f2b6780895cb303033fbe1879a05515fc174102350d8081c0412c1ac31026", 22_626),
  operation("phase2b-historical-regression", "lib/hongKongResidual47FocusedTestLedger.ts",
    "6b79ac5f0df83bb8d416abecb23f53706542b5e34c6b8cf1fcbbb263a3586a96",
    `${HISTORY_DIRECTORY}/lib-hongKongResidual47FocusedTestLedger.ts.snapshot`,
    "2c20817b6c96b42ed5a89972c7ea4d084205538a2d35f5278f2dddd3a38b3c63", 8_088),
  operation("phase2b-historical-regression",
    "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json",
    "3db51ff0c238675293ae7d3a7ee214f7f6511c3552d904ea5a005fa791bef94b",
    `${HISTORY_DIRECTORY}/hk-residual47-focused-test-ledger.json.snapshot`,
    "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0", 1_632),
  operation("phase2b-historical-regression",
    "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json",
    "aa9ef44b07f6c452090f312c77a43b7384bbaae5684e1c6137c46b1542e00bfe",
    `${HISTORY_DIRECTORY}/hk-ease-response-focused-test-ledger.json.snapshot`,
    "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91", 1_307),

  operation("phase2b-v4-lineage",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
    "1b36361daad78bbd54d1e8a42d1e58dbdd8b62ab65638783a8697943ddf10634",
    `${V4_DIRECTORY}/v4-sanitized-derivation-input-exact3-v1.json`,
    "54e9861f4fe6963e005752dbe5f741fed8ba71b8596eec8d80d365fc46ad0cfb", 406_616),
  operation("phase2b-v4-lineage",
    "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
    "6322b360ff71778fb7611190b7bf5a0a8f4be64287e2c5b3e7744ece4e3e57c6",
    `${V4_DIRECTORY}/v4-row-specific-derivation-supplement-exact3-v1.json`,
    "2eec0d9b7ce7adf06d9f50d1dfa30738df9a8d97481d09c0458ad9023eca181e", 4_313_462),
  operation("phase2b-v4-lineage",
    "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
    "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d",
    `${V4_DIRECTORY}/independent-answer-oracle-v4-exact3-v1.json`,
    "236b6bf6342a9524869b2cff5562a35ef74efd9712456054f326f4e6b9a16844", 816_783),
  operation("phase2b-v4-lineage", "coordination/content-qa/build-hk-ease-derivation-input-v4.ts",
    "67b2265380d8f8dad92eec621d7a838853ebc46c47ae583da82ebcb5a7a054ab",
    `${V4_DIRECTORY}/build-hk-ease-derivation-input-v4-postimage.ts.snapshot`,
    "432f29c1bb455bc9b1a88d634e893cc3d59d9e033234d67f09c57279d4e67107", 6_732),
  operation("phase2b-v4-lineage", "coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement.ts",
    "459ee6c75f53de7ec4062d3a6224e1a50c4f66620ef4943d1bc93efc47272fab",
    `${V4_DIRECTORY}/build-hk-ease-independent-oracle-v4-supplement-postimage.ts.snapshot`,
    "fefa0d33056e0e28455df751129292bd650557499aed1fcf64bdb424087361c1", 202_692),
  operation("phase2b-v4-lineage", "coordination/content-qa/build-hk-ease-independent-oracle-v4.ts",
    "c04d59c92f7aefa8acb59d80fc1a147a511b32ba8dac778fa2a58da4d719522d",
    `${V4_DIRECTORY}/build-hk-ease-independent-oracle-v4-postimage.ts.snapshot`,
    "6132185bdd6fb314659a35dd5b0a6311c5a0011fcd20615412e2b7f2cd5f551f", 9_863),
  operation("phase2b-v4-lineage", "lib/hongKongEaseIndependentOracleV4.test.ts",
    "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472",
    `${V4_DIRECTORY}/lib-hongKongEaseIndependentOracleV4.test.ts.snapshot`,
    "459c89f15d073f50927b21605be093543e6e64ffede351734c23f1188251285a", 97_936),

  operation("phase2b-fullbank", "lib/questionBankSolvability.ts",
    "48970ce1a17231269fd03c35d257272b1a0b7fb60c346462cbf230df3d43984d",
    `${FULLBANK_DIRECTORY}/lib-questionBankSolvability.ts.snapshot`,
    "2b400503b0cb9fb90e4627fd7e285e58c830b78ac2d22839b0fa5a16c0b69e7f", 107_715),
  operation("phase2b-fullbank", "lib/hongKongEaseIndependentOracle.ts",
    "0263947c3449d42f378ae721c555896b429fbfab309081229500eab6fb96045b",
    `${FULLBANK_DIRECTORY}/lib-hongKongEaseIndependentOracle.ts.snapshot`,
    "08c315e86ec0c0a917c4f7b9f85f6844b25e427807a44bc03ed6d2088a480b6c", 31_714),
  operation("phase2b-fullbank", "lib/fullQuestionBankSolvability.test.ts",
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c",
    `${FULLBANK_DIRECTORY}/lib-fullQuestionBankSolvability.test.ts.snapshot`,
    "1d1ed1c4fcaaae556b6ddde0dcdc4bed74f93add4ee2f0d445083672ba72c7f0", 32_604),

  operation("phase2b-canonical241", "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
    "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d",
    `${CANONICAL_DIRECTORY}/hk-question-bank-evidence-runner.mjs.snapshot`,
    "9b0b33739b1f4150d36dd03501e590b556350865c5c551c5f8f417cb40b67b4c", 115_714),
  operation("phase2b-canonical241", "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs",
    "b57fe6e21f614300d33452d9b140ba45e8af7567c9665a17ef997bf9244d03b5",
    `${CANONICAL_DIRECTORY}/hk-question-bank-evidence-runner.test.mjs.snapshot`,
    "820b1a4334cfdff756c1f97eb68e932ddc3b7bcafe9b84291a1d0db716eae0be", 59_308),
  operation("phase2b-canonical241", "lib/hongKongLessonQualityContract.test.ts",
    "15a54de50c52ac839b01f9560b8ddc475abdcde4163beb6abc9204f68ffdf557",
    `${CANONICAL_DIRECTORY}/lib-hongKongLessonQualityContract.test.ts.snapshot`,
    "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11", 45_108,
    `${CANONICAL_DIRECTORY}/lib-hongKongLessonQualityContract.test.ts.preimage.snapshot`)
];

for (const spec of HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS) {
  Object.freeze(spec);
}
Object.freeze(HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS);

const UNCHANGED_INVARIANTS: Record<string, string> = {
  "data/questions.ts":
    "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8",
  "lib/hongKongEaseIndependentOracleV4.ts":
    "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c",
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json":
    "8436f0c97fafe803f8fe6930cfa65f6363c4cb05174f7a2e7465d688a29d0d62",
  "data/historical/hongKongQuestions-hk-ease-39847.json":
    "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/declared-simple-ledger.json":
    "11ad86d97706a08379df4b75630bfe35e73a7e2dba257ce0e435044d03784284",
  "package.json":
    "60fc5dd020cc95fbead086f335d1f34287cc89517d44a0cb4a0acab9b939cfa1",
  "tsconfig.json":
    "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8"
};

function fail(code: string, detail: string): never {
  throw new Error(`${code}:${detail}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function modeString(stat: Stats): string {
  return (stat.mode & 0o777).toString(8).padStart(4, "0");
}

function assertStarshipRoot(root: string): string {
  const physicalRoot = realpathSync(resolve(root));
  if (physicalRoot !== "/Volumes/Starship" &&
      !physicalRoot.startsWith("/Volumes/Starship/")) {
    fail("PHASE2B_PROMOTION_PATH_INVALID", `root-outside-starship:${physicalRoot}`);
  }
  return physicalRoot;
}

function assertCanonicalRelativePath(path: string): void {
  if (path.length === 0 || isAbsolute(path) || path.includes("\\") ||
      normalize(path) !== path || path.split(sep).some((segment) =>
        segment.length === 0 || segment === "." || segment === "..")) {
    fail("PHASE2B_PROMOTION_PATH_INVALID", path);
  }
}

function assertWithinRoot(root: string, candidate: string): void {
  const relation = relative(root, candidate);
  if (relation === ".." || relation.startsWith(`..${sep}`) || isAbsolute(relation)) {
    fail("PHASE2B_PROMOTION_PATH_INVALID", candidate);
  }
}

function lstatOrNull(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function readHongKongEaseExact3PromotionFileCapture(
  root: string,
  path: string,
  expectedExistence: "present" | "absent"
): PromotionFileCapture {
  const physicalRoot = assertStarshipRoot(root);
  assertCanonicalRelativePath(path);
  const absolute = resolve(physicalRoot, path);
  assertWithinRoot(physicalRoot, absolute);
  const segments = path.split(sep);
  let cursor = physicalRoot;
  for (let index = 0; index < segments.length; index += 1) {
    const parent = cursor;
    cursor = resolve(cursor, segments[index]);
    const stat = lstatOrNull(cursor);
    const final = index === segments.length - 1;
    if (stat === null) {
      if (final && expectedExistence === "absent") {
        return {
          path,
          exists: false,
          regularFile: false,
          symbolicLink: false,
          mode: null,
          sha256: null,
          byteLength: 0,
          bytesBase64: null
        };
      }
      fail("PHASE2B_PROMOTION_PATH_INVALID", `missing:${path}`);
    }
    if (!readdirSync(parent).includes(segments[index])) {
      fail("PHASE2B_PROMOTION_PATH_INVALID", `case-mismatch:${path}`);
    }
    if (stat.isSymbolicLink()) {
      fail("PHASE2B_PROMOTION_PATH_INVALID", `symlink:${path}`);
    }
    if (!final && !stat.isDirectory()) {
      fail("PHASE2B_PROMOTION_PATH_INVALID", `non-directory-segment:${path}`);
    }
    if (final) {
      if (expectedExistence === "absent") {
        fail("PHASE2B_PROMOTION_CREATION_COLLISION", path);
      }
      if (!stat.isFile()) {
        fail("PHASE2B_PROMOTION_PATH_INVALID", `not-regular-file:${path}`);
      }
      const physicalFile = realpathSync(cursor);
      assertWithinRoot(physicalRoot, physicalFile);
      const bytes = readFileSync(physicalFile);
      return {
        path,
        exists: true,
        regularFile: true,
        symbolicLink: false,
        mode: modeString(stat),
        sha256: sha256(bytes),
        byteLength: bytes.byteLength,
        bytesBase64: bytes.toString("base64")
      };
    }
  }
  fail("PHASE2B_PROMOTION_PATH_INVALID", path);
}

function decodeAndValidateCapture(
  capture: PromotionFileCapture,
  expectedPath: string,
  expectedSha256: string,
  expectedByteLength: number | null,
  code: string
): Buffer {
  if (capture.path !== expectedPath || !capture.exists || !capture.regularFile ||
      capture.symbolicLink || typeof capture.bytesBase64 !== "string" ||
      typeof capture.sha256 !== "string" || !HEX64.test(capture.sha256)) {
    fail(code, expectedPath);
  }
  const bytes = Buffer.from(capture.bytesBase64, "base64");
  if (bytes.toString("base64") !== capture.bytesBase64 ||
      bytes.byteLength !== capture.byteLength ||
      sha256(bytes) !== capture.sha256 ||
      capture.sha256 !== expectedSha256 ||
      (expectedByteLength !== null && bytes.byteLength !== expectedByteLength)) {
    fail(code, expectedPath);
  }
  return bytes;
}

function validateAbsentCapture(capture: PromotionFileCapture, expectedPath: string): void {
  if (capture.path !== expectedPath || capture.exists || capture.regularFile ||
      capture.symbolicLink || capture.mode !== null || capture.sha256 !== null ||
      capture.byteLength !== 0 || capture.bytesBase64 !== null) {
    fail("PHASE2B_PROMOTION_CREATION_COLLISION", expectedPath);
  }
}

function authorityOutputPath(binding: JsonRecord): string {
  const path = binding.snapshotPath ?? binding.path;
  if (typeof path !== "string") {
    fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", "missing-output-path");
  }
  return path;
}

function validateAuthority(
  spec: AuthoritySpec,
  capture: PromotionFileCapture
): JsonRecord {
  const bytes = decodeAndValidateCapture(
    capture, spec.path, spec.sha256, null, "PHASE2B_PROMOTION_AUTHORITY_DRIFT"
  );
  if (capture.mode !== "0444") {
    fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `mode:${spec.path}`);
  }
  let authority: JsonRecord;
  try {
    authority = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `json:${spec.path}`);
  }
  if (authority.schemaVersion !== spec.schemaVersion || authority.status !== spec.status ||
      !Array.isArray(authority.outputBindings) ||
      authority.outputBindings.length !== spec.outputCount ||
      typeof authority.authorityPayloadSha256 !== "string") {
    fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `shape:${spec.id}`);
  }
  const { authorityPayloadSha256, ...payload } = authority;
  if (sha256(JSON.stringify(payload)) !== authorityPayloadSha256) {
    fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `payload:${spec.id}`);
  }
  return authority;
}

function validateIndependentReceipt(capture: PromotionFileCapture): JsonRecord {
  const bytes = decodeAndValidateCapture(
    capture,
    INDEPENDENT_RECEIPT.path,
    INDEPENDENT_RECEIPT.sha256,
    null,
    "PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT"
  );
  if (capture.mode !== "0444") {
    fail("PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT", "mode");
  }
  let receipt: JsonRecord;
  try {
    receipt = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT", "json");
  }
  if (receipt.schemaVersion !==
      "hk-ease-exact3-phase2b-independent-oracle-overlay-review-v2" ||
      receipt.status !==
      "independent-review-approved-for-candidate-overlay-not-live-promotion" ||
      receipt.reviewPayload?.promotionBoundary?.livePromotionAuthorized !== false) {
    fail("PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT", "shape");
  }
  const detached = {
    schemaVersion: receipt.schemaVersion,
    status: receipt.status,
    reviewPayload: receipt.reviewPayload
  };
  if (sha256(JSON.stringify(detached)) !== INDEPENDENT_RECEIPT.detachedPayloadSha256 ||
      receipt.detachedPayloadBinding?.sha256 !== INDEPENDENT_RECEIPT.detachedPayloadSha256) {
    fail("PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT", "detached-payload");
  }
  return receipt;
}

function validateOperationTopology(specs: AtomicPromotionOperationSpec[]): void {
  for (const spec of specs) {
    if (HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS.includes(
      spec.candidatePhysicalPath
    )) {
      fail("PHASE2B_PROMOTION_DIAGNOSTIC_ARTIFACT_FORBIDDEN", spec.candidatePhysicalPath);
    }
  }
  if (specs.length !== HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_EXPECTED_OPERATION_COUNT ||
      new Set(specs.map((spec) => spec.logicalTargetPath)).size !== specs.length ||
      new Set(specs.map((spec) => spec.candidatePhysicalPath)).size !== specs.length ||
      JSON.stringify(specs) !==
      JSON.stringify(HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS)) {
    fail("PHASE2B_PROMOTION_OPERATION_TOPOLOGY_INVALID", "exact-spec-drift");
  }
}

export function readHongKongEaseExact3Phase2BAtomicPromotionInputs(root: string): JsonRecord {
  const authorities = Object.fromEntries(AUTHORITY_SPECS.map((spec) => [
    spec.id,
    readHongKongEaseExact3PromotionFileCapture(root, spec.path, "present")
  ]));
  const files: Record<string, PromotionFileCapture> = {};
  for (const spec of HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS) {
    files[spec.candidatePhysicalPath] = readHongKongEaseExact3PromotionFileCapture(
      root, spec.candidatePhysicalPath, "present"
    );
    files[spec.logicalTargetPath] = readHongKongEaseExact3PromotionFileCapture(
      root,
      spec.logicalTargetPath,
      spec.operation === "create-new" ? "absent" : "present"
    );
    if (spec.preimagePhysicalPath !== undefined) {
      files[spec.preimagePhysicalPath] = readHongKongEaseExact3PromotionFileCapture(
        root, spec.preimagePhysicalPath, "present"
      );
    }
  }
  for (const path of Object.keys(UNCHANGED_INVARIANTS)) {
    files[path] = readHongKongEaseExact3PromotionFileCapture(root, path, "present");
  }
  files[BUILDER_PATH] = readHongKongEaseExact3PromotionFileCapture(root, BUILDER_PATH, "present");
  files[TEST_PATH] = readHongKongEaseExact3PromotionFileCapture(root, TEST_PATH, "present");
  for (const path of HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS) {
    files[path] = readHongKongEaseExact3PromotionFileCapture(root, path, "present");
  }
  return {
    authorities,
    independentReviewReceipt: readHongKongEaseExact3PromotionFileCapture(
      root, INDEPENDENT_RECEIPT.path, "present"
    ),
    files
  };
}

function summaryCapture(capture: PromotionFileCapture): JsonRecord {
  return {
    path: capture.path,
    sha256: capture.sha256,
    byteLength: capture.byteLength,
    mode: capture.mode,
    regularFile: capture.regularFile,
    symbolicLink: capture.symbolicLink
  };
}

function preimageEvidenceFor(
  spec: AtomicPromotionOperationSpec,
  sourceAuthority: JsonRecord,
  validatedAuthorities: Record<string, JsonRecord>
): JsonRecord | null {
  if (spec.operation === "create-new") return null;
  const outputBinding = sourceAuthority.outputBindings.find(
    (entry: JsonRecord) => authorityOutputPath(entry) === spec.candidatePhysicalPath
  );
  if (outputBinding?.preimageSha256 !== undefined) {
    if (outputBinding.preimageSha256 !== spec.preimageSha256 ||
        outputBinding.logicalTargetPath !== spec.logicalTargetPath) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `preimage-output:${spec.logicalTargetPath}`);
    }
    return {
      classification: "source-authority-output-binding",
      authorityId: spec.sourceAuthorityId,
      authorityField: "outputBindings",
      logicalTargetPath: spec.logicalTargetPath,
      sha256: spec.preimageSha256
    };
  }

  const transformation = Array.isArray(sourceAuthority.sourceTransformations)
    ? sourceAuthority.sourceTransformations.find(
      (entry: JsonRecord) => entry.logicalTargetPath === spec.logicalTargetPath
    )
    : undefined;
  if (transformation !== undefined) {
    if (transformation.preimageSha256 !== spec.preimageSha256 ||
        transformation.postimageSha256 !== spec.candidateSha256) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `preimage-transformation:${spec.logicalTargetPath}`);
    }
    return {
      classification: "source-authority-transformation",
      authorityId: spec.sourceAuthorityId,
      authorityField: "sourceTransformations",
      logicalTargetPath: spec.logicalTargetPath,
      sha256: spec.preimageSha256
    };
  }

  const dataPlaneAuthority = validatedAuthorities["phase2b-data-plane"];
  const inventoryBinding = Array.isArray(dataPlaneAuthority?.forbiddenLiveInventory)
    ? dataPlaneAuthority.forbiddenLiveInventory.find(
      (entry: JsonRecord) => entry.path === spec.logicalTargetPath
    )
    : undefined;
  if (inventoryBinding !== undefined) {
    if (inventoryBinding.preMaterializationObservedSha256 !== spec.preimageSha256 ||
        inventoryBinding.postMaterializationExpectedSha256 !== spec.preimageSha256 ||
        inventoryBinding.candidateBuilderWriteTarget !== false ||
        inventoryBinding.candidateWriteAuthorized !== false) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `preimage-inventory:${spec.logicalTargetPath}`);
    }
    return {
      classification: "phase2b-data-plane-forbidden-live-inventory",
      authorityId: "phase2b-data-plane",
      authorityField: "forbiddenLiveInventory",
      logicalTargetPath: spec.logicalTargetPath,
      sha256: spec.preimageSha256
    };
  }

  return {
    classification: "atomic-plan-current-byte-pin",
    authorityId: null,
    authorityField: null,
    logicalTargetPath: spec.logicalTargetPath,
    sha256: spec.preimageSha256,
    disposition:
      "exact current regular-file bytes are pinned by this HOLD plan; independent reviewer must explicitly adjudicate this missing upstream preimage field before promotion"
  };
}

export function buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
  root: string,
  inputs: JsonRecord,
  operationSpecs: AtomicPromotionOperationSpec[] =
    HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS
): JsonRecord {
  assertStarshipRoot(root);
  validateOperationTopology(operationSpecs);
  const validatedAuthorities: Record<string, JsonRecord> = {};
  for (const authoritySpec of AUTHORITY_SPECS) {
    const capture = inputs.authorities?.[authoritySpec.id] as PromotionFileCapture | undefined;
    if (!capture) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `missing:${authoritySpec.id}`);
    }
    validatedAuthorities[authoritySpec.id] = validateAuthority(authoritySpec, capture);
  }
  validateIndependentReceipt(inputs.independentReviewReceipt as PromotionFileCapture);

  const expectedOutputPathsByAuthority = new Map<string, string[]>();
  for (const authoritySpec of AUTHORITY_SPECS) {
    expectedOutputPathsByAuthority.set(
      authoritySpec.id,
      operationSpecs
        .filter((entry) => entry.sourceAuthorityId === authoritySpec.id)
        .map((entry) => entry.candidatePhysicalPath)
    );
  }
  for (const authoritySpec of AUTHORITY_SPECS) {
    const authority = validatedAuthorities[authoritySpec.id];
    const authorityPaths = authority.outputBindings.map(authorityOutputPath);
    const expected = expectedOutputPathsByAuthority.get(authoritySpec.id) ?? [];
    const permitted = authoritySpec.id === "phase2b-v4-lineage"
      ? [...expected.slice(0, 6), ...HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS,
        ...expected.slice(6)]
      : expected;
    if (JSON.stringify(authorityPaths) !== JSON.stringify(permitted)) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `outputs:${authoritySpec.id}`);
    }
  }

  const operations = operationSpecs.map((spec, index) => {
    const authoritySpec = AUTHORITY_SPECS.find((entry) => entry.id === spec.sourceAuthorityId);
    const authority = validatedAuthorities[spec.sourceAuthorityId];
    if (!authoritySpec || !authority) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", spec.sourceAuthorityId);
    }
    const binding = authority.outputBindings.find(
      (entry: JsonRecord) => authorityOutputPath(entry) === spec.candidatePhysicalPath
    );
    if (!binding || binding.sha256 !== spec.candidateSha256 ||
        binding.byteLength !== spec.candidateByteLength ||
        (typeof binding.logicalTargetPath === "string" &&
          binding.logicalTargetPath !== spec.logicalTargetPath) ||
        (typeof binding.preimageSha256 === "string" &&
          binding.preimageSha256 !== spec.preimageSha256)) {
      fail("PHASE2B_PROMOTION_AUTHORITY_DRIFT", `output-binding:${spec.logicalTargetPath}`);
    }
    const candidateCapture = inputs.files?.[spec.candidatePhysicalPath] as
      PromotionFileCapture | undefined;
    if (!candidateCapture) {
      fail("PHASE2B_PROMOTION_CANDIDATE_DRIFT", `missing:${spec.candidatePhysicalPath}`);
    }
    decodeAndValidateCapture(
      candidateCapture,
      spec.candidatePhysicalPath,
      spec.candidateSha256,
      spec.candidateByteLength,
      "PHASE2B_PROMOTION_CANDIDATE_DRIFT"
    );
    if (candidateCapture.mode !== "0444") {
      fail("PHASE2B_PROMOTION_CANDIDATE_DRIFT", `mode:${spec.candidatePhysicalPath}`);
    }

    const targetCapture = inputs.files?.[spec.logicalTargetPath] as
      PromotionFileCapture | undefined;
    if (!targetCapture) {
      fail(
        spec.operation === "create-new"
          ? "PHASE2B_PROMOTION_CREATION_COLLISION"
          : "PHASE2B_PROMOTION_PREIMAGE_DRIFT",
        `missing:${spec.logicalTargetPath}`
      );
    }
    if (spec.operation === "create-new") {
      validateAbsentCapture(targetCapture, spec.logicalTargetPath);
    } else {
      if (spec.preimageSha256 === null) {
        fail("PHASE2B_PROMOTION_OPERATION_TOPOLOGY_INVALID", spec.logicalTargetPath);
      }
      if (spec.preimagePhysicalPath === undefined) {
        decodeAndValidateCapture(
          targetCapture,
          spec.logicalTargetPath,
          spec.preimageSha256,
          null,
          "PHASE2B_PROMOTION_PREIMAGE_DRIFT"
        );
      } else {
        const physicalPreimageCapture = inputs.files?.[spec.preimagePhysicalPath] as
          PromotionFileCapture | undefined;
        if (!physicalPreimageCapture) {
          fail("PHASE2B_PROMOTION_PREIMAGE_DRIFT", `missing:${spec.preimagePhysicalPath}`);
        }
        decodeAndValidateCapture(
          physicalPreimageCapture,
          spec.preimagePhysicalPath,
          spec.preimageSha256,
          null,
          "PHASE2B_PROMOTION_PREIMAGE_DRIFT"
        );
        decodeAndValidateCapture(
          targetCapture,
          spec.logicalTargetPath,
          spec.candidateSha256,
          spec.candidateByteLength,
          "PHASE2B_PROMOTION_PREIMAGE_DRIFT"
        );
      }
    }
    const preimageEvidence = preimageEvidenceFor(
      spec,
      authority,
      validatedAuthorities
    );
    return {
      index,
      operation: spec.operation,
      logicalTargetPath: spec.logicalTargetPath,
      preimageEvidence,
      currentPreimage: spec.operation === "create-new"
        ? null
        : summaryCapture(
          spec.preimagePhysicalPath === undefined
            ? targetCapture
            : inputs.files[spec.preimagePhysicalPath] as PromotionFileCapture
        ),
      preappliedCandidateWorkspaceTarget: spec.preimagePhysicalPath === undefined
        ? null
        : summaryCapture(targetCapture),
      candidate: summaryCapture(candidateCapture),
      sourceAuthority: {
        id: authoritySpec.id,
        path: authoritySpec.path,
        sha256: authoritySpec.sha256,
        authorityPayloadSha256: authority.authorityPayloadSha256
      }
    };
  });

  const unchangedInvariants = Object.entries(UNCHANGED_INVARIANTS).map(([path, expectedSha]) => {
    const capture = inputs.files?.[path] as PromotionFileCapture | undefined;
    if (!capture) {
      fail("PHASE2B_PROMOTION_UNCHANGED_INVARIANT_DRIFT", `missing:${path}`);
    }
    decodeAndValidateCapture(
      capture, path, expectedSha, null, "PHASE2B_PROMOTION_UNCHANGED_INVARIANT_DRIFT"
    );
    return summaryCapture(capture);
  });

  for (const path of HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS) {
    const capture = inputs.files?.[path] as PromotionFileCapture | undefined;
    const binding = validatedAuthorities["phase2b-v4-lineage"].outputBindings.find(
      (entry: JsonRecord) => authorityOutputPath(entry) === path
    );
    if (!capture || !binding) {
      fail("PHASE2B_PROMOTION_DIAGNOSTIC_ARTIFACT_FORBIDDEN", `unbound:${path}`);
    }
    decodeAndValidateCapture(
      capture,
      path,
      binding.sha256,
      binding.byteLength,
      "PHASE2B_PROMOTION_DIAGNOSTIC_ARTIFACT_FORBIDDEN"
    );
  }

  const builderCapture = inputs.files?.[BUILDER_PATH] as PromotionFileCapture;
  const testCapture = inputs.files?.[TEST_PATH] as PromotionFileCapture;
  if (!builderCapture || !testCapture || !builderCapture.sha256 || !testCapture.sha256) {
    fail("PHASE2B_PROMOTION_IMPLEMENTATION_DRIFT", "missing-source-binding");
  }
  decodeAndValidateCapture(builderCapture, BUILDER_PATH, builderCapture.sha256, null,
    "PHASE2B_PROMOTION_IMPLEMENTATION_DRIFT");
  decodeAndValidateCapture(testCapture, TEST_PATH, testCapture.sha256, null,
    "PHASE2B_PROMOTION_IMPLEMENTATION_DRIFT");

  const authorityBindings = AUTHORITY_SPECS.map((spec) => ({
    id: spec.id,
    path: spec.path,
    sha256: spec.sha256,
    schemaVersion: spec.schemaVersion,
    status: spec.status,
    authorityPayloadSha256: validatedAuthorities[spec.id].authorityPayloadSha256
  }));
  const creationTargets = operations
    .filter((entry) => entry.operation === "create-new")
    .map((entry) => entry.logicalTargetPath);
  const replacementTargets = operations
    .filter((entry) => entry.operation === "replace-existing")
    .map((entry) => entry.logicalTargetPath);
  const authorityOperationCounts = Object.fromEntries(AUTHORITY_SPECS.map((spec) => [
    spec.id,
    operations.filter((entry) => entry.sourceAuthority.id === spec.id).length
  ]));
  const preimageEvidenceCounts = Object.fromEntries([
    "source-authority-output-binding",
    "source-authority-transformation",
    "phase2b-data-plane-forbidden-live-inventory",
    "atomic-plan-current-byte-pin"
  ].map((classification) => [
    classification,
    operations.filter((entry) => entry.preimageEvidence?.classification === classification).length
  ]));

  const planPayload = {
    schemaVersion: "hk-ease-exact3-phase2b-atomic-promotion-plan-candidate-v1",
    status: "candidate-hold-dry-run-only-not-live-promotion",
    sourceAuthorityBindings: authorityBindings,
    independentReviewReceiptBinding: {
      path: INDEPENDENT_RECEIPT.path,
      sha256: INDEPENDENT_RECEIPT.sha256,
      detachedPayloadSha256: INDEPENDENT_RECEIPT.detachedPayloadSha256,
      status: "independent-review-approved-for-candidate-overlay-not-live-promotion"
    },
    operationTopology: {
      exactOperationCount: operations.length,
      replaceExistingCount: replacementTargets.length,
      createNewCount: creationTargets.length,
      authorityOperationCounts,
      preimageEvidenceCounts,
      replacementTargets,
      creationTargets,
      orderedTargetPathSha256: sha256(JSON.stringify(operations.map(
        (entry) => entry.logicalTargetPath
      ))),
      preimageTupleSha256: sha256(JSON.stringify(operations.map((entry) => ({
        operation: entry.operation,
        path: entry.logicalTargetPath,
        sha256: entry.currentPreimage?.sha256 ?? null
      })))),
      postimageTupleSha256: sha256(JSON.stringify(operations.map((entry) => ({
        path: entry.logicalTargetPath,
        sha256: entry.candidate.sha256
      }))))
    },
    operations,
    unchangedInvariants,
    diagnosticExclusions: [...HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS],
    implementationBindings: {
      builder: summaryCapture(builderCapture),
      focusedTest: summaryCapture(testCapture)
    },
    executionPolicy: {
      executableApplyCodeIncluded: false,
      rollbackCodeIncluded: false,
      planIsReadOnlyEvidenceOnly: true,
      allCandidateFilesMustRemainImmutable0444: true,
      allReplacementPreimagesMustMatchAtFutureExecutionTime: true,
      allCreationTargetsMustRemainAbsentAtFutureExecutionTime: true,
      futurePromotionRequiresFreshIndependentReviewAndExplicitOwnerAuthorization: true
    },
    promotionBoundary: {
      planExecutionAuthorized: false,
      liveMutationAuthorized: false,
      canonicalExecutionAuthorized: false,
      browserExecutionAuthorized: false,
      releaseAuthorized: false,
      verdict: "candidate-only"
    }
  };
  const plan = {
    ...planPayload,
    planPayloadSha256: sha256(JSON.stringify(planPayload))
  };
  const planBytes = `${JSON.stringify(plan, null, 2)}\n`;

  const authorityPayload = {
    schemaVersion: "hk-ease-exact3-phase2b-atomic-promotion-plan-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    planBinding: {
      path: HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH,
      sha256: sha256(planBytes),
      byteLength: Buffer.byteLength(planBytes),
      planPayloadSha256: plan.planPayloadSha256
    },
    sourceAuthorityBindings: authorityBindings,
    independentReviewReceiptBinding: plan.independentReviewReceiptBinding,
    implementationBindings: plan.implementationBindings,
    topology: plan.operationTopology,
    mutationCoverageRequired: {
      authorityByteDriftCount: AUTHORITY_SPECS.length,
      independentReceiptByteDriftCount: 1,
      candidateByteDriftCount: operations.length,
      replacementPreimageByteDriftCount: replacementTargets.length,
      creationCollisionCount: creationTargets.length,
      unchangedInvariantByteDriftCount: unchangedInvariants.length,
      topologyDriftClasses: [
        "missing-operation",
        "duplicate-target",
        "diagnostic-bridge-reclassification"
      ],
      pathEscapeClasses: [
        "lexical-dot-segment",
        "final-symlink",
        "intermediate-directory-symlink"
      ]
    },
    outputPolicy: {
      exactArtifactCount: 2,
      directory: OUTPUT_DIRECTORY,
      fileMode: "0444",
      artifacts: [
        HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH,
        HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH
      ]
    },
    promotion: {
      livePromotionAuthorized: false,
      canonicalAuthorized: false,
      browserAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "independent A18/A11 review of all exact Phase2B candidate bytes and this dry-run plan",
        "explicit owner authorization for the exact atomic write set",
        "post-promotion source-bound canonical241 compile and test evidence",
        "Starship-only browser and release evidence"
      ]
    }
  };
  const authority = {
    ...authorityPayload,
    authorityPayloadSha256: sha256(JSON.stringify(authorityPayload))
  };
  return { plan, authority };
}

export function buildHongKongEaseExact3Phase2BAtomicPromotionPlan(root: string): JsonRecord {
  return buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
    root,
    readHongKongEaseExact3Phase2BAtomicPromotionInputs(root)
  );
}

export function serializeHongKongEaseExact3Phase2BAtomicPromotionPlan(
  root: string
): Record<string, string> {
  const built = buildHongKongEaseExact3Phase2BAtomicPromotionPlan(root);
  return {
    [HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH]:
      `${JSON.stringify(built.plan, null, 2)}\n`,
    [HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH]:
      `${JSON.stringify(built.authority, null, 2)}\n`
  };
}

function writeImmutablePromotionArtifact(
  root: string,
  relativePath: string,
  bytes: string
): void {
  const physicalRoot = assertStarshipRoot(root);
  assertCanonicalRelativePath(relativePath);
  const absolutePath = resolve(physicalRoot, relativePath);
  assertWithinRoot(physicalRoot, absolutePath);

  let cursor = physicalRoot;
  for (const segment of dirname(relativePath).split(sep)) {
    const parent = cursor;
    cursor = resolve(cursor, segment);
    const existing = lstatOrNull(cursor);
    if (existing === null) {
      mkdirSync(cursor, { mode: 0o755 });
    }
    const stat = lstatSync(cursor);
    if (!readdirSync(parent).includes(segment) || !stat.isDirectory() || stat.isSymbolicLink()) {
      fail("PHASE2B_PROMOTION_PATH_INVALID", `output-parent:${relativePath}`);
    }
  }

  const existing = lstatOrNull(absolutePath);
  if (existing !== null) {
    if (!existing.isFile() || existing.isSymbolicLink() ||
        readFileSync(absolutePath, "utf8") !== bytes) {
      fail("PHASE2B_PROMOTION_MATERIALIZATION_COLLISION", relativePath);
    }
    chmodSync(absolutePath, 0o444);
    return;
  }
  writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
  chmodSync(absolutePath, 0o444);
}

export function materializeHongKongEaseExact3Phase2BAtomicPromotionPlan(
  root: string
): Record<string, string> {
  const serialized = serializeHongKongEaseExact3Phase2BAtomicPromotionPlan(root);
  for (const [path, bytes] of Object.entries(serialized)) {
    writeImmutablePromotionArtifact(root, path, bytes);
  }
  return serialized;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const serialized = serializeHongKongEaseExact3Phase2BAtomicPromotionPlan(process.cwd());
  if (process.argv.includes("--print-plan")) {
    process.stdout.write(serialized[HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH]);
  } else if (process.argv.includes("--print-authority")) {
    process.stdout.write(serialized[HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH]);
  } else {
    process.stdout.write(`${JSON.stringify({
      status: "candidate-hold-dry-run-only-not-live-promotion",
      operationCount: HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_EXPECTED_OPERATION_COUNT,
      planSha256: sha256(
        serialized[HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH]
      ),
      authoritySha256: sha256(
        serialized[HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH]
      )
    })}\n`);
  }
}
