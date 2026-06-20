"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfiguredVisualizationLab } from "@/components/visualizations/ConfiguredVisualizationLab";
import { VisualizationCard } from "@/components/visualizations/VisualizationCard";
import labIcon0 from "@/components/visualizations/assets/lab-icons/lab-icon-0.png";
import labIcon1 from "@/components/visualizations/assets/lab-icons/lab-icon-1.png";
import labIcon2 from "@/components/visualizations/assets/lab-icons/lab-icon-2.png";
import labIcon3 from "@/components/visualizations/assets/lab-icons/lab-icon-3.png";
import labIcon4 from "@/components/visualizations/assets/lab-icons/lab-icon-4.png";
import labIcon5 from "@/components/visualizations/assets/lab-icons/lab-icon-5.png";
import labIcon6 from "@/components/visualizations/assets/lab-icons/lab-icon-6.png";
import labIcon7 from "@/components/visualizations/assets/lab-icons/lab-icon-7.png";
import labQuestIslandMapEn from "@/components/visualizations/assets/lab-quest-island-map-en-4k.webp";
import labQuestIslandMap from "@/components/visualizations/assets/lab-quest-island-map-4k.webp";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { buildVisualizationLabHref, buildVisualizationPracticeHref, buildVisualizationSessionModuleId, buildVisualizationSnapshotMarkSample } from "@/components/visualizations/visualizationDiagnostics";
import {
  filterVisualizationLabsByTrack,
  type FeaturedLabDefinition,
  type GradeLabGroupDefinition,
  getVisualizationLabByLabId,
  gradeLabGroups,
  visualizationLabCount,
  type VisualizationLabModuleId,
  type VisualizationCurriculumTrack,
  visualizationTrackLabels,
  type VisualizationTrackFilter
} from "@/data/visualizationLabs";
import { gradeIds } from "@/data/grades";
import { publisherLabels } from "@/lib/curriculumProfile";
import { formatGradeLabel, formatGradeLabelForCurriculum, formatGradeRange, formatLearnerName, isChineseLanguage, simplifyChineseText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { studentVisualizationToolsPath, visualizationLabPath } from "@/lib/visualizationRoutes";
import type { GradeId, StudentSession, TextbookPublisher } from "@/types";

type LabComponentProps = { topicId: string; labId?: string };
type PanelMode = "control" | "lab";
type DirectLinkStatus = "idle" | "ok" | "missing" | "unavailable";
type ShareState = "idle" | "copied" | "error" | "blocked";
type SnapshotState = "idle" | "copied" | "error" | "blocked";
type VisualizationLabPageProps = {
  initialGrade?: GradeId | null;
  initialLabId?: string | null;
};
type VisualizationSessionsResponse = {
  sessions?: Array<{
    moduleId?: unknown;
    explored?: unknown;
  }>;
};

const labComponentRegistry: Record<VisualizationLabModuleId, ComponentType<LabComponentProps>> = {
  "configured-visualization-lab": ConfiguredVisualizationLab
};

const trackFilterOptions: VisualizationTrackFilter[] = ["all", "HK", "US", "MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH", "MAINLAND_HJB", "MAINLAND_BNU", "CAPSTONE"];
const mainlandPepVisualizationTracks: readonly VisualizationCurriculumTrack[] = ["MAINLAND_PEP_PRIMARY", "MAINLAND_PEP_JUNIOR", "MAINLAND_PEP_HIGH"];
const hongKongPublishers = new Set<TextbookPublisher>(["HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY", "HK_UNITED_PRIME_MIA", "HK_EPH_MIF"]);
const unitedStatesPublishers = new Set<TextbookPublisher>(["US_CA_MATH", "US_NC_MATH", "US_AR_MATH", "US_FL_MATH"]);

const labTileThemes = [
  {
    bg: "from-emerald-200 to-emerald-50",
    border: "border-emerald-300",
    bar: "bg-emerald-500"
  },
  {
    bg: "from-orange-200 to-rose-100",
    border: "border-orange-300",
    bar: "bg-orange-500"
  },
  {
    bg: "from-sky-200 to-cyan-50",
    border: "border-sky-300",
    bar: "bg-sky-500"
  },
  {
    bg: "from-violet-200 to-fuchsia-50",
    border: "border-violet-300",
    bar: "bg-violet-500"
  },
  {
    bg: "from-amber-200 to-yellow-50",
    border: "border-amber-300",
    bar: "bg-amber-500"
  },
  {
    bg: "from-teal-200 to-cyan-50",
    border: "border-teal-300",
    bar: "bg-teal-500"
  },
  {
    bg: "from-rose-200 to-red-50",
    border: "border-rose-300",
    bar: "bg-rose-500"
  },
  {
    bg: "from-blue-200 to-indigo-50",
    border: "border-blue-300",
    bar: "bg-blue-500"
  }
] as const;

const labIconImages = [labIcon0, labIcon1, labIcon2, labIcon3, labIcon4, labIcon5, labIcon6, labIcon7] as const;
const snapshotControlSampleLimit = 24;

function isVisualizationTrackFilter(value: string | null): value is VisualizationTrackFilter {
  return trackFilterOptions.includes(value as VisualizationTrackFilter);
}

function isGradeId(value: string | null): value is GradeId {
  return gradeLabGroups.some((group) => group.grade === value);
}

function filterGradeLabGroups(groups: GradeLabGroupDefinition[], track: VisualizationTrackFilter) {
  return groups
    .map((group) => ({
      ...group,
      labs: filterVisualizationLabsByTrack(group.labs, track)
    }))
    .filter((group) => group.labs.length > 0);
}

function findGroupForLab(groups: GradeLabGroupDefinition[], labId: string | null | undefined) {
  if (!labId) return null;
  return groups.find((group) => group.labs.some((lab) => lab.labId === labId)) ?? null;
}

function isMainlandPepVisualizationTrack(track: VisualizationCurriculumTrack) {
  return mainlandPepVisualizationTracks.includes(track);
}

function labMatchesLearnerCurriculum(lab: FeaturedLabDefinition, currentUser: StudentSession | null) {
  if (!currentUser) return true;

  const publisher = currentUser.curriculumProfile.publisher;
  if (publisher === "MAINLAND_PEP") return isMainlandPepVisualizationTrack(lab.curriculumTrack);
  if (publisher === "MAINLAND_HJB") return lab.curriculumTrack === "MAINLAND_HJB";
  if (publisher === "MAINLAND_BNU") return lab.curriculumTrack === "MAINLAND_BNU";
  if (unitedStatesPublishers.has(publisher)) return lab.curriculumTrack === "US" && lab.publisher === publisher;
  if (hongKongPublishers.has(publisher)) return lab.curriculumTrack === "HK";

  return false;
}

function labAllowsExternalDistribution(lab: FeaturedLabDefinition | null) {
  if (!lab?.safeguard) return true;
  return lab.safeguard.status === "approved";
}

function compactTitle(title: string) {
  return title
    .replace(/实验|實驗|探索|可视化|視覺化/g, "")
    .replace(/\b(?:Visualization|Visual)\s+Lab\b/gi, "")
    .replace(/\bLab\b$/gi, "")
    .replace(/\s+/g, " ")
    .trim() || title;
}

function compactSnapshotText(value: string | null | undefined, limit = 120) {
  const compacted = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!compacted) return null;
  return compacted.length > limit ? `${compacted.slice(0, limit)}...` : compacted;
}

