import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

type JsonRecord = Record<string, any>;

const BUILDER_PATH =
  "coordination/content-qa/build-hk-ease-exact3-phase2b-atomic-promotion-plan.ts";
const OUTPUT_DIRECTORY =
  "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-atomic-promotion-plan-candidate-v2";
const PLAN_PATH = `${OUTPUT_DIRECTORY}/atomic-promotion-plan-v1.json`;
const AUTHORITY_PATH = `${OUTPUT_DIRECTORY}/atomic-promotion-plan-hold-authority-v1.json`;

const EXPECTED_TARGETS = [
  "data/generated-content/hk-ease-practice-bank-v2/question-pack.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contract-audit.json",
  "data/generated-content/hk-ease-practice-bank-v2/response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/simple-response-contracts.json",
  "data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json",
  "data/historical/hongKongQuestions-hk-ease-exact3-v3.json",
  "data/historical/hongKongQuestionVersionManifest.json",
  "data/hongKongEasePracticeQuestions.ts",
  "lib/hongKongQuestionVersioningContract.ts",
  "lib/hongKongQuestionVersioning.ts",
  "lib/server/hongKongEaseResponseContracts.ts",
  "lib/hongKongQuestionVersioning.test.ts",
  "lib/server/hongKongHistoricalQuestionProjection.test.ts",
  "lib/hongKongDisplayed74FigureHistoryContract.test.ts",
  "lib/hongKongResidual47RepairContract.test.ts",
  "lib/server/hongKongEaseResponseContracts.test.ts",
  "lib/hongKongResidual47FocusedTestLedger.ts",
  "coordination/content-qa/authoritative/2026-08-13-hk-residual47-focused-test-ledger.json",
  "coordination/content-qa/authoritative/2026-08-13-hk-ease-response-focused-test-ledger.json",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
  "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json",
  "data/generated-content/hk-ease-practice-bank-v2/independent-answer-oracle-v4.json",
  "coordination/content-qa/build-hk-ease-derivation-input-v4.ts",
  "coordination/content-qa/build-hk-ease-independent-oracle-v4-supplement.ts",
  "coordination/content-qa/build-hk-ease-independent-oracle-v4.ts",
  "lib/hongKongEaseIndependentOracleV4.test.ts",
  "lib/questionBankSolvability.ts",
  "lib/hongKongEaseIndependentOracle.ts",
  "lib/fullQuestionBankSolvability.test.ts",
  "coordination/content-qa/hk-question-bank-evidence-runner.mjs",
  "coordination/content-qa/hk-question-bank-evidence-runner.test.mjs",
  "lib/hongKongLessonQualityContract.test.ts"
] as const;

const EXPECTED_CREATION_TARGETS = [
  "data/generated-content/hk-ease-practice-bank-v2/exact3-independent-oracle-supplement.json",
  "data/historical/hongKongQuestions-hk-ease-exact3-v3.json"
] as const;

