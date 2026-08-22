import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-canonical241-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-canonical241-candidate.test.ts";
const RUNNER_PATH = "coordination/content-qa/hk-question-bank-evidence-runner.mjs";
const RUNNER_TEST_PATH =
  "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs";
const LESSON_CONTRACT_PATH = "lib/hongKongLessonQualityContract.test.ts";

export const HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4";
const LESSON_CONTRACT_PREIMAGE_SNAPSHOT_PATH =
  `${HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY}/lib-hongKongLessonQualityContract.test.ts.preimage.snapshot`;

const TARGETS = [RUNNER_PATH, RUNNER_TEST_PATH] as const;
type TargetPath = (typeof TARGETS)[number];
const OUTPUT_TARGETS = [...TARGETS, LESSON_CONTRACT_PATH] as const;
type OutputTargetPath = (typeof OUTPUT_TARGETS)[number];

const RUNNER_PREIMAGE_SHA256: Record<TargetPath, string> = {
  [RUNNER_PATH]: "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d",
  [RUNNER_TEST_PATH]: "b57fe6e21f614300d33452d9b140ba45e8af7567c9665a17ef997bf9244d03b5"
};
const LESSON_CONTRACT_PREIMAGE_SHA256 =
  "15a54de50c52ac839b01f9560b8ddc475abdcde4163beb6abc9204f68ffdf557";

const HISTORICAL_ROOT =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-historical-regression-candidate";
const V4_ROOT =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate";
const FULLBANK_ROOT =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-fullbank-candidate";

const PRIOR_AUTHORITIES = {
  historicalRegression: {
    path: `${HISTORICAL_ROOT}/historical-regression-hold-authority-v1.json`,
    sha256: "cef3e6916ed0c050d4843fb71ed9005f4830df1dabebd76a95ab6ee16e14a1ea",
    schemaVersion: "hk-ease-exact3-phase2b-historical-regression-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    authorityPayloadSha256: "726dc3988661fa32ebd726f9d7859dfbb4ee804e4842e28dd8466f8f04583be9"
  },
  v4Lineage: {
    path: `${V4_ROOT}/candidate-hold-authority-v1.json`,
    sha256: "14af10dc5cfdb24e1f4dfda4678aa9c88819f7afac7eaaa377c2d845bc383948",
    schemaVersion: "hk-ease-exact3-v4-lineage-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    authorityPayloadSha256: "e3c593bd46bc5210930f8cc8072862eb81bee9277bd3cf4258f9b1833c7a756d"
  },
  fullbank: {
    path: `${FULLBANK_ROOT}/fullbank-hold-authority-v1.json`,
    sha256: "f4d302234a7163f40e599c4c96fa158ffcb4ef696ffe6c5315ba174140ce6e73",
    schemaVersion: "hk-ease-exact3-phase2b-fullbank-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    authorityPayloadSha256: "07a99f0bc9b781e2b014d02af6ee5886285146a798266bf68ed7999ac50e80d5"
  }
} as const;

type SourceBinding = {
  logicalPath: string;
  physicalPath: string;
  sha256: string;
};

const source = (logicalPath: string, sha256: string, physicalPath = logicalPath): SourceBinding => ({
  logicalPath,
  physicalPath,
  sha256
});

const FUTURE_SOURCE_BINDINGS = [
  source(
    "coordination/content-qa/authoritative/2026-08-13-hk-displayed74-focused-test-ledger.json",
    "c676acf3931e4a59761cfc4f7249ebd7546fa144854c8ae89fdb59c4562e12fc"
  ),
  source(
    "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json",
    "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0",
    `${HISTORICAL_ROOT}/hk-residual47-focused-test-ledger.json.snapshot`
  ),
  source(
    "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json",
    "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91",
    `${HISTORICAL_ROOT}/hk-ease-response-focused-test-ledger.json.snapshot`
  ),
  source("lib/mainlandPepHighQuestionBank.test.ts", "99b80bd34047c0640a49a56f662a7d578d04a9fb8e156eb64d7608e269f3a312"),
  source("lib/mainlandPepPrimaryQuestionBank.test.ts", "498f80b94e702008cd465aa016409c802cce5ed5f8a3891145755f4dddf9fd18"),
  source("lib/mainlandPepJuniorQuestionBank.test.ts", "ca107d64204403652b72bb2bfc53e2d16b83ed00379b161aa13a352d2856dc92"),
  source("lib/mainlandBnuPrimaryQuestionBank.test.ts", "7f28efb0b790f6d048a2d216721c6459f1bae3014642ab3cfe0ee942b1366417"),
  source("lib/mainlandBnuJuniorQuestionBank.test.ts", "7c284f0b221a3f1af09d7f1ffa59b55d6fcdd79cbd2ee98909856bcff2606019"),
  source(
    "lib/fullQuestionBankSolvability.test.ts",
    "1d1ed1c4fcaaae556b6ddde0dcdc4bed74f93add4ee2f0d445083672ba72c7f0",
    `${FULLBANK_ROOT}/lib-fullQuestionBankSolvability.test.ts.snapshot`
  ),
  source(
    "lib/hongKongEaseIndependentOracleV4.test.ts",
    "459c89f15d073f50927b21605be093543e6e64ffede351734c23f1188251285a",
    `${V4_ROOT}/lib-hongKongEaseIndependentOracleV4.test.ts.snapshot`
  ),
  source(
    LESSON_CONTRACT_PATH,
    "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11"
  ),
  source("lib/questionFigure.test.ts", "9590f3afb22dbe9fb0ed77100fa7f47ac79db4b511aafb0ffd8eefaea8b575c7"),
  source("lib/practiceFigureAudit.test.ts", "27b62748f87b3c0fb5a84a7c1c1bf6efb3f0148fd25508f11343b1aac4cb8b26"),
  source("lib/hongKongDisplayed74ContentContract.test.ts", "2a2925b3b72481010a788f8f5da07b72cf139b4ed7c2c6869ebfbc757e2988c4"),
  source(
    "lib/hongKongDisplayed74FigureHistoryContract.test.ts",
    "bb77a21004cdfd9eb8eb2d07b37fb134e0c82d19f45e5a0afc605e454cffa869",
    `${HISTORICAL_ROOT}/lib-hongKongDisplayed74FigureHistoryContract.test.ts.snapshot`
  ),
  source("lib/hongKongDisplayed74FocusedTestLedger.ts", "7575a452f27f312c026590f6a209e0c03366719810a8e4a5c6a77d6617e8d175"),
  source("lib/hongKongDisplayed74HistoryProvenance.test.ts", "0073b2953308203e6953f6674f08241a126ca6e25098d6c31cc2dfe46ce686b9"),
  source(
    "lib/hongKongQuestionVersioning.test.ts",
    "4e2640bf0d4fd0b28fb3186e73625022b0d00989e0380ed1a5304e38b64b6128",
    `${HISTORICAL_ROOT}/lib-hongKongQuestionVersioning.test.ts.snapshot`
  ),
  source(
    "lib/hongKongResidual47FocusedTestLedger.ts",
    "2c20817b6c96b42ed5a89972c7ea4d084205538a2d35f5278f2dddd3a38b3c63",
    `${HISTORICAL_ROOT}/lib-hongKongResidual47FocusedTestLedger.ts.snapshot`
  ),
  source(
    "lib/hongKongResidual47RepairContract.test.ts",
    "1600b6131f448720223b7ad41592c4912e52f8a08406ce57f590c19fefcde800",
    `${HISTORICAL_ROOT}/lib-hongKongResidual47RepairContract.test.ts.snapshot`
  ),
  source("lib/server/hongKongDisplayed74ResponseContracts.test.ts", "f27ba969b99091e7bd8a66e7fb6e4aa279909ce5bb3fb21dc6a020153afad27f"),
  source(
    "lib/server/hongKongEaseResponseContracts.test.ts",
    "b71f2b6780895cb303033fbe1879a05515fc174102350d8081c0412c1ac31026",
    `${HISTORICAL_ROOT}/lib-server-hongKongEaseResponseContracts.test.ts.snapshot`
  ),
  source(
    "lib/server/hongKongHistoricalQuestionProjection.test.ts",
    "abeb79cb4c2b437bb687ac09b63fd948959ddd30428d0734ce91aabc35c4b963",
    `${HISTORICAL_ROOT}/lib-server-hongKongHistoricalQuestionProjection.test.ts.snapshot`
  ),
  source(
    "lib/questionBankSolvability.ts",
    "2b400503b0cb9fb90e4627fd7e285e58c830b78ac2d22839b0fa5a16c0b69e7f",
    `${FULLBANK_ROOT}/lib-questionBankSolvability.ts.snapshot`
  ),
  source(
    "lib/hongKongEaseIndependentOracle.ts",
    "08c315e86ec0c0a917c4f7b9f85f6844b25e427807a44bc03ed6d2088a480b6c",
    `${FULLBANK_ROOT}/lib-hongKongEaseIndependentOracle.ts.snapshot`
  ),
  source("package.json", "60fc5dd020cc95fbead086f335d1f34287cc89517d44a0cb4a0acab9b939cfa1"),
  source("tsconfig.json", "463a2abe6c2c803606ddf13aa6cb7d2f68cab049052ed876e5ffb77f5f4d96a8")
] as const;

