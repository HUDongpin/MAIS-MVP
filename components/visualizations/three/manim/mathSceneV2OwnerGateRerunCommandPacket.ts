export const MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate rerun command packet: executable A11/A22 commands and A18 route-review rows for remaining owner gates without closing completion" as const;

export type MathSceneV2OwnerGateRerunCommandPacketStatus =
  | "blocked-missing-owner-gate-steps"
  | "owner-rerun-commands-ready";

export type MathSceneV2OwnerGateRerunCommandKind =
  | "browser-regression-command"
  | "release-command"
  | "teaching-route-review";

export type MathSceneV2OwnerGateBrowserRegressionCommandEnv = Record<string, string | undefined>;

export type MathSceneV2OwnerGateBrowserRegressionPackage = {
  commandEnv?: MathSceneV2OwnerGateBrowserRegressionCommandEnv;
  id: string;
};

export type MathSceneV2OwnerGateBrowserRegressionPlan = {
  hkDemoSafePackages: readonly MathSceneV2OwnerGateBrowserRegressionPackage[];
  premiumSceneVariantPackages: readonly MathSceneV2OwnerGateBrowserRegressionPackage[];
};

export type MathSceneV2OwnerGateRerunCommandRerunTarget =
  MathSceneV2CompletionRerunTarget;

export type MathSceneV2OwnerGateRerunCommandRerunStep = {
  kind: string;
  ownerAgentIds: readonly string[];
  rerunTarget: MathSceneV2OwnerGateRerunCommandRerunTarget;
  stepId: string;
};

export type MathSceneV2OwnerGateRerunCommandRerunPlan = {
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerEvidenceRequirementManifest: string;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  steps: readonly MathSceneV2OwnerGateRerunCommandRerunStep[];
};

export type MathSceneV2OwnerGateRenderedReviewRouteRow = {
  caseId: string;
  href?: string | null;
  labId?: string | null;
  manualReviewProtocol: readonly string[];
  routeStatus: string;
  sectionSelector?: string | null;
};

export type MathSceneV2OwnerGateRenderedReviewRoutePacket = {
  rows: readonly MathSceneV2OwnerGateRenderedReviewRouteRow[];
};

export type MathSceneV2OwnerGateRerunCommandRow = {
  command?: string;
  commandEnv?: MathSceneV2OwnerGateBrowserRegressionCommandEnv;
  evidenceId: string;
  href?: string;
  instruction: string;
  kind: MathSceneV2OwnerGateRerunCommandKind;
  ownerAgentId: string;
  protocol: readonly string[];
  rerunTarget: MathSceneV2OwnerGateRerunCommandRerunTarget;
  sectionSelector?: string;
  stepId: string;
  summary: string;
};

export type MathSceneV2OwnerGateRerunOwnerCommandPacket = {
  commandCount: number;
  manualReviewCount: number;
  ownerAgentId: string;
  rows: MathSceneV2OwnerGateRerunCommandRow[];
};

export type MathSceneV2OwnerGateRerunCommandPacketInput = {
  browserPlan: MathSceneV2OwnerGateBrowserRegressionPlan;
  releaseRunId?: string;
  rerunPlan: MathSceneV2OwnerGateRerunCommandRerunPlan;
  teachingRenderedRoutes: MathSceneV2OwnerGateRenderedReviewRoutePacket;
};

export type MathSceneV2OwnerGateRerunCommandPacket = {
  browserCommandCount: number;
  canMarkThreadGoalComplete: boolean;
  missingOwnerAgentIds: string[];
  ownerActionEvidenceCountManifest: string;
  ownerAcceptanceCriteriaManifest: string;
  ownerAgentIds: string[];
  ownerEvidenceRequirementManifest: string;
  ownerPacketCount: number;
  ownerPackets: MathSceneV2OwnerGateRerunOwnerCommandPacket[];
  releaseCommandCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateRerunCommandPacketStatus;
  summary: string;
  teachingReviewCount: number;
  totalCommandCount: number;
};

const requiredOwnerAgentIds = ["A11", "A18", "A22"] as const;
const defaultReleaseRunId = "manim-v2-a22-owner-gate-rerun";
const visualizationValueCommand =
  "node scripts/reject-direct-browser-entry.mjs visualization-values.spec.ts";

function ownerGateSteps(rerunPlan: MathSceneV2OwnerGateRerunCommandRerunPlan) {
  return rerunPlan.steps.filter((step) => step.kind === "owner-gate-rerun");
}