function getSnapshotControlLabel(element: Element) {
  return compactSnapshotText(
    element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.getAttribute("name") ??
      element.textContent,
    96
  );
}

function buildSnapshotRangeIssue(range: { index: number; max: string | null; min: string | null; value: string | null }) {
  const value = Number(range.value);
  const min = Number(range.min);
  const max = Number(range.max);
  const issues: string[] = [];

  if (!Number.isFinite(value)) issues.push(`range-${range.index}-value-not-finite`);
  if (!Number.isFinite(min)) issues.push(`range-${range.index}-min-not-finite`);
  if (!Number.isFinite(max)) issues.push(`range-${range.index}-max-not-finite`);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) issues.push(`range-${range.index}-min-greater-than-max`);
  if (Number.isFinite(value) && Number.isFinite(min) && value < min - 1e-9) issues.push(`range-${range.index}-value-below-min`);
  if (Number.isFinite(value) && Number.isFinite(max) && value > max + 1e-9) issues.push(`range-${range.index}-value-above-max`);

  return issues;
}

async function writeTextToClipboard(text: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    if (window.navigator.clipboard?.writeText) {
      await window.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below when browser policy denies the async Clipboard API.
  }

  if (!document.body || typeof document.execCommand !== "function") return false;

  const textArea = document.createElement("textarea");
  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];

  textArea.value = text;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);

  try {
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textArea.remove();
    if (selection) {
      selection.removeAllRanges();
      selectedRanges.forEach((range) => selection.addRange(range));
    }
  }
}

function labTitleSizeClass(title: string) {
  const length = Array.from(title).length;
  const hasChinese = /[\u3400-\u9fff]/.test(title);

  if (hasChinese && length > 11) return "text-[1rem] leading-[1.18]";
  if (!hasChinese && length > 32) return "text-[0.95rem] leading-[1.15]";
  if (!hasChinese && length > 22) return "text-base leading-[1.18]";
  return "text-lg leading-tight";
}

function progressForIndex(index: number) {
  const done = [20, 12, 16, 14, 18, 15, 10, 17][index % 8];
  return { done, total: 30, percent: Math.round((done / 30) * 100) };
}

