import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT,
  type MathSceneV2ClosureEvidenceOwnerRow,
  type MathSceneV2ClosureEvidencePackage
} from "./mathSceneV2ClosureEvidencePackage";
import {
  buildMathSceneV2CompletionRerunPlan,
  mathSceneV2CompletionRerunPlanDataAttributes,
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT
} from "./mathSceneV2CompletionRerunPlan";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;

const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "a06-review-package-split=covered;a11-browser-visual-interaction-regression=pending-owner-evidence;a18-a06-teaching-quality-confirmation=pending-owner-evidence;a22-clean-release-gate=pending-owner-evidence";

const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "a06-review-package-split,a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate";

const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "a06-review-package-split=A06;a11-browser-visual-interaction-regression=A11+A06;a18-a06-teaching-quality-confirmation=A18+A06;a22-clean-release-gate=A22";

const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "a06-review-package-split=accepted-source-evidence;a11-browser-visual-interaction-regression=missing-owner-evidence;a18-a06-teaching-quality-confirmation=pending-a18-final-decisions;a22-clean-release-gate=blocked-owner-action";

const finalObjectiveSubmissionBridgeVerifiedClosureStatus = "complete";

function rerunPlanFixture(
  options: { duplicateFirstRequiredEvidence?: boolean; ownerEvidenceCovered?: boolean } = {}
) {
  return buildMathSceneV2CompletionRerunPlan(closureEvidencePackageFixture(options));
}

function ownerRowFixture(
  row: Omit<
    MathSceneV2ClosureEvidenceOwnerRow,
    | "sourceArchitectureBulkCourseGenerationAllowed"
    | "sourceArchitectureFutureInvocationScope"
    | "sourceArchitectureHandoffStatus"
    | "summary"
  >
): MathSceneV2ClosureEvidenceOwnerRow {
  return {
    ...row,
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    summary: [
      row.ownerAgentId,
      `requirements=${row.requirementIds.join(",") || "none"}`,
      `actions=${row.actionRequestCount}`,
      `missingEvidence=${row.missingEvidenceCount}`,
      `verdicts=${row.evidenceVerdicts.join(",") || "none"}`
    ].join(":")
  };
}

function ownerRowsFixture(missingEvidenceCovered: boolean): MathSceneV2ClosureEvidenceOwnerRow[] {
  const missingEvidenceCount = missingEvidenceCovered ? 0 : undefined;

  return [
    ownerRowFixture({
      actionRequestCount: missingEvidenceCovered ? 0 : 3,
      blockingItems: ["a11-broad-visualization-value-suite-red"],
      evidenceVerdicts: ["missing-owner-evidence"],
      missingEvidenceCount: missingEvidenceCount ?? 6,
      ownerAgentId: "A11",
      requirementIds: ["a11-browser-visual-interaction-regression"],
      requiredActions: [
        "adopt-hk-grade-split-packages",
        "keep-non-hk-tracks-out-of-hk-demo-sweep",
        "update-projection-views-expected-list"
      ],
      supportingAgentIds: ["A06", "A22"]
    }),
    ownerRowFixture({
      actionRequestCount: missingEvidenceCovered ? 0 : 5,
      blockingItems: ["a18-final-teaching-signoff-open"],
      evidenceVerdicts: ["pending-a18-final-decisions"],
      missingEvidenceCount: missingEvidenceCount ?? 10,
      ownerAgentId: "A18",
      requirementIds: ["a18-a06-teaching-quality-confirmation"],
      requiredActions: [
        "complete-a18-final-criterion-decisions",
        "complete-a18-final-scene-signoff",
        "inspect-rendered-scene-targets",
        "open-rendered-review-routes",
        "record-approve-or-revision-decision"
      ],
      supportingAgentIds: ["A06"]
    }),
    ownerRowFixture({
      actionRequestCount: missingEvidenceCovered ? 0 : 3,
      blockingItems: ["a22-dirty-root-release-blocked", "a22-release-preflight-disk-blocked"],
      evidenceVerdicts: ["owner-gate-blocked"],
      missingEvidenceCount: missingEvidenceCount ?? 6,
      ownerAgentId: "A22",
      requirementIds: ["a22-clean-release-gate"],
      requiredActions: [
        "investigate-isolated-next-chunk-serving-after-broad-timeout",
        "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
        "run-a22-generated-artifact-cleanup-after-preserving-evidence"
      ],
      supportingAgentIds: ["A06", "A11"]
    })
  ];
}

