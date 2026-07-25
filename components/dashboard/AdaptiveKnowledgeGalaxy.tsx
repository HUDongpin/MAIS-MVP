"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import type { PracticeIslandDomainRegionId } from "@/data/practiceIslandRegions";
import { curriculumProfileForTrack, curriculumProfileLabel, normalizeCurriculumProfile } from "@/lib/curriculumProfile";
import { formatDifficultyLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import {
  buildKnowledgeGalaxyMap,
  galaxyStageLabels,
  galaxyStarStatusLabels
} from "@/lib/knowledgeGalaxyMap";
import type { GalaxyStar, GalaxyStarStatus, KnowledgeGalaxyMap } from "@/lib/knowledgeGalaxyMap";
import {
  diffGalaxyMilestones,
  galaxyMilestoneSnapshotForMap,
  galaxyMilestoneStorageKey,
  readGalaxyMilestoneSnapshot,
  serializeGalaxyMilestoneSnapshot
} from "@/lib/knowledgeGalaxyMilestones";
import { MathUniverse } from "@/components/dashboard/MathUniverse";
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

const constellationPalettes: Record<PracticeIslandDomainRegionId, { glow: string; stops: [string, string, string] }> = {
  "number-forest": {
    glow: "rgba(34, 211, 238, 0.72)",
    stops: ["#cffafe", "#22d3ee", "#0891b2"]
  },
  "algebra-peaks": {
    glow: "rgba(167, 139, 250, 0.72)",
    stops: ["#ede9fe", "#a78bfa", "#6366f1"]
  },
  "geometry-garden": {
    glow: "rgba(52, 211, 153, 0.72)",
    stops: ["#d1fae5", "#34d399", "#0d9488"]
  }
};

const statusPaletteOverrides: Partial<Record<GalaxyStarStatus, { glow: string; stops: [string, string, string] }>> = {
  fading: {
    glow: "rgba(251, 191, 36, 0.78)",
    stops: ["#fef3c7", "#fbbf24", "#d97706"]
  },
  unstable: {
    glow: "rgba(251, 113, 133, 0.78)",
    stops: ["#ffe4e6", "#fb7185", "#e11d48"]
  },
  // "Confirming": crossed the probability bar, one more correct locks it in. Bright
  // cyan-white "charging" look — distinct from lit's constellation glow, so it reads
  // as "almost there" rather than collapsing back into the generic igniting tier.
  confirming: {
    glow: "rgba(56, 189, 248, 0.85)",
    stops: ["#ecfeff", "#38bdf8", "#0369a1"]
  }
};

const starSizeRem: Record<GalaxyStarStatus, number> = {
  current: 3.3,
  lit: 1.5,
  fading: 1.5,
  confirming: 1.4,
  unstable: 1.3,
  igniting: 1.25,
  undiscovered: 0.8
};

function starPalette(star: GalaxyStar) {
  return statusPaletteOverrides[star.status] ?? constellationPalettes[star.constellation];
}

function starSize(star: GalaxyStar, zoomed: boolean) {
  const base = starSizeRem[star.status];
  if (!zoomed) return base;
  return star.status === "current" ? base * 1.2 : base * 1.55;
}

function starStyle(star: GalaxyStar, zoomed: boolean, visual: AdaptiveGalaxyTheme): CSSProperties {
  const palette = starPalette(star);
  const size = starSize(star, zoomed);

  if (star.status === "undiscovered") {
    return {
      background: `radial-gradient(circle at 34% 30%, ${visual.planetHighlight}, transparent 0 40%), linear-gradient(135deg, #64748b, #334155)`,
      boxShadow: "0 0 6px rgba(100, 116, 139, 0.35)",
      height: `${size}rem`,
      left: `${star.x}%`,
      opacity: 0.55,
      top: `${star.y}%`,
      width: `${size}rem`
    };
  }

  const currentOutline = star.status === "current" ? visual.currentPlanetOutline : "";
  return {
    background: `radial-gradient(circle at 32% 26%, ${visual.planetHighlight}, transparent 0 34%), linear-gradient(135deg, ${palette.stops[0]}, ${palette.stops[1]} 52%, ${palette.stops[2]})`,
    boxShadow: `${currentOutline}0 0 ${star.status === "current" ? 26 : 14}px ${palette.glow}`,
    height: `${size}rem`,
    left: `${star.x}%`,
    top: `${star.y}%`,
    width: `${size}rem`
  };
}

function edgePathFor(from: { x: number; y: number }, to: { x: number; y: number }) {
  const middleX = (from.x + to.x) / 2;
  const lift = Math.abs(from.x - to.x) > 30 ? 6 : 3;
  return `M ${from.x} ${from.y} C ${middleX} ${from.y - lift}, ${middleX} ${to.y + lift}, ${to.x} ${to.y}`;
}

function constellationOutlinePath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

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

const sealedChartStars = Array.from({ length: 42 }, (_, index) => ({
  x: 6 + ((index * 37 + 11) % 89),
  y: 8 + ((index * 53 + 23) % 81),
  size: index % 5 === 0 ? 0.55 : 0.32
}));

const sealedChartOutlines = [
  "M 18 30 L 27 22 L 38 27 L 33 40 L 21 41 Z",
  "M 62 24 L 73 18 L 82 28 L 74 36 Z",
  "M 42 70 L 53 62 L 66 68 L 60 80 L 47 79 Z"
];

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

  return (
    <div className="relative min-h-[28rem] min-w-0">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {sealedChartOutlines.map((outline) => (
          <path key={outline} d={outline} className="adaptive-galaxy-sealed-stroke" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" />
        ))}
      </svg>
      {sealedChartStars.map((star, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45"
          style={{
            background: "linear-gradient(135deg, #94a3b8, #475569)",
            boxShadow: "0 0 6px rgba(148, 163, 184, 0.4)",
            height: `${star.size}rem`,
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}rem`
          }}
        />
      ))}
      <div className={cn("absolute left-4 top-8 max-w-sm rounded-2xl border p-5 backdrop-blur-xl sm:left-8", visual.placeholderPanelClass)}>
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
              : t({ en: "Practice data will unlock the next star.", zh: "完成練習後會點亮下一顆星。", zhHans: "完成练习后会点亮下一颗星。" })}
        </p>
        <p className={cn("mt-3 text-sm font-bold leading-6", visual.bodyClass)}>
          {contentUnavailable
            ? t({
                en: "The star charts are sealed until this course opens. Every knowledge point will appear here as a star.",
                zh: "課程開放前星圖已封存。每個知識點屆時都會以星星形式出現。",
                zhHans: "课程开放前星图已封存。每个知识点届时都会以星星形式出现。"
              })
            : null}
        </p>
        {loadError ? <p className={cn("mt-3 text-sm font-bold", visual.errorClass)}>{loadError}</p> : null}
      </div>
    </div>
  );
}

function StarHoverCard({
  star,
  pinned,
  visual
}: {
  star: GalaxyStar;
  pinned: boolean;
  visual: AdaptiveGalaxyTheme;
}) {
  const { language, text, t } = useSettings();
  const summary = star.summary;
  const attempted = summary.state.attemptCount > 0;

  return (
    <div
      className={cn(
        "absolute z-40 w-64 max-w-[70%] rounded-2xl border p-4 backdrop-blur-xl",
        pinned ? "" : "pointer-events-none",
        visual.hudClass
      )}
      style={{
        left: `${star.x}%`,
        top: `${star.y}%`,
        transform: `translate(${star.x > 58 ? "calc(-100% - 1.4rem)" : "1.4rem"}, ${star.y > 55 ? "calc(-100% - 1rem)" : "1rem"})`
      }}
      data-galaxy-star-card
    >
      <p className={cn("flex flex-wrap items-center gap-2 text-[0.65rem] font-black uppercase", visual.hudKickerClass)}>
        <span>{text(galaxyStarStatusLabels[star.status])}</span>
        {star.ccssCode ? <span className={cn("rounded-full px-2 py-0.5", visual.evidenceBadgeClass)}>{star.ccssCode}</span> : null}
      </p>
      <MathText as="p" text={text(summary.skill.title)} className={cn("mt-2 text-sm font-black leading-tight", visual.hudTitleClass)} />
      <p className={cn("mt-1 text-xs font-bold", visual.hudBodyClass)}>
        {text(summary.topic.title)} · {text(galaxyStageLabels[star.stage])} · {formatDifficultyLabel(summary.skill.difficulty, language)}
      </p>
      <div className={cn("mt-3 h-1.5 overflow-hidden rounded-full", visual.hudPanelClass)}>
        <div
          className="h-full rounded-full"
          style={{ background: starPalette(star).stops[1], width: `${star.masteryPercent}%` }}
        />
      </div>
      <p className={cn("mt-2 text-xs font-bold", visual.hudBodyClass)}>
        {attempted
          ? `${t({ en: "Mastery", zh: "掌握", zhHans: "掌握" })} ${star.masteryPercent}% · ${t({ en: "Review", zh: "複習", zhHans: "复习" })} ${formatReviewDate(summary.state.nextReviewAt, language)}`
          : t({ en: "Not explored yet — this star ignites with your first mission.", zh: "尚未探索——完成首個任務後這顆星會開始點燃。", zhHans: "尚未探索——完成首个任务后这颗星会开始点燃。" })}
      </p>
      {pinned ? (
        <Link
          href="/practice"
          className="focus-ring mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
        >
          {star.status === "fading"
            ? t({ en: "Relight this star", zh: "重新點亮這顆星", zhHans: "重新点亮这颗星" })
            : star.status === "unstable"
              ? t({ en: "Repair this star", zh: "修補這顆星", zhHans: "修补这颗星" })
              : star.status === "confirming"
                ? t({ en: "Lock in this star", zh: "鞏固這顆星", zhHans: "巩固这颗星" })
                : t({ en: "Practice this skill", zh: "練習此技能", zhHans: "练习此技能" })}
        </Link>
      ) : null}
    </div>
  );
}

function KnowledgeStar({
  star,
  zoomed,
  dimmed,
  selected,
  ignited,
  visual,
  onHover,
  onLeave,
  onSelect
}: {
  star: GalaxyStar;
  zoomed: boolean;
  dimmed: boolean;
  selected: boolean;
  ignited: boolean;
  visual: AdaptiveGalaxyTheme;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const { text } = useSettings();
  const statusLabel = text(galaxyStarStatusLabels[star.status]);
  const ariaLabel = `${star.ccssCode ? `${star.ccssCode} ` : ""}${text(star.summary.skill.title)} · ${statusLabel} · ${star.masteryPercent}%`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-galaxy-star={star.id}
      data-galaxy-star-status={star.status}
      onBlur={onLeave}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onFocus={onHover}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        "focus-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition duration-300 hover:z-30 hover:scale-125",
        visual.planetBorderClass,
        star.status === "current" && "z-30",
        star.status === "fading" && "adaptive-galaxy-fading-pulse",
        star.status === "confirming" && "adaptive-galaxy-confirming-pulse",
        star.status === "unstable" && "adaptive-galaxy-unstable-flicker",
        dimmed && "opacity-25",
        selected && "z-30 scale-125"
      )}
      style={starStyle(star, zoomed, visual)}
    >
      {star.status === "current" ? (
        <>
          <span aria-hidden="true" className="adaptive-galaxy-current-glow pointer-events-none absolute -inset-[26%] rounded-full" />
          <span aria-hidden="true" className="adaptive-galaxy-current-ring pointer-events-none absolute -inset-[14%] rounded-full" />
        </>
      ) : null}
      {ignited ? (
        <span aria-hidden="true" data-galaxy-ignition className="pointer-events-none absolute inset-0 rounded-full">
          <span
            className="adaptive-galaxy-ignite-ring pointer-events-none absolute -inset-[120%] rounded-full border-2"
            style={{ borderColor: starPalette(star).stops[1] }}
          />
          <span
            className="adaptive-galaxy-ignite-flash pointer-events-none absolute -inset-[60%] rounded-full"
            style={{ background: `radial-gradient(circle, ${starPalette(star).stops[0]}, transparent 68%)` }}
          />
        </span>
      ) : null}
      {star.status === "igniting" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full"
          style={{
            background: `conic-gradient(${starPalette(star).stops[1]} ${star.masteryPercent}%, transparent 0)`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))"
          }}
        />
      ) : null}
      {star.status === "lit" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: `inset 0 0 6px rgba(255, 255, 255, 0.65)` }}
        />
      ) : null}
      {star.status === "confirming" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full"
          style={{
            background: `conic-gradient(${starPalette(star).stops[1]} ${star.masteryPercent}%, transparent 0)`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))"
          }}
        />
      ) : null}
    </button>
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
  const { currentUser, language, selectedGrade, t, text, theme, toggleTheme } = useSettings();
  const [viewMode, setViewMode] = useState<"constellation" | "universe">("constellation");
  const isUsCaliforniaTrack = currentUser?.curriculumTrack === "US_CA_MATH";
  const [isMissionHudOpen, setIsMissionHudOpen] = useState(false);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [zoomConstellation, setZoomConstellation] = useState<PracticeIslandDomainRegionId | null>(null);
  const [ignitedStarIds, setIgnitedStarIds] = useState<ReadonlySet<string>>(() => new Set());
  const [freshBadgeIds, setFreshBadgeIds] = useState<ReadonlySet<PracticeIslandDomainRegionId>>(() => new Set());
  const visual = adaptiveGalaxyThemes[theme];
  const fullGalaxyMap = useMemo<KnowledgeGalaxyMap | null>(
    () => (decision ? buildKnowledgeGalaxyMap(decision) : null),
    [decision]
  );
  const galaxyMap = useMemo<KnowledgeGalaxyMap | null>(() => {
    if (!decision) return null;
    if (!zoomConstellation) return fullGalaxyMap;
    return buildKnowledgeGalaxyMap(decision, { focusConstellation: zoomConstellation });
  }, [decision, fullGalaxyMap, zoomConstellation]);

  useEffect(() => {
    if (!fullGalaxyMap || typeof window === "undefined") return;

    const storageKey = galaxyMilestoneStorageKey(currentUser?.id);
    let storedValue: string | null = null;
    try {
      storedValue = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }

    const currentSnapshot = galaxyMilestoneSnapshotForMap(fullGalaxyMap);
    const diff = diffGalaxyMilestones(readGalaxyMilestoneSnapshot(storedValue), currentSnapshot);
    try {
      window.localStorage.setItem(storageKey, serializeGalaxyMilestoneSnapshot(currentSnapshot));
    } catch {
      // Storage may be unavailable (private mode); milestones simply reset next visit.
    }

    if (diff.newlyCompletedConstellations.length) {
      setFreshBadgeIds(new Set(diff.newlyCompletedConstellations));
    }
    if (!diff.newlyLitStarIds.length) return;

    setIgnitedStarIds(new Set(diff.newlyLitStarIds));
    const timer = window.setTimeout(() => setIgnitedStarIds(new Set()), 3600);
    return () => window.clearTimeout(timer);
  }, [currentUser?.id, fullGalaxyMap]);
  const starById = useMemo(() => new Map((galaxyMap?.stars ?? []).map((star) => [star.id, star])), [galaxyMap]);
  const selectedStar = selectedStarId ? starById.get(selectedStarId) ?? null : null;
  const hoveredStar = hoveredStarId ? starById.get(hoveredStarId) ?? null : null;
  const cardStar = selectedStar ?? hoveredStar;
  const focusIds = useMemo(() => {
    if (!selectedStar || !galaxyMap) return null;
    const ids = new Set([selectedStar.id]);
    for (const edge of galaxyMap.edges) {
      if (edge.kind !== "prerequisite") continue;
      if (edge.from === selectedStar.id) ids.add(edge.to);
      if (edge.to === selectedStar.id) ids.add(edge.from);
    }
    if (galaxyMap.currentStarId) ids.add(galaxyMap.currentStarId);
    return ids;
  }, [selectedStar, galaxyMap]);
  const currentSummary = decision
    ? decision.skillMap.find((summary) => summary.skill.id === decision.skill.id) ?? null
    : null;
  const currentMastery = masteryPercent(currentSummary);
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

        .adaptive-galaxy-sealed-stroke {
          stroke: var(--adaptive-route-stroke);
          stroke-dasharray: 2 3;
          opacity: 0.35;
        }

        @keyframes adaptive-galaxy-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        .adaptive-galaxy-constellation-stroke {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          opacity: 0.75;
          filter: var(--adaptive-route-filter);
          animation: adaptive-galaxy-draw 2.8s ease forwards;
        }

        @keyframes adaptive-galaxy-fade-pulse {
          0%,
          100% {
            opacity: 0.55;
          }

          50% {
            opacity: 1;
          }
        }

        .adaptive-galaxy-fading-pulse {
          animation: adaptive-galaxy-fade-pulse 1.9s ease-in-out infinite;
        }

        @keyframes adaptive-galaxy-confirm-pulse {
          0%,
          100% {
            filter: brightness(1);
          }

          50% {
            filter: brightness(1.35);
          }
        }

        .adaptive-galaxy-confirming-pulse {
          animation: adaptive-galaxy-confirm-pulse 1.5s ease-in-out infinite;
        }

        @keyframes adaptive-galaxy-flicker {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.55;
          }
        }

        .adaptive-galaxy-unstable-flicker {
          animation: adaptive-galaxy-flicker 1.6s steps(2, jump-none) infinite;
        }

        @keyframes adaptive-galaxy-ignite-ring {
          0% {
            transform: scale(0.15);
            opacity: 0.95;
          }

          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes adaptive-galaxy-ignite-flash {
          0% {
            transform: scale(0.4);
            opacity: 0.9;
          }

          55% {
            opacity: 0.65;
          }

          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }

        .adaptive-galaxy-ignite-ring {
          animation: adaptive-galaxy-ignite-ring 1.3s ease-out forwards;
        }

        .adaptive-galaxy-ignite-flash {
          animation: adaptive-galaxy-ignite-flash 1.7s ease-out 0.15s forwards;
          opacity: 0;
        }

        @keyframes adaptive-galaxy-badge-pop {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.08);
          }
        }

        .adaptive-galaxy-badge-new {
          animation: adaptive-galaxy-badge-pop 1.1s ease-in-out 3;
        }

        @media (prefers-reduced-motion: reduce) {
          .adaptive-galaxy-current-ring,
          .adaptive-galaxy-current-glow,
          .adaptive-galaxy-route-stroke,
          .adaptive-galaxy-fading-pulse,
          .adaptive-galaxy-confirming-pulse,
          .adaptive-galaxy-unstable-flicker,
          .adaptive-galaxy-badge-new {
            animation: none;
          }

          .adaptive-galaxy-constellation-stroke {
            animation: none;
            stroke-dashoffset: 0;
          }

          .adaptive-galaxy-ignite-ring,
          .adaptive-galaxy-ignite-flash {
            animation: none;
            opacity: 0;
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
                  {isUsCaliforniaTrack ? (
                    <div className="inline-flex overflow-hidden rounded-full border" role="group" aria-label={t({ en: "Map view", zh: "星圖視角", zhHans: "星图视角" })} data-galaxy-view-toggle>
                      {([
                        ["constellation", { en: "Constellation", zh: "星座", zhHans: "星座" }],
                        ["universe", { en: "Universe", zh: "宇宙", zhHans: "宇宙" }]
                      ] as const).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={viewMode === mode}
                          data-galaxy-view={mode}
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            "focus-ring px-4 py-2.5 text-xs font-black transition",
                            visual.themeToggleClass,
                            "rounded-none border-0",
                            viewMode === mode && "underline decoration-2 underline-offset-4"
                          )}
                        >
                          {t(label)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <h1 className={cn("mt-4 text-4xl font-black leading-none sm:text-5xl lg:text-6xl", visual.titleClass)}>
                  {t({ en: "Knowledge galaxy", zh: "知識星圖", zhHans: "知识星图" })}
                </h1>
                <p className={cn("mt-4 max-w-2xl text-base font-bold leading-7 sm:text-lg", visual.bodyClass)}>
                  {decision
                    ? t({
                        en: "Every knowledge point is a star. Mastering one lights it up, reviews keep it burning, and the glowing route charts your next mission.",
                        zh: "每個知識點都是一顆星。掌握會點亮它，複習讓它持續發光，發光航線則指向你的下一個任務。",
                        zhHans: "每个知识点都是一颗星。掌握会点亮它，复习让它持续发光，发光航线则指向你的下一个任务。"
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

            {decision && fullGalaxyMap ? (
              <div className="mt-5 flex flex-wrap items-center gap-2" data-galaxy-star-chart>
                <span className={cn("text-xs font-black uppercase", visual.eyebrowClass)}>
                  {t({ en: "Star chart", zh: "星圖收藏", zhHans: "星图收藏" })}
                </span>
                {fullGalaxyMap.constellations.map((constellation) => {
                  const earned = constellation.complete;
                  const isNew = freshBadgeIds.has(constellation.id);
                  const palette = constellationPalettes[constellation.id];
                  return (
                    <button
                      key={constellation.id}
                      type="button"
                      data-galaxy-badge={constellation.id}
                      data-galaxy-badge-earned={earned ? "true" : "false"}
                      aria-pressed={zoomConstellation === constellation.id}
                      aria-label={`${text(constellation.name)} · ${constellation.litCount}/${constellation.totalCount}${earned ? ` · ${t({ en: "earned", zh: "已獲得", zhHans: "已获得" })}` : ""}`}
                      onClick={() => {
                        setSelectedStarId(null);
                        setHoveredStarId(null);
                        setZoomConstellation((previous) => (previous === constellation.id ? null : constellation.id));
                      }}
                      className={cn(
                        "focus-ring inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black backdrop-blur-md transition hover:-translate-y-0.5",
                        visual.legendClass,
                        !earned && "opacity-75",
                        isNew && "adaptive-galaxy-badge-new"
                      )}
                      style={earned ? { borderColor: palette.stops[1], boxShadow: `0 0 14px ${palette.glow}` } : undefined}
                    >
                      <span aria-hidden="true" style={{ color: palette.stops[1] }}>{earned ? "★" : "☆"}</span>
                      <span>{text(constellation.name)}</span>
                      <span className="opacity-75">
                        {constellation.litCount}/{constellation.totalCount}
                      </span>
                      {isNew ? (
                        <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] uppercase", visual.badgeSuccessClass)}>
                          {t({ en: "New!", zh: "新獲得!", zhHans: "新获得!" })}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-7 min-w-0 overflow-hidden pb-2">
              {viewMode === "universe" && isUsCaliforniaTrack ? (
                <MathUniverse
                  currentSkillId={decision?.skill.id ?? null}
                  studentGrade={selectedGrade}
                  studentId={currentUser?.id ?? null}
                  studentName={currentUser?.name ?? null}
                  theme={theme}
                />
              ) : decision && galaxyMap ? (
                <div
                  className="relative h-[28rem] min-w-0 sm:h-[31rem]"
                  onClick={() => setSelectedStarId(null)}
                >
                  <svg aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    {!zoomConstellation
                      ? galaxyMap.constellations
                          .filter((constellation) => constellation.complete && constellation.completionPath.length > 1)
                          .map((constellation) => (
                            <path
                              key={`outline-${constellation.id}`}
                              d={constellationOutlinePath(constellation.completionPath)}
                              className="adaptive-galaxy-constellation-stroke"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="0.4"
                              style={{ stroke: constellationPalettes[constellation.id].stops[1] }}
                            />
                          ))
                      : null}
                    {galaxyMap.edges.map((edge) => {
                      if (edge.kind === "prerequisite" && (!selectedStarId || (edge.from !== selectedStarId && edge.to !== selectedStarId))) {
                        return null;
                      }
                      const from = starById.get(edge.from);
                      const to = starById.get(edge.to);
                      if (!from || !to) return null;

                      return (
                        <path
                          key={edge.id}
                          d={edgePathFor(from, to)}
                          className={
                            edge.kind === "prerequisite"
                              ? "adaptive-galaxy-prerequisite-stroke"
                              : edge.kind === "review"
                                ? "adaptive-galaxy-review-stroke"
                                : "adaptive-galaxy-route-stroke"
                          }
                          fill="none"
                          strokeLinecap="round"
                          strokeWidth={edge.kind === "route" ? 0.9 : 0.7}
                        />
                      );
                    })}
                  </svg>

                  {galaxyMap.stars.map((star) => (
                    <KnowledgeStar
                      key={star.id}
                      star={star}
                      zoomed={Boolean(zoomConstellation)}
                      dimmed={Boolean(focusIds && !focusIds.has(star.id))}
                      selected={selectedStarId === star.id}
                      ignited={ignitedStarIds.has(star.id)}
                      visual={visual}
                      onHover={() => setHoveredStarId(star.id)}
                      onLeave={() => setHoveredStarId((previous) => (previous === star.id ? null : previous))}
                      onSelect={() => setSelectedStarId((previous) => (previous === star.id ? null : star.id))}
                    />
                  ))}

                  {(zoomConstellation
                    ? galaxyMap.constellations.filter((constellation) => constellation.id === zoomConstellation)
                    : galaxyMap.constellations
                  ).map((constellation) => (
                    <button
                      key={constellation.id}
                      type="button"
                      data-galaxy-constellation={constellation.id}
                      aria-pressed={zoomConstellation === constellation.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedStarId(null);
                        setHoveredStarId(null);
                        setZoomConstellation((previous) => (previous === constellation.id ? null : constellation.id));
                      }}
                      className={cn(
                        "focus-ring absolute z-20 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs font-black backdrop-blur-md transition hover:-translate-y-0.5 hover:scale-105",
                        visual.legendClass
                      )}
                      style={{ left: `${constellation.labelX}%`, top: `${constellation.labelY}%` }}
                    >
                      <span style={{ color: constellationPalettes[constellation.id].stops[1] }}>{text(constellation.name)}</span>
                      <span className="ml-2 opacity-80">
                        {constellation.litCount}/{constellation.totalCount}
                        {constellation.complete ? " ★" : ""}
                      </span>
                    </button>
                  ))}

                  {zoomConstellation ? (
                    <button
                      type="button"
                      data-galaxy-zoom-back
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedStarId(null);
                        setHoveredStarId(null);
                        setZoomConstellation(null);
                      }}
                      className={cn(
                        "focus-ring absolute left-4 top-4 z-20 rounded-full px-3 py-2 text-xs font-black backdrop-blur-md transition hover:-translate-y-0.5",
                        visual.legendClass
                      )}
                    >
                      ← {t({ en: "Back to galaxy", zh: "返回星系", zhHans: "返回星系" })}
                    </button>
                  ) : null}

                  {cardStar ? <StarHoverCard star={cardStar} pinned={Boolean(selectedStar)} visual={visual} /> : null}

                  <div className="absolute bottom-5 left-4 z-20 flex flex-wrap items-center gap-2 text-xs font-black">
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)}>
                      {t({ en: "Stars are knowledge points", zh: "星星即知識點", zhHans: "星星即知识点" })}
                    </span>
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)} data-galaxy-illumination>
                      ★ {galaxyMap.illumination.litCount}/{galaxyMap.illumination.totalCount} · {galaxyMap.illumination.percent}% {t({ en: "illuminated", zh: "已點亮", zhHans: "已点亮" })}
                    </span>
                    <span className={cn("px-3 py-2 backdrop-blur-md", visual.legendClass)}>
                      {t({ en: "Tap a star for details", zh: "點按星星查看詳情", zhHans: "点按星星查看详情" })}
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
