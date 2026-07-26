"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { motion } from "@/components/ui/Motion";
import { NovaCompanion } from "@/components/practice/NovaCompanion";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

// Shared visual language for the practice "quest pager": the Practice Arena and
// the lesson-practice pager render the same star-reward chip and mission trail
// from here. `themed` opts into dark-mode variants — the lesson page supports
// dark theme, while the arena keeps its always-light kid look, so the dark
// classes must never leak into the arena.

export function PagerStarIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8L12 3Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

export function PagerRetryIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M20 12a8 8 0 1 1-2.35-5.65M20 4v4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

export function SoundOnIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function SoundOffIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" />
      <path d="m16 9 6 6M22 9l-6 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function ReadAloudIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="M4 9v6h3l4 3.5V5.5L7 9H4Z" fill="currentColor" />
      <path d="M14.5 8.5a4.5 4.5 0 0 1 0 7" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M17.5 6a8 8 0 0 1 0 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

type PracticeStarRewardProps = {
  correctCount: number;
  answeredCount: number;
  total: number;
  t: (localized: LocalizedText) => string;
  prefersReducedMotion: boolean | null;
  themed?: boolean;
};

/**
 * The round's live star haul: Nova reacts as stars land and pips fill per
 * answer, turning the pager header's spare corner into the reward loop.
 */
