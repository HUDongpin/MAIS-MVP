import type { TeacherReportPreview } from "@/types";
import type { TeacherOpsAssessmentPersistenceStore } from "./teacherOpsAssessmentPersistence";
import type { TeacherOpsAssignmentPersistenceStore } from "./teacherOpsAssignmentPersistence";
import type { TeacherOpsClassCollaboratorPersistenceStore } from "./teacherOpsClassCollaboratorPersistence";
import type { TeacherOpsClassPersistenceStore } from "./teacherOpsClassPersistence";
import type { TeacherOpsClassroomWorkSamplePersistenceStore } from "./teacherOpsClassroomWorkSamplePersistence";
import type { TeacherOpsForumPersistenceStore } from "./teacherOpsForumPersistence";
import type { TeacherOpsFoundationPersistenceStore } from "./teacherOpsFoundationPersistence";
import type { TeacherOpsInboxPersistenceStore } from "./teacherOpsInboxPersistence";
import type { TeacherOpsLessonKitPersistenceStore } from "./teacherOpsLessonKitPersistence";
import type { TeacherOpsLiveSessionPersistenceStore } from "./teacherOpsLiveSessionPersistence";
import type { TeacherOpsMasteryTargetPersistenceStore } from "./teacherOpsMasteryTargetPersistence";
import type { TeacherOpsStudentGroupPersistenceStore } from "./teacherOpsStudentGroupPersistence";
import type { TeacherOpsNoticePersistenceStore } from "./teacherOpsNoticePersistence";
import type { TeacherOpsOperationsPersistenceStore } from "./teacherOpsOperationsPersistence";
import type { TeacherOpsPrepTeamPersistenceStore } from "./teacherOpsPrepTeamPersistence";
import type { TeacherOpsReminderPersistenceStore } from "./teacherOpsReminderPersistence";
import type { TeacherOpsReportPersistenceStore } from "./teacherOpsReportPersistence";
import type { TeacherOpsResourcePersistenceStore } from "./teacherOpsResourcePersistence";
import type { TeacherOpsRosterImportPersistenceStore } from "./teacherOpsRosterImportPersistence";
import type { TeacherOpsRosterProfilePersistenceStore } from "./teacherOpsRosterProfilePersistence";
import type { TeacherOpsStudentProfilePersistenceStore } from "./teacherOpsStudentProfilePersistence";
import type { TeacherOpsSubmissionPersistenceStore } from "./teacherOpsSubmissionPersistence";
import type { TeacherOpsTermArchivePersistenceStore } from "./teacherOpsTermArchivePersistence";

export type TeacherOpsUserStoreDependencies = {
  teacherOpsAssessmentPersistenceStore: TeacherOpsAssessmentPersistenceStore;
  teacherOpsAssignmentPersistenceStore: TeacherOpsAssignmentPersistenceStore;
  teacherOpsClassCollaboratorPersistenceStore: TeacherOpsClassCollaboratorPersistenceStore;
  teacherOpsClassPersistenceStore: TeacherOpsClassPersistenceStore;
  teacherOpsClassroomWorkSamplePersistenceStore: TeacherOpsClassroomWorkSamplePersistenceStore;
  teacherOpsForumPersistenceStore: TeacherOpsForumPersistenceStore;
  teacherOpsFoundationPersistenceStore: TeacherOpsFoundationPersistenceStore;
  teacherOpsInboxPersistenceStore: TeacherOpsInboxPersistenceStore;
  teacherOpsLessonKitPersistenceStore: TeacherOpsLessonKitPersistenceStore;
  teacherOpsLiveSessionPersistenceStore: TeacherOpsLiveSessionPersistenceStore;
  teacherOpsMasteryTargetPersistenceStore: TeacherOpsMasteryTargetPersistenceStore;
  teacherOpsStudentGroupPersistenceStore: TeacherOpsStudentGroupPersistenceStore;
  teacherOpsNoticePersistenceStore: TeacherOpsNoticePersistenceStore;
  teacherOpsOperationsPersistenceStore: TeacherOpsOperationsPersistenceStore;
  teacherOpsPrepTeamPersistenceStore: TeacherOpsPrepTeamPersistenceStore;
  teacherOpsReminderPersistenceStore: TeacherOpsReminderPersistenceStore;
  teacherOpsReportPersistenceStore: TeacherOpsReportPersistenceStore;
  teacherOpsResourcePersistenceStore: TeacherOpsResourcePersistenceStore;
  teacherOpsRosterImportPersistenceStore: TeacherOpsRosterImportPersistenceStore;
  teacherOpsRosterProfilePersistenceStore: TeacherOpsRosterProfilePersistenceStore;
  teacherOpsStudentProfilePersistenceStore: TeacherOpsStudentProfilePersistenceStore;
  teacherOpsSubmissionPersistenceStore: TeacherOpsSubmissionPersistenceStore;
  teacherOpsTermArchivePersistenceStore: TeacherOpsTermArchivePersistenceStore;
  teacherReportPreviewToCsv: (preview: TeacherReportPreview) => string;
  teacherReportPreviewToPdf: (preview: TeacherReportPreview) => Buffer;
};

