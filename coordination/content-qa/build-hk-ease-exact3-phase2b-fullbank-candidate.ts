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
  "coordination/content-qa/build-hk-ease-exact3-phase2b-fullbank-candidate.ts";
const FOCUSED_TEST_PATH =
  "coordination/content-qa/hk-ease-exact3-phase2b-fullbank-candidate.test.ts";

export const HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-fullbank-candidate";

const LOGICAL_TARGET_PATHS = [
  "lib/questionBankSolvability.ts",
  "lib/hongKongEaseIndependentOracle.ts",
  "lib/fullQuestionBankSolvability.test.ts"
] as const;
type LogicalTargetPath = (typeof LOGICAL_TARGET_PATHS)[number];

const SOURCE_PREIMAGE_SHA256_BY_PATH: Record<LogicalTargetPath, string> = {
  "lib/questionBankSolvability.ts":
    "48970ce1a17231269fd03c35d257272b1a0b7fb60c346462cbf230df3d43984d",
  "lib/hongKongEaseIndependentOracle.ts":
    "0263947c3449d42f378ae721c555896b429fbfab309081229500eab6fb96045b",
  "lib/fullQuestionBankSolvability.test.ts":
    "f964d1f2d11dbd5eeb8c1ebf2aea5a3bdf73d73189ed511fa68dc09d2ebe984c"
};

const PRIOR_AUTHORITY_BINDINGS = {
  dataPlane: {
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-data-plane-candidate/candidate-hold-authority-v1.json",
    sha256: "572b0c9826db2c11fe3ec235a375676a82e6155283b8fa20a5a78f5f161eba16",
    schemaVersion: "hk-ease-exact3-phase2b-data-plane-candidate-hold-authority-v1",
    status: "candidate-hold-not-promotable-until-phase3"
  },
  runtime: {
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-runtime-candidate/runtime-hold-authority-v1.json",
    sha256: "980ab2f3ec057a9f09d2fa2faccd787b9c9f03de838efa78eaa8b48056e26013",
    schemaVersion: "hk-ease-exact3-phase2b-serving-runtime-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion"
  },
  historicalRegression: {
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-historical-regression-candidate/historical-regression-hold-authority-v1.json",
    sha256: "cef3e6916ed0c050d4843fb71ed9005f4830df1dabebd76a95ab6ee16e14a1ea",
    schemaVersion: "hk-ease-exact3-phase2b-historical-regression-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion"
  },
  v4Lineage: {
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate/candidate-hold-authority-v1.json",
    sha256: "14af10dc5cfdb24e1f4dfda4678aa9c88819f7afac7eaaa377c2d845bc383948",
    schemaVersion: "hk-ease-exact3-v4-lineage-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion"
  }
} as const;

const IMMUTABLE_PREIMAGE_BINDINGS = {
  questionPack: {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2.json",
    sha256: "fa5b861a84a502725b9286d71961bd27a58bf6bf09e4d2412b7f4b1a1aca03e2"
  },
  responseAudit: {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28.json",
    sha256: "3ae431cd883638f2a60924816353540bfead2a11463558417b690caf11986a28"
  },
  responseContracts: {
    logicalPath: "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/preimages/sha256/06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4.json",
    sha256: "06c1bc402b6d16b0d453743a001cc164bd68aa9128f6bddd744efabfa8006ab4"
  }
} as const;

const SNAPSHOT_BASENAME_BY_TARGET: Record<LogicalTargetPath, string> = {
  "lib/questionBankSolvability.ts": "lib-questionBankSolvability.ts.snapshot",
  "lib/hongKongEaseIndependentOracle.ts": "lib-hongKongEaseIndependentOracle.ts.snapshot",
  "lib/fullQuestionBankSolvability.test.ts": "lib-fullQuestionBankSolvability.test.ts.snapshot"
};

export type HongKongEaseExact3Phase2BFullbankCandidateInputs = {
  repositoryRoot: string;
  sourcePreimages: Record<LogicalTargetPath, string>;
  priorAuthorities: {
    [K in keyof typeof PRIOR_AUTHORITY_BINDINGS]: JsonRecord;
  };
  immutablePreimages: {
    -readonly [K in keyof typeof IMMUTABLE_PREIMAGE_BINDINGS]: string;
  };
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

function readRegularText(repositoryRoot: string, relativePath: string) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("PHASE2B5_INPUT_NOT_REGULAR", relativePath);
  }
  return readFileSync(absolutePath, "utf8");
}