function closureEvidencePackageFixture(
  options: { duplicateFirstRequiredEvidence?: boolean; ownerEvidenceCovered?: boolean } = {}
): MathSceneV2ClosureEvidencePackage {
  const ownerRows = ownerRowsFixture(options.ownerEvidenceCovered ?? false);
  const invalidEvidenceRecordCount = options.duplicateFirstRequiredEvidence ? 2 : 0;
  const duplicateEvidenceIds = options.duplicateFirstRequiredEvidence
    ? ["visualizationBrowserRegressionEvidence"]
    : [];
  const invalidOwnerAgentIds = options.duplicateFirstRequiredEvidence ? ["A11"] : [];
  const missingEvidenceCount = ownerRows.reduce((sum, row) => sum + row.missingEvidenceCount, 0);
  const actionRequestCount = ownerRows.reduce((sum, row) => sum + row.actionRequestCount, 0);
  const status = invalidEvidenceRecordCount > 0
    ? "blocked-invalid-owner-evidence"
    : "owner-closure-required";

  return {
    actionRequestCount,
    canMarkThreadGoalComplete: false,
    duplicateEvidenceIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: [
      ...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    incompleteRequirementCount: 3,
    invalidEvidenceRecordCount,
    invalidOwnerAgentIds,
    missingEvidenceCount,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2ClosureEvidencePackage.ts|mathSceneV2CompletionRerunPlan.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    ownerRowCount: ownerRows.length,
    ownerRows,
    provenRequirementCount: 1,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requirementCount: 4,
    sourceContract: MATH_SCENE_V2_CLOSURE_EVIDENCE_PACKAGE_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2ClosureEvidencePackage",
      `status=${status}`,
      "proven=1/4",
      "owners=A11,A18,A22",
      `missingEvidence=${missingEvidenceCount}`,
      `invalidEvidence=${invalidEvidenceRecordCount}`,
      `duplicateEvidence=${duplicateEvidenceIds.join(",") || "none"}`
    ].join(":")
  };
}

test("MAIS Manim v2 completion rerun plan orders owner evidence before owner gate reruns", () => {
  const rerunPlan = rerunPlanFixture();
  const stepsById = Object.fromEntries(rerunPlan.steps.map((step) => [step.stepId, step]));

  assert.equal(rerunPlan.sourceContract, MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT);
  assert.equal(rerunPlan.status, "owner-evidence-required");
  assert.equal(rerunPlan.canMarkThreadGoalComplete, false);
  assert.equal(rerunPlan.stepCount, 7);
  assert.equal(rerunPlan.ownerEvidenceStepCount, 3);
  assert.equal(rerunPlan.ownerGateRerunStepCount, 3);
  assert.equal(rerunPlan.finalAuditStepCount, 1);
  assert.equal(rerunPlan.missingEvidenceCount, 22);
  assert.deepEqual(rerunPlan.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(rerunPlan.steps.map((step) => step.stepId), [
    "01-owner-evidence-A11",
    "02-owner-evidence-A18",
    "03-owner-evidence-A22",
    "04-owner-gate-A11",
    "05-owner-gate-A18",
    "06-owner-gate-A22",
    "07-final-objective-audit"
  ]);

  assert.equal(stepsById["01-owner-evidence-A11"].kind, "owner-evidence-submission");
  assert.equal(stepsById["01-owner-evidence-A11"].missingEvidenceCount, 6);
  assert.deepEqual(stepsById["01-owner-evidence-A11"].requirementIds, [
    "a11-browser-visual-interaction-regression"
  ]);
  assert.ok(stepsById["04-owner-gate-A11"].requiredActions.includes("update-projection-views-expected-list"));

  assert.equal(stepsById["05-owner-gate-A18"].rerunTarget, "a18-a06-teaching-quality-confirmation");
  assert.ok(stepsById["05-owner-gate-A18"].supportingAgentIds.includes("A06"));

  assert.equal(stepsById["06-owner-gate-A22"].status, "blocked-by-owner-evidence");
  assert.equal(stepsById["06-owner-gate-A22"].rerunTarget, "a22-clean-release-gate");
  assert.ok(stepsById["06-owner-gate-A22"].blockingItems.includes("a22-release-preflight-disk-blocked"));

  assert.equal(stepsById["07-final-objective-audit"].status, "blocked-by-owner-gate-reruns");
  assert.deepEqual(stepsById["07-final-objective-audit"].ownerAgentIds, ["A11", "A18", "A22"]);
});

test("MAIS Manim v2 completion rerun plan moves covered evidence to owner gate reruns", () => {
  const rerunPlan = rerunPlanFixture({ ownerEvidenceCovered: true });
  const stepsById = Object.fromEntries(rerunPlan.steps.map((step) => [step.stepId, step]));

  assert.equal(rerunPlan.status, "owner-gate-reruns-required");
  assert.equal(rerunPlan.canMarkThreadGoalComplete, false);
  assert.equal(rerunPlan.stepCount, 4);
  assert.equal(rerunPlan.ownerEvidenceStepCount, 0);
  assert.equal(rerunPlan.ownerGateRerunStepCount, 3);
  assert.equal(rerunPlan.finalAuditStepCount, 1);
  assert.equal(rerunPlan.missingEvidenceCount, 0);
  assert.deepEqual(rerunPlan.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(rerunPlan.steps.map((step) => step.stepId), [
    "01-owner-gate-A11",
    "02-owner-gate-A18",
    "03-owner-gate-A22",
    "04-final-objective-audit"
  ]);

  assert.equal(stepsById["01-owner-gate-A11"].status, "ready-for-owner-gate-rerun");
  assert.equal(stepsById["01-owner-gate-A11"].missingEvidenceCount, 0);
  assert.deepEqual(stepsById["01-owner-gate-A11"].prerequisiteStepIds, []);
  assert.equal(stepsById["02-owner-gate-A18"].status, "ready-for-owner-gate-rerun");
  assert.ok(stepsById["02-owner-gate-A18"].supportingAgentIds.includes("A06"));
  assert.equal(stepsById["03-owner-gate-A22"].status, "ready-for-owner-gate-rerun");
  assert.equal(stepsById["04-final-objective-audit"].status, "blocked-by-owner-gate-reruns");
});

test("MAIS Manim v2 completion rerun plan blocks invalid owner evidence before reruns", () => {
  const rerunPlan = rerunPlanFixture({ duplicateFirstRequiredEvidence: true });
  const attributes = mathSceneV2CompletionRerunPlanDataAttributes(rerunPlan);
  const duplicateEvidenceIds = rerunPlan.duplicateEvidenceIds ?? [];
  const duplicateEvidenceId = duplicateEvidenceIds[0];

  assert.equal(rerunPlan.status, "blocked-invalid-owner-evidence");
  assert.equal(rerunPlan.canMarkThreadGoalComplete, false);
  assert.equal(rerunPlan.invalidEvidenceRecordCount, 2);
  assert.equal(duplicateEvidenceIds.length, 1);
  assert.ok(duplicateEvidenceId);
  assert.deepEqual(rerunPlan.invalidOwnerAgentIds, ["A11"]);
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-status"], "blocked-invalid-owner-evidence");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-invalid-record-count"], "2");
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-duplicate-evidence-ids"],
    duplicateEvidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-invalid-owners"], "A11");
  assert.match(rerunPlan.summary, /invalidEvidence=2/);
});