export function createTeacherOpsUserStore({
  teacherOpsAssessmentPersistenceStore,
  teacherOpsAssignmentPersistenceStore,
  teacherOpsClassCollaboratorPersistenceStore,
  teacherOpsClassPersistenceStore,
  teacherOpsClassroomWorkSamplePersistenceStore,
  teacherOpsForumPersistenceStore,
  teacherOpsFoundationPersistenceStore,
  teacherOpsInboxPersistenceStore,
  teacherOpsLessonKitPersistenceStore,
  teacherOpsLiveSessionPersistenceStore,
  teacherOpsMasteryTargetPersistenceStore,
  teacherOpsStudentGroupPersistenceStore,
  teacherOpsNoticePersistenceStore,
  teacherOpsOperationsPersistenceStore,
  teacherOpsPrepTeamPersistenceStore,
  teacherOpsReminderPersistenceStore,
  teacherOpsReportPersistenceStore,
  teacherOpsResourcePersistenceStore,
  teacherOpsRosterImportPersistenceStore,
  teacherOpsRosterProfilePersistenceStore,
  teacherOpsStudentProfilePersistenceStore,
  teacherOpsSubmissionPersistenceStore,
  teacherOpsTermArchivePersistenceStore,
  teacherReportPreviewToCsv,
  teacherReportPreviewToPdf
}: TeacherOpsUserStoreDependencies) {
  return {
    getTeacherShellData: teacherOpsFoundationPersistenceStore.getTeacherShellData,
    getTeacherFoundationData: teacherOpsFoundationPersistenceStore.getTeacherFoundationData,
    getTeacherDashboardData: teacherOpsOperationsPersistenceStore.getTeacherDashboardData,
    getTeacherAnalyticsData: teacherOpsOperationsPersistenceStore.getTeacherAnalyticsData,
    createTeacherAnalyticsFollowUpAssignment: teacherOpsAssignmentPersistenceStore.createTeacherAnalyticsFollowUpAssignment,
    getTeacherClasses: teacherOpsClassPersistenceStore.getTeacherClasses,
    getTeacherClassEnrollments: teacherOpsClassPersistenceStore.getTeacherClassEnrollments,
    getTeacherAssignmentSubmissions: teacherOpsSubmissionPersistenceStore.getTeacherAssignmentSubmissions,
    getTeacherReports: teacherOpsReportPersistenceStore.getTeacherReports,
    getTeacherReportPreview: teacherOpsReportPersistenceStore.getTeacherReportPreview,
    getTeacherReportsData: teacherOpsReportPersistenceStore.getTeacherReportsData,
    teacherReportPreviewToCsv,
    saveTeacherReportPreview: teacherOpsReportPersistenceStore.saveTeacherReportPreview,
    teacherReportPreviewToPdf,
    getTeacherOperationsData: teacherOpsOperationsPersistenceStore.getTeacherOperationsData,
    createTeacherNotice: teacherOpsNoticePersistenceStore.createTeacherNotice,
    sendTeacherNotice: teacherOpsNoticePersistenceStore.sendTeacherNotice,
    validateTeacherRosterImport: teacherOpsRosterImportPersistenceStore.validateTeacherRosterImport,
    commitTeacherRosterImport: teacherOpsRosterImportPersistenceStore.commitTeacherRosterImport,
    updateClassRosterProfile: teacherOpsRosterProfilePersistenceStore.updateClassRosterProfile,
    upsertTeacherClassCollaborator: teacherOpsClassCollaboratorPersistenceStore.upsertTeacherClassCollaborator,
    createPrepTeam: teacherOpsPrepTeamPersistenceStore.createPrepTeam,
    createPrepTeamShare: teacherOpsPrepTeamPersistenceStore.createPrepTeamShare,
    createTermArchive: teacherOpsTermArchivePersistenceStore.createTermArchive,
    getTermArchiveExport: teacherOpsTermArchivePersistenceStore.getTermArchiveExport,
    runTeacherMissingWorkReminders: teacherOpsReminderPersistenceStore.runTeacherMissingWorkReminders,
    getForumWorkspaceData: teacherOpsForumPersistenceStore.getForumWorkspaceData,
    createClassForumThread: teacherOpsForumPersistenceStore.createClassForumThread,
    addClassForumReply: teacherOpsForumPersistenceStore.addClassForumReply,
    addClassForumLivePulse: teacherOpsForumPersistenceStore.addClassForumLivePulse,
    updateClassForumThread: teacherOpsForumPersistenceStore.updateClassForumThread,
    reportClassForumContent: teacherOpsForumPersistenceStore.reportClassForumContent,
    markForumNotificationsRead: teacherOpsForumPersistenceStore.markForumNotificationsRead,
    setTeacherStudentMasteryTarget: teacherOpsMasteryTargetPersistenceStore.setTeacherStudentMasteryTarget,
    clearTeacherStudentMasteryTarget: teacherOpsMasteryTargetPersistenceStore.clearTeacherStudentMasteryTarget,
    createTeacherStudentGroup: teacherOpsStudentGroupPersistenceStore.createTeacherStudentGroup,
    updateTeacherStudentGroup: teacherOpsStudentGroupPersistenceStore.updateTeacherStudentGroup,
    deleteTeacherStudentGroup: teacherOpsStudentGroupPersistenceStore.deleteTeacherStudentGroup,
    setTeacherStudentGroupMasteryTarget: teacherOpsStudentGroupPersistenceStore.setTeacherStudentGroupMasteryTarget,
    clearTeacherStudentGroupMasteryTarget: teacherOpsStudentGroupPersistenceStore.clearTeacherStudentGroupMasteryTarget,
    createTeacherClass: teacherOpsClassPersistenceStore.createTeacherClass,
    addStudentToTeacherClass: teacherOpsClassPersistenceStore.addStudentToTeacherClass,
    joinClassByInviteCode: teacherOpsClassPersistenceStore.joinClassByInviteCode,
    getTeacherClassDetailData: teacherOpsClassPersistenceStore.getTeacherClassDetailData,
    getTeacherStudentProfileData: teacherOpsStudentProfilePersistenceStore.getTeacherStudentProfileData,
    getTeacherAssignments: teacherOpsAssignmentPersistenceStore.getTeacherAssignments,
    getTeacherResourceLibraryData: teacherOpsResourcePersistenceStore.getTeacherResourceLibraryData,
    createTeacherResource: teacherOpsResourcePersistenceStore.createTeacherResource,
    getTeacherResourceDownloadData: teacherOpsResourcePersistenceStore.getTeacherResourceDownloadData,
    getTeacherLessonKitListData: teacherOpsLessonKitPersistenceStore.getTeacherLessonKitListData,
    getTeacherLessonKitCreateData: teacherOpsLessonKitPersistenceStore.getTeacherLessonKitCreateData,
    getTeacherLessonKitDetailData: teacherOpsLessonKitPersistenceStore.getTeacherLessonKitDetailData,
    createTeacherLessonKit: teacherOpsLessonKitPersistenceStore.createTeacherLessonKit,
    updateTeacherLessonKit: teacherOpsLessonKitPersistenceStore.updateTeacherLessonKit,
    generateTeacherLessonKitWithAI: teacherOpsLessonKitPersistenceStore.generateTeacherLessonKitWithAI,
    publishTeacherLessonKit: teacherOpsLessonKitPersistenceStore.publishTeacherLessonKit,
    getTeacherLiveSessionById: teacherOpsLiveSessionPersistenceStore.getTeacherLiveSessionById,
    createClassroomWorkSample: teacherOpsClassroomWorkSamplePersistenceStore.createClassroomWorkSample,
    updateClassroomWorkSampleStatus: teacherOpsClassroomWorkSamplePersistenceStore.updateClassroomWorkSampleStatus,
    getTeacherAssessmentCreateData: teacherOpsAssessmentPersistenceStore.getTeacherAssessmentCreateData,
    getTeacherAssessmentBuilderQuestions: teacherOpsAssessmentPersistenceStore.getTeacherAssessmentBuilderQuestions,
    getTeacherAssessmentListData: teacherOpsAssessmentPersistenceStore.getTeacherAssessmentListData,
    createTeacherAssessment: teacherOpsAssessmentPersistenceStore.createTeacherAssessment,
    updateTeacherAssessment: teacherOpsAssessmentPersistenceStore.updateTeacherAssessment,
    cloneTeacherAssessment: teacherOpsAssessmentPersistenceStore.cloneTeacherAssessment,
    getTeacherAssessmentDetailData: teacherOpsAssessmentPersistenceStore.getTeacherAssessmentDetailData,
    generateTeacherReviewLessonPlan: teacherOpsAssessmentPersistenceStore.generateTeacherReviewLessonPlan,
    getTeacherReviewLessonDetailData: teacherOpsAssessmentPersistenceStore.getTeacherReviewLessonDetailData,
    updateTeacherReviewLessonPlan: teacherOpsAssessmentPersistenceStore.updateTeacherReviewLessonPlan,
    publishTeacherReviewLessonParentDraft: teacherOpsAssessmentPersistenceStore.publishTeacherReviewLessonParentDraft,
    getTeacherReviewLessonExportData: teacherOpsAssessmentPersistenceStore.getTeacherReviewLessonExportData,
    createReviewLessonRemediationAssessment: teacherOpsAssessmentPersistenceStore.createReviewLessonRemediationAssessment,
    updateTeacherAssessmentAnalysisSettings: teacherOpsAssessmentPersistenceStore.updateTeacherAssessmentAnalysisSettings,
    updateTeacherAssessmentSubmissionMarking: teacherOpsAssessmentPersistenceStore.updateTeacherAssessmentSubmissionMarking,
    getTeacherAssessmentCsv: teacherOpsAssessmentPersistenceStore.getTeacherAssessmentCsv,
    createTeacherAssignment: teacherOpsAssignmentPersistenceStore.createTeacherAssignment,
    deleteTeacherAssignment: teacherOpsAssignmentPersistenceStore.deleteTeacherAssignment,
    getTeacherAssignmentDetailData: teacherOpsAssignmentPersistenceStore.getTeacherAssignmentDetailData,
    createTeacherSubmissionGradingRun: teacherOpsSubmissionPersistenceStore.createTeacherSubmissionGradingRun,
    reviewTeacherSubmission: teacherOpsSubmissionPersistenceStore.reviewTeacherSubmission,
    updateTeacherSubmissionGrade: teacherOpsSubmissionPersistenceStore.updateTeacherSubmissionGrade,
    getTeacherInboxData: teacherOpsInboxPersistenceStore.getTeacherInboxData,
    replyToTeacherMessageThread: teacherOpsInboxPersistenceStore.replyToTeacherMessageThread,
    updateTeacherMessageThread: teacherOpsInboxPersistenceStore.updateTeacherMessageThread,
    getTeacherLiveData: teacherOpsLiveSessionPersistenceStore.getTeacherLiveData,
    getClassroomLiveRoster: teacherOpsLiveSessionPersistenceStore.getClassroomLiveRoster,
    startTeacherLiveSession: teacherOpsLiveSessionPersistenceStore.startTeacherLiveSession,
    endTeacherLiveSession: teacherOpsLiveSessionPersistenceStore.endTeacherLiveSession,
    getClassroomLiveSessionForTeacherPreview: teacherOpsLiveSessionPersistenceStore.getClassroomLiveSessionForTeacherPreview,
    updateTeacherLiveTool: teacherOpsLiveSessionPersistenceStore.updateTeacherLiveTool
  };
}
