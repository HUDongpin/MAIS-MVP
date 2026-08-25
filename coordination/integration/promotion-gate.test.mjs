import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, writeFileSync } from "node:fs";
import { access, chmod, link, mkdir, mkdtemp, open, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as gateLib from "./promotion-gate-lib.mjs";

const { stableJson } = gateLib;
const execFileAsync = promisify(execFile);

const REQUIRED_OWNERS = ["A21", "A18", "A04", "A05", "A23", "A11", "A22", "A24", "A25"];
const EVIDENCE_KIND_BY_ROLE = {
  A21: "candidate-generation",
  A18: "independent-qa",
  A04: "practice-semantics",
  A05: "lesson-semantics",
  A23: "promotion-plan",
  A11: "targeted-regression",
  A22: "release-readiness",
  A24: "exact-layer",
  A25: "release-intake"
};
const REQUIRED_CHECK_IDS = [
  "manifest-contract",
  "candidate-integrity",
  "evidence-currentness",
  "mapping-compatibility",
  "rollback-rehearsal",
  "live-reachability",
  "forbidden-diff",
  "legacy-ratchet"
];
const LEGACY_PACKAGE_ID = "us-ca-k5-knowledge-point-practice-v1";
const LEGACY_PACKAGE_PATH = "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json";
const LEGACY_ANCHOR_REGISTRY = gateLib.LEGACY_INITIAL_ANCHOR_FACTS;
const LEGACY_GRADE_DISTRIBUTION = { K: 72, P1: 192, P2: 48, P3: 60, P4: 60, P5: 60 };
const CANONICAL_RUNTIME_ROOTS = ["app", "components", "data", "lib", "public"];
const CANONICAL_RUNTIME_ENTRYPOINTS = [
  "data/rag/usMath.ts",
  "lib/rag/usMath.ts",
  "data/usCaliforniaTopics.ts",
  "data/usCaliforniaQuestions.ts",
  "data/questions.ts",
  "data/usCaliforniaLessons.ts",
  "data/lessons.ts",
  "lib/server/questionStore.ts",
  "lib/server/userStore.ts",
  "app/api/questions/route.ts",
  "app/api/lesson-entry/route.ts",
  "app/api/lessons/[slug]/route.ts",
  "app/practice/page.tsx",
  "components/providers/AppProviders.tsx",
  "components/lesson/lessonEntryTarget.ts",
  "components/lesson/StudentLessonPage.tsx",
  "components/lesson/StudentLessonEntryPage.tsx",
  "components/lesson/LessonView.tsx",
  "app/student/lessons/route.ts"
];
const CANONICAL_RUNTIME_SPECIAL_FILES = ["middleware.ts"];
const RUNTIME_CLASSIFICATION_KINDS = [
  "test-code",
  "audit-script",
  "generated-code",
  "data-json",
  "asset",
  "documentation",
  "placeholder",
  "runtime-metadata",
  "runtime-code"
];
const CANONICAL_LEGACY_DISCOVERY_ROOTS = [
  "coordination/content-qa",
  "data/generated-content",
  "data/rag"
];
const CANONICAL_CANDIDATE_SELECTION = [
  {
    kind: "safe-card",
    id: "ca-rag-v2-cluster-grade-6-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/safe-card-drafts.json",
    jsonPointer: "/108"
  },
  {
    kind: "practice",
    id: "s04-ca-rag-v2-q031-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s04-question-candidate-pack.json",
    jsonPointer: "/questions/30"
  },
  {
    kind: "lesson",
    id: "s05-ca-rag-v2-lesson-031-6-rp-ratios",
    path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json",
    jsonPointer: "/lessons/30"
  }
];
const CHECKER_RELEASE_MAPPING_PATH = "coordination/integration/checker-releases.v1.json";
const CHECKER_BUNDLE_PATHS = [
  "coordination/integration/promotion-gate-lib.mjs",
  "coordination/integration/promotion-gate.mjs",
  "coordination/integration/schemas/promotion-manifest.v1.schema.json",
  "coordination/integration/schemas/promotion-receipt.v1.schema.json",
  "coordination/integration/promotion-gate.test.mjs",
  "package.json",
  "package-lock.json"
];

function refreshReceiptCheckEvidenceDigest(receipt, checkId) {
  const payloads = {
    "manifest-contract": {
      manifest: receipt.manifest,
      mode: receipt.mode,
      binding: receipt.binding,
      checkerReleaseProof: receipt.checkerReleaseProof
    },
    "candidate-integrity": {
      candidateSourceProof: receipt.candidateSourceProof,
      candidateInventoryProof: receipt.candidateInventoryProof,
      candidateProvenanceProof: receipt.candidateProvenanceProof
    },
    "evidence-currentness": {
      targetBaselineProof: receipt.targetBaselineProof,
      evidenceIndexProof: receipt.evidenceIndexProof
    },
    "mapping-compatibility": receipt.mappingCompatibility,
    "rollback-rehearsal": {
      shadowOutput: receipt.shadowOutput,
      rollbackProof: receipt.rollbackProof
    },
    "live-reachability": receipt.reachability,
    "forbidden-diff": {
      sourceSnapshots: receipt.sourceSnapshots,
      forbiddenDiff: receipt.forbiddenDiff,
      worktreeProof: receipt.worktreeProof
    },
    "legacy-ratchet": receipt.legacyRatchetProof
  };
  const check = receipt.checkResults.find((entry) => entry.checkId === checkId);
  assert.ok(check, checkId);
  check.evidenceDigest = gateLib.fingerprint(payloads[checkId]);
}

function makeManifest(overrides = {}) {
  const candidateArtifacts = CANONICAL_CANDIDATE_SELECTION.map((selection, index) => ({
    ...selection,
    rawFileSha256: `${index * 2 + 1}`.repeat(64),
    recordSha256: `${index * 2 + 2}`.repeat(64)
  }));
  const candidateDigest = gateLib.computeCandidateDigest(candidateArtifacts);
  const evidenceBindings = REQUIRED_OWNERS.map((role, index) => ({
    kind: EVIDENCE_KIND_BY_ROLE[role],
    role,
    path: `synthetic/evidence/${role.toLowerCase()}.json`,
    rawSha256: `${index + 1}`.repeat(64).slice(0, 64),
    semanticSha256: `${9 - index}`.repeat(64).slice(0, 64),
    reviewedCommit: `${index + 1}`.repeat(40)
  }));
  const manifest = {
    schemaVersion: "promotion-manifest.v1",
    gateId: "promotion-gate-shadow-v1",
    pilotUnitId: "us-ca-math-rag-v2-g6-ratios-v1",
    attemptId: "attempt-001",
    mode: "shadow",
    parentPackage: {
      id: "us-ca-math-rag-v2-candidate",
      sourceVersion: `sha256:${candidateDigest}`,
      candidatePackagingVersion: "promotion-package.v1",
      status: "candidate-only"
    },
    sourceCommit: "a".repeat(40),
    targetBaselineCommit: "b".repeat(40),
    checkerVersion: "promotion-gate-shadow-v1",
    checkerRelease: {
      version: "promotion-gate-shadow-v1",
      releaseCommit: "c".repeat(40),
      mappingPath: CHECKER_RELEASE_MAPPING_PATH,
      mappingRawSha256: "d".repeat(64),
      bundleDigest: "e".repeat(64)
    },
    candidateArtifacts,
    candidateDigest,
    knownBlockers: [
      {
        code: "item-standard-scope-overclaim",
        owner: "A18",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "fine-grained-standard-id-live-mapping-unbound",
        owner: "A04",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "unresolved-live-source-ids",
        owner: "A23",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "missing-bilingual-fields",
        owner: "A05",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "known-grammar-issue",
        owner: "A18",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "student-feedback-exposes-internal-misconception-label",
        owner: "A04",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "open-ended-practice-without-answer-or-rubric",
        owner: "A05",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "prior-s18-evidence-record-mismatch",
        owner: "A18",
        status: "preserved-outside-runtime",
        liveBlocking: true
      },
      {
        code: "legacy-live-package-conflict",
        owner: "A23",
        status: "ratcheted-temporary",
        liveBlocking: true
      }
    ],
    accessPolicy: {
      allowedReadPaths: [
        "coordination/content-qa/us-ca-math-rag-v2-candidate",
        "synthetic/evidence",
        "synthetic/promotion-evidence-index.v1.json",
        "synthetic/promotion-live-registry.v1.json",
        "synthetic/promotion-legacy-discovery.v1.json",
        CHECKER_RELEASE_MAPPING_PATH,
        ...CHECKER_BUNDLE_PATHS,
        "coordination/integration/evidence",
        ...CANONICAL_RUNTIME_ROOTS,
        ...CANONICAL_RUNTIME_SPECIAL_FILES,
        "tsconfig.json",
        "tsconfig.next.json",
        "next.config.ts",
        "coordination/content-qa",
        "synthetic/legacy-ratchet.json"
      ],
      allowedTemporaryWritePaths: ["safe-card.json", "practice.json", "lesson.json"],
      forbiddenModificationPaths: [
        "coordination/content-qa/us-ca-math-rag-v2-candidate",
        "synthetic/evidence",
        "synthetic/promotion-evidence-index.v1.json",
        "synthetic/promotion-live-registry.v1.json",
        "synthetic/promotion-legacy-discovery.v1.json",
        CHECKER_RELEASE_MAPPING_PATH,
        ...CHECKER_BUNDLE_PATHS,
        "coordination/integration/evidence",
        ...CANONICAL_RUNTIME_ROOTS,
        ...CANONICAL_RUNTIME_SPECIAL_FILES,
        "tsconfig.json",
        "tsconfig.next.json",
        "next.config.ts",
        "coordination/content-qa",
        "synthetic/legacy-ratchet.json"
      ],
      tempRootPolicy: "os-temp-only"
    },
    requiredOwners: [...REQUIRED_OWNERS],
    evidenceBindings,
    evidenceIndex: {
      path: "synthetic/promotion-evidence-index.v1.json",
      rawSha256: "f".repeat(64)
    },
    allowlistedCheckIds: [...REQUIRED_CHECK_IDS],
    operationPlan: {
      expectedOperationCount: 3,
      expectedOutputTypes: ["safe-card", "practice", "lesson"],
      outputs: [
        { kind: "safe-card", path: "safe-card.json" },
        { kind: "practice", path: "practice.json" },
        { kind: "lesson", path: "lesson.json" }
      ],
      rollback: "delete-and-verify-absent"
    },
    authorizations: {
      shadow: true,
      integration: false,
      live: false,
      preview: false,
      deploy: false
    },
    lifecycle: { currentState: "shadow_ready", requestedState: "shadow_passed" },
    liveReachability: {
      policy: "selected-candidate-unreachable",
      roots: [...CANONICAL_RUNTIME_ROOTS],
      entrypoints: [...CANONICAL_RUNTIME_ENTRYPOINTS],
      specialFiles: [...CANONICAL_RUNTIME_SPECIAL_FILES],
      registry: {
        path: "synthetic/promotion-live-registry.v1.json",
        rawSha256: "7".repeat(64)
      }
    },
    legacyDiscovery: {
      policy: "reachable-candidate-package-conflicts-v1",
      roots: [...CANONICAL_LEGACY_DISCOVERY_ROOTS],
      registry: {
        path: "synthetic/promotion-legacy-discovery.v1.json",
        rawSha256: "8".repeat(64)
      }
    },
    legacyRatchet: "synthetic/legacy-ratchet.json"
  };
  return { ...manifest, ...overrides };
}

function makeRoleSemanticPayload(role, manifest = makeManifest()) {
  const artifactByKind = Object.fromEntries(manifest.candidateArtifacts.map((artifact) => [artifact.kind, artifact]));
  const parentFields = {
    "safe-card": ["packageId", "status", "candidate-only"],
    practice: ["upstreamPackageId", "approval.status", "candidate-only"],
    lesson: ["upstreamPackageId", "releaseStatus", "not-live"]
  };
  const artifacts = manifest.candidateArtifacts.map((artifact) => ({
    kind: artifact.kind,
    id: artifact.id,
    path: artifact.path,
    jsonPointer: artifact.jsonPointer,
    rawFileSha256: artifact.rawFileSha256,
    recordSha256: artifact.recordSha256,
    parentBindingField: parentFields[artifact.kind][0],
    parentBindingValue: manifest.parentPackage.id,
    candidateStateField: parentFields[artifact.kind][1],
    candidateStateValue: parentFields[artifact.kind][2]
  }));
  const artifactIds = manifest.candidateArtifacts.map(({ id }) => id);
  const sourceSequence = [
    "objective",
    "prerequisiteCheck",
    "conceptExplanation",
    "workedExample",
    "guidedPractice",
    "independentPractice",
    "remediation",
    "teacherNotes"
  ];
  const shadowSequence = ["objective", "workedExample", "guidedPractice", "independentPractice", "remediation"];
  const liveBlockers = [
    { code: "missing-bilingual-fields", status: "preserved-outside-runtime", path: "lessonModule" },
    {
      code: "known-grammar-issue",
      status: "preserved-outside-runtime",
      path: "lessonModule.conceptExplanation"
    }
  ];
  const payloads = {
    A21: {
      contractVersion: "promotion-a21-candidate.v1",
      candidatePackage: {
        id: manifest.parentPackage.id,
        sourceVersion: `sha256:${manifest.candidateDigest}`,
        status: "candidate-only",
        generatedAt: "2026-06-19",
        immutableDuringShadow: true
      },
      inventory: { safeCardRecords: 146, practiceRecords: 68, lessonRecords: 68 },
      candidateDigest: manifest.candidateDigest,
      artifacts,
      sourceSafety: {
        safeCardCopiedSourceText: false,
        safeCardReleaseClaim: "candidate-only",
        practiceSourceDistanceStatus: "passed-source-distance-scan",
        practiceMathQaStatus: "passed-deterministic-candidate-check",
        lessonSourceDistanceStatus: "passed-source-distance-scan",
        lessonMathQaStatus: "passed-template-consistency-check"
      },
      liveMutationAuthorized: false
    },
    A18: {
      contractVersion: "promotion-a18-shadow-qa.v1",
      decisions: manifest.candidateArtifacts.map(({ kind, id }) => ({
        kind,
        id,
        decision: "accept-for-shadow",
        liveDecision: "repair-before-live",
        rejected: false
      })),
      independentMath: {
        firstQuantity: "oats-cups",
        secondQuantity: "fruit-cups",
        orderedRatio: [3, 5],
        targetQuantity: "fruit-cups",
        targetValue: 20,
        scaleFactor: 4,
        scaleCheck: {
          leftExpression: "5 * 4",
          leftValue: 20,
          rightExpression: "3 * 4",
          rightValue: 12
        },
        numericAnswer: 12,
        canonicalAnswer: "12 cups",
        acceptedAnswers: ["12", "12 cups"],
        acceptedAnswerPolicy: "exact-trimmed-forms-v1",
        ratioOrderPreserved: true,
        reasoning: ["preserve-ratio-order", "scale-both-quantities-by-4"]
      },
      standards: {
        declaredCluster: ["6.RP.1", "6.RP.2", "6.RP.3"],
        candidateMaisIds: ["CA.CCSS.Math.G6.RP.1", "CA.CCSS.Math.G6.RP.2", "CA.CCSS.Math.G6.RP.3"],
        primaryStandardId: "6.RP.3",
        directlyAssessed: ["6.RP.3"],
        embeddedPrerequisite: ["6.RP.1"],
        notDemonstrated: ["6.RP.2"],
        proposedLiveAlias: "6.RP.A.3",
        liveMappingStatus: "unverified-incompatible-preserved-outside-runtime"
      },
      lessonReview: {
        sourceSequence,
        shadowMappedSequence: shadowSequence,
        workedExampleMatchesPractice: true,
        misconceptions: {
          safeCardTags: ["ratio order reversed", "unit rate not normalized"],
          lessonMetadataTargets: ["ratio order reversed", "unit rate not normalized"],
          practiceFeedback: "ratio order reversed",
          remediationTarget: "ratio order reversed"
        }
      },
      priorReviewDrift: {
        path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md",
        rawSha256: "7b3bfa54b84e105e703e31b5f27e3a135e5a48d5e0ebac1805129056e05318f4",
        recordedClaim: "additive-vs-multiplicative confusion",
        actualRemediationTarget: "ratio order reversed",
        matchesSelectedRecord: false,
        mustBeSupersededBeforeLive: true
      },
      liveBlockers: [
        {
          code: "item-standard-scope-overclaim",
          declaredCluster: ["6.RP.1", "6.RP.2", "6.RP.3"],
          directlyAssessed: ["6.RP.3"],
          embeddedPrerequisite: ["6.RP.1"],
          notDemonstrated: ["6.RP.2"],
          status: "blocked-for-live"
        },
        {
          code: "fine-grained-standard-id-live-mapping-unbound",
          candidateMaisIds: ["CA.CCSS.Math.G6.RP.1", "CA.CCSS.Math.G6.RP.2", "CA.CCSS.Math.G6.RP.3"],
          proposedLiveAlias: "6.RP.A.3",
          status: "blocked-for-live"
        },
        {
          code: "unresolved-live-source-ids",
          candidateSourceIds: [
            "california-math-common-core-skill",
            "cde-ca-ccss-math-resources",
            "common-core-state-standards-public-license",
            "ixl-california-math-standards-navigation-only"
          ],
          verifiedLiveSourceIds: [
            "cde-ca-ccss-math-resources",
            "common-core-state-standards-public-license"
          ],
          unresolvedSourceIds: [
            "california-math-common-core-skill",
            "ixl-california-math-standards-navigation-only"
          ],
          status: "blocked-for-live"
        },
        {
          code: "missing-bilingual-fields",
          paths: [
            `${artifactByKind["safe-card"].path}${artifactByKind["safe-card"].jsonPointer}/bilingualTerminologyNotes`,
            `${artifactByKind.practice.path}${artifactByKind.practice.jsonPointer}`,
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}`
          ],
          presentLocales: ["en"],
          requiredLocalesBeforeLive: ["en", "zh", "zhHans"],
          status: "blocked-for-live"
        },
        {
          code: "known-grammar-issue",
          path: `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/conceptExplanation`,
          observedFragment: "The double number lines and ratio tables becomes your map",
          requiredFragment: "The double number lines and ratio tables become your map",
          status: "blocked-for-live"
        },
        {
          code: "student-feedback-exposes-internal-misconception-label",
          path: `${artifactByKind.practice.path}${artifactByKind.practice.jsonPointer}/studentContent/misconceptionFeedback/en`,
          observedValue: "ratio order reversed",
          status: "blocked-for-live"
        },
        {
          code: "open-ended-practice-without-answer-or-rubric",
          paths: [
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/guidedPractice`,
            `${artifactByKind.lesson.path}${artifactByKind.lesson.jsonPointer}/lessonModule/independentPractice`
          ],
          status: "blocked-for-live"
        },
        {
          code: "prior-s18-evidence-record-mismatch",
          path: "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md",
          recordedClaim: "additive-vs-multiplicative confusion",
          actualRemediationTarget: "ratio order reversed",
          status: "blocked-for-live"
        }
      ],
      shadowEligible: true,
      liveEligible: false
    },
    A04: {
      contractVersion: "promotion-a04-practice-semantics.v1",
      practiceId: artifactByKind.practice.id,
      numericOracle: 12,
      acceptedAnswers: ["12", "12 cups"],
      acceptedAnswerPolicy: "exact-trimmed-forms-v1",
      primaryStandardId: "6.RP.3",
      liveStandardAlias: "6.RP.A.3",
      liveAliasStatus: "unverified-incompatible-preserved-outside-runtime",
      futureBoundary: "candidate-only-no-live-write"
    },
    A05: {
      contractVersion: "promotion-a05-lesson-semantics.v1",
      lessonId: artifactByKind.lesson.id,
      recordPath: artifactByKind.lesson.path,
      jsonPointer: artifactByKind.lesson.jsonPointer,
      recordSha256: artifactByKind.lesson.recordSha256,
      sourceContainer: "lessonModule",
      languageMode: "en",
      sourceSequence,
      shadowMappedSequence: shadowSequence,
      shadowOmittedFields: ["prerequisiteCheck", "conceptExplanation", "teacherNotes"],
      workedExampleBinding: {
        practiceId: artifactByKind.practice.id,
        promptMatchesPractice: true,
        answer: "12 cups",
        numericOracle: 12
      },
      misconceptions: {
        metadataTargets: ["ratio order reversed", "unit rate not normalized"],
        remediationTarget: "ratio order reversed"
      },
      remediationRequired: true,
      inventBilingualFields: false,
      liveBlockers: [
        ...liveBlockers,
        {
          code: "open-ended-practice-without-answer-or-rubric",
          status: "preserved-outside-runtime",
          path: "lessonModule.guidedPractice+independentPractice"
        }
      ],
      futureBoundary: "candidate-only-no-live-write"
    },
    A23: {
      contractVersion: "promotion-a23-shadow-plan.v1",
      pilotUnitId: manifest.pilotUnitId,
      candidateDigest: manifest.candidateDigest,
      mode: "shadow",
      currentState: manifest.lifecycle.currentState,
      requestedState: manifest.lifecycle.requestedState,
      authorizations: structuredClone(manifest.authorizations),
      operationPlan: {
        outputs: structuredClone(manifest.operationPlan.outputs),
        rollback: manifest.operationPlan.rollback
      },
      preflightMarkerScan: {
        schemaVersion: "promotion-runtime-marker-scan.v1",
        scanKind: "all-bytes-exact-needle",
        roots: ["app", "components", "data", "lib", "public"],
        fileCount: 3666,
        byteCount: 337194582,
        candidatePathNeedles: manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
        identityNeedles: [manifest.pilotUnitId, manifest.parentPackage.id, ...artifactIds],
        candidatePathHits: [],
        identityMarkerHits: [],
        selectedCandidateMarkerReachable: false,
        nonliteralDynamicImportsAssessed: false,
        finalRegistryScanRequired: true
      },
      canonicalRuntimeSurfaceV1: {
        status: "frozen",
        roots: [...CANONICAL_RUNTIME_ROOTS],
        entrypoints: [...CANONICAL_RUNTIME_ENTRYPOINTS]
      },
      liveAllowed: false
    },
    A11: {
      contractVersion: "promotion-a11-shadow-replay.v1",
      evidencePhase: "preflight",
      replayContract: "independent-synthetic-and-real-shaped-v1",
      selectedArtifactIds: artifactIds,
      historicalStaticPreview: {
        reportPath: "coordination/content-qa/us-ca-math-rag-v2-candidate/s11-candidate-preview-smoke.json",
        reportRawSha256: "653c9f6c15d7ec604aa55a4231178d7f45fea98d40cb7c4683c9731e21a1eca9",
        reportStatus: "pass",
        practiceCards: 2,
        lessonCards: 2,
        consoleErrorCount: 0,
        pageErrorCount: 0,
        liveAppRegression: false,
        referencedHtmlPresent: false,
        referencedScreenshotPresent: false,
        usableAsFinalPilotProof: false
      },
      preflightAssertions: {
        testCommand: "npm run test:promotion-gate",
        syntheticSuiteRequired: true,
        realManifestValidationRequired: true,
        realShadowRequired: true,
        independentReplayRequired: true,
        verifyReceiptRequired: true
      },
      postRunReportBoundary: {
        status: "required-after-execution",
        validationEnvelopeSchema: "promotion-validation.v1",
        validationResult: "pass",
        requiredCheckIds: [...REQUIRED_CHECK_IDS],
        requiredReceiptSchema: "promotion-receipt.v1",
        requiredReceiptCount: 2,
        distinctRunIdsRequired: true,
        semanticReceiptDigestEqualityRequired: true,
        rawReceiptDigestInequalityRequired: false,
        verifyReceiptCount: 2,
        selectedCandidateReachableExpected: false,
        legacyRatchetResultExpected: "pass"
      },
      legacy492Expectation: {
        packagePath: LEGACY_PACKAGE_PATH,
        questionCount: 492,
        uniqueIdCount: 492
      },
      claims: {
        finalReplayCompleted: false,
        liveAppRegressionCompleted: false,
        previewVerified: false,
        deploymentVerified: false
      }
    },
    A22: {
      contractVersion: "promotion-a22-release-readiness.v1",
      evidencePhase: "preflight",
      preflightDisposition: "awaiting-committed-clean-sha",
      currentObservation: {
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        clean: false,
        statusSha256: "1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1",
        statusEntryCount: 6,
        usableAsExecutionSource: false
      },
      executionSourceRequirements: {
        namedGitWorktreeRequired: true,
        cleanBeforeRun: true,
        cleanAfterRun: true,
        statusEntryCountBeforeRun: 0,
        statusEntryCountAfterRun: 0,
        headStableDuringRun: true,
        executionCommitRecordedSeparately: true,
        headMustEqualManifestSourceCommit: false,
        independentReplayMustCheckoutExecutionCommit: true
      },
      executionPolicy: {
        temporaryWrites: "os-temp-only",
        promotionCommandNetworkAllowed: false,
        providerCallsAllowed: false,
        databaseCallsAllowed: false,
        productionWriteAllowed: false,
        previewAllowed: false,
        deployAllowed: false
      },
      postRunReportBoundary: {
        status: "required-after-execution",
        sourceSnapshotsEqualRequired: true,
        forbiddenChangedPathsExpected: [],
        rollbackMethod: "delete-and-verify-absent",
        deletedOutputKindsExpected: ["safe-card", "practice", "lesson"],
        outputsVerifiedAbsentRequired: true,
        temporaryRootRemovedRequired: true,
        externalSideEffectsExpected: false,
        worktreePreCleanRequired: true,
        worktreePostCleanRequired: true
      },
      claims: {
        shadowExecuted: false,
        rollbackRehearsed: false,
        replayCompleted: false,
        previewAttempted: false,
        deployAttempted: false,
        liveVerified: false
      }
    },
    A24: {
      contractVersion: "promotion-a24-exact-layer.v1",
      exactLayerDisposition: "not-applicable",
      rationale: "Selected safe-card /108, practice /questions/30, and lesson /lessons/30 contain no diagram, illustration, image, asset, coordinate, formula-overlay, SVG, Plotly, or deterministic exact-layer fields; Shadow v1 maps text and metadata only."
    },
    A25: {
      contractVersion: "promotion-a25-release-intake.v1",
      evidencePhase: "preflight-observation",
      selectedCandidateSource: {
        branch: "codex/a23-promotion-shadow-v1-20260825",
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        pathspecs: manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
        allTracked: true,
        stagedChangeCount: 0,
        unstagedChangeCount: 0,
        untrackedChangeCount: 0,
        selectedPathspecClean: true
      },
      a23ImplementationWorktree: {
        headCommit: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        clean: false,
        statusSha256: "1d992eb2e1f951073d2bfcd1247f767c014a1cac661810fb675e43522bca42a1",
        statusEntryCount: 6,
        untrackedPaths: [
          "coordination/integration/promotion-gate-lib.mjs",
          "coordination/integration/promotion-gate.mjs",
          "coordination/integration/promotion-gate.test.mjs",
          "coordination/integration/schemas/promotion-manifest.v1.schema.json",
          "coordination/integration/schemas/promotion-receipt.v1.schema.json",
          "coordination/session-logs/2026-08-25-A23-promotion-shadow-v1.md"
        ],
        wholeWorktreeReleaseSourceEligible: false
      },
      primaryRootStrictGate: {
        observedAt: "2026-08-24T17:25:23.195Z",
        branch: "codex/edulab-mais",
        headCommit: "a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6",
        statusSignature: "48c14842fbbe976ca2471df3ee14233705aeaffb919e7edc60f95269834c7bc1",
        statusSha256: "3a423cca663282895e47341ca316d0eea356d1e2b517310e5e92bc0165fa2f67",
        collapsedStatusEntries: 52,
        expandedStatusEntries: 106,
        trackedModified: 2,
        untrackedFiles: 104,
        strictUnmappedEntries: 56,
        ambiguousOwnerEntries: 0,
        secretQuarantineEntries: 0,
        assertCommand: ["npm", "run", "release:dirty-map", "--", "--assert-current", "--max-age-minutes", "60", "--json"],
        exitCode: 1,
        result: "fail",
        reasonCode: "strict-unmapped-owner-entries",
        rootReleaseFrozen: true,
        releaseSourceEligible: false
      },
      reviewPackageDisposition: "candidate-only-shadow-review",
      releaseDisposition: "blocked-until-committed-clean-worktree"
    }
  };
  return structuredClone(payloads[role]);
}

function makeEvidence(role, manifest = makeManifest(), overrides = {}) {
  const semanticPayload = makeRoleSemanticPayload(role, manifest);
  return {
    schemaVersion: "promotion-evidence.v1",
    evidenceId: `evidence-${role.toLowerCase()}`,
    role,
    result: role === "A24" ? "not_applicable" : "pass",
    producedAt: "2026-08-25T00:00:00.000Z",
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    semanticPayload,
    ...overrides
  };
}

function makeRealShapedCandidateRecords(manifest = makeManifest()) {
  const artifactId = (kind) => manifest.candidateArtifacts.find((artifact) => artifact.kind === kind).id;
  const standardIds = [
    "CA.CCSS.Math.G6.RP.1",
    "CA.CCSS.Math.G6.RP.2",
    "CA.CCSS.Math.G6.RP.3"
  ];
  const canonicalStandardIds = ["6.RP.1", "6.RP.2", "6.RP.3"];
  return {
    "safe-card": {
      id: artifactId("safe-card"),
      packageId: "us-ca-math-rag-v2-candidate",
      cardKind: "cluster-safe-card-v2",
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      status: "candidate-only",
      generatedAt: "2026-06-19",
      maisGrade: "P6",
      domainIds: ["6.RP"],
      maisDomainIds: ["CA.CCSS.Math.G6.RP"],
      canonicalStandardIds,
      maisStandardIds: standardIds,
      clusterId: "6.RP.ratios",
      evidenceScope: {
        domainId: "6.RP",
        clusterId: "6.RP.ratios",
        sourceIds: [
          "california-math-common-core-skill",
          "cde-ca-ccss-math-resources",
          "common-core-state-standards-public-license",
          "ixl-california-math-standards-navigation-only"
        ]
      },
      sourceSafety: {
        copiedSourceText: false,
        releaseClaim: "candidate-only"
      },
      misconceptionTags: ["ratio order reversed", "unit rate not normalized"],
      bilingualTerminologyNotes: []
    },
    practice: {
      id: artifactId("practice"),
      upstreamPackageId: "us-ca-math-rag-v2-candidate",
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      grade: "P6",
      domainId: "6.RP",
      clusterId: "6.RP.ratios",
      languageMode: "en",
      studentContent: {
        misconceptionFeedback: { en: "ratio order reversed" }
      },
      prompt: {
        en: "A recipe uses 3 cups of oats for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of oats are needed?"
      },
      answer: "12 cups",
      acceptedAnswers: ["12", "12 cups"],
      explanation: {
        en: "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12."
      },
      answerKey: {
        correctAnswer: "12 cups",
        acceptedAnswers: ["12", "12 cups"],
        solutionSteps: [
          "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12."
        ],
        validationMethod: "computed-equivalent-ratio"
      },
      independentAnswer: "12 cups",
      independentSolution:
        "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12.",
      standardIds,
      canonicalStandardIds,
      maisStandardIds: standardIds,
      sourceIds: [
        "california-math-common-core-skill",
        "cde-ca-ccss-math-resources",
        "common-core-state-standards-public-license",
        "ixl-california-math-standards-navigation-only"
      ],
      evidenceCardIds: [artifactId("safe-card")],
      sourceDistanceStatus: "passed-source-distance-scan",
      mathQaStatus: "passed-deterministic-candidate-check",
      approval: { status: "candidate-only" }
    },
    lesson: {
      id: artifactId("lesson"),
      upstreamPackageId: "us-ca-math-rag-v2-candidate",
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      grade: "P6",
      domainId: "6.RP",
      clusterId: "6.RP.ratios",
      languageMode: "en",
      releaseStatus: "not-live",
      standardIds,
      canonicalStandardIds,
      maisStandardIds: standardIds,
      sourceIds: [
        "california-math-common-core-skill",
        "cde-ca-ccss-math-resources",
        "common-core-state-standards-public-license",
        "ixl-california-math-standards-navigation-only"
      ],
      evidenceCardIds: [artifactId("safe-card")],
      sourceDistanceStatus: "passed-source-distance-scan",
      mathQaStatus: "passed-template-consistency-check",
      metadata: {
        misconceptionTargets: ["ratio order reversed", "unit rate not normalized"]
      },
      lessonModule: {
        objective: "Students will use ratios, rates, percent, and equivalent relationships to solve contextual problems.",
        prerequisiteCheck: {
          teacherPrompt: "Ask students to name the quantities before solving.",
          studentPrompt: "What information is given?"
        },
        conceptExplanation: "The double number lines and ratio tables becomes your map for the investigation.",
        workedExample: {
          prompt: "A recipe uses 3 cups of oats for every 5 cups of fruit. If a batch uses 20 cups of fruit, how many cups of oats are needed?",
          answer: "12 cups",
          reasoning: "The fruit amount is multiplied by 4 because 5 x 4 = 20. Multiply the oats by the same factor: 3 x 4 = 12."
        },
        guidedPractice: {
          prompt: "Change one number or condition in the worked example and solve again.",
          teacherMove: "Listen for whether students preserve the same structure."
        },
        independentPractice: {
          prompt: "Create and solve a new problem with the same mathematical structure.",
          evidenceExpected: "Student answer includes a matching computation or explanation."
        },
        remediation: {
          targetMisconception: "ratio order reversed",
          move: "Return to a visual model and label each quantity."
        },
        teacherNotes: ["Keep candidate-only until independent QA and regression replay are complete."]
      }
    }
  };
}

function makeLegacyEntry(overrides = {}) {
  return {
    packageId: LEGACY_PACKAGE_ID,
    observation: {
      observerVersion: "promotion-legacy-question-pack.v1",
      packagePath: LEGACY_PACKAGE_PATH,
      reachabilityAnchors: structuredClone(LEGACY_ANCHOR_REGISTRY)
    },
    packageDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.packageDigest,
    contentDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.contentDigest,
    semanticDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.semanticDigest,
    idSetDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.idSetDigest,
    gradeDistributionDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.gradeDistributionDigest,
    rootStatusDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.rootStatusDigest,
    rowStatusDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.rowStatusDigest,
    reachabilityDigest: gateLib.LEGACY_INITIAL_BASELINE_FACTS.reachabilityDigest,
    authorization: {
      reference: "user-request-2026-08-25-promotion-shadow-v1",
      accountableOwner: "A23",
      conflictOwners: ["A04", "A18", "A23"],
      reviewOwners: ["A23", "A25"],
      downstreamEvidenceOwners: ["A11", "A22"],
      reviewReferences: structuredClone(gateLib.LEGACY_INITIAL_BASELINE_FACTS.reviewReferences)
    },
    terminalChoices: ["recertify", "remove-live"],
    remediation: "Remove the legacy live selection before ratchet expiry.",
    ...overrides
  };
}

function makeLegacyRatchet(overrides = {}) {
  return {
    schemaVersion: "promotion-legacy-drift.v1",
    introducedAt: "2026-08-25T00:00:00Z",
    expiresAt: "2026-09-24T00:00:00Z",
    entries: [makeLegacyEntry()],
    ...overrides
  };
}