export function PracticeStarReward({ correctCount, answeredCount, total, t, prefersReducedMotion, themed = false }: PracticeStarRewardProps) {
  const roundComplete = answeredCount >= total && total > 0;
  const mood = correctCount > 0 ? "cheer" : "happy";
  const pips = Array.from({ length: total }, (_, index) => {
    if (index < correctCount) return "earned" as const;
    if (index < answeredCount) return "missed" as const;
    return "open" as const;
  });

  return (
    <div
      aria-live="polite"
      aria-label={t({
        en: `${correctCount} of ${total} stars earned so far`,
        zh: `暫時贏得 ${total} 顆星中的 ${correctCount} 顆`,
        zhHans: `暂时赢得 ${total} 颗星中的 ${correctCount} 颗`
      })}
      className={cn(
        "flex items-center gap-3 self-start rounded-[1.5rem] border border-amber-200/90 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-2.5 shadow-sm sm:self-auto",
        themed && "dark:border-amber-300/25 dark:from-amber-950/35 dark:to-yellow-950/25"
      )}
    >
      <motion.span
        key={`nova-${correctCount}`}
        className="grid place-items-center"
        initial={prefersReducedMotion ? false : { scale: 0.8, rotate: -8 }}
        animate={prefersReducedMotion ? undefined : { scale: [0.8, 1.12, 1], rotate: [-8, 6, 0] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <NovaCompanion mood={mood} className="h-11 w-11" />
      </motion.span>
      <div aria-hidden="true" className="min-w-0">
        <p className={cn("text-[11px] font-black uppercase tracking-[0.14em] text-amber-600", themed && "dark:text-amber-300")}>
          {roundComplete
            ? t({ en: "Stars earned", zh: "贏得星星", zhHans: "赢得星星" })
            : t({ en: "Stars so far", zh: "目前星星", zhHans: "目前星星" })}
        </p>
        <p className={cn("flex items-baseline gap-1 font-black leading-none text-amber-700", themed && "dark:text-amber-200")}>
          <span className="text-2xl">{correctCount}</span>
          <span className={cn("text-sm text-amber-500/90", themed && "dark:text-amber-300/80")}>/ {total}</span>
        </p>
        <div aria-hidden="true" className="mt-1.5 flex flex-wrap gap-1">
          {pips.map((state, index) => (
            <PagerStarIcon
              key={index}
              className={cn(
                "size-3.5 transition",
                state === "earned"
                  ? "text-amber-400"
                  : state === "missed"
                    ? cn("text-amber-200", themed && "dark:text-amber-200/45")
                    : cn("text-amber-200/50", themed && "dark:text-amber-200/25")
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type PracticeMissionTrailProps = {
  answerResults: Record<string, boolean>;
  currentIndex: number;
  onSelect: (index: number) => void;
  prefersReducedMotion: boolean | null;
  questionIds: string[];
  t: (localized: LocalizedText) => string;
  testId: string;
  themed?: boolean;
};

/**
 * The tappable stone trail: one stone per question (star when correct, retry
 * mark when wrong), rails that light up as far as the learner has reached, and
 * Nova floating above the current stone. Nova is anchored by measuring the DOM
 * so she lands on center regardless of viewport width or question count.
 */
export function PracticeMissionTrail({
  answerResults,
  currentIndex,
  onSelect,
  prefersReducedMotion,
  questionIds,
  t,
  testId,
  themed = false
}: PracticeMissionTrailProps) {
  const trailRef = useRef<HTMLDivElement | null>(null);
  const stoneRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [trailAvatar, setTrailAvatar] = useState<{ x: number; y: number; ready: boolean }>({ x: 0, y: 0, ready: false });
  const questionSignature = questionIds.join("|");
  const questionCount = questionIds.length;

  useEffect(() => {
    const measure = () => {
      const container = trailRef.current;
      const stone = stoneRefs.current[currentIndex];
      if (!container || !stone) return;
      const containerRect = container.getBoundingClientRect();
      const stoneRect = stone.getBoundingClientRect();
      setTrailAvatar({
        x: stoneRect.left - containerRect.left + stoneRect.width / 2,
        y: stoneRect.top - containerRect.top,
        ready: true
      });
    };

    measure();
    const frame = requestAnimationFrame(measure);
    const container = trailRef.current;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : null;
    if (observer && container) observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [currentIndex, questionSignature, questionCount]);

  // The lit stretch of trail reaches the current stone or the furthest answered one.
  const reachedTrailIndex = questionIds.reduce(
    (furthest, questionId, index) => (answerResults[questionId] !== undefined ? Math.max(furthest, index) : furthest),
    currentIndex
  );

  return (
    <div
      ref={trailRef}
      data-testid={testId}
      className="relative flex flex-nowrap items-center gap-1 overflow-visible pt-12 sm:gap-1.5"
    >
      {trailAvatar.ready ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-20"
          initial={false}
          animate={{ x: trailAvatar.x, y: trailAvatar.y }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 26, mass: 0.7 }}
        >
          <div className="-translate-x-1/2 -translate-y-full pb-1">
            <motion.div
              className="grid place-items-center"
              animate={prefersReducedMotion ? undefined : { y: [0, -3, 0] }}
              transition={prefersReducedMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <NovaCompanion mood="cheer" className="h-9 w-9 drop-shadow-[0_3px_4px_rgba(2,132,199,0.35)]" />
              <span aria-hidden="true" className="mt-px h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-amber-400" />
            </motion.div>
          </div>
        </motion.div>
      ) : null}

      {questionIds.map((questionId, index) => {
        const result = answerResults[questionId];
        const isCurrentStone = index === currentIndex;
        const stoneNumber = index + 1;
        const stoneLabel = result === true
          ? t({ en: `Question ${stoneNumber}: correct`, zh: `第 ${stoneNumber} 題：正確`, zhHans: `第 ${stoneNumber} 题：正确` })
          : result === false
            ? t({ en: `Question ${stoneNumber}: to review`, zh: `第 ${stoneNumber} 題：需重溫`, zhHans: `第 ${stoneNumber} 题：需重温` })
            : t({ en: `Go to question ${stoneNumber}`, zh: `跳到第 ${stoneNumber} 題`, zhHans: `跳到第 ${stoneNumber} 题` });
        const trailReached = index <= reachedTrailIndex;

        return (
          <Fragment key={questionId}>
            {index > 0 ? (
              <div className="relative h-1.5 flex-1 sm:h-2" aria-hidden="true">
                <span className={cn("absolute inset-0 rounded-full bg-sky-100", themed && "dark:bg-white/10")} />
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-sky-400"
                  initial={false}
                  animate={{ scaleX: trailReached ? 1 : 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                />
              </div>
            ) : null}
            <button
              ref={(element) => {
                stoneRefs.current[index] = element;
              }}
              type="button"
              onClick={() => onSelect(index)}
              aria-label={stoneLabel}
              aria-current={isCurrentStone ? "step" : undefined}
              className={cn(
                "focus-ring relative grid size-11 shrink-0 place-items-center rounded-full border-2 text-base font-black shadow-sm transition hover:-translate-y-0.5 sm:size-12",
                result === true
                  ? cn("border-emerald-400 bg-emerald-50 text-emerald-700", themed && "dark:border-emerald-300/60 dark:bg-emerald-950/40 dark:text-emerald-200")
                  : result === false
                    ? cn("border-amber-300 bg-amber-50 text-amber-600", themed && "dark:border-amber-300/50 dark:bg-amber-950/40 dark:text-amber-200")
                    : isCurrentStone
                      ? cn("border-blue-500 bg-white text-blue-700 ring-4 ring-blue-200", themed && "dark:border-cyan-300 dark:bg-slate-950 dark:text-cyan-100 dark:ring-cyan-300/30")
                      : cn("border-sky-100 bg-white text-slate-400", themed && "dark:border-white/15 dark:bg-white/[0.06]")
              )}
            >
              <motion.span
                key={`${questionId}:${String(result)}`}
                className="grid place-items-center"
                initial={prefersReducedMotion || result === undefined ? false : result ? { scale: 0 } : { x: 0 }}
                animate={
                  prefersReducedMotion || result === undefined
                    ? undefined
                    : result
                      ? { scale: [0, 1.35, 1], rotate: [0, 14, 0] }
                      : { x: [0, -4, 4, -2, 0] }
                }
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {result === true
                  ? <PagerStarIcon className="size-6 text-amber-400" />
                  : result === false
                    ? <PagerRetryIcon className="size-5" />
                    : stoneNumber}
              </motion.span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
