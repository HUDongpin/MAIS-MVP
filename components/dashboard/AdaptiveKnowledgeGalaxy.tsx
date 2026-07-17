"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { curriculumProfileForTrack, curriculumProfileLabel, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { formatDifficultyLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import { cn } from "@/lib/utils";
import type {
  AdaptiveActionType,
  AdaptiveLearningDecision,
  AdaptiveSkillSummary,
  Language,
  LocalizedText,
  ProgressMetric,
  ThemeMode
} from "@/types";

type AdaptiveKnowledgeGalaxyProps = {
  contentUnavailable?: LocalizedText | null;
  decision: AdaptiveLearningDecision | null;
  isLoading: boolean;
  loadError: string;
  progressMetrics: ProgressMetric[];
};

type GalaxyNodeRole = "current" | "review" | "repair" | "mastered" | "route";

type GalaxyNode = {
  id: string;
  index: number;
  originalIndex: number;
  role: GalaxyNodeRole;
  size: string;
  summary: AdaptiveSkillSummary | null;
  title: LocalizedText;
  topicTitle: LocalizedText;
  x: number;
  y: number;
};

type GalaxyEdge = {
  from: string;
  id: string;
  kind: "route" | "prerequisite" | "review";
  to: string;
};

type GalaxyLayout = {
  size: string;
  x: number;
  y: number;
};

type MetricPodTone = "cyan" | "violet" | "emerald" | "solar";

type AdaptiveGalaxyTheme = {
  background: string;
  badgePrimaryClass: string;
  badgeSuccessClass: string;
  bodyClass: string;
  centerGlowClass: string;
  currentGlowBackground: string;
  currentPlanetOutline: string;
  currentRingBackground: string;
  currentRingShadow: string;
  dueReviewClass: string;
  dueReviewMetaClass: string;
  dueReviewTitleClass: string;
  errorClass: string;
  evidenceBadgeClass: string;
  eyebrowClass: string;
  eyebrowDotClass: string;
  hudBodyClass: string;
  hudClass: string;
  hudHeaderClass: string;
  hudKickerClass: string;
  hudPanelClass: string;
  hudPanelMutedLabelClass: string;
  hudPanelTextClass: string;
  hudPositiveLabelClass: string;
  hudPositivePanelClass: string;
  hudPositiveTextClass: string;
  hudTitleClass: string;
  legendClass: string;
  metricLabelClass: string;
  metricPodClass: string;
  metricValueClass: string;
  noticeClass: string;
  placeholderEyebrowClass: string;
  placeholderPanelClass: string;
  placeholderTitleClass: string;
  planetAuraClass: string;
  planetBorderClass: string;
  planetDepthShadow: string;
  planetHighlight: string;
  planetMetaClass: string;
  planetRoleClass: string;
  planetShade: string;
  planetTextWrapperClass: string;
  prerequisiteFilter: string;
  prerequisiteStroke: string;
  reviewFilter: string;
  reviewStroke: string;
  routeFilter: string;
  routeStroke: string;
  starImage: string;
  starOpacity: number;
  statCardClass: string;
  statLabelClass: string;
  statValueClass: string;
  surfaceClass: string;
  themeToggleClass: string;
  themeToggleIconClass: string;
  titleClass: string;
};

type AdaptiveGalaxyStyle = CSSProperties & Record<`--adaptive-${string}`, string>;

const galaxyLayouts: GalaxyLayout[] = [
  { x: 50, y: 52, size: "9.6rem" },
  { x: 31, y: 58, size: "7.4rem" },
  { x: 69, y: 42, size: "7.5rem" },
  { x: 24, y: 35, size: "6.3rem" },
  { x: 76, y: 67, size: "6.4rem" },
  { x: 42, y: 24, size: "6.1rem" },
  { x: 59, y: 78, size: "6rem" },
  { x: 16, y: 72, size: "5.6rem" },
  { x: 84, y: 27, size: "5.7rem" }
];

const planetPalettes: Record<GalaxyNodeRole, { glow: string; ring: string; stops: [string, string, string] }> = {
  current: {
    glow: "rgba(244, 114, 182, 0.82)",
    ring: "rgba(255, 255, 255, 0.74)",
    stops: ["#67e8f9", "#a78bfa", "#f472b6"]
  },
  mastered: {
    glow: "rgba(52, 211, 153, 0.66)",
    ring: "rgba(167, 243, 208, 0.58)",
    stops: ["#bbf7d0", "#34d399", "#0891b2"]
  },
  repair: {
    glow: "rgba(251, 146, 60, 0.7)",
    ring: "rgba(253, 186, 116, 0.62)",
    stops: ["#fde68a", "#fb923c", "#f472b6"]
  },
  review: {
    glow: "rgba(250, 204, 21, 0.68)",
    ring: "rgba(254, 240, 138, 0.62)",
    stops: ["#fef08a", "#fb7185", "#a78bfa"]
  },
  route: {
    glow: "rgba(34, 211, 238, 0.58)",
    ring: "rgba(125, 211, 252, 0.5)",
    stops: ["#cffafe", "#22d3ee", "#6366f1"]
  }
};

const metricPodTones: MetricPodTone[] = ["cyan", "violet", "emerald", "solar"];

const metricPodIconClasses: Record<MetricPodTone, string> = {
  cyan: "from-cyan-200 via-sky-400 to-indigo-500 shadow-cyan-400/35",
  violet: "from-fuchsia-200 via-violet-400 to-blue-500 shadow-violet-400/35",
  emerald: "from-lime-200 via-emerald-400 to-teal-500 shadow-emerald-400/30",
  solar: "from-amber-200 via-orange-300 to-rose-400 shadow-rose-400/30"
};

