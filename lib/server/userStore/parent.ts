import type { ParentUserStore } from "./domainContracts";
import {
  acknowledgeParentNotice,
  createParentMessageThread,
  findParentMessageCreateReplay,
  findParentMessageReplyReplay,
  getParentChildSummary,
  getParentFoundationData,
  getParentMessagesData,
  getParentNoticeData,
  getParentReportData,
  linkParentToStudentByInviteCode,
  parentCanAccessStudent,
  replyToParentMessageThread
} from "../userStore";

export type { ParentUserStore } from "./domainContracts";

export {
  acknowledgeParentNotice,
  createParentMessageThread,
  findParentMessageCreateReplay,
  findParentMessageReplyReplay,
  getParentChildSummary,
  getParentFoundationData,
  getParentMessagesData,
  getParentNoticeData,
  getParentReportData,
  linkParentToStudentByInviteCode,
  parentCanAccessStudent,
  replyToParentMessageThread
};

export const parentUserStore = {
  parentCanAccessStudent,
  getParentNoticeData,
  acknowledgeParentNotice,
  getParentFoundationData,
  getParentChildSummary,
  getParentReportData,
  getParentMessagesData,
  findParentMessageCreateReplay,
  createParentMessageThread,
  findParentMessageReplyReplay,
  replyToParentMessageThread,
  linkParentToStudentByInviteCode
} satisfies ParentUserStore;