test("MAIS Manim v2 completion rerun plan serializes stable handoff attributes", () => {
  const rerunPlan = rerunPlanFixture();
  const attributes = mathSceneV2CompletionRerunPlanDataAttributes(rerunPlan);

  assert.equal(
    (rerunPlan as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    (rerunPlan as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    (rerunPlan as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    "fixture-owner-evidence-requirements"
  );
  assert.equal((rerunPlan as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal(
    (rerunPlan as { reviewSliceIds?: string }).reviewSliceIds,
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(classifyManimReviewPackage("mathSceneV2CompletionRerunPlan.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-source-contract"],
    MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-status"], "owner-evidence-required");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-step-count"], "7");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-owner-evidence-steps"], "3");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-owner-gate-steps"], "3");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-missing-evidence-count"], "22");
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-owner-action-evidence-count-manifest"],
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-owner-acceptance-criteria-manifest"],
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-owner-evidence-requirement-manifest"],
    "fixture-owner-evidence-requirements"
  );
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-review-slice-count"], "20");
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-review-slice-ids"],
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneV2ClosureEvidencePackage.ts|mathSceneV2CompletionRerunPlan.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-review-slice-consumer-gate-evidence-id-manifest"],
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.match(rerunPlan.summary, /reviewSlices=20@24/);
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-remaining-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-completion-rerun-can-complete"], "false");
});

test("MAIS Manim v2 completion rerun plan carries submission-bridge verified-closure gate manifests", () => {
  const rerunPlan = rerunPlanFixture();
  const attributes = mathSceneV2CompletionRerunPlanDataAttributes(rerunPlan);

  assert.deepEqual(
    (rerunPlan as { finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (rerunPlan as { finalObjectiveSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (rerunPlan as { finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-completion-rerun-final-objective-submission-bridge-verified-closure-status"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureStatus
  );
  assert.match(rerunPlan.summary, /submissionBridgeVerifiedClosure=complete/);
});

test("MAIS Manim v2 completion rerun plan carries closure source-architecture constraints", () => {
  const closurePackage: MathSceneV2ClosureEvidencePackage = {
    ...closureEvidencePackageFixture(),
    ownerRows: ownerRowsFixture(false).map((row) => ({
      ...row,
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open"
    })),
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
    sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
    sourceArchitectureOpenOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureRequiredOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
    sourceArchitectureSummary:
      "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice"
  };
  const rerunPlan = buildMathSceneV2CompletionRerunPlan(closurePackage);
  const attributes = mathSceneV2CompletionRerunPlanDataAttributes(rerunPlan);

  assert.equal(rerunPlan.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(rerunPlan.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    rerunPlan.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(rerunPlan.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(rerunPlan.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-completion-rerun-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(rerunPlan.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});