const adaptiveGalaxyThemes: Record<ThemeMode, AdaptiveGalaxyTheme> = {
  light: {
    background:
      "radial-gradient(circle at 14% 18%, rgba(14,165,233,0.24), transparent 24%), radial-gradient(circle at 74% 20%, rgba(168,85,247,0.16), transparent 28%), radial-gradient(circle at 72% 80%, rgba(16,185,129,0.14), transparent 26%), linear-gradient(135deg, #eefaff 0%, #f8fbff 42%, #f5f0ff 72%, #fff7ed 100%)",
    badgePrimaryClass: "bg-cyan-100/80 text-cyan-800 ring-1 ring-cyan-200/70",
    badgeSuccessClass: "bg-emerald-100/80 text-emerald-800 ring-1 ring-emerald-200/70",
    bodyClass: "text-slate-700",
    centerGlowClass:
      "bg-[radial-gradient(circle,#ffffff_0_8%,#fef3c7_9%_18%,#f0abfc_35%,#7dd3fc_58%,transparent_74%)] shadow-[0_0_90px_rgba(14,165,233,0.22),0_0_140px_rgba(168,85,247,0.16)]",
    currentGlowBackground:
      "conic-gradient(from 0deg, transparent 0deg, rgba(14, 165, 233, 0.28) 72deg, rgba(217, 70, 239, 0.22) 132deg, transparent 220deg, rgba(255, 255, 255, 0.8) 320deg, transparent 360deg)",
    currentPlanetOutline: "0 0 0 4px rgba(255,255,255,0.72), ",
    currentRingBackground:
      "conic-gradient(from 0deg, transparent 0deg, rgba(14, 165, 233, 0.18) 48deg, rgba(255, 255, 255, 0.98) 82deg, rgba(217, 70, 239, 0.78) 118deg, rgba(99, 102, 241, 0.34) 168deg, transparent 238deg, rgba(14, 165, 233, 0.56) 326deg, transparent 360deg)",
    currentRingShadow: "0 0 20px rgba(14,165,233,0.38), 0 0 42px rgba(217,70,239,0.2)",
    dueReviewClass: "border border-cyan-100/80 bg-white/[0.72]",
    dueReviewMetaClass: "text-slate-500",
    dueReviewTitleClass: "text-slate-950",
    errorClass: "text-rose-700",
    evidenceBadgeClass: "bg-cyan-100/80 text-cyan-800 ring-1 ring-cyan-200/70",
    eyebrowClass: "text-cyan-700",
    eyebrowDotClass: "bg-cyan-500 shadow-[0_0_18px_rgba(14,165,233,0.46)]",
    hudBodyClass: "text-slate-700",
    hudClass: "border-cyan-100/90 bg-white/[0.82] text-slate-950 shadow-2xl shadow-cyan-900/10",
    hudHeaderClass: "text-cyan-700",
    hudKickerClass: "text-cyan-700",
    hudPanelClass: "border-cyan-100/90 bg-white/[0.72]",
    hudPanelMutedLabelClass: "text-slate-500",
    hudPanelTextClass: "text-slate-700",
    hudPositiveLabelClass: "text-emerald-700",
    hudPositivePanelClass: "border-emerald-200/80 bg-emerald-50/75",
    hudPositiveTextClass: "text-emerald-800",
    hudTitleClass: "text-slate-950",
    legendClass: "border border-cyan-100/80 bg-white/[0.72] text-slate-700 shadow-sm",
    metricLabelClass: "text-cyan-700",
    metricPodClass: "bg-white/[0.72] shadow-sm ring-1 ring-cyan-100/80",
    metricValueClass: "text-slate-950",
    noticeClass: "border-amber-300/55 bg-amber-100/75 text-amber-900",
    placeholderEyebrowClass: "text-cyan-700",
    placeholderPanelClass: "border-cyan-100/80 bg-white/[0.82] text-slate-950 shadow-xl shadow-cyan-900/10",
    placeholderTitleClass: "text-slate-950",
    planetAuraClass: "bg-cyan-100/35 blur-xl transition group-hover:bg-white/45",
    planetBorderClass: "border-white/70",
    planetDepthShadow:
      "0 20px 54px rgba(14,116,144,0.18), inset -18px -26px 38px rgba(15,23,42,0.15), inset 12px 12px 28px rgba(255,255,255,0.38)",
    planetHighlight: "rgba(255,255,255,0.96)",
    planetMetaClass: "bg-white/[0.38] text-white",
    planetRoleClass: "bg-white/65 text-slate-800",
    planetShade: "rgba(14,116,144,0.22)",
    planetTextWrapperClass: "text-white drop-shadow-[0_2px_12px_rgba(15,23,42,0.42)]",
    prerequisiteFilter: "drop-shadow(0 0 8px rgba(5, 150, 105, 0.28))",
    prerequisiteStroke: "rgba(5, 150, 105, 0.62)",
    reviewFilter: "drop-shadow(0 0 8px rgba(217, 119, 6, 0.28))",
    reviewStroke: "rgba(217, 119, 6, 0.68)",
    routeFilter: "drop-shadow(0 0 8px rgba(14, 165, 233, 0.38))",
    routeStroke: "rgba(14, 165, 233, 0.72)",
    starImage:
      "radial-gradient(circle, rgba(14,165,233,0.36) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(99,102,241,0.28) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(245,158,11,0.3) 0 1px, transparent 1.5px)",
    starOpacity: 0.5,
    statCardClass: "border-cyan-100/80 bg-white/[0.68]",
    statLabelClass: "text-slate-500",
    statValueClass: "text-slate-950",
    surfaceClass: "border-cyan-200/70 bg-sky-50 text-slate-950 shadow-2xl shadow-cyan-900/10",
    themeToggleClass: "border-cyan-200/80 bg-white/[0.78] text-slate-950 shadow-sm hover:bg-cyan-50",
    themeToggleIconClass: "bg-cyan-100 text-cyan-800",
    titleClass: "text-slate-950"
  },
  dark: {
    background:
      "radial-gradient(circle at 14% 18%, rgba(70,243,255,0.24), transparent 23%), radial-gradient(circle at 72% 24%, rgba(255,111,174,0.2), transparent 28%), radial-gradient(circle at 70% 78%, rgba(85,244,178,0.13), transparent 24%), linear-gradient(135deg, #071022 0%, #0c0b24 40%, #170b2f 72%, #050813 100%)",
    badgePrimaryClass: "bg-cyan-300/15 text-cyan-100",
    badgeSuccessClass: "bg-emerald-300/15 text-emerald-100",
    bodyClass: "text-slate-300",
    centerGlowClass:
      "bg-[radial-gradient(circle,#fff_0_7%,#fff1a8_8%_16%,#ff8bd0_32%,#795bff_58%,transparent_72%)] shadow-[0_0_90px_rgba(255,111,174,0.72),0_0_150px_rgba(70,243,255,0.42)]",
    currentGlowBackground:
      "conic-gradient(from 0deg, transparent 0deg, rgba(103, 232, 249, 0.48) 72deg, rgba(244, 114, 182, 0.42) 132deg, transparent 220deg, rgba(255, 255, 255, 0.38) 320deg, transparent 360deg)",
    currentPlanetOutline: "0 0 0 4px rgba(255,255,255,0.54), ",
    currentRingBackground:
      "conic-gradient(from 0deg, transparent 0deg, rgba(103, 232, 249, 0.18) 48deg, rgba(255, 255, 255, 0.96) 82deg, rgba(244, 114, 182, 0.9) 118deg, rgba(167, 139, 250, 0.44) 168deg, transparent 238deg, rgba(103, 232, 249, 0.78) 326deg, transparent 360deg)",
    currentRingShadow: "0 0 22px rgba(103,232,249,0.62), 0 0 46px rgba(244,114,182,0.32)",
    dueReviewClass: "border border-white/10 bg-white/[0.06]",
    dueReviewMetaClass: "text-slate-400",
    dueReviewTitleClass: "text-white",
    errorClass: "text-rose-200",
    evidenceBadgeClass: "bg-cyan-300/10 text-cyan-100",
    eyebrowClass: "text-cyan-200",
    eyebrowDotClass: "bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.95)]",
    hudBodyClass: "text-slate-300",
    hudClass: "border-white/15 bg-slate-950/[0.78] text-white shadow-2xl shadow-cyan-950/40",
    hudHeaderClass: "text-cyan-200",
    hudKickerClass: "text-cyan-200",
    hudPanelClass: "border-white/10 bg-white/[0.07]",
    hudPanelMutedLabelClass: "text-slate-400",
    hudPanelTextClass: "text-slate-200",
    hudPositiveLabelClass: "text-emerald-100",
    hudPositivePanelClass: "border-emerald-200/15 bg-emerald-300/10",
    hudPositiveTextClass: "text-emerald-50",
    hudTitleClass: "text-white",
    legendClass: "border border-white/[0.12] bg-white/[0.06] text-slate-300",
    metricLabelClass: "text-cyan-100",
    metricPodClass: "bg-white/[0.055]",
    metricValueClass: "text-white",
    noticeClass: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    placeholderEyebrowClass: "text-cyan-200",
    placeholderPanelClass: "border-white/10 bg-slate-950/70 text-white",
    placeholderTitleClass: "text-white",
    planetAuraClass: "bg-slate-950/45 blur-xl transition group-hover:bg-slate-950/30",
    planetBorderClass: "border-white/20",
    planetDepthShadow:
      "0 28px 76px rgba(0,0,0,0.46), inset -18px -26px 42px rgba(0,0,0,0.3), inset 12px 12px 28px rgba(255,255,255,0.2)",
    planetHighlight: "rgba(255,255,255,0.96)",
    planetMetaClass: "bg-white/20 text-white",
    planetRoleClass: "bg-slate-950/55 text-cyan-100",
    planetShade: "rgba(2,6,23,0.48)",
    planetTextWrapperClass: "text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]",
    prerequisiteFilter: "drop-shadow(0 0 9px rgba(52, 211, 153, 0.48))",
    prerequisiteStroke: "rgba(52, 211, 153, 0.72)",
    reviewFilter: "drop-shadow(0 0 9px rgba(251, 191, 36, 0.58))",
    reviewStroke: "rgba(251, 191, 36, 0.78)",
    routeFilter: "drop-shadow(0 0 10px rgba(103, 232, 249, 0.7))",
    routeStroke: "rgba(103, 232, 249, 0.74)",
    starImage:
      "radial-gradient(circle, rgba(255,255,255,0.86) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(70,243,255,0.7) 0 1px, transparent 1.4px), radial-gradient(circle, rgba(255,209,102,0.68) 0 1px, transparent 1.5px)",
    starOpacity: 0.55,
    statCardClass: "border-white/10 bg-white/[0.07]",
    statLabelClass: "text-slate-400",
    statValueClass: "text-white",
    surfaceClass: "border-cyan-200/35 bg-slate-950 text-white shadow-2xl shadow-cyan-950/30",
    themeToggleClass: "border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.13]",
    themeToggleIconClass: "bg-white/[0.12] text-cyan-100",
    titleClass: "text-white"
  }
};

