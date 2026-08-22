import type {
  GamificationSummary,
  LevelDefinition,
  LocalizedText,
  ParentChildSummary,
  ParentChildSummarySafe,
  ParentFoundationData,
  ParentFoundationSafeData,
  ParentGuardianLinkSafe,
  ParentMotivationSummarySafe,
  ParentNoticeData,
  ParentNoticeSafe,
  ParentNoticeSafeData,
  ParentReportData,
  ParentReportPreviewSafe,
  ParentReportSafe,
  ParentReportSafeData,
  ParentSafeTeacherDraft,
  ParentSafeTeacherDraftDto,
  RewardPointSummary,
  GuardianLink,
  StudentBadge,
  StudentQuestProgress,
  TeacherNotice,
  TeacherReport,
  TeacherReportPreview
} from "@/types";
import { decodeTeacherReportPreview } from "@/lib/server/userStore/teacherReportPreviewDecoder";

function toParentLocalizedText(value: LocalizedText): LocalizedText {
  return {
    en: value.en,
    zh: value.zh,
    ...(value.zhHans !== undefined ? { zhHans: value.zhHans } : {})
  };
}

function toParentRewardPointSummary(value: RewardPointSummary): RewardPointSummary {
  return {
    balance: value.balance,
    available: value.available,
    reserved: value.reserved,
    lifetimeEarned: value.lifetimeEarned,
    spent: value.spent,
    pendingRequests: value.pendingRequests,
    approvedRequests: value.approvedRequests
  };
}

function toParentLevelDefinition(value: LevelDefinition): LevelDefinition {
  return {
    level: value.level,
    title: toParentLocalizedText(value.title),
    minXp: value.minXp,
    ...(value.maxXp !== undefined ? { maxXp: value.maxXp } : {})
  };
}

function toParentBadge(value: StudentBadge): StudentBadge {
  return {
    id: value.id,
    name: toParentLocalizedText(value.name),
    description: toParentLocalizedText(value.description),
    icon: value.icon,
    category: value.category,
    criteria: {
      kind: value.criteria.kind,
      target: value.criteria.target
    },
    sortOrder: value.sortOrder,
    earned: value.earned,
    earnedAt: value.earnedAt,
    progress: value.progress
  };
}

function toParentQuest(value: StudentQuestProgress): StudentQuestProgress {
  return {
    quest: {
      id: value.quest.id,
      title: toParentLocalizedText(value.quest.title),
      description: toParentLocalizedText(value.quest.description),
      targetType: value.quest.targetType,
      targetCount: value.quest.targetCount,
      xp: value.quest.xp,
      rewardPoints: value.quest.rewardPoints,
      cadence: value.quest.cadence,
      sortOrder: value.quest.sortOrder
    },
    progress: value.progress,
    target: value.target,
    completed: value.completed,
    claimed: value.claimed,
    xpReward: value.xpReward,
    rewardPointReward: value.rewardPointReward
  };
}

function toParentMotivationSummarySafe(value: GamificationSummary | null): ParentMotivationSummarySafe | null {
  if (!value) return null;
  return {
    generatedAt: value.generatedAt,
    studentId: value.studentId,
    xp: value.xp,
    level: {
      current: toParentLevelDefinition(value.level.current),
      next: value.level.next ? toParentLevelDefinition(value.level.next) : null,
      xpIntoLevel: value.level.xpIntoLevel,
      xpForNextLevel: value.level.xpForNextLevel,
      progressPercent: value.level.progressPercent
    },
    streakDays: value.streakDays,
    badges: value.badges.map(toParentBadge),
    earnedBadges: value.earnedBadges.map(toParentBadge),
    quests: value.quests.map(toParentQuest),
    rewardSummary: toParentRewardPointSummary(value.rewardSummary),
    motivation: {
      celebrate: value.motivation.celebrate.map(toParentLocalizedText),
      support: value.motivation.support.map(toParentLocalizedText)
    }
  };
}

function toParentReportPreviewSafe(value: TeacherReportPreview): ParentReportPreviewSafe {
  const decoded = decodeTeacherReportPreview(value);
  if (!decoded) throw new TypeError("Invalid teacher report preview.");

  return {
    id: decoded.id,
    type: decoded.type,
    language: decoded.language,
    title: decoded.title,
    subtitle: decoded.subtitle,
    generatedAt: decoded.generatedAt,
    subjectName: decoded.subjectName,
    ...(decoded.classId !== undefined ? { classId: decoded.classId } : {}),
    ...(decoded.className !== undefined ? { className: decoded.className } : {}),
    ...(decoded.studentId !== undefined ? { studentId: decoded.studentId } : {}),
    metrics: {
      learningMinutes: decoded.metrics.learningMinutes,
      masteryChange: decoded.metrics.masteryChange,
      averageMastery: decoded.metrics.averageMastery,
      accuracy: decoded.metrics.accuracy,
      completionRate: decoded.metrics.completionRate
    },
    strengths: [...decoded.strengths],
    weaknesses: [...decoded.weaknesses],
    mistakeTypes: [...decoded.mistakeTypes],
    suggestedPractice: [...decoded.suggestedPractice]
  };
}

function toParentReportSafe(value: TeacherReport): ParentReportSafe {
  return {
    id: value.id,
    type: value.type,
    title: toParentLocalizedText(value.title),
    ...(value.classId !== undefined ? { classId: value.classId } : {}),
    ...(value.studentId !== undefined ? { studentId: value.studentId } : {}),
    generatedAt: value.generatedAt,
    summary: toParentLocalizedText(value.summary),
    ...(value.preview ? { preview: toParentReportPreviewSafe(value.preview) } : {})
  };
}

