"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LessonGalaxyDirectory, type LessonGalaxyItem } from "@/components/lesson/LessonGalaxyDirectory";
import { californiaCourseTitleForGrade, cleanLessonUnitTitle } from "@/components/lesson/lessonContentText";
import { lessonMenuHideButtonId, lessonMenuPanelId } from "@/components/lesson/worlds/lessonMenuVisibility";
import { lessonWorldThemeForCourse, type LessonWorldTheme } from "@/components/lesson/worlds/worldThemes";
import { MathText } from "@/components/math/MathText";
import { useSettings } from "@/components/providers/AppProviders";
import { ccssLessonMetasForTopic } from "@/data/ccssLessonAssignments";
import { formatGradeLabel } from "@/lib/i18n";
import { lessonHrefForSlug } from "@/lib/lessonLinks";
import type { LessonDetail, LessonSummary, LocalizedText } from "@/types";

/**
 * MAIS Learning Worlds menu (engine). The unit directory rendered as the
 * band's world map: units are stops along a winding path, the current unit
 * shows its lesson parts as quick-jump stones, and the path fills in behind
 * the student as units complete. Every visual token comes from the band's
 * `LessonWorldTheme`, so a new world is a config, not a rewrite.
 *
 * Bands without a shipped theme — and students who prefer the list — get
 * `LessonGalaxyDirectory`, the semantic and functional fallback ("List view"
 * is always one tap away; the preference persists). On small screens the
 * world collapses to a horizontal stop ribbon with an inline "Open map"
 * expansion.
 */

type WorldMenuProps = {
  currentSlug: string;
  items: LessonGalaxyItem[];
  lesson: LessonDetail;
  modules: LessonSummary[];
  /** Collapses the menu to its rail. Lives in the header, so both views get it. */
  onHide?: () => void;
  onSelectLessonItem: (targetId: string) => void;
};

const worldViewStorageKey = "mais.lesson-world-view";

function stopEmojiForTopic(topicId: string, theme: LessonWorldTheme) {
  return ccssLessonMetasForTopic(topicId)[0]?.emoji ?? theme.fallbackStopEmoji;
}

/** A gently winding connector between two stops; solid when already travelled. */
function StopConnector({ done, flip, theme }: { done: boolean; flip: boolean; theme: LessonWorldTheme }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 44" className="mx-auto -my-1 h-11 w-28" fill="none">
      <path
        d={flip ? "M90 2 C 90 26, 30 18, 30 42" : "M30 2 C 30 26, 90 18, 90 42"}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={done ? undefined : "0.5 12"}
        className={done ? theme.pathDoneClassName : theme.pathClassName}
      />
    </svg>
  );
}

