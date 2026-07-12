import type { GamificationUserStore } from "./domainContracts";
import {
  awardTeacherRewardPoints,
  completeAdventureIsland,
  completeFishingGame,
  createRewardCampaign,
  getAdventureIslandEligibility,
  getStudentGamificationSummary,
  getStudentRewardsData,
  getTeacherGamificationData,
  getTeacherRewardsData,
  requestRewardRedemption,
  updateRewardCampaign,
  updateTeacherRewardRedemption
} from "../userStore";

export type { GamificationUserStore } from "./domainContracts";

export {
  awardTeacherRewardPoints,
  completeAdventureIsland,
  completeFishingGame,
  createRewardCampaign,
  getAdventureIslandEligibility,
  getStudentGamificationSummary,
  getStudentRewardsData,
  getTeacherGamificationData,
  getTeacherRewardsData,
  requestRewardRedemption,
  updateRewardCampaign,
  updateTeacherRewardRedemption
};

export const gamificationUserStore = {
  completeFishingGame,
  getAdventureIslandEligibility,
  completeAdventureIsland,
  getStudentRewardsData,
  getStudentGamificationSummary,
  requestRewardRedemption,
  getTeacherRewardsData,
  getTeacherGamificationData,
  createRewardCampaign,
  updateRewardCampaign,
  awardTeacherRewardPoints,
  updateTeacherRewardRedemption
} satisfies GamificationUserStore;