export function toParentChildSummarySafe(value: ParentChildSummary): ParentChildSummarySafe {
  return {
    student: {
      id: value.student.id,
      name: value.student.name,
      grade: value.student.grade
    },
    classes: value.classes.map((teacherClass) => ({
      id: teacherClass.id,
      name: teacherClass.name,
      grade: teacherClass.grade
    })),
    generatedAt: value.generatedAt,
    averageMastery: value.averageMastery,
    learningMinutes7d: value.learningMinutes7d,
    latestActivityAt: value.latestActivityAt,
    weeklyActivity: value.weeklyActivity.map((activity) => ({
      day: activity.day,
      minutes: activity.minutes
    })),
    strengths: value.strengths.map((topic) => ({
      id: topic.id,
      title: toParentLocalizedText(topic.title),
      mastery: topic.mastery
    })),
    supportTopics: value.supportTopics.map((topic) => ({
      id: topic.id,
      title: toParentLocalizedText(topic.title),
      mastery: topic.mastery
    })),
    assignments: value.assignments.map((item) => ({
      assignment: {
        id: item.assignment.id,
        title: toParentLocalizedText(item.assignment.title),
        status: item.assignment.status,
        dueAt: item.assignment.dueAt
      },
      submission: {
        id: item.submission.id,
        status: item.submission.status,
        score: item.submission.score,
        submittedAt: item.submission.submittedAt,
        gradedAt: item.submission.gradedAt,
        feedback: item.submission.feedback ? toParentLocalizedText(item.submission.feedback) : null,
        correctionRequest: item.submission.correctionRequest
          ? toParentLocalizedText(item.submission.correctionRequest)
          : null,
        correctionDueAt: item.submission.correctionDueAt,
        correctionRound: item.submission.correctionRound,
        maxCorrectionRounds: item.submission.maxCorrectionRounds,
        resolvedAt: item.submission.resolvedAt,
        updatedAt: item.submission.updatedAt
      },
      className: item.className,
      classGrade: item.classGrade
    })),
    rewardSummary: toParentRewardPointSummary(value.rewardSummary),
    motivationSummary: toParentMotivationSummarySafe(value.motivationSummary),
    latestParentReport: value.latestParentReport ? toParentReportSafe(value.latestParentReport) : null,
    celebrate: value.celebrate.map(toParentLocalizedText),
    support: value.support.map(toParentLocalizedText)
  };
}

export function toParentGuardianLinkSafe(value: GuardianLink): ParentGuardianLinkSafe {
  return {
    id: value.id,
    studentId: value.studentId,
    studentName: value.studentName,
    studentGrade: value.studentGrade,
    relationship: value.relationship,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

export function toParentFoundationSafeData(value: ParentFoundationData): ParentFoundationSafeData {
  return {
    parent: {
      id: value.parent.id,
      name: value.parent.name
    },
    children: value.children.map(toParentChildSummarySafe),
    selectedChild: value.selectedChild ? toParentChildSummarySafe(value.selectedChild) : null,
    links: value.links.map(toParentGuardianLinkSafe),
    totals: {
      children: value.totals.children,
      activeReports: value.totals.activeReports,
      openMessages: value.totals.openMessages,
      pendingAssignments: value.totals.pendingAssignments
    }
  };
}

export function toParentReportDataSafe(value: ParentReportData): ParentReportSafeData {
  return {
    generatedAt: value.generatedAt,
    children: value.children.map(toParentChildSummarySafe),
    selectedChild: value.selectedChild ? toParentChildSummarySafe(value.selectedChild) : null,
    reports: value.reports.map(toParentReportSafe)
  };
}

function toParentNoticeSafe(value: TeacherNotice): ParentNoticeSafe {
  return {
    id: value.id,
    className: value.className,
    audience: value.audience,
    channelName: value.channelName,
    subject: toParentLocalizedText(value.subject),
    body: toParentLocalizedText(value.body),
    status: value.status,
    ...(value.assignmentId !== undefined ? { assignmentId: value.assignmentId } : {}),
    ...(value.source ? { source: { kind: value.source.kind } } : {}),
    dueAt: value.dueAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    sentAt: value.sentAt,
    recipients: value.recipients.map((recipient) => ({
      id: recipient.id,
      noticeId: recipient.noticeId,
      studentId: recipient.studentId,
      studentName: recipient.studentName,
      status: recipient.status,
      acknowledgedAt: recipient.acknowledgedAt,
      createdAt: recipient.createdAt
    })),
    acknowledgement: {
      total: value.acknowledgement.total,
      acknowledged: value.acknowledgement.acknowledged,
      pending: value.acknowledgement.pending
    }
  };
}

function toParentSafeTeacherDraftDto(value: ParentSafeTeacherDraft): ParentSafeTeacherDraftDto {
  return {
    id: value.id,
    noticeId: value.noticeId,
    className: value.className,
    teacherName: value.teacherName,
    title: toParentLocalizedText(value.title),
    summary: toParentLocalizedText(value.summary),
    status: value.status,
    publishedAt: value.publishedAt,
    acknowledgement: {
      total: value.acknowledgement.total,
      acknowledged: value.acknowledgement.acknowledged,
      pending: value.acknowledgement.pending
    }
  };
}

export function toParentNoticeDataSafe(value: ParentNoticeData): ParentNoticeSafeData {
  return {
    generatedAt: value.generatedAt,
    children: value.children.map(toParentChildSummarySafe),
    notices: value.notices.map(toParentNoticeSafe),
    parentSafeDrafts: value.parentSafeDrafts.map(toParentSafeTeacherDraftDto)
  };
}
