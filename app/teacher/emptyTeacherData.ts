import type {
  Assignment,
  TeacherAnalyticsData,
  TeacherAssessmentListData,
  TeacherDashboardData,
  TeacherFoundationData,
  TeacherInboxData,
  TeacherLessonKitListData,
  TeacherLiveData,
  TeacherOperationsData,
  TeacherReportsData,
  TeacherResourceLibraryData,
  TeacherRewardsData
} from "@/types";

function generatedAt() {
  return new Date().toISOString();
}

export function emptyTeacherFoundationData(teacher: TeacherFoundationData["teacher"]): TeacherFoundationData {
  return {
    teacher,
    classes: [],
    totals: {
      classes: 0,
      students: 0,
      activeAssignments: 0,
      unreadMessages: 0,
      resources: 0,
      assessments: 0
    },
    recentAssignments: [],
    inboxPreview: [],
    resources: [],
    assessments: []
  };
}

export function emptyTeacherDashboardData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherDashboardData {
  return {
    generatedAt: generatedAt(),
    teacher: foundation.teacher,
    kpis: {
      pendingGrading: 0,
      pendingCorrectionReview: 0,
      correctionsRequired: 0,
      unrepliedMessages: 0,
      weeklyAssignmentCompletionRate: 0,
      atRiskStudents: 0
    },
    rewardSummary: {
      pendingRedemptions: 0,
      approvedRedemptions: 0,
      pointsAwardedThisWeek: 0,
      topStudentName: null,
      topStudentAvailablePoints: 0
    },
    classSummaries: [],
    masteryHeatmap: [],
    actionQueue: []
  };
}

export function emptyTeacherAnalyticsData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">, selectedClassId?: string | null): TeacherAnalyticsData {
  return {
    generatedAt: generatedAt(),
    selectedClassId: selectedClassId && foundation.classes.some((teacherClass) => teacherClass.id === selectedClassId) ? selectedClassId : "all",
    classes: foundation.classes,
    summary: {
      averageMastery: 0,
      atRiskStudents: 0,
      averageAnswerSeconds: null,
      hintRequests7d: 0,
      aiTutorMessages7d: 0,
      activeStudents7d: 0,
      activeStudents30d: 0
    },
    topicMastery: [],
    studentRisks: [],
    frequentMistakes: [],
    activityTrend7d: [],
    activityTrend30d: [],
    interventionGroups: []
  };
}

export function emptyTeacherRewardsData(): TeacherRewardsData {
  return {
    generatedAt: generatedAt(),
    totals: {
      students: 0,
      availablePoints: 0,
      pendingRedemptions: 0,
      approvedRedemptions: 0,
      fulfilledRedemptions: 0,
      pointsAwardedThisWeek: 0
    },
    reasonPresets: [],
    students: [],
    catalog: [],
    redemptions: [],
    recentLedger: []
  };
}

export function emptyTeacherLessonKitListData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherLessonKitListData {
  return {
    generatedAt: generatedAt(),
    classes: foundation.classes,
    topicOptions: [],
    kits: [],
    totals: {
      kits: 0,
      needsReview: 0,
      published: 0,
      mainlandTopics: 0
    }
  };
}

export function emptyTeacherLiveData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherLiveData {
  return {
    generatedAt: generatedAt(),
    classes: foundation.classes,
    activeSession: null,
    recentSessions: []
  };
}

export const emptyTeacherAssignments: Assignment[] = [];

export function emptyTeacherResourceLibraryData(): TeacherResourceLibraryData {
  return {
    generatedAt: generatedAt(),
    resources: [],
    topicOptions: [],
    totals: {
      resources: 0,
      uploadedThisWeek: 0,
      assignmentReferences: 0,
      assessmentReferences: 0
    }
  };
}

export function emptyTeacherAssessmentListData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherAssessmentListData {
  return {
    generatedAt: generatedAt(),
    classes: foundation.classes,
    assessments: [],
    totals: {
      assessments: 0,
      openAssessments: 0,
      submittedCount: 0,
      averageScore: null
    }
  };
}

export function emptyTeacherReportsData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherReportsData {
  return {
    generatedAt: generatedAt(),
    classes: foundation.classes,
    students: [],
    assignments: [],
    assessments: [],
    reportHistory: [],
    defaultPreview: null
  };
}

export const emptyTeacherInboxData: TeacherInboxData = {
  threads: [],
  selectedThread: null
};

export function emptyTeacherOperationsData(foundation: Pick<TeacherFoundationData, "teacher" | "classes">): TeacherOperationsData {
  return {
    generatedAt: generatedAt(),
    teacher: foundation.teacher,
    classes: foundation.classes,
    selectedClassId: null,
    wecom: {
      enabled: false,
      channels: []
    },
    notices: [],
    reminderPolicy: {
      enabled: false,
      thresholds: [],
      quietHours: {
        start: "22:00",
        end: "07:00"
      }
    },
    reminderRuns: [],
    missingWork: [],
    roster: [],
    collaborators: [],
    prepTeams: [],
    termArchives: [],
    totals: {
      notices: 0,
      pendingAcknowledgements: 0,
      missingWork: 0,
      collaborators: 0,
      archives: 0
    }
  };
}