async function writeCandidateFiles(repoRoot, manifest) {
  const records = makeRealShapedCandidateRecords(manifest);
  for (const artifact of manifest.candidateArtifacts) {
    const record = records[artifact.kind];
    let document;
    if (artifact.kind === "safe-card") {
      document = Array.from({ length: 146 }, (_, index) =>
        index === 108 ? record : { id: `synthetic-safe-card-${String(index).padStart(3, "0")}` }
      );
    } else if (artifact.kind === "practice") {
      document = { questions: Array.from({ length: 68 }, (_, index) =>
        index === 30 ? record : { id: `synthetic-practice-${String(index).padStart(3, "0")}` }
      ) };
    } else {
      document = { lessons: Array.from({ length: 68 }, (_, index) =>
        index === 30 ? record : { id: `synthetic-lesson-${String(index).padStart(3, "0")}` }
      ) };
    }
    const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
    const target = path.join(repoRoot, artifact.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    artifact.rawFileSha256 = gateLib.sha256(bytes);
    artifact.recordSha256 = gateLib.fingerprint(record);
  }
  manifest.candidateDigest = gateLib.computeCandidateDigest(manifest.candidateArtifacts);
  manifest.parentPackage.sourceVersion = `sha256:${manifest.candidateDigest}`;
  const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const priorReviewPath = "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md";
  const priorReviewBytes = await readFile(path.join(sourceRepoRoot, priorReviewPath));
  const priorReviewTarget = path.join(repoRoot, priorReviewPath);
  await mkdir(path.dirname(priorReviewTarget), { recursive: true });
  await writeFile(priorReviewTarget, priorReviewBytes);
  return records;
}

async function writeEvidenceFiles(repoRoot, manifest, evidenceOverrides = {}) {
  const byRole = {};
  for (const binding of manifest.evidenceBindings) {
    const evidence = makeEvidence(binding.role, manifest, evidenceOverrides[binding.role] ?? {});
    const bytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
    const target = path.join(repoRoot, binding.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    binding.rawSha256 = gateLib.sha256(bytes);
    binding.semanticSha256 = gateLib.fingerprint(evidence.semanticPayload);
    byRole[binding.role] = evidence;
  }
  const evidenceIndex = {
    schemaVersion: "promotion-evidence-index.v1",
    gateId: manifest.gateId,
    pilotUnitId: manifest.pilotUnitId,
    attemptId: manifest.attemptId,
    candidateDigest: manifest.candidateDigest,
    sourceCommit: manifest.sourceCommit,
    targetBaselineCommit: manifest.targetBaselineCommit,
    checkerVersion: manifest.checkerVersion,
    entries: structuredClone(manifest.evidenceBindings),
    entriesDigest: gateLib.fingerprint(manifest.evidenceBindings)
  };
  const indexBytes = Buffer.from(`${JSON.stringify(evidenceIndex, null, 2)}\n`);
  const indexTarget = path.join(repoRoot, manifest.evidenceIndex.path);
  await mkdir(path.dirname(indexTarget), { recursive: true });
  await writeFile(indexTarget, indexBytes);
  manifest.evidenceIndex.rawSha256 = gateLib.sha256(indexBytes);
  return byRole;
}

async function bindDistinctEvidenceReviewCommits(repoRoot, manifest, message = "owner evidence review") {
  const expected = await writeEvidenceFiles(repoRoot, manifest);
  await commitSyntheticFixture(repoRoot, `${message} A21`);
  const reviewedCommits = [];
  const readHead = async () => {
    const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    return stdout.trim();
  };
  reviewedCommits.push(await readHead());
  for (const role of REQUIRED_OWNERS.slice(1)) {
    await execFileAsync("git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "--allow-empty", "-m", `${message} ${role}`
    ], { shell: false, maxBuffer: 64 * 1024 });
    reviewedCommits.push(await readHead());
  }
  for (const [index, binding] of manifest.evidenceBindings.entries()) {
    binding.reviewedCommit = reviewedCommits[index];
  }
  await writeEvidenceFiles(repoRoot, manifest);
  return expected;
}

async function commitSyntheticFixture(repoRoot, message = "synthetic promotion fixture") {
  const stageCandidates = [
    "synthetic", "coordination/content-qa", "coordination/integration", "app", "components", "data", "lib", "public",
    "middleware.ts", "tsconfig.json", "tsconfig.next.json", "next.config.ts", "package.json", "package-lock.json"
  ];
  const stagePaths = [];
  for (const candidate of stageCandidates) {
    try {
      await access(path.join(repoRoot, candidate));
      stagePaths.push(candidate);
    } catch {
      // A fixture stages only the literal paths it created.
    }
  }
  await execFileAsync("git", [
    "-C", repoRoot, "add", "--", ...stagePaths
  ], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  await execFileAsync(
    "git",
    [
      "-C",
      repoRoot,
      "-c",
      "user.name=Promotion Gate Test",
      "-c",
      "user.email=promotion-gate@example.invalid",
      "commit",
      "--quiet",
      "-m",
      message
    ],
    { shell: false, maxBuffer: 64 * 1024 }
  );
}

async function initializeSyntheticGitRepo(repoRoot) {
  await execFileAsync("git", ["init", "--quiet", repoRoot], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  await commitSyntheticFixture(repoRoot);
}

async function commitCandidateProvenance(repoRoot, manifest) {
  await execFileAsync("git", ["init", "--quiet", repoRoot], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  await execFileAsync(
    "git",
    [
      "-C", repoRoot, "add", "--",
      ...manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath),
      "coordination/content-qa/us-ca-math-rag-v2-candidate/s18-representative-sample-review.md"
    ],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  await execFileAsync(
    "git",
    [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "candidate provenance baseline"
    ],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  return stdout.trim();
}

async function writeCheckerReleaseFixture(repoRoot) {
  const bindings = [];
  const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  for (const bundlePath of CHECKER_BUNDLE_PATHS) {
    const bytes = await readFile(path.join(sourceRepoRoot, bundlePath));
    const target = path.join(repoRoot, bundlePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    bindings.push({ path: bundlePath, rawSha256: gateLib.sha256(bytes) });
  }
  await execFileAsync(
    "git",
    ["-C", repoRoot, "add", "--", ...CHECKER_BUNDLE_PATHS],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  await execFileAsync(
    "git",
    [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "checker bundle fixture"
    ],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  const entry = {
    version: "promotion-gate-shadow-v1",
    bundleAlgorithm: "sha256-stable-json-path-raw-v1",
    bundlePaths: [...CHECKER_BUNDLE_PATHS],
    bundleDigest: gateLib.fingerprint(bindings)
  };
  const ledger = {
    schemaVersion: "promotion-checker-releases.v1",
    entries: [entry]
  };
  const mappingBytes = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`);
  const mappingTarget = path.join(repoRoot, CHECKER_RELEASE_MAPPING_PATH);
  await mkdir(path.dirname(mappingTarget), { recursive: true });
  await writeFile(mappingTarget, mappingBytes);
  await execFileAsync(
    "git",
    ["-C", repoRoot, "add", "--", CHECKER_RELEASE_MAPPING_PATH],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  await execFileAsync(
    "git",
    [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "checker release fixture"
    ],
    { shell: false, maxBuffer: 64 * 1024 }
  );
  const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  return {
    releaseCommit: stdout.trim(),
    mappingRawSha256: gateLib.sha256(mappingBytes),
    bundleDigest: entry.bundleDigest,
    ledger,
    bindings
  };
}

async function rewriteCheckerLedgerForCurrentBundle(repoRoot) {
  const bindings = [];
  for (const bundlePath of CHECKER_BUNDLE_PATHS) {
    const bytes = await readFile(path.join(repoRoot, bundlePath));
    bindings.push({ path: bundlePath, rawSha256: gateLib.sha256(bytes) });
  }
  const ledger = {
    schemaVersion: "promotion-checker-releases.v1",
    entries: [{
      version: "promotion-gate-shadow-v1",
      bundleAlgorithm: "sha256-stable-json-path-raw-v1",
      bundlePaths: [...CHECKER_BUNDLE_PATHS],
      bundleDigest: gateLib.fingerprint(bindings)
    }]
  };
  const mappingBytes = Buffer.from(`${JSON.stringify(ledger, null, 2)}\n`);
  await writeFile(path.join(repoRoot, CHECKER_RELEASE_MAPPING_PATH), mappingBytes);
  return {
    ledger,
    bundleDigest: ledger.entries[0].bundleDigest,
    mappingRawSha256: gateLib.sha256(mappingBytes)
  };
}

async function ensureCanonicalRuntimeSurface(repoRoot) {
  for (const root of CANONICAL_RUNTIME_ROOTS) await mkdir(path.join(repoRoot, root), { recursive: true });
  try {
    await access(path.join(repoRoot, "public/promotion-fixture.svg"));
  } catch {
    await writeFile(path.join(repoRoot, "public/promotion-fixture.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\" />\n");
  }
  for (const entrypoint of CANONICAL_RUNTIME_ENTRYPOINTS) {
    const absolutePath = path.join(repoRoot, entrypoint);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    try {
      await access(absolutePath);
    } catch {
      await writeFile(absolutePath, "export const promotionFixtureSurface = true;\n");
    }
  }
  try {
    await access(path.join(repoRoot, "middleware.ts"));
  } catch {
    await writeFile(path.join(repoRoot, "middleware.ts"), "export function middleware() { return undefined; }\n");
  }
  for (const [configPath, source] of [
    ["tsconfig.json", `${JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }, null, 2)}\n`],
    ["tsconfig.next.json", `${JSON.stringify({ extends: "./tsconfig.json" }, null, 2)}\n`],
    ["next.config.ts", "const nextConfig = {};\nexport default nextConfig;\n"]
  ]) {
    try {
      await access(path.join(repoRoot, configPath));
    } catch {
      await writeFile(path.join(repoRoot, configPath), source);
    }
  }
}

async function writeRuntimeSource(repoRoot, source) {
  await ensureCanonicalRuntimeSurface(repoRoot);
  await writeFile(path.join(repoRoot, CANONICAL_RUNTIME_ENTRYPOINTS[0]), source);
}

async function makeLiveRegistry(repoRoot, manifest, overrides = {}) {
  await ensureCanonicalRuntimeSurface(repoRoot);
  const observation = await gateLib.observeCanonicalRuntimePolicy(repoRoot, manifest);
  const { frameworkEntrypoints, specialFiles } = observation;
  return {
    schemaVersion: "promotion-live-registry.v1",
    pilotUnitId: manifest.pilotUnitId,
    roots: [...CANONICAL_RUNTIME_ROOTS],
    entrypoints: [...CANONICAL_RUNTIME_ENTRYPOINTS],
    specialFiles,
    classificationPolicy: {
      schemaVersion: "promotion-runtime-classifier.v1",
      kinds: [...RUNTIME_CLASSIFICATION_KINDS]
    },
    resolverPolicy: observation.resolverPolicy,
    frameworkBoundary: observation.frameworkBoundary,
    frameworkEntrypointCount: frameworkEntrypoints.length,
    frameworkEntrypointsDigest: gateLib.fingerprint(frameworkEntrypoints),
    runtimeGraph: observation.graphPolicy,
    loaderPolicy: observation.loaderPolicy,
    sensitiveAnchors: observation.sensitiveAnchors,
    sensitiveAnchorsDigest: observation.sensitiveAnchorsDigest,
    checkIds: [
      "canonical-runtime-file-set",
      "deterministic-file-classification",
      "framework-entrypoint-derivation",
      "typescript-ast-runtime-graph",
      "bounded-runtime-loaders",
      "identity-marker",
      "reachable-nonliteral-import-require"
    ],
    ...overrides
  };
}

async function writeLiveRegistry(repoRoot, manifest, overrides = {}) {
  const registry = await makeLiveRegistry(repoRoot, manifest, overrides);
  const bytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  const target = path.join(repoRoot, manifest.liveReachability.registry.path);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  manifest.liveReachability.registry.rawSha256 = gateLib.sha256(bytes);
  return registry;
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeLegacyAnchor(source, startMarker, endMarker) {
  const normalizedSource = source.replace(/\r\n?/gu, "\n");
  const start = normalizedSource.indexOf(startMarker);
  const end = startMarker === endMarker
    ? start
    : normalizedSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return normalizedSource
    .slice(start, end + endMarker.length)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !/^\/\//u.test(line))
    .join("\n");
}

function legacyApprovalSignature(entry) {
  return gateLib.fingerprint({
    packageId: entry.packageId,
    observationDigest: gateLib.fingerprint(entry.observation),
    packageDigest: entry.packageDigest,
    contentDigest: entry.contentDigest,
    semanticDigest: entry.semanticDigest,
    idSetDigest: entry.idSetDigest,
    gradeDistributionDigest: entry.gradeDistributionDigest,
    rootStatusDigest: entry.rootStatusDigest,
    rowStatusDigest: entry.rowStatusDigest,
    reachabilityDigest: entry.reachabilityDigest
  });
}

async function writeLegacyFixture(repoRoot, manifest) {
  await ensureCanonicalRuntimeSurface(repoRoot);
  const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const packagePath = LEGACY_PACKAGE_PATH;
  const packageBytes = await readFile(path.join(sourceRepoRoot, packagePath));
  const legacyPackage = JSON.parse(packageBytes.toString("utf8"));
  const questions = legacyPackage.questions;
  await mkdir(path.dirname(path.join(repoRoot, packagePath)), { recursive: true });
  await writeFile(path.join(repoRoot, packagePath), packageBytes);

  const observation = {
    observerVersion: "promotion-legacy-question-pack.v1",
    packagePath,
    reachabilityAnchors: structuredClone(LEGACY_ANCHOR_REGISTRY)
  };
  const reachabilityInput = [];
  for (const sourceContract of LEGACY_ANCHOR_REGISTRY) {
    const canonicalSource = (await readFile(path.join(sourceRepoRoot, sourceContract.path), "utf8"))
      .replace(/\r\n?/gu, "\n");
    const snippets = [];
    for (const anchor of sourceContract.anchors) {
      const start = canonicalSource.indexOf(anchor.startMarker);
      const end = anchor.startMarker === anchor.endMarker
        ? start
        : canonicalSource.indexOf(anchor.endMarker, start + anchor.startMarker.length);
      assert.notEqual(start, -1, anchor.id);
      assert.notEqual(end, -1, anchor.id);
      assert.equal(canonicalSource.indexOf(anchor.startMarker, start + anchor.startMarker.length), -1, anchor.id);
      assert.equal(canonicalSource.indexOf(anchor.endMarker, end + anchor.endMarker.length), -1, anchor.id);
      const snippet = canonicalSource.slice(start, end + anchor.endMarker.length);
      assert.equal(
        gateLib.sha256(Buffer.from(normalizeLegacyAnchor(snippet, anchor.startMarker, anchor.endMarker))),
        anchor.sha256,
        anchor.id
      );
      snippets.push(snippet);
    }
    const wrappedSnippets = sourceContract.anchors.map((anchor, index) => {
      const snippet = snippets[index];
      if (anchor.id === "curated-spread") {
        return `const curatedQuestions = [\n${snippet}`;
      }
      if (anchor.id === "attempt-profile") {
        return `const __promotionAttemptProfiles = [\n${snippet}\n];`;
      }
      return snippet;
    });
    const anchorSource = `${wrappedSnippets.join("\n\n")}\n`;
    await mkdir(path.dirname(path.join(repoRoot, sourceContract.path)), { recursive: true });
    await writeFile(path.join(repoRoot, sourceContract.path), anchorSource);
    reachabilityInput.push({
      path: sourceContract.path,
      anchors: sourceContract.anchors.map(({ id, sha256 }) => ({ id, sha256 }))
    });
  }
  for (const stubPath of [
    "data/usArkansasQuestions.ts",
    "data/usFloridaMiddleSchoolQuestions.ts",
    "data/usMathQuestions.ts"
  ]) {
    await writeFile(path.join(repoRoot, stubPath), "export const promotionLegacyStub = [];\n");
  }
  const ids = questions.map(({ id }) => id).sort(codePointCompare);
  const gradeDistribution = Object.fromEntries(
    [...new Set(questions.map(({ grade }) => grade))]
      .sort(codePointCompare)
      .map((grade) => [grade, questions.filter((question) => question.grade === grade).length])
  );
  const rowStatuses = questions
    .map((question) => ({
      id: question.id,
      integrationStatus: question.integrationStatus,
      approvalStatus: question.approval.status
    }))
    .sort((left, right) => codePointCompare(left.id, right.id));
  const derivedFacts = {
    packageDigest: gateLib.sha256(packageBytes),
    contentDigest: gateLib.fingerprint(questions),
    semanticDigest: gateLib.fingerprint(legacyPackage),
    idSetDigest: gateLib.fingerprint(ids),
    gradeDistributionDigest: gateLib.fingerprint(gradeDistribution),
    rootStatusDigest: gateLib.fingerprint({
      packageStatus: legacyPackage.packageStatus,
      reviewStatus: legacyPackage.reviewStatus,
      integrationStatus: legacyPackage.integrationStatus,
      nextOwner: legacyPackage.nextOwner
    }),
    rowStatusDigest: gateLib.fingerprint(rowStatuses),
    reachabilityDigest: gateLib.fingerprint(reachabilityInput)
  };
  for (const [field, value] of Object.entries(derivedFacts)) {
    assert.equal(value, gateLib.LEGACY_INITIAL_BASELINE_FACTS[field], field);
  }
  const entry = makeLegacyEntry({ observation, ...derivedFacts });
  const observedSignature = legacyApprovalSignature(entry);
  for (const [role, referenceKey] of [["A23", "a23PromotionReview"], ["A25", "a25ReleaseIntakeReview"]]) {
    const review = {
      schemaVersion: "promotion-legacy-review.v1",
      role,
      packageId: entry.packageId,
      authorizationReference: entry.authorization.reference,
      observedSignature,
      decision: "ratchet-baseline-approved"
    };
    const bytes = Buffer.from(`${JSON.stringify(review, null, 2)}\n`);
    const reference = entry.authorization.reviewReferences[referenceKey];
    await mkdir(path.dirname(path.join(repoRoot, reference.path)), { recursive: true });
    await writeFile(path.join(repoRoot, reference.path), bytes);
    assert.equal(gateLib.sha256(bytes), reference.rawSha256, referenceKey);
  }
  const ratchet = makeLegacyRatchet({ entries: [entry] });
  await mkdir(path.dirname(path.join(repoRoot, manifest.legacyRatchet)), { recursive: true });
  await writeFile(path.join(repoRoot, manifest.legacyRatchet), `${JSON.stringify(ratchet, null, 2)}\n`);
  await writeLegacyDiscoveryRegistry(repoRoot, manifest, [{
    packageId: entry.packageId,
    observation: structuredClone(entry.observation)
  }]);
  return {
    ratchet,
    entry,
    legacyPackage,
    packagePath,
    anchorPath: LEGACY_ANCHOR_REGISTRY[0].path
  };
}

async function writeLegacyDiscoveryRegistry(repoRoot, manifest, observerContracts) {
  for (const root of CANONICAL_LEGACY_DISCOVERY_ROOTS) {
    await mkdir(path.join(repoRoot, root), { recursive: true });
  }
  const registry = {
    schemaVersion: "promotion-legacy-discovery.v1",
    policy: "reachable-candidate-package-conflicts-v1",
    roots: [...CANONICAL_LEGACY_DISCOVERY_ROOTS],
    observerVersion: "promotion-legacy-discovery-observer.v1",
    candidateShapeVersion: "promotion-legacy-candidate-shape.v1",
    observerContracts: structuredClone(observerContracts)
  };
  const bytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  await mkdir(path.dirname(path.join(repoRoot, manifest.legacyDiscovery.registry.path)), { recursive: true });
  await writeFile(path.join(repoRoot, manifest.legacyDiscovery.registry.path), bytes);
  manifest.legacyDiscovery.registry.rawSha256 = gateLib.sha256(bytes);
  return registry;
}

async function writeSyntheticPromotionRepo(repoRoot, { liveSource = "export const livePackage = 'incumbent-v1';\n" } = {}) {
  const manifest = makeManifest();
  await writeCandidateFiles(repoRoot, manifest);
  const candidateSourceCommit = await commitCandidateProvenance(repoRoot, manifest);
  manifest.sourceCommit = candidateSourceCommit;
  const checkerRelease = await writeCheckerReleaseFixture(repoRoot);
  await writeRuntimeSource(repoRoot, liveSource);
  await writeLegacyFixture(repoRoot, manifest);
  await commitSyntheticFixture(repoRoot, "runtime target baseline");
  const { stdout: baselineStdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  manifest.targetBaselineCommit = baselineStdout.trim();
  manifest.checkerRelease = {
    version: "promotion-gate-shadow-v1",
    releaseCommit: checkerRelease.releaseCommit,
    mappingPath: CHECKER_RELEASE_MAPPING_PATH,
    mappingRawSha256: checkerRelease.mappingRawSha256,
    bundleDigest: checkerRelease.bundleDigest
  };
  await bindDistinctEvidenceReviewCommits(repoRoot, manifest);
  await writeLiveRegistry(repoRoot, manifest);
  const manifestPath = "coordination/integration/pilots/synthetic-promotion-manifest.json";
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  await mkdir(path.dirname(path.join(repoRoot, manifestPath)), { recursive: true });
  await writeFile(path.join(repoRoot, manifestPath), manifestBytes);
  await commitSyntheticFixture(repoRoot);
  return { manifest, manifestPath, manifestBytes, checkerRelease };
}

async function sealSyntheticRuntimeBaseline(repoRoot, manifest, manifestPath, message) {
  await commitSyntheticFixture(repoRoot, message);
  const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
    shell: false,
    maxBuffer: 64 * 1024
  });
  manifest.targetBaselineCommit = stdout.trim();
  await bindDistinctEvidenceReviewCommits(repoRoot, manifest, `${message} evidence review`);
  await writeLiveRegistry(repoRoot, manifest);
  await writeFile(path.join(repoRoot, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  await commitSyntheticFixture(repoRoot, `${message} bindings`);
}

test("stableJson sorts plain-object keys and preserves array order", () => {
  assert.equal(
    stableJson({ z: ["second", "first"], a: { y: 2, x: 1 } }),
    '{"a":{"x":1,"y":2},"z":["second","first"]}'
  );
});

test("stableJson rejects values that do not have one canonical JSON representation", () => {
  for (const value of [undefined, 1n, Number.NaN, Number.POSITIVE_INFINITY, new Date(0)]) {
    assert.throws(() => stableJson(value), /canonical JSON/u);
  }
  assert.throws(() => stableJson({ nested: undefined }), /canonical JSON/u);
});

test("computeCandidateDigest hashes the ordered artifact identity records", () => {
  const artifacts = [
    { kind: "safe-card", id: "card-1", recordSha256: "a".repeat(64), ignored: "x" },
    { kind: "practice", id: "practice-1", recordSha256: "b".repeat(64), ignored: "y" },
    { kind: "lesson", id: "lesson-1", recordSha256: "c".repeat(64), ignored: "z" }
  ];
  const expected = createHash("sha256")
    .update(stableJson(artifacts.map(({ kind, id, recordSha256 }) => ({ kind, id, recordSha256 }))))
    .digest("hex");

  assert.equal(typeof gateLib.computeCandidateDigest, "function");
  assert.equal(gateLib.computeCandidateDigest(artifacts), expected);
});

test("assertSafeRepoRelativePath rejects every lexical escape form before file access", () => {
  assert.equal(typeof gateLib.assertSafeRepoRelativePath, "function");
  assert.equal(
    gateLib.assertSafeRepoRelativePath("coordination/integration/candidate.json"),
    "coordination/integration/candidate.json"
  );
  for (const unsafePath of [
    "",
    ".",
    "/absolute.json",
    "../escape.json",
    "a/../escape.json",
    "a/./b.json",
    "a//b.json",
    "a\\b.json",
    "a/\0b.json"
  ]) {
    assert.throws(
      () => gateLib.assertSafeRepoRelativePath(unsafePath),
      (error) => error?.code === "PATH_UNSAFE",
      unsafePath
    );
  }
});

test("lifecycle permits only declared transitions and the v1 runner only shadow pass", () => {
  assert.equal(typeof gateLib.assertLifecycleTransition, "function");
  assert.doesNotThrow(() => gateLib.assertLifecycleTransition("candidate_hold", "shadow_ready"));
  assert.doesNotThrow(() => gateLib.assertLifecycleTransition("shadow_ready", "shadow_passed"));
  assert.doesNotThrow(() => gateLib.assertLifecycleTransition("shadow_ready", "repair_required"));
  assert.doesNotThrow(() => gateLib.assertLifecycleTransition("shadow_ready", "rejected"));
  assert.throws(
    () => gateLib.assertLifecycleTransition("candidate_hold", "shadow_passed"),
    (error) => error?.code === "ILLEGAL_TRANSITION"
  );
  assert.doesNotThrow(() => gateLib.assertLifecycleTransition("shadow_ready", "shadow_passed", { runnerV1: true }));
  assert.throws(
    () => gateLib.assertLifecycleTransition("shadow_ready", "repair_required", { runnerV1: true }),
    (error) => error?.code === "V1_RUNNER_TRANSITION_UNSUPPORTED"
  );
  assert.throws(
    () => gateLib.assertLifecycleTransition("production_promoted", "shadow_ready"),
    (error) => error?.code === "FUTURE_STATE_UNSUPPORTED"
  );
});

test("validatePromotionManifest accepts the complete fail-closed shadow v1 contract", () => {
  const manifest = makeManifest();
  assert.equal(typeof gateLib.validatePromotionManifest, "function");
  assert.equal(gateLib.validatePromotionManifest(manifest), manifest);
});

test("manifest cannot shrink the frozen runtime or legacy discovery surfaces", () => {
  assert.deepEqual([...gateLib.CANONICAL_RUNTIME_ROOTS], CANONICAL_RUNTIME_ROOTS);
  assert.deepEqual([...gateLib.CANONICAL_RUNTIME_ENTRYPOINTS], CANONICAL_RUNTIME_ENTRYPOINTS);
  assert.deepEqual([...gateLib.CANONICAL_LEGACY_DISCOVERY_ROOTS], CANONICAL_LEGACY_DISCOVERY_ROOTS);

  const harmlessSurface = makeManifest();
  harmlessSurface.liveReachability.roots = ["synthetic/live"];
  harmlessSurface.liveReachability.entrypoints = ["synthetic/live/entry.mjs"];
  assert.throws(
    () => gateLib.validatePromotionManifest(harmlessSurface),
    (error) => error?.code === "LIVE_SURFACE_CONTRACT_MISMATCH"
  );

  const shrunkenLegacy = makeManifest();
  shrunkenLegacy.legacyDiscovery.roots = [LEGACY_PACKAGE_PATH];
  assert.throws(
    () => gateLib.validatePromotionManifest(shrunkenLegacy),
    (error) => error?.code === "LEGACY_DISCOVERY_CONTRACT_MISMATCH"
  );
});

test("manifest binds the exact pilot package and three frozen candidate records", () => {
  assert.deepEqual([...gateLib.CANONICAL_CANDIDATE_SELECTION], CANONICAL_CANDIDATE_SELECTION);
  const mutations = [
    (manifest) => { manifest.pilotUnitId = "self-selected-pilot"; },
    (manifest) => { manifest.parentPackage.id = "self-selected-parent"; },
    (manifest) => { manifest.candidateArtifacts[0].id = "self-selected-card"; },
    (manifest) => { manifest.candidateArtifacts[1].path = "coordination/content-qa/harmless.json"; },
    (manifest) => { manifest.candidateArtifacts[2].jsonPointer = "/lessons/0"; }
  ];
  for (const mutate of mutations) {
    const manifest = makeManifest();
    mutate(manifest);
    manifest.candidateDigest = gateLib.computeCandidateDigest(manifest.candidateArtifacts);
    manifest.parentPackage.sourceVersion = `sha256:${manifest.candidateDigest}`;
    assert.throws(
      () => gateLib.validatePromotionManifest(manifest),
      (error) => error?.code === "CANDIDATE_SELECTION_MISMATCH"
    );
  }
});

test("validatePromotionManifest fails closed for live or future modes", () => {
  for (const mode of ["live", "preview", "deploy", "apply", "future-mode"]) {
    assert.throws(
      () => gateLib.validatePromotionManifest(makeManifest({ mode })),
      (error) => error?.code === "LIVE_MODE_DISABLED",
      mode
    );
  }
});

test("validatePromotionManifest recursively rejects executable-capability keys", () => {
  for (const forbiddenKey of ["command", "commands", "argv", "shell", "hook", "url", "env", "fetch", "network", "deploy", "vercel", "provider", "database"]) {
    const manifest = makeManifest();
    manifest.operationPlan.outputs[0][forbiddenKey] = "never-run";
    assert.throws(
      () => gateLib.validatePromotionManifest(manifest),
      (error) => error?.code === "EXECUTABLE_KEY_FORBIDDEN",
      forbiddenKey
    );
  }
});

test("validatePromotionManifest rejects missing, extra, and nested extra fields", () => {
  const missing = makeManifest();
  delete missing.gateId;
  assert.throws(
    () => gateLib.validatePromotionManifest(missing),
    (error) => error?.code === "SCHEMA_MISSING_FIELD"
  );

  assert.throws(
    () => gateLib.validatePromotionManifest({ ...makeManifest(), surprise: true }),
    (error) => error?.code === "SCHEMA_UNKNOWN_FIELD"
  );

  const nestedExtra = makeManifest();
  nestedExtra.parentPackage.surprise = true;
  assert.throws(
    () => gateLib.validatePromotionManifest(nestedExtra),
    (error) => error?.code === "SCHEMA_UNKNOWN_FIELD"
  );
});

test("validatePromotionManifest enforces the exact three-artifact set and candidate digest", () => {
  const duplicateId = makeManifest();
  duplicateId.candidateArtifacts[1].id = duplicateId.candidateArtifacts[0].id;
  assert.throws(
    () => gateLib.validatePromotionManifest(duplicateId),
    (error) => error?.code === "DUPLICATE_ARTIFACT_ID"
  );

  const duplicatePath = makeManifest();
  duplicatePath.candidateArtifacts[1].path = duplicatePath.candidateArtifacts[0].path;
  assert.throws(
    () => gateLib.validatePromotionManifest(duplicatePath),
    (error) => error?.code === "DUPLICATE_ARTIFACT_PATH"
  );

  const wrongKinds = makeManifest();
  wrongKinds.candidateArtifacts[2].kind = "practice";
  assert.throws(
    () => gateLib.validatePromotionManifest(wrongKinds),
    (error) => error?.code === "ARTIFACT_KIND_SET_INVALID"
  );

  const wrongCandidateDigest = makeManifest({ candidateDigest: "0".repeat(64) });
  wrongCandidateDigest.parentPackage.sourceVersion = `sha256:${wrongCandidateDigest.candidateDigest}`;
  assert.throws(
    () => gateLib.validatePromotionManifest(wrongCandidateDigest),
    (error) => error?.code === "CANDIDATE_DIGEST_MISMATCH"
  );
});

test("validatePromotionManifest requires one distinct evidence binding per exact owner role", () => {
  const duplicateRole = makeManifest();
  duplicateRole.evidenceBindings[1].role = duplicateRole.evidenceBindings[0].role;
  assert.throws(
    () => gateLib.validatePromotionManifest(duplicateRole),
    (error) => error?.code === "DUPLICATE_EVIDENCE_ROLE"
  );

  const duplicatePath = makeManifest();
  duplicatePath.evidenceBindings[1].path = duplicatePath.evidenceBindings[0].path;
  assert.throws(
    () => gateLib.validatePromotionManifest(duplicatePath),
    (error) => error?.code === "DUPLICATE_EVIDENCE_PATH"
  );

  const reusedReviewCommit = makeManifest();
  reusedReviewCommit.evidenceBindings[1].reviewedCommit =
    reusedReviewCommit.evidenceBindings[0].reviewedCommit;
  assert.throws(
    () => gateLib.validatePromotionManifest(reusedReviewCommit),
    (error) => error?.code === "EVIDENCE_REVIEW_COMMIT_REUSE"
  );

  const duplicateKind = makeManifest();
  duplicateKind.evidenceBindings[1].kind = duplicateKind.evidenceBindings[0].kind;
  assert.throws(
    () => gateLib.validatePromotionManifest(duplicateKind),
    (error) => error?.code === "DUPLICATE_EVIDENCE_KIND"
  );

  const missingRole = makeManifest();
  missingRole.evidenceBindings = missingRole.evidenceBindings.filter((binding) => binding.role !== "A24");
  assert.throws(
    () => gateLib.validatePromotionManifest(missingRole),
    (error) => error?.code === "EVIDENCE_ROLE_SET_INVALID"
  );
});

test("validatePromotionManifest rejects unknown check IDs and shell-like check injection", () => {
  for (const checkId of ["unknown-check", "mapping-compatibility; rm -rf /", "$(touch owned)"]) {
    const manifest = makeManifest();
    manifest.allowlistedCheckIds.push(checkId);
    assert.throws(
      () => gateLib.validatePromotionManifest(manifest),
      (error) => error?.code === "UNKNOWN_CHECK_ID",
      checkId
    );
  }

  const missing = makeManifest();
  missing.allowlistedCheckIds.pop();
  assert.throws(
    () => gateLib.validatePromotionManifest(missing),
    (error) => error?.code === "CHECK_SET_INVALID"
  );
});

test("validatePromotionManifest rejects shadow output target collisions", () => {
  const manifest = makeManifest();
  manifest.operationPlan.outputs[1].path = manifest.operationPlan.outputs[0].path;
  assert.throws(
    () => gateLib.validatePromotionManifest(manifest),
    (error) => error?.code === "TARGET_COLLISION"
  );
});

test("validatePromotionManifest enforces negative live authorizations and the v1 runner transition", () => {
  for (const authorization of ["integration", "live", "preview", "deploy"]) {
    const manifest = makeManifest();
    manifest.authorizations[authorization] = true;
    assert.throws(
      () => gateLib.validatePromotionManifest(manifest),
      (error) => error?.code === "AUTHORIZATION_BOUNDARY_VIOLATION",
      authorization
    );
  }

  const noShadow = makeManifest();
  noShadow.authorizations.shadow = false;
  assert.throws(
    () => gateLib.validatePromotionManifest(noShadow),
    (error) => error?.code === "AUTHORIZATION_BOUNDARY_VIOLATION"
  );

  const illegalRunnerTransition = makeManifest();
  illegalRunnerTransition.lifecycle.requestedState = "repair_required";
  assert.throws(
    () => gateLib.validatePromotionManifest(illegalRunnerTransition),
    (error) => error?.code === "V1_RUNNER_TRANSITION_UNSUPPORTED"
  );
});

test("validatePromotionManifest requires complete read, temp-write, and forbidden-modification coverage", () => {
  const missingRead = makeManifest();
  missingRead.accessPolicy.allowedReadPaths = missingRead.accessPolicy.allowedReadPaths.filter(
    (entry) => entry !== "synthetic/evidence"
  );
  assert.throws(
    () => gateLib.validatePromotionManifest(missingRead),
    (error) => error?.code === "READ_POLICY_INCOMPLETE"
  );

  const extraTempWrite = makeManifest();
  extraTempWrite.accessPolicy.allowedTemporaryWritePaths.push("fourth.json");
  assert.throws(
    () => gateLib.validatePromotionManifest(extraTempWrite),
    (error) => error?.code === "TEMP_WRITE_SET_INVALID"
  );

  const missingForbidden = makeManifest();
  missingForbidden.accessPolicy.forbiddenModificationPaths = ["synthetic/live"];
  assert.throws(
    () => gateLib.validatePromotionManifest(missingForbidden),
    (error) => error?.code === "FORBIDDEN_MODIFICATION_POLICY_INCOMPLETE"
  );
});

test("manifest content-addresses the candidate source version and binds the exact three-operation plan", () => {
  const mutations = [
    (manifest) => { manifest.parentPackage.sourceVersion = "1.0.0"; },
    (manifest) => { manifest.parentPackage.sourceVersion = `sha256:${"0".repeat(64)}`; },
    (manifest) => { manifest.parentPackage.candidatePackagingVersion = "source-v1"; },
    (manifest) => { manifest.knownBlockers.pop(); },
    (manifest) => { manifest.knownBlockers[0].liveBlocking = false; },
    (manifest) => { manifest.operationPlan.expectedOperationCount = 4; },
    (manifest) => { manifest.operationPlan.expectedOutputTypes = ["practice", "safe-card", "lesson"]; }
  ];
  for (const mutate of mutations) {
    const manifest = makeManifest();
    mutate(manifest);
    assert.throws(() => gateLib.validatePromotionManifest(manifest));
  }
});

test("validatePromotionManifest pins schema, checker, candidate-only parent, and lowercase commit bindings", () => {
  const cases = [
    [{ schemaVersion: "promotion-manifest.v2" }, "SCHEMA_VERSION_UNSUPPORTED"],
    [{ checkerVersion: "promotion-gate-live-v1" }, "CHECKER_VERSION_UNSUPPORTED"],
    [{ sourceCommit: "A".repeat(40) }, "COMMIT_BINDING_INVALID"],
    [{ targetBaselineCommit: "b".repeat(39) }, "COMMIT_BINDING_INVALID"]
  ];
  for (const [overrides, code] of cases) {
    assert.throws(
      () => gateLib.validatePromotionManifest(makeManifest(overrides)),
      (error) => error?.code === code,
      JSON.stringify(overrides)
    );
  }

  const wrongParent = makeManifest();
  wrongParent.parentPackage.status = "approved";
  assert.throws(
    () => gateLib.validatePromotionManifest(wrongParent),
    (error) => error?.code === "PARENT_STATUS_INVALID"
  );
});

test("validatePromotionManifest rejects case-folded artifact, evidence, and output collisions", () => {
  const artifactPath = makeManifest();
  artifactPath.candidateArtifacts[1].path = artifactPath.candidateArtifacts[0].path.toUpperCase();
  assert.throws(
    () => gateLib.validatePromotionManifest(artifactPath),
    (error) => error?.code === "CASE_COLLISION"
  );

  const evidencePath = makeManifest();
  evidencePath.evidenceBindings[1].path = evidencePath.evidenceBindings[0].path.toUpperCase();
  assert.throws(
    () => gateLib.validatePromotionManifest(evidencePath),
    (error) => error?.code === "CASE_COLLISION"
  );

  const outputPath = makeManifest();
  outputPath.operationPlan.outputs[1].path = outputPath.operationPlan.outputs[0].path.toUpperCase();
  assert.throws(
    () => gateLib.validatePromotionManifest(outputPath),
    (error) => error?.code === "CASE_COLLISION"
  );
});

test("validatePromotionEvidence accepts a current hash-bound self-declared owner receipt", () => {
  const manifest = makeManifest();
  const evidence = makeEvidence("A04", manifest);
  assert.equal(typeof gateLib.validatePromotionEvidence, "function");
  const result = gateLib.validatePromotionEvidence(evidence, {
    manifest,
    binding: {
      ...manifest.evidenceBindings.find((entry) => entry.role === "A04"),
      rawSha256: gateLib.sha256(Buffer.from(JSON.stringify(evidence))),
      semanticSha256: gateLib.fingerprint(evidence.semanticPayload)
    },
    rawBytes: Buffer.from(JSON.stringify(evidence))
  });
  assert.equal(result.evidence, evidence);
  assert.match(result.trustBoundary, /not cryptographic identity/u);
});

test("every owner role rejects generic prose or empty semantic evidence", () => {
  const manifest = makeManifest();
  for (const role of REQUIRED_OWNERS) {
    for (const semanticPayload of [{}, { summary: `${role} generic approval` }]) {
      assert.throws(
        () => gateLib.validatePromotionEvidence(
          makeEvidence(role, manifest, { semanticPayload }),
          { manifest }
        ),
        (error) => role === "A24"
          ? ["A24_RATIONALE_REQUIRED", "A24_SEMANTICS_INVALID"].includes(error?.code)
          : error?.code === `${role}_SEMANTICS_INVALID`,
        `${role}: ${JSON.stringify(semanticPayload)}`
      );
    }
  }
});

test("validatePromotionEvidence rejects raw, semantic, candidate, commit, and checker drift", () => {
  const manifest = makeManifest();
  const evidence = makeEvidence("A18", manifest);
  const rawBytes = Buffer.from(JSON.stringify(evidence));
  const binding = {
    ...manifest.evidenceBindings.find((entry) => entry.role === "A18"),
    rawSha256: gateLib.sha256(rawBytes),
    semanticSha256: gateLib.fingerprint(evidence.semanticPayload)
  };

  assert.throws(
    () => gateLib.validatePromotionEvidence(evidence, { manifest, binding: { ...binding, rawSha256: "0".repeat(64) }, rawBytes }),
    (error) => error?.code === "EVIDENCE_RAW_DIGEST_MISMATCH"
  );
  assert.throws(
    () => gateLib.validatePromotionEvidence(evidence, { manifest, binding: { ...binding, semanticSha256: "0".repeat(64) }, rawBytes }),
    (error) => error?.code === "EVIDENCE_SEMANTIC_DIGEST_MISMATCH"
  );
  for (const drift of [
    { candidateDigest: "0".repeat(64) },
    { sourceCommit: "c".repeat(40) },
    { targetBaselineCommit: "d".repeat(40) },
    { checkerVersion: "promotion-gate-shadow-v2" }
  ]) {
    const changed = { ...evidence, ...drift };
    assert.throws(
      () => gateLib.validatePromotionEvidence(changed, { manifest }),
      (error) =>
        error?.code === "EVIDENCE_CURRENTNESS_MISMATCH" &&
        error?.outcome === "blocked" &&
        error?.details?.role === "A18" &&
        error?.details?.staleBindings?.length === 1,
      JSON.stringify(drift)
    );
  }
});

test("validatePromotionEvidence allows A24 not_applicable only with a nonempty rationale", () => {
  const manifest = makeManifest();
  const accepted = makeEvidence("A24", manifest, {
    result: "not_applicable",
    semanticPayload: {
      contractVersion: "promotion-a24-exact-layer.v1",
      exactLayerDisposition: "not-applicable",
      rationale: "No deterministic exact layer is required for these records."
    }
  });
  assert.doesNotThrow(() => gateLib.validatePromotionEvidence(accepted, { manifest }));

  for (const semanticPayload of [{}, { rationale: "" }, { rationale: "   " }]) {
    const invalid = makeEvidence("A24", manifest, { result: "not_applicable", semanticPayload });
    assert.throws(
      () => gateLib.validatePromotionEvidence(invalid, { manifest }),
      (error) => error?.code === "A24_RATIONALE_REQUIRED"
    );
  }

  assert.throws(
    () => gateLib.validatePromotionEvidence(makeEvidence("A18", manifest, { result: "not_applicable" }), { manifest }),
    (error) => error?.code === "NOT_APPLICABLE_ROLE_INVALID"
  );
});

test("validatePromotionEvidence pins the A04 numeric oracle, accepted forms, primary standard, and live alias", () => {
  const manifest = makeManifest();
  const valid = makeRoleSemanticPayload("A04", manifest);
  for (const semanticPayload of [
    { ...valid, numericOracle: 11 },
    { ...valid, practiceId: "different-practice" },
    { ...valid, acceptedAnswers: ["12 cups", "12"] },
    { ...valid, primaryStandardId: "6.RP.2" },
    { ...valid, liveStandardAlias: "6.RP.3" },
    { ...valid, acceptedAnswerPolicy: "contains-number" },
    { ...valid, futureBoundary: "live-write-allowed" }
  ]) {
    assert.throws(
      () => gateLib.validatePromotionEvidence(makeEvidence("A04", manifest, { semanticPayload }), { manifest }),
      (error) => error?.code === "A04_SEMANTICS_INVALID",
      JSON.stringify(semanticPayload)
    );
  }
});

test("A18 evidence separates declared metadata from assessed coverage and retains all eight repair-before-live blockers", () => {
  const manifest = makeManifest();
  const valid = makeRoleSemanticPayload("A18", manifest);
  assert.deepEqual(valid.decisions.map(({ decision, liveDecision, rejected }) => ({ decision, liveDecision, rejected })), [
    { decision: "accept-for-shadow", liveDecision: "repair-before-live", rejected: false },
    { decision: "accept-for-shadow", liveDecision: "repair-before-live", rejected: false },
    { decision: "accept-for-shadow", liveDecision: "repair-before-live", rejected: false }
  ]);
  assert.deepEqual(valid.standards, {
    declaredCluster: ["6.RP.1", "6.RP.2", "6.RP.3"],
    candidateMaisIds: ["CA.CCSS.Math.G6.RP.1", "CA.CCSS.Math.G6.RP.2", "CA.CCSS.Math.G6.RP.3"],
    primaryStandardId: "6.RP.3",
    directlyAssessed: ["6.RP.3"],
    embeddedPrerequisite: ["6.RP.1"],
    notDemonstrated: ["6.RP.2"],
    proposedLiveAlias: "6.RP.A.3",
    liveMappingStatus: "unverified-incompatible-preserved-outside-runtime"
  });
  assert.deepEqual(valid.liveBlockers.map(({ code }) => code), [
    "item-standard-scope-overclaim",
    "fine-grained-standard-id-live-mapping-unbound",
    "unresolved-live-source-ids",
    "missing-bilingual-fields",
    "known-grammar-issue",
    "student-feedback-exposes-internal-misconception-label",
    "open-ended-practice-without-answer-or-rubric",
    "prior-s18-evidence-record-mismatch"
  ]);
  assert.deepEqual(valid.liveBlockers[2], {
    code: "unresolved-live-source-ids",
    candidateSourceIds: [
      "california-math-common-core-skill",
      "cde-ca-ccss-math-resources",
      "common-core-state-standards-public-license",
      "ixl-california-math-standards-navigation-only"
    ],
    verifiedLiveSourceIds: [
      "cde-ca-ccss-math-resources",
      "common-core-state-standards-public-license"
    ],
    unresolvedSourceIds: [
      "california-math-common-core-skill",
      "ixl-california-math-standards-navigation-only"
    ],
    status: "blocked-for-live"
  });
  assert.doesNotThrow(() => gateLib.validatePromotionEvidence(makeEvidence("A18", manifest), { manifest }));

  for (const mutate of [
    (payload) => { payload.decisions[0].rejected = true; },
    (payload) => { payload.standards.directlyAssessed = ["6.RP.1", "6.RP.2", "6.RP.3"]; },
    (payload) => { payload.standards.notDemonstrated = []; },
    (payload) => { payload.liveBlockers.pop(); },
    (payload) => { payload.liveBlockers[1].status = "verified-for-live"; }
  ]) {
    const semanticPayload = structuredClone(valid);
    mutate(semanticPayload);
    assert.throws(
      () => gateLib.validatePromotionEvidence(makeEvidence("A18", manifest, { semanticPayload }), { manifest }),
      (error) => error?.code === "A18_SEMANTICS_INVALID"
    );
  }
});

test("A11 preflight requires semantic replay equality but does not require raw receipt inequality", () => {
  const manifest = makeManifest();
  const valid = makeRoleSemanticPayload("A11", manifest);
  assert.equal(valid.postRunReportBoundary.distinctRunIdsRequired, true);
  assert.equal(valid.postRunReportBoundary.semanticReceiptDigestEqualityRequired, true);
  assert.equal(valid.postRunReportBoundary.rawReceiptDigestInequalityRequired, false);
  assert.doesNotThrow(() => gateLib.validatePromotionEvidence(makeEvidence("A11", manifest), { manifest }));
  const invalid = structuredClone(valid);
  invalid.postRunReportBoundary.rawReceiptDigestInequalityRequired = true;
  assert.throws(
    () => gateLib.validatePromotionEvidence(makeEvidence("A11", manifest, { semanticPayload: invalid }), { manifest }),
    (error) => error?.code === "A11_SEMANTICS_INVALID"
  );
});

test("readAuthoritativeFile reads a regular single-link file and returns its raw digest", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-read-"));
  try {
    await mkdir(path.join(repoRoot, "candidate"));
    const bytes = Buffer.from('{"record":{"id":"safe"}}\n');
    await writeFile(path.join(repoRoot, "candidate", "safe.json"), bytes);
    assert.equal(typeof gateLib.readAuthoritativeFile, "function");
    const result = await gateLib.readAuthoritativeFile(repoRoot, "candidate/safe.json");
    assert.deepEqual(result.bytes, bytes);
    assert.equal(result.rawSha256, gateLib.sha256(bytes));
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("readAuthoritativeFile rejects symlink ancestors, symlink leaves, hardlinks, and nonregular files", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-unsafe-read-"));
  const outsideRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-outside-"));
  try {
    await mkdir(path.join(repoRoot, "candidate"));
    await writeFile(path.join(outsideRoot, "outside.json"), "{}\n");
    await symlink(outsideRoot, path.join(repoRoot, "linked-dir"));
    await symlink(path.join(outsideRoot, "outside.json"), path.join(repoRoot, "candidate", "linked.json"));
    await writeFile(path.join(repoRoot, "candidate", "hard-source.json"), "{}\n");
    await link(
      path.join(repoRoot, "candidate", "hard-source.json"),
      path.join(repoRoot, "candidate", "hard-linked.json")
    );

    for (const relativePath of [
      "linked-dir/outside.json",
      "candidate/linked.json",
      "candidate/hard-linked.json",
      "candidate"
    ]) {
      await assert.rejects(
        gateLib.readAuthoritativeFile(repoRoot, relativePath),
        (error) => error?.code === "AUTHORITATIVE_PATH_UNSAFE",
        relativePath
      );
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(outsideRoot, { recursive: true, force: true });
  }
});

test("extractJsonPointer resolves RFC 6901 records without prototype traversal", () => {
  assert.equal(typeof gateLib.extractJsonPointer, "function");
  const document = { records: [{ "a/b": { "m~n": 12 } }] };
  assert.equal(gateLib.extractJsonPointer(document, "/records/0/a~1b/m~0n"), 12);
  assert.throws(
    () => gateLib.extractJsonPointer(document, "/records/1"),
    (error) => error?.code === "JSON_POINTER_UNRESOLVED"
  );
  assert.throws(
    () => gateLib.extractJsonPointer(document, "/__proto__/polluted"),
    (error) => error?.code === "JSON_POINTER_UNSAFE"
  );
});

test("loadCandidateRecords reads the real-shaped /108, /questions/30, and /lessons/30 integration fixture", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-candidates-"));
  try {
    const manifest = makeManifest();
    const expected = await writeCandidateFiles(repoRoot, manifest);
    assert.equal(typeof gateLib.loadCandidateRecords, "function");
    const loaded = await gateLib.loadCandidateRecords(repoRoot, manifest);
    assert.deepEqual(loaded.records, expected);
    assert.deepEqual(Object.keys(loaded.sourceDigests).sort(), manifest.candidateArtifacts.map((entry) => entry.path).sort());
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("loadCandidateRecords rejects a hash-valid record whose id contradicts the manifest artifact", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-candidate-id-"));
  try {
    const manifest = makeManifest();
    await writeCandidateFiles(repoRoot, manifest);
    const artifact = manifest.candidateArtifacts.find(({ kind }) => kind === "safe-card");
    const filePath = path.join(repoRoot, artifact.path);
    const document = JSON.parse(await readFile(filePath, "utf8"));
    document[108].id = "different-but-hash-bound-id";
    const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
    await writeFile(filePath, bytes);
    artifact.rawFileSha256 = gateLib.sha256(bytes);
    artifact.recordSha256 = gateLib.fingerprint(document[108]);
    manifest.candidateDigest = gateLib.computeCandidateDigest(manifest.candidateArtifacts);
    manifest.parentPackage.sourceVersion = `sha256:${manifest.candidateDigest}`;

    await assert.rejects(
      gateLib.loadCandidateRecords(repoRoot, manifest),
      (error) => error?.code === "CANDIDATE_RECORD_ID_MISMATCH"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("loadEvidenceRecords validates all nine distinct current evidence files", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-evidence-"));
  try {
    const { manifest } = await writeSyntheticPromotionRepo(repoRoot);
    const expected = Object.fromEntries(
      manifest.evidenceBindings.map(({ role }) => [role, makeEvidence(role, manifest)])
    );
    const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    assert.equal(typeof gateLib.loadEvidenceRecords, "function");
    const loaded = await gateLib.loadEvidenceRecords(repoRoot, manifest, stdout.trim());
    assert.deepEqual(loaded.byRole, expected);
    assert.equal(Object.keys(loaded.sourceDigests).length, REQUIRED_OWNERS.length);
    assert.equal(loaded.indexProof.reviewedCommitCount, 9);
    assert.match(loaded.indexProof.reviewedCommitsDigest, /^[a-f0-9]{64}$/u);
    assert.match(loaded.trustBoundary, /not cryptographic identity/u);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("evidence currentness blocks missing or unauthorized reviewed commits and stale commit blobs", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-evidence-review-commit-"));
  try {
    const { manifest } = await writeSyntheticPromotionRepo(repoRoot);
    const readHead = async () => {
      const { stdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
        shell: false,
        maxBuffer: 64 * 1024
      });
      return stdout.trim();
    };
    const originalCommit = manifest.evidenceBindings[0].reviewedCommit;
    manifest.evidenceBindings[0].reviewedCommit = "f".repeat(40);
    await writeEvidenceFiles(repoRoot, manifest);
    await assert.rejects(
      gateLib.loadEvidenceRecords(repoRoot, manifest, await readHead()),
      (error) =>
        error?.code === "EVIDENCE_REVIEW_COMMIT_MISSING" &&
        error?.outcome === "blocked" &&
        error?.details?.role === "A21"
    );

    manifest.evidenceBindings[0].reviewedCommit = manifest.sourceCommit;
    await writeEvidenceFiles(repoRoot, manifest);
    await assert.rejects(
      gateLib.loadEvidenceRecords(repoRoot, manifest, await readHead()),
      (error) =>
        error?.code === "EVIDENCE_REVIEW_BLOB_MISSING" &&
        error?.outcome === "blocked" &&
        error?.details?.role === "A21"
    );

    manifest.evidenceBindings[0].reviewedCommit = originalCommit;
    const evidencePath = manifest.evidenceBindings[0].path;
    const evidence = JSON.parse(await readFile(path.join(repoRoot, evidencePath), "utf8"));
    evidence.semanticPayload.sourceSafety.safeCardCopiedSourceText = true;
    const changedBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
    await writeFile(path.join(repoRoot, evidencePath), changedBytes);
    manifest.evidenceBindings[0].rawSha256 = gateLib.sha256(changedBytes);
    manifest.evidenceBindings[0].semanticSha256 = gateLib.fingerprint(evidence.semanticPayload);
    await writeEvidenceFiles(repoRoot, manifest, { A21: { semanticPayload: evidence.semanticPayload } });
    await assert.rejects(
      gateLib.loadEvidenceRecords(repoRoot, manifest, await readHead()),
      (error) =>
        error?.code === "EVIDENCE_REVIEW_BLOB_MISMATCH" &&
        error?.outcome === "blocked" &&
        error?.details?.role === "A21"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("owner semantics are cross-checked against the loaded practice, lesson, and standards records", () => {
  const manifest = makeManifest();
  const records = makeRealShapedCandidateRecords(manifest);
  const evidenceByRole = Object.fromEntries(REQUIRED_OWNERS.map((role) => [role, makeEvidence(role, manifest)]));
  assert.equal(typeof gateLib.validateEvidenceCandidateSemantics, "function");
  assert.doesNotThrow(() => gateLib.validateEvidenceCandidateSemantics(manifest, records, evidenceByRole));

  const cases = [
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.canonicalStandardIds = ["6.RP.1", "6.RP.2"];
      }
    },
    {
      code: "A04_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.acceptedAnswers = ["12 cups"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.sourceIds = ["cde-ca-ccss-math-resources"];
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        delete value.lesson.lessonModule.remediation;
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.lessonModule.objective = { en: value.lesson.lessonModule.objective, zh: "臆造字段" };
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.lessonModule.conceptExplanation = "The grammar issue was silently changed after review.";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value["safe-card"].packageId = "different-parent";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value["safe-card"].status = "live";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value.practice.upstreamPackageId = "different-parent";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value.practice.approval.status = "approved-live";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value.lesson.upstreamPackageId = "different-parent";
      }
    },
    {
      code: "A21_RECORD_BINDING_MISMATCH",
      mutate(value) {
        value.lesson.releaseStatus = "live";
      }
    },
    {
      code: "A04_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.prompt.en = "A recipe uses 5 cups of oats for every 3 cups of fruit. If fruit is 20 cups, how much oats?";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.studentContent.misconceptionFeedback.en = "unit rate not normalized";
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.lessonModule.workedExample.prompt = "Different worked example";
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.metadata.misconceptionTargets = ["unit rate not normalized"];
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.lessonModule.remediation.targetMisconception = "unit rate not normalized";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value["safe-card"].maisGrade = "P5";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.grade = "P5";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.clusterId = "6.RP.other";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value["safe-card"].domainIds = ["6.NS"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.standardIds = ["CA.CCSS.Math.G6.RP.3"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.maisStandardIds = ["CA.CCSS.Math.G6.RP.1"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value["safe-card"].misconceptionTags = ["ratio order reversed"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.evidenceCardIds = ["other-safe-card"];
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.sourceIds = ["cde-ca-ccss-math-resources"];
      }
    },
    {
      code: "A04_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.answerKey.correctAnswer = "13 cups";
      }
    },
    {
      code: "A04_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.practice.independentAnswer = "13 cups";
      }
    },
    {
      code: "A18_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value["safe-card"].bilingualTerminologyNotes = ["invented translation"];
      }
    },
    {
      code: "A05_RECORD_SEMANTICS_MISMATCH",
      mutate(value) {
        value.lesson.lessonModule.guidedPractice.answer = "12 cups";
      }
    }
  ];
  for (const { code, mutate } of cases) {
    const changed = structuredClone(records);
    mutate(changed);
    assert.throws(
      () => gateLib.validateEvidenceCandidateSemantics(manifest, changed, evidenceByRole),
      (error) => error?.code === code,
      code
    );
  }
});

test("A18 prior-review drift binds the exact authoritative prose anchor and selected lesson remediation", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-prior-review-"));
  try {
    const manifest = makeManifest();
    const records = await writeCandidateFiles(repoRoot, manifest);
    const evidenceByRole = Object.fromEntries(
      REQUIRED_OWNERS.map((role) => [role, makeEvidence(role, manifest)])
    );
    const proof = await gateLib.validatePriorS18ReviewDrift(repoRoot, records, evidenceByRole);
    assert.deepEqual(proof, {
      path: gateLib.PRIOR_S18_REVIEW_PATH,
      rawSha256: gateLib.PRIOR_S18_REVIEW_RAW_SHA256,
      anchorDigest: gateLib.fingerprint(
        "| `s05-ca-rag-v2-lesson-031-6-rp-ratios` | P6 | `6.RP.ratios` | Worked example matches the validated ratio question; remediation targets additive-vs-multiplicative confusion. | Pass for review |"
      ),
      matchesSelectedRecord: false
    });

    await writeFile(
      path.join(repoRoot, gateLib.PRIOR_S18_REVIEW_PATH),
      "# Replaced prose without the selected-record anchor\n"
    );
    await assert.rejects(
      gateLib.validatePriorS18ReviewDrift(repoRoot, records, evidenceByRole),
      (error) => error?.code === "A18_PRIOR_REVIEW_BINDING_MISMATCH"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("exact-trimmed-forms-v1 accepts only the owner-bound answer forms after trimming", () => {
  assert.equal(typeof gateLib.evaluateAcceptedAnswer, "function");
  for (const accepted of ["12", "12 cups", " 12 ", "12 cups\n"]) {
    assert.equal(gateLib.evaluateAcceptedAnswer(accepted, ["12", "12 cups"], "exact-trimmed-forms-v1"), true);
  }
  for (const rejected of ["12.0", "about 12 cups", "112", "12 Cups", "12 cups.", ""] ) {
    assert.equal(gateLib.evaluateAcceptedAnswer(rejected, ["12", "12 cups"], "exact-trimmed-forms-v1"), false);
  }
});

test("buildShadowDtos preserves the three compatibility contracts without invented defaults", () => {
  const manifest = makeManifest();
  const records = makeRealShapedCandidateRecords(manifest);
  const evidenceByRole = Object.fromEntries(REQUIRED_OWNERS.map((role) => [role, makeEvidence(role, manifest)]));
  assert.equal(typeof gateLib.buildShadowDtos, "function");
  const dtos = gateLib.buildShadowDtos(records, evidenceByRole);
  assert.equal(dtos["safe-card"].sourceCardKind, "cluster-safe-card-v2");
  assert.equal(dtos["safe-card"].proposedRuntimeKind, "standards");
  assert.deepEqual(dtos["safe-card"].domainIds, records["safe-card"].domainIds);
  assert.deepEqual(dtos["safe-card"].canonicalStandardIds, records["safe-card"].canonicalStandardIds);
  assert.deepEqual(dtos["safe-card"].maisStandardIds, records["safe-card"].maisStandardIds);
  assert.equal(dtos["safe-card"].clusterId, records["safe-card"].clusterId);
  assert.equal(dtos["safe-card"].mappingCompatibility.adapter, "cluster-safe-card-v2-to-standards-v1");

  assert.deepEqual(dtos.practice.prompt, records.practice.prompt);
  assert.deepEqual(dtos.practice.studentContent, records.practice.studentContent);
  assert.equal(dtos.practice.answer, "12 cups");
  assert.deepEqual(dtos.practice.acceptedAnswers, ["12", "12 cups"]);
  assert.equal(dtos.practice.acceptedAnswerPolicy, "exact-trimmed-forms-v1");
  assert.deepEqual(dtos.practice.explanation, records.practice.explanation);
  assert.equal(
    dtos.practice.liveBlockers.some(({ code }) => code === "student-feedback-exposes-internal-misconception-label"),
    true
  );

  assert.equal(dtos.lesson.languageMode, "en");
  assert.equal(dtos.lesson.objective, records.lesson.lessonModule.objective);
  assert.deepEqual(dtos.lesson.workedExample, records.lesson.lessonModule.workedExample);
  assert.deepEqual(dtos.lesson.guidedPractice, records.lesson.lessonModule.guidedPractice);
  assert.deepEqual(dtos.lesson.independentPractice, records.lesson.lessonModule.independentPractice);
  assert.deepEqual(dtos.lesson.remediation, records.lesson.lessonModule.remediation);
  assert.deepEqual(
    dtos.lesson.preservedOutsideRuntime.lessonModule,
    {
      prerequisiteCheck: records.lesson.lessonModule.prerequisiteCheck,
      conceptExplanation: records.lesson.lessonModule.conceptExplanation,
      teacherNotes: records.lesson.lessonModule.teacherNotes
    }
  );
  assert.deepEqual(dtos.lesson.mappingCompatibility.sourceSequence, [
    "objective", "prerequisiteCheck", "conceptExplanation", "workedExample",
    "guidedPractice", "independentPractice", "remediation", "teacherNotes"
  ]);
  assert.deepEqual(dtos.lesson.mappingCompatibility.shadowMappedSequence, [
    "objective", "workedExample", "guidedPractice", "independentPractice", "remediation"
  ]);

  for (const [kind, record] of Object.entries(records)) {
    const compatibility = dtos[kind].mappingCompatibility;
    assert.deepEqual(compatibility.unaccountedFields, [], `${kind} has no silently dropped top-level fields`);
    assert.deepEqual(
      [...compatibility.mappedFields, ...compatibility.preservedOutsideRuntimeFields].sort(),
      Object.keys(record).sort(),
      `${kind} accounts for every source top-level field`
    );
    assert.match(compatibility.preservationDigest, /^[a-f0-9]{64}$/u);
  }
  assert.equal(Object.hasOwn(dtos.lesson, "bilingual"), false);
  assert.equal(Object.hasOwn(dtos.lesson, "zh"), false);
  assert.equal(Object.hasOwn(dtos.lesson, "en"), false);
});

test("buildShadowDtos rejects malformed or semantically drifting candidates instead of defaulting", () => {
  const manifest = makeManifest();
  const evidenceByRole = Object.fromEntries(REQUIRED_OWNERS.map((role) => [role, makeEvidence(role, manifest)]));
  const records = makeRealShapedCandidateRecords(manifest);

  assert.throws(
    () => gateLib.buildShadowDtos({ ...records, "safe-card": { ...records["safe-card"], domainIds: "ratios" } }, evidenceByRole),
    (error) => error?.code === "MAPPING_COMPATIBILITY_FAILED"
  );
  assert.throws(
    () => gateLib.buildShadowDtos({
      ...records,
      lesson: {
        ...records.lesson,
        lessonModule: { ...records.lesson.lessonModule, objective: 12 }
      }
    }, evidenceByRole),
    (error) => error?.code === "MAPPING_COMPATIBILITY_FAILED"
  );
  assert.throws(
    () => gateLib.buildShadowDtos({ ...records, practice: { ...records.practice, answer: "13 cups" } }, evidenceByRole),
    (error) => error?.code === "MAPPING_COMPATIBILITY_FAILED"
  );
});

test("A24 not_applicable is independently verified by scanning all three bound records for exact-layer fields", () => {
  const manifest = makeManifest();
  const evidenceByRole = Object.fromEntries(REQUIRED_OWNERS.map((role) => [role, makeEvidence(role, manifest)]));
  const cleanRecords = makeRealShapedCandidateRecords(manifest);
  assert.doesNotThrow(() => gateLib.validateEvidenceCandidateSemantics(manifest, cleanRecords, evidenceByRole));

  for (const mutate of [
    (records) => { records["safe-card"].diagram = { kind: "ratio-table" }; },
    (records) => { records.practice.asset = "candidate.svg"; },
    (records) => { records.lesson.lessonModule.workedExample.svg = "<svg />"; },
    (records) => { records.lesson.lessonModule.coordinate = [0, 0]; }
  ]) {
    const changed = structuredClone(cleanRecords);
    mutate(changed);
    assert.throws(
      () => gateLib.validateEvidenceCandidateSemantics(manifest, changed, evidenceByRole),
      (error) => error?.code === "A24_EXACT_LAYER_PRESENT"
    );
  }
});

test("source snapshots detect byte drift and forbidden live-tree creation", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-snapshot-"));
  try {
    await mkdir(path.join(repoRoot, "synthetic/candidate"), { recursive: true });
    await mkdir(path.join(repoRoot, "synthetic/live"), { recursive: true });
    await writeFile(path.join(repoRoot, "synthetic/candidate/source.json"), "{\"value\":1}\n");
    await writeFile(path.join(repoRoot, "synthetic/live/entry.mjs"), "export const active = true;\n");

    assert.equal(typeof gateLib.snapshotRepoPaths, "function");
    assert.equal(typeof gateLib.assertSnapshotsEqual, "function");
    const sourceBefore = await gateLib.snapshotRepoPaths(repoRoot, ["synthetic/candidate"]);
    const liveBefore = await gateLib.snapshotRepoPaths(repoRoot, ["synthetic/live"]);
    const sourceSame = await gateLib.snapshotRepoPaths(repoRoot, ["synthetic/candidate"]);
    assert.deepEqual(gateLib.assertSnapshotsEqual(sourceBefore, sourceSame, "SOURCE_MUTATION"), {
      equal: true,
      changedPaths: []
    });

    await writeFile(path.join(repoRoot, "synthetic/candidate/source.json"), "{\"value\":2}\n");
    const sourceAfter = await gateLib.snapshotRepoPaths(repoRoot, ["synthetic/candidate"]);
    assert.throws(
      () => gateLib.assertSnapshotsEqual(sourceBefore, sourceAfter, "SOURCE_MUTATION"),
      (error) => error?.code === "SOURCE_MUTATION" && error.details.changedPaths.includes("synthetic/candidate/source.json")
    );

    await writeFile(path.join(repoRoot, "synthetic/live/new-live.mjs"), "export const leaked = true;\n");
    const liveAfter = await gateLib.snapshotRepoPaths(repoRoot, ["synthetic/live"]);
    assert.throws(
      () => gateLib.assertSnapshotsEqual(liveBefore, liveAfter, "FORBIDDEN_LIVE_MUTATION"),
      (error) => error?.code === "FORBIDDEN_LIVE_MUTATION" && error.details.changedPaths.includes("synthetic/live/new-live.mjs")
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("shadow output rehearsal uses exclusive OS-temp files and proves complete rollback", async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const operationPlan = makeManifest().operationPlan;
  const dtos = {
    "safe-card": { schemaVersion: "promotion-shadow-dto.v1", kind: "safe-card", id: "card" },
    practice: { schemaVersion: "promotion-shadow-dto.v1", kind: "practice", id: "practice" },
    lesson: { schemaVersion: "promotion-shadow-dto.v1", kind: "lesson", id: "lesson" }
  };
  assert.equal(typeof gateLib.rehearseShadowOutputs, "function");
  const proof = await gateLib.rehearseShadowOutputs(repoRoot, dtos, operationPlan);
  assert.equal(proof.tempRootPolicy, "os-temp-only");
  assert.deepEqual(proof.outputs.map(({ kind, path: outputPath }) => ({ kind, path: outputPath })), operationPlan.outputs);
  assert.equal(proof.outputs.every((output) => /^[a-f0-9]{64}$/u.test(output.rawSha256)), true);
  assert.equal(proof.preimageDigest, gateLib.fingerprint([]));
  assert.equal(proof.postRollbackDigest, gateLib.fingerprint([]));
  assert.equal(proof.preimageDigest, proof.postRollbackDigest);
  assert.equal(proof.verifiedAbsent, true);
  assert.equal(proof.rootRemoved, true);
  assert.deepEqual(proof.deletedPaths.sort(), operationPlan.outputs.map((output) => output.path).sort());
});

test("partial Shadow failures clean only registered outputs and retain unexpected entries for forensics", async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const operationPlan = makeManifest().operationPlan;
  const valid = (kind) => ({ schemaVersion: "promotion-shadow-dto.v1", kind, id: kind });
  await assert.rejects(
    gateLib.rehearseShadowOutputs(repoRoot, {
      "safe-card": valid("safe-card"),
      practice: { schemaVersion: "promotion-shadow-dto.v1", kind: "practice", id: 1n },
      lesson: valid("lesson")
    }, operationPlan),
    (error) =>
      error?.code === "SHADOW_OUTPUT_WRITE_FAILED" &&
      error?.details?.partialRollback?.verifiedAbsent === true &&
      error?.details?.partialRollback?.rootRemoved === true &&
      /^[a-f0-9]{64}$/u.test(error?.details?.partialRollback?.cleanupDigest)
  );

  const beforeRoots = new Set(readdirSync(tmpdir()).filter((entry) => entry.startsWith("mais-promotion-shadow-")));
  const practiceWithUnexpectedEntry = {
    schemaVersion: "promotion-shadow-dto.v1",
    kind: "practice",
    get id() {
      const activeRoot = readdirSync(tmpdir())
        .filter((entry) => entry.startsWith("mais-promotion-shadow-") && !beforeRoots.has(entry))
        .map((entry) => path.join(tmpdir(), entry))
        .find((candidateRoot) => {
          try {
            return readdirSync(candidateRoot).includes("safe-card.json");
          } catch {
            return false;
          }
        });
      if (activeRoot) writeFileSync(path.join(activeRoot, "unexpected-forensic-entry"), "preserve\n");
      return "practice";
    }
  };
  try {
    await assert.rejects(
      gateLib.rehearseShadowOutputs(repoRoot, {
        "safe-card": valid("safe-card"),
        practice: practiceWithUnexpectedEntry,
        lesson: valid("lesson")
      }, operationPlan),
      (error) =>
        error?.code === "ROLLBACK_INCOMPLETE" &&
        error?.details?.partialRollback?.unexpectedEntryCount === 1 &&
        error?.details?.partialRollback?.verifiedAbsent === false &&
        error?.details?.partialRollback?.rootRemoved === false &&
        !JSON.stringify(error.details).includes("unexpected-forensic-entry")
    );
    const preservedRoots = readdirSync(tmpdir())
      .filter((entry) => entry.startsWith("mais-promotion-shadow-") && !beforeRoots.has(entry));
    assert.equal(preservedRoots.length, 1);
    assert.deepEqual(readdirSync(path.join(tmpdir(), preservedRoots[0])), ["unexpected-forensic-entry"]);
  } finally {
    for (const entry of readdirSync(tmpdir())) {
      if (entry.startsWith("mais-promotion-shadow-") && !beforeRoots.has(entry)) {
        await rm(path.join(tmpdir(), entry), { recursive: true, force: true });
      }
    }
  }
});

test("exclusive shadow writes reject creation collisions and rollback verification rejects leftovers", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-output-repo-"));
  const tempRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-output-"));
  try {
    await writeFile(path.join(tempRoot, "safe-card.json"), "occupied\n");
    assert.equal(typeof gateLib.writeExclusiveShadowOutput, "function");
    await assert.rejects(
      gateLib.writeExclusiveShadowOutput(
        repoRoot,
        tempRoot,
        { kind: "safe-card", path: "safe-card.json" },
        { schemaVersion: "promotion-shadow-dto.v1", kind: "safe-card", id: "card" }
      ),
      (error) => error?.code === "TARGET_COLLISION"
    );
    assert.equal(typeof gateLib.verifyRollbackAbsent, "function");
    await assert.rejects(
      gateLib.verifyRollbackAbsent(repoRoot, tempRoot, ["safe-card.json"]),
      (error) => error?.code === "ROLLBACK_INCOMPLETE"
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability proves a benign configured surface cannot select the candidate", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-reachability-pass-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    await writeLiveRegistry(repoRoot, manifest);
    assert.equal(typeof gateLib.scanLiveReachability, "function");
    const result = await gateLib.scanLiveReachability(repoRoot, manifest);
    assert.equal(result.policy, "selected-candidate-unreachable");
    assert.equal(result.result, "pass");
    assert.equal(result.selectedCandidateReachable, false);
    assert.deepEqual(result.matches, []);
    assert.deepEqual(result.unresolvedDynamicImports, []);
    assert.equal(CANONICAL_RUNTIME_ENTRYPOINTS.every((entrypoint) => result.scannedPaths.includes(entrypoint)), true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability fails on selected-candidate imports or identity leaks", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-reachability-leak-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(
      repoRoot,
      `import candidate from '@/${manifest.candidateArtifacts[1].path}';\nexport default candidate;\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CANDIDATE_REACHABLE" &&
        error.details.matches.some((match) => match.target === manifest.candidateArtifacts[1].path)
    );

    await writeRuntimeSource(repoRoot, `export const selected = "${manifest.parentPackage.id}";\n`);
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CANDIDATE_REACHABLE" && error.details.matches[0].marker === manifest.parentPackage.id
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability blocks a relevant unresolved dynamic import", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-reachability-dynamic-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(
      repoRoot,
      "const selectedCandidatePath = '../candidate/' + kind + '.json';\nexport const loadSelectedCandidate = () => import(\n  selectedCandidatePath\n);\n"
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "UNRESOLVED_DYNAMIC_IMPORT" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability blocks every nonliteral dynamic import reachable from a trusted runtime entrypoint", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-reachability-any-dynamic-"));
  try {
    const manifest = makeManifest();
    for (const source of [
      "const moduleName = './light-theme.mjs';\nexport const loadTheme = () => import(moduleName);\n",
      "const moduleName = './light-theme.cjs';\nexport const loadTheme = () => require(moduleName);\n"
    ]) {
      await writeRuntimeSource(repoRoot, source);
      await writeLiveRegistry(repoRoot, manifest);
      await assert.rejects(
        gateLib.scanLiveReachability(repoRoot, manifest),
        (error) => error?.code === "UNRESOLVED_DYNAMIC_IMPORT" && error?.outcome === "blocked"
      );
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("TypeScript AST module analysis excludes type-only and shadowed require syntax without hiding executable loads", () => {
  assert.equal(typeof gateLib.analyzeRuntimeModuleReferences, "function");
  const source = [
    "import type { TypeOnly } from './types';",
    "import { type NamedOnly, type AlsoNamedOnly } from './named-types';",
    "export type { ExportOnly } from './export-types';",
    "export { type NamedExportOnly } from './named-export-types';",
    "type Deferred = import('./import-type').Deferred;",
    "import type Legacy = require('./legacy-type');",
    "import { type MixedType, mixedValue } from './mixed-import';",
    "export { type MixedExportType, mixedExportValue } from './mixed-export';",
    "const view = <div>{/import\\(candidate\\)/u.test('safe') ? 'ok' : 'no'}</div>;",
    "function localLoader(require: (value: string) => unknown, name: string) { return require(name); }",
    "const runtime = require('./runtime.cjs');",
    "const lazy = import('./lazy.tsx');",
    "const unknown = import(runtimeName);"
  ].join("\n");
  const result = gateLib.analyzeRuntimeModuleReferences("components/example.tsx", source);
  assert.deepEqual(result.references, [
    { kind: "import", specifier: "./named-types", typeOnly: false },
    { kind: "export", specifier: "./named-export-types", typeOnly: false },
    { kind: "import", specifier: "./mixed-import", typeOnly: false },
    { kind: "export", specifier: "./mixed-export", typeOnly: false },
    { kind: "require", specifier: "./runtime.cjs", typeOnly: false },
    { kind: "dynamic-import", specifier: "./lazy.tsx", typeOnly: false }
  ]);
  assert.deepEqual(result.unresolvedCalls, [{ call: "import", position: source.indexOf("import(runtimeName)") }]);
});

test("bounded loader analysis inventories fs reads and next/dynamic while exposing zero-baseline loaders", () => {
  assert.equal(typeof gateLib.analyzeRuntimeLoaderCalls, "function");
  const source = [
    "import { readFile as readRuntimeFile, readFileSync } from 'node:fs';",
    "import dynamic from 'next/dynamic';",
    "import { glob } from 'glob';",
    "import { createRequire } from 'node:module';",
    "const bytes = await readRuntimeFile(metadataPath, 'utf8');",
    "const Card = dynamic(() => import('./Card.tsx'));",
    "const legacy = readFileSync(legacyPath);",
    "const matches = glob(pattern);",
    "const resolver = createRequire(import.meta.url);",
    "const resolved = require.resolve(moduleName);",
    "const modules = import.meta.glob('./modules/*.ts');",
    "const asset = new URL('./asset.svg', import.meta.url);",
    "function shadow(readRuntimeFile: (path: string) => unknown) { return readRuntimeFile(otherPath); }"
  ].join("\n");
  const result = gateLib.analyzeRuntimeLoaderCalls("lib/loader.ts", source);
  assert.equal(result.parserVersion, "5.8.3");
  assert.equal(result.fsReads.length, 1);
  assert.equal(result.fsReads[0].callee, "node:fs.readFile");
  assert.equal(result.fsReads[0].argumentShape, "identifier(metadataPath),literal(string)");
  assert.match(result.fsReads[0].normalizedExpressionDigest, /^[a-f0-9]{64}$/u);
  assert.deepEqual(result.nextDynamicCalls.map(({ literalImports, nonliteralImportCount }) => ({
    literalImports,
    nonliteralImportCount
  })), [{ literalImports: ["./Card.tsx"], nonliteralImportCount: 0 }]);
  assert.deepEqual(result.importMetaUrlReferences, ["./asset.svg"]);
  assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind).sort(), [
    "create-require", "glob", "import-meta-glob", "read-file-sync", "require-resolve"
  ]);
});

test("bounded loader analysis covers CommonJS and inline dynamic builtin forms without treating shadowed require as global", () => {
  const source = [
    "const fsNamespace = require('node:fs');",
    "const { readFile: readPromised } = require('node:fs/promises');",
    "const makeRequire = require('node:module').createRequire;",
    "const first = fsNamespace.readFileSync(firstPath);",
    "const second = await readPromised(secondPath);",
    "const third = (await import('node:fs')).readFileSync(thirdPath);",
    "const localRequire = makeRequire(import.meta.url);",
    "function shadow(require: (name: string) => unknown) {",
    "  const localFs = require('node:fs');",
    "  return localFs.readFileSync(hiddenPath);",
    "}"
  ].join("\n");
  const result = gateLib.analyzeRuntimeLoaderCalls("lib/commonjs-loader.ts", source);
  assert.deepEqual(result.fsReads.map(({ callee }) => callee), ["node:fs/promises.readFile"]);
  assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), [
    "read-file-sync", "read-file-sync", "create-require"
  ]);
});

test("bounded loader analysis rejects indirect evaluation, computed fs loaders, and webpack escape hatches", () => {
  const source = [
    "const code = 'void 0';",
    "(0, eval)(code);",
    "const operation = 'readFileSync';",
    "require('fs')[operation](candidatePath);",
    "__non_webpack_require__(candidatePath);",
    "globalThis['eval'](code);"
  ].join("\n");
  const result = gateLib.analyzeRuntimeLoaderCalls("lib/adversarial-loader.ts", source);
  assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind).sort(), [
    "element-access-loader",
    "indirect-code-evaluation",
    "indirect-code-evaluation",
    "webpack-require-escape"
  ]);
});

test("bounded loader analysis conservatively blocks Node and CommonJS capability aliases", () => {
  const probes = [
    "const r = require; r(candidatePath);",
    "(0, require)(candidatePath);",
    "require.call(null, candidatePath);",
    "Reflect.apply(require, null, [candidatePath]);",
    "process.mainModule.require(candidatePath);",
    "module.constructor._load(candidatePath);",
    "const e = eval; e(code);",
    "Reflect.apply(eval, null, [code]);",
    "new globalThis.Function(code)();",
    "require('node:vm').runInThisContext(code);",
    "createRequire(import.meta.url)(candidatePath);",
    "const r = createRequire(import.meta.url); r(candidatePath);",
    "module.createRequire(import.meta.url)(candidatePath);"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/capability-probe-${index}.ts`, source);
    assert.equal(result.zeroBaselineCalls.length > 0, true, source);
  }
});

test("bounded loader analysis classifies terminal CommonJS and process const aliases", () => {
  const probes = [
    [
      "type require = { resolve(value: string): string }; const resolver = require; resolver.resolve(moduleName);",
      "require-resolve"
    ],
    [
      "declare const require: { context(value: string): unknown }; const loader = require; loader.context(moduleName);",
      "require-context"
    ],
    [
      "type module = { require(value: string): unknown }; const commonjs = module; commonjs.require(moduleName);",
      "module-require"
    ],
    [
      "declare const process: { getBuiltinModule(value: string): unknown }; const runtime = process; runtime.getBuiltinModule(moduleName);",
      "process-get-builtin-module"
    ]
  ];
  for (const [index, [source, expectedKind]] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/terminal-capability-alias-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), [expectedKind], source);
  }
});

test("bounded loader analysis blocks child processes, workers, and VM module evaluation", () => {
  const probes = [
    "import { execFileSync } from 'node:child_process'; execFileSync('/bin/cat', [candidatePath]);",
    "require('node:child_process').spawnSync(process.execPath, [candidatePath]);",
    "new Worker(candidatePath);",
    "new SharedWorker(candidatePath);",
    "new (require('node:worker_threads').Worker)(candidatePath);",
    "new (require('node:vm').SourceTextModule)(code);"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/execution-capability-${index}.ts`, source);
    assert.equal(result.zeroBaselineCalls.length > 0, true, source);
  }
});