function Stars({ count = 3, muted = 2 }: { count?: number; muted?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} stars`}>
      {Array.from({ length: count }).map((_, index) => (
        <span key={`star-${index}`} className="text-sm leading-none text-amber-400">★</span>
      ))}
      {Array.from({ length: muted }).map((_, index) => (
        <span key={`muted-${index}`} className="text-sm leading-none text-slate-300">★</span>
      ))}
    </span>
  );
}

function LabQuestMap({
  href,
  language,
  onNodeClick,
  recommendedLabId
}: {
  href: string;
  language: string;
  onNodeClick: () => void;
  recommendedLabId: string;
}) {
  const isEnglish = language === "en";
  const mapImage = isEnglish ? labQuestIslandMapEn : labQuestIslandMap;

  return (
    <a
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onNodeClick();
      }}
      data-viz-lab-quest-map-link
      data-viz-recommended-lab-id={recommendedLabId}
      className="focus-ring relative block aspect-[484/169] w-full self-start overflow-hidden rounded-[1.35rem] border-0 bg-transparent p-0 text-left transition hover:-translate-y-0.5"
      aria-label={isEnglish ? "Open recommended lab" : "打开推荐实验"}
    >
      <img
        src={mapImage.src}
        alt={isEnglish ? "Math lab quest island map" : "数学实验岛地图"}
        className="h-full w-full origin-center scale-[1.028] object-cover"
        decoding="async"
        fetchPriority="high"
      />
    </a>
  );
}

function GradeChip({
  active,
  grade,
  hasLabs,
  href,
  label,
  onClick
}: {
  active: boolean;
  grade: GradeId;
  hasLabs: boolean;
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      href={hasLabs ? href : "#"}
      aria-pressed={active}
      aria-disabled={!hasLabs}
      onClick={(event) => {
        if (!hasLabs) {
          event.preventDefault();
          return;
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onClick();
      }}
      data-viz-grade-chip
      data-viz-grade-chip-active={String(active)}
      data-viz-grade-chip-grade={grade}
      data-viz-grade-chip-has-labs={String(hasLabs)}
      className={cn(
        "focus-ring h-11 min-w-14 rounded-lg border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/25"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      )}
    >
      {label}
    </a>
  );
}

function LabTile({
  active,
  href,
  index,
  lab,
  onOpen,
  title
}: {
  active: boolean;
  href: string;
  index: number;
  lab: FeaturedLabDefinition;
  onOpen: () => void;
  title: string;
}) {
  const theme = labTileThemes[index % labTileThemes.length];
  const icon = labIconImages[index % labIconImages.length];
  const progress = progressForIndex(index);

  return (
    <a
      id={`lab-tile-${lab.labId}`}
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        onOpen();
      }}
      aria-current={active ? "page" : undefined}
      data-lab-id={lab.labId}
      data-viz-lab-tile
      className={cn(
        "focus-ring group flex min-h-[14.25rem] flex-col rounded-xl border bg-gradient-to-br p-4 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl",
        theme.bg,
        theme.border,
        active ? "ring-4 ring-blue-500/20" : ""
      )}
    >
      <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-lg shadow-slate-900/15">
        <Image src={icon} alt="" width={56} height={56} className="h-full w-full object-cover" />
      </span>
      <span className="mt-3 grid min-h-[5.6rem] min-w-0 flex-1 items-center">
        <span
          lang={/^[\x00-\x7F\s'-]+$/.test(title) ? "en" : undefined}
          title={title}
          className={cn(
            "line-clamp-4 block min-w-0 overflow-hidden break-words font-black text-slate-900 [hyphens:auto] [overflow-wrap:anywhere]",
            labTitleSizeClass(title)
          )}
        >
          {title}
        </span>
      </span>
      <span className="mt-2 flex shrink-0 items-center justify-between gap-3">
        <Stars count={index % 3 === 1 ? 2 : 3} muted={index % 3 === 1 ? 2 : 1} />
        <span className="shrink-0 text-xs font-black text-slate-600">{progress.done}/{progress.total}</span>
      </span>
      <span className="mt-3 block h-2 shrink-0 overflow-hidden rounded-full bg-white/70">
        <span className={cn("block h-full rounded-full", theme.bar)} style={{ width: `${progress.percent}%` }} />
      </span>
      <span className="sr-only">{lab.labId}</span>
    </a>
  );
}

export function VisualizationLabPage({ initialGrade = null, initialLabId = null }: VisualizationLabPageProps = {}) {
  const { currentUser, language, recordLearningEvent, selectedGrade, t, text } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("control");
  const [trackFilter, setTrackFilter] = useState<VisualizationTrackFilter>("all");
  const [activeDirectoryGrade, setActiveDirectoryGrade] = useState<GradeId | null>(null);
  const [activeLabId, setActiveLabId] = useState<string | null>(null);
  const [directLinkStatus, setDirectLinkStatus] = useState<DirectLinkStatus>("idle");
  const [exploredSessionIds, setExploredSessionIds] = useState<Set<string>>(() => new Set());
  const [requestedLabId, setRequestedLabId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [snapshotState, setSnapshotState] = useState<SnapshotState>("idle");
  const [isHydrated, setIsHydrated] = useState(false);

  const currentUserGrade = selectedGrade;
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
  const directoryGroups = useMemo(() => filterGradeLabGroups(curriculumScopedGroups, effectiveTrackFilter), [curriculumScopedGroups, effectiveTrackFilter]);
  const activeDirectoryGroup = useMemo(() => {
    return (
      directoryGroups.find((group) => group.grade === activeDirectoryGrade) ??
      directoryGroups.find((group) => group.grade === activeGroup.grade) ??
      directoryGroups[0] ??
      null
    );
  }, [activeDirectoryGrade, activeGroup.grade, directoryGroups]);
  const visibleLabs = activeDirectoryGroup?.labs ?? [];
  const activeDirectoryLab = useMemo(() => {
    return activeDirectoryGroup?.labs.find((lab) => lab.labId === activeLabId) ?? activeDirectoryGroup?.labs[0] ?? null;
  }, [activeDirectoryGroup, activeLabId]);
  const recommendedLab = visibleLabs[1] ?? activeDirectoryLab ?? visibleLabs[0] ?? null;
  const currentCurriculumLabel = currentUser ? text(publisherLabels[currentUser.curriculumProfile.publisher]) : null;
  const curriculumScopedLabCount = useMemo(() => curriculumScopedGroups.reduce((sum, group) => sum + group.labs.length, 0), [curriculumScopedGroups]);
  const totalAvailableLabCount = currentUser ? curriculumScopedLabCount : visualizationLabCount;
  const learnerName = currentUser ? formatLearnerName(currentUser.name, language) : t(dictionary.common.selectedLearner);
  const curriculumGradeRangeLabel = currentUser?.curriculumTrack === "MAINLAND_PEP_HIGH"
    ? t({ en: "P1-S6", zh: "小一至高三", zhHans: "小一至高三" })
    : formatGradeRange(language, true);
  const activeGradeLabel = activeDirectoryGroup
    ? displayGradeLabel(activeDirectoryGroup.grade)
    : displayGradeLabel(activeGroup.grade);
  const ActiveDirectoryLabComponent = activeDirectoryLab ? labComponentRegistry[activeDirectoryLab.moduleId] : null;
  const activeDirectorySessionModuleId = activeDirectoryLab ? buildVisualizationSessionModuleId(activeDirectoryLab) : null;
  const activeDirectoryLabHref = activeDirectoryLab ? buildVisualizationLabHref(activeDirectoryLab, effectiveTrackFilter) : null;
  const activeLabCanDistribute = labAllowsExternalDistribution(activeDirectoryLab);
  const activeLabSafeguardStatus = activeDirectoryLab?.safeguard?.status ?? "none";
  const recommendedLabHref = recommendedLab
    ? buildVisualizationLabHref(recommendedLab, effectiveTrackFilter)
    : buildControlPanelHref({
        grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
        track: effectiveTrackFilter
      });
  const activeDirectoryControlPanelHref = buildControlPanelHref({
    grade: activeDirectoryLab?.grade ?? activeDirectoryGroup?.grade ?? activeGroup.grade,
    track: effectiveTrackFilter
  });
  const activePracticeHref = activeDirectoryLab
    ? buildVisualizationPracticeHref(activeDirectoryLab)
    : "/practice";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    function openLabFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const queryLabId = params.get("lab") ?? initialLabId;
      const requestedTrack = !currentUser && isVisualizationTrackFilter(params.get("track")) ? params.get("track") as VisualizationTrackFilter : "all";
      const groupsForRequestedTrack = filterGradeLabGroups(curriculumScopedGroups, requestedTrack);
      const labGroup = findGroupForLab(groupsForRequestedTrack, queryLabId);
      const requestedGrade = isGradeId(params.get("grade")) ? params.get("grade") : initialGrade;
      const linkedCatalogLab = getVisualizationLabByLabId(queryLabId);
      const fallbackGradeGroup =
        (requestedGrade ? groupsForRequestedTrack.find((group) => group.grade === requestedGrade) : null) ??
        (linkedCatalogLab ? groupsForRequestedTrack.find((group) => group.grade === linkedCatalogLab.grade) : null) ??
        groupsForRequestedTrack.find((group) => group.grade === activeGroup.grade) ??
        groupsForRequestedTrack[0] ??
        null;
      const nextGrade = labGroup?.grade ?? fallbackGradeGroup?.grade ?? activeGroup.grade;
      const nextGroup = groupsForRequestedTrack.find((group) => group.grade === nextGrade) ?? fallbackGradeGroup;
      const queryLabIsAvailable = Boolean(queryLabId && labGroup);
      const nextLinkStatus: DirectLinkStatus = !queryLabId
        ? "idle"
        : queryLabIsAvailable
          ? "ok"
          : linkedCatalogLab
            ? "unavailable"
            : "missing";
      const nextLab = queryLabIsAvailable ? queryLabId : nextGroup?.labs[0]?.labId ?? null;

      const isTopicPageEntry = Boolean(initialLabId && window.location.pathname.startsWith(`${studentVisualizationToolsPath}/`));

      if (queryLabIsAvailable && labGroup && queryLabId && !isTopicPageEntry) {
        const canonicalParams = new URLSearchParams();
        canonicalParams.set("grade", labGroup.grade);
        if (!currentUser) canonicalParams.set("track", requestedTrack);
        canonicalParams.set("lab", queryLabId);
        const canonicalPath = `${visualizationLabPath}?${canonicalParams.toString()}`;
        if (`${window.location.pathname}${window.location.search}` !== canonicalPath) {
          window.history.replaceState(null, "", canonicalPath);
        }
      }

      setTrackFilter(requestedTrack);
      setActiveDirectoryGrade(nextGrade);
      setActiveLabId(nextLab);
      setDirectLinkStatus(nextLinkStatus);
      setRequestedLabId(queryLabId);
      setPanelMode(queryLabIsAvailable ? "lab" : "control");
    }

    openLabFromLocation();
    window.addEventListener("popstate", openLabFromLocation);
    return () => {
      window.removeEventListener("popstate", openLabFromLocation);
    };
  }, [activeGroup.grade, currentUser, curriculumScopedGroups, initialGrade, initialLabId]);

  useEffect(() => {
    if (!activeDirectoryGroup) return;
    if (activeLabId && activeDirectoryGroup.labs.some((lab) => lab.labId === activeLabId)) return;
    const hasDirectLabRequest = typeof window !== "undefined" && (
      new URLSearchParams(window.location.search).has("lab") ||
      Boolean(initialLabId && window.location.pathname.startsWith(`${studentVisualizationToolsPath}/`))
    );
    if (hasDirectLabRequest) return;
    setActiveLabId(activeDirectoryGroup.labs[0]?.labId ?? null);
  }, [activeDirectoryGroup, activeLabId, initialLabId]);

  useEffect(() => {
    setShareState("idle");
    setSnapshotState("idle");
  }, [activeDirectoryLab?.labId]);

  useEffect(() => {
    let active = true;

    if (!currentUser) {
      setExploredSessionIds(new Set());
      return () => {
        active = false;
      };
    }

    async function loadExploredSessions() {
      try {
        const response = await fetch("/api/visualization-sessions", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load visualization sessions.");
        const payload = await response.json() as VisualizationSessionsResponse;
        const nextExploredIds = new Set(
          (payload.sessions ?? [])
            .filter((session) => (session.explored === true || session.explored === 1) && typeof session.moduleId === "string")
            .map((session) => session.moduleId as string)
        );
        if (active) setExploredSessionIds(nextExploredIds);
      } catch {
        if (active) setExploredSessionIds(new Set());
      }
    }

    void loadExploredSessions();
    return () => {
      active = false;
    };
  }, [currentUser]);

  function displayGradeLabel(grade: GradeId) {
    return currentUser
      ? formatGradeLabelForCurriculum(grade, language, currentUser.curriculumTrack, true)
      : formatGradeLabel(grade, language, true);
  }

  function displayGradeGroupTitle(grade: GradeId, name: GradeLabGroupDefinition["name"]) {
    return isChineseLanguage(language) ? displayGradeLabel(grade) : text(name);
  }

  function displayLabGradeLabel(lab: FeaturedLabDefinition) {
    return currentCurriculumLabel
      ? `${displayGradeLabel(lab.grade)} ${currentCurriculumLabel}`
      : text(lab.gradeLabel);
  }

  function replaceVisualizationUrl({
    grade,
    history = "replace",
    lab,
    mode,
    track
  }: {
    grade?: GradeId | null;
    history?: "push" | "replace";
    lab?: string | null;
    mode: PanelMode;
    track?: VisualizationTrackFilter;
  }) {
    if (typeof window === "undefined") return;

    if (mode === "lab" && lab) {
      const targetLab = getVisualizationLabByLabId(lab);
      if (targetLab) {
        const nextPath = buildVisualizationLabHref(targetLab, track ?? effectiveTrackFilter);
        if (`${window.location.pathname}${window.location.search}` === nextPath) return;
        window.history[history === "push" ? "pushState" : "replaceState"](null, "", nextPath);
        return;
      }
    }

    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (!currentUser) params.set("track", track ?? effectiveTrackFilter);
    if (mode === "lab" && lab) params.set("lab", lab);

    const query = params.toString();
    const nextPath = `${visualizationLabPath}${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` === nextPath) return;
    window.history[history === "push" ? "pushState" : "replaceState"](null, "", nextPath);
  }

  function buildControlPanelHref({
    grade,
    track
  }: {
    grade?: GradeId | null;
    track?: VisualizationTrackFilter;
  }) {
    const params = new URLSearchParams();
    if (grade) params.set("grade", grade);
    if (!currentUser) params.set("track", track ?? effectiveTrackFilter);
    const query = params.toString();
    return `${visualizationLabPath}${query ? `?${query}` : ""}`;
  }

  function focusPanel() {
    window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, 40);
  }

  function recordVisualizationWorkflowEvent(lab: FeaturedLabDefinition | null, topicFallback = "visualization-lab") {
    recordLearningEvent({
      type: "visualization-probe",
      source: lab?.analyticsSource ?? "visualization-lab",
      topicId: lab?.topicId ?? topicFallback
    });
  }

  function selectDirectoryGrade(group: GradeLabGroupDefinition) {
    const nextLab = group.labs.find((lab) => lab.labId === activeLabId) ?? group.labs[0] ?? null;
    setPanelMode("control");
    setActiveDirectoryGrade(group.grade);
    setActiveLabId(nextLab?.labId ?? null);
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: group.grade,
      lab: null,
      mode: "control",
      track: effectiveTrackFilter
    });
  }

  function selectDirectoryLab(lab: FeaturedLabDefinition) {
    recordVisualizationWorkflowEvent(lab);
    setPanelMode("lab");
    setActiveDirectoryGrade(lab.grade);
    setActiveLabId(lab.labId);
    setDirectLinkStatus("ok");
    setRequestedLabId(lab.labId);
    replaceVisualizationUrl({
      grade: lab.grade,
      history: "push",
      lab: lab.labId,
      mode: "lab",
      track: effectiveTrackFilter
    });
    focusPanel();
  }

  function returnToControlPanel() {
    setPanelMode("control");
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
      history: "push",
      lab: null,
      mode: "control",
      track: effectiveTrackFilter
    });
    focusPanel();
  }

  async function copyActiveLabLink() {
    if (!isHydrated || !activeDirectoryLab || !activeDirectoryLabHref || typeof window === "undefined") return;
    if (!activeLabCanDistribute) {
      setShareState("blocked");
      return;
    }

    const absoluteHref = new URL(activeDirectoryLabHref, window.location.origin).toString();
    recordVisualizationWorkflowEvent(activeDirectoryLab);

    try {
      setShareState(await writeTextToClipboard(absoluteHref) ? "copied" : "error");
    } catch {
      setShareState("error");
    }
  }

  async function copyActiveLabSnapshot() {
    if (!isHydrated || !activeDirectoryLab || !activeDirectoryLabHref || typeof window === "undefined") return;
    if (!activeLabCanDistribute) {
      setSnapshotState("blocked");
      return;
    }

    recordVisualizationWorkflowEvent(activeDirectoryLab);

    const labSection = document.getElementById(`lab-example-${activeDirectoryLab.labId}`);
    const visibleElements = (selector: string) => Array.from(labSection?.querySelectorAll(selector) ?? []).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || "1") > 0.01;
    });
    const textAndAttributes = labSection
      ? `${labSection.textContent ?? ""} ${Array.from(labSection.querySelectorAll("*"))
        .flatMap((element) => Array.from(element.attributes).map((attribute) => attribute.value))
        .join(" ")}`
      : "";
    const firstSurface = visibleElements("[data-viz-surface]")[0] ?? null;
    const firstSurfaceRect = firstSurface?.getBoundingClientRect();
    const visibleMarks = visibleElements("[data-viz-mark]");
    const visibleControls = visibleElements("button, a, input, select, textarea, [role='button'], [role='link'], [role='switch'], [role='checkbox']");
    const visibleRangeControls = visibleControls.filter((element): element is HTMLInputElement => element instanceof HTMLInputElement && element.type === "range");
    const markSamples = visibleMarks.slice(0, 12).map((element, index) => {
      const rect = element.getBoundingClientRect();
      return {
        index,
        tagName: element.tagName.toLowerCase(),
        name: element.getAttribute("data-viz-name") ?? null,
        bounds: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        attributes: buildVisualizationSnapshotMarkSample(
          Array.from(element.attributes).map((attribute) => ({
            name: attribute.name,
            value: attribute.value
          }))
        )
      };
    });
    const normalizeControlHref = (rawHref: string | null) => {
      if (!rawHref) return null;
      try {
        return new URL(rawHref, window.location.origin).toString();
      } catch {
        return compactSnapshotText(rawHref, 160);
      }
    };
    const controlSamples = visibleControls.slice(0, snapshotControlSampleLimit).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const inputElement = element instanceof HTMLInputElement ? element : null;
      const selectElement = element instanceof HTMLSelectElement ? element : null;
      const textAreaElement = element instanceof HTMLTextAreaElement ? element : null;
      const buttonElement = element instanceof HTMLButtonElement ? element : null;
      const anchorElement = element instanceof HTMLAnchorElement ? element : null;
      const formElement = inputElement ?? selectElement ?? textAreaElement;

      return {
        index,
        tagName: element.tagName.toLowerCase(),
        role: element.getAttribute("role") ?? (anchorElement ? "link" : buttonElement ? "button" : inputElement ? "input" : selectElement ? "select" : textAreaElement ? "textarea" : null),
        type: inputElement?.type ?? buttonElement?.type ?? null,
        label: getSnapshotControlLabel(element),
        value: formElement ? compactSnapshotText(formElement.value, 96) : null,
        checked: inputElement && (inputElement.type === "checkbox" || inputElement.type === "radio") ? inputElement.checked : null,
        disabled: formElement?.disabled ?? buttonElement?.disabled ?? (element.getAttribute("aria-disabled") === "true" ? true : null),
        ariaPressed: element.getAttribute("aria-pressed"),
        min: inputElement?.getAttribute("min") ?? null,
        max: inputElement?.getAttribute("max") ?? null,
        step: inputElement?.getAttribute("step") ?? null,
        href: normalizeControlHref(anchorElement?.getAttribute("href") ?? null),
        bounds: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        attributes: buildVisualizationSnapshotMarkSample(
          Array.from(element.attributes).map((attribute) => ({
            name: attribute.name,
            value: attribute.value
          })),
          { attributeLimit: 12, valueLimit: 96 }
        )
      };
    });
    const rangeValues = visibleRangeControls.map((element, index) => ({
      index,
      label: getSnapshotControlLabel(element),
      value: compactSnapshotText(element.value, 96),
      min: element.getAttribute("min"),
      max: element.getAttribute("max"),
      step: element.getAttribute("step")
    }));
    const invalidSentinelMatches = textAndAttributes.match(/\b(?:NaN|Infinity|undefined|null)\b/g) ?? [];
    const absoluteHref = new URL(activeDirectoryLabHref, window.location.origin).toString();
    const domHealth = {
      surfaceCount: labSection?.querySelectorAll("[data-viz-surface]").length ?? 0,
      visibleSurfaceCount: visibleElements("[data-viz-surface]").length,
      markCount: labSection?.querySelectorAll("[data-viz-mark]").length ?? 0,
      visibleMarkCount: visibleMarks.length,
      rangeCount: labSection?.querySelectorAll("input[type='range']").length ?? 0,
      buttonCount: labSection?.querySelectorAll("button").length ?? 0,
      invalidSentinelCount: invalidSentinelMatches.length,
      firstSurface: firstSurfaceRect
        ? {
          width: Math.round(firstSurfaceRect.width),
          height: Math.round(firstSurfaceRect.height)
        }
        : null,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
    };
    const controlProbe = {
      controlSampleLimit: snapshotControlSampleLimit,
      sampledControlCount: controlSamples.length,
      totalVisibleControlCount: visibleControls.length,
      totalVisibleRangeControlCount: visibleRangeControls.length,
      controls: controlSamples,
      rangeValues
    };
    const semanticProbe = {
      markSampleLimit: 12,
      sampledMarkCount: markSamples.length,
      totalVisibleMarkCount: visibleMarks.length,
      marks: markSamples
    };
    const diagnosticIssues = [
      ...(labSection ? [] : ["lab-section-missing"]),
      ...(domHealth.visibleSurfaceCount < 1 ? ["no-visible-viz-surface"] : []),
      ...(domHealth.visibleMarkCount < 1 ? ["no-visible-viz-mark"] : []),
      ...(domHealth.invalidSentinelCount > 0 ? ["invalid-sentinel-visible"] : []),
      ...(domHealth.horizontalOverflow > 8 ? ["horizontal-overflow"] : []),
      ...(domHealth.firstSurface && (domHealth.firstSurface.width < 120 || domHealth.firstSurface.height < 80) ? ["first-surface-too-small"] : []),
      ...(controlProbe.sampledControlCount < 1 ? ["no-visible-controls"] : []),
      ...rangeValues.flatMap(buildSnapshotRangeIssue)
    ];

    const snapshot = {
      kind: "mais.visualization.labSnapshot",
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      url: window.location.href,
      lab: {
        labId: activeDirectoryLab.labId,
        topicId: activeDirectoryLab.topicId,
        grade: activeDirectoryLab.grade,
        curriculumTrack: activeDirectoryLab.curriculumTrack,
        moduleId: activeDirectoryLab.moduleId,
        templateId: activeDirectoryLab.templateId,
        qaProfile: activeDirectoryLab.qaProfile,
        analyticsSource: activeDirectoryLab.analyticsSource,
        directHref: absoluteHref,
        practiceHref: new URL(activePracticeHref, window.location.origin).toString()
      },
      ui: {
        language,
        panelMode,
        directLinkStatus,
        saveState: labSection?.querySelector("[data-viz-card]")?.getAttribute("data-viz-save-state") ?? null
      },
      domHealth,
      controlProbe,
      semanticProbe,
      diagnosticVerdict: {
        status: diagnosticIssues.length ? "attention-required" : "pass",
        issueCount: diagnosticIssues.length,
        issues: diagnosticIssues,
        thresholds: {
          horizontalOverflowPx: 8,
          minimumFirstSurfaceWidth: 120,
          minimumFirstSurfaceHeight: 80
        }
      }
    };

    try {
      setSnapshotState(await writeTextToClipboard(JSON.stringify(snapshot, null, 2)) ? "copied" : "error");
    } catch {
      setSnapshotState("error");
    }
  }

  function handleTrackFilterChange(option: VisualizationTrackFilter) {
    const nextGroups = filterGradeLabGroups(curriculumScopedGroups, option);
    const nextGroup =
      nextGroups.find((group) => group.grade === activeDirectoryGrade) ??
      nextGroups.find((group) => group.grade === activeGroup.grade) ??
      nextGroups[0] ??
      null;
    const nextLab = nextGroup?.labs.find((lab) => lab.labId === activeLabId) ?? nextGroup?.labs[0] ?? null;

    setTrackFilter(option);
    setPanelMode("control");
    setActiveDirectoryGrade(nextGroup?.grade ?? activeGroup.grade);
    setActiveLabId(nextLab?.labId ?? null);
    setDirectLinkStatus("idle");
    setRequestedLabId(null);
    replaceVisualizationUrl({
      grade: nextGroup?.grade ?? activeGroup.grade,
      lab: null,
      mode: "control",
      track: option
    });
  }

  function trackLabel(option: VisualizationTrackFilter) {
    if (option === "all") return t({ en: "All", zh: "全部", zhHans: "全部" });
    return text(visualizationTrackLabels[option]);
  }

  const introText = t({
    en: "Choose a grade, open one lab, and finish an observation mission.",
    zh: "選擇年級，打開一個實驗，完成觀察任務。",
    zhHans: "选择年级，打开一个实验，完成观察任务。"
  });
  const controlTitle = t({ en: "Control Panel", zh: "控制面板", zhHans: "控制面板" });
  const labEntryTitle = isChineseLanguage(language)
    ? simplifyChineseText(`${activeGradeLabel}實驗入口`, language)
    : `${activeGradeLabel} lab entrances`;
  const emptyStateText = currentUser
    ? t({ en: "No labs match this account curriculum and grade yet.", zh: "此帳號課程與年級暫時沒有相符實驗。", zhHans: "此账号课程与年级暂时没有相符实验。" })
    : t({ en: "No labs match this grade and track filter yet.", zh: "此年級與路線篩選暫時沒有相符實驗。", zhHans: "此年级与路线筛选暂时没有相符实验。" });
  const directLinkWarningText = directLinkStatus === "missing"
    ? t({ en: "This lab link does not match any current Visualization Lab.", zh: "此實驗連結不符合目前任何可視化實驗。", zhHans: "此实验链接不匹配当前任何可视化实验。" })
    : directLinkStatus === "unavailable"
      ? t({ en: "This lab exists, but it is not available under the current curriculum or filter.", zh: "此實驗存在，但不屬於目前課程或篩選條件。", zhHans: "此实验存在，但不属于当前课程或筛选条件。" })
      : null;

  return (
    <div className="min-h-full overflow-hidden bg-transparent text-slate-950">
      <div className="relative mx-auto w-full max-w-[1500px] px-4 py-6 sm:py-8">
        {panelMode === "control" ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(22rem,0.78fr)_minmax(0,1.7fr)]" aria-labelledby="visualization-lab-title">
            <div className="relative rounded-[1.35rem] bg-white p-8 shadow-2xl shadow-cyan-800/15 sm:p-10">
              <div className="absolute -right-4 -top-5 grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-yellow-300 text-3xl font-black text-orange-500 shadow-xl shadow-cyan-800/15">
                ★
              </div>
              <h1 id="visualization-lab-title" className="max-w-md text-5xl font-black leading-[0.98] tracking-tight text-[#15245a] sm:text-6xl">
                {t({ en: "Visualization Lab", zh: "可視化實驗室", zhHans: "可视化实验室" })}
              </h1>
              <p className="mt-5 text-3xl font-black text-emerald-600">Lab Quest</p>
              <p className="mt-4 max-w-md text-lg font-bold leading-8 text-slate-700">
                {introText}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 sm:flex-nowrap">
                <a
                  href={recommendedLabHref}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                    if (!recommendedLab) return;
                    event.preventDefault();
                    if (recommendedLab) selectDirectoryLab(recommendedLab);
                  }}
                  data-viz-start-quest-link
                  data-viz-recommended-lab-id={recommendedLab?.labId ?? ""}
                  className="focus-ring inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl bg-red-500 px-5 text-base font-black text-white shadow-xl shadow-red-500/25 transition hover:-translate-y-0.5 hover:bg-red-400 active:translate-y-0"
                >
                  {t({ en: "Start Quest", zh: "開始探索", zhHans: "开始探索" })}
                </a>
                <button
                  type="button"
                  onClick={focusPanel}
                  className="focus-ring inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-xl border-2 border-blue-600 bg-white px-5 text-base font-black text-blue-700 shadow-lg shadow-blue-600/10 transition hover:-translate-y-0.5 hover:bg-blue-50 active:translate-y-0"
                >
                  {t({ en: "Choose Topic", zh: "選擇主題", zhHans: "选择主题" })}
                </button>
              </div>
            </div>

            <LabQuestMap
              href={recommendedLabHref}
              language={language}
              onNodeClick={() => {
                if (recommendedLab) selectDirectoryLab(recommendedLab);
              }}
              recommendedLabId={recommendedLab?.labId ?? ""}
            />
          </section>
        ) : null}

        <section
          ref={panelRef}
          aria-label={t({ en: "Visualization Lab workspace", zh: "可視化實驗室工作區", zhHans: "可视化实验室工作区" })}
          className={cn("scroll-mt-24", panelMode === "control" ? "mt-7" : "mt-2")}
          data-viz-panel-mode={panelMode}
          data-viz-active-grade={activeDirectoryGroup?.grade ?? ""}
          data-viz-active-lab-id={activeDirectoryLab?.labId ?? ""}
          data-viz-direct-lab-href={activeDirectoryLabHref ?? ""}
          data-viz-link-status={directLinkStatus}
          data-viz-requested-lab-id={requestedLabId ?? ""}
        >
          {panelMode === "control" ? (
            <section className="rounded-[1.35rem] bg-white/95 p-6 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 sm:p-8">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <h2 className="text-4xl font-black tracking-tight text-[#15245a]">{controlTitle}</h2>
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
                    {t({ en: "Current grade", zh: "當前年級", zhHans: "当前年级" })} <span className="ml-2 text-emerald-600">{activeGradeLabel}</span>
                  </span>
                  {currentCurriculumLabel ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                      {currentCurriculumLabel}
                    </span>
                  ) : null}
                </div>
                {!currentUser ? (
                  <div className="flex flex-wrap gap-2" aria-label={t({ en: "Filter by curriculum track", zh: "按課程路線篩選", zhHans: "按课程路线筛选" })}>
                    {trackFilterOptions.map((option) => (
                      <a
                        key={option}
                        href={buildControlPanelHref({
                          grade: activeDirectoryGroup?.grade ?? activeGroup.grade,
                          track: option
                        })}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                          event.preventDefault();
                          handleTrackFilterChange(option);
                        }}
                        aria-pressed={trackFilter === option}
                        role="button"
                        data-viz-track-filter-button
                        data-viz-track-filter-active={String(trackFilter === option)}
                        data-viz-track-filter-value={option}
                        className={cn(
                          "focus-ring rounded-full border px-4 py-2 text-xs font-black transition hover:-translate-y-0.5",
                          trackFilter === option
                            ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-cyan-50"
                        )}
                      >
                        {trackLabel(option)}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              {directLinkWarningText ? (
                <div
                  className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900 shadow-sm"
                  data-viz-link-warning
                  data-viz-link-warning-requested-lab-id={requestedLabId ?? ""}
                  data-viz-link-warning-status={directLinkStatus}
                  role="status"
                >
                  <span>{directLinkWarningText}</span>
                  {requestedLabId ? (
                    <code className="ml-2 rounded-md bg-white/80 px-2 py-1 text-xs font-black text-amber-950">
                      {requestedLabId}
                    </code>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-7 flex flex-wrap items-center gap-3" aria-label={t({ en: "Select grade", zh: "選擇年級", zhHans: "选择年级" })}>
                <span className="mr-2 text-sm font-black text-[#15245a]">{t({ en: "Select Grade", zh: "選擇年級", zhHans: "选择年级" })}</span>
                {gradeIds.map((grade) => {
                  const group = directoryGroups.find((item) => item.grade === grade);
                  return (
                    <GradeChip
                      key={grade}
                      active={activeDirectoryGroup?.grade === grade}
                      grade={grade}
                      hasLabs={Boolean(group)}
                      href={buildControlPanelHref({
                        grade,
                        track: effectiveTrackFilter
                      })}
                      label={grade}
                      onClick={() => {
                        if (group) selectDirectoryGrade(group);
                      }}
                    />
                  );
                })}
              </div>

              <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-2xl font-black text-[#15245a]">{labEntryTitle}</h3>
                    <span className="text-sm font-black text-blue-700">{visibleLabs.length} {t(dictionary.common.labs)}</span>
                  </div>
                  {visibleLabs.length > 0 ? (
                    <div className="mt-5 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                      {visibleLabs.map((lab, index) => (
                        <LabTile
                          key={lab.labId}
                          active={activeDirectoryLab?.labId === lab.labId}
                          index={index}
                          lab={lab}
                          href={buildVisualizationLabHref(lab, effectiveTrackFilter)}
                          onOpen={() => selectDirectoryLab(lab)}
                          title={compactTitle(text(lab.title))}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-600">
                      {emptyStateText}
                    </div>
                  )}
                </div>

                <aside className="self-start rounded-2xl border border-blue-300 bg-white p-5 shadow-lg shadow-blue-600/10">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow-300 text-xl font-black text-orange-500">★</span>
                    <h3 className="text-xl font-black text-[#15245a]">{t({ en: "Recommended Next", zh: "推薦下一個", zhHans: "推荐下一个" })}</h3>
                  </div>
                  {recommendedLab ? (
                    <>
                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="break-words text-2xl font-black leading-tight text-[#15245a] [overflow-wrap:anywhere]">{compactTitle(text(recommendedLab.title))}</h4>
                          <p className="mt-3 line-clamp-4 text-sm font-semibold leading-6 text-slate-600">
                            {text(recommendedLab.description)}
                          </p>
                        </div>
                        <div className="grid h-20 w-24 shrink-0 place-items-center rounded-2xl bg-sky-100 text-4xl font-black text-blue-600">
                          v
                        </div>
                      </div>
                      <div className="mt-4">
                        <Stars count={3} muted={2} />
                      </div>
                      <a
                        href={buildVisualizationLabHref(recommendedLab, effectiveTrackFilter)}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                          event.preventDefault();
                          selectDirectoryLab(recommendedLab);
                        }}
                        data-viz-recommended-lab-link
                        data-viz-recommended-lab-id={recommendedLab.labId}
                        className="focus-ring mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-4 text-base font-black text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500"
                      >
                        {t({ en: "Enter Lab", zh: "進入實驗", zhHans: "进入实验" })}
                      </a>
                    </>
                  ) : null}
                </aside>

              </div>
            </section>
          ) : activeDirectoryLab && ActiveDirectoryLabComponent && activeDirectorySessionModuleId ? (
            <section
              id={`lab-example-${activeDirectoryLab.labId}`}
              data-lab-id={activeDirectoryLab.labId}
              data-viz-current-grade={activeDirectoryLab.grade}
              data-viz-current-track={activeDirectoryLab.curriculumTrack}
              data-viz-direct-lab-href={activeDirectoryLabHref ?? ""}
              data-viz-copy-controls-ready={String(isHydrated)}
              className="rounded-[1.35rem] bg-white/95 p-4 shadow-2xl shadow-cyan-900/15 ring-1 ring-cyan-100 sm:p-7"
            >
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={activeDirectoryControlPanelHref}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                      event.preventDefault();
                      returnToControlPanel();
                    }}
                    data-viz-back-to-control-panel-link
                    data-viz-back-to-control-panel-grade={activeDirectoryLab.grade}
                    data-viz-back-to-control-panel-track={effectiveTrackFilter}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                  >
                    ← {t({ en: "Back to Control Panel", zh: "返回控制面板", zhHans: "返回控制面板" })}
                  </a>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                    {displayLabGradeLabel(activeDirectoryLab)}
                  </span>
                  <button
                    type="button"
                    onClick={copyActiveLabLink}
                    disabled={!isHydrated || !activeLabCanDistribute}
                    aria-disabled={!isHydrated || !activeLabCanDistribute}
                    data-viz-copy-lab-link
                    data-viz-copy-lab-link-state={shareState}
                    data-viz-copy-lab-link-safeguard-status={activeLabSafeguardStatus}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!activeLabCanDistribute || shareState === "blocked"
                      ? t({ en: "Approval required", zh: "需要批准", zhHans: "需要批准" })
                      : shareState === "copied"
                      ? t({ en: "Link copied", zh: "連結已複製", zhHans: "链接已复制" })
                      : t({ en: "Copy lab link", zh: "複製實驗連結", zhHans: "复制实验链接" })}
                  </button>
                  <button
                    type="button"
                    onClick={copyActiveLabSnapshot}
                    disabled={!isHydrated || !activeLabCanDistribute}
                    aria-disabled={!isHydrated || !activeLabCanDistribute}
                    data-viz-copy-lab-snapshot
                    data-viz-snapshot-state={snapshotState}
                    data-viz-snapshot-safeguard-status={activeLabSafeguardStatus}
                    className="focus-ring inline-flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!activeLabCanDistribute || snapshotState === "blocked"
                      ? t({ en: "Approval required", zh: "需要批准", zhHans: "需要批准" })
                      : snapshotState === "copied"
                      ? t({ en: "Snapshot copied", zh: "快照已複製", zhHans: "快照已复制" })
                      : t({ en: "Copy snapshot", zh: "複製快照", zhHans: "复制快照" })}
                  </button>
                  {shareState === "error" ? (
                    <span className="text-xs font-bold text-rose-600" role="status">
                      {t({ en: "Use the address bar link.", zh: "請使用網址列連結。", zhHans: "请使用地址栏链接。" })}
                    </span>
                  ) : null}
                  {snapshotState === "error" ? (
                    <span className="text-xs font-bold text-rose-600" role="status">
                      {t({ en: "Snapshot unavailable.", zh: "未能複製快照。", zhHans: "未能复制快照。" })}
                    </span>
                  ) : null}
                  {shareState === "blocked" || snapshotState === "blocked" || (!activeLabCanDistribute && activeDirectoryLab.safeguard) ? (
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300" role="status">
                      {t({
                        en: "Safeguard review is recorded, but teacher approval is required before external sharing.",
                        zh: "已記錄 Safeguard 審查，但外部分發前需要教師批准。",
                        zhHans: "已记录 Safeguard 审查，但外部分发前需要教师批准。"
                      })}
                    </span>
                  ) : null}
                </div>
                <a
                  href={activePracticeHref}
                  data-viz-start-practice-link
                  onClick={() => { if (activeDirectoryLab) recordVisualizationWorkflowEvent(activeDirectoryLab); }}
                  className="focus-ring inline-flex items-center justify-center rounded-lg bg-red-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:bg-red-400"
                >
                  {t({ en: "Start Practice", zh: "開始練習", zhHans: "开始练习" })}
                </a>
              </div>

              <div className="min-w-0">
                <VisualizationCard
                  title={text(activeDirectoryLab.title)}
                  description={text(activeDirectoryLab.description)}
                  analyticsSource={activeDirectoryLab.analyticsSource}
                  explorationScopeKey={currentUser?.id ?? "guest"}
                  formula={
                    activeDirectoryLab.moduleId === "configured-visualization-lab" || !activeDirectoryLab.templateConfig.formula
                      ? undefined
                      : text(activeDirectoryLab.templateConfig.formula)
                  }
                  initialExplored={exploredSessionIds.has(activeDirectorySessionModuleId)}
                  moduleId={activeDirectorySessionModuleId}
                  onExplored={(exploredModuleId) => {
                    setExploredSessionIds((current) => {
                      if (current.has(exploredModuleId)) return current;
                      const next = new Set(current);
                      next.add(exploredModuleId);
                      return next;
                    });
                  }}
                  topicId={activeDirectoryLab.topicId}
                >
                  <ActiveDirectoryLabComponent topicId={activeDirectoryLab.topicId} labId={activeDirectoryLab.labId} />
                </VisualizationCard>
              </div>
            </section>
          ) : (
            <section className="rounded-[1.35rem] bg-white/95 p-8 shadow-2xl shadow-cyan-900/15">
              <p className="text-sm font-bold text-slate-600">{emptyStateText}</p>
              <a
                href={activeDirectoryControlPanelHref}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  returnToControlPanel();
                }}
                data-viz-back-to-control-panel-link
                data-viz-back-to-control-panel-grade={activeDirectoryGroup?.grade ?? activeGroup.grade}
                data-viz-back-to-control-panel-track={effectiveTrackFilter}
                className="focus-ring mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
              >
                {t({ en: "Back to Control Panel", zh: "返回控制面板", zhHans: "返回控制面板" })}
              </a>
            </section>
          )}
        </section>

      </div>
    </div>
  );
}
