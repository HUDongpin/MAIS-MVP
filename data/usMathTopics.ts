import { unitedStatesMathGradeOverviewCards } from "./rag/usMath";
import type { CurriculumTrack, Difficulty, GradeId, LocalizedText, TextbookPublisher, Topic, UnitedStatesMathSafeCard } from "@/types";

const liveUnitedStatesTracks = [] as const satisfies CurriculumTrack[];
type LiveUnitedStatesTrack = (typeof liveUnitedStatesTracks)[number];

const liveTrackSet = new Set<string>(liveUnitedStatesTracks);

const difficultyByBand: Record<UnitedStatesMathSafeCard["difficultyBand"], Difficulty> = {
  foundation: "Low",
  core: "Medium",
  assessment: "High",
  challenge: "High"
};

function isLiveUnitedStatesTrack(track: string): track is LiveUnitedStatesTrack {
  return liveTrackSet.has(track);
}

function isLiveGrade(value: string): value is GradeId {
  return value !== "K";
}

function topicPrefix(track: LiveUnitedStatesTrack) {
  return "us-nc";
}

function publisherForTrack(track: LiveUnitedStatesTrack): TextbookPublisher {
  return track;
}

function localized(en: string, zh = en): LocalizedText {
  return { en, zh, zhHans: zh };
}

function titleCase(value: string) {
  return value
    .replace(/^p\d+-/i, "")
    .replace(/^s\d+-/i, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function topicTitle(card: UnitedStatesMathSafeCard, topicId: string, index: number) {
  const domain = card.domainTags[index] ?? card.clusterTags[index] ?? titleCase(topicId);
  return `${card.stateName} ${titleCase(domain)}`;
}

function topicDescription(card: UnitedStatesMathSafeCard, topicId: string, index: number) {
  const concept = card.conceptIds[index] ?? card.conceptIds[0] ?? topicId;
  return `${card.stateName} ${card.usGradeLabel} live pathway for ${titleCase(concept)}, aligned to ${card.standardsName} with MAIS-authored safe-card content.`;
}

function topicStatus(index: number): Topic["status"] {
  if (index === 0) return "in-progress";
  return "not-started";
}

function topicMastery(index: number) {
  if (index === 0) return 35;
  return 0;
}

export const usMathLiveTopics: Topic[] = unitedStatesMathGradeOverviewCards
  .filter((card) => isLiveUnitedStatesTrack(card.curriculumTrack) && isLiveGrade(card.grade))
  .flatMap((card) => {
    const curriculumTrack = card.curriculumTrack as LiveUnitedStatesTrack;
    const prefix = topicPrefix(curriculumTrack);
    const publisher = publisherForTrack(curriculumTrack);

    return card.topicIds.map((canonicalTopicId, index): Topic => {
      const title = topicTitle(card, canonicalTopicId, index);
      return {
        id: `${prefix}-${canonicalTopicId}`,
        curriculumTrack,
        curriculumProfile: { region: "US", publisher },
        region: "US",
        publisher,
        canonicalTopicId,
        grade: card.grade as GradeId,
        title: localized(title),
        description: localized(topicDescription(card, canonicalTopicId, index)),
        status: topicStatus(index),
        difficulty: difficultyByBand[card.difficultyBand],
        minutes: 28 + index * 4,
        mastery: topicMastery(index)
      };
    });
  });
