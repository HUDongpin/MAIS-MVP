"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { accommodationExtendedTimeLabels } from "@/lib/accommodations";
import { cn } from "@/lib/utils";
import type { AccommodationExtendedTime } from "@/types";

function ClockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// A student-facing countdown for a timed assessment. `effectiveSeconds` is the
// student's allotment AFTER any extended-time accommodation has been applied, and
// `storageKey` must encode that allotment (+ attempt) so the deadline survives a
// refresh but resets cleanly if the allotment changes. Fires `onExpire` exactly
// once when it reaches zero (the page uses this to auto-submit). Renders nothing
// when inactive or when there is no timed limit.
export function AssessmentCountdownTimer({
  active,
  effectiveSeconds,
  storageKey,
  extendedTime,
  onExpire
}: {
  active: boolean;
  effectiveSeconds: number;
  storageKey: string;
  extendedTime: AccommodationExtendedTime;
  onExpire: () => void;
}) {
  const { t } = useSettings();
  const [remaining, setRemaining] = useState<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active || effectiveSeconds <= 0) {
      setRemaining(null);
      return;
    }
    expiredRef.current = false;

    // Resolve/persist the deadline so a page refresh doesn't reset the clock.
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {
      stored = null;
    }
    const storedDeadline = stored ? Number(stored) : Number.NaN;
    const deadline = Number.isFinite(storedDeadline) && storedDeadline > 0
      ? storedDeadline
      : Date.now() + effectiveSeconds * 1000;
    if (deadline !== storedDeadline) {
      try {
        window.localStorage.setItem(storageKey, String(deadline));
      } catch {
        // Falls back to a session-only deadline when storage is unavailable.
      }
    }

    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [active, effectiveSeconds, storageKey]);

  if (!active || effectiveSeconds <= 0 || remaining === null) return null;

  const isUp = remaining <= 0;
  const isFinal = remaining <= 10;
  const isWarning = remaining <= 60;
  const extendedLabel = extendedTime !== "none" ? accommodationExtendedTimeLabels[extendedTime] : null;

  return (
    <div
      role="timer"
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black shadow-sm",
        isUp || isFinal
          ? "border-rose-300 bg-rose-500/10 text-rose-700 dark:text-rose-200"
          : isWarning
            ? "border-amber-300 bg-amber-400/10 text-amber-800 dark:text-amber-100"
            : "border-slate-200/80 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
      )}
    >
      <ClockIcon />
      <span aria-label={t({ en: "Time remaining", zh: "剩餘時間", zhHans: "剩余时间" })}>
        {isUp ? t({ en: "Time's up", zh: "時間到", zhHans: "时间到" }) : formatClock(remaining)}
      </span>
      {extendedLabel ? (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          {t(extendedLabel)}
        </span>
      ) : null}
    </div>
  );
}