function ownerAgentId(step: MathSceneV2OwnerGateRerunCommandRerunStep) {
  return step.ownerAgentIds[0] ?? "unknown";
}

function ownerGateStepByOwner(rerunPlan: MathSceneV2OwnerGateRerunCommandRerunPlan) {
  return new Map(ownerGateSteps(rerunPlan).map((step) => [ownerAgentId(step), step]));
}

function browserPackageRow(
  ownerStep: MathSceneV2OwnerGateRerunCommandRerunStep,
  regressionPackage: MathSceneV2OwnerGateBrowserRegressionPackage
): MathSceneV2OwnerGateRerunCommandRow {
  return {
    command: visualizationValueCommand,
    commandEnv: regressionPackage.commandEnv,
    evidenceId: `a11-${regressionPackage.id}-visualization-values-rerun`,
    instruction: `A11 reruns ${regressionPackage.id} and records the Playwright run id plus pass/fail result.`,
    kind: "browser-regression-command",
    ownerAgentId: "A11",
    protocol: ["run-playwright", "record-run-id", "attach-report"],
    rerunTarget: ownerStep.rerunTarget,
    stepId: ownerStep.stepId,
    summary: `${ownerStep.stepId}:A11:${regressionPackage.id}:visualization-values`
  };
}

function a11Rows(
  ownerStep: MathSceneV2OwnerGateRerunCommandRerunStep,
  browserPlan: MathSceneV2OwnerGateBrowserRegressionPlan
): MathSceneV2OwnerGateRerunCommandRow[] {
  const packageRows = [
    ...browserPlan.hkDemoSafePackages,
    ...browserPlan.premiumSceneVariantPackages
  ].map((regressionPackage) => browserPackageRow(ownerStep, regressionPackage));

  return [
    ...packageRows,
    {
      command:
        "node scripts/reject-direct-browser-entry.mjs visualization-overlap.spec.ts",
      evidenceId: "a11-visualization-overlap-rerun",
      instruction: "A11 reruns the Visualization Lab overlap/mobile interaction gate and records run evidence.",
      kind: "browser-regression-command",
      ownerAgentId: "A11",
      protocol: ["run-playwright", "record-run-id", "attach-report"],
      rerunTarget: ownerStep.rerunTarget,
      stepId: ownerStep.stepId,
      summary: `${ownerStep.stepId}:A11:visualization-overlap`
    }
  ];
}

function a22Rows(
  ownerStep: MathSceneV2OwnerGateRerunCommandRerunStep,
  releaseRunId: string
): MathSceneV2OwnerGateRerunCommandRow[] {
  const releaseCommands = [
    {
      evidenceId: "a22-release-preflight-rerun",
      instruction: "A22 reruns release preflight after preserving required evidence.",
      command: "npm run release:preflight -- --json"
    },
    {
      evidenceId: "a22-generated-artifact-cleanup-dry-run",
      instruction: "A22 confirms generated-artifact cleanup candidates without deleting evidence.",
      command: "node scripts/cleanup-generated-artifacts.mjs --dry-run"
    },
    {
      evidenceId: "a22-root-deploy-preflight-rerun",
      instruction: "A22 confirms dirty-root deploy remains blocked unless the owner grants an explicit exception.",
      command: "npm run release:root-deploy-preflight -- --json"
    },
    {
      evidenceId: "a22-pruned-staging-dry-run",
      instruction: "A22 dry-runs the reviewed pruned staging package for the Manim slice.",
      command: `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id ${releaseRunId}`
    },
    {
      evidenceId: "a22-pruned-staging-prepare",
      instruction: "A22 prepares the reviewed pruned staging package for the Manim slice.",
      command: `node scripts/prepare-vercel-staging.mjs --json --run-id ${releaseRunId}`
    },
    {
      evidenceId: "a22-pruned-staging-next-build",
      instruction: "A22 builds from the prepared staging directory, not from the dirty root.",
      command: `cd .tmp/vercel-staging/${releaseRunId} && NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build`
    }
  ];

  return releaseCommands.map((releaseCommand) => ({
    command: releaseCommand.command,
    evidenceId: releaseCommand.evidenceId,
    instruction: releaseCommand.instruction,
    kind: "release-command" as const,
    ownerAgentId: "A22",
    protocol: ["run-command", "record-output", "attach-report"],
    rerunTarget: ownerStep.rerunTarget,
    stepId: ownerStep.stepId,
    summary: `${ownerStep.stepId}:A22:${releaseCommand.evidenceId}`
  }));
}