test("bounded loader analysis blocks executed constructor acquisitions without flagging passive metadata reads", () => {
  const probes = [
    "const constructorKey='constructor'; const {[constructorKey]: HiddenFunction}=(()=>{}); HiddenFunction('return process')();",
    "const constructorKey='constructor'; const {[constructorKey]: AsyncFunction}=Object.getPrototypeOf(async function(){}); AsyncFunction('return process')();",
    "function carrier(){} const constructorKey='constructor'; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "async function carrier(){} const constructorKey='constructor'; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "class Carrier{} const constructorKey='constructor'; const HiddenFunction=Carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const HiddenFunction=(0,()=>{})[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const HiddenFunction=(ready?()=>{}:()=>{})[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const carrier=ready?()=>{}:()=>{}; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; for(const carrier of [()=>{}]){const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();}",
    "const constructorKey='con'+'structor'; const HiddenFunction=path.join[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey=ready?'constructor':'name'; const HiddenFunction=path.join[constructorKey]; HiddenFunction('return process')();",
    "const constructors=[(()=>{}).constructor]; constructors[0]('return process')();",
    "const carriers={HiddenFunction:(()=>{}).constructor}; carriers.HiddenFunction('return process')();",
    "const carriers={HiddenFunction:(()=>{}).constructor}; const {HiddenFunction}=carriers; HiddenFunction('return process')();",
    "const constructors=[(()=>{}).constructor]; const [HiddenFunction]=constructors; HiddenFunction('return process')();",
    "for(const HiddenFunction of [(()=>{}).constructor]){HiddenFunction('return process')();}",
    "const constructorKey='constructor'; const descriptor=Object.getOwnPropertyDescriptor(()=>{},constructorKey); descriptor.value('return process')();",
    "const constructorKey='constructor'; const descriptors=Object.getOwnPropertyDescriptors(()=>{}); descriptors[constructorKey].value('return process')();",
    "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction.call(null,'return process')();",
    "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction.apply(null,['return process'])();",
    "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; const BoundFunction=HiddenFunction.bind(null); BoundFunction('return process')();",
    "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction`return process`();",
    "const constructorKey='constructor'; const carrier=ready&&(()=>{}); const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const carrier=ready||(()=>{}); const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const carrier=[()=>{}][0]; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const carrier={value:()=>{}}.value; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const {value:carrier}={value:()=>{}}; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const {value:HiddenFunction}=Object.getOwnPropertyDescriptor(()=>{},constructorKey); HiddenFunction('return process')();",
    "const keys=['constructor']; const constructorKey=keys[0]; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction('return process')();",
    "const keys={danger:'constructor'}; const constructorKey=keys.danger; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const {[constructorKey]:{value:HiddenFunction}}=Object.getOwnPropertyDescriptors(()=>{}); HiddenFunction('return process')();",
    "const constructorKey='constructor'; const {value:{nested:HiddenFunction}}={value:{nested:(()=>{})[constructorKey]}}; HiddenFunction('return process')();",
    "const constructorKey='constructor'; const box={nested:{HiddenFunction:(()=>{})[constructorKey]}}; box.nested.HiddenFunction('return process')();",
    "const constructorKey='constructor'; const box=[[(()=>{})[constructorKey]]]; box[0][0]('return process')();",
    "const constructorKey='constructor'; Reflect.get(()=>{},constructorKey)('return process')();",
    "const constructorKey='constructor'; const {value:HiddenFunction}=Reflect.getOwnPropertyDescriptor(()=>{},constructorKey); HiddenFunction('return process')();"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/function-constructor-acquisition-${index}.ts`, source);
    assert.deepEqual(
      [...new Set(result.zeroBaselineCalls.map(({ kind }) => kind))],
      ["function-constructor"],
      source
    );
  }

  const passiveResult = gateLib.analyzeRuntimeLoaderCalls(
    "lib/passive-constructor-metadata.ts",
    "const name = material.constructor.name; export { name };"
  );
  assert.deepEqual(passiveResult.zeroBaselineCalls, []);

  const ordinaryContainerResult = gateLib.analyzeRuntimeLoaderCalls(
    "lib/ordinary-function-container.ts",
    "function local(value:string){return value;} const box={nested:{local}}; const {nested:{local:alias}}=box; box.nested.local(code); alias(code);"
  );
  assert.deepEqual(ordinaryContainerResult.zeroBaselineCalls, []);
});

test("bounded loader analysis normalizes browser Worker and SharedWorker constructor equivalents", () => {
  const probes = [
    "new globalThis.Worker(candidatePath);",
    "new window.Worker(candidatePath);",
    "new self.Worker(candidatePath);",
    "const W = Worker; new W(candidatePath);",
    "Reflect.construct(Worker, [candidatePath]);",
    "new (0, Worker)(candidatePath);",
    "new globalThis.SharedWorker(candidatePath);",
    "new window.SharedWorker(candidatePath);",
    "new self.SharedWorker(candidatePath);",
    "const SW = SharedWorker; new SW(candidatePath);",
    "Reflect.construct(SharedWorker, [candidatePath]);",
    "new (0, SharedWorker)(candidatePath);",
    "new (globalThis.Worker as any)(candidatePath);",
    "new Worker!(candidatePath);",
    "new globalThis['Worker'](candidatePath);",
    "Reflect['construct'](Worker, [candidatePath]);",
    "const { Worker: W } = globalThis; new W(candidatePath);",
    "new (globalThis.SharedWorker as any)(candidatePath);",
    "new SharedWorker!(candidatePath);",
    "new globalThis['SharedWorker'](candidatePath);",
    "Reflect['construct'](SharedWorker, [candidatePath]);",
    "const { SharedWorker: SW } = globalThis; new SW(candidatePath);",
    "function start() { const W = Worker; new W(candidatePath); } start();",
    "{ const SW = SharedWorker; new SW(candidatePath); }",
    "function start() { const root = globalThis; new root.Worker(candidatePath); } start();",
    "function start() { const root = self; new root.SharedWorker(candidatePath); } start();",
    "for (const W = Worker; ready;) { new W(candidatePath); break; }",
    "for (const root = globalThis; ready;) { new root.Worker(candidatePath); break; }",
    "for (const W of [globalThis.Worker]) { new W(candidatePath); break; }",
    "for (const root of [globalThis]) { new root.Worker(candidatePath); break; }",
    "switch (mode) { case 'start': const W = globalThis.Worker; new W(candidatePath); break; }",
    "globalThis.Reflect.construct(Worker, [candidatePath]);",
    "window.Reflect.construct(SharedWorker, [candidatePath]);",
    "self.Reflect.construct(Worker, [candidatePath]);",
    "globalThis?.Reflect?.construct(SharedWorker, [candidatePath]);",
    "globalThis['Reflect']['construct'](Worker, [candidatePath]);",
    "const constructWorker = Reflect.construct; constructWorker(Worker, [candidatePath]);",
    "const { ['Worker']: W } = globalThis; new W(candidatePath);",
    "new (globalThis?.Worker)(candidatePath);",
    "new (self?.['SharedWorker'])(candidatePath);",
    "async function start() { new (await Worker)(candidatePath); } start();",
    "async function start() { const W = await Worker; new W(candidatePath); } start();",
    "async function start() { const root = await globalThis; new root.Worker(candidatePath); } start();",
    "async function start() { const constructWorker = await Reflect.construct; constructWorker(Worker, [candidatePath]); } start();",
    "async function start() { Reflect.construct(await Worker, [candidatePath]); } start();",
    "new (Worker ?? Worker)(candidatePath);",
    "const W = Worker || Worker; new W(candidatePath);",
    "new (Worker && Worker)(candidatePath);",
    "const W = Worker && Worker; new W(candidatePath);",
    "new (flag ? Worker : Worker)(candidatePath);",
    "Reflect.construct(flag ? Worker : Worker, [candidatePath]);",
    "const root = globalThis ?? globalThis; new root.Worker(candidatePath);"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/browser-worker-probe-${index}.ts`, source);
    assert.deepEqual(
      result.zeroBaselineCalls.map(({ kind }) => kind),
      ["worker-loader"],
      source
    );
  }
});

