import { curriculumTrackForProfile } from "@/lib/curriculumProfile";
import { generatedVisualizationSessionCatalog } from "@/lib/server/visualizationSessionCatalog.generated";
import type {
  CurriculumProfile,
  CurriculumTrack,
  GradeId,
  LearningAnalyticsEventSource
} from "@/types";

export type VisualizationSessionIdentity = {
  moduleId: string;
  topicId: string;
  source: LearningAnalyticsEventSource;
};

export type VisualizationSessionLearnerScope = {
  grade: GradeId;
  curriculumTrack: CurriculumTrack;
  curriculumProfile: CurriculumProfile;
};

function visualizationSessionIdentityKey({
  moduleId,
  topicId,
  source
}: VisualizationSessionIdentity) {
  return JSON.stringify([moduleId, topicId, source]);
}

const eligibleVisualizationSessionEntryByIdentityKey = new Map(
  generatedVisualizationSessionCatalog.flatMap((entry) => [
    [visualizationSessionIdentityKey({
      moduleId: entry.directoryModuleId,
      topicId: entry.topicId,
      source: entry.source
    }), entry] as const,
    [visualizationSessionIdentityKey({
      moduleId: entry.lessonModuleId,
      topicId: entry.labId,
      source: entry.source
    }), entry] as const
  ])
);

function learnerProfileIsInternallyConsistent(learner: VisualizationSessionLearnerScope) {
  return curriculumTrackForProfile(learner.curriculumProfile) === learner.curriculumTrack;
}

function entryMatchesLearnerCurriculum(
  entry: (typeof generatedVisualizationSessionCatalog)[number],
  learner: VisualizationSessionLearnerScope
) {
  if (!learnerProfileIsInternallyConsistent(learner) || entry.grade !== learner.grade) {
    return false;
  }
  if (entry.curriculumTrack === "CAPSTONE") return true;

  const { publisher, region } = learner.curriculumProfile;
  if (region === "HK") {
    return learner.curriculumTrack === "HK" && entry.curriculumTrack === "HK";
  }
  if (region === "US") {
    return entry.curriculumTrack === "US" && entry.publisher === publisher;
  }
  if (region !== "MAINLAND" || entry.publisher !== publisher) return false;
  if (publisher === "MAINLAND_PEP") {
    return entry.curriculumTrack === "MAINLAND_PEP_PRIMARY" ||
      entry.curriculumTrack === "MAINLAND_PEP_JUNIOR" ||
      entry.curriculumTrack === "MAINLAND_PEP_HIGH";
  }
  if (publisher === "MAINLAND_BNU") return entry.curriculumTrack === "MAINLAND_BNU";
  if (publisher === "MAINLAND_HJB") return entry.curriculumTrack === "MAINLAND_HJB";
  return false;
}

export function isEligibleVisualizationSession(identity: VisualizationSessionIdentity) {
  return eligibleVisualizationSessionEntryByIdentityKey.has(
    visualizationSessionIdentityKey(identity)
  );
}

export function isVisualizationSessionEligibleForLearner(
  identity: VisualizationSessionIdentity,
  learner: VisualizationSessionLearnerScope
) {
  const entry = eligibleVisualizationSessionEntryByIdentityKey.get(
    visualizationSessionIdentityKey(identity)
  );
  return Boolean(entry && entryMatchesLearnerCurriculum(entry, learner));
}