function a18Rows(
  ownerStep: MathSceneV2OwnerGateRerunCommandRerunStep,
  teachingRenderedRoutes: MathSceneV2OwnerGateRenderedReviewRoutePacket
): MathSceneV2OwnerGateRerunCommandRow[] {
  return teachingRenderedRoutes.rows
    .filter((row) => row.routeStatus === "ready-for-a18-browser-review" && row.href)
    .map((row) => ({
      evidenceId: `a18-${row.caseId}-rendered-route-review`,
      href: row.href ?? undefined,
      instruction: `A18 opens ${row.caseId}, checks selectors and criteria, then records approve/revision evidence.`,
      kind: "teaching-route-review" as const,
      ownerAgentId: "A18",
      protocol: row.manualReviewProtocol,
      rerunTarget: ownerStep.rerunTarget,
      sectionSelector: row.sectionSelector ?? undefined,
      stepId: ownerStep.stepId,
      summary: `${ownerStep.stepId}:A18:${row.caseId}:${row.labId ?? "missing-lab"}`
    }));
}

function ownerPacket(ownerAgentId: string, rows: MathSceneV2OwnerGateRerunCommandRow[]) {
  const sortedRows = [...rows].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));

  return {
    commandCount: sortedRows.filter((row) => row.command).length,
    manualReviewCount: sortedRows.filter((row) => row.kind === "teaching-route-review").length,
    ownerAgentId,
    rows: sortedRows
  };
}

function rowsForOwner(
  ownerAgentId: string,
  ownerStep: MathSceneV2OwnerGateRerunCommandRerunStep,
  input: MathSceneV2OwnerGateRerunCommandPacketInput
) {
  if (ownerAgentId === "A11") return a11Rows(ownerStep, input.browserPlan);
  if (ownerAgentId === "A18") return a18Rows(ownerStep, input.teachingRenderedRoutes);
  if (ownerAgentId === "A22") return a22Rows(ownerStep, input.releaseRunId ?? defaultReleaseRunId);
  return [];
}

export function buildMathSceneV2OwnerGateRerunCommandPacket(
  input: MathSceneV2OwnerGateRerunCommandPacketInput
): MathSceneV2OwnerGateRerunCommandPacket {
  const stepsByOwner = ownerGateStepByOwner(input.rerunPlan);
  const missingOwnerAgentIds = requiredOwnerAgentIds.filter((ownerAgentId) => !stepsByOwner.has(ownerAgentId));
  const ownerPackets =
    missingOwnerAgentIds.length > 0
      ? []
      : requiredOwnerAgentIds.map((ownerAgentId) =>
          ownerPacket(ownerAgentId, rowsForOwner(ownerAgentId, stepsByOwner.get(ownerAgentId)!, input))
        );
  const browserCommandCount = ownerPackets
    .flatMap((packet) => packet.rows)
    .filter((row) => row.kind === "browser-regression-command").length;
  const releaseCommandCount = ownerPackets
    .flatMap((packet) => packet.rows)
    .filter((row) => row.kind === "release-command").length;
  const teachingReviewCount = ownerPackets
    .flatMap((packet) => packet.rows)
    .filter((row) => row.kind === "teaching-route-review").length;
  const totalCommandCount = ownerPackets.reduce((sum, packet) => sum + packet.commandCount, 0);
  const ownerAgentIds = ownerPackets.map((packet) => packet.ownerAgentId);
  const status =
    missingOwnerAgentIds.length === 0
      ? "owner-rerun-commands-ready"
      : "blocked-missing-owner-gate-steps";

  return {
    browserCommandCount,
    canMarkThreadGoalComplete: false,
    missingOwnerAgentIds,
    ownerActionEvidenceCountManifest: input.rerunPlan.ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest: input.rerunPlan.ownerAcceptanceCriteriaManifest,
    ownerAgentIds,
    ownerEvidenceRequirementManifest: input.rerunPlan.ownerEvidenceRequirementManifest,
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    releaseCommandCount,
    reviewSliceConsumerGateEvidenceIdManifest: input.rerunPlan.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: input.rerunPlan.reviewSliceCount,
    reviewSliceFileManifest: input.rerunPlan.reviewSliceFileManifest,
    reviewSliceIds: input.rerunPlan.reviewSliceIds,
    reviewSliceSummary: input.rerunPlan.reviewSliceSummary,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2OwnerGateRerunCommandPacket",
      `status=${status}`,
      `owners=${ownerAgentIds.join(",") || "none"}`,
      `browserCommands=${browserCommandCount}`,
      `releaseCommands=${releaseCommandCount}`,
      `ownerAcceptanceCriteria=${input.rerunPlan.ownerAcceptanceCriteriaManifest}`,
      `ownerEvidenceRequirements=${input.rerunPlan.ownerEvidenceRequirementManifest}`,
      `reviewSlices=${input.rerunPlan.reviewSliceSummary}`,
      `teachingReviews=${teachingReviewCount}`
    ].join(":"),
    teachingReviewCount,
    totalCommandCount
  };
}