test("bounded loader analysis does not treat lexically shadowed Worker globals as browser loaders", () => {
  const source = [
    "type Constructor = new (url: string) => unknown;",
    "function localOnly(",
    "  Worker: Constructor,",
    "  SharedWorker: Constructor,",
    "  globalThis: { Worker: Constructor; SharedWorker: Constructor },",
    "  window: { Worker: Constructor; SharedWorker: Constructor },",
    "  self: { Worker: Constructor; SharedWorker: Constructor },",
    "  Reflect: { construct: (target: Constructor, args: unknown[]) => unknown }",
    ") {",
    "  const W = Worker;",
    "  const SW = SharedWorker;",
    "  const { Worker: MemberW, SharedWorker: MemberSW } = globalThis;",
    "  new Worker(candidatePath);",
    "  new SharedWorker(candidatePath);",
    "  new W(candidatePath);",
    "  new SW(candidatePath);",
    "  new globalThis.Worker(candidatePath);",
    "  new globalThis.SharedWorker(candidatePath);",
    "  new window.Worker(candidatePath);",
    "  new window.SharedWorker(candidatePath);",
    "  new self.Worker(candidatePath);",
    "  new self.SharedWorker(candidatePath);",
    "  new MemberW(candidatePath);",
    "  new MemberSW(candidatePath);",
    "  Reflect.construct(Worker, [candidatePath]);",
    "  Reflect.construct(SharedWorker, [candidatePath]);",
    "}"
  ].join("\n");
  const result = gateLib.analyzeRuntimeLoaderCalls("lib/local-worker-constructors.ts", source);
  assert.deepEqual(result.zeroBaselineCalls, []);

  const sourceLocalClasses = [
    "class Worker { constructor(_url: string) {} }",
    "class SharedWorker { constructor(_url: string) {} }",
    "new Worker(candidatePath);",
    "new SharedWorker(candidatePath);"
  ].join("\n");
  const localClassResult = gateLib.analyzeRuntimeLoaderCalls(
    "lib/local-worker-classes.ts",
    sourceLocalClasses
  );
  assert.deepEqual(localClassResult.zeroBaselineCalls, []);

  const shadowedAliasSources = [
    [
      "type Constructor = new (url: string) => unknown;",
      "const W = Worker;",
      "function localOnly(W: Constructor) { new W(candidatePath); }"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "const root = globalThis;",
      "function localOnly(root: { Worker: Constructor }) { new root.Worker(candidatePath); }"
    ].join("\n"),
    [
      "const globalThis = { Worker: class LocalWorker {} };",
      "new globalThis.Worker(candidatePath);"
    ].join("\n"),
    [
      "import Worker from './local-worker';",
      "import { SharedWorker } from './local-shared-worker';",
      "new Worker(candidatePath);",
      "new SharedWorker(candidatePath);"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "function localOnly(globalThis: Record<string, Constructor>) {",
      "  const { [workerConstructor]: W } = globalThis;",
      "  new W(candidatePath);",
      "}"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "function localOnly(Worker: Constructor, globalThis: { Worker: Constructor }) {",
      "  for (const W = Worker; ready;) { new W(candidatePath); break; }",
      "  for (const root = globalThis; ready;) { new root.Worker(candidatePath); break; }",
      "}"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "function localOnly(",
      "  Reflect: Record<string, (target: Constructor, args: unknown[]) => unknown>,",
      "  Worker: Constructor",
      ") { Reflect[method](Worker, [candidatePath]); }"
    ].join("\n")
  ];
  for (const [index, shadowedSource] of shadowedAliasSources.entries()) {
    const shadowedResult = gateLib.analyzeRuntimeLoaderCalls(
      `lib/local-worker-shadow-${index}.ts`,
      shadowedSource
    );
    assert.deepEqual(shadowedResult.zeroBaselineCalls, [], shadowedSource);
  }

  const emittedValueShadows = [
    "const Worker = class LocalWorker {}; new Worker(candidatePath);",
    "function SharedWorker(_url: string) {} new SharedWorker(candidatePath);",
    "const Local = class Worker { static start() { return new Worker(candidatePath); } }; Local.start();",
    [
      "namespace Reflect { export function construct() { return null; } }",
      "const Worker = class LocalWorker {};",
      "Reflect.construct(Worker, [candidatePath]);"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "function localOnly(Worker: Constructor, globalThis: { Worker: Constructor }) {",
      "  for (const W of [Worker]) { new W(candidatePath); break; }",
      "  for (const root of [globalThis]) { new root.Worker(candidatePath); break; }",
      "  switch (mode) { case 'start': const W = globalThis.Worker; new W(candidatePath); break; }",
      "}"
    ].join("\n"),
    [
      "const Worker = class LocalWorker {};",
      "const SharedWorker = class LocalSharedWorker {};",
      "new (Worker ?? Worker)(candidatePath);",
      "new (SharedWorker && SharedWorker)(candidatePath);",
      "new (flag ? Worker : SharedWorker)(candidatePath);"
    ].join("\n"),
    [
      "type Constructor = new (url: string) => unknown;",
      "async function localOnly(",
      "  Worker: Constructor,",
      "  globalThis: { Worker: Constructor },",
      "  Reflect: { construct: (target: Constructor, args: unknown[]) => unknown }",
      ") {",
      "  new (await Worker)(candidatePath);",
      "  const W = await Worker; new W(candidatePath);",
      "  const root = await globalThis; new root.Worker(candidatePath);",
      "  const constructWorker = await Reflect.construct; constructWorker(Worker, [candidatePath]);",
      "}"
    ].join("\n")
  ];
  for (const [index, shadowedSource] of emittedValueShadows.entries()) {
    const shadowedResult = gateLib.analyzeRuntimeLoaderCalls(
      `lib/emitted-worker-shadow-${index}.ts`,
      shadowedSource
    );
    assert.deepEqual(shadowedResult.zeroBaselineCalls, [], shadowedSource);
  }
});

test("bounded loader analysis does not confuse type-only or ambient declarations with runtime Worker shadows", () => {
  const probes = [
    "type Worker = new (url: string) => unknown; new Worker(candidatePath);",
    "interface Worker { new (url: string): unknown } new Worker(candidatePath);",
    "type SharedWorker = new (url: string) => unknown; new SharedWorker(candidatePath);",
    "interface SharedWorker { new (url: string): unknown } new SharedWorker(candidatePath);",
    "interface Reflect { construct: unknown } Reflect.construct(Worker, [candidatePath]);",
    "import type Worker from './worker-types'; new Worker(candidatePath);",
    "import { type Worker } from './worker-types'; new Worker(candidatePath);",
    "import type { SharedWorker } from './worker-types'; new SharedWorker(candidatePath);",
    "declare const Worker: new (url: string) => unknown; new Worker(candidatePath);",
    "declare const SharedWorker: new (url: string) => unknown; new SharedWorker(candidatePath);",
    "declare function Worker(url: string): unknown; new Worker(candidatePath);",
    "declare class Worker { constructor(url: string) } new Worker(candidatePath);",
    "declare class SharedWorker { constructor(url: string) } new SharedWorker(candidatePath);",
    "declare enum Worker { Local } new Worker(candidatePath);",
    "declare namespace Worker { const Local: true } new Worker(candidatePath);",
    "declare namespace SharedWorker { const Local: true } new SharedWorker(candidatePath);",
    "type globalThis = { Worker: new (url: string) => unknown }; new globalThis.Worker(candidatePath);",
    "declare const Reflect: { construct: Function }; Reflect.construct(Worker, [candidatePath]);",
    "declare namespace Reflect { function construct(target: unknown, args: unknown[]): unknown } Reflect.construct(Worker, [candidatePath]);"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/type-only-worker-probe-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), ["worker-loader"], source);
  }
});

test("bounded loader analysis ignores erased declarations when resolving global runtime capabilities", () => {
  const loaderProbes = [
    ["type Function = (body: string) => unknown; Function(code);", "function-constructor"],
    ["interface Function { (body: string): unknown } Function(code);", "function-constructor"],
    ["declare const Function: (body: string) => unknown; Function(code);", "function-constructor"],
    ["type Function = (body: string) => unknown; const F = Function; F(code);", "function-constructor"],
    ["declare const Function: (body: string) => unknown; const F = Function; F(code);", "function-constructor"],
    ["function run() { type Function = FunctionConstructor; new Function(code); }", "function-constructor"],
    ["function run() { declare const Function: FunctionConstructor; new Function(code); }", "function-constructor"],
    ["type eval = (body: string) => unknown; eval(code);", "indirect-code-evaluation"],
    ["declare const eval: (body: string) => unknown; eval(code);", "indirect-code-evaluation"],
    ["type eval = (body: string) => unknown; const E = eval; E(code);", "indirect-code-evaluation"],
    ["declare const eval: (body: string) => unknown; const E = eval; E(code);", "indirect-code-evaluation"],
    ["type require = { resolve(value: string): string }; require.resolve(moduleName);", "require-resolve"],
    ["declare const module: { require(value: string): unknown }; module.require(moduleName);", "module-require"],
    ["type module = { require(value: string): unknown }; module.require(moduleName);", "module-require"],
    ["declare const process: { getBuiltinModule(value: string): unknown }; process.getBuiltinModule(moduleName);", "process-get-builtin-module"],
    ["type process = { getBuiltinModule(value: string): unknown }; process.getBuiltinModule(moduleName);", "process-get-builtin-module"],
    ["type createRequire = (url: string) => (value: string) => unknown; createRequire(import.meta.url)(moduleName);", "indirect-require"],
    ["declare const createRequire: (url: string) => (value: string) => unknown; createRequire(import.meta.url)(moduleName);", "indirect-require"],
    ["declare const Reflect: { apply: Function }; Reflect.apply(eval, null, [code]);", "indirect-code-evaluation"],
    ["type Reflect = { apply: Function }; Reflect.apply(Function, null, [code]);", "function-constructor"],
    ["self.Function(code);", "function-constructor"],
    ["self.eval(code);", "indirect-code-evaluation"],
    ["global.eval(code);", "indirect-code-evaluation"],
    ["global.Function(code);", "function-constructor"],
    ["new global.Function(code);", "function-constructor"],
    ["Reflect.apply(globalThis.eval, null, [code]);", "indirect-code-evaluation"],
    ["globalThis.Reflect.apply(window.Function, null, [code]);", "function-constructor"],
    ["self.Reflect.apply(self.eval, null, [code]);", "indirect-code-evaluation"],
    ["Reflect.construct(Function, [code]);", "function-constructor"],
    ["globalThis.Reflect.construct(globalThis.Function, [code]);", "function-constructor"],
    ["window.Reflect.construct(window.Function, [code]);", "function-constructor"],
    ["self.Reflect.construct(self.Function, [code]);", "function-constructor"],
    ["const a = self; const b = a; b.eval(code);", "indirect-code-evaluation"],
    ["const a = self; const b = a; b.Function(code);", "function-constructor"]
  ];
  for (const [index, [source, expectedKind]] of loaderProbes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/global-capability-probe-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), [expectedKind], source);
  }

  for (const [index, source] of [
    "type require = (value: string) => unknown; require(moduleName);",
    "declare const require: (value: string) => unknown; require(moduleName);"
  ].entries()) {
    const result = gateLib.analyzeRuntimeModuleReferences(`lib/erased-require-${index}.ts`, source);
    assert.deepEqual(result.unresolvedCalls.map(({ call }) => call), ["require"], source);
  }
});

test("bounded loader analysis preserves emitted local shadows for global runtime capabilities", () => {
  const safeSources = [
    [
      "function localOnly(",
      "  Function: (body: string) => unknown,",
      "  eval: (body: string) => unknown,",
      "  require: (value: string) => unknown,",
      "  module: { require(value: string): unknown },",
      "  process: { getBuiltinModule(value: string): unknown },",
      "  createRequire: (url: string) => (value: string) => unknown,",
      "  Reflect: { apply(target: unknown, receiver: unknown, args: unknown[]): unknown; construct(target: unknown, args: unknown[]): unknown },",
      "  globalThis: { Function: (body: string) => unknown; eval(body: string): unknown },",
      "  window: { Function: (body: string) => unknown; eval(body: string): unknown },",
      "  self: { Function: (body: string) => unknown; eval(body: string): unknown },",
      "  global: { Function: (body: string) => unknown; eval(body: string): unknown }",
      ") {",
      "  Function(code); eval(code); require(moduleName); module.require(moduleName);",
      "  process.getBuiltinModule(moduleName); createRequire(import.meta.url)(moduleName);",
      "  Reflect.apply(eval, null, [code]); Reflect.construct(Function, [code]);",
      "  globalThis.Function(code); window.eval(code); self.Function(code); global.eval(code);",
      "}"
    ].join("\n"),
    "const Local = function Function(body: string) { return Function(body); }; Local(code);",
    "const Local = class Function { static make(body: string) { return new Function(body); } }; Local.make(code);",
    "const Local = function eval(body: string) { return eval(body); }; Local(code);",
    "const Local = class eval { static run(body: string) { return eval(body); } }; Local.run(code);"
  ];
  for (const [index, source] of safeSources.entries()) {
    const loaderResult = gateLib.analyzeRuntimeLoaderCalls(`lib/local-global-capability-${index}.ts`, source);
    const moduleResult = gateLib.analyzeRuntimeModuleReferences(`lib/local-global-capability-${index}.ts`, source);
    assert.deepEqual(loaderResult.zeroBaselineCalls, [], source);
    assert.deepEqual(moduleResult.unresolvedCalls, [], source);
  }
});

test("bounded loader analysis covers Node global aliases and recursive recognized global-root chains", () => {
  const exactWorkerSources = [
    "new global.Worker(candidatePath);",
    "new global.SharedWorker(candidatePath);",
    "global.Reflect.construct(global.Worker, [candidatePath]);",
    "new globalThis.window.Worker(candidatePath);",
    "new window.self.SharedWorker(candidatePath);",
    "global.globalThis.Reflect.construct(global.self.Worker, [candidatePath]);",
    "const root = global; new root.Worker(candidatePath);",
    "const a = global; const reflect = a.Reflect; const construct = reflect.construct; construct(a.SharedWorker, [candidatePath]);",
    "const a = globalThis; const b = a; const { Worker: W } = b; new W(candidatePath);"
  ];
  for (const [index, source] of exactWorkerSources.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/global-worker-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), ["worker-loader"], source);
  }

  for (const [index, source] of [
    "new global[operation](candidatePath);",
    "new globalThis.window[operation](candidatePath);",
    "const a = global; const b = a; new b[operation](candidatePath);"
  ].entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/global-dynamic-worker-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), ["element-access-loader"], source);
  }

  for (const [index, source] of [
    "function localOnly(global: { Worker: new (url: string) => unknown }) { new global.Worker(candidatePath); }",
    "function localOnly(globalThis: { window: { Worker: new (url: string) => unknown } }) { new globalThis.window.Worker(candidatePath); }",
    "function localOnly(global: { Worker: new (url: string) => unknown; eval(body: string): unknown; Function(body: string): unknown }) { new global.Worker(candidatePath); global.eval(code); global.Function(code); }",
    "const global = { Worker: class LocalWorker {}, eval() {}, Function() {} }; new global.Worker(candidatePath); global.eval(code); global.Function(code);",
    "function localOnly(self: { Worker: new (url: string) => unknown; eval(body: string): unknown }) { const a = self; const b = a; new b.Worker(candidatePath); b.eval(code); }"
  ].entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/local-global-worker-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls, [], source);
  }
});

