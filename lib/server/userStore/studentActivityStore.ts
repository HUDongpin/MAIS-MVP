import type { GradeId, LocalizedText } from "@/types";
import type { CurriculumScope } from "./curriculumAvailability";
import type { StudentActivityPersistenceStore } from "./studentActivityPersistence";
import type { TeacherOpsLiveSessionPersistenceStore } from "./teacherOpsLiveSessionPersistence";

export type StudentActivityUserStoreDependencies = {
  getAdaptiveContentUnavailableForCurriculum: (scope: CurriculumScope, grade?: GradeId) => LocalizedText | null;
  getContentUnavailableForCurriculum: (scope: CurriculumScope, grade?: GradeId) => LocalizedText | null;
  studentActivityPersistenceStore: StudentActivityPersistenceStore;
  teacherOpsLiveSessionPersistenceStore: TeacherOpsLiveSessionPersistenceStore;
};

export function createStudentActivityUserStore({
  getAdaptiveContentUnavailableForCurriculum,
  getContentUnavailableForCurriculum,
  studentActivityPersistenceStore,
  teacherOpsLiveSessionPersistenceStore
}: StudentActivityUserStoreDependencies) {
  return {
    getContentUnavailableForCurriculum,
    getAdaptiveContentUnavailableForCurriculum,
    getPublicQuestions: studentActivityPersistenceStore.getPublicQuestions,
    getAdaptiveLearningDecision: studentActivityPersistenceStore.getAdaptiveLearningDecision,
    refreshAdaptiveLearningRecommendation: studentActivityPersistenceStore.refreshAdaptiveLearningRecommendation,
    submitQuestionAttempt: studentActivityPersistenceStore.submitQuestionAttempt,
    getMistakes: studentActivityPersistenceStore.getMistakes,
    markMistakeMastered: studentActivityPersistenceStore.markMistakeMastered,
    deleteMistake: studentActivityPersistenceStore.deleteMistake,
    clearMistakesForUser: studentActivityPersistenceStore.clearMistakesForUser,
    appendLearningEvents: studentActivityPersistenceStore.appendLearningEvents,
    clearLearningEventsForUser: studentActivityPersistenceStore.clearLearningEventsForUser,
    getAnalyticsSummary: studentActivityPersistenceStore.getAnalyticsSummary,
    getAnalyticsExport: studentActivityPersistenceStore.getAnalyticsExport,
    getDashboardData: studentActivityPersistenceStore.getDashboardData,
    getProgressData: studentActivityPersistenceStore.getProgressData,
    getRoadmapData: studentActivityPersistenceStore.getRoadmapData,
    getLessonEntryTarget: studentActivityPersistenceStore.getLessonEntryTarget,
    getLessonEntryTargetForLogin: studentActivityPersistenceStore.getLessonEntryTargetForLogin,
    getLessonBySlug: studentActivityPersistenceStore.getLessonBySlug,
    updateLessonProgress: studentActivityPersistenceStore.updateLessonProgress,
    markVisualizationSession: studentActivityPersistenceStore.markVisualizationSession,
    listVisualizationSessionsForUser: studentActivityPersistenceStore.listVisualizationSessionsForUser,
    getStudentResourceDetailData: studentActivityPersistenceStore.getStudentResourceDetailData,
    getStudentResourceDownloadData: studentActivityPersistenceStore.getStudentResourceDownloadData,
    markStudentResourceViewed: studentActivityPersistenceStore.markStudentResourceViewed,
    getStudentAssessmentDetailData: studentActivityPersistenceStore.getStudentAssessmentDetailData,
    submitStudentAssessment: studentActivityPersistenceStore.submitStudentAssessment,
    submitAssignmentWork: studentActivityPersistenceStore.submitAssignmentWork,
    getStudentAssignments: studentActivityPersistenceStore.getStudentAssignments,
    getStudentMessagesData: studentActivityPersistenceStore.getStudentMessagesData,
    createStudentMessageThread: studentActivityPersistenceStore.createStudentMessageThread,
    replyToStudentMessageThread: studentActivityPersistenceStore.replyToStudentMessageThread,
    getClassroomLiveSessionForStudent: teacherOpsLiveSessionPersistenceStore.getClassroomLiveSessionForStudent,
    submitClassroomLiveResponse: teacherOpsLiveSessionPersistenceStore.submitClassroomLiveResponse,
    submitClassroomLiveAction: teacherOpsLiveSessionPersistenceStore.submitClassroomLiveAction
  };
}