const EXPECTED_INVARIANTS: Record<string, string> = {
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

type BuilderModule = {
  HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS: JsonRecord[];
  HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH: string;
  HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH: string;
  HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_EXPECTED_OPERATION_COUNT: number;
  HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS: string[];
  readHongKongEaseExact3Phase2BAtomicPromotionInputs: (root: string) => JsonRecord;
  readHongKongEaseExact3PromotionFileCapture: (
    root: string,
    path: string,
    expectedExistence: "present" | "absent"
  ) => JsonRecord;
  buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs: (
    root: string,
    inputs: JsonRecord,
    operationSpecs?: JsonRecord[]
  ) => JsonRecord;
  buildHongKongEaseExact3Phase2BAtomicPromotionPlan: (root: string) => JsonRecord;
  serializeHongKongEaseExact3Phase2BAtomicPromotionPlan: (
    root: string
  ) => Record<string, string>;
  materializeHongKongEaseExact3Phase2BAtomicPromotionPlan: (
    root: string
  ) => Record<string, string>;
};

function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function loadBuilder() {
  const absolute = resolve(process.cwd(), BUILDER_PATH);
  assert.equal(
    lstatSync(absolute).isFile(),
    true,
    "atomic promotion plan builder must exist before candidate GREEN"
  );
  return await import(pathToFileURL(absolute).href) as BuilderModule;
}

test("Phase2B atomic promotion plan is an exact 32-operation candidate-only HOLD", async () => {
  const builder = await loadBuilder();
  assert.equal(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_PLAN_PATH, PLAN_PATH);
  assert.equal(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_AUTHORITY_PATH, AUTHORITY_PATH);
  assert.equal(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_EXPECTED_OPERATION_COUNT, 32);
  assert.equal(
    Object.isFrozen(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS),
    true,
    "the canonical operation topology must not be mutable after module load"
  );
  assert.equal(
    builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS.every(
      (entry) => Object.isFrozen(entry)
    ),
    true,
    "every canonical operation tuple must be runtime-frozen"
  );
  assert.throws(
    () => builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS.push(
      clone(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS[0])
    ),
    TypeError
  );
  assert.deepEqual(
    builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS.map(
      (entry) => entry.logicalTargetPath
    ),
    EXPECTED_TARGETS
  );

  const first = builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlan(process.cwd());
  const second = builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlan(process.cwd());
  assert.deepEqual(second, first);
  assert.equal(first.plan.status, "candidate-hold-dry-run-only-not-live-promotion");
  assert.equal(first.plan.operationTopology.exactOperationCount, 32);
  assert.equal(first.plan.operationTopology.replaceExistingCount, 30);
  assert.equal(first.plan.operationTopology.createNewCount, 2);
  assert.equal(first.plan.operationTopology.authorityOperationCounts["phase2b-canonical241"], 3);
  assert.equal(first.plan.operationTopology.authorityOperationCounts["phase2b-canonical216"], undefined);
  assert.deepEqual(first.plan.operationTopology.creationTargets, EXPECTED_CREATION_TARGETS);
  assert.deepEqual(first.plan.operations.map((entry: JsonRecord) => entry.index),
    Array.from({ length: 32 }, (_, index) => index));
  assert.deepEqual(first.plan.operations.map((entry: JsonRecord) => entry.logicalTargetPath),
    EXPECTED_TARGETS);
  assert.equal(new Set(first.plan.operations.map(
    (entry: JsonRecord) => entry.logicalTargetPath
  )).size, 32);
  assert.equal(first.plan.promotionBoundary.planExecutionAuthorized, false);
  assert.equal(first.plan.promotionBoundary.liveMutationAuthorized, false);
  assert.equal(first.plan.promotionBoundary.canonicalExecutionAuthorized, false);
  assert.equal(first.plan.promotionBoundary.browserExecutionAuthorized, false);
  assert.equal(first.plan.promotionBoundary.releaseAuthorized, false);
  assert.equal(first.authority.status, "candidate-hold-not-live-promotion");
  assert.equal(first.authority.promotion.livePromotionAuthorized, false);

  const canonicalAuthority = first.plan.sourceAuthorityBindings.find(
    (entry: JsonRecord) => entry.id === "phase2b-canonical241"
  );
  assert.deepEqual(canonicalAuthority, {
    id: "phase2b-canonical241",
    path: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/canonical241-hold-authority-v1.json",
    sha256: "6c7bb255da043e19d7c71c75184bfa7ea34e7929ebc18ed1c1249a77c563436c",
    schemaVersion: "hk-ease-exact3-phase2b-canonical241-candidate-hold-authority-v1",
    status: "candidate-hold-not-live-promotion",
    authorityPayloadSha256: "0a4865e0f3816b45f3c3817d7261f10cd7ec99b70a363f8c60540454ea71306f"
  });
  assert.deepEqual(
    first.plan.operations.slice(-3).map((entry: JsonRecord) => ({
      authorityId: entry.sourceAuthority.id,
      candidatePath: entry.candidate.path,
      sha256: entry.candidate.sha256,
      byteLength: entry.candidate.byteLength
    })),
    [
      {
        authorityId: "phase2b-canonical241",
        candidatePath: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/hk-question-bank-evidence-runner.mjs.snapshot",
        sha256: "9b0b33739b1f4150d36dd03501e590b556350865c5c551c5f8f417cb40b67b4c",
        byteLength: 115714
      },
      {
        authorityId: "phase2b-canonical241",
        candidatePath: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/hk-question-bank-evidence-runner.test.mjs.snapshot",
        sha256: "820b1a4334cfdff756c1f97eb68e932ddc3b7bcafe9b84291a1d0db716eae0be",
        byteLength: 59308
      },
      {
        authorityId: "phase2b-canonical241",
        candidatePath: "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/lib-hongKongLessonQualityContract.test.ts.snapshot",
        sha256: "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11",
        byteLength: 45108
      }
    ]
  );

  const lessonContractOperation = first.plan.operations.at(-1);
  assert.equal(
    lessonContractOperation.currentPreimage.path,
    "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-canonical241-candidate-v4/lib-hongKongLessonQualityContract.test.ts.preimage.snapshot"
  );
  assert.equal(
    lessonContractOperation.currentPreimage.sha256,
    "15a54de50c52ac839b01f9560b8ddc475abdcde4163beb6abc9204f68ffdf557"
  );
  assert.equal(
    lessonContractOperation.preappliedCandidateWorkspaceTarget.path,
    "lib/hongKongLessonQualityContract.test.ts"
  );
  assert.equal(
    lessonContractOperation.preappliedCandidateWorkspaceTarget.sha256,
    "14ed04358cff26d50a60d69437c5d43ca14aba6a744de70645fa7c95fc9eee11"
  );

  assert.deepEqual(
    first.plan.operations
      .filter((entry: JsonRecord) =>
        entry.preimageEvidence?.classification === "atomic-plan-current-byte-pin")
      .map((entry: JsonRecord) => entry.logicalTargetPath),
    [
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-sanitized-derivation-input.json",
      "coordination/content-qa/authoritative/hk-ease-701-independent-oracle/v4-row-specific-derivation-supplement.json"
    ],
    "only the two historical V4 data coordinates lack an upstream preimage field and must be disclosed"
  );

  for (const operation of first.plan.operations) {
    assert.equal(operation.candidate.mode, "0444");
    assert.equal(operation.candidate.regularFile, true);
    assert.equal(operation.candidate.symbolicLink, false);
    if (operation.operation === "replace-existing") {
      assert.equal(operation.currentPreimage.regularFile, true);
      assert.equal(operation.currentPreimage.symbolicLink, false);
      assert.match(operation.currentPreimage.sha256, /^[0-9a-f]{64}$/);
    } else {
      assert.equal(operation.operation, "create-new");
      assert.equal(operation.currentPreimage, null);
    }
  }

  assert.deepEqual(
    Object.fromEntries(first.plan.unchangedInvariants.map(
      (entry: JsonRecord) => [entry.path, entry.sha256]
    )),
    EXPECTED_INVARIANTS
  );
  assert.deepEqual(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS,
    [
      "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate/generation-shadow-bridge.ts.snapshot"
    ]);
  assert.deepEqual(first.plan.diagnosticExclusions,
    builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_DIAGNOSTIC_EXCLUSIONS);
});

test("Phase2B atomic promotion plan rejects every authority, candidate, preimage, and topology drift", async () => {
  const builder = await loadBuilder();
  const inputs = builder.readHongKongEaseExact3Phase2BAtomicPromotionInputs(process.cwd());

  for (const authorityId of Object.keys(inputs.authorities)) {
    const mutated = clone(inputs);
    mutated.authorities[authorityId].bytesBase64 = Buffer.from("{}", "utf8").toString("base64");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
        process.cwd(), mutated
      ),
      /PHASE2B_PROMOTION_AUTHORITY_DRIFT/
    );
  }

  {
    const mutated = clone(inputs);
    mutated.independentReviewReceipt.bytesBase64 = Buffer.from("{}", "utf8").toString("base64");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
        process.cwd(), mutated
      ),
      /PHASE2B_PROMOTION_INDEPENDENT_RECEIPT_DRIFT/
    );
  }

  for (const spec of builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS) {
    const candidateMutation = clone(inputs);
    candidateMutation.files[spec.candidatePhysicalPath].bytesBase64 =
      Buffer.from("candidate drift", "utf8").toString("base64");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
        process.cwd(), candidateMutation
      ),
      /PHASE2B_PROMOTION_CANDIDATE_DRIFT/
    );

    if (spec.operation === "replace-existing") {
      const preimageMutation = clone(inputs);
      preimageMutation.files[spec.logicalTargetPath].bytesBase64 =
        Buffer.from("preimage drift", "utf8").toString("base64");
      assert.throws(
        () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
          process.cwd(), preimageMutation
        ),
        /PHASE2B_PROMOTION_PREIMAGE_DRIFT/
      );
      if (typeof spec.preimagePhysicalPath === "string") {
        const physicalPreimageMutation = clone(inputs);
        physicalPreimageMutation.files[spec.preimagePhysicalPath].bytesBase64 =
          Buffer.from("physical preimage drift", "utf8").toString("base64");
        assert.throws(
          () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
            process.cwd(), physicalPreimageMutation
          ),
          /PHASE2B_PROMOTION_PREIMAGE_DRIFT/
        );
      }
    } else {
      const creationCollision = clone(inputs);
      creationCollision.files[spec.logicalTargetPath] = clone(
        inputs.files[builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS[0]
          .logicalTargetPath]
      );
      creationCollision.files[spec.logicalTargetPath].path = spec.logicalTargetPath;
      assert.throws(
        () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
          process.cwd(), creationCollision
        ),
        /PHASE2B_PROMOTION_CREATION_COLLISION/
      );
    }
  }

  for (const invariantPath of Object.keys(EXPECTED_INVARIANTS)) {
    const mutated = clone(inputs);
    mutated.files[invariantPath].bytesBase64 = Buffer.from("invariant drift", "utf8").toString("base64");
    assert.throws(
      () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
        process.cwd(), mutated
      ),
      /PHASE2B_PROMOTION_UNCHANGED_INVARIANT_DRIFT/
    );
  }

  const missing = clone(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS);
  missing.pop();
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
      process.cwd(), inputs, missing
    ),
    /PHASE2B_PROMOTION_OPERATION_TOPOLOGY_INVALID/
  );

  const duplicate = clone(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS);
  duplicate[1].logicalTargetPath = duplicate[0].logicalTargetPath;
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
      process.cwd(), inputs, duplicate
    ),
    /PHASE2B_PROMOTION_OPERATION_TOPOLOGY_INVALID/
  );

  const bridge = clone(builder.HK_EASE_EXACT3_PHASE2B_ATOMIC_PROMOTION_OPERATION_SPECS);
  bridge.push({
    ...clone(bridge[0]),
    logicalTargetPath: "lib/forbidden-generation-shadow-bridge.ts",
    candidatePhysicalPath:
      "coordination/content-qa/authoritative/hk-ease-exact3-production-repair/phase2b-v4-lineage-candidate/generation-shadow-bridge.ts.snapshot"
  });
  assert.throws(
    () => builder.buildHongKongEaseExact3Phase2BAtomicPromotionPlanFromInputs(
      process.cwd(), inputs, bridge
    ),
    /PHASE2B_PROMOTION_DIAGNOSTIC_ARTIFACT_FORBIDDEN/
  );
});