test("bounded loader analysis resolves only bounded for-of literal capability collections", () => {
  const exactSources = [
    "for (const W of [Worker, Worker]) { new W(candidatePath); }",
    "for (const SW of [SharedWorker, SharedWorker]) { new SW(candidatePath); }",
    "for (const W of ([Worker] as const)) { new W(candidatePath); }",
    "for (const W of (flag ? [Worker] : [Worker])) { new W(candidatePath); }"
  ];
  for (const [index, source] of exactSources.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/bounded-for-of-exact-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), ["worker-loader"], source);
  }

  const mixedSources = [
    "const LocalWorker = class {}; for (const W of [Worker, LocalWorker]) { new W(candidatePath); }",
    "for (const W of (flag ? [Worker] : [SharedWorker])) { new W(candidatePath); }"
  ];
  for (const [index, source] of mixedSources.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/bounded-for-of-mixed-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls.map(({ kind }) => kind), ["element-access-loader"], source);
  }

  const excludedOrLocalSources = [
    "const LocalWorker = class {}; for (const W of [LocalWorker, LocalWorker]) { new W(candidatePath); }",
    "function localOnly(Worker: new (url: string) => unknown) { for (const W of [Worker, Worker]) { new W(candidatePath); } }",
    "for (const W of workerConstructors) { new W(candidatePath); }"
  ];
  for (const [index, source] of excludedOrLocalSources.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/bounded-for-of-excluded-${index}.ts`, source);
    assert.deepEqual(result.zeroBaselineCalls, [], source);
  }
});

test("bounded loader analysis fails closed on dynamic constructor members of a recognized browser root", () => {
  const probes = [
    "new globalThis[workerConstructor](candidatePath);",
    "const root = globalThis; new root[workerConstructor](candidatePath);",
    "new self[workerConstructor](candidatePath);",
    "Reflect.construct(self[workerConstructor], [candidatePath]);",
    "const { [workerConstructor]: W } = globalThis; new W(candidatePath);",
    "Reflect[method](Worker, [candidatePath]);",
    "globalThis.Reflect[method](Worker, [candidatePath]);",
    "const LocalWorker = class {}; new (flag ? Worker : LocalWorker)(candidatePath);",
    "const LocalWorker = class {}; new (Worker ?? LocalWorker)(candidatePath);",
    "const LocalWorker = class {}; Reflect.construct(flag ? Worker : LocalWorker, [candidatePath]);",
    "const localRoot = { Worker: class {} }; const root = flag ? globalThis : localRoot; new root.Worker(candidatePath);"
  ];
  for (const [index, source] of probes.entries()) {
    const result = gateLib.analyzeRuntimeLoaderCalls(`lib/dynamic-worker-probe-${index}.ts`, source);
    assert.deepEqual(
      result.zeroBaselineCalls.map(({ kind }) => kind),
      ["element-access-loader"],
      source
    );
  }
});

test("reachable indirect loader escape hatches fail closed without a literal candidate identity marker", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-indirect-loader-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(
      repoRoot,
      "import { loadOpaque } from '@/lib/opaque-loader';\nexport { loadOpaque };\n"
    );
    const loaderPath = path.join(repoRoot, "lib/opaque-loader.ts");
    await writeFile(loaderPath, "export function loadOpaque() { return 'safe'; }\n");
    await writeLiveRegistry(repoRoot, manifest);
    await writeFile(loaderPath, [
      "const prefix = 'data/generated-content/';",
      "const suffix = 'candidate.json';",
      "const candidatePath = prefix + suffix;",
      "const operation = 'readFileSync';",
      "export function loadOpaque() { return require('fs')[operation](candidatePath); }"
    ].join("\n"));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "UNREGISTERED_RUNTIME_LOADER" && error?.outcome === "blocked"
    );

    await writeFile(loaderPath, [
      "const W = globalThis.Worker;",
      "export function loadOpaque() { return new W(candidatePath); }"
    ].join("\n"));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "UNREGISTERED_RUNTIME_LOADER" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("reachable loader callsites are registry-bound and zero-baseline capabilities fail closed", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-loader-policy-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(
      repoRoot,
      "import { loadRuntimeMetadata } from '@/lib/runtime-storage-loader';\nexport { loadRuntimeMetadata };\n"
    );
    const loaderPath = path.join(repoRoot, "lib/runtime-storage-loader.ts");
    await writeFile(loaderPath, "export async function loadRuntimeMetadata() { return 'none'; }\n");
    await writeLiveRegistry(repoRoot, manifest);

    await writeFile(
      loaderPath,
      "import { readFile } from 'node:fs/promises';\nexport async function loadRuntimeMetadata() { return readFile(metadataPath, 'utf8'); }\n"
    );
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_LOADER_POLICY_MISMATCH" && error?.outcome === "blocked"
    );

    await writeFile(
      loaderPath,
      "import { readFileSync } from 'node:fs';\nexport function loadRuntimeMetadata() { return readFileSync(metadataPath, 'utf8'); }\n"
    );
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "UNREGISTERED_RUNTIME_LOADER" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("an explicit-extension import resolves only the exact path even if an extension-appended decoy exists", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-explicit-extension-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "import value from '@/lib/exact.ts';\nexport default value;\n");
    await writeFile(path.join(repoRoot, "lib/exact.ts"), "export default 1;\n");
    await writeFile(path.join(repoRoot, "lib/exact.ts.ts"), "export default 2;\n");
    await writeLiveRegistry(repoRoot, manifest);
    const result = await gateLib.scanLiveReachability(repoRoot, manifest);
    assert.equal(result.result, "pass");
    assert.equal(result.runtimeGraphPaths.includes("lib/exact.ts"), true);
    assert.equal(result.runtimeGraphPaths.includes("lib/exact.ts.ts"), false);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability excludes isolated test/audit syntax but blocks it when the runtime graph reaches it", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-reachability-classification-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    const falsePositiveFixtures = {
      "components/visualizations/signature/audit-formula.mjs":
        "const source = `data:text/javascript,export default 1`;\nexport const audit = source;\n",
      "components/visualizations/signature/audit-quadraticequation.mjs":
        "export async function audit(url) { return import(url); }\n",
      "components/visualizations/signature/audit-teennumbers.mjs":
        "export const pattern = /\\bimport\\(candidateName\\)/u;\n",
      "lib/server/questionStore.test.ts":
        "// import(candidatePath) is documentation, not executable code.\nexport const testOnly = true;\n"
    };
    for (const [filePath, source] of Object.entries(falsePositiveFixtures)) {
      await mkdir(path.dirname(path.join(repoRoot, filePath)), { recursive: true });
      await writeFile(path.join(repoRoot, filePath), source);
    }
    await writeLiveRegistry(repoRoot, manifest);
    const benign = await gateLib.scanLiveReachability(repoRoot, manifest);
    assert.equal(benign.result, "pass");
    assert.equal(benign.excludedNonRuntimeMatches.length, 0);

    await writeRuntimeSource(
      repoRoot,
      "import { testOnly } from '@/lib/server/questionStore.test';\nexport default testOnly;\n"
    );
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CLASSIFICATION_CONFLICT" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("runtime classification blocks malformed UTF-8 instead of silently replacing source bytes", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-runtime-utf8-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    await writeLiveRegistry(repoRoot, manifest);
    await writeFile(path.join(repoRoot, "lib/malformed.ts"), Buffer.from([0x65, 0x78, 0x70, 0x6f, 0x72, 0x74, 0x20, 0xc3, 0x28]));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_SOURCE_UTF8_INVALID" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live reachability blocks ambiguous extensionless internal imports", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-ambiguous-import-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    await writeLiveRegistry(repoRoot, manifest);
    await writeRuntimeSource(repoRoot, "import value from '@/lib/ambiguous';\nexport default value;\n");
    await writeFile(path.join(repoRoot, "lib/ambiguous.ts"), "export default 1;\n");
    await writeFile(path.join(repoRoot, "lib/ambiguous.tsx"), "export default 2;\n");
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "AMBIGUOUS_INTERNAL_IMPORT" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("derived Next entrypoints, middleware, and public files cannot leak selected candidate identity", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-framework-entrypoints-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    const candidatePath = manifest.candidateArtifacts[0].path;

    await mkdir(path.join(repoRoot, "app/new-promotion-route"), { recursive: true });
    await writeFile(
      path.join(repoRoot, "app/new-promotion-route/page.tsx"),
      `import selected from '@/${candidatePath}';\nexport default function Page() { return selected.id; }\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CANDIDATE_REACHABLE"
    );

    await writeFile(path.join(repoRoot, "app/new-promotion-route/page.tsx"), "export default function Page() { return null; }\n");
    await writeFile(
      path.join(repoRoot, "middleware.ts"),
      `export const candidateId = "${manifest.candidateArtifacts[0].id}";\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CANDIDATE_REACHABLE"
    );

    await writeFile(path.join(repoRoot, "middleware.ts"), "export function middleware() { return undefined; }\n");
    await writeFile(path.join(repoRoot, "public/promotion-fixture.svg"), manifest.parentPackage.id);
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CANDIDATE_REACHABLE"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("live registry freezes trusted semantics while allowing newly classified unreachable files", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-live-registry-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");

    await writeLiveRegistry(repoRoot, manifest, { entrypoints: [] });
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_REGISTRY_MISMATCH"
    );

    await writeLiveRegistry(repoRoot, manifest, {
      checkIds: ["static-candidate-import", "identity-marker", "unknown-anchor"]
    });
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_REGISTRY_MISMATCH"
    );

    await writeLiveRegistry(repoRoot, manifest);
    await writeFile(path.join(repoRoot, "public/new-unreachable-note.md"), "known non-runtime classification\n");
    assert.equal((await gateLib.scanLiveReachability(repoRoot, manifest)).result, "pass");

    await writeFile(path.join(repoRoot, "public/unregistered-runtime-byte.bin"), "hidden\n");
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "LIVE_CLASSIFICATION_UNKNOWN" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("resolver config and alternate Next entrypoint drift cannot escape the canonical runtime graph", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-framework-boundary-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./*"] } }
    }, null, 2));
    await writeFile(path.join(repoRoot, "tsconfig.next.json"), JSON.stringify({ extends: "./tsconfig.json" }, null, 2));
    await writeFile(path.join(repoRoot, "next.config.ts"), "const nextConfig = {};\nexport default nextConfig;\n");
    await writeLiveRegistry(repoRoot, manifest);

    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./*"], "~/*": ["./data/*"] } }
    }, null, 2));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );

    await writeFile(path.join(repoRoot, "evil-tsconfig.json"), JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./hidden/*"] } }
    }, null, 2));
    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      extends: "./evil-tsconfig.json",
      compilerOptions: { paths: { "@/*": ["./*"] } }
    }, null, 2));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );

    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./*"] } }
    }, null, 2));
    await writeFile(path.join(repoRoot, "tsconfig.next.json"), JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: { baseUrl: "./hidden" }
    }, null, 2));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );
    await writeFile(path.join(repoRoot, "tsconfig.next.json"), JSON.stringify({ extends: "./tsconfig.json" }, null, 2));
    await writeFile(
      path.join(repoRoot, "next.config.ts"),
      "const nextConfig = { pageExtensions: ['mais.tsx'] };\nexport default nextConfig;\n"
    );
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );

    for (const unsafeConfig of [
      "const key = 'pageExtensions';\nconst nextConfig = { [key]: ['mais.tsx'] };\nexport default nextConfig;\n",
      "import extra from './next-extra';\nconst nextConfig = { ...extra };\nexport default nextConfig;\n",
      "const nextConfig = { webpack(config) { return config; } };\nexport default nextConfig;\n"
    ]) {
      await writeFile(path.join(repoRoot, "next.config.ts"), unsafeConfig);
      await assert.rejects(
        gateLib.scanLiveReachability(repoRoot, manifest),
        (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
      );
    }

    await writeFile(path.join(repoRoot, "next.config.ts"), "const nextConfig = {};\nexport default nextConfig;\n");
    await writeFile(path.join(repoRoot, "next.config.mjs"), "export default {};\n");
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );
    await rm(path.join(repoRoot, "next.config.mjs"));
    await symlink("middleware.ts", path.join(repoRoot, "instrumentation.ts"));
    await assert.rejects(
      gateLib.scanLiveReachability(repoRoot, manifest),
      (error) => error?.code === "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT" && error?.outcome === "blocked"
    );
    await rm(path.join(repoRoot, "instrumentation.ts"));
    for (const alternatePath of [
      "pages/api/hidden.ts",
      "src/app/hidden/page.tsx",
      "instrumentation.ts"
    ]) {
      await mkdir(path.dirname(path.join(repoRoot, alternatePath)), { recursive: true });
      await writeFile(path.join(repoRoot, alternatePath), "export const hidden = true;\n");
      await assert.rejects(
        gateLib.scanLiveReachability(repoRoot, manifest),
        (error) => error?.code === "FRAMEWORK_ENTRYPOINT_SURFACE_DRIFT" && error?.outcome === "blocked",
        alternatePath
      );
      await rm(path.join(repoRoot, alternatePath));
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("resolver observer itself rejects inherited aliases and unmodelled Next config indirection", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-resolver-observer-"));
  try {
    const manifest = makeManifest();
    await writeRuntimeSource(repoRoot, "export const livePackage = 'incumbent-v1';\n");
    await writeFile(path.join(repoRoot, "evil-tsconfig.json"), JSON.stringify({
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./hidden/*"] } }
    }, null, 2));
    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      extends: "./evil-tsconfig.json",
      compilerOptions: { paths: { "@/*": ["./*"] } }
    }, null, 2));
    await assert.rejects(
      writeLiveRegistry(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );

    await writeFile(path.join(repoRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: { paths: { "@/*": ["./*"] } }
    }, null, 2));
    await writeFile(path.join(repoRoot, "tsconfig.next.json"), JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: { customConditions: ["hidden-runtime"] }
    }, null, 2));
    await assert.rejects(
      writeLiveRegistry(repoRoot, manifest),
      (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
    );
    await writeFile(path.join(repoRoot, "tsconfig.next.json"), JSON.stringify({ extends: "./tsconfig.json" }, null, 2));

    for (const unsafeConfig of [
      "const key = 'pageExtensions';\nconst nextConfig = { [key]: ['mais.tsx'] };\nexport default nextConfig;\n",
      "import extra from './next-extra';\nconst nextConfig = { ...extra };\nexport default nextConfig;\n",
      "const nextConfig = { turbopack: { resolveAlias: { '@': './hidden' } } };\nexport default nextConfig;\n"
    ]) {
      await writeFile(path.join(repoRoot, "next.config.ts"), unsafeConfig);
      await assert.rejects(
        writeLiveRegistry(repoRoot, manifest),
        (error) => error?.code === "RUNTIME_RESOLVER_CONFIG_DRIFT" && error?.outcome === "blocked"
      );
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("real b6 runtime roots match the frozen TypeScript graph and bounded-loader golden", {
  timeout: 180_000
}, async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const observation = await gateLib.observeCanonicalRuntimePolicy(repoRoot, makeManifest());
  assert.equal(observation.actualFiles.length, 3666);
  assert.equal(gateLib.fingerprint(observation.actualFiles), "8dd3b926fefcb3880a42c5c1049ab259befcd4158de1c40a2f50f6587720b822");
  assert.deepEqual(
    Object.fromEntries(observation.classifications.map(({ kind, count }) => [kind, count])),
    {
      "test-code": 444,
      "audit-script": 192,
      "generated-code": 4,
      "data-json": 38,
      asset: 1519,
      documentation: 4,
      placeholder: 3,
      "runtime-metadata": 1,
      "runtime-code": 1461
    }
  );
  assert.equal(observation.frameworkEntrypoints.length, 290);
  assert.equal(observation.graphPolicy.seedCount, 305);
  assert.equal(observation.graphPolicy.reachablePathCount, 1419);
  assert.equal(observation.graphPolicy.reachablePathsDigest, "eeac14c127dd3b2624ec9578fc3894d161a661356ca4059ceb16e1e17d013785");
  assert.equal(
    observation.graphPolicy.edgeCount,
    3366,
    gateLib.stableJson({
      edgeKinds: Object.fromEntries(
        [...new Set(observation.graph.edges.map(({ kind }) => kind))]
          .sort()
          .map((kind) => [kind, observation.graph.edges.filter((edge) => edge.kind === kind).length])
      ),
      topologyCount: observation.graph.topologyEdges.length,
      edgeDigest: observation.graphPolicy.edgeDigest
    })
  );
  assert.equal(observation.graphPolicy.edgeDigest, "7cfbc25ed7e616d27cb168ae7fc2651adf6b9a07df7e9f7f7d637dec1e5d6e9f");
  assert.equal(observation.graphPolicy.topologyEdgeCount, 3366);
  assert.equal(observation.graphPolicy.topologyEdgeDigest, "7e5056f1142e073d89d1e33028c334ddfcf3e0ef74fcbc9864ae72839e68c1dc");
  assert.equal(observation.loaderPolicy.fsReadAllowlist.length, 5);
  assert.equal(observation.loaderPolicy.nextDynamic.callCount, 479);
  assert.equal(observation.loaderPolicy.nextDynamic.literalImportCount, 941);
  assert.equal(observation.loaderPolicy.nextDynamic.nonliteralImportCount, 0);
  assert.equal(observation.loaderPolicy.zeroBaselineCallCount, 0);
});

test("real b6 legacy discovery freezes the 36-package mother set and the unique conflict union", {
  timeout: 90_000
}, async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const audit = await gateLib.auditCanonicalLegacyConflictUnion(repoRoot, makeManifest());
  assert.equal(audit.schemaVersion, "promotion-legacy-conflict-union-audit.v1");
  assert.equal(audit.candidateLikeCount, 36);
  assert.equal(
    audit.candidateSetDigest,
    "9eeebab3aa232077d2eeaed259ff0038dac701b1afd31475f7684e033f2323a7"
  );
  assert.equal(audit.directConflictCount, 12);
  assert.equal(audit.correlatedConflictCount, 4);
  assert.equal(audit.ambiguousConflictCount, 1);
  assert.equal(audit.knownConflictCount, 1);
  assert.equal(audit.newConflictCount, 15);
  assert.equal(audit.opaqueConflictCount, 1);
  assert.equal(audit.reachableCandidateLikeCount, 17);
  assert.deepEqual(audit.secondaryBlockedCondition, {
    code: "LEGACY_DISCOVERY_INCOMPLETE",
    conflictCount: 1,
    conflictDigest: audit.opaqueConflictDigest
  });
  for (const digest of [
    audit.directConflictDigest,
    audit.correlatedConflictDigest,
    audit.ambiguousConflictDigest,
    audit.reachableConflictDigest,
    audit.newConflictDigest,
    audit.opaqueConflictDigest,
    audit.auditDigest
  ]) assert.match(digest, /^[a-f0-9]{64}$/u);
});

test("legacy ratchet permits only the exact known pre-expiry conflict", () => {
  const ratchet = makeLegacyRatchet();
  assert.equal(typeof gateLib.validateLegacyRatchet, "function");
  assert.deepEqual(
    gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: [gateLib.projectLegacyObservedEntry(makeLegacyEntry())]
    }),
    {
      result: "pass",
      introducedAt: ratchet.introducedAt,
      expiresAt: ratchet.expiresAt,
      knownConflicts: 1,
      observedConflicts: 1,
      removedConflicts: 0
    }
  );
  assert.throws(
    () => gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: []
    }),
    (error) => error?.code === "LEGACY_OBSERVATION_CARDINALITY_INVALID"
  );
});

test("legacy ratchet fails closed when expired, extended beyond 30 days, changed, new, or grown", () => {
  const ratchet = makeLegacyRatchet();
  assert.throws(
    () => gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-09-24T00:00:00.000Z",
      observedEntries: ratchet.entries.map(gateLib.projectLegacyObservedEntry)
    }),
    (error) => error?.code === "LEGACY_RATCHET_EXPIRED"
  );
  assert.throws(
    () => gateLib.validateLegacyRatchet(
      makeLegacyRatchet({ expiresAt: "2026-09-24T00:00:00.001Z" }),
      { now: "2026-08-25T00:00:00.000Z", observedEntries: ratchet.entries.map(gateLib.projectLegacyObservedEntry) }
    ),
    (error) => error?.code === "LEGACY_WINDOW_INVALID"
  );
  assert.throws(
    () => gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: [gateLib.projectLegacyObservedEntry(makeLegacyEntry({ semanticDigest: "9".repeat(64) }))]
    }),
    (error) => error?.code === "LEGACY_CONFLICT_CHANGED"
  );
  assert.throws(
    () => gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: [gateLib.projectLegacyObservedEntry(makeLegacyEntry({ packageId: "new-legacy-package" }))]
    }),
    (error) => error?.code === "LEGACY_NEW_CONFLICT"
  );
  assert.throws(
    () => gateLib.validateLegacyRatchet(ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: [
        gateLib.projectLegacyObservedEntry(ratchet.entries[0]),
        gateLib.projectLegacyObservedEntry(makeLegacyEntry({ packageId: "growth-package" }))
      ]
    }),
    (error) => error?.code === "LEGACY_OBSERVATION_CARDINALITY_INVALID"
  );
});

test("legacy ratchet requires exact authorization owners, dual review roles, and terminal choices", () => {
  for (const mutate of [
    (entry) => { entry.authorization.reference = "pending"; },
    (entry) => { entry.authorization.conflictOwners = ["A04", "A18", "A23", "A25"]; },
    (entry) => { entry.authorization.reviewOwners = ["A23"]; },
    (entry) => { entry.authorization.downstreamEvidenceOwners = ["A11"]; },
    (entry) => { entry.terminalChoices = ["recertify", "remove-live", "ignore"]; },
    (entry) => { entry.authorization.reviewReferences.a25ReleaseIntakeReview.path = "pending"; }
  ]) {
    const entry = makeLegacyEntry();
    mutate(entry);
    assert.throws(
      () => gateLib.validateLegacyRatchet(makeLegacyRatchet({ entries: [entry] }), {
        now: "2026-08-25T00:00:00.000Z",
        observedEntries: [gateLib.projectLegacyObservedEntry(entry)]
      }),
      (error) => error?.code === "LEGACY_ENTRY_INVALID"
    );
  }
});

test("registered legacy observer detects live byte or anchor drift and dual reviews bind any rebaseline", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-observer-"));
  try {
    const manifest = makeManifest();
    const fixture = await writeLegacyFixture(repoRoot, manifest);
    await writeLiveRegistry(repoRoot, manifest);
    assert.equal(typeof gateLib.observeLegacyRatchetEntries, "function");
    assert.equal(typeof gateLib.validateLegacyAuthorizationReviews, "function");
    const observed = await gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet);
    assert.deepEqual(observed, fixture.ratchet.entries.map(gateLib.projectLegacyObservedEntry));
    assert.doesNotThrow(() => gateLib.validateLegacyRatchet(fixture.ratchet, {
      now: "2026-08-25T00:00:00.000Z",
      observedEntries: observed
    }));
    await assert.doesNotReject(
      gateLib.validateLegacyAuthorizationReviews(repoRoot, manifest, fixture.ratchet.entries)
    );

    const changedPackage = structuredClone(fixture.legacyPackage);
    changedPackage.questions[0].answer = "13 cups";
    await writeFile(
      path.join(repoRoot, fixture.packagePath),
      `${JSON.stringify(changedPackage, null, 2)}\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    const changedObserved = await gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet);
    assert.notEqual(changedObserved[0].packageDigest, fixture.entry.packageDigest);
    assert.notEqual(changedObserved[0].contentDigest, fixture.entry.contentDigest);
    assert.throws(
      () => gateLib.validateLegacyRatchet(fixture.ratchet, {
        now: "2026-08-25T00:00:00.000Z",
        observedEntries: changedObserved
      }),
      (error) => error?.code === "LEGACY_CONFLICT_CHANGED"
    );

    const editedBaseline = makeLegacyRatchet({
      entries: [{ ...structuredClone(fixture.entry), ...structuredClone(changedObserved[0]) }]
    });
    assert.throws(
      () => gateLib.validateLegacyRatchet(editedBaseline, {
        now: "2026-08-25T00:00:00.000Z",
        observedEntries: changedObserved
      }),
      (error) => error?.code === "LEGACY_INITIAL_BASELINE_MISMATCH"
    );
    await assert.rejects(
      gateLib.validateLegacyAuthorizationReviews(repoRoot, manifest, editedBaseline.entries),
      (error) => error?.code === "LEGACY_REVIEW_BINDING_MISMATCH"
    );

    const anchorContract = fixture.entry.observation.reachabilityAnchors[0].anchors[1];
    const originalAnchorSource = await readFile(path.join(repoRoot, fixture.anchorPath), "utf8");
    const anchorSource = originalAnchorSource.replace(
      anchorContract.endMarker,
      `,\n  silentlyAddedLiveSelection: true\n${anchorContract.endMarker}`
    );
    await writeFile(path.join(repoRoot, fixture.anchorPath), anchorSource);
    await writeLiveRegistry(repoRoot, manifest);
    const anchorObserved = await gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet);
    assert.notEqual(anchorObserved[0].reachabilityDigest, fixture.entry.reachabilityDigest);
    assert.throws(
      () => gateLib.validateLegacyRatchet(fixture.ratchet, {
        now: "2026-08-25T00:00:00.000Z",
        observedEntries: anchorObserved
      }),
      (error) => error?.code === "LEGACY_OBSERVATION_INVALID"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("real legacy discovery reports an unratcheted reachable candidate package", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-new-conflict-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const currentRegistry = JSON.parse(
      await readFile(path.join(repoRoot, manifest.legacyDiscovery.registry.path), "utf8")
    );
    const newPackagePath = "data/generated-content/unratcheted-live-candidate-v1/question-pack.json";
    const newPackage = {
      packageId: "unratcheted-live-candidate-v1",
      packageStatus: "candidate-only",
      integrationStatus: "candidate-only-not-live",
      questions: []
    };
    await mkdir(path.dirname(path.join(repoRoot, newPackagePath)), { recursive: true });
    await writeFile(path.join(repoRoot, newPackagePath), `${JSON.stringify(newPackage, null, 2)}\n`);
    const runtimePath = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    const runtimeSource = await readFile(path.join(repoRoot, runtimePath), "utf8");
    await writeFile(
      path.join(repoRoot, runtimePath),
      `${runtimeSource}\nimport unratcheted from "@/${newPackagePath}";\nvoid unratcheted;\n`
    );
    await writeLegacyDiscoveryRegistry(repoRoot, manifest, currentRegistry.observerContracts);
    await sealSyntheticRuntimeBaseline(
      repoRoot,
      manifest,
      manifestPath,
      "add an unratcheted live candidate package"
    );

    await assert.rejects(
      gateLib.validateShadowPilot(repoRoot, {
        manifestPath,
        producedAt: "2026-08-25T01:00:00.000Z"
      }),
      (error) => error?.code === "LEGACY_NEW_CONFLICT"
    );
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "legacy-new-conflict-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "fail");
    assert.equal(receipt.exitReason.code, "LEGACY_NEW_CONFLICT");
    assert.equal(receipt.exitReason.checkId, "legacy-ratchet");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy discovery observes reachable JSON outside its roots while benign discovery growth passes", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-independent-discovery-"));
  try {
    const manifest = makeManifest();
    const fixture = await writeLegacyFixture(repoRoot, manifest);
    await writeLiveRegistry(repoRoot, manifest);

    const benignPath = "coordination/content-qa/unrelated-metadata.json";
    await writeFile(path.join(repoRoot, benignPath), `${JSON.stringify({ schemaVersion: "unrelated.v1" })}\n`);
    const benignObserved = await gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet);
    assert.deepEqual(benignObserved, fixture.ratchet.entries.map(gateLib.projectLegacyObservedEntry));

    const newPackagePath = "data/other/unratcheted-live-candidate-v1.json";
    await mkdir(path.dirname(path.join(repoRoot, newPackagePath)), { recursive: true });
    await writeFile(path.join(repoRoot, newPackagePath), `${JSON.stringify({
      packageId: "unratcheted-live-candidate-outside-discovery-roots",
      packageStatus: "candidate-only",
      questions: [{
        id: "unratcheted-row-1",
        integrationStatus: "candidate-only-not-live",
        approval: { status: "candidate-only-two-round-qa-pass" }
      }]
    })}\n`);
    const entrypoint = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    await writeFile(
      path.join(repoRoot, entrypoint),
      `import candidate from "@/${newPackagePath}";\nvoid candidate;\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
      (error) => error?.code === "LEGACY_NEW_CONFLICT" && error?.outcome === "fail"
    );

    await writeFile(path.join(repoRoot, newPackagePath), "{not-json\n");
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
      (error) => error?.code === "LEGACY_DISCOVERY_INCOMPLETE" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy discovery rejects reachable lesson candidate packages as unratcheted conflicts", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-lesson-conflict-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const lessonPackagePath = "data/generated-content/new-live-lesson-candidate-v1/lessons.json";
    await mkdir(path.dirname(path.join(repoRoot, lessonPackagePath)), { recursive: true });
    await writeFile(path.join(repoRoot, lessonPackagePath), `${JSON.stringify({
      packageId: "new-live-lesson-candidate-v1",
      packageStatus: "approved-for-review",
      integrationStatus: "candidate-only",
      lessons: [{ id: "new-live-lesson-1", integrationStatus: "candidate-only" }]
    }, null, 2)}\n`);
    const entrypoint = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    const entrypointSource = await readFile(path.join(repoRoot, entrypoint), "utf8");
    await writeFile(
      path.join(repoRoot, entrypoint),
      `${entrypointSource}\nimport lessonCandidate from "@/${lessonPackagePath}";\nvoid lessonCandidate;\n`
    );
    await sealSyntheticRuntimeBaseline(
      repoRoot,
      manifest,
      manifestPath,
      "add reachable lesson candidate conflict"
    );

    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "legacy-lesson-conflict-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "fail");
    assert.equal(receipt.exitReason.code, "LEGACY_NEW_CONFLICT");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy discovery recognizes the frozen review and non-integrated status lexicon", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-status-lexicon-"));
  try {
    const manifest = makeManifest();
    const fixture = await writeLegacyFixture(repoRoot, manifest);
    const packagePath = "data/generated-content/status-lexicon-review/package.json";
    const entrypoint = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    await writeFile(
      path.join(repoRoot, entrypoint),
      `import reviewPackage from "@/${packagePath}";\nvoid reviewPackage;\n`
    );
    for (const candidate of [
      {
        packageId: "ca-middle-school-textbook-review",
        packageStatus: "generated-review-package",
        integrationStatus: "not-integrated-into-live-lessons",
        lessons: []
      },
      {
        packageId: "ar-middle-school-lesson-review",
        packageStatus: "generated-review-package",
        integrationStatus: "not-integrated",
        lessons: []
      },
      {
        packageId: "fl-middle-school-topic-review",
        packageStatus: "generated-review-package",
        integrationStatus: "candidate-live-beta",
        topics: []
      }
    ]) {
      await mkdir(path.dirname(path.join(repoRoot, packagePath)), { recursive: true });
      await writeFile(path.join(repoRoot, packagePath), `${JSON.stringify(candidate, null, 2)}\n`);
      await writeLiveRegistry(repoRoot, manifest);
      await assert.rejects(
        gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
        (error) => error?.code === "LEGACY_NEW_CONFLICT" && error?.outcome === "fail",
        candidate.packageId
      );
    }
    await writeFile(path.join(repoRoot, packagePath), `${JSON.stringify({
      questions: [{
        id: "opaque-pending-row",
        mathQaStatus: "remediated-pending-final-audit",
        terminologyQaStatus: "pending-manual"
      }]
    }, null, 2)}\n`);
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
      (error) => error?.code === "LEGACY_NEW_CONFLICT" && error?.outcome === "fail"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy discovery correlates an unreachable pending candidate to an approved live copy by exact ids", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-copy-correlation-"));
  try {
    const manifest = makeManifest();
    const fixture = await writeLegacyFixture(repoRoot, manifest);
    const candidatePath = "coordination/content-qa/copied-bank-v1/question-pack.json";
    const livePath = "data/generated-content/copied-bank-v1/question-pack.approved.json";
    const ids = ["copied-q-001", "copied-q-002", "copied-q-003"];
    await mkdir(path.dirname(path.join(repoRoot, candidatePath)), { recursive: true });
    await mkdir(path.dirname(path.join(repoRoot, livePath)), { recursive: true });
    await writeFile(path.join(repoRoot, candidatePath), `${JSON.stringify({
      questions: ids.map((id) => ({ id, mathQaStatus: "pending-manual" }))
    }, null, 2)}\n`);
    await writeFile(path.join(repoRoot, livePath), `${JSON.stringify({
      questions: ids.map((id) => ({ id, mathQaStatus: "pass", approval: { status: "approved-live" } }))
    }, null, 2)}\n`);
    const entrypoint = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    await writeFile(
      path.join(repoRoot, entrypoint),
      `import approved from "@/${livePath}";\nvoid approved;\n`
    );
    await writeLiveRegistry(repoRoot, manifest);
    await assert.rejects(
      gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
      (error) =>
        error?.code === "LEGACY_NEW_CONFLICT" &&
        error?.outcome === "fail" &&
        error?.details?.newConflictCount === 1
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy discovery blocks directly served candidate-like JSON with an unknown container", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-public-unknown-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const unknownPath = "public/new-live-candidate-package.json";
    await writeFile(path.join(repoRoot, unknownPath), `${JSON.stringify({
      packageId: "new-live-candidate-unknown-shape",
      status: "candidate-only",
      payload: { id: "opaque-live-row" }
    }, null, 2)}\n`);
    await sealSyntheticRuntimeBaseline(
      repoRoot,
      manifest,
      manifestPath,
      "add public candidate with unknown shape"
    );

    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "legacy-public-unknown-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "blocked");
    assert.equal(receipt.exitReason.code, "LEGACY_DISCOVERY_INCOMPLETE");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("legacy observer pins the authoritative live copy, 492 unique rows, grades, and status contract", async () => {
  assert.deepEqual(gateLib.LEGACY_INITIAL_BASELINE_FACTS, {
    packageId: LEGACY_PACKAGE_ID,
    packagePath: LEGACY_PACKAGE_PATH,
    questionCount: 492,
    uniqueIdCount: 492,
    gradeDistribution: LEGACY_GRADE_DISTRIBUTION,
    packageDigest: "c8b2ee5c2f35782dc4ca8209eca71e98edf47663dd1bdefd20963d06c163c0ab",
    semanticDigest: "9e0b871a675cd025b026a481901a0faf2bdbc9d23a5a51c5717b4d8940ee5037",
    contentDigest: "c1cfda42ea57f54b7273f871532f653f64fad1e97ad710898194c7c8decfaae4",
    idSetDigest: "a3cec371c5faade53872c83d60de835500de66c10dd218ee718354dddce66262",
    gradeDistributionDigest: "de63a7843c99884c94eec47f90e9dcaef916d412ac855492326af9ffbe1265a3",
    rootStatusDigest: "3df5d313acfdaff67551216069f3b15b6c567c2c5071f170a5fed18e8673a059",
    rowStatusDigest: "427036a1b92ea8f51e9d0bf74fbfbacef04c37a8f238347dc5723961d527acc8",
    reachabilityDigest: "f5b1337ac176a961a37c4b11b1360402a30337d5265368173995a4ac0891f9c9",
    observationDigest: "f084deef3a95732a80b20bd756de75df312f9070284acfaded908f3c63e00968",
    introducedAt: "2026-08-25T00:00:00Z",
    expiresAt: "2026-09-24T00:00:00Z",
    authorizationReference: "user-request-2026-08-25-promotion-shadow-v1",
    accountableOwner: "A23",
    conflictOwners: ["A04", "A18", "A23"],
    reviewOwners: ["A23", "A25"],
    downstreamEvidenceOwners: ["A11", "A22"],
    reviewReferences: {
      a23PromotionReview: {
        path: "coordination/integration/evidence/legacy-us-ca-k5-a23-ratchet-review.v1.json",
        rawSha256: "414a3672b3770a4bbd993d756f2fb183390041bb8f620b8b5e7c715ece588b4f"
      },
      a25ReleaseIntakeReview: {
        path: "coordination/integration/evidence/legacy-us-ca-k5-a25-ratchet-review.v1.json",
        rawSha256: "e08590e2100c5a8136eeb942860db0bb130da9357e16de4b59b07ab17b7b076b"
      }
    },
    terminalChoices: ["recertify", "remove-live"],
    remediation: "Remove the legacy live selection before ratchet expiry."
  });
  assert.equal(gateLib.fingerprint(gateLib.LEGACY_INITIAL_ANCHOR_FACTS.map((source) => ({
    path: source.path,
    anchors: source.anchors.map(({ id, sha256 }) => ({ id, sha256 }))
  }))), "f5b1337ac176a961a37c4b11b1360402a30337d5265368173995a4ac0891f9c9");
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-legacy-shape-"));
  try {
    const manifest = makeManifest();
    const fixture = await writeLegacyFixture(repoRoot, manifest);
    await writeLiveRegistry(repoRoot, manifest);
    const mutations = [
      (value) => { value.questions.pop(); value.counts.totalQuestions = 491; },
      (value) => { value.questions[0].grade = "P6"; },
      (value) => { value.packageStatus = "live"; },
      (value) => { value.questions[0].approval.status = "approved-live"; }
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(fixture.legacyPackage);
      mutate(changed);
      await writeFile(path.join(repoRoot, fixture.packagePath), `${JSON.stringify(changed, null, 2)}\n`);
      await writeLiveRegistry(repoRoot, manifest);
      await assert.rejects(
        gateLib.observeLegacyRatchetEntries(repoRoot, manifest, fixture.ratchet),
        (error) => error?.code === "LEGACY_PACKAGE_INVALID"
      );
    }

    const coordinationCopy = structuredClone(fixture.ratchet);
    coordinationCopy.entries[0].observation.packagePath =
      "coordination/content-qa/us-ca-k5-knowledge-point-practice-v1/question-pack.json";
    await assert.rejects(
      gateLib.observeLegacyRatchetEntries(repoRoot, manifest, coordinationCopy),
      (error) => error?.code === "LEGACY_ENTRY_INVALID"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("fixed Git probe reports only HEAD, cleanliness, status digest, and count without shell execution", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-git-proof-"));
  try {
    await writeSyntheticPromotionRepo(repoRoot);
    assert.equal(typeof gateLib.collectGitWorktreeState, "function");
    const state = await gateLib.collectGitWorktreeState(repoRoot);
    assert.deepEqual(Object.keys(state), ["headCommit", "clean", "statusSha256", "statusEntryCount"]);
    assert.match(state.headCommit, /^[a-f0-9]{40}$/u);
    assert.equal(state.clean, true);
    assert.equal(state.statusSha256, gateLib.sha256(Buffer.alloc(0)));
    assert.equal(state.statusEntryCount, 0);

    const source = await readFile(new URL("./promotion-gate-lib.mjs", import.meta.url), "utf8");
    assert.match(source, /const REGISTERED_GIT_EXECUTABLE = "\/usr\/bin\/git";/u);
    assert.match(source, /execFile\(REGISTERED_GIT_EXECUTABLE, \[/u);
    assert.match(source, /PATH: REGISTERED_GIT_PATH/u);
    assert.match(source, /\["rev-parse", "--show-toplevel"\]/u);
    assert.match(source, /\["rev-parse", "HEAD"\]/u);
    assert.match(source, /\["status", "--porcelain=v1", "-z", "--untracked-files=all"\]/u);
    assert.match(source, /\["ls-files", "-z"\]/u);
    assert.doesNotMatch(source, /shell:\s*true/u);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("tracked-input proof handles a committed authoritative blob larger than 16 MiB without per-file Git show", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-large-tracked-input-"));
  try {
    await execFileAsync("git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    const largePath = "large-authoritative-input.bin";
    await writeFile(path.join(repoRoot, largePath), Buffer.alloc(17 * 1024 * 1024, 0x61));
    await execFileAsync("git", ["-C", repoRoot, "add", "--", largePath], { shell: false, maxBuffer: 64 * 1024 });
    await execFileAsync("git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "commit large authoritative input"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const proof = await gateLib.collectTrackedInputProof(repoRoot, [largePath]);
    assert.equal(proof.trackedInputCount, 1);
    assert.match(proof.trackedInputAggregateDigest, /^[a-f0-9]{64}$/u);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("authoritative reads accept the real-root size class but block files above the frozen 32 MiB bound", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-authoritative-size-"));
  try {
    const withinLimitPath = "within-limit.bin";
    const aboveLimitPath = "above-limit.bin";
    for (const [filePath, byteLength] of [
      [withinLimitPath, 17 * 1024 * 1024],
      [aboveLimitPath, 32 * 1024 * 1024 + 1]
    ]) {
      const handle = await open(path.join(repoRoot, filePath), "w");
      try {
        await handle.truncate(byteLength);
      } finally {
        await handle.close();
      }
    }
    const withinLimit = await gateLib.readAuthoritativeFile(repoRoot, withinLimitPath);
    assert.equal(withinLimit.bytes.length, 17 * 1024 * 1024);
    await assert.rejects(
      gateLib.readAuthoritativeFile(repoRoot, aboveLimitPath),
      (error) => error?.code === "AUTHORITATIVE_FILE_TOO_LARGE" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("tracked-input proof rejects ignored uncommitted inputs and bytes that differ from HEAD", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-tracked-input-"));
  try {
    await execFileAsync("git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    await writeFile(path.join(repoRoot, "tracked.txt"), "frozen\n");
    await execFileAsync("git", ["-C", repoRoot, "add", "--", "tracked.txt"], { shell: false, maxBuffer: 64 * 1024 });
    await execFileAsync("git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "tracked input fixture"
    ], { shell: false, maxBuffer: 64 * 1024 });

    assert.equal(typeof gateLib.collectTrackedInputProof, "function");
    const proof = await gateLib.collectTrackedInputProof(repoRoot, ["tracked.txt"]);
    assert.deepEqual(proof, {
      trackedInputCount: 1,
      trackedInputAggregateDigest: gateLib.fingerprint([
        { path: "tracked.txt", rawSha256: gateLib.sha256(Buffer.from("frozen\n")) }
      ])
    });

    await writeFile(path.join(repoRoot, ".git/info/exclude"), "ignored.txt\n");
    await writeFile(path.join(repoRoot, "ignored.txt"), "ignored but authoritative\n");
    assert.equal((await gateLib.collectGitWorktreeState(repoRoot)).clean, true);
    await assert.rejects(
      gateLib.collectTrackedInputProof(repoRoot, ["ignored.txt"]),
      (error) => error?.code === "TRACKED_INPUT_UNCOMMITTED" && error?.outcome === "blocked"
    );

    await writeFile(path.join(repoRoot, "tracked.txt"), "drifted\n");
    await assert.rejects(
      gateLib.collectTrackedInputProof(repoRoot, ["tracked.txt"]),
      (error) => error?.code === "TRACKED_INPUT_BLOB_MISMATCH" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("tracked-input proof rejects assume-unchanged and skip-worktree index flags", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-index-flags-"));
  try {
    await execFileAsync("/usr/bin/git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    const trackedPath = "authoritative.json";
    await writeFile(path.join(repoRoot, trackedPath), "{\"frozen\":true}\n");
    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "add", "--", trackedPath], { shell: false, maxBuffer: 64 * 1024 });
    await execFileAsync("/usr/bin/git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "commit authoritative input"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const cleanProof = await gateLib.collectTrackedInputProof(repoRoot, [trackedPath]);
    assert.equal(cleanProof.trackedInputCount, 1);

    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "update-index", "--assume-unchanged", "--", trackedPath]);
    await writeFile(path.join(repoRoot, trackedPath), "{\"frozen\":false}\n");
    assert.equal((await gateLib.collectGitWorktreeState(repoRoot)).clean, true);
    await assert.rejects(
      gateLib.collectTrackedInputProof(repoRoot, [trackedPath]),
      (error) => error?.code === "TRACKED_INPUT_INDEX_FLAG_UNSAFE" && error?.outcome === "blocked"
    );

    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "update-index", "--no-assume-unchanged", "--", trackedPath]);
    await writeFile(path.join(repoRoot, trackedPath), "{\"frozen\":true}\n");
    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "update-index", "--skip-worktree", "--", trackedPath]);
    await writeFile(path.join(repoRoot, trackedPath), "{\"frozen\":false}\n");
    await assert.rejects(
      gateLib.collectTrackedInputProof(repoRoot, [trackedPath]),
      (error) => error?.code === "TRACKED_INPUT_INDEX_FLAG_UNSAFE" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("registered Git probes ignore parent PATH, tracing, and repository fsmonitor hooks", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-git-env-"));
  const fakeBin = await mkdtemp(path.join(tmpdir(), "mais-promotion-fake-git-"));
  const markerRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-git-markers-"));
  const originalPath = process.env.PATH;
  const originalTrace = process.env.GIT_TRACE;
  try {
    await execFileAsync("/usr/bin/git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    await writeFile(path.join(repoRoot, "tracked.txt"), "frozen\n");
    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "add", "--", "tracked.txt"], { shell: false, maxBuffer: 64 * 1024 });
    await execFileAsync("/usr/bin/git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "commit Git probe fixture"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const fakeMarker = path.join(markerRoot, "fake-git-invoked");
    const traceMarker = path.join(markerRoot, "git-trace");
    const fsmonitorMarker = path.join(markerRoot, "fsmonitor-invoked");
    const fakeGitPath = path.join(fakeBin, "git");
    const fsmonitorPath = path.join(repoRoot, "fsmonitor-hook.sh");
    await writeFile(fakeGitPath, `#!/bin/sh\nprintf invoked > '${fakeMarker}'\nexit 99\n`);
    await chmod(fakeGitPath, 0o755);
    await writeFile(fsmonitorPath, `#!/bin/sh\nprintf invoked > '${fsmonitorMarker}'\nexit 0\n`);
    await chmod(fsmonitorPath, 0o755);
    await execFileAsync("/usr/bin/git", ["-C", repoRoot, "config", "core.fsmonitor", fsmonitorPath], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    process.env.PATH = `${fakeBin}:${originalPath ?? ""}`;
    process.env.GIT_TRACE = traceMarker;

    const state = await gateLib.collectGitWorktreeState(repoRoot);
    assert.equal(state.clean, false, "the untracked fsmonitor script remains visible without being executed");
    for (const markerPath of [fakeMarker, traceMarker, fsmonitorMarker]) {
      await assert.rejects(access(markerPath), (error) => error?.code === "ENOENT");
    }
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalTrace === undefined) delete process.env.GIT_TRACE;
    else process.env.GIT_TRACE = originalTrace;
    await rm(repoRoot, { recursive: true, force: true });
    await rm(fakeBin, { recursive: true, force: true });
    await rm(markerRoot, { recursive: true, force: true });
  }
});

