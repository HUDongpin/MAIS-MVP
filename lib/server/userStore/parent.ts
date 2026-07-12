import type { ParentUserStore } from "./domainContracts";
import {
  acknowledgeParentNotice,
  createParentMessageThread,
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
  createParentMessageThread,
  replyToParentMessageThread,
  linkParentToStudentByInviteCode
} satisfies ParentUserStore;
