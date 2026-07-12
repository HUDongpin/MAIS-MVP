import type {
  MathSceneV2CompletionClosureAction,
  MathSceneV2CompletionClosureQueue
} from "./mathSceneV2CompletionClosureQueue";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT =
  "MAIS Manim v2 completion acceptance checklist: defines owner evidence required before A11, A22, and A18/A06 closure actions can complete the thread goal" as const;

export type MathSceneV2CompletionAcceptanceChecklistStatus =
  | "complete"
  | "pending-owner-evidence";

export type MathSceneV2CompletionOwnerEvidenceStatus =
  | "accepted-owner-evidence"
  | "pending-owner-evidence";

export type MathSceneV2CompletionAcceptanceAction = {
  acceptanceCriteria: string[];
  action: string;
  actionId: MathSceneV2CompletionClosureAction["actionId"];
  blockingItems: string[];
  ownerAgentIds: readonly string[];
  ownerEvidenceStatus: MathSceneV2CompletionOwnerEvidenceStatus;
  prerequisiteEvidenceSourceIds: string[];
  supportingAgentIds: readonly string[];
  verificationEvidenceIds: string[];
  workstreamId: MathSceneV2GoalGateId;
};

export type MathSceneV2CompletionAcceptanceWorkstream = {
  actionCount: number;
  pendingOwnerEvidenceCount: number;
  workstreamId: MathSceneV2GoalGateId;
};

export type MathSceneV2CompletionAcceptanceChecklist = {
  acceptedOwnerEvidenceCount: number;
  a11RequiredRootDataAttributeCount: number;
  a11RunFromBeatCheckpointInvalidationDataAttributeManifest: string;
  actionCount: number;
  actions: MathSceneV2CompletionAcceptanceAction[];
  canMarkThreadGoalComplete: boolean;
  ownerAcceptanceCriteriaManifest: string;
  ownerActionEvidenceCountManifest: string;
  ownerEvidenceRequirementManifest: string;
  pendingOwnerEvidenceCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureBlockerReasonManifest: string;
  sourceArchitectureBlockerReasons: MathSceneV2CompletionClosureQueue["sourceArchitectureBlockerReasons"];
  sourceContract: typeof MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT;
  status: MathSceneV2CompletionAcceptanceChecklistStatus;
  summary: string;
  workstreamCount: number;
  workstreams: MathSceneV2CompletionAcceptanceWorkstream[];
};

type AcceptanceDefinition = {
  acceptanceCriteria: string[];
  verificationEvidenceIds: string[];
};

const defaultDefinition: AcceptanceDefinition = {
  acceptanceCriteria: ["Owner records evidence that this action is complete before the Manim v2 goal is closed."],
  verificationEvidenceIds: ["owner-action-completion-evidence"]
};