function actionLabel(action: AdaptiveActionType) {
  const labels: Record<AdaptiveActionType, LocalizedText> = {
    review: { en: "Spaced review", zh: "間隔複習", zhHans: "间隔复习" },
    repair: { en: "Repair foundation", zh: "修補基礎", zhHans: "修补基础" },
    practice: { en: "Targeted practice", zh: "針對練習", zhHans: "针对练习" },
    lesson: { en: "Guided lesson", zh: "導學課節", zhHans: "导学课时" },
    challenge: { en: "Challenge work", zh: "挑戰練習", zhHans: "挑战练习" }
  };
  return labels[action];
}

function confidenceCopy(confidence: AdaptiveLearningDecision["confidence"]) {
  const labels: Record<AdaptiveLearningDecision["confidence"], LocalizedText> = {
    thin: { en: "Diagnostic evidence", zh: "診斷證據", zhHans: "诊断证据" },
    developing: { en: "Developing evidence", zh: "累積中證據", zhHans: "累积中证据" },
    strong: { en: "Strong evidence", zh: "強證據", zhHans: "强证据" }
  };
  return labels[confidence];
}

function signalLabel(signal: string): LocalizedText {
  const labels: Record<string, LocalizedText> = {
    deterministicCandidateId: { en: "Candidate match", zh: "候選一致", zhHans: "候选一致" },
    masteryProbability: { en: "Mastery probability", zh: "掌握概率", zhHans: "掌握概率" },
    hardGuardFlags: { en: "Guardrail flags", zh: "防護標記", zhHans: "防护标记" },
    wrongStreak: { en: "Wrong streak", zh: "連續答錯", zhHans: "连续答错" },
    correctStreak: { en: "Correct streak", zh: "連續答對", zhHans: "连续答对" },
    attemptCount: { en: "Attempt depth", zh: "作答深度", zhHans: "作答深度" },
    questionIntegrity: { en: "Question integrity", zh: "題目完整性", zhHans: "题目完整性" }
  };

  return labels[signal] ?? { en: signal.replace(/[-_]/g, " "), zh: signal.replace(/[-_]/g, " ") };
}