test("external-side-effect proof binds the registered local-only operation and resolver environment policy", async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const originalTsconfigPath = process.env.NEXT_TSCONFIG_PATH;
  const originalDistDir = process.env.NEXT_DIST_DIR;
  try {
    delete process.env.NEXT_TSCONFIG_PATH;
    delete process.env.NEXT_DIST_DIR;
    assert.equal(typeof gateLib.collectExternalSideEffectProof, "function");
    const manifest = makeManifest();
    const bundleBindings = [];
    for (const bundlePath of CHECKER_BUNDLE_PATHS) {
      bundleBindings.push({
        path: bundlePath,
        rawSha256: gateLib.sha256(await readFile(path.join(repoRoot, bundlePath)))
      });
    }
    manifest.checkerRelease.bundleDigest = gateLib.fingerprint(bundleBindings);
    const proof = await gateLib.collectExternalSideEffectProof(repoRoot, manifest);
    assert.deepEqual(Object.keys(proof), [
      "schemaVersion",
      "result",
      "policy",
      "registeredOperations",
      "gitPolicy",
      "resolverEnvironment",
      "tempRootProof",
      "checkerCapabilityPolicy",
      "networkRequestCount",
      "providerCallCount",
      "databaseWriteCount",
      "deploymentCommandCount",
      "digest"
    ]);
    assert.deepEqual(proof.resolverEnvironment, {
      NEXT_TSCONFIG_PATH: "unset",
      NEXT_DIST_DIR: "unset"
    });
    assert.deepEqual(proof.tempRootProof, {
      rootSource: "node-os-tmpdir",
      outsideRepository: true,
      outsideForbiddenPaths: true
    });
    assert.equal(proof.checkerCapabilityPolicy.result, "pass");
    assert.equal(proof.checkerCapabilityPolicy.policy, "no-network-provider-database-deploy.v1");
    assert.equal(proof.checkerCapabilityPolicy.forbiddenCapabilityCount, 0);
    assert.equal(proof.checkerCapabilityPolicy.registeredExecFileImportCount, 1);
    assert.equal(proof.checkerCapabilityPolicy.registeredExecFileCallCount, 1);
    assert.equal(proof.networkRequestCount, 0);
    assert.equal(proof.providerCallCount, 0);
    assert.equal(proof.databaseWriteCount, 0);
    assert.equal(proof.deploymentCommandCount, 0);
    const payload = structuredClone(proof);
    delete payload.digest;
    assert.equal(proof.digest, gateLib.fingerprint(payload));

    process.env.NEXT_TSCONFIG_PATH = "tsconfig.evil.json";
    await assert.rejects(
      gateLib.collectExternalSideEffectProof(repoRoot, makeManifest()),
      (error) => error?.code === "EXECUTION_ENVIRONMENT_UNSAFE" && error?.outcome === "blocked"
    );
  } finally {
    if (originalTsconfigPath === undefined) delete process.env.NEXT_TSCONFIG_PATH;
    else process.env.NEXT_TSCONFIG_PATH = originalTsconfigPath;
    if (originalDistDir === undefined) delete process.env.NEXT_DIST_DIR;
    else process.env.NEXT_DIST_DIR = originalDistDir;
  }
});