const REVIEWED_PATHS = [
  RUNNER_PATH,
  RUNNER_TEST_PATH,
  ...FUTURE_SOURCE_BINDINGS.map((binding) => binding.logicalPath)
] as const;

const DIRECT_SOURCE_PATHS = [
  "lib/mainlandPepHighQuestionBank.test.ts",
  "lib/mainlandPepPrimaryQuestionBank.test.ts",
  "lib/mainlandPepJuniorQuestionBank.test.ts",
  "lib/mainlandBnuPrimaryQuestionBank.test.ts",
  "lib/mainlandBnuJuniorQuestionBank.test.ts",
  "lib/fullQuestionBankSolvability.test.ts",
  "lib/hongKongEaseIndependentOracleV4.test.ts",
  "lib/hongKongLessonQualityContract.test.ts",
  "lib/questionFigure.test.ts",
  "lib/practiceFigureAudit.test.ts"
] as const;

const DIRECT_COUNTS = [38, 8, 8, 11, 7, 5, 36, 25, 19, 10] as const;
const EXPECTED_DIRECT_NAME_SHA256 =
  "660a3780b9dcb8daf5b39ac1d3fb3ada5869a89bfa4b14e932577ffe59c7ff37";
const EXPECTED_RESIDUAL_NAME_SHA256 =
  "d89c4aee3a620ecf6c5ff150b4b29def12b5f53107b41a1478c2cfa2a6437bfd";
const EXPECTED_EASE_NAME_SHA256 =
  "38d338428107012f5813a051e84afec2c04e8b0a048e54186b419a7475db8b1a";

const AUTHORITY_BEGIN = "\n/* HK_REVIEWED_SOURCE_AUTHORITY_BEGIN */\n";
const AUTHORITY_END = "\n/* HK_REVIEWED_SOURCE_AUTHORITY_END */\n";
const CANONICAL_AUTHORITY_BLOCK =
  "\n/* HK_REVIEWED_SOURCE_AUTHORITY_CANONICAL_BLOCK */\n";

export type HongKongEaseExact3Phase2BCanonical241CandidateInputs = {
  repositoryRoot: string;
  runnerPreimages: Record<TargetPath, string>;
  priorAuthorities: {
    [K in keyof typeof PRIOR_AUTHORITIES]: JsonRecord;
  };
  futureSourceBytes: Record<string, string>;
};

const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const prettyJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const fail = (code: string, detail?: string): never => {
  throw new Error(detail ? `${code}:${detail}` : code);
};

function readRegularText(repositoryRoot: string, relativePath: string): string {
  const physicalRoot = realpathSync(repositoryRoot);
  const absolutePath = resolve(physicalRoot, relativePath);
  const lexicalRelative = relative(physicalRoot, absolutePath);
  if (
    !lexicalRelative ||
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(`..${sep}`)
  ) {
    fail("PHASE2B6_INPUT_PATH_ESCAPE", relativePath);
  }
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("PHASE2B6_INPUT_NOT_REGULAR", relativePath);
  }
  const physicalPath = realpathSync(absolutePath);
  const physicalRelative = relative(physicalRoot, physicalPath);
  if (
    !physicalRelative ||
    physicalRelative === ".." ||
    physicalRelative.startsWith(`..${sep}`)
  ) {
    fail("PHASE2B6_INPUT_PHYSICAL_ESCAPE", relativePath);
  }
  return readFileSync(physicalPath, "utf8");
}

function replaceExact(
  sourceText: string,
  before: string,
  after: string,
  expectedCount: number,
  label: string
): string {
  const count = sourceText.split(before).length - 1;
  if (count !== expectedCount) fail("PHASE2B6_SOURCE_ANCHOR_DRIFT", `${label}:${count}`);
  return sourceText.split(before).join(after);
}