function engineStatusCopy(decision: AdaptiveLearningDecision) {
  if (decision.engine.mode === "llm-assisted") {
    return {
      label: { en: "AI-assisted adaptive recommendation", zh: "AI 輔助適性建議", zhHans: "AI 辅助自适应建议" },
      detail: decision.engine.confidenceExplanation ?? {
        en: "Validated against the BKT guardrails.",
        zh: "已通過 BKT 防護規則驗證。",
        zhHans: "已通过 BKT 防护规则验证。"
      }
    };
  }

  if (decision.engine.llmStatus === "rejected" && decision.engine.errorKind === "format") {
    return {
      label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議", zhHans: "确定性自适应建议" },
      detail: {
        en: "AI rerank returned incomplete JSON; showing the safe deterministic plan.",
        zh: "AI 重排傳回的 JSON 不完整；目前顯示安全的確定性方案。",
        zhHans: "AI 重排返回的 JSON 不完整；目前显示安全的确定性方案。"
      }
    };
  }

  if (decision.engine.llmStatus === "rejected" && decision.engine.errorKind === "guardrail") {
    return {
      label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議", zhHans: "确定性自适应建议" },
      detail: {
        en: "AI rerank tried to leave the allowed candidate set, so the safe deterministic plan is shown.",
        zh: "AI 重排嘗試離開允許的候選範圍，因此顯示安全的確定性方案。",
        zhHans: "AI 重排尝试离开允许的候选范围，因此显示安全的确定性方案。"
      }
    };
  }

  const statusDetail: Record<AdaptiveLearningDecision["engine"]["llmStatus"], LocalizedText> = {
    disabled: {
      en: "LLM reranking is disabled; using deterministic BKT guardrails.",
      zh: "LLM 重排未啟用；目前使用確定性 BKT 防護規則。",
      zhHans: "LLM 重排未启用；目前使用确定性 BKT 防护规则。"
    },
    pending: {
      en: "LLM reranking is warming in the background.",
      zh: "LLM 重排正在背景準備。",
      zhHans: "LLM 重排正在后台准备。"
    },
    ready: {
      en: "Using deterministic BKT guardrails.",
      zh: "正在使用確定性 BKT 防護規則。",
      zhHans: "正在使用确定性 BKT 防护规则。"
    },
    failed: {
      en: "AI rerank was unavailable, so the safe deterministic plan is shown.",
      zh: "AI 重排暫時不可用，因此顯示安全的確定性方案。",
      zhHans: "AI 重排暂时不可用，因此显示安全的确定性方案。"
    },
    rejected: {
      en: "AI rerank could not be used, so the safe deterministic plan is shown.",
      zh: "AI 重排結果未能使用，因此顯示安全的確定性方案。",
      zhHans: "AI 重排结果未能使用，因此显示安全的确定性方案。"
    }
  };

  return {
    label: { en: "Deterministic adaptive recommendation", zh: "確定性適性建議", zhHans: "确定性自适应建议" },
    detail: statusDetail[decision.engine.llmStatus]
  };
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

function formatReviewDate(value: string | null, language: Language) {
  if (!value) return textForLanguage({ en: "Unscheduled", zh: "未排程", zhHans: "未排程" }, language);
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function masteryPercent(summary: AdaptiveSkillSummary | null) {
  return Math.round((summary?.state.pMastery ?? 0) * 100);
}

function isMastered(summary: AdaptiveSkillSummary | null) {
  return (summary?.state.pMastery ?? 0) >= 0.85;
}

function uniqueSummaries(summaries: AdaptiveSkillSummary[]) {
  const seen = new Set<string>();
  return summaries.filter((summary) => {
    if (seen.has(summary.skill.id)) return false;
    seen.add(summary.skill.id);
    return true;
  });
}

function roleForSummary(summary: AdaptiveSkillSummary, decision: AdaptiveLearningDecision, dueReviewIds: Set<string>): GalaxyNodeRole {
  if (summary.skill.id === decision.skill.id) return "current";
  if (dueReviewIds.has(summary.skill.id)) return "review";
  if (summary.state.pMastery < 0.55 || summary.state.wrongStreak >= 2) return "repair";
  if (summary.state.pMastery >= 0.85) return "mastered";
  return "route";
}

function buildGalaxyNodes(decision: AdaptiveLearningDecision) {
  const dueReviewIds = new Set(decision.dueReviews.map((summary) => summary.skill.id));
  const currentSummary = decision.skillMap.find((summary) => summary.skill.id === decision.skill.id) ?? null;
  const prerequisiteSummaries = decision.skill.prerequisites
    .map((skillId) => decision.skillMap.find((summary) => summary.skill.id === skillId))
    .filter((summary): summary is AdaptiveSkillSummary => Boolean(summary));
  const remainingSummaries = decision.skillMap.filter((summary) => summary.skill.id !== decision.skill.id);
  const orderedSummaries = uniqueSummaries([
    ...prerequisiteSummaries,
    ...decision.dueReviews,
    ...remainingSummaries
  ]).filter((summary) => summary.skill.id !== decision.skill.id);
  const visibleSummaries = orderedSummaries.slice(0, galaxyLayouts.length - 1);
  const nodes: GalaxyNode[] = [];
  const currentLayout = galaxyLayouts[0];

  nodes.push({
    id: decision.skill.id,
    index: 0,
    originalIndex: Math.max(0, decision.skillMap.findIndex((summary) => summary.skill.id === decision.skill.id)),
    role: "current",
    size: currentLayout.size,
    summary: currentSummary,
    title: decision.skill.title,
    topicTitle: decision.topic.title,
    x: currentLayout.x,
    y: currentLayout.y
  });

  visibleSummaries.forEach((summary, index) => {
    const layout = galaxyLayouts[index + 1] ?? galaxyLayouts[galaxyLayouts.length - 1];
    nodes.push({
      id: summary.skill.id,
      index: index + 1,
      originalIndex: decision.skillMap.findIndex((candidate) => candidate.skill.id === summary.skill.id),
      role: roleForSummary(summary, decision, dueReviewIds),
      size: layout.size,
      summary,
      title: summary.skill.title,
      topicTitle: summary.topic.title,
      x: layout.x,
      y: layout.y
    });
  });

  return nodes;
}

function buildGalaxyEdges(decision: AdaptiveLearningDecision, nodes: GalaxyNode[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: GalaxyEdge[] = [];
  const addEdge = (from: string, to: string, kind: GalaxyEdge["kind"]) => {
    if (from === to || !nodeIds.has(from) || !nodeIds.has(to)) return;
    const id = `${kind}-${from}-${to}`;
    if (!edges.some((edge) => edge.id === id)) edges.push({ from, id, kind, to });
  };

  decision.skill.prerequisites.forEach((skillId) => addEdge(skillId, decision.skill.id, "prerequisite"));

  const routeNodes = decision.skillMap
    .filter((summary) => nodeIds.has(summary.skill.id))
    .sort((a, b) => {
      const aIndex = decision.skillMap.findIndex((summary) => summary.skill.id === a.skill.id);
      const bIndex = decision.skillMap.findIndex((summary) => summary.skill.id === b.skill.id);
      return aIndex - bIndex;
    });

  routeNodes.forEach((summary, index) => {
    const next = routeNodes[index + 1];
    if (next) addEdge(summary.skill.id, next.skill.id, "route");
  });

  decision.dueReviews.forEach((summary) => addEdge(decision.skill.id, summary.skill.id, "review"));

  if (!edges.length) {
    nodes.slice(1, 4).forEach((node) => addEdge(decision.skill.id, node.id, "route"));
  }

  return edges.slice(0, 12);
}

function planetStyle(node: GalaxyNode, visual: AdaptiveGalaxyTheme): CSSProperties {
  const palette = planetPalettes[node.role];
  const currentGlow = node.role === "current" ? visual.currentPlanetOutline : "";

  return {
    background: `radial-gradient(circle at 30% 22%, ${visual.planetHighlight}, transparent 0 12%), radial-gradient(circle at 72% 78%, ${visual.planetShade}, transparent 0 46%), linear-gradient(135deg, ${palette.stops[0]}, ${palette.stops[1]} 52%, ${palette.stops[2]})`,
    boxShadow: `${currentGlow}0 0 36px ${palette.glow}, ${visual.planetDepthShadow}`,
    height: node.size,
    left: `${node.x}%`,
    top: `${node.y}%`,
    width: node.size
  };
}

function planetRingStyle(node: GalaxyNode): CSSProperties {
  const palette = planetPalettes[node.role];
  return {
    borderColor: palette.ring,
    boxShadow: `0 0 22px ${palette.glow}`
  };
}

function edgePath(from: GalaxyNode, to: GalaxyNode) {
  const middleX = (from.x + to.x) / 2;
  const lift = Math.abs(from.x - to.x) > 30 ? 6 : 3;
  return `M ${from.x} ${from.y} C ${middleX} ${from.y - lift}, ${middleX} ${to.y + lift}, ${to.x} ${to.y}`;
}

function ShipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current stroke-[2.4]">
      <path d="M16 3l8 22-8-4-8 4 8-22z" />
      <path d="M16 21v8" />
    </svg>
  );
}

function OrbitIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current stroke-[2.4]">
      <circle cx="16" cy="16" r="4" />
      <path d="M4 18c4-8 12-12 22-10" />
      <path d="M28 14c-4 8-12 12-22 10" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current stroke-[2.4]">
      <path d="M7 25V7h18v18" />
      <path d="M11 25v-8h10v8" />
      <path d="M11 11h10" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 fill-none stroke-current stroke-[2.4]">
      <path d="M16 3l2.8 9.2L28 15l-9.2 2.8L16 27l-2.8-9.2L4 15l9.2-2.8L16 3z" />
    </svg>
  );
}

function ThemeSignalIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.4]">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v3" />
        <path d="M12 18.5v3" />
        <path d="M4.5 4.5l2.1 2.1" />
        <path d="M17.4 17.4l2.1 2.1" />
        <path d="M2.5 12h3" />
        <path d="M18.5 12h3" />
        <path d="M4.5 19.5l2.1-2.1" />
        <path d="M17.4 6.6l2.1-2.1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.4]">
      <path d="M20.2 14.6A7.2 7.2 0 0 1 9.4 3.8 8.2 8.2 0 1 0 20.2 14.6z" />
    </svg>
  );
}

function MetricPod({
  icon,
  label,
  tone,
  value,
  visual
}: {
  icon: ReactNode;
  label: string;
  tone: MetricPodTone;
  value: string;
  visual: AdaptiveGalaxyTheme;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[2.55rem_minmax(0,1fr)] items-center gap-3 rounded-2xl px-3 py-3 backdrop-blur-md", visual.metricPodClass)}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br text-slate-950 shadow-lg",
          metricPodIconClasses[tone]
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={cn("block line-clamp-2 text-xs font-black uppercase leading-4 [overflow-wrap:anywhere]", visual.metricLabelClass)}>{label}</span>
        <span className={cn("block truncate text-sm font-black", visual.metricValueClass)}>{value}</span>
      </span>
    </div>
  );
}

function MissionStat({ label, value, visual }: { label: string; value: string; visual: AdaptiveGalaxyTheme }) {
  return (
    <div className={cn("rounded-2xl border p-3", visual.statCardClass)}>
      <p className={cn("text-[0.68rem] font-black uppercase", visual.statLabelClass)}>{label}</p>
      <p className={cn("mt-1 text-lg font-black", visual.statValueClass)}>{value}</p>
    </div>
  );
}

function decisionCurriculumLabel(decision: AdaptiveLearningDecision): LocalizedText {
  const fallbackProfile = curriculumProfileForTrack(decision.topic.curriculumTrack);
  const topicProfile = decision.topic.curriculumProfile ?? {
    publisher: decision.topic.publisher,
    region: decision.topic.region
  };
  return curriculumProfileLabel(normalizeCurriculumProfile(topicProfile, fallbackProfile));
}

function PlaceholderGalaxy({
  contentUnavailable,
  isLoading,
  loadError,
  visual
}: {
  contentUnavailable?: LocalizedText | null;
  isLoading: boolean;
  loadError: string;
  visual: AdaptiveGalaxyTheme;
}) {
  const { t } = useSettings();
  const placeholderNodes = [
    { x: 33, y: 58, size: "7rem", role: "route" as GalaxyNodeRole },
    { x: 50, y: 52, size: "9rem", role: "current" as GalaxyNodeRole },
    { x: 69, y: 42, size: "7rem", role: "review" as GalaxyNodeRole }
  ];

  return (
    <div className="relative min-h-[28rem] min-w-[52rem]">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M 33 58 C 42 48, 58 62, 69 42" className="adaptive-galaxy-route-stroke" fill="none" strokeLinecap="round" strokeWidth="1.2" />
      </svg>
      {placeholderNodes.map((node, index) => (
        <div
          key={index}
          className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-80", visual.planetBorderClass)}
          style={planetStyle({
            id: String(index),
            index,
            originalIndex: index,
            role: node.role,
            size: node.size,
            summary: null,
            title: { en: "", zh: "" },
            topicTitle: { en: "", zh: "" },
            x: node.x,
            y: node.y
          }, visual)}
        />
      ))}
      <div className={cn("absolute left-8 top-8 max-w-sm rounded-2xl border p-5 backdrop-blur-xl", visual.placeholderPanelClass)}>
        <p className={cn("text-sm font-black uppercase", visual.placeholderEyebrowClass)}>
          {isLoading
            ? t({ en: "Calibrating route", zh: "正在校準航線", zhHans: "正在校准航线" })
            : contentUnavailable
              ? t({ en: "Curriculum content pending", zh: "課程內容待開放", zhHans: "课程内容待开放" })
              : t({ en: "No current route", zh: "暫無當前航線", zhHans: "暂无当前航线" })}
        </p>
        <p className={cn("mt-3 text-2xl font-black leading-tight", visual.placeholderTitleClass)}>
          {isLoading
            ? t({ en: "Opening your knowledge galaxy", zh: "正在開啟你的知識星圖", zhHans: "正在开启你的知识星图" })
            : contentUnavailable
              ? t({ en: "Personalized route unavailable for this course", zh: "此課程暫未開放個人化航線", zhHans: "此课程暂未开放个性化航线" })
              : t({ en: "Practice data will unlock the next planet.", zh: "完成練習後會解鎖下一顆星球。", zhHans: "完成练习后会解锁下一颗星球。" })}
        </p>
        {loadError ? <p className={cn("mt-3 text-sm font-bold", visual.errorClass)}>{loadError}</p> : null}
      </div>
    </div>
  );
}