export function WorldMenu({ currentSlug, items, lesson, modules, onHide, onSelectLessonItem }: WorldMenuProps) {
  const { currentUser, language, t, text } = useSettings();
  const [viewMode, setViewMode] = useState<"world" | "list">("world");
  const [isMobileMapOpen, setIsMobileMapOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(worldViewStorageKey);
      if (stored === "list" || stored === "world") setViewMode(stored);
    } catch {
      // Storage unavailable (private mode) — keep the default.
    }
  }, []);

  function persistViewMode(mode: "world" | "list") {
    setViewMode(mode);
    try {
      window.localStorage.setItem(worldViewStorageKey, mode);
    } catch {
      // Ignore storage failures.
    }
  }

  const theme = lessonWorldThemeForCourse(lesson);

  const hideButton = onHide ? <HideMenuButton onClick={onHide} t={t} theme={theme} /> : null;

  if (!theme || viewMode === "list") {
    return (
      <div>
        {theme || hideButton ? (
          <div className="mb-3 flex items-center justify-end gap-2">
            {theme ? (
              <WorldViewToggle
                label={t({ en: "Map view", zh: "地圖檢視", zhHans: "地图视图" })}
                onClick={() => persistViewMode("world")}
                theme={theme}
              />
            ) : null}
            {hideButton}
          </div>
        ) : null}
        <LessonGalaxyDirectory
          currentSlug={currentSlug}
          items={items}
          lesson={lesson}
          modules={modules}
          onSelectLessonItem={onSelectLessonItem}
        />
      </div>
    );
  }

  const visibleModules = modules.length ? modules : [lesson];
  const activeIndex = Math.max(
    0,
    visibleModules.findIndex((module) => module.slug === currentSlug || module.slug === lesson.slug)
  );
  const completedCount = visibleModules.filter((module) => module.status === "completed").length;
  // "Next stop": the first unfinished unit that isn't the one being read now.
  const nextIndex = visibleModules.findIndex(
    (module, index) => index !== activeIndex && module.status !== "completed"
  );
  const nextModule = nextIndex >= 0 ? visibleModules[nextIndex] : null;
  const gradeLabel = formatGradeLabel(lesson.grade, language, true);
  const courseTitle = californiaCourseTitleForGrade(lesson.grade);
  const stopNoun = t(theme.stopNoun);
  const firstName = currentUser?.username?.split(" ").pop() ?? "";
  const greeting = nextModule
    ? t({
        en: `${firstName ? `${firstName}, the` : "The"} ${cleanLessonUnitTitle(text(nextModule.title))} ${stopNoun} is just ahead →`,
        zh: `${firstName ? `${firstName}，` : ""}下一站：${cleanLessonUnitTitle(text(nextModule.title))}`,
        zhHans: `${firstName ? `${firstName}，` : ""}下一站：${cleanLessonUnitTitle(text(nextModule.title))}`
      })
    : t({
        en: `${firstName ? `${firstName}, you` : "You"} have travelled the whole ${t(theme.name)}! 🎉`,
        zh: `${firstName ? `${firstName}，` : ""}你已走遍整個${t(theme.name)}！🎉`,
        zhHans: `${firstName ? `${firstName}，` : ""}你已走遍整个${t(theme.name)}！🎉`
      });

  function stopStateClassName(index: number, module: LessonSummary) {
    if (module.status === "completed") return theme!.stopCompletedClassName;
    if (index === activeIndex) return theme!.stopCurrentClassName;
    if (index === nextIndex) return theme!.stopNextClassName;
    return theme!.stopFutureClassName;
  }

  const renderStopCircle = (module: LessonSummary, index: number, size: "ribbon" | "map") => {
    const isCurrent = index === activeIndex;
    const isCompleted = module.status === "completed";
    const moduleTitle = cleanLessonUnitTitle(text(module.title));
    const sizeClassName = size === "ribbon" ? "h-12 w-12 border-[3px] text-2xl" : "h-16 w-16 border-4 text-3xl";
    return (
      <Link
        href={lessonHrefForSlug(module.slug)}
        aria-current={isCurrent ? "page" : undefined}
        aria-label={t({
          en: `Unit ${index + 1} ${stopNoun}: ${moduleTitle}${isCompleted ? " (completed)" : isCurrent ? " (you are here)" : index === nextIndex ? " (next stop)" : ""}`,
          zh: `第 ${index + 1} 單元${stopNoun}：${moduleTitle}`,
          zhHans: `第 ${index + 1} 单元${stopNoun}：${moduleTitle}`
        })}
        className={`focus-ring relative grid shrink-0 place-items-center rounded-full shadow-lg transition hover:-translate-y-1 ${sizeClassName} ${stopStateClassName(index, module)}`}
      >
        <span aria-hidden="true">{stopEmojiForTopic(module.topicId, theme!)}</span>
        {isCompleted ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-300 text-sm shadow"
          >
            ⭐
          </span>
        ) : null}
      </Link>
    );
  };

  const fullMap = (
    <ol className="p-4 sm:p-5">
      {visibleModules.map((module, index) => {
        const isCurrent = index === activeIndex;
        const flip = index % 2 === 1;
        const moduleTitle = cleanLessonUnitTitle(text(module.title));
        // The path behind the student is solid: a segment reads "travelled"
        // once the unit before it is completed.
        const segmentDone = index > 0 && visibleModules[index - 1].status === "completed";

        return (
          <li key={module.slug} className="min-w-0">
            {index > 0 ? <StopConnector done={segmentDone} flip={flip} theme={theme} /> : null}
            <div className={`flex min-w-0 items-center gap-4 ${flip ? "flex-row-reverse text-right" : ""}`}>
              {renderStopCircle(module, index, "map")}
              <div className="min-w-0 flex-1">
                <span className={`block text-xs font-black uppercase tracking-[0.14em] ${theme.accentTextClassName}`}>
                  {t({ en: `Unit ${index + 1}`, zh: `Unit ${index + 1}`, zhHans: `Unit ${index + 1}` })}
                  {isCurrent ? (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black ${theme.hereChipClassName}`}>
                      {t({ en: "You are here", zh: "你在這裡", zhHans: "你在这里" })}
                    </span>
                  ) : index === nextIndex ? (
                    <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-black ${theme.chipClassName}`}>
                      {t({ en: "Next stop", zh: "下一站", zhHans: "下一站" })}
                    </span>
                  ) : null}
                </span>
                <MathText
                  as="span"
                  text={moduleTitle}
                  className={`mt-1 block truncate text-base font-black leading-snug ${theme.headingClassName}`}
                />
              </div>
            </div>

            {isCurrent && items.length ? (
              <div className={`mt-3 grid gap-1.5 ${flip ? "pr-20" : "pl-20"}`}>
                {items.slice(0, 8).map((item, itemIndex) =>
                  item.targetId ? (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectLessonItem(item.targetId)}
                      className={`focus-ring rounded-full border px-3 py-1.5 text-left text-xs font-black transition hover:-translate-y-0.5 ${theme.quickJumpClassName}`}
                    >
                      {`${index + 1}.${itemIndex + 1} ${item.title}`}
                    </button>
                  ) : null
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );

  return (
    <aside
      className={`min-w-0 overflow-hidden rounded-[2rem] border shadow-2xl ${theme.frameClassName} ${theme.sceneClassName} lg:rounded-l-none lg:border-l-0`}
      aria-label={t({ en: "Course world map", zh: "課程世界地圖", zhHans: "课程世界地图" })}
      data-lesson-world={theme.id}
    >
      <div className={`border-b p-5 ${theme.lineClassName} sm:p-6`}>
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${theme.chipClassName}`}>
            {`${gradeLabel} · ${t(theme.name)}`}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <WorldViewToggle
              label={t({ en: "List view", zh: "列表檢視", zhHans: "列表视图" })}
              onClick={() => persistViewMode("list")}
              theme={theme}
            />
            {hideButton}
          </div>
        </div>
        {courseTitle ? (
          <MathText
            as="h2"
            text={t(courseTitle)}
            className={`mt-4 text-2xl font-black leading-tight ${theme.headingClassName}`}
          />
        ) : null}
        <p className={`mt-2 text-sm font-bold leading-6 ${theme.softTextClassName}`}>{t(theme.tagline)}</p>
        <p className={`mt-2 text-xs font-black uppercase tracking-[0.16em] ${theme.accentTextClassName}`} data-world-progress>
          {t({
            en: `${completedCount} of ${visibleModules.length} ${stopNoun}s ${text(theme.progressVerb)}`,
            zh: `${text(theme.progressVerb)} ${completedCount} / ${visibleModules.length} 個${stopNoun}`,
            zhHans: `${text(theme.progressVerb)} ${completedCount} / ${visibleModules.length} 个${stopNoun}`
          })}
        </p>
        <p className={`mt-2 text-sm font-black ${theme.headingClassName}`} data-world-greeting>
          {greeting}
        </p>
      </div>

      {/* Mobile: horizontal stop ribbon + inline expandable map. */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 overflow-x-auto p-4" data-world-ribbon>
          {visibleModules.map((module, index) => (
            <div key={module.slug} className="flex shrink-0 items-center gap-3">
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={`block h-1 w-6 rounded-full ${
                    visibleModules[index - 1].status === "completed" ? "bg-current opacity-70" : "bg-current opacity-25"
                  } ${theme.accentTextClassName}`}
                />
              ) : null}
              {renderStopCircle(module, index, "ribbon")}
            </div>
          ))}
        </div>
        <div className={`border-t px-4 pb-4 pt-3 ${theme.lineClassName}`}>
          <button
            type="button"
            aria-expanded={isMobileMapOpen}
            onClick={() => setIsMobileMapOpen((open) => !open)}
            className={`focus-ring w-full rounded-full border px-4 py-2 text-center text-xs font-black transition ${theme.chipClassName}`}
          >
            {isMobileMapOpen
              ? t({ en: "Close map", zh: "收起地圖", zhHans: "收起地图" })
              : t({ en: "Open the full map", zh: "展開完整地圖", zhHans: "展开完整地图" })}
          </button>
          {isMobileMapOpen ? fullMap : null}
        </div>
      </div>

      {/* Desktop: the full winding map. */}
      <div className="hidden lg:block">{fullMap}</div>
    </aside>
  );
}

const neutralToggleClassName =
  "border-slate-300/80 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/10";

/** Both header controls share one shape, and one child-sized tap target. */
const headerToggleClassName =
  "focus-ring inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-black transition hover:-translate-y-0.5";

function WorldViewToggle({
  label,
  onClick,
  theme
}: {
  label: string;
  onClick: () => void;
  theme: LessonWorldTheme | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${headerToggleClassName} ${theme?.chipClassName ?? neutralToggleClassName}`}
    >
      {label}
    </button>
  );
}

/**
 * "Hide" carries a word as well as a chevron: at G1 reading level an icon alone
 * is a guess, and this control removes the student's whole navigation.
 */
function HideMenuButton({
  onClick,
  t,
  theme
}: {
  onClick: () => void;
  t: (value: LocalizedText) => string;
  theme: LessonWorldTheme | null;
}) {
  return (
    <button
      id={lessonMenuHideButtonId}
      type="button"
      onClick={onClick}
      aria-expanded={true}
      aria-controls={lessonMenuPanelId}
      aria-label={t({ en: "Hide lesson menu", zh: "收起課程選單", zhHans: "收起课程菜单" })}
      className={`${headerToggleClassName} ${theme?.chipClassName ?? neutralToggleClassName}`}
    >
      <span aria-hidden="true">‹</span>
      {t({ en: "Hide", zh: "收起", zhHans: "收起" })}
    </button>
  );
}