function recoverLessonContractPreimage(postimage: string): string {
  let preimage = postimage;
  preimage = replaceExact(
    preimage,
    '"4d6987630b491d94bd9bdc0f6f7b3fc02234864becc6cecbce011c0b68203a6f",\n    "the exact promoted 255-question lesson selection drifted"',
    '"ee69432e51fd2983b9a24bc562731e5f15459b1f7cf11e717217cb5e4184d398",\n    "the exact frozen 255-question lesson selection drifted"',
    1,
    "lesson-selection-authority"
  );
  preimage = replaceExact(
    preimage,
    '"7dd474d4c613380bf4847953373eea7527beffbdc22fc3e7f58c53a14c3d1ef2",\n    "learner-visible content in the exact promoted 255-question lesson surface drifted"',
    '"b55d7733645d19ff8411c0b2620fd9c6225ff83c03440e034b5860702c3add5e",\n    "learner-visible content in the exact frozen 255-question lesson surface drifted"',
    1,
    "lesson-content-authority"
  );
  preimage = replaceExact(
    preimage,
    'question.id === "supp-coordinates-first-step-v3"',
    'question.id === "supp-coordinates-first-step-v2"',
    1,
    "coordinates-active-generation"
  );

  const currentStart =
    'test("displayed trigonometry strategy keeps the key fact concise and misconception alternatives distinct", () => {';
  const nextTest =
    '\ntest("P2 pictograms, P3 single bars, and P5 compound bar charts follow the official primary sequence", () => {';
  if (preimage.split(currentStart).length - 1 !== 1 || preimage.split(nextTest).length - 1 !== 1) {
    fail("PHASE2B6_LESSON_CONTRACT_TRANSITION_DRIFT", "trigonometry-boundary");
  }
  const startIndex = preimage.indexOf(currentStart);
  const endIndex = preimage.indexOf(nextTest, startIndex + currentStart.length);
  if (startIndex < 0 || endIndex < 0) {
    fail("PHASE2B6_LESSON_CONTRACT_TRANSITION_DRIFT", "trigonometry-range");
  }
  const historicalBlock = String.raw`test("displayed trigonometry strategy explanations separate the key fact from the alternatives", () => {
  const firstStep = selectedLessonQuestions("trigonometry-basics")
    .find((question) => question.id.startsWith("supp-trigonometry-basics-first-step"));
  assert.ok(firstStep, "trigonometry lesson needs its displayed first-step question");
  assert.match(firstStep.explanation.en, /\\\)\.\s+The alternatives/);
});
`;
  preimage = `${preimage.slice(0, startIndex)}${historicalBlock}${preimage.slice(endIndex)}`;
  if (sha256(preimage) !== LESSON_CONTRACT_PREIMAGE_SHA256) {
    fail("PHASE2B6_LESSON_CONTRACT_TRANSITION_DRIFT", "preimage-sha256");
  }
  return preimage;
}

function assertAuthority(name: keyof typeof PRIOR_AUTHORITIES, authority: JsonRecord): void {
  const expected = PRIOR_AUTHORITIES[name];
  if (sha256(prettyJson(authority)) !== expected.sha256) {
    fail("PHASE2B6_PRIOR_AUTHORITY_DRIFT", `${name}:file-sha256`);
  }
  const { authorityPayloadSha256, ...payload } = authority;
  if (
    authority.schemaVersion !== expected.schemaVersion ||
    authority.status !== expected.status ||
    authorityPayloadSha256 !== expected.authorityPayloadSha256 ||
    authorityPayloadSha256 !== sha256(JSON.stringify(payload))
  ) {
    fail("PHASE2B6_PRIOR_AUTHORITY_DRIFT", `${name}:payload`);
  }
}

function assertInputs(inputs: HongKongEaseExact3Phase2BCanonical241CandidateInputs): void {
  for (const path of TARGETS) {
    if (sha256(inputs.runnerPreimages[path]) !== RUNNER_PREIMAGE_SHA256[path]) {
      fail("PHASE2B6_RUNNER_PREIMAGE_DRIFT", path);
    }
  }
  for (const name of Object.keys(PRIOR_AUTHORITIES) as Array<keyof typeof PRIOR_AUTHORITIES>) {
    assertAuthority(name, inputs.priorAuthorities[name]);
  }
  for (const binding of FUTURE_SOURCE_BINDINGS) {
    if (sha256(inputs.futureSourceBytes[binding.logicalPath] ?? "") !== binding.sha256) {
      fail("PHASE2B6_FUTURE_SOURCE_DRIFT", binding.logicalPath);
    }
  }
}

function literalTestName(node: ts.Expression, sourcePath: string): string {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return fail("PHASE2B6_NONLITERAL_DIRECT_TEST_NAME", sourcePath);
}