function readJson(repositoryRoot: string, relativePath: string) {
  return JSON.parse(readRegularText(repositoryRoot, relativePath)) as JsonRecord;
}

function replaceOnce(source: string, before: string, after: string, label: string) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) {
    fail("PHASE2B5_SOURCE_ANCHOR_DRIFT", `${label}:${first < 0 ? 0 : 2}`);
  }
  return `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
}

function assertAuthority(name: keyof typeof PRIOR_AUTHORITY_BINDINGS, authority: JsonRecord) {
  const expected = PRIOR_AUTHORITY_BINDINGS[name];
  if (sha256(prettyJson(authority)) !== expected.sha256) {
    fail("PHASE2B5_PRIOR_AUTHORITY_DRIFT", `${name}:file-sha256`);
  }
  const { authorityPayloadSha256, ...payload } = authority;
  if (
    authority.schemaVersion !== expected.schemaVersion ||
    authority.status !== expected.status ||
    typeof authorityPayloadSha256 !== "string" ||
    authorityPayloadSha256 !== sha256(JSON.stringify(payload))
  ) {
    fail("PHASE2B5_PRIOR_AUTHORITY_DRIFT", `${name}:payload`);
  }
}

function assertInputs(inputs: HongKongEaseExact3Phase2BFullbankCandidateInputs) {
  for (const path of LOGICAL_TARGET_PATHS) {
    if (sha256(inputs.sourcePreimages[path]) !== SOURCE_PREIMAGE_SHA256_BY_PATH[path]) {
      fail("PHASE2B5_SOURCE_PREIMAGE_DRIFT", path);
    }
  }
  for (const name of Object.keys(PRIOR_AUTHORITY_BINDINGS) as Array<keyof typeof PRIOR_AUTHORITY_BINDINGS>) {
    assertAuthority(name, inputs.priorAuthorities[name]);
  }
  for (const name of Object.keys(IMMUTABLE_PREIMAGE_BINDINGS) as Array<keyof typeof IMMUTABLE_PREIMAGE_BINDINGS>) {
    const binding = IMMUTABLE_PREIMAGE_BINDINGS[name];
    const bytes = inputs.immutablePreimages[name];
    if (sha256(bytes) !== binding.sha256) {
      fail("PHASE2B5_IMMUTABLE_PREIMAGE_DRIFT", name);
    }
    let parsed: JsonRecord;
    try {
      parsed = JSON.parse(bytes) as JsonRecord;
    } catch {
      fail("PHASE2B5_IMMUTABLE_PREIMAGE_DRIFT", `${name}:json`);
    }
    if (name === "questionPack" && (!Array.isArray(parsed.questions) || parsed.questions.length !== 701)) {
      fail("PHASE2B5_IMMUTABLE_PREIMAGE_DRIFT", `${name}:shape`);
    }
    if (name !== "questionPack" && (!Array.isArray(parsed.entries) || parsed.entries.length !== 344)) {
      fail("PHASE2B5_IMMUTABLE_PREIMAGE_DRIFT", `${name}:shape`);
    }
  }
}

export function loadHongKongEaseExact3Phase2BFullbankCandidateInputs(
  repositoryRoot = process.cwd()
): HongKongEaseExact3Phase2BFullbankCandidateInputs {
  return {
    repositoryRoot,
    sourcePreimages: Object.fromEntries(
      LOGICAL_TARGET_PATHS.map((path) => [path, readRegularText(repositoryRoot, path)])
    ) as Record<LogicalTargetPath, string>,
    priorAuthorities: Object.fromEntries(
      (Object.keys(PRIOR_AUTHORITY_BINDINGS) as Array<keyof typeof PRIOR_AUTHORITY_BINDINGS>)
        .map((name) => [name, readJson(repositoryRoot, PRIOR_AUTHORITY_BINDINGS[name].path)])
    ) as HongKongEaseExact3Phase2BFullbankCandidateInputs["priorAuthorities"],
    immutablePreimages: Object.fromEntries(
      (Object.keys(IMMUTABLE_PREIMAGE_BINDINGS) as Array<keyof typeof IMMUTABLE_PREIMAGE_BINDINGS>)
        .map((name) => [name, readRegularText(repositoryRoot, IMMUTABLE_PREIMAGE_BINDINGS[name].path)])
    ) as HongKongEaseExact3Phase2BFullbankCandidateInputs["immutablePreimages"]
  };
}

export function buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs(
  inputs: HongKongEaseExact3Phase2BFullbankCandidateInputs
) {
  assertInputs(inputs);

  const oldIndependentAnswer =
    "supp-p1-counting-number-bonds-common-check\tCheck whether the missing number is before or after the given number";
  const repairedIndependentAnswer =
    "supp-p1-counting-number-bonds-common-check\tCheck whether the question asks for the number before, the number after, or a missing part";
  const solvabilityPostimage = replaceOnce(
    inputs.sourcePreimages["lib/questionBankSolvability.ts"],
    oldIndependentAnswer,
    repairedIndependentAnswer,
    "residual28-independent-answer"
  );

  let oraclePostimage = inputs.sourcePreimages["lib/hongKongEaseIndependentOracle.ts"];
  const semanticPathAnchor = `const semanticShardPaths = [
  \`\${evidenceRoot}/semantic-shard-a.json\`,
  \`\${evidenceRoot}/semantic-shard-b.json\`,
  \`\${evidenceRoot}/semantic-shard-c.json\`
] as const;
`;
  const immutableResolverBlock = `${semanticPathAnchor}
export const HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH: Readonly<Record<string, string>> = Object.freeze({
  [questionPackPath]:
    "${IMMUTABLE_PREIMAGE_BINDINGS.questionPack.path}",
  [responseContractAuditPath]:
    "${IMMUTABLE_PREIMAGE_BINDINGS.responseAudit.path}",
  [responseContractsPath]:
    "${IMMUTABLE_PREIMAGE_BINDINGS.responseContracts.path}"
});
`;
  oraclePostimage = replaceOnce(
    oraclePostimage,
    semanticPathAnchor,
    immutableResolverBlock,
    "immutable-evidence-resolver"
  );
  oraclePostimage = replaceOnce(
    oraclePostimage,
    "  const bytes = readFileSync(join(process.cwd(), relativePath));",
    "  const physicalPath = HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[relativePath] ?? relativePath;\n  const bytes = readFileSync(join(process.cwd(), physicalPath));",
    "evidence-physical-resolution"
  );
  oraclePostimage = replaceOnce(
    oraclePostimage,
    "  const questionPackBytes = readFileSync(join(process.cwd(), questionPackPath));",
    "  const questionPackBytes = evidenceBytes(questionPackPath);",
    "oracle-question-pack-preimage-resolution"
  );

  let fullBankPostimage = inputs.sourcePreimages["lib/fullQuestionBankSolvability.test.ts"];
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "    HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH: Readonly<Record<string, string>>;",
    "    HONG_KONG_EASE_INDEPENDENT_EVIDENCE_SHA256_BY_PATH: Readonly<Record<string, string>>;\n    HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH: Readonly<Record<string, string>>;",
    "fullbank-oracle-builder-physical-map-type"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "readFileSync(join(process.cwd(), relativePath))",
    "readFileSync(join(\n          process.cwd(),\n          independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[relativePath] ?? relativePath\n        ))",
    "fullbank-immutable-evidence-read"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "import {\n  HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,",
    "import {\n  HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256,\n  HONG_KONG_EASE_V3_INDEPENDENT_ORACLE_SHA256,",
    "fullbank-overlay-sha-import"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "import independentHongKongEaseOracleJson from \"../data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json\";",
    "import independentHongKongEaseOracleJson from \"../data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle.json\";\nimport exact3OracleOverlayJson from \"../data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json\";",
    "fullbank-overlay-json-import"
  );
  const overlayAuditBlock = `

  const exact3Overlay = exact3OracleOverlayJson as {
    schemaVersion: string;
    status: string;
    orderedBaseIds: string[];
    rowCount: number;
    aggregateExpectations: {
      acceptedAnswerFormsReviewed: number;
      calculationDifferenceCount: number;
      strictNegativeCalculationCount: number;
    };
    questions: Array<{ baseId: string; independentlyReviewedAnswer: string }>;
  };
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(process.cwd(), "data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json")))
      .digest("hex"),
    HONG_KONG_EASE_EXACT3_ORACLE_OVERLAY_SHA256
  );
  assert.equal(exact3Overlay.schemaVersion, "hk-ease-exact3-phase2b-independent-answer-oracle-overlay-supplement-v2");
  assert.equal(exact3Overlay.status, "candidate-overlay-approved-not-live-promotion");
  assert.deepEqual(exact3Overlay.orderedBaseIds, ["hk-ease-10481", "hk-ease-10496", "hk-ease-1041"]);
  assert.equal(exact3Overlay.rowCount, 3);
  assert.equal(exact3Overlay.aggregateExpectations.acceptedAnswerFormsReviewed, 1912);
  assert.equal(exact3Overlay.aggregateExpectations.calculationDifferenceCount, 167);
  assert.equal(exact3Overlay.aggregateExpectations.strictNegativeCalculationCount, 64);
  const exact3OverlayById = new Map(
    exact3Overlay.questions.map((row) => [row.baseId, row])
  );`;
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "\n\n  const declaredSimpleLedger = declaredSimpleLedgerJson as {",
    `${overlayAuditBlock}\n\n  const declaredSimpleLedger = declaredSimpleLedgerJson as {`,
    "fullbank-overlay-audit"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "  const cloneCandidate = () => structuredClone(questionPackJson) as unknown as {",
    `  const v3PreimageLogicalPath = "data/generated-content/hk-ease-practice-bank-v2/question-pack.json";
  const v3PreimagePhysicalPath =
    independentOracleBuilder.HONG_KONG_EASE_INDEPENDENT_EVIDENCE_PHYSICAL_PATH_BY_LOGICAL_PATH[v3PreimageLogicalPath] ??
    v3PreimageLogicalPath;
  const immutableV3QuestionPackJson = JSON.parse(
    readFileSync(join(process.cwd(), v3PreimagePhysicalPath), "utf8")
  );
  const cloneCandidate = () => structuredClone(immutableV3QuestionPackJson) as unknown as {`,
    "fullbank-v3-mutation-preimage"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "    const oracleRow = independentOracle.questions[index];\n    assert.ok(metadata, `${question.id} should have EASE QA metadata`);",
    "    const oracleRow = independentOracle.questions[index];\n    const exact3OverlayRow = exact3OverlayById.get(question.id);\n    const expectedReviewedAnswer = exact3OverlayRow?.independentlyReviewedAnswer ?? oracleRow?.independentlyReviewedAnswer;\n    assert.ok(metadata, `${question.id} should have EASE QA metadata`);",
    "fullbank-current-overlay-row"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "    assert.equal(oracleRow?.independentlyReviewedAnswer, question.answer);",
    "    assert.equal(expectedReviewedAnswer, question.answer);",
    "fullbank-current-reviewed-answer"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "      \"approved-for-integration-review-semantic-content-boundary\"",
    "      \"approved-for-integration-review-semantic-content-boundary+exact3-independent-overlay-v2\"",
    "fullbank-overlay-status"
  );
  fullBankPostimage = replaceOnce(
    fullBankPostimage,
    "    assert.equal(metadata.independentlyReviewedAnswer, oracleRow.independentlyReviewedAnswer);",
    "    assert.equal(metadata.independentlyReviewedAnswer, expectedReviewedAnswer);",
    "fullbank-overlay-reviewed-answer"
  );

  const postimages: Record<LogicalTargetPath, string> = {
    "lib/questionBankSolvability.ts": solvabilityPostimage,
    "lib/hongKongEaseIndependentOracle.ts": oraclePostimage,
    "lib/fullQuestionBankSolvability.test.ts": fullBankPostimage
  };
  const postimageBindings = LOGICAL_TARGET_PATHS.map((logicalTargetPath) => {
    const bytes = postimages[logicalTargetPath];
    return {
      logicalTargetPath,
      preimageSha256: SOURCE_PREIMAGE_SHA256_BY_PATH[logicalTargetPath],
      snapshotPath: `${HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY}/${SNAPSHOT_BASENAME_BY_TARGET[logicalTargetPath]}`,
      sha256: sha256(bytes),
      byteLength: Buffer.byteLength(bytes, "utf8")
    };
  });

  return {
    schemaVersion: "hk-ease-exact3-phase2b-fullbank-candidate-v1" as const,
    status: "candidate-hold-not-live-promotion" as const,
    postimages,
    postimageBindings,
    semanticClosure: {
      exactResidualQuestionId: "supp-p1-counting-number-bonds-common-check-v3",
      independentAnswerSourceKey: "supp-p1-counting-number-bonds-common-check",
      expectedQuestionBankTotal: 24580,
      expectedQuestionBankPassRows: 24580,
      v3OracleReplayCoordinate: "immutable-step0-preimage-not-live-postimage"
    }
  };
}