test("checker capability audit blocks network, provider, database, deploy, and unregistered process execution", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-checker-capability-"));
  try {
    const sourceRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    for (const sourcePath of CHECKER_BUNDLE_PATHS) {
      await mkdir(path.dirname(path.join(repoRoot, sourcePath)), { recursive: true });
      await writeFile(path.join(repoRoot, sourcePath), await readFile(path.join(sourceRepoRoot, sourcePath)));
    }
    const computeFixtureBundleDigest = async () => {
      const bindings = [];
      for (const bundlePath of CHECKER_BUNDLE_PATHS) {
        bindings.push({
          path: bundlePath,
          rawSha256: gateLib.sha256(await readFile(path.join(repoRoot, bundlePath)))
        });
      }
      return gateLib.fingerprint(bindings);
    };
    const digest = await computeFixtureBundleDigest();
    const proof = await gateLib.collectCheckerCapabilityProof(repoRoot, digest);
    assert.equal(proof.result, "pass");
    assert.equal(proof.checkerBundleDigest, digest);
    const cliPath = CHECKER_BUNDLE_PATHS[1];
    const libPath = CHECKER_BUNDLE_PATHS[0];
    const cleanCli = await readFile(path.join(repoRoot, cliPath), "utf8");
    const cleanLib = await readFile(path.join(repoRoot, libPath), "utf8");
    for (const injected of [
      "\nfetch('https://example.invalid');\n",
      "\nglobalThis.fetch('https://example.invalid');\n",
      "\nconst networkFetch = fetch; networkFetch('https://example.invalid');\n",
      "\nnew globalThis.WebSocket('wss://example.invalid');\n",
      "\nconst Socket = WebSocket; new Socket('wss://example.invalid');\n",
      "\nReflect.construct(WebSocket, ['wss://example.invalid']);\n",
      "\nrequire('node:child_process').execSync('/bin/false');\n",
      "\nconst childProcess = require('child_process'); childProcess.spawn('/bin/false');\n",
      "\nprocess.getBuiltinModule('node:http');\n",
      "\nconst getBuiltin = process.getBuiltinModule; getBuiltin('node:https');\n",
      "\nprocess[loaderName]('node:http');\n",
      "\nimport('node:http');\n",
      "\nimport OpenAI from 'openai'; void OpenAI;\n",
      "\nimport pg from 'pg'; void pg;\n",
      "\nimport deploy from 'vercel'; void deploy;\n",
      "\nimport { execFile } from 'node:child_process'; execFile('/bin/sh', []);\n"
    ]) {
      await writeFile(path.join(repoRoot, cliPath), `${cleanCli}${injected}`);
      await assert.rejects(
        gateLib.collectCheckerCapabilityProof(repoRoot, await computeFixtureBundleDigest()),
        (error) => error?.code === "CHECKER_CAPABILITY_POLICY_VIOLATION" && error?.outcome === "blocked"
      );
    }

    const retargetedLib = cleanLib.replace(
      'const REGISTERED_GIT_EXECUTABLE = "/usr/bin/git";',
      'const REGISTERED_GIT_EXECUTABLE = "/bin/sh";'
    );
    const optionalExecLib = cleanLib.replace(
      "    execFile(REGISTERED_GIT_EXECUTABLE, [",
      "    execFile?.(REGISTERED_GIT_EXECUTABLE, ["
    );
    const escapedGitArgvLib = cleanLib.replace(
      '      "-C", canonicalRoot,\n      ...argv',
      '      "-C", canonicalRoot,\n      "-c", "alias.pwn=!/bin/false", "pwn"'
    );
    const retargetedPathLib = cleanLib.replace(
      'const REGISTERED_GIT_PATH = "/usr/bin:/bin";',
      'const REGISTERED_GIT_PATH = "/tmp:/usr/bin:/bin";'
    );
    const shellEnabledLib = cleanLib.replace("      shell: false,", "      shell: true,");
    assert.notEqual(retargetedLib, cleanLib);
    assert.notEqual(optionalExecLib, cleanLib);
    assert.notEqual(escapedGitArgvLib, cleanLib);
    assert.notEqual(retargetedPathLib, cleanLib);
    assert.notEqual(shellEnabledLib, cleanLib);
    const adversarialMutations = [
      { path: cliPath, source: `${cleanCli}\nexport * from 'node:http';\n` },
      { path: cliPath, source: `${cleanCli}\nexport { request as hiddenRequest } from 'node:https';\n` },
      { path: cliPath, source: `${cleanCli}\nexport { default as HiddenProvider } from 'openai';\n` },
      { path: libPath, source: `${cleanLib}\nconst hiddenExec = execFile; hiddenExec('/bin/sh', []);\n` },
      { path: libPath, source: `${cleanLib}\n(0, execFile)('/bin/sh', []);\n` },
      { path: libPath, source: `${cleanLib}\nexecFile.call(null, '/bin/sh', []);\n` },
      { path: libPath, source: retargetedLib },
      { path: libPath, source: optionalExecLib },
      { path: libPath, source: escapedGitArgvLib },
      { path: libPath, source: retargetedPathLib },
      { path: libPath, source: shellEnabledLib },
      {
        path: cliPath,
        source: `${cleanCli}\nconst HiddenFunction = (() => {}).constructor; HiddenFunction('return process')();\n`
      },
      {
        path: cliPath,
        source: `${cleanCli}\nconst AsyncFunction = Object.getPrototypeOf(async function () {}).constructor; AsyncFunction('return fetch(\"https://example.invalid\")')();\n`
      },
      {
        path: cliPath,
        source: `${cleanCli}\nconst constructorKey = 'con' + 'structor'; const DynamicFunction = (() => {})[constructorKey]; DynamicFunction('return process')();\n`
      },
      {
        path: cliPath,
        source: `${cleanCli}\nconst asyncConstructorKey = 'constructor'; const DynamicAsyncFunction = Object.getPrototypeOf(async function () {})[asyncConstructorKey]; DynamicAsyncFunction('return fetch(\"https://example.invalid\")')();\n`
      },
      {
        path: cliPath,
        source: `${cleanCli}\nconst { constructor: DestructuredFunction } = (() => {}); DestructuredFunction('return process')();\n`
      },
      {
        path: cliPath,
        source: `${cleanCli}\nconst DescriptorFunction = Object.getOwnPropertyDescriptor(() => {}, 'constructor').value; DescriptorFunction('return process')();\n`
      },
      ...[
        "const constructorKey='constructor'; const {[constructorKey]: HiddenFunction}=(()=>{}); HiddenFunction('return process')();",
        "const constructorKey='constructor'; const {[constructorKey]: AsyncFunction}=Object.getPrototypeOf(async function(){}); AsyncFunction('return process')();",
        "function carrier(){} const constructorKey='constructor'; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
        "async function carrier(){} const constructorKey='constructor'; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
        "class Carrier{} const constructorKey='constructor'; const HiddenFunction=Carrier[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const HiddenFunction=(0,()=>{})[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const HiddenFunction=(ready?()=>{}:()=>{})[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const carrier=ready?()=>{}:()=>{}; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; for(const carrier of [()=>{}]){const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();}",
        "const constructorKey='con'+'structor'; const HiddenFunction=path.join[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey=ready?'constructor':'name'; const HiddenFunction=path.join[constructorKey]; HiddenFunction('return process')();",
        "const constructors=[(()=>{}).constructor]; constructors[0]('return process')();",
        "const carriers={HiddenFunction:(()=>{}).constructor}; carriers.HiddenFunction('return process')();",
        "const carriers={HiddenFunction:(()=>{}).constructor}; const {HiddenFunction}=carriers; HiddenFunction('return process')();",
        "const constructors=[(()=>{}).constructor]; const [HiddenFunction]=constructors; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const descriptors=Object.getOwnPropertyDescriptors(()=>{}); descriptors[constructorKey].value('return process')();",
        "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction.call(null,'return process')();",
        "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; const BoundFunction=HiddenFunction.bind(null); BoundFunction('return process')();",
        "const constructorKey='con'+'structor'; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction`return process`();",
        "const constructorKey='constructor'; const carrier=[()=>{}][0]; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const carrier={value:()=>{}}.value; const HiddenFunction=carrier[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const {value:HiddenFunction}=Object.getOwnPropertyDescriptor(()=>{},constructorKey); HiddenFunction('return process')();",
        "const keys=['constructor']; const constructorKey=keys[0]; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction('return process')();",
        "const keys={danger:'constructor'}; const constructorKey=keys.danger; const HiddenFunction=(()=>{})[constructorKey]; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const {[constructorKey]:{value:HiddenFunction}}=Object.getOwnPropertyDescriptors(()=>{}); HiddenFunction('return process')();",
        "const constructorKey='constructor'; const {value:{nested:HiddenFunction}}={value:{nested:(()=>{})[constructorKey]}}; HiddenFunction('return process')();",
        "const constructorKey='constructor'; const box={nested:{HiddenFunction:(()=>{})[constructorKey]}}; box.nested.HiddenFunction('return process')();",
        "const constructorKey='constructor'; const box=[[(()=>{})[constructorKey]]]; box[0][0]('return process')();",
        "const constructorKey='constructor'; Reflect.get(()=>{},constructorKey)('return process')();",
        "const constructorKey='constructor'; const {value:HiddenFunction}=Reflect.getOwnPropertyDescriptor(()=>{},constructorKey); HiddenFunction('return process')();"
      ].map((suffix) => ({
        path: cliPath,
        source: `${cleanCli}\n${suffix}\n`
      }))
    ];
    for (const mutation of adversarialMutations) {
      await writeFile(path.join(repoRoot, libPath), cleanLib);
      await writeFile(path.join(repoRoot, cliPath), cleanCli);
      await writeFile(path.join(repoRoot, mutation.path), mutation.source);
      await assert.rejects(
        gateLib.collectCheckerCapabilityProof(repoRoot, await computeFixtureBundleDigest()),
        (error) => error?.code === "CHECKER_CAPABILITY_POLICY_VIOLATION" && error?.outcome === "blocked"
      );
    }

    await writeFile(path.join(repoRoot, libPath), cleanLib);
    await writeFile(path.join(repoRoot, cliPath), `${cleanCli}\n// capability-neutral checker bundle drift\n`);
    await assert.rejects(
      gateLib.collectCheckerCapabilityProof(repoRoot, digest),
      (error) => error?.code === "CHECKER_CAPABILITY_BUNDLE_MISMATCH" && error?.outcome === "blocked"
    );
    const recomputedDigest = await computeFixtureBundleDigest();
    const reboundProof = await gateLib.collectCheckerCapabilityProof(repoRoot, recomputedDigest);
    assert.equal(reboundProof.checkerBundleDigest, recomputedDigest);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("shadow temp policy rejects TMPDIR inside the repository before creating output", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-temp-escape-repo-"));
  const liveTempRoot = path.join(repoRoot, "app");
  const originalTmpdir = process.env.TMPDIR;
  try {
    await mkdir(liveTempRoot, { recursive: true });
    process.env.TMPDIR = liveTempRoot;
    await assert.rejects(
      gateLib.collectExternalSideEffectProof(repoRoot),
      (error) => error?.code === "EXECUTION_ENVIRONMENT_UNSAFE" && error?.outcome === "blocked"
    );
    await assert.rejects(
      gateLib.rehearseShadowOutputs(repoRoot, {
        "safe-card": { schemaVersion: "promotion-shadow-dto.v1", kind: "safe-card", id: "card" },
        practice: { schemaVersion: "promotion-shadow-dto.v1", kind: "practice", id: "practice" },
        lesson: { schemaVersion: "promotion-shadow-dto.v1", kind: "lesson", id: "lesson" }
      }, makeManifest().operationPlan),
      (error) => error?.code === "EXECUTION_ENVIRONMENT_UNSAFE" && error?.outcome === "blocked"
    );
    assert.deepEqual(await readdir(liveTempRoot), []);
  } finally {
    if (originalTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = originalTmpdir;
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("Git proof detects dirty tracked and untracked files without exposing their paths", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-git-dirty-"));
  try {
    await writeSyntheticPromotionRepo(repoRoot);
    await mkdir(path.join(repoRoot, "synthetic/live"), { recursive: true });
    await writeFile(path.join(repoRoot, "synthetic/live/entry.mjs"), "export const changed = true;\n");
    await writeFile(path.join(repoRoot, "synthetic/untracked.json"), "{}\n");
    const state = await gateLib.collectGitWorktreeState(repoRoot);
    assert.equal(state.clean, false);
    assert.equal(state.statusEntryCount >= 2, true);
    assert.notEqual(state.statusSha256, gateLib.sha256(Buffer.alloc(0)));
    assert.equal(JSON.stringify(state).includes("synthetic/"), false);

    assert.throws(
      () => gateLib.assertStableGitWorktree(state, state),
      (error) => error?.code === "WORKTREE_DIRTY" && error?.outcome === "blocked"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("Git proof blocks execution HEAD drift independently from manifest source and baseline commits", () => {
  const clean = {
    headCommit: "c".repeat(40),
    clean: true,
    statusSha256: gateLib.sha256(Buffer.alloc(0)),
    statusEntryCount: 0
  };
  assert.throws(
    () => gateLib.assertStableGitWorktree(clean, { ...clean, headCommit: "d".repeat(40) }),
    (error) => error?.code === "WORKTREE_HEAD_DRIFT" && error?.outcome === "blocked"
  );
});

test("a dirty worktree produces a blocked receipt owned by A25", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-dirty-receipt-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    await writeFile(path.join(repoRoot, "synthetic/untracked.json"), "{}\n");
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "dirty-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "blocked");
    assert.equal(receipt.exitReason.code, "WORKTREE_DIRTY");
    assert.equal(receipt.exitReason.checkId, "forbidden-diff");
    assert.equal(receipt.nextOwner, "A25");
    assert.equal(receipt.lifecycleRecommendation.suggestedTransition, null);
    assert.equal(receipt.worktreeProof.preClean, false);
    assert.equal(receipt.worktreeProof.postClean, false);
    assert.match(receipt.worktreeProof.executionCommit, /^[a-f0-9]{40}$/u);
    assert.match(receipt.worktreeProof.preStatusSha256, /^[a-f0-9]{64}$/u);
    assert.match(receipt.worktreeProof.postStatusSha256, /^[a-f0-9]{64}$/u);
    assert.notEqual(receipt.worktreeProof.executionCommit, receipt.binding.sourceCommit);
    assert.notEqual(receipt.worktreeProof.executionCommit, receipt.binding.targetBaselineCommit);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("an ignored authoritative input preserves the first blocked check and routes clean-commit custody to A25", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-ignored-input-receipt-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const binding = manifest.evidenceBindings.find(({ role }) => role === "A24");
    const authoritativeBytes = await readFile(path.join(repoRoot, binding.path));
    await rm(path.join(repoRoot, binding.path));
    await commitSyntheticFixture(repoRoot, "remove tracked authoritative input");
    await writeFile(path.join(repoRoot, ".git/info/exclude"), `${binding.path}\n`);
    await mkdir(path.dirname(path.join(repoRoot, binding.path)), { recursive: true });
    await writeFile(path.join(repoRoot, binding.path), authoritativeBytes);
    assert.equal((await gateLib.collectGitWorktreeState(repoRoot)).clean, true);

    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "ignored-input-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "blocked");
    assert.equal(receipt.exitReason.code, "TRACKED_INPUT_UNCOMMITTED");
    assert.equal(receipt.exitReason.checkId, "forbidden-diff");
    assert.equal(receipt.nextOwner, "A25");
    assert.deepEqual(
      receipt.checkResults.filter(({ result }) => result === "blocked" || result === "fail"),
      [receipt.checkResults.find(({ checkId }) => checkId === "forbidden-diff")]
    );
    assert.equal(
      receipt.checkResults.find(({ checkId }) => checkId === "forbidden-diff").result,
      "blocked"
    );
    assert.equal(receipt.lifecycleRecommendation.suggestedTransition, null);
    assert.equal((await gateLib.verifyPromotionReceipt(repoRoot, receipt)).result, "blocked");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("shadow execution blocks nonexistent candidate provenance and candidate bytes absent from the source commit", async () => {
  const missingRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-missing-provenance-"));
  const driftRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-source-tree-drift-"));
  try {
    const missingFixture = await writeSyntheticPromotionRepo(missingRoot);
    missingFixture.manifest.sourceCommit = "f".repeat(40);
    await writeEvidenceFiles(missingRoot, missingFixture.manifest);
    const missingManifestBytes = Buffer.from(`${JSON.stringify(missingFixture.manifest, null, 2)}\n`);
    await writeFile(path.join(missingRoot, missingFixture.manifestPath), missingManifestBytes);
    await commitSyntheticFixture(missingRoot, "bind a nonexistent candidate provenance commit");
    const missingReceipt = await gateLib.runShadowPilot(missingRoot, {
      manifestPath: missingFixture.manifestPath,
      runId: "missing-provenance-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(missingReceipt.result, "blocked");
    assert.equal(missingReceipt.exitReason.code, "SOURCE_PROVENANCE_COMMIT_MISSING");
    assert.equal(missingReceipt.exitReason.checkId, "candidate-integrity");
    assert.equal(missingReceipt.nextOwner, "A25");

    const driftFixture = await writeSyntheticPromotionRepo(driftRoot);
    const safeArtifact = driftFixture.manifest.candidateArtifacts[0];
    const safeDocument = JSON.parse(await readFile(path.join(driftRoot, safeArtifact.path), "utf8"));
    safeDocument[108].candidateNote = "current bytes were not present in candidateSourceCommit";
    const changedBytes = Buffer.from(`${JSON.stringify(safeDocument, null, 2)}\n`);
    await writeFile(path.join(driftRoot, safeArtifact.path), changedBytes);
    safeArtifact.rawFileSha256 = gateLib.sha256(changedBytes);
    safeArtifact.recordSha256 = gateLib.fingerprint(safeDocument[108]);
    driftFixture.manifest.candidateDigest = gateLib.computeCandidateDigest(driftFixture.manifest.candidateArtifacts);
    driftFixture.manifest.parentPackage.sourceVersion = `sha256:${driftFixture.manifest.candidateDigest}`;
    await writeEvidenceFiles(driftRoot, driftFixture.manifest);
    await writeFile(
      path.join(driftRoot, driftFixture.manifestPath),
      `${JSON.stringify(driftFixture.manifest, null, 2)}\n`
    );
    await commitSyntheticFixture(driftRoot, "change candidate after provenance baseline");
    const driftReceipt = await gateLib.runShadowPilot(driftRoot, {
      manifestPath: driftFixture.manifestPath,
      runId: "source-tree-drift-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(driftReceipt.result, "blocked");
    assert.equal(driftReceipt.exitReason.code, "SOURCE_PROVENANCE_BLOB_MISMATCH");
    assert.equal(driftReceipt.nextOwner, "A25");
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(driftRoot, { recursive: true, force: true });
  }
});

test("target baseline proof blocks a later runtime commit even when the live registry is regenerated", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-stale-target-baseline-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const laterRuntimePath = "app/unreachable-baseline-drift/page.tsx";
    await mkdir(path.dirname(path.join(repoRoot, laterRuntimePath)), { recursive: true });
    await writeFile(path.join(repoRoot, laterRuntimePath), "export default function Page() { return null; }\n");
    await writeLiveRegistry(repoRoot, manifest);
    await writeFile(path.join(repoRoot, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
    await commitSyntheticFixture(repoRoot, "later runtime bytes with regenerated registry");

    await assert.rejects(
      gateLib.collectTargetBaselineProjectionProof(
        repoRoot,
        manifest,
        (await gateLib.collectGitWorktreeState(repoRoot)).headCommit
      ),
      (error) => error?.code === "TARGET_BASELINE_PROJECTION_STALE" && error?.outcome === "blocked"
    );
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "stale-target-baseline-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "blocked");
    assert.equal(receipt.exitReason.code, "TARGET_BASELINE_PROJECTION_STALE");
    assert.equal(receipt.exitReason.checkId, "evidence-currentness");
    assert.equal(receipt.nextOwner, "A22");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("checker release blocks bundle drift and same-version remapping", async () => {
  const driftRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-checker-drift-"));
  const remapRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-checker-remap-"));
  try {
    const driftFixture = await writeSyntheticPromotionRepo(driftRoot);
    const cliPath = CHECKER_BUNDLE_PATHS[1];
    const originalCli = await readFile(path.join(driftRoot, cliPath), "utf8");
    await writeFile(path.join(driftRoot, cliPath), `${originalCli}\n// unauthorized same-version drift\n`);
    await execFileAsync("git", ["-C", driftRoot, "add", "--", cliPath], { shell: false, maxBuffer: 64 * 1024 });
    await execFileAsync("git", [
      "-C", driftRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "drift checker bytes"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const driftReceipt = await gateLib.runShadowPilot(driftRoot, {
      manifestPath: driftFixture.manifestPath,
      runId: "checker-drift-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(driftReceipt.result, "blocked");
    assert.equal(driftReceipt.exitReason.code, "CHECKER_CAPABILITY_BUNDLE_MISMATCH");
    assert.equal(driftReceipt.exitReason.checkId, "forbidden-diff");

    const remapFixture = await writeSyntheticPromotionRepo(remapRoot);
    const originalReleaseCommit = remapFixture.checkerRelease.releaseCommit;
    const remapCli = await readFile(path.join(remapRoot, cliPath), "utf8");
    await writeFile(path.join(remapRoot, cliPath), `${remapCli}\n// remapped under the same version\n`);
    const remapped = await rewriteCheckerLedgerForCurrentBundle(remapRoot);
    await execFileAsync(
      "git",
      ["-C", remapRoot, "add", "--", cliPath, CHECKER_RELEASE_MAPPING_PATH],
      { shell: false, maxBuffer: 64 * 1024 }
    );
    await execFileAsync("git", [
      "-C", remapRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "attempt same-version checker remap"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const { stdout: remapHeadText } = await execFileAsync("git", ["-C", remapRoot, "rev-parse", "HEAD"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    remapFixture.manifest.targetBaselineCommit = originalReleaseCommit;
    remapFixture.manifest.checkerRelease = {
      version: "promotion-gate-shadow-v1",
      releaseCommit: remapHeadText.trim(),
      mappingPath: CHECKER_RELEASE_MAPPING_PATH,
      mappingRawSha256: remapped.mappingRawSha256,
      bundleDigest: remapped.bundleDigest
    };
    await writeEvidenceFiles(remapRoot, remapFixture.manifest);
    await writeFile(
      path.join(remapRoot, remapFixture.manifestPath),
      `${JSON.stringify(remapFixture.manifest, null, 2)}\n`
    );
    await commitSyntheticFixture(remapRoot, "bind attempted checker remap");
    const remapReceipt = await gateLib.runShadowPilot(remapRoot, {
      manifestPath: remapFixture.manifestPath,
      runId: "checker-remap-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(remapReceipt.result, "blocked");
    assert.equal(remapReceipt.exitReason.code, "CHECKER_RELEASE_REMAPPED");
    assert.equal(remapReceipt.exitReason.checkId, "manifest-contract");
  } finally {
    await rm(driftRoot, { recursive: true, force: true });
    await rm(remapRoot, { recursive: true, force: true });
  }
});

test("runShadowPilot closes the synthetic three-artifact loop and emits a self-verifying receipt", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-run-"));
  try {
    const { manifest, manifestPath, manifestBytes } = await writeSyntheticPromotionRepo(repoRoot);
    assert.equal(typeof gateLib.runShadowPilot, "function");
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.schemaVersion, "promotion-receipt.v1");
    assert.equal(receipt.result, "pass");
    assert.deepEqual(receipt.manifest, { path: manifestPath, rawSha256: gateLib.sha256(manifestBytes) });
    assert.equal(receipt.binding.candidateDigest, manifest.candidateDigest);
    assert.equal(receipt.binding.targetBaselineCommit, manifest.targetBaselineCommit);
    assert.equal(receipt.binding.attemptId, manifest.attemptId);
    assert.match(receipt.worktreeProof.executionCommit, /^[a-f0-9]{40}$/u);
    assert.equal(receipt.worktreeProof.preClean, true);
    assert.equal(receipt.worktreeProof.postClean, true);
    assert.equal(receipt.worktreeProof.preStatusEntryCount, 0);
    assert.equal(receipt.worktreeProof.postStatusEntryCount, 0);
    assert.equal(receipt.worktreeProof.trackedInputCount > 0, true);
    assert.match(receipt.worktreeProof.trackedInputAggregateDigest, /^[a-f0-9]{64}$/u);
    assert.deepEqual(receipt.checkResults.map(({ checkId, result }) => ({ checkId, result })), REQUIRED_CHECK_IDS.map((checkId) => ({
      checkId,
      result: "pass"
    })));
    assert.equal(receipt.sourceSnapshots.equal, true);
    assert.deepEqual(receipt.candidateSourceProof.paths, manifest.candidateArtifacts.map(({ path: artifactPath }) => artifactPath));
    assert.equal(receipt.candidateSourceProof.equal, true);
    assert.equal(receipt.candidateSourceProof.preAggregateDigest, receipt.candidateSourceProof.postAggregateDigest);
    assert.equal(receipt.shadowOutput.outputs.length, 3);
    assert.equal(receipt.shadowOutput.aggregateDigest, gateLib.fingerprint(receipt.shadowOutput.outputs));
    assert.match(receipt.mappingCompatibility.digest, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.rollbackProof.verifiedAbsent, true);
    assert.equal(receipt.rollbackProof.preimageDigest, receipt.rollbackProof.postRollbackDigest);
    assert.match(receipt.rollbackProof.digest, /^[a-f0-9]{64}$/u);
    assert.equal(receipt.reachability.selectedCandidateReachable, false);
    assert.deepEqual(receipt.forbiddenDiff, { result: "pass", changedPaths: [] });
    assert.equal(receipt.externalSideEffects.result, "pass");
    assert.equal(receipt.externalSideEffects.networkRequestCount, 0);
    assert.equal(receipt.externalSideEffects.databaseWriteCount, 0);
    assert.equal(receipt.externalSideEffects.deploymentCommandCount, 0);
    assert.equal(receipt.targetBaselineProof.targetBaselineCommit, manifest.targetBaselineCommit);
    assert.equal(receipt.targetBaselineProof.targetTreeDigest, receipt.targetBaselineProof.currentTreeDigest);
    assert.equal(receipt.targetBaselineProof.equal, true);
    assert.deepEqual(receipt.lifecycleRecommendation, {
      currentState: "shadow_ready",
      suggestedTransition: null
    });
    assert.equal(receipt.unmetConditions.includes("a11-independent-replay-required"), true);
    assert.equal(receipt.unmetConditions.includes("a22-postrun-isolation-required"), true);
    assert.equal(receipt.unmetConditions.includes("ci-semantic-replay-required"), true);
    assert.match(receipt.trustBoundary, /not cryptographic identity/u);
    assert.match(receipt.semanticReceiptDigest, /^[a-f0-9]{64}$/u);
    assert.match(receipt.rawReceiptDigest, /^[a-f0-9]{64}$/u);

    assert.equal(typeof gateLib.verifyPromotionReceipt, "function");
    const verified = await gateLib.verifyPromotionReceipt(repoRoot, receipt);
    assert.deepEqual(verified, {
      valid: true,
      result: "pass",
      manifestPath,
      manifestDigest: gateLib.sha256(manifestBytes),
      semanticReceiptDigest: receipt.semanticReceiptDigest,
      rawReceiptDigest: receipt.rawReceiptDigest
    });
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("receipt semantic digest ignores run metadata while raw digest binds it", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-receipt-runs-"));
  try {
    const { manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const first = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    const second = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-002",
      producedAt: "2026-08-25T01:05:00.000Z"
    });
    assert.equal(first.semanticReceiptDigest, second.semanticReceiptDigest);
    assert.notEqual(first.rawReceiptDigest, second.rawReceiptDigest);

    const firstExecutionCommit = first.worktreeProof.executionCommit;
    await mkdir(path.join(repoRoot, "canonical"));
    await writeFile(path.join(repoRoot, "canonical/receipt.json"), `${JSON.stringify(first, null, 2)}\n`);
    await execFileAsync("git", ["-C", repoRoot, "add", "--", "canonical/receipt.json"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    await execFileAsync("git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "commit", "--quiet", "-m", "canonical receipt only"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const afterReceiptCommit = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-003",
      producedAt: "2026-08-25T01:10:00.000Z"
    });
    assert.notEqual(afterReceiptCommit.worktreeProof.executionCommit, firstExecutionCommit);
    assert.notEqual(afterReceiptCommit.semanticReceiptDigest, first.semanticReceiptDigest);
    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, first),
      (error) => error?.code === "RECEIPT_EXECUTION_HEAD_MISMATCH" && error?.outcome === "blocked"
    );
    assert.equal((await gateLib.verifyPromotionReceipt(repoRoot, afterReceiptCommit)).result, "pass");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("historical Receipt verification requires its exact execution HEAD and terminal attempts cannot rerun", {
  timeout: 60_000
}, async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-terminal-head-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const canonical = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "terminal-head-canonical-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal((await gateLib.verifyPromotionReceipt(repoRoot, canonical)).valid, true);
    const manifestRawSha256 = gateLib.sha256(await readFile(path.join(repoRoot, manifestPath)));
    const genesis = gateLib.attachLifecycleEventDigest({
      sequence: 1,
      eventId: "attempt-001-candidate-hold",
      attemptId: manifest.attemptId,
      fromState: null,
      toState: "candidate_hold",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: null,
      previousEventDigest: null
    });
    const ready = gateLib.attachLifecycleEventDigest({
      sequence: 2,
      eventId: "attempt-001-shadow-ready",
      attemptId: manifest.attemptId,
      fromState: "candidate_hold",
      toState: "shadow_ready",
      manifest: { path: manifestPath, rawSha256: manifestRawSha256 },
      evidenceIndex: structuredClone(manifest.evidenceIndex),
      closure: null,
      disposition: null,
      previousEventDigest: genesis.eventDigest
    });
    const passed = gateLib.attachLifecycleEventDigest({
      sequence: 3,
      eventId: "attempt-001-shadow-passed",
      attemptId: manifest.attemptId,
      fromState: "shadow_ready",
      toState: "shadow_passed",
      manifest: null,
      evidenceIndex: null,
      closure: {
        path: "coordination/integration/pilots/synthetic-attempt/closure.json",
        digest: "8".repeat(64)
      },
      disposition: null,
      previousEventDigest: ready.eventDigest
    });
    const terminalRegistry = gateLib.attachLifecycleRegistryDigest({
      schemaVersion: gateLib.PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_passed",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "Shadow-mature / live-unproven",
      events: [genesis, ready, passed]
    });
    const receiptPath = "coordination/integration/pilots/synthetic-attempt/canonical.receipt.json";
    const registryPath = "coordination/integration/pilots/synthetic-attempt/registry.json";
    await mkdir(path.dirname(path.join(repoRoot, receiptPath)), { recursive: true });
    await writeFile(path.join(repoRoot, receiptPath), `${JSON.stringify(canonical, null, 2)}\n`);
    await writeFile(path.join(repoRoot, registryPath), `${JSON.stringify(terminalRegistry, null, 2)}\n`);
    await commitSyntheticFixture(repoRoot, "record terminal attempt artifacts");

    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, canonical),
      (error) => error?.code === "RECEIPT_EXECUTION_HEAD_MISMATCH" && error?.outcome === "blocked"
    );
    const retry = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "illegal-terminal-retry-001",
      producedAt: "2026-08-25T01:05:00.000Z"
    });
    assert.equal(retry.result, "fail");
    assert.equal(retry.exitReason.code, "ATTEMPT_ALREADY_TERMINAL");
    assert.equal(retry.worktreeProof.attemptHistoryProof.expectedAttemptStatus, "shadow_passed");
    assert.equal(retry.worktreeProof.attemptHistoryProof.expectedAttemptTerminal, true);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("verifyPromotionReceipt rejects receipt tampering and referenced-manifest drift", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-receipt-tamper-"));
  try {
    const { manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    const tampered = structuredClone(receipt);
    tampered.externalSideEffects = true;
    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, tampered),
      (error) => error?.code === "RECEIPT_DIGEST_MISMATCH"
    );

    const wrongManifestBinding = structuredClone(receipt);
    wrongManifestBinding.manifest.rawSha256 = "0".repeat(64);
    refreshReceiptCheckEvidenceDigest(wrongManifestBinding, "manifest-contract");
    delete wrongManifestBinding.semanticReceiptDigest;
    delete wrongManifestBinding.rawReceiptDigest;
    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, gateLib.attachReceiptDigests(wrongManifestBinding)),
      (error) => error?.code === "RECEIPT_MANIFEST_DIGEST_MISMATCH"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("verifyPromotionReceipt rejects re-digested false rollback, reachability, snapshot, and nested fields", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-receipt-semantics-"));
  try {
    const { manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "synthetic-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    const cases = [
      {
        code: "RECEIPT_ROLLBACK_INVALID",
        checkId: "rollback-rehearsal",
        mutate(value) {
          value.rollbackProof.verifiedAbsent = false;
        }
      },
      {
        code: "RECEIPT_REACHABILITY_INVALID",
        checkId: "live-reachability",
        mutate(value) {
          value.reachability.selectedCandidateReachable = true;
        }
      },
      {
        code: "RECEIPT_SOURCE_SNAPSHOT_INVALID",
        checkId: "forbidden-diff",
        mutate(value) {
          value.sourceSnapshots.equal = false;
        }
      },
      {
        code: "RECEIPT_CANDIDATE_SOURCE_INVALID",
        checkId: "candidate-integrity",
        mutate(value) {
          value.candidateSourceProof.equal = false;
        }
      },
      {
        code: "RECEIPT_SHADOW_OUTPUT_INVALID",
        checkId: "rollback-rehearsal",
        mutate(value) {
          value.shadowOutput.aggregateDigest = "0".repeat(64);
        }
      },
      {
        code: "RECEIPT_MAPPING_INVALID",
        checkId: "mapping-compatibility",
        mutate(value) {
          value.mappingCompatibility.digest = "0".repeat(64);
        }
      },
      {
        code: "RECEIPT_ROLLBACK_INVALID",
        checkId: "rollback-rehearsal",
        mutate(value) {
          value.rollbackProof.postRollbackDigest = "0".repeat(64);
        }
      },
      {
        code: "RECEIPT_WORKTREE_PROOF_INVALID",
        checkId: "forbidden-diff",
        mutate(value) {
          value.worktreeProof.trackedInputAggregateDigest = "0".repeat(64);
        }
      },
      {
        code: "SCHEMA_UNKNOWN_FIELD",
        checkId: "rollback-rehearsal",
        mutate(value) {
          value.shadowOutput.receiptPath = "synthetic/forbidden.json";
        }
      }
    ];
    for (const { code, checkId, mutate } of cases) {
      const changed = structuredClone(receipt);
      mutate(changed);
      refreshReceiptCheckEvidenceDigest(changed, checkId);
      delete changed.semanticReceiptDigest;
      delete changed.rawReceiptDigest;
      const redigested = gateLib.attachReceiptDigests(changed);
      await assert.rejects(
        gateLib.verifyPromotionReceipt(repoRoot, redigested),
        (error) => error?.code === code,
        code
      );
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("started shadow attempt returns a blocked receipt with missing evidence and next owner", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-blocked-receipt-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const missingBinding = manifest.evidenceBindings.find((binding) => binding.role === "A24");
    await rm(path.join(repoRoot, missingBinding.path));
    await commitSyntheticFixture(repoRoot, "remove required A24 evidence");

    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "blocked-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.schemaVersion, "promotion-receipt.v1");
    assert.equal(receipt.result, "blocked");
    assert.deepEqual(receipt.exitReason, {
      code: "EVIDENCE_UNAVAILABLE",
      checkId: "evidence-currentness",
      message: "Required evidence for role \"A24\" is unavailable.",
      details: { role: "A24", path: missingBinding.path }
    });
    assert.equal(receipt.nextOwner, "A24");
    assert.deepEqual(receipt.lifecycleRecommendation, {
      currentState: "shadow_ready",
      suggestedTransition: null
    });
    assert.equal(receipt.unmetConditions.includes("EVIDENCE_UNAVAILABLE"), true);
    assert.equal(
      receipt.checkResults.find((check) => check.checkId === "evidence-currentness").result,
      "blocked"
    );
    assert.equal(receipt.shadowOutput, null);
    assert.equal(receipt.rollbackProof, null);
    const manifestAfter = JSON.parse(await readFile(path.join(repoRoot, manifestPath), "utf8"));
    assert.deepEqual(manifestAfter.lifecycle, manifest.lifecycle);
    assert.equal((await gateLib.verifyPromotionReceipt(repoRoot, receipt)).result, "blocked");

    const { runCli } = await import("./promotion-gate.mjs");
    const writes = [];
    const exitCode = await runCli([
      "shadow",
      "--manifest",
      manifestPath,
      "--run-id",
      "blocked-run-002",
      "--json"
    ], {
      repoRoot,
      producedAt: "2026-08-25T01:05:00.000Z",
      writeStdout: (text) => writes.push(text)
    });
    assert.equal(exitCode, 2);
    assert.equal(writes.length, 1);
    assert.equal(JSON.parse(writes[0]).result, "blocked");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("stale candidate, source, baseline, and checker evidence produce blocked receipts for the exact owner", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-stale-evidence-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const binding = manifest.evidenceBindings.find((entry) => entry.role === "A18");
    const currentEvidence = makeEvidence("A18", manifest);
    const writeStaleAttempt = async (evidence, label) => {
      const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
      await writeFile(path.join(repoRoot, binding.path), evidenceBytes);
      binding.rawSha256 = gateLib.sha256(evidenceBytes);
      binding.semanticSha256 = gateLib.fingerprint(evidence.semanticPayload);
      await commitSyntheticFixture(repoRoot, `stale A18 ${label} owner review`);
      const { stdout: reviewCommitStdout } = await execFileAsync(
        "git",
        ["-C", repoRoot, "rev-parse", "HEAD"],
        { shell: false, maxBuffer: 64 * 1024 }
      );
      binding.reviewedCommit = reviewCommitStdout.trim();
      const evidenceIndex = {
        schemaVersion: "promotion-evidence-index.v1",
        gateId: manifest.gateId,
        pilotUnitId: manifest.pilotUnitId,
        attemptId: manifest.attemptId,
        candidateDigest: manifest.candidateDigest,
        sourceCommit: manifest.sourceCommit,
        targetBaselineCommit: manifest.targetBaselineCommit,
        checkerVersion: manifest.checkerVersion,
        entries: structuredClone(manifest.evidenceBindings),
        entriesDigest: gateLib.fingerprint(manifest.evidenceBindings)
      };
      const indexBytes = Buffer.from(`${JSON.stringify(evidenceIndex, null, 2)}\n`);
      await writeFile(path.join(repoRoot, manifest.evidenceIndex.path), indexBytes);
      manifest.evidenceIndex.rawSha256 = gateLib.sha256(indexBytes);
      await writeFile(path.join(repoRoot, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
      await commitSyntheticFixture(repoRoot, `bind stale A18 ${label} review`);
    };

    for (const [field, staleValue] of [
      ["candidateDigest", "0".repeat(64)],
      ["sourceCommit", "1".repeat(40)],
      ["targetBaselineCommit", "2".repeat(40)],
      ["checkerVersion", "promotion-gate-shadow-v2"]
    ]) {
      await writeStaleAttempt({ ...currentEvidence, [field]: staleValue }, field);
      const receipt = await gateLib.runShadowPilot(repoRoot, {
        manifestPath,
        runId: `stale-${field}`,
        producedAt: "2026-08-25T01:00:00.000Z"
      });
      assert.equal(receipt.result, "blocked", field);
      assert.equal(receipt.exitReason.code, "EVIDENCE_CURRENTNESS_MISMATCH", field);
      assert.equal(receipt.exitReason.details.role, "A18", field);
      assert.deepEqual(receipt.exitReason.details.staleBindings, [field], field);
      assert.equal(receipt.nextOwner, "A18", field);
      assert.equal((await gateLib.verifyPromotionReceipt(repoRoot, receipt)).result, "blocked", field);
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("started shadow attempt returns verifiable fail receipts for content and safety checks", async () => {
  const contentRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-content-fail-"));
  const safetyRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-safety-fail-"));
  try {
    const contentFixture = await writeSyntheticPromotionRepo(contentRoot);
    const practicePath = contentFixture.manifest.candidateArtifacts.find((artifact) => artifact.kind === "practice").path;
    await writeFile(path.join(contentRoot, practicePath), "{\"record\":{\"answer\":13}}\n");
    await commitSyntheticFixture(contentRoot, "commit candidate content drift");
    const contentReceipt = await gateLib.runShadowPilot(contentRoot, {
      manifestPath: contentFixture.manifestPath,
      runId: "content-fail-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(contentReceipt.result, "fail");
    assert.equal(contentReceipt.exitReason.code, "CANDIDATE_RAW_DIGEST_MISMATCH");
    assert.equal(contentReceipt.exitReason.checkId, "candidate-integrity");
    assert.equal(contentReceipt.nextOwner, null);
    assert.equal(contentReceipt.lifecycleRecommendation.suggestedTransition, null);
    assert.equal((await gateLib.verifyPromotionReceipt(contentRoot, contentReceipt)).result, "fail");

    const safetyFixture = await writeSyntheticPromotionRepo(safetyRoot);
    await writeRuntimeSource(
      safetyRoot,
      `export const selected = '${safetyFixture.manifest.candidateArtifacts[1].id}';\n`
    );
    await sealSyntheticRuntimeBaseline(
      safetyRoot,
      safetyFixture.manifest,
      safetyFixture.manifestPath,
      "commit live candidate leak"
    );
    const safetyReceipt = await gateLib.runShadowPilot(safetyRoot, {
      manifestPath: safetyFixture.manifestPath,
      runId: "safety-fail-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(safetyReceipt.result, "fail");
    assert.equal(safetyReceipt.exitReason.code, "LIVE_CANDIDATE_REACHABLE");
    assert.equal(safetyReceipt.exitReason.checkId, "live-reachability");
    assert.equal((await gateLib.verifyPromotionReceipt(safetyRoot, safetyReceipt)).result, "fail");

    const incompleteMapping = structuredClone(safetyReceipt);
    incompleteMapping.mappingCompatibility.outputSemanticDigests.pop();
    const mappingPayload = {
      result: incompleteMapping.mappingCompatibility.result,
      dtoSchemaVersion: incompleteMapping.mappingCompatibility.dtoSchemaVersion,
      outputSemanticDigests: incompleteMapping.mappingCompatibility.outputSemanticDigests
    };
    incompleteMapping.mappingCompatibility.digest = gateLib.fingerprint(mappingPayload);
    incompleteMapping.checkResults.find(({ checkId }) => checkId === "mapping-compatibility").evidenceDigest =
      gateLib.fingerprint(incompleteMapping.mappingCompatibility);
    delete incompleteMapping.semanticReceiptDigest;
    delete incompleteMapping.rawReceiptDigest;
    await assert.rejects(
      gateLib.verifyPromotionReceipt(safetyRoot, gateLib.attachReceiptDigests(incompleteMapping)),
      (error) => error?.code === "RECEIPT_MAPPING_INVALID"
    );

    const { runCli } = await import("./promotion-gate.mjs");
    const writes = [];
    const exitCode = await runCli([
      "shadow",
      "--manifest",
      safetyFixture.manifestPath,
      "--run-id",
      "safety-fail-002",
      "--json"
    ], {
      repoRoot: safetyRoot,
      producedAt: "2026-08-25T01:05:00.000Z",
      writeStdout: (text) => writes.push(text)
    });
    assert.equal(exitCode, 1);
    assert.equal(JSON.parse(writes[0]).schemaVersion, "promotion-receipt.v1");
  } finally {
    await rm(contentRoot, { recursive: true, force: true });
    await rm(safetyRoot, { recursive: true, force: true });
  }
});

test("receipt verification binds immutable manifest attempt identity and outcome semantics", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-attempt-immutable-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "immutable-run-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.binding.attemptId, manifest.attemptId);

    const changedAttempt = structuredClone(receipt);
    changedAttempt.binding.attemptId = "attempt-002";
    refreshReceiptCheckEvidenceDigest(changedAttempt, "manifest-contract");
    delete changedAttempt.semanticReceiptDigest;
    delete changedAttempt.rawReceiptDigest;
    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, gateLib.attachReceiptDigests(changedAttempt)),
      (error) => error?.code === "RECEIPT_MANIFEST_BINDING_MISMATCH"
    );

    const changedOutcome = structuredClone(receipt);
    changedOutcome.result = "blocked";
    changedOutcome.exitReason = {
      code: "FABRICATED_BLOCK",
      checkId: "evidence-currentness",
      message: "fabricated",
      details: {}
    };
    changedOutcome.nextOwner = "A24";
    changedOutcome.lifecycleRecommendation.suggestedTransition = "repair_required";
    delete changedOutcome.semanticReceiptDigest;
    delete changedOutcome.rawReceiptDigest;
    await assert.rejects(
      gateLib.verifyPromotionReceipt(repoRoot, gateLib.attachReceiptDigests(changedOutcome)),
      (error) => error?.code === "RECEIPT_OUTCOME_INVALID"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("CLI exposes only validate, shadow, and verify-receipt with one JSON document", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-cli-"));
  const receiptRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-cli-receipt-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const cli = await import("./promotion-gate.mjs");
    assert.equal(typeof cli.runCli, "function");

    const invoke = async (args) => {
      const writes = [];
      const exitCode = await cli.runCli(args, {
        repoRoot,
        producedAt: "2026-08-25T02:00:00.000Z",
        writeStdout: (text) => writes.push(text)
      });
      assert.equal(writes.length, 1, `expected one stdout write for ${args.join(" ")}`);
      const payload = JSON.parse(writes[0]);
      assert.equal(writes[0].trim(), JSON.stringify(payload));
      return { exitCode, payload };
    };

    const validation = await invoke(["validate", "--manifest", manifestPath, "--json"]);
    assert.equal(validation.exitCode, 0);
    assert.deepEqual(Object.keys(validation.payload), [
      "schemaVersion",
      "result",
      "manifestDigest",
      "candidateDigest",
      "checks"
    ]);
    assert.equal(validation.payload.schemaVersion, "promotion-validation.v1");
    assert.deepEqual(validation.payload.checks, REQUIRED_CHECK_IDS.map((checkId) => ({ checkId, result: "pass" })));
    assert.equal(validation.payload.checks.find((check) => check.checkId === "legacy-ratchet").result, "pass");
    assert.equal(validation.payload.checks.find((check) => check.checkId === "live-reachability").result, "pass");

    const shadow = await invoke([
      "shadow",
      "--manifest",
      manifestPath,
      "--run-id",
      "cli-run-001",
      "--json"
    ]);
    assert.equal(shadow.exitCode, 0);
    assert.equal(shadow.payload.schemaVersion, "promotion-receipt.v1");
    assert.equal(Object.hasOwn(shadow.payload, "receipt"), false);
    assert.equal(Object.hasOwn(shadow.payload, "receiptPath"), false);

    const receiptPath = path.join(receiptRoot, "receipt.json");
    await writeFile(receiptPath, `${JSON.stringify(shadow.payload, null, 2)}\n`);
    const verification = await invoke(["verify-receipt", "--receipt", receiptPath, "--json"]);
    assert.equal(verification.exitCode, 0);
    assert.deepEqual(Object.keys(verification.payload), [
      "schemaVersion",
      "result",
      "manifestPath",
      "manifestDigest",
      "semanticReceiptDigest",
      "rawReceiptDigest"
    ]);
    assert.equal(verification.payload.schemaVersion, "promotion-receipt-verification.v1");
    assert.equal(verification.payload.result, "pass");
    assert.equal(verification.payload.semanticReceiptDigest, shadow.payload.semanticReceiptDigest);

    for (const args of [
      ["live", "--manifest", manifestPath, "--json"],
      ["shadow", "--manifest", manifestPath, "--run-id", "x", "--output-root", "tmp", "--json"],
      ["shadow", "--manifest", manifestPath, "--run-id", "x", "--receipt-path", "receipt.json", "--json"],
      ["validate", "--manifest", manifestPath]
    ]) {
      const rejected = await invoke(args);
      assert.equal(rejected.exitCode, 1);
      assert.equal(rejected.payload.schemaVersion, "promotion-gate-error.v1");
      assert.equal(rejected.payload.result, "fail");
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(receiptRoot, { recursive: true, force: true });
  }
});

test("CLI maps relevant unresolved dynamic import to blocked exit 2", async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-cli-blocked-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    await writeRuntimeSource(
      repoRoot,
      "const candidatePath = '../candidate/' + kind + '.json';\nexport const load = () => import(candidatePath);\n"
    );
    await sealSyntheticRuntimeBaseline(
      repoRoot,
      manifest,
      manifestPath,
      "commit unresolved runtime import"
    );
    const { runCli } = await import("./promotion-gate.mjs");
    const writes = [];
    const exitCode = await runCli(["validate", "--manifest", manifestPath, "--json"], {
      repoRoot,
      producedAt: "2026-08-25T02:00:00.000Z",
      writeStdout: (text) => writes.push(text)
    });
    assert.equal(exitCode, 2);
    assert.equal(writes.length, 1);
    assert.deepEqual(JSON.parse(writes[0]), {
      schemaVersion: "promotion-gate-error.v1",
      result: "blocked",
      code: "UNRESOLVED_DYNAMIC_IMPORT",
      message: "A nonliteral dynamic import under a declared live root cannot be resolved statically.",
      details: {
        unresolvedDynamicImports: [{ path: CANONICAL_RUNTIME_ENTRYPOINTS[0], call: "import" }]
      }
    });
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("manifest and receipt schemas agree with the executable v1 required fields and enums", async () => {
  const manifestSchema = JSON.parse(await readFile(new URL("./schemas/promotion-manifest.v1.schema.json", import.meta.url), "utf8"));
  const receiptSchema = JSON.parse(await readFile(new URL("./schemas/promotion-receipt.v1.schema.json", import.meta.url), "utf8"));

  assert.deepEqual(manifestSchema.required, [...gateLib.PROMOTION_MANIFEST_FIELDS]);
  assert.equal(manifestSchema.additionalProperties, false);
  assert.equal(manifestSchema.properties.schemaVersion.const, gateLib.PROMOTION_MANIFEST_SCHEMA_VERSION);
  assert.equal(manifestSchema.properties.mode.const, "shadow");
  assert.equal(manifestSchema.properties.checkerVersion.const, gateLib.PROMOTION_CHECKER_VERSION);
  assert.deepEqual(manifestSchema.properties.requiredOwners.const, [...gateLib.REQUIRED_OWNER_ROLES]);
  assert.deepEqual(
    [...manifestSchema.properties.allowlistedCheckIds.items.enum].sort(),
    [...gateLib.REQUIRED_CHECK_IDS].sort()
  );
  assert.deepEqual(
    [...manifestSchema.properties.candidateArtifacts.items.properties.kind.enum].sort(),
    ["lesson", "practice", "safe-card"]
  );
  assert.deepEqual(
    manifestSchema.properties.accessPolicy.required,
    ["allowedReadPaths", "allowedTemporaryWritePaths", "forbiddenModificationPaths", "tempRootPolicy"]
  );

  assert.deepEqual(receiptSchema.required, [...gateLib.PROMOTION_RECEIPT_FIELDS]);
  assert.equal(receiptSchema.additionalProperties, false);
  assert.equal(receiptSchema.properties.schemaVersion.const, gateLib.PROMOTION_RECEIPT_SCHEMA_VERSION);
  assert.deepEqual(receiptSchema.properties.result.enum, ["pass", "fail", "blocked"]);
  assert.deepEqual(receiptSchema.properties.binding.required, [
    "gateId",
    "pilotUnitId",
    "attemptId",
    "parentPackage",
    "candidateDigest",
    "sourceCommit",
    "targetBaselineCommit",
    "checkerVersion",
    "checkerRelease"
  ]);
  assert.deepEqual(receiptSchema.properties.binding.properties.parentPackage.required, [
    "id",
    "sourceVersion",
    "candidatePackagingVersion",
    "status"
  ]);
  assert.deepEqual(receiptSchema.$defs.worktreeProof.required, [
    "executionCommit",
    "preClean",
    "postClean",
    "preStatusSha256",
    "postStatusSha256",
    "preStatusEntryCount",
    "postStatusEntryCount",
    "trackedInputCount",
    "trackedInputAggregateDigest",
    "attemptHistoryProof"
  ]);
  assert.deepEqual(
    [...receiptSchema.$defs.checkResult.properties.checkId.enum].sort(),
    [...gateLib.REQUIRED_CHECK_IDS].sort()
  );
  assert.deepEqual(receiptSchema.$defs.checkResult.properties.result.enum, [
    "pass",
    "not_run",
    "fail",
    "blocked"
  ]);
  assert.ok(receiptSchema.properties.candidateSourceProof);
  assert.ok(receiptSchema.$defs.shadowOutput.properties.aggregateDigest);
  assert.ok(receiptSchema.$defs.mappingCompatibility.properties.digest);
  assert.ok(receiptSchema.$defs.rollbackProof.properties.preimageDigest);
  assert.ok(receiptSchema.$defs.rollbackProof.properties.postRollbackDigest);
  assert.ok(receiptSchema.$defs.rollbackProof.properties.digest);
  assert.deepEqual(receiptSchema.$defs.externalSideEffectProof.required, [
    "schemaVersion",
    "result",
    "policy",
    "registeredOperations",
    "gitPolicy",
    "resolverEnvironment",
    "tempRootProof",
    "checkerCapabilityPolicy",
    "networkRequestCount",
    "providerCallCount",
    "databaseWriteCount",
    "deploymentCommandCount",
    "digest"
  ]);
  assert.deepEqual(
    receiptSchema.properties.lifecycleRecommendation.properties.suggestedTransition.enum,
    ["shadow_passed", null]
  );
  assert.equal(receiptSchema.properties.trustBoundary.const, gateLib.TRUST_BOUNDARY);
});

test("Draft 2020 schemas compile and validate executable Manifest and pass, fail, and blocked Receipts", {
  timeout: 180_000
}, async () => {
  const Ajv2020 = createRequire(import.meta.url)("ajv/dist/2020.js");
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: false,
    strictRequired: false
  });
  ajv.addFormat("date-time", {
    type: "string",
    validate(value) {
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
        Number.isFinite(Date.parse(value));
    }
  });

  const manifestSchema = JSON.parse(
    await readFile(new URL("./schemas/promotion-manifest.v1.schema.json", import.meta.url), "utf8")
  );
  const receiptSchema = JSON.parse(
    await readFile(new URL("./schemas/promotion-receipt.v1.schema.json", import.meta.url), "utf8")
  );
  const validateManifestSchema = ajv.compile(manifestSchema);
  const validateReceiptSchema = ajv.compile(receiptSchema);
  const schemaErrors = (validator) => JSON.stringify(validator.errors, null, 2);
  const expectValid = (validator, value, label) => {
    assert.equal(validator(value), true, `${label}: ${schemaErrors(validator)}`);
  };
  const expectInvalid = (validator, value, label) => {
    assert.equal(validator(value), false, `${label} unexpectedly passed schema validation`);
    assert.ok(validator.errors?.length > 0, `${label} must report at least one schema error`);
  };

  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-ajv-schema-"));
  try {
    const fixture = await writeSyntheticPromotionRepo(repoRoot);
    expectValid(validateManifestSchema, fixture.manifest, "executable Manifest");

    const passReceipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath: fixture.manifestPath,
      runId: "schema-pass-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(passReceipt.result, "pass");
    expectValid(validateReceiptSchema, passReceipt, "pass Receipt");

    const a24Binding = fixture.manifest.evidenceBindings.find(({ role }) => role === "A24");
    assert.ok(a24Binding);
    const a24Path = path.join(repoRoot, a24Binding.path);
    const a24Bytes = await readFile(a24Path);
    await rm(a24Path);
    await commitSyntheticFixture(repoRoot, "remove required A24 evidence for schema instance");
    const blockedReceipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath: fixture.manifestPath,
      runId: "schema-blocked-001",
      producedAt: "2026-08-25T01:05:00.000Z"
    });
    assert.equal(blockedReceipt.result, "blocked");
    expectValid(validateReceiptSchema, blockedReceipt, "blocked Receipt");

    await writeFile(a24Path, a24Bytes);
    await commitSyntheticFixture(repoRoot, "restore required A24 evidence for schema instance");
    const practicePath = fixture.manifest.candidateArtifacts.find(({ kind }) => kind === "practice")?.path;
    assert.ok(practicePath);
    await writeFile(path.join(repoRoot, practicePath), "{\"record\":{\"answer\":13}}\n");
    await commitSyntheticFixture(repoRoot, "commit candidate drift for fail schema instance");
    const failReceipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath: fixture.manifestPath,
      runId: "schema-fail-001",
      producedAt: "2026-08-25T01:10:00.000Z"
    });
    assert.equal(failReceipt.result, "fail");
    expectValid(validateReceiptSchema, failReceipt, "fail Receipt");

    const unknownManifestField = structuredClone(fixture.manifest);
    unknownManifestField.shellCommand = "echo unsafe";
    expectInvalid(validateManifestSchema, unknownManifestField, "unknown Manifest field");

    const uppercaseReviewedCommit = structuredClone(fixture.manifest);
    uppercaseReviewedCommit.evidenceBindings[0].reviewedCommit = "A".repeat(40);
    expectInvalid(validateManifestSchema, uppercaseReviewedCommit, "uppercase reviewedCommit");

    const badSourceVersion = structuredClone(fixture.manifest);
    badSourceVersion.parentPackage.sourceVersion = `sha256:${"A".repeat(64)}`;
    expectInvalid(validateManifestSchema, badSourceVersion, "bad sourceVersion");

    const missingReceiptMode = structuredClone(passReceipt);
    delete missingReceiptMode.mode;
    expectInvalid(validateReceiptSchema, missingReceiptMode, "Receipt missing mode");

    const missingEvidenceDigest = structuredClone(passReceipt);
    delete missingEvidenceDigest.checkResults[0].evidenceDigest;
    expectInvalid(validateReceiptSchema, missingEvidenceDigest, "Receipt check missing evidenceDigest");

    const unknownCheckField = structuredClone(passReceipt);
    unknownCheckField.checkResults[0].unregisteredResult = true;
    expectInvalid(validateReceiptSchema, unknownCheckField, "Receipt check unknown field");
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("phase-2 closure and lifecycle registry require independent replay, owner evidence, CI, and branch protection", {
  timeout: 60_000
}, async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-phase2-closure-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const canonical = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "canonical-shadow-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    const independent = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "independent-replay-001",
      producedAt: "2026-08-25T01:05:00.000Z",
      ciMetadata: { jobId: "independent-job" }
    });
    assert.equal(canonical.result, "pass");
    assert.equal(independent.result, "pass");
    assert.equal(canonical.semanticReceiptDigest, independent.semanticReceiptDigest);
    assert.notEqual(canonical.rawReceiptDigest, independent.rawReceiptDigest);

    const bind = (value) => ({
      value,
      rawBytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
    });
    const artifactRef = (role, artifactPath, bound) => ({
      role,
      path: artifactPath,
      rawSha256: gateLib.sha256(bound.rawBytes),
      semanticSha256: gateLib.fingerprint(bound.value),
      result: "pass"
    });
    const receiptRef = (role, receiptPath, bound) => ({
      role,
      path: receiptPath,
      rawSha256: gateLib.sha256(bound.rawBytes),
      rawReceiptDigest: bound.value.rawReceiptDigest,
      semanticReceiptDigest: bound.value.semanticReceiptDigest,
      runId: bound.value.runMetadata.runId,
      result: "pass"
    });
    const canonicalBound = bind(canonical);
    const independentBound = bind(independent);
    const commonPostRun = {
      result: "pass",
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      candidateDigest: manifest.candidateDigest,
      sourceCommit: manifest.sourceCommit,
      targetBaselineCommit: manifest.targetBaselineCommit,
      checkerVersion: manifest.checkerVersion,
      canonicalRunId: canonical.runMetadata.runId,
      independentRunId: independent.runMetadata.runId,
      canonicalRawReceiptDigest: canonical.rawReceiptDigest,
      independentRawReceiptDigest: independent.rawReceiptDigest,
      semanticReceiptDigest: canonical.semanticReceiptDigest
    };
    const a11Bound = bind({
      schemaVersion: "promotion-a11-postrun.v1",
      role: "A11",
      ...commonPostRun,
      distinctRunIds: true,
      semanticMatch: true,
      independentReplayCompleted: true
    });
    const a22Bound = bind({
      schemaVersion: "promotion-a22-postrun.v1",
      role: "A22",
      ...commonPostRun,
      shadowExecuted: true,
      rollbackRehearsed: true,
      replayCompleted: true,
      noDeployment: true,
      noProductionWrite: true
    });
    const { stdout: compositionStdout } = await execFileAsync(
      "git",
      ["-C", repoRoot, "rev-parse", "HEAD"],
      { shell: false, maxBuffer: 64 * 1024 }
    );
    const manifestRawSha256 = gateLib.sha256(await readFile(path.join(repoRoot, manifestPath)));
    const ciBound = bind({
      schemaVersion: "promotion-ci-proof.v1",
      role: "A11",
      result: "pass",
      checkName: "promotion-shadow-gate",
      conclusion: "success",
      compositionCommit: compositionStdout.trim(),
      manifestRawSha256,
      candidateDigest: manifest.candidateDigest,
      targetBaselineCommit: manifest.targetBaselineCommit,
      semanticReceiptDigest: canonical.semanticReceiptDigest,
      trustBoundary: "Hash-bound repository evidence; external CI and branch-protection API authenticity requires independent readback."
    });
    const requiredBound = bind({
      schemaVersion: "promotion-required-check-proof.v1",
      role: "A22",
      result: "pass",
      branch: "main",
      contexts: ["promotion-shadow-gate", "validate"],
      compositionCommit: compositionStdout.trim(),
      required: true,
      trustBoundary: "Hash-bound repository evidence; external CI and branch-protection API authenticity requires independent readback."
    });
    const evidenceIndex = JSON.parse(
      await readFile(path.join(repoRoot, manifest.evidenceIndex.path), "utf8")
    );
    const closureBase = {
      schemaVersion: gateLib.PROMOTION_CLOSURE_SCHEMA_VERSION,
      binding: {
        gateId: manifest.gateId,
        pilotUnitId: manifest.pilotUnitId,
        attemptId: manifest.attemptId,
        parentPackageId: manifest.parentPackage.id,
        candidateDigest: manifest.candidateDigest,
        sourceCommit: manifest.sourceCommit,
        targetBaselineCommit: manifest.targetBaselineCommit,
        checkerVersion: manifest.checkerVersion,
        checkerReleaseDigest: gateLib.fingerprint(manifest.checkerRelease)
      },
      manifest: { path: manifestPath, rawSha256: manifestRawSha256 },
      evidenceIndex: structuredClone(manifest.evidenceIndex),
      receipts: {
        canonical: receiptRef("A23", "coordination/integration/receipts/canonical.json", canonicalBound),
        independent: receiptRef("A11", "coordination/integration/receipts/independent.json", independentBound)
      },
      postRunEvidence: {
        a11: artifactRef("A11", "coordination/integration/evidence/a11-postrun.json", a11Bound),
        a22: artifactRef("A22", "coordination/integration/evidence/a22-postrun.json", a22Bound)
      },
      ciProof: artifactRef("A11", "coordination/integration/evidence/ci-proof.json", ciBound),
      requiredCheckProof: artifactRef(
        "A22",
        "coordination/integration/evidence/required-check-proof.json",
        requiredBound
      ),
      unmetConditions: [],
      trustBoundary: "Hash-bound repository evidence; external CI and branch-protection API authenticity requires independent readback."
    };
    const closure = gateLib.attachPromotionClosureDigest(closureBase);
    const closureContext = {
      manifest,
      evidenceIndex,
      canonicalReceipt: canonicalBound,
      independentReceipt: independentBound,
      a11PostRun: a11Bound,
      a22PostRun: a22Bound,
      ciProof: ciBound,
      requiredCheckProof: requiredBound
    };
    assert.deepEqual(gateLib.validatePromotionClosure(closure, closureContext), {
      result: "pass",
      closureDigest: closure.closureDigest
    });

    const genesis = gateLib.attachLifecycleEventDigest({
      sequence: 1,
      eventId: "attempt-001-candidate-hold",
      attemptId: manifest.attemptId,
      fromState: null,
      toState: "candidate_hold",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: null,
      previousEventDigest: null
    });
    const ready = gateLib.attachLifecycleEventDigest({
      sequence: 2,
      eventId: "attempt-001-shadow-ready",
      attemptId: manifest.attemptId,
      fromState: "candidate_hold",
      toState: "shadow_ready",
      manifest: { path: manifestPath, rawSha256: manifestRawSha256 },
      evidenceIndex: structuredClone(manifest.evidenceIndex),
      closure: null,
      disposition: null,
      previousEventDigest: genesis.eventDigest
    });
    const passed = gateLib.attachLifecycleEventDigest({
      sequence: 3,
      eventId: "attempt-001-shadow-passed",
      attemptId: manifest.attemptId,
      fromState: "shadow_ready",
      toState: "shadow_passed",
      manifest: null,
      evidenceIndex: null,
      closure: {
        path: "coordination/integration/closures/attempt-001.json",
        digest: closure.closureDigest
      },
      disposition: null,
      previousEventDigest: ready.eventDigest
    });
    const readyRegistry = gateLib.attachLifecycleRegistryDigest({
      schemaVersion: gateLib.PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_ready",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "not-shadow-mature",
      events: [genesis, ready]
    });
    assert.deepEqual(gateLib.validatePromotionLifecycleRegistry(readyRegistry, {
      manifest,
      evidenceIndex,
      manifestPath,
      manifestRawSha256
    }), {
      result: "pass",
      state: "shadow_ready",
      registryDigest: readyRegistry.registryDigest
    });
    const registry = gateLib.attachLifecycleRegistryDigest({
      schemaVersion: gateLib.PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_passed",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "Shadow-mature / live-unproven",
      events: [genesis, ready, passed]
    });
    const registryContext = {
      manifest,
      evidenceIndex,
      manifestPath,
      manifestRawSha256,
      closure,
      closurePath: "coordination/integration/closures/attempt-001.json",
      closureContext
    };
    assert.deepEqual(gateLib.validatePromotionLifecycleRegistry(registry, registryContext), {
      result: "pass",
      state: "shadow_passed",
      registryDigest: registry.registryDigest
    });
    const decision = gateLib.renderPromotionDecisionMarkdown({ receipt: canonical, closure, registry });
    for (const expected of [
      "Parent package status: candidate-only",
      "Pilot unit status: shadow_passed",
      "Live allowed: false",
      "Live evidence: none",
      "Maturity claim: Shadow-mature / live-unproven",
      canonical.rawReceiptDigest,
      canonical.semanticReceiptDigest,
      closure.closureDigest,
      registry.registryDigest
    ]) assert.equal(decision.includes(expected), true, expected);

    const digestTamper = structuredClone(closure);
    digestTamper.closureDigest = "0".repeat(64);
    assert.throws(
      () => gateLib.validatePromotionClosure(digestTamper, closureContext),
      (error) => error?.code === "CLOSURE_DIGEST_MISMATCH"
    );
    const sameRunReceipt = structuredClone(independent);
    sameRunReceipt.runMetadata.runId = canonical.runMetadata.runId;
    const sameRunBound = bind(gateLib.attachReceiptDigests(sameRunReceipt));
    const sameRunClosure = structuredClone(closure);
    sameRunClosure.receipts.independent = receiptRef(
      "A11",
      sameRunClosure.receipts.independent.path,
      sameRunBound
    );
    assert.throws(
      () => gateLib.validatePromotionClosure(
        gateLib.attachPromotionClosureDigest(sameRunClosure),
        { ...closureContext, independentReceipt: sameRunBound }
      ),
      (error) => error?.code === "CLOSURE_REPLAY_MISMATCH"
    );
    const differentSemanticReceipt = structuredClone(independent);
    differentSemanticReceipt.candidateSourceProof.preAggregateDigest = "0".repeat(64);
    differentSemanticReceipt.candidateSourceProof.postAggregateDigest = "0".repeat(64);
    refreshReceiptCheckEvidenceDigest(differentSemanticReceipt, "candidate-integrity");
    const differentSemanticBound = bind(gateLib.attachReceiptDigests(differentSemanticReceipt));
    const differentSemanticClosure = structuredClone(closure);
    differentSemanticClosure.receipts.independent = receiptRef(
      "A11",
      differentSemanticClosure.receipts.independent.path,
      differentSemanticBound
    );
    assert.throws(
      () => gateLib.validatePromotionClosure(
        gateLib.attachPromotionClosureDigest(differentSemanticClosure),
        { ...closureContext, independentReceipt: differentSemanticBound }
      ),
      (error) => error?.code === "CLOSURE_REPLAY_MISMATCH"
    );
    const reusedEvidence = structuredClone(closure);
    reusedEvidence.postRunEvidence.a22.path = reusedEvidence.postRunEvidence.a11.path;
    const reusedEvidenceDigested = gateLib.attachPromotionClosureDigest(reusedEvidence);
    assert.throws(
      () => gateLib.validatePromotionClosure(reusedEvidenceDigested, closureContext),
      (error) => error?.code === "CLOSURE_EVIDENCE_REUSE"
    );
    const wrongCiBound = bind({ ...ciBound.value, checkName: "self-reported-shadow" });
    const wrongCi = structuredClone(closure);
    wrongCi.ciProof = artifactRef("A11", wrongCi.ciProof.path, wrongCiBound);
    assert.throws(
      () => gateLib.validatePromotionClosure(
        gateLib.attachPromotionClosureDigest(wrongCi),
        { ...closureContext, ciProof: wrongCiBound }
      ),
      (error) => error?.code === "CLOSURE_CI_PROOF_INVALID"
    );
    const wrongRequiredBound = bind({ ...requiredBound.value, contexts: ["promotion-shadow-gate"] });
    const wrongRequired = structuredClone(closure);
    wrongRequired.requiredCheckProof = artifactRef("A22", wrongRequired.requiredCheckProof.path, wrongRequiredBound);
    assert.throws(
      () => gateLib.validatePromotionClosure(
        gateLib.attachPromotionClosureDigest(wrongRequired),
        { ...closureContext, requiredCheckProof: wrongRequiredBound }
      ),
      (error) => error?.code === "CLOSURE_REQUIRED_CHECK_INVALID"
    );
    const selfReported = structuredClone(registry);
    selfReported.events[2].closure.digest = "0".repeat(64);
    selfReported.events[2] = gateLib.attachLifecycleEventDigest(selfReported.events[2]);
    selfReported.registryDigest = gateLib.attachLifecycleRegistryDigest(selfReported).registryDigest;
    assert.throws(
      () => gateLib.validatePromotionLifecycleRegistry(selfReported, registryContext),
      (error) => error?.code === "REGISTRY_TRANSITION_INVALID"
    );
    const skippedReady = gateLib.attachLifecycleRegistryDigest({ ...registry, events: [genesis, passed] });
    assert.throws(
      () => gateLib.validatePromotionLifecycleRegistry(skippedReady, registryContext),
      (error) => error?.code === "REGISTRY_EVENT_CHAIN_INVALID"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("a proven new legacy conflict closes the immutable attempt as repair_required", {
  timeout: 60_000
}, async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-repair-disposition-"));
  try {
    const { manifest, manifestPath } = await writeSyntheticPromotionRepo(repoRoot);
    const conflictPath = "data/generated-content/new-unratcheted-review-pack/question-pack.json";
    await mkdir(path.dirname(path.join(repoRoot, conflictPath)), { recursive: true });
    await writeFile(path.join(repoRoot, conflictPath), `${JSON.stringify({
      questions: [{ id: "new-conflict-row", mathQaStatus: "pending-manual" }]
    }, null, 2)}\n`);
    const entrypoint = CANONICAL_RUNTIME_ENTRYPOINTS[0];
    const originalSource = await readFile(path.join(repoRoot, entrypoint), "utf8");
    await writeFile(
      path.join(repoRoot, entrypoint),
      `${originalSource}\nimport conflict from "@/${conflictPath}";\nvoid conflict;\n`
    );
    await sealSyntheticRuntimeBaseline(
      repoRoot,
      manifest,
      manifestPath,
      "add proven unratcheted conflict for disposition"
    );
    const receipt = await gateLib.runShadowPilot(repoRoot, {
      manifestPath,
      runId: "legacy-conflict-disposition-001",
      producedAt: "2026-08-25T01:00:00.000Z"
    });
    assert.equal(receipt.result, "fail");
    assert.equal(receipt.exitReason.code, "LEGACY_NEW_CONFLICT");
    assert.equal(receipt.shadowOutput.outputs.length, 3);
    assert.equal(receipt.rollbackProof.verifiedAbsent, true);
    assert.equal(receipt.rollbackProof.rootRemoved, true);
    assert.equal(receipt.rollbackProof.preimageDigest, receipt.rollbackProof.postRollbackDigest);
    assert.equal(receipt.candidateSourceProof.equal, true);
    assert.equal(receipt.sourceSnapshots.equal, true);
    assert.deepEqual(receipt.forbiddenDiff, { result: "pass", changedPaths: [] });
    const receiptRawBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
    const authorizationReference = "a18-a23-attempt-001-repair-disposition";
    const bindAuthority = (role) => {
      const value = {
        schemaVersion: "promotion-disposition-authority.v1",
        role,
        result: "approve",
        pilotUnitId: manifest.pilotUnitId,
        attemptId: manifest.attemptId,
        candidateDigest: manifest.candidateDigest,
        sourceCommit: manifest.sourceCommit,
        targetBaselineCommit: manifest.targetBaselineCommit,
        checkerVersion: manifest.checkerVersion,
        receiptRawSha256: gateLib.sha256(receiptRawBytes),
        rawReceiptDigest: receipt.rawReceiptDigest,
        semanticReceiptDigest: receipt.semanticReceiptDigest,
        runId: receipt.runMetadata.runId,
        reasonCode: receipt.exitReason.code,
        decision: "repair_required",
        authorizationReference
      };
      return { value, rawBytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`) };
    };
    const a18Authority = bindAuthority("A18");
    const a23Authority = bindAuthority("A23");
    const authorityReference = (role, artifactPath, bound) => ({
      role,
      path: artifactPath,
      rawSha256: gateLib.sha256(bound.rawBytes),
      semanticSha256: gateLib.fingerprint(bound.value),
      result: "approve"
    });
    const disposition = gateLib.attachPromotionDispositionDigest({
      schemaVersion: gateLib.PROMOTION_DISPOSITION_SCHEMA_VERSION,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      receipt: {
        path: "coordination/integration/receipts/legacy-conflict-disposition-001.json",
        rawSha256: gateLib.sha256(receiptRawBytes),
        rawReceiptDigest: receipt.rawReceiptDigest,
        semanticReceiptDigest: receipt.semanticReceiptDigest,
        runId: receipt.runMetadata.runId,
        result: "fail"
      },
      decision: "repair_required",
      reasonCode: "LEGACY_NEW_CONFLICT",
      authorityRoles: ["A18", "A23"],
      authorityEvidence: {
        a18: authorityReference(
          "A18",
          "coordination/integration/evidence/a18-repair-authority.json",
          a18Authority
        ),
        a23: authorityReference(
          "A23",
          "coordination/integration/evidence/a23-repair-authority.json",
          a23Authority
        )
      },
      authorizationReference,
      newAttemptRequired: true
    });
    assert.equal(
      gateLib.validatePromotionDisposition(disposition, {
        manifest,
        receipt,
        receiptRawBytes,
        a18Authority,
        a23Authority
      }),
      disposition
    );
    const manifestRawSha256 = gateLib.sha256(await readFile(path.join(repoRoot, manifestPath)));
    const evidenceIndex = JSON.parse(
      await readFile(path.join(repoRoot, manifest.evidenceIndex.path), "utf8")
    );
    const genesis = gateLib.attachLifecycleEventDigest({
      sequence: 1,
      eventId: "attempt-001-candidate-hold",
      attemptId: manifest.attemptId,
      fromState: null,
      toState: "candidate_hold",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: null,
      previousEventDigest: null
    });
    const ready = gateLib.attachLifecycleEventDigest({
      sequence: 2,
      eventId: "attempt-001-shadow-ready",
      attemptId: manifest.attemptId,
      fromState: "candidate_hold",
      toState: "shadow_ready",
      manifest: { path: manifestPath, rawSha256: manifestRawSha256 },
      evidenceIndex: structuredClone(manifest.evidenceIndex),
      closure: null,
      disposition: null,
      previousEventDigest: genesis.eventDigest
    });
    const repair = gateLib.attachLifecycleEventDigest({
      sequence: 3,
      eventId: "attempt-001-repair-required",
      attemptId: manifest.attemptId,
      fromState: "shadow_ready",
      toState: "repair_required",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: {
        path: "coordination/integration/dispositions/attempt-001.json",
        digest: disposition.dispositionDigest
      },
      previousEventDigest: ready.eventDigest
    });
    const registry = gateLib.attachLifecycleRegistryDigest({
      schemaVersion: gateLib.PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION,
      pilotUnitId: manifest.pilotUnitId,
      attemptId: manifest.attemptId,
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "repair_required",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "not-shadow-mature",
      events: [genesis, ready, repair]
    });
    const context = {
      manifest,
      evidenceIndex,
      manifestPath,
      manifestRawSha256,
      disposition,
      dispositionPath: "coordination/integration/dispositions/attempt-001.json",
      receipt,
      receiptRawBytes,
      a18Authority,
      a23Authority
    };
    assert.deepEqual(gateLib.validatePromotionLifecycleRegistry(registry, context), {
      result: "pass",
      state: "repair_required",
      registryDigest: registry.registryDigest
    });
    const decision = gateLib.renderPromotionDecisionMarkdown({ receipt, disposition, registry });
    for (const expected of [
      "Parent package status: candidate-only",
      "Pilot unit status: repair_required",
      "Gate result: fail",
      "Exit reason: LEGACY_NEW_CONFLICT",
      "New candidate version and attempt required: true",
      "Live allowed: false",
      "Maturity claim: not-shadow-mature",
      receipt.rawReceiptDigest,
      receipt.semanticReceiptDigest,
      disposition.dispositionDigest,
      registry.registryDigest
    ]) assert.equal(decision.includes(expected), true, expected);

    const forgedDisposition = structuredClone(disposition);
    forgedDisposition.dispositionDigest = "0".repeat(64);
    assert.throws(
      () => gateLib.validatePromotionDisposition(forgedDisposition, {
        manifest,
        receipt,
        receiptRawBytes,
        a18Authority,
        a23Authority
      }),
      (error) => error?.code === "DISPOSITION_DIGEST_MISMATCH"
    );
    const reusedAuthority = gateLib.attachPromotionDispositionDigest({
      ...disposition,
      authorityEvidence: {
        ...disposition.authorityEvidence,
        a23: {
          ...disposition.authorityEvidence.a23,
          path: disposition.authorityEvidence.a18.path
        }
      }
    });
    assert.throws(
      () => gateLib.validatePromotionDisposition(reusedAuthority, {
        manifest,
        receipt,
        receiptRawBytes,
        a18Authority,
        a23Authority
      }),
      (error) => error?.code === "DISPOSITION_AUTHORITY_REUSE"
    );
    assert.throws(
      () => gateLib.validatePromotionDisposition(disposition, {
        manifest,
        receipt,
        receiptRawBytes,
        a18Authority,
        a23Authority: a18Authority
      }),
      (error) => error?.code === "DISPOSITION_AUTHORITY_INVALID"
    );
    const retryEvent = gateLib.attachLifecycleEventDigest({
      ...repair,
      sequence: 4,
      eventId: "attempt-001-illegal-retry",
      fromState: "repair_required",
      toState: "shadow_ready",
      previousEventDigest: repair.eventDigest
    });
    const illegalRetry = gateLib.attachLifecycleRegistryDigest({
      ...registry,
      pilotUnitStatus: "shadow_ready",
      events: [genesis, ready, repair, retryEvent]
    });
    assert.throws(
      () => gateLib.validatePromotionLifecycleRegistry(illegalRetry, context),
      (error) => error?.code === "REGISTRY_BINDING_INVALID"
    );
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("attempt-history proof rejects frozen artifact overwrite, delete-readd, duplicate attempts, and terminal rewrite", {
  timeout: 60_000
}, async () => {
  const roots = [];
  const manifestPath = "coordination/integration/pilots/attempt-001.manifest.json";
  const registryPath = "coordination/integration/pilots/attempt-001/registry.json";
  const pilotUnitId = "us-ca-math-rag-v2-g6-ratios-v1";
  const attemptId = "attempt-001";
  const writeJson = async (repoRoot, relativePath, value) => {
    await mkdir(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
    await writeFile(path.join(repoRoot, relativePath), bytes);
    return bytes;
  };
  const initialize = async () => {
    const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-attempt-history-"));
    roots.push(repoRoot);
    await execFileAsync("git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    const manifest = makeManifest({
      pilotUnitId,
      attemptId,
      sourceCommit: "2".repeat(40),
      targetBaselineCommit: "3".repeat(40),
      checkerVersion: gateLib.PROMOTION_CHECKER_VERSION
    });
    const manifestBytes = await writeJson(repoRoot, manifestPath, manifest);
    await writeJson(repoRoot, "coordination/integration/pilots/attempt-001/evidence-index.json", {
      schemaVersion: "promotion-evidence-index.v1",
      entries: []
    });
    await mkdir(path.join(repoRoot, "coordination/integration/pilots/attempt-001"), { recursive: true });
    await writeFile(
      path.join(repoRoot, "coordination/integration/pilots/attempt-001/decision.md"),
      "# Derived decision\n"
    );
    await commitSyntheticFixture(repoRoot, "add immutable attempt manifest");
    const genesis = gateLib.attachLifecycleEventDigest({
      sequence: 1,
      eventId: "attempt-001-candidate-hold",
      attemptId,
      fromState: null,
      toState: "candidate_hold",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: null,
      previousEventDigest: null
    });
    const ready = gateLib.attachLifecycleEventDigest({
      sequence: 2,
      eventId: "attempt-001-shadow-ready",
      attemptId,
      fromState: "candidate_hold",
      toState: "shadow_ready",
      manifest: { path: manifestPath, rawSha256: gateLib.sha256(manifestBytes) },
      evidenceIndex: {
        path: "coordination/integration/evidence/attempt-001.index.json",
        rawSha256: "4".repeat(64)
      },
      closure: null,
      disposition: null,
      previousEventDigest: genesis.eventDigest
    });
    const registry = gateLib.attachLifecycleRegistryDigest({
      schemaVersion: gateLib.PROMOTION_LIFECYCLE_REGISTRY_SCHEMA_VERSION,
      pilotUnitId,
      attemptId,
      parentPackageStatus: "candidate-only",
      pilotUnitStatus: "shadow_ready",
      liveAllowed: false,
      liveEvidence: "none",
      maturityClaim: "not-shadow-mature",
      events: [genesis, ready]
    });
    await writeJson(repoRoot, registryPath, registry);
    await commitSyntheticFixture(repoRoot, "freeze attempt at shadow ready");
    return { repoRoot, manifest, manifestBytes, genesis, ready, registry };
  };
  const proofOptions = { manifestPath, pilotUnitId, attemptId };
  try {
    const passing = await initialize();
    const proof = await gateLib.collectPromotionAttemptHistoryProof(passing.repoRoot, proofOptions);
    assert.equal(proof.result, "pass");
    assert.equal(proof.historyScope, "execution-head-first-parent");
    assert.equal(proof.otherRefsCovered, false);
    assert.equal(proof.registeredManifest, true);
    assert.equal(proof.frozenAttemptCount, 1);
    assert.equal(proof.terminalAttemptCount, 0);
    assert.equal(proof.currentArtifactCount, 2);

    passing.manifest.targetBaselineCommit = "7".repeat(40);
    await writeJson(passing.repoRoot, manifestPath, passing.manifest);
    await commitSyntheticFixture(passing.repoRoot, "illegally overwrite frozen manifest");
    await assert.rejects(
      gateLib.collectPromotionAttemptHistoryProof(passing.repoRoot, proofOptions),
      (error) => error?.code === "ATTEMPT_ARTIFACT_OVERWRITTEN"
    );

    const deleted = await initialize();
    await rm(path.join(deleted.repoRoot, manifestPath));
    await commitSyntheticFixture(deleted.repoRoot, "illegally delete frozen manifest");
    await writeJson(deleted.repoRoot, manifestPath, deleted.manifest);
    await commitSyntheticFixture(deleted.repoRoot, "illegally re-add frozen manifest");
    await assert.rejects(
      gateLib.collectPromotionAttemptHistoryProof(deleted.repoRoot, proofOptions),
      (error) => error?.code === "ATTEMPT_ARTIFACT_DELETED"
    );

    const duplicated = await initialize();
    await writeJson(
      duplicated.repoRoot,
      "coordination/integration/pilots/attempt-001-copy.manifest.json",
      duplicated.manifest
    );
    await commitSyntheticFixture(duplicated.repoRoot, "illegally duplicate immutable attempt id");
    await assert.rejects(
      gateLib.collectPromotionAttemptHistoryProof(duplicated.repoRoot, proofOptions),
      (error) => error?.code === "ATTEMPT_ID_DUPLICATE"
    );

    const terminal = await initialize();
    const repair = gateLib.attachLifecycleEventDigest({
      sequence: 3,
      eventId: "attempt-001-repair-required",
      attemptId,
      fromState: "shadow_ready",
      toState: "repair_required",
      manifest: null,
      evidenceIndex: null,
      closure: null,
      disposition: {
        path: "coordination/integration/dispositions/attempt-001.json",
        digest: "5".repeat(64)
      },
      previousEventDigest: terminal.ready.eventDigest
    });
    const repairRegistry = gateLib.attachLifecycleRegistryDigest({
      ...terminal.registry,
      pilotUnitStatus: "repair_required",
      events: [terminal.genesis, terminal.ready, repair]
    });
    await writeJson(terminal.repoRoot, registryPath, repairRegistry);
    await commitSyntheticFixture(terminal.repoRoot, "close attempt as repair required");
    assert.equal(
      (await gateLib.collectPromotionAttemptHistoryProof(terminal.repoRoot, proofOptions)).terminalAttemptCount,
      1
    );
    const passed = gateLib.attachLifecycleEventDigest({
      ...repair,
      eventId: "attempt-001-shadow-passed",
      toState: "shadow_passed",
      closure: {
        path: "coordination/integration/closures/attempt-001.json",
        digest: "6".repeat(64)
      },
      disposition: null
    });
    const forgedPassedRegistry = gateLib.attachLifecycleRegistryDigest({
      ...repairRegistry,
      pilotUnitStatus: "shadow_passed",
      maturityClaim: "Shadow-mature / live-unproven",
      events: [terminal.genesis, terminal.ready, passed]
    });
    await writeJson(terminal.repoRoot, registryPath, forgedPassedRegistry);
    await commitSyntheticFixture(terminal.repoRoot, "illegally rewrite failed terminal state");
    await assert.rejects(
      gateLib.collectPromotionAttemptHistoryProof(terminal.repoRoot, proofOptions),
      (error) => error?.code === "ATTEMPT_TERMINAL_REWRITE"
    );
  } finally {
    await Promise.all(roots.map((repoRoot) => rm(repoRoot, { recursive: true, force: true })));
  }
});

test("attempt-history proof follows execution HEAD first-parent across merges and does not claim divergent-ref coverage", {
  timeout: 30_000
}, async () => {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "mais-promotion-attempt-history-dag-"));
  const manifestPath = "coordination/integration/pilots/left.manifest.json";
  const makeHistoryManifest = (pilotUnitId, attemptId, revision = 1) => makeManifest({
    pilotUnitId,
    attemptId,
    sourceCommit: "1".repeat(40),
    targetBaselineCommit: String(revision % 10).repeat(40),
    checkerVersion: gateLib.PROMOTION_CHECKER_VERSION
  });
  const writeHistoryManifest = async (relativePath, value) => {
    await mkdir(path.dirname(path.join(repoRoot, relativePath)), { recursive: true });
    await writeFile(path.join(repoRoot, relativePath), `${JSON.stringify(value, null, 2)}\n`);
  };
  try {
    await execFileAsync("git", ["init", "--quiet", repoRoot], { shell: false, maxBuffer: 64 * 1024 });
    await mkdir(path.join(repoRoot, "synthetic"), { recursive: true });
    await writeFile(path.join(repoRoot, "synthetic/base.txt"), "base\n");
    await commitSyntheticFixture(repoRoot, "DAG base");
    const { stdout: baseStdout } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "HEAD"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    const baseCommit = baseStdout.trim();
    await execFileAsync("git", ["-C", repoRoot, "switch", "-c", "attempt-left"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    await writeHistoryManifest(
      manifestPath,
      makeHistoryManifest("us-ca-math-rag-v2-g6-ratios-v1", "attempt-001")
    );
    await commitSyntheticFixture(repoRoot, "left attempt");
    await execFileAsync("git", ["-C", repoRoot, "switch", "-c", "attempt-right", baseCommit], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    await writeHistoryManifest(
      "coordination/integration/pilots/right.manifest.json",
      makeHistoryManifest("us-ca-math-rag-v2-g6-ratios-v1", "attempt-002")
    );
    await commitSyntheticFixture(repoRoot, "right attempt");
    await execFileAsync("git", ["-C", repoRoot, "switch", "attempt-left"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    await execFileAsync("git", [
      "-C", repoRoot,
      "-c", "user.name=Promotion Gate Test",
      "-c", "user.email=promotion-gate@example.invalid",
      "merge", "--quiet", "--no-ff", "attempt-right", "-m", "merge parallel attempt artifacts"
    ], { shell: false, maxBuffer: 64 * 1024 });
    const merged = await gateLib.collectPromotionAttemptHistoryProof(repoRoot, {
      manifestPath,
      pilotUnitId: "us-ca-math-rag-v2-g6-ratios-v1",
      attemptId: "attempt-001"
    });
    assert.equal(merged.result, "pass");
    assert.equal(merged.attemptCount, 2);
    assert.equal(merged.historyScope, "execution-head-first-parent");

    await execFileAsync("git", ["-C", repoRoot, "switch", "-c", "divergent-unmerged", baseCommit], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    await writeHistoryManifest(
      manifestPath,
      makeHistoryManifest("us-ca-math-rag-v2-g6-ratios-v1", "attempt-001", 99)
    );
    await commitSyntheticFixture(repoRoot, "divergent unmerged attempt rewrite");
    await execFileAsync("git", ["-C", repoRoot, "switch", "attempt-left"], {
      shell: false,
      maxBuffer: 64 * 1024
    });
    const scoped = await gateLib.collectPromotionAttemptHistoryProof(repoRoot, {
      manifestPath,
      pilotUnitId: "us-ca-math-rag-v2-g6-ratios-v1",
      attemptId: "attempt-001"
    });
    assert.equal(scoped.result, "pass");
    assert.equal(scoped.otherRefsCovered, false);
    assert.match(scoped.historyTrustBoundary, /divergent ref uniqueness requires required PR\/main post-merge/u);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