const acceptanceDefinitionsByAction = new Map<string, AcceptanceDefinition>([
  [
    "adopt-hk-grade-split-packages",
    {
      acceptanceCriteria: [
        "A11 adopts the P1-S6 HK demo-safe split package plan as the browser visual regression contract.",
        "The adopted package plan keeps explicit VISUALIZATION_SWEEP_LABS filters for each grade package."
      ],
      verificationEvidenceIds: [
        "visualizationBrowserRegressionEvidence",
        "a11-hk-grade-split-package-rerun"
      ]
    }
  ],
  [
    "update-projection-views-expected-list",
    {
      acceptanceCriteria: [
        "A11 updates the premium scene expected-list contract to include projection-views when that live variant is present.",
        "The premium route visual regression passes after the expected-list contract update."
      ],
      verificationEvidenceIds: [
        "a11-projection-views-contract-update",
        "a11-premium-route-rerun"
      ]
    }
  ],
  [
    "keep-non-hk-tracks-out-of-hk-demo-sweep",
    {
      acceptanceCriteria: [
        "A11 keeps Mainland, US, and capstone labs out of HK demo-account catalog sweeps.",
        "The broad sweep is rerun with track-safe filters or split into explicit non-HK account packages."
      ],
      verificationEvidenceIds: [
        "a11-hk-demo-sweep-scope-evidence",
        "visualizationBrowserRegressionPackages"
      ]
    }
  ],
  [
    "investigate-isolated-next-chunk-serving-after-broad-timeout",
    {
      acceptanceCriteria: [
        "A22 records the isolated Next chunk-serving follow-up for broad-suite timeout or ChunkLoadError cascades.",
        "The follow-up distinguishes app source failure from dev-server/static-chunk serving instability."
      ],
      verificationEvidenceIds: [
        "a22-isolated-next-chunk-serving-report",
        "a11-broad-suite-rerun-evidence"
      ]
    }
  ],
  [
    "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
    {
      acceptanceCriteria: [
        "A22 releases only from a clean worktree or reviewed pruned-staging slice.",
        "The A06 Manim release slice is included from the clean worktree or reviewed pruned-staging package with zero forbidden paths."
      ],
      verificationEvidenceIds: [
        "mathSceneV2ReleaseSliceManifest",
        "a22-clean-worktree-or-pruned-staging-build-report"
      ]
    }
  ],
  [
    "run-a22-generated-artifact-cleanup-after-preserving-evidence",
    {
      acceptanceCriteria: [
        "A22 preserves required evidence artifacts before generated-artifact cleanup.",
        "A22 records dry-run and any owner-approved apply result for generated-artifact cleanup."
      ],
      verificationEvidenceIds: [
        "a22-generated-artifact-cleanup-report",
        "a22-release-preflight-rerun"
      ]
    }
  ],
  [
    "open-rendered-review-routes",
    {
      acceptanceCriteria: [
        "A18 opens the rendered review routes for all 12 concrete Manim teaching scenes.",
        "Each opened route matches the expected lab section and rendered scene selectors."
      ],
      verificationEvidenceIds: [
        "mathSceneTeachingRenderedReviewRoutes",
        "a18-rendered-route-inspection-notes"
      ]
    }
  ],
  [
    "inspect-rendered-scene-targets",
    {
      acceptanceCriteria: [
        "A18 inspects the rendered targets for family ID, scene ID, labels, timing, camera framing, and cognitive load.",
        "A18 records rendered-scene observations against the source-backed inspection target queue."
      ],
      verificationEvidenceIds: [
        "mathSceneTeachingInspectionTargets",
        "a18-rendered-scene-target-review"
      ]
    }
  ],
  [
    "complete-a18-final-criterion-decisions",
    {
      acceptanceCriteria: [
        "A18 completes all 60 criterion decisions for the 12 concrete Manim teaching scenes.",
        "Each criterion decision records curriculum fit, mathematical accuracy, cognitive load, language/labels, or interaction timing."
      ],
      verificationEvidenceIds: [
        "mathSceneTeachingFinalDecisionLedger",
        "a18-final-criterion-decision-record"
      ]
    }
  ],
  [
    "complete-a18-final-scene-signoff",
    {
      acceptanceCriteria: [
        "A18 records final signoff status for all 12 concrete Manim teaching scenes.",
        "The signoff does not mark the teaching gate complete while any scene remains pending or requires revision."
      ],
      verificationEvidenceIds: [
        "mathSceneTeachingSignoffMatrix",
        "a18-final-scene-signoff-record"
      ]
    }
  ],
  [
    "record-approve-or-revision-decision",
    {
      acceptanceCriteria: [
        "A18 records approve-or-revision decisions for the final rendered teaching review packet.",
        "Any revision decision identifies the scene, criterion, and required A06 follow-up."
      ],
      verificationEvidenceIds: [
        "mathSceneTeachingFinalReviewPacket",
        "a18-final-approve-or-revision-decisions"
      ]
    }
  ]
]);

function acceptanceDefinition(action: string) {
  return acceptanceDefinitionsByAction.get(action) ?? defaultDefinition;
}

function acceptanceAction(action: MathSceneV2CompletionClosureAction): MathSceneV2CompletionAcceptanceAction {
  const definition = acceptanceDefinition(action.action);

  return {
    acceptanceCriteria: definition.acceptanceCriteria,
    action: action.action,
    actionId: action.actionId,
    blockingItems: action.blockingItems,
    ownerAgentIds: action.ownerAgentIds,
    ownerEvidenceStatus: "pending-owner-evidence",
    prerequisiteEvidenceSourceIds: action.evidenceSourceIds,
    supportingAgentIds: action.supportingAgentIds,
    verificationEvidenceIds: definition.verificationEvidenceIds,
    workstreamId: action.workstreamId
  };
}

function workstreamRows(actions: MathSceneV2CompletionAcceptanceAction[]): MathSceneV2CompletionAcceptanceWorkstream[] {
  const workstreamIds = [...new Set(actions.map((action) => action.workstreamId))];

  return workstreamIds.map((workstreamId) => {
    const workstreamActions = actions.filter((action) => action.workstreamId === workstreamId);

    return {
      actionCount: workstreamActions.length,
      pendingOwnerEvidenceCount: workstreamActions.filter(
        (action) => action.ownerEvidenceStatus === "pending-owner-evidence"
      ).length,
      workstreamId
    };
  });
}

function ownerEvidenceRequirementManifest(actions: readonly MathSceneV2CompletionAcceptanceAction[]) {
  return actions
    .map(
      (action) =>
        `${action.actionId}=owners:${action.ownerAgentIds.join("+") || "none"};verification:${action.verificationEvidenceIds.join("+") || "none"};prerequisites:${action.prerequisiteEvidenceSourceIds.join("+") || "none"}`
    )
    .join("|") || "none";
}

