import type { AgentLaneId, SpecialistWorkflowId } from "./registry";

export type PilotAdapterIdV1 =
  | "content-candidate"
  | "question-machine-qa"
  | "curriculum-content-review"
  | "candidate-promotion"
  | "nova-prompt-audit"
  | "adaptive-prompt-audit"
  | "ordinary-feature-handoff"
  | "backend-handoff"
  | "shared-file-handoff"
  | "regression-plan"
  | "release-graphops-handoff"
  | "git-hygiene-intake";

export interface PilotAdapterV1 {
  readonly adapterId: PilotAdapterIdV1;
  readonly primaryLane: AgentLaneId;
  readonly specialistWorkflow: SpecialistWorkflowId;
  readonly evidenceClass: string;
  readonly claimCeiling: string;
  readonly availability: "available" | "currentness-blocked";
  readonly allowedOperations: readonly ["inspect", "validate", "handoff"];
  readonly permittedEffects: readonly [
    "repository-read",
    "deterministic-validation",
  ];
  readonly preservedInvariants: readonly string[];
  readonly automaticNextStage: false;
  readonly invokesGraphOps: false;
}

function adapter(
  adapterId: PilotAdapterIdV1,
  primaryLane: AgentLaneId,
  specialistWorkflow: SpecialistWorkflowId,
  evidenceClass: string,
  claimCeiling: string,
  preservedInvariants: readonly string[],
  availability: PilotAdapterV1["availability"] = "available",
): PilotAdapterV1 {
  return {
    adapterId,
    primaryLane,
    specialistWorkflow,
    evidenceClass,
    claimCeiling,
    availability,
    allowedOperations: ["inspect", "validate", "handoff"],
    permittedEffects: ["repository-read", "deterministic-validation"],
    preservedInvariants,
    automaticNextStage: false,
    invokesGraphOps: false,
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const PILOT_ADAPTERS = deepFreeze({
  "content-candidate": adapter(
    "content-candidate",
    "A21",
    "content-candidate-generation.v1",
    "candidate",
    "immutable-candidate-only",
    [
      "generation identity differs from review identity",
      "candidate is immutable",
      "no content acceptance or publication claim",
    ],
  ),
  "question-machine-qa": adapter(
    "question-machine-qa",
    "A18",
    "question-machine-qa.v1",
    "machine-qa-packet",
    "machine-qa-packet-only",
    [
      "machine evidence does not generalize to natural samples",
      "candidate identity remains exact",
      "no A18 acceptance claim",
    ],
    "currentness-blocked",
  ),
  "curriculum-content-review": adapter(
    "curriculum-content-review",
    "A18",
    "curriculum-content-review.v1",
    "independent-content-review",
    "approved-for-integration-review",
    [
      "reviewer identity is independent from generation",
      "curriculum, answer, language, and pedagogy remain separate checks",
      "approval is not promotion",
    ],
  ),
  "candidate-promotion": adapter(
    "candidate-promotion",
    "A23",
    "candidate-promotion.v1",
    "promotion-plan",
    "promotion-plan-only",
    [
      "exact candidate and receipt currentness",
      "A11 regression remains separate",
      "A22 release remains separate",
    ],
  ),
  "nova-prompt-audit": adapter(
    "nova-prompt-audit",
    "A07",
    "nova-prompt-audit.v1",
    "prompt-audit",
    "prompt-audit-only",
    [
      "no runtime route modification",
      "no provider invocation",
      "strict output and fallback contract remain owner-controlled",
    ],
  ),
  "adaptive-prompt-audit": adapter(
    "adaptive-prompt-audit",
    "A15",
    "adaptive-prompt-audit.v1",
    "prompt-audit",
    "prompt-audit-only",
    [
      "deterministic BKT floor",
      "candidate-only rerank",
      "validator and deterministic fallback",
      "no answer access",
    ],
  ),
  "ordinary-feature-handoff": adapter(
    "ordinary-feature-handoff",
    "A01",
    "owner-lane-handoff.v1",
    "owner-contract",
    "handoff-ready",
    ["one primary lane", "at most three collaborators", "ordered subcontracts"],
  ),
  "backend-handoff": adapter(
    "backend-handoff",
    "A12",
    "owner-lane-handoff.v1",
    "backend-contract",
    "handoff-ready",
    ["general API ownership", "AI Tutor and adaptive route exclusions", "storage coordination"],
  ),
  "shared-file-handoff": adapter(
    "shared-file-handoff",
    "A08",
    "owner-lane-handoff.v1",
    "shared-owner-contract",
    "handoff-ready",
    ["exact shared-file owner", "active-writer preflight", "no implicit parallel writer"],
  ),
  "regression-plan": adapter(
    "regression-plan",
    "A11",
    "regression-plan.v1",
    "regression-plan",
    "regression-plan-only",
    ["owner-routed packages", "no feature fix inside QA", "no release claim"],
  ),
  "release-graphops-handoff": adapter(
    "release-graphops-handoff",
    "A22",
    "release-graphops-handoff.v1",
    "release-handoff",
    "graphops-handoff-only",
    ["clean release source required", "GraphOps remains a separate control plane", "no deployment runner"],
  ),
  "git-hygiene-intake": adapter(
    "git-hygiene-intake",
    "A25",
    "git-hygiene-intake.v1",
    "git-intake",
    "non-mutating-intake-only",
    ["no stage", "no commit", "no branch operation", "no cleanup or deletion"],
  ),
} satisfies Record<PilotAdapterIdV1, PilotAdapterV1>);