test("Phase2B promotion reader rejects lexical, final-symlink, and intermediate-symlink escapes", async () => {
  const builder = await loadBuilder();
  const configuredTmpdir = process.env.TMPDIR;
  assert.ok(typeof configuredTmpdir === "string");
  assert.equal(resolve(configuredTmpdir).startsWith("/Volumes/Starship/"), true);
  const fixtureRoot = mkdtempSync(join(configuredTmpdir, "phase2b-promotion-paths."));
  try {
    mkdirSync(join(fixtureRoot, "safe"));
    mkdirSync(join(fixtureRoot, "outside"));
    writeFileSync(join(fixtureRoot, "safe", "file.txt"), "safe", "utf8");
    writeFileSync(join(fixtureRoot, "safe", "ExactCase.txt"), "case", "utf8");
    writeFileSync(join(fixtureRoot, "outside", "file.txt"), "outside", "utf8");
    symlinkSync(join(fixtureRoot, "outside", "file.txt"), join(fixtureRoot, "safe", "final-link"));
    symlinkSync(join(fixtureRoot, "outside"), join(fixtureRoot, "safe", "directory-link"));

    assert.equal(
      builder.readHongKongEaseExact3PromotionFileCapture(
        fixtureRoot, "safe/file.txt", "present"
      ).sha256,
      sha256("safe")
    );
    assert.throws(
      () => builder.readHongKongEaseExact3PromotionFileCapture(
        fixtureRoot, "safe/../outside/file.txt", "present"
      ),
      /PHASE2B_PROMOTION_PATH_INVALID/
    );
    assert.throws(
      () => builder.readHongKongEaseExact3PromotionFileCapture(
        fixtureRoot, "safe/final-link", "present"
      ),
      /PHASE2B_PROMOTION_PATH_INVALID/
    );
    assert.throws(
      () => builder.readHongKongEaseExact3PromotionFileCapture(
        fixtureRoot, "safe/directory-link/file.txt", "present"
      ),
      /PHASE2B_PROMOTION_PATH_INVALID/
    );
    assert.throws(
      () => builder.readHongKongEaseExact3PromotionFileCapture(
        fixtureRoot, "safe/exactcase.txt", "present"
      ),
      /PHASE2B_PROMOTION_PATH_INVALID/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
});

test("Phase2B checked-in atomic promotion plan is exact, immutable, and contains only two HOLD artifacts", async () => {
  const builder = await loadBuilder();
  const serialized = builder.materializeHongKongEaseExact3Phase2BAtomicPromotionPlan(
    process.cwd()
  );
  assert.deepEqual(Object.keys(serialized), [PLAN_PATH, AUTHORITY_PATH]);
  assert.deepEqual(readdirSync(resolve(process.cwd(), OUTPUT_DIRECTORY)).sort(), [
    "atomic-promotion-plan-hold-authority-v1.json",
    "atomic-promotion-plan-v1.json"
  ]);
  for (const path of [PLAN_PATH, AUTHORITY_PATH]) {
    const absolute = resolve(process.cwd(), path);
    const stat = lstatSync(absolute);
    assert.equal(stat.isFile(), true, path);
    assert.equal(stat.isSymbolicLink(), false, path);
    assert.equal(stat.mode & 0o777, 0o444, path);
    assert.equal(readFileSync(absolute, "utf8"), serialized[path], path);
  }
});
