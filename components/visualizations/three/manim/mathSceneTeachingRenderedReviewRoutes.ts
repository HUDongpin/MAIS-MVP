import type { VisualizationCurriculumTrack } from "../../../../data/visualizationLabs";
import type { ThreeDFamilyId } from "../threeDSceneTypes";
import type {
  MathSceneTeachingInspectionTarget,
  MathSceneTeachingInspectionTargetQueue
} from "./mathSceneTeachingInspectionTargets";

export const MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT =
  "A18/A06 rendered teaching review routes: concrete MAIS Manim teaching cases mapped to real Visualization Lab browser routes, section selectors, and rendered-scene evidence selectors" as const;

export const MATH_SCENE_TEACHING_RENDERED_REVIEW_PROTOCOL = [
  "open-rendered-review-route",
  "confirm-lab-section-selector",
  "confirm-rendered-scene-selectors",
  "confirm-source-evidence-attributes",
  "record-a18-approve-or-revision-decision"
] as const;

export type MathSceneTeachingRenderedReviewProtocolStep =
  (typeof MATH_SCENE_TEACHING_RENDERED_REVIEW_PROTOCOL)[number];

export type MathSceneTeachingRenderedReviewRouteStatus =
  | "missing-enabled-visualization-lab"
  | "ready-for-a18-browser-review";

export type MathSceneTeachingRenderedReviewPacketStatus =
  | "blocked-missing-rendered-routes"
  | "ready-for-a18-browser-review";

export type MathSceneTeachingRenderedReviewLabLike = {
  curriculumTrack: VisualizationCurriculumTrack;
  grade: string;
  labId: string;
  threeD?: {
    enabled?: boolean;
    familyId?: ThreeDFamilyId;
    premiumLaunch?: boolean;
  };
};

export type MathSceneTeachingRenderedReviewRouteRow = Pick<
  MathSceneTeachingInspectionTarget,
  | "a18SignoffStatus"
  | "caseId"
  | "familyId"
  | "learningObjective"
  | "renderedSceneSelectors"
  | "sceneId"
  | "sourceEvidenceAttributes"
  | "targetBand"
> & {
  href: string | null;
  labId: string | null;
  manualReviewProtocol: readonly MathSceneTeachingRenderedReviewProtocolStep[];
  routeStatus: MathSceneTeachingRenderedReviewRouteStatus;
  sectionId: string | null;
  sectionSelector: string | null;
  summary: string;
};

export type MathSceneTeachingRenderedReviewRoutePacket = {
  missingCaseIds: MathSceneTeachingInspectionTarget["caseId"][];
  missingRouteCount: number;
  pendingA18Count: number;
  routableTargetCount: number;
  rows: MathSceneTeachingRenderedReviewRouteRow[];
  sourceContract: typeof MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT;
  status: MathSceneTeachingRenderedReviewPacketStatus;
  summary: string;
  targetCount: number;
};

const trackPreference: VisualizationCurriculumTrack[] = [
  "HK",
  "MAINLAND_PEP_HIGH",
  "MAINLAND_PEP_JUNIOR",
  "MAINLAND_PEP_PRIMARY",
  "MAINLAND_BNU",
  "MAINLAND_HJB",
  "US",
  "CAPSTONE"
];

function trackRank(track: VisualizationCurriculumTrack) {
  const rank = trackPreference.indexOf(track);
  return rank === -1 ? trackPreference.length : rank;
}

function compareCandidateLabs(left: MathSceneTeachingRenderedReviewLabLike, right: MathSceneTeachingRenderedReviewLabLike) {
  return (
    trackRank(left.curriculumTrack) - trackRank(right.curriculumTrack) ||
    left.grade.localeCompare(right.grade) ||
    left.labId.localeCompare(right.labId)
  );
}

function selectRenderedReviewLab(
  target: MathSceneTeachingInspectionTarget,
  labs: readonly MathSceneTeachingRenderedReviewLabLike[]
) {
  return [...labs]
    .filter((lab) => lab.threeD?.enabled && lab.threeD.familyId === target.familyId)
    .sort(compareCandidateLabs)[0] ?? null;
}

