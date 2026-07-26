"use client";

import { lessonMenuPillButtonId, lessonMenuRailButtonId } from "@/components/lesson/worlds/lessonMenuVisibility";
import type { LessonWorldTheme } from "@/components/lesson/worlds/worldThemes";
import { useSettings } from "@/components/providers/AppProviders";

/**
 * The way back to a hidden lesson menu. Hiding navigation for children is only
 * safe if the door is still visible, so the menu never collapses to nothing:
 *
 *   - `LessonMenuRail` — the slim strip that keeps the menu's column on wide
 *     screens. It carries the world's own colours, so it reads as "the map,
 *     tucked in", not as a stray button.
 *   - `LessonMenuRevealPill` — below `lg` the menu stacks above the content and
 *     scrolls away entirely, so the way back has to follow the student: a
 *     floating pill, parked bottom-left away from the tutor and back-to-top
 *     buttons on the right.
 */

const neutralFrameClassName =
  "border-slate-200/90 bg-white/95 text-slate-700 dark:border-white/15 dark:bg-slate-900/90 dark:text-slate-100";

type RevealProps = {
  onShow: () => void;
  theme: LessonWorldTheme | null;
};

function revealLabels(t: ReturnType<typeof useSettings>["t"]) {
  return {
    short: t({ en: "Lessons", zh: "課程", zhHans: "课程" }),
    full: t({ en: "Show lesson menu", zh: "顯示課程選單", zhHans: "显示课程菜单" })
  };
}

export function LessonMenuRail({
  onDismissCoachMark,
  onShow,
  showCoachMark,
  theme
}: RevealProps & { onDismissCoachMark: () => void; showCoachMark: boolean }) {
  const { t } = useSettings();
  const labels = revealLabels(t);
  const surfaceClassName = theme
    ? `${theme.frameClassName} ${theme.sceneClassName} ${theme.headingClassName}`
    : neutralFrameClassName;

  return (
    // The rail sits above the lesson card so its coach mark can overhang it.
    // It carries the same tour anchor as the open menu: whichever of the two is
    // on screen is what the guided tour should point the learner at.
    <div data-tour="student-lesson-map" className="hidden lg:sticky lg:top-24 lg:z-30 lg:block lg:self-start">
      <div className="relative">
        <button
          id={lessonMenuRailButtonId}
          type="button"
          onClick={onShow}
          // No `aria-controls`: the panel is unmounted while collapsed, and a
          // dangling IDREF is worse than none. `aria-expanded` carries the state.
          aria-expanded={false}
          aria-label={labels.full}
          title={labels.full}
          className={`focus-ring flex h-64 w-12 flex-col items-center justify-between gap-3 rounded-r-[2rem] border border-l-0 py-5 shadow-xl transition duration-200 hover:translate-x-0.5 ${surfaceClassName}`}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            {theme?.fallbackStopEmoji ?? "📚"}
          </span>
          <span
            aria-hidden="true"
            className="text-[11px] font-black uppercase tracking-[0.22em] [writing-mode:vertical-rl]"
          >
            {labels.short}
          </span>
          <span aria-hidden="true" className="text-lg font-black leading-none">
            ›
          </span>
        </button>

        {showCoachMark ? (
          <div
            role="status"
            // Opaque on purpose: this callout overhangs the lesson card, and a
            // tinted-glass surface would leave the two texts overlapping.
            className={`absolute left-[calc(100%+0.85rem)] top-2 z-20 w-60 rounded-2xl border bg-white p-4 shadow-2xl dark:bg-slate-900 ${
              theme?.frameClassName ?? neutralFrameClassName
            }`}
          >
            <p className={`text-sm font-black leading-6 ${theme?.headingClassName ?? ""}`}>
              {t({
                en: "Your map tucked away to give you more room — tap here to open it.",
                zh: "地圖已收起，讓你有更多空間 —— 點這裡就能打開。",
                zhHans: "地图已收起，让你有更多空间 —— 点这里就能打开。"
              })}
            </p>
            <button
              type="button"
              onClick={onDismissCoachMark}
              className={`focus-ring mt-3 inline-flex min-h-11 items-center rounded-full border px-4 text-xs font-black transition hover:-translate-y-0.5 ${
                theme?.chipClassName ?? neutralFrameClassName
              }`}
            >
              {t({ en: "Got it", zh: "知道了", zhHans: "知道了" })}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LessonMenuRevealPill({ onShow, theme }: RevealProps) {
  const { t } = useSettings();
  const labels = revealLabels(t);

  return (
    <button
      id={lessonMenuPillButtonId}
      type="button"
      onClick={onShow}
      aria-expanded={false}
      aria-label={labels.full}
      // Opaque like the coach mark: this one floats over the lesson body.
      className={`focus-ring fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 z-[65] inline-flex min-h-12 items-center gap-2 rounded-full border bg-white px-4 text-sm font-black shadow-xl transition duration-200 hover:-translate-y-0.5 lg:hidden dark:bg-slate-900 ${
        theme ? `${theme.frameClassName} ${theme.headingClassName}` : neutralFrameClassName
      }`}
    >
      <span aria-hidden="true">☰</span>
      {labels.short}
    </button>
  );
}
