import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const BUILDER_PATH = "coordination/content-qa/build-hk-ease-exact3-phase2a-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2a-candidate.test.ts";
const SEMANTICS_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2a-candidate-semantics.ts";
const CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2a-candidate";
const AUTHORITY_PATH = `${CANDIDATE_DIRECTORY}/candidate-authority-v1.json`;
const PHASE1_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimage-v1.json";
const STEP0_RECEIPT_PATH =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/step0-immutable-preimage-relocation-v1.json";

const ORDERED_BASE_IDS = ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"] as const;
const PHASE1_SHA256 = "8c087e024d184f92e1a6a51798cdb5f9ae3ddcff7dbc15e7ec65bb0fe1c2b608";
const STEP0_RECEIPT_SHA256 =
  "9d661d739710a72c9a4744e224f221ffe808632dacb12b63d49c39fe4886262e";
const V2_HISTORY_PATH = "data/historical/hongKongQuestions-hk-ease-39847.json";
const V2_HISTORY_SHA256 =
  "8c6fed873fdb520eecf985074fcb5eb32fb36a01c66c48a4afbb394f121f66d1";
const V4_RUNTIME_PREDECESSOR_SHA256 =
  "697c62f2433bf03ca0d9296dd66a90e441fed22a904f55ca2cdb074f49ffa2c1";
const V4_RUNTIME_SUCCESSOR_SHA256 =
  "11c46a9ed03fe592065db05e579165c9a5bf65a660be948d6d582cf10dd5be8c";
const V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH =
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-runtime-successor-provenance/v4-runtime-successor-authority-v1.json";
const V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256 =
  "4feebefec120b2c227a913a22f517496170604903fcbfe452a0a7578f6e706fa";