function commandRows(packet: MathSceneV2OwnerGateRerunCommandPacket) {
  return packet.ownerPackets.flatMap((ownerPacket) => ownerPacket.rows);
}

function ownerRowManifest(packet: MathSceneV2OwnerGateRerunCommandPacket) {
  return packet.ownerPackets
    .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows
      .map((row) => row.evidenceId)
      .join("|")}`)
    .join(";") || "none";
}

function commandManifest(packet: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandRows(packet)
    .filter((row) => row.command)
    .map((row) => `${row.evidenceId}=${row.command}`)
    .join(";") || "none";
}

function routeManifest(packet: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandRows(packet)
    .filter((row) => row.kind === "teaching-route-review")
    .map((row) => `${row.evidenceId}=${row.href ?? "missing"}@${row.sectionSelector ?? "missing"}`)
    .join(";") || "none";
}

function kindManifest(packet: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandRows(packet)
    .map((row) => `${row.evidenceId}=${row.ownerAgentId}:${row.kind}`)
    .join(";") || "none";
}

export function mathSceneV2OwnerGateRerunCommandPacketDataAttributes(
  packet: MathSceneV2OwnerGateRerunCommandPacket
) {
  const rows = commandRows(packet);

  return {
    "data-viz-manim-v2-owner-gate-rerun-command-browser-count": String(packet.browserCommandCount),
    "data-viz-manim-v2-owner-gate-rerun-command-can-complete": packet.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-owner-gate-rerun-command-command-manifest": commandManifest(packet),
    "data-viz-manim-v2-owner-gate-rerun-command-kind-manifest": kindManifest(packet),
    "data-viz-manim-v2-owner-gate-rerun-command-missing-owners": packet.missingOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-owner-action-evidence-count-manifest":
      packet.ownerActionEvidenceCountManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-owner-acceptance-criteria-manifest":
      packet.ownerAcceptanceCriteriaManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-owner-count": String(packet.ownerPacketCount),
    "data-viz-manim-v2-owner-gate-rerun-command-owner-evidence-requirement-manifest":
      packet.ownerEvidenceRequirementManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-owner-row-manifest": ownerRowManifest(packet),
    "data-viz-manim-v2-owner-gate-rerun-command-owners": packet.ownerAgentIds.join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-release-count": String(packet.releaseCommandCount),
    "data-viz-manim-v2-owner-gate-rerun-command-review-slice-consumer-gate-evidence-id-manifest":
      packet.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-review-slice-count": String(packet.reviewSliceCount),
    "data-viz-manim-v2-owner-gate-rerun-command-review-slice-file-manifest": packet.reviewSliceFileManifest,
    "data-viz-manim-v2-owner-gate-rerun-command-review-slice-ids": packet.reviewSliceIds,
    "data-viz-manim-v2-owner-gate-rerun-command-review-slices": packet.reviewSliceSummary,
    "data-viz-manim-v2-owner-gate-rerun-command-route-manifest": routeManifest(packet),
    "data-viz-manim-v2-owner-gate-rerun-command-row-ids": rows.map((row) => row.evidenceId).join(",") || "none",
    "data-viz-manim-v2-owner-gate-rerun-command-source-contract": packet.sourceContract,
    "data-viz-manim-v2-owner-gate-rerun-command-status": packet.status,
    "data-viz-manim-v2-owner-gate-rerun-command-summary": packet.summary,
    "data-viz-manim-v2-owner-gate-rerun-command-teaching-review-count": String(packet.teachingReviewCount),
    "data-viz-manim-v2-owner-gate-rerun-command-total-count": String(packet.totalCommandCount)
  } as const;
}
import type { MathSceneV2CompletionRerunTarget } from "./mathSceneV2CompletionRerunPlan";
