"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { ProgressCard } from "@/components/cards/ProgressCard";
import { TopicCard } from "@/components/cards/TopicCard";
import { DashboardBackToTopButton } from "@/components/dashboard/DashboardBackToTopButton";
import { DashboardProgressDetails } from "@/components/dashboard/DashboardProgressDetails";
import { LearningAnalyticsReport } from "@/components/dashboard/LearningAnalyticsReport";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { formatDifficultyLabel, formatGradeLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { lessonHrefForSlug, lessonHrefForTopicId } from "@/lib/lessonLinks";
import type { AdaptiveActionType, AdaptiveLearningDecision, AdaptiveSkillSummary, DashboardData, Language, LocalizedText, StudentAssignmentItem } from "@/types";

function readDashboard(value: unknown) {
  const response = value as { dashboard?: unknown } | null;
  return (response?.dashboard ?? null) as DashboardData | null;
}

function readAssignments(value: unknown) {
  const response = value as { assignments?: unknown } | null;
  return Array.isArray(response?.assignments) ? (response.assignments as StudentAssignmentItem[]) : [];
}

function readAdaptiveDecision(value: unknown) {
  const response = value as { decision?: unknown } | null;
  const decision = response?.decision as Partial<AdaptiveLearningDecision> | undefined;
  if (
    typeof decision?.action !== "string" ||
    typeof decision.skill?.id !== "string" ||
    typeof decision.topic?.id !== "string" ||
    typeof decision.engine?.llmStatus !== "string" ||
    !Array.isArray(decision.skillMap) ||
    !Array.isArray(decision.dueReviews)
  ) {
    return null;
  }

  return decision as AdaptiveLearningDecision;
}

function assignmentHref(item: StudentAssignmentItem) {
  if (item.assignment.contentType === "lesson" && item.assignment.targetId) return lessonHrefForSlug(item.assignment.targetId);
  if (item.assignment.contentType === "practice") return "/practice";
  if (item.assignment.contentType === "visualization") return "/visualization-lab";
  if (item.assignment.contentType === "resource" && item.assignment.targetId) return `/resource/${item.assignment.targetId}`;
  if (item.assignment.contentType === "assessment" && item.assignment.targetId) return `/assessment/${item.assignment.targetId}`;
  return "/adaptive-learning#my-assignments";
}

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatReviewDate(value: string | null, language: Language) {
  if (!value) return textForLanguage({ en: "Not scheduled", zh: "未排程" }, language);
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatGeneratedAt(value: string, language: Language) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function actionLabel(action: AdaptiveActionType) {
  const labels: Record<AdaptiveActionType, { en: string; zh: string }> = {
    review: { en: "Spaced review", zh: "間隔複習" },
    repair: { en: "Repair foundation", zh: "修補基礎" },
    practice: { en: "Targeted practice", zh: "針對練習" },
    lesson: { en: "Guided lesson", zh: "導學課節" },
    challenge: { en: "Challenge work", zh: "挑戰練習" }
  };
  return labels[action];
}

function confidenceCopy(confidence: AdaptiveLearningDecision["confidence"]) {
  const labels: Record<AdaptiveLearningDecision["confidence"], LocalizedText> = {
    thin: { en: "Diagnostic evidence", zh: "診斷證據" },
    developing: { en: "Developing evidence", zh: "累積中證據" },
    strong: { en: "Strong evidence", zh: "強證據" }
  };
  return labels[confidence];
}

function signalLabel(signal: string): LocalizedText {
  const labels: Record<string, LocalizedText> = {
    deterministicCandidateId: { en: "Candidate match", zh: "候選一致" },
    masteryProbability: { en: "Mastery probability", zh: "掌握概率" },
    hardGuardFlags: { en: "Guardrail flags", zh: "防護標記" },
    wrongStreak: { en: "Wrong streak", zh: "連續答錯" },
    correctStreak: { en: "Correct streak", zh: "連續答對" },
    attemptCount: { en: "Attempt depth", zh: "作答深度" },
    questionIntegrity: { en: "Question integrity", zh: "題目完整性" }
  };

  return labels[signal] ?? { en: signal.replace(/[-_]/g, " "), zh: signal.replace(/[-_]/g, " ") };
}

function engineStatusCopy(decision: AdaptiveLearningDecision) {
  if (decision.engine.mode === "llm-assisted") {
    return {
      label: { en: "AI-assisted adaptive recommendation", zh: "AI 輔助適性建議" },
      detail: decision.engine.confidenceExplanation ?? { en: "Validated against the BKT guardrails.", zh: "已通過 BKT 防護規則驗證。" }
    };
  }

  if (decision.engine.llmStatus === "rejected" && decision.engine.errorKind === "format") {
    return {
      label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議" },
      detail: {
        en: "AI rerank returned incomplete JSON; showing the safe deterministic plan.",
        zh: "AI 重排傳回的 JSON 不完整；目前顯示安全的確定性方案。"
      }
    };
  }

  if (decision.engine.llmStatus === "rejected" && decision.engine.errorKind === "guardrail") {
    return {
      label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議" },
      detail: {
        en: "AI rerank tried to leave the allowed candidate set, so the safe deterministic plan is shown.",
        zh: "AI 重排嘗試離開允許的候選範圍，因此顯示安全的確定性方案。"
      }
    };
  }

  const statusDetail: Record<AdaptiveLearningDecision["engine"]["llmStatus"], { en: string; zh: string }> = {
    disabled: { en: "LLM reranking is disabled; using deterministic BKT guardrails.", zh: "LLM 重排未啟用；目前使用確定性 BKT 防護規則。" },
    pending: { en: "LLM reranking is warming in the background.", zh: "LLM 重排正在背景準備。" },
    ready: { en: "Using deterministic BKT guardrails.", zh: "正在使用確定性 BKT 防護規則。" },
    failed: { en: "AI rerank was unavailable, so the safe deterministic plan is shown.", zh: "AI 重排暫時不可用，因此顯示安全的確定性方案。" },
    rejected: { en: "AI rerank could not be used, so the safe deterministic plan is shown.", zh: "AI 重排結果未能使用，因此顯示安全的確定性方案。" }
  };

  return {
    label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議" },
    detail: statusDetail[decision.engine.llmStatus]
  };
}

function SkillPill({ summary, renderText }: { summary: AdaptiveSkillSummary; renderText: (value: { en: string; zh: string }) => string }) {
  const mastery = Math.round(summary.state.pMastery * 100);
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950 dark:text-white">{renderText(summary.skill.title)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{renderText(summary.topic.title)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-200">{mastery}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${mastery}%` }} />
      </div>
    </div>
  );
}

function AdaptiveRecommendationPanel({
  decision,
  language,
  t,
  text
}: {
  decision: AdaptiveLearningDecision;
  language: Language;
  t: (value: LocalizedText) => string;
  text: (value: LocalizedText) => string;
}) {
  const engineStatus = engineStatusCopy(decision);
  const aiConfidence = decision.engine.aiConfidence ?? null;
  const generatedAt = formatGeneratedAt(decision.generatedAt, language);
  const signals = (decision.engine.signalsUsed ?? []).filter(Boolean).slice(0, 4);
  const reviewItems = (decision.dueReviews.length ? decision.dueReviews : decision.skillMap.slice(0, 1)).slice(0, 3);

  return (
    <section className="glass-panel mt-6 overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t({ en: "Adaptive engine", zh: "適性引擎" })}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
                <span>{t(actionLabel(decision.action))}</span>
                <span className="text-slate-400 dark:text-slate-500">: </span>
                <span className="break-words">{text(decision.skill.title)}</span>
              </h2>
            </div>

            <div className="flex max-w-full flex-wrap gap-2">
              <span className="rounded-full border border-cyan-300/45 bg-cyan-400/12 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-100">
                {text(confidenceCopy(decision.confidence))}
              </span>
              {generatedAt ? (
                <span className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                  {generatedAt}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(16rem,0.88fr)]">
            <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055] sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t({ en: "Recommended focus", zh: "建議焦點" })}</p>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">{text(decision.explanation)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-slate-950">{text(decision.topic.title)}</span>
                <span className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                  {formatDifficultyLabel(decision.skill.difficulty, language)}
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-300/35 bg-emerald-400/10 p-4 text-emerald-900 dark:text-emerald-50 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">{t({ en: "Engine status", zh: "引擎狀態" })}</p>
                  <p className="mt-2 text-base font-black leading-6">{text(engineStatus.label)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-100">
                  {aiConfidence ? `${Math.round(aiConfidence.score * 100)}%` : decision.engine.mode === "llm-assisted" ? "AI" : "BKT"}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-emerald-800 dark:text-emerald-100">{text(engineStatus.detail)}</p>
            </article>
          </div>

          {decision.engine.teacherAuditNote || aiConfidence ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {decision.engine.teacherAuditNote ? (
                <article className="rounded-2xl border border-emerald-300/25 bg-white/70 p-4 dark:border-emerald-200/10 dark:bg-white/[0.055]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-200">{t({ en: "Audit note", zh: "審核備註" })}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900 dark:text-emerald-50">{text(decision.engine.teacherAuditNote)}</p>
                </article>
              ) : null}

              {aiConfidence ? (
                <article className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t({ en: "Confidence basis", zh: "信心依據" })}</p>
                    <p className="text-xs font-black text-emerald-700 dark:text-emerald-200">{text(aiConfidence.label)}</p>
                  </div>
                  <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{text(aiConfidence.criteria)}</p>
                  {signals.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {signals.map((signal) => (
                        <span key={signal} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-black text-cyan-700 dark:text-cyan-100">
                          {text(signalLabel(signal))}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {decision.evidence.map((item) => (
              <div key={text(item.label)} className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{text(item.label)}</p>
                <p className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white">{item.value}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{text(item.detail)}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-t border-cyan-200/70 bg-cyan-400/[0.08] p-5 dark:border-white/10 sm:p-6 xl:border-l xl:border-t-0">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-100">{t({ en: "Target snapshot", zh: "目標摘要" })}</p>
          <div className="mt-4 rounded-2xl bg-white/70 p-4 dark:bg-white/[0.055]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Current skill", zh: "目前技能" })}</p>
            <p className="mt-2 text-sm font-black leading-6 text-slate-950 dark:text-white">{text(decision.skill.title)}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {text(decision.topic.title)} · {decision.questions.length} {t({ en: "questions", zh: "題" })}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-cyan-700 dark:text-cyan-100">{t({ en: "Due reviews", zh: "到期複習" })}</p>
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-100">{decision.dueReviews.length}</span>
          </div>
          <div className="mt-3 space-y-3">
            {reviewItems.map((summary) => (
              <div key={summary.skill.id} className="rounded-2xl bg-white/70 p-4 dark:bg-white/[0.055]">
                <p className="text-sm font-black leading-6 text-slate-950 dark:text-white">{text(summary.skill.title)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {formatReviewDate(summary.state.nextReviewAt, language)} · {Math.round(summary.state.pMastery * 100)}%
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="border-t border-slate-200/70 p-5 dark:border-white/10 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{t({ en: "Skill mastery map", zh: "技能掌握地圖" })}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {decision.skillMap.slice(0, 6).map((summary) => <SkillPill key={summary.skill.id} summary={summary} renderText={text} />)}
        </div>
      </div>
    </section>
  );
}

export function AdaptiveLearningContent() {
  const { currentUser, language, selectedGrade, settingsReady, t, text } = useSettings();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [assignments, setAssignments] = useState<StudentAssignmentItem[]>([]);
  const [adaptiveDecision, setAdaptiveDecision] = useState<AdaptiveLearningDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const gradeTopics = dashboard?.gradeTopics ?? [];
  const recommended = dashboard?.recommendedLesson ?? null;
  const analyticsFocusTopic = dashboard?.weakTopics[0] ?? recommended ?? undefined;
  const recent = dashboard?.recentTopics ?? [];
  const visibleAssignments = assignments.filter((item) => item.classGrade === selectedGrade);
  const progressEyebrow = t({ en: "Live analytics", zh: "即時學習分析" });
  const loadErrorCopy = t({ en: "Could not load dashboard data.", zh: "暫時無法載入學生儀表板資料。" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      if (!settingsReady) return;

      if (!currentUser) {
        setDashboard(null);
        setIsLoading(false);
        setLoadError("");
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch(`/api/dashboard?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const nextDashboard = readDashboard(await response.json());
        if (!response.ok || !nextDashboard) throw new Error(loadErrorCopy);
        setDashboard(nextDashboard);
      } catch (error) {
        if (!controller.signal.aborted) {
          setDashboard(null);
          setLoadError(error instanceof Error ? error.message : loadErrorCopy);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [currentUser, loadErrorCopy, selectedGrade, settingsReady]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssignments() {
      if (!settingsReady) return;

      if (!currentUser || currentUser.role !== "student") {
        setAssignments([]);
        return;
      }

      try {
        const response = await fetch("/api/assignments", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Assignments unavailable");
        setAssignments(readAssignments(await response.json()));
      } catch {
        if (!controller.signal.aborted) setAssignments([]);
      }
    }

    loadAssignments();

    return () => controller.abort();
  }, [currentUser, settingsReady]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAdaptiveDecision() {
      if (!settingsReady) return;

      if (!currentUser) {
        setAdaptiveDecision(null);
        return;
      }

      try {
        const response = await fetch(`/api/adaptive-learning/next?grade=${selectedGrade}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const decision = readAdaptiveDecision(await response.json());
        if (!response.ok || !decision) throw new Error("Adaptive decision unavailable.");
        setAdaptiveDecision(decision);
        if (decision.engine.llmStatus === "pending") {
          void fetch("/api/adaptive-learning/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ grade: selectedGrade })
          })
            .then(async (refreshResponse) => {
              if (!refreshResponse.ok) return;
              const refreshed = readAdaptiveDecision(await refreshResponse.json());
              if (refreshed && !controller.signal.aborted) setAdaptiveDecision(refreshed);
            })
            .catch(() => undefined);
        }
      } catch {
        if (!controller.signal.aborted) setAdaptiveDecision(null);
      }
    }

    void loadAdaptiveDecision();

    return () => controller.abort();
  }, [currentUser, selectedGrade, settingsReady]);

  if (!settingsReady) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t({ en: "Adaptive learning", zh: "適性學習" })}</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
            {t({ en: "Checking your learning profile", zh: "正在檢查你的學習檔案" })}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
            {t({ en: "Loading sign-in status before opening the adaptive dashboard.", zh: "正在載入登入狀態，然後開啟適性學習儀表板。" })}
          </p>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="page-container py-10 sm:py-12">
        <section className="glass-panel overflow-hidden p-6 sm:p-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t({ en: "Adaptive learning", zh: "適性學習" })}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
              {t({ en: "Log in to view adaptive recommendations", zh: "登入以查看適性學習建議" })}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              {t({
                en: "MAIS builds your next lesson, review queue, and mastery map from saved attempts and lesson progress.",
                zh: "MAIS 會根據已儲存的作答與課節進度，建立下一課、複習清單和掌握度地圖。"
              })}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
                {t(dictionary.nav.login)}
              </Link>
              <Link href="/learning-path" className="focus-ring rounded-full border border-cyan-300/45 bg-cyan-400/15 px-5 py-3 text-sm font-black text-cyan-700 transition hover:-translate-y-0.5 dark:text-cyan-100">
                {t(dictionary.common.viewRoadmap)}
              </Link>
            </div>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { title: { en: "Skill mastery map", zh: "技能掌握地圖" }, detail: { en: "See which skills are secure, fragile, or ready for challenge.", zh: "查看哪些技能已穩固、仍薄弱或可進入挑戰。" } },
              { title: { en: "Spaced review", zh: "間隔複習" }, detail: { en: "Review work appears when the system predicts it will help most.", zh: "系統會在最有幫助的時間安排複習。" } },
              { title: { en: "Teacher assignments", zh: "老師分派內容" }, detail: { en: "Class work appears beside your adaptive next step.", zh: "課堂作業會與你的適性下一步並列顯示。" } }
            ].map((item) => (
              <div key={text(item.title)} className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 dark:border-white/10 dark:bg-white/[0.055]">
                <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.title)}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(item.detail)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="max-w-3xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{progressEyebrow}</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl md:text-5xl">
          {t(dictionary.pages.progressTitle)}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">{t(dictionary.pages.progressDesc)}</p>
        {isLoading ? <p className="mt-3 text-sm font-bold text-cyan-600 dark:text-cyan-300">{t(dictionary.dashboard.loading)}</p> : null}
        {loadError ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{loadError}</p> : null}
        {dashboard?.contentUnavailable ? (
          <p className="mt-4 rounded-2xl border border-amber-300/55 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-100">
            {text(dashboard.contentUnavailable)}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(dashboard?.progressMetrics ?? []).slice(0, 4).map((metric, index) => <ProgressCard key={text(metric.label)} metric={metric} index={index} />)}
      </section>

      {adaptiveDecision ? <AdaptiveRecommendationPanel decision={adaptiveDecision} language={language} t={t} text={text} /> : null}

      <section id="my-assignments" className="glass-panel mt-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t({ en: "My assignments", zh: "我的作業" })}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Teacher-assigned work", zh: "老師分派內容" })}</h2>
          </div>
          <Link href="/practice" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            {t({ en: "Practice", zh: "練習" })}
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {visibleAssignments.slice(0, 4).map((item) => (
            <Link key={item.assignment.id} href={assignmentHref(item)} className="focus-ring soft-panel block p-4 transition hover:-translate-y-0.5">
              <p className="text-sm font-black text-slate-950 dark:text-white">{text(item.assignment.title)}</p>
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{item.className} · {item.assignment.contentType}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-black">
                <span className="rounded-full border border-cyan-300/55 bg-cyan-400/12 px-3 py-1 text-cyan-800 dark:text-cyan-100">{item.submission.status}</span>
                <span>{item.assignment.dueAt ? formatDate(item.assignment.dueAt, language) : t({ en: "No due date", zh: "無截止日期" })}</span>
              </div>
            </Link>
          ))}
        </div>
        {!visibleAssignments.length ? <p className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400">{t({ en: "Assigned work will appear here.", zh: "老師分派的作業會顯示在這裡。" })}</p> : null}
      </section>

      <LearningAnalyticsReport focusTopic={analyticsFocusTopic} />

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t(dictionary.dashboard.gradeTopics)}</h2>
            <Link href="/learning-path" className="text-sm font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300">{t(dictionary.common.viewRoadmap)} →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gradeTopics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>
        </div>

        <div className="space-y-6">
          {recommended ? (
            <motion.section className="glass-panel p-5" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">{t(dictionary.dashboard.nextLesson)}</p>
              <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{text(recommended.title)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(recommended.description)}</p>
              <Link href={lessonHrefForTopicId(recommended.id)} className="focus-ring mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 font-bold text-white transition hover:-translate-y-1 dark:bg-white dark:text-slate-950">
                {t(dictionary.common.openLesson)}
              </Link>
            </motion.section>
          ) : null}

          <section className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t(dictionary.dashboard.recent)}</h2>
            <div className="mt-4 space-y-3">
              {recent.map((topic) => (
                <Link key={topic.id} href={lessonHrefForTopicId(topic.id)} className="block rounded-2xl border border-slate-200/70 bg-white/60 p-4 transition hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.055]">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{formatGradeLabel(topic.grade, language, true)} · {text(topic.title)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topic.minutes} {t(dictionary.common.minutes)} · {formatDifficultyLabel(topic.difficulty, language)}</p>
                </Link>
              ))}
              {recent.length === 0 ? (
                <p className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-400">
                  {t({ en: "Recent topics will appear after saved attempts.", zh: "儲存作答後會顯示最近瀏覽課題。" })}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <DashboardProgressDetails />
      <DashboardBackToTopButton />
    </div>
  );
}
