"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "@/components/ui/Motion";
import {
  ceremonyStarDelayMs,
  ceremonyTimeline,
  confettiPieces,
  earnedStarCount,
  killBurstColors,
  type RunStar
} from "@/lib/practiceGameJuice";
import type { PracticeSoundKind } from "@/lib/practiceSound";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

type CeremonyStat = {
  label: LocalizedText;
  value: string;
};

type GameResultsCeremonyProps = {
  show: boolean;
  testId: string;
  title: LocalizedText;
  subtitle?: string;
  stars: RunStar[];
  countUpLabel: LocalizedText;
  countUpValue: number;
  stats: CeremonyStat[];
  rewardLine?: string | null;
  bonusLine?: string | null;
  newBest: boolean;
  t: (value: LocalizedText) => string;
  playSound?: (kind: PracticeSoundKind) => void;
};

function colorHex(colorIndex: number) {
  return `#${killBurstColors[colorIndex % killBurstColors.length].toString(16).padStart(6, "0")}`;
}

// A non-interactive celebration layer: it never intercepts clicks, so every
// button, link, and e2e assertion beneath it keeps working.
export function GameResultsCeremony({
  show,
  testId,
  title,
  subtitle,
  stars,
  countUpLabel,
  countUpValue,
  stats,
  rewardLine,
  bonusLine,
  newBest,
  t,
  playSound
}: GameResultsCeremonyProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [displayValue, setDisplayValue] = useState(0);
  const soundPlayedRef = useRef(false);
  const starCount = earnedStarCount(stars);
  const newBestAtMs = ceremonyStarDelayMs(stars.length - 1) + ceremonyTimeline.starPopMs + ceremonyTimeline.newBestDelayMs;

  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false;
      setDisplayValue(0);
      return;
    }

    if (reducedMotion || countUpValue <= 0) {
      setDisplayValue(countUpValue);
    }
    if (reducedMotion || countUpValue <= 0) return;

    const steps = Math.max(1, Math.round(ceremonyTimeline.countUpMs / ceremonyTimeline.countUpStepMs));
    let step = 0;
    let timer = 0;
    const startTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        step += 1;
        setDisplayValue(Math.round((countUpValue * Math.min(step, steps)) / steps));
        if (step >= steps) window.clearInterval(timer);
      }, ceremonyTimeline.countUpStepMs);
    }, ceremonyTimeline.panelInMs);

    return () => {
      window.clearTimeout(startTimer);
      if (timer) window.clearInterval(timer);
    };
  }, [countUpValue, reducedMotion, show]);

  useEffect(() => {
    if (!show || !playSound || soundPlayedRef.current) return;
    soundPlayedRef.current = true;

    const timers: number[] = [];
    stars.forEach((star, index) => {
      if (!star.earned) return;
      timers.push(window.setTimeout(() => playSound("star"), ceremonyStarDelayMs(index)));
    });
    if (newBest) timers.push(window.setTimeout(() => playSound("combo3"), newBestAtMs));

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [newBest, newBestAtMs, playSound, show, stars]);

  if (!show) return null;

  return (
    <div
      data-testid={testId}
      data-stars={starCount}
      data-new-best={newBest}
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-slate-950/25 p-4 backdrop-blur-[1px]"
    >
      {!reducedMotion && starCount > 0
        ? confettiPieces().map((piece, index) => (
            <motion.span
              key={index}
              aria-hidden="true"
              className="absolute top-0 rounded-sm"
              style={{
                left: `${piece.leftPct}%`,
                width: piece.sizePx,
                height: piece.sizePx * 1.6,
                backgroundColor: colorHex(piece.colorIndex)
              }}
              initial={{ y: -24, opacity: 0, rotate: 0 }}
              animate={{ y: 420, x: piece.driftPx, opacity: [0, 1, 1, 0], rotate: piece.rotateDeg }}
              transition={{ delay: piece.delayMs / 1000, duration: piece.durationMs / 1000, ease: "linear" }}
            />
          ))
        : null}

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.7, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-amber-200/80 bg-white/95 px-6 py-5 text-center shadow-2xl shadow-amber-900/15 ring-1 ring-white/80 dark:border-amber-200/25 dark:bg-slate-950/95 dark:ring-white/10"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-cyan-300 to-emerald-400" />

        <p className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{t(title)}</p>
        {subtitle ? (
          <p className="mx-auto mt-1 max-w-[18rem] text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}

        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">{t(countUpLabel)}</p>
        <p data-testid={`${testId}-count`} className="text-4xl font-black tabular-nums text-slate-950 dark:text-white">
          {displayValue}
        </p>

        <div className="mt-3 flex items-center justify-center gap-3" aria-label={`${starCount}/3`}>
          {stars.map((star, index) => (
            <motion.span
              key={star.id}
              aria-hidden="true"
              initial={reducedMotion || !star.earned ? false : { scale: 0, rotate: -30, opacity: 0 }}
              animate={star.earned ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={
                reducedMotion || !star.earned
                  ? { duration: 0 }
                  : {
                      delay: ceremonyStarDelayMs(index) / 1000,
                      duration: ceremonyTimeline.starPopMs / 1000,
                      type: "spring",
                      stiffness: 320,
                      damping: 13
                    }
              }
              className={cn(
                "text-5xl leading-none drop-shadow-sm",
                star.earned ? "text-amber-400" : "text-slate-300 opacity-40 dark:text-slate-600"
              )}
            >
              ★
            </motion.span>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {stars.map((star) => (
            <span
              key={star.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
                star.earned
                  ? "border-amber-300/70 bg-amber-300/15 text-amber-700 dark:text-amber-200"
                  : "border-slate-200/80 bg-slate-100/60 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
              )}
            >
              {star.earned ? "★" : "☆"} {t(star.label)}
            </span>
          ))}
        </div>

        {newBest ? (
          <motion.p
            data-testid={`${testId}-new-best`}
            initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: newBestAtMs / 1000, type: "spring", stiffness: 300, damping: 12 }}
            className="mx-auto mt-3 inline-block rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1.5 text-sm font-black uppercase tracking-wide text-white shadow-lg"
          >
            {t({ en: "New best!", zh: "新紀錄！" })}
          </motion.p>
        ) : null}

        {stats.length ? (
          <div className="mt-3 grid grid-cols-3 gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            {stats.map((stat) => (
              <div key={t(stat.label)} className="rounded-xl bg-slate-100/80 px-2 py-2 dark:bg-white/[0.06]">
                <p className="text-sm font-black text-slate-950 dark:text-white">{stat.value}</p>
                <p className="mt-0.5 text-[0.65rem]">{t(stat.label)}</p>
              </div>
            ))}
          </div>
        ) : null}

        {rewardLine ? (
          <p className="mt-3 rounded-xl border border-emerald-300/50 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-700 dark:text-emerald-200">
            {rewardLine}
          </p>
        ) : null}

        {bonusLine ? (
          <p
            data-testid={`${testId}-bonus`}
            className="mt-2 rounded-xl border border-amber-300/60 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-700 dark:text-amber-200"
          >
            {bonusLine}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}
