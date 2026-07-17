import type { AiGovernancePersistenceStore } from "./aiGovernancePersistence";
import type { NovaLensPersistenceStore } from "./novaLensPersistence";

export type AiGovernanceUserStoreDependencies = {
  aiGovernancePersistenceStore: AiGovernancePersistenceStore;
  novaLensPersistenceStore: NovaLensPersistenceStore;
};

export function createAiGovernanceUserStore({
  aiGovernancePersistenceStore,
  novaLensPersistenceStore
}: AiGovernanceUserStoreDependencies) {
  return {
    recordAITutorMessage: aiGovernancePersistenceStore.recordAITutorMessage,
    recordAITutorUsage: aiGovernancePersistenceStore.recordAITutorUsage,
    getAITutorTokenUsageSince: aiGovernancePersistenceStore.getAITutorTokenUsageSince,
    consumeAiCapabilityRateLimit: aiGovernancePersistenceStore.consumeAiCapabilityRateLimit,
    recordAiGovernanceEvent: aiGovernancePersistenceStore.recordAiGovernanceEvent,
    getAiGovernanceSummaryForAdmin: aiGovernancePersistenceStore.getAiGovernanceSummaryForAdmin,
    getPilotPlatformLoopData: aiGovernancePersistenceStore.getPilotPlatformLoopData,
    getNovaLensPolicy: novaLensPersistenceStore.getNovaLensPolicy,
    listNovaLensPolicyEventsForAdmin: novaLensPersistenceStore.listNovaLensPolicyEventsForAdmin,
    updateNovaLensPolicy: novaLensPersistenceStore.updateNovaLensPolicy,
    recordNovaLensRun: novaLensPersistenceStore.recordNovaLensRun,
    listNovaLensRunsForUser: novaLensPersistenceStore.listNovaLensRunsForUser,
    buildAITutorDatabaseContext: aiGovernancePersistenceStore.buildAITutorDatabaseContext
  };
}