export function buildHongKongEaseExact3Phase2BFullbankCandidate(repositoryRoot = process.cwd()) {
  return buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs(
    loadHongKongEaseExact3Phase2BFullbankCandidateInputs(repositoryRoot)
  );
}

function implementationBinding(repositoryRoot: string, path: string) {
  const bytes = readRegularText(repositoryRoot, path);
  return { path, sha256: sha256(bytes), byteLength: Buffer.byteLength(bytes, "utf8") };
}

function buildAuthority(
  repositoryRoot: string,
  candidate: ReturnType<typeof buildHongKongEaseExact3Phase2BFullbankCandidateFromInputs>
) {
  const payload = {
    schemaVersion: "hk-ease-exact3-phase2b-fullbank-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    boundary:
      "candidate-only closure of the full-bank independent-answer and immutable V3 replay gaps; no live source mutation, canonical execution, browser evidence, or release authorization",
    implementationBindings: [
      implementationBinding(repositoryRoot, BUILDER_PATH),
      implementationBinding(repositoryRoot, FOCUSED_TEST_PATH)
    ],
    priorAuthorityBindings: Object.entries(PRIOR_AUTHORITY_BINDINGS).map(([name, binding]) => ({
      name,
      path: binding.path,
      sha256: binding.sha256,
      schemaVersion: binding.schemaVersion,
      status: binding.status
    })),
    immutablePreimageBindings: Object.entries(IMMUTABLE_PREIMAGE_BINDINGS).map(([name, binding]) => ({
      name,
      ...binding,
      role: "authoritative-pre-promotion-byte-source"
    })),
    outputBindings: candidate.postimageBindings,
    semanticClosure: candidate.semanticClosure,
    promotion: {
      liveMutationAuthorized: false,
      fullBankCanonicalAuthorized: false,
      browserAuthorized: false,
      releaseAuthorized: false,
      remainingGates: [
        "isolated full-bank shadow replay against exact Phase2B.1-.5 bytes",
        "exact216 canonical runner candidate and independent source authority",
        "independent A18 V4 delta review",
        "browser and release evidence"
      ]
    }
  };
  return { ...payload, authorityPayloadSha256: sha256(JSON.stringify(payload)) };
}

