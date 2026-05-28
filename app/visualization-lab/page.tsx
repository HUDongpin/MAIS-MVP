"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  filterVisualizationLabsByTrack,
  type FeaturedLabDefinition,
  getPrimaryVisualizationLabForTopic,
  gradeLabGroups,
  visualizationLabCount,
  type VisualizationCurriculumTrack,
  visualizationTrackLabels,
  type VisualizationModuleId,
  type VisualizationTrackFilter
} from "@/data/visualizationLabs";
import { publisherLabels } from "@/lib/curriculumProfile";
import { formatGradeLabel, formatGradeLabelForCurriculum, formatGradeRange, formatLearnerName, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { VisualizationLabBackToTopButton } from "@/app/visualization-lab/VisualizationLabBackToTopButton";
import type { GradeId, LocalizedText, StudentSession, TextbookPublisher, Topic } from "@/types";

type LabComponentProps = { topicId: string; labId?: string };

function VisualizationModuleLoading() {
  return (
    <div className="grid min-h-[18rem] place-items-center rounded-2xl border border-cyan-200/70 bg-cyan-50/70 p-6 text-sm font-black text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
      Loading visualization...
    </div>
  );
}

const RoadmapVisualizationSuite = dynamic(
  () => import("@/components/visualizations/RoadmapVisualizationSuite").then((mod) => mod.RoadmapVisualizationSuite),
  { loading: VisualizationModuleLoading }
);

const labComponentRegistry: Record<VisualizationModuleId, ComponentType<LabComponentProps>> = {
  "coordinate-plane-demo": dynamic(
    () => import("@/components/visualizations/CoordinatePlaneDemo").then((mod) => mod.CoordinatePlaneDemo),
    { loading: VisualizationModuleLoading }
  ),
  "function-graph-explorer": dynamic(
    () => import("@/components/visualizations/FunctionGraphExplorer").then((mod) => mod.FunctionGraphExplorer),
    { loading: VisualizationModuleLoading }
  ),
  "geometry-explorer": dynamic(
    () => import("@/components/visualizations/GeometryExplorer").then((mod) => mod.GeometryExplorer),
    { loading: VisualizationModuleLoading }
  ),
  "probability-simulator": dynamic(
    () => import("@/components/visualizations/ProbabilitySimulator").then((mod) => mod.ProbabilitySimulator),
    { loading: VisualizationModuleLoading }
  ),
  "function-model-comparer": dynamic(
    () => import("@/components/visualizations/FunctionModelComparer").then((mod) => mod.FunctionModelComparer),
    { loading: VisualizationModuleLoading }
  ),
  "trig-wave-explorer": dynamic(
    () => import("@/components/visualizations/TrigWaveExplorer").then((mod) => mod.TrigWaveExplorer),
    { loading: VisualizationModuleLoading }
  ),
  "calculus-stats-lab": dynamic(
    () => import("@/components/visualizations/CalculusStatsLab").then((mod) => mod.CalculusStatsLab),
    { loading: VisualizationModuleLoading }
  ),
  "configured-visualization-lab": dynamic(
    () => import("@/components/visualizations/ConfiguredVisualizationLab").then((mod) => mod.ConfiguredVisualizationLab),
    { loading: VisualizationModuleLoading }
  )
};

const trackFilterOptions: VisualizationTrackFilter[] = ["all", "HK", "MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH", "CAPSTONE"];
const mainlandPepVisualizationTracks: readonly VisualizationCurriculumTrack[] = ["MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH"];
const hongKongPublishers = new Set<TextbookPublisher>(["HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]);

function isMainlandPepVisualizationTrack(track: VisualizationCurriculumTrack) {
  return mainlandPepVisualizationTracks.includes(track);
}

function labMatchesLearnerCurriculum(lab: FeaturedLabDefinition, currentUser: StudentSession | null) {
  if (!currentUser) return true;

  const publisher = currentUser.curriculumProfile.publisher;
  if (publisher === "MAINLAND_PEP") return isMainlandPepVisualizationTrack(lab.curriculumTrack);
  if (publisher === "MAINLAND_HJB") return lab.topicId.startsWith("hjb-");
  if (publisher === "MAINLAND_BNU") return lab.topicId.startsWith("bnu-");
  if (hongKongPublishers.has(publisher)) return lab.curriculumTrack === "HK" && !lab.topicId.startsWith("hjb-") && !lab.topicId.startsWith("bnu-");

  return false;
}

function getLabHrefForRoadmapTopic(topic: Topic) {
  const matchingLab = getPrimaryVisualizationLabForTopic(topic.id);
  const gradeFallbackLab = gradeLabGroups.find((group) => group.grade === topic.grade)?.labs[0];
  const targetLab = matchingLab ?? gradeFallbackLab;

  return targetLab ? `#lab-example-${targetLab.labId}` : null;
}

export default function VisualizationLabPage() {
  const { currentUser, language, selectedGrade, t, text } = useSettings();
  const [showAllGrades, setShowAllGrades] = useState(false);
  const [trackFilter, setTrackFilter] = useState<VisualizationTrackFilter>("all");
  const currentUserGrade = currentUser?.grade ?? selectedGrade;
  const baseActiveGroup = gradeLabGroups.find((group) => group.grade === currentUserGrade) ?? gradeLabGroups[0];
  const effectiveTrackFilter: VisualizationTrackFilter = currentUser ? "all" : trackFilter;
  const curriculumScopedGroups = useMemo(() => {
    return gradeLabGroups
      .map((group) => ({
        ...group,
        labs: group.labs.filter((lab) => labMatchesLearnerCurriculum(lab, currentUser))
      }))
      .filter((group) => group.labs.length > 0);
  }, [currentUser]);
  const activeGroup = curriculumScopedGroups.find((group) => group.grade === currentUserGrade) ?? { ...baseActiveGroup, labs: [] };

  const displayedGroups = useMemo(() => {
    const sourceGroups = showAllGrades ? curriculumScopedGroups : [activeGroup];
    return sourceGroups
      .map((group) => ({
        ...group,
        labs: filterVisualizationLabsByTrack(group.labs, effectiveTrackFilter)
      }))
      .filter((group) => group.labs.length > 0);
  }, [activeGroup, curriculumScopedGroups, effectiveTrackFilter, showAllGrades]);

  const visibleLabs = useMemo(() => displayedGroups.flatMap((group) => group.labs), [displayedGroups]);
  const curriculumScopedLabCount = useMemo(() => curriculumScopedGroups.reduce((sum, group) => sum + group.labs.length, 0), [curriculumScopedGroups]);

  useEffect(() => {
    function openLabFromHash() {
      const prefix = "#lab-example-";
      if (!window.location.hash.startsWith(prefix)) return;

      const labId = decodeURIComponent(window.location.hash.slice(prefix.length));
      if (!labId) return;
      setShowAllGrades(true);
    }

    openLabFromHash();
    window.addEventListener("hashchange", openLabFromHash);
    return () => window.removeEventListener("hashchange", openLabFromHash);
  }, []);

  const displayedLabCount = visibleLabs.length;
  const selectedGradeLabCount = filterVisualizationLabsByTrack(activeGroup.labs, effectiveTrackFilter).length;
  const totalAvailableLabCount = currentUser ? curriculumScopedLabCount : visualizationLabCount;
  const displayedLabCountLabel = `${displayedLabCount} ${t(displayedLabCount === 1 ? dictionary.common.lab : dictionary.common.labs)}`;
  const selectedGradeLabCountLabel = `${selectedGradeLabCount} ${t(selectedGradeLabCount === 1 ? dictionary.common.lab : dictionary.common.labs)}`;
  const totalAvailableLabCountLabel = `${totalAvailableLabCount} ${t(totalAvailableLabCount === 1 ? dictionary.common.lab : dictionary.common.labs)}`;
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : t(dictionary.common.selectedLearner);
  const currentCurriculumLabel = currentUser ? text(publisherLabels[currentUser.curriculumProfile.publisher]) : null;
  const curriculumGradeRangeLabel = currentUser?.curriculumTrack === "MAINLAND_PEP_HIGH"
    ? t({ en: "P1-S6", zh: "小一至高三", zhHans: "小一至高三" })
    : formatGradeRange(language, true);
  const displayGradeLabel = (grade: GradeId) => currentUser
    ? formatGradeLabelForCurriculum(grade, language, currentUser.curriculumTrack, true)
    : formatGradeLabel(grade, language, true);
  const activeGradeLabel = displayGradeLabel(activeGroup.grade);
  const displayedGradeLabel = showAllGrades
    ? currentCurriculumLabel
      ? `${currentCurriculumLabel} · ${curriculumGradeRangeLabel}`
      : formatGradeRange(language, true)
    : currentCurriculumLabel
      ? `${currentCurriculumLabel} · ${activeGradeLabel}`
      : activeGradeLabel;
  const displayedFocus = showAllGrades
    ? currentCurriculumLabel
      ? isChineseLanguage(language)
        ? simplifyChineseText(`${currentCurriculumLabel}课程内共有${totalAvailableLabCountLabel}，按年级展开。`, language)
        : `${totalAvailableLabCountLabel} in ${currentCurriculumLabel}, grouped by grade.`
      : t({
          en: "All 100 interactive modules across HK and Mainland roadmap topics, plus capstone bridges for multi-topic reasoning.",
          zh: "涵蓋香港與內地路線圖知識點的 100 個互動模組，另有綜合銜接實驗支援跨課題推理。"
        })
    : activeGroup.labs.length > 0
      ? text(activeGroup.focus)
      : currentCurriculumLabel
        ? isChineseLanguage(language)
          ? simplifyChineseText(`${currentCurriculumLabel}暂时没有${activeGradeLabel}可视化实验。`, language)
          : `${currentCurriculumLabel} does not have ${activeGradeLabel} visualization labs yet.`
        : text(activeGroup.focus);
  const visualizationSetTitle = showAllGrades
    ? currentCurriculumLabel
      ? isChineseLanguage(language)
        ? simplifyChineseText(`${learnerName}的${currentCurriculumLabel}可视化`, language)
        : `${learnerName}'s ${currentCurriculumLabel} visualizations`
      : isChineseLanguage(language)
        ? simplifyChineseText(`${learnerName}正在瀏覽${formatGradeRange(language)}視覺化`, language)
        : `${learnerName} is exploring ${formatGradeRange(language, true)} visualizations`
    : currentUser && currentCurriculumLabel
      ? isChineseLanguage(language)
        ? simplifyChineseText(`${learnerName}的${currentCurriculumLabel}${activeGradeLabel}可视化`, language)
        : `${learnerName}'s ${currentCurriculumLabel} ${activeGradeLabel} visualizations`
      : currentUser
        ? isChineseLanguage(language)
          ? simplifyChineseText(`${learnerName}的${activeGradeLabel}視覺化`, language)
          : `${learnerName}'s ${activeGradeLabel} visualizations`
        : isChineseLanguage(language)
          ? simplifyChineseText(`${activeGradeLabel}視覺化`, language)
          : `${activeGradeLabel} visualizations`;
  const gradeReturnLabel = isChineseLanguage(language)
    ? simplifyChineseText(`返回我的${activeGradeLabel}實驗室`, language)
    : `Back to my ${activeGradeLabel} labs`;
  const exploreAllScopeLabel = currentUser
    ? t({ en: "Explore my curriculum", zh: "探索我的課程實驗", zhHans: "探索我的课程实验" })
    : t({ en: "Explore all labs", zh: "探索全部實驗" });
  const exploreAllScopeDetails = currentCurriculumLabel
    ? `${currentCurriculumLabel} · ${totalAvailableLabCountLabel}`
    : `${formatGradeRange(language, true)} · ${visualizationLabCount} ${t(dictionary.common.labs)}`;
  const emptyStateText = currentUser
    ? t({ en: "No labs match this account curriculum and grade yet.", zh: "此帳號課程與年級暫時沒有相符實驗。", zhHans: "此账号课程与年级暂时没有相符实验。" })
    : t({ en: "No labs match this grade and track filter yet.", zh: "此年級與路線篩選暫時沒有相符實驗。" });
  const displayLabGradeLabel = (lab: FeaturedLabDefinition) => currentCurriculumLabel
    ? `${displayGradeLabel(lab.grade)} · ${currentCurriculumLabel}`
    : text(lab.gradeLabel);
  const displayGradeGroupTitle = (grade: GradeId, name: LocalizedText) => isChineseLanguage(language)
    ? displayGradeLabel(grade)
    : text(name);

  function trackLabel(option: VisualizationTrackFilter) {
    if (option === "all") return t({ en: "All tracks", zh: "全部路線" });
    return text(visualizationTrackLabels[option]);
  }

  return (
    <div className="min-h-full bg-[linear-gradient(115deg,#eefaff_0%,#f8fbff_46%,#f7f4ff_100%)] text-slate-950 dark:bg-none dark:bg-slate-950 dark:text-slate-100">
      <div className="page-container py-10 sm:py-12">
        <SectionHeader title={t(dictionary.pages.visualizationTitle)} description={t(dictionary.pages.visualizationDesc)} eyebrow={t(dictionary.visualization.eyebrow)} />
        {showAllGrades ? (
          <div className="mt-10 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(dictionary.visualization.directoryEyebrow)}</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {currentCurriculumLabel ?? t(dictionary.visualization.directoryTitle)}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {currentCurriculumLabel ? `${currentCurriculumLabel} · ${totalAvailableLabCountLabel}` : t(dictionary.visualization.directoryDesc)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllGrades(false)}
                className="focus-ring inline-flex w-fit shrink-0 items-center justify-center rounded-2xl border border-cyan-300 bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-1 hover:bg-cyan-300"
              >
                {gradeReturnLabel}
              </button>
            </div>
            {currentUser ? null : <RoadmapVisualizationSuite getTopicLabHref={getLabHrefForRoadmapTopic} />}
          </div>
        ) : null}

        <section className={`${showAllGrades ? "mt-14" : "mt-10"} space-y-8`}>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
                {currentUser ? t({ en: "Student visualization set", zh: "學生視覺化組合" }) : t(dictionary.visualization.deepDiveEyebrow)}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {visualizationSetTitle}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {displayedFocus}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-700 dark:text-cyan-200">
                  {learnerName}
                </span>
                <span className="rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                  {displayedGradeLabel} · {displayedLabCountLabel}
                </span>
                <span className="rounded-full border border-violet-300/35 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-200">
                  {totalAvailableLabCountLabel}
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" aria-label={t({ en: "Choose visualization scope", zh: "選擇視覺化範圍" })}>
              <button
                type="button"
                onClick={() => setShowAllGrades(false)}
                aria-pressed={!showAllGrades}
                className={`focus-ring rounded-2xl border p-4 text-center shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 ${
                  !showAllGrades
                    ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-cyan-500/20"
                    : "border-slate-200/70 bg-white/75 text-slate-950 hover:bg-white dark:border-white/10 dark:bg-slate-950/55 dark:text-white dark:hover:bg-white/[0.08]"
                }`}
              >
                <span className="text-lg font-black">
                  {isChineseLanguage(language) ? simplifyChineseText(`只看我的${activeGradeLabel}`, language) : `My ${activeGradeLabel} labs`}
                </span>
                <span className={`mt-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${!showAllGrades ? "text-slate-800" : "text-slate-500 dark:text-slate-400"}`}>
                  {selectedGradeLabCountLabel}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAllGrades(true)}
                aria-pressed={showAllGrades}
                className={`focus-ring rounded-2xl border p-4 text-center shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 ${
                  showAllGrades
                    ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-cyan-500/20"
                    : "border-slate-200/70 bg-white/75 text-slate-950 hover:bg-white dark:border-white/10 dark:bg-slate-950/55 dark:text-white dark:hover:bg-white/[0.08]"
                }`}
              >
                <span className="text-lg font-black">{exploreAllScopeLabel}</span>
                <span className={`mt-1 block text-[11px] font-bold uppercase tracking-[0.16em] ${showAllGrades ? "text-slate-800" : "text-slate-500 dark:text-slate-400"}`}>
                  {exploreAllScopeDetails}
                </span>
              </button>
            </div>
          </div>

          {currentCurriculumLabel ? (
            <div className="flex flex-wrap items-center gap-2" aria-label={t({ en: "Account curriculum", zh: "帳號課程", zhHans: "账号课程" })}>
              <span className="rounded-full border border-cyan-300 bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20">
                {currentCurriculumLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" aria-label={t({ en: "Filter by curriculum track", zh: "按課程路線篩選" })}>
              {trackFilterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTrackFilter(option)}
                  aria-pressed={trackFilter === option}
                  className={`focus-ring rounded-full border px-4 py-2 text-xs font-black transition ${
                    trackFilter === option
                      ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                      : "border-slate-200/70 bg-white/75 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300 dark:hover:bg-white/[0.09]"
                  }`}
                >
                  {trackLabel(option)}
                </button>
              ))}
            </div>
          )}

          {visibleLabs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
              {emptyStateText}
            </div>
          ) : null}

          <div className="space-y-10">
            {displayedGroups.map((group) => (
              <section key={group.grade} id={`lab-${group.grade.toLowerCase()}`} className="scroll-mt-28 space-y-5">
                <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
                      {isChineseLanguage(language) ? simplifyChineseText(`${displayGradeLabel(group.grade)}深入實驗`, language) : `${displayGradeLabel(group.grade)} deep-dive labs`}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                      {displayGradeGroupTitle(group.grade, group.name)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(group.focus)}</p>
                  </div>
                  <span className={`h-2 w-full rounded-full bg-gradient-to-r sm:w-64 ${group.accent}`} />
                </div>

                <div className="space-y-6">
                  {group.labs.map((lab) => {
                    const LabComponent = labComponentRegistry[lab.moduleId];

                    return (
                      <div
                        key={lab.labId}
                        id={`lab-example-${lab.labId}`}
                        tabIndex={-1}
                        className="scroll-mt-28 space-y-3 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-cyan-300/40"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-black text-cyan-700 dark:text-cyan-200">
                            {text(lab.category)}
                          </span>
                          <span className="rounded-full border border-slate-200/70 bg-white/75 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
                            {displayLabGradeLabel(lab)}
                          </span>
                        </div>
                        <VisualizationCard title={text(lab.title)} description={text(lab.description)} analyticsSource={lab.analyticsSource} topicId={lab.topicId}>
                          <LabComponent topicId={lab.topicId} labId={lab.labId} />
                        </VisualizationCard>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/65 p-5 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-300">
            <p className="font-black text-slate-900 dark:text-white">{t(dictionary.visualization.seniorCoverageTitle)}</p>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t(dictionary.visualization.seniorCoverageDesc)}
            </p>
          </div>
        </section>
        <VisualizationLabBackToTopButton />
      </div>
    </div>
  );
}