function routeHrefForLab(lab: MathSceneTeachingRenderedReviewLabLike) {
  const params = new URLSearchParams();
  params.set("grade", lab.grade);
  params.set("track", lab.curriculumTrack);

  if (lab.threeD?.premiumLaunch) {
    return `/student/tools/visualizations/${encodeURIComponent(lab.labId)}?${params.toString()}`;
  }

  params.set("lab", lab.labId);
  return `/visualization-lab?${params.toString()}`;
}

function sectionIdForLab(labId: string) {
  return `lab-example-${labId}`;
}

function sectionSelectorForLab(labId: string) {
  return `[id=${JSON.stringify(sectionIdForLab(labId))}]`;
}

function renderedReviewRow(
  target: MathSceneTeachingInspectionTarget,
  labs: readonly MathSceneTeachingRenderedReviewLabLike[]
): MathSceneTeachingRenderedReviewRouteRow {
  const lab = selectRenderedReviewLab(target, labs);
  const labId = lab?.labId ?? null;
  const routeStatus = lab ? "ready-for-a18-browser-review" : "missing-enabled-visualization-lab";

  return {
    a18SignoffStatus: target.a18SignoffStatus,
    caseId: target.caseId,
    familyId: target.familyId,
    href: lab ? routeHrefForLab(lab) : null,
    labId,
    learningObjective: target.learningObjective,
    manualReviewProtocol: MATH_SCENE_TEACHING_RENDERED_REVIEW_PROTOCOL,
    renderedSceneSelectors: target.renderedSceneSelectors,
    routeStatus,
    sceneId: target.sceneId,
    sectionId: labId ? sectionIdForLab(labId) : null,
    sectionSelector: labId ? sectionSelectorForLab(labId) : null,
    sourceEvidenceAttributes: target.sourceEvidenceAttributes,
    summary: `${target.caseId}=${labId ?? "missing-route"}:${routeStatus}:scene=${target.sceneId}`,
    targetBand: target.targetBand
  };
}

export function buildMathSceneTeachingRenderedReviewRoutes(
  queue: MathSceneTeachingInspectionTargetQueue,
  labs: readonly MathSceneTeachingRenderedReviewLabLike[]
): MathSceneTeachingRenderedReviewRoutePacket {
  const rows = queue.targets.map((target) => renderedReviewRow(target, labs));
  const missingCaseIds = rows
    .filter((row) => row.routeStatus === "missing-enabled-visualization-lab")
    .map((row) => row.caseId);
  const routableTargetCount = rows.length - missingCaseIds.length;
  const status = missingCaseIds.length === 0 ? "ready-for-a18-browser-review" : "blocked-missing-rendered-routes";

  return {
    missingCaseIds,
    missingRouteCount: missingCaseIds.length,
    pendingA18Count: rows.filter((row) => row.a18SignoffStatus === "pending-a18-review").length,
    routableTargetCount,
    rows,
    sourceContract: MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT,
    status,
    summary: [
      "a18RenderedReviewRoutes",
      `status=${status}`,
      `routable=${routableTargetCount}/${rows.length}`,
      rows.map((row) => `${row.caseId}=${row.labId ?? "missing-route"}`).join(";")
    ].join(":"),
    targetCount: rows.length
  };
}

export function mathSceneTeachingRenderedReviewRouteDataAttributes(
  packet: MathSceneTeachingRenderedReviewRoutePacket
) {
  return {
    "data-viz-manim-teaching-rendered-review-route-missing-case-ids": packet.missingCaseIds.join(",") || "none",
    "data-viz-manim-teaching-rendered-review-route-missing-count": String(packet.missingRouteCount),
    "data-viz-manim-teaching-rendered-review-route-pending-a18-count": String(packet.pendingA18Count),
    "data-viz-manim-teaching-rendered-review-route-routable-count": String(packet.routableTargetCount),
    "data-viz-manim-teaching-rendered-review-route-source-contract": packet.sourceContract,
    "data-viz-manim-teaching-rendered-review-route-status": packet.status,
    "data-viz-manim-teaching-rendered-review-route-summary": packet.rows
      .map((row) => `${row.caseId}=${row.labId ?? "missing-route"}`)
      .join(";"),
    "data-viz-manim-teaching-rendered-review-route-target-count": String(packet.targetCount)
  } as const;
}
