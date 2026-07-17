import type { GamificationCampaignPersistenceStore } from "./gamificationCampaignPersistence";
import type { GamificationGamePersistenceStore } from "./gamificationGamePersistence";
import type { GamificationRewardRedemptionPersistenceStore } from "./gamificationRewardRedemptionPersistence";
import type { GamificationSummaryPersistenceStore } from "./gamificationSummaryPersistence";

export type GamificationUserStoreDependencies = {
  gamificationCampaignPersistenceStore: GamificationCampaignPersistenceStore;
  gamificationGamePersistenceStore: GamificationGamePersistenceStore;
  gamificationRewardRedemptionPersistenceStore: GamificationRewardRedemptionPersistenceStore;
  gamificationSummaryPersistenceStore: GamificationSummaryPersistenceStore;
};

export function createGamificationUserStore({
  gamificationCampaignPersistenceStore,
  gamificationGamePersistenceStore,
  gamificationRewardRedemptionPersistenceStore,
  gamificationSummaryPersistenceStore
}: GamificationUserStoreDependencies) {
  return {
    completeFishingGame: gamificationGamePersistenceStore.completeFishingGame,
    getAdventureIslandEligibility: gamificationGamePersistenceStore.getAdventureIslandEligibility,
    completeAdventureIsland: gamificationGamePersistenceStore.completeAdventureIsland,
    getStudentRewardsData: gamificationRewardRedemptionPersistenceStore.getStudentRewardsData,
    getStudentGamificationSummary: gamificationSummaryPersistenceStore.getStudentGamificationSummary,
    requestRewardRedemption: gamificationRewardRedemptionPersistenceStore.requestRewardRedemption,
    getTeacherRewardsData: gamificationRewardRedemptionPersistenceStore.getTeacherRewardsData,
    getTeacherGamificationData: gamificationSummaryPersistenceStore.getTeacherGamificationData,
    createRewardCampaign: gamificationCampaignPersistenceStore.createRewardCampaign,
    updateRewardCampaign: gamificationCampaignPersistenceStore.updateRewardCampaign,
    awardTeacherRewardPoints: gamificationRewardRedemptionPersistenceStore.awardTeacherRewardPoints,
    updateTeacherRewardRedemption: gamificationRewardRedemptionPersistenceStore.updateTeacherRewardRedemption
  };
}