function KnowledgePlanet({ node, visual }: { node: GalaxyNode; visual: AdaptiveGalaxyTheme }) {
  const { language, text, t } = useSettings();
  const mastery = masteryPercent(node.summary);
  const title = text(node.title);
  const roleLabel: Record<GalaxyNodeRole, LocalizedText> = {
    current: { en: "Current", zh: "當前", zhHans: "当前" },
    review: { en: "Review", zh: "複習", zhHans: "复习" },
    repair: { en: "Repair", zh: "修補", zhHans: "修补" },
    mastered: { en: "Secure", zh: "穩固", zhHans: "稳固" },
    route: { en: "Route", zh: "航線", zhHans: "航线" }
  };

  return (
    <div
      aria-label={`${title} ${mastery}%`}
      className={cn(
        "group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-white transition duration-300 hover:z-30 hover:scale-105",
        visual.planetBorderClass,
        node.role === "current" && "z-30"
      )}
      role="group"
      style={planetStyle(node, visual)}
    >
      <span aria-hidden="true" className={cn("absolute -inset-5 rounded-full", visual.planetAuraClass)} />
      <span aria-hidden="true" className="absolute -inset-[8%] rounded-full border opacity-70" style={planetRingStyle(node)} />
      {node.role === "current" ? (
        <>
          <span aria-hidden="true" className="adaptive-galaxy-current-glow pointer-events-none absolute -inset-[18%] rounded-full" />
          <span aria-hidden="true" className="adaptive-galaxy-current-ring pointer-events-none absolute -inset-[10%] rounded-full" />
        </>
      ) : null}
      <span className={cn("relative z-10 flex w-[76%] min-w-0 flex-col items-center justify-center text-center", visual.planetTextWrapperClass)}>
        <span className={cn("rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase backdrop-blur-sm", visual.planetRoleClass)}>
          {t(roleLabel[node.role])}
        </span>
        <MathText
          as="span"
          text={title}
          className={cn(
            "mt-2 line-clamp-3 max-w-full break-words font-black leading-tight",
            node.role === "current" ? "text-[0.82rem] sm:text-sm" : "text-[0.68rem] sm:text-xs"
          )}
        />
        <span className={cn("mt-2 rounded-full px-2 py-0.5 text-[0.62rem] font-black backdrop-blur-sm", visual.planetMetaClass)}>
          {mastery}% {formatDifficultyLabel(node.summary?.skill.difficulty ?? "Low", language)}
        </span>
      </span>
    </div>
  );
}

function MissionHudChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

