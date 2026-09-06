import type { ParentAccessPersistenceStore } from "./parentAccessPersistence";
import type { ParentFoundationPersistenceStore } from "./parentFoundationPersistence";
import type { ParentMessagePersistenceStore } from "./parentMessagePersistence";
import type { ParentNoticePersistenceStore } from "./parentNoticePersistence";
import type { ParentReportPersistenceStore } from "./parentReportPersistence";

export type ParentUserStoreDependencies = {
  parentAccessPersistenceStore: ParentAccessPersistenceStore;
  parentFoundationPersistenceStore: ParentFoundationPersistenceStore;
  parentMessagePersistenceStore: ParentMessagePersistenceStore;
  parentNoticePersistenceStore: ParentNoticePersistenceStore;
  parentReportPersistenceStore: ParentReportPersistenceStore;
};

export function createParentUserStore({
  parentAccessPersistenceStore,
  parentFoundationPersistenceStore,
  parentMessagePersistenceStore,
  parentNoticePersistenceStore,
  parentReportPersistenceStore
}: ParentUserStoreDependencies) {
  return {
    parentCanAccessStudent: parentAccessPersistenceStore.parentCanAccessStudent,
    getParentNoticeData: parentNoticePersistenceStore.getParentNoticeData,
    acknowledgeParentNotice: parentNoticePersistenceStore.acknowledgeParentNotice,
    getParentFoundationData: parentFoundationPersistenceStore.getParentFoundationData,
    getParentChildSummary: parentFoundationPersistenceStore.getParentChildSummary,
    getParentReportData: parentReportPersistenceStore.getParentReportData,
    getParentMessagesData: parentMessagePersistenceStore.getParentMessagesData,
    findParentMessageCreateReplay: parentMessagePersistenceStore.findParentMessageCreateReplay,
    createParentMessageThread: parentMessagePersistenceStore.createParentMessageThread,
    findParentMessageReplyReplay: parentMessagePersistenceStore.findParentMessageReplyReplay,
    replyToParentMessageThread: parentMessagePersistenceStore.replyToParentMessageThread,
    linkParentToStudentByInviteCode: parentAccessPersistenceStore.linkParentToStudentByInviteCode
  };
}
