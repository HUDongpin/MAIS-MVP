import type { AiGovernanceUserStore } from "./domainContracts";
import {
  buildAITutorDatabaseContext,
  consumeAiCapabilityRateLimit,
  getAiGovernanceSummaryForAdmin,
  getAITutorTokenUsageSince,
  getNovaLensPolicy,
  getPilotPlatformLoopData,
  listNovaLensPolicyEventsForAdmin,
  listNovaLensRunsForUser,
  recordAiGovernanceEvent,
  recordAITutorMessage,
  recordAITutorUsage,
  recordNovaLensRun,
  updateNovaLensPolicy
} from "../userStore";

export type { AiGovernanceUserStore } from "./domainContracts";

export {
  buildAITutorDatabaseContext,
  consumeAiCapabilityRateLimit,
  getAiGovernanceSummaryForAdmin,
  getAITutorTokenUsageSince,
  getNovaLensPolicy,
  getPilotPlatformLoopData,
  listNovaLensPolicyEventsForAdmin,
  listNovaLensRunsForUser,
  recordAiGovernanceEvent,
  recordAITutorMessage,
  recordAITutorUsage,
  recordNovaLensRun,
  updateNovaLensPolicy
};

export const aiGovernanceUserStore = {
  recordAITutorMessage,
  recordAITutorUsage,
  getAITutorTokenUsageSince,
  consumeAiCapabilityRateLimit,
  recordAiGovernanceEvent,
  getAiGovernanceSummaryForAdmin,
  getPilotPlatformLoopData,
  getNovaLensPolicy,
  listNovaLensPolicyEventsForAdmin,
  updateNovaLensPolicy,
  recordNovaLensRun,
  listNovaLensRunsForUser,
  buildAITutorDatabaseContext
} satisfies AiGovernanceUserStore;