const EXPECTED_FORBIDDEN_LIVE_INVENTORY = [
  ["data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
    "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
    "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"],
  ["data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
    "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"],
  ["data/historical/hongKongQuestionVersionManifest.json",
    "f0cfaeaf745325d6b8e99353082f7e0be9d63fdb2cb18db0d3b7568c0415af92"],
  ["data/questions.ts",
    "96d90f3c090b14bd7797155ffcbb20edcbf2230147a945f6c02ec32a470dbca8"],
  ["data/hongKongEasePracticeQuestions.ts",
    "01bf8aef5f76dfa46d17b357b110957fa551ba12fd98027315a1a8e825f40137"],
  ["data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
    "8f306dc2d34b3595e70c0f8ef55345dc321fdae97278cb404d499d40635e2e9d"],
  ["lib/hongKongEaseIndependentOracleV4.ts", V4_RUNTIME_SUCCESSOR_SHA256],
  ["lib/hongKongEaseIndependentOracleV4.test.ts",
    "cf8fc58da712b3fa277c34cf940a5c434ab48712ce4932e09e0de987cd945472"],
  ["lib/server/hongKongEaseResponseContracts.ts",
    "1ebefbb799f3f5b64f57ae9beff0f5641939eb5ea6f81aa93f5fe9fc21def3f1"],
  ["lib/fullQuestionBankSolvability.test.ts",
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c"],
  ["coordination/content-qa/hk-question-bank-evidence-runner.mjs",
    "7288e9d91fe6e6057b22a2c5d35c2237bd07588ace11d8141729c539f64f052d"]
] as const;

const NEW_1041_PROMPT_EN =
  "For each number, state in order whether it is divisible by 2, 5, and 10: (a) 75; (b) 130; (c) 502; (d) 1200; (e) 1005; (f) 4020. Give all six parts in one response in the format “(a) No, Yes, No; …; (f) …”. You may use ✓ for Yes and ✗ for No. Each three-entry group must follow the order 2, 5, 10.";
const NEW_1041_PROMPT_ZH =
  "對每個數判斷它能否依次被 2、5、10 整除：(a) 75；(b) 130；(c) 502；(d) 1200；(e) 1005；(f) 4020。請在同一答案中按「(a) 否、是、否；…；(f) …」格式作答；可用 ✓ 表示「是」、✗ 表示「否」。每組順序均為 2、5、10。";
const NEW_1041_PROMPT_PAIR_SHA256 =
  "40bbc41cef6daf614d48f2c4d336d1afa5c151a70b85e351a6ff6a80ad4d442c";

const OUTPUT_PATHS = [
  `${CANDIDATE_DIRECTORY}/question-successor-rows-v1.json`,
  `${CANDIDATE_DIRECTORY}/strict-response-contract-successor-rows-v1.json`,
  `${CANDIDATE_DIRECTORY}/response-contract-audit-successor-rows-v1.json`,
  `${CANDIDATE_DIRECTORY}/v3-history-v1.json`,
  `${CANDIDATE_DIRECTORY}/version-manifest-delta-v1.json`,
  AUTHORITY_PATH
] as const;

type JsonRecord = Record<string, any>;
type CandidateBuild = {
  postimages: {
    questionSuccessors: JsonRecord;
    strictContractSuccessors: JsonRecord;
    responseAuditSuccessors: JsonRecord;
    v3History: JsonRecord;
    versionManifestDelta: JsonRecord;
  };
  authority: JsonRecord;
};
type BuilderModule = {
  HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS: readonly string[];
  HK_EASE_EXACT3_PHASE2A_REQUIRED_INPUT_PATHS: readonly string[];
  HK_EASE_EXACT3_PHASE2A_FORBIDDEN_LIVE_PATHS: readonly string[];
  readHongKongEaseExact3Phase2AInputs: (root: string) => JsonRecord;
  buildHongKongEaseExact3Phase2ACandidateFromInputs: (
    root: string,
    inputs: JsonRecord
  ) => CandidateBuild;
  buildHongKongEaseExact3Phase2ACandidate: (root: string) => CandidateBuild;
  serializeHongKongEaseExact3Phase2ACandidate: (root: string) => Record<string, string>;
  verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory: (
    root: string,
    observation: "pre-materialization" | "authority-build" | "post-materialization"
  ) => void;
};
type SemanticsModule = {
  evaluateHongKongEaseExact3Phase2AContract: (
    contract: JsonRecord,
    selectedAnswer: string
  ) => boolean;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function starshipTmpRoot() {
  const configured = process.env.TMPDIR;
  assert.ok(configured, "runner must configure a unique Starship TMPDIR");
  const physical = realpathSync(configured);
  assert.match(physical, /^\/Volumes\/Starship\//);
  return physical;
}

function copyPath(root: string, relativePath: string) {
  const target = resolve(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(resolve(process.cwd(), relativePath)), { flag: "wx" });
}

async function loadBuilder() {
  const path = resolve(process.cwd(), BUILDER_PATH);
  assert.equal(existsSync(path), true, "Phase2A candidate builder must exist");
  if (!existsSync(path)) return null;
  return await import(pathToFileURL(path).href) as BuilderModule;
}

async function loadSemantics() {
  const path = resolve(process.cwd(), SEMANTICS_PATH);
  assert.equal(existsSync(path), true, "Phase2A full semantic parser must exist");
  if (!existsSync(path)) return null;
  return await import(pathToFileURL(path).href) as SemanticsModule;
}

test("Phase2A candidate contracts use dedicated full parsers and reject every known false-green", async () => {
  const builder = await loadBuilder();
  const semantics = await loadSemantics();
  if (!builder || !semantics) return;
  const candidate = builder.buildHongKongEaseExact3Phase2ACandidate(process.cwd());
  const entries = candidate.postimages.strictContractSuccessors.entries as JsonRecord[];
  assert.deepEqual(entries.map((entry) => entry.baseId), ORDERED_BASE_IDS);

  const byBaseId = new Map(entries.map((entry) => [entry.baseId, entry.postimage]));
  const fractionCases = [
    {
      baseId: "hk-ease-10481",
      en: "(a) proper fractions: 11/12, 3/5; (b) improper fractions: 9/9, 7/4; (c) mixed numbers: 5 2/7, 2 1/3",
      zh: "(a) 真分數：3/5, 11/12；(b) 假分數：7/4, 9/9；(c) 帶分數：2 1/3, 5 2/7",
      old: "(a) 3/5, 11/12; (b) 7/4, 9/9; (c) 2 1/3, 5 2/7",
      wrongTail: "(a) proper fractions: 3/5, 11/12; (b) improper fractions: 7/4, 9/9; (c) mixed numbers: 999, 888"
    },
    {
      baseId: "hk-ease-10496",
      en: "(a) proper fractions: 13/15, 4/7; (b) improper fractions: 8/8, 11/5; (c) mixed numbers: 6 4/9, 3 1/2",
      zh: "(a) 真分數：4/7, 13/15；(b) 假分數：11/5, 8/8；(c) 帶分數：3 1/2, 6 4/9",
      old: "(a) 4/7, 13/15; (b) 11/5, 8/8; (c) 3 1/2, 6 4/9",
      wrongTail: "(a) proper fractions: 4/7, 13/15; (b) improper fractions: 11/5, 8/8; (c) mixed numbers: 999, 888"
    }
  ];
  for (const row of fractionCases) {
    const contract = byBaseId.get(row.baseId);
    assert.ok(contract);
    assert.equal(contract.kind, "exact3-named-classified-number-groups-v1");
    assert.equal(semantics.evaluateHongKongEaseExact3Phase2AContract(contract, row.en), true);
    assert.equal(semantics.evaluateHongKongEaseExact3Phase2AContract(contract, row.zh), true);
    const labelsDrift = structuredClone(contract);
    labelsDrift.params.labels = ["x", "y", "z"];
    assert.equal(
      semantics.evaluateHongKongEaseExact3Phase2AContract(labelsDrift, row.en),
      false,
      `${row.baseId}: declared labels must be semantically bound`
    );
    for (const rejected of [
      row.old,
      row.wrongTail,
      row.en.replace("proper fractions", "真分數"),
      row.en.replace(/proper fractions: ([^;]+); \(b\) improper fractions: ([^;]+)/, "proper fractions: $2; (b) improper fractions: $1"),
      row.en.replace(/([^:,]+), ([^;]+)/, "$1, $1"),
      row.en.replace(/, [^;]+;/, ";"),
      `${row.en}; 1/2`,
      row.en.replace("9/9", "1").replace("8/8", "1"),
      row.en.replace("mixed numbers", "mixed fractions")
    ]) {
      assert.equal(
        semantics.evaluateHongKongEaseExact3Phase2AContract(contract, rejected),
        false,
        `${row.baseId}: ${rejected}`
      );
    }
  }

  const matrix = byBaseId.get("hk-ease-1041");
  assert.ok(matrix);
  assert.equal(matrix.kind, "exact3-labelled-divisibility-matrix-v1");
  for (const accepted of [
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓",
    "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) Yes, No, No; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes",
    "(a) 否, 是, 否; (b) 是, 是, 是; (c) 是, 否, 否; (d) 是, 是, 是; (e) 否, 是, 否; (f) 是, 是, 是"
  ]) assert.equal(semantics.evaluateHongKongEaseExact3Phase2AContract(matrix, accepted), true);
  for (const rejected of [
    "(a) arbitrary; (b) arbitrary; (c) arbitrary; (d) arbitrary; (e) arbitrary; (f) arbitrary",
    "(a) ✓, ✗, ✗; (b) ✓, ✓, ✓; (c) ✗, ✗, ✓; (d) ✓, ✓, ✓; (e) ✓, ✗, ✗; (f) ✓, ✓, ✓",
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗",
    "(a) ✗, ✓, ✗; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (e) ✓, ✓, ✓",
    "(a) ✗, ✓, maybe; (b) ✓, ✓, ✓; (c) ✓, ✗, ✗; (d) ✓, ✓, ✓; (e) ✗, ✓, ✗; (f) ✓, ✓, ✓",
    "✗, ✓, ✗; ✓, ✓, ✓; ✓, ✗, ✗; ✓, ✓, ✓; ✗, ✓, ✗; ✓, ✓, ✓",
    "(a) No, Yes, No; (b) Yes, Yes, Yes; (c) No, No, Yes; (d) Yes, Yes, Yes; (e) No, Yes, No; (f) Yes, Yes, Yes"
  ]) assert.equal(semantics.evaluateHongKongEaseExact3Phase2AContract(matrix, rejected), false, rejected);
});

test("Phase2A builds only the exact three v3 candidate postimages with explicit deltas and no lineage chain", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  assert.deepEqual(builder.HK_EASE_EXACT3_PHASE2A_OUTPUT_PATHS, OUTPUT_PATHS);
  const first = builder.buildHongKongEaseExact3Phase2ACandidate(process.cwd());
  const second = builder.buildHongKongEaseExact3Phase2ACandidate(process.cwd());
  assert.deepEqual(second, first);

  const questions = first.postimages.questionSuccessors.questions as JsonRecord[];
  assert.deepEqual(questions.map((row) => row.id), ORDERED_BASE_IDS.map((id) => `${id}-v3`));
  assert.equal(questions.length, 3);
  const q1041 = questions.find((row) => row.id === "hk-ease-1041-v3");
  assert.ok(q1041);
  assert.equal(q1041.promptEn, NEW_1041_PROMPT_EN);
  assert.equal(q1041.promptZh, NEW_1041_PROMPT_ZH);
  assert.equal(
    sha256(JSON.stringify({ promptEn: q1041.promptEn, promptZh: q1041.promptZh })),
    NEW_1041_PROMPT_PAIR_SHA256
  );
  assert.equal(q1041.acceptedAnswers.length, 3);

  const frozenPack = JSON.parse(readFileSync(
    resolve(process.cwd(),
      "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2.json"
    ),
    "utf8"
  ));
  for (const baseId of ["hk-ease-10481", "hk-ease-10496"]) {
    const before = frozenPack.questions.find((row: JsonRecord) => row.id === baseId);
    const after = questions.find((row) => row.id === `${baseId}-v3`);
    assert.ok(before && after);
    assert.equal(after.promptEn, before.promptEn, `${baseId}: promptEn must not change`);
    assert.equal(after.promptZh, before.promptZh, `${baseId}: promptZh must not change`);
    assert.equal(after.explanationEn, before.explanationEn, `${baseId}: explanationEn must not change`);
    assert.equal(after.explanationZh, before.explanationZh, `${baseId}: explanationZh must not change`);
    assert.match(after.answer, /proper fractions/);
    assert.equal(after.acceptedAnswers.length, 16);
    assert.equal(after.acceptedAnswers.filter((value: string) => /proper fractions/.test(value)).length, 8);
    assert.equal(after.acceptedAnswers.filter((value: string) => /真分數/.test(value)).length, 8);
  }

  const history = first.postimages.v3History;
  assert.equal(history.questionCount, 3);
  assert.deepEqual((history.questions as JsonRecord[]).map((row) => row.id), questions.map((row) => row.id));
  assert.equal(sha256(readFileSync(resolve(process.cwd(), V2_HISTORY_PATH))), V2_HISTORY_SHA256);
  for (const historyRow of history.questions as JsonRecord[]) {
    const questionRow = questions.find((row) => row.id === historyRow.id);
    assert.ok(questionRow);
    assert.equal(historyRow.prompt.en, questionRow.promptEn);
    assert.equal(historyRow.prompt.zh, questionRow.promptZh);
    assert.equal(historyRow.answer, questionRow.answer);
    assert.deepEqual(historyRow.acceptedAnswers, questionRow.acceptedAnswers);
    assert.equal(historyRow.explanation.en, questionRow.explanationEn);
    assert.equal(historyRow.explanation.zh, questionRow.explanationZh);
  }

  const version = first.postimages.versionManifestDelta;
  const expectedMap = Object.fromEntries(ORDERED_BASE_IDS.flatMap((baseId) => [
    [baseId, `${baseId}-v3`],
    [`${baseId}-v2`, `${baseId}-v3`]
  ]));
  assert.deepEqual(version.activeIdByHistoricalIdPostimage, expectedMap);
  assert.deepEqual(
    version.retiredHistoricalIdsAdded,
    ORDERED_BASE_IDS.flatMap((baseId) => [baseId, `${baseId}-v2`])
  );
  const keys = new Set(Object.keys(version.activeIdByHistoricalIdPostimage));
  for (const target of Object.values(version.activeIdByHistoricalIdPostimage)) {
    assert.equal(keys.has(String(target)), false, `${target}: v3 target must not be another map key`);
  }

  const authority = first.authority;
  assert.equal(authority.phase1PreimageAuthority.sha256, PHASE1_SHA256);
  assert.equal(authority.step0ImmutableRelocationReceipt.sha256, STEP0_RECEIPT_SHA256);
  assert.equal(authority.immutableSnapshotBindings.length, 12);
  assert.equal(authority.promotion.status, "not-authorized-candidate-hold");
  assert.equal(authority.a18MaterialPromptAdjudication.reviewerLane, "A18");
  assert.equal(authority.a18MaterialPromptAdjudication.task, "independent Task B2 final");
  assert.equal(authority.a18MaterialPromptAdjudication.promptPairSha256, NEW_1041_PROMPT_PAIR_SHA256);
  assert.deepEqual(authority.a18MaterialPromptAdjudication.exactText, {
    promptEn: NEW_1041_PROMPT_EN,
    promptZh: NEW_1041_PROMPT_ZH
  });
  assert.equal(authority.postimageBindings.length, 5);
  assert.deepEqual(authority.focusedTestBinding, {
    path: FOCUSED_TEST_PATH,
    sha256: sha256(readFileSync(resolve(process.cwd(), FOCUSED_TEST_PATH)))
  });
  assert.equal(
    readFileSync(resolve(process.cwd(), FOCUSED_TEST_PATH), "utf8").includes(
      sha256(`${JSON.stringify(authority, null, 2)}\n`)
    ),
    false,
    "focused test must not hardcode the candidate authority full-file SHA"
  );
  assert.equal(
    builder.HK_EASE_EXACT3_PHASE2A_REQUIRED_INPUT_PATHS.includes(FOCUSED_TEST_PATH),
    true,
    "authority-bound focused test must be a deterministic source input"
  );
  const inventory = authority.dependencyAndCascade.candidateCreationForbiddenLiveInventory;
  assert.equal(authority.dependencyAndCascade.liveMutationForbiddenInPhase2A, undefined);
  assert.equal(inventory.schemaVersion, "hk-ease-exact3-phase2a-forbidden-live-inventory-v1");
  assert.equal(inventory.entryCount, EXPECTED_FORBIDDEN_LIVE_INVENTORY.length);
  assert.deepEqual(
    builder.HK_EASE_EXACT3_PHASE2A_FORBIDDEN_LIVE_PATHS,
    EXPECTED_FORBIDDEN_LIVE_INVENTORY.map(([path]) => path)
  );
  assert.deepEqual(
    inventory.entries.map((entry: JsonRecord) => [entry.path, entry.observedSha256]),
    EXPECTED_FORBIDDEN_LIVE_INVENTORY
  );
  assert.equal(
    inventory.inventoryPayloadSha256,
    sha256(JSON.stringify(inventory.entries))
  );
  for (const entry of inventory.entries as JsonRecord[]) {
    assert.equal(entry.preMaterializationObservedSha256, entry.observedSha256);
    assert.equal(entry.postMaterializationObservedSha256, entry.observedSha256);
    assert.equal(entry.candidateBuilderWriteTarget, false);
    assert.equal(entry.candidateWriteAuthorized, false);
    assert.equal(sha256(readFileSync(resolve(process.cwd(), entry.path))), entry.observedSha256);
  }
  const v4RuntimeInventory = inventory.entries.find(
    (entry: JsonRecord) => entry.path === "lib/hongKongEaseIndependentOracleV4.ts"
  );
  assert.deepEqual(v4RuntimeInventory.externalConcurrentDrift, {
    classification: "external-concurrent-drift-never-a-candidate-input-or-write",
    historicalPredecessorSha256: V4_RUNTIME_PREDECESSOR_SHA256,
    observedSuccessorSha256: V4_RUNTIME_SUCCESSOR_SHA256,
    successorAuthority: {
      path: V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH,
      sha256: V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256
    },
    candidateAdoptionPolicy: "not-adopted-by-candidate-handled-only-by-successor-authority"
  });
  assert.equal(
    sha256(readFileSync(resolve(process.cwd(), V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH))),
    V4_RUNTIME_SUCCESSOR_AUTHORITY_SHA256
  );
  for (const observation of [
    "pre-materialization",
    "authority-build",
    "post-materialization"
  ] as const) {
    assert.doesNotThrow(() =>
      builder.verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
        process.cwd(),
        observation
      )
    );
  }
  for (const binding of authority.postimageBindings as JsonRecord[]) {
    assert.match(binding.sha256, /^[0-9a-f]{64}$/);
    assert.match(binding.rowsPayloadSha256, /^[0-9a-f]{64}$/);
    assert.equal(typeof binding.rowCount, "number");
    assert.ok(binding.rowCount > 0);
  }
  assert.deepEqual(authority.exactAllowedDeltas.questionSuccessors, {
    "hk-ease-10481": ["id", "answer", "acceptedAnswers"],
    "hk-ease-10496": ["id", "answer", "acceptedAnswers"],
    "hk-ease-1041": ["id", "promptEn", "promptZh"]
  });
});

test("Phase2A builder fails closed on hash, structure, order, identity, and version-state mutations", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  const inputs = builder.readHongKongEaseExact3Phase2AInputs(process.cwd());

  const reordered = structuredClone(inputs);
  reordered.phase1Authority.orderedBaseIds.reverse();
  const reorderedPhase1Payload = { ...reordered.phase1Authority };
  delete reorderedPhase1Payload.authorityPayloadSha256;
  reordered.phase1Authority.authorityPayloadSha256 = sha256(
    JSON.stringify(reorderedPhase1Payload)
  );
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2ACandidateFromInputs(process.cwd(), reordered),
    /ORDERED_BASE_IDS_DRIFT/
  );

  const duplicate = structuredClone(inputs);
  duplicate.questionPack.questions.push(structuredClone(
    duplicate.questionPack.questions.find((row: JsonRecord) => row.id === ORDERED_BASE_IDS[0])
  ));
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2ACandidateFromInputs(process.cwd(), duplicate),
    /UNIQUE_QUESTION_PREIMAGE_REQUIRED/
  );

  const missingHistory = structuredClone(inputs);
  missingHistory.v2History.questions = missingHistory.v2History.questions.filter(
    (row: JsonRecord) => row.id !== "hk-ease-1041-v2"
  );
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2ACandidateFromInputs(process.cwd(), missingHistory),
    /UNIQUE_V2_HISTORY_PREIMAGE_REQUIRED/
  );

  const wrongVersion = structuredClone(inputs);
  wrongVersion.versionManifest.activeIdByHistoricalId["hk-ease-1041"] = "hk-ease-1041-v3";
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2ACandidateFromInputs(process.cwd(), wrongVersion),
    /VERSION_PREIMAGE_DRIFT/
  );

  const coherentlyRebound = structuredClone(inputs);
  const reboundQuestion = coherentlyRebound.questionPack.questions.find(
    (row: JsonRecord) => row.id === "hk-ease-10481"
  );
  const reboundHistory = coherentlyRebound.v2History.questions.find(
    (row: JsonRecord) => row.id === "hk-ease-10481-v2"
  );
  const reboundPhase1Row = coherentlyRebound.phase1Authority.rows.find(
    (row: JsonRecord) => row.baseId === "hk-ease-10481"
  );
  assert.ok(reboundQuestion && reboundHistory && reboundPhase1Row);
  reboundQuestion.explanationEn = `${reboundQuestion.explanationEn} Coherent tamper.`;
  reboundHistory.explanation.en = reboundQuestion.explanationEn;
  reboundPhase1Row.candidateQuestion.recordSha256 = sha256(JSON.stringify(reboundQuestion));
  reboundPhase1Row.frozenV2History.recordSha256 = sha256(JSON.stringify(reboundHistory));
  const reboundRowPayload = { ...reboundPhase1Row };
  delete reboundRowPayload.rowPreimageSha256;
  reboundPhase1Row.rowPreimageSha256 = sha256(JSON.stringify(reboundRowPayload));
  const reboundAuthorityPayload = { ...coherentlyRebound.phase1Authority };
  delete reboundAuthorityPayload.authorityPayloadSha256;
  coherentlyRebound.phase1Authority.authorityPayloadSha256 = sha256(
    JSON.stringify(reboundAuthorityPayload)
  );
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2ACandidateFromInputs(
      process.cwd(),
      coherentlyRebound
    ),
    /PHASE2A_PINNED_INPUT_DRIFT/
  );

  const fixtureRoot = mkdtempSync(join(starshipTmpRoot(), "hk-ease-exact3-phase2a-inputs-"));
  try {
    for (const path of builder.HK_EASE_EXACT3_PHASE2A_REQUIRED_INPUT_PATHS) copyPath(fixtureRoot, path);
    assert.doesNotThrow(() => builder.buildHongKongEaseExact3Phase2ACandidate(fixtureRoot));

    writeFileSync(resolve(fixtureRoot, PHASE1_PATH), "phase1 drift\n");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2ACandidate(fixtureRoot),
      /PHASE1_AUTHORITY_SHA256_DRIFT/
    );
    writeFileSync(resolve(fixtureRoot, PHASE1_PATH), readFileSync(resolve(process.cwd(), PHASE1_PATH)));

    writeFileSync(resolve(fixtureRoot, STEP0_RECEIPT_PATH), "step0 drift\n");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2ACandidate(fixtureRoot),
      /STEP0_RECEIPT_SHA256_DRIFT/
    );
    writeFileSync(
      resolve(fixtureRoot, STEP0_RECEIPT_PATH),
      readFileSync(resolve(process.cwd(), STEP0_RECEIPT_PATH))
    );

    writeFileSync(resolve(fixtureRoot, V2_HISTORY_PATH), "v2 history drift\n");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2ACandidate(fixtureRoot),
      /V2_HISTORY_SHA256_DRIFT/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }

  const liveFixtureRoot = mkdtempSync(join(
    starshipTmpRoot(),
    "hk-ease-exact3-phase2a-forbidden-live-"
  ));
  try {
    for (const path of builder.HK_EASE_EXACT3_PHASE2A_FORBIDDEN_LIVE_PATHS) {
      copyPath(liveFixtureRoot, path);
    }
    copyPath(liveFixtureRoot, V4_RUNTIME_SUCCESSOR_AUTHORITY_PATH);
    assert.doesNotThrow(() =>
      builder.verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
        liveFixtureRoot,
        "pre-materialization"
      )
    );
    writeFileSync(resolve(liveFixtureRoot, "data/questions.ts"), "forbidden live drift\n");
    assert.throws(
      () => builder.verifyHongKongEaseExact3Phase2ACandidateCreationLiveInventory(
        liveFixtureRoot,
        "post-materialization"
      ),
      /PHASE2A_FORBIDDEN_LIVE_POST_MATERIALIZATION_SHA256_DRIFT/
    );
  } finally {
    rmSync(liveFixtureRoot, { recursive: true, force: false });
  }
});

test("checked-in Phase2A artifacts are exact deterministic candidate-only bytes", async () => {
  const builder = await loadBuilder();
  if (!builder) return;
  const serialized = builder.serializeHongKongEaseExact3Phase2ACandidate(process.cwd());
  assert.deepEqual(Object.keys(serialized), OUTPUT_PATHS);
  for (const path of OUTPUT_PATHS) {
    assert.equal(existsSync(resolve(process.cwd(), path)), true, `${path}: missing candidate output`);
    if (!existsSync(resolve(process.cwd(), path))) continue;
    assert.equal(readFileSync(resolve(process.cwd(), path), "utf8"), serialized[path]);
  }
  assert.equal(
    sha256(readFileSync(resolve(process.cwd(), PHASE1_PATH))),
    PHASE1_SHA256,
    "Phase1 authority must remain byte-identical"
  );
  assert.equal(
    sha256(readFileSync(resolve(process.cwd(), STEP0_RECEIPT_PATH))),
    STEP0_RECEIPT_SHA256,
    "expanded STEP0 receipt must remain byte-identical"
  );
});
