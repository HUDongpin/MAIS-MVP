import type { AiGovernanceUserStore } from "./domainContracts";
import {
  buildAITutorDatabaseContext,
  consumeAiCapabilityRateLimit,
  getClassAiTutorPolicyForTeacher,
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
  resolveStudentAiTutorPolicy,
  updateClassAiTutorPolicy,
  updateNovaLensPolicy
} from "../userStore";

export type { AiGovernanceUserStore } from "./domainContracts";

export {
  buildAITutorDatabaseContext,
  consumeAiCapabilityRateLimit,
  getClassAiTutorPolicyForTeacher,
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
  resolveStudentAiTutorPolicy,
  updateClassAiTutorPolicy,
  updateNovaLensPolicy
};

export const aiGovernanceUserStore = {
  recordAITutorMessage,
  recordAITutorUsage,
  getAITutorTokenUsageSince,
  getClassAiTutorPolicyForTeacher,
  updateClassAiTutorPolicy,
  resolveStudentAiTutorPolicy,
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