function ownerAcceptanceCriteriaManifest(actions: readonly MathSceneV2CompletionAcceptanceAction[]) {
  return actions
    .map((action) => `${action.actionId}=criteria:${action.acceptanceCriteria.join("+") || "none"}`)
    .join("|") || "none";
}

export function buildMathSceneV2CompletionAcceptanceChecklist(
  queue: MathSceneV2CompletionClosureQueue
): MathSceneV2CompletionAcceptanceChecklist {
  const actions = queue.actions.map(acceptanceAction);
  const acceptedOwnerEvidenceCount = actions.filter(
    (action) => action.ownerEvidenceStatus === "accepted-owner-evidence"
  ).length;
  const pendingOwnerEvidenceCount = actions.length - acceptedOwnerEvidenceCount;
  const canMarkThreadGoalComplete = queue.canMarkThreadGoalComplete && pendingOwnerEvidenceCount === 0;
  const status = canMarkThreadGoalComplete ? "complete" : "pending-owner-evidence";
  const workstreams = workstreamRows(actions);

  return {
    acceptedOwnerEvidenceCount,
    a11RequiredRootDataAttributeCount: queue.a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      queue.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete,
    ownerAcceptanceCriteriaManifest: ownerAcceptanceCriteriaManifest(actions),
    ownerActionEvidenceCountManifest: queue.ownerActionEvidenceCountManifest,
    ownerEvidenceRequirementManifest: ownerEvidenceRequirementManifest(actions),
    pendingOwnerEvidenceCount,
    reviewSliceConsumerGateEvidenceIdManifest: queue.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: queue.reviewSliceCount,
    reviewSliceFileManifest: queue.reviewSliceFileManifest,
    reviewSliceIds: queue.reviewSliceIds,
    reviewSliceSummary: queue.reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: queue.sourceArchitectureBlockerReasonManifest,
    sourceArchitectureBlockerReasons: [...queue.sourceArchitectureBlockerReasons],
    sourceContract: MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2CompletionAcceptanceChecklist",
      `status=${status}`,
      `actions=${actions.length}`,
      `pending=${pendingOwnerEvidenceCount}`,
      `accepted=${acceptedOwnerEvidenceCount}`,
      `reviewSlices=${queue.reviewSliceSummary}`,
      `sourceBlockers=${queue.sourceArchitectureBlockerReasonManifest}`,
      `a11RootAttributes=${queue.a11RequiredRootDataAttributeCount}`,
      workstreams.map((workstream) => `${workstream.workstreamId}=${workstream.actionCount}`).join(";")
    ].join(":"),
    workstreamCount: workstreams.length,
    workstreams
  };
}

export function mathSceneV2CompletionAcceptanceChecklistDataAttributes(
  checklist: MathSceneV2CompletionAcceptanceChecklist
) {
  return {
    "data-viz-manim-v2-completion-acceptance-accepted-count": String(checklist.acceptedOwnerEvidenceCount),
    "data-viz-manim-v2-completion-acceptance-a11-required-root-attribute-count": String(
      checklist.a11RequiredRootDataAttributeCount
    ),
    "data-viz-manim-v2-completion-acceptance-a11-run-from-beat-checkpoint-invalidation-attributes":
      checklist.a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    "data-viz-manim-v2-completion-acceptance-action-count": String(checklist.actionCount),
    "data-viz-manim-v2-completion-acceptance-can-complete": checklist.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-completion-acceptance-owner-action-evidence-count-manifest":
      checklist.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-completion-acceptance-owner-criteria-manifest": checklist.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-completion-acceptance-owner-evidence-requirement-manifest": checklist.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-completion-acceptance-pending-count": String(checklist.pendingOwnerEvidenceCount),
    "data-viz-manim-v2-completion-acceptance-review-slice-consumer-gate-evidence-id-manifest":
      checklist.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-completion-acceptance-review-slice-count": String(checklist.reviewSliceCount),
    "data-viz-manim-v2-completion-acceptance-review-slice-file-manifest": checklist.reviewSliceFileManifest,
    "data-viz-manim-v2-completion-acceptance-review-slice-ids": checklist.reviewSliceIds,
    "data-viz-manim-v2-completion-acceptance-review-slices": checklist.reviewSliceSummary,
    "data-viz-manim-v2-completion-acceptance-source-architecture-blocker-reasons":
      checklist.sourceArchitectureBlockerReasonManifest,
    "data-viz-manim-v2-completion-acceptance-source-contract": checklist.sourceContract,
    "data-viz-manim-v2-completion-acceptance-status": checklist.status,
    "data-viz-manim-v2-completion-acceptance-summary": checklist.workstreams
      .map((workstream) => `${workstream.workstreamId}=${workstream.actionCount}`)
      .join(";") || "none",
    "data-viz-manim-v2-completion-acceptance-workstream-count": String(checklist.workstreamCount)
  } as const;
}