function writeImmutable(repositoryRoot: string, relativePath: string, bytes: string) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  if (existsSync(absolutePath)) {
    const stat = lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink() || readFileSync(absolutePath, "utf8") !== bytes) {
      fail("PHASE2B5_MATERIALIZATION_COLLISION", relativePath);
    }
    chmodSync(absolutePath, 0o444);
    return;
  }
  writeFileSync(absolutePath, bytes, { flag: "wx", mode: 0o444 });
  chmodSync(absolutePath, 0o444);
}

export function materializeHongKongEaseExact3Phase2BFullbankCandidate(
  repositoryRoot = process.cwd()
) {
  const candidate = buildHongKongEaseExact3Phase2BFullbankCandidate(repositoryRoot);
  for (const binding of candidate.postimageBindings) {
    writeImmutable(repositoryRoot, binding.snapshotPath, candidate.postimages[binding.logicalTargetPath]);
  }
  const authority = buildAuthority(repositoryRoot, candidate);
  const authorityPath =
    `${HONG_KONG_EASE_EXACT3_PHASE2B_FULLBANK_CANDIDATE_DIRECTORY}/fullbank-hold-authority-v1.json`;
  writeImmutable(repositoryRoot, authorityPath, prettyJson(authority));
  return { ...candidate, authority, authorityPath };
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isMain) {
  const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  materializeHongKongEaseExact3Phase2BFullbankCandidate(repositoryRoot);
}