function directNamesFromSource(sourceText: string, sourcePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const registrars = new Set<string>();
  const names: string[] = [];
  const forbidden: string[] = [];
  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      ["node:test", "node:test/promises"].includes(statement.moduleSpecifier.text)
    ) {
      const clause = statement.importClause;
      if (clause?.name) registrars.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          if ((element.propertyName ?? element.name).text === "test") {
            registrars.add(element.name.text);
          }
        }
      }
    }
  }
  if (registrars.size !== 1) fail("PHASE2B6_DIRECT_REGISTRAR_DRIFT", sourcePath);
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && registrars.has(node.expression.text)) {
        if (!node.arguments[0]) fail("PHASE2B6_DIRECT_TEST_NAME_MISSING", sourcePath);
        names.push(literalTestName(node.arguments[0], sourcePath));
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        registrars.has(node.expression.expression.text)
      ) {
        forbidden.push(node.expression.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (forbidden.length > 0) fail("PHASE2B6_FORBIDDEN_DIRECT_TEST_METHOD", `${sourcePath}:${forbidden.join(",")}`);
  if (names.length === 0 || new Set(names).size !== names.length) {
    fail("PHASE2B6_DIRECT_TEST_NAME_DRIFT", sourcePath);
  }
  return names;
}

function focusedLedgerNames(
  bytes: string,
  expectedFileSha256: string,
  expectedCount: number,
  expectedNameSha256: string,
  label: string
): string[] {
  if (sha256(bytes) !== expectedFileSha256) fail("PHASE2B6_FOCUSED_LEDGER_DRIFT", `${label}:file`);
  const ledger = JSON.parse(bytes) as JsonRecord;
  if (
    !Array.isArray(ledger.suites) ||
    ledger.expectedFocusedTestCount !== expectedCount ||
    ledger.expectedSuiteCount !== ledger.suites.length
  ) {
    fail("PHASE2B6_FOCUSED_LEDGER_DRIFT", `${label}:shape`);
  }
  const keyedNames: string[] = [];
  const tapNames: string[] = [];
  for (const suite of ledger.suites) {
    if (typeof suite.suiteId !== "string" || !Array.isArray(suite.testNames)) {
      fail("PHASE2B6_FOCUSED_LEDGER_DRIFT", `${label}:suite`);
    }
    for (const name of suite.testNames) {
      if (typeof name !== "string" || !name) fail("PHASE2B6_FOCUSED_LEDGER_DRIFT", `${label}:name`);
      keyedNames.push(`${suite.suiteId}\u0000${name}`);
      tapNames.push(name);
    }
  }
  const computed = sha256(Buffer.from(JSON.stringify(keyedNames.sort()), "utf8"));
  if (
    tapNames.length !== expectedCount ||
    new Set(tapNames).size !== tapNames.length ||
    ledger.testNameSha256 !== expectedNameSha256 ||
    computed !== expectedNameSha256
  ) {
    fail("PHASE2B6_FOCUSED_LEDGER_DRIFT", `${label}:names`);
  }
  return tapNames;
}

function normalizedRunnerBytes(sourceText: string): Buffer {
  const bytes = Buffer.from(sourceText, "utf8");
  const begin = Buffer.from(AUTHORITY_BEGIN, "utf8");
  const end = Buffer.from(AUTHORITY_END, "utf8");
  const beginIndex = bytes.indexOf(begin);
  const endIndex = bytes.indexOf(end, beginIndex + begin.length);
  if (beginIndex < 0 || endIndex < 0 || bytes.indexOf(begin, beginIndex + 1) >= 0) {
    fail("PHASE2B6_RUNNER_AUTHORITY_BLOCK_DRIFT");
  }
  return Buffer.concat([
    bytes.subarray(0, beginIndex),
    Buffer.from(CANONICAL_AUTHORITY_BLOCK, "utf8"),
    bytes.subarray(endIndex + end.length)
  ]);
}

function renderReviewedAuthority(entries: ReadonlyArray<JsonRecord>): string {
  return `${AUTHORITY_BEGIN}export const INDEPENDENT_REVIEWED_SOURCE_AUTHORITY = Object.freeze(${JSON.stringify(entries, null, 2)}.map((binding) => Object.freeze(binding)));${AUTHORITY_END}`;
}

function transformRunnerTest(preimage: string): string {
  let postimage = preimage;
  postimage = replaceExact(postimage, '"/Volumes/Starship/MAIS-hk-ease-v2-qa-wt"', "process.cwd()", 21, "portable-workspace-root");
  postimage = replaceExact(postimage, "[38, 8, 8, 11, 7, 5, 19, 10]", "[38, 8, 8, 11, 7, 5, 36, 25, 19, 10]", 1, "direct-source-counts");
  postimage = replaceExact(postimage, "# tests 180", "# tests 241", 3, "tap-summary-180");
  postimage = replaceExact(postimage, "expectedDirectTestCount: 106", "expectedDirectTestCount: 167", 1, "direct-count");
  postimage = replaceExact(postimage, "expectedTotalTestCount: 180", "expectedTotalTestCount: 241", 1, "total-count");
  postimage = replaceExact(postimage, "tests: 180", "tests: 241", 1, "tests-count");
  postimage = replaceExact(postimage, "pass: 180", "pass: 241", 1, "pass-count");
  postimage = replaceExact(postimage, "3db51ff0c238675293ae7d3a7ee214f7f6511c3552d904ea5a005fa791bef94b", "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0", 1, "residual-ledger-sha");
  postimage = replaceExact(postimage, "15b9041caf9984415f8998aabf6b27793a7ee918f5212a685209b0bf5031faab", EXPECTED_RESIDUAL_NAME_SHA256, 1, "residual-name-sha");
  postimage = replaceExact(postimage, "aa9ef44b07f6c452090f312c77a43b7384bbaae5684e1c6137c46b1542e00bfe", "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91", 1, "ease-ledger-sha");
  postimage = replaceExact(postimage, "c93bfe5772aa5cc556b220746d93dbc395e4f095b80deaa30ffab0f702737923", EXPECTED_EASE_NAME_SHA256, 1, "ease-name-sha");
  postimage = replaceExact(postimage, "62f40af76ee85e6c9a952c825908ac52ebf1745f52c4504fce3b0dc7b3d916c9", EXPECTED_DIRECT_NAME_SHA256, 1, "direct-name-sha");
  postimage = replaceExact(
    postimage,
    '    "lib/fullQuestionBankSolvability.test.ts",\n    "lib/questionFigure.test.ts",',
    '    "lib/fullQuestionBankSolvability.test.ts",\n    "lib/hongKongEaseIndependentOracleV4.test.ts",\n    "lib/hongKongLessonQualityContract.test.ts",\n    "lib/questionBankSolvability.ts",\n    "lib/hongKongEaseIndependentOracle.ts",\n    "lib/questionFigure.test.ts",',
    1,
    "required-reviewed-paths"
  );
  postimage = replaceExact(
    postimage,
    'test("the physical Node and TypeScript toolchain binding is deterministic and drift-sensitive", async () => {',
    'test("the physical Node, TypeScript, TSX, and esbuild toolchain binding is deterministic and drift-sensitive", async () => {',
    1,
    "physical-toolchain-test-title"
  );
  postimage = replaceExact(
    postimage,
    '  assert.equal(first.schemaVersion, "hk-question-bank-physical-toolchain-binding-v1");',
    '  assert.equal(first.schemaVersion, "hk-question-bank-physical-toolchain-binding-v2");',
    1,
    "physical-toolchain-schema"
  );
  postimage = replaceExact(
    postimage,
    '  assert.match(first.typescript.aggregateSha256, /^[0-9a-f]{64}$/);',
    `  assert.match(first.typescript.aggregateSha256, /^[0-9a-f]{64}$/);
  assert.equal(first.tsx.packageName, "tsx");
  assert.equal(first.tsx.fileCount > 0, true);
  assert.match(first.tsx.aggregateSha256, /^[0-9a-f]{64}$/);
  assert.equal(first.esbuild.packageName, "esbuild");
  assert.equal(first.esbuild.fileCount > 0, true);
  assert.match(first.esbuild.aggregateSha256, /^[0-9a-f]{64}$/);`,
    1,
    "physical-source-execution-packages"
  );
  postimage = replaceExact(
    postimage,
    `  const compileArgs = [
    "-p",
    "tsconfig.json",
    "--outDir",
    paths.compiledRoot,
    "--noEmit",
    "false",
    "--incremental",
    "false",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node"
  ];`,
    `  const compileArgs = [
    "-p",
    "tsconfig.json",
    "--noEmit",
    "--incremental",
    "false"
  ];`,
    1,
    "source-native-compile-receipt"
  );
  postimage = replaceExact(
    postimage,
    `        args: [
          "--test",
          "--test-reporter=tap",
          ...directTestBinding.compiledEntries.map((entry) => join(paths.compiledRoot, entry))
        ],`,
    `        args: [
          "--import",
          "tsx",
          "--test",
          "--test-concurrency=1",
          "--test-reporter=tap",
          ...directTestBinding.compiledEntries.map((entry) =>
            join(workspaceRoot, entry.replace(/\\.js$/, ".ts"))
          )
        ],`,
    1,
    "source-native-test-receipt"
  );
  postimage = replaceExact(
    postimage,
    `    EXPECTED_DIRECT_TEST_COUNT,
    EXPECTED_DIRECT_TEST_NAME_SHA256,`,
    `    EXPECTED_DIRECT_TEST_COUNT,
    EXPECTED_DIRECT_TEST_NAME_SHA256,
    EXPECTED_EXPANDED_TEST_COUNT,`,
    1,
    "complete-tap-expanded-count-import"
  );
  postimage = replaceExact(
    postimage,
    `    \`# tests \${expectedNames.length}\`,
    \`# pass \${expectedNames.length}\`,`,
    `    \`# tests \${EXPECTED_EXPANDED_TEST_COUNT}\`,
    \`# pass \${EXPECTED_EXPANDED_TEST_COUNT}\`,`,
    2,
    "complete-and-outer-tap-expanded-summary"
  );
  postimage = replaceExact(
    postimage,
    `  assert.equal(verification.expectedTotalTestCount, expectedNames.length);
  assert.equal(verification.observedTotalTestCount, expectedNames.length);`,
    `  assert.equal(verification.expectedTotalTestCount, expectedNames.length);
  assert.equal(verification.expectedExpandedTestCount, EXPECTED_EXPANDED_TEST_COUNT);
  assert.equal(verification.observedTotalTestCount, expectedNames.length);`,
    1,
    "complete-tap-expanded-verification"
  );
  postimage = replaceExact(
    postimage,
    `["duplicate tests summary", tap.replace("# tests 241", "# tests 241\\n# tests 241")]`,
    `["duplicate tests summary", tap.replace("# tests 308", "# tests 308\\n# tests 308")]`,
    1,
    "complete-tap-expanded-duplicate-mutation"
  );
  postimage = replaceExact(
    postimage,
    `    EXECUTING_RUNNER_BINDING,
    bindIndependentReviewedSourceArtifacts,`,
    `    EXECUTING_RUNNER_BINDING,
    EXPECTED_EXPANDED_TEST_COUNT,
    bindIndependentReviewedSourceArtifacts,`,
    1,
    "outer-receipt-expanded-count-import"
  );
  postimage = replaceExact(
    postimage,
    `      expectedTotalTestCount: 241,
      tests: 241,
      pass: 241,`,
    `      expectedTotalTestCount: 241,
      expectedExpandedTestCount: 308,
      tests: 308,
      pass: 308,`,
    1,
    "outer-receipt-expanded-counts"
  );
  return postimage;
}

function transformRunnerOutsideAuthority(preimage: string): string {
  let postimage = preimage;
  postimage = replaceExact(postimage, '"3db51ff0c238675293ae7d3a7ee214f7f6511c3552d904ea5a005fa791bef94b"', '"8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0"', 2, "residual-ledger-sha");
  postimage = replaceExact(postimage, '"15b9041caf9984415f8998aabf6b27793a7ee918f5212a685209b0bf5031faab"', `"${EXPECTED_RESIDUAL_NAME_SHA256}"`, 1, "residual-name-sha");
  postimage = replaceExact(postimage, '"aa9ef44b07f6c452090f312c77a43b7384bbaae5684e1c6137c46b1542e00bfe"', '"ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91"', 2, "ease-ledger-sha");
  postimage = replaceExact(postimage, '"c93bfe5772aa5cc556b220746d93dbc395e4f095b80deaa30ffab0f702737923"', `"${EXPECTED_EASE_NAME_SHA256}"`, 1, "ease-name-sha");
  postimage = replaceExact(postimage, "export const EXPECTED_DIRECT_TEST_COUNT = 106;", "export const EXPECTED_DIRECT_TEST_COUNT = 167;", 1, "direct-count");
  postimage = replaceExact(postimage, '"62f40af76ee85e6c9a952c825908ac52ebf1745f52c4504fce3b0dc7b3d916c9"', `"${EXPECTED_DIRECT_NAME_SHA256}"`, 1, "direct-name-sha");
  postimage = replaceExact(
    postimage,
    '  "lib/fullQuestionBankSolvability.test.js",\n  "lib/questionFigure.test.js",',
    '  "lib/fullQuestionBankSolvability.test.js",\n  "lib/hongKongEaseIndependentOracleV4.test.js",\n  "lib/hongKongLessonQualityContract.test.js",\n  "lib/questionFigure.test.js",',
    1,
    "direct-entry"
  );
  postimage = replaceExact(
    postimage,
    '  "lib/fullQuestionBankSolvability.test.ts",\n  "lib/questionFigure.test.ts",',
    '  "lib/fullQuestionBankSolvability.test.ts",\n  "lib/hongKongEaseIndependentOracleV4.test.ts",\n  "lib/hongKongLessonQualityContract.test.ts",\n  "lib/questionFigure.test.ts",',
    1,
    "reviewed-v4-path"
  );
  postimage = replaceExact(
    postimage,
    '  "lib/server/hongKongHistoricalQuestionProjection.test.ts",\n  "package.json",',
    '  "lib/server/hongKongHistoricalQuestionProjection.test.ts",\n  "lib/questionBankSolvability.ts",\n  "lib/hongKongEaseIndependentOracle.ts",\n  "package.json",',
    1,
    "reviewed-runtime-paths"
  );
  postimage = replaceExact(
    postimage,
    'const EXECUTING_TYPESCRIPT_MODULE_PATH = fileURLToPath(import.meta.resolve("typescript"));',
    `const EXECUTING_TYPESCRIPT_MODULE_PATH = fileURLToPath(import.meta.resolve("typescript"));
const EXECUTING_TSX_MODULE_PATH = fileURLToPath(import.meta.resolve("tsx"));
const EXECUTING_ESBUILD_MODULE_PATH = fileURLToPath(import.meta.resolve("esbuild"));`,
    1,
    "source-execution-module-paths"
  );
  postimage = replaceExact(
    postimage,
    `  return entries;
}

export async function capturePhysicalToolchainBinding(workspaceRoot) {`,
    `  return entries;
}

async function capturePhysicalNpmPackageBinding({
  nodeModulesPhysicalPath,
  packageName,
  importedModulePath
}) {
  const importedModulePhysicalPath = await realpath(importedModulePath);
  assertStarshipAbsolutePath(importedModulePhysicalPath, "physical " + packageName + " module path");
  if (!pathIsWithin(nodeModulesPhysicalPath, importedModulePhysicalPath)) {
    throw new Error("physical " + packageName + " module escapes physical node_modules: " + importedModulePhysicalPath);
  }
  let packageRootPhysicalPath = dirname(importedModulePhysicalPath);
  while (pathIsWithin(nodeModulesPhysicalPath, packageRootPhysicalPath)) {
    const packageJsonPath = join(packageRootPhysicalPath, "package.json");
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
      if (packageJson?.name === packageName && typeof packageJson?.version === "string") {
        const entries = await captureRegularDirectoryFiles(packageRootPhysicalPath);
        const canonicalPackageBytes = Buffer.from(
          entries
            .map((entry) => [entry.sha256, entry.bytes, entry.path].join("\\u0000") + "\\n")
            .join(""),
          "utf8"
        );
        return {
          packageName,
          importedModulePath,
          importedModulePhysicalPath,
          packageRootPhysicalPath,
          packageVersion: packageJson.version,
          fileCount: entries.length,
          aggregateSha256: sha256(canonicalPackageBytes),
          entries
        };
      }
    }
    if (packageRootPhysicalPath === nodeModulesPhysicalPath) break;
    const parent = dirname(packageRootPhysicalPath);
    if (parent === packageRootPhysicalPath) break;
    packageRootPhysicalPath = parent;
  }
  throw new Error("unable to locate physical " + packageName + " package for " + importedModulePhysicalPath);
}

export async function capturePhysicalToolchainBinding(workspaceRoot) {`,
    1,
    "physical-source-execution-package-capture"
  );
  postimage = replaceExact(
    postimage,
    '  const nodePhysicalPath = await realpath(process.execPath);',
    `  const [tsx, esbuild] = await Promise.all([
    capturePhysicalNpmPackageBinding({
      nodeModulesPhysicalPath,
      packageName: "tsx",
      importedModulePath: EXECUTING_TSX_MODULE_PATH
    }),
    capturePhysicalNpmPackageBinding({
      nodeModulesPhysicalPath,
      packageName: "esbuild",
      importedModulePath: EXECUTING_ESBUILD_MODULE_PATH
    })
  ]);
  const nodePhysicalPath = await realpath(process.execPath);`,
    1,
    "physical-source-execution-bindings"
  );
  postimage = replaceExact(
    postimage,
    '    schemaVersion: "hk-question-bank-physical-toolchain-binding-v1",',
    '    schemaVersion: "hk-question-bank-physical-toolchain-binding-v2",',
    1,
    "physical-toolchain-schema"
  );
  postimage = replaceExact(
    postimage,
    '        "hk-question-bank-physical-toolchain-binding-v1" &&',
    '        "hk-question-bank-physical-toolchain-binding-v2" &&',
    1,
    "validated-physical-toolchain-schema"
  );
  postimage = replaceExact(
    postimage,
    '      "Node requested/physical path, version, byte-count and SHA-256 plus path-sorted TypeScript package file SHA-256 + NUL + byte-count + NUL + relative-path + LF",',
    '      "Node requested/physical path, version, byte-count and SHA-256 plus path-sorted TypeScript, TSX, and esbuild package file SHA-256 + NUL + byte-count + NUL + relative-path + LF",',
    1,
    "physical-toolchain-canonical-serialization"
  );
  postimage = replaceExact(
    postimage,
    `      aggregateSha256: sha256(canonicalTypeScriptBytes),
      entries
    }
  };`,
    `      aggregateSha256: sha256(canonicalTypeScriptBytes),
      entries
    },
    tsx,
    esbuild
  };`,
    1,
    "physical-toolchain-source-execution-members"
  );
  postimage = replaceExact(
    postimage,
    `function canonicalCompileArguments(compiledRoot) {
  return [
    "-p",
    "tsconfig.json",
    "--outDir",
    compiledRoot,
    "--noEmit",
    "false",
    "--incremental",
    "false",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node"
  ];
}

function canonicalTestArguments(compiledRoot) {
  return [
    "--test",
    "--test-reporter=tap",
    ...EXPECTED_DIRECT_TEST_ENTRIES.map((entry) => join(compiledRoot, entry))
  ];
}`,
    `function canonicalCompileArguments() {
  return [
    "-p",
    "tsconfig.json",
    "--noEmit",
    "--incremental",
    "false"
  ];
}

function canonicalTestArguments(workspaceRoot) {
  return [
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=1",
    "--test-reporter=tap",
    ...EXPECTED_DIRECT_TEST_ENTRIES.map((entry) =>
      join(workspaceRoot, entry.replace(/\\.js$/, ".ts"))
    )
  ];
}`,
    1,
    "source-native-execution"
  );
  postimage = replaceExact(
    postimage,
    "canonicalCompileArguments(paths.compiledRoot)",
    "canonicalCompileArguments()",
    1,
    "validated-compile-arguments"
  );
  postimage = replaceExact(
    postimage,
    "canonicalTestArguments(paths.compiledRoot)",
    "canonicalTestArguments(workspaceRoot)",
    1,
    "validated-test-arguments"
  );
  postimage = replaceExact(
    postimage,
    "canonicalCompileArguments(compiledRoot)",
    "canonicalCompileArguments()",
    1,
    "executed-compile-arguments"
  );
  postimage = replaceExact(
    postimage,
    "canonicalTestArguments(compiledRoot)",
    "canonicalTestArguments(workspaceRoot)",
    1,
    "executed-test-arguments"
  );
  postimage = replaceExact(
    postimage,
    `export const EXPECTED_DIRECT_TEST_COUNT = 167;
export const EXPECTED_DIRECT_TEST_NAME_SHA256 =`,
    `export const EXPECTED_DIRECT_TEST_COUNT = 167;
export const EXPECTED_EXPANDED_TEST_COUNT = 308;
export const EXPECTED_DIRECT_TEST_NAME_SHA256 =`,
    1,
    "expanded-test-count-pin"
  );
  postimage = replaceExact(
    postimage,
    `  const expectedTotalTestCount = expectedNames.length;
  const parsedTap = parseCanonicalRootTap(tap, expectedTotalTestCount);`,
    `  const expectedTotalTestCount = expectedNames.length;
  const expectedExpandedTestCount = EXPECTED_EXPANDED_TEST_COUNT;
  const parsedTap = parseCanonicalRootTap(tap, expectedTotalTestCount);`,
    1,
    "expanded-count-verification-binding"
  );
  postimage = replaceExact(
    postimage,
    `    tapSummary.tests !== expectedTotalTestCount ||
    tapSummary.pass !== expectedTotalTestCount ||`,
    `    tapSummary.tests !== expectedExpandedTestCount ||
    tapSummary.pass !== expectedExpandedTestCount ||`,
    1,
    "expanded-count-status-verification"
  );
  postimage = replaceExact(
    postimage,
    "`complete TAP count/status mismatch: expected=${expectedTotalTestCount}, observedNames=${observedNames.length}, summary=${JSON.stringify(tapSummary)}`",
    "`complete TAP count/status mismatch: expectedRoot=${expectedTotalTestCount}, expectedExpanded=${expectedExpandedTestCount}, observedNames=${observedNames.length}, summary=${JSON.stringify(tapSummary)}`",
    1,
    "expanded-count-error"
  );
  postimage = replaceExact(
    postimage,
    `    schemaVersion: "hk-question-bank-complete-tap-verification-v1",
    expectedTotalTestCount,
    observedTotalTestCount: observedNames.length,`,
    `    schemaVersion: "hk-question-bank-complete-tap-verification-v2",
    expectedTotalTestCount,
    expectedExpandedTestCount,
    observedTotalTestCount: observedNames.length,`,
    1,
    "expanded-count-verification-receipt"
  );
  postimage = replaceExact(
    postimage,
    `      "tap.expectedTotalTestCount"
    ],
    [receipt?.tap?.tests === receipt?.tap?.expectedTotalTestCount, "tap.tests"],`,
    `      "tap.expectedTotalTestCount"
    ],
    [
      receipt?.tap?.expectedExpandedTestCount === EXPECTED_EXPANDED_TEST_COUNT,
      "tap.expectedExpandedTestCount"
    ],
    [receipt?.tap?.tests === receipt?.tap?.expectedExpandedTestCount, "tap.tests"],`,
    1,
    "expanded-count-outer-validation"
  );
  postimage = replaceExact(
    postimage,
    `    ...recomputedCompleteVerification.tapSummary,
    expectedTotalTestCount: recomputedCompleteVerification.expectedTotalTestCount,
    tapLogSha256,`,
    `    ...recomputedCompleteVerification.tapSummary,
    expectedTotalTestCount: recomputedCompleteVerification.expectedTotalTestCount,
    expectedExpandedTestCount: recomputedCompleteVerification.expectedExpandedTestCount,
    tapLogSha256,`,
    1,
    "expanded-count-retained-outer-validation"
  );
  postimage = replaceExact(
    postimage,
    `      ...verification.tapSummary,
      expectedTotalTestCount: verification.expectedTotalTestCount,
      tapLogSha256:`,
    `      ...verification.tapSummary,
      expectedTotalTestCount: verification.expectedTotalTestCount,
      expectedExpandedTestCount: verification.expectedExpandedTestCount,
      tapLogSha256:`,
    1,
    "expanded-count-execution-receipt"
  );
  return postimage;
}

export function loadHongKongEaseExact3Phase2BCanonical241CandidateInputs(
  repositoryRoot = process.cwd()
): HongKongEaseExact3Phase2BCanonical241CandidateInputs {
  return {
    repositoryRoot,
    runnerPreimages: Object.fromEntries(
      TARGETS.map((path) => [path, readRegularText(repositoryRoot, path)])
    ) as Record<TargetPath, string>,
    priorAuthorities: Object.fromEntries(
      (Object.keys(PRIOR_AUTHORITIES) as Array<keyof typeof PRIOR_AUTHORITIES>).map((name) => [
        name,
        JSON.parse(readRegularText(repositoryRoot, PRIOR_AUTHORITIES[name].path))
      ])
    ) as HongKongEaseExact3Phase2BCanonical241CandidateInputs["priorAuthorities"],
    futureSourceBytes: Object.fromEntries(
      FUTURE_SOURCE_BINDINGS.map((binding) => [
        binding.logicalPath,
        readRegularText(repositoryRoot, binding.physicalPath)
      ])
    )
  };
}

export function buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs(
  inputs: HongKongEaseExact3Phase2BCanonical241CandidateInputs
) {
  assertInputs(inputs);
  const lessonContractPostimage = inputs.futureSourceBytes[LESSON_CONTRACT_PATH];
  const lessonContractPreimage = recoverLessonContractPreimage(lessonContractPostimage);

  const directNames: string[] = [];
  const directSourceTestCounts: number[] = [];
  for (const [index, path] of DIRECT_SOURCE_PATHS.entries()) {
    const names = directNamesFromSource(inputs.futureSourceBytes[path], path);
    if (names.length !== DIRECT_COUNTS[index]) fail("PHASE2B6_DIRECT_TEST_COUNT_DRIFT", path);
    directSourceTestCounts.push(names.length);
    directNames.push(...names);
  }
  if (directNames.length !== 167 || new Set(directNames).size !== directNames.length) {
    fail("PHASE2B6_DIRECT_TOPOLOGY_DRIFT");
  }
  const directTestNameSha256 = sha256(Buffer.from(JSON.stringify([...directNames].sort()), "utf8"));
  if (directTestNameSha256 !== EXPECTED_DIRECT_NAME_SHA256) {
    fail("PHASE2B6_DIRECT_TOPOLOGY_DRIFT", "name-sha256");
  }

  const displayedNames = focusedLedgerNames(
    inputs.futureSourceBytes["coordination/content-qa/authoritative/2026-08-13-hk-displayed74-focused-test-ledger.json"],
    "c676acf3931e4a59761cfc4f7249ebd7546fa144854c8ae89fdb59c4562e12fc",
    57,
    "3f0ec176d5c3ecdd216a1eaeb9d7fd3bda9a716796b9f28bf6b8f99529a386fd",
    "displayed57"
  );
  const residualNames = focusedLedgerNames(
    inputs.futureSourceBytes["coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json"],
    "8ecfc6570714daa6d35e1c9d1a1f5bee92a0b0b60b3230408e3f9acaaebb12c0",
    10,
    EXPECTED_RESIDUAL_NAME_SHA256,
    "residual10"
  );
  const easeNames = focusedLedgerNames(
    inputs.futureSourceBytes["coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json"],
    "ca64cfd9403206ec5094d170c97f31a2556351e17b6beed7cbdcd11f64dcbe91",
    7,
    EXPECTED_EASE_NAME_SHA256,
    "ease7"
  );
  const focusedNames = [...displayedNames, ...residualNames, ...easeNames];
  const allNames = [...directNames, ...focusedNames];
  const uniqueNames = new Set(allNames);
  const collisions = [...new Set(allNames.filter((name, index) => allNames.indexOf(name) !== index))].sort();
  if (focusedNames.length !== 74 || allNames.length !== 241 || uniqueNames.size !== 241) {
    fail("PHASE2B6_GLOBAL_TOPOLOGY_DRIFT", collisions.join(","));
  }

  const runnerTestPostimage = transformRunnerTest(inputs.runnerPreimages[RUNNER_TEST_PATH]);
  const runnerWithoutNewAuthority = transformRunnerOutsideAuthority(inputs.runnerPreimages[RUNNER_PATH]);
  const normalizedRunner = normalizedRunnerBytes(runnerWithoutNewAuthority);

  const reviewedSourceAuthority: JsonRecord[] = REVIEWED_PATHS.map((path) => {
    if (path === RUNNER_PATH) {
      return {
        path,
        hashMode: "authority-block-normalized",
        bytes: normalizedRunner.length,
        sha256: sha256(normalizedRunner)
      };
    }
    const bytes = path === RUNNER_TEST_PATH
      ? runnerTestPostimage
      : inputs.futureSourceBytes[path];
    if (typeof bytes !== "string") fail("PHASE2B6_REVIEWED_SOURCE_MISSING", path);
    return {
      path,
      hashMode: "raw",
      bytes: Buffer.byteLength(bytes, "utf8"),
      sha256: sha256(bytes)
    };
  });

  const beginIndex = runnerWithoutNewAuthority.indexOf(AUTHORITY_BEGIN);
  const endIndex = runnerWithoutNewAuthority.indexOf(AUTHORITY_END, beginIndex + AUTHORITY_BEGIN.length);
  if (beginIndex < 0 || endIndex < 0) fail("PHASE2B6_RUNNER_AUTHORITY_BLOCK_DRIFT");
  const runnerPostimage = `${runnerWithoutNewAuthority.slice(0, beginIndex)}${renderReviewedAuthority(reviewedSourceAuthority)}${runnerWithoutNewAuthority.slice(endIndex + AUTHORITY_END.length)}`;
  const observedNormalizedRunner = normalizedRunnerBytes(runnerPostimage);
  if (sha256(observedNormalizedRunner) !== reviewedSourceAuthority[0].sha256) {
    fail(
      "PHASE2B6_RUNNER_NORMALIZED_SELF_BINDING_DRIFT",
      `${normalizedRunner.length}/${reviewedSourceAuthority[0].sha256}:${observedNormalizedRunner.length}/${sha256(observedNormalizedRunner)}`
    );
  }

  const postimages: Record<OutputTargetPath, string> = {
    [RUNNER_PATH]: runnerPostimage,
    [RUNNER_TEST_PATH]: runnerTestPostimage,
    [LESSON_CONTRACT_PATH]: lessonContractPostimage
  };
  const snapshotBasename: Record<OutputTargetPath, string> = {
    [RUNNER_PATH]: "hk-question-bank-evidence-runner.mjs.snapshot",
    [RUNNER_TEST_PATH]: "hk-question-bank-evidence-runner.test.mjs.snapshot",
    [LESSON_CONTRACT_PATH]: "lib-hongKongLessonQualityContract.test.ts.snapshot"
  };
  const postimageBindings = OUTPUT_TARGETS.map((logicalTargetPath) => {
    const bytes = postimages[logicalTargetPath];
    return {
      logicalTargetPath,
      preimageSha256: logicalTargetPath === LESSON_CONTRACT_PATH
        ? LESSON_CONTRACT_PREIMAGE_SHA256
        : RUNNER_PREIMAGE_SHA256[logicalTargetPath],
      snapshotPath: `${HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY}/${snapshotBasename[logicalTargetPath]}`,
      sha256: sha256(bytes),
      byteLength: Buffer.byteLength(bytes, "utf8")
    };
  });

  return {
    schemaVersion: "hk-ease-exact3-phase2b-canonical241-candidate-v1" as const,
    status: "candidate-hold-not-live-promotion" as const,
    postimages,
    postimageBindings,
    lessonContractTransitionPreimage: {
      logicalTargetPath: LESSON_CONTRACT_PATH,
      snapshotPath: LESSON_CONTRACT_PREIMAGE_SNAPSHOT_PATH,
      sha256: LESSON_CONTRACT_PREIMAGE_SHA256,
      byteLength: Buffer.byteLength(lessonContractPreimage, "utf8"),
      bytes: lessonContractPreimage
    },
    reviewedTopologySourcePaths: [...REVIEWED_PATHS],
    reviewedSourceAuthority,
    topology: {
      directTestCount: 167,
      directTestNameSha256,
      directSourceTestCounts,
      focusedTestCount: 74,
      focusedLedgerCounts: [57, 10, 7],
      expectedCanonicalTestCount: 241,
      expectedExpandedTestCount: 308,
      globallyUniqueTestNameCount: uniqueNames.size,
      collisions
    }
  };
}

export function buildHongKongEaseExact3Phase2BCanonical241Candidate(
  repositoryRoot = process.cwd()
) {
  return buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs(
    loadHongKongEaseExact3Phase2BCanonical241CandidateInputs(repositoryRoot)
  );
}

function implementationBinding(repositoryRoot: string, path: string) {
  const bytes = readRegularText(repositoryRoot, path);
  return { path, sha256: sha256(bytes), byteLength: Buffer.byteLength(bytes, "utf8") };
}

function buildAuthority(
  repositoryRoot: string,
  candidate: ReturnType<typeof buildHongKongEaseExact3Phase2BCanonical241CandidateFromInputs>
) {
  const payload = {
    schemaVersion: "hk-ease-exact3-phase2b-canonical241-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    boundary:
      "candidate-only exact241 runner topology, including the corrected exact 25-test HK 51-lesson quality contract, its reversible historical preimage binding, and independent reviewed-source pins; no live source mutation, canonical execution, browser evidence, promotion, or release authorization",
    implementationBindings: [
      implementationBinding(repositoryRoot, BUILDER_PATH),
      implementationBinding(repositoryRoot, FOCUSED_TEST_PATH)
    ],
    priorAuthorityBindings: Object.entries(PRIOR_AUTHORITIES).map(([name, binding]) => ({
      name,
      ...binding
    })),
    runnerPreimageBindings: TARGETS.map((path) => ({ path, sha256: RUNNER_PREIMAGE_SHA256[path] })),
    lessonContractPreimageBinding: {
      path: LESSON_CONTRACT_PATH,
      sha256: LESSON_CONTRACT_PREIMAGE_SHA256,
      snapshotPath: candidate.lessonContractTransitionPreimage.snapshotPath,
      byteLength: candidate.lessonContractTransitionPreimage.byteLength,
      recovery: "exact reversible four-part stale-contract transition"
    },
    futureSourceBindings: FUTURE_SOURCE_BINDINGS,
    outputBindings: candidate.postimageBindings,
    topology: candidate.topology,
    reviewedSourceAuthority: candidate.reviewedSourceAuthority,
    promotion: {
      liveMutationAuthorized: false,
      canonicalExecutionAuthorized: false,
      browserAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "isolated exact241 runner-unit shadow replay",
        "independent A18 source-bound V4 review receipt",
        "independent review of the exact241 runner candidate and its source authority",
        "authorized atomic promotion followed by canonical, browser, and release evidence"
      ]
    }
  };
  return { ...payload, authorityPayloadSha256: sha256(JSON.stringify(payload)) };
}

