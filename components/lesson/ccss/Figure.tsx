"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Wraps an interactive visualization in a bordered stage with a caption. */
export function Figure({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [overflowState, setOverflowState] = useState({ overflowing: false, atEnd: false });

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const overflowing = stage.scrollWidth > stage.clientWidth + 1;
    const atEnd = overflowing && stage.scrollLeft >= stage.scrollWidth - stage.clientWidth - 1;
    setOverflowState((current) => current.overflowing === overflowing && current.atEnd === atEnd
      ? current
      : { overflowing, atEnd });
  }, []);

  useEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    for (const child of Array.from(stage.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const showOverflowHint = overflowState.overflowing && !overflowState.atEnd;

  return (
    <figure className="my-6 min-w-0">
      <div
        ref={stageRef}
        data-figure-stage
        data-figure-overflowing={overflowState.overflowing ? "true" : undefined}
        onScroll={measure}
        role={overflowState.overflowing ? "region" : undefined}
        tabIndex={overflowState.overflowing ? 0 : undefined}
        aria-label={overflowState.overflowing ? "Scrollable mathematical diagram / 可橫向捲動的數學圖示" : undefined}
        className={`card min-w-0 max-w-full overflow-x-auto overflow-y-hidden p-4 sm:p-6 ${
          showOverflowHint ? "[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]" : ""
        }`}
      >
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-2 px-1 text-sm text-[var(--ink-faint)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