export function AdaptiveKnowledgeGalaxy({
  contentUnavailable,
  decision,
  isLoading,
  loadError,
  progressMetrics
}: AdaptiveKnowledgeGalaxyProps) {
  const { language, t, text, theme, toggleTheme } = useSettings();
  const [isMissionHudOpen, setIsMissionHudOpen] = useState(false);
  const visual = adaptiveGalaxyThemes[theme];
  const nodes = decision ? buildGalaxyNodes(decision) : [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = decision ? buildGalaxyEdges(decision, nodes) : [];
  const currentNode = nodes[0] ?? null;
  const currentMastery = currentNode ? masteryPercent(currentNode.summary) : 0;
  const engineStatus = decision ? engineStatusCopy(decision) : null;
  const aiConfidence = decision?.engine.aiConfidence ?? null;
  const curriculumLabel = decision ? text(decisionCurriculumLabel(decision)) : "";
  const generatedAt = decision ? formatGeneratedAt(decision.generatedAt, language) : "";
  const signals = (decision?.engine.signalsUsed ?? []).filter(Boolean).slice(0, 3);
  const missionHref = decision?.action === "lesson" && decision.lesson ? lessonHrefForSlug(decision.lesson.slug) : "/practice";
  const hasContentUnavailable = Boolean(contentUnavailable && !decision);
  const missionHudDetailsId = "adaptive-mission-hud-details";
  const themeToggleLabel = theme === "dark"
    ? t({ en: "Switch to day mode", zh: "切換至日間模式", zhHans: "切换至日间模式" })
    : t({ en: "Switch to night mode", zh: "切換至夜間模式", zhHans: "切换至夜间模式" });
  const themeToggleText = theme === "dark"
    ? t({ en: "Day mode", zh: "日間模式", zhHans: "日间模式" })
    : t({ en: "Night mode", zh: "夜間模式", zhHans: "夜间模式" });
  const galaxyStyle = {
    "--adaptive-current-glow-background": visual.currentGlowBackground,
    "--adaptive-current-ring-background": visual.currentRingBackground,
    "--adaptive-current-ring-shadow": visual.currentRingShadow,
    "--adaptive-prerequisite-filter": visual.prerequisiteFilter,
    "--adaptive-prerequisite-stroke": visual.prerequisiteStroke,
    "--adaptive-review-filter": visual.reviewFilter,
    "--adaptive-review-stroke": visual.reviewStroke,
    "--adaptive-route-filter": visual.routeFilter,
    "--adaptive-route-stroke": visual.routeStroke
  } as AdaptiveGalaxyStyle;
  const metricPods = progressMetrics.slice(0, 3).map((metric, index) => ({
    icon: index === 0 ? <ShipIcon /> : index === 1 ? <OrbitIcon /> : <SparkIcon />,
    label: text(metric.label),
    tone: metricPodTones[index] ?? "cyan",
    value: metric.value
  }));

  if (decision) {
    metricPods.push({
      icon: <GateIcon />,
      label: t({ en: "Personalization engine", zh: "個人化引擎", zhHans: "个性化引擎" }),
      tone: "solar",
      value: decision.engine.mode === "llm-assisted" ? "AI" : "BKT"
    });
  }

  return (
    <section
      className={cn("relative min-w-0 overflow-hidden rounded-[2rem] border", visual.surfaceClass)}
      style={galaxyStyle}
      aria-label={t({ en: "Adaptive knowledge galaxy", zh: "適性知識星圖", zhHans: "适性知识星图" })}
    >
      <style>{`
        @keyframes adaptive-galaxy-current-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes adaptive-galaxy-current-pulse {
          0%,
          100% {
            opacity: 0.56;
            filter: blur(12px);
          }

          50% {
            opacity: 0.95;
            filter: blur(18px);
          }
        }

        @keyframes adaptive-galaxy-route-dash {
          to {
            stroke-dashoffset: -38;
          }
        }

        .adaptive-galaxy-current-ring {
          padding: 3px;
          background: var(--adaptive-current-ring-background);
          box-shadow: var(--adaptive-current-ring-shadow);
          animation: adaptive-galaxy-current-spin 2.8s linear infinite;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          mask-composite: exclude;
        }

        .adaptive-galaxy-current-glow {
          background: var(--adaptive-current-glow-background);
          animation:
            adaptive-galaxy-current-spin 2.8s linear infinite,
            adaptive-galaxy-current-pulse 1.7s ease-in-out infinite;
        }

        .adaptive-galaxy-route-stroke {
          stroke: var(--adaptive-route-stroke);
          stroke-dasharray: 12 10;
          filter: var(--adaptive-route-filter);
          animation: adaptive-galaxy-route-dash 2.6s linear infinite;
        }

        .adaptive-galaxy-prerequisite-stroke {
          stroke: var(--adaptive-prerequisite-stroke);
          filter: var(--adaptive-prerequisite-filter);
        }

        .adaptive-galaxy-review-stroke {
          stroke: var(--adaptive-review-stroke);
          stroke-dasharray: 5 8;
          filter: var(--adaptive-review-filter);
        }

        @media (prefers-reduced-motion: reduce) {
          .adaptive-galaxy-current-ring,
          .adaptive-galaxy-current-glow,
          .adaptive-galaxy-route-stroke {
            animation: none;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: visual.background
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: visual.starImage,
          backgroundPosition: "0 0, 32px 28px, 74px 42px",
          backgroundSize: "90px 90px, 130px 130px, 170px 170px",
          opacity: visual.starOpacity
        }}
      />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <p className={cn("flex items-center gap-3 text-sm font-black uppercase sm:text-base", visual.eyebrowClass)}>
                    <span className={cn("h-2.5 w-2.5 rounded-full", visual.eyebrowDotClass)} />
                    {t({ en: "Personalized route", zh: "個人化航線", zhHans: "个性化航线" })}
                  </p>
                  {curriculumLabel ? (
                    <span className={cn("max-w-full rounded-full px-3 py-1 text-xs font-black leading-5", visual.badgePrimaryClass)}>
                      {curriculumLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={themeToggleLabel}
                    onClick={toggleTheme}
                    className={cn("focus-ring inline-flex h-11 items-center gap-2 rounded-full border px-3 text-xs font-black transition hover:-translate-y-0.5", visual.themeToggleClass)}
                  >
                    <span className={cn("grid h-7 w-7 place-items-center rounded-full", visual.themeToggleIconClass)}>
                      <ThemeSignalIcon mode={theme} />
                    </span>
                    <span>{themeToggleText}</span>
                  </button>
                </div>
                <h1 className={cn("mt-4 text-4xl font-black leading-none sm:text-5xl lg:text-6xl", visual.titleClass)}>
                  {t({ en: "Knowledge galaxy", zh: "知識星圖", zhHans: "知识星图" })}
                </h1>
                <p className={cn("mt-4 max-w-2xl text-base font-bold leading-7 sm:text-lg", visual.bodyClass)}>
                  {decision
                    ? t({
                        en: "Planets are knowledge points. The glowing route shows what to repair, review, or enter next.",
                        zh: "星球代表具體知識點；發光航線呈現下一步修補、複習或進入的方向。",
                        zhHans: "星球代表具体知识点；发光航线呈现下一步修补、复习或进入的方向。"
                      })
                    : contentUnavailable
                      ? t({
                          en: "This course is visible, but adaptive lessons and questions are waiting for the curriculum content release.",
                          zh: "此課程已可選擇，但適性課節與題目仍在等待課程內容發布。",
                          zhHans: "此课程已可选择，但自适应课时与题目仍在等待课程内容发布。"
                        })
                    : t({
                        en: "Your route appears after the adaptive engine receives enough saved learning evidence.",
                        zh: "適性引擎取得足夠學習證據後，會顯示你的下一條航線。",
                        zhHans: "自适应引擎取得足够学习证据后，会显示你的下一条航线。"
                      })}
                </p>
                {loadError ? <p className={cn("mt-3 text-sm font-bold", visual.errorClass)}>{loadError}</p> : null}
                {contentUnavailable ? (
                  <p className={cn("mt-4 rounded-2xl border px-4 py-3 text-sm font-bold", visual.noticeClass)}>
                    {text(contentUnavailable)}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2 lg:min-w-[24rem]">
                {metricPods.slice(0, 4).map((metric) => (
                  <MetricPod key={`${metric.label}-${metric.value}`} icon={metric.icon} label={metric.label} tone={metric.tone} value={metric.value} visual={visual} />
                ))}
              </div>
            </div>

            <div className="mt-7 min-w-0 overflow-hidden pb-2">
              {decision ? (
                <div className="relative h-[28rem] min-w-0 sm:h-[31rem]">
                  <div aria-hidden="true" className={cn("absolute left-[48%] top-[55%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full", visual.centerGlowClass)} />
                  <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {edges.map((edge) => {
                      const from = nodeMap.get(edge.from);
                      const to = nodeMap.get(edge.to);
                      if (!from || !to) return null;

                      return (
                        <path
                          key={edge.id}
                          d={edgePath(from, to)}
                          className={
                            edge.kind === "prerequisite"
                              ? "adaptive-galaxy-prerequisite-stroke"
                              : edge.kind === "review"
                                ? "adaptive-galaxy-review-stroke"
                                : "adaptive-galaxy-route-stroke"
                          }
                          fill="none"
                          strokeLinecap="round"
                          strokeWidth={edge.kind === "route" ? 1.16 : 0.92}
                        />
                      );
                    })}
                  </svg>

                  {nodes.map((node) => <KnowledgePlanet key={node.id} node={node} visual={visual} />)}

                  <div className="absolute bottom-5 left-4 z-20 flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)}>
                      {t({ en: "Planets are knowledge points", zh: "星球即知識點", zhHans: "星球即知识点" })}
                    </span>
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)}>
                      {t({ en: "Glow marks current route", zh: "光暈標記當前航線", zhHans: "光晕标记当前航线" })}
                    </span>
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)}>
                      {t({ en: "Branches mark review", zh: "分支代表複習", zhHans: "分支代表复习" })}
                    </span>
                  </div>
                </div>
              ) : (
                <PlaceholderGalaxy contentUnavailable={contentUnavailable} isLoading={isLoading} loadError={loadError} visual={visual} />
              )}
            </div>
          </div>

          <aside className={cn("relative z-40 order-first self-start rounded-[1.5rem] border p-4 backdrop-blur-xl xl:order-none", visual.hudClass)}>
            <button
              type="button"
              aria-controls={missionHudDetailsId}
              aria-expanded={isMissionHudOpen}
              onClick={() => setIsMissionHudOpen((isOpen) => !isOpen)}
              className={cn(
                "focus-ring flex w-full flex-col rounded-[1.15rem] p-1 text-left transition hover:-translate-y-0.5",
                isMissionHudOpen ? "pb-4" : "pb-1"
              )}
            >
              <span className={cn("flex w-full items-center justify-between gap-4 text-xs font-black", visual.hudHeaderClass)}>
                <span>{t({ en: "Mission HUD", zh: "任務介面", zhHans: "任务界面" })}</span>
                <span className="flex items-center gap-2">
                  {generatedAt ? <span>{generatedAt}</span> : null}
                  <MissionHudChevronIcon expanded={isMissionHudOpen} />
                </span>
              </span>
              {!isMissionHudOpen && decision ? (
                <span className="mt-4 block w-full">
                  <span className={cn("block text-xs font-black uppercase", visual.hudKickerClass)}>{t(actionLabel(decision.action))}</span>
                  <MathText as="span" text={text(decision.skill.title)} className={cn("mt-1 line-clamp-2 block text-lg font-black leading-tight", visual.hudTitleClass)} />
                  <span className={cn("mt-3 flex flex-wrap gap-2 text-xs font-black", visual.hudBodyClass)}>
                    <span>{t({ en: "Mastery", zh: "掌握", zhHans: "掌握" })} {currentMastery}%</span>
                    <span>{t({ en: "Questions", zh: "題目", zhHans: "题目" })} {decision.questions.length}</span>
                    <span>{t({ en: "Reviews", zh: "複習", zhHans: "复习" })} {decision.dueReviews.length}</span>
                  </span>
                </span>
              ) : !isMissionHudOpen ? (
                <span className="mt-4 block w-full">
                  <span className={cn("block text-lg font-black leading-tight", visual.hudTitleClass)}>
                    {hasContentUnavailable
                      ? t({ en: "Curriculum content not open yet", zh: "課程內容尚未開放", zhHans: "课程内容尚未开放" })
                      : t({ en: "Gathering route evidence", zh: "正在收集航線證據", zhHans: "正在收集航线证据" })}
                  </span>
                </span>
              ) : null}
              <span className={cn("mt-3 inline-flex items-center text-xs font-black uppercase", visual.hudKickerClass)}>
                {isMissionHudOpen
                  ? t({ en: "Hide details", zh: "收起詳情", zhHans: "收起详情" })
                  : t({ en: "View details", zh: "查看詳情", zhHans: "查看详情" })}
              </span>
            </button>

            {isMissionHudOpen ? (
              <div id={missionHudDetailsId} className="mt-1">
                {decision ? (
                  <>
                    <MathText as="h2" text={text(decision.skill.title)} className={cn("text-2xl font-black leading-tight", visual.hudTitleClass)} />
                    <p className={cn("mt-2 text-sm font-bold leading-6", visual.hudBodyClass)}>
                      {text(decision.topic.title)} · {formatDifficultyLabel(decision.skill.difficulty, language)}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <MissionStat label={t({ en: "Mastery", zh: "掌握", zhHans: "掌握" })} value={`${currentMastery}%`} visual={visual} />
                      <MissionStat label={t({ en: "Questions", zh: "題目", zhHans: "题目" })} value={`${decision.questions.length}`} visual={visual} />
                      <MissionStat label={t({ en: "Reviews", zh: "複習", zhHans: "复习" })} value={`${decision.dueReviews.length}`} visual={visual} />
                    </div>

                    <div className={cn("mt-5 rounded-2xl border p-4", visual.hudPanelClass)}>
                      <p className={cn("text-xs font-black uppercase", visual.hudPanelMutedLabelClass)}>{t({ en: "Route reason", zh: "航線理由", zhHans: "航线理由" })}</p>
                      <p className={cn("mt-2 text-sm font-semibold leading-6", visual.hudPanelTextClass)}>{text(decision.explanation)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={cn("rounded-full px-3 py-1 text-xs font-black", visual.badgePrimaryClass)}>
                          {text(confidenceCopy(decision.confidence))}
                        </span>
                        <span className={cn("rounded-full px-3 py-1 text-xs font-black", visual.badgeSuccessClass)}>
                          {aiConfidence ? `${Math.round(aiConfidence.score * 100)}% AI` : decision.engine.mode === "llm-assisted" ? "AI" : "BKT"}
                        </span>
                      </div>
                    </div>

                    {engineStatus ? (
                      <div className={cn("mt-3 rounded-2xl border p-4", visual.hudPositivePanelClass)}>
                        <p className={cn("text-xs font-black uppercase", visual.hudPositiveLabelClass)}>{text(engineStatus.label)}</p>
                        <p className={cn("mt-2 text-sm font-semibold leading-6", visual.hudPositiveTextClass)}>{text(engineStatus.detail)}</p>
                      </div>
                    ) : null}

                    {aiConfidence || decision.engine.teacherAuditNote || signals.length ? (
                      <div className={cn("mt-3 rounded-2xl border p-4", visual.hudPanelClass)}>
                        <p className={cn("text-xs font-black uppercase", visual.hudPanelMutedLabelClass)}>{t({ en: "Evidence", zh: "證據", zhHans: "证据" })}</p>
                        {aiConfidence ? <p className={cn("mt-2 text-sm font-semibold leading-6", visual.hudPanelTextClass)}>{text(aiConfidence.criteria)}</p> : null}
                        {decision.engine.teacherAuditNote ? <p className={cn("mt-2 text-sm font-semibold leading-6", visual.hudPanelTextClass)}>{text(decision.engine.teacherAuditNote)}</p> : null}
                        {signals.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {signals.map((signal) => (
                              <span key={signal} className={cn("rounded-full px-2.5 py-1 text-[11px] font-black", visual.evidenceBadgeClass)}>
                                {text(signalLabel(signal))}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-2">
                      {decision.dueReviews.slice(0, 2).map((summary) => (
                        <div key={summary.skill.id} className={cn("rounded-2xl border p-3", visual.dueReviewClass)}>
                          <p className={cn("line-clamp-1 text-sm font-black", visual.dueReviewTitleClass)}>{text(summary.skill.title)}</p>
                          <p className={cn("mt-1 text-xs font-bold", visual.dueReviewMetaClass)}>
                            {formatReviewDate(summary.state.nextReviewAt, language)} · {Math.round(summary.state.pMastery * 100)}%
                          </p>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={missionHref}
                      className="focus-ring mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 px-6 py-3 text-lg font-black text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5"
                    >
                      {decision.action === "lesson"
                        ? t({ en: "Enter planet", zh: "進入星球", zhHans: "进入星球" })
                        : t({ en: "Start mission", zh: "開始任務", zhHans: "开始任务" })}
                    </Link>
                  </>
                ) : (
                  <>
                    <h2 className={cn("text-2xl font-black leading-tight", visual.hudTitleClass)}>
                      {hasContentUnavailable
                        ? t({ en: "Curriculum content not open yet", zh: "課程內容尚未開放", zhHans: "课程内容尚未开放" })
                        : t({ en: "Gathering route evidence", zh: "正在收集航線證據", zhHans: "正在收集航线证据" })}
                    </h2>
                    <p className={cn("mt-3 text-sm font-semibold leading-6", visual.hudBodyClass)}>
                      {hasContentUnavailable
                        ? t({
                            en: "No adaptive mission is available until this curriculum content is released.",
                            zh: "此課程內容發布前，暫未有可開始的適性任務。",
                            zhHans: "此课程内容发布前，暂时没有可开始的自适应任务。"
                          })
                        : t({
                            en: "Complete practice or a lesson so MAIS can choose the safest next knowledge point.",
                            zh: "完成練習或課節後，MAIS 會選出最安全的下一個知識點。",
                            zhHans: "完成练习或课时后，MAIS 会选出最安全的下一个知识点。"
                          })}
                    </p>
                    {!hasContentUnavailable ? (
                      <Link
                        href="/practice"
                        className="focus-ring mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 px-6 py-3 text-lg font-black text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5"
                      >
                        {t({ en: "Open practice", zh: "開啟練習", zhHans: "开启练习" })}
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