function writeImmutable(repositoryRoot: string, relativePath: string, bytes: string): void {
  const absolutePath = resolve(repositoryRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  if (existsSync(absolutePath)) {
    const stat = lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink() || readFileSync(absolutePath, "utf8") !== bytes) {
      fail("PHASE2B6_MATERIALIZATION_COLLISION", relativePath);
    }
    chmodSync(absolutePath, 0o444);
    return;
  }
  writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
  chmodSync(absolutePath, 0o444);
}

export function materializeHongKongEaseExact3Phase2BCanonical241Candidate(
  repositoryRoot = process.cwd()
) {
  const candidate = buildHongKongEaseExact3Phase2BCanonical241Candidate(repositoryRoot);
  writeImmutable(
    repositoryRoot,
    candidate.lessonContractTransitionPreimage.snapshotPath,
    candidate.lessonContractTransitionPreimage.bytes
  );
  for (const binding of candidate.postimageBindings) {
    writeImmutable(repositoryRoot, binding.snapshotPath, candidate.postimages[binding.logicalTargetPath]);
  }
  const authority = buildAuthority(repositoryRoot, candidate);
  const authorityPath =
    `${HONG_KONG_EASE_EXACT3_PHASE2B_CANONICAL241_CANDIDATE_DIRECTORY}/canonical241-hold-authority-v1.json`;
  writeImmutable(repositoryRoot, authorityPath, prettyJson(authority));
  return { ...candidate, authority, authorityPath };
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isMain) {
  const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  materializeHongKongEaseExact3Phase2BCanonical241Candidate(repositoryRoot);
}
