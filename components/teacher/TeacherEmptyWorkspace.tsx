"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { TeacherDashboardClient } from "@/components/teacher/TeacherDashboardClient";
import { TeacherAnalyticsView } from "@/components/teacher/TeacherAnalyticsView";
import { TeacherRewardsView } from "@/components/teacher/TeacherRewardsView";
import { TeacherPrepListView } from "@/components/teacher/TeacherPrepViews";
import { TeacherLiveView } from "@/components/teacher/TeacherLiveView";
import {
  TeacherAssignmentsManager,
  TeacherClassesManager,
  TeacherInboxManager,
  type TeacherAssignmentQueueFilter
} from "@/components/teacher/TeacherManagementViews";
import {
  TeacherAssessmentsView,
  TeacherResourcesView
} from "@/components/teacher/TeacherResourceAssessmentViews";
import { TeacherReportsView } from "@/components/teacher/TeacherReportsView";
import { TeacherOperationsView } from "@/components/teacher/TeacherOperationsView";
import type {
  Assignment,
  StudentSession,
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

type EmptyWorkspaceView =
  | "dashboard"
  | "classes"
  | "analytics"
  | "rewards"
  | "lesson-kits"
  | "live"
  | "assignments"
  | "resources"
  | "assessments"
  | "reports"
  | "inbox"
  | "operations";

const emptyAssignmentQueueFilters = new Set<TeacherAssignmentQueueFilter>(["all", "grading", "correction-required", "correction-review"]);
const emptyAssignmentQueueCounts: Record<TeacherAssignmentQueueFilter, number> = {
  all: 0,
  grading: 0,
  "correction-required": 0,
  "correction-review": 0
};

function normalizeEmptyAssignmentQueueFilter(value?: string | null): TeacherAssignmentQueueFilter {
  if (value === "returned") return "correction-required";
  return emptyAssignmentQueueFilters.has(value as TeacherAssignmentQueueFilter) ? (value as TeacherAssignmentQueueFilter) : "all";
}

function generatedAt() {
  return new Date().toISOString();
}

function emptyFoundation(teacher: StudentSession): TeacherFoundationData {
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

function emptyDashboardData(foundation: TeacherFoundationData): TeacherDashboardData {
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

function emptyAnalyticsData(foundation: TeacherFoundationData): TeacherAnalyticsData {
  return {
    generatedAt: generatedAt(),
    selectedClassId: "all",
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

function emptyRewardsData(): TeacherRewardsData {
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

function emptyLessonKitData(foundation: TeacherFoundationData): TeacherLessonKitListData {
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

function emptyLiveData(foundation: TeacherFoundationData): TeacherLiveData {
  return {
    generatedAt: generatedAt(),
    classes: foundation.classes,
    activeSession: null,
    recentSessions: []
  };
}

function emptyResourceData(): TeacherResourceLibraryData {
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

function emptyAssessmentData(foundation: TeacherFoundationData): TeacherAssessmentListData {
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

function emptyReportsData(foundation: TeacherFoundationData): TeacherReportsData {
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

function emptyInboxData(): TeacherInboxData {
  return {
    threads: [],
    selectedThread: null
  };
}

function emptyOperationsData(foundation: TeacherFoundationData): TeacherOperationsData {
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

const creationGates = [
  {
    prefix: "/teacher/lesson-kits/new",
    backHref: "/teacher/lesson-kits",
    eyebrow: { en: "New lesson kit", zh: "新建備課包", zhHans: "新建备课包" },
    body: {
      en: "Lesson kits are authored for a class. Create your first class, then come back to build a lesson kit.",
      zh: "備課包需要對應班級。請先建立第一個班級，再回來新建備課包。",
      zhHans: "备课包需要对应班级。请先创建第一个班级，再回来新建备课包。"
    },
    backLabel: { en: "Back to lesson kits", zh: "返回備課包", zhHans: "返回备课包" }
  },
  {
    prefix: "/teacher/assignments/new",
    backHref: "/teacher/assignments",
    eyebrow: { en: "New assignment", zh: "新增作業", zhHans: "新增作业" },
    body: {
      en: "Assignments are sent to a class. Create your first class, then come back to create an assignment.",
      zh: "作業需要指派給班級。請先建立第一個班級，再回來新增作業。",
      zhHans: "作业需要指派给班级。请先创建第一个班级，再回来新增作业。"
    },
    backLabel: { en: "Back to assignments", zh: "返回作業", zhHans: "返回作业" }
  },
  {
    prefix: "/teacher/assessments/new",
    backHref: "/teacher/assessments",
    eyebrow: { en: "New assessment", zh: "新增測驗", zhHans: "新增测验" },
    body: {
      en: "Assessments are assigned to a class. Create your first class, then come back to create an assessment.",
      zh: "測驗需要指派給班級。請先建立第一個班級，再回來新增測驗。",
      zhHans: "测验需要指派给班级。请先创建第一个班级，再回来新增测验。"
    },
    backLabel: { en: "Back to assessments", zh: "返回測驗", zhHans: "返回测验" }
  }
] as const;

function resolveCreationGate(pathname: string) {
  return creationGates.find((gate) => pathname === gate.prefix || pathname.startsWith(`${gate.prefix}/`)) ?? null;
}

function EmptyWorkspaceCreationGate({ gate }: { gate: (typeof creationGates)[number] }) {
  const { t } = useSettings();

  return (
    <section className="glass-panel p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">{t(gate.eyebrow)}</p>
      <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
        {t({ en: "Create a class first", zh: "請先建立班級", zhHans: "请先创建班级" })}
      </h1>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{t(gate.body)}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/teacher/classes" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
          {t({ en: "Create a class", zh: "建立班級", zhHans: "创建班级" })}
        </Link>
        <Link href={gate.backHref} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
          {t(gate.backLabel)}
        </Link>
      </div>
    </section>
  );
}

function resolveEmptyWorkspaceView(pathname: string): EmptyWorkspaceView {
  if (pathname === "/teacher" || pathname === "/teacher/dashboard") return "dashboard";
  if (pathname.startsWith("/teacher/classes")) return "classes";
  if (pathname.startsWith("/teacher/analytics")) return "analytics";
  if (pathname.startsWith("/teacher/rewards")) return "rewards";
  if (pathname.startsWith("/teacher/lesson-kits")) return "lesson-kits";
  if (pathname.startsWith("/teacher/classroom-sessions") || pathname.startsWith("/teacher/live")) return "live";
  if (pathname.startsWith("/teacher/assignments")) return "assignments";
  if (pathname.startsWith("/teacher/resources")) return "resources";
  if (pathname.startsWith("/teacher/assessments")) return "assessments";
  if (pathname.startsWith("/teacher/reports")) return "reports";
  if (pathname.startsWith("/teacher/communications") || pathname.startsWith("/teacher/inbox")) return "inbox";
  if (pathname.startsWith("/teacher/operations")) return "operations";
  return "dashboard";
}

export function TeacherEmptyWorkspace({ path, user }: { path: string; user: StudentSession }) {
  const searchParams = useSearchParams();
  const foundation = useMemo(() => emptyFoundation(user), [user]);
  const data = useMemo(() => ({
    dashboard: emptyDashboardData(foundation),
    analytics: emptyAnalyticsData(foundation),
    rewards: emptyRewardsData(),
    lessonKits: emptyLessonKitData(foundation),
    live: emptyLiveData(foundation),
    assignments: [] as Assignment[],
    resources: emptyResourceData(),
    assessments: emptyAssessmentData(foundation),
    reports: emptyReportsData(foundation),
    inbox: emptyInboxData(),
    operations: emptyOperationsData(foundation)
  }), [foundation]);
  const activeAssignmentFilter = normalizeEmptyAssignmentQueueFilter(searchParams.get("filter"));
  const activeAssignmentClassId = searchParams.get("classId") ?? "";
  const activeAssignmentQuery = searchParams.get("q")?.trim() ?? "";
  const creationGate = resolveCreationGate(path);

  if (creationGate) {
    return <EmptyWorkspaceCreationGate gate={creationGate} />;
  }

  switch (resolveEmptyWorkspaceView(path)) {
    case "classes":
      return <TeacherClassesManager classes={foundation.classes} />;
    case "analytics":
      return <TeacherAnalyticsView analytics={data.analytics} />;
    case "rewards":
      return <TeacherRewardsView rewards={data.rewards} />;
    case "lesson-kits":
      return <TeacherPrepListView data={data.lessonKits} />;
    case "live":
      return <TeacherLiveView live={data.live} />;
    case "assignments":
      return (
        <TeacherAssignmentsManager
          assignments={data.assignments}
          classes={foundation.classes}
          activeFilter={activeAssignmentFilter}
          activeClassId={activeAssignmentClassId}
          query={activeAssignmentQuery}
          queueCounts={emptyAssignmentQueueCounts}
          totalCount={0}
        />
      );
    case "resources":
      return <TeacherResourcesView data={data.resources} />;
    case "assessments":
      return <TeacherAssessmentsView data={data.assessments} />;
    case "reports":
      return <TeacherReportsView reports={data.reports} />;
    case "inbox":
      return <TeacherInboxManager inbox={data.inbox} />;
    case "operations":
      return <TeacherOperationsView data={data.operations} initialTab="notices" />;
    case "dashboard":
    default:
      return <TeacherDashboardClient initialDashboard={data.dashboard} />;
  }
}
